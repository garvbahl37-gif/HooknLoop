#!/usr/bin/env python3
"""Pull the live Shopify store's product content into content/shopify-products.json.

WHY THIS EXISTS

The WooCommerce catalogue was imported from the OLD mytapestore.com.au, so its
product descriptions still carry that site's page-builder residue — [vc_row],
[vc_column_text], and su-row/su-column wrappers around the actual copy. The
Shopify store was built from the same catalogue but its descriptions were
CLEANED on the way in, and its engineering specs were lifted out of the
description body into their own field.

So the two stores show different words for the same product, and the
Specifications tab on WooCommerce has nothing engineering-related in it at all.
This closes that: Shopify is the source of truth for product copy, so read it
from Shopify.

WHAT IT READS

  /products.json          handle, title, vendor (= Brand), sku, images
  /products/<handle>      the RENDERED page, for the three things products.json
                          does not expose:
                            · the description exactly as the PDP shows it
                            · the extra Specifications rows (thickness, adhesive
                              type, temperature range, …) which live in a
                              metafield
                            · the ticked key-specs strip beside the gallery

Reading the rendered page rather than the Admin API is deliberate: it needs no
credentials, and it captures what the store actually displays rather than what
is theoretically stored.

Usage:  python3 scripts/pull-shopify-content.py [--store my-tape-store-2.myshopify.com]
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
from html.parser import HTMLParser

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "content" / "shopify-products.json"

UA = "mytapestore-content-sync/1.0"


def fetch(url: str, tries: int = 6) -> str:
    """GET with exponential backoff.

    Shopify rate-limits storefront requests and answers 429 once a run gets
    going — a flat 1.5s retry was not enough and the first full run died at
    product 54. 429 gets a long, growing wait (and honours Retry-After when the
    response carries one); everything else gets a short one.
    """
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=45) as res:
                return res.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as err:  # noqa: PERF203
            last = err
            if err.code == 429:
                wait = float(err.headers.get("Retry-After") or 0) or min(60, 5 * (2 ** attempt))
                print(f"    429 — waiting {wait:.0f}s", flush=True)
                time.sleep(wait)
            elif err.code in (404, 410):
                raise
            else:
                time.sleep(2 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError) as err:
            last = err
            time.sleep(2 * (attempt + 1))
    raise SystemExit(f"failed: {url} ({last})")


class Extractor(HTMLParser):
    """Pull the three regions off a rendered product page.

    A tag-depth counter per region rather than a regex: descriptions contain
    nested divs, tables and images, and a regex for "everything until the
    matching close tag" is not a thing a regex can express.
    """

    VOID = {
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.description = ""
        self.key_specs: list[str] = []
        self.spec_rows: list[tuple[str, str]] = []

        self._capture: str | None = None
        self._depth = 0
        self._buf: list[str] = []

        # spec table state
        self._in_spec_table = False
        self._cell: str | None = None
        self._row: list[str] = []
        self._text: list[str] = []

        # key specs state
        self._in_key_specs = False

    # ---- helpers ---------------------------------------------------------
    @staticmethod
    def _attr(attrs, name):
        for key, value in attrs:
            if key == name:
                return value or ""
        return ""

    def _raw_starttag(self, tag, attrs, closing=False):
        parts = [tag]
        for key, value in attrs:
            parts.append(f'{key}="{value}"' if value is not None else key)
        return f"<{' '.join(parts)}{' /' if closing else ''}>"

    # ---- parser ----------------------------------------------------------
    def handle_starttag(self, tag, attrs):
        cls = self._attr(attrs, "class")
        panel = self._attr(attrs, "data-mts-panel")

        if self._capture is None and panel == "description":
            self._capture = "description"
            self._depth = 0
            return

        if self._capture == "description":
            self._buf.append(self._raw_starttag(tag, attrs, tag in self.VOID))
            if tag not in self.VOID:
                self._depth += 1
            return

        if tag == "ul" and "pdp-gallery__specs" in cls:
            self._in_key_specs = True
            return

        if tag == "table" and "spec-table" in cls:
            self._in_spec_table = True
            return

        if self._in_spec_table and tag in ("th", "td"):
            self._cell = tag
            self._text = []
            return

        if self._in_key_specs and tag == "span":
            self._cell = "keyspec"
            self._text = []
            return

    def handle_startendtag(self, tag, attrs):
        if self._capture == "description":
            self._buf.append(self._raw_starttag(tag, attrs, True))

    def handle_endtag(self, tag):
        if self._capture == "description":
            if tag not in self.VOID:
                if self._depth == 0:
                    self.description = "".join(self._buf).strip()
                    self._capture = None
                    self._buf = []
                    return
                self._depth -= 1
            self._buf.append(f"</{tag}>")
            return

        if tag == "ul" and self._in_key_specs:
            self._in_key_specs = False
            return

        if tag == "table" and self._in_spec_table:
            self._in_spec_table = False
            return

        if self._in_spec_table and tag in ("th", "td") and self._cell:
            self._row.append(collapse("".join(self._text)))
            self._cell = None
            return

        if self._in_spec_table and tag == "tr":
            if len(self._row) >= 2:
                self.spec_rows.append((self._row[0], self._row[1]))
            self._row = []
            return

        if self._in_key_specs and tag == "span" and self._cell == "keyspec":
            text = collapse("".join(self._text))
            if text:
                self.key_specs.append(text)
            self._cell = None

    def handle_data(self, data):
        if self._capture == "description":
            self._buf.append(data)
        elif self._cell:
            self._text.append(data)

    def handle_entityref(self, name):
        self.handle_data(f"&{name};")

    def handle_charref(self, name):
        self.handle_data(f"&#{name};")


def collapse(text: str) -> str:
    import html as htmlmod

    return re.sub(r"\s+", " ", htmlmod.unescape(text)).strip()


def products(store: str) -> list[dict]:
    out, page = [], 1
    while True:
        data = json.loads(fetch(f"https://{store}/products.json?limit=250&page={page}"))
        batch = data.get("products", [])
        if not batch:
            break
        out.extend(batch)
        page += 1
        if page > 20:  # a catalogue this size cannot need more; stop runaway paging
            break
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--store", default="my-tape-store-2.myshopify.com")
    ap.add_argument("--limit", type=int, default=0, help="stop after N products (for a smoke run)")
    ap.add_argument("--delay", type=float, default=0.6, help="seconds to wait between product pages")
    ap.add_argument("--resume", action="store_true", help="keep products already captured in the output file")
    args = ap.parse_args()

    listing = products(args.store)
    if args.limit:
        listing = listing[: args.limit]

    print(f"{len(listing)} products on {args.store}")

    # Resume: keep whatever a previous run already captured, so a rate-limit
    # stop halfway through costs the remaining products, not all of them.
    done: dict[str, dict] = {}
    if args.resume and OUT.exists():
        for rec in json.loads(OUT.read_text(encoding="utf-8")):
            done[rec["handle"]] = rec
        print(f"resuming — {len(done)} already captured")

    records = []
    for i, product in enumerate(listing, 1):
        handle = product["handle"]

        if handle in done:
            records.append(done[handle])
            continue

        page = fetch(f"https://{args.store}/products/{handle}")
        time.sleep(args.delay)

        ex = Extractor()
        ex.feed(page)

        # The rows the WooCommerce template generates for itself — category,
        # price, availability, brand and the variation options — are dropped
        # here, so the import only carries the engineering data.
        generated = {"category", "price", "availability", "brand"}
        for option in product.get("options", []):
            generated.add(str(option.get("name", "")).strip().lower())

        specs = [
            {"label": label, "value": value}
            for label, value in ex.spec_rows
            if label.strip().lower() not in generated and value
        ]

        records.append({
            "handle": handle,
            "title": product.get("title", ""),
            "vendor": product.get("vendor", ""),
            "description": ex.description,
            "key_specs": ex.key_specs,
            "specs": specs,
            "has_volume_tiers": "pdp-vtier" in page,
        })

        print(f"  [{i}/{len(listing)}] {handle}: "
              f"{len(ex.description)}b desc, {len(specs)} specs, {len(ex.key_specs)} key specs",
              flush=True)

        # Checkpoint. A run that dies at product 90 should not throw away 89
        # pages of work; --resume picks up from whatever is on disk.
        if i % 10 == 0:
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(records, indent=1, ensure_ascii=False), encoding="utf-8")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(records, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"\nwrote {OUT} ({len(records)} products)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
