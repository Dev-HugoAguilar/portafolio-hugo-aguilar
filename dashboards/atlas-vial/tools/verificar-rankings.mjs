/**
 * Verificación de los rankings de alcaldías y del color del mapa.
 *
 *  1. tres rankings independientes, cada uno con su escala y su unidad;
 *  2. top 5 + ampliación a las 16 alcaldías sin texto ilegible;
 *  3. selección sincronizada: barra → mapa + filtro global; mapa → barras;
 *  4. cambiar de métrica conserva la selección y actualiza color y leyenda;
 *  5. ausente ≠ cero;
 *  6. paneles alineados en escritorio, apilados en móvil, y recarga estable.
 *
 *   node tools/verificar-rankings.mjs
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
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1200 }, locale: 'es-MX' });
const pagina = await contexto.newPage();
const errores = [];
pagina.on('console', (m) => {
  if (m.type() === 'error') errores.push(m.text().slice(0, 150));
});
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message.slice(0, 150)));

await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-mapa-lienzo', { timeout: 90_000 });
await pagina.waitForFunction(() => document.querySelectorAll('[data-testid^="ranking-"]').length >= 3, { timeout: 90_000 });
await pagina.waitForTimeout(2500);

const territorio = await leer('/territorio?incluir_puntos=false');
const filas = territorio.alcaldias.filter((f) => f.alcaldia);
const ranking = (metrica) =>
  pagina.evaluate((met) => {
    const bloque = document.querySelector(`[data-testid="ranking-${met}"]`);
    if (!bloque) return null;
    return {
      unidad: bloque.querySelector('.at-ranking-unidad')?.textContent?.trim() ?? '',
      titulo: bloque.querySelector('h4')?.textContent?.trim() ?? '',
      filas: [...bloque.querySelectorAll('.at-ranking-fila')].map((boton) => ({
        nombre: boton.querySelector('.at-ranking-nombre-corto')?.textContent?.trim() ?? '',
        valor: boton.querySelector('.at-ranking-valor')?.textContent?.trim() ?? '',
        ancho: boton.querySelector('.at-ranking-barra')?.getAttribute('style') ?? '',
        activa: boton.classList.contains('is-activa'),
      })),
    };
  }, metrica);

const numero = (texto) => Number(String(texto).replace(/[^0-9.-]/g, ''));

/* ---------------------------- 1 · tres rankings independientes ---------------------------- */
const datos = {
  hechos: await ranking('hechos'),
  personas_lesionadas: await ranking('personas_lesionadas'),
  personas_fallecidas: await ranking('personas_fallecidas'),
};
comprobar(
  'hay tres rankings separados, uno por métrica',
  Boolean(datos.hechos && datos.personas_lesionadas && datos.personas_fallecidas),
  ['hechos', 'personas_lesionadas', 'personas_fallecidas'].map((m) => datos[m]?.filas.length).join(' · '),
);
comprobar(
  'cada ranking declara su unidad',
  datos.hechos.unidad === 'hechos' &&
    datos.personas_lesionadas.unidad === 'personas' &&
    datos.personas_fallecidas.unidad === 'personas',
  `${datos.hechos.unidad} · ${datos.personas_lesionadas.unidad} · ${datos.personas_fallecidas.unidad}`,
);
comprobar(
  'los títulos no mezclan métricas (no hay barras apiladas)',
  datos.hechos.titulo === 'Hechos registrados' &&
    datos.personas_lesionadas.titulo === 'Personas lesionadas' &&
    datos.personas_fallecidas.titulo === 'Personas fallecidas',
  [datos.hechos.titulo, datos.personas_lesionadas.titulo, datos.personas_fallecidas.titulo].join(' | '),
);

/* Cada ranking ordena y escala con su propio máximo: el primero tiene la barra más larga. */
const escalaPropia = Object.entries(datos).every(([, bloque]) => {
  const valores = bloque.filas.map((fila) => numero(fila.valor));
  const ordenados = valores.every((valor, indice) => indice === 0 || valores[indice - 1] >= valor);
  const anchos = bloque.filas.map((fila) => parseFloat((fila.ancho.match(/width:\s*([\d.]+)%/) ?? [])[1] ?? '0'));
  const anchoMaximo = Math.max(...anchos);
  return ordenados && anchoMaximo <= 100 && anchoMaximo > 90;
});
comprobar('cada ranking usa su propia escala (0–100 % de su máximo) y va ordenado', escalaPropia, '');

comprobar(
  'los líderes difieren entre métricas (escalas independientes)',
  new Set([
    datos.hechos.filas[0]?.nombre,
    datos.personas_lesionadas.filas[0]?.nombre,
    datos.personas_fallecidas.filas[0]?.nombre,
  ]).size >= 2,
  [datos.hechos.filas[0]?.nombre, datos.personas_lesionadas.filas[0]?.nombre, datos.personas_fallecidas.filas[0]?.nombre].join(' | '),
);

const top5Coincide = Object.entries({ hechos: 'hechos', personas_lesionadas: 'lesionadas', personas_fallecidas: 'fallecidas' }).every(
  ([metrica, campo]) => {
    const esperados = [...filas]
      .sort((a, b) => b[campo] - a[campo])
      .slice(0, 5)
      .map((fila) => fila.alcaldia);
    return datos[metrica].filas.every((fila, indice) => fila.nombre === esperados[indice]) &&
      numero(datos[metrica].filas[0].valor) === Math.max(...filas.map((f) => f[campo]));
  },
);
comprobar('cada ranking muestra las cinco alcaldías con el valor más alto y su valor exacto', top5Coincide, '');

/* ---------------------------- 2 · ampliar sin texto ilegible ---------------------------- */
await pagina.locator('[data-testid="rankings-expandir"]').first().click();
await pagina.waitForTimeout(600);
const ampliado = await pagina.evaluate(() => {
  const filas = [...document.querySelectorAll('[data-testid="ranking-hechos"] .at-ranking-fila')];
  const tamano = filas[0] ? parseFloat(getComputedStyle(filas[0]).fontSize) : 0;
  return { filas: filas.length, tamano };
});
comprobar(
  'la opción de ampliar muestra las 16 alcaldías sin reducir el texto',
  ampliado.filas === filas.length && ampliado.tamano >= 10,
  `${ampliado.filas} filas · texto ${ampliado.tamano}px`,
);
await pagina.locator('[data-testid="rankings-expandir"]').first().click();
await pagina.waitForTimeout(400);

/* ---------------------------- 3 · selección sincronizada ---------------------------- */
const elegida = datos.hechos.filas[2].nombre;
const esperado = await leer(`/resumen?alcaldia=${encodeURIComponent(elegida)}`);
await pagina.locator(`[data-testid="ranking-hechos"] .at-ranking-fila`).nth(2).click();
await pagina.waitForTimeout(2400);
const trasBarra = await pagina.evaluate(() => ({
  kpi: document.querySelector('.at-kpi-valor')?.textContent?.trim() ?? '',
  lista: document.querySelector('[data-testid="mapa-lista-alcaldias"]')?.value ?? '',
  activas: [...document.querySelectorAll('[data-testid^="ranking-"]')].map(
    (bloque) => bloque.querySelectorAll('.at-ranking-fila.is-activa').length,
  ),
  titular: document.querySelector('.at-panel--contexto h3')?.textContent?.trim() ?? '',
}));
comprobar(
  'seleccionar una barra aplica el filtro global y marca la alcaldía en el mapa',
  trasBarra.lista === elegida &&
    trasBarra.kpi === Math.round(esperado.indicadores.hechos.valor).toLocaleString('es-MX') &&
    decodeURIComponent(pagina.url()).includes('at_alcaldia='),
  `lista ${trasBarra.lista} · KPI ${trasBarra.kpi} · panel «${trasBarra.titular}»`,
);
comprobar(
  'la alcaldía seleccionada queda resaltada en los tres rankings',
  trasBarra.activas.every((cuenta) => cuenta === 1),
  trasBarra.activas.join(' · '),
);

/* Al seleccionar una alcaldía el panel derecho muestra solo su detalle: la
   comparación y sus rankings desaparecen por completo. */
await pagina.getByRole('button', { name: /Limpiar filtros/ }).first().click();
await pagina.waitForTimeout(2400);
const fueraDelTop = [...filas]
  .sort((a, b) => b.fallecidas - a.fallecidas)
  .slice(-1)[0].alcaldia;
await pagina.selectOption('[data-testid="mapa-lista-alcaldias"]', fueraDelTop);
await pagina.waitForTimeout(2400);
const incluida = await pagina.evaluate((nombre) => {
  const panel = document.querySelector('[data-testid="panel-contexto"]');
  return {
    rankings: panel.querySelectorAll('[data-testid^="ranking-"]').length,
    comparacion: /comparación por alcaldía/i.test(panel.textContent ?? ''),
    cifras: panel.querySelectorAll('[data-testid="detalle-cifras-alcaldia"] dd').length,
    tipos: Boolean(panel.querySelector('.at-tipos-hecho')),
    nombre,
  };
}, fueraDelTop);
comprobar(
  'con una alcaldía seleccionada se ocultan la comparación y sus rankings',
  incluida.rankings === 0 && !incluida.comparacion && incluida.cifras === 3 && incluida.tipos,
  `rankings ${incluida.rankings} · comparación ${incluida.comparacion} · cifras ${incluida.cifras}`,
);

/* Selección desde el mapa → detalle; al cerrarlo vuelve la comparación. */
await pagina.getByRole('button', { name: /Limpiar filtros/ }).first().click();
await pagina.waitForTimeout(2400);
const cajaMapa = await pagina.locator('.at-mapa-lienzo').boundingBox();
await pagina.mouse.click(cajaMapa.x + cajaMapa.width * 0.5, cajaMapa.y + cajaMapa.height * 0.52);
await pagina.waitForTimeout(2400);
const porMapa = await pagina.evaluate(() => {
  const lista = document.querySelector('[data-testid="mapa-lista-alcaldias"]')?.value ?? '';
  const panel = document.querySelector('[data-testid="panel-contexto"]');
  return {
    lista,
    detalle: Boolean(panel.querySelector('[data-testid="detalle-cifras-alcaldia"]')),
    rankings: panel.querySelectorAll('[data-testid^="ranking-"]').length,
  };
});
comprobar(
  'seleccionar en el mapa abre el detalle y oculta los rankings',
  porMapa.lista !== '' && porMapa.detalle && porMapa.rankings === 0,
  `mapa «${porMapa.lista}» · rankings ${porMapa.rankings}`,
);
await pagina.locator('[data-testid="panel-contexto"]').getByRole('button', { name: /Cerrar/ }).first().click();
await pagina.waitForTimeout(1800);
const trasCerrar = await pagina.evaluate(() => ({
  rankings: document.querySelectorAll('[data-testid^="ranking-"]').length,
  comparacion: /comparación por alcaldía/i.test(
    document.querySelector('[data-testid="panel-contexto"]')?.textContent ?? '',
  ),
}));
comprobar(
  'al cerrar el detalle vuelve la comparación por alcaldía',
  trasCerrar.rankings === 3 && trasCerrar.comparacion,
  `rankings ${trasCerrar.rankings} · comparación ${trasCerrar.comparacion}`,
);
// Se vuelve a seleccionar para comprobar que el cambio de métrica la conserva.
// «Cerrar» deja el filtro global activo, así que primero se restablece: elegir
// la misma alcaldía otra vez la quitaría (el gesto alterna).
await pagina.getByRole('button', { name: /Limpiar filtros/ }).first().click();
await pagina.waitForTimeout(2200);
await pagina.selectOption('[data-testid="mapa-lista-alcaldias"]', porMapa.lista);
await pagina.waitForTimeout(2400);

/* ---------------------------- 4 · métrica: color, leyenda y selección ---------------------------- */
const leyenda = () => pagina.locator('.at-leyenda-titulo').first().innerText();
const leyendaHechos = await leyenda();
await pagina.locator('[data-testid="panel-mapa"]').getByRole('button', { name: 'Fallecidas', exact: true }).click();
await pagina.waitForTimeout(1400);
const leyendaFallecidas = await leyenda();
const sigueSeleccion = await pagina.evaluate(() => ({
  panel: document.querySelector('[data-testid="panel-contexto"] h3')?.textContent?.trim() ?? '',
  detalle: Boolean(document.querySelector('[data-testid="detalle-cifras-alcaldia"]')),
  url: new URLSearchParams(location.search).get('at_sel') ?? '',
}));
const rellenoMapa = await pagina.evaluate(() => {
  const lienzo = document.querySelector('.at-mapa-lienzo');
  const ctx = lienzo.getContext('2d');
  const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height).data;
  let rojos = 0;
  for (let i = 0; i < datos.length; i += 4) {
    const [r, g, b] = [datos[i], datos[i + 1], datos[i + 2]];
    if (r > 150 && r > g + 40 && r > b + 40) rojos += 1;
  }
  return rojos;
});
comprobar(
  'cambiar la métrica actualiza la leyenda y el color del mapa',
  leyendaFallecidas.includes('Personas fallecidas') &&
    leyendaHechos.includes('Hechos') &&
    leyendaFallecidas !== leyendaHechos &&
    rellenoMapa > 200,
  `«${leyendaHechos}» → «${leyendaFallecidas}» · ${rellenoMapa} px rojos`,
);
comprobar(
  'cambiar la métrica conserva la alcaldía seleccionada',
  sigueSeleccion.detalle && sigueSeleccion.url === porMapa.lista && sigueSeleccion.panel === porMapa.lista,
  `panel «${sigueSeleccion.panel}» · at_sel «${sigueSeleccion.url}»`,
);

await pagina.locator('[data-testid="panel-mapa"]').getByRole('button', { name: 'Hechos', exact: true }).click();
await pagina.waitForTimeout(1200);

/* ---------------------------- 5 · ausente ≠ cero ---------------------------- */
/* Con un filtro que deja una sola alcaldía con datos, el resto queda «Sin dato». */
await pagina.selectOption('[data-testid="mapa-lista-alcaldias"]', 'Milpa Alta');
await pagina.waitForTimeout(2400);
const ceroVsAusente = await pagina.evaluate(() => {
  const leyenda = document.querySelector('.at-leyenda')?.textContent ?? '';
  return {
    mencionaSinDato: /sin dato/i.test(leyenda),
    mencionaCero: /0\b/.test(leyenda),
    filasConSinDato: [...document.querySelectorAll('.at-ranking-valor')].filter((nodo) => /sin dato/i.test(nodo.textContent ?? '')).length,
  };
});
comprobar(
  'la leyenda distingue el cero del dato ausente',
  ceroVsAusente.mencionaSinDato && ceroVsAusente.mencionaCero,
  `sin dato: ${ceroVsAusente.mencionaSinDato} · cero: ${ceroVsAusente.mencionaCero}`,
);

/* ---------------------------- 6 · paneles, móvil y recarga ---------------------------- */
await pagina.getByRole('button', { name: /Limpiar filtros/ }).first().click();
await pagina.waitForTimeout(2400);
const paneles = await pagina.evaluate(() => {
  const mapa = document.querySelector('.at-panel--mapa').getBoundingClientRect();
  const detalle = document.querySelector('.at-panel--contexto').getBoundingClientRect();
  return {
    alineadoArriba: Math.abs(mapa.top - detalle.top) <= 1,
    alineadoAbajo: Math.abs(mapa.bottom - detalle.bottom) <= 1,
    altoMapa: Math.round(mapa.height),
    altoDetalle: Math.round(detalle.height),
    desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});
comprobar(
  'en escritorio el panel derecho y el del mapa comparten altura y bordes',
  paneles.alineadoArriba && paneles.alineadoAbajo && !paneles.desborde,
  `${paneles.altoMapa} vs ${paneles.altoDetalle} px`,
);
comprobar('sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

await pagina.addStyleTag({ content: '.site-header,.site-footer,.skip-link{display:none!important}' });
await pagina.waitForTimeout(300);
await pagina.locator('.at-grid-mapa').screenshot({ path: `${BASE}rankings-escritorio.png` });
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
  const vista = await ctx.newPage();
  const fallos = [];
  vista.on('console', (m) => {
    if (m.type() === 'error') fallos.push(m.text().slice(0, 120));
  });
  await vista.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
  await vista.waitForSelector('.at-mapa-lienzo', { timeout: 90_000 });
  await vista.waitForLoadState('networkidle').catch(() => null);
  await vista.waitForTimeout(1200);
  await vista.reload({ waitUntil: 'domcontentloaded' });
  await vista.waitForSelector('.at-mapa-lienzo', { timeout: 90_000 });
  await vista.waitForTimeout(2400);

  const medidas = await vista.evaluate(() => {
    const mapa = document.querySelector('.at-panel--mapa').getBoundingClientRect();
    const detalle = document.querySelector('.at-panel--contexto').getBoundingClientRect();
    const fila = document.querySelector('.at-ranking-fila');
    return {
      apilado: detalle.top >= mapa.bottom - 1,
      altoDetalle: Math.round(detalle.height),
      desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
      textoRanking: fila ? parseFloat(getComputedStyle(fila).fontSize) : 0,
      rankings: document.querySelectorAll('[data-testid^="ranking-"]').length,
    };
  });
  comprobar(
    `${tamano.nombre}: paneles apilados, sin desbordes y rankings legibles`,
    medidas.apilado && !medidas.desborde && medidas.rankings === 3 && medidas.textoRanking >= 10,
    `detalle ${medidas.altoDetalle}px · texto ${medidas.textoRanking}px`,
  );
  comprobar(`${tamano.nombre}: sin errores de consola`, fallos.length === 0, fallos.slice(0, 2).join(' | '));
  await vista.addStyleTag({ content: '.site-header,.site-footer,.skip-link{display:none!important}' });
  await vista.waitForTimeout(200);
  await vista.locator('.at-panel--contexto').screenshot({ path: `${BASE}rankings-${tamano.nombre}.png` });
  await ctx.close();
}

await navegador.close();
const correctas = resultados.filter((r) => r.correcto).length;
console.log(`\n${correctas}/${resultados.length} comprobaciones correctas`);
process.exit(correctas === resultados.length ? 0 : 1);



