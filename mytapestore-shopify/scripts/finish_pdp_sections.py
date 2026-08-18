#!/usr/bin/env python3
"""Finish the PDP clean-up: sweep stray specs, and make the FAQ a real accordion.

TWO GAPS LEFT BY THE FIRST PASS

1. 82 spec lines in 25 products were never inside a "Specifications" heading —
   they sit loose in the intro or inside Key Features ("Material: 100% Nylon",
   "Heat Resistance: -40°C to 120°C"). They belong in the Specifications tab
   like every other spec, or the tab is inconsistent between products.

   The hard part is telling a spec from a feature bullet, since both are written
   "Label: text". A spec has a SHORT, factual value — a measurement, a material,
   a temperature range. A feature bullet's value is a sentence:

     "Heat Resistance: -40°C to 120°C"                          -> spec
     "Precision & Spacing: Open-cell tape prevents misalignment" -> feature

   So a line only moves when its value is short AND either contains a number or
   is a few words. Everything else stays exactly where it is.

2. The FAQ renders as alternating plain paragraphs, so the question and the
   answer look identical. They become <details> accordions — native, keyboard
   accessible, no JavaScript, and styled to match the rest of the page.

    python3 finish_pdp_sections.py            # dry run
    python3 finish_pdp_sections.py --apply
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

# labels that are unambiguously specification fields
SPEC_LABELS = {
    "material", "materials", "adhesive", "adhesive type", "thickness", "width",
    "length", "colour", "color", "colours", "colors", "size", "sizes", "liner",
    "foam type", "backing", "carrier", "temperature resistance", "heat resistance",
    "temperature range", "tensile strength", "elongation", "water absorption",
    "peel adhesion", "shelf life", "core size", "roll length", "density",
    "type", "widths", "lengths", "finish", "grade", "coverage", "weight",
    "operating temperature", "uv resistance", "certification", "standard",
    "size specification", "size specifications", "sizes available", "width available",
    "widths available", "lengths available", "available sizes", "roll size",
}


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


def is_spec(label, value):
    """A specification, not a feature bullet written with a colon."""
    lab = label.lower().strip()
    if len(label.split()) > 4:
        return False
    # A whitelisted label is a spec by name, so its value may be a full sentence
    # ("Size Specifications: Available in 25mm, 38mm and 50mm widths...").
    if lab in SPEC_LABELS:
        return len(value) <= 160
    if len(value) > 60:
        return False
    # otherwise only when the value reads as data rather than a sentence
    has_number = bool(re.search(r"\d", value))
    few_words = len(value.split()) <= 4
    return (has_number or few_words) and not value.rstrip().endswith(".")


LINE = re.compile(r"<(li|p)[^>]*>\s*(?:<strong>\s*)?([A-Za-z][A-Za-z0-9 /&()\-]{2,34}?)\s*"
                  r"(?:</strong>\s*)?:\s*(.+?)</\1>", re.S | re.I)


def sweep_specs(html, existing):
    """Pull loose spec lines out of the body. Returns (html, [(label, value)])."""
    found = []

    def repl(m):
        label, value = m.group(2).strip(), text_of(m.group(3)).strip()
        if not is_spec(label, value):
            return m.group(0)
        if label.lower() in existing:
            return ""                                   # already in the tab: just drop
        existing.add(label.lower())
        found.append((label, value))
        return ""

    return LINE.sub(repl, html), found


FAQ_SEC = re.compile(r"(<h3[^>]*>\s*FAQs?\s*</h3>)(.*?)(?=<h[1-6]|\Z)", re.S | re.I)


def build_faq(body):
    """Alternating <p>question</p><p>answer</p> -> <details> accordions."""
    parts = re.findall(r"<(p|li)[^>]*>(.*?)</\1>", body, re.S | re.I)
    items, i = [], 0
    while i < len(parts):
        q = text_of(parts[i][1])
        # a question may be wrapped in <strong> from the earlier pass
        if q.endswith("?") and i + 1 < len(parts):
            a = parts[i + 1][1].strip()
            items.append((q, a))
            i += 2
        else:
            i += 1
    if not items:
        return None
    out = ['<div class="pdp-faq">']
    for q, a in items:
        out.append(
            '<details class="pdp-faq__item">'
            f'<summary class="pdp-faq__q">{htmllib.escape(q)}</summary>'
            f'<div class="pdp-faq__a">{a if a.strip().startswith("<") else "<p>" + a + "</p>"}</div>'
            "</details>")
    out.append("</div>")
    return "".join(out)


# a question left as a bold paragraph is an FAQ entry that never made it in
PSEUDO_Q = re.compile(r"<p[^>]*>\s*<strong>\s*([^<]{6,120}\?)\s*</strong>\s*</p>\s*"
                      r"(<(?:p|ul|ol)[^>]*>.*?</(?:p|ul|ol)>)", re.S | re.I)


def main():
    apply = "--apply" in sys.argv
    prods, cur = [], None
    while True:
        d = gql("""query($c:String){ products(first:100, after:$c){
            pageInfo{hasNextPage endCursor}
            nodes{ id handle descriptionHtml
                   specs: metafield(namespace:"custom", key:"specs"){ value } } } }""",
                {"c": cur})["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    jobs, n_specs, n_faq, n_moved = [], 0, 0, 0
    for p in prods:
        html = p["descriptionHtml"] or ""
        if not html.strip():
            continue
        existing = set()
        current = []
        if p.get("specs"):
            try:
                current = json.loads(p["specs"]["value"])
                existing = {s["label"].lower() for s in current}
            except Exception:                            # noqa: BLE001
                current = []

        new_html, found = sweep_specs(html, existing)

        # stray bold questions -> a real FAQs section
        stray = PSEUDO_Q.findall(new_html)
        if stray:
            new_html = PSEUDO_Q.sub("", new_html)
            extra = "".join(f"<p>{htmllib.escape(q)}</p>{a}" for q, a in stray)
            m = FAQ_SEC.search(new_html)
            if m:
                new_html = new_html[:m.end()] + extra + new_html[m.end():]
            else:
                new_html += "<h3>FAQs</h3>" + extra

        # FAQ section -> accordion
        def faqrepl(m):
            built = build_faq(m.group(2))
            return m.group(1) + built if built else m.group(0)

        before_faq = new_html
        new_html = FAQ_SEC.sub(faqrepl, new_html)
        faq_changed = new_html != before_faq

        # tidy empties left behind
        new_html = re.sub(r"<(ul|ol)>\s*</\1>", "", new_html)
        new_html = re.sub(r"<p>\s*</p>", "", new_html)

        if new_html == html and not found:
            continue
        if found:
            n_specs += 1
            n_moved += len(found)
        if faq_changed or stray:
            n_faq += 1
        jobs.append((p, new_html, current + [{"label": k, "value": v} for k, v in found]))

    print(f"products to update      : {len(jobs)}")
    print(f"  specs swept into tab  : {n_moved} rows across {n_specs} products")
    print(f"  FAQ turned into an accordion: {n_faq} products")
    print("\nsample of lines moving to the Specifications tab:")
    shown = 0
    for p, _, specs in jobs:
        if shown >= 5 or not specs:
            continue
        print(f"   {p['handle']}")
        for s in specs[-4:]:
            print(f"        {s['label']}: {s['value'][:48]}")
        shown += 1

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    MP = """mutation($input:ProductInput!){ productUpdate(input:$input){ userErrors{message} } }"""
    SET = """mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{field message} } }"""
    meta, done = [], 0
    for p, new_html, specs in jobs:
        gql(MP, {"input": {"id": p["id"], "descriptionHtml": new_html}})
        if specs:
            meta.append({"ownerId": p["id"], "namespace": "custom", "key": "specs",
                         "type": "json", "value": json.dumps(specs, ensure_ascii=False)})
        done += 1
        if done % 20 == 0:
            print(f"   … {done}/{len(jobs)}")
        time.sleep(0.4)
    for i in range(0, len(meta), 20):
        r = gql(SET, {"m": meta[i:i + 20]})["metafieldsSet"]
        if r["userErrors"]:
            print("   !!", r["userErrors"][:2])
        time.sleep(0.4)
    print(f"\nupdated {done} products, specs written on {len(meta)}")


if __name__ == "__main__":
    main()
