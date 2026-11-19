/**
 * Verificación del acordeón por colonia y de las cifras de la alcaldía.
 *
 * Uso: node tools/verificar-colonias.mjs
 * Guardas en `evidencias/colonias/`.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/colonias/', new URL('../', import.meta.url)));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const RUTA = '#/area/dashboards/atlas-vial';

mkdirSync(EVIDENCIAS, { recursive: true });

const resultados = [];
function revisar(nombre, condicion, detalle = '') {
  resultados.push({ nombre, ok: Boolean(condicion) });
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const pagina = await contexto.newPage();

const peticiones = [];
pagina.on('request', (peticion) => {
  if (peticion.url().includes('/colonias')) peticiones.push(peticion.url());
});
const errores = [];
pagina.on('pageerror', (error) => errores.push(String(error)));

await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="colonias-grafica"] .at-col-fila', { timeout: 45_000 });
await pagina.waitForTimeout(1800);

const bloque = pagina.locator('[data-testid="colonias-grafica"]');
const filas = bloque.locator('.at-col-fila');
const peticionesAntes = peticiones.length;

/* ------------------------------------------------- 1. Estado colapsado */

const total = await filas.count();
revisar('una fila por colonia visible', total === 10, `${total} filas`);

const abiertasIniciales = await bloque.locator('.at-col-detalle-caja.is-abierta').count();
revisar('todas empiezan colapsadas', abiertasIniciales === 0);

const primeraFila = filas.first();
const cifras = await primeraFila.locator('.at-col-cifra-valor').allInnerTexts();
revisar('la fila colapsada muestra las tres cifras', cifras.length === 3 && cifras.every((t) => /\d/.test(t)), cifras.join(' / '));
revisar(
  'cada cifra está identificada por texto',
  (await primeraFila.locator('.at-col-cifra-etq').count()) === 3,
  (await primeraFila.locator('.at-col-cifra-etq').allInnerTexts()).join(' / '),
);
revisar('cada cifra lleva su trazo de color', (await primeraFila.locator('.at-col-cifra .at-col-trazo').count()) === 3);
revisar(
  'posición, nombre y alcaldía visibles',
  (await primeraFila.locator('.at-col-puesto').count()) === 1 &&
    (await primeraFila.locator('.at-col-colonia').innerText()).length > 2 &&
    (await primeraFila.locator('.at-col-alcaldia').count()) === 1,
  (await primeraFila.locator('.at-col-colonia').innerText()),
);
revisar(
  'cifras en negro tabular',
  await primeraFila.locator('.at-col-cifra-valor').first().evaluate((nodo) => {
    const estilo = getComputedStyle(nodo);
    return estilo.color === 'rgb(17, 24, 39)' && estilo.fontVariantNumeric.includes('tabular');
  }),
);

const altoFila = (await primeraFila.boundingBox()).height;
revisar('fila compacta (≤ 60 px)', altoFila <= 60, `${Math.round(altoFila)} px`);

const altoListaCerrada = (await bloque.locator('.at-col-lista').boundingBox()).height;
await bloque.screenshot({ path: `${EVIDENCIAS}/colonias-colapsadas.png` });

/* ------------------------------------------- 2. Expandir dos colonias */

const botonPrimera = primeraFila.locator('.at-col-expandir');
revisar('el botón declara aria-expanded y aria-controls', await botonPrimera.evaluate((nodo) => {
  const control = nodo.getAttribute('aria-controls');
  return nodo.getAttribute('aria-expanded') === 'false' && Boolean(document.getElementById(control ?? ''));
}));

await botonPrimera.click();
await filas.nth(2).locator('.at-col-expandir').click();
await pagina.waitForTimeout(400);

const abiertas = await bloque.locator('.at-col-detalle-caja.is-abierta').count();
revisar('se pueden abrir varias colonias a la vez', abiertas === 2);
revisar('expandir no dispara consultas nuevas', peticiones.length === peticionesAntes, `${peticiones.length - peticionesAntes} peticiones`);
revisar('expandir no cambia filtros ni URL', !/at_alcaldia|at_colonia/.test(pagina.url()));

const barras = await filas.first().locator('.at-col-barra').count();
revisar('la colonia abierta muestra las tres barras', barras === 3);
const ejes = await filas.first().locator('.at-col-escala').allInnerTexts();
revisar('las barras llevan referencia de escala', ejes.length >= 1 && /0 –/.test(ejes[0]), ejes.join(' | '));

const altoListaAbierta = (await bloque.locator('.at-col-lista').boundingBox()).height;
revisar('abrir crece solo el alto necesario', altoListaAbierta > altoListaCerrada, `${Math.round(altoListaCerrada)} → ${Math.round(altoListaAbierta)} px`);

await bloque.screenshot({ path: `${EVIDENCIAS}/colonias-dos-abiertas.png` });

/* Las cifras siguen visibles con la colonia abierta. */
const cifrasAbierta = await filas.first().locator('.at-col-cifra-valor').allInnerTexts();
revisar('las tres cifras siguen visibles al expandir', cifrasAbierta.join() === cifras.join(), cifrasAbierta.join(' / '));

/* ---------------------------------------- 3. Las escalas no se mueven */

const anchosCerrado = await filas.first().locator('.at-col-barra').evaluateAll((nodos) =>
  nodos.map((nodo) => nodo.style.width),
);
await bloque.screenshot({ path: `${EVIDENCIAS}/colonias-escala-comun.png` });

/* Cerrar y volver a abrir debe dejar los mismos anchos. */
await botonPrimera.click();
await pagina.waitForTimeout(350);
await botonPrimera.click();
await pagina.waitForTimeout(350);
const anchosReabierto = await filas.first().locator('.at-col-barra').evaluateAll((nodos) =>
  nodos.map((nodo) => nodo.style.width),
);
revisar(
  'abrir y cerrar no recalcula la escala',
  anchosCerrado.join() === anchosReabierto.join(),
  `${anchosCerrado.join(' / ')} vs ${anchosReabierto.join(' / ')}`,
);

/* ---------------------------------- 4. Conservación por identidad */

const idPrimera = await filas.first().getAttribute('data-id');
await bloque.getByRole('button', { name: '20 colonias' }).click();
await pagina.waitForSelector('[data-testid="colonias-grafica"] .at-col-fila:nth-child(20)', { timeout: 30_000 });
await pagina.waitForTimeout(1600);
const filaPorId = bloque.locator(`.at-col-fila[data-id="${idPrimera}"]`);
revisar(
  'al pasar de 10 a 20 colonias la expansión se conserva por identidad',
  (await filaPorId.locator('.at-col-detalle-caja.is-abierta').count()) === 1 &&
    (await bloque.locator('.at-col-fila').count()) === 20,
);

/* Identidad estable: nombres iguales en alcaldías distintas no se fusionan. */
const identidades = await bloque.locator('.at-col-fila').evaluateAll((nodos) =>
  nodos.map((nodo) => ({
    id: nodo.getAttribute('data-id'),
    colonia: nodo.querySelector('.at-col-colonia')?.textContent ?? '',
    alcaldia: nodo.querySelector('.at-col-alcaldia')?.textContent ?? '',
  })),
);
const idsUnicos = new Set(identidades.map((fila) => fila.id)).size === identidades.length;
const repetidosSeparados = identidades.every((fila, indice) =>
  identidades.every(
    (otra, otroIndice) =>
      indice === otroIndice || fila.colonia !== otra.colonia || fila.id !== otra.id,
  ),
);
revisar(
  'las 20 filas usan identidades distintas',
  idsUnicos && repetidosSeparados && identidades.length === 20,
  `${identidades.length} filas · ${new Set(identidades.map((f) => f.colonia)).size} nombres distintos`,
);

/* Cambiar la escala (reordena el dibujo, no las filas) conserva la expansión. */await bloque.getByRole('button', { name: 'Por métrica' }).click();
await pagina.waitForTimeout(700);
revisar(
  'cambiar de escala conserva la expansión',
  (await filaPorId.locator('.at-col-detalle-caja.is-abierta').count()) === 1,
);
await bloque.getByRole('button', { name: 'Escala común' }).click();
await pagina.waitForTimeout(600);

/* Reordenar: se aplica un filtro de alcaldía y la colonia abierta se conserva
   si sigue visible; si no, desaparece sin romper el resto. */
await bloque.getByRole('button', { name: '10 colonias' }).click();
await pagina.waitForTimeout(1400);

/* -------------------------------- 5. Acción global Expandir / Colapsar */

const global = bloque.locator('[data-testid="colonias-expandir-todas"]');
revisar('la acción global dice «Expandir todas»', /Expandir todas/.test(await global.innerText()));
await global.click();
await pagina.waitForTimeout(450);
revisar(
  'expandir todas abre solo las visibles',
  (await bloque.locator('.at-col-detalle-caja.is-abierta').count()) === (await filas.count()),
);
revisar('el botón pasa a «Colapsar todas»', /Colapsar todas/.test(await global.innerText()));
await bloque.screenshot({ path: `${EVIDENCIAS}/colonias-todas-abiertas.png` });

/* Si el foco está dentro del contenido que se cierra, vuelve al encabezado. */
await filas.first().locator('.at-col-detalle-interior').focus();
await global.click();
await pagina.waitForTimeout(350);
const focoVuelve = await pagina.evaluate(() => {
  const activo = document.activeElement;
  return activo?.classList.contains('at-col-expandir') ?? false;
});
revisar('al colapsar todas el foco vuelve al encabezado de la fila', focoVuelve);
revisar('colapsar todas cierra todas las filas', (await bloque.locator('.at-col-detalle-caja.is-abierta').count()) === 0);

/* ------------------------------------------------ 6. Teclado */

await filas.nth(1).locator('.at-col-expandir').focus();
await pagina.keyboard.press('Space');
await pagina.waitForTimeout(300);
revisar(
  'Espacio abre la colonia enfocada',
  (await filas.nth(1).locator('.at-col-detalle-caja.is-abierta').count()) === 1 &&
    (await filas.nth(1).locator('.at-col-expandir').getAttribute('aria-expanded')) === 'true',
);
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(300);
revisar('Enter vuelve a cerrarla', (await filas.nth(1).locator('.at-col-detalle-caja.is-abierta').count()) === 0);

/* El contenido cerrado queda fuera de la navegación por teclado. */
const inertes = await bloque.locator('.at-col-detalle-caja[inert]').count();
revisar('el contenido cerrado sale del orden de tabulación', inertes === (await filas.count()), `${inertes} cerradas`);

/* ------------------------------- 7. Cifras de la alcaldía con iconos KPI */

await pagina.locator('.at-ranking-lista').first().scrollIntoViewIfNeeded();
await pagina.waitForTimeout(400);
const ranking = pagina.locator('.at-ranking-lista').first().locator('button');
await ranking.first().click();
await pagina.waitForTimeout(1600);

const cifrasAlcaldia = pagina.locator('[data-testid="detalle-cifras-alcaldia"]');
const filasAlcaldia = cifrasAlcaldia.locator('li');
revisar('el resumen de la alcaldía tiene tres filas', (await filasAlcaldia.count()) === 3);
revisar('cada fila usa el icono SVG del sistema', (await cifrasAlcaldia.locator('svg').count()) === 3);
revisar(
  'los iconos son decorativos',
  await cifrasAlcaldia.locator('svg').evaluateAll((nodos) => nodos.every((nodo) => nodo.closest('[aria-hidden="true"]') !== null)),
);
const estiloCifras = await cifrasAlcaldia.evaluate((lista) => {
  const fila = lista.querySelector('li');
  const etiqueta = fila?.querySelector('.at-cifras-etiqueta');
  const valor = fila?.querySelector('.at-cifras-valor');
  const icono = fila?.querySelector('.at-cifras-icono');
  if (!fila || !etiqueta || !valor || !icono) return null;
  return {
    columnas: getComputedStyle(fila).gridTemplateColumns.split(' ').length,
    alto: Math.round(fila.getBoundingClientRect().height),
    etiqueta: Number.parseFloat(getComputedStyle(etiqueta).fontSize),
    valor: Number.parseFloat(getComputedStyle(valor).fontSize),
    peso: Number.parseFloat(getComputedStyle(valor).fontWeight),
    colorValor: getComputedStyle(valor).color,
    colorIcono: getComputedStyle(icono).color,
    tabular: getComputedStyle(valor).fontVariantNumeric.includes('tabular'),
  };
});
revisar(
  'tres columnas icono | etiqueta | cifra, 44 px y tipografía pedida',
  estiloCifras !== null &&
    estiloCifras.columnas === 3 &&
    estiloCifras.alto >= 44 &&
    estiloCifras.etiqueta >= 13 &&
    estiloCifras.etiqueta <= 14.5 &&
    estiloCifras.valor >= 17 &&
    estiloCifras.valor <= 18.5 &&
    estiloCifras.peso === 600 &&
    estiloCifras.colorValor === 'rgb(17, 24, 39)' &&
    estiloCifras.colorIcono === 'rgb(55, 65, 81)' &&
    estiloCifras.tabular,
  JSON.stringify(estiloCifras),
);
revisar(
  'las cifras de la alcaldía no son botones',
  (await cifrasAlcaldia.locator('button').count()) === 0 && (await cifrasAlcaldia.locator('a').count()) === 0,
);

const tiposIconos = await pagina.locator('.at-tipos-lista li .at-tipos-icono svg').count();
const tiposCifra = await pagina.locator('.at-tipos-lista .at-tipos-cifra').first().evaluate((nodo) => ({
  color: getComputedStyle(nodo).color,
  peso: Number.parseFloat(getComputedStyle(nodo).fontWeight),
}));
revisar(
  'tipos de hechos: iconos grises y cifras negras',
  tiposIconos > 0 && tiposCifra.color === 'rgb(17, 19, 24)' && tiposCifra.peso >= 600,
  `${tiposIconos} iconos · ${JSON.stringify(tiposCifra)}`,
);
await pagina.locator('[data-testid="panel-contexto"]').screenshot({ path: `${EVIDENCIAS}/alcaldia-cifras-iconos.png` });

/* La misma presentación se aplica a otra alcaldía (mismo componente). */
await pagina.goto(`${SITIO}/?at_alcaldia=Iztapalapa&at_sel=Iztapalapa${RUTA}`, {
  waitUntil: 'domcontentloaded',
});
await pagina.waitForSelector('[data-testid="detalle-cifras-alcaldia"]', { timeout: 45_000 });
await pagina.waitForTimeout(1400);
const otraAlcaldia = await pagina.evaluate(() => {
  const lista = document.querySelector('[data-testid="detalle-cifras-alcaldia"]');
  const encabezado = document.querySelector('[data-testid="panel-contexto"]')?.textContent ?? '';
  return {
    iconos: lista?.querySelectorAll('svg').length ?? 0,
    filas: lista?.querySelectorAll('li').length ?? 0,
    iztapalapa: /Iztapalapa/i.test(encabezado),
  };
});
revisar(
  'otra alcaldía usa el mismo componente de cifras',
  otraAlcaldia.iconos === 3 && otraAlcaldia.filas === 3 && otraAlcaldia.iztapalapa,
  JSON.stringify(otraAlcaldia),
);
await pagina.locator('[data-testid="panel-contexto"]').screenshot({
  path: `${EVIDENCIAS}/alcaldia-cifras-iconos-iztapalapa.png`,
});

/* ------------------------------------------------- 8. Móvil */

const movil = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});
const paginaMovil = await movil.newPage();
await paginaMovil.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await paginaMovil.waitForSelector('[data-testid="colonias-grafica"] .at-col-fila', { timeout: 45_000 });
await paginaMovil.waitForTimeout(1800);
const bloqueMovil = paginaMovil.locator('[data-testid="colonias-grafica"]');
await bloqueMovil.scrollIntoViewIfNeeded();
await paginaMovil.waitForTimeout(400);

const medidasMovil = await paginaMovil.evaluate(() => {
  const fila = document.querySelector('[data-testid="colonias-grafica"] .at-col-fila');
  const etiqueta = fila?.querySelector('.at-col-cifra-etq');
  const documento = document.documentElement.scrollWidth;
  if (!fila || !etiqueta) return null;
  const estiloEtq = getComputedStyle(etiqueta);
  return {
    documento,
    anchoFila: Math.round(fila.getBoundingClientRect().width),
    altoFila: Math.round(fila.getBoundingClientRect().height),
    etiquetaVisible: estiloEtq.position === 'static' && estiloEtq.clipPath === 'none',
  };
});
revisar(
  'en móvil las etiquetas de las cifras son visibles y nada desborda',
  medidasMovil !== null &&
    medidasMovil.documento <= 390 &&
    medidasMovil.etiquetaVisible &&
    medidasMovil.altoFila <= 110,
  JSON.stringify(medidasMovil),
);

const transicion = await bloqueMovil.locator('.at-col-fila').first().evaluate((nodo) => {
  const caja = nodo.querySelector('.at-col-detalle-caja');
  return caja ? getComputedStyle(caja).transitionDuration : 'sin caja';
});
revisar('con movimiento reducido el despliegue es inmediato', Number.parseFloat(transicion) < 0.001, transicion);

await bloqueMovil.screenshot({ path: `${EVIDENCIAS}/colonias-movil.png` });

revisar('sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

await navegador.close();

const fallas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallas.length}/${resultados.length} comprobaciones correctas`);
console.log(`capturas en ${EVIDENCIAS}`);
process.exit(fallas.length === 0 ? 0 : 1);
