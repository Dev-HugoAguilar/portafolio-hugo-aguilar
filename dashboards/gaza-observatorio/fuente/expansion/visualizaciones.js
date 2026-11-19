const H=__HUMAN__;
const nf=n=>new Intl.NumberFormat('es-MX').format(n), ns='http://www.w3.org/2000/svg';
function svgStart(w,h,label){return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" style="width:100%;height:auto;font:12px system-ui;overflow:visible">`}
function txt(x,y,t,extra=''){return `<text x="${x}" y="${y}" fill="#69768e" ${extra}>${t}</text>`}
function lastNative(k){return H.daily.filter(r=>Number.isFinite(r[k])).at(-1)}
$('#humanmetrics').innerHTML=[['killed_cum','Fallecidos reportados'],['injured_cum','Heridos reportados'],['killed_children_cum','Niños · acumulado publicado'],['press_killed_cum','Periodistas · acumulado publicado']].map(([k,l])=>{let r=lastNative(k);return `<div class="card"><small>${l}</small><strong>${nf(r[k])}</strong><small>Corte propio: ${r.report_date}</small></div>`}).join('');
function calendar(){let key=$('#dailyMetric').value,year=$('#dailyYear').value,only=$('#only24').checked,rows=H.daily.filter(r=>year==='all'||r.report_date.startsWith(year)),valid=rows.filter(r=>Number.isFinite(r[key])&&(!only||r.report_period===24)),max=Math.max(1,...valid.map(r=>r[key]));let out=svgStart(1120,165*[...new Set(rows.map(r=>r.report_date.slice(0,4)))].length,'Calendario de reportes; cada celda corresponde a una fecha');let years=[...new Set(rows.map(r=>r.report_date.slice(0,4)))];years.forEach((y,yi)=>{let top=yi*165+36,jan=Date.parse(y+'-01-01T00:00:00Z'),offset=(new Date(jan).getUTCDay()+6)%7;out+=txt(8,top+10,y,'font-size="20"');['L','M','X','J','V','S','D'].forEach((d,i)=>out+=txt(70,top+i*16+11,d));rows.filter(r=>r.report_date.startsWith(y)).forEach(r=>{let index=Math.round((Date.parse(r.report_date+'T00:00:00Z')-jan)/86400000)+offset,x=90+Math.floor(index/7)*18,yy=top+(index%7)*16,ok=Number.isFinite(r[key])&&(!only||r.report_period===24),v=ok?r[key]:null,fill=ok?`hsl(236 85% ${96-60*Math.sqrt(Math.max(0,v)/max)}%)`:'#e3e6ed';out+=`<rect tabindex="0" role="button" aria-label="${r.report_date}: ${v===null?'sin dato utilizable':nf(v)}" data-day="${r.report_date}" x="${x}" y="${yy}" width="15" height="13" rx="2" fill="${fill}"><title>${r.report_date} · ${v===null?'sin dato utilizable':nf(v)} · periodo ${r.report_period} h</title></rect>`});});out+='<\/svg>';$('#calendar').innerHTML=out+`<p class="muted">Escala por intensidad: 0 → ${nf(max)} · ${valid.length} reportes utilizables de ${rows.length} fechas seleccionadas. La escala se recalcula con el filtro.</p>`;$('#dailyRows').innerHTML=rows.map(r=>`<tr><td>${r.report_date}</td><td>${Number.isFinite(r[key])?nf(r[key]):'Sin dato'}</td><td>${r.report_period}</td><td>${r.report_source}</td></tr>`).join('');document.querySelectorAll('[data-day]').forEach(el=>{let show=()=>{let r=rows.find(r=>r.report_date===el.dataset.day);$('#dayInfo').textContent=`${r.report_date} · ${Number.isFinite(r[key])?nf(r[key]):'Sin dato'} · periodo ${r.report_period} h · fuente ${r.report_source}. Recuperados: ${r.killed_recovered??'sin dato'}; incorporados por comité: ${r.killed_committee??'sin dato'}. Estos componentes pueden estar incluidos en el reporte.`};el.onclick=show;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show()}}})}
['dailyMetric','dailyYear','only24'].forEach(id=>$('#'+id).onchange=calendar);calendar();
const SERIES={killed_cum:'Fallecidos reportados',injured_cum:'Heridos reportados',killed_children_cum:'Niños · acumulado publicado',press_killed_cum:'Periodistas · acumulado publicado'};
function curve(el,key,events=false){const serie=SERIES[key]||key;let rows=H.daily.filter(r=>Number.isFinite(r[key])),w=1100,h=390,L=80,T=30,B=300,x0=Date.parse(H.daily[0].report_date),x1=Date.parse(H.daily.at(-1).report_date),max=Math.max(...rows.map(r=>r[key]))*1.04,X=d=>L+(Date.parse(d)-x0)/(x1-x0)*970,Y=v=>B-v/max*260;let s=svgStart(w,h,'Acumulados publicados, puntos nativos sin interpolación');for(let i=0;i<5;i++){let v=max*i/4,y=Y(v);s+=`<path d="M${L},${y}H1050" stroke="#e6e9f2"/>`+txt(L-10,y+4,nf(Math.round(v)),'text-anchor="end"')}for(let yr of ['2024','2025','2026'])s+=txt(X(yr+'-01-01'),330,yr);rows.forEach(r=>s+=`<circle cx="${X(r.report_date)}" cy="${Y(r[key])}" r="2.4" fill="#4b55ff" opacity=".7" data-tip-serie="${serie}" data-tip="Valor acumulado publicado en la fecha del reporte; no indica cuántas muertes ocurrieron ese día."><title>${r.report_date}: ${nf(r[key])}</title></circle>`);if(events)H.events.forEach((e,i)=>{let x=X(e[0]);s+=`<path d="M${x},20V${B}" stroke="#a9b0c5" stroke-dasharray="3 4"/><circle cx="${x}" cy="350" r="12" fill="#354052"/>`+txt(x,354,i+1,'text-anchor="middle" style="fill:white"')});$('#'+el).innerHTML=s+'<\/svg>'+(events?'<div class="eventkey">'+H.events.map((e,i)=>`<a href="${e[3]}" target="_blank" rel="noopener">${i+1} · ${e[0]} · ${e[1]} ↗</a>`).join('')+'</div>':'')}
$('#cumMetric').onchange=()=>curve('cumulative',$('#cumMetric').value,true);curve('cumulative','killed_cum',true);
const EDADES_POR_VISTA=15;
let paginaEdades=0;
let modoGrafica=null;
function edadesIndividuales(){return H.age_hist.filter(r=>r.age>=0&&r.age<=110).map(r=>({...r,label:String(r.age)}))}
function totalPaginasEdades(){return Math.max(1,Math.ceil(edadesIndividuales().length/EDADES_POR_VISTA))}
function anchoGraficaEdades(){const caja=document.querySelector('#ageChart');return caja?Math.round(caja.clientWidth):0}
/* Maqueta ancha: pirámide con eje central. «Grupos de edad» ocupa el ancho de la
   tarjeta con filas altas y puntos grandes; «Edad por año» pagina quince filas. */
function piramideAncha(rows,single,pct,totalM,totalF){
  const width=single?900:1300,center=width/2,spine=single?190:210;
  const anchorL=center-spine/2-(single?14:18),anchorR=center+spine/2+(single?14:18);
  const rowHeight=single?44:134,top=single?64:106,stack=single?1:8,spacing=single?11:10,dot=single?4:4.4;
  const height=top+rows.length*rowHeight+(single?18:26);
  const etiqueta=single
    ? `Pirámide de personas identificadas por edad declarada y sexo registrado, edades ${rows[0].label} a ${rows[rows.length-1].label}`
    : 'Pirámide de personas identificadas por grupos de edad y sexo registrado; cada punto representa aproximadamente 100 registros y las cinco franjas se reparten el total';
  let out=svgStart(width,height,etiqueta+'; cada punto representa aproximadamente 100 registros');
  out+=txt(single?12:16,30,'Masculino · '+nf(totalM),`font-size="${single?13:17}" font-weight="600" style="fill:#293447"`)
     +txt(center,30,single?'EDAD':'GRUPO DE EDAD','text-anchor="middle" font-size="11" letter-spacing="2"')
     +txt(width-12,30,'Femenino · '+nf(totalF),`text-anchor="end" font-size="${single?13:17}" font-weight="600" style="fill:#293447"`);
  out+=`<path d="M${center},${single?38:46}V${height-14}" stroke="#d9dfee" stroke-dasharray="3 5"/>`;
  rows.forEach((r,i)=>{
    const y=top+i*rowHeight+rowHeight/2,total=r.m+r.f,colsM=Math.ceil(r.m/100),colsF=Math.ceil(r.f/100);
    const label=single?`Edad ${r.label}`:r.label;
    out+=`<g class="age-swarm-row" data-row="${i}" tabindex="0" role="group" aria-label="${label}. Masculino ${nf(r.m)}, ${pct(r.m,total)}. Femenino ${nf(r.f)}, ${pct(r.f,total)}.">`;
    out+=`<text x="${single?12:16}" y="${y+5.5}" fill="#3d4a60" font-size="${single?12.5:16.5}">${nf(r.m)} · ${pct(r.m,total)}</text>`+
         `<text x="${width-(single?12:16)}" y="${y+5.5}" text-anchor="end" fill="#3d4a60" font-size="${single?12.5:16.5}">${pct(r.f,total)} · ${nf(r.f)}</text>`;
    out+=`<rect x="${center-spine/2}" y="${y-(single?14:19)}" width="${spine}" height="${single?28:38}" rx="9" fill="#f3f4fa" stroke="#d9dfee"/>`+
         `<text x="${center}" y="${y+(single?4.5:5.5)}" text-anchor="middle" fill="#293447" font-size="${single?13:16.5}" font-weight="600">${label}</text>`;
    for(let j=0;j<colsM;j++){
      const x=anchorL-Math.floor(j/stack)*spacing,yy=y+(j%stack-(stack-1)/2)*(single?0:spacing);
      out+=`<circle cx="${x}" cy="${yy}" r="${dot}" fill="#4b55ff" data-tip-serie="Masculino registrado" data-tip="${pct(r.m,total)} del grupo · ${nf(r.m)} de ${nf(total)}"><title>${label} · Masculino registrado: ${nf(r.m)} (${pct(r.m,total)}); ≈100 registros por punto</title></circle>`;
    }
    for(let j=0;j<colsF;j++){
      const x=anchorR+Math.floor(j/stack)*spacing,yy=y+(j%stack-(stack-1)/2)*(single?0:spacing);
      out+=`<circle cx="${x}" cy="${yy}" r="${dot}" fill="#9b8bc4" data-tip-serie="Femenino registrado" data-tip="${pct(r.f,total)} del grupo · ${nf(r.f)} de ${nf(total)}"><title>${label} · Femenino registrado: ${nf(r.f)} (${pct(r.f,total)}); ≈100 registros por punto</title></circle>`;
    }
    out+='</g>';
  });
  return out+'</svg>';
}
/* Maqueta móvil: un bloque por grupo o edad, con título, total y los conteos de
   cada sexo. Los puntos van en línea si caben a la derecha de su conteo y, si no,
   se envuelven debajo en líneas completas, con aire antes del bloque siguiente. */
function piramideMovil(rows,single,pct,totalM,totalF,anchoCaja){
  const width=Math.round(Math.max(250,Math.min(anchoCaja||340,700))),x0=8,util=width-x0*2,esp=6.4,dot=2.9;
  const arranqueDots=Math.round(Math.min(160,Math.max(118,util*0.55)));   // hueco reservado al conteo
  const enLinea=Math.max(4,Math.floor((util-arranqueDots)/esp));
  const porLinea=Math.max(8,Math.floor(util/esp));
  const piezas=[];
  let y=24;
  piezas.push(txt(x0,y,'Masculino · '+nf(totalM),'font-size="13" font-weight="600" style="fill:#293447"'));
  piezas.push(txt(width-x0,y,'Femenino · '+nf(totalF),'text-anchor="end" font-size="13" font-weight="600" style="fill:#293447"'));
  y+=16;
  piezas.push(txt(x0,y,'Un punto ≈ 100 registros','font-size="11"'));
  rows.forEach((r,i)=>{
    const total=r.m+r.f,label=single?`Edad ${r.label}`:r.label;
    y+=14;
    const yTitulo=y+12;
    piezas.push(`<g class="age-swarm-row" data-row="${i}" tabindex="0" role="group" aria-label="${label}. Masculino ${nf(r.m)}, ${pct(r.m,total)}. Femenino ${nf(r.f)}, ${pct(r.f,total)}.">`);
    piezas.push(txt(x0,yTitulo,label,'font-size="13.5" font-weight="600" style="fill:#293447"'));
    piezas.push(txt(width-x0,yTitulo,nf(total)+' personas','text-anchor="end" font-size="12"'));
    y=yTitulo+6;
    [['Masculino',r.m,'#4b55ff'],['Femenino',r.f,'#9b8bc4']].forEach(([nombre,valor,color])=>{
      const n=Math.ceil(valor/100);
      y+=13;
      piezas.push(txt(x0,y,`${nombre} · ${nf(valor)} · ${pct(valor,total)}`,'font-size="12"'));
      if(n<=enLinea){
        for(let j=0;j<n;j++){
          piezas.push(`<circle cx="${x0+arranqueDots+j*esp}" cy="${y-3.6}" r="${dot}" fill="${color}" data-tip-serie="${nombre} registrado" data-tip="${pct(valor,total)} del grupo · ${nf(valor)} de ${nf(total)}"><title>${label} · ${nombre}: ${nf(valor)} (${pct(valor,total)}); ≈100 registros por punto</title></circle>`);
        }
      }else{
        const filas=Math.ceil(n/porLinea);
        for(let j=0;j<n;j++){
          const f=Math.floor(j/porLinea),c=j%porLinea;
          piezas.push(`<circle cx="${x0+3+c*esp}" cy="${y+13+f*9}" r="${dot}" fill="${color}" data-tip-serie="${nombre} registrado" data-tip="${pct(valor,total)} del grupo · ${nf(valor)} de ${nf(total)}"><title>${label} · ${nombre}: ${nf(valor)} (${pct(valor,total)}); ≈100 registros por punto</title></circle>`);
        }
        y+=filas*9+9;
      }
    });
    piezas.push('</g>');
  });
  const height=Math.round(y+20);
  const etiqueta=single
    ? `Pirámide compacta por edad declarada y sexo registrado, edades ${rows[0].label} a ${rows[rows.length-1].label}`
    : 'Pirámide compacta por grupos de edad y sexo registrado';
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${etiqueta}; cada punto representa aproximadamente 100 registros" style="width:100%;height:auto;font:12px system-ui;overflow:visible">`+piezas.join('')+'</svg>';
}
function ageChart(){
  const single=$('#ageMode').value==='single';
  const todas=single?edadesIndividuales():[];
  paginaEdades=single?Math.min(Math.max(0,paginaEdades),totalPaginasEdades()-1):0;
  const desde=paginaEdades*EDADES_POR_VISTA;
  const rows=single?todas.slice(desde,desde+EDADES_POR_VISTA):H.ages;
  const anchoCaja=anchoGraficaEdades();
  const movil=anchoCaja>0&&anchoCaja<720;
  modoGrafica=movil?'movil':(single?'ancho-edad':'ancho-grupo');
  const pct=(x,n)=>n?`${(100*x/n).toFixed(1)}%`:'0.0%';
  const totalM=H.ages.reduce((a,r)=>a+r.m,0),totalF=H.ages.reduce((a,r)=>a+r.f,0);
  const out=movil?piramideMovil(rows,single,pct,totalM,totalF,anchoCaja):piramideAncha(rows,single,pct,totalM,totalF);
  const caption=single
    ? 'Quince edades por vista, de la 0 a la 110: usa «Anterior» y «Siguiente» para recorrerlas todas. Un punto ≈100 registros; los conteos exactos y los porcentajes aparecen junto a cada edad, que se puede enfocar para consultarla.'
    : 'Las cinco franjas de edad reparten las '+nf(totalM+totalF)+' personas identificadas. Un punto ≈100 registros; los conteos exactos y los porcentajes aparecen a ambos lados de cada franja, que se puede enfocar para consultarla.';
  $('#ageChart').innerHTML=`<div class="ageSwarmViewport${single?' is-individual':''}${movil?' is-movil':''}">${out}</div><p class="muted ageSwarmCaption">${caption}</p>`;
  const historial=edadesIndividuales();
  const cabecera='<div class="scroll"><table><caption class="muted">'+
    (single?`Edades ${rows[0].label}–${rows[rows.length-1].label} de ${historial.length} · conteos exactos de la vista actual`:`Edades declaradas por la fuente · ${nf(H.age_total)} registros`)+
    '</caption><thead><tr><th>'+(single?'Edad':'Grupo')+'</th><th>Masculino</th><th>Femenino</th><th>Total</th></tr></thead><tbody>'+
    rows.map(r=>`<tr><td>${single?'Edad '+r.label:r.label}</td><td>${nf(r.m)}</td><td>${nf(r.f)}</td><td>${nf(r.m+r.f)}</td></tr>`).join('')+
    '</tbody></table></div>';
  const completo='<details class="ageAll"><summary>Todas las edades en tabla ('+historial.length+' filas)</summary>'+
    '<div class="scroll"><table><caption class="muted">Edad declarada, conteo por sexo registrado y total · '+nf(H.age_total)+' registros</caption>'+
    '<thead><tr><th>Edad</th><th>Masculino</th><th>Femenino</th><th>Total</th></tr></thead><tbody>'+
    historial.map(r=>`<tr><td>${r.label}</td><td>${nf(r.m)}</td><td>${nf(r.f)}</td><td>${nf(r.m+r.f)}</td></tr>`).join('')+
    '</tbody></table></div></details>';
  $('#ageTable').innerHTML=cabecera+completo;
  const caja=$('#agePager');
  if(caja){
    caja.hidden=!single;
    if(single){
      const paginas=totalPaginasEdades(),finPagina=Math.min(desde+EDADES_POR_VISTA,historial.length);
      $('#ageRange').textContent=`Edades ${historial[desde].label}–${historial[finPagina-1].label} · ${finPagina-desde} de ${historial.length} edades · vista ${paginaEdades+1} de ${paginas}`;
      $('#agePrev').disabled=paginaEdades===0;
      $('#ageNext').disabled=paginaEdades>=paginas-1;
    }
  }
}
function moverPaginaEdades(delta){
  const destino=Math.min(Math.max(0,paginaEdades+delta),totalPaginasEdades()-1);
  if(destino===paginaEdades)return;
  const activo=document.activeElement;
  paginaEdades=destino;
  ageChart();
  const siguiente=$('#ageNext'),anterior=$('#agePrev');
  if(activo===siguiente&&siguiente.disabled)anterior.focus();
  else if(activo===anterior&&anterior.disabled)siguiente.focus();
}
$('#ageMode').onchange=()=>{paginaEdades=0;ageChart()};
$('#agePrev').onclick=()=>moverPaginaEdades(-1);
$('#ageNext').onclick=()=>moverPaginaEdades(1);
ageChart();
/* Si la tarjeta cambia de ancho (móvil, tableta, ficha del portafolio), se
   elige la maqueta que corresponde sin volver a pintar en cada fotograma. */
let temporizadorAncho=null;
const observadorAncho=new ResizeObserver(()=>{clearTimeout(temporizadorAncho);temporizadorAncho=setTimeout(()=>{
  const ancho=anchoGraficaEdades();
  const esperado=ancho>0&&ancho<720?'movil':($('#ageMode').value==='single'?'ancho-edad':'ancho-grupo');
  if(modoGrafica!==esperado)ageChart();
},160)});
observadorAncho.observe(document.querySelector('#ageChart'));
/* Trama de cien celdas: un reparto por mayores residuos para que las 100
   celdas sumen el 100 % de la lista sin sesgo por orden. */
function ageWaffle(){
  const root=document.querySelector('#ageWaffle');if(!root)return;
  const total=H.age_total,groups=[
    {id:'children',label:'Niños y adolescentes',range:'0–17 años',count:H.ages.filter(x=>x.label.startsWith('Infancia')||x.label.startsWith('Adolescencia')).reduce((s,x)=>s+x.m+x.f,0),color:'#4b55ff'},
    {id:'youth',label:'Jóvenes',range:'18–24 años',count:H.ages.filter(x=>x.label.startsWith('Jóvenes')).reduce((s,x)=>s+x.m+x.f,0),color:'#6f78d9'},
    {id:'adults',label:'Adultos',range:'25–59 años',count:H.ages.filter(x=>x.label.startsWith('Adultos')).reduce((s,x)=>s+x.m+x.f,0),color:'#9b8bc4'},
    {id:'older',label:'Personas mayores',range:'60 años o más',count:H.ages.filter(x=>x.label.startsWith('Mayores')).reduce((s,x)=>s+x.m+x.f,0),color:'#c6cbe1'}
  ];
  const pct=x=>(100*x/total).toFixed(1)+' %';
  const quotas=groups.map(x=>({group:x,exact:100*x.count/total,base:Math.floor(100*x.count/total)}));
  let left=100-quotas.reduce((s,x)=>s+x.base,0);
  [...quotas].sort((a,b)=>(b.exact-b.base)-(a.exact-a.base)).slice(0,left).forEach(x=>x.base++);
  const cells=[];quotas.forEach(({group,base})=>{for(let i=0;i<base;i++)cells.push(group)});
  root.innerHTML=cells.map((g,i)=>`<span class="age-tile" style="background:${g.color}" data-tip-titulo="${g.label} · ${g.range}" data-tip="Celda ${i+1} de 100 · ${nf(g.count)} personas (${pct(g.count)})"></span>`).join('');
  const legend=document.querySelector('#ageLegend'),detail=document.querySelector('#ageDetail');
  legend.innerHTML=groups.map((g,i)=>`<button type="button" data-age-group="${g.id}" aria-pressed="${i===0}"><i class="age-swatch" style="background:${g.color}"></i><span>${g.label}<br><small>${g.range} · ${pct(g.count)}</small></span></button>`).join('');
  const show=g=>{detail.innerHTML=`<b>${g.label} (${g.range}):</b> ${nf(g.count)} personas · ${pct(g.count)} de las ${nf(total)} identificadas.`;legend.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ageGroup===g.id))};
  legend.querySelectorAll('button').forEach(b=>b.onclick=()=>show(groups.find(g=>g.id===b.dataset.ageGroup)));show(groups[0]);
}
ageWaffle();
$('#ageMode').onchange=ageChart;ageChart();
/* ---------------- Periodistas: lista nominal + acumulado publicado ---------------- */
let PRENSA=[];function cargarPrensa(){PRENSA=(typeof XDATA!=='undefined'&&XDATA.sources&&Array.isArray(XDATA.sources.Prensa))?XDATA.sources.Prensa:[];return PRENSA.length}
const pressLast=lastNative('press_killed_cum');
const pressAll=H.daily.filter(r=>Number.isFinite(r.press_killed_cum));
const P_COLS=66;
let pressSel=null,pressFocus=0;
const pressNorm=s=>String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const pressEsc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pressHits(){const q=pressNorm($('#pressSearch').value.trim());return PRENSA.map((r,i)=>({r,i})).filter(o=>!q||[o.r.name,o.r.name_en,o.r.notes].some(v=>pressNorm(v).includes(q)))}
function pressDetail(i,vacio){const caja=$('#pressDetail');
  if(i==null||!PRENSA[i]){caja.innerHTML='<h3>Registro de prensa</h3><p class="muted">'+(vacio?'Sin registros que mostrar: la ficha queda vacía para no conservar datos de una búsqueda anterior.':'Selecciona un punto con el ratón o con las flechas y Enter para leer el nombre original, el nombre en inglés y la nota de la fuente.')+'</p>';return}
  const r=PRENSA[i];pressSel=i;
  const fuera=pressHits().every(o=>o.i!==i);
  caja.innerHTML=`<h3>Registro ${nf(i+1)} de ${nf(PRENSA.length)}</h3><div class="pressfields"><div><small>Nombre original de la fuente</small><strong dir="auto">${pressEsc(r.name||'No publicado')}</strong></div><div><small>Nombre en inglés</small><strong>${pressEsc(r.name_en||'No publicado en la fuente')}</strong></div></div><p class="pressnote"><small>Nota original de la fuente</small><span>${pressEsc(r.notes||'La fuente no incluye nota para este registro.')}</span></p><small>La lista no aporta fecha ni lugar del fallecimiento: el registro no los contiene y aquí no se estiman.${fuera?' El registro seleccionado no coincide con la búsqueda actual.':''}</small>`}
function pressDots(){const hits=pressHits(),vis=new Set(hits.map(o=>o.i)),rows=Math.ceil(PRENSA.length/P_COLS),alto=24+rows*22;
  let s=`<svg viewBox="0 0 1100 ${alto}" role="img" aria-label="Un punto por registro de la lista nominal de periodistas" style="width:100%;height:auto;font:12px system-ui">`;
  PRENSA.forEach((r,i)=>{const on=vis.has(i),sel=i===pressSel,cx=15+(i%P_COLS)*16,cy=15+Math.floor(i/P_COLS)*22,nombre=r.name_en||r.name||('Registro '+(i+1));
    s+=`<circle class="pressdot${sel?' is-selected':''}" data-press="${i}" role="button" tabindex="${sel||(pressSel==null&&i===0)?0:-1}" aria-label="${pressEsc(nombre)}${on?'':' · fuera de la búsqueda'}${sel?' · seleccionado':''}" data-tip="Registro ${i+1} de ${nf(PRENSA.length)} de la lista de prensa" cx="${cx}" cy="${cy}" r="${sel?5.6:4}" fill="${sel?'#283347':(on?'#4b55ff':'#cfd5e4')}"${sel?' stroke="#283347" stroke-width="2" stroke-opacity=".45"':''}><title>${pressEsc(nombre)}${sel?' · seleccionado':''}</title></circle>`});
  $('#pressDots').innerHTML=s+'<\/svg>'}
function pressTable(hits){const tope=200;const filas=hits.slice(0,tope);
  $('#pressRows').innerHTML=filas.map(o=>`<tr data-press-row="${o.i}"><td dir="auto">${pressEsc(o.r.name||'—')}</td><td>${pressEsc(o.r.name_en||'—')}</td><td class="pressnotecell">${pressEsc(o.r.notes||'—')}</td></tr>`).join('');
  $('#pressRowsNote').textContent=hits.length>tope?`Se muestran los primeros ${tope} de ${nf(hits.length)} registros que coinciden; la búsqueda abarca los ${nf(PRENSA.length)} de la lista.`:''}
function pressRender(){const hits=pressHits(),vacio=hits.length===0;
  $('#pressCount').textContent=`${nf(hits.length)} de ${nf(PRENSA.length)} registros`;
  $('#pressEmpty').hidden=!vacio;
  if(vacio){$('#pressEmpty').innerHTML=`<b>Sin coincidencias.</b> Ningún registro coincide con «${pressEsc($('#pressSearch').value.trim())}». La búsqueda revisa nombres y notas; limpia el campo para volver a los ${nf(PRENSA.length)} registros.`;pressSel=null;pressDetail(null,true)}
  else if(pressSel==null||!PRENSA[pressSel])pressDetail(hits[0].i,false);else pressDetail(pressSel,false);
  pressDots();pressTable(hits)}
function pressCuts(){const y=$('#pressYear').value;return pressAll.filter(r=>y==='all'||r.report_date.startsWith(y))}
function pressFillCuts(){const lista=pressCuts(),previo=$('#pressCut').value;
  $('#pressCut').innerHTML=lista.map((r,i)=>`<option value="${r.report_date}">${i+1} de ${lista.length} · ${r.report_date} · ${nf(r.press_killed_cum)}</option>`).join('');
  if(lista.some(r=>r.report_date===previo))$('#pressCut').value=previo;else if(lista.length)$('#pressCut').value=lista[lista.length-1].report_date;
  pressCut()}
function pressCut(){const lista=pressCuts(),fecha=$('#pressCut').value,idx=lista.findIndex(r=>r.report_date===fecha),r=lista[idx],anio=$('#pressYear').value;
  $('#pressCutDetail').innerHTML=r?`<b>Corte ${idx+1} de ${lista.length}${anio==='all'?'':' en '+anio}</b> · reporte del <b>${r.report_date}</b> · acumulado publicado <b>${nf(r.press_killed_cum)}</b> personas de prensa. <span class="muted">La fecha es la del reporte; el acumulado no indica cuántas muertes ocurrieron ese día.</span>`:(anio==='all'?'No hay cortes publicados en el archivo diario.':`Sin cortes publicados en ${anio}. Elige otro año o «Todos».`);
  $('#pressPrev').disabled=idx<=0;$('#pressNext').disabled=idx<0||idx>=lista.length-1;
  pressTrend()}
function pressTrend(){const lista=pressCuts(),sel=$('#pressCut').value;
  if(!pressAll.length){$('#pressTrend').innerHTML='<p class="muted">El archivo diario no trae cortes de prensa.</p>';return}
  const w=1100,h=390,L=80,B=300,x0=Date.parse(pressAll[0].report_date),x1=Date.parse(pressAll[pressAll.length-1].report_date),max=Math.max(...pressAll.map(r=>r.press_killed_cum))*1.06||1;
  const X=d=>L+(Date.parse(d)-x0)/((x1-x0)||1)*970,Y=v=>B-v/max*260;
  let s=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Acumulado publicado de personas de prensa por fecha de reporte" style="width:100%;height:auto;font:12px system-ui;overflow:visible">`;
  for(let i=0;i<5;i++){const v=max*i/4,y=Y(v);s+=`<path d="M${L},${y}H1050" stroke="#e6e9f2"/>`+txt(L-10,y+4,nf(Math.round(v)),'text-anchor="end"')}
  const anio=$('#pressYear').value;
  if(anio!=='all'){const a=Math.max(L,X(anio+'-01-01')),b=Math.min(1050,X((Number(anio)+1)+'-01-01'));s+=`<rect x="${a}" y="18" width="${Math.max(0,b-a)}" height="${B-18}" fill="#4b55ff" opacity=".06"/>`+txt(a+6,B-8,'año '+anio,'font-size="11"')}
  const enAnio=new Set(lista.map(r=>r.report_date));
  s+=`<path d="${pressAll.map((r,i)=>(i?'L':'M')+X(r.report_date)+','+Y(r.press_killed_cum)).join('')}" fill="none" stroke="#4b55ff" stroke-width="1.4" opacity=".45"/>`;
  pressAll.forEach(r=>{const dentro=enAnio.has(r.report_date),sel_=r.report_date===sel;
    s+=`<circle class="presscut${sel_?' is-selected':''}" data-cut="${r.report_date}" role="button" tabindex="${sel_?0:-1}" aria-label="Reporte del ${r.report_date}: ${nf(r.press_killed_cum)} personas de prensa" cx="${X(r.report_date)}" cy="${Y(r.press_killed_cum)}" r="${sel_?6:2.6}" fill="${sel_?'#283347':'#4b55ff'}" opacity="${anio==='all'||dentro?1:.35}"${sel_?' stroke="#283347" stroke-width="2" stroke-opacity=".4"':''}><title>${r.report_date}: ${nf(r.press_killed_cum)} · ${anio==='all'||dentro?'en el año elegido':'otro año'}</title></circle>`});
  ['2024','2025','2026'].forEach(y=>{const x=X(y+'-01-01');if(x>L&&x<1050)s+=txt(x,B+30,y)});
  $('#pressTrend').innerHTML=s+'<\/svg><p class="muted">'+pressAll.length+' cortes nativos publicados. La serie es acumulada: se dibuja completa para no perder la escala y el año elegido queda resaltado.</p>'}

$('#pressAggregate').textContent=pressLast?nf(pressLast.press_killed_cum)+' ('+pressLast.report_date+')':'—';
$('#pressYear').innerHTML='<option value="all">Todos</option>'+[...new Set(pressAll.map(r=>r.report_date.slice(0,4)))].map(y=>`<option>${y}</option>`).join('');
$('#pressSearch').oninput=pressRender;
$('#pressClear').onclick=()=>{$('#pressSearch').value='';pressRender();$('#pressSearch').focus()};
$('#pressYear').onchange=pressFillCuts;
$('#pressCut').onchange=pressCut;
$('#pressPrev').onclick=()=>{const l=pressCuts(),i=l.findIndex(r=>r.report_date===$('#pressCut').value);if(i>0){$('#pressCut').value=l[i-1].report_date;pressCut()}};
$('#pressNext').onclick=()=>{const l=pressCuts(),i=l.findIndex(r=>r.report_date===$('#pressCut').value);if(i>=0&&i<l.length-1){$('#pressCut').value=l[i+1].report_date;pressCut()}};
document.querySelectorAll('.pressdots').forEach(caja=>{caja.addEventListener('click',e=>{const d=e.target.closest('[data-press]');if(d){pressDetail(Number(d.dataset.press),false);pressDots();$('#pressDots').querySelector('[data-press="'+d.dataset.press+'"]')?.focus()}});
  caja.addEventListener('keydown',e=>{const d=e.target.closest('[data-press]');if(!d)return;const hits=pressHits().map(o=>o.i);if(!hits.length)return;const actual=hits.indexOf(Number(d.dataset.press));
    if(e.key==='Enter'||e.key===' '){e.preventDefault();pressDetail(Number(d.dataset.press),false);pressDots();$('#pressDots').querySelector('[data-press="'+d.dataset.press+'"]')?.focus();return}
    let destino=null;
    if(e.key==='ArrowRight')destino=hits[Math.min(hits.length-1,actual+1)];
    else if(e.key==='ArrowLeft')destino=hits[Math.max(0,actual-1)];
    else if(e.key==='ArrowDown')destino=hits.find(i=>i>Number(d.dataset.press))??hits[hits.length-1];
    else if(e.key==='ArrowUp')destino=[...hits].reverse().find(i=>i<Number(d.dataset.press))??hits[0];
    if(destino!=null){e.preventDefault();pressDetail(destino,false);pressDots();$('#pressDots').querySelector('[data-press="'+destino+'"]')?.focus()}})});
$('#pressRows').addEventListener('click',e=>{const fila=e.target.closest('[data-press-row]');if(!fila)return;pressDetail(Number(fila.dataset.pressRow),false);pressDots();$('#pressDetail').scrollIntoView({block:'nearest'})});
$('#pressTrend').addEventListener('click',e=>{const d=e.target.closest('[data-cut]');if(!d)return;$('#pressCut').value=d.dataset.cut;pressCut();$('#pressTrend').querySelector('[data-cut="'+d.dataset.cut+'"]')?.focus()});
$('#pressTrend').addEventListener('keydown',e=>{const d=e.target.closest('[data-cut]');if(!d)return;const l=pressCuts();if(!l.length)return;const i=l.findIndex(r=>r.report_date===d.dataset.cut);
  if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#pressCut').value=d.dataset.cut;pressCut();$('#pressTrend').querySelector('[data-cut="'+d.dataset.cut+'"]')?.focus();return}
  let j=null;if(e.key==='ArrowRight')j=Math.min(l.length-1,i+1);else if(e.key==='ArrowLeft')j=Math.max(0,i-1);
  if(j!=null){e.preventDefault();$('#pressCut').value=l[j].report_date;pressCut();$('#pressTrend').querySelector('[data-cut="'+l[j].report_date+'"]')?.focus()}});
pressFillCuts();function initPrensaNomin(){cargarPrensa();$('#pressTotal').textContent=nf(PRENSA.length);pressRender()}
const injuries=[['Lesiones de extremidades',22366,29075],['Otras lesiones graves',8602,11183],['Amputaciones de extremidades',5161,6710],['Quemaduras graves',3441,4473],['Lesión medular',2065,2684],['Traumatismo cerebral grave',1376,1789]];
function injuryChart(){
  const ancho=1340,alto=506,izq=350,der=1000,arriba=76,fila=62,tope=30000,largo=der-izq,base=arriba+injuries.length*fila+6,columna=1310;
  const x=v=>izq+(v/tope)*largo;
  let s=svgStart(ancho,alto,'Estimaciones mínima y máxima de personas con necesidades de rehabilitación por categoría de lesión: cada fila une los dos límites publicados y todas las categorías comparten una escala lineal de cero a treinta mil');
  s+=txt(izq,26,'ESTIMACIÓN DE PERSONAS','font-size="10" letter-spacing="1.4"')+txt(columna,26,'RANGO ESTIMADO','text-anchor="end" font-size="10" letter-spacing="1.4"');
  for(let v=0;v<=tope;v+=5000){const xx=x(v);s+=txt(xx,52,nf(v),'text-anchor="middle" font-size="11"')+`<path d="M${xx},62V${base}" stroke="#e6e9f2"/>`}
  injuries.forEach(([etiqueta,minimo,maximo],i)=>{
    const y=arriba+i*fila,lo=x(minimo),hi=x(maximo);
    s+=`<g class="injRow" role="group" tabindex="0" aria-label="${etiqueta}: mínimo estimado ${nf(minimo)} personas, máximo estimado ${nf(maximo)} personas" data-tip-serie="Necesidades de rehabilitación · OMS" data-tip-titulo="${etiqueta}" data-tip-min="${nf(minimo)} personas" data-tip-max="${nf(maximo)} personas" data-tip="Rango publicado para esta categoría: la barra solo conecta los dos límites, sin interpolar valores intermedios." data-tip-hint="Flechas arriba y abajo recorren las categorías.">`;
    s+=txt(8,y+5,etiqueta,'font-size="13"');
    s+=`<line x1="${izq}" y1="${y}" x2="${der}" y2="${y}" stroke="#eef0f7" stroke-width="2"/>`;
    s+=`<line x1="${lo}" y1="${y}" x2="${hi}" y2="${y}" stroke="#9b8bc4" stroke-width="10" stroke-linecap="round"/>`;
    s+=`<circle cx="${lo}" cy="${y}" r="7" fill="#4b55ff" stroke="#fff" stroke-width="2" data-tip-serie="Límite mínimo · OMS" data-tip-titulo="${etiqueta}" data-tip="${nf(minimo)} personas estimadas" data-tip-min="${nf(minimo)} personas"></circle>`;
    s+=`<circle cx="${hi}" cy="${y}" r="7" fill="#9b8bc4" stroke="#fff" stroke-width="2" data-tip-serie="Límite máximo · OMS" data-tip-titulo="${etiqueta}" data-tip="${nf(maximo)} personas estimadas" data-tip-max="${nf(maximo)} personas"></circle>`;
    s+=txt(columna,y+5,`${nf(minimo)} – ${nf(maximo)}`,'text-anchor="end" font-size="13" font-weight="600" style="fill:#293447"');
    s+='</g>';
  });
  s+=`<path d="M${izq},${base}H${der}" stroke="#cfd5e4"/>`;
  s+=txt(izq,base+30,'● Mínimo estimado','style="fill:#4b55ff"')+txt(izq+200,base+30,'● Máximo estimado','style="fill:#7a6aa6"');
  s+='</svg><p class="muted">Cada intervalo conecta los dos valores publicados de una categoría; todas comparten escala lineal. Son escenarios estimados de necesidades de rehabilitación, no intervalos de confianza; las categorías pueden solaparse y no deben sumarse.</p>';
  $('#injuryChart').innerHTML=s;
  const filas=[...$('#injuryChart').querySelectorAll('.injRow')];
  filas.forEach((g,i)=>g.addEventListener('keydown',e=>{
    const salto=e.key==='ArrowDown'||e.key==='ArrowRight'?1:e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:0;
    if(!salto)return;
    const destino=filas[Math.min(filas.length-1,Math.max(0,i+salto))];
    if(destino){e.preventDefault();destino.focus()}
  }));
}
injuryChart();
function prostheticsChart(){
  const ancho=1100,alto=250,izq=280,der=940,arriba=88,fila=68,tope=2500,largo=der-izq,base=arriba+2*fila-6;
  const x=v=>izq+(v/tope)*largo;
  let s=svgStart(ancho,alto,'Dos barras independientes: 2 277 personas con amputaciones evaluadas y 502 prótesis colocadas; escala común de cero a 2 500 y sin vínculo individual entre las cifras');
  s+=txt(izq,28,'CONTEO REPORTADO','font-size="10" letter-spacing="1.4"');
  for(let v=0;v<=tope;v+=500){const xx=x(v);s+=txt(xx,54,nf(v),'text-anchor="middle" font-size="11"')+`<path d="M${xx},62V${base}" stroke="#e6e9f2"/>`}
  const medidas=[['Personas con amputaciones evaluadas',2277,'#4b55ff','Personas valoradas en rehabilitación'],['Prótesis colocadas',502,'#9b8bc4','Prótesis colocadas y reportadas']];
  medidas.forEach(([etiqueta,valor,color,detalle],i)=>{
    const y=arriba+i*fila,borde=x(valor);
    s+=`<g class="prosRow" role="group" tabindex="0" aria-label="${etiqueta}: ${nf(valor)}" data-tip-serie="Evaluación y prótesis · sept 2024 – may 2026" data-tip-titulo="${etiqueta}" data-tip="${nf(valor)} ${detalle.toLowerCase()}. Conteo independiente: no se lee como cobertura, tasa ni déficit frente al otro indicador.">`;
    s+=txt(8,y+5,etiqueta,'font-size="13"');
    s+=`<rect x="${izq}" y="${y-13}" width="${largo}" height="26" rx="6" fill="#f0f1f7"/>`;
    s+=`<rect x="${izq}" y="${y-13}" width="${Math.max(2,borde-izq)}" height="26" rx="6" fill="${color}"/>`;
    s+=txt(borde+14,y+6,nf(valor),'font-size="15" font-weight="600" style="fill:#293447"');
    s+='</g>';
  });
  s+='</svg><p class="muted">Mismo periodo de reporte (septiembre de 2024 – mayo de 2026), pero universos no confirmados como una misma cohorte: las barras comparan dos conteos publicados y no permiten calcular una tasa de acceso, una cobertura ni un déficit entre ambos.</p>';
  $('#prosthetics').innerHTML=s;
  const filas=[...$('#prosthetics').querySelectorAll('.prosRow')];
  filas.forEach((g,i)=>g.addEventListener('keydown',e=>{
    const salto=e.key==='ArrowDown'||e.key==='ArrowRight'?1:e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:0;
    if(!salto)return;
    const destino=filas[Math.min(filas.length-1,Math.max(0,i+salto))];
    if(destino){e.preventDefault();destino.focus()}
  }));
}
prostheticsChart();
function engancharMapas(a,b){
  const svgs=[...$('#pairedMaps').querySelectorAll('svg')];
  [[a,svgs[0]],[b,svgs[1]]].forEach(([ev,svg])=>{
    if(!svg)return;
    const puntos=[...svg.querySelectorAll('circle.siteDot')].map(c=>({x:+c.getAttribute('cx'),y:+c.getAttribute('cy'),k:(c.getAttribute('data-k')||'').trim()}));
    if(!puntos.length)return;
    let pendiente=false,ultimo=null;
    const pintar=()=>{pendiente=false;if(!ultimo||!window.TIP)return;
      const r=svg.getBoundingClientRect();
      const ancho=svg.viewBox.baseVal.width||520,altoSvg=svg.viewBox.baseVal.height||650;
      const px=(ultimo.clientX-r.left)/r.width*ancho,py=(ultimo.clientY-r.top)/r.height*altoSvg;
      let cerca=14*14,elegido=null;
      for(const p of puntos){const d=(p.x-px)**2+(p.y-py)**2;if(d<cerca){cerca=d;elegido=p}}
      if(!elegido){window.TIP.ocultar();return}
      window.TIP.html({serie:'Sitio del archivo UNOSAT',
        titulo:elegido.k===''?'Sin clase en esta evaluación':'Clase: '+names[elegido.k],
        detalle:'<p>Evaluación '+(ev+1)+' · '+H.eval_dates[ev]+'</p><p class="gTipHint">Cada punto es un sitio de la muestra fija de 10 000; la posición es geográfica.</p>',
        fuente:'UNOSAT · producto 4213 · '+H.eval_dates[ev],
        punto:{x:ultimo.clientX,y:ultimo.clientY}})};
    svg.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;ultimo=e;if(!pendiente){pendiente=true;requestAnimationFrame(pintar)}});
    svg.addEventListener('pointerdown',e=>{ultimo=e;pintar()});
    svg.addEventListener('pointerleave',()=>{if(window.TIP)window.TIP.ocultar()});
  });
}
function mapSvg(ev){let w=520,h=650,cos=Math.cos(31.4*Math.PI/180),s=1350,ox=48,oy=38,X=x=>ox+(x-34.20)*cos*s,Y=y=>oy+(31.62-y)*s;let out=svgStart(w,h,'Gaza: clasificaciones de sitios por evaluación')+`<rect width="520" height="650" fill="#eef1f9" rx="9"/>`;H.boundary.features.forEach(f=>{let polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(let rings of polys){let d=rings.map(r=>r.map((p,i)=>(i?'L':'M')+X(p[0])+','+Y(p[1])).join('')+'Z').join('');out+=`<path d="${d}" fill="#fff" stroke="#8491a8" stroke-width="1.3"/>`}});DATA.points.forEach(p=>{let k=p.path[ev];out+=`<circle class="siteDot" data-k="${k==null?'':k}" cx="${X(p.x)}" cy="${Y(p.y)}" r="1.25" fill="${damageColors[k]||'#e3e6ee'}" opacity="${k?.7:.3}"/>`});out+=txt(25,105,'Mar Mediterráneo','font-style="italic"')+txt(425,35,'N ↑')+txt(380,390,'Israel')+txt(20,605,'Egipto');[['Gaza',34.46,31.51],['Deir al Balah',34.35,31.42],['Khan Yunis',34.30,31.34],['Rafah',34.25,31.28]].forEach(([n,x,y])=>out+=`<circle cx="${X(x)}" cy="${Y(y)}" r="3" fill="#354052"/>`+txt(X(x)+7,Y(y)-6,n,'style="paint-order:stroke;stroke:white;stroke-width:3px;fill:#293447"'));out+=`<path d="M370,600h71M370,596v8M441,596v8" stroke="#293447"/>`+txt(380,622,'≈ 5 km');return out+'<\/svg>'}
[ '#mapA','#mapB'].forEach(id=>$(id).innerHTML=H.eval_dates.map((d,i)=>`<option value="${i}">${i+1} · ${d}</option>`).join(''));$('#mapA').value='0';$('#mapB').value='13';function paired(){let a=+$('#mapA').value,b=+$('#mapB').value;$('#pairedMaps').innerHTML=[a,b].map(ev=>`<div><h3>${H.eval_dates[ev]}</h3>${mapSvg(ev)}<small>${nf(DATA.points.filter(p=>p.path[ev]).length)} sitios con clase en la muestra · evaluación ${ev+1}</small></div>`).join('');$('#evoLegend').innerHTML=Object.keys(names).map(k=>`<span><i class="dot" style="background:${damageColors[k]}"></i>${names[k]}</span>`).join('');engancharMapas(a,b)}$('#mapA').onchange=paired;$('#mapB').onchange=paired;paired();
$('#timeline').innerHTML=H.events.map((e,i)=>`<article class="event"><div class="eventdate">${e[0]}<b>${String(i+1).padStart(2,'0')}</b></div><div><h3>${e[1]}</h3><p>${e[2]}</p><a href="${e[3]}" target="_blank" rel="noopener">Documento de referencia ↗</a></div></article>`).join('');
tab('humano');





