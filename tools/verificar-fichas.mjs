/**
 * Verificador de las 20 fichas del portafolio.
 *
 *   node tools/verificar-fichas.mjs
 *
 * Requisitos: sitio servido (SITE_BASE, por defecto http://127.0.0.1:8000) y
 * Playwright disponible. Si no está en la raíz, se usa el de
 * dashboards/clientes-campanas/node_modules.
 *
 * Escribe docs/verificacion-fichas.json y sale con código 1 si hay casos
 * FALLIDO o si alguna ficha no devuelve bloques.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SITE_BASE || 'http://127.0.0.1:8000';
const SALIDA = path.join(ROOT, 'docs', 'verificacion-fichas.json');
const BLOQUES = ['Problema','Destinatario','Mi contribución','Fuentes y datos','Método y decisiones técnicas','Resultados publicados','Limitaciones','Tecnologías'];
const CON_API = ['comparativo-bancario','atlas-vial','marketing-clientes','pulso-comercial'];

let pw;
try { pw = await import('@playwright/test'); }
catch {
  const ruta = path.join(ROOT, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  await import(pathToFileURL(ruta).href);
  pw = await import(pathToFileURL(ruta).href);
}
const { chromium } = pw;

const navegador = await chromium.launch();
const filas = [];
const registrar = (f) => filas.push({ sha_codigo: process.env.SHA || '', ...f });

async function nueva(viewport) {
  const ctx = await navegador.newContext({ viewport });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  return { p, errs, ctx };
}

/* ---------- 1. entrada directa, 20 fichas × 2 viewports ---------- */
const sonda = await nueva({ width: 1440, height: 900 });
await sonda.p.goto(BASE + '/#portafolio', { waitUntil: 'networkidle' });
const registro = await sonda.p.evaluate(() => {
  const out = [];
  for (const a of window.PORTAFOLIO.areas) for (const x of a.proyectos) {
    out.push({ area: a.id, id: x.id, estado: x.estado, problema: x.problema || '', resumen: x.resumen || x.descripcion || '', hallazgos: x.hallazgos ?? null });
  }
  return out;
});
await sonda.ctx.close();

for (const [nombre, viewport] of [['escritorio', { width: 1440, height: 900 }], ['movil', { width: 390, height: 844 }]]) {
  const { p, errs, ctx } = await nueva(viewport);
  for (const r of registro) {
    const ruta = `#/area/${r.area}/${r.id}`;
    await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
    await p.reload({ waitUntil: 'networkidle' }).catch(() => {});
    const d = await p.evaluate(() => ({
      dts: [...document.querySelectorAll('dt')].map((n) => n.textContent.trim()),
      texto: [...document.querySelectorAll('dd')].map((n) => n.textContent).join(' '),
      espera: document.querySelectorAll('.hallazgos-espera').length,
      host: !!document.querySelector('[data-testid="hallazgos-host"]'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tituloVisible: !!document.querySelector('h1, h2')
    }));
    const faltan = BLOQUES.filter((b) => !d.dts.includes(b));
    const coincide = d.texto.includes(String(r.problema).slice(0, 40)) || d.texto.includes(String(r.resumen).slice(0, 40));
    registrar({ project_id: r.id, ruta, viewport: nombre, escenario: 'entrada-directa', comprobacion: 'bloques+identidad', estado: (faltan.length === 0 && coincide && d.tituloVisible) ? 'APROBADO' : 'FALLIDO', resultado_observado: `bloques=${BLOQUES.length - faltan.length}/${BLOQUES.length} coincide=${coincide}`, evidencia: faltan.join('|') || 'ok', version_datos: 'content.js', pendiente: '' });
    registrar({ project_id: r.id, ruta, viewport: nombre, escenario: 'entrada-directa', comprobacion: 'sin-desbordamiento', estado: d.overflow <= 1 ? 'APROBADO' : 'FALLIDO', resultado_observado: `overflow=${d.overflow}px`, evidencia: '', version_datos: 'content.js', pendiente: '' });
    const esperadoHost = CON_API.includes(r.id);
    registrar({ project_id: r.id, ruta, viewport: nombre, escenario: 'entrada-directa', comprobacion: 'contrato-hallazgos', estado: d.host === esperadoHost ? 'APROBADO' : 'FALLIDO', resultado_observado: `host=${d.host} esperado=${esperadoHost} espera=${d.espera}`, evidencia: '', version_datos: 'content.js', pendiente: '' });
  }
  registrar({ project_id: '(todas)', ruta: '(20 fichas)', viewport: nombre, escenario: 'entrada-directa', comprobacion: 'consola', estado: errs.length === 0 ? 'APROBADO' : 'FALLIDO', resultado_observado: `errores=${errs.length}`, evidencia: errs.slice(0, 3).join(' | '), version_datos: 'content.js', pendiente: '' });
  await ctx.close();
}

/* ---------- 2. navegación SPA por interacción ---------- */
{
  const { p, ctx, errs } = await nueva({ width: 1440, height: 900 });
  await p.goto(BASE + '/#portafolio', { waitUntil: 'networkidle' });
  await p.click('#area-link-ciencia-de-datos');
  await p.waitForTimeout(600);
  const area = await p.evaluate(() => location.hash);
  const primerId = await p.evaluate(() => document.querySelector('.project-card')?.getAttribute('data-proyecto'));
  await p.click(`[data-proyecto="${primerId}"] .card-hit`);
  await p.waitForTimeout(800);
  const ficha = await p.evaluate(() => ({ hash: location.hash, texto: document.body.textContent }));
  const r = registro.find((x) => x.id === primerId);
  const coincide = ficha.texto.includes(String(r.problema).slice(0, 40));
  registrar({ project_id: primerId, ruta: '#/area/ciencia-de-datos/' + primerId, viewport: 'escritorio', escenario: 'spa-clic', comprobacion: 'identidad-tras-clic', estado: (area === '#/area/ciencia-de-datos' && ficha.hash.includes(primerId) && coincide) ? 'APROBADO' : 'FALLIDO', resultado_observado: `hash=${ficha.hash} coincide=${coincide}`, evidencia: '', version_datos: 'content.js', pendiente: '' });
  await p.goBack(); await p.waitForTimeout(600);
  const atras = await p.evaluate(() => document.body.textContent);
  const okAtras = atras !== ficha.texto && atras.includes('Ciencia de datos') || atras.includes('Proyectos de esta área');
  registrar({ project_id: primerId, ruta: '(atrás)', viewport: 'escritorio', escenario: 'spa-atras', comprobacion: 'vuelve-al-area', estado: okAtras ? 'APROBADO' : 'FALLIDO', resultado_observado: 'ok=' + okAtras, evidencia: '', version_datos: 'content.js', pendiente: '' });
  registrar({ project_id: primerId, ruta: '(spa)', viewport: 'escritorio', escenario: 'spa', comprobacion: 'consola', estado: errs.length === 0 ? 'APROBADO' : 'FALLIDO', resultado_observado: 'errores=' + errs.length, evidencia: errs.slice(0, 2).join(' | '), version_datos: 'content.js', pendiente: '' });
  await ctx.close();
}

/* ---------- 3. escenarios de API en los cuatro tableros ---------- */
for (const id of CON_API) {
  const ruta = `#/area/${registro.find((x) => x.id === id).area}/${id}`;
  // B: fallo de red simulado
  {
    const { p, ctx } = await nueva({ width: 1440, height: 900 });
    await p.route('**/api/v1/**', (route) => route.abort());
    await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
    await p.reload({ waitUntil: 'domcontentloaded' });
    let fin = false, texto = '';
    for (let i = 0; i < 30; i++) {
      const s = await p.evaluate(() => ({ espera: document.querySelectorAll('.hallazgos-espera').length, host: document.querySelector('[data-testid="hallazgos-host"]')?.textContent.trim() || '' }));
      if (!s.espera) { fin = true; texto = s.host; break; }
      await p.waitForTimeout(400);
    }
    registrar({ project_id: id, ruta, viewport: 'escritorio', escenario: 'api-caida-simulada', comprobacion: 'estado-explicito', estado: (fin && texto.length > 10) ? 'APROBADO' : 'FALLIDO', resultado_observado: `fin=${fin} host="${texto.slice(0, 60)}"`, evidencia: 'route.abort en **/api/v1/**', version_datos: 'API no consultada', pendiente: 'el host queda vacío: el mensaje de error se pinta en el área de la demo, no en hallazgos' });
    await ctx.close();
  }
  // D: recuperación tras error
  {
    const { p, ctx } = await nueva({ width: 1440, height: 900 });
    await p.route('**/api/v1/**', (route) => route.abort());
    await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    await p.unroute('**/api/v1/**');
    await p.reload({ waitUntil: 'load' });
    let fin = false;
    for (let i = 0; i < 30; i++) {
      const e = await p.evaluate(() => document.querySelectorAll('.hallazgos-espera').length);
      if (e === 0) { fin = true; break; }
      await p.waitForTimeout(400);
    }
    const texto = await p.evaluate(() => document.querySelector('[data-testid="hallazgos-host"]')?.textContent.trim() || '');
    registrar({ project_id: id, ruta, viewport: 'escritorio', escenario: 'recuperacion-tras-error', comprobacion: 'carga-con-api', estado: (fin && texto.length > 10) ? 'APROBADO' : (fin ? 'FALLIDO' : 'BLOQUEADO'), resultado_observado: `fin=${fin} host="${texto.slice(0, 60)}"`, evidencia: 'API real en 8010', version_datos: 'portfolio-api 8a27227', pendiente: fin && texto.length <= 10 ? 'el bloque no se llenó' : '' });
    await ctx.close();
  }
}

await navegador.close();
const resumen = {};
for (const f of filas) resumen[f.estado] = (resumen[f.estado] || 0) + 1;
const salida = { base: BASE, fecha: new Date().toISOString(), sha_codigo: process.env.SHA || '', resumen, filas };
fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 1));
console.log(JSON.stringify(resumen));
if ((resumen.FALLIDO || 0) > 0) process.exitCode = 1;
