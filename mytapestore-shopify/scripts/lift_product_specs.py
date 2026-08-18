#!/usr/bin/env python3
"""Move the Specifications block out of the description and into the Specs tab.

THE PROBLEM
68 of 132 products repeat "Specifications" inside the Description tab, so the
word appears twice on the page and the same product is described in two places.
Worse, the two disagree: the tab shows only what Shopify knows (Category, Size,
Colour, Price, Availability, Brand) while the description carries the real
engineering data — thickness, temperature range, adhesive type, tensile
strength — which is exactly what a trade buyer is looking for.

WHAT THIS DOES
  1. Reads the Specifications section out of the description.
  2. Parses its "Label: Value" lines into structured pairs.
  3. Stores them in `custom.specs` (JSON), which the Specifications tab renders
     alongside the Shopify-derived rows. Nothing is discarded — anything the tab
     was missing is now IN the tab.
  4. Deletes the section from the description, so the word appears once.
  5. Normalises the remaining sections so every product page reads in the same
     order: intro -> Key Features -> Applications -> anything else.

Heading variants ("Application Area", "Applications Areas", "Where to use?")
are folded onto one canonical name, because the layout can only be identical
across products if the sections are named identically.

Lines that are prose rather than a spec (the lead-in sentence, "Contact our
experts…") are kept as description text rather than forced into the table.

    python3 lift_product_specs.py            # dry run
    python3 lift_product_specs.py --apply
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

SPEC_RE = re.compile(r"<(h[1-6])[^>]*>\s*(?:<strong>\s*)?\s*(?:size\s+)?specification[s]?\s*:?\s*"
                     r"(?:</strong>\s*)?</\1>", re.I)
HEAD_RE = re.compile(r"<(h[1-6])[^>]*>(.*?)</\1>", re.S | re.I)

# every way the migrated copy names the same two sections
# Every product page should read the same way, so the many one-off headings the
# migration carried over are folded onto four canonical sections. Matching is by
# INTENT, not wording: a heading about features is Key Features whatever it is
# called on that particular product.
FEATURE_WORDS = ("feature", "benefit", "characteristic", "quality", "qualities",
                 "why choose", "why buy", "why use", "reasons to buy",
                 "considerations to buy", "considering", "safety", "usefulness",
                 "advantages", "what makes")
APPLY_WORDS = ("application", "applications", "where to use", "common uses",
               "ideal for", "easy to use on", "industries served", "usage ideas",
               "used for", "suitable for", "uses of")
HOWTO_WORDS = ("how to", "usage instructions", "instructions", "how do i")

CANON = {
    "key features": "Key Features",
    "key characteristics": "Key Features",
    "interesting characteristics": "Key Features",
    "applications": "Applications",
    "application": "Applications",
    "application area": "Applications",
    "application areas": "Applications",
    "applications areas": "Applications",
    "where to use": "Applications",
    "where to use?": "Applications",
    "where to use- application areas": "Applications",
    "usage ideas": "Applications",
    "usage instructions": "How to apply",
    "faq": "FAQs",
    "faqs": "FAQs",
    "frequently asked questions": "FAQs",
}
ORDER = ["Key Features", "Applications", "How to apply", "FAQs"]


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


def text_of(html):
    return re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", " ", html))).strip()


def canon(name):
    """Canonical section name, or '' when the text is not a heading at all."""
    raw = text_of(name).strip().rstrip(":").strip()
    k = raw.lower()
    if not raw:
        return ""
    for key, val in CANON.items():
        if k == key or k.startswith(key):
            return val
    # A question is an FAQ entry, not a section of its own.
    if raw.endswith("?"):
        return "FAQs"
    # A sentence or a call to action was never a heading — the migration marked
    # up whole lines of copy as <h3>. Demote those back to body text.
    if raw.endswith((".", "!")) or len(raw.split()) > 8:
        return ""
    for w in HOWTO_WORDS:
        if w in k:
            return "How to apply"
    for w in APPLY_WORDS:
        if w in k:
            return "Applications"
    for w in FEATURE_WORDS:
        if w in k:
            return "Key Features"
    # Anything left is product-specific ("Electronic Tapes Dispenser",
    # "Size Options"). Keeping it as a heading is exactly what stopped these
    # pages being identical, so it becomes a bold lead-in paragraph instead —
    # the words survive, the structure does not fork.
    return ""


def split_sections(html):
    """(intro_html, [(canonical_name, body_html, raw_heading)])."""
    heads = list(HEAD_RE.finditer(html))
    if not heads:
        return html, []
    intro = html[:heads[0].start()]
    out = []
    for i, m in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(html)
        out.append((canon(m.group(2)), html[m.end():end], m.group(0)))
    return intro, out


def parse_specs(body):
    """[(label, value)] from 'Label: Value' lines; prose is returned separately."""
    pairs, prose = [], []
    for m in re.finditer(r"<(li|p)[^>]*>(.*?)</\1>", body, re.S | re.I):
        t = text_of(m.group(2))
        if not t:
            continue
        # a spec line is "Label: value" with a short label and no sentence stop
        sm = re.match(r"^([A-Za-z][A-Za-z0-9 /&()\-]{1,34}?)\s*:\s*(.+)$", t)
        if sm and len(sm.group(1).split()) <= 4 and not sm.group(1).endswith("."):
            pairs.append((sm.group(1).strip(), sm.group(2).strip()))
        else:
            prose.append(f"<p>{htmllib.escape(t)}</p>")
    return pairs, "".join(prose)


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

    jobs, stats = [], {"specs_lifted": 0, "pairs": 0, "renamed": 0, "reordered": 0}
    for p in prods:
        html = p["descriptionHtml"] or ""
        if not html.strip():
            continue
        intro, sections = split_sections(html)

        spec_pairs, spec_prose = [], ""
        kept = []
        for name, body, raw in sections:
            if re.match(r"^specification", name, re.I) or SPEC_RE.match(raw):
                pr, prose = parse_specs(body)
                spec_pairs += pr
                spec_prose += prose
            else:
                kept.append((name, body, raw))

        # A heading that canon() rejected is body copy: keep its own text as a
        # paragraph so nothing is lost, then let its content follow.
        merged, demoted = {}, []
        for name, body, raw in kept:
            if name == "":
                demoted.append(f"<p>{htmllib.escape(text_of(raw))}</p>{body}")
                continue
            # An FAQ heading IS the question. Folding several of them under one
            # "FAQs" section must keep each question, or the answers are left
            # orphaned with nothing to answer.
            q = text_of(raw).strip()
            if name == "FAQs" and q.endswith("?"):
                body = f"<p><strong>{htmllib.escape(q)}</strong></p>{body}"
            merged[name] = merged.get(name, "") + body

        def rank(n):
            return ORDER.index(n) if n in ORDER else len(ORDER) + 1
        reordered = [(n, merged[n], "") for n in sorted(merged, key=rank)]
        spec_prose += "".join(demoted)
        was_renamed = any(canon(r[2]) != text_of(r[2]).strip().rstrip(":") for r in kept)
        was_reordered = [s[0] for s in reordered] != [s[0] for s in kept]

        new_html = intro + spec_prose + "".join(
            f"<h3>{name}</h3>{body}" for name, body, _ in reordered)

        changed = (new_html != html) or spec_pairs
        if not changed:
            continue
        if spec_pairs:
            stats["specs_lifted"] += 1
            stats["pairs"] += len(spec_pairs)
        if was_renamed:
            stats["renamed"] += 1
        if was_reordered:
            stats["reordered"] += 1
        jobs.append((p, new_html, spec_pairs))

    print(f"products                          : {len(prods)}")
    print(f"to update                         : {len(jobs)}")
    print(f"  Specifications lifted out of desc: {stats['specs_lifted']}  ({stats['pairs']} spec rows)")
    print(f"  section headings renamed         : {stats['renamed']}")
    print(f"  sections reordered               : {stats['reordered']}")
    print("\nsample:")
    for p, _, pairs in jobs[:6]:
        print(f"   {p['handle'][:44]:<46} {len(pairs)} spec rows")
        for k, v in pairs[:4]:
            print(f"        {k}: {v[:44]}")

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    MP = """mutation($input:ProductInput!){ productUpdate(input:$input){ userErrors{message} } }"""
    SET = """mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{field message} } }"""
    meta = []
    done = 0
    for p, new_html, pairs in jobs:
        gql(MP, {"input": {"id": p["id"], "descriptionHtml": new_html}})
        if pairs:
            meta.append({"ownerId": p["id"], "namespace": "custom", "key": "specs",
                         "type": "json",
                         "value": json.dumps([{"label": k, "value": v} for k, v in pairs],
                                             ensure_ascii=False)})
        done += 1
        if done % 20 == 0:
            print(f"   … {done}/{len(jobs)}")
        time.sleep(0.4)
    for i in range(0, len(meta), 20):
        r = gql(SET, {"m": meta[i:i + 20]})["metafieldsSet"]
        if r["userErrors"]:
            print("   !!", r["userErrors"][:2])
        time.sleep(0.4)
    print(f"\nupdated {done} products, wrote specs on {len(meta)}")


if __name__ == "__main__":
    main()
