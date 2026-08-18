#!/usr/bin/env python3
"""Fetch the live site's real <title> and meta description for every URL.

    python3 scripts/pull-live-seo.py

WHY SCRAPE RATHER THAN READ THE API

The live site's SEO copy is written in Rank Math, and Rank Math does not expose
its title/description fields over the REST API — /wp/v2/product returns only
`rank_math_lock_modified_date`. The rendered page does expose them, and it is
ground truth besides: whatever is in that <title> is what Google sees today.

WHAT IT FIXES

The draft generates its own titles and descriptions from page content, so a
category that live titles

    Foam Tape- Single Sided | Strong Adhesion & Versatile Use

came out as plain "Foam Tape – Single Sided", and the descriptions were the
first sentence of the copy rather than the written meta description. Every one
of those is deliberate SEO work that would be silently dropped at cutover.

THE SITE-NAME SUFFIX IS STRIPPED, as the brief asks. Live titles end in
" | My Tape Store" or " - My Tape Store"; the theme already prints the site name
where it belongs, and repeating it wastes the pixels Google gives a title. The
suffix is removed here, once, rather than at render time.

READ-ONLY. Every request is a GET against the live site. Nothing is written
there and this script has no code path that could.

Output: build/live-seo.json  { "type|slug": {"title":…, "description":…} }
"""

from __future__ import annotations

import html
import json
import pathlib
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
DB = HERE.parent / "local/wordpress/wp-content/database/.ht.sqlite"
OUT = HERE.parent / "build/live-seo.json"
LIVE = "https://mytapestore.com.au"

# Live appends its own name; the theme prints it where it belongs.
SUFFIX = re.compile(r"\s*[|\-–—]\s*My\s*Tape\s*Store\s*$", re.I)

TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
DESC = re.compile(
    r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', re.I | re.S
)

PAUSE = 0.15  # polite; this is someone's production storefront


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def targets() -> list[tuple[str, str, str]]:
    """(kind, slug, live_url) for everything the draft publishes."""
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    out: list[tuple[str, str, str]] = []

    for post_type, prefix in (("product", "product/"), ("page", ""), ("post", "blog/")):
        rows = con.execute(
            "SELECT post_name FROM wp_posts WHERE post_type=? AND post_status='publish' AND post_name<>''",
            (post_type,),
        ).fetchall()
        for (slug,) in rows:
            out.append((post_type, slug, f"{LIVE}/{prefix}{slug}/"))

    rows = con.execute(
        """SELECT t.slug FROM wp_terms t
           JOIN wp_term_taxonomy tt ON tt.term_id=t.term_id
           WHERE tt.taxonomy='product_cat'"""
    ).fetchall()
    for (slug,) in rows:
        out.append(("product_cat", slug, f"{LIVE}/{slug}/"))

    con.close()
    return out


def fetch(url: str) -> tuple[str, str] | None:
    req = urllib.request.Request(
        url, headers={"User-Agent": "mytapestore-migration/1.0 (read-only SEO sync)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read(400_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return None if e.code == 404 else None
    except Exception:
        return None

    t = TITLE.search(body)
    d = DESC.search(body)
    if not t:
        return None
    return clean(t.group(1)), clean(d.group(1)) if d else ""


def main() -> int:
    rows = targets()
    print(f"reading {LIVE} (read-only) — {len(rows)} URLs\n")

    found: dict[str, dict[str, str]] = {}
    missing = 0
    stripped = 0

    for i, (kind, slug, url) in enumerate(rows, 1):
        got = fetch(url)
        time.sleep(PAUSE)

        if not got:
            missing += 1
            continue

        title, desc = got
        short = SUFFIX.sub("", title)
        if short != title:
            stripped += 1

        found[f"{kind}|{slug}"] = {"title": short, "description": desc}

        if i % 40 == 0:
            print(f"  {i}/{len(rows)}…")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(found, indent=2, ensure_ascii=False))

    with_desc = sum(1 for v in found.values() if v["description"])
    print(f"\n  matched on live      : {len(found)}/{len(rows)}")
    print(f"  not found on live    : {missing}  (draft-only content — keeps its generated meta)")
    print(f"  site-name suffix cut : {stripped}")
    print(f"  with a real description: {with_desc}")
    print(f"\n  wrote {OUT.relative_to(HERE.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
