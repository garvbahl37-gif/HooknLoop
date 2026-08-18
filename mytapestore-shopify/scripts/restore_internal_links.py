#!/usr/bin/env python3
"""Put back the internal links the migration stripped out of descriptions.

WHAT IS MISSING
The old category and product copy is full of cross-links — a cloth-tape page
points at Cloth Double Sided Tape, Masking Tape and Packaging Tapes. On the new
store those descriptions are plain text:

    collections  67 items, 0 <a> in total
    products    132 items, 0 <a> in total
    pages        17 items, 59 <a> — but 181 references still to mytapestore.com.au

That is bad for shoppers (dead ends) and worse for SEO: internal links are how
category authority is distributed, and every one of them was lost.

APPROACH — RE-LINK, DO NOT RE-IMPORT
The body text on the new store may have been edited since migration, so the old
HTML is not copied over. Instead the old page is read only for its (anchor text
-> destination) pairs, and the FIRST plain-text occurrence of that anchor text
in the current description is wrapped in a link. The wording on the store is
never altered — only marked up.

Destinations are mapped to native Shopify paths, and a link is only written when
the target actually exists on this store.

    python3 restore_internal_links.py                 # dry run
    python3 restore_internal_links.py --apply
    python3 restore_internal_links.py --apply --only pages
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
HOST = re.compile(r"https?://(?:www\.)?mytapestore\.com\.au", re.I)

PAGE_MAP = {"contact-us": "contact", "return-exchange-policy": "return-policy",
            "terms-and-conditions": "terms-conditions"}
SPECIAL = {"shop": "/collections/all", "cart": "/cart", "checkout": "/cart",
           "privacy-policy": "/policies/privacy-policy"}
UI_NOISE = {"select options", "add to cart", "read more", "view product", "quick view",
            "compare", "add to wishlist", "buy now", "shop now", "view all", "learn more",
            "continue reading", "click here", "home"}


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


def rest(path, method="GET", body=None):
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/{path}",
        data=json.dumps(body).encode() if body else None, method=method)
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    return json.loads(urllib.request.urlopen(req, timeout=120).read())


def fetch(url, tries=3):
    for i in range(tries):
        try:
            r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0",
                                                    "Accept": "text/html,*/*"})
            return urllib.request.urlopen(r, timeout=90).read().decode("utf-8", "replace")
        except Exception:                                    # noqa: BLE001
            time.sleep(1.5 * (i + 1))
    return ""


def paged(node, field):
    out, cur = [], None
    q = ("query($c:String){ %s(first:100, after:$c){ pageInfo{hasNextPage endCursor} "
         "nodes{ id handle %s } } }" % (node, field))
    while True:
        d = gql(q, {"c": cur})[node]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


class Store:
    """What exists on the new store, so no link is written to a 404."""

    def __init__(self):
        self.products = {p["handle"] for p in paged("products", "handle")}
        self.collections = {c["handle"] for c in paged("collections", "handle")}
        self.pages = {p["handle"] for p in paged("pages", "handle")}
        blog = rest("blogs.json")["blogs"][0]
        self.blog_handle = blog["handle"]
        self.articles = {a["handle"] for a in
                         rest(f"blogs/{blog['id']}/articles.json?limit=250&fields=handle")["articles"]}

    def target(self, href):
        """Old-site href -> path on this store, or None if it does not exist."""
        if href.startswith("mailto:") or href.startswith("tel:"):
            return href
        p = HOST.sub("", href).split("?")[0].split("#")[0].rstrip("/")
        if not p or p == "":
            return "/"
        if p.startswith("http"):
            return None                                      # genuinely external
        seg = p.strip("/").split("/")
        if seg[0] == "product" and len(seg) > 1:
            return f"/products/{seg[1]}" if seg[1] in self.products else None
        if seg[0] == "blog":
            if len(seg) == 1:
                return f"/blogs/{self.blog_handle}"
            return f"/blogs/{self.blog_handle}/{seg[1]}" if seg[1] in self.articles else None
        if len(seg) == 1:
            if seg[0] in SPECIAL:
                return SPECIAL[seg[0]]
            if seg[0] in self.collections:
                return f"/collections/{seg[0]}"
            h = PAGE_MAP.get(seg[0], seg[0])
            if h in self.pages:
                return f"/pages/{h}"
        return None


def old_links(url, bound_texts=None):
    """(anchor text, href) pairs from an old page, longest text first.

    `bound_texts` limits the scan to the region of the page that actually holds
    the marketing copy. Without it the site's nav menu is scanned too, and a
    word like "industries" appearing mid-sentence gets linked simply because
    the header happens to contain an "Industries" menu item — a link the
    original page never had.

    The bounds are sentences taken from the copy we already hold, so they are
    guaranteed to be in the right place.
    """
    page = fetch(url)
    if not page:
        return []
    if bound_texts:
        starts = [page.find(t[:70]) for t in bound_texts if t and len(t) > 25]
        starts = [i for i in starts if i >= 0]
        if starts:
            page = page[max(0, min(starts) - 400): max(starts) + 6000]
    out, seen = [], set()
    for m in re.finditer(r'<a\s[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.S | re.I):
        href, text = m.group(1), re.sub(r"<[^>]+>", "", m.group(2))
        text = re.sub(r"\s+", " ", htmllib.unescape(text)).strip()
        if len(text) < 4 or text.lower() in seen:
            continue
        # storefront UI strings scraped from the product grid, not editorial links
        if text.lower() in UI_NOISE:
            continue
        if not (HOST.search(href) or href.startswith("/") or href.startswith("mailto:")):
            continue
        seen.add(text.lower())
        out.append((text, href))
    out.sort(key=lambda x: -len(x[0]))                       # longest phrase wins
    return out


# text that is NOT already inside a tag or an existing anchor
def linkify(html, phrase, href):
    """Wrap the first free-standing occurrence of `phrase`. Returns (html, done)."""
    # split on tags so replacements only ever land in text nodes
    parts = re.split(r"(<[^>]+>)", html)
    depth_a = 0
    pat = re.compile(r"(?<![\w-])" + re.escape(phrase) + r"(?![\w-])", re.I)
    for i, part in enumerate(parts):
        if part.startswith("<"):
            low = part.lower()
            if low.startswith("<a "):
                depth_a += 1
            elif low.startswith("</a"):
                depth_a = max(0, depth_a - 1)
            continue
        if depth_a:                                          # already inside a link
            continue
        m = pat.search(part)
        if not m:
            continue
        parts[i] = (part[:m.start()]
                    + f'<a href="{href}">{m.group(0)}</a>'
                    + part[m.end():])
        return "".join(parts), True
    return html, False


def main():
    apply = "--apply" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]

    store = Store()
    print(f"store: {len(store.products)} products, {len(store.collections)} collections, "
          f"{len(store.pages)} pages, {len(store.articles)} articles\n")

    jobs = []            # (kind, id, handle, new_html, added, skipped)

    def do_collection(c):
        """Link both the intro description AND the seo_blocks copy.

        Nearly all of a category's words live in `custom.seo_blocks` (typed
        JSON: heading / p / list / items), which the theme renders with
        {{ block.text }} — raw, so an <a> written into the text renders as a
        real link and no template change is needed. The plain description is
        usually two sentences; the cross-links the old site had are in the
        blocks."""
        blocks_raw = (c.get("seoField") or {}).get("value")
        bounds = []
        if blocks_raw:
            try:
                for b in json.loads(blocks_raw):
                    if isinstance(b.get("text"), str):
                        bounds.append(b["text"])
            except Exception:                                # noqa: BLE001
                pass
        if c.get("descriptionHtml"):
            bounds.append(re.sub(r"<[^>]+>", " ", c["descriptionHtml"]).strip())
        pairs = old_links(f"{OLD}/{c['handle']}/", bounds)
        own = f"/collections/{c['handle']}"
        targets = []
        for text, href in pairs:
            t = store.target(href)
            if t and t != own:                 # never link a page to itself
                targets.append((text, t))
        if not targets:
            return None

        html = c["descriptionHtml"] or ""
        blocks = None
        if blocks_raw:
            try:
                blocks = json.loads(blocks_raw)
            except Exception:                                # noqa: BLE001
                blocks = None

        added, used = 0, set()

        for text, t in targets:
            if text.lower() in used:
                continue
            html, ok = linkify(html, text, t)
            if ok:
                added += 1
                used.add(text.lower())

        if blocks:
            for text, t in targets:
                if text.lower() in used:
                    continue
                placed = False
                for blk in blocks:
                    if placed:
                        break
                    if isinstance(blk.get("text"), str) and blk["text"]:
                        blk["text"], placed = linkify(blk["text"], text, t)
                    if not placed and isinstance(blk.get("items"), list):
                        for k, it in enumerate(blk["items"]):
                            if isinstance(it, str):
                                blk["items"][k], placed = linkify(it, text, t)
                            elif isinstance(it, dict) and isinstance(it.get("text"), str):
                                blk["items"][k]["text"], placed = linkify(it["text"], text, t)
                            if placed:
                                break
                if placed:
                    added += 1
                    used.add(text.lower())

        if not added:
            return None
        return ("collection", c["id"], c["handle"], html, added,
                json.dumps(blocks, ensure_ascii=False) if blocks else None)

    def do_product(p):
        html, added, missed = p["descriptionHtml"] or "", 0, 0
        if not html.strip():
            return None
        bounds = [re.sub(r"<[^>]+>", " ", html).strip()]
        pairs = old_links(f"{OLD}/product/{p['handle']}/", bounds)
        for text, href in pairs:
            t = store.target(href)
            if not t:
                missed += 1
                continue
            html, ok = linkify(html, text, t)
            if ok:
                added += 1
        return ("product", p["id"], p["handle"], html, added, missed) if added else None

    if only in (None, "collections"):
        cols = paged("collections",
                     'descriptionHtml seoField: metafield(namespace:"custom", key:"seo_blocks"){ value }')
        with cf.ThreadPoolExecutor(5) as ex:
            jobs += [r for r in ex.map(do_collection, cols) if r]
        n = sum(j[4] for j in jobs if j[0] == "collection")
        print(f"collections: {sum(1 for j in jobs if j[0]=='collection')} to update, {n} links to add")

    if only in (None, "products"):
        prods = paged("products", "descriptionHtml")
        with cf.ThreadPoolExecutor(5) as ex:
            got = [r for r in ex.map(do_product, prods) if r]
        jobs += got
        print(f"products   : {len(got)} to update, {sum(j[4] for j in got)} links to add")

    if only in (None, "pages"):
        pgs = paged("pages", "body")
        fixed = 0
        for pg in pgs:
            body = pg["body"] or ""
            if not HOST.search(body):
                continue

            def repl(m):
                t = store.target(m.group(1))
                return f'href="{t}"' if t else m.group(0)

            new = re.sub(r'href="([^"]+)"', repl, body)
            if new != body:
                left = len(HOST.findall(new))
                jobs.append(("page", pg["id"], pg["handle"], new,
                             len(HOST.findall(body)) - left, left))
                fixed += 1
        print(f"pages      : {fixed} to update, "
              f"{sum(j[4] for j in jobs if j[0]=='page')} old-domain links rewritten")

    print("\nsample:")
    for kind, _, handle, _, added, extra in jobs[:14]:
        where = " (incl. seo blocks)" if kind == "collection" and extra else ""
        print(f"   {kind:<11}{handle[:44]:<46} +{added} link(s){where}")

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    MC = """mutation($input:CollectionInput!){ collectionUpdate(input:$input){ userErrors{message} } }"""
    MSET = """mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{field message} } }"""
    jobs_extra = {j[1]: j[5] for j in jobs if j[0] == "collection" and j[5]}
    MP = """mutation($input:ProductInput!){ productUpdate(input:$input){ userErrors{message} } }"""
    done = {"collection": 0, "product": 0, "page": 0}
    for kind, gid, handle, html, _, _ in jobs:
        try:
            if kind == "collection":
                gql(MC, {"input": {"id": gid, "descriptionHtml": html}})
                blocks_json = jobs_extra.get(gid)
                if blocks_json:
                    gql(MSET, {"m": [{"ownerId": gid, "namespace": "custom",
                                      "key": "seo_blocks", "type": "json",
                                      "value": blocks_json}]})
            elif kind == "product":
                gql(MP, {"input": {"id": gid, "descriptionHtml": html}})
            else:
                rest(f"pages/{gid.split('/')[-1]}.json", "PUT",
                     {"page": {"id": int(gid.split("/")[-1]), "body_html": html}})
            done[kind] += 1
        except Exception as e:                               # noqa: BLE001
            print(f"   !! {kind} {handle}: {str(e)[:90]}")
        time.sleep(0.4)
    print(f"\nupdated: {done}")


if __name__ == "__main__":
    main()
