#!/usr/bin/env python3
"""
Fill every collection with the SAME content the React redesign showed.

The initial import gave each collection only its one-line blurb. The React
CollectionPage rendered far more: the category's intro paragraphs plus the whole
CATEGORY_SEO block list (headings, benefit lists, titled items and an FAQ
accordion). This backfills all of that, plus the banner image, so a category page
on Shopify reads exactly like the designed one.

    python3 enrich_content.py collections     # category + industry copy & images
    python3 enrich_content.py check           # report what is still empty

Idempotent: it overwrites description/image with the canonical source every time,
so re-running can only converge.
"""
import json
import os
import pathlib
import re
import sys
from html import escape

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import importlib.util

_here = pathlib.Path(__file__).parent
_bc = importlib.util.spec_from_file_location('bc', _here / 'build_catalogue.py')
bc = importlib.util.module_from_spec(_bc); _bc.loader.exec_module(bc)
_ss = importlib.util.spec_from_file_location('ss', _here / 'setup_store.py')

ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOP = os.environ.get('MTS_SHOP', 'cvbpp2-up.myshopify.com')
SEO_JS = ROOT / 'mytapestore-redesign' / 'src' / 'data' / 'categorySeo.js'


def load_seo():
    t = SEO_JS.read_text(encoding='utf-8')
    m = re.search(r'export const CATEGORY_SEO = (\{.*\})', t, re.S)
    return json.loads(m.group(1))


def blocks_to_html(blocks):
    """Render CATEGORY_SEO blocks as the HTML the theme styles.

    Mirrors the CatBlock component in CollectionPage.jsx: heading / p / list /
    items / faq, in the order they appeared. The theme's overrides stylesheet
    styles bare headings, lists and paragraphs inside .catseo__intro, so no
    custom classes are needed."""
    out = []
    for b in blocks:
        t = b.get('type')
        if t == 'heading':
            out.append(f'<h3>{escape(b["text"])}</h3>')
        elif t == 'p':
            out.append(f'<p>{escape(b["text"])}</p>')
        elif t == 'list':
            items = ''.join(f'<li>{escape(i)}</li>' for i in b.get('items', []))
            out.append(f'<ul>{items}</ul>')
        elif t == 'items':
            lis = []
            for it in b.get('items', []):
                title = f'<strong>{escape(it["title"])}</strong> ' if it.get('title') else ''
                lis.append(f'<li>{title}{escape(it.get("text", ""))}</li>')
            out.append('<ul>' + ''.join(lis) + '</ul>')
        elif t == 'faq' and b.get('qas'):
            out.append('<h3>Frequently asked questions</h3>')
            for f in b['qas']:
                out.append(f'<h4>{escape(f["q"])}</h4><p>{escape(f["a"])}</p>')
    return ''.join(out)


def intro_html(desc):
    """The category's own intro paragraphs.

    CollectionPage.jsx drops the first line when it is a short title-like stub
    (<62 chars) and more lines follow — otherwise the page repeated its own
    heading. Same rule here."""
    lines = [s.strip() for s in re.split(r'\r?\n', desc or '') if s.strip()]
    if len(lines) > 1 and len(lines[0]) < 62:
        lines = lines[1:]
    return ''.join(f'<p>{escape(l)}</p>' for l in lines)


def main():
    stage = sys.argv[1] if len(sys.argv) > 1 else 'collections'
    ss = importlib.util.module_from_spec(_ss); _ss.loader.exec_module(ss)

    cat = bc.load_catalog()
    images = bc.load_image_map()
    seo = load_seo()

    remote = {}
    for c in ss.call('GET', 'smart_collections.json?limit=250')['smart_collections']:
        remote[c['handle']] = c

    if stage == 'check':
        noimg = [h for h, c in remote.items() if not c.get('image')]
        thin = [h for h, c in remote.items() if len(c.get('body_html') or '') < 400]
        print(f'collections           : {len(remote)}')
        print(f'  missing image       : {len(noimg)}  {noimg[:8]}')
        print(f'  thin copy (<400ch)  : {len(thin)}  {thin[:8]}')
        return

    updated = img_fixed = 0
    source = [('category', c) for c in cat['categories']] + \
             [('industry', c) for c in cat['industries']]

    for kind, c in source:
        handle = c['slug']
        rc = remote.get(handle)
        if not rc:
            continue

        html = intro_html(c.get('desc', ''))
        if kind == 'category' and handle in seo:
            html += blocks_to_html(seo[handle].get('blocks', []))

        payload = {'id': rc['id']}
        if html and html != (rc.get('body_html') or ''):
            payload['body_html'] = html

        # lookup_image tolerates the .png/.jpg mismatch in the manifest that left
        # 15 collections without artwork on the first pass.
        if not rc.get('image'):
            url = bc.lookup_image(images, c.get('img', ''))
            if url:
                payload['image'] = {'src': url}
                img_fixed += 1

        if len(payload) == 1:
            continue
        try:
            ss.call('PUT', f'smart_collections/{rc["id"]}.json', {'smart_collection': payload})
            updated += 1
            bits = []
            if 'body_html' in payload:
                bits.append(f'copy {len(payload["body_html"])}ch')
            if 'image' in payload:
                bits.append('image')
            print(f'  ~ {handle:<38} {", ".join(bits)}')
        except RuntimeError as e:
            print(f'  ! {handle}: {e}', file=sys.stderr)

    print(f'\nupdated {updated} collections ({img_fixed} images backfilled)')


if __name__ == '__main__':
    main()
