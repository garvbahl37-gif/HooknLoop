#!/usr/bin/env python3
"""Give every blog article a topic, derived from what it actually links to.

The migrated articles carry no tags at all, so a 54-post blog had no way to
navigate by subject — a reader who arrives on a flashing-tape guide has no route
to the other flashing-tape guides. Rather than invent tags, the topic is read
out of the article's own content:

    a link to /collections/<x>            3 points
    a link to a product that sits in <x>  1 point
    <x>'s distinctive word in the title   5 points   (decisive, and it should be:
                                                      "Guide to Flashing Tape" is
                                                      about flashing tape whatever
                                                      it happens to link to)

Industry categories (Automotive, Marine, …) are excluded as candidates — they
describe a buyer, not a subject. Articles with no product signal at all are the
market-forecast pieces, and they get "Industry Insight".

Writes `custom.topic` and `custom.topic_url` so the theme can label and link
each card without recomputing any of this at render time.

    python3 tag_blog_topics.py            # dry run, prints every assignment
    python3 tag_blog_topics.py --apply
"""
import collections
import json
import pathlib
import re
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOP = "cvbpp2-up.myshopify.com"

# these describe who is buying, not what the article is about
INDUSTRY = {
    "aerospace-defense", "automotive", "building-construction", "display-signage",
    "electronics-electrical", "flooring", "framing-insulation", "glass-glazing",
    "hvac-plumbing", "joinery-kitchen-furniture", "manufacturing", "marine",
    "packaging-logistics", "retail-hospitality", "arts-entertainment", "nameplates",
    "tapes-for-visual", "bestsellers", "all",
}
# words too common to identify a topic on their own
STOP = {"tape", "tapes", "and", "the", "for", "of", "single", "double", "sided", "dots"}
FALLBACK = ("Industry Insight", "/blogs/news")


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


def rest(path):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/{path}")
    req.add_header("X-Shopify-Access-Token", TOK)
    return json.loads(urllib.request.urlopen(req, timeout=120).read())


def load():
    colls, cur = {}, None
    while True:
        d = gql("""query($c:String){ collections(first:250, after:$c){
            pageInfo{hasNextPage endCursor} nodes{ handle title } } }""", {"c": cur})["collections"]
        for n in d["nodes"]:
            colls[n["handle"]] = n["title"]
        if not d["pageInfo"]["hasNextPage"]:
            return colls, prods_of()
        cur = d["pageInfo"]["endCursor"]


def prods_of():
    out, cur = {}, None
    while True:
        d = gql("""query($c:String){ products(first:100, after:$c){
            pageInfo{hasNextPage endCursor}
            nodes{ handle collections(first:8){ nodes{ handle } } } } }""", {"c": cur})["products"]
        for n in d["nodes"]:
            out[n["handle"]] = [c["handle"] for c in n["collections"]["nodes"]]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


def keywords(title):
    ws = [w for w in re.findall(r"[a-z]+", title.lower()) if w not in STOP and len(w) > 3]
    return set(ws)


def main():
    apply = "--apply" in sys.argv
    colls, prods = load()
    cand = {h: t for h, t in colls.items() if h not in INDUSTRY}
    kw = {h: keywords(t) for h, t in cand.items()}

    blog = rest("blogs.json")["blogs"][0]
    arts = rest(f"blogs/{blog['id']}/articles.json?limit=250")["articles"]

    rows = []
    for a in arts:
        body = a.get("body_html") or ""
        title_words = set(re.findall(r"[a-z]+", a["title"].lower()))
        votes = collections.Counter()

        for h in re.findall(r'href="/collections/([a-z0-9\-]+)"', body):
            if h in cand:
                votes[h] += 3
        for h in re.findall(r'href="/products/([a-z0-9\-]+)"', body):
            for c in prods.get(h, []):
                if c in cand:
                    votes[c] += 1
        # the title is the strongest evidence of subject
        for h, words in kw.items():
            if words and words <= title_words:
                votes[h] += 5

        if votes and votes.most_common(1)[0][1] >= 3:
            h = votes.most_common(1)[0][0]
            rows.append((a, cand[h], f"/collections/{h}", votes.most_common(1)[0][1]))
        else:
            rows.append((a, FALLBACK[0], FALLBACK[1], 0))

    spread = collections.Counter(r[1] for r in rows)
    print(f"articles: {len(rows)}   distinct topics: {len(spread)}")
    print(f"fallback '{FALLBACK[0]}': {spread[FALLBACK[0]]}\n")
    for t, n in spread.most_common():
        print(f"   {t:<32}{n}")
    print("\nassignments:")
    for a, t, _, s in rows:
        print(f"   {a['handle'][:52]:<54} {t:<30} {s}")

    if not apply:
        print("\ndry run — nothing written. re-run with --apply")
        return

    SET = """mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{field message} } }"""
    payload = []
    for a, t, url, _ in rows:
        gid = f"gid://shopify/Article/{a['id']}"
        payload.append({"ownerId": gid, "namespace": "custom", "key": "topic",
                        "type": "single_line_text_field", "value": t})
        payload.append({"ownerId": gid, "namespace": "custom", "key": "topic_url",
                        "type": "single_line_text_field", "value": url})
    for i in range(0, len(payload), 25):
        r = gql(SET, {"m": payload[i:i + 25]})["metafieldsSet"]
        if r["userErrors"]:
            print("  !!", r["userErrors"][:2])
        time.sleep(0.4)
    print(f"\nwrote topic on {len(rows)} articles")


if __name__ == "__main__":
    main()
