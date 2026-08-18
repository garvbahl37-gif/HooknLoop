#!/usr/bin/env python3
"""Scrape mytapestore.com.au's category product ORDER into content/category-order.json.

WHY

WooCommerce sorts a category by whatever the shop's default sort is — menu order
then title — which is not the order the live site shows. The old site puts its
bestsellers on the first row of each category, and returning customers navigate
by that shape; losing it makes a familiar category page feel like a different
shop. The Shopify build preserves it (scripts/push_collection_order.py, via a
`custom.product_order` collection metafield) and this is the same idea for
WooCommerce: capture the order once, store it per category, render it first.

The old site is the reference here rather than Shopify, because the old site is
where the order was authored — Shopify's copy was scraped from it too.

Products that appear on the live category page but not in the local catalogue
are kept in the list anyway: the importer matches on slug and simply skips what
it cannot find, so a later import fills the gaps without a re-scrape.

Usage:  python3 scripts/pull-category-order.py [--site https://mytapestore.com.au]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "content" / "category-order.json"
CATS = HERE.parent / "content" / "product-categories.json"

UA = "Mozilla/5.0 (compatible; mytapestore-order-sync/1.0)"


def fetch(url: str, tries: int = 4) -> str:
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=45) as res:
                return res.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as err:
            if err.code in (404, 410):
                return ""
            time.sleep(2 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            time.sleep(2 * (attempt + 1))
    return ""


def scrape(site: str, slug: str, max_pages: int = 12) -> list[str]:
    """Product slugs in the order the old category page lists them."""
    order: list[str] = []
    page = 1

    while page <= max_pages:
        # The old site serves categories off the bare slug — /masking-tape/ —
        # and 301s /product-category/masking-tape/ to it. Ask for the real URL
        # so every request is one hop, not two.
        url = f"{site}/{slug}/" if page == 1 else f"{site}/{slug}/page/{page}/"
        html = fetch(url)
        if not html:
            break

        # Only the grid links matter, but every /product/<slug> on the page is in
        # document order, and dedup keeps the first occurrence — which is the
        # grid, because the grid comes before any "related" rail.
        fresh = []
        for handle in re.findall(r"/product/([a-z0-9][a-z0-9\-]*)/", html):
            if handle not in order and handle not in fresh:
                fresh.append(handle)

        if not fresh:
            break

        order += fresh

        if f"/page/{page + 1}/" not in html:
            break
        page += 1

    return order


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default="https://mytapestore.com.au")
    ap.add_argument("--delay", type=float, default=0.5)
    ap.add_argument("--resume", action="store_true")
    args = ap.parse_args()

    if not CATS.exists():
        sys.exit(f"missing {CATS} — the category export is what names the slugs to scrape.")

    categories = json.loads(CATS.read_text(encoding="utf-8"))
    slugs = [c["slug"] for c in categories if c.get("slug")]

    done: dict[str, list[str]] = {}
    if args.resume and OUT.exists():
        done = json.loads(OUT.read_text(encoding="utf-8"))
        print(f"resuming — {len(done)} categories already captured")

    print(f"{len(slugs)} categories on {args.site}")

    result: dict[str, list[str]] = {}
    for i, slug in enumerate(slugs, 1):
        if slug in done:
            result[slug] = done[slug]
            continue

        order = scrape(args.site, slug)
        time.sleep(args.delay)

        if order:
            result[slug] = order

        print(f"  [{i}/{len(slugs)}] {slug}: {len(order)} products", flush=True)

        if i % 10 == 0:
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(result, indent=1), encoding="utf-8")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=1), encoding="utf-8")
    print(f"\nwrote {OUT} ({len(result)} categories with a known order)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
