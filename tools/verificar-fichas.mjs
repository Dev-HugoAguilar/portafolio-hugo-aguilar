/**
 * Verificación funcional del portafolio (v3).
 *   npm ci && npx playwright install chromium
 *   python -m http.server 8000 --directory dist
 *   node tools/verificar-fichas.mjs [--piloto]
 * Origen por defecto :8000 (autorizado por ALLOWED_ORIGINS de la API).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SITE_BASE || 'http://127.0.0.1:8000';
const API = process.env.API_BASE || 'http://127.0.0.1:8010';
const SALIDA = path.join(ROOT, 'docs', 'verificacion-fichas.json');
const PILOTO = process.argv.includes('--piloto');
const BLOQUES = ['Problema','Destinatario','Mi contribución','Fuentes y datos','Método y decisiones técnicas','Resultados publicados','Limitaciones','Tecnologías'];
const CAMPOS = [['problema','Problema'],['destinatario','Destinatario'],['contribucion','Mi contribución'],['fuentes','Fuentes y datos'],['metodo','Método y decisiones técnicas'],['resultados','Resultados publicados'],['limitaciones','Limitaciones']];
const CON_API = ['comparativo-bancario','atlas-vial','marketing-clientes','pulso-comercial'];
const VERSION = '3.0.0';
const norm = (s) => String(s ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const runId = new Date().toISOString().replace(/[:.]/g,'-');

/* alcance exterior: se usa al construir el reporte */
const filas = [];
const contratoVacio = {};
let errorFatal = null;
let navegador = null;
let sha = '', dirty = false;
try { sha = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(); dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0; } catch { sha = ''; dirty = true; }

const reg = (f) => filas.push({ run_id: runId, sha_sitio: sha, arbol_sucio: dirty, verificador: VERSION, fecha: new Date().toISOString(), api_base: API, ...f });

function clasificar(texto, clase) {
  const t = norm(texto).toLowerCase();
  if (!t) return 'loading';
  if (clase && /aviso--error|error/i.test(clase)) return 'error';
  if (/no se pudo|no se pudieron|no disponible|no responde|error al/i.test(t)) return 'error';
  if (/sin datos|no hay datos|sin registros|no hay registros|vac[ií]o/i.test(t)) return 'empty';
  return 'ready';
}
const leerHost = (page) => page.evaluate(() => {
  const h = document.querySelector('[data-testid="hallazgos-host"]');
  if (!h) return { hay: false, texto: '', clase: '', espera: false };
  const err = h.querySelector('[class*="error"]');
  return { hay: true, texto: h.textContent, clase: err ? err.className : '', espera: /Calculando hallazgos/.test(h.textContent) };
});

async function esperarHost(page, limite = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < limite) {
    const h = await leerHost(page);
    if (!h.hay) return { estado: 'sin-host', texto: '', ms: Date.now() - t0 };
    if (!h.espera) return { estado: clasificar(h.texto, h.clase), texto: norm(h.texto).slice(0, 120), ms: Date.now() - t0 };
    await page.waitForTimeout(250);
  }
  return { estado: 'loading', texto: '', ms: limite };
}

const { chromium } = await import('@playwright/test');
try {
  navegador = await chromium.launch();
  const abrir = async (viewport) => {
    const ctx = await navegador.newContext({ viewport });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    return { ctx, p, errs };
  };

  const s = await abrir({ width: 1440, height: 900 });
  await s.p.goto(BASE + '/#portafolio', { waitUntil: 'networkidle' });
  let registro = await s.p.evaluate(() => {
    const o = [];
    for (const a of window.PORTAFOLIO.areas) for (const x of a.proyectos)
      o.push({ area: a.id, id: x.id, estado: x.estado, campos: { problema: x.problema||'', destinatario: x.destinatario||'', contribucion: x.contribucion||'', fuentes: x.fuentes||'', metodo: x.metodo||'', resultados: x.resultados||'', limitaciones: x.limitaciones||'' }, hallazgos: x.hallazgos ?? null });
    return o;
  });
  await s.ctx.close();
  if (PILOTO) registro = [registro[0]];

  // 1. entrada directa
  for (const [vp, viewport] of [['escritorio',{width:1440,height:900}],['movil',{width:390,height:844}]]) {
    for (const r of registro) {
      const { ctx, p, errs } = await abrir(viewport);
      const ruta = `#/area/${r.area}/${r.id}`;
      await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
      await p.reload({ waitUntil: 'networkidle' }).catch(() => {});
      const d = await p.evaluate(() => ({ pares: [...document.querySelectorAll('dt')].map((n) => ({ k: n.textContent.trim(), v: n.parentElement?.querySelector('dd')?.textContent || '' })), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, host: !!document.querySelector('[data-testid="hallazgos-host"]') }));
      const mapa = Object.fromEntries(d.pares.map((x) => [x.k, norm(x.v)]));
      const faltan = BLOQUES.filter((b) => !d.pares.some((x) => x.k === b));
      const distinto = CAMPOS.filter(([c, et]) => norm(r.campos[c]) && mapa[et] !== norm(r.campos[c])).map(([c]) => c);
      reg({ project_id: r.id, ruta, viewport: vp, escenario: 'entrada-directa', comprobacion: 'bloques+texto-completo', esperado: 'todos los bloques e igualdad exacta', observado: `faltan=${faltan.join(',')||'-'} distinto=${distinto.join(',')||'-'}`, estado: (!faltan.length && !distinto.length) ? 'APROBADO' : 'FALLIDO', evidencia: '', datos: 'content.js' });
      reg({ project_id: r.id, ruta, viewport: vp, escenario: 'entrada-directa', comprobacion: 'sin-desbordamiento', esperado: 'overflow<=1', observado: `overflow=${d.overflow}`, estado: d.overflow <= 1 ? 'APROBADO' : 'FALLIDO', evidencia: '', datos: 'content.js' });
      reg({ project_id: r.id, ruta, viewport: vp, escenario: 'entrada-directa', comprobacion: 'contrato-hallazgos', esperado: `host=${CON_API.includes(r.id)}`, observado: `host=${d.host}`, estado: d.host === CON_API.includes(r.id) ? 'APROBADO' : 'FALLIDO', evidencia: '', datos: 'content.js' });
      const erroresApp = errs.filter((e) => !/\/api\/v1\//.test(e));
      reg({ project_id: r.id, ruta, viewport: vp, escenario: 'entrada-directa', comprobacion: 'consola-de-la-ficha', esperado: '0 errores ajenos a la API', observado: `errores=${erroresApp.length}`, estado: erroresApp.length === 0 ? 'APROBADO' : 'FALLIDO', evidencia: erroresApp.slice(0,2).join(' | '), datos: 'content.js' });
      await ctx.close();
    }
  }

  // 2. SPA
  for (const r of registro) {
    const { ctx, p, errs } = await abrir({ width: 1440, height: 900 });
    await p.goto(`${BASE}/#/area/${r.area}`, { waitUntil: 'networkidle' });
    await p.click(`[data-proyecto="${r.id}"] .card-hit`);
    await p.waitForFunction((t) => document.body.textContent.includes(t), r.campos.problema.slice(0, 40), { timeout: 8000 }).catch(() => {});
    const hash = await p.evaluate(() => location.hash);
    const texto = norm(await p.evaluate(() => document.body.textContent));
    const esperadoHash = `#/area/${r.area}/${r.id}`;
    const ok = hash === esperadoHash && texto.includes(norm(r.campos.problema));
    reg({ project_id: r.id, ruta: esperadoHash, viewport: 'escritorio', escenario: 'spa-clic', comprobacion: 'hash+contenido', esperado: `${esperadoHash} y párrafo completo`, observado: `hash=${hash} texto=${ok}`, estado: ok && errs.length === 0 ? 'APROBADO' : 'FALLIDO', evidencia: errs.slice(0,2).join(' | '), datos: 'content.js' });
    await p.goBack(); await p.waitForTimeout(500);
    const atras = await p.evaluate(() => location.hash);
    reg({ project_id: r.id, ruta: esperadoHash, viewport: 'escritorio', escenario: 'spa-atras', comprobacion: 'vuelve-al-area', esperado: `#/area/${r.area}`, observado: `hash=${atras}`, estado: atras === `#/area/${r.area}` ? 'APROBADO' : 'FALLIDO', evidencia: '', datos: 'content.js' });
    await ctx.close();
  }

  // 3. escenarios de API
  for (const id of (PILOTO ? [CON_API[0]] : CON_API)) {
    const r = registro.find((x) => x.id === id) || (await (async () => { const t = await abrir({width:1440,height:900}); await t.p.goto(BASE+'/#portafolio',{waitUntil:'networkidle'}); const j = await t.p.evaluate(()=>{for(const a of window.PORTAFOLIO.areas)for(const x of a.proyectos)if(x.id===arguments[0])return {area:a.id,id:x.id,campos:{}};return null}); await t.ctx.close(); return j; })());
    const ruta = `#/area/${r.area}/${id}`;
    for (const [vp, viewport] of [['escritorio',{width:1440,height:900}],['movil',{width:390,height:844}]]) {
      const { ctx, p } = await abrir(viewport);
      const reqs = [];
      p.on('response', (x) => { if (x.url().includes('/api/v1/')) reqs.push(x.status() + ' ' + x.url().split('/api/v1/')[1].split('?')[0]); });
      await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
      await p.reload({ waitUntil: 'networkidle' }).catch(() => {});
      const h = await esperarHost(p);
      reg({ project_id: id, ruta, viewport: vp, escenario: 'A-api-real', comprobacion: 'estado-ready', esperado: 'ready', observado: `estado=${h.estado} "${h.texto.slice(0,60)}" ${h.ms}ms`, estado: h.estado === 'ready' ? 'APROBADO' : 'FALLIDO', evidencia: reqs.slice(0,3).join(' | '), datos: 'portfolio-api 8a27227' });
      await ctx.close();
    }
    for (const [esc, esperado] of [['B-fallo-red','error'],['C-vacio','empty'],['D-recuperacion','ready']]) {
      const { ctx, p } = await abrir({ width: 1440, height: 900 });
      if (esc === 'B-fallo-red') await p.route('**/api/v1/**', (x) => x.abort());
      if (esc === 'C-vacio') {
        await p.route('**/api/v1/**', async (route) => {
          const real = await route.fetch();
          const json = await real.json();
          const vaciar = (v) => Array.isArray(v) ? [] : (v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, vaciar(x)])) : (typeof v === 'number' ? 0 : v));
          contratoVacio[route.request().url().split('/api/v1/')[1].split('?')[0]] = Object.keys(json).slice(0, 8);
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(vaciar(json)) });
        });
      }
      if (esc === 'D-recuperacion') { await p.route('**/api/v1/**', (x) => x.abort()); }
      await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
      if (esc === 'D-recuperacion') { await p.waitForTimeout(1500); await p.unroute('**/api/v1/**'); }
      await p.reload({ waitUntil: 'networkidle' }).catch(() => {});
      const h = await esperarHost(p);
      const ok = h.estado === esperado;
      reg({ project_id: id, ruta, viewport: 'escritorio', escenario: esc, comprobacion: `estado-${esperado}`, esperado, observado: `estado=${h.estado} "${h.texto.slice(0,60)}"`, estado: ok ? 'APROBADO' : 'FALLIDO', evidencia: esc === 'C-vacio' ? 'fixture vaciada sobre respuesta real' : 'route.abort simulado', datos: esc === 'C-vacio' ? 'simulada' : 'portfolio-api 8a27227' });
      await ctx.close();
    }
  }
} catch (e) {
  errorFatal = String(e && e.stack ? e.stack.split('\n')[0] : e);
} finally {
  if (navegador) await navegador.close().catch(() => {});
  const resumen = {};
  for (const f of filas) resumen[f.estado] = (resumen[f.estado] || 0) + 1;
  const esperados = (PILOTO ? 1 : 20) * 2 * 4 + (PILOTO ? 1 : 20) * 2 + (PILOTO ? 1 : 4) * 5;
  const salida = { run_id: runId, site: BASE, api: API, sha_sitio: sha, arbol_sucio: dirty, verificador: VERSION, piloto: PILOTO, estado_finalizacion: errorFatal ? 'FALLIDO' : 'COMPLETADO', error_fatal: errorFatal, casos_esperados: esperados, casos_ejecutados: filas.length, contrato_vacio: contratoVacio, resumen, filas };
  const tmp = SALIDA + '.tmp';
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(salida, null, 1));
  fs.renameSync(tmp, SALIDA);
  console.log(JSON.stringify({ run_id: runId, piloto: PILOTO, estado: salida.estado_finalizacion, error_fatal: errorFatal, esperados, ejecutados: filas.length, resumen }));
  if (errorFatal || (resumen.FALLIDO || 0) > 0 || filas.length === 0) process.exitCode = 1;
}
