import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESTINO = path.join(RAIZ, 'dist', 'img', 'dockmind-resumen.jpg');
const URL_DEMO = 'http://127.0.0.1:8000/dashboards/dockmind/index.html';

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
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
await pagina.waitForSelector('#catalogRows tr');
await pagina.waitForFunction(() => document.querySelectorAll('#catalogRows tr').length === 48, null, { timeout: 15_000 });
await pagina.waitForFunction(() => document.querySelectorAll('#exceptionRows tr').length === 5, null, { timeout: 15_000 });
await pagina.waitForTimeout(1200);
await pagina.screenshot({ path: DESTINO, type: 'jpeg', quality: 84 });
const caja = await pagina.evaluate(() => ({
  alto: Math.round(document.documentElement.scrollHeight),
  tabs: document.querySelectorAll('[role="tab"]').length,
  visible: [...document.querySelectorAll('.screen')].filter((e) => !e.hidden).map((e) => e.id),
  filas: document.querySelectorAll('#catalogRows tr').length,
  excepciones: document.querySelectorAll('#exceptionRows tr').length,
  heat: document.querySelectorAll('#heat rect.cell').length,
  recepciones: document.querySelectorAll('[data-receipt]').length,
  minis: document.querySelectorAll('#smallMultiples [data-mini]').length,
}));
await navegador.close();
console.log('portada:', DESTINO);
console.log('demo medida:', JSON.stringify(caja));
console.log('errores:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;
