/**
 * Capturas de «Edad por año» paginado dentro de la ficha real del portafolio,
 * en escritorio y en móvil.
 *
 *   node dashboards/gaza-observatorio/tools/capturar-ficha-edades-paginadas.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'edades-paginadas');
const URL_FICHA = 'http://127.0.0.1:8000/#/area/ciencia-de-datos/gaza-observatorio';

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  await import(pathToFileURL(ruta).href);
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(SALIDA, { recursive: true });
const navegador = await chromium.launch();
const errores = [];

/* ---------------------------------------------------------------- escritorio */
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1200 } });
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.goto(URL_FICHA, { waitUntil: 'load' });
await pagina.waitForTimeout(3200);

const marco = pagina.frameLocator('#demo-host iframe, iframe');
await marco.locator('[data-tab="personas"]').click();
await pagina.waitForTimeout(900);
await marco.locator('#ageMode').selectOption('single');
await pagina.waitForTimeout(900);

await marco.locator('#agePager').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(300);
await pagina.mouse.move(4, 4);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: path.join(SALIDA, '04-ficha-escritorio-paginacion.png'), animations: 'disabled' });
await marco.locator('#ageChart').screenshot({ path: path.join(SALIDA, '05-ficha-escritorio-grafica.png'), animations: 'disabled' });
await marco.locator('#personas .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '06-ficha-escritorio-tarjeta.png'), animations: 'disabled' });
console.log('  capturas de escritorio tomadas dentro de la ficha');

// Recorrido hasta la última vista dentro de la ficha
const rangos = [];
for (let i = 0; i < 8; i += 1) {
  rangos.push(await marco.locator('#ageRange').textContent());
  const siguiente = marco.locator('#ageNext');
  if (await siguiente.isDisabled()) break;
  await siguiente.click();
  await pagina.waitForTimeout(350);
}
console.log('  rangos recorridos:', rangos.map((r) => r.trim()).join(' | '));
await marco.locator('#ageChart').screenshot({ path: path.join(SALIDA, '07-ficha-escritorio-ultima-vista.png'), animations: 'disabled' });
await pagina.close();

/* --------------------------------------------------------------------- móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`móvil: ${e.message}`));
await movil.goto(URL_FICHA, { waitUntil: 'load' });
await movil.waitForTimeout(3200);
const marcoMovil = movil.frameLocator('#demo-host iframe, iframe');
await marcoMovil.locator('[data-tab="personas"]').click();
await movil.waitForTimeout(800);
await marcoMovil.locator('#ageMode').selectOption('single');
await movil.waitForTimeout(900);
await marcoMovil.locator('#agePager').scrollIntoViewIfNeeded();
await movil.waitForTimeout(300);
await movil.keyboard.press('Escape');
await movil.waitForTimeout(200);
await movil.screenshot({ path: path.join(SALIDA, '08-ficha-movil-paginacion.png'), animations: 'disabled' });
await marcoMovil.locator('#personas .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '09-ficha-movil-tarjeta.png'), animations: 'disabled' });
const desborde = await movil.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log('  móvil: desbordamiento de página', desborde, 'px');
await movil.close();

await navegador.close();
console.log('errores JS:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;

