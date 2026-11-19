/**
 * Verificación del mapa del Atlas vial.
 *
 * Comprueba el comportamiento pedido:
 *  1. en la carga inicial el mapa es estático: arrastrar no lo mueve;
 *  2. los botones acercan y alejan, y solo con acercamiento se puede desplazar
 *     (siempre dentro de la Ciudad de México);
 *  3. un clic selecciona la alcaldía y aplica el filtro global **sin** cambiar
 *     zoom ni centro, y un arrastre no selecciona;
 *  4. el tooltip muestra el nombre oficial de la alcaldía y sus métricas;
 *  5. el filtro, el mapa y «Extensión CDMX» quedan sincronizados;
 *  6. tras recargar, el tablero y el mapa siguen visibles en escritorio y móvil.
 *
 *   node tools/verificar-mapa.mjs
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const API = process.env.ATLAS_API || 'http://127.0.0.1:8010/api/v1/atlas-vial';
const RUTA = '/#/area/dashboards/atlas-vial';
const BASE = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
mkdirSync(BASE, { recursive: true });

const resultados = [];
const comprobar = (nombre, correcto, detalle = '') => {
  resultados.push({ nombre, correcto });
  console.log(`${correcto ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
};

const leer = async (ruta) => {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`API ${respuesta.status} en ${ruta}`);
  return respuesta.json();
};

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-MX' });
const pagina = await contexto.newPage();
const errores = [];
pagina.on('console', (m) => {
  if (m.type() === 'error') errores.push(m.text().slice(0, 160));
});
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message.slice(0, 160)));

await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-mapa-lienzo', { timeout: 90_000 });
await pagina.waitForFunction(() => document.querySelectorAll('.at-kpi-valor').length >= 4, { timeout: 90_000 });
await pagina.waitForTimeout(2800);
// El mapa debe quedar dentro del viewport: si asoma por debajo del pliegue, los
// eventos del ratón (arrastre y tooltip) no llegan al lienzo.
await pagina.locator('.at-mapa-lienzo').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(300);

const geometria = await leer('/geometria');
const resumen = await leer('/resumen');
const caja = pagina.locator('.at-mapa-caja');
const vista = () => caja.getAttribute('data-vista');
const desplazable = () => caja.getAttribute('data-desplazable');
const centrarMapa = async () => {
  await pagina.locator('.at-mapa-lienzo').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(250);
};


/* Con la banda compacta, «Limpiar filtros» vive en la banda desplegada. */
const limpiarTodo = async () => {
  const editar = pagina.locator('.at-banda-editar');
  if (await editar.count()) {
    await editar.first().click();
    await pagina.waitForTimeout(800);
  }
  await pagina.locator('.at-btn--reset').first().click();
};
const kpi = async () => (await pagina.locator('.at-kpi-valor').first().innerText()).trim();
const lista = () => pagina.locator('[data-testid="mapa-lista-alcaldias"]').inputValue();
const total = Math.round(resumen.indicadores.hechos.valor).toLocaleString('es-MX');

/** Proyecta el centro de una alcaldía a píxeles con la vista actual del mapa. */
const puntoDe = async (nombre) => {
  const feature = geometria.features.find((f) => f.properties.nombre === nombre);
  const anillo =
    feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0] : feature.geometry.coordinates[0][0];
  const media = anillo.reduce(
    (acc, [lon, lat]) => [acc[0] + lon / anillo.length, acc[1] + lat / anillo.length],
    [0, 0],
  );
  const [lonMin, latMin, lonMax, latMax] = (await vista()).split(',').map(Number);
  const cajaLienzo = await pagina.locator('.at-mapa-lienzo').boundingBox();
  return {
    x: cajaLienzo.x + ((media[0] - lonMin) / (lonMax - lonMin)) * cajaLienzo.width,
    y: cajaLienzo.y + ((latMax - media[1]) / (latMax - latMin)) * cajaLienzo.height,
  };
};

const AlcaldiaPrueba = 'Cuauhtémoc';
const esperadoPrueba = await leer(`/resumen?alcaldia=${encodeURIComponent(AlcaldiaPrueba)}`);
const cifraPrueba = Math.round(esperadoPrueba.indicadores.hechos.valor).toLocaleString('es-MX');

/* ------------------------- 1 · estático en la vista inicial ------------------------- */
const vistaInicial = await vista();
comprobar(
  'en la carga inicial el mapa no es desplazable',
  (await desplazable()) === 'no',
  `data-desplazable=${await desplazable()}`,
);

await centrarMapa();
const lienzo = await pagina.locator('.at-mapa-lienzo').boundingBox();
await pagina.mouse.move(lienzo.x + lienzo.width * 0.35, lienzo.y + lienzo.height * 0.35);
await pagina.mouse.down();
await pagina.mouse.move(lienzo.x + lienzo.width * 0.1, lienzo.y + lienzo.height * 0.1, { steps: 12 });
await pagina.mouse.up();
await pagina.waitForTimeout(600);
comprobar(
  'arrastrar en la vista inicial no mueve el mapa',
  (await vista()) === vistaInicial,
  `${vistaInicial} → ${await vista()}`,
);
comprobar(
  'el arrastre inicial tampoco selecciona una alcaldía',
  (await lista()) === '',
  `lista «${await lista()}» · KPI ${await kpi()}`,
);

/* ------------------------- 2 · zoom y desplazamiento acotado ------------------------- */
const inicial = (await vista()).split(',').map(Number);
const altoInicial = inicial[3] - inicial[1];
await pagina.locator('[data-testid="mapa-acercar"]').click();
await pagina.locator('[data-testid="mapa-acercar"]').click();
await pagina.waitForTimeout(700);
const trasZoom = (await vista()).split(',').map(Number);
const altoTrasZoom = trasZoom[3] - trasZoom[1];
comprobar(
  'acercar reduce el encuadre y habilita el desplazamiento',
  altoTrasZoom < altoInicial * 0.95 && (await desplazable()) === 'si',
  `alto ${altoInicial.toFixed(4)} → ${altoTrasZoom.toFixed(4)} · desplazable=${await desplazable()}`,
);

const antesArrastreZoom = await vista();
await centrarMapa();
const lienzoZoom = await pagina.locator('.at-mapa-lienzo').boundingBox();
await pagina.mouse.move(lienzoZoom.x + lienzoZoom.width * 0.5, lienzoZoom.y + lienzoZoom.height * 0.5);
await pagina.mouse.down();
await pagina.mouse.move(lienzoZoom.x + lienzoZoom.width * 0.5 + 120, lienzoZoom.y + lienzoZoom.height * 0.5 + 90, { steps: 12 });
await pagina.mouse.up();
await pagina.waitForTimeout(600);
comprobar(
  'con acercamiento, arrastrar desplaza el mapa',
  (await vista()) !== antesArrastreZoom,
  `${antesArrastreZoom} → ${await vista()}`,
);

for (let i = 0; i < 8; i += 1) {
  await centrarMapa();
  const caja8 = await pagina.locator('.at-mapa-lienzo').boundingBox();
  await pagina.mouse.move(caja8.x + caja8.width * 0.5, caja8.y + caja8.height * 0.5);
  await pagina.mouse.down();
  await pagina.mouse.move(caja8.x + caja8.width * 0.5 + 400, caja8.y + caja8.height * 0.5 + 320, { steps: 6 });
  await pagina.mouse.up();
}
await pagina.waitForTimeout(600);
const extremo = (await vista()).split(',').map(Number);
const ciudad = geometria.extension;
const holguraLon = (ciudad.lon_max - ciudad.lon_min) * 0.05;
const holguraLat = (ciudad.lat_max - ciudad.lat_min) * 0.05;
comprobar(
  'el desplazamiento no sale de la Ciudad de México',
  extremo[0] >= ciudad.lon_min - holguraLon &&
    extremo[2] <= ciudad.lon_max + holguraLon &&
    extremo[1] >= ciudad.lat_min - holguraLat &&
    extremo[3] <= ciudad.lat_max + holguraLat,
  `vista ${extremo.map((v) => v.toFixed(4)).join(', ')}`,
);
comprobar('arrastrar con acercamiento no selecciona una alcaldía', (await lista()) === '', `lista «${await lista()}»`);
comprobar('arrastrar con acercamiento no cambia el total del tablero', (await kpi()) === total, `KPI ${await kpi()}`);

await pagina.locator('[data-testid="mapa-encuadrar"]').click();
await pagina.waitForTimeout(800);
const trasEncuadre = (await vista()).split(',').map(Number);
const inicialNum = vistaInicial.split(',').map(Number);
const mismoEncuadre = trasEncuadre.every((valor, indice) => Math.abs(valor - inicialNum[indice]) < 0.002);
comprobar(
  '«Extensión CDMX» recupera el encuadre completo y estático',
  mismoEncuadre && (await desplazable()) === 'no',
  `${await vista()}`,
);

/* ------------------------- 3 · clic selecciona sin mover ------------------------- */
const vistaAntesClic = await vista();
const punto = await puntoDe(AlcaldiaPrueba);
await pagina.mouse.click(punto.x, punto.y);
await pagina.waitForTimeout(2400);
comprobar(
  'el clic en una alcaldía no cambia zoom ni centro',
  (await vista()) === vistaAntesClic,
  `${vistaAntesClic} → ${await vista()}`,
);
comprobar(
  'el clic selecciona la alcaldía y aplica el filtro global',
  (await lista()) === AlcaldiaPrueba &&
    (await kpi()) === cifraPrueba &&
    decodeURIComponent(pagina.url()).includes('at_alcaldia='),
  `lista «${await lista()}» · KPI ${await kpi()} · API ${esperadoPrueba.indicadores.hechos.valor}`,
);

/* ------------------------- 4 · tooltip con nombre y métricas ------------------------- */
await limpiarTodo();
await pagina.waitForTimeout(2400);
await pagina.locator('[data-testid="mapa-encuadrar"]').click();
await pagina.waitForTimeout(700);
await centrarMapa();
const puntoHover = await puntoDe('Iztacalco');
await pagina.mouse.move(puntoHover.x, puntoHover.y);
await pagina.waitForTimeout(700);
const tooltip = await pagina.evaluate(() => {
  const nodo = document.querySelector('.at-tooltip--mapa');
  if (!nodo) return null;
  return {
    titulo: nodo.querySelector('.at-tooltip-title')?.textContent?.trim() ?? '',
    filas: [...nodo.querySelectorAll('dt')].map((dt) => dt.textContent.trim()),
    valores: [...nodo.querySelectorAll('dd')].map((dd) => dd.textContent.trim()),
    nota: nodo.querySelector('.at-tooltip-nota')?.textContent?.trim() ?? '',
  };
});
comprobar('el tooltip declara el nombre oficial de la alcaldía', tooltip?.titulo === 'Iztacalco', `título «${tooltip?.titulo}»`);
comprobar(
  'el tooltip muestra las métricas con etiquetas y valores',
  Boolean(tooltip) && tooltip.filas.length >= 2 && tooltip.valores.length === tooltip.filas.length,
  `${tooltip?.filas.join(' · ')} → ${tooltip?.valores.join(' · ')}`,
);
comprobar(
  'el tooltip invita a seleccionar la alcaldía, no a acercar',
  Boolean(tooltip) && /seleccionar la alcaldía/i.test(tooltip.nota) && !/acercar/i.test(tooltip.nota),
  `«${tooltip?.nota}»`,
);

/* ------------------------- 5 · sincronización con el filtro ------------------------- */
await pagina.selectOption('[data-testid="mapa-lista-alcaldias"]', 'Xochimilco');
await pagina.waitForTimeout(2400);
const xochimilco = await leer('/resumen?alcaldia=Xochimilco');
comprobar(
  'cambiar el filtro actualiza la selección del mapa',
  (await lista()) === 'Xochimilco' &&
    (await kpi()) === Math.round(xochimilco.indicadores.hechos.valor).toLocaleString('es-MX'),
  `lista ${await lista()} · KPI ${await kpi()}`,
);

await limpiarTodo();
await pagina.waitForTimeout(2500);
comprobar(
  'limpiar filtros elimina la selección del mapa',
  (await lista()) === '' && (await kpi()) === total && !decodeURIComponent(pagina.url()).includes('at_alcaldia='),
  `lista «${await lista()}» · KPI ${await kpi()}`,
);

/* ------------------------- 6 · recarga y tamaños ------------------------- */
await pagina.reload({ waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-mapa-lienzo', { timeout: 90_000 });
await pagina.waitForTimeout(3000);
const trasRecarga = await pagina.evaluate(() => {
  const caja = document.querySelector('.at-mapa-caja').getBoundingClientRect();
  return {
    mapa: Boolean(document.querySelector('.at-mapa-lienzo')),
    kpi: document.querySelector('.at-kpi-valor')?.textContent?.trim() ?? '',
    alto: Math.round(caja.height),
  };
});
comprobar(
  'recargar la página conserva tablero y mapa',
  trasRecarga.mapa && trasRecarga.kpi === total,
  `KPI ${trasRecarga.kpi} · alto ${trasRecarga.alto}px`,
);
comprobar('en escritorio el mapa gana altura útil', trasRecarga.alto >= 440, `${trasRecarga.alto}px`);
comprobar('sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

await pagina.addStyleTag({ content: '.site-header,.site-footer,.skip-link{display:none!important}' });
await pagina.waitForTimeout(300);
await pagina.locator('.at-panel--mapa').screenshot({ path: `${BASE}mapa-escritorio.png` });
await contexto.close();

for (const tamano of [
  { nombre: 'tableta', width: 768, height: 1024 },
  { nombre: 'movil', width: 390, height: 844 },
]) {
  const ctx = await navegador.newContext({
    viewport: { width: tamano.width, height: tamano.height },
    deviceScaleFactor: 2,
    locale: 'es-MX',
    isMobile: tamano.nombre === 'movil',
    hasTouch: tamano.nombre === 'movil',
  });
  const vistaMovil = await ctx.newPage();
  const fallos = [];
  vistaMovil.on('console', (m) => {
    if (m.type() === 'error') fallos.push(m.text().slice(0, 120));
  });
  await vistaMovil.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
  await vistaMovil.waitForSelector('.at-mapa-lienzo', { timeout: 90_000 });
  await vistaMovil.waitForTimeout(2600);
  await vistaMovil.reload({ waitUntil: 'domcontentloaded' });
  await vistaMovil.waitForSelector('.at-mapa-lienzo', { timeout: 90_000 });
  await vistaMovil.waitForTimeout(2400);

  const medidas = await vistaMovil.evaluate(() => {
    const caja = document.querySelector('.at-mapa-caja').getBoundingClientRect();
    const lista = document.querySelector('[data-testid="mapa-lista-alcaldias"]')?.getBoundingClientRect();
    return {
      mapa: Boolean(document.querySelector('.at-mapa-lienzo')),
      alto: Math.round(caja.height),
      ancho: Math.round(caja.width),
      desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
      listaDentro: Boolean(lista) && lista.right <= window.innerWidth + 1,
    };
  });
  comprobar(
    `${tamano.nombre}: el mapa sigue visible tras recargar`,
    medidas.mapa && medidas.desborde === false && medidas.listaDentro,
    `${medidas.ancho}×${medidas.alto} · desborde ${medidas.desborde}`,
  );
  comprobar(
    `${tamano.nombre}: el mapa conserva altura útil`,
    medidas.alto >= (tamano.nombre === 'movil' ? 320 : 400),
    `${medidas.alto}px`,
  );
  comprobar(`${tamano.nombre}: sin errores de consola`, fallos.length === 0, fallos.slice(0, 2).join(' | '));
  await vistaMovil.addStyleTag({ content: '.site-header,.site-footer,.skip-link{display:none!important}' });
  await vistaMovil.waitForTimeout(200);
  await vistaMovil.locator('.at-panel--mapa').screenshot({ path: `${BASE}mapa-${tamano.nombre}.png` });
  await ctx.close();
}

await navegador.close();
const correctas = resultados.filter((r) => r.correcto).length;
console.log(`\n${correctas}/${resultados.length} comprobaciones correctas`);
process.exit(correctas === resultados.length ? 0 : 1);



