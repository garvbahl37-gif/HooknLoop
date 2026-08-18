#!/usr/bin/env python3
"""Give every product description the same section order and section names.

THE PROBLEM
132 products produced 93 distinct heading sequences. The same section is titled
four different ways — "Features" (32), "Key Features" (30), "Salient Features",
"Features Added" — and the order flips between products:

    Features > Applications > Specifications
    Specifications > Applications > Features
    Key Features > Application Areas

So two products in the same category read as two different templates.

WHAT THIS DOES
  1. Splits the body into an intro (everything before the first heading) and
     the heading-led sections that follow.
  2. Renames each heading to its canonical form.
  3. Reorders: intro, Key Features, Applications, Specifications, then anything
     unrecognised in its original order.

The intro always stays first and is never touched — it is the product's own
opening pitch. Unrecognised sections are kept, never dropped.

    python3 normalise_pdp_sections.py            # dry run with before/after
    python3 normalise_pdp_sections.py --apply
"""
import json
import pathlib
import re
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOP = "cvbpp2-up.myshopify.com"

CANON = [
    ("Key Features", (
        "key features", "key feature", "features", "feature", "salient features",
        "features added", "main features", "key features & benefits",
        "features & benefits", "benefits", "key features and benefits")),
    ("Applications", (
        "applications", "application", "application areas", "areas of application",
        "uses", "common uses", "where to use", "suitable for")),
    ("Specifications", (
        "specifications", "specification", "specs", "technical specifications",
        "technical specification", "product specifications")),
]
ORDER = [c for c, _ in CANON]


def canonical(text):
    t = re.sub(r"<[^>]+>", "", text).strip().rstrip(":").strip().lower()
    for name, alts in CANON:
        if t in alts:
            return name
    return None


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


def all_products():
    out, page_info = [], None
    while True:
        path = ("products.json?limit=250&fields=id,handle,body_html"
                + (f"&page_info={page_info}" if page_info else ""))
        d, link = rest(path)
        out += d["products"]
        m = re.search(r'page_info=([^>&]+)>; rel="next"', link)
        if not m:
            return out
        page_info = m.group(1)


HEAD = re.compile(r"<(h[1-4])\b[^>]*>(.*?)</\1>", re.S | re.I)


def split_sections(html):
    """-> (intro_html, [(canonical_or_None, original_heading_html, body_html)])"""
    marks = list(HEAD.finditer(html))
    if not marks:
        return html, []
    intro = html[:marks[0].start()]
    out = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(html)
        out.append((canonical(m.group(2)), m.group(2), html[m.end():end]))
    return intro, out


def rebuild(intro, sections):
    """Rename always; REORDER only when every section is recognised.

    Reordering a product that has bespoke sections moves them all to the end,
    which is worse than leaving it alone: on all-weather-repair-tape it pushed
    Specifications above "Considering Features" and "Usage Ideas", inverting
    the author's structure. So a product with any unrecognised section keeps
    its original order and only gets consistent section NAMES.
    """
    parts = [intro.rstrip()]
    reorderable = all(c for c, _, _ in sections)

    if reorderable:
        known = {}
        for canon, _, body in sections:
            # two "Features" blocks on one product keep both, merged in order
            known.setdefault(canon, []).append(body)
        for name in ORDER:
            if name in known:
                parts.append(f"<h3>{name}</h3>" + "".join(known[name]).strip())
    else:
        for canon, raw, body in sections:
            label = canon or re.sub(r"<[^>]+>", "", raw).strip().rstrip(":").strip()
            parts.append(f"<h3>{label}</h3>" + body.strip())

    return "\n".join(p for p in parts if p.strip())


def main():
    apply = "--apply" in sys.argv
    prods = all_products()
    jobs = []
    for p in prods:
        html = p.get("body_html") or ""
        intro, sections = split_sections(html)
        if not sections:
            continue
        new = rebuild(intro, sections)
        before = [re.sub(r"<[^>]+>", "", s[1]).strip().rstrip(":") for s in sections]
        after = [re.sub(r"<[^>]+>", "", h) for h in re.findall(r"<h3>(.*?)</h3>", new)]
        if before != after or new.strip() != html.strip():
            jobs.append((p, new, before, after))

    print(f"products            : {len(prods)}")
    print(f"would be normalised : {len(jobs)}")
    for p, _, before, after in jobs[:10]:
        print(f"\n   {p['handle'][:44]}")
        print(f"      before: {' > '.join(before)[:96]}")
        print(f"      after : {' > '.join(after)[:96]}")
    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    done = 0
    for p, new, _, _ in jobs:
        rest(f"products/{p['id']}.json", "PUT",
             {"product": {"id": p["id"], "body_html": new}})
        done += 1
        time.sleep(0.55)
    print(f"\nnormalised: {done}/{len(jobs)}")


if __name__ == "__main__":
    main()
