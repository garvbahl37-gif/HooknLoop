#!/usr/bin/env python3
"""Publish the scraped volume-price breaks to Shopify as product metafields.

Turns the plugin's rules into the bands the product page actually draws:

    min 1 + {2:5, 6:10, 10:15}
      -> 1 piece | 2-5 pieces 5% | 6-9 pieces 10% | 10+ pieces 15%

The banding is done here rather than in Liquid on purpose — Liquid can't sort
the rules' numeric keys reliably, and this way the arithmetic lives in one place
that can be checked against the original store.

Metafield: mts.volume_tiers (json)
    {"min": 1, "bands": [{"from":1,"to":1,"off":0}, {"from":2,"to":5,"off":5}, ...]}
`to: null` means "and up".

Idempotent — re-running overwrites with the same values.
"""
import json
import os
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOP = "cvbpp2-up.myshopify.com"
NS, KEY = "mts", "volume_tiers"


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
        method="POST",
    )
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    out = json.loads(urllib.request.urlopen(req, timeout=90).read())
    if "errors" in out:
        sys.exit(f"GraphQL error: {out['errors']}")
    return out["data"]


def bands_for(rec):
    """minimum + {qty: pct} -> contiguous bands, base band first."""
    rules = {int(q): float(p) for q, p in rec["rules"].items()}
    steps = sorted(rules)                      # e.g. [2, 6, 10]
    lo = int(rec.get("minimum") or 1)

    bands = []
    # the undiscounted band runs from the product's minimum up to the first break
    if lo < steps[0]:
        bands.append({"from": lo, "to": steps[0] - 1, "off": 0})
    for i, q in enumerate(steps):
        top = steps[i + 1] - 1 if i + 1 < len(steps) else None
        bands.append({"from": q, "to": top, "off": rules[q]})
    return {"min": lo, "bands": bands}


def all_products():
    """handle -> gid, paging through the whole catalogue."""
    out, cursor = {}, None
    while True:
        d = gql(
            """query($c: String) {
                 products(first: 250, after: $c) {
                   nodes { id handle }
                   pageInfo { hasNextPage endCursor }
                 }
               }""",
            {"c": cursor},
        )
        for n in d["products"]["nodes"]:
            out[n["handle"]] = n["id"]
        if not d["products"]["pageInfo"]["hasNextPage"]:
            return out
        cursor = d["products"]["pageInfo"]["endCursor"]


def main():
    scraped = json.loads((ROOT / "import" / "tiers.json").read_text())
    withtiers = [r for r in scraped if r.get("rules")]
    catalogue = all_products()
    print(f"shopify products : {len(catalogue)}")
    print(f"scraped w/ tiers : {len(withtiers)}")

    payload, missing = [], []
    for rec in withtiers:
        gid = catalogue.get(rec["handle"])
        if not gid:
            missing.append(rec["handle"])
            continue
        payload.append(
            {
                "ownerId": gid,
                "namespace": NS,
                "key": KEY,
                "type": "json",
                "value": json.dumps(bands_for(rec), separators=(",", ":")),
            }
        )

    if missing:
        print(f"\n!! no Shopify product for {len(missing)} handle(s):")
        for h in missing:
            print("   ", h)

    # Products that lost their breaks upstream must lose the metafield too,
    # otherwise the page keeps advertising a discount the store dropped.
    keep = {r["handle"] for r in withtiers}
    stale = [
        catalogue[r["handle"]]
        for r in scraped
        if r["handle"] in catalogue and r["handle"] not in keep
    ]

    written = 0
    for i in range(0, len(payload), 25):
        chunk = payload[i : i + 25]
        d = gql(
            """mutation($m: [MetafieldsSetInput!]!) {
                 metafieldsSet(metafields: $m) {
                   metafields { id }
                   userErrors { field message }
                 }
               }""",
            {"m": chunk},
        )
        errs = d["metafieldsSet"]["userErrors"]
        if errs:
            sys.exit(f"userErrors: {errs}")
        written += len(d["metafieldsSet"]["metafields"])
        print(f"  wrote {written}/{len(payload)}")

    removed = 0
    for i in range(0, len(stale), 25):
        chunk = [{"ownerId": g, "namespace": NS, "key": KEY} for g in stale[i : i + 25]]
        d = gql(
            """mutation($m: [MetafieldIdentifierInput!]!) {
                 metafieldsDelete(metafields: $m) {
                   deletedMetafields { key }
                   userErrors { message }
                 }
               }""",
            {"m": chunk},
        )
        removed += len(d["metafieldsDelete"]["deletedMetafields"] or [])

    print(f"\nmetafields written : {written}")
    print(f"stale cleared      : {removed}")


if __name__ == "__main__":
    main()
