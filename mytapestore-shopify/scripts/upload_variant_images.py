#!/usr/bin/env python3
"""Upload the variation-only images that the gallery sync never saw.

THE GAP THIS CLOSES
sync_product_images.py migrates the product GALLERY (`data-large_image`).
WooCommerce also lets a variation carry its own photo, and that photo does not
have to be in the gallery — so it was never migrated. A full audit found:

    92 of 132 products affected
    68 products missing at least one variation image  (89 distinct images)
    321 variants with no image at all

Plain Foil Tape is the clearest case: 24mm and 36mm point at 590.jpg (present),
while 48/72/96mm point at `siver.png`, which exists nowhere in Shopify. Picking
a width therefore changed nothing, which is exactly the reported symptom.

ORDER MATTERS: this must run BEFORE link_variant_images.py. That script matches
an old variation to Shopify media by filename stem and silently skips anything
it cannot find, so linking first would leave every missing image unlinked.

FULL SIZE, NOT THE THUMB — the variation blob points at a resized derivative
(`siver-600x600.png`). The original (`siver.png`) is what gets uploaded; the
sized URL is only used as a fallback when the original 404s, so nothing is
uploaded at 600px when a full-resolution copy exists.

Shopify fetches the file from the old site itself via `originalSource`, so
nothing is proxied through this machine.

    python3 upload_variant_images.py            # dry run — lists every upload
    python3 upload_variant_images.py --apply
    python3 upload_variant_images.py --apply --limit 5
"""
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
REPORT = HERE.parent / "variant-image-audit.json"
SHOP = "cvbpp2-up.myshopify.com"
API = "2024-10"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"


def token():
    env = ROOT / "newsletter" / ".env.local"
    got = {}
    for line in env.read_text().splitlines():
        for k in ("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE", "SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE"):
            if line.startswith(k + "="):
                got[k] = line.split("=", 1)[1].strip().strip("\"'")
    t = got.get("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE") or got.get("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE")
    if not t:
        sys.exit("no admin token in newsletter/.env.local")
    return t


TOK = token()

CREATE_MEDIA = """
mutation($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { ... on MediaImage { id image { url } } status }
    mediaUserErrors { field message }
  }
}"""

PRODUCT_BY_HANDLE = """
query($h: String!) {
  productByHandle(handle: $h) {
    id
    media(first: 60) { nodes { ... on MediaImage { image { url } } } }
  }
}"""


def gql(q, v=None):
    body = json.dumps({"query": q, "variables": v or {}}).encode()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/{API}/graphql.json",
                                 data=body, method="POST")
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())


def full_size(url):
    """Strip WooCommerce's -WxH derivative suffix to get the original upload."""
    return re.sub(r"-\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)", "", url, flags=re.I)


def reachable(url):
    """HEAD the URL — Shopify will refuse a 404 and the error is opaque."""
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method)
            req.add_header("User-Agent", UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                ct = (r.headers.get("Content-Type") or "").lower()
                if r.status == 200 and ct.startswith("image/"):
                    return True
        except Exception:                                    # noqa: BLE001
            continue
    return False


def stem(url):
    name = url.split("/")[-1].split("?")[0]
    name = re.sub(r"\.(jpe?g|png|webp|gif)$", "", name, flags=re.I)
    name = re.sub(r"-\d{2,4}x\d{2,4}$", "", name)
    return name.lower()


def main():
    apply = "--apply" in sys.argv
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None

    if not REPORT.exists():
        sys.exit(f"{REPORT} missing — run audit_variant_images.py first")
    findings = [f for f in json.loads(REPORT.read_text()) if f["missing_images"]]
    if limit:
        findings = findings[:limit]

    print(f"products with missing variation images : {len(findings)}")
    total = sum(len(f["missing_images"]) for f in findings)
    print(f"distinct images to upload              : {total}")
    print()

    planned, unreachable = [], []
    for f in findings:
        for s, d in f["missing_images"].items():
            src = d["url"]
            if src.startswith("//"):
                src = "https:" + src
            full = full_size(src)
            use = full if reachable(full) else (src if reachable(src) else None)
            if not use:
                unreachable.append((f["handle"], s, src))
                continue
            planned.append((f["handle"], s, use, len(d["variations"])))

    print(f"resolved   : {len(planned)}")
    print(f"unreachable: {len(unreachable)}")
    for h, s, u in unreachable[:10]:
        print(f"   {h}: {s} ({u})")

    if not apply:
        print("\nWould upload:")
        for h, s, u, n in planned[:40]:
            print(f"   {h[:38]:<40} {s:<24} covers {n:>2} variation(s)")
        if len(planned) > 40:
            print(f"   … and {len(planned) - 40} more")
        print("\ndry run — pass --apply to upload")
        return 0

    by_handle = {}
    for h, s, u, n in planned:
        by_handle.setdefault(h, []).append((s, u))

    done = failed = skipped = 0
    for i, (handle, items) in enumerate(sorted(by_handle.items()), 1):
        try:
            p = gql(PRODUCT_BY_HANDLE, {"h": handle})["data"]["productByHandle"]
            if not p:
                print(f"[{i}] {handle}: no such product"); failed += 1; continue
            have = {stem(m["image"]["url"]) for m in p["media"]["nodes"] if m.get("image")}
            todo = [(s, u) for s, u in items if s not in have]
            if not todo:
                skipped += len(items); continue

            r = gql(CREATE_MEDIA, {
                "productId": p["id"],
                "media": [{"originalSource": u, "mediaContentType": "IMAGE",
                           "alt": handle.replace("-", " ")} for _, u in todo],
            })
            node = (r.get("data") or {}).get("productCreateMedia") or {}
            errs = node.get("mediaUserErrors") or r.get("errors")
            if errs:
                print(f"[{i}] {handle}: FAILED {json.dumps(errs)[:180]}")
                failed += len(todo)
                continue
            print(f"[{i}] {handle[:40]:<42} +{len(todo)} image(s)")
            done += len(todo)
            time.sleep(0.6)                                  # stay under the bucket
        except Exception as e:                               # noqa: BLE001
            print(f"[{i}] {handle}: ERROR {e}")
            failed += 1

    print(f"\nuploaded {done}, already present {skipped}, failed {failed}")
    print("\nNEXT: python3 link_variant_images.py --apply")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
