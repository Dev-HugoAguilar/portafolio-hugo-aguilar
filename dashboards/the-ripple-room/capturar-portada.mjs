/**
 * Genera la portada de la tarjeta «The Ripple Room» desde la demo servida.
 *
 *   node dashboards/the-ripple-room/capturar-portada.mjs
 *
 * Captura real a 1600 × 1726 en `dist/img/the-ripple-room-resumen.jpg`.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESTINO = path.join(RAIZ, 'dist', 'img', 'the-ripple-room-resumen.jpg');
const URL_DEMO = 'http://127.0.0.1:8000/dashboards/the-ripple-room/index.html';

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
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1726 }, deviceScaleFactor: 1 });
const errores = [];
pagina.on('pageerror', (e) => errores.push('JS: ' + e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push('consola: ' + m.text()); });

await pagina.goto(URL_DEMO, { waitUntil: 'load' });
await pagina.waitForSelector('#world-map path');
await pagina.waitForSelector('#timeline-chart .lane-line');
await pagina.waitForSelector('.decision-point');
await pagina.locator('#run-button').click();
await pagina.waitForFunction(
  () => /EPISODIO COMPLETADO/.test(document.querySelector('#status-label')?.textContent || ''),
  null,
  { timeout: 20_000 },
);
await pagina.waitForTimeout(500);
await pagina.screenshot({ path: DESTINO, type: 'jpeg', quality: 84 });
const caja = await pagina.evaluate(() => ({
  alto: Math.round(document.documentElement.scrollHeight),
  paises: document.querySelectorAll('.map-country').length,
  expuestos: document.querySelectorAll('.map-country.exposed').length,
  series: document.querySelectorAll('#timeline-chart .lane-line').length,
  planes: document.querySelectorAll('.decision-point').length,
}));
await navegador.close();
console.log('portada:', DESTINO);
console.log('demo medida:', JSON.stringify(caja));
console.log('errores:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;
