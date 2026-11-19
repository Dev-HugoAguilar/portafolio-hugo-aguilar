/**
 * Verificación visual de la integración en el portafolio.
 *
 * Comprueba, con el sitio real servido en 8000 y la API en 8010:
 *  · la tarjeta del proyecto en la galería del área (imagen arriba, texto abajo);
 *  · la navegación interna entre el área y el proyecto;
 *  · el tablero financiero existente sigue montando.
 *
 * Uso: node tools/revisar-portafolio.mjs
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';

mkdirSync(EVIDENCIAS, { recursive: true });

const errores = [];
const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const pagina = await contexto.newPage();
pagina.on('console', (mensaje) => {
  if (mensaje.type() === 'error') errores.push(`consola: ${mensaje.text()}`);
});
pagina.on('pageerror', (error) => errores.push(`excepción: ${error.message}`));

/* 1. Galería del área con la tarjeta nueva. */
await pagina.goto(`${SITIO}/#/area/dashboards`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.project-card', { timeout: 30_000 });
await pagina.waitForTimeout(1200);

const tarjeta = await pagina.$('.project-card[data-categoria="Movilidad"]');
if (!tarjeta) throw new Error('No aparece la tarjeta de la categoría Movilidad');
await tarjeta.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(700);
await tarjeta.screenshot({ path: `${EVIDENCIAS}/portafolio-tarjeta-atlas.png` });

const datosTarjeta = await tarjeta.evaluate((nodo) => {
  const imagen = nodo.querySelector('img');
  const caja = nodo.querySelector('.cover');
  return {
    titulo: nodo.querySelector('h3')?.textContent?.trim(),
    categoria: nodo.querySelector('.card-meta span')?.textContent?.trim(),
    estado: nodo.querySelector('.chip, .card-meta')?.textContent?.trim(),
    texto: nodo.querySelector('.card-text')?.textContent?.trim(),
    imagen: imagen?.getAttribute('src'),
    imagenAncho: imagen?.naturalWidth,
    imagenAlto: imagen?.naturalHeight,
    ajuste: caja ? getComputedStyle(imagen).objectFit : null,
    proporcionCaja: caja ? (caja.clientWidth / caja.clientHeight).toFixed(3) : null,
  };
});

await pagina.screenshot({ path: `${EVIDENCIAS}/portafolio-area-dashboards.png` });

/* 2. Navegación interna al proyecto. */
await pagina.click('#project-link-atlas-vial');
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(1600);
const url = pagina.url();
const kpis = await pagina.$$eval('.at-kpi-valor', (nodos) => nodos.map((n) => n.textContent));

/* 3. El tablero financiero sigue funcionando. */
await pagina.goto(`${SITIO}/#/area/dashboards/comparativo-bancario`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.bm-kpi, .bm-app', { timeout: 45_000 });
await pagina.waitForTimeout(2500);
const finanzas = await pagina.evaluate(() => ({
  montado: Boolean(document.querySelector('.bm-app')),
  kpis: [...document.querySelectorAll('.bm-kpi-valor, .bm-kpi strong')].slice(0, 4).map((n) => n.textContent),
  titulo: document.querySelector('.bm-title h2, .bm-title h1')?.textContent ?? null,
}));

await navegador.close();

console.log(
  JSON.stringify({ tarjeta: datosTarjeta, proyecto: { url, kpis }, finanzas, errores }, null, 2),
);
if (errores.length > 0) process.exitCode = 1;
