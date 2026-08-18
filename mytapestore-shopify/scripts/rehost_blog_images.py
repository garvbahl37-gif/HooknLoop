#!/usr/bin/env python3
"""Move blog body images off mytapestore.com.au and onto Shopify's CDN.

The migration kept body images as absolute old-domain URLs. That works only
while the old site is up — the day the domain is pointed at Shopify, every one
of those images 404s inside otherwise-fine articles.

(Featured images are already safe: Shopify downloads `image.src` at article
creation, so those live on its CDN already. This is only the <img> tags inside
the body HTML.)

Each unique source is uploaded once via staged upload -> fileCreate, then every
reference to it is rewritten across all articles.

    python3 rehost_blog_images.py            # audit
    python3 rehost_blog_images.py --apply
"""
import json
import mimetypes
import pathlib
import re
import sys
import time
import urllib.error
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
    out = json.loads(urllib.request.urlopen(req, timeout=120).read())
    if "errors" in out:
        raise RuntimeError(out["errors"])
    return out["data"]


def rest(path, method="GET", body=None):
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/{path}",
        data=json.dumps(body).encode() if body else None, method=method)
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=120)
    return json.loads(resp.read())


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


def main():
    apply = "--apply" in sys.argv
    blog_id = rest("blogs.json")["blogs"][0]["id"]
    arts = rest(f"blogs/{blog_id}/articles.json?limit=250")["articles"]

    pat = re.compile(r'src="(https?://(?:www\.)?' + re.escape(OLDHOST) + r'/[^"]+)"', re.I)
    per_article, allsrc = {}, set()
    for a in arts:
        found = pat.findall(a.get("body_html") or "")
        if found:
            per_article[a["id"]] = a
            allsrc |= set(found)

    print(f"articles              : {len(arts)}")
    print(f"articles with old imgs: {len(per_article)}")
    print(f"unique images to move : {len(allsrc)}")
    if not apply:
        for s in sorted(allsrc)[:8]:
            print("   ", s[:100])
        print("\naudit only — re-run with --apply")
        return

    mapping, failed = {}, []
    for i, src in enumerate(sorted(allsrc), 1):
        try:
            mapping[src] = upload(src)
            if i % 10 == 0:
                print(f"   uploaded {i}/{len(allsrc)}")
        except Exception as e:                               # noqa: BLE001
            failed.append((src, str(e)[:70]))
    print(f"uploaded {len(mapping)}/{len(allsrc)}   failed {len(failed)}")
    for s, e in failed[:5]:
        print(f"   !! {s.split('/')[-1][:50]}: {e}")

    changed = 0
    for a in per_article.values():
        html = a["body_html"]
        new = html
        for old, cdn in mapping.items():
            new = new.replace(old, cdn)
        if new != html:
            rest(f"blogs/{blog_id}/articles/{a['id']}.json", "PUT",
                 {"article": {"id": a["id"], "body_html": new}})
            changed += 1
            time.sleep(0.55)
    print(f"articles rewritten: {changed}")

    left = sum(len(pat.findall(rest(f"blogs/{blog_id}/articles/{a['id']}.json")["article"]["body_html"] or ""))
               for a in list(per_article.values())[:5])
    print(f"old-domain refs remaining in first 5 articles: {left}")


if __name__ == "__main__":
    main()
