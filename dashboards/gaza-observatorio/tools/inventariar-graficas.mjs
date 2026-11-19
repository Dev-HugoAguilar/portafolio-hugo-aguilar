/**
 * Inventario real de gráficas del observatorio y de sus marcas consultables.
 *   node dashboards/gaza-observatorio/tools/inventariar-graficas.mjs
 *
 * Recorre las once pestañas del build servido y, por cada contenedor de gráfica,
 * cuenta las marcas que ya resuelven un tooltip: las que declaran data-tip o las
 * que, dentro de un ámbito data-tip-scope, traen <title> o aria-label. Los
 * lienzos se informan aparte porque resuelven la marca por proximidad.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  await import(pathToFileURL(ruta).href);
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

const URL_OBS = 'http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html';
const PESTANAS = ['humano', 'personas', 'memoria', 'salud', 'evolucion', 'territorio', 'experimento', 'evidencia', 'archivo', 'respuesta', 'referencias'];

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.goto(URL_OBS, { waitUntil: 'load' });
await pagina.waitForTimeout(1500);

const informe = {};
for (const p of PESTANAS) {
  const boton = pagina.locator(`[data-tab="${p}"]`);
  if (await boton.count()) await boton.click();
  await pagina.waitForTimeout(700);
  informe[p] = await pagina.evaluate(() => {
    const panel = [...document.querySelectorAll('main > section[role="tabpanel"]')].find((s) => !s.hidden);
    if (!panel) return [];
    const filas = [];
    const vistos = new Set();
    for (const cont of panel.querySelectorAll('[data-tip-scope], canvas')) {
      if (!cont.id || vistos.has(cont.id)) continue;
      vistos.add(cont.id);
      const tipo = cont.tagName === 'CANVAS' ? 'lienzo' : cont.querySelector('svg') ? 'svg' : 'html';
      const marcas = [...cont.querySelectorAll('svg[aria-label],circle,rect,path,line,polygon,g[role],button[aria-label],span[title],b[title],i[title],[data-tip-titulo],[role="button"]')];
      const proximidad = marcas.some((m) => m.hasAttribute('data-k'));
      const conTip = marcas.filter(
        (m) =>
          m.hasAttribute('data-tip') ||
          m.hasAttribute('data-tip-titulo') ||
          m.hasAttribute('data-tip-min') ||
          m.getAttribute('data-tip-scope') !== null ||
          ((m.querySelector(':scope > title') || m.getAttribute('aria-label') || m.getAttribute('title')) && cont.hasAttribute('data-tip-scope'))
      );
      filas.push({
        id: cont.id,
        tipo,
        proximidad,
        serie: cont.getAttribute('data-tip-serie') || '',
        fuente: cont.getAttribute('data-tip-src') || '',
        marcas: marcas.length,
        consultables: conTip.length,
        enfocables: marcas.filter((m) => m.hasAttribute('tabindex')).length,
        ejemplo: (
          (conTip[0] && (conTip[0].getAttribute('aria-label') || conTip[0].getAttribute('data-tip-titulo') || conTip[0].getAttribute('data-tip'))) ||
          ''
        ).slice(0, 60),
      });
    }
    return filas;
  });
}
await pagina.close();
await navegador.close();

const destino = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'tooltips');
mkdirSync(destino, { recursive: true });
writeFileSync(path.join(destino, 'inventario-graficas.json'), JSON.stringify(informe, null, 2), 'utf8');

let total = 0;
for (const [tab, filas] of Object.entries(informe)) {
  console.log(`\n== ${tab}`);
  for (const f of filas || []) {
    total += 1;
    const cobertura = f.tipo === 'lienzo' || f.proximidad ? 'por proximidad' : `${f.consultables}/${f.marcas}`;
    console.log(`  #${f.id} [${f.tipo}] consultables=${cobertura} enfocables=${f.enfocables} · ${f.serie || '(sin serie)'}`);
  }
}
console.log(`\n${total} contenedores de gráfica inventariados`);
console.log('errores JS:', errores.length ? errores : 'ninguno');




