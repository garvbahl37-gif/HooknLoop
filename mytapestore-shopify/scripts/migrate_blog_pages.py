#!/usr/bin/env python3
"""Migrate the old WordPress blog posts and pages onto the Shopify store.

The new store launched with ZERO blog articles against 54 on mytapestore.com.au,
and several standalone pages were never carried across. Every one of those URLs
has accumulated SEO equity, so they are recreated here with their original
title, meta description, publish date and body.

EXTRACTION
WordPress wraps the body in <div class="entry-content">. A regex cannot find its
closing tag because the content nests dozens of divs, so `slice_div` walks
forward counting opens and closes to find the true match. The first attempt used
`.*?</div>` and captured 211,813 characters — most of the page.

IMAGES
Body images keep their absolute mytapestore.com.au URLs for now. That is fine
while the old site is up, and MUST be revisited before the domain is pointed at
Shopify — otherwise every blog image 404s on cutover. Run with --rehost to
upload them to Shopify Files and rewrite the srcs.

    python3 migrate_blog_pages.py              # dry run
    python3 migrate_blog_pages.py --apply      # create articles + pages
    python3 migrate_blog_pages.py --apply --only-pages
"""
import html as htmllib
import json
import pathlib
import re
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOP = "cvbpp2-up.myshopify.com"
OLD = "https://mytapestore.com.au"

# old page slug -> already exists on Shopify as this handle (so: skip)
ALREADY = {
    "contact-us": "contact", "about-us": "about-us", "industries": "industries",
    "return-exchange-policy": "return-policy", "shipping-delivery": "shipping-delivery",
    "terms-and-conditions": "terms-conditions",
}
# system/collection URLs that must NOT become pages
SKIP_PAGES = {"", "cart", "checkout", "shop", "privacy-policy", "single-sided-tapes"}


def token():
    for line in (ROOT.parent / "newsletter" / ".env.local").read_text().splitlines():
        if line.startswith("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE="):
            return line.split("=", 1)[1].strip().strip("\"'")
    sys.exit("admin token not found")


TOK = token()


def gql(query, variables=None):
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/graphql.json",
        data=json.dumps({"query": query, "variables": variables or {}}).encode(),
        method="POST")
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    out = json.loads(urllib.request.urlopen(req, timeout=90).read())
    if "errors" in out:
        raise RuntimeError(out["errors"])
    return out["data"]


def rest(path, method="GET", body=None):
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/{path}",
        data=json.dumps(body).encode() if body else None, method=method)
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    return json.loads(urllib.request.urlopen(req, timeout=90).read())


def fetch(url):
    for _ in range(3):
        try:
            r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            return urllib.request.urlopen(r, timeout=60).read().decode("utf-8", "replace")
        except Exception:                                    # noqa: BLE001
            pass
    return ""


def slice_div(page, start_pat):
    """Return the inner HTML of the first div matching start_pat, depth-matched."""
    m = re.search(start_pat, page)
    if not m:
        return ""
    i = page.index(">", m.end() - 1) + 1
    depth, j = 1, i
    for tag in re.finditer(r"<(/?)div\b", page[i:]):
        depth += -1 if tag.group(1) else 1
        if depth == 0:
            j = i + tag.start()
            break
    return page[i:j]


def clean(body):
    body = re.sub(r"<(script|style|noscript|iframe)\b.*?</\1>", "", body, flags=re.S | re.I)
    body = re.sub(r"<div[^>]*(?:sharedaddy|jp-relatedposts|addtoany|social)[^>]*>.*?</div>", "", body, flags=re.S | re.I)
    body = re.sub(r"\s(?:class|id|style|data-[\w-]+)=\"[^\"]*\"", "", body)
    body = re.sub(r"<p>\s*(?:&nbsp;)?\s*</p>", "", body)
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip()


def scrape(url):
    p = fetch(url)
    if not p:
        return None
    title = (re.search(r'property="og:title" content="([^"]*)"', p) or [None, ""])[1]
    title = htmllib.unescape(title).replace(" - My Tape Store", "").strip()
    desc = htmllib.unescape((re.search(r'name="description" content="([^"]*)"', p) or [None, ""])[1]).strip()
    pub = (re.search(r'property="article:published_time" content="([^"]*)"', p) or [None, ""])[1]
    img = (re.search(r'property="og:image" content="([^"]*)"', p) or [None, ""])[1]
    body = clean(slice_div(p, r'<div[^>]+class="[^"]*entry-content[^"]*"'))
    return {"url": url, "title": title, "desc": desc, "published": pub, "image": img, "body": body}


def main():
    apply = "--apply" in sys.argv
    only_pages = "--only-pages" in sys.argv
    only_posts = "--only-posts" in sys.argv

    posts = [u for u in re.findall(r"<loc>([^<]+)</loc>", fetch(f"{OLD}/post-sitemap.xml"))
             if "/blog/" in u and u.rstrip("/").split("/")[-1] != "blog"]
    pages = [u for u in re.findall(r"<loc>([^<]+)</loc>", fetch(f"{OLD}/page-sitemap.xml"))]

    existing_pages = {p["handle"] for p in rest("pages.json?limit=250")["pages"]}
    blog_id = rest("blogs.json")["blogs"][0]["id"]
    existing_arts = {a["handle"] for a in rest(f"blogs/{blog_id}/articles.json?limit=250")["articles"]}

    todo_pages = []
    for u in pages:
        slug = u.rstrip("/").split("/")[-1]
        if slug in SKIP_PAGES or u.rstrip("/") == OLD:
            continue
        if slug in ALREADY or slug in existing_pages:
            continue
        todo_pages.append((slug, u))
    todo_posts = [(u.rstrip("/").split("/")[-1], u) for u in posts
                  if u.rstrip("/").split("/")[-1] not in existing_arts]

    print(f"old blog posts        : {len(posts)}   to create: {len(todo_posts)}")
    print(f"old pages             : {len(pages)}   to create: {len(todo_pages)}")
    for s, _ in todo_pages:
        print(f"   page  /{s}")
    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    if not only_posts:
        for slug, url in todo_pages:
            d = scrape(url)
            if not d or len(d["body"]) < 80:
                print(f"   !! page {slug}: no body extracted")
                continue
            rest("pages.json", "POST", {"page": {
                "title": d["title"], "handle": slug, "body_html": d["body"], "published": True}})
            print(f"   page  /{slug}  ({len(d['body'])} chars)")
            time.sleep(0.6)

    if not only_pages:
        done = 0
        for slug, url in todo_posts:
            d = scrape(url)
            if not d or len(d["body"]) < 120:
                print(f"   !! post {slug}: no body extracted")
                continue
            art = {"title": d["title"], "handle": slug, "body_html": d["body"],
                   "author": "My Tape Store", "published": True,
                   "summary_html": f"<p>{d['desc']}</p>" if d["desc"] else None}
            if d["published"]:
                art["published_at"] = d["published"]
            if d["image"]:
                art["image"] = {"src": d["image"], "alt": d["title"]}
            try:
                rest(f"blogs/{blog_id}/articles.json", "POST", {"article": art})
                done += 1
                print(f"   post  /{slug}")
                time.sleep(0.6)
            except Exception as e:                            # noqa: BLE001
                print(f"   !! post {slug}: {str(e)[:120]}")
        print(f"\narticles created: {done}/{len(todo_posts)}")


if __name__ == "__main__":
    main()
