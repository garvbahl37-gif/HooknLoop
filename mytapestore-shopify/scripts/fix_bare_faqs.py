#!/usr/bin/env python3
"""Catch FAQ blocks that were never marked up as headings at all.

The earlier passes looked for <h3>FAQs</h3> and for <p><strong>Question?</strong>.
Some products label the block with a BARE paragraph:

    <p>FAQ</p>
    <p>Can Structural Glazing Tape withstand extreme weather conditions?</p>
    <p>Yes, it withstands…</p>

Nothing in that is a heading, so section-splitting never saw it, the accordion
never applied, and the block rendered as an undifferentiated run of paragraphs —
which is exactly what it still looked like on the Medium Density Open Cell tape.

Two shapes are handled:
  · a bare "FAQ" / "FAQs" / "Frequently asked questions" label followed by
    alternating question/answer paragraphs
  · a trailing run of question/answer pairs with no label at all (needs at
    least two pairs, so ordinary prose ending in a question is not swept up)

    python3 fix_bare_faqs.py            # dry run
    python3 fix_bare_faqs.py --apply
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

LABEL = re.compile(r"^\s*(faqs?|frequently\s+asked\s+questions)\s*:?\s*$", re.I)
BLOCK = re.compile(r"<(p|h[1-6]|ul|ol|div|img|table)\b[^>]*>.*?</\1>|<img[^>]*>", re.S | re.I)


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


def text_of(h):
    return re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def accordion(pairs):
    out = ['<h3>FAQs</h3><div class="pdp-faq">']
    for q, a in pairs:
        body = a if a.strip().startswith("<") else f"<p>{a}</p>"
        out.append('<details class="pdp-faq__item">'
                   f'<summary class="pdp-faq__q">{htmllib.escape(q)}</summary>'
                   f'<div class="pdp-faq__a">{body}</div></details>')
    out.append("</div>")
    return "".join(out)


def convert(html):
    """Returns (new_html, pair_count). Leaves html untouched when it finds nothing."""
    blocks = [(m.start(), m.end(), m.group(0)) for m in BLOCK.finditer(html)]
    if not blocks:
        return html, 0

    # where does the FAQ run begin?
    start_i = None
    for i, (_, _, raw) in enumerate(blocks):
        if raw.lower().startswith("<p") and LABEL.match(text_of(raw)):
            start_i = i
            break

    if start_i is None:
        # no label: look for a trailing run of question/answer pairs
        i = len(blocks) - 1
        pairs_from = None
        while i >= 1:
            q_raw, a_raw = blocks[i - 1][2], blocks[i][2]
            if q_raw.lower().startswith("<p") and text_of(q_raw).endswith("?"):
                pairs_from = i - 1
                i -= 2
                continue
            break
        if pairs_from is None or (len(blocks) - pairs_from) < 4:   # need >= 2 pairs
            return html, 0
        start_i = pairs_from
        label_len = 0
    else:
        label_len = 1

    # collect alternating question / answer from start_i (+label)
    j = start_i + label_len
    pairs = []
    while j + 1 < len(blocks):
        q_raw, a_raw = blocks[j][2], blocks[j + 1][2]
        if not q_raw.lower().startswith("<p"):
            break
        q = text_of(q_raw)
        if not q.endswith("?"):
            break
        pairs.append((q, a_raw))
        j += 2
    if not pairs:
        return html, 0

    cut_start = blocks[start_i][0]
    cut_end = blocks[j - 1][1]
    return html[:cut_start] + accordion(pairs) + html[cut_end:], len(pairs)


def main():
    apply = "--apply" in sys.argv
    prods, cur = [], None
    while True:
        d = gql("""query($c:String){ products(first:100, after:$c){
            pageInfo{hasNextPage endCursor}
            nodes{ id handle descriptionHtml } } }""", {"c": cur})["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    jobs = []
    for p in prods:
        html = p["descriptionHtml"] or ""
        if not html.strip() or "pdp-faq" in html:
            continue                                     # already an accordion
        new, n = convert(html)
        if n:
            jobs.append((p, new, n))

    print(f"products with an unmarked FAQ block: {len(jobs)}")
    for p, _, n in jobs:
        print(f"   {p['handle'][:46]:<48} {n} question(s)")

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    MP = """mutation($input:ProductInput!){ productUpdate(input:$input){ userErrors{message} } }"""
    for p, new, _ in jobs:
        gql(MP, {"input": {"id": p["id"], "descriptionHtml": new}})
        time.sleep(0.4)
    print(f"\nconverted {len(jobs)} products")


if __name__ == "__main__":
    main()
