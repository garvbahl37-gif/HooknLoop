#!/usr/bin/env python3
"""Create Shopify URL redirects for every old mytapestore.com.au path.

WHY THIS MATTERS MORE THAN IT LOOKS
The old site and Shopify disagree about URL shape on every single content type:

    /product/<handle>   -> /products/<handle>      131 products
    /<category>/        -> /collections/<handle>    65 categories (ROOT level!)
    /blog/<slug>        -> /blogs/news/<slug>       54 posts
    /<page>/            -> /pages/<page>            ~14 pages

The category one is the trap: WooCommerce served categories from the root, so
`/masking-tape/` is a category, not a page. Miss those and the 65 highest-value
category URLs 404 the moment DNS moves.

Every target is verified to exist on the store before its redirect is written —
a redirect pointing at a 404 is worse than no redirect, because it launders a
soft 404 into a 200.

    python3 build_redirects.py            # dry run
    python3 build_redirects.py --apply
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

# old page slug -> Shopify page handle where it differs
PAGE_MAP = {
    "contact-us": "contact",
    "return-exchange-policy": "return-policy",
    "terms-and-conditions": "terms-conditions",
}
# not pages at all
SPECIAL = {
    "shop": "/collections/all",
    "cart": "/cart",
    "checkout": "/cart",
    "privacy-policy": "/policies/privacy-policy",
}


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
    resp = urllib.request.urlopen(req, timeout=120)
    return json.loads(resp.read()), resp.headers.get("Link", "")


def paged(path, key):
    out, page_info = [], None
    while True:
        sep = "&" if "?" in path else "?"
        p = path + (f"{sep}page_info={page_info}" if page_info else "")
        d, link = rest(p)
        out += d[key]
        m = re.search(r'page_info=([^>&]+)>; rel="next"', link)
        if not m:
            return out
        page_info = m.group(1)


def fetch(url):
    try:
        r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        return urllib.request.urlopen(r, timeout=60).read().decode("utf-8", "replace")
    except Exception:                                        # noqa: BLE001
        return ""


def slugs(sitemap):
    xml = fetch(f"{OLD}/{sitemap}")
    return [u for u in re.findall(r"<loc>([^<]+)</loc>", xml)]


def main():
    apply = "--apply" in sys.argv

    products = {p["handle"] for p in paged("products.json?limit=250&fields=handle", "products")}
    collections = {c["handle"] for c in paged("custom_collections.json?limit=250&fields=handle", "custom_collections")}
    collections |= {c["handle"] for c in paged("smart_collections.json?limit=250&fields=handle", "smart_collections")}
    pages = {p["handle"] for p in paged("pages.json?limit=250&fields=handle", "pages")}
    blog_id = rest("blogs.json")[0]["blogs"][0]["id"]
    articles = {a["handle"] for a in paged(f"blogs/{blog_id}/articles.json?limit=250&fields=handle", "articles")}
    existing = {r["path"].rstrip("/").lower() for r in paged("redirects.json?limit=250", "redirects")}

    print(f"store: {len(products)} products, {len(collections)} collections, "
          f"{len(pages)} pages, {len(articles)} articles, {len(existing)} redirects already")

    want = []          # (path, target)

    for u in slugs("product-sitemap.xml"):
        h = u.rstrip("/").split("/")[-1]
        if h in products:
            want.append((f"/product/{h}", f"/products/{h}"))

    for u in slugs("product_cat-sitemap.xml"):
        h = u.rstrip("/").split("/")[-1]
        if h in collections:
            want.append((f"/{h}", f"/collections/{h}"))

    for u in slugs("post-sitemap.xml"):
        h = u.rstrip("/").split("/")[-1]
        if h == "blog":
            want.append(("/blog", "/blogs/news"))
        elif h in articles:
            want.append((f"/blog/{h}", f"/blogs/news/{h}"))

    for u in slugs("page-sitemap.xml"):
        h = u.rstrip("/").split("/")[-1]
        if not h or u.rstrip("/") == OLD:
            continue
        if h in SPECIAL:
            want.append((f"/{h}", SPECIAL[h]))
            continue
        target_handle = PAGE_MAP.get(h, h)
        if target_handle in pages:
            want.append((f"/{h}", f"/pages/{target_handle}"))
        elif h in collections:
            want.append((f"/{h}", f"/collections/{h}"))

    # de-dupe, and never overwrite a redirect that already exists
    seen, todo = set(), []
    for path, target in want:
        key = path.rstrip("/").lower()
        if key in seen or key in existing:
            continue
        seen.add(key)
        todo.append((path, target))

    by_kind = {}
    for p, t in todo:
        kind = ("product" if t.startswith("/products/") else
                "collection" if t.startswith("/collections/") else
                "article" if t.startswith("/blogs/") else "page")
        by_kind[kind] = by_kind.get(kind, 0) + 1
    print(f"\nredirects to create: {len(todo)}")
    for k, v in sorted(by_kind.items()):
        print(f"   {k:<12}{v}")
    for p, t in todo[:8]:
        print(f"   {p:<44} -> {t}")

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    made, failed = 0, 0
    for path, target in todo:
        try:
            rest("redirects.json", "POST", {"redirect": {"path": path, "target": target}})
            made += 1
            if made % 25 == 0:
                print(f"   … {made}/{len(todo)}")
            time.sleep(0.55)
        except urllib.error.HTTPError as e:
            failed += 1
            if failed <= 5:
                print(f"   !! {path}: {e.code} {e.read().decode()[:90]}")
    print(f"\ncreated: {made}   failed: {failed}")


if __name__ == "__main__":
    main()
