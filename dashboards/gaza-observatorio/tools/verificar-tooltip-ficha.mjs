/**
 * Comprueba el tooltip dentro de la ficha del portafolio (marco del mismo origen).
 *   node dashboards/gaza-observatorio/tools/verificar-tooltip-ficha.mjs
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.goto('http://127.0.0.1:8000/#/area/ciencia-de-datos/gaza-observatorio', { waitUntil: 'load' });
await pagina.waitForTimeout(3000);

const marco = pagina.frameLocator('iframe');
await marco.locator('[data-tab="salud"]').click();
await pagina.waitForTimeout(800);
const fila = marco.locator('#injuryChart .injRow').first();
await fila.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(400);
const caja = await fila.boundingBox();
await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
await pagina.waitForTimeout(400);

const globo = await marco.locator('#gTip').evaluate((c) => ({
  visible: c.dataset.visible,
  hidden: c.hidden,
  texto: c.innerText.replace(/\s+/g, ' ').trim().slice(0, 100),
}));

console.log(globo);
console.log('errores JS:', errores.length ? errores : 'ninguno');
await pagina.screenshot({ path: path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'tooltips', '09-tooltip-en-ficha.png') });
await navegador.close();
process.exitCode = globo.visible === 'true' && !globo.hidden && !errores.length ? 0 : 1;

