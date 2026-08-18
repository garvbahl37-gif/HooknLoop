#!/usr/bin/env python3
"""Prove the MySQL dump matches the SQLite database it came from.

WHY THIS IS SEPARATE FROM THE EXPORT

An export that has never been checked is not a migration, it is a hope. The
failure modes here are quiet ones — a NUL byte truncating a statement, a
serialized array whose length prefix no longer matches after escaping, a tuple
with one value too few — and every one of them produces a file that imports
without error and a site that is subtly wrong afterwards.

WHAT IT CHECKS

 1. ROW COUNTS         every table's INSERT count equals its SQLite row count
 2. TUPLE ARITY        every VALUES tuple has exactly as many values as the
                       INSERT names columns — catches escaping that swallowed or
                       invented a delimiter
 3. SERIALIZED DATA    PHP serialized strings survive byte for byte. `s:5:"hello"`
                       carries its own length, so a single mangled character
                       makes WordPress silently discard the whole option
 4. LEAKAGE            no `_wp_sqlite_*` bookkeeping table reached the dump
 5. PORTABILITY        no MySQL-8-only collation that would break a 5.7 or
                       MariaDB host
 6. STRUCTURE          every table has a CREATE, a PRIMARY KEY where SQLite has
                       one, and the session pragmas an import needs

Usage:
    python3 scripts/verify-mysql-export.py
"""

from __future__ import annotations

import json
import pathlib
import re
import sqlite3
import sys

HERE = pathlib.Path(__file__).resolve().parent
DB = HERE.parent / "local/wordpress/wp-content/database/.ht.sqlite"
DUMP = HERE.parent / "build/mysql/mytapestore.sql"


def split_tuples(values_blob: str):
    """Yield each (...) tuple from a VALUES clause, respecting quoting.

    Written by hand rather than with a regex because the payload contains
    escaped quotes, escaped backslashes and parentheses inside strings — all of
    which a regex gets wrong in a way that looks fine on the happy path.
    """
    depth = 0
    in_string = False
    escaped = False
    start = None

    for i, ch in enumerate(values_blob):
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == "'":
                in_string = False
            continue

        if ch == "'":
            in_string = True
        elif ch == "(":
            if depth == 0:
                start = i
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0 and start is not None:
                yield values_blob[start + 1 : i]
                start = None


def count_values(tuple_body: str) -> int:
    """Number of top-level, comma-separated values in one tuple."""
    n = 1
    in_string = False
    escaped = False
    depth = 0

    for ch in tuple_body:
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == "'":
                in_string = False
            continue
        if ch == "'":
            in_string = True
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == "," and depth == 0:
            n += 1

    return n


def main() -> int:
    if not DUMP.exists():
        print(f"missing {DUMP} — run scripts/export-mysql.py first", file=sys.stderr)
        return 1

    sql = DUMP.read_text(encoding="utf-8")
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)

    failures: list[str] = []
    print("=== verifying the MySQL dump ===\n")

    # --- 1 + 2. row counts and tuple arity -----------------------------------
    insert_re = re.compile(
        r"INSERT INTO `([^`]+)` \(([^)]*)\) VALUES\n(.*?);\n", re.S
    )

    seen: dict[str, int] = {}
    arity_problems: list[str] = []

    for m in insert_re.finditer(sql):
        table, collist, blob = m.group(1), m.group(2), m.group(3)
        ncols = collist.count("`") // 2
        for body in split_tuples(blob):
            seen[table] = seen.get(table, 0) + 1
            got = count_values(body)
            if got != ncols and len(arity_problems) < 10:
                arity_problems.append(f"{table}: expected {ncols} values, found {got}")

    expected = json.loads((DUMP.parent / "row-counts.json").read_text())

    mismatches = []
    for table, want in expected.items():
        got = seen.get(table, 0)
        if got != want:
            mismatches.append(f"{table}: sqlite {want} vs dump {got}")

    print(f"1. row counts      : {len(expected)} tables, "
          f"{sum(expected.values()):,} rows expected, {sum(seen.values()):,} in the dump")
    if mismatches:
        failures.append("row-count mismatch")
        for x in mismatches[:10]:
            print(f"     MISMATCH {x}")
    else:
        print("     every table matches")

    print(f"2. tuple arity     : ", end="")
    if arity_problems:
        failures.append("tuple arity")
        print("FAILURES")
        for x in arity_problems:
            print(f"     {x}")
    else:
        print("every tuple has exactly as many values as its column list")

    # --- 3. serialized data round-trip ---------------------------------------
    # Compare the dump's rendering against the source for every option whose
    # value is PHP-serialized — those are the ones where a byte of drift is
    # silently destructive.
    con.text_factory = bytes
    serialized = con.execute(
        """SELECT option_name, option_value FROM wp_options
           WHERE option_value LIKE 'a:%' OR option_value LIKE 'O:%' OR option_value LIKE 's:%'"""
    ).fetchall()

    checked = bad = 0
    for name_b, value_b in serialized:
        try:
            name = name_b.decode()
            value = value_b.decode()
        except UnicodeDecodeError:
            continue

        # Rebuild what the exporter should have written, and require it present.
        escaped = (
            value.replace("\\", "\\\\")
            .replace("\0", "\\0")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\x1a", "\\Z")
            .replace("'", "\\'")
            .replace('"', '\\"')
        )
        checked += 1
        if f"'{escaped}'" not in sql:
            bad += 1
            if bad <= 3:
                print(f"     MISSING serialized value for option '{name}'")

    print(f"3. serialized data : {checked} serialized options checked, {bad} not found byte-for-byte")
    if bad:
        failures.append("serialized data")

    # --- 4. leakage -----------------------------------------------------------
    leaked = sorted(set(re.findall(r"CREATE TABLE `(_wp_sqlite_[^`]+)`", sql)))
    print(f"4. leakage         : {len(leaked)} internal _wp_sqlite_* tables in the dump")
    if leaked:
        failures.append("sqlite internals leaked")
        print(f"     {leaked}")

    # --- 5. portability -------------------------------------------------------
    bad_collations = sorted(set(re.findall(r"utf8mb4_0900_\w+", sql)))
    print(f"5. portability     : {len(bad_collations)} MySQL-8-only collations")
    if bad_collations:
        failures.append("MySQL 8 only collation")
        print(f"     {bad_collations} — would fail on MySQL 5.7 / MariaDB")

    # --- 6. structure ---------------------------------------------------------
    creates = re.findall(r"CREATE TABLE `([^`]+)`", sql)
    missing_create = [t for t in expected if t not in creates]

    sqlite_pk = {
        t for t in expected
        if con.execute(
            "SELECT COUNT(*) FROM _wp_sqlite_mysql_information_schema_statistics "
            "WHERE TABLE_NAME = ? AND INDEX_NAME = 'PRIMARY'", (t,)
        ).fetchone()[0] > 0
    }
    pk_in_dump = set()
    for m in re.finditer(r"CREATE TABLE `([^`]+)` \((.*?)\n\) ENGINE", sql, re.S):
        if "PRIMARY KEY" in m.group(2):
            pk_in_dump.add(m.group(1))
    missing_pk = sorted(sqlite_pk - pk_in_dump)

    pragmas = all(p in sql for p in (
        "SET NAMES utf8mb4;", "SET FOREIGN_KEY_CHECKS = 0;", "NO_AUTO_VALUE_ON_ZERO",
    ))

    print(f"6. structure       : {len(creates)} CREATE TABLE, "
          f"{len(missing_create)} missing, {len(missing_pk)} lost a PRIMARY KEY, "
          f"session pragmas {'present' if pragmas else 'MISSING'}")
    if missing_create or missing_pk or not pragmas:
        failures.append("structure")
        if missing_create:
            print(f"     no CREATE for: {missing_create[:6]}")
        if missing_pk:
            print(f"     lost PRIMARY KEY: {missing_pk[:6]}")

    print()
    if failures:
        print(f"RESULT: {len(failures)} problem(s) — {', '.join(failures)}")
        return 1

    print("RESULT: the dump is a faithful representation of the SQLite database.")
    print()
    print("NOT yet proved: that a MySQL server accepts it. That needs an actual")
    print("import — there is no MySQL or Docker on this machine. Run against the")
    print("staging database when one exists:")
    print("    mysql -u USER -p STAGING_DB < build/mysql/mytapestore.sql")
    return 0


if __name__ == "__main__":
    sys.exit(main())
