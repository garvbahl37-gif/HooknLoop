#!/usr/bin/env python3
"""Self-host the Barlow family (latin subset) so the site loads no external fonts."""
import os, re, subprocess
HERE=os.path.dirname(os.path.abspath(__file__)); PROJ=os.path.dirname(HERE)
FONTS=os.path.join(PROJ,'public','fonts'); os.makedirs(FONTS,exist_ok=True)
UA=('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/120.0 Safari/537.36')
FAMILIES=[
 ('Inter','Inter',[400,500,600,700]),
 ('Space Grotesk','Space+Grotesk',[400,500,600,700]),
]
def curl(url):
    return subprocess.run(['curl','-sL','-A',UA,'--max-time','40',url],
                          capture_output=True).stdout.decode('utf-8','ignore')
faces=[]
for disp,slug,weights in FAMILIES:
    wl=';'.join(str(w) for w in weights)
    css=curl(f'https://fonts.googleapis.com/css2?family={slug}:wght@{wl}&display=swap')
    # split into @font-face blocks, keep those whose preceding comment is 'latin'
    blocks=re.split(r'(/\*\s*[a-z0-9-]+\s*\*/)',css)
    # blocks: [pre, '/* latin */', body, '/* latin-ext */', body, ...]
    for i in range(1,len(blocks)-1,2):
        label=blocks[i]; body=blocks[i+1]
        if 'latin' not in label or 'latin-ext' in label: continue
        m=re.search(r"font-weight:\s*(\d+)",body)
        u=re.search(r"src:\s*url\((https://[^)]+\.woff2)\)",body)
        if not (m and u): continue
        w=m.group(1); url=u.group(1)
        fn=f'{slug.replace("+","")}-{w}.woff2'
        out=os.path.join(FONTS,fn)
        subprocess.run(['curl','-sL','-A',UA,'--max-time','40',url,'-o',out])
        ok=os.path.exists(out) and os.path.getsize(out)>1000
        faces.append((disp,w,fn,ok))
        print(('ok  ' if ok else 'FAIL'),disp,w,fn,os.path.getsize(out) if ok else 0)
# write fonts.css
lines=['/* Self-hosted Barlow — latin subset. No external font requests. */']
for disp,w,fn,ok in faces:
    if not ok: continue
    lines.append('@font-face{')
    lines.append(f'  font-family:"{disp}";')
    lines.append(f'  font-style:normal; font-weight:{w}; font-display:swap;')
    lines.append(f'  src:url("/fonts/{fn}") format("woff2");')
    lines.append('}')
open(os.path.join(FONTS,'fonts.css'),'w').write('\n'.join(lines)+'\n')
print('\nwrote fonts.css with',sum(1 for f in faces if f[3]),'faces')
