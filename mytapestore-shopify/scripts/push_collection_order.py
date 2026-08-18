#!/usr/bin/env python3
"""Reproduce mytapestore.com.au's category product order on the new store.

THE CONSTRAINT
Every category here is a SMART collection — membership comes from a tag rule.
Shopify only offers a manual sort order on CUSTOM collections, so there is no
native way to say "these three tapes always sit on the first row". Converting
the 66 categories to custom collections would work, but it would throw away the
tag automation that puts a product into its categories the moment it is tagged.

THE APPROACH
Keep the smart collections, and carry the order in a collection metafield
(`custom.product_order`, a list of product references). The collection section
renders that list first and appends anything not in it, so:

  · a newly tagged product still shows up automatically (at the end)
  · a product that loses its tag disappears, because the section only renders
    metafield entries that are actually in the collection
  · merchants can re-order from the collection's own admin page

Order is scraped from the old site's category pages, so the bestseller-first
rows a returning customer knows are preserved exactly.

    python3 push_collection_order.py            # dry run
    python3 push_collection_order.py --apply
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

# old-site category slug -> Shopify collection handle, where they differ
HANDLE_MAP = {
    "hook-loop-tapes": "hook-loop-tapes",
}


def token():
    for line in (ROOT.parent / "newsletter" / ".env.local").read_text().splitlines():
        if line.startswith("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE="):
            return line.split("=", 1)[1].strip().strip("\"'")
    sys.exit("admin token not found")


TOK = token()

SET = """
mutation setMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { key }
    userErrors { field message } } }"""

DEFINE = """
mutation defCreate($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition { id }
    userErrors { code message } } }"""


def gql(q, v=None):
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/graphql.json",
        data=json.dumps({"query": q, "variables": v or {}}).encode(), method="POST")
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    out = json.loads(urllib.request.urlopen(req, timeout=120).read())
    if "errors" in out:
        raise RuntimeError(out["errors"])
    return out["data"]


def rest(path):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/{path}")
    req.add_header("X-Shopify-Access-Token", TOK)
    resp = urllib.request.urlopen(req, timeout=120)
    return json.loads(resp.read()), resp.headers.get("Link", "")


def paged(path, key):
    out, pi = [], None
    while True:
        sep = "&" if "?" in path else "?"
        d, link = rest(path + (f"{sep}page_info={pi}" if pi else ""))
        out += d[key]
        m = re.search(r'page_info=([^>&]+)>; rel="next"', link)
        if not m:
            return out
        pi = m.group(1)


def fetch(url):
    try:
        r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        return urllib.request.urlopen(r, timeout=60).read().decode("utf-8", "replace")
    except Exception:                                        # noqa: BLE001
        return ""


def scrape(slug):
    """Product handles in the order the old category page lists them."""
    order, page = [], 1
    while page <= 12:
        url = f"{OLD}/{slug}/" if page == 1 else f"{OLD}/{slug}/page/{page}/"
        html = fetch(url)
        if not html:
            break
        new = []
        for h in re.findall(r"/product/([a-z0-9\-]+)", html):
            if h not in order and h not in new:
                new.append(h)
        if not new:
            break
        order += new
        if f"/{slug}/page/{page + 1}" not in html:
            break
        page += 1
    return order


def main():
    apply = "--apply" in sys.argv

    smart = paged("smart_collections.json?limit=250", "smart_collections")
    products = paged("products.json?limit=250&fields=id,handle,title", "products")
    by_handle = {p["handle"]: p for p in products}
    print(f"store: {len(smart)} smart collections, {len(products)} products")

    jobs, report = [], []
    for c in smart:
        slug = HANDLE_MAP.get(c["handle"], c["handle"])
        old_order = scrape(slug)
        if not old_order:
            continue                                    # no such category on the old site

        members = paged(f"products.json?limit=250&collection_id={c['id']}&fields=id,handle",
                        "products")
        member_ids = {p["handle"]: p["id"] for p in members}

        ordered, missing = [], []
        for h in old_order:
            if h in member_ids:
                ordered.append(member_ids[h])
            elif h in by_handle:
                missing.append(h + " (on store, not in this collection)")
            else:
                missing.append(h + " (not on store)")

        extra = [p["handle"] for p in members if p["id"] not in ordered]
        if ordered:
            jobs.append((c, ordered))
        report.append((c["handle"], len(ordered), len(members), missing, extra))

    print(f"\ncategories with an old-site order: {len(jobs)}")
    print(f"{'collection':<34}{'ordered':>8}{'in coll':>9}   notes")
    for h, n, m, missing, extra in sorted(report):
        note = ""
        if missing:
            note += f"{len(missing)} old not matched"
        if extra:
            note += ("; " if note else "") + f"{len(extra)} appended"
        print(f"  {h:<32}{n:>8}{m:>9}   {note}")

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    # A definition makes the field editable in the collection admin, so the
    # order stays a merchant-owned thing rather than a scripted one-off.
    try:
        d = gql(DEFINE, {"definition": {
            "name": "Product order", "namespace": "custom", "key": "product_order",
            "description": "Products pinned to the front of this category, in order. "
                           "Anything not listed appears after them.",
            "type": "list.product_reference", "ownerType": "COLLECTION"}})
        errs = d["metafieldDefinitionCreate"]["userErrors"]
        print("\ndefinition:", "created" if not errs else errs[0]["message"])
    except Exception as e:                                   # noqa: BLE001
        print("\ndefinition:", str(e)[:100])

    done = 0
    for i in range(0, len(jobs), 20):
        batch = [{
            "ownerId": f"gid://shopify/Collection/{c['id']}",
            "namespace": "custom", "key": "product_order",
            "type": "list.product_reference",
            "value": json.dumps([f"gid://shopify/Product/{pid}" for pid in ids]),
        } for c, ids in jobs[i:i + 20]]
        res = gql(SET, {"metafields": batch})["metafieldsSet"]
        if res["userErrors"]:
            print("  !!", res["userErrors"][:2])
        done += len(res["metafields"])
        time.sleep(0.5)
    print(f"\nwrote product_order on {done} collections")


if __name__ == "__main__":
    main()
