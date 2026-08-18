#!/usr/bin/env python3
"""Export the WP Playground SQLite database as a MySQL dump the live host can import.

WHY THIS EXISTS

The draft runs on WP Playground, which stores WordPress in SQLite through the
sqlite-database-integration drop-in. The live host is MySQL. Doing that
conversion during the cutover window — under time pressure, with the shop down —
is how migrations go wrong, so it happens here instead. At cutover the step
becomes `mysql < mytapestore.sql`: a restore, not a conversion.

WHY THE COLUMN TYPES ARE EXACT AND NOT GUESSED

The naive approach reads SQLite's own schema and maps its five storage classes
back to MySQL types. That loses nearly everything that matters — SQLite has no
UNSIGNED, no TINYINT vs BIGINT, no VARCHAR length, no ENUM, and it stores
DATETIME as text. A schema rebuilt that way imports cleanly and then WooCommerce
writes an order id into a column that silently truncates.

It is not necessary. The SQLite drop-in maintains a MIRROR of MySQL's own
information_schema — `_wp_sqlite_mysql_information_schema_columns`,
`_statistics`, `_tables` — holding the ORIGINAL MySQL definition of every column
and index. So the DDL below is not a translation; it is the definition WordPress
and WooCommerce asked for, read back verbatim:

    ID              bigint(20) unsigned  NOT NULL auto_increment
    post_date       datetime             NOT NULL default '0000-00-00 00:00:00'
    KEY post_name   (post_name(191))     ← the utf8mb4 index-length fix, intact

WHY THIS IS NOT A PHP SCRIPT RUN INSIDE WORDPRESS

It was, first. $wpdb cannot read those mirror tables: the drop-in intercepts and
rewrites every query, so `SELECT ... FROM _wp_sqlite_mysql_information_schema_columns`
comes back empty and every table exports as "no schema". Reading the file
directly sidesteps the translation layer entirely, and means the export does not
need a booted WordPress at all.

WHAT IS DELIBERATELY EXCLUDED

Every `_wp_sqlite_*` table. They are the drop-in's own bookkeeping and exist only
because the database is SQLite. On MySQL they are meaningless, and importing them
would leave the live database carrying tables describing an engine it does not
use.

Usage:
    python3 scripts/export-mysql.py [--out build/mysql]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sqlite3
import sys

HERE = pathlib.Path(__file__).resolve().parent
DB = HERE.parent / "local/wordpress/wp-content/database/.ht.sqlite"

# Batch INSERTs by BYTES, not by row count. A thousand wp_postmeta rows is small;
# a thousand wp_posts rows carrying full article bodies can exceed
# max_allowed_packet and fail the import halfway through.
MAX_STATEMENT = 800_000

# The URL the draft was built on. Every absolute link, guid and menu item in the
# database carries it — 500 rows — and none of them mean anything on the live
# host.
# THE DOMAIN IS NOT REWRITTEN HERE, DELIBERATELY.
#
# The obvious feature — "--domain https://mytapestore.com.au" — was written and
# then removed. A plain find-and-replace corrupts WordPress: PHP serializes
# strings as `s:LENGTH:"..."` where LENGTH is a BYTE count, so swapping a 21-byte
# origin for a 26-byte one leaves every prefix in that value wrong and PHP then
# refuses to unserialize the whole option. WooCommerce settings, widget state and
# menu metadata are all serialized.
#
# A serialization-aware rewriter is the fix, and I had one working badly enough
# that it changed 239 length prefixes it should not have. Rather than ship a
# hand-rolled parser on the path where a mistake silently destroys settings, the
# export stays FAITHFUL and the domain swap happens on the target with WP-CLI:
#
#     wp search-replace 'http://127.0.0.1:9400' 'https://mytapestore.com.au' --all-tables
#     wp search-replace 'http://localhost:9400' 'https://mytapestore.com.au' --all-tables
#
# BOTH origins. The options table stores siteurl and home as 127.0.0.1:9400 — the
# Playground CLI writes its bind address there — while post content and menu
# items carry localhost:9400. Replacing only one leaves the site half-migrated.
#
# wp search-replace re-serializes correctly, reports what it changed, and has a
# --dry-run. It is the right tool and it already exists.

def sql_escape(value: str) -> str:
    """Escape a Python string for a MySQL string literal.

    NOT simple quote-doubling. MySQL treats \\0, \\n, \\r and \\Z as escape
    sequences, and a NUL byte inside a serialized payload — WooCommerce settings
    contain them — would terminate the statement early, producing a dump that
    imports "successfully" while silently losing everything after that row.
    """
    return (
        value.replace("\\", "\\\\")
        .replace("\0", "\\0")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\x1a", "\\Z")
        .replace("'", "\\'")
        .replace('"', '\\"')
    )


def sql_value(value) -> str:
    """One value, rendered for an INSERT."""
    if value is None:
        return "NULL"

    if isinstance(value, (int, float)):
        return repr(value)

    if isinstance(value, bytes):
        # Raw bytes go in as a hex literal. A byte sequence that is not valid
        # UTF-8 would be rejected or mangled by a utf8mb4 connection; hex is exact.
        try:
            return "'" + sql_escape(value.decode("utf-8")) + "'"
        except UnicodeDecodeError:
            return "0x" + value.hex()

    return "'" + sql_escape(str(value)) + "'"


def build_create_table(con: sqlite3.Connection, table: str) -> str:
    """Rebuild a table's MySQL DDL from the information_schema mirror.

    `con` MUST be the text connection, not the bytes one. Reading the mirror
    through a bytes text_factory returns b'ID' rather than 'ID', and every
    str() of it renders the Python repr into the DDL — producing columns
    literally named `b\'ID\'`, NOT NULL comparisons that never match, and a
    PRIMARY KEY demoted to a UNIQUE KEY called b\'PRIMARY\'. Verified the hard
    way; scripts/verify-mysql-export.py is what caught it.
    """
    cols = con.execute(
        """SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
           FROM _wp_sqlite_mysql_information_schema_columns
           WHERE TABLE_NAME = ? ORDER BY ORDINAL_POSITION""",
        (table,),
    ).fetchall()

    if not cols:
        return ""

    lines = []
    for name, ctype, nullable, default, extra in cols:
        line = f"  `{name}` {ctype}"
        line += " NOT NULL" if nullable == "NO" else " NULL"

        # A default of NULL is not the same as "no default". WordPress declares
        # post_date NOT NULL DEFAULT '0000-00-00 00:00:00', and losing that
        # breaks every INSERT that omits the column.
        if default is not None:
            d = str(default)
            if re.fullmatch(r"(CURRENT_TIMESTAMP(\(\d*\))?|NULL|-?\d+(\.\d+)?)", d, re.I):
                line += f" DEFAULT {d}"
            else:
                line += f" DEFAULT '{sql_escape(d)}'"

        if extra:
            line += f" {extra}"

        lines.append(line)

    # --- indexes -------------------------------------------------------------
    stats = con.execute(
        """SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME, NON_UNIQUE, SUB_PART
           FROM _wp_sqlite_mysql_information_schema_statistics
           WHERE TABLE_NAME = ? ORDER BY INDEX_NAME, SEQ_IN_INDEX""",
        (table,),
    ).fetchall()

    indexes: dict[str, dict] = {}
    for iname, _seq, cname, non_unique, sub_part in stats:
        idx = indexes.setdefault(iname, {"unique": str(non_unique) == "0", "cols": []})
        # The prefix length is load-bearing: `post_name(191)` is what keeps the
        # index inside InnoDB's key limit on utf8mb4. Dropping it fails the import.
        idx["cols"].append(f"`{cname}`" + (f"({int(sub_part)})" if sub_part else ""))

    for iname, idx in indexes.items():
        cols_sql = ",".join(idx["cols"])
        if iname == "PRIMARY":
            lines.append(f"  PRIMARY KEY ({cols_sql})")
        elif idx["unique"]:
            lines.append(f"  UNIQUE KEY `{iname}` ({cols_sql})")
        else:
            lines.append(f"  KEY `{iname}` ({cols_sql})")

    row = con.execute(
        "SELECT ENGINE FROM _wp_sqlite_mysql_information_schema_tables WHERE TABLE_NAME = ?",
        (table,),
    ).fetchone()
    engine = (row[0] if row and row[0] else "InnoDB")

    # utf8mb4_unicode_ci, NOT the utf8mb4_0900_ai_ci the mirror reports.
    # 0900 collations are MySQL 8 only; a host on MySQL 5.7 or MariaDB — which is
    # most shared hosting — rejects the import outright. unicode_ci is understood
    # everywhere and sorts equivalently for this content.
    body = ",\n".join(lines)
    return (
        f"CREATE TABLE `{table}` (\n{body}\n) "
        f"ENGINE={engine} DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n"
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE.parent / "build/mysql"))
    ap.add_argument("--db", default=str(DB))
    args = ap.parse_args()

    db_path = pathlib.Path(args.db)
    if not db_path.exists():
        print(f"missing {db_path}", file=sys.stderr)
        return 1

    out_dir = pathlib.Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "mytapestore.sql"

    # TWO connections, deliberately.
    #
    # meta  — normal str factory, for the information_schema mirror. Schema
    #         identifiers and types must be real strings or they end up in the
    #         DDL as Python byte-literal reprs.
    # data  — bytes factory, for row values, so sql_value() can tell valid UTF-8
    #         from raw bytes and emit a hex literal for the latter rather than
    #         corrupting it through a lossy decode.

    meta = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    data = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    data.text_factory = bytes

    all_tables = [
        r[0] for r in meta.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
    ]
    tables = [t for t in all_tables if not t.startswith("_wp_sqlite_") and t != "sqlite_sequence"]

    print("=== SQLite → MySQL export ===\n")
    print(f"tables in database : {len(all_tables)}")
    print(f"tables to export   : {len(tables)}  "
          f"({len(all_tables) - len(tables)} internal _wp_sqlite_* tables skipped)\n")

    counts: dict[str, int] = {}
    skipped: list[str] = []
    total = 0

    with out_file.open("w", encoding="utf-8", newline="\n") as fh:
        fh.write("-- MyTapeStore — WordPress/WooCommerce\n")
        fh.write("-- exported from the WP Playground SQLite draft\n")
        fh.write("-- import with:  mysql -u USER -p DBNAME < mytapestore.sql\n\n")
        fh.write("SET NAMES utf8mb4;\n")
        fh.write("SET FOREIGN_KEY_CHECKS = 0;\n")
        # NO_AUTO_VALUE_ON_ZERO matters: without it a literal 0 written into an
        # auto_increment column is replaced by the next sequence value. WordPress
        # has rows that legitimately carry 0 — every unattached post_parent —
        # and silently renumbering them corrupts relationships.
        fh.write("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n")
        fh.write("SET time_zone = '+00:00';\n")

        for table in tables:
            ddl = build_create_table(meta, table)
            if not ddl:
                skipped.append(table)
                print(f"  {table:<44} SKIPPED — not in the schema mirror")
                continue

            fh.write(f"\n--\n-- {table}\n--\n\n")
            fh.write(f"DROP TABLE IF EXISTS `{table}`;\n")
            fh.write(ddl)

            col_names = [
                c[0] for c in meta.execute(
                    """SELECT COLUMN_NAME FROM _wp_sqlite_mysql_information_schema_columns
                       WHERE TABLE_NAME = ? ORDER BY ORDINAL_POSITION""",
                    (table,),
                )
            ]
            collist = "`" + "`,`".join(col_names) + "`"
            quoted = ",".join(f'"{c}"' for c in col_names)

            rows = data.execute(f'SELECT {quoted} FROM "{table}"').fetchall()
            counts[table] = len(rows)
            total += len(rows)

            if rows:
                fh.write(f"\nLOCK TABLES `{table}` WRITE;\n")
                buf = ""
                for row in rows:
                    tuple_sql = "(" + ",".join(sql_value(v) for v in row) + ")"
                    if not buf:
                        buf = f"INSERT INTO `{table}` ({collist}) VALUES\n{tuple_sql}"
                    elif len(buf) + len(tuple_sql) > MAX_STATEMENT:
                        fh.write(buf + ";\n")
                        buf = f"INSERT INTO `{table}` ({collist}) VALUES\n{tuple_sql}"
                    else:
                        buf += ",\n" + tuple_sql
                if buf:
                    fh.write(buf + ";\n")
                fh.write("UNLOCK TABLES;\n")

            print(f"  {table:<44} {len(rows):>7} rows")

        fh.write("\nSET FOREIGN_KEY_CHECKS = 1;\n")

    (out_dir / "row-counts.json").write_text(json.dumps(counts, indent=1), encoding="utf-8")

    size = out_file.stat().st_size
    print(f"\ntables exported : {len(counts)}")
    if skipped:
        print(f"tables skipped  : {len(skipped)} — {', '.join(skipped)}")
    print(f"total rows      : {total:,}")
    print(f"written         : {out_file}  ({size/1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
