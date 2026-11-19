/**
 * Captura el estado de la barra de filtros y del desplegable «Tipo de vehículo»
 * en tres anchos y con combinaciones de selección, para comparar el antes y el
 * después del piloto sin cambiar el comportamiento de los filtros.
 *
 * Uso: node tools/capturar-filtros.mjs antes|despues
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ETIQUETA = process.argv[2] ?? 'antes';
const EVIDENCIAS = fileURLToPath(new URL('evidencias/filtros/', new URL('../', import.meta.url)));
mkdirSync(EVIDENCIAS, { recursive: true });

const SITIO = 'http://127.0.0.1:8000';
const RUTA = '/#/area/dashboards/atlas-vial';
const capturas = {};

const navegador = await chromium.launch();

async function abrirVehiculo(pagina) {
  const mas = pagina.locator('[data-testid="mas-filtros"]');
  if (await mas.count()) {
    await mas.first().click();
    await pagina.waitForTimeout(320);
    await pagina.locator('[data-testid="mf-tiposVehiculo"]').first().click();
  } else {
    await pagina.locator('.at-ctrl[aria-label^="Tipo de vehículo"]').first().click();
  }
  await pagina.waitForTimeout(420);
}

const medir = (pagina) =>
  pagina.evaluate(() => ({
    kpis: [...document.querySelectorAll('.at-kpi-valor')].map((n) => n.textContent.trim()),
    chips: [...document.querySelectorAll('.at-chip')].map((n) =>
      (n.textContent ?? '').replace(/×|Quitar filtro|Quitar todos/g, '').trim(),
    ),
    url: new URLSearchParams(location.search).toString(),
  }));

/* ---------------- escritorio: barra, desplegable y cifras ---------------- */
const escritorio = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: 'es-MX',
});
const pagina = await escritorio.newPage();
await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2200);

await pagina.locator('[data-testid="filtros"]').screenshot({
  path: `${EVIDENCIAS}barra-${ETIQUETA}-1440-vacia.png`,
});
await pagina.screenshot({ path: `${EVIDENCIAS}vista-${ETIQUETA}-1440-vacia.png` });
capturas.sinFiltros = await medir(pagina);

await abrirVehiculo(pagina);
await pagina.screenshot({ path: `${EVIDENCIAS}vehiculo-${ETIQUETA}-1440-abierto.png` });
const panelAbierto = pagina.locator('.at-pop:visible, .atf-panel:visible').last();
await panelAbierto.screenshot({ path: `${EVIDENCIAS}vehiculo-${ETIQUETA}-1440-panel.png` });

/* Una selección. */
await pagina.locator('.at-opcion', { hasText: 'Motocicleta' }).first().click();
await pagina.waitForTimeout(1400);
capturas.unaSeleccion = await medir(pagina);
await panelAbierto.screenshot({ path: `${EVIDENCIAS}vehiculo-${ETIQUETA}-1440-una.png` });

/* Búsqueda que no coincide con lo ya elegido: la selección se conserva. */
const buscador = pagina.locator('.at-pop-buscar input:visible, .atf-buscar input:visible').last();
const hayBuscador = await buscador.count();
if (hayBuscador) {
  await buscador.fill('auto');
  await pagina.waitForTimeout(320);
  await panelAbierto.screenshot({ path: `${EVIDENCIAS}vehiculo-${ETIQUETA}-1440-busqueda.png` });
  const conservada = await pagina.evaluate(() =>
    [...document.querySelectorAll('.at-opcion[aria-pressed="true"], .atf-opcion[aria-pressed="true"]')].length,
  );
  capturas.seleccionConservadaConBusqueda = conservada;
  await buscador.fill('zzzz');
  await pagina.waitForTimeout(320);
  capturas.estadoVacio = await pagina.evaluate(() => {
    const nodo = document.querySelector('.at-pop-vacio, .atf-vacio');
    return nodo ? { texto: nodo.textContent.trim(), botones: nodo.querySelectorAll('button').length } : null;
  });
  await panelAbierto.screenshot({ path: `${EVIDENCIAS}vehiculo-${ETIQUETA}-1440-sin-coincidencias.png` });
  const borrar = pagina.locator('.atf-vacio button, .at-pop-vacio button').first();
  if (await borrar.count()) await borrar.click();
  else await buscador.fill('');
  await pagina.waitForTimeout(320);
}

/* Segunda selección (multiselección). */
await pagina.locator('.at-opcion', { hasText: 'Automóvil' }).first().click();
await pagina.waitForTimeout(1500);
capturas.dosSelecciones = await medir(pagina);
await panelAbierto.screenshot({ path: `${EVIDENCIAS}vehiculo-${ETIQUETA}-1440-dos.png` });
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(600);
await pagina.locator('[data-testid="filtros"]').screenshot({
  path: `${EVIDENCIAS}barra-${ETIQUETA}-1440-activa.png`,
});
await pagina.screenshot({ path: `${EVIDENCIAS}vista-${ETIQUETA}-1440-activa.png` });

/* Recarga: los filtros persisten. */
await pagina.reload({ waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2600);
capturas.trasRecarga = await medir(pagina);
await pagina.locator('[data-testid="filtros"]').screenshot({
  path: `${EVIDENCIAS}barra-${ETIQUETA}-1440-recarga.png`,
});

/* Búsqueda vacía: foco y teclado. */
await abrirVehiculo(pagina);
const focoDentro = await pagina.evaluate(() => {
  const activo = document.activeElement;
  const panel = document.querySelector('.at-pop, .atf-panel');
  return Boolean(panel && activo && panel.contains(activo));
});
capturas.focoDentroDelPanel = focoDentro;
const opciones = pagina.locator('.at-opcion, .atf-opcion');
const total = await opciones.count();
await opciones.first().focus();
await pagina.keyboard.press('ArrowDown');
await pagina.waitForTimeout(200);
capturas.focoTrasFlecha = await pagina.evaluate(() => {
  const activo = document.activeElement;
  return activo ? (activo.textContent ?? '').trim().slice(0, 40) : null;
});
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(500);
capturas.focoDevuelto = await pagina.evaluate(() => {
  const activo = document.activeElement;
  return activo ? (activo.getAttribute('aria-label') ?? activo.textContent ?? '').trim().slice(0, 60) : null;
});
capturas.opcionesEnLista = total;
await escritorio.close();

/* ---------------- tableta y móvil ---------------- */
for (const tamano of [
  { nombre: '834', width: 834, height: 1112, movil: false },
  { nombre: '390', width: 390, height: 844, movil: true },
]) {
  const ctx = await navegador.newContext({
    viewport: { width: tamano.width, height: tamano.height },
    deviceScaleFactor: 2,
    locale: 'es-MX',
    isMobile: tamano.movil,
    hasTouch: tamano.movil,
  });
  const vista = await ctx.newPage();
  await vista.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
  await vista.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
  await vista.waitForTimeout(2400);
  await vista.locator('[data-testid="filtros"]').screenshot({
    path: `${EVIDENCIAS}barra-${ETIQUETA}-${tamano.nombre}-vacia.png`,
  });
  await abrirVehiculo(vista);
  await vista.screenshot({ path: `${EVIDENCIAS}vehiculo-${ETIQUETA}-${tamano.nombre}-abierto.png` });
  const panel = vista.locator('.at-pop:visible, .atf-panel:visible').last();
  const caja = await panel.boundingBox();
  const medidas = await vista.evaluate(() => {
    const panel = document.querySelector('.atf-panel, .at-pop');
    const alto = panel ? panel.getBoundingClientRect().height : 0;
    const filas = [...document.querySelectorAll('.at-opcion, .atf-opcion')].map((n) =>
      Math.round(n.getBoundingClientRect().height),
    );
    return {
      ancho: panel ? Math.round(panel.getBoundingClientRect().width) : 0,
      alto: Math.round(alto),
      filaMin: filas.length ? Math.min(...filas) : 0,
      desbordeHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
      dentroDePantalla: panel
        ? panel.getBoundingClientRect().right <= window.innerWidth + 1 &&
          panel.getBoundingClientRect().left >= -1
        : false,
    };
  });
  capturas[`medidas${tamano.nombre}`] = { ...medidas, caja };
  await panel.screenshot({ path: `${EVIDENCIAS}vehiculo-${ETIQUETA}-${tamano.nombre}-panel.png` });
  await ctx.close();
}

await navegador.close();
writeFileSync(
  `${EVIDENCIAS}capturas-${ETIQUETA}.json`,
  JSON.stringify(capturas, null, 2),
  'utf8',
);
console.log(JSON.stringify(capturas, null, 2));
