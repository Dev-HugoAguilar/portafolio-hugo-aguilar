/**
 * Capturas de «Cada punto, una vida» sobre el build servido.
 *
 *   node dashboards/gaza-observatorio/tools/capturar-cada-punto.mjs
 *
 * Escribe en `evidencias/gaza-observatorio/cada-punto/`. Requiere el servidor
 * local en http://127.0.0.1:8000 apuntando a `dist/`.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'cada-punto');
const URL_OBSERVATORIO = 'http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html';

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(SALIDA, { recursive: true });
const navegador = await chromium.launch();
const fallos = [];

async function abrir(ancho, alto) {
  const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
  pagina.on('pageerror', (e) => fallos.push(`JS: ${e.message}`));
  await pagina.goto(URL_OBSERVATORIO, { waitUntil: 'load' });
  await pagina.locator('[data-tab="memoria"]').click();
  await pagina.waitForTimeout(900);
  return pagina;
}

async function foto(pagina, nombre, recorte) {
  const destino = path.join(SALIDA, nombre);
  if (recorte) await pagina.locator(recorte).screenshot({ path: destino, animations: 'disabled' });
  else await pagina.screenshot({ path: destino, fullPage: false });
  console.log('captura', nombre);
}

// 01 · vista inicial con la sección completa
{
  const pagina = await abrir(1440, 1000);
  await foto(pagina, '01-cada-punto-inicio.png', '#memoria');
  await pagina.close();
}

// 02 · ficha de una persona seleccionada con clic
{
  const pagina = await abrir(1440, 1000);
  const lienzo = pagina.locator('#memCanvas');
  const caja = await lienzo.boundingBox();
  await pagina.mouse.click(caja.x + 40, caja.y + 40);
  await pagina.waitForTimeout(400);
  await foto(pagina, '02-detalle-persona.png');
  await pagina.close();
}

// 03 · universo de adultos con edad mínima 18
{
  const pagina = await abrir(1440, 1000);
  await pagina.locator('#memUniverse').selectOption('adults');
  await pagina.waitForTimeout(700);
  await foto(pagina, '03-adultos.png', '#memoria');
  await pagina.close();
}

// 04 · tabla accesible con paginación
{
  const pagina = await abrir(1440, 1000);
  await pagina.locator('details.memTable').evaluate((el) => { el.open = true; });
  await pagina.waitForTimeout(400);
  await foto(pagina, '04-tabla-accesible.png', 'details.memTable');
  await pagina.close();
}

// 05 · móvil de 390 px
{
  const pagina = await abrir(390, 844);
  const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (desborde > 0) fallos.push(`390 px: desbordamiento de ${desborde} px`);
  await foto(pagina, '05-movil-390.png', '#memoria');
  await pagina.close();
}

// 06 · cuadrícula en detalle
{
  const pagina = await abrir(1440, 1000);
  await foto(pagina, '06-cuadricula.png', '#memViewport');
  await pagina.close();
}

await navegador.close();
console.log(fallos.length ? `FALLOS: ${fallos.join(' · ')}` : 'sin fallos al capturar');
process.exitCode = fallos.length ? 1 : 0;
