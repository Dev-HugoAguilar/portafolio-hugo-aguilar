/**
 * Genera la portada de la tarjeta «Vidas en tránsito» desde el tablero servido.
 *
 *   node dashboards/vidas-en-transito/capturar-portada.mjs
 *
 * Toma una captura real del tablero a 1600 × 1726 (la misma proporción y tamaño
 * exterior que la portada de Walmart M5) y la guarda en
 * `dist/img/vidas-en-transito-resumen.jpg`. Requiere el servidor local
 * (`python -m http.server 8000` desde `dist/`).
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESTINO = path.join(RAIZ, 'dist', 'img', 'vidas-en-transito-resumen.jpg');
const URL_TABLERO = 'http://127.0.0.1:8000/dashboards/vidas-en-transito/index.html';

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

await pagina.goto(URL_TABLERO, { waitUntil: 'load' });
/* Espera a que los dos JSON estén cargados y el bloque ampliado dibujado. */
await pagina.waitForFunction(() => document.querySelectorAll('#expandedCharts table').length >= 20, null, { timeout: 30000 });
await pagina.waitForTimeout(1200);

await pagina.screenshot({ path: DESTINO, type: 'jpeg', quality: 84 });
const caja = await pagina.evaluate(() => ({
  alto: Math.round(document.documentElement.scrollHeight),
  tablas: document.querySelectorAll('table').length,
  svg: document.querySelectorAll('svg').length,
}));
await navegador.close();

console.log('portada:', DESTINO);
console.log('tablero medido:', JSON.stringify(caja));
console.log('errores:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;

