/**
 * Genera la portada de la tarjeta «Copiloto NL-to-SQL» desde la demo servida.
 *
 *   node dashboards/copiloto-nl-sql/capturar-portada.mjs
 *
 * Toma una captura real a 1600 × 1726 (la misma proporción y tamaño exterior
 * que las demás portadas de tablero) y la guarda en
 * `dist/img/copiloto-nl-sql-resumen.jpg`. Requiere el servidor local
 * (`python -m http.server 8000` desde `dist/`).
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESTINO = path.join(RAIZ, 'dist', 'img', 'copiloto-nl-sql-resumen.jpg');
const URL_DEMO = 'http://127.0.0.1:8000/dashboards/copiloto-nl-sql/index.html';

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
await pagina.waitForSelector('#question');
await pagina.waitForFunction(
  () => !/Comprobando/i.test(document.querySelector('#api-status')?.textContent || ''),
  null,
  { timeout: 15_000 },
);
await pagina.locator('#question').fill('¿En qué año fue mayor la inflación entre 2019 y 2025?');
await pagina.locator('#run').click();
await pagina.waitForFunction(
  () => document.querySelectorAll('#chart .rank-bar').length === 7,
  null,
  { timeout: 20_000 },
);
await pagina.waitForTimeout(700);

await pagina.screenshot({ path: DESTINO, type: 'jpeg', quality: 84 });
const caja = await pagina.evaluate(() => ({
  alto: Math.round(document.documentElement.scrollHeight),
  filas: document.querySelectorAll('#table-wrap tbody tr').length,
  barras: document.querySelectorAll('#chart .rank-bar').length,
}));
await navegador.close();

console.log('portada:', DESTINO);
console.log('demo medida:', JSON.stringify(caja));
console.log('errores:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;
