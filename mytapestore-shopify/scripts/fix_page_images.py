#!/usr/bin/env python3
"""Repair the broken images on the migrated location/staff pages.

SAME FAULT AS THE BLOG, DIFFERENT CONTENT TYPE
The old site lazy-loaded images: `src` held a 1×1 `transparent.png` and the real
file sat in `srcset`. The migration copied the tag verbatim, so these pages
render a stretched transparent pixel — a grey box — while the actual photograph
sits unused in an attribute pointing at a domain that will stop resolving the
day DNS moves.

    54 x  src="…/transparent.png"      (the placeholder)
    24 x  srcset="…mytapestore.com.au" (the real images, still off-site)

WHAT THIS DOES
Takes the largest candidate out of `srcset`, uploads it to Shopify's CDN once,
points `src` at it, and drops the stale `srcset`. Images already on the Shopify
CDN are left alone.

    python3 fix_page_images.py            # audit
    python3 fix_page_images.py --apply
"""
import json
import mimetypes
import pathlib
import re
import sys
import time
import urllib.request
import uuid

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOP = "cvbpp2-up.myshopify.com"
OLDHOST = "mytapestore.com.au"


def token():
    for line in (ROOT.parent / "newsletter" / ".env.local").read_text().splitlines():
        if line.startswith("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE="):
            return line.split("=", 1)[1].strip().strip("\"'")
    sys.exit("admin token not found")


TOK = token()

STAGED = """
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { message } } }"""
FILE_CREATE = """
mutation fileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files { id fileStatus ... on MediaImage { image { url } } }
    userErrors { message } } }"""
FILE_Q = """
query files($ids: [ID!]!) { nodes(ids: $ids) { ... on MediaImage { id fileStatus image { url } } } }"""


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


def rest(path, method="GET", body=None):
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/{path}",
        data=json.dumps(body).encode() if body else None, method=method)
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    return json.loads(urllib.request.urlopen(req, timeout=120).read())


def multipart(url, fields, filename, data, ctype):
    boundary = "----mts" + uuid.uuid4().hex
    body = b""
    for k, v in fields:
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n").encode()
    body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
             f"filename=\"{filename}\"\r\nContent-Type: {ctype}\r\n\r\n").encode()
    body += data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    urllib.request.urlopen(req, timeout=180)


def upload(src):
    raw = urllib.request.urlopen(
        urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read()
    name = re.sub(r"[^A-Za-z0-9._-]", "-", src.split("/")[-1].split("?")[0])[:90]
    ctype = mimetypes.guess_type(name)[0] or "image/jpeg"
    t = gql(STAGED, {"input": [{"filename": name, "mimeType": ctype,
                                "resource": "FILE", "httpMethod": "POST"}]})["stagedUploadsCreate"]
    if t["userErrors"]:
        raise RuntimeError(t["userErrors"])
    tgt = t["stagedTargets"][0]
    multipart(tgt["url"], [(p["name"], p["value"]) for p in tgt["parameters"]], name, raw, ctype)
    res = gql(FILE_CREATE, {"files": [{"originalSource": tgt["resourceUrl"],
                                       "contentType": "IMAGE", "alt": name}]})["fileCreate"]
    if res["userErrors"]:
        raise RuntimeError(res["userErrors"])
    fid = res["files"][0]["id"]
    for _ in range(40):
        node = gql(FILE_Q, {"ids": [fid]})["nodes"][0]
        if node and node.get("fileStatus") == "READY" and node.get("image"):
            return node["image"]["url"]
        time.sleep(1.5)
    raise RuntimeError("file never became READY")


def best_from_srcset(srcset):
    """Largest old-domain candidate in a srcset."""
    best, best_w = None, -1
    for part in srcset.split(","):
        bits = part.strip().split()
        if not bits or OLDHOST not in bits[0]:
            continue
        w = 0
        if len(bits) > 1 and bits[1].endswith("w"):
            try:
                w = int(bits[1][:-1])
            except ValueError:
                w = 0
        if w >= best_w:
            best, best_w = bits[0], w
    return best


def main():
    apply = "--apply" in sys.argv
    pages = rest("pages.json?limit=250")["pages"]

    wanted, per_page = set(), {}
    for p in pages:
        body = p.get("body_html") or ""
        hits = 0
        for m in re.finditer(r"<img[^>]*>", body):
            tag = m.group(0)
            src = (re.search(r'\ssrc="([^"]*)"', tag) or [None, ""])[1]
            ss = (re.search(r'\ssrcset="([^"]*)"', tag) or [None, ""])[1]
            real = None
            if "transparent.png" in src and ss:
                real = best_from_srcset(ss)
            elif OLDHOST in src:
                real = src
            if real:
                wanted.add(real)
                hits += 1
        if hits:
            per_page[p["handle"]] = hits

    print(f"pages with broken images : {len(per_page)}  {per_page}")
    print(f"unique images to re-host : {len(wanted)}")
    if not apply:
        for u in sorted(wanted)[:6]:
            print("   ", u[:100])
        print("\naudit only — re-run with --apply")
        return

    mapping, failed = {}, []
    for i, u in enumerate(sorted(wanted), 1):
        try:
            mapping[u] = upload(u)
            if i % 8 == 0:
                print(f"   uploaded {i}/{len(wanted)}")
        except Exception as e:                               # noqa: BLE001
            failed.append((u, str(e)[:70]))
    print(f"uploaded {len(mapping)}/{len(wanted)}   failed {len(failed)}")
    for u, e in failed[:5]:
        print(f"   !! {u.split('/')[-1][:44]}: {e}")

    changed = 0
    for p in pages:
        body = p.get("body_html") or ""
        if not body or p["handle"] not in per_page:
            continue

        def fix(m):
            tag = m.group(0)
            src = (re.search(r'\ssrc="([^"]*)"', tag) or [None, ""])[1]
            ss = (re.search(r'\ssrcset="([^"]*)"', tag) or [None, ""])[1]
            real = best_from_srcset(ss) if ("transparent.png" in src and ss) else (
                src if OLDHOST in src else None)
            if not real or real not in mapping:
                return tag
            tag = re.sub(r'\ssrc="[^"]*"', f' src="{mapping[real]}"', tag, count=1)
            # the old srcset points at a domain that will stop resolving; the
            # single CDN source is correct on its own
            tag = re.sub(r'\ssrcset="[^"]*"', "", tag)
            tag = re.sub(r'\ssizes="[^"]*"', "", tag)
            return tag

        new = re.sub(r"<img[^>]*>", fix, body)
        if new != body:
            rest(f"pages/{p['id']}.json", "PUT", {"page": {"id": p["id"], "body_html": new}})
            changed += 1
            time.sleep(0.5)
    print(f"pages rewritten: {changed}")

    after = rest("pages.json?limit=250")["pages"]
    left = sum(len(re.findall(OLDHOST, x.get("body_html") or "")) for x in after)
    ph = sum(len(re.findall(r"transparent\.png", x.get("body_html") or "")) for x in after)
    print(f"old-domain refs left on pages : {left}")
    print(f"transparent.png placeholders  : {ph}")


if __name__ == "__main__":
    main()
