import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESTINO = path.join(RAIZ, 'dist', 'img', 'orbita-resumen.jpg');
const URL_DEMO = 'http://127.0.0.1:8000/dashboards/orbita/index.html';

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

await pagina.goto(URL_DEMO, { waitUntil: 'load', timeout: 60_000 });
await pagina.waitForSelector('[data-tab]');
await pagina.waitForFunction(() => document.querySelectorAll('[data-tab]').length === 5, null, { timeout: 15_000 });
await pagina.waitForTimeout(4500);
await pagina.screenshot({ path: DESTINO, type: 'jpeg', quality: 84 });
const caja = await pagina.evaluate(() => ({
  alto: Math.round(document.documentElement.scrollHeight),
  tabs: document.querySelectorAll('[data-tab]').length,
  visible: [...document.querySelectorAll('.panel')].filter((e) => !e.hidden).map((e) => e.id),
  registros: document.querySelector('#count')?.textContent,
  menu: getComputedStyle(document.querySelector('nav')).position,
}));
await navegador.close();
console.log('portada:', DESTINO);
console.log('demo medida:', JSON.stringify(caja));
console.log('errores:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;
