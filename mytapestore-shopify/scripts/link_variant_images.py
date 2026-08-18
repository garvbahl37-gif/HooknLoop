#!/usr/bin/env python3
"""Attach each variant to its own image, so picking a colour changes the photo.

THE PROBLEM
Not one variant on the store has an image linked — the migration imported
product media but never associated it with variants. So a shopper picks "Black"
and the gallery keeps showing the white roll. No amount of theme code fixes
that; the association simply does not exist.

WHY THE OLD SITE IS THE SOURCE
Shopify's own data cannot answer "which image is the black one": the migrated
filenames are numeric (210.jpg, 783.jpg) and the alt text is empty. The old
WooCommerce product pages carry `data-product_variations`, a JSON blob giving
every variation's attributes AND its image — the association we lost.

    {"attribute_pa_color": "brown", ...  "image": {"src": ".../221-600x600.jpg"}}

MATCHING
  · old image  221-600x600.jpg  ->  stem "221"
  · Shopify    221.jpg?v=…      ->  stem "221"
    (WooCommerce size suffixes, Shopify's collision suffixes and its version
     query are all stripped before comparing.)
  · a Shopify variant matches an old variation when the variation's non-empty
    attribute values are a subset of the variant's handleized option values;
    the most specific match wins, so a colour-only variation still covers every
    size in that colour.

Nothing is guessed: a variant with no confident match is left alone and counted.

    python3 link_variant_images.py            # dry run
    python3 link_variant_images.py --apply
"""
import html as htmllib
import json
import pathlib
import re
import sys
import time
import urllib.request
import concurrent.futures as cf

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOP = "cvbpp2-up.myshopify.com"
OLD = "https://mytapestore.com.au"


def token():
    for line in (ROOT.parent / "newsletter" / ".env.local").read_text().splitlines():
        if line.startswith("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE="):
            return line.split("=", 1)[1].strip().strip("\"'")
    sys.exit("admin token not found")


TOK = token()


def gql(q, v=None):
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/graphql.json",
        data=json.dumps({"query": q, "variables": v or {}}).encode(), method="POST")
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    out = json.loads(urllib.request.urlopen(req, timeout=180).read())
    if "errors" in out:
        raise RuntimeError(out["errors"])
    return out["data"]


def fetch(url, tries=3):
    for i in range(tries):
        try:
            r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0",
                                                     "Accept": "text/html,*/*"})
            return urllib.request.urlopen(r, timeout=90).read().decode("utf-8", "replace")
        except Exception:                                    # noqa: BLE001
            time.sleep(1.2 * (i + 1))
    return ""


def handleize(v):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", (v or "").lower())).strip("-")


def soften(v):
    """Drop a WooCommerce term-slug collision suffix: `silver-2` -> `silver`.

    WooCommerce appends -2/-3 when a term slug is already taken, so the same
    colour can be `silver` on one product and `silver-2` on another. Shopify
    imported the LABEL ("Silver"), so the exact subset test failed on every
    product carrying a suffixed slug — plain-foil-tape among them, which is why
    five widths stayed unlinked even after their image was uploaded.

    Only ever used as a FALLBACK after an exact match fails.
    """
    return re.sub(r"-\d+$", "", v or "")


def stem(url):
    """Filename stem, with WooCommerce/Shopify size and collision suffixes gone."""
    name = url.split("/")[-1].split("?")[0]
    name = re.sub(r"\.(jpe?g|png|webp|gif)$", "", name, flags=re.I)
    name = re.sub(r"-\d{2,4}x\d{2,4}$", "", name)            # -600x600
    name = re.sub(r"_\d{2,4}x\d{2,4}$", "", name)            # _600x600
    # Shopify appends a UUID when the filename is already taken in the store —
    # "549.jpg" arrives back as "549-13d7a686-79f3-40ac-b9ce.jpg". The old rule
    # below only caught ONE hex block, so a real UUID (8-4-4-4[-12]) survived and
    # the stem never matched its source. That alone accounted for 28 products
    # whose images were present but unlinkable.
    name = re.sub(r"-[0-9a-f]{8}(?:-[0-9a-f]{4}){1,4}(?:-[0-9a-f]{12})?$", "",
                  name, flags=re.I)
    name = re.sub(r"-[0-9a-f]{8,}$", "", name, flags=re.I)   # single-block hash
    name = re.sub(r"_\d+$", "", name)                        # _1, _2
    return handleize(name)


PRODUCTS = """query($c:String){ products(first:50, after:$c){ pageInfo{hasNextPage endCursor}
  nodes{ id handle
    media(first:30){ nodes{ ... on MediaImage { id image{ url } } } }
    variants(first:100){ nodes{ id title image{ id } selectedOptions{ name value } } } } } }"""

BULK = """mutation($productId:ID!, $variants:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$productId, variants:$variants){
    userErrors{ field message } } }"""


def old_variations(handle):
    page = fetch(f"{OLD}/product/{handle}/")
    if not page:
        return []
    m = re.search(r'data-product_variations="([^"]+)"', page)
    if not m:
        return []
    try:
        return json.loads(htmllib.unescape(m.group(1)))
    except Exception:                                        # noqa: BLE001
        return []


def plan_for(p):
    """[(variantId, mediaId)] plus a short reason string for reporting."""
    media = [m for m in p["media"]["nodes"] if m.get("image")]
    if len(media) < 2:
        return [], "single image"
    by_stem = {}
    for m in media:
        by_stem.setdefault(stem(m["image"]["url"]), m["id"])

    variations = old_variations(p["handle"])
    if not variations:
        return [], "no old-site variation data"

    # old variation -> (exact value set, relaxed value set, media id)
    rows = []
    for v in variations:
        src = ((v.get("image") or {}).get("src") or "")
        mid = by_stem.get(stem(src)) if src else None
        if not mid:
            continue
        vals = {handleize(x) for x in (v.get("attributes") or {}).values() if x}
        rows.append((vals, {soften(x) for x in vals}, mid))
    if not rows:
        return [], "old images did not match any Shopify media"

    out, unmatched = [], 0
    for var in p["variants"]["nodes"]:
        if var.get("image"):
            continue                                         # already linked
        vals = {handleize(o["value"]) for o in var["selectedOptions"]}
        soft_vals = {soften(x) for x in vals}

        # Exact first; only fall back to the relaxed comparison if nothing
        # matched, so a genuine "-2" size can never be swallowed by a slug
        # that merely LOOKS like a collision suffix.
        best, best_n = None, -1
        for wanted, _soft, mid in rows:
            if wanted and wanted <= vals and len(wanted) > best_n:
                best, best_n = mid, len(wanted)
        if best is None:
            for _wanted, soft, mid in rows:
                if soft and soft <= soft_vals and len(soft) > best_n:
                    best, best_n = mid, len(soft)

        if best:
            out.append((var["id"], best))
        else:
            unmatched += 1
    return out, (f"{unmatched} variant(s) unmatched" if unmatched else "")


def main():
    apply = "--apply" in sys.argv
    prods, cur = [], None
    while True:
        d = gql(PRODUCTS, {"c": cur})["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    print(f"products: {len(prods)}")

    plans = {}
    with cf.ThreadPoolExecutor(6) as ex:
        for p, (pairs, note) in zip(prods, ex.map(plan_for, prods)):
            plans[p["handle"]] = (p, pairs, note)

    linkable = {h: v for h, v in plans.items() if v[1]}
    total = sum(len(v[1]) for v in linkable.values())
    reasons = {}
    for h, (p, pairs, note) in plans.items():
        if not pairs:
            reasons[note] = reasons.get(note, 0) + 1

    print(f"products that can be linked : {len(linkable)}")
    print(f"variants that will get an image: {total}\n")
    print("products with nothing to link:")
    for r, n in sorted(reasons.items(), key=lambda x: -x[1]):
        print(f"   {n:>4}  {r}")
    print("\nsample:")
    for h, (p, pairs, note) in list(linkable.items())[:8]:
        print(f"   {h[:44]:<46} {len(pairs):>3} variants   {note}")

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    done, failed = 0, 0
    for h, (p, pairs, _) in linkable.items():
        try:
            r = gql(BULK, {"productId": p["id"],
                           "variants": [{"id": vid, "mediaId": mid} for vid, mid in pairs]})
            errs = r["productVariantsBulkUpdate"]["userErrors"]
            if errs:
                failed += 1
                print(f"   !! {h}: {errs[:1]}")
            else:
                done += len(pairs)
        except Exception as e:                               # noqa: BLE001
            failed += 1
            print(f"   !! {h}: {str(e)[:90]}")
        time.sleep(0.45)
    print(f"\nlinked {done} variants across {len(linkable) - failed} products   failures: {failed}")

    check = gql("""{ products(first:250){ nodes{ handle variants(first:100){ nodes{ image{ id } } } } } }""")
    withimg = sum(1 for n in check["products"]["nodes"]
                  if any(v.get("image") for v in n["variants"]["nodes"]))
    print(f"products with at least one variant image now: {withimg}")


if __name__ == "__main__":
    main()
