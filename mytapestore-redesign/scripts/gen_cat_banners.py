#!/usr/bin/env python3
"""Generate a premium wide banner per tape category via the Magnific API.
   Auto-loads ALL product categories from src/data/catalog.js; skips ones already
   generated. Key read from env MAGNIFIC_KEY (never stored here). Sequential."""
import os, re, json, subprocess, time
from PIL import Image

KEY = os.environ['MAGNIFIC_KEY']
BASE = 'https://api.magnific.com/v1/ai/mystic'
PRE = 'Premium wide cinematic banner photograph: '
SUF = (', professional commercial product photography, clean neutral tones with a subtle warm '
       'orange accent, dramatic soft studio lighting, shallow depth of field, ultra sharp, high detail, 8k')

# bespoke prompts for the main genres (better than the generic template)
BESPOKE = {
  'double-sided-tape': 'clear double-sided adhesive tape rolls and white foam mounting tape arranged on a clean light grey studio surface',
  'foam-tape': 'grey and black PE foam adhesive tape rolls stacked on a dark slate surface',
  'foam-tape-double-sided': 'white double-sided PE foam mounting tape rolls on a clean light surface',
  'duct-tape': 'silver and black industrial duct tape rolls on a concrete workshop bench',
  'aluminium-foil-tapes': 'shiny metallic aluminium foil tape rolls reflecting warm light on a dark surface',
  'masking-tape': 'cream and beige masking tape rolls arranged neatly on a light wooden painter surface',
  'packaging-tapes': 'brown and clear packaging tape rolls beside neatly sealed cardboard cartons in warm warehouse light',
  'safety-tape': 'yellow and black hazard warning tape and red barricade tape rolls on a concrete floor',
  'hook-loop-tapes': 'close up of black hook and loop fastening tape rolls on a dark slate surface',
  'pvc-electrical-insulation-tape': 'colourful PVC electrical insulation tape rolls in black red blue green and yellow fanned out on a dark surface',
  'specialty-tape': 'assorted premium specialty adhesive tape rolls in varied finishes on a modern dark surface',
  'cloth-double-sided-tape': 'black cloth double-sided carpet tape rolls on a dark textured surface',
  'butyl-tape': 'rolls of black butyl sealing tape on a dark industrial surface',
  'glazing-tapes': 'grey structural glazing foam tape rolls beside a glass panel, clean modern light',
  'reflective-tape': 'high-visibility reflective safety tape rolls catching light on a dark surface',
  'magnetic-tapes': 'rolls of flexible magnetic tape on a clean neutral surface',
  'strapping-tapes': 'green and clear filament strapping tape rolls beside a stacked pallet',
  'filament-tapes': 'clear cross-weave filament reinforced tape rolls on a light surface',
  'thermal-insulation-tape': 'silver foil-faced thermal insulation tape rolls on a dark surface',
  'fabric-tape': 'coloured cloth fabric gaffer tape rolls arranged on a dark studio surface',
  'paper-kraft-tape': 'brown kraft paper tape rolls stacked on a warm neutral surface',
  'eco-friendly-tapes': 'brown recyclable paper eco-friendly packaging tape rolls on natural kraft background',
  'glue-dots': 'sheets and rolls of clear adhesive glue dots on a clean bright surface',
  'hang-tab': 'clear self-adhesive hang tabs and hooks on a bright retail surface',
  'bumpers-tapes': 'clear self-adhesive rubber bumper dots and pads on a clean surface',
  'felt-tapes-dots': 'brown felt protective pads and felt tape strips on a wooden surface',
  'flashing-tape': 'rolls of self-adhesive bitumen flashing tape on a construction surface',
  'protection-tape': 'rolls of blue surface protection film tape on a clean industrial surface',
  'barricade-hazard-tapes': 'red and white and yellow black barricade hazard tape rolls, bold safety mood',
  'high-bond-acrylic-tape-vhp': 'clear ultra high bond acrylic VHB foam tape rolls on a sleek dark surface',
  'double-sided-tissue-tape': 'thin double-sided tissue tape rolls on a clean white surface',
  'polyester-tape': 'clear polyester double-sided tape rolls on a light modern surface',
  'atg-tapes': 'ATG adhesive transfer tape rolls and applicator on a clean surface',
  'tapes-dispensers': 'professional packing tape dispensers and gun applicators on a warehouse bench',
  'acribond-accessories': 'assorted tape accessories and applicators on a clean workshop surface',
}

def load_cats():
    txt = open('src/data/catalog.js', encoding='utf-8').read()
    m = re.search(r'export const PRODUCT_CATEGORIES = (\[.*?\])\n\nexport const', txt, re.S)
    cats = json.loads(m.group(1))
    return [(c['slug'], c['name']) for c in cats]

def post(prompt):
    body = json.dumps({'prompt': prompt, 'aspect_ratio': 'widescreen_16_9', 'resolution': '2k', 'model': 'realism', 'engine': 'automatic'})
    r = subprocess.run(['curl', '-sS', '-X', 'POST', BASE, '-H', f'x-magnific-api-key: {KEY}', '-H', 'Content-Type: application/json', '-d', body, '--max-time', '40'], capture_output=True)
    try: return json.loads(r.stdout)['data']['task_id']
    except Exception: print('POST err:', r.stdout[:160]); return None

def poll(tid):
    for _ in range(50):
        r = subprocess.run(['curl', '-sS', '-H', f'x-magnific-api-key: {KEY}', f'{BASE}/{tid}', '--max-time', '30'], capture_output=True)
        try: d = json.loads(r.stdout)['data']
        except Exception: time.sleep(6); continue
        st = d['status']
        if st == 'COMPLETED': return d['generated'][0]
        if 'fail' in st.lower() or 'error' in st.lower(): return None
        time.sleep(8)
    return None

os.makedirs('public/img/site/cat', exist_ok=True)
cats = load_cats()
done, made = [], 0
for slug, name in cats:
    out_jpg = f'public/img/site/cat/{slug}.jpg'
    if os.path.exists(out_jpg): done.append(slug); continue
    subj = BESPOKE.get(slug, f'rolls of {name.lower()} adhesive tape arranged on a premium dark studio surface')
    tid = post(PRE + subj + SUF)
    if not tid: print('FAIL(post)', slug); continue
    print(slug, 'task', tid, flush=True)
    url = poll(tid)
    if not url: print('FAIL(poll)', slug, flush=True); continue
    png = f'public/img/site/cat/{slug}.png'
    subprocess.run(['curl', '-sSL', url, '-o', png])
    im = Image.open(png).convert('RGB'); w, h = im.size; tw = 1600
    im = im.resize((tw, round(h * tw / w)), Image.LANCZOS)
    im.save(out_jpg, quality=85, optimize=True, progressive=True); os.remove(png)
    print('done', slug, flush=True); made += 1; done.append(slug)
print(f'FINISHED: {made} new, {len(done)} total have banners')
