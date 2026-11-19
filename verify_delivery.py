"""Comprueba integridad, datos y reproducción del HTML. No sustituye QA visual."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'MANIFEST.json').read_text())
for name,expected in m['sha256'].items():
 assert hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,name
p=root/'marketing_customer_project/dashboard'
d=json.loads((p/'data-v2.json').read_text())
assert [len(s['rows']) for s in d['snapshots']]==[2300,2317,2311]
maps=[{r['household_id']:r for r in s['rows']} for s in d['snapshots']]
common=set.intersection(*(set(m) for m in maps)); assert len(common)==2207
assert sum(len({m[i]['segment'] for m in maps})>1 for i in common)==364
for s,mm in zip(d['snapshots'],maps):
 assert len(mm)==len(s['rows'])
 assert s['weekly_columns']==['household_id','week','sales','baskets','lines','coupons']
 by={}
 for id,w,sales,baskets,lines,coupons in s['weekly']:
  assert 0<=w<=12 and id in mm
  v=by.setdefault(id,[0.,0,0,0]);v[0]+=sales;v[1]+=baskets;v[2]+=lines;v[3]+=coupons
 for id,r in mm.items():
  v=by[id];assert abs(v[0]-r['sales'])<1e-5
  assert v[1]==r['baskets'] and v[2]==r['purchase_lines']
  assert abs(v[3]/v[2]-r['coupon_line_rate'])<1e-8
assert maps[1]['19']['baskets']==96 and abs(maps[1]['19']['sales']-2250.38)<1e-8
assert (p/'index.html').read_text()==(p/'template-v2.html').read_text().replace('__DATA__',(p/'data-v2.json').read_text())
print('PASS: hashes, universos, transiciones, datos semanales por hogar y HTML reproducible.')
