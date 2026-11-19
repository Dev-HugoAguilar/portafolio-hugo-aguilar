/**
 * Genera la portada de la tarjeta «Briefing con evidencia · Banco de México»
 * desde la demo servida.
 *
 *   node dashboards/briefing-banxico/capturar-portada.mjs
 *
 * Toma una captura real a 1600 × 1726 (la misma proporción y tamaño exterior
 * que las demás portadas de tablero) y la guarda en
 * `dist/img/briefing-banxico-resumen.jpg`. Requiere el servidor local
 * (`python -m http.server 8000` desde `dist/`).
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESTINO = path.join(RAIZ, 'dist', 'img', 'briefing-banxico-resumen.jpg');
const URL_DEMO = 'http://127.0.0.1:8000/dashboards/briefing-banxico/index.html';

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  await import(pathToFileURL(ruta).href);
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(path.dirname(DESTINO), { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({
  viewport: { width: 1600, height: 1726 },
  deviceScaleFactor: 1,
});
const errores = [];
pagina.on('pageerror', (e) => errores.push('JS: ' + e.message));
pagina.on('console', (m) => {
  if (m.type() === 'error') errores.push('consola: ' + m.text());
});

await pagina.goto(URL_DEMO, { waitUntil: 'load' });
await pagina.waitForSelector('#forecast-chart svg');
await pagina.waitForFunction(
  () => document.querySelectorAll('.source-card').length === 2 && !/Comprobando/i.test(document.querySelector('#api-status')?.textContent || ''),
  null,
  { timeout: 15_000 },
);
await pagina.waitForTimeout(1_200);

await pagina.screenshot({ path: DESTINO, type: 'jpeg', quality: 84 });
const caja = await pagina.evaluate(() => ({
  alto: Math.round(document.documentElement.scrollHeight),
  fuentes: document.querySelectorAll('.source-card').length,
  puntos: document.querySelectorAll('#forecast-chart circle').length,
}));
await navegador.close();

console.log('portada:', DESTINO);
console.log('demo medida:', JSON.stringify(caja));
console.log('errores:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;
