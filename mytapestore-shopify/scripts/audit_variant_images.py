#!/usr/bin/env python3
"""Find the product images that exist on mytapestore.com.au but NOT in Shopify —
specifically the ones attached to a VARIATION rather than to the gallery.

WHY sync_product_images.py REPORTS "0 MISSING" AND IS STILL WRONG
That script reads `data-large_image` — the main product gallery. WooCommerce
also lets a variation carry its own photo, and that photo does NOT have to be in
the gallery. Plain Foil Tape is the proof:

    gallery        590.jpg, 591.jpg, 592.jpg          <- all three in Shopify
    24mm, 36mm  -> 590-600x600.jpg                    <- in Shopify
    48/72/96mm  -> siver-600x600.png                  <- NOWHERE in Shopify

So the gallery audit passes while three of five widths have no image at all, and
picking a width changes nothing. That is the "width images are missing" report.

WHAT THIS DOES (read-only)
For every Shopify product, fetch the old product page, parse the
`data-product_variations` JSON, and for each variation record:

    variation attributes  ->  image filename stem

then compare those stems against the product's Shopify media. Anything absent is
reported, with the attributes that point at it, so the fix is obvious.

MATCHING — WooCommerce appends a size suffix (`-600x600`) and Shopify appends a
version query and sometimes a collision suffix. Both are stripped before
comparing, exactly as link_variant_images.py does, so `siver-600x600.png` and
`siver.png` are recognised as one image.

Pages are cached under .cache/oldsite so re-runs are fast and the old site is
not hammered.

    python3 audit_variant_images.py                # audit, writes a report
    python3 audit_variant_images.py --limit 20     # quick sample
"""
import html
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = HERE.parent / ".cache" / "oldsite"
OLD = "https://mytapestore.com.au"
SHOP = "cvbpp2-up.myshopify.com"
API = "2024-10"
REPORT = HERE.parent / "variant-image-audit.json"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
SIZE_SUFFIX = re.compile(r"-\d{2,4}x\d{2,4}$")


def token():
    env = ROOT / "newsletter" / ".env.local"
    vals = {}
    for line in env.read_text().splitlines():
        for k in ("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE", "SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE"):
            if line.startswith(k + "="):
                vals[k] = line.split("=", 1)[1].strip().strip("\"'")
    t = vals.get("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE") or vals.get("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE")
    if not t:
        sys.exit("no admin token in newsletter/.env.local")
    return t


TOK = token()


def stem(url):
    """Filename without extension, WooCommerce size suffix or Shopify query."""
    name = (url or "").split("?")[0].split("/")[-1]
    base = os.path.splitext(name)[0]
    return SIZE_SUFFIX.sub("", base).lower()


def gql(query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/{API}/graphql.json",
                                 data=body, method="POST")
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())


def shopify_products():
    out, cur = [], None
    q = """query($c: String) {
      products(first: 100, after: $c) {
        nodes {
          id handle title
          media(first: 60) { nodes { ... on MediaImage { id image { url } } } }
          variants(first: 100) { nodes { id title image { url }
            selectedOptions { name value } } }
        }
        pageInfo { hasNextPage endCursor }
      } }"""
    while True:
        d = gql(q, {"c": cur})["data"]["products"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


def fetch(url, tries=3):
    CACHE.mkdir(parents=True, exist_ok=True)
    key = CACHE / (re.sub(r"[^a-z0-9]+", "_", url.lower())[-120:] + ".html")
    if key.exists() and key.stat().st_size > 500:
        return key.read_text(errors="ignore")
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url)
            req.add_header("User-Agent", UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                txt = r.read().decode("utf-8", "ignore")
            key.write_text(txt)
            return txt
        except Exception as e:                              # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


def old_variations(handle):
    """-> [ {attrs: {...}, image_stem: str, image_url: str} ] (may be empty)."""
    try:
        page = fetch(f"{OLD}/product/{handle}/")
    except Exception:                                       # noqa: BLE001
        return None                                         # page gone
    m = re.search(r'data-product_variations="([^"]+)"', page)
    if not m:
        return []
    try:
        blob = json.loads(html.unescape(m.group(1)))
    except Exception:                                       # noqa: BLE001
        return []
    out = []
    for v in blob:
        img = (v.get("image") or {}).get("src") or ""
        if not img:
            continue
        attrs = {k.replace("attribute_pa_", "").replace("attribute_", ""): val
                 for k, val in (v.get("attributes") or {}).items() if val}
        out.append({"attrs": attrs, "image_stem": stem(img), "image_url": img})
    return out


def main():
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None

    prods = shopify_products()
    if limit:
        prods = prods[:limit]
    print(f"shopify products : {len(prods)}")

    findings = []
    no_page = 0
    total_missing = 0

    for i, p in enumerate(prods, 1):
        have = {stem(m["image"]["url"]) for m in p["media"]["nodes"]
                if m.get("image")}
        vars_ = old_variations(p["handle"])
        if vars_ is None:
            no_page += 1
            continue
        missing = {}
        for v in vars_:
            if v["image_stem"] and v["image_stem"] not in have:
                missing.setdefault(v["image_stem"], {
                    "url": v["image_url"], "variations": []})
                missing[v["image_stem"]]["variations"].append(v["attrs"])
        linked = sum(1 for v in p["variants"]["nodes"] if v["image"])
        if missing or (vars_ and linked == 0):
            findings.append({
                "handle": p["handle"],
                "title": p["title"],
                "shopify_media": len(have),
                "variants": len(p["variants"]["nodes"]),
                "variants_linked": linked,
                "old_variations_with_image": len(vars_),
                "missing_images": missing,
            })
            total_missing += len(missing)
        if i % 20 == 0:
            print(f"  …{i}/{len(prods)}")

    REPORT.write_text(json.dumps(findings, indent=2))

    need_upload = [f for f in findings if f["missing_images"]]
    need_link = [f for f in findings if not f["missing_images"] and f["variants_linked"] == 0]

    print(f"\nold pages not reachable      : {no_page}")
    print(f"products needing NEW images  : {len(need_upload)}  ({total_missing} distinct images)")
    print(f"products needing only LINKING: {len(need_link)}")
    print(f"\nreport written to {REPORT}")

    if need_upload:
        print("\nMissing variation images (first 15):")
        for f in need_upload[:15]:
            print(f"  {f['handle'][:40]:<42} shopify={f['shopify_media']} "
                  f"variants={f['variants']} linked={f['variants_linked']}")
            for s, d in list(f["missing_images"].items())[:3]:
                attrs = ", ".join(
                    "/".join(str(x) for x in a.values()) for a in d["variations"][:3])
                print(f"      {s:<28} <- {attrs}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
