#!/usr/bin/env python3
"""Download every image in img_manifest.tsv into public/<localrel>. Parallel, resumable."""
import os, subprocess, concurrent.futures as cf
HERE=os.path.dirname(os.path.abspath(__file__))
PROJ=os.path.dirname(HERE)
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"
jobs=[]
for line in open(os.path.join(HERE,'img_manifest.tsv')):
    line=line.rstrip('\n')
    if not line or '\t' not in line: continue
    url,rel=line.split('\t',1)
    out=os.path.join(PROJ,'public'+rel)
    jobs.append((url,out))
os.makedirs(os.path.join(PROJ,'public','img','products'),exist_ok=True)
os.makedirs(os.path.join(PROJ,'public','img','categories'),exist_ok=True)
def dl(job):
    url,out=job
    if os.path.exists(out) and os.path.getsize(out)>100: return (out,'skip')
    os.makedirs(os.path.dirname(out),exist_ok=True)
    r=subprocess.run(['curl','-sL','-A',UA,'--max-time','45',url,'-o',out],
                     capture_output=True)
    if os.path.exists(out) and os.path.getsize(out)>100: return (out,'ok')
    return (url,'FAIL')
ok=skip=fail=0; fails=[]
with cf.ThreadPoolExecutor(max_workers=12) as ex:
    for res,st in ex.map(dl,jobs):
        if st=='ok':ok+=1
        elif st=='skip':skip+=1
        else: fail+=1; fails.append(res)
print(f'downloaded ok={ok} skip={skip} fail={fail} total={len(jobs)}')
if fails:
    open(os.path.join(HERE,'img_failures.txt'),'w').write('\n'.join(fails))
    print('FAILURES:',len(fails),'-> scripts/img_failures.txt')
