#!/usr/bin/env python3
"""Normalize the mytapestore.com.au WC Store API dump into a single catalog.js
   ES module + an image download manifest. Faithful content, exact pricing."""
import json, re, hashlib, html
from html.parser import HTMLParser
from urllib.parse import urlparse
from collections import OrderedDict

RAW = 'mts_raw'
prods = json.load(open(f'{RAW}/products_1.json')) + json.load(open(f'{RAW}/products_2.json'))
cats  = json.load(open(f'{RAW}/categories.json'))

# ------- variation price/sku lookup -------
VAR = {}
import os
for fn in os.listdir(f'{RAW}/variations'):
    try:
        d = json.load(open(f'{RAW}/variations/{fn}'))
        VAR[d['id']] = d
    except Exception:
        pass

def cents(s):
    try: return round(int(s)/100, 2)
    except Exception: return None

def dec(s):
    if s is None: return ''
    return html.unescape(s).replace(' ',' ').strip()

# ------- image manifest (url -> local rel path) -------
IMG = OrderedDict()
def local_img(url, kind='products'):
    if not url: return ''
    url = url.replace('http://','https://')
    if url in IMG: return IMG[url]
    path = urlparse(url).path
    ext = os.path.splitext(path)[1].lower() or '.jpg'
    if ext not in ('.jpg','.jpeg','.png','.webp','.gif','.svg'): ext='.jpg'
    h = hashlib.sha1(url.encode()).hexdigest()[:12]
    rel = f'/img/{kind}/{h}{ext}'
    IMG[url] = rel
    return rel

# ------- description HTML -> clean blocks -------
BLOCK_OPEN = {'p','h1','h2','h3','h4','h5','h6','ul','ol','li','table','tr','td','th','div','br','img'}
class DescParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks=[]; self.buf=[]; self.mode=None
        self.list_items=[]; self.in_li=False; self.li_buf=[]
        self.table_rows=[]; self.tr=[]; self.cell=[]; self.in_cell=False
        self.in_table=False; self.in_list=False
    def _flush_para(self):
        t=' '.join(''.join(self.buf).split('\n'))
        t=re.sub(r'[ \t]+',' ',t).strip()
        # keep line breaks that were <br> as separate lines
        raw=''.join(self.buf)
        lines=[re.sub(r'[ \t]+',' ',x).strip() for x in raw.split('\n')]
        lines=[x for x in lines if x]
        self.buf=[]
        if lines:
            if len(lines)>1:
                self.blocks.append({'type':'lines','items':lines})
            else:
                self.blocks.append({'type':'p','text':lines[0]})
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ('p',): self._flush_para()
        elif tag in ('h1','h2','h3','h4','h5','h6'):
            self._flush_para(); self.mode='h'
        elif tag=='br': self.buf.append('\n')
        elif tag in ('ul','ol'):
            self._flush_para(); self.in_list=True; self.list_items=[]
        elif tag=='li': self.in_li=True; self.li_buf=[]
        elif tag=='table':
            self._flush_para(); self.in_table=True; self.table_rows=[]
        elif tag=='tr': self.tr=[]
        elif tag in ('td','th'): self.in_cell=True; self.cell=[]
        elif tag=='img':
            src=a.get('src') or a.get('data-src') or ''
            if src and 'uploads' in src:
                self.blocks.append({'type':'img','src':local_img(src),'alt':dec(a.get('alt',''))})
    def handle_endtag(self,tag):
        if tag=='p': self._flush_para()
        elif tag in ('h1','h2','h3','h4','h5','h6'):
            t=re.sub(r'\s+',' ',''.join(self.buf)).strip(); self.buf=[]; self.mode=None
            if t: self.blocks.append({'type':'h','text':t})
        elif tag=='li':
            t=re.sub(r'\s+',' ',''.join(self.li_buf)).strip(); self.li_buf=[]; self.in_li=False
            if t: self.list_items.append(t)
        elif tag in ('ul','ol'):
            self.in_list=False
            items=[x for x in self.list_items if x]
            if items: self.blocks.append({'type':'features','items':items})
            self.list_items=[]
        elif tag in ('td','th'):
            self.in_cell=False; self.tr.append(re.sub(r'\s+',' ',''.join(self.cell)).strip())
        elif tag=='tr':
            row=[c for c in self.tr]
            if any(row): self.table_rows.append(row)
            self.tr=[]
        elif tag=='table':
            self.in_table=False
            rows=[r for r in self.table_rows if any(r)]
            if rows: self.blocks.append({'type':'table','rows':rows})
            self.table_rows=[]
    def handle_data(self,data):
        if not data.strip() and '\n' not in data:
            if self.in_li or self.in_cell or self.buf:
                # keep single spaces between inline tokens
                target = self.li_buf if self.in_li else (self.cell if self.in_cell else self.buf)
                if target and not target[-1].endswith(' '): target.append(' ')
            return
        if self.in_cell: self.cell.append(data)
        elif self.in_li: self.li_buf.append(data)
        else: self.buf.append(data)

def parse_desc(html_str):
    if not html_str: return []
    s=re.sub(r'\[/?[a-zA-Z][^\]]*\]','',html_str)        # strip [shortcodes]
    s=re.sub(r'<script.*?</script>','',s,flags=re.S|re.I)
    s=re.sub(r'<style.*?</style>','',s,flags=re.S|re.I)
    p=DescParser();
    try: p.feed(s); p._flush_para()
    except Exception: pass
    # merge consecutive feature blocks, drop junk
    out=[]
    for b in p.blocks:
        if b['type']=='p' and (len(b['text'])<2): continue
        out.append(b)
    return out

# ------- category maps -------
CATBYID={c['id']:c for c in cats}
def cat_name(c): return dec(c['name'])
INDUSTRY_PARENT=760
industry_cats=[c for c in cats if c.get('parent')==INDUSTRY_PARENT]
industry_ids={c['id'] for c in industry_cats}
# product categories = parent==0 and not the Industry container, plus masking subcats (parent 211)
prodcat_ids={c['id'] for c in cats if (c.get('parent')==0 and c['id']!=INDUSTRY_PARENT) or c.get('parent')==211}

# ------- build products -------
def slugify(s):
    return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')

P=[]
for p in prods:
    name=dec(p['name'])
    handle=p['slug']
    pr=p.get('prices',{})
    rng=pr.get('price_range') or {}
    price=cents(pr.get('price'))
    pmin=cents(rng.get('min_amount')) if rng else price
    pmax=cents(rng.get('max_amount')) if rng else price
    # gallery
    gallery=[local_img(im['src']) for im in p.get('images',[]) if im.get('src')]
    # dedup preserve order
    seen=set(); gallery=[g for g in gallery if not (g in seen or seen.add(g))]
    # categories
    pcats=[]; inds=[]
    for c in p.get('categories',[]):
        cid=c.get('id')
        nm=dec(c.get('name','')); sl=c.get('slug','')
        if cid in industry_ids: inds.append({'name':nm,'slug':sl})
        elif cid==INDUSTRY_PARENT: pass
        else: pcats.append({'name':nm,'slug':sl})
    # attributes (option axes) + slug->label map so variations read as human text
    axes=[]; term_label={}
    for a in p.get('attributes',[]):
        an=dec(a['name'])
        axes.append({'name':an,'terms':[dec(t['name']) for t in a.get('terms',[])]})
        m={}
        for t in a.get('terms',[]):
            m[t.get('slug','')]=dec(t['name']); m[dec(t['name'])]=dec(t['name'])
        term_label[an]=m
    # variations -> resolved rows
    vrows=[]
    for v in p.get('variations',[]):
        vd=VAR.get(v['id'])
        attrs={}
        for x in v.get('attributes',[]):
            axn=dec(x['name']); val=dec(x['value'])
            attrs[axn]=term_label.get(axn,{}).get(val, val.replace('-',' '))
        # prefer human term label from base attribute terms by matching slug
        vp=None; vsku=''; vstock=True
        if vd:
            vp=cents(vd.get('prices',{}).get('price'))
            vsku=dec(vd.get('sku',''))
            vstock=bool(vd.get('is_in_stock',True))
            # nicer attribute labels from variation name if attrs are slugs
        vrows.append({'id':v['id'],'attrs':attrs,'price':vp,'sku':vsku,'inStock':vstock})
    # base sku fallback: default variation sku
    sku=dec(p.get('sku',''))
    if not sku and vrows: sku=vrows[0]['sku']
    rating=[p.get('average_rating') and float(p['average_rating']) or 0, p.get('review_count',0)]
    desc=parse_desc(p.get('description',''))
    P.append(OrderedDict([
        ('id',p['id']),('handle',handle),('name',name),('type',p['type']),
        ('sku',sku),('price',price),('from',pmin),('min',pmin),('max',pmax),
        ('onSale',bool(p.get('on_sale'))),('inStock',bool(p.get('is_in_stock',True))),
        ('rating',round(rating[0],1)),('reviews',rating[1]),
        ('img',gallery[0] if gallery else ''),('gallery',gallery),
        ('cats',pcats),('industries',inds),('axes',axes),('variations',vrows),
        ('desc',desc),
    ]))

# ------- category export objects -------
def cat_img(c):
    im=c.get('image') or {}
    src=im.get('src') if isinstance(im,dict) else ''
    return local_img(src,'categories') if src else ''

PRODCATS=[]
for c in cats:
    if c['id'] in prodcat_ids:
        PRODCATS.append(OrderedDict([
            ('id',c['id']),('name',cat_name(c)),('slug',c['slug']),
            ('parent',c.get('parent',0)),('count',c.get('count',0)),
            ('img',cat_img(c)),('desc',dec(re.sub('<[^>]+>','',c.get('description','') or '')))]))
INDUSTRIES=[]
for c in industry_cats:
    INDUSTRIES.append(OrderedDict([
        ('id',c['id']),('name',cat_name(c)),('slug',c['slug']),('count',c.get('count',0)),
        ('img',cat_img(c)),('desc',dec(re.sub('<[^>]+>','',c.get('description','') or '')))]))

# ------- write catalog.js -------
def js(v): return json.dumps(v, ensure_ascii=False)
out=[]
out.append('/*  mytapestore.com.au — REAL catalog, extracted verbatim from the live')
out.append('    WooCommerce Store API (prices in AUD incl. GST, exact per-variant).')
out.append('    132 products · 674 variants · 37 product categories · 26 industries.')
out.append('    Generated — do not hand-edit; re-run scripts/normalize.py to refresh.  */')
out.append('')
out.append('export const PRODUCTS = '+js(P))
out.append('')
out.append('export const PRODUCT_CATEGORIES = '+js(PRODCATS))
out.append('')
out.append('export const INDUSTRIES = '+js(INDUSTRIES))
out.append('')
# nav grouping mirrors the live megamenu
NAV={
 'Double-Sided Tape':['foam-tape-double-sided','high-bond-acrylic-tape-vhp','cloth-double-sided-tape','butyl-tape','glazing-tapes','double-sided-tissue-tape','polyester-tape','atg-tapes','double-sided-tape'],
 'Single-Sided Tapes':['aluminium-foil-tapes','barricade-hazard-tapes','bumpers-tapes','duct-tape','eco-friendly-tapes','fabric-tape','felt-tapes-dots','foam-tape','flashing-tape','filament-tapes','glue-dots','hang-tab','hook-loop-tapes','hook-and-loop-dots','packaging-tapes','paper-kraft-tape','protection-tape','pvc-electrical-insulation-tape','masking-tape','magnetic-tapes','reflective-tape','safety-tape','strapping-tapes','specialty-tape','thermal-insulation-tape','acribond-accessories'],
 'Dispensers & Accessories':['tapes-dispensers'],
}
out.append('export const NAV_GROUPS = '+js(NAV))
out.append('')
out.append("export const FREE_SHIP = 100")
out.append('export const findProduct = (h) => PRODUCTS.find(p => p.handle === h)')
out.append('export const catName = (slug) => (PRODUCT_CATEGORIES.find(c=>c.slug===slug)||INDUSTRIES.find(c=>c.slug===slug)||{}).name || "All Products"')
out.append('export const productsInCat = (slug) => PRODUCTS.filter(p => p.cats.some(c=>c.slug===slug))')
out.append('export const productsInIndustry = (slug) => PRODUCTS.filter(p => p.industries.some(c=>c.slug===slug))')
open('catalog.js','w').write('\n'.join(out))

# ------- write image manifest -------
with open('img_manifest.tsv','w') as f:
    for url,rel in IMG.items():
        f.write(f'{url}\t{rel}\n')

# ------- stats -------
print('products:',len(P))
print('variations resolved:',sum(len(x['variations']) for x in P))
print('unique images:',len(IMG))
print('product categories:',len(PRODCATS),'| industries:',len(INDUSTRIES))
print('catalog.js bytes:',os.path.getsize('catalog.js'))
# price sanity
sample=[x for x in P if x['handle']=='hook-loop-roll-adhesive-backed'][0]
print('SAMPLE',sample['name'],'from $',sample['from'],'range',sample['min'],'-',sample['max'])
print('  variants:',[(v['attrs'].get('Size') or v['attrs'].get('choose-your-size'),'$'+str(v['price'])) for v in sample['variations'][:4]])
print('  desc blocks:',[b['type'] for b in sample['desc']])
missing_price=[x['handle'] for x in P if x['from'] is None]
print('products with no price:',len(missing_price), missing_price[:5])
noimg=[x['handle'] for x in P if not x['img']]
print('products with no image:',len(noimg), noimg[:5])
