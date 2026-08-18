#!/usr/bin/env python3
"""
Turn the redesign's catalogue into Shopify import files.

Source of truth is mytapestore-redesign/src/data/catalog.js, which was itself
extracted verbatim from the live WooCommerce Store API — 132 products, 674
variants, 39 product categories, 26 industries, prices in AUD incl. GST.

Outputs (into mytapestore-shopify/import/):
  products.csv      Shopify's native product CSV. Import via Admin → Products →
                    Import. Images are referenced by their ORIGINAL live URLs
                    (from scripts/img_manifest.tsv) so Shopify fetches them
                    itself — no upload step.
  collections.csv   Category + industry collections. Shopify has no native
                    collection importer, so this is for Matrixify/Excelify, or
                    as the checklist for creating them by hand.
  menus.md          The exact navigation tree to build under Online Store →
                    Navigation, with real handles.

Usage:
    python3 mytapestore-shopify/scripts/build_catalogue.py
    python3 mytapestore-shopify/scripts/build_catalogue.py --menus   # print menus only

NOTE ON PRICES: these are the live store's prices, GST inclusive. Shopify must
be configured with "All prices include tax" (Settings → Taxes and duties), or
every price on the store will be 10% wrong.
"""
import argparse
import csv
import json
import pathlib
import re
import sys
from html import escape

ROOT = pathlib.Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'mytapestore-redesign' / 'src' / 'data' / 'catalog.js'
MANIFEST = ROOT / 'mytapestore-redesign' / 'scripts' / 'img_manifest.tsv'
OUT = ROOT / 'mytapestore-shopify' / 'import'

# Shopify's product CSV columns, in the order the importer expects.
COLUMNS = [
    'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published',
    'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
    'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
    'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price',
    'Variant Compare At Price', 'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode',
    'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card',
    'SEO Title', 'SEO Description', 'Status',
]


def load_catalog():
    """Pull the exported JSON literals out of the ES module."""
    text = CATALOG.read_text(encoding='utf-8')

    def grab(name):
        # BESTSELLER_HANDLES is pretty-printed across several lines, so the
        # literal has to be matched by bracket balance rather than by a lazy
        # regex that stops at the first newline-terminated close.
        m = re.search(r'export const ' + name + r'\s*=\s*([\[{])', text)
        if not m:
            sys.exit(f'could not find {name} in {CATALOG}')
        start = m.start(1)
        opener = m.group(1)
        closer = ']' if opener == '[' else '}'
        depth, in_str, esc, end = 0, None, False, None
        for i in range(start, len(text)):
            ch = text[i]
            if in_str:
                if esc:
                    esc = False
                elif ch == '\\':
                    esc = True
                elif ch == in_str:
                    in_str = None
                continue
            if ch in '"\'':
                in_str = ch
            elif ch in '[{':
                depth += 1
            elif ch in ']}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end is None:
            sys.exit(f'unbalanced literal for {name} in {CATALOG}')
        raw = text[start:end]
        # JS allows a trailing comma before the closing bracket; JSON does not.
        raw = re.sub(r',(\s*[\]}])', r'\1', raw)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # BESTSELLER_HANDLES is hand-written with single quotes. Only swap
            # when the literal has no double quotes at all, so this can never
            # mangle a real apostrophe inside the generated data.
            if '"' not in raw and "'" in raw:
                return json.loads(raw.replace("'", '"'))
            raise

    return {
        'products': grab('PRODUCTS'),
        'categories': grab('PRODUCT_CATEGORIES'),
        'industries': grab('INDUSTRIES'),
        'nav_groups': grab('NAV_GROUPS'),
        'bestsellers': grab('BESTSELLER_HANDLES'),
    }


def load_image_map():
    """local /img/products/x.jpg  ->  original https://mytapestore.com.au/... URL.

    Shopify fetches product images by URL at import time, so pointing at the
    live originals avoids uploading 447 files by hand. If the live site ever
    goes away, re-host the local copies and regenerate."""
    mapping = {}
    if not MANIFEST.exists():
        print(f'warning: {MANIFEST} missing — products will import without images', file=sys.stderr)
        return mapping
    for line in MANIFEST.read_text(encoding='utf-8').splitlines():
        if '\t' not in line:
            continue
        remote, local = line.split('\t', 1)
        local = local.strip()
        mapping[local] = remote.strip()
        # Some downloads were re-encoded after the manifest was written, so the
        # catalogue points at .jpg where the manifest recorded .png. Key on the
        # stem as well so the extension change doesn't lose the image.
        stem = local.rsplit('.', 1)[0]
        mapping.setdefault(stem, remote.strip())
    return mapping


def lookup_image(images, local_path):
    """Resolve a catalogue image path to its live URL, ignoring the extension."""
    if not local_path:
        return ''
    if local_path in images:
        return images[local_path]
    return images.get(local_path.rsplit('.', 1)[0], '')


def desc_to_html(blocks, img_map=None):
    """Render the catalogue's typed description blocks as the HTML Shopify stores.

    The theme styles bare headings/lists/tables coming out of the admin (see
    mts-shopify-overrides.css), so no custom classes are needed here."""
    out = []
    for b in blocks:
        t = b.get('type')
        if t == 'h':
            out.append(f'<h3>{escape(b["text"])}</h3>')
        elif t == 'p':
            out.append(f'<p>{escape(b["text"])}</p>')
        elif t in ('lines', 'features'):
            items = ''.join(f'<li>{escape(i)}</li>' for i in b.get('items', []))
            out.append(f'<ul>{items}</ul>')
        elif t == 'table':
            rows = ''.join(
                '<tr>' + ''.join(f'<td>{escape(str(c))}</td>' for c in r) + '</tr>'
                for r in b.get('rows', [])
            )
            out.append(f'<table>{rows}</table>')
        elif t == 'img':
            # The catalogue stores a LOCAL React path here (/img/products/x.jpg).
            # Writing it straight into a Shopify description produces a 404 on
            # every product page — that bug shipped once already. `img_map`, when
            # supplied, maps those paths to hosted URLs; without it the block is
            # skipped rather than emitting a link that cannot resolve.
            src = b.get('src', '')
            url = (img_map or {}).get(src)
            if url:
                out.append(f'<img src="{escape(url)}" alt="{escape(b.get("alt", ""))}">')
            elif src:
                print(f'warning: description image not hosted, skipped: {src}',
                      file=sys.stderr)
        elif t == 'faq':
            qas = b.get('qas') or []
            if qas:
                out.append('<h3>Frequently asked questions</h3>')
                for f in qas:
                    out.append(f'<h4>{escape(f["q"])}</h4><p>{escape(f["a"])}</p>')
    return ''.join(out)


def key_specs(blocks):
    """The first short bullet block — the theme shows up to 4 beside the gallery."""
    for b in blocks:
        if b.get('type') in ('features', 'lines') and b.get('items'):
            return b['items'][:4]
    return []


def build_products(cat, images, bestseller_tag='bestseller'):
    rows = []
    dropped_placeholders = []   # WooCommerce $0 phantom variations
    needs_price = []            # products with no real price anywhere
    for p in cat['products']:
        handle = p['handle']
        axes = p.get('axes') or []
        variations = p.get('variations') or []

        if len(axes) > 3:
            print(f'warning: {handle} has {len(axes)} options; Shopify allows 3. '
                  f'Extra options dropped.', file=sys.stderr)
            axes = axes[:3]

        tags = []
        tags += [c['name'] for c in p.get('cats', [])]
        tags += [c['name'] for c in p.get('industries', [])]
        if handle in cat['bestsellers']:
            tags.append(bestseller_tag)

        body = desc_to_html(p.get('desc', []))
        gallery = p.get('gallery') or ([p['img']] if p.get('img') else [])
        remote_gallery = [lookup_image(images, g) for g in gallery]
        remote_gallery = [g for g in remote_gallery if g]

        # Shopify's CSV repeats the handle: the first row carries the product
        # fields, later rows add variants and images.
        if variations:
            variant_rows = []
            for v in variations:
                opts = [v['attrs'].get(a['name'], '') for a in axes]
                price = v.get('price') or 0
                # WooCommerce leaves behind placeholder variations with no
                # attributes and no price. Imported as-is they become a $0.00
                # buyable variant — someone could check out for free. They are
                # not real variants, so drop them.
                if price <= 0 and not any(opts):
                    dropped_placeholders.append(f'{handle} (sku {v.get("sku", "?")})')
                    continue
                variant_rows.append({
                    'sku': v.get('sku', ''),
                    'price': price,
                    'available': v.get('inStock', True),
                    'opts': opts,
                })
            if not variant_rows:
                variant_rows = [{
                    'sku': p.get('sku', ''),
                    'price': p.get('price') or 0,
                    'available': p.get('inStock', True),
                    'opts': [],
                }]
        else:
            variant_rows = [{
                'sku': p.get('sku', ''),
                'price': p.get('price') or 0,
                'available': p.get('inStock', True),
                'opts': [],
            }]

        # A product with no real price anywhere must not go live at $0.00.
        # Import it as a draft so a human sets a price before it can sell.
        priceless = all(v['price'] <= 0 for v in variant_rows)
        if priceless:
            needs_price.append(handle)

        for i, v in enumerate(variant_rows):
            row = {c: '' for c in COLUMNS}
            row['Handle'] = handle
            if i == 0:
                row['Title'] = p['name']
                row['Body (HTML)'] = body
                row['Vendor'] = p.get('brand') or 'My Tape Store'
                row['Tags'] = ', '.join(dict.fromkeys(tags))
                # Priceless products import as unpublished drafts — see above.
                row['Published'] = 'FALSE' if priceless else 'TRUE'
                row['Status'] = 'draft' if priceless else 'active'
                row['Gift Card'] = 'FALSE'
                row['SEO Title'] = p['name'][:70]
                first_p = next((b['text'] for b in p.get('desc', [])
                                if b.get('type') == 'p' and len(b.get('text', '')) > 40), '')
                row['SEO Description'] = (first_p or p['name'])[:320]
                if p.get('cats'):
                    row['Type'] = p['cats'][0]['name']

            for ax_i, ax in enumerate(axes, start=1):
                row[f'Option{ax_i} Name'] = ax['name']
                row[f'Option{ax_i} Value'] = v['opts'][ax_i - 1] if len(v['opts']) >= ax_i else ''

            row['Variant SKU'] = v['sku']
            row['Variant Grams'] = 0
            row['Variant Inventory Tracker'] = 'shopify'
            # Fresh store: seed stocked lines with real stock so they are
            # buyable, and out-of-stock lines with zero. Adjust after import.
            row['Variant Inventory Qty'] = 100 if v['available'] else 0
            row['Variant Inventory Policy'] = 'deny'
            row['Variant Fulfillment Service'] = 'manual'
            row['Variant Price'] = f"{float(v['price']):.2f}"
            row['Variant Requires Shipping'] = 'TRUE'
            row['Variant Taxable'] = 'TRUE'

            if i < len(remote_gallery):
                row['Image Src'] = remote_gallery[i]
                row['Image Position'] = i + 1
                row['Image Alt Text'] = p['name'][:120]

            rows.append(row)

        # Any gallery images beyond the variant count get their own image-only rows.
        for j in range(len(variant_rows), len(remote_gallery)):
            row = {c: '' for c in COLUMNS}
            row['Handle'] = handle
            row['Image Src'] = remote_gallery[j]
            row['Image Position'] = j + 1
            row['Image Alt Text'] = p['name'][:120]
            rows.append(row)

    return rows, dropped_placeholders, needs_price


def build_collections(cat, images):
    """Category and industry collections, as automatic (smart) collections keyed
    on the tags written above. That way a product joins its collections purely
    from its own tags and nothing has to be assigned by hand."""
    rows = []
    for c in cat['categories']:
        rows.append({
            'Handle': c['slug'],
            'Title': c['name'],
            'Body (HTML)': f"<p>{escape(c.get('desc', '') or '')}</p>" if c.get('desc') else '',
            'Collection Type': 'Smart',
            'Rule: Product Column': 'Tag',
            'Rule: Relation': 'Equals',
            'Rule: Condition': c['name'],
            'Must Match': 'all',
            'Image Src': images.get(c.get('img', ''), ''),
            'Published': 'TRUE',
            'Kind': 'category',
        })
    for c in cat['industries']:
        rows.append({
            'Handle': c['slug'],
            'Title': c['name'],
            'Body (HTML)': f"<p>{escape(c.get('desc', '') or '')}</p>" if c.get('desc') else '',
            'Collection Type': 'Smart',
            'Rule: Product Column': 'Tag',
            'Rule: Relation': 'Equals',
            'Rule: Condition': c['name'],
            'Must Match': 'all',
            'Image Src': images.get(c.get('img', ''), ''),
            'Published': 'TRUE',
            'Kind': 'industry',
        })
    rows.append({
        'Handle': 'bestsellers',
        'Title': 'Bestsellers',
        'Body (HTML)': '',
        'Collection Type': 'Smart',
        'Rule: Product Column': 'Tag',
        'Rule: Relation': 'Equals',
        'Rule: Condition': 'bestseller',
        'Must Match': 'all',
        'Image Src': '',
        'Published': 'TRUE',
        'Kind': 'utility',
    })
    return rows


def render_menus(cat):
    by_slug = {c['slug']: c for c in cat['categories']}
    lines = [
        '# Navigation to build in Shopify Admin',
        '',
        'Menus cannot be created from theme files or the Theme Access API — build',
        'these under **Online Store → Navigation**. The header section reads them,',
        'and the mega-menu column count follows the number of children (see',
        '`sections-header-note.md`).',
        '',
        '## `main-menu`',
        '',
        '```',
        'Home                       /',
    ]
    for group, slugs in cat['nav_groups'].items():
        first = by_slug.get(slugs[0], {})
        parent = f"/collections/{first.get('slug', '')}" if len(slugs) == 1 else '/collections/all'
        lines.append(f'{group:<26} {parent}')
        for s in slugs:
            c = by_slug.get(s)
            if c:
                lines.append(f'  ├ {c["name"]:<38} /collections/{c["slug"]}')
    lines.append(f'{"Industries":<26} /pages/industries')
    for c in cat['industries']:
        lines.append(f'  ├ {c["name"]:<38} /collections/{c["slug"]}')
    lines.append(f'{"All Products":<26} /collections/all')
    lines += [
        '```',
        '',
        '## `industries` (drives the home-page industry carousel)',
        '',
        '```',
    ]
    for c in cat['industries']:
        lines.append(f'{c["name"]:<40} /collections/{c["slug"]}')
    lines += [
        '```',
        '',
        '## `footer-shop`',
        '',
        '```',
    ]
    for s in cat['nav_groups']['Single-Sided Tapes'][:7]:
        c = by_slug.get(s)
        if c:
            lines.append(f'{c["name"]:<40} /collections/{c["slug"]}')
    lines += [
        '```',
        '',
        '## `footer-information`',
        '',
        '```',
        'About us                                 /pages/about-us',
        'Shop                                     /collections/all',
        'Tape dispensers                          /collections/tapes-dispensers',
        'Industries                               /pages/industries',
        'Bulk & trade                             /pages/bulk-trade',
        'Contact us                               /pages/contact',
        '```',
        '',
        '## `footer` (customer care)',
        '',
        '```',
        'Shipping & delivery                      /pages/shipping-delivery',
        'Return policy                            /pages/return-policy',
        'Privacy policy                           /policies/privacy-policy',
        'Terms & conditions                       /policies/terms-of-service',
        'Customer service                         /pages/contact',
        '```',
    ]
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--menus', action='store_true', help='print the menu tree and exit')
    args = ap.parse_args()

    cat = load_catalog()

    if args.menus:
        print(render_menus(cat))
        return

    images = load_image_map()
    OUT.mkdir(parents=True, exist_ok=True)

    product_rows, dropped, needs_price = build_products(cat, images)
    with (OUT / 'products.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(product_rows)

    collection_rows = build_collections(cat, images)
    with (OUT / 'collections.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(collection_rows[0].keys()))
        w.writeheader()
        w.writerows(collection_rows)

    (OUT / 'menus.md').write_text(render_menus(cat), encoding='utf-8')

    handles_with_image = {r['Handle'] for r in product_rows if r['Image Src']}
    missing_img = [p['handle'] for p in cat['products'] if p['handle'] not in handles_with_image]
    print(f'wrote {OUT}/products.csv     {len(product_rows):>5} rows '
          f'({len(cat["products"])} products, {sum(len(p.get("variations") or [1]) for p in cat["products"])} variants)')
    print(f'wrote {OUT}/collections.csv  {len(collection_rows):>5} rows '
          f'({len(cat["categories"])} categories + {len(cat["industries"])} industries + 1 utility)')
    print(f'wrote {OUT}/menus.md')
    if dropped:
        print(f'  dropped {len(dropped)} $0 placeholder variation(s) — they would have '
              f'been buyable for free:')
        for d in dropped:
            print(f'      {d}')
    if needs_price:
        print(f'  {len(needs_price)} product(s) have no price in the source and are set to '
              f'DRAFT so they cannot sell at $0.00 — set a price before publishing:')
        for h in needs_price:
            print(f'      {h}')
    if missing_img:
        print(f'  {len(missing_img)} product(s) have no resolvable image URL: '
              f'{", ".join(missing_img[:6])}')


if __name__ == '__main__':
    main()
