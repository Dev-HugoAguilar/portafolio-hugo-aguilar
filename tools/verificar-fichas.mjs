/** Browser verification v4. Default: deterministic, test-only empty/error API.
 * npm ci && npx playwright install chromium; npm run serve; npm run verificar
 * --piloto: one project. --api-real: additionally require ready from a real API.
 * --fallo-controlado: exercises fatal-report persistence. No text classifiers.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {emptyApi,fixturePaths} from './qa/empty-api.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const BASE=process.env.SITE_BASE||'http://127.0.0.1:8000', API=process.env.API_BASE||'http://127.0.0.1:8010';
const OUTPUT=path.resolve(process.env.VERIFICATION_OUTPUT||path.join(ROOT,'artifacts/verificacion-fichas.json'));
const PILOT=process.argv.includes('--piloto'), REAL=process.argv.includes('--api-real');
const VPS={escritorio:{width:1440,height:900},movil:{width:390,height:844}};
const IDS=['comparativo-bancario','atlas-vial','marketing-clientes','pulso-comercial'];
const FIELDS={problema:'Problema',destinatario:'Destinatario',contribucion:'Mi contribución',fuentes:'Fuentes y datos',metodo:'Método y decisiones técnicas',resultados:'Resultados publicados',limitaciones:'Limitaciones'};
const norm=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const runId=crypto.randomUUID(), start=Date.now(), rows=[], plan=[], contexts=new Set();
let browser,fatal=null,git={},projects=[];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const routeOf=p=>`#/area/${p.area}/${p.id}`;
function add(p,vp,scenario,run){plan.push({p,vp,scenario,run});}
async function open(vp,initial='empty'){
 const ctx=await browser.newContext({viewport:VPS[vp]});contexts.add(ctx);let mode=initial;
 const page=await ctx.newPage(), errors=[], network=[], missing=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')network.push({type:'console',text:m.text()});});
 page.on('requestfailed',r=>network.push({type:'requestfailed',url:r.url(),reason:r.failure()?.errorText}));
 await ctx.addInitScript(api=>{
  window.PORTFOLIO_BANCA_API=window.PORTAFOLIO_BANCA_API=api+'/api/v1/cnbv/banca-multiple';
  window.PORTFOLIO_ATLAS_API=api+'/api/v1/atlas-vial';
  window.PORTFOLIO_MARKETING_API=api+'/api/v1/marketing';
  window.PORTFOLIO_WALMEX_API=api+'/api/v1/walmex';
 },API);
 await ctx.route('**/api/v1/**',async route=>{
  if(mode==='real')return route.continue();
  if(mode==='error')return route.abort('failed');
  const fixture=emptyApi(route.request().url());
  if(fixture!==null)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)});
  missing.push(new URL(route.request().url()).pathname);
  return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'API no disponible en este escenario de prueba.'})});
 });
 return {page,errors,network,missing,mode:value=>{mode=value;},close:async()=>{await ctx.close();contexts.delete(ctx);}};
}
async function editorial(page,p){
 const [title,...subtitle]=p.titulo.split(/\s+—\s+/);
 await page.waitForFunction(value=>document.querySelector('#project-view-title')?.textContent.trim()===value,title,{timeout:12000});
 assert.equal(norm(await page.locator('#project-view-title').innerText()),norm(title));
 assert.equal(norm(await page.locator('.view-subtitle').count() ? await page.locator('.view-subtitle').innerText() : ''),norm(subtitle.join(' — ')));
 const actual=await page.evaluate(()=>({hash:location.hash,fields:[...document.querySelectorAll('dt')].map(dt=>[dt.textContent.trim(),dt.nextElementSibling?.textContent??'']),host:!!document.querySelector('[data-testid="hallazgos-host"]'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
 assert.equal(actual.hash,routeOf(p),'Ruta incorrecta');
 const fields=Object.fromEntries(actual.fields.map(([k,v])=>[k,norm(v)]));
 for(const[key,label]of Object.entries(FIELDS)){assert.ok(Object.hasOwn(fields,label),`Falta ${label}`);assert.equal(fields[label],norm(p[key]),`Texto diferente: ${label}`);}
 assert.ok(fields.Tecnologías?.length,'Faltan tecnologías');
 assert.equal(actual.host,IDS.includes(p.id),'Host incorrecto');
 assert.ok(actual.overflow<=1,`Desbordamiento: ${actual.overflow}px`);
}
async function state(page,expected){
 await page.waitForFunction(value=>{const h=document.querySelector('[data-testid="hallazgos-host"]');const n=h?.querySelector('[data-state]');return n?.getAttribute('data-state')===value&&n.textContent.trim().length>0;},expected,{timeout:20000});
 return page.locator('[data-testid="hallazgos-host"]').innerText();
}
try{
 git={sha:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{cwd:ROOT,encoding:'utf8'}).trim()};
 const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(ROOT,'dist/content.js'),'utf8'),c,{timeout:1000});
 projects=c.window.PORTAFOLIO.areas.flatMap(a=>a.proyectos.map(p=>({...p,area:a.id})));
 assert.equal(projects.length,20,'Registro incompleto');
 if(PILOT)projects=[projects.find(p=>p.id==='comparativo-bancario')];
 for(const p of projects)for(const vp of Object.keys(VPS)){
  add(p,vp,'entrada-directa',async()=>{const t=await open(vp);try{await t.page.goto(BASE+'/'+routeOf(p),{waitUntil:'domcontentloaded'});await editorial(t.page,p);assert.deepEqual(t.errors,[],'Excepción del aplicativo');return{api:'simulada-vacia-o-no-disponible',network:t.network,requestsWithoutFixture:t.missing};}finally{await t.close();}});
  add(p,vp,'spa-clic-atras-adelante',async()=>{const t=await open(vp);try{
   const area=`#/area/${p.area}`;await t.page.goto(BASE+'/'+area,{waitUntil:'domcontentloaded'});
   await t.page.locator(`[data-proyecto="${p.id}"] .card-hit`).click();await editorial(t.page,p);
   await t.page.goBack();await t.page.waitForFunction(h=>location.hash===h&&!!document.querySelector('.project-card'),area);
   await t.page.goForward();await editorial(t.page,p);assert.deepEqual(t.errors,[],'Excepción al navegar');return{api:'simulada-vacia-o-no-disponible',network:t.network};
  }finally{await t.close();}});
 }
 for(const p of projects.filter(p=>IDS.includes(p.id)))for(const vp of Object.keys(VPS)){
  for(const scenario of ['error','empty','retry-empty'])add(p,vp,scenario,async()=>{const t=await open(vp,scenario==='empty'?'empty':'error');try{
   await t.page.goto(BASE+'/'+routeOf(p),{waitUntil:'domcontentloaded'});
   if(scenario==='retry-empty'){await state(t.page,'error');t.mode('empty');await t.page.locator('[data-testid="hallazgos-host"]').getByRole('button',{name:'Reintentar',exact:true}).click();}
   const expected=scenario==='error'?'error':'empty',text=await state(t.page,expected);
   assert.ok(!/NaN|Infinity|undefined/.test(text),'Resultado inválido');assert.deepEqual(t.errors,[],'Excepción del aplicativo');assert.deepEqual(t.missing,[],'Endpoint sin fixture explícita');
   return{expected,observed:expected,text,api:'simulada',network:t.network};
  }finally{await t.close();}});
  if(REAL)add(p,vp,'ready-api-real',async()=>{const t=await open(vp,'real');try{await t.page.goto(BASE+'/'+routeOf(p),{waitUntil:'domcontentloaded'});const text=await state(t.page,'ready');assert.deepEqual(t.errors,[]);return{api:'real',text,network:t.network};}finally{await t.close();}});
 }
 if(process.argv.includes('--fallo-controlado'))throw new Error('Fallo controlado: prueba de persistencia del reporte');
 const {chromium}=await import('@playwright/test');browser=await chromium.launch({headless:true});
 for(const test of plan){const began=Date.now();try{const evidence=await test.run();rows.push({project_id:test.p.id,viewport:test.vp,escenario:test.scenario,estado:'APROBADO',duration_ms:Date.now()-began,evidence});}catch(e){rows.push({project_id:test.p.id,viewport:test.vp,escenario:test.scenario,estado:'FALLIDO',duration_ms:Date.now()-began,error:String(e.stack||e)});}console.log(`${rows.at(-1).estado}: ${test.p.id} ${test.vp} ${test.scenario}`);}
}catch(e){fatal=String(e.stack||e);}
finally{
 for(const ctx of contexts)await ctx.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});
 const summary=rows.reduce((s,r)=>({...s,[r.estado]:(s[r.estado]||0)+1}),{}),missing=plan.length-rows.length;
 const report={run_id:runId,version:'4.0.0',site:BASE,api:API,git,date:new Date().toISOString(),duration_ms:Date.now()-start,status:fatal?'ABORTADO':'COMPLETADO',error_fatal:fatal,expected:plan.length,executed:rows.length,missing,real_api:REAL?'solicitada; consultar filas':'NO EJECUTADO: usar --api-real con API y datos accesibles',verifier_sha256:hash(fileURLToPath(import.meta.url)),fixtures_sha256:hash(path.join(ROOT,'tools/qa/empty-api.mjs')),fixturePaths,summary,rows};
 fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});fs.writeFileSync(OUTPUT+'.tmp',JSON.stringify(report,null,2));fs.renameSync(OUTPUT+'.tmp',OUTPUT);
 console.log(JSON.stringify({output:OUTPUT,expected:plan.length,executed:rows.length,summary,fatal}));if(fatal||missing||!plan.length||summary.FALLIDO)process.exitCode=1;
}
