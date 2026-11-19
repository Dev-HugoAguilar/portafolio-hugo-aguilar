/**
 * Capturas por elemento para revisar detalles de diseño (uso interno).
 *
 * Uso: node tools/capturar-elementos.mjs [--movil]
 * Guarda en `evidencias/vista-*.png`.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const movil = process.argv.includes('--movil');

mkdirSync(EVIDENCIAS, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext(
  movil
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
);
const pagina = await contexto.newPage();
await pagina.goto(`${SITIO}/#/area/dashboards/atlas-vial`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(2200);

const sufijo = movil ? 'movil' : 'escritorio';

async function capturar(selector, nombre) {
  const nodo = await pagina.$(selector);
  if (!nodo) {
    console.log(`sin elemento: ${selector}`);
    return;
  }
  await nodo.screenshot({ path: `${EVIDENCIAS}/vista-${nombre}-${sufijo}.png` });
  console.log(`ok ${nombre}`);
}

await capturar('[data-testid="panel-mapa"]', 'mapa');
await capturar('[data-testid="panel-contexto"]', 'contexto');
await capturar('[data-testid="panel-linea"]', 'linea');
await capturar('[data-testid="kpis"]', 'kpis');

// Vista de tiempo y de personas.
await pagina.getByRole('tab', { name: /Tiempo y entorno vial/i }).click();
await pagina.waitForSelector('[data-testid="panel-matriz"]');
await pagina.waitForTimeout(1400);
await capturar('[data-testid="panel-serie"]', 'serie');
await capturar('[data-testid="panel-matriz"]', 'matriz');

await pagina.getByRole('tab', { name: /Personas y vehículos/i }).click();
await pagina.waitForTimeout(1400);
const personas = await pagina.$('.at-vista--personas');
if (personas) await personas.screenshot({ path: `${EVIDENCIAS}/vista-personas-${sufijo}.png` });

// Mapa en modo concentración y eventos.
await pagina.getByRole('button', { name: /^Territorio$/ }).click();
await pagina.waitForTimeout(900);
await pagina.getByRole('button', { name: /^Concentración$/ }).click();
await pagina.waitForTimeout(1400);
await capturar('[data-testid="panel-mapa"]', 'mapa-concentracion');
await pagina.getByRole('button', { name: /^Eventos$/ }).click();
await pagina.waitForTimeout(1400);
await capturar('[data-testid="panel-mapa"]', 'mapa-eventos');

// Una alcaldía seleccionada (clic en la lista del panel contextual).
const primera = await pagina.$('[data-testid="ranking-alcaldias"] button');
if (primera) {
  await primera.click();
  await pagina.waitForTimeout(1200);
  await capturar('[data-testid="panel-contexto"]', 'contexto-alcaldia');
}

await navegador.close();
