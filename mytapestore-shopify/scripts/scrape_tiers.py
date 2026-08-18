#!/usr/bin/env python3
"""Read the volume-price breaks off the original WooCommerce store.

mytapestore.com.au runs the "Tiered Pricing Table" plugin. Each product page
carries one rules blob:

    data-minimum="2"  data-price-rules='{"3":"5","7":"10","10":"15"}'

meaning: the block starts at qty 2, 5% off from 3, 10% from 7, 15% from 10.
The percentages are product-level — a variable product shows a single blob for
every variation — so a product's breaks are just {minimum, {qty: pct}}.

The bands differ product to product, which is exactly why these are scraped
rather than assumed: hard-coding one ladder for the whole catalogue would
misprice most of it.

Writes import/tiers.json.
"""
import concurrent.futures as cf
import html
import json
import pathlib
import re
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITEMAP = "https://mytapestore.com.au/product-sitemap.xml"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"


def fetch(url, tries=3):
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
            if n == tries - 1:
                return ""
    return ""


def attr(markup, name):
    m = re.search(r'%s="([^"]*)"' % re.escape(name), markup)
    return html.unescape(m.group(1)).strip() if m else ""


def scrape(url):
    handle = url.rstrip("/").rsplit("/", 1)[-1]
    page = fetch(url)
    if not page:
        return {"handle": handle, "url": url, "error": "fetch failed"}

    block = re.search(r'<div class="tiered-pricing-blocks"(.*?)>', page, re.S)
    if not block:
        return {"handle": handle, "url": url, "tiers": None}

    b = block.group(1)
    try:
        rules = json.loads(attr(b, "data-price-rules") or "{}")
    except json.JSONDecodeError:
        rules = {}

    def num(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    return {
        "handle": handle,
        "url": url,
        "name": attr(b, "data-product-name"),
        "minimum": int(attr(b, "data-minimum") or 1),
        "rules": {int(k): float(v) for k, v in sorted(rules.items(), key=lambda kv: int(kv[0]))},
        "base_price": num(attr(b, "data-price")),
        "regular_price": num(attr(b, "data-regular-price")),
        "heading": "Get it at a discounted rate" if "discounted rate" in page.lower() else "",
    }


def main():
    urls = re.findall(r"<loc>(https://mytapestore\.com\.au/product/[^<]+)</loc>", fetch(SITEMAP))
    print(f"products in sitemap: {len(urls)}")

    out = []
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for i, rec in enumerate(pool.map(scrape, urls), 1):
            out.append(rec)
            if i % 20 == 0:
                print(f"  …{i}/{len(urls)}")

    dest = ROOT / "import" / "tiers.json"
    dest.write_text(json.dumps(out, indent=2))

    withtiers = [r for r in out if r.get("rules")]
    errors = [r for r in out if r.get("error")]
    print(f"\nwrote {dest}")
    print(f"  with volume breaks : {len(withtiers)}")
    print(f"  without            : {len(out) - len(withtiers) - len(errors)}")
    print(f"  fetch errors       : {len(errors)}")

    shapes = {}
    for r in withtiers:
        key = f"min {r['minimum']} + " + ", ".join(f"{q}→{p:g}%" for q, p in r["rules"].items())
        shapes[key] = shapes.get(key, 0) + 1
    print("\ndistinct ladders:")
    for k, v in sorted(shapes.items(), key=lambda kv: -kv[1]):
        print(f"  {v:>4}x  {k}")


if __name__ == "__main__":
    main()
