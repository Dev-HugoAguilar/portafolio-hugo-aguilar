"""Entrenamiento real y evaluación temporal. No usa el futuro en features o selección."""
import json,hashlib,math,sys,platform
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
P=Path(__file__).parent
NAMES={'seasonal':'Estacional 52','holt':'Holt tendencia','ridge':'Ridge directo','forest':'Random Forest directo'}
def feature(y,t):
 past=y[:t];scale=max(1,float(np.mean(past[-8:])));lags=[past[-k]/scale for k in [1,2,4,8,13,26,52]];means=[np.mean(past[-k:])/scale for k in [4,8,13,26]]
 return lags+means+[np.std(past[-8:])/scale,(past[-1]-past[-8])/scale,math.sin(2*math.pi*t/52),math.cos(2*math.pi*t/52)],scale

def classical(y,t):
 hist=y[:t];level=float(hist[0]);trend=0.
 for v in hist[1:]:old=level;level=.25*v+.75*(level+trend);trend=.05*(level-old)+.95*trend
 return {'seasonal':np.array([y[t+h-52] for h in range(12)]),'holt':np.maximum(0,np.array([level+(h+1)*trend for h in range(12)]))}
def predict_all(Y,cut,save_path=None):
 X,T=[],[]
 for y in Y:
  for t in range(52,cut-11):
   x,s=feature(y,t);X.append(x);T.append(y[t:t+12]/s)
 X=np.array(X);T=np.array(T)
 models={'ridge':make_pipeline(StandardScaler(),Ridge(alpha=20)), 'forest':RandomForestRegressor(n_estimators=100,max_depth=9,min_samples_leaf=5,random_state=37,n_jobs=2)}
 out={k:[] for k in NAMES};F=[];scales=[]
 for y in Y:
  f,sc=feature(y,cut);F.append(f);scales.append(sc)
  for k,v in classical(y,cut).items():out[k].append(v)
 for key,model in models.items():
  model.fit(X,T);out[key]=np.maximum(0,model.predict(F)*np.array(scales)[:,None])
  if save_path:
   save_path.mkdir(parents=True,exist_ok=True);joblib.dump(model,save_path/(key+'.joblib'),compress=3)
 return {k:np.array(v) for k,v in out.items()},np.array(scales)
def run(Y,label):
 n=Y.shape[1];cal=[n-40,n-36,n-32];test=[n-20,n-16,n-12];records={'cal':[],'test':[]}
 for split,cuts in [('cal',cal),('test',test)]:
  for cut in cuts:
   pred,scale=predict_all(Y,cut);actual=Y[:,cut:cut+12]
   records[split].append((cut,pred,actual,scale));print(label,split,cut,flush=True)
 def wape(rows,key):return float(sum(np.abs(pred[key]-a).sum() for _,pred,a,_ in rows)/sum(a.sum() for _,_,a,_ in rows)*100)
 winner=min(NAMES,key=lambda k:wape(records['cal'],k));pred,scale=predict_all(Y,n,P/"models"/("walmart" if label.startswith("Ventas") else "synthetic"))
 metrics=[]
 for key,name in NAMES.items():
  for h in [1,4,8,12]:
   errors=np.concatenate([(p[key][:,h-1]-a[:,h-1]) for _,p,a,_ in records['test']]);actual=np.concatenate([a[:,h-1] for _,_,a,_ in records['test']]);metrics.append({'model':key,'name':name,'h':h,'wape':round(float(np.abs(errors).sum()/actual.sum()*100),2),'bias':round(float(errors.sum()/actual.sum()*100),2)})
 quant=[];coverage=[]
 for h in range(12):
  residual=np.concatenate([(a[:,h]-p[winner][:,h])/sc for _,p,a,sc in records['cal']]);lo,hi=np.quantile(residual,[.1,.9]);quant.append([float(lo),float(hi)])
  hits=[]
  for _,ps,a,sc in records['test']:hits.extend((a[:,h]>=ps[winner][:,h]+lo*sc)&(a[:,h]<=ps[winner][:,h]+hi*sc))
  coverage.append(round(float(np.mean(hits)*100),1))
 per=[]
 for i,y in enumerate(Y):
  errors={key:np.concatenate([(ps[key][i]-a[i]) for _,ps,a,_ in records['test']]) for key in NAMES};actual=np.concatenate([a[i] for _,_,a,_ in records['test']]);models={key:np.round(v[i],2).tolist() for key,v in pred.items()};intervals={key:[{'lo':round(max(0,float(pred[key][i,h]+quant[h][0]*scale[i])),2),'hi':round(max(0,float(pred[key][i,h]+quant[h][1]*scale[i])),2)} for h in range(12)] for key in [winner]}
  per.append({'models':models,'interval':intervals[winner],'mae':round(float(np.mean(np.abs(errors[winner]))),2),'wape':round(float(np.sum(np.abs(errors[winner]))/actual.sum()*100),2),'baseline':round(float(np.sum(np.abs(errors['seasonal']))/actual.sum()*100),2),'calibration_errors':np.round(np.concatenate([(a[i]-ps[winner][i])/np.maximum(ps[winner][i],1) for _,ps,a,_ in records['cal']]),4).tolist(),'errors':np.round(errors[winner]/np.maximum(actual,1)*100,2).tolist()})
 return {'label':label,'winner':winner,'names':NAMES,'metrics':metrics,'validation':{k:round(wape(records['cal'],k),2) for k in NAMES},'test':{k:round(wape(records['test'],k),2) for k in NAMES},'coverage':coverage,'calibration_origins':cal,'test_origins':test,'n':n,'series':len(Y),'per':per,'note':'Cortes solapados: no son muestras independientes. Selección por WAPE global de validación, luego evaluación test. Intervalo empírico agrupado con objetivo nominal 80%; cobertura test publicada, sin garantía por SKU.'}
d=json.loads((P/'runtime'/'data.json').read_text());synth=run(np.array([p['sales'] for p in d['products']],float),'Catálogo sintético · unidades')
for p,stats in zip(d['products'],synth.pop('per')):
 p['models']=stats['models'];p['forecast']=[round(v) for v in stats['models'][synth['winner']]];p['interval']=stats['interval'];p['mae']=stats['mae'];p['wape']=stats['wape'];p['baseline_wape']=stats['baseline'];p['errors']=stats['errors'];p['calibration_errors']=stats['calibration_errors'];p['cv']=round(float(np.std(p['sales'][-52:])/np.mean(p['sales'][-52:])),3)
report={'synthetic':synth,'python':platform.python_version(),'sklearn':sklearn.__version__}
raw=Path(sys.argv[1]) if len(sys.argv)>1 else None
if raw and raw.exists():
 frame=pd.read_csv(raw);frame['Date']=pd.to_datetime(frame['Date'],dayfirst=True);wide=frame.pivot(index='Date',columns='Store',values='Weekly_Sales').sort_index();assert not wide.isna().any().any();public=run(wide.to_numpy().T,'Ventas semanales por tienda · importe reportado en USD');public['source']='https://github.com/GonzaloBP/Almacen-de-datos-Walmart/blob/main/Walmart.csv';public['sha256']=hashlib.sha256(raw.read_bytes()).hexdigest();public['period']=[str(wide.index[0].date()),str(wide.index[-1].date())];public['example']={'name':'Tienda '+str(wide.columns[0]),'history':wide.iloc[-20:,0].tolist(),'forecast':public['per'][0]['models'][public['winner']],'interval':public['per'][0]['interval']};public.pop('per');report['public']=public
report['model_design']={'ridge':'Regresión Ridge multisalida, alpha=20 y estandarización solo en entrenamiento','forest':'RandomForestRegressor multisalida, 100 árboles, profundidad 9, hoja mínima 5, semilla 37','holt':'Suavizado lineal de Holt, alpha=.25, beta=.05, sin ajuste en test','seasonal':'Misma semana del año anterior','features':'Rezagos 1,2,4,8,13,26,52; medias pasadas 4,8,13,26; dispersión, tendencia corta y seno/coseno semanal. Normalización por media de últimas 8 semanas disponible al corte. Targets directos a 12 horizontes; cada ventana termina antes del corte.'}
d['ml']=report;(P/'runtime'/'data.json').write_text(json.dumps(d,ensure_ascii=False));(P/'research/model_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('GANADORES', {k:report[k]['winner'] for k in ['synthetic','public'] if k in report},flush=True)
