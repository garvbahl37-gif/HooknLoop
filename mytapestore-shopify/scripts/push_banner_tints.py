#!/usr/bin/env python3
"""
Give every collection banner a `custom.banner_tint` — the banner's own average
colour, as a hex string — so the band can paint the right colour with NO network
request at all.

THE BUG THIS KILLS
------------------
`.colban__img` carried `background: var(--ink)`, a solid near-black painted on
the <img> ELEMENT. The <img> is position:absolute; inset:0, so it covered the
low-quality placeholder sitting on the band underneath it. The sequence a
visitor actually saw was:

    black bar  ->  (real image decodes)  ->  banner

The placeholder was doing nothing, because the thing meant to be revealed by it
was painted over. And the placeholder was itself a SECOND request
(`image_url: width: 24`), so even unmasked it could only appear after a round
trip — a black bar for one RTT, every time.

A tint has no round trip. It is 7 bytes of inline CSS in the HTML that already
arrived, so the band is the right colour in the very first paint, and the real
banner resolves into it instead of replacing a black hole.

CONTRAST — the banner title is white and `.colban--img` switches the scrim off,
so during the flash the title sits on the raw tint. White on a colour needs a
relative luminance <= 0.183 to clear WCAG AA 4.5:1
(4.5 = 1.05 / (L + 0.05)). Five of the 47 banners average lighter than that, so
every tint is scaled down until it passes. Nothing ships unmeasured.

    python3 push_banner_tints.py --check
    python3 push_banner_tints.py
"""
import importlib.util
import pathlib
import sys

from PIL import Image

_here = pathlib.Path(__file__).parent
ROOT = _here.parents[1]
SRC = ROOT / 'mytapestore-redesign' / 'public' / 'img' / 'site' / 'cat'

_s = importlib.util.spec_from_file_location('pcb', _here / 'push_collection_banners.py')
pcb = importlib.util.module_from_spec(_s)
_s.loader.exec_module(pcb)
ss = pcb.ss

# White text on the tint must reach 4.5:1 → 1.05 / (L + 0.05) >= 4.5.
MAX_L = 1.05 / 4.5 - 0.05

DEFINITION = """
mutation($d: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $d) {
    createdDefinition { id }
    userErrors { field message code }
  }
}"""

METAFIELDS_SET = """
mutation($m: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $m) {
    metafields { id value }
    userErrors { field message }
  }
}"""

COLLECTIONS = """
query($c: String) {
  collections(first: 250, after: $c) {
    nodes { id handle metafield(namespace: "custom", key: "banner_tint") { value } }
    pageInfo { hasNextPage endCursor }
  }
}"""


def _lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(rgb):
    r, g, b = rgb
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def tint(path):
    """Average colour, darkened only as far as AA for white text requires."""
    im = Image.open(path).convert('RGB').resize((16, 16))
    px = list(im.getdata())
    n = len(px)
    rgb = [sum(p[i] for p in px) // n for i in range(3)]

    # Scale toward black until white text clears 4.5:1. Multiplicative rather
    # than a blend so the HUE survives — a darker version of the same colour,
    # not a greyer one.
    guard = 0
    while luminance(rgb) > MAX_L and guard < 60:
        rgb = [max(0, int(c * 0.95)) for c in rgb]
        guard += 1
    return '#%02x%02x%02x' % tuple(rgb), luminance(rgb)


def collections():
    out, cur = [], None
    while True:
        d = ss.gql(COLLECTIONS, {'c': cur})['collections']
        out += d['nodes']
        if not d['pageInfo']['hasNextPage']:
            return out
        cur = d['pageInfo']['endCursor']


def ensure_definition():
    r = ss.gql(DEFINITION, {'d': {
        'name': 'Banner tint',
        'namespace': 'custom',
        'key': 'banner_tint',
        'description': "Average colour of the banner, painted before the image loads. Generated — don't hand-edit.",
        'type': 'single_line_text_field',
        'ownerType': 'COLLECTION',
    }})['metafieldDefinitionCreate']
    errs = [e for e in r['userErrors'] if e.get('code') != 'TAKEN']
    if errs:
        raise RuntimeError(errs)
    print('metafield definition: ready')


def main():
    check = '--check' in sys.argv

    tints = {}
    for p in sorted(SRC.glob('*-wide.jpg')):
        tints[p.stem[:-len('-wide')]] = tint(p)

    cols = {c['handle']: c for c in collections()}
    jobs = [(cols[s], t, L) for s, (t, L) in sorted(tints.items()) if s in cols]

    print(f'banners        : {len(tints)}')
    print(f'matched        : {len(jobs)}')
    worst = max(L for _, _, L in jobs)
    print(f'worst luminance: {worst:.3f} (cap {MAX_L:.3f}) -> '
          f'white text {1.05 / (worst + 0.05):.2f}:1')

    if check:
        for col, t, L in jobs:
            print(f'   {col["handle"]:<38} {t}  L={L:.3f}')
        return 0

    ensure_definition()
    done = skipped = 0
    for i, (col, t, _L) in enumerate(jobs, 1):
        if col.get('metafield') and col['metafield']['value'] == t:
            skipped += 1
            continue
        r = ss.gql(METAFIELDS_SET, {'m': [{
            'ownerId': col['id'], 'namespace': 'custom',
            'key': 'banner_tint', 'type': 'single_line_text_field', 'value': t,
        }]})['metafieldsSet']
        if r['userErrors']:
            print(f'[{i}] {col["handle"]}: FAILED {r["userErrors"]}')
            continue
        done += 1
    print(f'\nset {done}, already correct {skipped}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
