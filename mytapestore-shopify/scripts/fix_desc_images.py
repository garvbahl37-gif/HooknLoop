#!/usr/bin/env python3
"""
Host the product-description images on Shopify and repoint every description.

THE BUG THIS FIXES
The catalogue's description blocks include `{type:'img', src:'/img/products/x.jpg'}`
— paths that only resolve inside the React dev server. They were written into
Shopify product descriptions verbatim, so all 125 of them 404'd on the live
product pages.

WHY UPLOAD RATHER THAN LINK THE OLD SITE
Pointing at mytapestore.com.au would "work" until that site moves or goes away,
and it makes every product page depend on a server this store doesn't control.
Uploading to Shopify Files puts them on the same CDN as everything else — faster,
and self-contained.

    python3 fix_desc_images.py            # upload + repoint
    python3 fix_desc_images.py --check    # report only

Needs write_files (upload) and write_products (rewrite descriptions).
"""
import importlib.util
import json
import mimetypes
import pathlib
import re
import sys
import time
import urllib.request
import uuid

_here = pathlib.Path(__file__).parent
ROOT = _here.parents[1]
PUB = ROOT / 'mytapestore-redesign' / 'public'

_b = importlib.util.spec_from_file_location('bc', _here / 'build_catalogue.py')
bc = importlib.util.module_from_spec(_b); _b.loader.exec_module(bc)
_s = importlib.util.spec_from_file_location('ss', _here / 'setup_store.py')
ss = importlib.util.module_from_spec(_s); _s.loader.exec_module(ss)

STAGED = '''
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { message }
  }
}'''

FILE_CREATE = '''
mutation fileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files { id fileStatus alt ... on MediaImage { image { url } } }
    userErrors { message }
  }
}'''

FILE_QUERY = '''
query files($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on MediaImage { id fileStatus image { url } }
  }
}'''


def local_for(rel):
    """Resolve a catalogue image path, tolerating the .png/.jpg mismatch."""
    if not rel:
        return None
    p = PUB / rel.lstrip('/')
    if p.exists():
        return p
    stem = p.with_suffix('')
    for ext in ('.jpg', '.png', '.jpeg', '.webp'):
        q = stem.with_suffix(ext)
        if q.exists():
            return q
    return None


def multipart(url, fields, file_field, filename, data, content_type):
    """Post a file to a staged-upload target. Shopify's GCS/S3 targets require
    the returned parameters to come BEFORE the file part, in order."""
    boundary = '----mts' + uuid.uuid4().hex
    body = b''
    for name, value in fields:
        body += (f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n'
                 f'{value}\r\n').encode()
    body += (f'--{boundary}\r\nContent-Disposition: form-data; name="{file_field}"; '
             f'filename="{filename}"\r\nContent-Type: {content_type}\r\n\r\n').encode()
    body += data + f'\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.status


def upload_batch(paths):
    """local Path -> Shopify CDN url, for a batch of files."""
    inputs = [{
        'filename': p.name,
        'mimeType': mimetypes.guess_type(p.name)[0] or 'image/jpeg',
        'httpMethod': 'POST',
        'resource': 'FILE',
    } for p in paths]

    targets = ss.gql(STAGED, {'input': inputs})['stagedUploadsCreate']
    if targets['userErrors']:
        raise RuntimeError(targets['userErrors'])
    targets = targets['stagedTargets']

    creates = []
    for p, t in zip(paths, targets):
        fields = [(param['name'], param['value']) for param in t['parameters']]
        multipart(t['url'], fields, 'file', p.name, p.read_bytes(),
                  mimetypes.guess_type(p.name)[0] or 'image/jpeg')
        creates.append({'originalSource': t['resourceUrl'],
                        'contentType': 'IMAGE', 'alt': p.stem})

    res = ss.gql(FILE_CREATE, {'files': creates})['fileCreate']
    if res['userErrors']:
        raise RuntimeError(res['userErrors'])

    ids = [f['id'] for f in res['files']]
    # Files are processed asynchronously; the CDN url only appears once READY.
    urls = {}
    for _ in range(30):
        nodes = ss.gql(FILE_QUERY, {'ids': ids})['nodes']
        done = True
        for node in nodes:
            if not node:
                continue
            if node.get('fileStatus') == 'READY' and node.get('image'):
                urls[node['id']] = node['image']['url']
            else:
                done = False
        if done and len(urls) == len(ids):
            break
        time.sleep(2)

    return [urls.get(i) for i in ids]


def main():
    check = '--check' in sys.argv
    cat = bc.load_catalog()

    # every distinct description image, and which products use it
    wanted = {}
    for p in cat['products']:
        for b in p.get('desc', []):
            if b.get('type') == 'img' and b.get('src'):
                wanted.setdefault(b['src'], []).append(p['handle'])

    resolvable = {s: local_for(s) for s in wanted}
    missing = [s for s, f in resolvable.items() if not f]
    print(f'distinct description images : {len(wanted)}')
    print(f'  local file found          : {len(wanted) - len(missing)}')
    print(f'  missing locally           : {len(missing)}')
    if check:
        return

    # upload in small batches (staged uploads cap the number per call)
    mapping = {}
    srcs = [s for s in wanted if resolvable[s]]
    BATCH = 8
    for i in range(0, len(srcs), BATCH):
        chunk = srcs[i:i + BATCH]
        urls = upload_batch([resolvable[s] for s in chunk])
        for s, u in zip(chunk, urls):
            if u:
                mapping[s] = u
        print(f'  uploaded {min(i + BATCH, len(srcs))}/{len(srcs)}')

    print(f'\nuploaded {len(mapping)} image(s) to Shopify Files')
    (ROOT / 'mytapestore-shopify' / 'import' / 'desc-image-map.json').write_text(
        json.dumps(mapping, indent=2))

    # repoint every product description
    remote = {p['handle']: p for p in
              ss.call('GET', 'products.json?limit=250&fields=id,handle,body_html')['products']}
    fixed = 0
    for handle, product in remote.items():
        html = product.get('body_html') or ''
        new = html
        for src, url in mapping.items():
            if src in new:
                new = new.replace(src, url)
        if new != html:
            ss.call('PUT', f'products/{product["id"]}.json',
                    {'product': {'id': product['id'], 'body_html': new}})
            fixed += 1
    print(f'repointed descriptions on {fixed} product(s)')


if __name__ == '__main__':
    main()
