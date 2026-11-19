(async()=>{
  const scenarioNode=document.getElementById("scenario-data");
  const DATA=scenarioNode?JSON.parse(scenarioNode.textContent):await fetch("data/scenarios.json").then(r=>r.json());
  const $=s=>document.querySelector(s),fmt=n=>n.toLocaleString("es-MX"),pct=(a,b)=>b?100*a/b:0;
  const cities=Object.fromEntries(DATA.cities.map(c=>[c.id,c]));
  let incident="none",filter="all",selected=null,showFleet=true,zoom=1,panX=0,panY=0,projection,layer,networkLayer,drag=null,truckTimer=null,trucksPaused=false,simulationTime=0;
  const incidentLookup=Object.fromEntries(DATA.incidents.map(x=>[x.id,x]));
  const MAP_BOUNDS=[[-118,14],[-86,33.5]];
  const clones=()=>DATA.corridors.map(c=>{
    const d={...c};
    if(incidentLookup[incident].affected_corridors.includes(c.id)){
      const shift=incident==="closure"?Math.max(3,Math.round(c.shipments*.10)):Math.max(2,Math.round(c.shipments*.08));
      d.on_time=Math.max(0,d.on_time-shift);d.delayed+=shift;
      if(incident==="storm"){const riskShift=Math.max(1,Math.round(d.shipments*.025));d.delayed=Math.max(0,d.delayed-riskShift);d.at_risk+=riskShift}
    }
    return d;
  });
  function visibleData(){
    const all=clones();
    return all.map(d=>{
      d.f_on=filter==="all"||filter==="on_time"?d.on_time:0;
      d.f_late=filter==="all"||filter==="delayed"?d.delayed:0;
      d.f_risk=filter==="all"||filter==="at_risk"?d.at_risk:0;
      d.visible=d.f_on+d.f_late+d.f_risk;
      return d;
    }).filter(d=>d.visible>0);
  }
  function totalStats(rows){return rows.reduce((a,r)=>({shipments:a.shipments+r.visible,denominator:a.denominator+r.visible,on:a.on+r.f_on,late:a.late+r.f_late,risk:a.risk+r.f_risk}),{shipments:0,denominator:0,on:0,late:0,risk:0})}
  function linePath(nodeIds){return d3.line().curve(d3.curveCatmullRom.alpha(.5))(nodeIds.map(id=>projection(cities[id].coordinates)))}
  function segmentPath(edge){const a=projection(cities[edge.a].coordinates),b=projection(cities[edge.b].coordinates),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,sign=[...edge.key].reduce((n,c)=>n+c.charCodeAt(0),0)%2?1:-1,bend=Math.min(10,len*.055)*sign,mx=(a[0]+b[0])/2-dy/len*bend,my=(a[1]+b[1])/2+dx/len*bend;return`M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`}
  function statusColor(d){
    if(filter==="on_time")return"#4c57ff";if(filter==="delayed")return"#e98239";if(filter==="at_risk")return"#a36bd3";
    const on=pct(d.on_time,d.shipments),risk=pct(d.at_risk,d.shipments);
    return risk>=7?"#a36bd3":on<84?"#e98239":"#4c57ff";
  }
  let glMap,mapReady=false,roadData,roadIndex,markers=[],fleetFrame,clockLast=0,baseZoom=null,selectionMarker=null,regionMarkers=[];
  const fc=features=>({type:'FeatureCollection',features});
  async function drawMap(){
    const embedded=document.getElementById('roads-data'),world=document.getElementById('world-data');
    roadData=embedded?JSON.parse(embedded.textContent):await fetch('data/roads.geojson').then(r=>r.json());
    const land=world?JSON.parse(world.textContent):await fetch('world.geojson').then(r=>r.json());
    roadIndex=new Map(roadData.features.map(f=>[f.properties.key,f]));
    try{glMap=new maplibregl.Map({container:'map',style:{version:8,sources:{land:{type:'geojson',data:land},roads:{type:'geojson',data:roadData},operation:{type:'geojson',data:fc([])},selection:{type:'geojson',data:fc([])}},layers:[{id:'water',type:'background',paint:{'background-color':'#f5f8fc'}},{id:'land',type:'fill',source:'land',paint:{'fill-color':['case',['==',['get','name'],'Mexico'],'#e9eef5','#f1f4f8']}},{id:'borders',type:'line',source:'land',paint:{'line-color':'#becbdd','line-width':.8}},{id:'road-casing',type:'line',source:'roads',paint:{'line-color':'#fff','line-width':4}},{id:'road-reference',type:'line',source:'roads',paint:{'line-color':'#cbd2df','line-width':1}},{id:'operation',type:'line',source:'operation',paint:{'line-color':['get','color'],'line-width':['get','width'],'line-opacity':.85}},{id:'selection-halo',type:'line',source:'selection',paint:{'line-color':'#fff','line-width':7}},{id:'selection',type:'line',source:'selection',paint:{'line-color':'#4c57ff','line-width':4.2}}]},center:[-102,24],zoom:4,minZoom:1,maxZoom:14,scrollZoom:false,attributionControl:false,dragRotate:false});}
    catch(e){$('#map').innerHTML='<p class="map-error">MapLibre requiere WebGL disponible en el navegador. Activa la aceleración gráfica para abrir el mapa.</p>';render();return}
    glMap.addControl(new maplibregl.AttributionControl({customAttribution:'© OpenStreetMap contributors · OSRM (automóvil) · Natural Earth'}),'bottom-right');
    glMap.on('load',()=>{
      mapReady=true;
      glMap.fitBounds(MAP_BOUNDS,{padding:55,duration:0});
      baseZoom=glMap.getZoom();
      glMap.setMinZoom(Math.max(1,baseZoom-1));
      glMap.setMaxZoom(baseZoom+3);
      updateZoomLabel();installWheelZoom();addRegionLabels();renderMap();
    });
    glMap.on('zoom',updateZoomLabel);
    glMap.on('click','operation',e=>{hideTooltip();const ids=JSON.parse(e.features[0].properties.routes);if(ids.length)selectCorridor(ids[0])});
    glMap.on('mousemove','operation',e=>{const p=e.features[0].properties;showEdgeTooltip(e,p)});
    glMap.on('mouseenter','operation',()=>glMap.getCanvas().style.cursor='pointer');glMap.on('mouseleave','operation',()=>{glMap.getCanvas().style.cursor='';hideTooltip()});
    $('#zoomIn').onclick=()=>zoomBy(.5);$('#zoomOut').onclick=()=>zoomBy(-.5);$('#zoomReset').onclick=resetMapView;
    render();
  }
  function updateZoomLabel(){if(!glMap||baseZoom===null)return;const percent=Math.max(1,Math.round(100*Math.pow(2,glMap.getZoom()-baseZoom)));$('#zoomLabel').textContent=percent+'%'}
  function zoomBy(delta){if(!glMap)return;const next=Math.max(glMap.getMinZoom(),Math.min(glMap.getMaxZoom(),glMap.getZoom()+delta));glMap.easeTo({zoom:next,duration:180})}
  function resetMapView(){if(!glMap)return;glMap.fitBounds(MAP_BOUNDS,{padding:55,duration:350})}
  function installWheelZoom(){const container=$('#map');container.addEventListener('wheel',event=>{if(!glMap)return;const z=glMap.getZoom(),min=glMap.getMinZoom(),max=glMap.getMaxZoom();if((event.deltaY<0&&z>=max-.001)||(event.deltaY>0&&z<=min+.001))return;event.preventDefault();event.stopPropagation();const rect=container.getBoundingClientRect(),point=[event.clientX-rect.left,event.clientY-rect.top],step=Math.max(-1,Math.min(1,-event.deltaY*.0018)),next=Math.max(min,Math.min(max,z+step));if(next!==z)glMap.easeTo({zoom:next,around:glMap.unproject(point),duration:0})},{passive:false,capture:true})}
  function addRegionLabels(){regionMarkers.forEach(m=>m.remove());regionMarkers=[];[['MÉXICO',[-104.2,28.1]],['GOLFO DE MÉXICO',[-93.2,25.1]],['OCÉANO PACÍFICO',[-111.2,16.6]]].forEach(([name,coordinates])=>{const el=document.createElement('div');el.className='gl-region';el.textContent=name;regionMarkers.push(new maplibregl.Marker({element:el}).setLngLat(coordinates).addTo(glMap))});const sync=()=>{const hide=glMap.getZoom()>baseZoom+1.25;regionMarkers.forEach(m=>m.getElement().classList.toggle('is-hidden',hide))};glMap.on('zoom',sync);sync()}
  function routeCoordinates(r){let coords=[];for(let i=0;i<r.route_nodes.length-1;i++){const a=r.route_nodes[i],b=r.route_nodes[i+1],f=roadIndex.get([a,b].sort().join('|'));if(!f)continue;const part=f.properties.a===a?f.geometry.coordinates:[...f.geometry.coordinates].reverse();coords.push(...part)}return coords}
  function renderMap(){
    if(!glMap||!mapReady)return;
    const rows=visibleData(),edges=new Map();
    rows.forEach(r=>{for(let i=0;i<r.route_nodes.length-1;i++){const key=[r.route_nodes[i],r.route_nodes[i+1]].sort().join('|');if(!edges.has(key))edges.set(key,{visible:0,shipments:0,on_time:0,delayed:0,at_risk:0,routes:[]});const e=edges.get(key);['shipments','on_time','delayed','at_risk'].forEach(k=>e[k]+=r[k]);e.visible+=r.visible;e.routes.push(r.id)}});
    const max=Math.max(1,...[...edges.values()].map(e=>e.visible));
    glMap.getSource('operation').setData(fc([...edges].map(([key,e])=>({...roadIndex.get(key),properties:{color:statusColor(e),width:1.1+2.4*Math.sqrt(e.visible/max),routes:JSON.stringify(e.routes),a:key.split('|')[0],b:key.split('|')[1],visible:e.visible,routeCount:e.routes.length}}))));
    const chosen=rows.find(r=>r.id===selected),chosenCoords=chosen?routeCoordinates(chosen):[];
    glMap.getSource('selection').setData(fc(chosen?[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:chosenCoords}}]:[]));
    if(selectionMarker){selectionMarker.remove();selectionMarker=null}
    if(chosen&&chosenCoords.length>1){const arrowAt=Math.max(1,Math.floor(chosenCoords.length*.9)),a=chosenCoords[arrowAt-1],b=chosenCoords[arrowAt],angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI,el=document.createElement('div');el.className='gl-route-arrow';el.innerHTML='<i></i>';el.style.setProperty('--angle',angle+'deg');selectionMarker=new maplibregl.Marker({element:el,offset:[8,-8]}).setLngLat(b).addTo(glMap)}
    markers.forEach(m=>m.remove());markers=[];cancelAnimationFrame(fleetFrame);
    const labelPositions={tij:['right',-14],her:['right',0],chh:['right',-10],mty:['right',-10],tam:['right',12],slp:['left',-10],zac:['left',-14],ags:['left',14],qro:['right',12],leo:['right',-12],gdl:['left',10],mex:['right',-12],pue:['right',12],ver:['right',-8],oax:['left',12],tgz:['right',10],tap:['left',10]},minorLabels=new Set(['tam','slp','zac','ags','qro','leo','pue','oax','tgz']);
    DATA.cities.forEach(c=>{const el=document.createElement('button'),side=labelPositions[c.id]||['right',0],dot=document.createElement('i'),label=document.createElement('span');el.className='gl-hub '+(c.role==='terminal'?'is-terminal':'is-hub')+(minorLabels.has(c.id)?' is-minor':'');el.title=c.name;el.setAttribute('aria-label',(c.role==='terminal'?'Terminal ':'Hub ')+c.name);label.textContent=c.name;label.style.top=(4.5+side[1])+'px';if(side[0]==='left')label.classList.add('label-left');el.append(dot,label);el.onclick=()=>{const r=rows.find(r=>r.origin===c.id||r.destination===c.id);if(r)selectCorridor(r.id)};markers.push(new maplibregl.Marker({element:el}).setLngLat(c.coordinates).addTo(glMap))});
    const fleet=[];if(showFleet)rows.forEach((r,ri)=>{const n=Math.max(1,Math.round(18*r.shipments/DATA.network.shipment_count));for(let i=0;i<n;i++){const status=truckStatus(r,i,ri);if(filter!=='all'&&filter!==status)continue;const velocity=status==='delayed'?.000002:status==='at_risk'?.000003:.000004,el=document.createElement('button'),t={d:r,routeIndex:ri,i,status,velocity,phase:(i+.4)/n+ri*.137};el.className='gl-truck '+status;el.innerHTML='<span class="truck-shape" aria-hidden="true"></span>';el.title='Unidad virtual · '+status;el.setAttribute('aria-label',`Camión virtual ${status==='delayed'?'con retraso':status==='at_risk'?'en riesgo':'en ventana'} · ${cities[r.origin].name} a ${cities[r.destination].name}`);el.onclick=event=>{event.stopPropagation();showTruck(t)};const marker=new maplibregl.Marker({element:el}).setLngLat(cities[r.origin].coordinates).addTo(glMap);markers.push(marker);const coords=routeCoordinates(r),dist=[0];for(let k=1;k<coords.length;k++)dist.push(dist[k-1]+Math.hypot((coords[k][0]-coords[k-1][0])*Math.cos(coords[k][1]*Math.PI/180),coords[k][1]-coords[k-1][1]));fleet.push({marker,coords,dist,t})}});
    if(!fleet.some(f=>f.t.status==='at_risk')){const f=fleet.find(x=>x.t.d.at_risk>0);if(f){f.t.status='at_risk';f.t.velocity=.000003;const el=f.marker.getElement(),r=f.t.d;el.className='gl-truck at_risk';el.title='Unidad virtual · at_risk';el.setAttribute('aria-label',`Camión virtual en riesgo · ${cities[r.origin].name} a ${cities[r.destination].name}`)}}
    const fleetEmpty=rows.length===0||(showFleet&&fleet.length===0);
    $('#fleetCount').textContent=fleet.length;
    $('#fleetToggle').disabled=fleetEmpty;
    $('#fleetToggle').textContent=fleetEmpty?'Sin unidades en este filtro':showFleet?'Ocultar flota':'Mostrar flota';
    $('#fleetPause').hidden=!showFleet||fleet.length===0;$('#fleetPause').textContent=trucksPaused?'Reanudar':'Pausar';$('.live-indicator').classList.toggle('paused',trucksPaused);
    clockLast=0;if(!fleet.length)return;
    function tick(now){if(clockLast&&!trucksPaused)simulationTime+=now-clockLast;clockLast=now;fleet.forEach(f=>{const target=((f.t.phase+simulationTime*f.t.velocity)%1)*f.dist.at(-1);let lo=0,hi=f.dist.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(f.dist[mid]<target)lo=mid+1;else hi=mid}const k=Math.max(1,lo),a=f.coords[k-1],b=f.coords[k],t=(target-f.dist[k-1])/(f.dist[k]-f.dist[k-1]||1);f.marker.setLngLat([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])});fleetFrame=requestAnimationFrame(tick)}fleetFrame=requestAnimationFrame(tick);
  }
  function truckStatus(d,index,routeIndex){const riskCorridorId=DATA.corridors.slice().sort((a,b)=>b.at_risk/b.shipments-a.at_risk/a.shipments)[0]?.id;if(index===0&&d.id===riskCorridorId&&d.at_risk>0)return"at_risk";const roll=(index*37+routeIndex*19)%100,on=pct(d.on_time,d.shipments),late=pct(d.delayed,d.shipments);return roll<on?"on_time":roll<on+late?"delayed":"at_risk"}
  function drawTrucks(routes){
    const allRows=routes.data(),rows=showFleet?allRows:selected?allRows.filter(d=>d.id===selected):[],fleet=[];
    rows.forEach((d,routeIndex)=>{const n=showFleet?Math.max(1,Math.round(18*d.shipments/DATA.network.shipment_count)):Math.min(3,Math.max(2,Math.round(18*d.shipments/DATA.network.shipment_count)));for(let i=0;i<n;i++){const status=truckStatus(d,i,routeIndex);if(filter!=="all"&&filter!==status)continue;fleet.push({d,routeIndex,i,n,status,phase:(i+.4)/n+routeIndex*.137,velocity:status==="delayed"?.000010:status==="at_risk"?.000014:.000020})}});
    const truckLayer=networkLayer.append("g").attr("class","truck-layer").attr("aria-label","Camiones virtuales en movimiento");
    const marks=truckLayer.selectAll("g.truck").data(fleet).join("g").attr("class",d=>`truck truck-${d.status}`).attr("role","img").attr("aria-label",d=>`Camión virtual ${d.status==="delayed"?"con retraso":d.status==="at_risk"?"en riesgo":"en ventana"} · ${cities[d.d.origin].name} a ${cities[d.d.destination].name}`);
    marks.attr("tabindex",0).style("pointer-events","all").style("cursor","pointer").on("click",(e,t)=>{e.stopPropagation();showTruck(t)}).on("keydown",(e,t)=>{if(e.key==="Enter"){e.preventDefault();showTruck(t)}});
    marks.filter(d=>d.status==="delayed").append("circle").attr("class","truck-pulse").attr("r",6.5);
    marks.append("path").attr("class","truck-body").attr("d","M-5.4 -2.7H.8V2.6H-5.4ZM1.2 -2.2H3L4.5 -.4V2.6H1.2Z");
    marks.append("circle").attr("class","truck-wheel").attr("cx",-3.8).attr("cy",2.25).attr("r",.8);
    marks.append("circle").attr("class","truck-wheel").attr("cx",3.25).attr("cy",2.25).attr("r",.8);
    const byId=new Map(routes.nodes().map(el=>[el.__data__.id,el]));
    if(truckTimer){truckTimer.stop();truckTimer=null}
    const total=fleet.length,fleetEmpty=showFleet&&total===0;$("#fleetCount").textContent=total;$("#fleetToggle").textContent=fleetEmpty?"Sin unidades en este filtro":showFleet?"Ocultar flota":selected?"Ver unidades del corredor":"Mostrar flota";$("#fleetToggle").disabled=fleetEmpty;$("#fleetPause").hidden=total===0;$("#fleetPause").textContent=trucksPaused?"Reanudar":"Pausar";$(".live-indicator").classList.toggle("paused",trucksPaused);
    if(!total)return;
    let previous=0;truckTimer=d3.timer(elapsed=>{const delta=elapsed-previous;previous=elapsed;if(!trucksPaused)simulationTime+=delta;marks.each(function(t){const route=byId.get(t.d.id);if(!route)return;const len=route.getTotalLength(),pos=((t.phase+simulationTime*t.velocity)%1)*len,p=route.getPointAtLength(pos),ahead=route.getPointAtLength(Math.min(len,pos+2)),angle=Math.atan2(ahead.y-p.y,ahead.x-p.x)*180/Math.PI;d3.select(this).attr("data-x",p.x).attr("data-y",p.y).attr("data-angle",angle).attr("transform",`translate(${p.x},${p.y}) rotate(${angle}) scale(${1/zoom})`)})});
  }
  function showTruck(t){const progress=((t.phase+simulationTime*t.velocity)%1+1)%1;selected=t.d.id;render();$("#laneDetail").innerHTML=`<div class="detail-kicker">UNIDAD VIRTUAL · MUESTRA</div><div class="detail-title">KC-${String(t.routeIndex*10+t.i+1).padStart(3,"0")}</div><p>${cities[t.d.origin].name} → ${cities[t.d.destination].name}</p><div class="detail-stats"><span><b>${Math.round(progress*100)}%</b>avance simulado</span><span><b>${t.status==="delayed"?45:t.status==="at_risk"?20:0} min</b>demora del escenario</span></div><p class="muted">Posición y demora sintéticas. Selecciona otro corredor para volver a su resumen.</p>`;}
  function installMapEvents(svg){
    svg.on("wheel",function(event){const [px,py]=d3.pointer(event,this),unit=event.deltaMode===1?16:event.deltaMode===2?this.clientHeight:1,delta=event.deltaY*unit,next=Math.max(.75,Math.min(8,zoom*Math.exp(-delta*.00135)));if(next===zoom)return;event.preventDefault();event.stopPropagation();zoomAt(next,px,py)},{passive:false});
    svg.on("dblclick",function(event){event.preventDefault();const [px,py]=d3.pointer(event,this);zoomAt(zoom*1.5,px,py)});
    svg.on("pointerdown",function(event){if(event.target.closest(".truck"))return;event.preventDefault();drag={x:event.clientX,y:event.clientY,x0:panX,y0:panY,scale:1000/this.getBoundingClientRect().width};this.setPointerCapture(event.pointerId)});
    svg.on("pointermove",function(event){if(!drag)return;panX=drag.x0+(event.clientX-drag.x)*drag.scale;panY=drag.y0+(event.clientY-drag.y)*drag.scale;applyTransform()});svg.on("pointerup pointercancel",()=>drag=null);
  }
  function placeTooltip(event,html){const t=$("#mapTooltip"),rect=$("#mapFrame").getBoundingClientRect(),x=event.point?event.point.x:event.clientX-rect.left,y=event.point?event.point.y:event.clientY-rect.top;t.innerHTML=html;t.hidden=false;t.style.left=Math.min(Math.max(8,x+12),rect.width-235)+"px";t.style.top=Math.max(8,Math.min(y-16,rect.height-112))+"px"}
  function showTooltip(event,d){const actual=clones().find(x=>x.id===d.id);placeTooltip(event,`<b>${cities[d.origin].name} → ${cities[d.destination].name}</b><span>${fmt(actual.shipments)} envíos agregados</span><span>${fmt(actual.on_time)} en ventana · ${fmt(actual.delayed)} con demora · ${fmt(actual.at_risk)} en riesgo</span><span>${fmt(actual.km)} km ilustrativos</span>`)}
  function showEdgeTooltip(event,p){const count=Number(p.visible)||0,routeCount=Number(p.routeCount)||0;placeTooltip(event,`<b>${cities[p.a].name} ↔ ${cities[p.b].name}</b><span>${fmt(count)} envíos agregados en este tramo</span><span>Lo comparten ${routeCount} corredores del escenario.</span><span>El total por tramo se superpone entre rutas; no equivale a envíos únicos.</span>`)}
  function hideTooltip(){ $("#mapTooltip").hidden=true }
  function selectCorridor(id,focusRow=false){selected=id;render();if(focusRow){const row=document.querySelector(`[data-row="${id}"]`);if(row)row.focus()}}
  function updateKpis(rows){const s=totalStats(rows),onpct=pct(s.on,s.denominator);$("#kpiTotal").textContent=fmt(s.shipments);$("#kpiLanes").textContent=rows.length;$("#kpiOnTime").textContent=onpct.toFixed(1)+"%";$("#kpiOnDetail").textContent=fmt(s.on)+" de "+fmt(s.denominator)+" envíos en los corredores visibles";$("#kpiRisk").textContent=fmt(s.risk)}
  function drawFlow(rows){
    const svg=d3.select("#flow"),W=660;svg.selectAll("*").remove();
    const top=42,rowH=44,shown=[...rows].sort((a,b)=>b.visible-a.visible).slice(0,7),x0=145,x1=390,x2=505,scale=30/Math.max(1,d3.max(shown,d=>d.visible)||1);
    svg.append("text").attr("x",10).attr("y",18).attr("fill","#8491a8").attr("font-size",8).attr("font-weight",850).text("CORREDOR");svg.append("text").attr("x",x1).attr("y",18).attr("fill","#8491a8").attr("font-size",8).attr("font-weight",850).text("DISTRIBUCIÓN DEL FILTRO");
    svg.append("text").attr("x",x2+12).attr("y",18).attr("fill","#8491a8").attr("font-size",8).attr("font-weight",850).text("ESTADO");
    shown.forEach((d,i)=>{
      const y=top+i*rowH, h=Math.max(6,d.visible*scale),denom=Math.max(1,d.visible),onH=h*d.f_on/denom,lateH=h*d.f_late/denom,riskH=h*d.f_risk/denom;
      svg.append("text").attr("x",10).attr("y",y+h/2+3).attr("fill",d.id===selected?"#4654ed":"#586781").attr("font-size",9).attr("font-weight",d.id===selected?800:650).text(`${cities[d.origin].name} → ${cities[d.destination].name}`);
      const parts=[{v:onH,c:"#4c57ff",label:"on_time"},{v:lateH,c:"#e98239",label:"delayed"},{v:riskH,c:"#a36bd3",label:"at_risk"}];let yy=y;
      parts.forEach(p=>{if(p.v<.5)return;const endY=yy+p.v;svg.append("path").attr("d",`M${x0},${yy} C${x0+90},${yy} ${x1-70},${yy} ${x1},${yy} L${x1},${endY} C${x1-70},${endY} ${x0+90},${endY} ${x0},${endY} Z`).attr("fill",p.c).attr("fill-opacity",.22);svg.append("rect").attr("x",x1).attr("y",yy).attr("width",8).attr("height",Math.max(2,p.v)).attr("rx",3).attr("fill",p.c);yy=endY});
      svg.append("text").attr("x",x0-8).attr("y",y+h/2+3).attr("text-anchor","end").attr("fill","#8491a8").attr("font-size",8).text(d.visible);
    });
    const ly=top+shown.length*rowH+2;[{c:"#4c57ff",l:"En ventana"},{c:"#e98239",l:"Con demora"},{c:"#a36bd3",l:"En riesgo"}].forEach((d,i)=>{svg.append("circle").attr("cx",18+i*112).attr("cy",ly).attr("r",4).attr("fill",d.c);svg.append("text").attr("x",27+i*112).attr("y",ly+3).attr("fill","#7a88a0").attr("font-size",8).text(d.l)});
  }
  function drawScatter(rows){
    const svg=d3.select("#scatter"),W=620,H=390,m={t:28,r:28,b:52,l:58};svg.selectAll("*").remove();
    const x=d3.scaleLinear().domain([0,d3.max(rows,d=>d.visible)*1.12||100]).nice().range([m.l,W-m.r]),y=d3.scaleLinear().domain([55,101]).range([H-m.b,m.t]),r=d3.scaleSqrt().domain([1,d3.max(rows,d=>d.visible)||1]).range([4,15]);
    const g=svg.append("g");g.append("g").attr("transform",`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(5)).call(s=>s.select(".domain").attr("stroke","#ccd5e5")).call(s=>s.selectAll(".tick line").attr("y2",-(H-m.t-m.b)).attr("stroke","#e9edf4")).call(s=>s.selectAll("text").attr("fill","#7b89a3").attr("font-size",8));
    g.append("g").attr("transform",`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d=>d+"%")).call(s=>s.select(".domain").remove()).call(s=>s.selectAll("text").attr("fill","#7b89a3").attr("font-size",8));
    g.append("text").attr("x",W/2).attr("y",H-12).attr("text-anchor","middle").attr("fill","#74829c").attr("font-size",8).text("ENVÍOS AGREGADOS EN EL CORREDOR");g.append("text").attr("transform","rotate(-90)").attr("x",-H/2).attr("y",15).attr("text-anchor","middle").attr("fill","#74829c").attr("font-size",8).text("PORCENTAJE EN VENTANA");
    g.append("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",y(85)).attr("y2",y(85)).attr("stroke","#a8b1c4").attr("stroke-dasharray","4 4");g.append("text").attr("x",W-m.r).attr("y",y(85)-5).attr("text-anchor","end").attr("fill","#8995aa").attr("font-size",8).text("85% guía del escenario");
    const color=d=>pct(d.on_time,d.shipments)>=90?"#4c57ff":pct(d.on_time,d.shipments)>=80?"#a36bd3":"#e98239";
    const points=g.selectAll("g.dot").data(rows).join("g").attr("class","dot").attr("transform",d=>`translate(${x(d.visible)},${y(pct(d.on_time,d.shipments))})`).attr("tabindex",0).attr("role","button").attr("aria-label",d=>`${cities[d.origin].name} a ${cities[d.destination].name}, ${d.visible} envíos visibles, ${pct(d.on_time,d.shipments).toFixed(1)} por ciento en ventana en la red`).style("cursor","pointer").on("click",(e,d)=>selectCorridor(d.id)).on("keydown",(e,d)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectCorridor(d.id,true)}});
    points.append("circle").attr("r",d=>r(d.visible)).attr("fill",color).attr("fill-opacity",.78).attr("stroke",d=>d.id===selected?"#303c54":"#fff").attr("stroke-width",d=>d.id===selected?2.5:1.5);
    points.append("text").attr("x",d=>r(d.visible)+4).attr("y",3).attr("fill","#596781").attr("font-size",7.5).attr("font-weight",700).text(d=>cities[d.origin].name.slice(0,3).toUpperCase()+"–"+cities[d.destination].name.slice(0,3).toUpperCase());
  }
  function renderTable(rows){const tbody=$("#corridorRows");tbody.innerHTML="";[...rows].sort((a,b)=>b.visible-a.visible).forEach(d=>{const tr=document.createElement("tr"),onPct=pct(d.f_on,d.visible);tr.dataset.row=d.id;tr.tabIndex=0;tr.setAttribute("role","row");tr.setAttribute("aria-selected",String(d.id===selected));tr.classList.toggle("selected",d.id===selected);tr.innerHTML=`<td>${cities[d.origin].name} → ${cities[d.destination].name}</td><td>${fmt(d.visible)}</td><td><span class="status-bar"><i style="width:${onPct}%"></i></span>${onPct.toFixed(0)}%</td><td>${fmt(d.f_late)}</td><td>${fmt(d.f_risk)}</td><td>${fmt(d.km)} km*</td>`;tr.onclick=()=>selectCorridor(d.id,true);tr.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectCorridor(d.id,true)}};tbody.append(tr)})}
  function renderLaneDetail(rows){const d=rows.find(x=>x.id===selected),el=$("#laneDetail");if(!d){el.innerHTML='<div class="detail-kicker">CORREDOR SELECCIONADO</div><div class="detail-empty">Selecciona un tramo en el mapa o un corredor de la tabla para abrir su trayecto y desglose.</div>';$("#mapSelected").textContent="Selecciona un tramo o corredor";return}const origin=cities[d.origin],dest=cities[d.destination],scope=filter==="all"?"envíos agregados":"envíos del filtro";el.innerHTML=`<div class="detail-kicker">CORREDOR SELECCIONADO</div><div class="detail-title">${origin.name} → ${dest.name}</div><div class="detail-stats"><span><b>${fmt(d.visible)}</b>${scope}</span><span><b>${fmt(d.f_on)}</b>en ventana</span><span><b>${fmt(d.f_late+d.f_risk)}</b>demora/riesgo</span></div><div class="detail-empty">${fmt(d.km)} km del escenario · corte del fixture 16 nov 2026 · trazo OSM/OSRM de perfil automóvil; no valida carga pesada.</div>`;$("#mapSelected").textContent=`Corredor resaltado · ${origin.name} → ${dest.name}`}
  function renderCopilot(rows){const sorted=[...rows].sort((a,b)=>b.visible-a.visible),top=sorted[0],stats=totalStats(rows),riskTop=[...rows].sort((a,b)=>b.f_risk-a.f_risk)[0];if(!top){$("#copilotText").innerHTML='<strong>Lectura del copiloto simulado:</strong> El filtro actual no deja envíos visibles. Ajusta el estado o el escenario para recuperar la lectura.';$("#reasonTags").innerHTML='<span>0 corredores visibles</span><span>0 envíos</span>';return}let text=`El corredor ${cities[top.origin].name}–${cities[top.destination].name} concentra ${fmt(top.visible)} de los ${fmt(stats.shipments)} envíos de la vista (${pct(top.visible,stats.shipments).toFixed(1)}%). ${riskTop&&riskTop.f_risk?`${cities[riskTop.origin].name}–${cities[riskTop.destination].name} aporta ${fmt(riskTop.f_risk)} envíos en riesgo.`:`No hay envíos en riesgo con el filtro actual.`}`;if(incident!=="none"){const affected=incidentLookup[incident].affected_corridors.length;text+=` La disrupción hipotética toca ${affected} corredores; compara el estado antes y después con el filtro.`}$("#copilotText").innerHTML='<strong>Lectura del copiloto simulado:</strong> '+text;$("#reasonTags").innerHTML=`<span>${rows.length} corredores visibles</span><span>${fmt(stats.shipments)} envíos</span><span>${stats.shipments?pct(stats.on,stats.shipments).toFixed(1):"0.0"}% en ventana</span>`}
  function render(){const rows=visibleData();updateKpis(rows);drawFlow(rows);drawScatter(rows);renderTable(rows);renderLaneDetail(rows);renderCopilot(rows);$("#scenarioChip").textContent=incident==="none"?"ESCENARIO BASE · TODA LA RED":incident==="closure"?"CIERRE SIMULADO · IMPACTO MULTICORREDOR":"DEMORA SIMULADA · ACCESO A VERACRUZ";if(glMap)renderMap()}
  function redrawMap(){networkLayer.selectAll("*").remove();drawNetwork()}
  $("#statusFilter").addEventListener("change",()=>{filter=$("#statusFilter").value;selected=null;render()});
  $("#incident").addEventListener("change",()=>{incident=$("#incident").value;selected=null;const info=incidentLookup[incident];$("#incidentCard").classList.toggle("clear",incident==="none");$("#incidentTitle").textContent=incident==="none"?"Red base":incident==="closure"?"Cierre de corredor":"Acceso con demora";$("#incidentDescription").textContent=incident==="none"?"Todos los corredores se muestran con el volumen y estado del escenario sintético.":incident==="closure"?"La disrupción sintética afecta cinco corredores que usan el eje central. Los envíos se redistribuyen hacia demora.":"La demora sintética afecta tres trayectos hacia Veracruz y el sureste.";render()});
  $("#recalculate").addEventListener("click",()=>{render();const toast=$("#toast");toast.textContent="Vista de red recalculada · " + (incidentLookup[incident].label);toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2300)});
  $("#fleetToggle").onclick=()=>{showFleet=!showFleet;render()};
  $("#fleetPause").onclick=()=>{trucksPaused=!trucksPaused;$("#fleetPause").textContent=trucksPaused?"Reanudar":"Pausar";$(".live-indicator").classList.toggle("paused",trucksPaused)};
  await drawMap();
})();
