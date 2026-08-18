#!/usr/bin/env python3
"""Restore the APPLICATION diagrams to every product description.

WHAT WAS MISSED, AND WHY NOTHING CAUGHT IT
mytapestore.com.au puts an "…-Applications.png" diagram inside the product
DESCRIPTION — it shows where the tape is actually used. It is not part of the
product gallery, so:

  · sync_product_images.py never saw it (it reads data-large_image, the gallery)
  · upload_variant_images.py never saw it (it reads data-product_variations)

An audit of all 132 cached product pages found 79 products carrying such a
diagram and **0 of them present in Shopify** — neither as product media nor in
the description HTML.

WHERE IT GOES
Into the description, immediately after the `Applications` heading, which is
where the old site has it and where normalise_pdp_layout.py's canonical order
already puts that section:

    intro -> [image] -> Key Features -> Applications -> How to apply -> FAQs

If a product has no Applications heading the diagram is appended at the end
rather than dropped, and that case is reported so it can be reviewed.

DEDUPLICATION — the same diagram is shared by several products (three masking
tapes all use Coloured-Painters-Masking-Tape-Applications.png). Each distinct
file is uploaded to Shopify Files ONCE and its CDN url reused, so the store does
not end up with the same picture stored 79 times.

IDEMPOTENT — a description that already references the image is left alone, so
re-running is safe.

    python3 sync_application_images.py            # dry run
    python3 sync_application_images.py --apply
"""
import glob
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = HERE.parent / ".cache" / "oldsite"
SHOP = "cvbpp2-up.myshopify.com"
API = "2024-10"
APP_RE = re.compile(r"applicat|usage|how-?to|use-?case|diagram", re.I)
IMG_RE = re.compile(
    r'(?:src|data-src|data-large_image)="(https://mytapestore\.com\.au/wp-content/uploads/[^"]+\.(?:jpg|jpeg|png|webp))"',
    re.I)


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


def rest(path, method="GET", body=None):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/{API}/{path}",
                                 data=json.dumps(body).encode() if body else None,
                                 method=method)
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def stem(u):
    n = u.split("?")[0].split("/")[-1]
    n = re.sub(r"\.(jpe?g|png|webp)$", "", n, flags=re.I)
    n = re.sub(r"-\d{2,4}x\d{2,4}$", "", n)
    return re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")


def full_size(u):
    return re.sub(r"-\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)", "", u, flags=re.I)


FILE_CREATE = """
mutation($files:[FileCreateInput!]!){ fileCreate(files:$files){
  files{ ... on MediaImage { id fileStatus image{ url } } }
  userErrors{ field message } } }"""

FILE_NODES = """query($ids:[ID!]!){ nodes(ids:$ids){ ... on MediaImage { id fileStatus image{ url } } } }"""

FILE_SEARCH = """query($q:String!){ files(first:20, query:$q, sortKey:CREATED_AT, reverse:true){
  nodes{ ... on MediaImage { id fileStatus image{ url } } } } }"""


def find_existing(name):
    try:
        for n in gql(FILE_SEARCH, {"q": f"filename:{pathlib.Path(name).stem}*"})["data"]["files"]["nodes"]:
            if n and n.get("fileStatus") == "READY" and n.get("image"):
                if stem(n["image"]["url"]) == stem(name):
                    return n["image"]["url"]
    except Exception:                                        # noqa: BLE001
        pass
    return None


def upload(url):
    """Shopify fetches the file itself from the old site; returns the CDN url."""
    r = gql(FILE_CREATE, {"files": [{"originalSource": url, "contentType": "IMAGE",
                                     "alt": pathlib.Path(url).stem.replace("-", " ")}]})
    node = (r.get("data") or {}).get("fileCreate") or {}
    if node.get("userErrors"):
        raise RuntimeError(node["userErrors"])
    fid = node["files"][0]["id"]
    for _ in range(40):
        n = gql(FILE_NODES, {"ids": [fid]})["data"]["nodes"][0]
        if n and n.get("fileStatus") == "READY" and n.get("image"):
            return n["image"]["url"]
        time.sleep(1.5)
    raise RuntimeError("file never became READY")


APPS_HEADING = re.compile(r"(<h[23][^>]*>\s*Applications\s*</h[23]>)", re.I)


def insert(html, cdn_url, alt):
    """Put the diagram straight after the Applications heading."""
    fig = (f'<p class="pdp-appimg"><img src="{cdn_url}" alt="{alt}" '
           f'loading="lazy" decoding="async"></p>')
    if APPS_HEADING.search(html):
        return APPS_HEADING.sub(r"\1\n" + fig, html, count=1), "after Applications"
    return (html.rstrip() + "\n" + fig), "appended (no Applications heading)"


def main():
    apply = "--apply" in sys.argv

    prods, cur = [], None
    Q = """query($c:String){ products(first:100, after:$c){
      nodes{ id handle title descriptionHtml
             media(first:60){ nodes{ ... on MediaImage { image{ url } } } } }
      pageInfo{ hasNextPage endCursor } } }"""
    while True:
        d = gql(Q, {"c": cur})["data"]["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    by_handle = {p["handle"]: p for p in prods}

    jobs = []
    for f in sorted(glob.glob(str(CACHE / "*.html"))):
        handle = f.split("product_")[-1].replace("_.html", "").replace("_", "-")
        p = by_handle.get(handle)
        if not p:
            continue
        page = pathlib.Path(f).read_text(errors="ignore")
        app = sorted({u for u in IMG_RE.findall(page) if APP_RE.search(u)})
        if not app:
            continue
        body = p["descriptionHtml"] or ""
        have = {stem(m["image"]["url"]) for m in p["media"]["nodes"] if m.get("image")}
        have |= {stem(u) for u in re.findall(r'<img[^>]+src="([^"]+)"', body)}
        lack = [u for u in app if stem(u) not in have]
        if lack:
            jobs.append((p, full_size(lack[0]), lack[0]))

    distinct = sorted({j[1] for j in jobs})
    print(f"products needing an application image : {len(jobs)}")
    print(f"distinct images to upload             : {len(distinct)}")
    with_heading = sum(1 for p, _, _ in jobs if APPS_HEADING.search(p["descriptionHtml"] or ""))
    print(f"  will land inside Applications       : {with_heading}")
    print(f"  will be appended (no such heading)  : {len(jobs) - with_heading}")

    if not apply:
        for p, u, _ in jobs[:15]:
            print(f"   {p['handle'][:40]:<42} {u.split('/')[-1][:46]}")
        if len(jobs) > 15:
            print(f"   … and {len(jobs)-15} more")
        print("\ndry run — pass --apply to upload and edit descriptions")
        return 0

    # one upload per distinct file
    cdn = {}
    for i, u in enumerate(distinct, 1):
        try:
            got = find_existing(u.split("/")[-1]) or upload(u)
            cdn[u] = got
            print(f"[img {i}/{len(distinct)}] {u.split('/')[-1][:52]}")
        except Exception as e:                               # noqa: BLE001
            print(f"[img {i}/{len(distinct)}] FAILED {u.split('/')[-1]}: {e}")

    done = failed = 0
    for i, (p, u, orig) in enumerate(jobs, 1):
        url = cdn.get(u)
        if not url:
            failed += 1
            continue
        try:
            alt = f"{p['title']} applications"
            new, where = insert(p["descriptionHtml"] or "", url, alt.replace('"', "'"))
            rest(f"products/{p['id'].split('/')[-1]}.json", "PUT",
                 {"product": {"id": int(p["id"].split("/")[-1]), "body_html": new}})
            done += 1
            if i % 15 == 0:
                print(f"   {i}/{len(jobs)}")
            time.sleep(0.55)
        except Exception as e:                               # noqa: BLE001
            print(f"   {p['handle']}: FAILED {e}")
            failed += 1

    print(f"\nupdated {done}, failed {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
