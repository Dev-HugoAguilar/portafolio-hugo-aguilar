/**
 * Captura real para la tarjeta del portafolio.
 *
 * La tarjeta usa `.project-list .cover { aspect-ratio: 2184 / 2220 }` con
 * `object-fit: contain`, así que la captura se toma **en esa misma proporción**
 * para que la imagen entre completa, sin recorte y sin deformación, y alinee en
 * altura con las demás tarjetas del área. No incluye el encabezado del sitio:
 * solo el tablero.
 *
 * Uso: node tools/capturar-tarjeta.mjs [--con-seleccion]
 * Genera `dist/img/atlas-vial-completo.jpg` y una copia en `evidencias/`.
 */

import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const RAIZ = new URL('../', import.meta.url);
const EVIDENCIAS = fileURLToPath(new URL('evidencias/', RAIZ));
const DESTINO = fileURLToPath(new URL('../../dist/img/atlas-vial-completo.jpg', RAIZ));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
/** Proporción del contenedor de la tarjeta (la misma de las demás capturas). */
const PROPORCION = 2184 / 2220;
const conSeleccion = process.argv.includes('--con-seleccion');

mkdirSync(EVIDENCIAS, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1440, height: 1700 },
  // Escala para que la captura final ronde los 2184 px de ancho (los de las demás tarjetas).
  deviceScaleFactor: 1.8,
});
const pagina = await contexto.newPage();
await pagina.goto(`${SITIO}/#/area/dashboards/atlas-vial`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(2500);

if (conSeleccion) {
  const ranking = await pagina.$$('[data-testid="ranking-alcaldias"] button');
  if (ranking[0]) await ranking[0].click();
  await pagina.waitForTimeout(1500);
}

const caja = await pagina.evaluate(() => {
  const app = document.querySelector('.at-app');
  if (!app) return null;
  const cabecera = document.querySelector('header');
  const altoCabecera = cabecera ? cabecera.getBoundingClientRect().height : 0;
  const rect = app.getBoundingClientRect();
  window.scrollTo({ top: rect.top + window.scrollY - altoCabecera - 4, behavior: 'instant' });
  const nueva = app.getBoundingClientRect();
  return { x: nueva.x, y: nueva.y, ancho: nueva.width };
});

if (!caja) throw new Error('No se encontró el tablero en la página');

await pagina.waitForTimeout(800);

const recorte = {
  x: Math.max(0, Math.round(caja.x)),
  y: Math.max(0, Math.round(caja.y)),
  width: Math.round(caja.ancho),
  height: Math.round(caja.ancho / PROPORCION),
};


const destino = conSeleccion ? `${EVIDENCIAS}/tarjeta-atlas-vial-seleccion.jpg` : DESTINO;
await pagina.screenshot({ path: destino, type: 'jpeg', quality: 82, clip: recorte });
console.log(
  `recorte ${recorte.width}×${recorte.height} px CSS · proporción ${PROPORCION.toFixed(4)}`,
);

copyFileSync(
  destino,
  conSeleccion ? `${EVIDENCIAS}/tarjeta-atlas-vial-seleccion.jpg` : `${EVIDENCIAS}/tarjeta-atlas-vial.jpg`,
);

console.log('captura guardada en', destino);
await navegador.close();
