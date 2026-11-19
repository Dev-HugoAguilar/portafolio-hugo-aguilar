from pathlib import Path
import json
import pandas as pd
from validate_behavior_segments import load_transactions
base=Path('marketing_customer_project/dashboard')
d=json.loads((base/'data.json').read_text())
tx=load_transactions(Path('marketing_customer_audit/raw/transactions_full.rds'))
for snap in d['snapshots']:
 end=pd.Timestamp(snap['cutoff']); start=end-pd.Timedelta(days=90)
 h=tx.loc[tx.transaction_timestamp.ge(start)&tx.transaction_timestamp.lt(end)].copy()
 h['week']=((h.transaction_timestamp-start).dt.total_seconds()//(86400*7)).astype(int)
 h['coupon_used']=h.coupon_disc.gt(0).astype(int)
 agg=h.groupby(['household_id','week']).agg(sales=('sales_value','sum'),baskets=('basket_id','nunique'),lines=('basket_id','size'),coupons=('coupon_used','sum')).reset_index()
 snap['weekly']=json.loads(agg.to_json(orient='values'))
 snap['week_start']=str(start.date())
 assert abs(agg.sales.sum()-sum(r['sales'] for r in snap['rows']))<1e-5
 snap['weekly_columns']=list(agg.columns)
(base/'data-v2.json').write_text(json.dumps(d,separators=(',',':')))
print([(s['cutoff'],len(s['weekly'])) for s in d['snapshots']])
