#!/usr/bin/env python3
"""Fetch real customer reviews from the WC Store API for every product that has
   them, and emit src/data/reviews.js (handle -> [{name,rating,text,date}])."""
import json, re, html, subprocess, os, concurrent.futures as cf
from datetime import datetime
RAW='mts_raw'
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'
prods=json.load(open(f'{RAW}/products_1.json'))+json.load(open(f'{RAW}/products_2.json'))
targets=[(p['id'],p['slug']) for p in prods if p.get('review_count',0)>0]

def strip(h):
    h=re.sub(r'<[^>]+>',' ',h or ''); h=html.unescape(h)
    return re.sub(r'\s+',' ',h).strip()

def fetch(item):
    pid,slug=item
    r=subprocess.run(['curl','-sL','-A',UA,'--max-time','30',
        f'https://mytapestore.com.au/wp-json/wc/store/v1/products/reviews?product_id={pid}&per_page=30'],
        capture_output=True)
    try: data=json.loads(r.stdout.decode('utf-8','ignore'))
    except Exception: return slug,[]
    out=[]
    for rv in data:
        txt=strip(rv.get('review',''))
        if not txt: continue
        dc=rv.get('date_created','')
        try: dc=datetime.fromisoformat(dc.replace('Z','')).strftime('%b %Y')
        except Exception: dc=''
        out.append({'name':strip(rv.get('reviewer','') or 'Verified Buyer') or 'Verified Buyer',
                    'rating':int(rv.get('rating') or 5),'text':txt,'date':dc,
                    'verified':bool(rv.get('verified'))})
    return slug,out

REV={}
with cf.ThreadPoolExecutor(max_workers=10) as ex:
    for slug,revs in ex.map(fetch,targets):
        if revs: REV[slug]=revs

out=['/*  Real customer reviews, pulled verbatim from the live mytapestore.com.au',
     '    WooCommerce Store API. Keyed by product handle.  */','',
     'export const REVIEWS = '+json.dumps(REV,ensure_ascii=False,indent=0),'',
     'export const productReviews = (h) => REVIEWS[h] || []','']
open('/Users/garvbahl/Documents/Projects/HooknLoop:MyTapeStore/mytapestore-redesign/src/data/reviews.js','w').write('\n'.join(out))
print('products with reviews written:',len(REV))
print('total reviews:',sum(len(v) for v in REV.values()))
print('sample:',list(REV.items())[0][0], REV[list(REV.keys())[0]][0]['name'], '-', REV[list(REV.keys())[0]][0]['rating'],'stars')
