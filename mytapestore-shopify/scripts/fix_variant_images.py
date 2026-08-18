#!/usr/bin/env python3
"""Give every variant the photo its WooCommerce counterpart had.

WHAT THE VERIFICATION FOUND
verify_variant_images.py compares each Shopify variant against the old site's
variation, matching PICTURES rather than filenames. On a 25-product sample:

    OK 139   WRONG 0   MISSING 38   EXTRA 0

Zero variants show the wrong photo — so the switching mechanism itself is a
faithful copy of WooCommerce's. The only defect is variants with no image
assigned at all, which is why changing a size sometimes did nothing.

WHY EARLIER PASSES LEFT THESE BEHIND
link_variant_images.py matches by filename stem. That fails three ways at once:
Shopify rewrites names on collision (`549-13d7a686-…`), WooCommerce appends
size suffixes (`-600x600`), and the same artwork often exists as a .jpg on one
side and a .png on the other. So an image could be sitting in the product's
media, perfectly usable, and still look "absent".

HOW THIS ONE MATCHES
Every candidate is reduced to a 16x16 greyscale average hash and compared
perceptually (<= 8 bits apart = same picture). Transparency is flattened onto
white first, so a PNG on alpha and a JPG on white of the same shot still match.
Only if no existing media matches is the image uploaded — so the store does not
accumulate near-duplicates.

    python3 fix_variant_images.py            # dry run, per-variant plan
    python3 fix_variant_images.py --apply
    python3 fix_variant_images.py --apply --only protection-tape
"""
import glob
import html
import json
import pathlib
import re
import sys
import time
import urllib.request
from io import BytesIO

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = HERE.parent / ".cache" / "oldsite"
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


handleize = lambda v: re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", (v or "").lower())).strip("-")
soften = lambda v: re.sub(r"-\d+$", "", v or "")

_h = {}


def ahash(url):
    if url in _h:
        return _h[url]
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
        _h[url] = h
        return h
    except Exception:                                        # noqa: BLE001
        _h[url] = None
        return None


def same(a, b):
    x, y = ahash(a), ahash(b)
    return x is not None and y is not None and bin(x ^ y).count("1") <= HAMMING_MAX


def old_rows(handle):
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
    out = []
    for v in blob:
        img = v.get("image") or {}
        src = img.get("full_src") or img.get("src") or ""
        if not src:
            continue
        vals = {handleize(x) for x in (v.get("attributes") or {}).values() if x}
        out.append((vals, {soften(x) for x in vals}, src))
    return out


CREATE_MEDIA = """
mutation($productId:ID!,$media:[CreateMediaInput!]!){
  productCreateMedia(productId:$productId, media:$media){
    media{ ... on MediaImage { id image{ url } } }
    mediaUserErrors{ field message } } }"""

BULK = """
mutation($productId:ID!,$variants:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$productId, variants:$variants){
    userErrors{ field message } } }"""

MEDIA_Q = """query($id:ID!){ product(id:$id){ media(first:60){ nodes{
  ... on MediaImage { id fileStatus image{ url } } } } } }"""


def main():
    apply = "--apply" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None

    prods, cur = [], None
    Q = """query($c:String){ products(first:100, after:$c){
      nodes{ id handle
        media(first:60){ nodes{ ... on MediaImage { id image{ url } } } }
        variants(first:100){ nodes{ id title image{ url } selectedOptions{ name value } } } }
      pageInfo{ hasNextPage endCursor } } }"""
    while True:
        d = gql(Q, {"c": cur})["data"]["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    plans = []
    for p in prods:
        if only and p["handle"] != only:
            continue
        rows = old_rows(p["handle"])
        if not rows:
            continue
        media = [m for m in p["media"]["nodes"] if m.get("image")]
        need = []
        for var in p["variants"]["nodes"]:
            if var.get("image"):
                continue                                     # already correct (verified WRONG=0)
            vals = {handleize(o["value"]) for o in var["selectedOptions"]}
            soft = {soften(x) for x in vals}
            want, best = None, -1
            for e, _s, url in rows:
                if e and e <= vals and len(e) > best:
                    want, best = url, len(e)
            if want is None:
                for _e, s, url in rows:
                    if s and s <= soft and len(s) > best:
                        want, best = url, len(s)
            if want:
                need.append((var["id"], var["title"], want))
        if need:
            plans.append((p, media, need))

    total = sum(len(n) for _p, _m, n in plans)
    print(f"products with unassigned variants : {len(plans)}")
    print(f"variants to assign                : {total}")

    if not apply:
        for p, _m, need in plans[:12]:
            print(f"   {p['handle'][:40]:<42} {len(need)} variant(s)")
            for _id, title, url in need[:3]:
                print(f"       {title[:34]:<36} <- {url.split('/')[-1][:34]}")
        print("\ndry run — pass --apply")
        return 0

    linked = uploaded = failed = 0
    for i, (p, media, need) in enumerate(plans, 1):
        try:
            # resolve each wanted picture to a media id, reusing existing media
            # whenever the SAME PICTURE is already on the product.
            resolved, to_upload = {}, {}
            for _id, _t, url in need:
                if url in resolved:
                    continue
                hit = next((m["id"] for m in media if same(m["image"]["url"], url)), None)
                if hit:
                    resolved[url] = hit
                else:
                    to_upload[url] = None

            if to_upload:
                r = gql(CREATE_MEDIA, {"productId": p["id"], "media": [
                    {"originalSource": u, "mediaContentType": "IMAGE",
                     "alt": p["handle"].replace("-", " ")} for u in to_upload]})
                node = (r.get("data") or {}).get("productCreateMedia") or {}
                if node.get("mediaUserErrors"):
                    print(f"[{i}] {p['handle']}: upload FAILED {json.dumps(node['mediaUserErrors'])[:150]}")
                    failed += len(need)
                    continue
                uploaded += len(to_upload)
                # media ids come back in request order, but poll to be certain
                for _ in range(30):
                    fresh = gql(MEDIA_Q, {"id": p["id"]})["data"]["product"]["media"]["nodes"]
                    fresh = [m for m in fresh if m.get("image") and m.get("fileStatus") == "READY"]
                    if len(fresh) >= len(media) + len(to_upload):
                        media = fresh
                        break
                    time.sleep(2)
                for u in list(to_upload):
                    hit = next((m["id"] for m in media if same(m["image"]["url"], u)), None)
                    if hit:
                        resolved[u] = hit

            updates = [{"id": vid, "mediaId": resolved[url]}
                       for vid, _t, url in need if resolved.get(url)]
            if not updates:
                failed += len(need)
                continue
            r = gql(BULK, {"productId": p["id"], "variants": updates})
            errs = ((r.get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
            if errs:
                print(f"[{i}] {p['handle']}: link FAILED {json.dumps(errs)[:150]}")
                failed += len(updates)
                continue
            linked += len(updates)
            print(f"[{i}/{len(plans)}] {p['handle'][:40]:<42} +{len(updates)} linked")
            time.sleep(0.5)
        except Exception as e:                               # noqa: BLE001
            print(f"[{i}] {p['handle']}: ERROR {e}")
            failed += len(need)

    print(f"\nlinked {linked} variant(s), uploaded {uploaded} image(s), failed {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
