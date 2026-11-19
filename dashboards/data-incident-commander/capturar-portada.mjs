/**
 * Genera la portada de la tarjeta «Data Incident Commander».
 *
 *   node dashboards/data-incident-commander/capturar-portada.mjs
 *
 * Toma una captura real a 1600 × 1726 desde la demo servida y la guarda en
 * `dist/img/data-incident-commander-resumen.jpg`.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESTINO = path.join(RAIZ, 'dist', 'img', 'data-incident-commander-resumen.jpg');
const URL_DEMO = 'http://127.0.0.1:8000/dashboards/data-incident-commander/index.html?local=1';

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
await pagina.waitForSelector('#run-button');
await pagina.locator('#run-button').click();
await pagina.waitForFunction(
  () => /Diagnóstico completo/.test(document.querySelector('#incident-state')?.textContent || ''),
  null,
  { timeout: 20_000 },
);
await pagina.waitForTimeout(500);
await pagina.screenshot({ path: DESTINO, type: 'jpeg', quality: 84 });
const caja = await pagina.evaluate(() => ({
  alto: Math.round(document.documentElement.scrollHeight),
  escenarios: document.querySelectorAll('[data-scenario]').length,
  validaciones: document.querySelectorAll('.heat-cell').length,
}));
await navegador.close();

console.log('portada:', DESTINO);
console.log('demo medida:', JSON.stringify(caja));
console.log('errores:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;
