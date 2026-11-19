/**
 * Genera la portada de la tarjeta «Kilómetro Cero» desde la demo servida.
 *
 *   node dashboards/kilometro-cero/capturar-portada.mjs
 *
 * Usa WebGL por software para que la captura sea reproducible también en
 * entornos automatizados sin GPU. La imagen final es 1600 × 1726.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESTINO = path.join(RAIZ, 'dist', 'img', 'kilometro-cero-resumen.jpg');
const URL_DEMO = 'http://127.0.0.1:8000/dashboards/kilometro-cero/index.html';

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(path.dirname(DESTINO), { recursive: true });
const navegador = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1726 }, deviceScaleFactor: 1 });
const errores = [];
pagina.on('pageerror', (e) => errores.push('JS: ' + e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push('consola: ' + m.text()); });

await pagina.goto(URL_DEMO, { waitUntil: 'load' });
await pagina.waitForSelector('#map canvas');
await pagina.waitForFunction(() => document.querySelectorAll('.gl-truck').length === 18, null, { timeout: 15_000 });
await pagina.evaluate(() => document.querySelector('#corridorRows tr:nth-child(5)')?.click());
await pagina.waitForTimeout(500);
await pagina.evaluate(() => window.scrollTo(0, 0));
await pagina.waitForTimeout(250);
await pagina.screenshot({ path: DESTINO, type: 'jpeg', quality: 84 });
const caja = await pagina.evaluate(() => ({
  alto: Math.round(document.documentElement.scrollHeight),
  mapa: !!document.querySelector('#map canvas'),
  nodos: document.querySelectorAll('.gl-hub').length,
  tramos: document.querySelectorAll('.gl-route-arrow').length,
  camiones: document.querySelectorAll('.gl-truck').length,
  filas: document.querySelectorAll('#corridorRows tr').length,
  zoom: document.querySelector('#zoomLabel')?.textContent,
}));
await navegador.close();
console.log('portada:', DESTINO);
console.log('demo medida:', JSON.stringify(caja));
console.log('errores:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;
