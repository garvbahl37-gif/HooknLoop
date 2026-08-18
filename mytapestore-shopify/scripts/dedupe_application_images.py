#!/usr/bin/env python3
"""Remove the application diagram where the description already had it.

THE BUG
sync_application_images.py decided "is this diagram already here?" by comparing
FILENAME STEMS. That misses the case where the very same picture was migrated
earlier under an opaque name:

    double-sided-premium-tissue-tape   8bc89faf8833.jpg  +  Tissue-Tape-Applications.png
    reverse-wound-tissue-tape          035d5b5e1573.jpg  +  Reverse-Wound-Tissue-Tape-Applications.png

`8bc89faf8833` tells you nothing, so the stem test passed and a second copy went
in. The diagram then rendered twice on the product page.

WHY NOT COMPARE BYTES
The pair is often a .jpg and a .png of the same artwork — re-encoded, so the
bytes differ entirely while the picture is identical. Comparing file size or a
checksum would report "different" every time.

So this compares the PICTURES: each image is reduced to 16x16 greyscale and
turned into a 256-bit average hash. Two images whose hashes differ by <= 8 bits
are the same artwork. That tolerates re-encoding and mild resizing while still
telling two genuinely different diagrams apart.

SAFE BY CONSTRUCTION — only the block this project inserted is ever removed. It
was wrapped in `<p class="pdp-appimg">` precisely so it could be identified and
withdrawn without touching a single character of the original copy. The
pre-existing image always wins; the newer duplicate is the one that goes.

    python3 dedupe_application_images.py            # dry run
    python3 dedupe_application_images.py --apply
"""
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
SHOP = "cvbpp2-up.myshopify.com"
API = "2024-10"
HAMMING_MAX = 8                      # bits of tolerance for re-encoding


def env(k):
    for line in (ROOT / "newsletter" / ".env.local").read_text().splitlines():
        if line.startswith(k + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return None


TOK = env("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE") or env("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE")
if not TOK:
    sys.exit("no admin token")

APPIMG = re.compile(r'<p class="pdp-appimg">.*?</p>', re.S)
IMG_SRC = re.compile(r'<img[^>]+src="([^"]+)"')


def gql(q, v=None):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/{API}/graphql.json",
                                 data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 method="POST")
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def rest(path, method="GET", body=None):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/{API}/{path}",
                                 data=json.dumps(body).encode() if body else None,
                                 method=method)
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


_cache = {}


def ahash(url):
    """256-bit average hash of the picture, format-independent."""
    if url in _cache:
        return _cache[url]
    try:
        req = urllib.request.Request(url if url.startswith("http") else "https:" + url)
        req.add_header("User-Agent", "Mozilla/5.0")
        with urllib.request.urlopen(req, timeout=60) as r:
            im = Image.open(BytesIO(r.read()))
        # flatten transparency: a PNG diagram on alpha vs a JPG on white are the
        # same artwork, and without this they hash completely differently.
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
            im = Image.alpha_composite(bg, im)
        im = im.convert("L").resize((16, 16))
        px = list(im.getdata())
        avg = sum(px) / len(px)
        h = 0
        for v in px:
            h = (h << 1) | (1 if v >= avg else 0)
        _cache[url] = h
        return h
    except Exception:                                        # noqa: BLE001
        _cache[url] = None
        return None


def hamming(a, b):
    return bin(a ^ b).count("1")


def main():
    apply = "--apply" in sys.argv

    prods, cur = [], None
    Q = """query($c:String){ products(first:100, after:$c){
      nodes{ id handle descriptionHtml }
      pageInfo{ hasNextPage endCursor } } }"""
    while True:
        d = gql(Q, {"c": cur})["data"]["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    jobs, checked = [], 0
    for p in prods:
        body = p["descriptionHtml"] or ""
        m = APPIMG.search(body)
        if not m:
            continue
        mine = IMG_SRC.search(m.group(0))
        if not mine:
            continue
        mine_url = mine.group(1)
        others = [u for u in IMG_SRC.findall(body) if u != mine_url]
        if not others:
            continue
        checked += 1
        h1 = ahash(mine_url)
        if h1 is None:
            continue
        for u in others:
            h2 = ahash(u)
            if h2 is None:
                continue
            dist = hamming(h1, h2)
            if dist <= HAMMING_MAX:
                jobs.append((p, u.split("/")[-1].split("?")[0], dist))
                break

    print(f"products carrying an inserted diagram alongside others : {checked}")
    print(f"DUPLICATES found (same artwork already present)        : {len(jobs)}")
    for p, other, dist in jobs:
        print(f"   {p['handle'][:44]:<46} already had {other[:34]:<36} (distance {dist})")

    if not apply:
        print("\ndry run — pass --apply to remove the inserted copy")
        return 0

    done = 0
    for p, _o, _d in jobs:
        body = APPIMG.sub("", p["descriptionHtml"] or "", count=1)
        rest(f"products/{p['id'].split('/')[-1]}.json", "PUT",
             {"product": {"id": int(p["id"].split("/")[-1]), "body_html": body}})
        done += 1
        time.sleep(0.55)
    print(f"\nremoved the duplicate from {done} product(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
