#!/usr/bin/env python3
"""Give every product description ONE layout: same sections, same order, same
image position.

WHY THIS EXISTS ALONGSIDE normalise_pdp_sections.py
That script fixed heading NAMES and section ORDER, and it worked — but it never
touched images, and it deliberately refused to reorder any product that had an
unrecognised section. Both gaps are still visible: a census of the live store
found 132 products producing 19 DISTINCT section sequences, e.g.

    32x  Key Features > Applications > [IMG]
    20x  Key Features > [IMG]
    12x  Key Features > [IMG] > Applications
     4x  [IMG] > Key Features > Applications

so the image lands before, between or after the prose depending on the product.
Two products in the same category still read as two different templates.

THE CANONICAL LAYOUT

    intro prose            the product's own opening pitch, never rewritten
    [image(s)]             lifted out of wherever they were and placed here
    Key Features
    Applications
    Specifications
    How to apply
    FAQs
    <anything else>        preserved, in its original relative order

Images sit after the intro so every page has a visual before the structured
detail, rather than a wall of text with a picture buried in it.

WHAT IT WILL NOT DO
  · invent, translate or reword copy — only headings are renamed, to their
    canonical form, and only blocks are moved;
  · drop an unrecognised section — those are kept and appended in order, so a
    bespoke "Usage Ideas" block survives;
  · drop an image — every <img> in the input appears in the output. That is
    asserted per product before anything is written, and a product that fails
    the assertion is skipped and reported rather than saved.

    python3 normalise_pdp_layout.py            # dry run, prints the diff
    python3 normalise_pdp_layout.py --apply
    python3 normalise_pdp_layout.py --only duct-tape-48mm
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
    ("How to apply", (
        "how to apply", "how to use", "application method", "instructions",
        "directions", "how to")),
    ("FAQs", ("faqs", "faq", "frequently asked questions", "questions")),
]
ORDER = [c for c, _ in CANON]

HEAD = re.compile(r"<(h[1-4])\b[^>]*>(.*?)</\1>", re.S | re.I)
IMG = re.compile(r"<img\b[^>]*>", re.I)
# an <img> alone in a <p>/<figure>/<div> — move the wrapper, not a bare tag
WRAPPED_IMG = re.compile(
    r"<(p|figure|div)\b[^>]*>\s*(?:<a\b[^>]*>\s*)?(<img\b[^>]*>)"
    r"(?:\s*</a>)?\s*(?:<figcaption\b.*?</figcaption>)?\s*</\1>",
    re.S | re.I)


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


def lift_images(html):
    """Pull every image block out. -> (html_without_images, [image_blocks])

    Wrapped images are taken with their wrapper so a caption or link survives;
    a bare <img> is wrapped in a <p> on the way out so the rebuilt body has no
    naked inline images sitting between block elements.
    """
    blocks = []

    def take_wrapped(m):
        blocks.append(m.group(0))
        return ""
    stripped = WRAPPED_IMG.sub(take_wrapped, html)

    def take_bare(m):
        blocks.append(f"<p>{m.group(0)}</p>")
        return ""
    stripped = IMG.sub(take_bare, stripped)

    return stripped, blocks


def split_sections(html):
    marks = list(HEAD.finditer(html))
    if not marks:
        return html, []
    intro = html[:marks[0].start()]
    out = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(html)
        out.append((canonical(m.group(2)), m.group(2), html[m.end():end]))
    return intro, out


BLOCK = re.compile(r"<(p|ul|ol|table|figure|div)\b.*?</\1>", re.S | re.I)


def lead_first(intro):
    """Make the intro OPEN with its prose, not with stray spec lines.

    Some products were migrated with the short lines above the pitch:

        <p>Size – 48mm wide x 45m and 5m long</p>
        <p>Colour – Multiple options (white, red, yellow…)</p>
        <p>Reflective Tape for Vehicles- Trucks, Trailers…</p>
        <p>Class 1 reflective tape is premium-grade…</p>   <- the actual description

    so the page opened on a dimension instead of on what the product IS. The
    leading run of SHORT blocks is moved to sit after the first long one; their
    order relative to each other is preserved and nothing is deleted.

    Conservative on purpose: it only fires when every block before the first
    long paragraph is short (<= 140 chars). A product whose opening genuinely
    is two medium paragraphs is left alone.
    """
    blocks = BLOCK.findall(intro)
    if len(blocks) < 2:
        return intro
    spans = [m.group(0) for m in BLOCK.finditer(intro)]
    texts = [re.sub(r"<[^>]+>", " ", b).strip() for b in spans]

    lead = next((i for i, x in enumerate(texts) if len(x) > 200), None)
    if not lead:                      # None, or already first
        return intro
    if any(len(texts[i]) > 140 for i in range(lead)):
        return intro                  # not a run of short lines — leave it

    reordered = [spans[lead]] + spans[:lead] + spans[lead + 1:]
    return "\n".join(reordered)


def rebuild(html):
    """intro -> Key Features -> Applications -> application image(s) -> the rest.

    THE IMAGE SLOT MOVED, deliberately. It used to sit straight after the intro,
    which put a photograph between the pitch and the reasons to buy. These are
    APPLICATION images: they illustrate the Applications section, so they belong
    immediately after it, where the reader has just been told what the tape is
    used for.

    If a product has no Applications section the image follows Key Features
    instead, and failing that the intro — it is never dropped and never left
    stranded at the very end after the FAQs.
    """
    body, images = lift_images(html)
    intro, sections = split_sections(body)
    intro = lead_first(intro)

    known, extra = {}, []
    for canon, raw, sec in sections:
        if canon:
            known.setdefault(canon, []).append(sec)
        else:
            label = re.sub(r"<[^>]+>", "", raw).strip().rstrip(":").strip()
            extra.append((label, sec))

    imgs = [b.strip() for b in images]

    # where the images go: after Applications, else Key Features, else intro
    if "Applications" in known:
        anchor = "Applications"
    elif "Key Features" in known:
        anchor = "Key Features"
    else:
        anchor = None

    parts = []
    if intro.strip():
        parts.append(intro.strip())
    if anchor is None:
        parts.extend(imgs)

    for name in ORDER:
        if name not in known:
            continue
        merged = "".join(known[name]).strip()
        if merged:
            parts.append(f"<h3>{name}</h3>\n{merged}")
        if name == anchor:
            parts.extend(imgs)

    for label, sec in extra:                          # never dropped
        if sec.strip() or label:
            parts.append(f"<h3>{label}</h3>\n{sec.strip()}")

    return "\n".join(p for p in parts if p.strip())


def signature(html):
    """The section/image sequence, for reporting how many layouts exist."""
    seq = []
    for m in re.finditer(r"<(h[1-4])[^>]*>(.*?)</\1>|<img\b", html, re.S | re.I):
        if m.group(2) is not None:
            seq.append(re.sub("<[^>]+>", "", m.group(2)).strip()[:24])
        else:
            seq.append("[IMG]")
    out = []
    for s in seq:
        if not out or out[-1] != s:
            out.append(s)
    return " > ".join(out)


def main():
    apply = "--apply" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None

    prods = all_products()
    before, after = {}, {}
    jobs, skipped = [], []

    for p in prods:
        html = p.get("body_html") or ""
        if only and p["handle"] != only:
            continue
        if not html.strip():
            continue
        new = rebuild(html)

        # Nothing may be lost. Count images and visible words both ways.
        if len(IMG.findall(new)) != len(IMG.findall(html)):
            skipped.append((p["handle"], "image count changed"))
            continue
        w_old = len(re.sub(r"<[^>]+>", " ", html).split())
        w_new = len(re.sub(r"<[^>]+>", " ", new).split())
        if w_new < w_old * 0.97:
            skipped.append((p["handle"], f"text shrank {w_old}->{w_new} words"))
            continue

        before[signature(html)] = before.get(signature(html), 0) + 1
        after[signature(new)] = after.get(signature(new), 0) + 1
        if new.strip() != html.strip():
            jobs.append((p, new))

    print(f"products with a description : {sum(before.values())}")
    print(f"distinct layouts BEFORE     : {len(before)}")
    print(f"distinct layouts AFTER      : {len(after)}")
    print(f"products needing a change   : {len(jobs)}")
    if skipped:
        print(f"SKIPPED (nothing written)   : {len(skipped)}")
        for h, why in skipped[:10]:
            print(f"    {h}: {why}")

    print("\nresulting layouts:")
    for k, v in sorted(after.items(), key=lambda x: -x[1])[:10]:
        print(f"  {v:>3}x  {k[:120]}")

    if not apply:
        print("\n(dry run — pass --apply to write)")
        return 0

    done = 0
    for i, (p, new) in enumerate(jobs, 1):
        try:
            rest(f"products/{p['id']}.json", "PUT",
                 {"product": {"id": p["id"], "body_html": new}})
            done += 1
            if i % 20 == 0:
                print(f"  {i}/{len(jobs)}")
            time.sleep(0.55)                      # REST leaky bucket
        except Exception as e:                     # noqa: BLE001
            print(f"  {p['handle']}: FAILED {e}")
    print(f"\nupdated {done}/{len(jobs)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
