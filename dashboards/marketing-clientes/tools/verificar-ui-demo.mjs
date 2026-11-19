/**
 * Verificación de la INTERFAZ con datos de prueba (no datos reales).
 *
 * Las cuatro vistas solo pueden comprobarse con una versión publicada. Como este
 * entorno no tiene acceso a BigQuery, se levanta una API aparte (puerto 8011 y base
 * `hugo_portfolio_demo`) con una versión sembrada por
 * `backend/tests/sembrar_demo.py`, que publica el mismo código de producción con un
 * conjunto **de demostración**. La app se apunta a esa API con
 * `window.PORTFOLIO_MARKETING_API`.
 *
 * Las capturas se guardan como `demo-*.png` y están etiquetadas como datos de
 * prueba: no representan cifras del conjunto GA4.
 *
 * Uso:
 *   node tools/verificar-ui-demo.mjs            # escritorio
 *   node tools/verificar-ui-demo.mjs --movil    # móvil
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
const SITIO = process.env.MARKETING_SITIO || 'http://127.0.0.1:8000';
const API_DEMO = process.env.MARKETING_API_DEMO || 'http://127.0.0.1:8011/api/v1/marketing';
const movil = process.argv.includes('--movil');

mkdirSync(EVIDENCIAS, { recursive: true });

const resultados = [];
const errores = [];
function comprobar(nombre, correcto, detalle = '') {
  resultados.push({ nombre, correcto });
  console.log(`${correcto ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext(
  movil
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true },
);
// La app resuelve la base de la API al montar: se fija antes de cargar el sitio.
await contexto.addInitScript((api) => {
  window.PORTFOLIO_MARKETING_API = api;
}, API_DEMO);

const pagina = await contexto.newPage();
pagina.on('console', (mensaje) => mensaje.type() === 'error' && errores.push(mensaje.text()));
pagina.on('pageerror', (error) => errores.push(error.message));

const sufijo = movil ? 'movil' : 'escritorio';

const kpis = async () =>
  pagina.$$eval('.mk-kpi', (nodos) =>
    nodos.map((nodo) => ({
      etiqueta: nodo.querySelector('.mk-kpi-etiqueta')?.textContent?.trim(),
      valor: nodo.querySelector('.mk-kpi-valor')?.textContent?.trim(),
    })),
  );

const irA = async (selector) => {
  await pagina.evaluate((sel) => {
    const nodo = document.querySelector(sel);
    if (nodo) window.scrollTo({ top: nodo.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant' });
  }, selector);
  await pagina.waitForTimeout(600);
};

await pagina.goto(`${SITIO}/#/area/dashboards/marketing-clientes`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.mk-app[data-disponible]', { timeout: 45_000 });
await pagina.waitForSelector('.mk-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(2000);
await pagina.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });

/* ---------------------------------------------------------------- resumen */
const disponible = await pagina.getAttribute('.mk-app', 'data-disponible');
comprobar('La app detecta datos publicados en la API de demostración', disponible === 'true', disponible ?? '');
const tarjetas = await kpis();
comprobar(
  'Los indicadores muestran cifras (ninguna dice «Sin datos»)',
  tarjetas.length === 8 && tarjetas.every((t) => t.valor && t.valor !== 'Sin datos'),
  tarjetas.map((t) => `${t.etiqueta}=${t.valor}`).join(' · '),
);
const sinDatos = await pagina.$('[data-testid="sin-datos"]');
comprobar('No aparece el panel de datos pendientes cuando hay datos', sinDatos === null);

const serie = await pagina.evaluate(() => ({
  svg: Boolean(document.querySelector('[data-testid="panel-serie"] svg')),
  zonas: document.querySelectorAll('[data-testid="panel-serie"] rect[role="button"]').length,
}));
comprobar('La serie diaria se dibuja con un punto por día', serie.svg && serie.zonas > 10, `${serie.zonas} días`);
await irA('[data-testid="panel-serie"]');
await pagina.screenshot({ path: `${EVIDENCIAS}/demo-resumen-${sufijo}.png` });

/* --------------------------------------------------------------- embudo */
await pagina.getByRole('button', { name: /^Conversión$/ }).first().click();
await pagina.waitForTimeout(1400);
const embudo = await pagina.evaluate(() => {
  const pasos = [...document.querySelectorAll('.mk-embudo-paso')].map((nodo) => ({
    etiqueta: nodo.querySelector('.mk-embudo-etiqueta')?.textContent?.trim(),
    valor: Number((nodo.querySelector('.mk-embudo-valor')?.textContent ?? '0').replace(/[^\d]/g, '')),
    ancho: parseFloat(nodo.querySelector('.mk-embudo-barra')?.style.width ?? '0'),
  }));
  const canales = document.querySelectorAll('[data-testid="panel-embudo-canal"] tbody tr').length;
  return { pasos, canales };
});
comprobar('El embudo dibuja los cuatro pasos', embudo.pasos.length === 4, embudo.pasos.map((p) => p.valor).join(' → '));
comprobar(
  'Los pasos decrecen y su ancho es proporcional',
  embudo.pasos.every((paso, indice) => indice === 0 || paso.valor <= embudo.pasos[indice - 1].valor) &&
    embudo.pasos[0].ancho >= embudo.pasos[3].ancho,
  embudo.pasos.map((p) => `${p.ancho}%`).join(' · '),
);
comprobar('El embudo por canal muestra filas', embudo.canales === 3, `${embudo.canales} canales`);
await irA('[data-testid="panel-embudo"]');
await pagina.screenshot({ path: `${EVIDENCIAS}/demo-conversion-${sufijo}.png` });

/* ------------------------------------------------------------- adquisición */
await pagina.getByRole('button', { name: /^Adquisición$/ }).first().click();
await pagina.waitForTimeout(1400);
const canales = await pagina.$$eval('[data-testid="panel-canales"] tbody tr', (filas) =>
  filas.map((fila) => ({
    canal: fila.querySelector('td')?.textContent?.trim().split('\n')[0] ?? '',
    celdas: [...fila.querySelectorAll('td')].slice(1).map((c) => c.textContent?.trim() ?? ''),
  })),
);
comprobar('La tabla de canales muestra los tres canales con sus métricas', canales.length === 3, canales.map((c) => c.canal).join(' | '));
await irA('[data-testid="panel-canales"]');
await pagina.screenshot({ path: `${EVIDENCIAS}/demo-adquisicion-${sufijo}.png` });

/* filtro por canal: OR dentro de la dimensión y AND entre dimensiones */
await pagina.locator('[data-testid="panel-canales"] tbody tr').first().click();
await pagina.waitForTimeout(1500);
const trasFiltro = await kpis();
const chips = await pagina.$$eval('.mk-chip', (nodos) => nodos.map((n) => (n.textContent ?? '').replace(/×|Quitar filtro/g, '').trim()));
const urlFiltro = new URL(pagina.url());
comprobar(
  'Seleccionar un canal filtra el tablero y queda en la URL',
  chips.length > 0 && urlFiltro.searchParams.getAll('mk_canal').length === 1,
  `${chips.join(' · ')} · ${urlFiltro.searchParams.getAll('mk_canal').join(',')}`,
);
comprobar(
  'Los indicadores cambian al filtrar por canal',
  trasFiltro[0]?.valor !== tarjetas[0]?.valor || trasFiltro[1]?.valor !== tarjetas[1]?.valor,
  `${tarjetas[1]?.valor} → ${trasFiltro[1]?.valor} usuarios`,
);

/* ---------------------------------------------------------------- cohortes */
await pagina.getByRole('button', { name: /^Cohortes y retención$/ }).first().click();
await pagina.waitForTimeout(1600);
const matriz = await pagina.evaluate(() => {
  const filas = document.querySelectorAll('[data-testid="panel-cohortes"] .mk-matriz tbody tr').length;
  const celdas = [...document.querySelectorAll('[data-testid="panel-cohortes"] .mk-matriz-celda')];
  const conValor = celdas.filter((c) => (c.textContent ?? '').includes('%')).length;
  const fuera = celdas.filter((c) => c.classList.contains('mk-matriz-celda--fuera')).length;
  return { filas, total: celdas.length, conValor, fuera };
});
comprobar('La matriz de cohortes tiene filas y celdas', matriz.filas > 0 && matriz.total > 0, `${matriz.filas} cohortes · ${matriz.total} celdas`);
comprobar(
  'Hay celdas con retención y celdas marcadas sin ventana',
  matriz.conValor > 0 && matriz.fuera > 0,
  `${matriz.conValor} con dato · ${matriz.fuera} sin ventana`,
);
await irA('[data-testid="panel-cohortes"]');
await pagina.screenshot({ path: `${EVIDENCIAS}/demo-cohortes-${sufijo}.png` });

// La dimensión de la cohorte se refleja en la URL.
await pagina.getByRole('button', { name: /^Dispositivo$/ }).first().click();
await pagina.waitForTimeout(1400);
const urlDim = new URL(pagina.url());
comprobar('La dimensión de cohorte se guarda en la URL', urlDim.searchParams.get('mk_d') === 'dispositivo', urlDim.searchParams.get('mk_d') ?? '');

/* ------------------------------------------------------------------ tabla */
await pagina.getByRole('button', { name: /^Resumen$/ }).first().click();
await pagina.waitForTimeout(1200);
await irA('[data-testid="panel-tabla"]');
const primeraFila = await pagina.textContent('[data-testid="panel-tabla"] tbody tr:first-child td:first-child');
await pagina.locator('[data-testid="panel-tabla"] .mk-orden', { hasText: 'Valor de compra' }).first().click();
await pagina.waitForTimeout(1200);
const trasOrden = await pagina.textContent('[data-testid="panel-tabla"] tbody tr:first-child td:first-child');
comprobar('La tabla se ordena por otra columna', Boolean(trasOrden) && trasOrden !== primeraFila, `${primeraFila?.trim()} → ${trasOrden?.trim()}`);

await pagina.locator('[data-testid="panel-tabla"] .mk-paginacion-botones button', { hasText: 'Siguiente' }).first().click();
await pagina.waitForTimeout(1200);
const urlPagina = new URL(pagina.url());
comprobar('La tabla pagina y lo refleja en la URL', urlPagina.searchParams.get('mk_pagina') === '2', urlPagina.searchParams.get('mk_pagina') ?? '');
await pagina.screenshot({ path: `${EVIDENCIAS}/demo-tabla-${sufijo}.png` });

/* ------------------------------------------------------------ exportación */
const [descarga] = await Promise.all([
  pagina.waitForEvent('download', { timeout: 60_000 }),
  pagina.getByRole('button', { name: /Exportar CSV/i }).first().click(),
]);
const contenido = (await (await import('node:fs/promises')).readFile(await descarga.path(), 'utf8')) ?? '';
const lineas = contenido.split('\n').filter((l) => l.trim().length > 0);
comprobar(
  'La exportación descarga un CSV con fuente, definiciones y filtros',
  descarga.suggestedFilename().endsWith('.csv') &&
    contenido.includes('Fuente:') &&
    contenido.includes('Definiciones:') &&
    contenido.includes('Filtros aplicados:'),
  `${descarga.suggestedFilename()} · ${lineas.length} líneas`,
);
const filasDatos = lineas.filter((linea) => !linea.startsWith('#'));
comprobar(
  'La exportación no incluye identificadores de personas',
  !filasDatos.some((linea) => /user_pseudo|\bdemo-\d{3}\b|\b[0-9a-f]{32}\b/.test(linea)),
  `${filasDatos.length - 1} filas de datos revisadas`,
);

/* --------------------------------------------- enlace compartido del estado */
const enlace = pagina.url();
await pagina.goto(enlace, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.mk-app[data-disponible]', { timeout: 45_000 });
await pagina.waitForTimeout(2200);
const restaurado = await pagina.evaluate(() => ({
  vista: document.querySelector('.mk-nav-btn.is-activa')?.textContent?.trim(),
  chips: [...document.querySelectorAll('.mk-chip')].map((n) => (n.textContent ?? '').replace(/×|Quitar filtro/g, '').trim()),
  pagina: new URL(window.location.href).searchParams.get('mk_pagina'),
}));
comprobar(
  'El enlace compartido restaura vista, filtros y página',
  restaurado.chips.length > 0 && restaurado.pagina === '2',
  `${restaurado.vista} · ${restaurado.chips.join(', ')} · página ${restaurado.pagina}`,
);

/* limpia el filtro para dejar la captura final sin selección */
await pagina.locator('.mk-chip--todo').first().click();
await pagina.waitForTimeout(1500);

/* ----------------------------------------------------- comparación válida */
const conPeriodo = new URL(pagina.url());
conPeriodo.searchParams.set('mk_desde', '2020-11-16');
conPeriodo.searchParams.set('mk_hasta', '2020-11-29');
await pagina.goto(conPeriodo.toString(), { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.mk-app[data-disponible]', { timeout: 45_000 });
await pagina.waitForTimeout(2200);
const comparacion = (await pagina.textContent('.mk-panel--comparacion')) ?? '';
comprobar(
  'La comparación aparece cuando la ventana anterior existe',
  comparacion.includes('Periodo anterior'),
  comparacion.replace(/\s+/g, ' ').slice(0, 80),
);
await pagina.evaluate(() => {
  const app = document.querySelector('.mk-app');
  const cabecera = document.querySelector('header');
  const alto = cabecera ? cabecera.getBoundingClientRect().height : 0;
  if (app) window.scrollTo({ top: app.getBoundingClientRect().top + window.scrollY - alto - 6, behavior: 'instant' });
});
await pagina.waitForTimeout(500);
await pagina.screenshot({ path: `${EVIDENCIAS}/demo-app-${sufijo}.png` });

/* ------------------------------------------------------------------ cierre */
const ancho = await pagina.evaluate(() => ({ doc: document.documentElement.scrollWidth, v: window.innerWidth }));
comprobar('Sin desbordamiento horizontal', ancho.doc <= ancho.v + 1, `${ancho.doc} / ${ancho.v}`);
comprobar('Sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

await navegador.close();
const fallos = resultados.filter((r) => !r.correcto);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas`);
if (fallos.length > 0) process.exitCode = 1;
