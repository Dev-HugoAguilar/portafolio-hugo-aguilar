"""Fixture reproducible: ventas sintéticas, pronóstico estacional y backtest sin fuga."""
import json, math, random
from pathlib import Path
rng=random.Random(37)
products=[('A01','Café de especialidad','Alimentos',180,95,430,2,24),('A02','Bebida de avena','Alimentos',260,32,620,3,48),('A03','Proteína vegetal','Nutrición',95,210,240,4,12),('A04','Electrolitos','Nutrición',220,28,410,2,36),('A05','Filtro de agua','Hogar',65,340,190,5,6),('A06','Botella térmica','Hogar',110,150,310,3,12),('A07','Barra energética','Alimentos',310,19,700,2,60),('A08','Vitamina D','Nutrición',125,85,290,4,24)]
catalog={
'Alimentos':['Granola artesanal','Arroz integral','Pasta integral','Aceite de oliva','Miel de abeja','Frutos secos','Chocolate amargo','Atún en agua'],
'Nutrición':['Creatina','Colágeno','Omega 3','Magnesio','Multivitamínico','Fibra soluble','Probióticos','Vitamina C'],
'Hogar':['Organizador de cocina','Toalla de baño','Juego de sábanas','Lámpara de escritorio','Sartén antiadherente','Contenedor hermético','Báscula de cocina','Aspiradora portátil'],
'Electrónica':['Audífonos Bluetooth','Cargador USB-C','Cable USB-C','Batería portátil','Mouse inalámbrico','Teclado compacto','Webcam HD','Hub USB'],
'Cuidado personal':['Protector solar','Crema hidratante','Shampoo','Acondicionador','Jabón líquido','Cepillo dental','Sérum facial','Desodorante'],
'Mascotas':['Alimento para perro','Alimento para gato','Arena para gato','Correa reflectante','Juguete mordedera','Cama para mascota','Bebedero automático','Premios para perro']}
for category,names in catalog.items():
 needed=8-sum(item[2]==category for item in products)
 for name in names[:needed]:
  i=len(products);level=[45,80,130,220,340,65][i%6];cost=[45,120,260,75,390,30][i%6];pack=[6,12,24,36][i%4];lead=2+i%4
  products.append((f'A{i+1:02d}',name,category,level,cost,round(level*(1.3+(i%5)*.65)),lead,pack))
rows=[]
for i,(sku,name,cat,level,cost,stock,lead,pack) in enumerate(products):
 sales=[max(0,round(level*(1+.0015*t)*(1+.18*math.sin(2*math.pi*(t+i*3)/52))*(1+rng.gauss(0,.04+.02*(i%5))))) for t in range(104)]
 def predict(t):return sales[t-52]*(sum(sales[t-8:t])/sum(sales[t-60:t-52]))
 errors=[sales[t]-predict(t) for t in range(78,104)]
 mae=sum(abs(e) for e in errors)/26;den=sum(sales[78:]);wape=sum(abs(e) for e in errors)/den*100
 naive=sum(abs(sales[t]-sales[t-52]) for t in range(78,104))/den*100
 growth=sum(sales[-8:])/sum(sales[-60:-52]);forecast=[round(sales[52+h]*growth) for h in range(12)]
 rows.append(dict(sku=sku,name=name,category=cat,channel=["Amazon","Mercado Libre","Walmart Marketplace"][i%3],price=round(cost*(1.35+.07*(i%4)),2),cost=cost,stock=stock,lead=lead,pack=pack,sales=sales,forecast=forecast,mae=round(mae,2),wape=round(wape,1),baseline_wape=round(naive,1),inbound={'week':1,'qty':pack*5}))
ranked=sorted(rows,key=lambda r:sum(r['sales'][-52:])*r['price'],reverse=True)
total=sum(sum(r['sales'][-52:])*r['price'] for r in rows);cumulative=0
for r in ranked:
 r['abc']='A' if cumulative<.8 else 'B' if cumulative<.95 else 'C'
 cumulative+=sum(r['sales'][-52:])*r['price']/total
out=Path(__file__).parent/'runtime'/'data.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps({'label':'Fixture sintético reproducible · semilla 37','history':'104 semanas','horizon':12,'products':rows},ensure_ascii=False))
print(f'{len(rows)} SKU · {len(rows)*104} observaciones sintéticas · 26 cortes de backtest por SKU')
