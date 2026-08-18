#!/usr/bin/env python3
"""
Put the redesign's 2000x400 wide banners on the matching Shopify collections —
both the industry collections and the tape-category ones.

WHY THIS IS NOT push_collection_banners.py
------------------------------------------
That script sets `collection.image`, which the theme uses in FIVE places: the
full-bleed banner on the collection page, and four card/thumbnail contexts
(mts-list-collections, mts-category-showcase, mts-industries-index,
mts-industries). One field cannot be both a 5:1 strip and a square card — a
2000x400 banner cropped into a 120px card shows a sliver of its middle.

So the banner gets its own home: the `custom.banner` collection metafield
(file_reference). `mts-collection.liquid` prefers it and falls back to
`collection.image`, so:

  * collection pages get the new wide art
  * every card keeps the correctly-proportioned image it already had
  * a collection with no banner metafield is unchanged, not blanked

SOURCE — `public/img/site/cat/<slug>-wide.jpg`, 2000x400, 47 of them. Note the
sibling `-wide-1000` / `-wide-1440` files are downscales for the React app; only
the 2000px master is uploaded, because Shopify generates its own responsive
sizes from it via `image_url: width:`. Do NOT upload the variants.

NOT the source — `public/img/site/industry/<slug>-1200.jpg`. Despite the name
those are 400-500px SQUARES, the "-1200" and "-800" pairs are byte-identical,
and manufacturing/warehouse-packaging-logistics are the same picture. They are
card art, not banners.

    python3 push_wide_banners.py --check          # report, change nothing
    python3 push_wide_banners.py                  # upload + attach
    python3 push_wide_banners.py --only marine

Idempotent: a banner already in Files is reused rather than uploaded twice, and
a collection already pointing at the right file is skipped.

Needs write_files + write_products.
"""
import importlib.util
import pathlib
import re
import sys

_here = pathlib.Path(__file__).parent
ROOT = _here.parents[1]
REDESIGN = ROOT / 'mytapestore-redesign'
SRC = REDESIGN / 'public' / 'img' / 'site' / 'cat'

# Reuse the upload machinery that already works against this store.
_s = importlib.util.spec_from_file_location('pcb', _here / 'push_collection_banners.py')
pcb = importlib.util.module_from_spec(_s)
_s.loader.exec_module(pcb)
ss = pcb.ss

FILE_BY_NAME = """
query($q: String!) {
  files(first: 20, query: $q, sortKey: CREATED_AT, reverse: true) {
    nodes { ... on MediaImage { id fileStatus image { url width height } } }
  }
}"""

METAFIELDS_SET = """
mutation($m: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $m) {
    metafields { id key value }
    userErrors { field message }
  }
}"""

COLLECTION_BANNERS = """
query($c: String) {
  collections(first: 250, after: $c) {
    nodes {
      id handle
      metafield(namespace: "custom", key: "banner") { value }
    }
    pageInfo { hasNextPage endCursor }
  }
}"""


def sources():
    """slug -> best banner master on disk.

    PREFERENCE ORDER, and why it is not just `*-wide.jpg`:

      1. `<slug>-wide.jpg`  — the art-directed 2000x400 set (47 slugs).
      2. `<slug>.jpg`       — the full-size master for every OTHER slug.

    Shipping only rule 1 silently skipped 19 collections that have perfectly
    good banner art under the bare name and simply never got a `-wide` cut —
    hook-and-loop-dots and hook-loop-tapes (2167x725, the newest art in the
    folder), filament-tapes, double-sided-tape, painters-tape and the rest.
    They are 1.8:1 to 3:1 rather than 5:1, so `object-fit: cover` crops top and
    bottom in the band instead of the sides. That is a normal centre crop, and
    far better than the collection having no banner at all.

    The `-500/-800/-1000/-1200/-1440` downscales are never sources: Shopify
    generates its own responsive sizes from whatever master it is given, so
    uploading a downscale would just cap the quality.
    """
    if not SRC.is_dir():
        sys.exit(f'source folder missing: {SRC}')
    out = {}
    for p in sorted(SRC.glob('*.jpg')):
        stem = p.stem
        if stem.endswith('-wide'):
            out[stem[:-len('-wide')]] = p                    # rule 1, always wins
        elif re.search(r'-(?:500|800|1000|1200|1440)$', stem):
            continue                                         # a downscale, never a master
        elif '-wide-' in stem:
            continue                                         # -wide-1000 / -wide-1440
        else:
            out.setdefault(stem, p)                          # rule 2, only if no -wide
    # A -wide discovered after the bare name must still win.
    for p in sorted(SRC.glob('*-wide.jpg')):
        out[p.stem[:-len('-wide')]] = p
    return out


def collections():
    out, cur = [], None
    while True:
        d = ss.gql(COLLECTION_BANNERS, {'c': cur})['collections']
        out += d['nodes']
        if not d['pageInfo']['hasNextPage']:
            return out
        cur = d['pageInfo']['endCursor']


def local_size(path):
    from PIL import Image
    with Image.open(path) as im:
        return im.size


def find_file(name, want_wh):
    """Existing READY file that is the SAME PICTURE -> (gid, url).

    Matching on filename alone is a trap, and it bit this store. An earlier
    script had already uploaded `hook-and-loop-dots.jpg` etc. from the older
    1600x893 art. When newer art was generated under the SAME filename, a
    name-only match "reused" the stale upload and the new picture never
    reached Shopify — the banner silently stayed old, which is indistinguishable
    from the push not having run.

    Shopify never overwrites a file by name (it suffixes instead), so the only
    safe reuse test is whether the remote picture matches the local one. The
    dimensions are enough: these are re-generated art, not re-compressions, so
    a changed picture always changes the pixel size.
    """
    stem = pathlib.Path(name).stem
    try:
        for n in ss.gql(FILE_BY_NAME, {'q': f'filename:{stem}*'})['files']['nodes']:
            if not n or n.get('fileStatus') != 'READY' or not n.get('image'):
                continue
            im = n['image']
            if im['url'].split('/')[-1].split('?')[0].lower() != name.lower():
                continue
            if (im.get('width'), im.get('height')) != want_wh:
                return None, 'STALE'                        # force a fresh upload
            return n['id'], im['url']
    except Exception:                                       # noqa: BLE001
        pass
    return None, None


def upload(path, filename=None):
    """Upload and return its file GID, waiting for Shopify to finish processing.

    `filename` lets the caller sidestep a stale same-named file already in
    Files: uploading as `<stem>-<w>x<h>.jpg` gives the new picture its own
    unambiguous name instead of relying on Shopify's automatic de-duplication
    suffix, which is not predictable enough to match on later.
    """
    import mimetypes
    import time
    filename = filename or path.name
    ctype = mimetypes.guess_type(filename)[0] or 'image/jpeg'
    t = ss.gql(pcb.STAGED, {'input': [{
        'filename': filename, 'mimeType': ctype,
        'resource': 'FILE', 'httpMethod': 'POST',
    }]})['stagedUploadsCreate']
    if t['userErrors']:
        raise RuntimeError(t['userErrors'])
    tgt = t['stagedTargets'][0]
    pcb.multipart(tgt['url'], [(p['name'], p['value']) for p in tgt['parameters']],
                  filename, path.read_bytes(), ctype)

    res = ss.gql(pcb.FILE_CREATE, {'files': [{
        'originalSource': tgt['resourceUrl'], 'contentType': 'IMAGE',
        'alt': pathlib.Path(filename).stem,
    }]})['fileCreate']
    if res['userErrors']:
        raise RuntimeError(res['userErrors'])
    fid = res['files'][0]['id']

    for _ in range(40):
        node = ss.gql(pcb.FILE_QUERY, {'ids': [fid]})['nodes'][0]
        if node and node.get('fileStatus') == 'READY' and node.get('image'):
            return fid
        time.sleep(1.5)
    raise RuntimeError(f'{path.name} never became READY')


def main():
    check = '--check' in sys.argv
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None

    src = sources()
    cols = collections()
    by_handle = {c['handle']: c for c in cols}

    jobs = [(by_handle[s], p) for s, p in sorted(src.items())
            if s in by_handle and (not only or s == only)]
    unmatched = sorted(set(src) - set(by_handle))

    print(f'wide banners on disk  : {len(src)}')
    print(f'shopify collections   : {len(cols)}')
    print(f'matched (will update) : {len(jobs)}')
    if unmatched:
        print(f'no such collection    : {len(unmatched)} -> {unmatched}')
    print(f'left alone            : {len([c for c in cols if c["handle"] not in src])}')

    if check:
        for col, path in jobs:
            kb = path.stat().st_size // 1024
            state = 'set' if col.get('metafield') else 'empty'
            print(f'   {col["handle"]:<38} <- {path.name:<48} ({kb:>4} KB, banner {state})')
        return

    done = skipped = failed = 0
    for i, (col, path) in enumerate(jobs, 1):
        try:
            wh = local_size(path)
            gid, state = find_file(path.name, wh)
            if gid:
                note = 'reused'
            elif state == 'STALE':
                # Same name, different picture: give the new art its own name.
                fresh = f'{path.stem}-{wh[0]}x{wh[1]}{path.suffix}'
                gid2, _ = find_file(fresh, wh)
                gid = gid2 or upload(path, fresh)
                note = 'reused(v2)' if gid2 else f'UPLOADED NEW {wh[0]}x{wh[1]}'
            else:
                gid, note = upload(path), 'uploaded'

            if col.get('metafield') and col['metafield']['value'] == gid:
                print(f'[{i}/{len(jobs)}] {col["handle"]:<38} already set, skip')
                skipped += 1
                continue

            r = ss.gql(METAFIELDS_SET, {'m': [{
                'ownerId': col['id'], 'namespace': 'custom',
                'key': 'banner', 'type': 'file_reference', 'value': gid,
            }]})['metafieldsSet']
            if r['userErrors']:
                raise RuntimeError(r['userErrors'])
            print(f'[{i}/{len(jobs)}] {col["handle"]:<38} {note} -> banner set')
            done += 1
        except Exception as e:                              # noqa: BLE001
            print(f'[{i}/{len(jobs)}] {col["handle"]:<38} FAILED: {e}')
            failed += 1

    print(f'\nupdated {done}, skipped {skipped}, failed {failed}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main() or 0)
