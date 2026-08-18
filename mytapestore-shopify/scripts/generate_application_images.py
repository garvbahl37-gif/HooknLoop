#!/usr/bin/env python3
"""Generate one application photograph for each product that has none.

WHY THESE PRODUCTS AND NOT OTHERS
An audit of all 132 descriptions found 30 with no image at all. Of those, 20
carry their own "Applications" copy and 10 do not. Only the 20 are generated
for: the prompt is built FROM THE PRODUCT'S OWN APPLICATIONS TEXT, so the
picture can only ever illustrate a use the merchant already claims. For the
other 10 there is nothing to ground a prompt in, and inventing a use case for
an industrial adhesive is a suitability claim this project has no business
making. They are listed and skipped.

WHAT THE FIRST ATTEMPT TAUGHT US
A four-panel "application grid" prompt — the format the old site uses — came
back as the same product shot twice plus two scenes with no tape visible at
all. Image models compose multi-panel grids badly and fall back on repeating
the hero object. A SINGLE SCENE with the tape being applied works reliably, so
that is the pattern here: one moment, one application, tape clearly adhered.

Also always instructed: no text, no lettering, no logos. Models render type
unreliably, and a diagram with garbled labels is worse than no diagram.

    MAGNIFIC_KEY=... python3 generate_application_images.py            # prompts only
    MAGNIFIC_KEY=... python3 generate_application_images.py --apply
    MAGNIFIC_KEY=... python3 generate_application_images.py --apply --limit 3
"""
import json
import os
import pathlib
import re
import sys
import time
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SHOP = "cvbpp2-up.myshopify.com"
API = "2024-10"
MAG = "https://api.magnific.com/v1/ai/mystic"
OUT = HERE.parent / "generated-application-images"

KEY = os.environ.get("MAGNIFIC_KEY")


def env(k):
    for line in (ROOT / "newsletter" / ".env.local").read_text().splitlines():
        if line.startswith(k + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return None


TOK = env("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE") or env("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE")


def gql(q, v=None):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/{API}/graphql.json",
                                 data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 method="POST")
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def rest(path, method="GET", body=None):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/{API}/{path}",
                                 data=json.dumps(body).encode() if body else None,
                                 method=method)
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def strip(h):
    t = re.sub(r"<[^>]+>", " ", h or "")
    return re.sub(r"\s+", " ", t).replace("&amp;", "&").strip()


LEADIN = re.compile(
    r"^(available\s+(?:in|with|as)(?:\s+variable)?|each\s+roll\s+is|comes?\s+in|"
    r"supplied\s+in|made\s+(?:of|from)|it\s+is)\s+", re.I)


def facts(body):
    """Colour / material as the copy states them — never invented.

    The migrated copy writes spec values as sentences ("Available in Black and
    White Colour"), which read as noise inside a generation prompt and made the
    subject line nonsense: "applying Available in Black and White Colour
    adhesive tape". The lead-in and the echoed label are stripped so the prompt
    gets the VALUE — "Black and White" — and nothing else. Only trimming here;
    no wording is invented.
    """
    out = {}
    for label in ("Colour", "Color", "Material", "Adhesive", "Backing"):
        m = re.search(rf"{label}\s*[-–—:]\s*([^<\n]{{2,60}})", body, re.I)
        if not m:
            continue
        v = strip(m.group(1)).strip(" .")
        v = LEADIN.sub("", v)
        v = re.sub(rf"\s+{label}$", "", v, flags=re.I).strip(" .,")
        if v:
            out[label.lower()] = v
    return out


def primary_use(apps):
    """ONE concrete application, as a scene a photograph can actually show.

    A bare list ("Construction, HVAC, Automotive, Packaging, Glazing and More")
    is not a scene — asking for it produces a collage, which is exactly the
    failure mode the four-panel attempt had. So a comma list is reduced to its
    first item and the trailing "and More" is dropped.
    """
    parts = re.split(r"(?<=[.;])\s+|\s*•\s*|\s{2,}", apps)
    first = next((p.strip(" .;:") for p in parts if len(p.strip()) > 12), apps)
    first = re.sub(r"\s*(,?\s*and\s+more\.?)$", "", first, flags=re.I)
    # "Used in A, B, C and D" -> "Used in A"
    if first.count(",") >= 2 and ":" not in first:
        head = first.split(",")[0].strip()
        if len(head) > 10:
            first = head
    return first[:150]


def build_prompt(title, apps, body):
    f = facts(body)
    colour = f.get("colour") or f.get("color") or ""
    material = f.get("material") or ""
    desc = " ".join(x for x in [colour, material] if x)
    desc = re.sub(r"\s+", " ", desc).strip()
    subject = f"{desc} adhesive tape" if desc else f"{title.lower()}"
    use = primary_use(apps)
    return (
        f"Photorealistic close-up of a gloved tradesperson applying {subject} "
        f"in this real situation: {use}. The tape is clearly adhered to the surface, "
        f"pressed flat, its cut edge visible, with a partially unrolled roll resting "
        f"nearby. Authentic Australian worksite or workshop setting, shallow depth of "
        f"field, natural directional light, industrial documentary photography, sharp "
        f"detail. No text, no lettering, no logos, no watermarks, no signage."
    )


def magnific(prompt):
    req = urllib.request.Request(MAG, data=json.dumps({
        "prompt": prompt, "aspect_ratio": "classic_4_3"}).encode(), method="POST")
    req.add_header("x-magnific-api-key", KEY)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())["data"]["task_id"]


def poll(task, tries=25):
    for _ in range(tries):
        time.sleep(7)
        req = urllib.request.Request(f"{MAG}/{task}")
        req.add_header("x-magnific-api-key", KEY)
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.loads(r.read())["data"]
        if d["status"] == "COMPLETED":
            return d["generated"][0]
        if d["status"] == "FAILED":
            raise RuntimeError(d.get("error") or "generation failed")
    raise RuntimeError("timed out")


CREATE_FILE = """
mutation($files:[FileCreateInput!]!){ fileCreate(files:$files){
  files{ ... on MediaImage { id fileStatus image{ url } } }
  userErrors{ field message } } }"""
FILE_NODES = """query($ids:[ID!]!){ nodes(ids:$ids){ ... on MediaImage { id fileStatus image{ url } } } }"""
APPS_H = re.compile(r"(<h[23][^>]*>\s*Applications\s*</h[23]>)", re.I)


def main():
    apply = "--apply" in sys.argv
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
    if apply and not KEY:
        sys.exit("set MAGNIFIC_KEY in the environment")

    prods, cur = [], None
    Q = """query($c:String){ products(first:100, after:$c){
      nodes{ id handle title descriptionHtml }
      pageInfo{ hasNextPage endCursor } } }"""
    while True:
        d = gql(Q, {"c": cur})["data"]["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    jobs, skipped = [], []
    for p in prods:
        b = p["descriptionHtml"] or ""
        if re.search(r"<img", b):
            continue                                        # already has one
        m = re.search(r"<h[23][^>]*>\s*Applications\s*</h[23]>(.*?)(?=<h[23]|$)", b, re.S | re.I)
        apps = strip(m.group(1)) if m else ""
        if not apps:
            skipped.append(p["handle"])
            continue
        jobs.append((p, build_prompt(p["title"], apps, b)))
    if limit:
        jobs = jobs[:limit]

    print(f"products needing an application image : {len(jobs)}")
    print(f"skipped (no Applications copy to ground a prompt) : {len(skipped)}")
    if skipped:
        print("   " + ", ".join(skipped))
    print(f"estimated credits ~{len(jobs) * 100}\n")

    if not apply:
        for p, pr in jobs:
            print(f"--- {p['handle']}")
            print(f"    {pr[:230]}…\n")
        print("dry run — pass --apply to generate")
        return 0

    OUT.mkdir(exist_ok=True)
    done = failed = 0
    for i, (p, prompt) in enumerate(jobs, 1):
        try:
            url = poll(magnific(prompt))
            local = OUT / f"{p['handle']}-application.png"
            urllib.request.urlretrieve(url, local)

            r = gql(CREATE_FILE, {"files": [{
                "originalSource": url, "contentType": "IMAGE",
                "alt": f"{p['title']} applications"}]})
            node = (r.get("data") or {}).get("fileCreate") or {}
            if node.get("userErrors"):
                raise RuntimeError(node["userErrors"])
            fid = node["files"][0]["id"]
            cdn = None
            for _ in range(30):
                n = gql(FILE_NODES, {"ids": [fid]})["data"]["nodes"][0]
                if n and n.get("fileStatus") == "READY" and n.get("image"):
                    cdn = n["image"]["url"]
                    break
                time.sleep(2)
            if not cdn:
                raise RuntimeError("file never became READY")

            fig = (f'<p class="pdp-appimg"><img src="{cdn}" '
                   f'alt="{p["title"]} applications" loading="lazy" decoding="async"></p>')
            body = p["descriptionHtml"] or ""
            body = (APPS_H.sub(r"\1\n" + fig, body, count=1)
                    if APPS_H.search(body) else body.rstrip() + "\n" + fig)
            rest(f"products/{p['id'].split('/')[-1]}.json", "PUT",
                 {"product": {"id": int(p["id"].split("/")[-1]), "body_html": body}})
            done += 1
            print(f"[{i}/{len(jobs)}] {p['handle'][:40]:<42} generated + placed")
        except Exception as e:                               # noqa: BLE001
            print(f"[{i}/{len(jobs)}] {p['handle'][:40]:<42} FAILED {e}")
            failed += 1

    print(f"\ngenerated {done}, failed {failed}   (~{done * 100} credits)")
    print(f"local copies: {OUT}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
