from pathlib import Path
import sys,json
import numpy as np,pandas as pd
from sklearn.cluster import KMeans
from validate_behavior_segments import load_transactions,build_snapshot
base=Path('marketing_customer_project'); report=json.loads((base/'reports/behavior_segments_validation.json').read_text())
tx=load_transactions(Path('marketing_customer_audit/raw/transactions_full.rds'))
products=pd.read_csv('marketing_customer_audit/exports/products.csv',dtype={'product_id':str});products['product_id']=products.product_id.str.replace(r'\.0$','',regex=True);products['department']=products.department.fillna('UNKNOWN')
levels=report['department_vocabulary'][:-1]; snapshots=[]
for cutoff in report['cutoffs']:
 p,x,cols=build_snapshot(tx,products,cutoff,90,levels)
 lab=KMeans(n_clusters=2,random_state=42,n_init=30).fit_predict(x)
 # stable commercial identity by median frequency, not arbitrary cluster ID
 med={int(k):float(p.loc[lab==k,'baskets'].median()) for k in np.unique(lab)};low=min(med,key=med.get)
 p['segment']=np.where(lab==low,0,1);p=p.reset_index()
 snapshots.append({'cutoff':cutoff,'rows':json.loads(p.to_json(orient='records'))})
out={'snapshots':snapshots,'validation':report,'source':'Complete Journey','unit':'hogar comprador','window_days':90}
(base/'dashboard/data.json').write_text(json.dumps(out,separators=(',',':')))
print([(s['cutoff'],len(s['rows'])) for s in snapshots])
