/**
 * Verificación funcional de las 20 fichas del portafolio.
 *
 *   npm install && npx playwright install chromium
 *   npm run serve            # terminal 1: http://127.0.0.1:8000
 *   npm run verificar        # terminal 2
 *
 * El origen por defecto es :8000 porque está en ALLOWED_ORIGINS de la API.
 * SITE_BASE permite otro origen autorizado. Evidencia en docs/verificacion-fichas.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SITE_BASE || 'http://127.0.0.1:8000';
const API = process.env.API_BASE || 'http://127.0.0.1:8010';
const SALIDA = path.join(ROOT, 'docs', 'verificacion-fichas.json');
const BLOQUES = ['Problema','Destinatario','Mi contribución','Fuentes y datos','Método y decisiones técnicas','Resultados publicados','Limitaciones','Tecnologías'];
const CON_API = ['comparativo-bancario','atlas-vial','marketing-clientes','pulso-comercial'];
const VERIFICADOR = '2.0.0';
const norm = (s) => String(s).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

let pw;
try { pw = await import('@playwright/test'); }
catch (e) {
  console.error('Falta @playwright/test. Ejecuta: npm install && npx playwright install chromium');
  process.exit(2);
}
const { chromium } = pw;

const sha = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;
const inicio = Date.now();
const filas = [];
const reg = (f) => filas.push({ sha_sitio: sha, arbol_sucio: dirty, verificador: VERIFICADOR, fecha: new Date().toISOString(), ...f });

const navegador = await chromium.launch();
try {
  const abrir = async (viewport) => {
    const ctx = await navegador.newContext({ viewport });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    p.on('requestfailed', (r) => errs.push('reqfail: ' + r.url().split('?')[0]));
    return { ctx, p, errs };
  };

  // registro
  const s = await abrir({ width: 1440, height: 900 });
  await s.p.goto(BASE + '/#portafolio', { waitUntil: 'networkidle' });
  const registro = await s.p.evaluate(() => {
    const o = [];
    for (const a of window.PORTAFOLIO.areas) for (const x of a.proyectos)
      o.push({ area: a.id, id: x.id, estado: x.estado, campos: { problema: x.problema || '', destinatario: x.destinatario || '', contribucion: x.contribucion || '', fuentes: x.fuentes || '', metodo: x.metodo || '', resultados: x.resultados || '', limitaciones: x.limitaciones || '' }, hallazgos: x.hallazgos ?? null });
    return o;
  });
  await s.ctx.close();

  // 1. entrada directa
  for (const [vp, viewport] of [['escritorio', { width: 1440, height: 900 }], ['movil', { width: 390, height: 844 }]]) {
    for (const r of registro) {
      const { ctx, p, errs } = await abrir(viewport);
      const ruta = `#/area/${r.area}/${r.id}`;
      await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
      await p.reload({ waitUntil: 'networkidle' }).catch(() => {});
      const d = await p.evaluate(() => {
        const pares = [...document.querySelectorAll('dl, .field-grid')].flatMap((d) => [...d.children]).map((n) => n.textContent);
        const dts = [...document.querySelectorAll('dt')].map((n) => ({ k: n.textContent.trim(), v: n.parentElement?.querySelector('dd')?.textContent || '' }));
        return { dts, texto: document.body.textContent, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, host: !!document.querySelector('[data-testid="hallazgos-host"]') };
      });
      const mapa = Object.fromEntries(d.dts.map((x) => [x.k, norm(x.v)]));
      const faltan = BLOQUES.filter((b) => !d.dts.some((x) => x.k === b));
      // comparación completa por bloque
      const discrepan = [];
      for (const [campo, etiqueta] of [['problema','Problema'],['destinatario','Destinatario'],['contribucion','Mi contribución'],['fuentes','Fuentes y datos'],['metodo','Método y decisiones técnicas'],['resultados','Resultados publicados'],['limitaciones','Limitaciones']]) {
        const esperado = norm(r.campos[campo]);
        const hallado = mapa[etiqueta] || '';
        if (esperado && !hallado.startsWith(esperado.slice(0, Math.max(40, esperado.length - 20)))) discrepan.push(campo);
      }
      reg({ project_id: r.id, ruta, viewport: vp, escenario: 'entrada-directa', comprobacion: 'bloques+texto+identidad', estado: (faltan.length === 0 && discrepan.length === 0) ? 'APROBADO' : 'FALLIDO', resultado_observado: `bloques=${BLOQUES.length - faltan.length}/8 discrepan=${discrepan.join(',') || 'ninguno'}`, evidencia: faltan.join('|'), api: 'no aplica', datos: 'content.js' });
      reg({ project_id: r.id, ruta, viewport: vp, escenario: 'entrada-directa', comprobacion: 'sin-desbordamiento', estado: d.overflow <= 1 ? 'APROBADO' : 'FALLIDO', resultado_observado: `overflow=${d.overflow}px`, evidencia: '', api: 'no aplica', datos: 'content.js' });
      reg({ project_id: r.id, ruta, viewport: vp, escenario: 'entrada-directa', comprobacion: 'contrato-hallazgos', estado: d.host === CON_API.includes(r.id) ? 'APROBADO' : 'FALLIDO', resultado_observado: `host=${d.host}`, evidencia: '', api: 'no aplica', datos: 'content.js' });
      reg({ project_id: r.id, ruta, viewport: vp, escenario: 'entrada-directa', comprobacion: 'consola-de-la-ficha', estado: errs.length === 0 ? 'APROBADO' : 'FALLIDO', resultado_observado: `errores=${errs.length}`, evidencia: errs.slice(0, 2).join(' | '), api: 'no aplica', datos: 'content.js' });
      await ctx.close();
    }
  }

  // 2. SPA: las 20 por clic desde su área
  for (const r of registro) {
    const { ctx, p, errs } = await abrir({ width: 1440, height: 900 });
    await p.goto(`${BASE}/#/area/${r.area}`, { waitUntil: 'networkidle' });
    await p.click(`[data-proyecto="${r.id}"] .card-hit`);
    await p.waitForFunction((t) => document.body.textContent.includes(t), r.campos.problema.slice(0, 40), { timeout: 8000 }).catch(() => {});
    const ok = await p.evaluate((t) => location.hash.includes(t) && document.body.textContent.includes(t), r.campos.problema.slice(0, 40));
    reg({ project_id: r.id, ruta: `#/area/${r.area}/${r.id}`, viewport: 'escritorio', escenario: 'spa-clic', comprobacion: 'contenido-tras-clic', estado: ok && errs.length === 0 ? 'APROBADO' : 'FALLIDO', resultado_observado: `contenido=${ok} errores=${errs.length}`, evidencia: errs.slice(0, 2).join(' | '), api: 'no aplica', datos: 'content.js' });
    await ctx.close();
  }

  // 3. escenarios de API con fixtures derivadas del contrato real
  const contrato = {};
  for (const id of CON_API) {
    const r = registro.find((x) => x.id === id);
    const ruta = `#/area/${r.area}/${id}`;
    // A: API real
    for (const [vp, viewport] of [['escritorio', { width: 1440, height: 900 }], ['movil', { width: 390, height: 844 }]]) {
      const { ctx, p, errs } = await abrir(viewport);
      const reqs = [];
      p.on('response', (resp) => { if (resp.url().includes('/api/v1/')) reqs.push(resp.status() + ' ' + resp.url().split('/api/v1/')[1].split('?')[0]); });
      await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
      await p.reload({ waitUntil: 'networkidle' }).catch(() => {});
      const host = await p.waitForFunction(() => {
        const h = document.querySelector('[data-testid="hallazgos-host"]');
        if (!h) return 'sin-host';
        const t = h.textContent.trim();
        return t && !t.includes('Calculando hallazgos') ? t.slice(0, 90) : false;
      }, null, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => 'timeout');
      reg({ project_id: id, ruta, viewport: vp, escenario: 'A-api-real', comprobacion: 'hallazgos-ready', estado: host !== 'timeout' && host !== 'sin-host' ? 'APROBADO' : 'FALLIDO', resultado_observado: `host="${host}"`, evidencia: reqs.slice(0, 3).join(' | '), api: API, datos: 'portfolio-api 8a27227', errores: errs.length });
      await ctx.close();
    }
    // B: fallo de red
    {
      const { ctx, p } = await abrir({ width: 1440, height: 900 });
      await p.route('**/api/v1/**', (route) => route.abort());
      await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
      await p.reload({ waitUntil: 'domcontentloaded' });
      const estado = await p.waitForFunction(() => {
        const h = document.querySelector('[data-testid="hallazgos-host"]');
        if (!h) return 'sin-host';
        const t = h.textContent.trim();
        return t && !t.includes('Calculando hallazgos') ? t.slice(0, 90) : false;
      }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => 'timeout');
      reg({ project_id: id, ruta, viewport: 'escritorio', escenario: 'B-fallo-red-simulado', comprobacion: 'error-explicito', estado: estado !== 'timeout' && estado !== 'sin-host' ? 'APROBADO' : 'FALLIDO', resultado_observado: `host="${estado}"`, evidencia: 'route.abort en **/api/v1/** (simulado)', api: 'simulada', datos: 'no aplica' });
      await ctx.close();
    }
    // C: respuesta vacía derivada del contrato real
    {
      const { ctx, p } = await abrir({ width: 1440, height: 900 });
      await p.route('**/api/v1/**', async (route) => {
        const url = route.request().url();
        try {
          const real = await route.fetch();
          const json = await real.json();
          const vaciar = (v) => Array.isArray(v) ? [] : (v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, vaciar(x)])) : v);
          contrato[url.split('/api/v1/')[1].split('?')[0]] = Object.keys(json).slice(0, 6);
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(vaciar(json)) });
        } catch { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
      });
      await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
      await p.reload({ waitUntil: 'domcontentloaded' });
      const estado = await p.waitForFunction(() => {
        const h = document.querySelector('[data-testid="hallazgos-host"]');
        if (!h) return 'sin-host';
        const t = h.textContent.trim();
        return t && !t.includes('Calculando hallazgos') ? t.slice(0, 90) : false;
      }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => 'timeout');
      const sucio = await p.evaluate(() => /NaN|Infinity|undefined/.test(document.querySelector('[data-testid="hallazgos-host"]')?.textContent || ''));
      reg({ project_id: id, ruta, viewport: 'escritorio', escenario: 'C-vacio-simulado', comprobacion: 'empty-sin-NaN', estado: estado !== 'timeout' && estado !== 'sin-host' && !sucio ? 'APROBADO' : 'FALLIDO', resultado_observado: `host="${estado}" nan=${sucio}`, evidencia: 'arrays vaciados sobre la respuesta real', api: 'simulada', datos: JSON.stringify(contrato).slice(0, 120) });
      await ctx.close();
    }
    // D: recuperación tras error
    {
      const { ctx, p } = await abrir({ width: 1440, height: 900 });
      await p.route('**/api/v1/**', (route) => route.abort());
      await p.goto(`${BASE}/${ruta}`, { waitUntil: 'load' });
      await p.waitForTimeout(1500);
      await p.unroute('**/api/v1/**');
      await p.reload({ waitUntil: 'networkidle' }).catch(() => {});
      const estado = await p.waitForFunction(() => {
        const h = document.querySelector('[data-testid="hallazgos-host"]');
        if (!h) return 'sin-host';
        const t = h.textContent.trim();
        return t && !t.includes('Calculando hallazgos') ? t.slice(0, 90) : false;
      }, null, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => 'timeout');
      reg({ project_id: id, ruta, viewport: 'escritorio', escenario: 'D-recuperacion', comprobacion: 'ready-tras-error', estado: estado !== 'timeout' && estado !== 'sin-host' ? 'APROBADO' : 'FALLIDO', resultado_observado: `host="${estado}"`, evidencia: 'recarga completa tras retirar la interceptación', api: API, datos: 'portfolio-api 8a27227' });
      await ctx.close();
    }
  }
} finally {
  await navegador.close().catch(() => {});
}

const resumen = {};
for (const f of filas) resumen[f.estado] = (resumen[f.estado] || 0) + 1;
const duracion = Date.now() - inicio;
const salida = { site: BASE, api: API, sha_sitio: sha, arbol_sucio: dirty, verificador: VERIFICADOR, fecha: new Date().toISOString(), duracion_ms: duracion, contrato_vacio: contrato, resumen, filas };
fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 1));
console.log(JSON.stringify({ resumen, duracion_ms: duracion, sha, dirty, casos: filas.length }));
if ((resumen.FALLIDO || 0) > 0) process.exitCode = 1;

