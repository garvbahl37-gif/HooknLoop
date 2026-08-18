#!/usr/bin/env python3
"""
Put the redesign's own category banners on the matching Shopify collections.

The collections currently carry whatever image the WooCommerce import gave them.
The Vercel redesign ships its own art-directed set.

WHERE THE BANNER ACTUALLY COMES FROM — this is easy to get wrong. It is NOT the
`img` field on PRODUCT_CATEGORIES; that is the small card thumbnail, and for
about half the categories it is just a product photo that would look wrong
stretched full-bleed. CollectionPage.jsx builds the banner by slug instead:

    const bg = all ? '/img/site/banners/banner-3.jpg'
                   : (slug ? `/img/site/cat/${slug}.jpg` : null)

so dist/img/site/cat/<slug>.jpg is the real source, and the filenames already
are the handles. 39 of them exist. Collections without one keep whatever they
have rather than being blanked.

    python3 push_collection_banners.py --check   # report, change nothing
    python3 push_collection_banners.py           # upload + attach
    python3 push_collection_banners.py --only packaging-tapes

Needs write_files (upload) and write_products (collection image).
"""
import importlib.util
import json
import mimetypes
import pathlib
import sys
import time
import urllib.request
import uuid

_here = pathlib.Path(__file__).parent
ROOT = _here.parents[1]
REDESIGN = ROOT / 'mytapestore-redesign'

_s = importlib.util.spec_from_file_location('ss', _here / 'setup_store.py')
ss = importlib.util.module_from_spec(_s)
_s.loader.exec_module(ss)

STAGED = """
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}"""

FILE_CREATE = """
mutation fileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files { id fileStatus ... on MediaImage { image { url } } }
    userErrors { field message }
  }
}"""

FILE_QUERY = """
query files($ids: [ID!]!) {
  nodes(ids: $ids) { ... on MediaImage { id fileStatus image { url } } }
}"""

COLLECTION_UPDATE = """
mutation collectionUpdate($input: CollectionInput!) {
  collectionUpdate(input: $input) {
    collection { id handle image { url } }
    userErrors { field message }
  }
}"""


def redesign_banners():
    """slug -> local banner path. The filenames are already the handles."""
    d = REDESIGN / 'dist' / 'img' / 'site' / 'cat'
    if not d.is_dir():
        sys.exit(f'banner folder missing: {d}')
    return {p.stem: p for p in sorted(d.iterdir())
            if p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')}


def multipart(url, fields, filename, data, content_type):
    boundary = uuid.uuid4().hex
    body = b''
    for k, v in fields:
        body += (f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n').encode()
    body += (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
             f'filename="{filename}"\r\nContent-Type: {content_type}\r\n\r\n').encode()
    body += data + f'\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    with urllib.request.urlopen(req, timeout=180) as r:
        if r.status not in (200, 201, 204):
            raise RuntimeError(f'upload failed {r.status}')


def stage(path):
    """Upload one file and return its public Shopify CDN url.

    The obvious shortcut — stage as COLLECTION_IMAGE and hand the resourceUrl
    straight to collectionUpdate — is rejected with a bare "Error updating
    collection with this image" for every file. Going through Files instead
    gives back a real, publicly fetchable CDN url that collectionUpdate accepts,
    and it is the same path the product-description images already take.
    """
    ctype = mimetypes.guess_type(path.name)[0] or 'image/jpeg'
    t = ss.gql(STAGED, {'input': [{
        'filename': path.name, 'mimeType': ctype,
        'resource': 'FILE', 'httpMethod': 'POST',
    }]})['stagedUploadsCreate']
    if t['userErrors']:
        raise RuntimeError(t['userErrors'])
    tgt = t['stagedTargets'][0]
    multipart(tgt['url'], [(p['name'], p['value']) for p in tgt['parameters']],
              path.name, path.read_bytes(), ctype)

    res = ss.gql(FILE_CREATE, {'files': [{
        'originalSource': tgt['resourceUrl'], 'contentType': 'IMAGE', 'alt': path.stem,
    }]})['fileCreate']
    if res['userErrors']:
        raise RuntimeError(res['userErrors'])
    fid = res['files'][0]['id']

    # Files are processed asynchronously; the CDN url only exists once READY.
    for _ in range(40):
        node = ss.gql(FILE_QUERY, {'ids': [fid]})['nodes'][0]
        if node and node.get('fileStatus') == 'READY' and node.get('image'):
            return node['image']['url']
        time.sleep(1.5)
    raise RuntimeError('file never became READY')


def existing_file(name):
    """Reuse a banner already sitting in Files rather than uploading it twice."""
    q = ('query($q: String!) { files(first: 10, query: $q, sortKey: CREATED_AT, reverse: true) '
         '{ nodes { ... on MediaImage { fileStatus image { url } } } } }')
    stem = pathlib.Path(name).stem
    try:
        for n in ss.gql(q, {'q': f'filename:{stem}*'})['files']['nodes']:
            if n and n.get('fileStatus') == 'READY' and n.get('image'):
                if n['image']['url'].split('/')[-1].split('?')[0].lower() == name.lower():
                    return n['image']['url']
    except Exception:                                       # noqa: BLE001
        pass
    return None


def collections():
    out, cur = [], None
    q = """query($c: String) {
             collections(first: 250, after: $c) {
               nodes { id handle title image { url } }
               pageInfo { hasNextPage endCursor }
             }
           }"""
    while True:
        d = ss.gql(q, {'c': cur})['collections']
        out += d['nodes']
        if not d['pageInfo']['hasNextPage']:
            return out
        cur = d['pageInfo']['endCursor']


def main():
    check = '--check' in sys.argv
    only = None
    if '--only' in sys.argv:
        only = sys.argv[sys.argv.index('--only') + 1]

    banners = redesign_banners()
    cols = collections()
    by_handle = {c['handle']: c for c in cols}

    jobs = []
    for slug, path in sorted(banners.items()):
        col = by_handle.get(slug)
        if not col:
            continue
        if only and slug != only:
            continue
        jobs.append((col, path))

    print(f'redesign banners      : {len(banners)}')
    print(f'shopify collections   : {len(cols)}')
    print(f'matched (will update) : {len(jobs)}')
    unmatched = sorted(set(banners) - set(by_handle))
    if unmatched:
        print(f'no such collection    : {len(unmatched)} -> {unmatched}')
    untouched = [c["handle"] for c in cols if c["handle"] not in banners]
    print(f'left alone            : {len(untouched)}')

    if check:
        for col, path in jobs[:10]:
            kb = path.stat().st_size // 1024
            print(f'   {col["handle"]:<30} <- {path.name} ({kb} KB)')
        return

    done, skipped = 0, 0
    for i, (col, path) in enumerate(jobs, 1):
        try:
            current = ((col.get('image') or {}).get('url') or '').split('/')[-1].split('?')[0]
            if current.lower() == path.name.lower():
                skipped += 1
                continue

            src = existing_file(path.name) or stage(path)

            # A collection that already has an image ignores a plain src update —
            # collectionUpdate returns success and changes nothing, which is how
            # 28 of these silently kept their WooCommerce import. Clearing first
            # is what actually makes the replacement stick.
            if col.get('image'):
                ss.gql(COLLECTION_UPDATE, {'input': {'id': col['id'], 'image': None}})
                time.sleep(0.4)

            r = ss.gql(COLLECTION_UPDATE, {'input': {
                'id': col['id'],
                'image': {'src': src, 'altText': f'{col["title"]} — My Tape Store'},
            }})['collectionUpdate']
            if r['userErrors']:
                print(f'   !! {col["handle"]}: {r["userErrors"]}')
                continue
            got = ((r['collection'] or {}).get('image') or {}).get('url', '')
            if not got.split('/')[-1].lower().startswith(path.stem.lower()):
                print(f'   !! {col["handle"]}: still serving {got.split("/")[-1][:40]}')
                continue
            done += 1
            print(f'   {i:>2}/{len(jobs)}  {col["handle"]}')
            time.sleep(0.3)           # stay well inside the GraphQL cost budget
        except Exception as e:                              # noqa: BLE001
            print(f'   !! {col["handle"]}: {e}')

    print(f'\nreplaced: {done}   already correct: {skipped}   of {len(jobs)}')


if __name__ == '__main__':
    main()
