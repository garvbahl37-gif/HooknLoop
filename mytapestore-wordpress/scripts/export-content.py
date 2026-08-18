#!/usr/bin/env python3
"""Export mytapestore.com.au content via the WordPress/WooCommerce REST API.

Read-only: every request is a GET. Nothing on the live site is modified.

The point is to capture what the new theme has to render — real products,
real categories, real page copy — so the rebuild is driven by production data
rather than the demo catalogue in mytapestore-redesign/src/data.

Deliberately NOT exported: the wp_snippets table (it holds an RCE backdoor),
plugin settings, and users. Content only, migrated selectively.

Usage: python3 mytapestore-wordpress/scripts/export-content.py
"""
import base64
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "content"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36"


def load_env():
    env = {}
    path = ROOT / ".env"
    if not path.exists():
        sys.exit(f"missing {path} — see ACCESS.md")
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


ENV = load_env()
SITE = ENV["WP_SITE_URL"].rstrip("/")
# WordPress prints application passwords in groups of four; the spaces are cosmetic.
CREDS = f"{ENV['WP_USER']}:{ENV['WP_APP_PASSWORD'].replace(' ', '')}"
BASIC = base64.b64encode(CREDS.encode()).decode()


def fetch(path, params=None, retries=3):
    """GET one page. Returns (parsed_json, headers)."""
    url = f"{SITE}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Authorization": f"Basic {BASIC}",
        "Accept": "application/json",
    })
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode("utf-8", "replace")), dict(r.headers)
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403, 404):
                return {"_error": e.code, "_body": e.read()[:200].decode("utf-8", "replace")}, {}
            if attempt == retries - 1:
                raise
        except Exception:
            if attempt == retries - 1:
                raise
        time.sleep(2 * (attempt + 1))
    return None, {}


def fetch_all(path, per_page=100, **extra):
    """Page through a collection endpoint until exhausted."""
    items, page = [], 1
    while True:
        params = {"per_page": per_page, "page": page}
        params.update(extra)
        data, headers = fetch(path, params)
        if isinstance(data, dict):
            if "_error" in data:
                print(f"    ! HTTP {data['_error']} on {path} page {page}")
            break
        if not data:
            break
        items.extend(data)
        total_pages = int(headers.get("X-WP-TotalPages") or 0)
        print(f"    page {page}/{total_pages or '?'} → {len(items)} items", flush=True)
        if total_pages and page >= total_pages:
            break
        page += 1
        time.sleep(0.3)  # be polite to a live production store
    return items


def save(name, data):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    size = path.stat().st_size
    print(f"  saved {name}.json  ({len(data)} records, {size / 1024:.0f} KB)")
    return data


COLLECTIONS = [
    ("product-categories", "/wp-json/wc/v3/products/categories", {}),
    ("products",           "/wp-json/wc/v3/products",            {"status": "any"}),
    ("product-attributes", "/wp-json/wc/v3/products/attributes", {}),
    ("pages",              "/wp-json/wp/v2/pages",               {"status": "publish"}),
    ("posts",              "/wp-json/wp/v2/posts",               {"status": "publish"}),
    ("media",              "/wp-json/wp/v2/media",               {}),
    ("menus",              "/wp-json/wp/v2/menus",               {}),
    ("menu-items",         "/wp-json/wp/v2/menu-items",          {}),
]


def main():
    print(f"Exporting from {SITE} as {ENV['WP_USER']} (read-only)\n")
    summary = {}
    for name, path, extra in COLLECTIONS:
        print(f"  {name} …")
        items = fetch_all(path, **extra)
        save(name, items)
        summary[name] = len(items)

    # Variations belong to their parent, so they need a pass of their own.
    products = json.loads((OUT / "products.json").read_text())
    variable = [p for p in products if p.get("type") == "variable"]
    print(f"\n  variations for {len(variable)} variable products …")
    variations = {}
    for i, p in enumerate(variable, 1):
        rows = fetch_all(f"/wp-json/wc/v3/products/{p['id']}/variations")
        if rows:
            variations[str(p["id"])] = rows
        print(f"    {i}/{len(variable)}  {p['name'][:44]:46} {len(rows)} variations", flush=True)
    save("product-variations", variations)
    summary["product-variations"] = sum(len(v) for v in variations.values())

    (OUT / "_summary.json").write_text(json.dumps(summary, indent=2))
    print("\nDone:")
    for k, v in summary.items():
        print(f"  {k:22} {v}")


if __name__ == "__main__":
    main()
