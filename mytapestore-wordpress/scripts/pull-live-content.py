#!/usr/bin/env python3
"""Fetch the live site's RAW page and post content, read-only.

    python3 scripts/pull-live-content.py

WHY RAW AND NOT RENDERED

The point is to find out what my theme does with the live site's content, and
that content is not HTML — it is shortcodes. mytapestore.com.au is built with
WPBakery (`vc_row`, `vc_column`, `wpb_*`), Shortcodes Ultimate (227 `su_spoiler`
blocks alone) and the Kapee theme's own extensions. `context=view` returns those
already expanded by the LIVE theme, which tells us nothing. `context=edit`
returns what is actually in post_content, which is what my theme will be handed.

READ-ONLY, AND DELIBERATELY SO. Every request here is a GET. Nothing is written
to the live site by this script, and it holds no code path that could.

Writes to build/live-content/{pages,posts}/<slug>.json plus a shortcodes.json
summary of every shortcode found and how often.
"""

from __future__ import annotations

import base64
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "build/live-content"
ENV = HERE.parent / ".env"

PER_PAGE = 20


def env() -> tuple[str, str, str]:
    vals: dict[str, str] = {}
    if ENV.is_file():
        for line in ENV.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, _, v = line.partition("=")
                vals[k.strip()] = v.strip()
    site = os.environ.get("WP_SITE_URL", vals.get("WP_SITE_URL", "")).rstrip("/")
    user = os.environ.get("WP_USER", vals.get("WP_USER", ""))
    pw = os.environ.get("WP_APP_PASSWORD", vals.get("WP_APP_PASSWORD", ""))
    if not (site and user and pw):
        sys.exit("need WP_SITE_URL, WP_USER and WP_APP_PASSWORD in .env")
    return site, user, pw


def get(url: str, user: str, pw: str) -> tuple[list, dict]:
    token = base64.b64encode(f"{user}:{pw}".encode()).decode()
    req = urllib.request.Request(url, headers={
        "Authorization": f"Basic {token}",
        "User-Agent": "mytapestore-migration/1.0 (read-only)",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read()), dict(r.headers)
    except urllib.error.HTTPError as e:
        sys.exit(f"GET {url} -> {e.code}: {e.read().decode()[:300]}")


def fetch(kind: str, site: str, user: str, pw: str) -> list[dict]:
    out: list[dict] = []
    page = 1
    while True:
        q = urllib.parse.urlencode({
            "per_page": PER_PAGE,
            "page": page,
            "context": "edit",
            "status": "publish",
            "_fields": "id,slug,link,title,content,excerpt,template,parent,menu_order",
        })
        rows, headers = get(f"{site}/wp-json/wp/v2/{kind}?{q}", user, pw)
        if not rows:
            break
        out.extend(rows)
        total = int(headers.get("X-WP-TotalPages", 1) or 1)
        if page >= total:
            break
        page += 1
    return out


SHORTCODE = re.compile(r"\[(/?)([a-zA-Z0-9_-]+)")


def main() -> int:
    site, user, pw = env()
    print(f"reading {site} (read-only)\n")

    counts: Counter[str] = Counter()
    summary = []

    for kind in ("pages", "posts"):
        rows = fetch(kind, site, user, pw)
        d = OUT / kind
        d.mkdir(parents=True, exist_ok=True)
        for row in rows:
            body = (row.get("content") or {}).get("raw", "")
            for _, name in SHORTCODE.findall(body):
                counts[name] += 1
            (d / f"{row['slug']}.json").write_text(json.dumps(row, indent=2))
        print(f"  {kind}: {len(rows)} saved to {d.relative_to(HERE.parent)}")
        summary.append((kind, len(rows)))

    # Shortcodes WordPress core knows about are not interesting; everything else
    # depends on a plugin or theme being present to render at all.
    core = {"caption", "gallery", "embed", "audio", "video", "playlist"}
    third_party = {k: v for k, v in counts.items() if k not in core}

    (OUT / "shortcodes.json").write_text(json.dumps(
        dict(sorted(third_party.items(), key=lambda kv: -kv[1])), indent=2))

    print(f"\n  distinct shortcodes in live content: {len(third_party)}")
    for name, n in sorted(third_party.items(), key=lambda kv: -kv[1])[:18]:
        print(f"    {n:>5}  [{name}]")
    print(f"\n  full list: {(OUT / 'shortcodes.json').relative_to(HERE.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
