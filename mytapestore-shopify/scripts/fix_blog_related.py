#!/usr/bin/env python3
"""Rebuild the "Related Products" block at the foot of migrated blog articles.

WHAT WAS WRONG
The old site lazy-loaded product thumbnails: the real URL sat in a lazy
attribute and `src` held a 1×1 `transparent.png`. The earlier image re-host
moved what `src` pointed at — so every embedded product thumbnail now resolves
to a transparent pixel stretched to 300×300, which renders as a grey box.

The markup around it is raw WooCommerce loop output that means nothing on
Shopify: a hard-coded "Rated 5.00 out of 5", the price printed twice, "Select
options / This product has multiple variants…", colour swatches wired to
`href="#"`, and a stray `<input type="hidden">`.

WHAT THIS DOES
Finds the trailing block, reads the product handles out of it, and replaces the
whole thing with a clean card row built from LIVE store data — real image, real
title, real current price. Nothing is invented and nothing is lazy-loaded.

SAFETY
The block is only replaced when the region being removed contains no real prose
(no <p> with more than 120 characters of text). Anything ambiguous is reported
and left untouched rather than guessed at.

    python3 fix_blog_related.py            # dry run
    python3 fix_blog_related.py --apply
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

# where the prose ends and the migrated widget begins
PROSE_END = re.compile(r"</(?:p|ul|ol|h[1-6]|blockquote|figure|table|pre)>", re.I)
HEADING = re.compile(r"<h[1-6][^>]*>\s*(?:<strong>\s*)?related\s+products?", re.I)


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
    out = json.loads(urllib.request.urlopen(req, timeout=120).read())
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


def products():
    q = """query($c:String){ products(first:250, after:$c){ pageInfo{hasNextPage endCursor}
      nodes{ handle title onlineStoreUrl
             featuredImage{ url(transform:{maxWidth:600, maxHeight:600}) altText }
             priceRangeV2{ minVariantPrice{amount} maxVariantPrice{amount} } } } }"""
    out, cur = {}, None
    while True:
        d = gql(q, {"c": cur})["products"]
        for n in d["nodes"]:
            out[n["handle"]] = n
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


def money(p):
    lo = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
    hi = float(p["priceRangeV2"]["maxVariantPrice"]["amount"])
    return f"${lo:,.2f}" if abs(hi - lo) < 0.005 else f"From ${lo:,.2f}"


def prose_len(fragment):
    """Longest run of real sentence text inside a fragment."""
    best = 0
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", fragment, re.S | re.I):
        t = re.sub(r"<[^>]+>", " ", m.group(1))
        t = re.sub(r"\s+", " ", htmllib.unescape(t)).strip()
        best = max(best, len(t))
    return best


def build(handles, prods):
    cards = []
    for h in handles:
        p = prods.get(h)
        if not p or not p.get("featuredImage"):
            continue
        img = p["featuredImage"]["url"]
        alt = htmllib.escape(p["featuredImage"].get("altText") or p["title"], quote=True)
        cards.append(
            f'<a class="blogprod__card" href="/products/{h}">'
            f'<span class="blogprod__media">'
            f'<img src="{img}" alt="{alt}" width="600" height="600" loading="lazy" decoding="async">'
            f'</span>'
            f'<span class="blogprod__name">{htmllib.escape(p["title"])}</span>'
            f'<span class="blogprod__price">{money(p)}</span>'
            f'</a>')
    if not cards:
        return ""
    return ('<div class="blogprod">'
            '<h2 class="blogprod__h">Related products</h2>'
            '<div class="blogprod__grid">' + "".join(cards) + '</div></div>')


def salvage(region):
    """Real prose trapped inside the widget's divs, in document order.

    Four articles have a genuine paragraph nested inside the migrated widget.
    Dropping the widget wholesale would delete it, so it is lifted out and kept
    ahead of the rebuilt cards. Only <p>/<h3>/<ul> carrying real sentences are
    taken — the widget's own <p>In stock</p> and price fragments are not.
    """
    out = []
    for m in re.finditer(r"<(p|h[2-6]|ul|ol)\b[^>]*>.*?</\1>", region, re.S | re.I):
        frag = m.group(0)
        text = re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", " ", frag))).strip()
        if len(text) > 60 and not HEADING.match(frag):
            out.append(frag)
    return "".join(out)


def block_bounds(body, heading_at):
    """Exact [start, end) of the migrated widget wrapping `Related Products`.

    Start: the run of bare <div> opens immediately before the heading.
    End:   where that outermost <div> closes, found by counting depth — NOT the
           end of the body. Four articles have real prose sitting AFTER the
           widget, and cutting to the end of the body would have deleted it.
    """
    lead = re.search(r"(?:\s*<div[^>]*>)+\s*$", body[:heading_at])
    if not lead:
        return None, None
    start = lead.start()

    depth = 0
    for t in re.finditer(r"<div\b[^>]*>|</div\s*>", body[start:], re.I):
        depth += 1 if t.group(0)[1] != "/" else -1
        if depth == 0:
            return start, start + t.end()
    return start, len(body)          # unbalanced markup: the widget runs to the end


def main():
    apply = "--apply" in sys.argv
    prods = products()
    blog = rest("blogs.json")["blogs"][0]
    arts = rest(f"blogs/{blog['id']}/articles.json?limit=250")["articles"]
    print(f"products: {len(prods)}   articles: {len(arts)}")

    jobs, skipped, nohandles = [], [], []
    for a in arts:
        body = a.get("body_html") or ""
        m = HEADING.search(body)
        if not m:
            continue

        start, end = block_bounds(body, m.start())
        if start is None:
            skipped.append((a["handle"], "could not bound the widget"))
            continue

        region = body[start:end]
        kept = salvage(region)
        if prose_len(region) > 120 and not kept:
            skipped.append((a["handle"], "prose inside that could not be salvaged"))
            continue

        handles, seen = [], set()
        for h in re.findall(r'href="/products/([a-z0-9\-]+)"', region):
            if h not in seen:
                seen.add(h); handles.append(h)
        if not handles:
            nohandles.append(a["handle"])
            continue

        block = kept + build(handles, prods)
        jobs.append((a, body[:start] + block + body[end:], len(region), len(block), handles))

    print(f"\narticles with a Related Products block : {len(jobs) + len(skipped) + len(nohandles)}")
    print(f"  rebuilding                           : {len(jobs)}")
    print(f"  skipped (prose inside the region)    : {len(skipped)} {skipped[:4]}")
    print(f"  skipped (no product links found)     : {len(nohandles)} {nohandles[:4]}")
    if jobs:
        old = sum(j[2] for j in jobs); new = sum(j[3] for j in jobs)
        print(f"  markup removed                       : {old:,} chars -> {new:,} chars")
        print(f"  product cards rebuilt                : {sum(len(j[4]) for j in jobs)}")
        for a, _, o, n, hs in jobs[:5]:
            print(f"     {a['handle'][:44]:<46} {o:>6} -> {n:<6} {len(hs)} products")
        rescued = [(a["handle"], len(salvage(""))) for a, _, _, _, _ in jobs]

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    done = 0
    for a, new_body, _, _, _ in jobs:
        rest(f"blogs/{blog['id']}/articles/{a['id']}.json", "PUT",
             {"article": {"id": a["id"], "body_html": new_body}})
        done += 1
        if done % 10 == 0:
            print(f"   … {done}/{len(jobs)}")
        time.sleep(0.55)
    print(f"\nrewrote {done} articles")

    # prove the placeholder is gone
    after = rest(f"blogs/{blog['id']}/articles.json?limit=250")["articles"]
    left = sum(len(re.findall(r"transparent\.png", x.get("body_html") or "")) for x in after)
    woo = sum(len(re.findall(r"Select options|Rated <strong>", x.get("body_html") or "")) for x in after)
    print(f"transparent.png references left: {left}")
    print(f"WooCommerce artefacts left     : {woo}")


if __name__ == "__main__":
    main()
