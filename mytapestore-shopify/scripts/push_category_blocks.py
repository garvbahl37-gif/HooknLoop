#!/usr/bin/env python3
"""
Push CATEGORY_SEO to collection metafields as STRUCTURED JSON.

Why not just HTML in the description?
The React CollectionPage did not render a blob of rich text — it rendered typed
blocks, each with its own markup and classes: `.catseo__heading` for headings,
`.catseo__list` with a check icon per bullet, `.catseo__items` for titled
entries, and a real `.faq__list` accordion for the FAQ. Flattening all of that
into `body_html` loses the classes, loses the check icons, and turns the FAQ
accordion into a flat run of headings — which is why the Shopify category pages
did not match the original.

Storing the blocks as JSON lets the theme rebuild the exact same markup in
Liquid, so a category page on Shopify is structurally identical to the React one.

    python3 push_category_blocks.py            # write metafields
    python3 push_category_blocks.py --check    # report coverage only

Metafield: custom.seo_blocks (json)
The collection description keeps ONLY the intro paragraphs.
"""
import importlib.util
import json
import pathlib
import re
import sys
from html import escape

_here = pathlib.Path(__file__).parent
ROOT = _here.parents[1]

_b = importlib.util.spec_from_file_location('bc', _here / 'build_catalogue.py')
bc = importlib.util.module_from_spec(_b); _b.loader.exec_module(bc)
_s = importlib.util.spec_from_file_location('ss', _here / 'setup_store.py')
ss = importlib.util.module_from_spec(_s); _s.loader.exec_module(ss)

SEO_JS = ROOT / 'mytapestore-redesign' / 'src' / 'data' / 'categorySeo.js'


def load_seo():
    t = SEO_JS.read_text(encoding='utf-8')
    return json.loads(re.search(r'export const CATEGORY_SEO = (\{.*\})', t, re.S).group(1))


def intro_html(desc):
    """Intro paragraphs only. CollectionPage.jsx drops a short leading stub
    (<62 chars) when more lines follow, so the page doesn't repeat its heading."""
    lines = [s.strip() for s in re.split(r'\r?\n', desc or '') if s.strip()]
    if len(lines) > 1 and len(lines[0]) < 62:
        lines = lines[1:]
    return ''.join(f'<p>{escape(l)}</p>' for l in lines)


def main():
    check_only = '--check' in sys.argv
    cat = bc.load_catalog()
    seo = load_seo()

    remote = {c['handle']: c for c in
              ss.call('GET', 'smart_collections.json?limit=250')['smart_collections']}

    if check_only:
        n = 0
        for c in cat['categories']:
            if c['slug'] in remote and c['slug'] in seo:
                mf = ss.call('GET', f'collections/{remote[c["slug"]]["id"]}/metafields.json')
                has = any(m['namespace'] == 'custom' and m['key'] == 'seo_blocks'
                          for m in mf.get('metafields', []))
                if has:
                    n += 1
        print(f'collections with seo_blocks metafield: {n}')
        return

    written = 0
    for c in cat['categories']:
        handle = c['slug']
        rc = remote.get(handle)
        if not rc or handle not in seo:
            continue
        blocks = seo[handle].get('blocks', [])
        if not blocks:
            continue

        # 1. structured blocks -> metafield
        ss.call('POST', f'collections/{rc["id"]}/metafields.json', {'metafield': {
            'namespace': 'custom',
            'key': 'seo_blocks',
            'type': 'json',
            'value': json.dumps(blocks, ensure_ascii=False),
        }})

        # 2. description keeps only the intro
        intro = intro_html(c.get('desc', ''))
        ss.call('PUT', f'smart_collections/{rc["id"]}.json',
                {'smart_collection': {'id': rc['id'], 'body_html': intro}})

        written += 1
        kinds = {}
        for b in blocks:
            kinds[b['type']] = kinds.get(b['type'], 0) + 1
        print(f'  ~ {handle:<34} {len(blocks):>2} blocks {kinds}')

    print(f'\nwrote seo_blocks for {written} collections')


if __name__ == '__main__':
    main()
