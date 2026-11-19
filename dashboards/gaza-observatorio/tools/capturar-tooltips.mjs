/**
 * Capturas de la entrega: gráficas corregidas y tooltips en acción.
 *   node dashboards/gaza-observatorio/tools/capturar-tooltips.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'tooltips');
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
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
await pagina.goto('http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html', { waitUntil: 'load' });
await pagina.waitForTimeout(1400);

const foto = async (nombre, recorte) => {
  const destino = path.join(SALIDA, nombre);
  if (recorte) await pagina.locator(recorte).screenshot({ path: destino, animations: 'disabled' });
  else await pagina.screenshot({ path: destino, animations: 'disabled' });
  console.log('captura', nombre);
};

const irA = async (p) => {
  await pagina.locator(`[data-tab="${p}"]`).click();
  await pagina.waitForTimeout(700);
};

/** Deja el puntero sobre una marca y captura el globo emergente. */
const conTip = async (selector, indice, nombre, recorte) => {
  const loc = pagina.locator(selector).nth(indice);
  await loc.scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(250);
  const caja = await loc.boundingBox();
  await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await pagina.waitForTimeout(350);
  await foto(nombre, recorte);
};

// 1 · Lesiones: rangos con mínimo y máximo
await irA('salud');
await foto('01-lesiones-rangos.png', '#injuryChart');
await foto('02-protesis-barras.png', '#prosthetics');

// 3 · Tooltip de un intervalo
await conTip('#injuryChart .injRow', 0, '03-tooltip-lesion.png');
await conTip('#injuryChart .injRow', 3, '03b-tooltip-lesion-otra.png', '#salud .card:first-of-type');

// 4 · Tooltip del calendario
await irA('humano');
await conTip('#calendar [data-day]', 40, '04-tooltip-calendario.png');

// 5 · Tooltip de los mapas de clasificación
await irA('evolucion');
const mapa = pagina.locator('#pairedMaps svg').first();
await mapa.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(250);
const cajaMapa = await mapa.boundingBox();
await pagina.mouse.move(cajaMapa.x + cajaMapa.width * 0.48, cajaMapa.y + cajaMapa.height * 0.45);
await pagina.waitForTimeout(400);
await foto('05-tooltip-mapas.png');

// 6 · Tooltip de la cuadrícula nominal
await irA('memoria');
const lienzo = pagina.locator('#memCanvas');
await lienzo.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(300);
const cajaLienzo = await lienzo.boundingBox();
await pagina.mouse.move(cajaLienzo.x + 70, cajaLienzo.y + 70);
await pagina.waitForTimeout(350);
await foto('06-tooltip-cuadricula.png');

// 7 · Tablero integrado: cabecera, pestañas y lesiones
await irA('salud');
await pagina.evaluate(() => window.scrollTo(0, 0));
await pagina.waitForTimeout(400);
await foto('07-tablero-integrado.png', 'main');
await pagina.screenshot({ path: path.join(SALIDA, '08-tablero-ventana.png') });

await navegador.close();
console.log('capturas listas en evidencias/gaza-observatorio/tooltips');

