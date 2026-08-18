#!/usr/bin/env python3
"""Restore every product's full image set from mytapestore.com.au.

The migration brought across one image per product; the old site carries a full
gallery (up to ~7 shots each) that the product slider is built to show. This
pulls the gallery in the ORIGINAL ORDER, so image #1 becomes the Shopify
featured image and the thumbnail matches the old site exactly.

WHERE THE GALLERY LIVES
WooCommerce emits `data-large_image="<full size>"` on each gallery item. The
markup appears twice in the page (main + a duplicated mobile gallery), so the
raw match count is double — dedupe while PRESERVING ORDER, because order is the
whole point: position 0 is the thumbnail the customer sees in every grid.

    python3 sync_product_images.py             # audit only: old vs new counts
    python3 sync_product_images.py --apply     # upload the missing images
    python3 sync_product_images.py --apply --limit 5
"""
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOP = "cvbpp2-up.myshopify.com"
OLD = "https://mytapestore.com.au"

# The original import renamed many files to content hashes (7-1.jpg ->
# 3bd794e9893f.jpg). Without this map every hashed product looks like it is
# missing its whole gallery, and re-uploading would duplicate it.
MANIFEST = ROOT.parent / "mytapestore-redesign" / "scripts" / "img_manifest.tsv"


def hash_map():
    out = {}
    if not MANIFEST.exists():
        return out
    for line in MANIFEST.read_text().splitlines():
        parts = line.split("\t")
        if len(parts) == 2:
            out[parts[0].split("/")[-1].lower()] = parts[1].split("/")[-1].lower()
    return out


HASHES = hash_map()


def token():
    for line in (ROOT.parent / "newsletter" / ".env.local").read_text().splitlines():
        if line.startswith("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE="):
            return line.split("=", 1)[1].strip().strip("\"'")
    sys.exit("admin token not found")


TOK = token()


def rest(path, method="GET", body=None):
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/{path}",
        data=json.dumps(body).encode() if body else None, method=method)
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    return json.loads(urllib.request.urlopen(req, timeout=120).read())


def fetch(url):
    for _ in range(3):
        try:
            r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            return urllib.request.urlopen(r, timeout=60).read().decode("utf-8", "replace")
        except Exception:                                    # noqa: BLE001
            time.sleep(2)
    return ""


def old_gallery(handle):
    """Full-size gallery URLs, in page order, deduped."""
    page = fetch(f"{OLD}/product/{handle}/")
    if not page:
        return []
    urls, seen = [], set()
    for u in re.findall(r'data-large_image="([^"]+)"', page):
        u = u.replace("&amp;", "&")
        if u not in seen:
            seen.add(u)
            urls.append(u)
    if not urls:                       # single-image products have no gallery markup
        m = re.search(r'<img[^>]+wp-post-image[^>]*src="([^"]+)"', page)
        if m:
            urls = [m.group(1)]
    return urls


def shopify_products():
    out, page_info = [], None
    while True:
        path = "products.json?limit=250" + (f"&page_info={page_info}" if page_info else "")
        req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/{path}")
        req.add_header("X-Shopify-Access-Token", TOK)
        resp = urllib.request.urlopen(req, timeout=120)
        data = json.loads(resp.read())
        out += data["products"]
        link = resp.headers.get("Link", "")
        m = re.search(r'page_info=([^>&]+)>; rel="next"', link)
        if not m:
            return out
        page_info = m.group(1)


def basename(u):
    """Filename, normalised for comparison.

    Shopify appends a UUID when an uploaded filename collides with one already
    in the store, so `210.jpg` from WordPress lands as
    `210_2c1e8bc4-d5fa-497a-9b3e-70ac2801dd14.jpg`. Comparing raw filenames
    therefore reports images as missing that are already present — it flagged
    8 of 9 on double-sided-exhibition-cloth-tape, and re-uploading would have
    doubled that gallery.
    """
    b = u.split("/")[-1].split("?")[0].lower()
    b = re.sub(r"_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.)", "", b)
    # Shopify rewrites a second dot in the stem: 19018-600x600.png.webp lands
    # as 19018-600x600_png.webp
    b = re.sub(r"\.(png|jpg|jpeg)(?=\.(webp|jpg|png)$)", r"_\1", b)
    return b


def aliases(u):
    """Every filename this source image could be stored under."""
    b = basename(u)
    out = {b}
    if b in HASHES:
        out.add(HASHES[b])
    return out


def main():
    apply = "--apply" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    prods = shopify_products()
    print(f"shopify products: {len(prods)}")

    rows, total_missing = [], 0
    for p in prods:
        gal = old_gallery(p["handle"])
        if not gal:
            continue
        have = {basename(i["src"]) for i in p.get("images", [])}
        missing = [u for u in gal if not (aliases(u) & have)]
        rows.append((p, gal, missing))
        total_missing += len(missing)
        if limit and len([r for r in rows if r[2]]) >= limit:
            break

    # Only fill GENUINE gaps. A product whose Shopify gallery already has as
    # many images as the old site is complete — the "missing" ones there are
    # hashed filenames absent from the manifest, and uploading them would
    # duplicate a gallery that is already right.
    withgal = [r for r in rows if r[2] and len(r[1]) > len(r[0].get("images", []))]
    skipped = [r for r in rows if r[2] and len(r[1]) <= len(r[0].get("images", []))]
    print(f"products with old gallery : {len(rows)}")
    print(f"products missing images   : {len(withgal)}")
    print(f"images to upload          : {total_missing}")
    for p, gal, missing in withgal[:12]:
        print(f"   {p['handle'][:38]:<40} shopify={len(p.get('images', [])):>2} old={len(gal):>2} missing={len(missing)}")
    if len(withgal) > 12:
        print(f"   … and {len(withgal)-12} more")
    if skipped:
        print(f"\nskipped (gallery already complete, names differ): {len(skipped)}")
        for p_, gal, _ in skipped[:6]:
            print(f"   {p_['handle'][:38]:<40} shopify={len(p_.get('images', []))} old={len(gal)}")

    if not apply:
        print("\naudit only — re-run with --apply to upload")
        return

    added, failed = 0, 0
    for p, gal, missing in withgal:
        for pos, url in enumerate(gal, start=1):
            if aliases(url) & {basename(i["src"]) for i in p.get("images", [])}:
                continue
            try:
                rest(f"products/{p['id']}/images.json", "POST",
                     {"image": {"src": url, "position": pos, "alt": p["title"]}})
                added += 1
                time.sleep(0.6)
            except urllib.error.HTTPError as e:
                failed += 1
                print(f"   !! {p['handle']} {basename(url)}: {e.code}")
        print(f"   {p['handle'][:40]:<42} -> {len(gal)} images")
    print(f"\nuploaded: {added}   failed: {failed}")


if __name__ == "__main__":
    main()
