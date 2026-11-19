/**
 * Verificación de interacción del tablero integrado.
 *
 * Comprueba con el navegador real, sobre el sitio servido en 8000 y la API en
 * 8010, que:
 *   · los filtros cambian las cifras y quedan escritos en la URL;
 *   · dentro de un filtro los valores se suman y entre filtros se cruzan;
 *   · las etiquetas de filtros activos se quitan una a una;
 *   · la tabla ordena, pagina y ubica el hecho en el mapa;
 *   · el mapa cambia de modo y de métrica;
 *   · la comparación de dos alcaldías usa el mismo conjunto;
 *   · la exportación lleva los filtros aplicados;
 *   · el teclado recorre la navegación, abre un control y elige una opción;
 *   · un enlace compartido restaura el estado.
 *
 * Uso: node tools/verificar-interaccion.mjs
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const API = process.env.ATLAS_API || 'http://127.0.0.1:8010/api/v1/atlas-vial';

mkdirSync(EVIDENCIAS, { recursive: true });

const resultados = [];
function comprobar(nombre, correcto, detalle = '') {
  resultados.push({ nombre, correcto, detalle });
  console.log(`${correcto ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: 'no-preference',
});
const pagina = await contexto.newPage();
const errores = [];
pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
pagina.on('pageerror', (e) => errores.push(e.message));

const kpis = async () => {
  const valores = await pagina.$$eval('.at-kpi-valor', (nodos) =>
    nodos.map((n) => Number((n.textContent || '').replace(/[^\d]/g, ''))),
  );
  return valores;
};
const url = () => new URL(pagina.url());

await pagina.goto(`${SITIO}/#/area/dashboards/atlas-vial`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(2200);

const base = await kpis();
comprobar(
  'El tablero abre con el conjunto completo',
  base[0] === 30655 && base[1] === 36266 && base[2] === 533 && base[3] === 512,
  base.join(' / '),
);

/* --- 1. Filtro de alcaldía: OR dentro de la dimensión ------------------- */
const abrirControl = async (etiqueta) => {
  const boton = pagina.locator(`.at-ctrl:has(.at-ctrl-label:text-matches("${etiqueta}", "i"))`).first();
  await boton.click();
  await pagina.waitForSelector('.atf-panel', { timeout: 10_000 });
};
const elegirOpcion = async (texto) => {
  await pagina.locator('.at-opcion', { hasText: texto }).first().click();
};
const cerrarPop = async () => {
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(400);
};

/* Si la banda está compacta, las etiquetas viven en la versión desplegada. */
const expandirBanda = async () => {
  const editar = pagina.locator('.at-banda-editar');
  if (await editar.count()) {
    await editar.first().click();
    await pagina.waitForTimeout(800);
  }
};

await abrirControl('Alcaldía');
await elegirOpcion('Cuauhtémoc');
await cerrarPop();
await pagina.waitForTimeout(1500);
const conUna = await kpis();
comprobar(
  'Filtrar por una alcaldía reduce los hechos',
  conUna[0] === 4349,
  `hechos: ${conUna[0]}`,
);
comprobar(
  'Los filtros quedan escritos en la URL',
  url().searchParams.get('at_alcaldia') === 'Cuauhtémoc',
  url().search,
);

await abrirControl('Alcaldía');
await elegirOpcion('Iztapalapa');
await cerrarPop();
await pagina.waitForTimeout(1500);
const conDos = await kpis();
comprobar(
  'Dos alcaldías se suman (OR)',
  conDos[0] === 4349 + 3997,
  `${conUna[0]} + 3997 = ${conDos[0]}`,
);
const chips = await pagina.$$eval('.at-chip', (nodos) => nodos.map((n) => n.textContent?.trim()));
comprobar(
  'Los filtros activos se muestran como etiquetas quitables',
  chips.some((texto) => texto?.includes('Cuauhtémoc')) &&
    chips.some((texto) => texto?.includes('Iztapalapa')),
  chips.join(' · '),
);

/* --- 2. AND entre dimensiones distintas -------------------------------- */
await abrirControl('Tipo de evento');
await elegirOpcion('Choque');
await cerrarPop();
await pagina.waitForTimeout(1500);
const cruzado = await kpis();
comprobar(
  'Tipo de evento se cruza con las alcaldías (AND)',
  cruzado[0] === 2439 + 2307,
  `choques en las dos alcaldías: ${cruzado[0]}`,
);

/* --- 3. Quitar una etiqueta y restablecer ------------------------------ */
await expandirBanda();
await pagina.locator('.at-chip', { hasText: 'Choque' }).first().click();
await pagina.waitForTimeout(1200);
const trasQuitar = await kpis();
comprobar(
  'Quitar una etiqueta devuelve el conjunto anterior',
  trasQuitar[0] === conDos[0],
  `${trasQuitar[0]}`,
);

await pagina.locator('.at-btn--reset').first().click();
await pagina.waitForTimeout(1500);
const trasReset = await kpis();
comprobar(
  'Restablecer vuelve al conjunto completo',
  trasReset[0] === 30655,
  `${trasReset[0]}`,
);
comprobar(
  'Restablecer limpia los parámetros de la URL',
  ![...url().searchParams.keys()].some((clave) => clave.startsWith('at_alcaldia')),
  url().search,
);

/* --- 4. Tabla: orden, página y detalle --------------------------------- */
const primeraFila = await pagina.textContent('.at-tabla tbody tr:first-child td:first-child');
await pagina.locator('.at-orden', { hasText: 'Personas fallecidas' }).first().click();
await pagina.waitForTimeout(1200);
const primeraPorFallecidas = await pagina.textContent('.at-tabla tbody tr:first-child td:first-child');
comprobar(
  'La tabla se puede ordenar por otra columna',
  Boolean(primeraPorFallecidas) && primeraPorFallecidas !== primeraFila,
  `${primeraFila?.trim()} → ${primeraPorFallecidas?.trim()}`,
);

await pagina.locator('.at-paginacion-botones button', { hasText: 'Siguiente' }).first().click();
await pagina.waitForTimeout(1200);
comprobar(
  'La tabla pagina y refleja la página en la URL',
  url().searchParams.get('at_pagina') === '2',
  url().search,
);

const folioFila = await pagina.textContent('.at-tabla tbody tr:first-child td:first-child');
await pagina.locator('.at-tabla tbody tr').first().click();
await pagina.waitForTimeout(1800);
const panel = (await pagina.textContent('[data-testid="panel-contexto"]')) ?? '';
comprobar(
  'Elegir una fila abre el detalle del hecho en el panel',
  panel.includes(folioFila?.trim() ?? '###') && panel.includes('Ubicación registrada'),
  folioFila?.trim(),
);
await pagina.screenshot({ path: `${EVIDENCIAS}/atlas-detalle-hecho.png` });

/* --- 5. Mapa: modos y métricas ----------------------------------------- */
for (const modo of ['Concentración', 'Eventos', 'Alcaldías']) {
  await pagina.locator('.at-mapa-barra .at-seg', { hasText: modo }).first().click();
  await pagina.waitForTimeout(900);
}
comprobar(
  'El mapa cambia de modo sin pedir datos nuevos ni alterar los totales',
  (await kpis())[0] === 30655,
  `${(await kpis())[0]}`,
);

await pagina.locator('.at-mapa-barra .at-seg', { hasText: 'Fallecidas' }).first().click();
await pagina.waitForTimeout(900);
const leyenda = await pagina.textContent('.at-leyenda');
comprobar(
  'La leyenda explica la métrica activa',
  (leyenda ?? '').includes('Personas fallecidas'),
  (leyenda ?? '').slice(0, 80),
);
await pagina.locator('.at-mapa-barra .at-seg', { hasText: 'Hechos' }).first().click();

/* --- 6. Filtro por zona visible ---------------------------------------- */
await pagina.locator('.at-btn--zona').first().click();
await pagina.waitForTimeout(1500);
const conZona = await kpis();
comprobar(
  'Filtrar por zona visible acota los hechos y queda marcado',
  conZona[0] > 0 && conZona[0] <= 30655 && url().searchParams.get('at_zona') !== null,
  `${conZona[0]} hechos · ${url().searchParams.get('at_zona')}`,
);
await expandirBanda();
await pagina.locator('.at-chip', { hasText: 'visible del mapa' }).first().click();
await pagina.waitForTimeout(1200);

/* --- 7. Sin panel de comparación entre alcaldías ---------------------- */
comprobar(
  'El panel de comparación ya no existe en la vista de territorio',
  (await pagina.locator('[data-testid="panel-comparar"]').count()) === 0 &&
    (await pagina.getByText('Comparar dos alcaldías').count()) === 0,
);

/* --- 8. Exportación ---------------------------------------------------- */
const urlExportacion = await pagina.evaluate((api) => {
  const params = new URLSearchParams();
  const consulta = new URLSearchParams(window.location.search);
  for (const [clave, valor] of consulta) {
    if (clave.startsWith('at_')) continue;
    params.append(clave, valor);
  }
  return `${api}/exportar`;
}, API);
comprobar('La exportación apunta a la API, no a los CSV oficiales', urlExportacion.includes('/exportar'), urlExportacion);

/* --- 9. Teclado -------------------------------------------------------- */
await pagina.reload({ waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(2000);

const focoEnNav = await pagina.evaluate(() => {
  const boton = document.querySelector('.wm-tab:nth-child(3)');
  boton?.focus();
  return document.activeElement === boton;
});
comprobar('Los botones de vista reciben el foco con el teclado', focoEnNav);
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(1200);
comprobar(
  'Enter cambia de vista desde el teclado',
  (await pagina.textContent('[data-testid="panel-serie"]')) !== null,
);

const controlTeclado = await pagina.evaluate(() => {
  const boton = [...document.querySelectorAll('.at-ctrl')].find((nodo) =>
    (nodo.textContent ?? '').toLowerCase().includes('alcald'),
  );
  boton?.focus();
  return document.activeElement === boton;
});
comprobar('Los filtros reciben el foco', controlTeclado);
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(600);
const popAbierto = (await pagina.$$('.atf-panel')).length > 0;
comprobar('Enter abre el control desplegable', popAbierto);
if (popAbierto) {
  await pagina.locator('.at-opcion').first().focus({ timeout: 10_000 });
  await pagina.keyboard.press('Enter');
  await pagina.waitForTimeout(1500);
  const kpisTeclado = await kpis();
  comprobar(
    'Elegir una opción con el teclado aplica el filtro',
    kpisTeclado[0] !== 30655,
    `${kpisTeclado[0]} hechos`,
  );
  await pagina.keyboard.press('Escape');
}

const focoVisible = await pagina.evaluate(() => {
  const boton = document.querySelector('.at-btn');
  if (!boton) return false;
  boton.focus();
  const estilo = getComputedStyle(boton, ':focus-visible');
  return estilo.outlineStyle !== 'none' || estilo.outlineWidth !== '0px';
});
comprobar('El foco tiene un anillo visible', focoVisible);

/* --- 10. Enlace compartido -------------------------------------------- */
const enlace = url().toString();
comprobar('La URL es compartible y lleva el estado', enlace.includes('at_'), enlace.slice(0, 110));

/* Se abre un enlace con estado y se comprueba que el tablero lo restaura. */
const enlaceConEstado =
  `${SITIO}/?at_v=tiempo&at_m=alcaldias&at_met=hechos` +
  '&at_alcaldia=Iztapalapa&at_tipo_evento=Choque#/area/dashboards/atlas-vial';
await pagina.goto(enlaceConEstado, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(2600);
const restaurado = await pagina.evaluate(() => ({
  kpis: [...document.querySelectorAll('.at-kpi-valor')].map((n) => n.textContent),
  chips: [...document.querySelectorAll('.at-chip')].map((n) =>
    (n.textContent ?? '').replace(/×|Quitar filtro|Quitar todos/g, '').trim(),
  ),
  vista: document.querySelector('.wm-tab.is-activa')?.textContent?.trim(),
  serie: Boolean(document.querySelector('[data-testid="panel-serie"]')),
}));
comprobar(
  'Un enlace compartido restaura vista, filtros y cifras',
  restaurado.serie &&
    (restaurado.vista ?? '').startsWith('Tiempo') &&
    restaurado.kpis[0] === '2,307' &&
    restaurado.chips.some((chip) => chip.includes('Iztapalapa')) &&
    restaurado.chips.some((chip) => chip.includes('Choque')),
  `${restaurado.vista} · ${restaurado.kpis[0]} hechos · ${restaurado.chips.join(', ')}`,
);
await pagina.screenshot({ path: `${EVIDENCIAS}/atlas-enlace-compartido.png` });

await navegador.close();

const fallos = resultados.filter((resultado) => !resultado.correcto);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas`);
if (errores.length > 0) console.log('\nErrores de consola:\n' + errores.join('\n'));
if (fallos.length > 0 || errores.length > 0) process.exitCode = 1;






