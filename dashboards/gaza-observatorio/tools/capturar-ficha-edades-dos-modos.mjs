/**
 * Capturas de los dos modos de la pirámide de edades dentro de la ficha real del
 * portafolio, en escritorio y en móvil. Antes de cada captura se cierra el globo
 * del tooltip para que no tape la gráfica.
 *
 *   node dashboards/gaza-observatorio/tools/capturar-ficha-edades-dos-modos.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'edades-dos-modos');
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

/** Cierra el globo dentro del marco y lo deja cerrado antes de capturar. */
const limpiarTip = async (marco) => {
  await marco.locator('body').evaluate(() => {
    if (window.TIP) window.TIP.ocultar();
    const caja = document.getElementById('gTip');
    if (caja) {
      caja.hidden = true;
      caja.dataset.visible = 'false';
    }
  });
};

/* ---------------------------------------------------------------- escritorio */
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1200 } });
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.goto(URL_FICHA, { waitUntil: 'load' });
await pagina.waitForTimeout(3400);
const marco = pagina.frameLocator('#demo-host iframe, iframe');
await marco.locator('[data-tab="personas"]').click();
await pagina.waitForTimeout(1000);

await marco.locator('#ageChart').scrollIntoViewIfNeeded();
await limpiarTip(marco);
await pagina.screenshot({ path: path.join(SALIDA, '10-ficha-escritorio-grupos.png'), animations: 'disabled' });
await limpiarTip(marco);
await marco.locator('#ageChart').screenshot({ path: path.join(SALIDA, '11-ficha-escritorio-grupos-grafica.png'), animations: 'disabled' });
await limpiarTip(marco);
await marco.locator('#personas .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '12-ficha-escritorio-grupos-tarjeta.png'), animations: 'disabled' });

await marco.locator('#ageMode').selectOption('single');
await pagina.waitForTimeout(1000);
await marco.locator('#ageChart').scrollIntoViewIfNeeded();
await limpiarTip(marco);
await marco.locator('#ageChart').screenshot({ path: path.join(SALIDA, '13-ficha-escritorio-edades-grafica.png'), animations: 'disabled' });
await limpiarTip(marco);
await pagina.screenshot({ path: path.join(SALIDA, '14-ficha-escritorio-edades.png'), animations: 'disabled' });
console.log('  capturas de escritorio tomadas dentro de la ficha');
await pagina.close();

/* --------------------------------------------------------------------- móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`móvil: ${e.message}`));
await movil.goto(URL_FICHA, { waitUntil: 'load' });
await movil.waitForTimeout(3400);
const marcoMovil = movil.frameLocator('#demo-host iframe, iframe');
await marcoMovil.locator('[data-tab="personas"]').click();
await movil.waitForTimeout(900);
await marcoMovil.locator('#ageChart').scrollIntoViewIfNeeded();
await movil.waitForTimeout(400);
await limpiarTip(marcoMovil);
await movil.screenshot({ path: path.join(SALIDA, '15-ficha-movil-grupos.png'), animations: 'disabled' });
await limpiarTip(marcoMovil);
await marcoMovil.locator('#ageChart').screenshot({ path: path.join(SALIDA, '16-ficha-movil-grupos-grafica.png'), animations: 'disabled' });

await marcoMovil.locator('#ageMode').selectOption('single');
await movil.waitForTimeout(900);
await marcoMovil.locator('#agePager').scrollIntoViewIfNeeded();
await movil.waitForTimeout(400);
await limpiarTip(marcoMovil);
await movil.screenshot({ path: path.join(SALIDA, '17-ficha-movil-edades.png'), animations: 'disabled' });
await limpiarTip(marcoMovil);
await marcoMovil.locator('#ageChart').screenshot({ path: path.join(SALIDA, '18-ficha-movil-edades-grafica.png'), animations: 'disabled' });
const desborde = await movil.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log('  capturas de móvil tomadas dentro de la ficha · desbordamiento', desborde, 'px');
await movil.close();

await navegador.close();
console.log('errores JS:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;
