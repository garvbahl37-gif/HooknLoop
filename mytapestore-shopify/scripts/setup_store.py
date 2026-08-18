#!/usr/bin/env python3
"""
Build out the My Tape Store Shopify store from the redesign's catalogue.

    python3 setup_store.py collections
    python3 setup_store.py products [--limit N]
    python3 setup_store.py pages
    python3 setup_store.py menus
    python3 setup_store.py status
    python3 setup_store.py all

STORE IDENTITY — read this before changing anything.
The API only answers to the store's PERMANENT myshopify domain,
`cvbpp2-up.myshopify.com`. `my-tape-store-2.myshopify.com` is merely the
primary-domain alias shown in the admin URL, and every request sent there is
rejected with a 401 that looks exactly like a bad token. That mismatch cost a
lot of time; don't reintroduce it.

Every stage is IDEMPOTENT — it looks up existing records by handle and skips or
updates rather than duplicating, so re-running after a failure is safe.

INVENTORY: variants are created untracked (`inventory_management: null`), so
everything is purchasable. Only 3 of 132 products are out of stock in the source;
they are listed at the end for manual adjustment rather than silently published
as unavailable.
"""
import argparse
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOP = os.environ.get('MTS_SHOP', 'cvbpp2-up.myshopify.com')
API = '2024-10'

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import importlib.util
_spec = importlib.util.spec_from_file_location('bc', pathlib.Path(__file__).parent / 'build_catalogue.py')
bc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bc)


def token():
    t = os.environ.get('SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE')
    if t:
        return t
    env = ROOT / 'newsletter' / '.env.local'
    for line in env.read_text().splitlines():
        if line.startswith('SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE='):
            return line.split('=', 1)[1].strip().strip('"').strip("'")
    sys.exit('no admin token found')


TOKEN = token()
_last_call = [0.0]


def call(method, path, body=None, graphql=False):
    """One REST/GraphQL call, throttled and 429-aware.

    Shopify's REST bucket refills at 2/s on Basic, so a 0.55s floor between
    calls keeps us under it without ever needing to back off in the happy path."""
    gap = time.time() - _last_call[0]
    if gap < 0.55:
        time.sleep(0.55 - gap)

    url = (f'https://{SHOP}/admin/api/{API}/graphql.json' if graphql
           else f'https://{SHOP}/admin/api/{API}/{path}')
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('X-Shopify-Access-Token', TOKEN)
    req.add_header('Content-Type', 'application/json')

    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                _last_call[0] = time.time()
                return json.loads(r.read() or '{}')
        except urllib.error.HTTPError as e:
            payload = e.read().decode('utf-8', 'replace')
            if e.code == 429:
                wait = float(e.headers.get('Retry-After', 2))
                time.sleep(wait)
                continue
            if e.code >= 500:
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f'{method} {path} -> {e.code}: {payload[:400]}')
    raise RuntimeError(f'{method} {path}: gave up after retries')


def gql(query, variables=None):
    r = call('POST', '', {'query': query, 'variables': variables or {}}, graphql=True)
    if r.get('errors'):
        raise RuntimeError(json.dumps(r['errors'])[:500])
    return r['data']


# ---------------------------------------------------------------- collections
def existing_collections():
    """handle -> id, across both smart and custom collections."""
    out = {}
    for kind in ('smart_collections', 'custom_collections'):
        page = f'{kind}.json?limit=250'
        while page:
            r = call('GET', page)
            for c in r.get(kind, []):
                out[c['handle']] = c['id']
            page = None   # 132 products won't exceed one page of collections
    return out


def do_collections(cat, images):
    have = existing_collections()
    made = skipped = 0
    rows = bc.build_collections(cat, images)
    for row in rows:
        handle = row['Handle']
        if handle in have:
            skipped += 1
            continue
        body = {'smart_collection': {
            'title': row['Title'],
            'handle': handle,
            'body_html': row['Body (HTML)'],
            'published': True,
            'rules': [{'column': 'tag', 'relation': 'equals', 'condition': row['Rule: Condition']}],
            'disjunctive': False,
        }}
        if row.get('Image Src'):
            body['smart_collection']['image'] = {'src': row['Image Src']}
        try:
            call('POST', 'smart_collections.json', body)
            made += 1
            print(f'  + {handle}')
        except RuntimeError as e:
            print(f'  ! {handle}: {e}', file=sys.stderr)
    print(f'collections: {made} created, {skipped} already existed')


# ------------------------------------------------------------------- products
def existing_products():
    out, page = {}, 'products.json?limit=250&fields=id,handle'
    while page:
        r = call('GET', page)
        for p in r.get('products', []):
            out[p['handle']] = p['id']
        page = None if len(r.get('products', [])) < 250 else None
    return out


def do_products(cat, images, limit=None):
    # Hosted URLs for images embedded in descriptions, written by
    # fix_desc_images.py. Absent on a first run; those blocks are then skipped
    # rather than emitting local paths that 404.
    map_file = ROOT / 'mytapestore-shopify' / 'import' / 'desc-image-map.json'
    desc_img_map = json.loads(map_file.read_text()) if map_file.exists() else {}
    have = existing_products()
    made = skipped = failed = 0
    oos = []
    dropped_dupes, dropped_incomplete = [], []
    products = cat['products'][:limit] if limit else cat['products']

    for p in products:
        handle = p['handle']
        if handle in have:
            skipped += 1
            continue

        axes = (p.get('axes') or [])[:3]
        variations = p.get('variations') or []

        tags = [c['name'] for c in p.get('cats', [])]
        tags += [c['name'] for c in p.get('industries', [])]
        if handle in cat['bestsellers']:
            tags.append('bestseller')

        variants = []
        if variations:
            # The WooCommerce export contains three kinds of junk that Shopify
            # rejects outright, so each is handled explicitly rather than left
            # to blow up the whole product:
            #   1. $0 placeholder variations with no attributes
            #   2. duplicate option combinations (Shopify: "variant already exists")
            #   3. variations missing option values while the product declares options
            #      (Shopify: "options must have corresponding variants")
            seen_combos = set()
            for v in variations:
                opts = [v['attrs'].get(a['name'], '') for a in axes]
                price = v.get('price') or 0
                if price <= 0 and not any(opts):
                    continue
                if not all(opts):
                    # A partially-specified combo can't address a variant grid.
                    dropped_incomplete.append(f'{handle}: {v.get("sku") or opts}')
                    continue
                combo = tuple(opts)
                if combo in seen_combos:
                    dropped_dupes.append(f'{handle}: {" / ".join(opts)}')
                    continue
                seen_combos.add(combo)
                var = {
                    'price': f'{float(price):.2f}',
                    'sku': v.get('sku', '') or '',
                    'inventory_management': None,   # untracked -> always available
                    'requires_shipping': True,
                    'taxable': True,
                }
                for i, val in enumerate(opts, start=1):
                    var[f'option{i}'] = val
                variants.append(var)
                if not v.get('inStock'):
                    oos.append(f'{handle} / {" / ".join(opts)}')
        if not variants:
            variants = [{
                'price': f'{float(p.get("price") or 0):.2f}',
                'sku': p.get('sku', '') or '',
                'inventory_management': None,
                'requires_shipping': True,
                'taxable': True,
            }]
            if not p.get('inStock'):
                oos.append(handle)

        priceless = all(float(v['price']) <= 0 for v in variants)

        gallery = p.get('gallery') or ([p['img']] if p.get('img') else [])
        srcs, seen = [], set()
        for g in gallery:
            u = bc.lookup_image(images, g)
            if u and u not in seen:
                seen.add(u)
                srcs.append({'src': u})

        body = {'product': {
            'title': p['name'],
            'handle': handle,
            'body_html': bc.desc_to_html(p.get('desc', []), desc_img_map),
            'vendor': p.get('brand') or 'My Tape Store',
            'product_type': p['cats'][0]['name'] if p.get('cats') else '',
            'tags': ', '.join(dict.fromkeys(tags)),
            # A product with no price must not go live at $0.00.
            'status': 'draft' if priceless else 'active',
            'variants': variants,
            'images': srcs[:10],
        }}
        has_opts = bool(variants) and all(
            all(f'option{i}' in v for i in range(1, len(axes) + 1)) for v in variants)
        if axes and has_opts:
            body['product']['options'] = [{'name': a['name']} for a in axes]

        try:
            call('POST', 'products.json', body)
            made += 1
            if made % 10 == 0:
                print(f'  ... {made} created')
        except RuntimeError as e:
            failed += 1
            print(f'  ! {handle}: {e}', file=sys.stderr)

    print(f'products: {made} created, {skipped} already existed, {failed} failed')
    if dropped_dupes:
        print(f'  dropped {len(dropped_dupes)} duplicate option combination(s) '
              f'(Shopify rejects a repeated variant):')
        for d in dropped_dupes:
            print(f'      {d}')
    if dropped_incomplete:
        print(f'  dropped {len(dropped_incomplete)} variation(s) missing option values '
              f'(cannot address a variant grid):')
        for d in dropped_incomplete:
            print(f'      {d}')
    if oos:
        print(f'  NOTE: {len(oos)} variant(s) are out of stock in the source but were '
              f'created purchasable (inventory untracked). Adjust manually:')
        for o in oos:
            print(f'      {o}')


# ---------------------------------------------------------------------- pages
PAGES = [
    ('about-us', 'About us'),
    ('contact', 'Contact us'),
    ('bulk-trade', 'Bulk & trade'),
    ('industries', 'Industries'),
    ('shipping-delivery', 'Shipping & delivery'),
    ('return-policy', 'Return policy'),
]

PAGE_BODY = {
    'about-us': "<p>My Tape Store brings a complete range of industrial and everyday tapes direct to your doorstep — one supplier for double-sided, foam, foil, duct, hook &amp; loop, safety, packaging and specialty tapes, plus the dispensers to apply them.</p><p>We're Australian owned, and we keep a deep range in stock so you can order the exact tape your job needs.</p><p>We stock trusted brands alongside our own value lines, back every stocked product with a lowest-price guarantee, and dispatch quickly to more than 3,600 postcodes across the country.</p>",
    'contact': "",
    'bulk-trade': "<p>Buying by the carton or fitting out a site? Talk to us about volume pricing, and trade accounts unlock further pricing and priority support.</p><h3>How it works</h3><ul><li>Tell us the lines and quantities you need.</li><li>We'll come back with pricing tailored to the order.</li><li>Standing trade accounts available for regular buyers.</li></ul>",
    'industries': "<p>The right adhesive for your trade — quality-checked tapes across every industry we serve. Browse the industry collections to find what suits your sector.</p>",
    'shipping-delivery': "<h3>Shipping locations</h3><p>We deliver to every single part of Australia — no exceptions. Whether you're in a busy city or a remote area, we deliver direct to your door.</p><h3>Shipping options</h3><ul><li>Standard shipping — delivered within 5–7 business days.</li><li>Express shipping — delivered within 3–5 business days.</li></ul><h3>Order processing</h3><p>We process orders quickly during business hours, within 1–2 days. Orders placed before our daily cut-off are processed the same business day.</p><h3>Order tracking</h3><p>Every shipment includes tracking so you can follow your parcel in real time.</p><h3>Shipping fees</h3><p>Fees depend on your chosen shipping option, the weight of your order and the delivery location. All charges are shown before checkout.</p>",
    'return-policy': "<h3>Eligibility for returns</h3><ul><li>Incorrect items sent by My Tape Store can be returned for exchange.</li><li>Items ordered by mistake can be returned, at the customer's expense.</li></ul><h3>Faulty or damaged items</h3><p>We'll replace any defective or damaged product if you file a claim within 2 days of the parcel's signature date. We ask for photographs as proof of damage; once we verify the evidence, we send a free replacement.</p><h3>Return timeframe</h3><p>Items must be returned within 30 days from the date of delivery.</p><h3>Refund processing</h3><p>We guarantee full refunds within 7 days of receiving the returned item.</p><h3>Return authorisation</h3><p>Email info@mytapestore.com.au to start a return — include your order number and the reason.</p>",
}


def do_pages():
    have = {p['handle'] for p in call('GET', 'pages.json?limit=250').get('pages', [])}
    made = skipped = 0
    for handle, title in PAGES:
        if handle in have:
            skipped += 1
            continue
        body = {'page': {'title': title, 'handle': handle,
                         'body_html': PAGE_BODY.get(handle, ''), 'published': True}}
        call('POST', 'pages.json', body)
        made += 1
        print(f'  + /pages/{handle}')
    print(f'pages: {made} created, {skipped} already existed')


# ---------------------------------------------------------------------- menus
MENU_Q = '''
mutation menuCreate($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
  menuCreate(title: $title, handle: $handle, items: $items) {
    menu { id handle }
    userErrors { field message }
  }
}'''


MENU_UPDATE_Q = '''
mutation menuUpdate($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
  menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
    menu { id handle }
    userErrors { field message }
  }
}'''


def menu_items(cat):
    by_slug = {c['slug']: c for c in cat['categories']}

    def item(title, url, children=None):
        d = {'title': title, 'type': 'HTTP', 'url': f'https://{SHOP}{url}'}
        if children:
            d['items'] = children
        return d

    main = [item('Home', '/')]
    for group, slugs in cat['nav_groups'].items():
        kids = [item(by_slug[s]['name'], f'/collections/{s}') for s in slugs if s in by_slug]
        parent_url = f'/collections/{slugs[0]}' if len(slugs) == 1 else '/collections/all'
        main.append(item(group, parent_url, kids))
    main.append(item('Industries', '/pages/industries',
                     [item(c['name'], f'/collections/{c["slug"]}') for c in cat['industries']]))
    main.append(item('All Products', '/collections/all'))

    industries = [item(c['name'], f'/collections/{c["slug"]}') for c in cat['industries']]

    shop_slugs = cat['nav_groups']['Single-Sided Tapes'][:7]
    footer_shop = [item(by_slug[s]['name'], f'/collections/{s}') for s in shop_slugs if s in by_slug]

    footer_info = [
        item('About us', '/pages/about-us'),
        item('Shop', '/collections/all'),
        item('Tape dispensers', '/collections/tapes-dispensers'),
        item('Industries', '/pages/industries'),
        item('Bulk & trade', '/pages/bulk-trade'),
        item('Contact us', '/pages/contact'),
    ]
    footer_care = [
        item('Shipping & delivery', '/pages/shipping-delivery'),
        item('Return policy', '/pages/return-policy'),
        item('Privacy policy', '/policies/privacy-policy'),
        item('Terms & conditions', '/policies/terms-of-service'),
        item('Customer service', '/pages/contact'),
    ]
    return {
        'main-menu': ('Main menu', main),
        'industries': ('Industries', industries),
        'footer-shop': ('Footer — shop tapes', footer_shop),
        'footer-information': ('Footer — information', footer_info),
        'footer': ('Footer — customer care', footer_care),
    }


def do_menus(cat):
    """Create or REPLACE each menu.

    Shopify seeds every new store with a `main-menu` (Home / Catalog / Contact)
    and a `footer`. Skipping those leaves the header mega-nav empty, so existing
    menus are updated in place — same handle, our items."""
    existing = gql('{ menus(first: 50) { nodes { id handle } } }')['menus']['nodes']
    have = {m['handle']: m['id'] for m in existing}
    for handle, (title, items) in menu_items(cat).items():
        if handle in have:
            r = gql(MENU_UPDATE_Q, {'id': have[handle], 'title': title,
                                    'handle': handle, 'items': items})
            errs = r['menuUpdate']['userErrors']
            verb = '~ replaced'
        else:
            r = gql(MENU_Q, {'title': title, 'handle': handle, 'items': items})
            errs = r['menuCreate']['userErrors']
            verb = '+ created '
        if errs:
            print(f'  ! {handle}: {errs}', file=sys.stderr)
        else:
            kids = sum(len(i.get('items', [])) for i in items)
            print(f'  {verb} {handle} ({len(items)} top-level, {kids} nested)')


# --------------------------------------------------------------------- status
def do_status():
    shop = call('GET', 'shop.json')['shop']
    print(f'store      : {shop["name"]} ({shop["myshopify_domain"]})')
    print(f'currency   : {shop["currency"]}   taxes_included: {shop.get("taxes_included")}')
    counts = {
        'products': call('GET', 'products/count.json')['count'],
        'pages': len(call('GET', 'pages.json?limit=250')['pages']),
        'smart collections': call('GET', 'smart_collections/count.json')['count'],
    }
    for k, v in counts.items():
        print(f'{k:<18}: {v}')
    menus = gql('{ menus(first: 50) { nodes { handle title items { title } } } }')['menus']['nodes']
    print(f'{"menus":<18}: {len(menus)}')
    for m in menus:
        print(f'    {m["handle"]:<22} {len(m["items"])} items')
    themes = call('GET', 'themes.json')['themes']
    print('themes:')
    for t in themes:
        print(f'    [{t["role"]:<9}] {t["name"]} (#{t["id"]})')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('stage', choices=['collections', 'products', 'pages', 'menus', 'status', 'all'])
    ap.add_argument('--limit', type=int)
    args = ap.parse_args()

    cat = bc.load_catalog()
    images = bc.load_image_map()

    if args.stage in ('collections', 'all'):
        do_collections(cat, images)
    if args.stage in ('products', 'all'):
        do_products(cat, images, args.limit)
    if args.stage in ('pages', 'all'):
        do_pages()
    if args.stage in ('menus', 'all'):
        do_menus(cat)
    if args.stage == 'status':
        do_status()


if __name__ == '__main__':
    main()
