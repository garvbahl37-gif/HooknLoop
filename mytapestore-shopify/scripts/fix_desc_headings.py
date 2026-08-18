#!/usr/bin/env python3
"""Promote pseudo-headings in product descriptions from <p> to <h3>.

THE PROBLEM
Imported descriptions write their section headings as paragraphs:

    <p>Key Features</p><ul>…</ul>
    <p>Application Areas</p><ul>…</ul>
    <p>Specifications</p><ul>…</ul>

They are headings by intent but paragraphs by markup, so the theme renders them
at body size and weight and the page reads as one undifferentiated wall. No
amount of CSS on `.pdp-desc p` can fix that without also restyling real
paragraphs.

WHAT COUNTS AS A HEADING
Deliberately conservative — a <p> qualifies only when ALL hold:
  * it is immediately followed by <ul> or <ol>
  * its text is short (<= 60 chars)
  * it has no sentence-ending punctuation (. ! ?) and no <a>/<img> inside
  * it is not empty

That matches "Key Features" and misses "Our premium, high-quality self-adhesive
hook and loop rolls are very easy to use…" — which is a real lead paragraph that
also precedes a list, and must stay a paragraph.

    python3 fix_desc_headings.py            # dry run, prints what would change
    python3 fix_desc_headings.py --apply    # write it
"""
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOP = "cvbpp2-up.myshopify.com"


def token():
    env = ROOT.parent / "newsletter" / ".env.local"
    for line in env.read_text().splitlines():
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
        sys.exit(f"GraphQL error: {out['errors']}")
    return out["data"]


# <p>Heading</p> immediately followed by a list
# The inner text must be tag-free. A non-greedy .*? here spans across
# "</p><p>" and swallows the NEXT heading into the previous paragraph —
# which is exactly how "Key Features" was missed on the first run.
PAT = re.compile(r"<p>\s*([^<]{1,60}?)\s*</p>\s*(?=<(?:ul|ol)\b)", re.I)


def looks_like_heading(inner):
    text = re.sub(r"<[^>]+>", "", inner).strip()
    if not text or len(text) > 60:
        return False
    if re.search(r"[.!?]$", text):
        return False
    if re.search(r"<(a|img)\b", inner, re.I):
        return False
    # a heading is a label, not a sentence — bail if it reads like prose
    if text.count(",") >= 2:
        return False
    return True


def convert(html):
    changed = []

    def repl(m):
        inner = m.group(1)
        if looks_like_heading(inner):
            changed.append(re.sub(r"<[^>]+>", "", inner).strip())
            return f"<h3>{inner}</h3>"
        return m.group(0)

    return PAT.sub(repl, html), changed


def products():
    out, cur = [], None
    q = """query($c: String) {
             products(first: 100, after: $c) {
               nodes { id handle title descriptionHtml }
               pageInfo { hasNextPage endCursor }
             } }"""
    while True:
        d = gql(q, {"c": cur})["products"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


def main():
    apply = "--apply" in sys.argv
    prods = products()
    jobs = []
    for p in prods:
        html = p["descriptionHtml"] or ""
        if "<h1" in html or "<h2" in html or "<h3" in html:
            continue                      # already has real headings — leave alone
        new, changed = convert(html)
        if changed:
            jobs.append((p, new, changed))

    print(f"products scanned          : {len(prods)}")
    print(f"already have headings     : {sum(1 for p in prods if re.search(r'<h[123]', p['descriptionHtml'] or ''))}")
    print(f"would gain headings       : {len(jobs)}")
    for p, _, ch in jobs[:12]:
        print(f"   {p['handle'][:38]:<40}{ch}")
    if len(jobs) > 12:
        print(f"   … and {len(jobs)-12} more")

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    M = """mutation($i: ProductInput!) {
             productUpdate(input: $i) { product { handle } userErrors { message } } }"""
    done = 0
    for p, new, _ in jobs:
        r = gql(M, {"i": {"id": p["id"], "descriptionHtml": new}})["productUpdate"]
        if r["userErrors"]:
            print(f"   !! {p['handle']}: {r['userErrors']}")
            continue
        done += 1
    print(f"\nupdated: {done}/{len(jobs)}")


if __name__ == "__main__":
    main()
