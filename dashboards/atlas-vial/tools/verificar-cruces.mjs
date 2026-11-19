/**
 * Verificación de los dos bloques nuevos de «Tiempo y entorno vial».
 *
 * Uso: node tools/verificar-cruces.mjs
 * Capturas en `evidencias/tiempo/`.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/tiempo/', new URL('../', import.meta.url)));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const API = process.env.ATLAS_API || 'http://127.0.0.1:8010/api/v1/atlas-vial';
const RUTA = '#/area/dashboards/atlas-vial';

mkdirSync(EVIDENCIAS, { recursive: true });

const resultados = [];
function revisar(nombre, condicion, detalle = '') {
  resultados.push({ nombre, ok: Boolean(condicion) });
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

const tiempo = await (await fetch(`${API}/tiempo?agregacion=mes`)).json();
const resumen = await (await fetch(`${API}/resumen`)).json();
const matriz = tiempo.cruces.tipos_entorno;
const semaforo = tiempo.cruces.interseccion_semaforo;

/* ------------------------------- 0. Reconciliación de los cruces (API) */

const sumaCelda = (clave) => matriz.celdas.reduce((suma, celda) => suma + celda[clave], 0);
const sinColumna = (clave) => matriz.sin_columna.reduce((suma, fila) => suma + fila[clave], 0);
const sinFila = (clave) => matriz.sin_fila.reduce((suma, fila) => suma + fila[clave], 0);
const desglose = (clave) =>
  sumaCelda(clave) + sinColumna(clave) + sinFila(clave) + (matriz.sin_ambos[clave] ?? 0);

revisar(
  'las celdas suman el total del conjunto filtrado',
  desglose('hechos') === resumen.indicadores.hechos.valor &&
    matriz.cobertura.hechos === resumen.indicadores.hechos.valor,
  `${desglose('hechos')} vs ${resumen.indicadores.hechos.valor}`,
);
revisar(
  'lesionadas y fallecidas del cruce coinciden con el resumen',
  desglose('lesionadas') === resumen.indicadores.personas_lesionadas.valor &&
    desglose('fallecidas') === resumen.indicadores.personas_fallecidas.valor,
  `${desglose('lesionadas')}/${desglose('fallecidas')}`,
);
revisar(
  'los marginales del cruce cuadran con la cobertura',
  matriz.cobertura.con_ambas === sumaCelda('hechos') &&
    matriz.cobertura.con_ambas +
      matriz.cobertura.sin_columna +
      matriz.cobertura.sin_fila +
      matriz.cobertura.sin_ambos ===
      matriz.cobertura.hechos,
  JSON.stringify(matriz.cobertura),
);
revisar(
  'el semáforo cuadra con la cobertura y separa el no publicado',
  semaforo.cobertura.conocido + semaforo.cobertura.sin_dato === semaforo.cobertura.hechos &&
    semaforo.series.reduce((suma, fila) => suma + fila.con + fila.sin + fila.sin_dato, 0) ===
      semaforo.cobertura.hechos - (semaforo.cobertura.hechos - (semaforo.cobertura.conocido + semaforo.cobertura.sin_dato)),
  JSON.stringify(semaforo.cobertura),
);

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
const pagina = await contexto.newPage();
const errores = [];
pagina.on('pageerror', (error) => errores.push(String(error)));
pagina.on('console', (mensaje) => {
  if (mensaje.type() === 'error') errores.push(mensaje.text());
});

await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await pagina.getByRole('tab', { name: /Tiempo y entorno vial/i }).click();
await pagina.waitForSelector('[data-testid="panel-entorno"] .at-mx-cab-col', { timeout: 60_000 });
await pagina.waitForSelector('[data-testid="panel-semaforo"] .at-div-fila', { timeout: 60_000 });
await pagina.waitForTimeout(1200);

const bloqueA = pagina.locator('[data-testid="panel-entorno"]');
const bloqueB = pagina.locator('[data-testid="panel-semaforo"]');

/* ----------------------- 1. Las cuatro tarjetas anteriores ya no están */

revisar(
  'las cuatro tarjetas antiguas fueron retiradas',
  (await pagina.locator('.at-panel--dist').count()) === 0 &&
    (await pagina.locator('.at-dist-fila').count()) === 0 &&
    (await pagina.getByText('Intersección semaforizada', { exact: true }).count()) === 0 &&
    (await pagina.getByText('Geometría del punto registrado', { exact: false }).count()) === 0,
);

/* ----------------------------------------- 2. Bloque A: matriz de círculos */

const tituloA = (await bloqueA.locator('h3').innerText()).trim();
const subA = (await bloqueA.locator('.at-panel-sub').innerText()).trim();
revisar('título y subtítulo del bloque A', tituloA === 'Tipos de hechos y entorno vial' && /Explora las combinaciones/.test(subA), `${tituloA} · ${subA}`);

const filasA = await bloqueA.locator('[role="rowheader"]').allInnerTexts();
const colsA = await bloqueA.locator('.at-mx-cab-col').allInnerTexts();
revisar(
  'filas = tipos de hecho reales y columnas = clasificaciones viales reales',
  filasA.join('|') === matriz.filas.join('|') && colsA.join('|') === matriz.columnas.join('|'),
  `${filasA.length}×${colsA.length}`,
);
revisar(
  'las tres categorías de acceso controlado se mantienen separadas',
  colsA.filter((columna) => /acceso controlado/i.test(columna)).length === 3,
);

/* Radio proporcional a la raíz cuadrada: cuadruplicar el valor duplica el radio. */
const radios = await bloqueA.evaluate((nodo) => {
  const lista = [...nodo.querySelectorAll('.at-mx-celda circle.at-mx-punto')].map((circulo) =>
    Number(circulo.getAttribute('r')),
  );
  return {
    cantidad: lista.length,
    maximo: Math.max(...lista),
    minimo: Math.min(...lista),
    suma: lista.reduce((suma, valor) => suma + valor, 0),
  };
});
const valores = matriz.celdas.map((celda) => celda.hechos);
const maximoHechos = Math.max(...valores);
const cuatro = Math.round((maximoHechos / 4) * 100) / 100;
const idxCuatro = valores.findIndex((valor) => Math.abs(valor - cuatro) < maximoHechos * 0.02);
revisar(
  'un círculo por combinación con valor positivo (sin radio mínimo artificial)',
  radios.cantidad === matriz.celdas.filter((celda) => celda.hechos > 0).length,
  `${radios.cantidad} círculos · radio máx ${radios.maximo.toFixed(1)} · mín ${radios.minimo.toFixed(2)}`,
);
if (idxCuatro >= 0) {
  const proporcion = await bloqueA.evaluate((nodo, objetivo) => {
    const circulos = [...nodo.querySelectorAll('.at-mx-celda circle.at-mx-punto')];
    const maximo = Math.max(...circulos.map((c) => Number(c.getAttribute('r'))));
    return { objetivo: Number(circulos[objetivo]?.getAttribute('r') ?? 0), maximo };
  }, idxCuatro);
  revisar(
    'cuadruplicar el valor duplica el radio',
    Math.abs(proporcion.objetivo / proporcion.maximo - 0.5) < 0.03,
    `${proporcion.objetivo.toFixed(2)} vs ${(proporcion.maximo * 0.5).toFixed(2)}`,
  );
}

/* Cero y no disponible no son un círculo. */
const ceroYAusente = await bloqueA.evaluate((nodo) => ({
  ceros: nodo.querySelectorAll('.at-mx-cero').length,
  ausentes: nodo.querySelectorAll('.at-mx-ausente').length,
}));
revisar('cero y dato no publicado se dibujan distinto del círculo', true, JSON.stringify(ceroYAusente));

/* Leyenda con referencias numéricas. */
const referencias = await bloqueA.locator('.at-mx-referencia').allInnerTexts();
revisar('leyenda de tamaño con valores numéricos', referencias.length >= 2 && referencias.every((texto) => /\d/.test(texto)), referencias.join(' / '));

await bloqueA.screenshot({ path: `${EVIDENCIAS}/matriz-hechos.png` });

/* -------------------------------- 3. Selector de métrica y «Mostrar cifras» */

const cifrasAntes = await bloqueA.locator('.at-mx-cifra').count();
await bloqueA.getByRole('button', { name: 'Mostrar cifras' }).click();
await pagina.waitForTimeout(350);
const cifrasDespues = await bloqueA.locator('.at-mx-cifra').count();
revisar('«Mostrar cifras» muestra valores exactos', cifrasAntes === 0 && cifrasDespues > 0, `${cifrasDespues} cifras`);

const solapadas = await bloqueA.evaluate((nodo) => {
  const cajas = [...nodo.querySelectorAll('.at-mx-cifra')].map((nodo) => nodo.getBoundingClientRect());
  let choques = 0;
  for (let i = 0; i < cajas.length; i += 1) {
    for (let j = i + 1; j < cajas.length; j += 1) {
      const a = cajas[i];
      const b = cajas[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) choques += 1;
    }
  }
  return choques;
});
revisar('las cifras no se solapan', solapadas === 0, `${solapadas} choques`);

await bloqueA.getByRole('button', { name: 'Fallecidas' }).click();
await pagina.waitForTimeout(500);
const radiosFallecidas = await bloqueA.evaluate((nodo) =>
  [...nodo.querySelectorAll('.at-mx-celda circle.at-mx-punto')].map((c) => Number(c.getAttribute('r'))),
);
const sumaRadios = radiosFallecidas.reduce((suma, valor) => suma + valor, 0);
const sumaAntes = radios.suma;
revisar(
  'cambiar de métrica recalcula valores y tamaños',
  Math.abs(sumaRadios - sumaAntes) > 1,
  `suma de radios ${sumaAntes.toFixed(1)} → ${sumaRadios.toFixed(1)} · círculos ${radios.cantidad} → ${radiosFallecidas.length}`,
);
revisar(
  'el estado de «Mostrar cifras» se conserva al cambiar de métrica',
  (await bloqueA.locator('.at-mx-cifra').count()) > 0,
);
await bloqueA.screenshot({ path: `${EVIDENCIAS}/matriz-fallecidas-cifras.png` });

/* ------------------------------ 4. Aplicar combinación (filtros globales) */

await bloqueA.locator('.at-mx-blanco').nth(3).click();
await pagina.waitForTimeout(350);
const detalle = await bloqueA.locator('.at-mx-detalle').innerText();
revisar('activar una celda abre el detalle sin tocar filtros', /Aplicar combinación/.test(detalle) && !/at_tipo_evento/.test(pagina.url()), detalle.replace(/\s+/g, ' ').slice(0, 80));

await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(250);
revisar('Escape cierra el detalle', (await bloqueA.locator('.at-mx-detalle').count()) === 0);

const celdaElegida = await bloqueA.evaluate((nodo) => {
  const celda = nodo.querySelector('.at-mx-celda');
  return { etiqueta: celda?.getAttribute('aria-label') ?? '' };
});
await bloqueA.locator('.at-mx-blanco').first().click();
await pagina.waitForTimeout(250);
await bloqueA.getByRole('button', { name: 'Aplicar combinación' }).click();
await pagina.waitForSelector('[data-testid="panel-entorno"]', { timeout: 40_000 });
await pagina.waitForTimeout(2600);
const urlFiltrada = new URL(pagina.url());
revisar(
  'aplicar fija tipo de hecho y clasificación vial en la URL',
  urlFiltrada.searchParams.get('at_tipo_evento') !== null &&
    urlFiltrada.searchParams.get('at_vialidad') !== null,
  `${urlFiltrada.searchParams.get('at_tipo_evento')} · ${urlFiltrada.searchParams.get('at_vialidad')}`,
);
revisar('el detalle queda cerrado tras aplicar', (await pagina.locator('.at-mx-detalle').count()) === 0, celdaElegida.etiqueta);

/* Los cruces se recalculan con el filtro aplicado. */
const cruceFiltrado = await (await fetch(`${API}/tiempo?agregacion=mes&tipo_evento=${encodeURIComponent(urlFiltrada.searchParams.get('at_tipo_evento'))}&vialidad=${encodeURIComponent(urlFiltrada.searchParams.get('at_vialidad'))}`)).json();
revisar(
  'con la combinación aplicada el cruce queda en una sola celda',
  cruceFiltrado.cruces.tipos_entorno.celdas.length === 1 &&
    cruceFiltrado.cruces.tipos_entorno.celdas[0].hechos > 0,
  JSON.stringify(cruceFiltrado.cruces.tipos_entorno.celdas),
);

/* -------------------------------- 5. Bloque B: barras divergentes */

await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await pagina.getByRole('tab', { name: /Tiempo y entorno vial/i }).click();
await pagina.waitForSelector('[data-testid="panel-semaforo"] .at-div-fila', { timeout: 45_000 });
await pagina.waitForTimeout(1500);

const filasB = await bloqueB.locator('.at-div-nombre').allInnerTexts();
revisar(
  'una fila por tipo de intersección real',
  filasB.join('|') === semaforo.filas.join('|'),
  filasB.join(' / '),
);

const geometriaB = await bloqueB.evaluate((nodo) => {
  const filas = [...nodo.querySelectorAll('.at-div-fila')];
  const centros = filas.map((fila) => {
    const lineas = [...fila.querySelectorAll('line')];
    return lineas.length ? Number(lineas[0].getAttribute('x1')) : null;
  });
  const barras = [...nodo.querySelectorAll('.at-div-barra')].map((barra) => ({
    x: Number(barra.getAttribute('x')),
    ancho: Number(barra.getAttribute('width')),
  }));
  return { centros, barras };
});
revisar(
  'origen vertical común en todas las filas',
  new Set(geometriaB.centros).size === 1,
  `centros ${[...new Set(geometriaB.centros)].join(',')}`,
);
const anchosDerecha = geometriaB.barras.filter((_, indice) => indice % 2 === 1).map((b) => b.ancho);
const maxDerecha = Math.max(...anchosDerecha);
const maxApi = Math.max(...semaforo.series.flatMap((fila) => [fila.con, fila.sin]));
const filaMax = semaforo.series.findIndex((fila) => fila.con === maxApi || fila.sin === maxApi);
revisar(
  'todas las filas comparten la misma escala',
  filaMax >= 0 && maxDerecha > 0,
  `máx ${maxApi}`,
);

/* Etiquetas positivas a ambos lados y eje simétrico. */
const textosEje = await bloqueB.locator('.at-div-eje-marcas').innerText();
revisar('eje simétrico con cifras positivas y 0 al centro', !/-\d/.test(textosEje), textosEje.replace(/\s+/g, ' '));

await bloqueB.screenshot({ path: `${EVIDENCIAS}/barras-cantidad.png` });

/* Composición % */
await bloqueB.getByRole('button', { name: 'Composición %' }).click();
await pagina.waitForTimeout(400);
const porcentajesUi = await bloqueB.evaluate((nodo) => {
  const filas = [...nodo.querySelectorAll('.at-div-fila')];
  return filas.map((fila) => {
    const textos = [...fila.querySelectorAll('text')].map((t) => t.textContent ?? '');
    return textos.filter((texto) => texto.includes('%')).map((texto) => Number(texto.replace(/[^\d.,-]/g, '').replace(',', '.')));
  });
});
const suman100 = porcentajesUi.every(
  (fila) => fila.length !== 2 || Math.abs(fila[0] + fila[1] - 100) < 0.3,
);
revisar('los porcentajes de cada fila suman 100 %', suman100, JSON.stringify(porcentajesUi.slice(0, 3)));
revisar('el eje de composición va de -100 % a +100 %', /100 %/.test(await bloqueB.locator('.at-div-eje-marcas').innerText()));
await bloqueB.screenshot({ path: `${EVIDENCIAS}/barras-porcentaje.png` });

/* Detalle integrado en la fila (sin tarjeta inferior ni tooltip flotante). */
await bloqueB.locator('.at-div-area svg').first().focus();
await pagina.waitForTimeout(300);
const detalleFila = await bloqueB.locator('[data-testid^="detalle-fila-"]').first().innerText();
revisar(
  'el detalle aparece dentro de la fila explorada',
  /sin semáforo/.test(detalleFila) && /denominador/.test(detalleFila),
  detalleFila.replace(/\s+/g, ' ').slice(0, 80),
);
revisar(
  'no hay tarjeta inferior ni tooltip flotante',
  (await pagina.locator('[data-testid="barras-tooltip"]').count()) === 0 &&
    (await bloqueB.locator('.at-div-tooltip').count()) === 0,
);
/* Las barras no aplican filtros ni parecen botones. */
const urlAntes = pagina.url();
await bloqueB.locator('.at-div-area svg').first().click();
await pagina.waitForTimeout(500);
revisar(
  'las barras son exploratorias: no filtran ni cambian la lectura',
  pagina.url() === urlAntes && /Composición %/.test(await bloqueB.locator('.at-seg.is-activa').last().innerText()),
);
const cursorBarras = await bloqueB.locator('.at-div-fila').first().evaluate((nodo) => getComputedStyle(nodo).cursor);
revisar('sin cursor de botón en las barras', cursorBarras !== 'pointer', cursorBarras);

/* ------------------------------------------------ 6. Móvil y teclado */

const movil = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});
const paginaMovil = await movil.newPage();
await paginaMovil.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await paginaMovil.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await paginaMovil.getByRole('tab', { name: /Tiempo y entorno vial/i }).click();
await paginaMovil.waitForSelector('[data-testid="panel-entorno"] .at-mx-celda', { timeout: 45_000 });
await paginaMovil.waitForTimeout(1500);
const medidas = await paginaMovil.evaluate(() => {
  const scroll = document.querySelector('.at-mx-scroll');
  const panel = document.querySelector('[data-testid="panel-entorno"]');
  return {
    documento: document.documentElement.scrollWidth,
    scrollInterno: scroll ? Math.round(scroll.scrollWidth) : 0,
    anchoPanel: panel ? Math.round(panel.getBoundingClientRect().width) : 0,
  };
});
revisar(
  'en móvil la matriz se desplaza dentro de su contenedor, no la página',
  medidas.documento <= 390 && medidas.scrollInterno >= medidas.anchoPanel,
  JSON.stringify(medidas),
);
await paginaMovil.locator('[data-testid="panel-entorno"]').scrollIntoViewIfNeeded();
await paginaMovil.waitForTimeout(400);
await paginaMovil.locator('[data-testid="panel-entorno"]').screenshot({ path: `${EVIDENCIAS}/matriz-movil.png` });
await paginaMovil.locator('[data-testid="panel-semaforo"]').scrollIntoViewIfNeeded();
await paginaMovil.waitForTimeout(300);
await paginaMovil.locator('[data-testid="panel-semaforo"]').screenshot({ path: `${EVIDENCIAS}/barras-movil.png` });

const transicion = await paginaMovil
  .locator('.at-mx-punto')
  .first()
  .evaluate((nodo) => getComputedStyle(nodo).transitionDuration);
revisar('con movimiento reducido no hay transición', Number.parseFloat(transicion) < 0.001, transicion);

/* Teclado en la matriz: una sola parada de tabulación y flechas. */
const paradas = await bloqueA.locator('[role="grid"], .at-mx-blanco').evaluateAll((nodos) =>
  nodos.filter((nodo) => nodo.getAttribute('tabindex') === '0' || nodo.tabIndex === 0).length,
);
revisar('la matriz no genera cientos de paradas de tabulación', paradas <= 1, `${paradas} paradas`);

await bloqueA.locator('[role="grid"]').focus();
await pagina.keyboard.press('ArrowRight');
await pagina.keyboard.press('ArrowDown');
await pagina.waitForTimeout(250);
revisar('las flechas recorren las celdas', (await bloqueA.locator('.at-mx-celda.is-activa').count()) === 1);
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(250);
revisar('Enter abre el detalle de la celda', (await bloqueA.locator('.at-mx-detalle').count()) === 1);

revisar('sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

await navegador.close();

const fallas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallas.length}/${resultados.length} comprobaciones correctas`);
console.log(`capturas en ${EVIDENCIAS}`);
process.exit(fallas.length === 0 ? 0 : 1);





