#!/usr/bin/env python3
"""Check (and fix) that every category lists products in the old site's order.

The order is carried by the `custom.product_order` metafield and rendered by
mts-collection.liquid. This compares that stored order against a fresh scrape of
mytapestore.com.au for EVERY collection, not just the ones handled first time,
and rewrites any that drift.

Comparing metafield-vs-scrape rather than fetching 67 storefront pages is
deliberate: the storefront rate-limits and bot-challenges a burst of requests,
and the rendered order is a pure function of this metafield anyway.

Old-site URLs are tried in several shapes, because categories sat at the root
(/masking-tape/) while industry pages may sit elsewhere.

    python3 verify_collection_order.py            # report only
    python3 verify_collection_order.py --apply
"""
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


def fetch(url, tries=2):
    for i in range(tries):
        try:
            r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0",
                                                     "Accept": "text/html,*/*"})
            resp = urllib.request.urlopen(r, timeout=60)
            if resp.getcode() == 200:
                return resp.read().decode("utf-8", "replace")
        except Exception:                                    # noqa: BLE001
            time.sleep(1.0 * (i + 1))
    return ""


CAT_URLS = {}


def load_category_urls():
    """handle -> real old-site URL, straight from the category sitemap.

    Guessing `/{handle}/` only finds the top-level categories. Industry pages
    live at /industry/<h>/ and some sub-categories at /masking-tape/<h>/, so the
    sitemap is the only reliable source of the URL shape.
    """
    xml = fetch(f"{OLD}/product_cat-sitemap.xml")
    for u in re.findall(r"<loc>([^<]+)</loc>", xml):
        CAT_URLS[u.rstrip("/").split("/")[-1]] = u
    return CAT_URLS


def old_order(handle):
    """Product handles in the order the old category lists them, across pages."""
    bases = []
    if handle in CAT_URLS:
        bases.append(CAT_URLS[handle])
    bases += [f"{OLD}/{handle}/", f"{OLD}/industry/{handle}/"]
    for base in bases:
        order, page = [], 1
        while page <= 12:
            url = base if page == 1 else f"{base.rstrip('/')}/page/{page}/"
            html = fetch(url)
            if not html:
                break
            found, new = [], []
            for h in re.findall(r"/product/([a-z0-9\-]+)", html):
                if h not in found:
                    found.append(h)
            for h in found:
                if h not in order:
                    new.append(h)
            if not new:
                break
            order += new
            if f"/page/{page + 1}" not in html:
                break
            page += 1
        if order:
            return order
    return []


COLLECTIONS = """query($c:String){ collections(first:60, after:$c){
  pageInfo{hasNextPage endCursor}
  nodes{ id handle title
    metafield(namespace:"custom", key:"product_order"){ value }
    products(first:250){ nodes{ id handle } } } } }"""

SET = """mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{field message} } }"""


def main():
    apply = "--apply" in sys.argv
    load_category_urls()
    print(f"old-site category URLs from sitemap: {len(CAT_URLS)}")
    cols, cur = [], None
    while True:
        d = gql(COLLECTIONS, {"c": cur})["collections"]
        cols += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    print(f"collections: {len(cols)}")

    def check(c):
        members = {p["handle"]: p["id"] for p in c["products"]["nodes"]}
        if not members:
            return (c, "empty", None, None)
        want_handles = [h for h in old_order(c["handle"]) if h in members]
        if not want_handles:
            return (c, "no old-site page", None, None)

        want_ids = [members[h] for h in want_handles]
        have_ids = []
        if c.get("metafield"):
            try:
                have_ids = json.loads(c["metafield"]["value"])
            except Exception:                                # noqa: BLE001
                have_ids = []
        # only the pinned prefix has to agree; extras follow in Shopify's order
        ok = have_ids[:len(want_ids)] == want_ids
        return (c, "match" if ok else "MISMATCH", want_ids, want_handles)

    rows = []
    with cf.ThreadPoolExecutor(6) as ex:
        rows = list(ex.map(check, cols))

    import collections as C
    tally = C.Counter(r[1] for r in rows)
    print(f"\n{dict(tally)}\n")
    bad = [r for r in rows if r[1] == "MISMATCH"]
    for c, _, want, handles in bad:
        have = []
        if c.get("metafield"):
            try:
                ids = json.loads(c["metafield"]["value"])
                byid = {p["id"]: p["handle"] for p in c["products"]["nodes"]}
                have = [byid.get(i, "?") for i in ids]
            except Exception:                                # noqa: BLE001
                pass
        print(f"  ✗ {c['handle']}")
        print(f"      want: {handles[:6]}")
        print(f"      have: {have[:6] or '(no pinned order)'}")
    for c, kind, _, _ in rows:
        if kind == "no old-site page":
            print(f"  – {c['handle']}: no matching page on the old site")

    if not apply or not bad:
        if not bad:
            print("\nevery category with an old-site page matches.")
        else:
            print("\nreport only — re-run with --apply")
        return

    payload = [{"ownerId": c["id"], "namespace": "custom", "key": "product_order",
                "type": "list.product_reference", "value": json.dumps(want)}
               for c, _, want, _ in bad]
    for i in range(0, len(payload), 20):
        r = gql(SET, {"m": payload[i:i + 20]})["metafieldsSet"]
        if r["userErrors"]:
            print("   !!", r["userErrors"][:2])
        time.sleep(0.4)
    print(f"\nrewrote product_order on {len(payload)} collections")

    # a write to the collection is what drops its cached page
    UP = """mutation($i:CollectionInput!){ collectionUpdate(input:$i){ userErrors{message} } }"""
    Q = """query($id:ID!){ collection(id:$id){ ruleSet{ appliedDisjunctively rules{column relation condition} } } }"""
    for c, _, _, _ in bad:
        rs = gql(Q, {"id": c["id"]})["collection"].get("ruleSet")
        if not rs:
            continue
        gql(UP, {"i": {"id": c["id"], "ruleSet": {
            "appliedDisjunctively": rs["appliedDisjunctively"],
            "rules": [{"column": x["column"], "relation": x["relation"],
                       "condition": x["condition"]} for x in rs["rules"]]}}})
        time.sleep(0.35)
    print("page caches busted so the new order is served immediately")


if __name__ == "__main__":
    main()
