/**
 * Captura real del tablero integrado en el portafolio.
 *
 * Uso:
 *   node tools/capturar.mjs                 # escritorio (1440×900)
 *   node tools/capturar.mjs --movil         # móvil (390×844)
 *
 * Requiere el sitio (`python -m http.server 8000`) y la API (`uvicorn` en 8010)
 * en marcha. Guarda las imágenes en `evidencias/` y devuelve código 1 si la
 * consola del navegador registra errores.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const RAIZ = new URL('../', import.meta.url);
const EVIDENCIAS = fileURLToPath(new URL('evidencias/', RAIZ));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const RUTA = '/#/area/dashboards/atlas-vial';
const movil = process.argv.includes('--movil');

mkdirSync(EVIDENCIAS, { recursive: true });

const errores = [];

const navegador = await chromium.launch();
const contexto = await navegador.newContext(
  movil
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
);
const pagina = await contexto.newPage();

pagina.on('console', (mensaje) => {
  if (mensaje.type() === 'error') errores.push(`consola: ${mensaje.text()}`);
});
pagina.on('pageerror', (error) => errores.push(`excepción: ${error.message}`));
pagina.on('requestfailed', (peticion) => {
  errores.push(`petición fallida: ${peticion.url()} (${peticion.failure()?.errorText})`);
});

await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-app', { timeout: 45_000 });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
// Espera a que el mapa tenga puntos dibujados y las cifras estén estables.
await pagina.waitForFunction(
  () => {
    const valores = [...document.querySelectorAll('.at-kpi-valor')].map((nodo) => nodo.textContent || '');
    return valores.length === 4 && valores.every((texto) => /\d/.test(texto));
  },
  null,
  { timeout: 45_000 },
);
await pagina.waitForTimeout(1800);

/* El sitio usa desplazamiento suave: se desactiva para que los clics no se
   crucen con una animación en curso (en móvil la página es muy larga). */
await pagina.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
await pagina.evaluate(() => {
  const app = document.querySelector('.at-app');
  const cabecera = document.querySelector('header');
  const alto = cabecera ? cabecera.getBoundingClientRect().height : 0;
  if (app) {
    window.scrollTo({
      top: Math.max(0, app.getBoundingClientRect().top + window.scrollY - alto - 6),
      behavior: 'instant',
    });
  }
});
await pagina.waitForTimeout(700);

const sufijo = movil ? 'movil' : 'escritorio';
const kpis = await pagina.$$eval('.at-kpi', (nodos) =>
  nodos.map((nodo) => ({
    etiqueta: nodo.querySelector('.at-kpi-etiqueta')?.textContent,
    valor: nodo.querySelector('.at-kpi-valor')?.textContent,
  })),
);
const periodo = await pagina.textContent('[data-testid="periodo-consultado"]');

/* Primero la vista (con el tablero alineado arriba) y después la página completa:
   la captura de página completa puede dejar el desplazamiento al final. */
await pagina.screenshot({ path: `${EVIDENCIAS}/atlas-${sufijo}-inicial.png` });
await pagina.screenshot({
  path: `${EVIDENCIAS}/atlas-${sufijo}-vista-completa.png`,
  fullPage: true,
});
await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await pagina.waitForTimeout(300);

// Segunda vista: tiempo y entorno vial.
await pagina.getByRole('tab', { name: /Tiempo y entorno vial/i }).click({ timeout: 30_000 });
await pagina.waitForSelector('[data-testid="panel-matriz"]', { timeout: 30_000 });
await pagina.waitForTimeout(1200);
await pagina.screenshot({ path: `${EVIDENCIAS}/atlas-${sufijo}-tiempo.png`, fullPage: true });

// Tercera vista: personas y vehículos.
await pagina.getByRole('tab', { name: /Personas y vehículos/i }).click();
await pagina.waitForSelector('[data-testid="panel-matriz"]', { state: 'detached', timeout: 30_000 });
await pagina.waitForTimeout(1200);
await pagina.screenshot({ path: `${EVIDENCIAS}/atlas-${sufijo}-personas.png`, fullPage: true });

await navegador.close();

console.log(JSON.stringify({ movil, kpis, periodo, errores }, null, 2));
if (errores.length > 0) process.exitCode = 1;
