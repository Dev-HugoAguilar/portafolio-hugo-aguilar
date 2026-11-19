/**
 * Comprobación de que el panel «Comparar dos alcaldías» ya no existe.
 *
 * Uso: node tools/verificar-sin-comparador.mjs
 * Guarda capturas en `evidencias/limpieza/`.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/limpieza/', new URL('../', import.meta.url)));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const URL_APP = `${SITIO}/#/area/dashboards/atlas-vial`;

mkdirSync(EVIDENCIAS, { recursive: true });

const resultados = [];
function revisar(nombre, condicion, detalle = '') {
  resultados.push({ nombre, ok: Boolean(condicion) });
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const pagina = await contexto.newPage();

const errores = [];
pagina.on('pageerror', (error) => errores.push(String(error)));
pagina.on('console', (mensaje) => {
  if (mensaje.type() === 'error') errores.push(mensaje.text());
});

await pagina.goto(URL_APP, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="panel-linea"] svg[role="img"]', { timeout: 45_000 });
await pagina.waitForTimeout(1800);

revisar('el panel de comparación ya no se renderiza', (await pagina.locator('[data-testid="panel-comparar"]').count()) === 0);
revisar('no queda el título «Comparar dos alcaldías»', (await pagina.getByText('Comparar dos alcaldías').count()) === 0);
revisar(
  'tampoco el control Volumen / Composición %',
  (await pagina.getByRole('button', { name: /Composición/ }).count()) === 0,
);
revisar(
  'sin selects «Elige una alcaldía…»',
  (await pagina.locator('select').filter({ hasText: 'Elige una alcaldía' }).count()) === 0,
);

/* El resto de la vista sigue en pie. */
const colonias = await pagina.locator('[data-testid="colonias-grafica"]').count();
const linea = await pagina.locator('[data-testid="tl-paneles"] .at-tl-panel').count();
const mapa = await pagina.locator('[data-testid="panel-mapa"]').count();
const kpis = await pagina.locator('.at-kpi-valor').count();
revisar('colonias, línea temporal, mapa y KPIs siguen ahí', colonias === 1 && linea === 3 && mapa === 1 && kpis === 4,
  `colonias=${colonias} series=${linea} mapa=${mapa} kpis=${kpis}`);

/* Orden final de los paneles: la gráfica temporal es el último bloque. */
const orden = await pagina.evaluate(() =>
  [...document.querySelectorAll('.at-panel')]
    .filter((nodo) => nodo.getBoundingClientRect().height > 0)
    .map((nodo) => nodo.getAttribute('data-testid') ?? nodo.className.split(' ').pop()),
);
console.log('paneles visibles:', orden.join(' → '));
revisar('ningún panel vacío al final de la columna', orden[orden.length - 1] === 'panel-linea');

/* La URL ya no escribe parámetros de comparación. */
const url = pagina.url();
revisar('la URL ya no incluye at_a ni at_b', !/[?&]at_[ab]=/.test(url), url.split('?')[1] ?? '(sin consulta)');

/* Navegación por pestañas intacta. */
for (const pestaña of ['Tiempo y entorno vial', 'Personas y vehículos']) {
  await pagina.getByRole('button', { name: new RegExp(pestaña, 'i') }).click();
  await pagina.waitForTimeout(900);
  revisar(`vista «${pestaña}» sigue abriendo`, (await pagina.locator('[data-testid="panel-comparar"]').count()) === 0);
}
await pagina.getByRole('button', { name: /^Territorio$/ }).click();
await pagina.waitForTimeout(1200);

revisar('sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

await pagina.locator('[data-testid="panel-linea"]').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(500);
await pagina.screenshot({ path: `${EVIDENCIAS}/territorio-sin-comparador.png`, fullPage: true });
console.log('captura de página completa guardada');

await navegador.close();

const fallas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallas.length}/${resultados.length} comprobaciones correctas`);
process.exit(fallas.length === 0 ? 0 : 1);
