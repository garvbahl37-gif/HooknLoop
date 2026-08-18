#!/usr/bin/env python3
"""Rewrite old-domain links inside blog bodies to native Shopify paths.

After the image re-host, 553 <a href> links still pointed at
mytapestore.com.au — 424 of them at /product/<handle>. Those would technically
survive DNS cutover via the URL redirects, but every click would take a 301 hop,
and until cutover they send readers off the new store entirely.

    https://mytapestore.com.au/product/x  -> /products/x
    https://mytapestore.com.au/blog/y     -> /blogs/news/y
    https://mytapestore.com.au/masking-tape -> /collections/masking-tape
    https://mytapestore.com.au/about-us   -> /pages/about-us

Only rewrites when the target actually exists on this store; anything else is
left alone rather than pointed at a 404.

Also strips `srcset` attributes still referencing the old domain — the `src`
beside them is already on Shopify's CDN, so the image renders either way, but a
stale srcset is a 404 the browser may prefer.

    python3 fix_blog_links.py            # dry run
    python3 fix_blog_links.py --apply
"""
import json
import pathlib
import re
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOP = "cvbpp2-up.myshopify.com"
HOST = r"https?://(?:www\.)?mytapestore\.com\.au"


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
    out, pi = [], None
    while True:
        sep = "&" if "?" in path else "?"
        d, link = rest(path + (f"{sep}page_info={pi}" if pi else ""))
        out += d[key]
        m = re.search(r'page_info=([^>&]+)>; rel="next"', link)
        if not m:
            return out
        pi = m.group(1)


def main():
    apply = "--apply" in sys.argv

    products = {p["handle"] for p in paged("products.json?limit=250&fields=handle", "products")}
    collections = {c["handle"] for c in paged("custom_collections.json?limit=250&fields=handle", "custom_collections")}
    collections |= {c["handle"] for c in paged("smart_collections.json?limit=250&fields=handle", "smart_collections")}
    pages = {p["handle"] for p in paged("pages.json?limit=250&fields=handle", "pages")}
    blog = rest("blogs.json")[0]["blogs"][0]
    arts = paged(f"blogs/{blog['id']}/articles.json?limit=250", "articles")
    articles = {a["handle"] for a in arts}

    link_re = re.compile(rf'href="{HOST}([^"]*)"')
    srcset_re = re.compile(rf'\ssrcset="[^"]*{HOST}[^"]*"')

    def target(path):
        p = path.split("?")[0].split("#")[0].rstrip("/")
        if p in ("", "/"):
            return "/"
        seg = p.strip("/").split("/")
        if seg[0] == "product" and len(seg) > 1 and seg[1] in products:
            return f"/products/{seg[1]}"
        if seg[0] == "blog":
            if len(seg) == 1:
                return "/blogs/news"
            if seg[1] in articles:
                return f"/blogs/news/{seg[1]}"
        if len(seg) == 1:
            if seg[0] in collections:
                return f"/collections/{seg[0]}"
            if seg[0] in pages:
                return f"/pages/{seg[0]}"
        return None

    jobs, rewrote, skipped = [], 0, 0
    for a in arts:
        html = a.get("body_html") or ""
        if not re.search(HOST, html):
            continue
        counts = {"link": 0, "srcset": 0, "left": 0}

        def repl(m):
            t = target(m.group(1))
            if t:
                counts["link"] += 1
                return f'href="{t}"'
            counts["left"] += 1
            return m.group(0)

        new = link_re.sub(repl, html)
        new, n = srcset_re.subn("", new)
        counts["srcset"] = n
        if new != html:
            jobs.append((a, new, counts))
            rewrote += counts["link"]
            skipped += counts["left"]

    print(f"articles to update : {len(jobs)}")
    print(f"links rewritten    : {rewrote}")
    print(f"stale srcset removed: {sum(c['srcset'] for _, _, c in jobs)}")
    print(f"links left alone (no matching target): {skipped}")
    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    for a, new, _ in jobs:
        rest(f"blogs/{blog['id']}/articles/{a['id']}.json", "PUT",
             {"article": {"id": a["id"], "body_html": new}})
        time.sleep(0.55)
    print(f"\nupdated {len(jobs)} articles")


if __name__ == "__main__":
    main()
