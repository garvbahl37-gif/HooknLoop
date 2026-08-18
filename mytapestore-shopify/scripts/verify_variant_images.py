#!/usr/bin/env python3
"""Prove, variant by variant, that Shopify shows the same photo the old site does.

THE MECHANISM BEING REPLICATED
WooCommerce ships every variation in `data-product_variations`:

    {"attributes": {"attribute_pa_choose-your-size": "24mm-x-50m",
                    "attribute_pa_color": "silver-2"},
     "image": {"full_src": ".../590.jpg", "src": ".../590-600x600.jpg"}}

Selecting options finds the variation matching ALL chosen values and swaps the
main photo to its image. Shopify's equivalent is `variant.featured_media`, and
the theme's paintImage() swaps on variant change. The two are functionally the
same — so correctness is entirely a question of whether each Shopify variant
carries the picture its WooCommerce counterpart had.

This checks exactly that, and reports one of four verdicts per variant:

    OK        same picture
    WRONG     both have an image, but different pictures
    MISSING   the old site had one, Shopify variant has none
    EXTRA     Shopify has one, the old site did not

COMPARISON IS PERCEPTUAL, NOT BY NAME. Filenames cannot be trusted in either
direction: Shopify rewrites them on collision (`549-13d7a686-…`), WooCommerce
appends size suffixes (`-600x600`), and the same artwork frequently exists as
both .jpg and .png. Every image is reduced to 16x16 greyscale and hashed;
<= 8 bits apart is the same picture. That is the check that caught 64 duplicate
diagrams a name-based test had missed.

ATTRIBUTE MATCHING mirrors link_variant_images.py — exact subset first, then a
relaxed pass that drops WooCommerce's `-2` term-slug collision suffix
(`silver-2` vs Shopify's `Silver`).

Read-only. Writes a JSON report; changes nothing.

    python3 verify_variant_images.py
    python3 verify_variant_images.py --limit 20
"""
import glob
import html
import json
import pathlib
import re
import sys
import urllib.request
from io import BytesIO

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = HERE.parent / ".cache" / "oldsite"
REPORT = HERE.parent / "variant-image-verification.json"
SHOP = "cvbpp2-up.myshopify.com"
API = "2024-10"
HAMMING_MAX = 8


def env(k):
    for line in (ROOT / "newsletter" / ".env.local").read_text().splitlines():
        if line.startswith(k + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return None


TOK = env("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE") or env("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE")
if not TOK:
    sys.exit("no admin token")


def gql(q, v=None):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/{API}/graphql.json",
                                 data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 method="POST")
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def handleize(v):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", (v or "").lower())).strip("-")


def soften(v):
    return re.sub(r"-\d+$", "", v or "")


_hash = {}


def ahash(url):
    if url in _hash:
        return _hash[url]
    try:
        u = url if url.startswith("http") else "https:" + url
        req = urllib.request.Request(u)
        req.add_header("User-Agent", "Mozilla/5.0")
        with urllib.request.urlopen(req, timeout=60) as r:
            im = Image.open(BytesIO(r.read()))
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            im = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im)
        im = im.convert("L").resize((16, 16))
        px = list(im.getdata())
        avg = sum(px) / len(px)
        h = 0
        for v in px:
            h = (h << 1) | (1 if v >= avg else 0)
        _hash[url] = h
        return h
    except Exception:                                        # noqa: BLE001
        _hash[url] = None
        return None


def same_picture(a, b):
    ha, hb = ahash(a), ahash(b)
    if ha is None or hb is None:
        return None                                          # undecidable
    return bin(ha ^ hb).count("1") <= HAMMING_MAX


def old_map(handle):
    """-> [(exact attr set, relaxed attr set, image url)] or None if no page."""
    fs = glob.glob(str(CACHE / f"*product_{handle.replace('-', '_')}_.html"))
    if not fs:
        return None
    t = pathlib.Path(fs[0]).read_text(errors="ignore")
    m = re.search(r'data-product_variations="([^"]+)"', t)
    if not m:
        return []
    try:
        blob = json.loads(html.unescape(m.group(1)))
    except Exception:                                        # noqa: BLE001
        return []
    rows = []
    for v in blob:
        img = (v.get("image") or {})
        src = img.get("full_src") or img.get("src") or ""
        if not src:
            continue
        vals = {handleize(x) for x in (v.get("attributes") or {}).values() if x}
        rows.append((vals, {soften(x) for x in vals}, src))
    return rows


def main():
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None

    prods, cur = [], None
    Q = """query($c:String){ products(first:100, after:$c){
      nodes{ handle title
             variants(first:100){ nodes{ id title image{ url }
               selectedOptions{ name value } } } }
      pageInfo{ hasNextPage endCursor } } }"""
    while True:
        d = gql(Q, {"c": cur})["data"]["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    if limit:
        prods = prods[:limit]

    tally = {"OK": 0, "WRONG": 0, "MISSING": 0, "EXTRA": 0, "NO_OLD": 0, "UNDECIDED": 0}
    report = []

    for i, p in enumerate(prods, 1):
        rows = old_map(p["handle"])
        if rows is None:
            tally["NO_OLD"] += len(p["variants"]["nodes"])
            continue
        issues = []
        for var in p["variants"]["nodes"]:
            vals = {handleize(o["value"]) for o in var["selectedOptions"]}
            soft = {soften(x) for x in vals}
            want, best = None, -1
            for exact, _s, url in rows:
                if exact and exact <= vals and len(exact) > best:
                    want, best = url, len(exact)
            if want is None:
                for _e, s, url in rows:
                    if s and s <= soft and len(s) > best:
                        want, best = url, len(s)

            got = (var.get("image") or {}).get("url")
            if want and not got:
                tally["MISSING"] += 1
                issues.append({"variant": var["title"], "verdict": "MISSING",
                               "expected": want.split("/")[-1], "variantId": var["id"]})
            elif want and got:
                same = same_picture(got, want)
                if same is None:
                    tally["UNDECIDED"] += 1
                elif same:
                    tally["OK"] += 1
                else:
                    tally["WRONG"] += 1
                    issues.append({"variant": var["title"], "verdict": "WRONG",
                                   "expected": want.split("/")[-1],
                                   "actual": got.split("/")[-1].split("?")[0],
                                   "variantId": var["id"]})
            elif got and not want:
                tally["EXTRA"] += 1
        if issues:
            report.append({"handle": p["handle"], "title": p["title"], "issues": issues})
        if i % 20 == 0:
            print(f"  …{i}/{len(prods)}")

    REPORT.write_text(json.dumps(report, indent=2))
    total = sum(tally.values())
    print("\nPER-VARIANT VERDICT (vs mytapestore.com.au)")
    for k in ["OK", "WRONG", "MISSING", "EXTRA", "UNDECIDED", "NO_OLD"]:
        print(f"  {k:<10} {tally[k]:>5}")
    print(f"  {'TOTAL':<10} {total:>5}")
    print(f"\nproducts with at least one issue : {len(report)}")
    print(f"report: {REPORT}")
    for r in report[:12]:
        print(f"   {r['handle'][:40]:<42} {len(r['issues'])} issue(s)  "
              f"e.g. {r['issues'][0]['verdict']} on {r['issues'][0]['variant'][:26]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
