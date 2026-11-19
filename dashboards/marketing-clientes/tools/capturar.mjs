/**
 * Capturas por vista y por panel (uso interno de evidencias).
 *
 * Uso: node tools/capturar.mjs [--movil]
 * Guarda en `evidencias/` las capturas de cada vista con el panel principal a la
 * vista, para que la estructura se pueda revisar aunque todavía no haya datos.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
const SITIO = process.env.MARKETING_SITIO || 'http://127.0.0.1:8000';
const movil = process.argv.includes('--movil');

mkdirSync(EVIDENCIAS, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext(
  movil
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
);
const pagina = await contexto.newPage();
const errores = [];
pagina.on('pageerror', (error) => errores.push(error.message));
pagina.on('console', (mensaje) => mensaje.type() === 'error' && errores.push(mensaje.text()));

await pagina.goto(`${SITIO}/#/area/dashboards/marketing-clientes`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.mk-app[data-disponible]', { timeout: 45_000 });
await pagina.waitForSelector('.mk-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(1800);
await pagina.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });

const sufijo = movil ? 'movil' : 'escritorio';

const irA = async (selector) => {
  await pagina.evaluate((sel) => {
    const nodo = document.querySelector(sel);
    if (nodo) window.scrollTo({ top: nodo.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant' });
  }, selector);
  await pagina.waitForTimeout(700);
};

const vistas = [
  { boton: 'Resumen', nombre: 'resumen', panel: '[data-testid="panel-serie"]' },
  { boton: 'Adquisición', nombre: 'adquisicion', panel: '[data-testid="panel-canales"]' },
  { boton: 'Conversión', nombre: 'conversion', panel: '[data-testid="panel-embudo"]' },
  { boton: 'Cohortes y retención', nombre: 'cohortes', panel: '[data-testid="panel-cohortes"]' },
];

for (const vista of vistas) {
  await pagina.getByRole('button', { name: new RegExp(`^${vista.boton}$`) }).first().click();
  await pagina.waitForTimeout(900);
  await irA(vista.panel);
  await pagina.screenshot({ path: `${EVIDENCIAS}/panel-${vista.nombre}-${sufijo}.png` });
  const nodo = await pagina.$(vista.panel);
  if (nodo) await nodo.screenshot({ path: `${EVIDENCIAS}/detalle-${vista.nombre}-${sufijo}.png` });
}

// Vista completa de la aplicación en su estado actual.
await pagina.getByRole('button', { name: /^Resumen$/ }).first().click();
await pagina.waitForTimeout(600);
await pagina.evaluate(() => {
  const app = document.querySelector('.mk-app');
  const cabecera = document.querySelector('header');
  const alto = cabecera ? cabecera.getBoundingClientRect().height : 0;
  if (app) window.scrollTo({ top: app.getBoundingClientRect().top + window.scrollY - alto - 6, behavior: 'instant' });
});
await pagina.waitForTimeout(500);
await pagina.screenshot({ path: `${EVIDENCIAS}/app-${sufijo}.png` });

await navegador.close();
console.log(JSON.stringify({ sufijo, errores }));
if (errores.length > 0) process.exitCode = 1;
