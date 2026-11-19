/**
 * Evidencia del tablero «Marketing y clientes» con datos reales.
 *
 * Recorre las cuatro vistas, comprueba que las visualizaciones nuevas existen y
 * responden a la interacción (mapa de canales → filtro, ranking, bandas del
 * embudo, curvas y matriz de cohortes) y guarda capturas de escritorio y móvil.
 *
 * Uso: node tools/evidencia.mjs [--movil]
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
const SITIO = process.env.MARKETING_SITIO || 'http://127.0.0.1:8000';
const movil = process.argv.includes('--movil');
mkdirSync(EVIDENCIAS, { recursive: true });

const errores = [];
const resultados = [];
const comprobar = (nombre, correcto, detalle = '') => {
  resultados.push({ nombre, correcto });
  console.log(`${correcto ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
};

const navegador = await chromium.launch();
const contexto = await navegador.newContext(
  movil
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 },
);
const pagina = await contexto.newPage();
pagina.on('console', (mensaje) => mensaje.type() === 'error' && errores.push(mensaje.text()));
pagina.on('pageerror', (error) => errores.push(error.message));
const sufijo = movil ? 'movil' : 'escritorio';

await pagina.goto(`${SITIO}/#/area/dashboards/marketing-clientes`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.mk-app[data-disponible]', { timeout: 45_000 });
await pagina.waitForSelector('.mk-kpi-valor', { timeout: 45_000 });
// Las tarjetas dicen «Sin datos» mientras llega la respuesta: se espera a que la
// primera lectura esté resuelta antes de comprobar cualquier cifra.
await pagina.waitForFunction(
  () => {
    const valores = [...document.querySelectorAll('.mk-kpi-valor')].map((n) => n.textContent ?? '');
    return valores.length > 0 && valores.every((valor) => !valor.includes('Sin datos'));
  },
  { timeout: 60_000 },
);
await pagina.waitForTimeout(1200);

const estado = await pagina.evaluate(() => ({
  disponible: document.querySelector('.mk-app')?.getAttribute('data-disponible'),
  kpis: [...document.querySelectorAll('.mk-kpi-valor')].map((n) => n.textContent?.trim()),
  periodo: document.querySelector('[data-testid="periodo-consultado"]')?.textContent?.replace(/\s+/g, ' ').trim(),
  sinDatos: Boolean(document.querySelector('[data-testid="sin-datos"]')),
  aviso: Boolean(document.querySelector('[data-testid="aviso-datos"]')),
}));
comprobar('El tablero sirve datos publicados', estado.disponible === 'true', estado.periodo?.slice(0, 90));
comprobar('Ninguna tarjeta dice «Sin datos»', estado.kpis.length >= 4 && !estado.kpis.includes('Sin datos'), estado.kpis.join(' | '));
comprobar('Sin aviso obsoleto de acceso a BigQuery', !estado.aviso && !estado.sinDatos);

/* Resumen: Sankey de adquisición → compra y lollipop de conversión por fuente */
await pagina.waitForSelector('[data-testid="panel-sankey"]', { timeout: 45_000 });
await pagina.waitForFunction(
  () => document.querySelectorAll('[data-testid="panel-sankey"] path').length > 4,
  { timeout: 45_000 },
);
const sankey = await pagina.evaluate(() => {
  const panel = document.querySelector('[data-testid="panel-sankey"]');
  return {
    titulo:
      panel?.closest('section')?.querySelector('h3')?.textContent?.trim() ??
      panel?.querySelector('h3')?.textContent?.trim(),
    subtitulo: panel?.querySelector('.mk-panel-sub')?.textContent?.trim(),
    bandas: panel?.querySelectorAll('path').length ?? 0,
    nodos: panel?.querySelectorAll('rect[role="button"]').length ?? 0,
    texto: panel?.textContent?.replace(/\s+/g, ' ') ?? '',
  };
});
comprobar('Resumen: título «De la adquisición a la compra»', sankey.titulo === 'De la adquisición a la compra', sankey.titulo ?? '');
comprobar('Resumen: ayuda sobre «sin compra» y datos ofuscados', sankey.texto.includes('no implica abandono definitivo'));
comprobar('Resumen: Sankey con bandas y nodos', sankey.bandas >= 10 && sankey.nodos >= 5, `${sankey.bandas} bandas · ${sankey.nodos} nodos`);
await pagina.evaluate(() => document.querySelector('[data-testid="panel-sankey"]')?.scrollIntoView({ block: 'center' }));
await pagina.waitForTimeout(600);
await pagina.screenshot({ path: `${EVIDENCIAS}/resumen-sankey-${sufijo}.png` });

const lollipop = await pagina.evaluate(() => {
  const panel = document.querySelector('[data-testid="panel-lollipop"]');
  return {
    titulo:
      panel?.closest('section')?.querySelector('h3')?.textContent?.trim() ??
      panel?.querySelector('h3')?.textContent?.trim(),
    filas: panel?.querySelectorAll('circle').length ?? 0,
    referencia: panel?.textContent?.includes('referencia global') ?? false,
    umbral: panel?.textContent?.includes('Base menor a') ?? false,
  };
});
comprobar('Resumen: lollipop «Conversión por fuente»', lollipop.titulo === 'Conversión por fuente' && lollipop.filas >= 3, `${lollipop.filas} fuentes`);
comprobar('Resumen: referencia global y umbral de base', lollipop.referencia && lollipop.umbral);
await pagina.waitForSelector('[data-testid="panel-lollipop"] svg', { timeout: 45_000 });
const anchoLollipop = await pagina.evaluate(() => {
  const caja = document.querySelector('[data-testid="panel-lollipop"] .mk-lollipop-caja');
  const svg = caja?.querySelector('svg');
  if (!caja || !svg) return null;
  return {
    caja: Math.round(caja.getBoundingClientRect().width),
    svg: Math.round(svg.getBoundingClientRect().width),
    viewBox: svg.getAttribute('viewBox'),
    puntos: [...svg.querySelectorAll('circle')].map((c) => Math.round(parseFloat(c.getAttribute('cx')))),
  };
});
comprobar(
  'Resumen: el gráfico ocupa el ancho del contenedor',
  Boolean(anchoLollipop) && Math.abs(anchoLollipop.svg - Math.max(620, anchoLollipop.caja)) <= 2,
  anchoLollipop ? `svg ${anchoLollipop.svg} / caja ${anchoLollipop.caja}` : 'sin svg',
);
comprobar(
  'Resumen: los puntos se reparten por el área de trazado',
  Boolean(anchoLollipop) &&
    new Set(anchoLollipop.puntos).size >= 4 &&
    // La escala se mide contra el ancho del propio gráfico: en móvil el área de
    // trazado es más corta y exigir píxeles fijos no tendría sentido.
    Math.max(...anchoLollipop.puntos) - Math.min(...anchoLollipop.puntos) >
      0.25 * anchoLollipop.svg,
  anchoLollipop ? `rango ${Math.min(...anchoLollipop.puntos)}–${Math.max(...anchoLollipop.puntos)} de ${anchoLollipop.svg}` : '',
);
await pagina.evaluate(() => document.querySelector('[data-testid="panel-lollipop"]')?.scrollIntoView({ block: 'center' }));
await pagina.waitForTimeout(500);
await pagina.screenshot({ path: `${EVIDENCIAS}/resumen-lollipop-${sufijo}.png` });

/* Interacción: seleccionar una fuente filtra el tablero */
const puntos = await pagina.$$('[data-testid="panel-lollipop"] circle[role="button"], [data-testid="panel-lollipop"] rect[role="button"]');
if (puntos.length > 1) {
  await puntos[0].evaluate((nodo) => nodo.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await pagina.waitForTimeout(2200);
  const trasFiltro = await pagina.evaluate(() => ({
    filtros: document.querySelector('.mk-app')?.getAttribute('data-filtros') ?? '',
    chips: [...document.querySelectorAll('.mk-chip')].map((n) => n.textContent?.trim()),
  }));
  comprobar(
    'Seleccionar una fuente aplica el filtro de canal',
    trasFiltro.filtros.includes('canal') || trasFiltro.chips.length > 0,
    trasFiltro.filtros.slice(0, 60),
  );
  await pagina.screenshot({ path: `${EVIDENCIAS}/resumen-filtrado-${sufijo}.png` });
}

/* Limpiar filtros con el botón de restablecer */
const restablecer = pagina.getByRole('button', { name: /Restablecer/i }).first();
if (await restablecer.isEnabled()) await restablecer.click();
await pagina.waitForTimeout(1200);

/* Serie temporal con métricas */
const serie = await pagina.$('[data-testid="panel-serie"]');
comprobar('Resumen: evolución diaria', Boolean(serie));

/* Muestra y cobertura: población, muestra publicada, método y consistencia */
await pagina.waitForSelector('[data-testid="panel-cobertura"]', { timeout: 30_000 });
const cobertura = await pagina.evaluate(() => {
  const panel = document.querySelector('[data-testid="panel-cobertura"]');
  const texto = panel?.textContent?.replace(/\s+/g, ' ') ?? '';
  return {
    texto,
    // 270 154 en la población y 13 509 en la muestra publicada.
    poblacion: texto.includes('270,154'),
    muestra: texto.includes('13,509'),
    metodo: texto.includes('FARM_FINGERPRINT'),
    porcentaje: texto.includes('5 %') || texto.includes('5.0 %'),
    consistencia: texto.match(/Consistencia de indicadores y gráficas · (\d+) de (\d+)/),
  };
});
comprobar(
  'Cobertura: población original y muestra publicada',
  cobertura.poblacion && cobertura.muestra && cobertura.porcentaje,
  '270 154 → 13 509 usuarios',
);
comprobar(
  'Cobertura: método de selección reproducible',
  cobertura.metodo,
  'predicado FARM_FINGERPRINT visible',
);
comprobar(
  'Cobertura: indicadores y gráficas cuadran',
  Boolean(cobertura.consistencia) && cobertura.consistencia[1] === cobertura.consistencia[2],
  cobertura.consistencia ? `${cobertura.consistencia[1]} de ${cobertura.consistencia[2]}` : 'sin dato',
);

/* Adquisición */
await pagina.getByRole('button', { name: /^Adquisición$/ }).first().click();
await pagina.waitForSelector('[data-testid="panel-ranking"]', { timeout: 30_000 });
await pagina.waitForTimeout(2600);
const ranking = await pagina.evaluate(() => ({
  filas: document.querySelectorAll('.mk-ranking-fila').length,
  barras: document.querySelectorAll('.mk-ranking-relleno').length,
  puntos: document.querySelectorAll('.mk-ranking-punto').length,
  productos: Boolean(document.querySelector('[data-testid="panel-productos"]')),
}));
comprobar('Adquisición: ranking con barras y puntos', ranking.filas >= 3 && ranking.barras === ranking.filas && ranking.puntos === ranking.filas, `${ranking.filas} canales`);
const ordenFila = await pagina.evaluate(() => {
  const botones = [...document.querySelectorAll('[data-testid="panel-ranking"] .mk-seg')];
  return {
    total: botones.length,
    filas: new Set(botones.map((b) => Math.round(b.getBoundingClientRect().y))).size,
    textos: botones.map((b) => b.textContent.trim()),
  };
});
comprobar(
  'Adquisición: los cuatro controles de orden caben en una fila',
  ordenFila.filas === 1 && ordenFila.total === 4,
  `${ordenFila.textos.join(' · ')} (${ordenFila.filas} fila)`,
);
comprobar('Adquisición: bloque «Productos y compra»', ranking.productos);
await pagina.waitForSelector('[data-testid="panel-cuerdas"]', { timeout: 45_000 });
await pagina.waitForFunction(
  () => document.querySelectorAll('[data-testid="panel-cuerdas"] path[role="button"]').length > 0,
  { timeout: 45_000 },
);
const cuerdas = await pagina.evaluate(() => {
  const panel = document.querySelector('[data-testid="panel-cuerdas"]');
  return {
    titulo:
      panel?.closest('section')?.querySelector('h3')?.textContent?.trim() ??
      panel?.querySelector('h3')?.textContent?.trim(),
    arcos: panel?.querySelectorAll('path[role="button"]').length ?? 0,
    bandas: panel?.querySelectorAll('path:not([role])').length ?? 0,
    cobertura: panel?.querySelector('.mk-nota-inline')?.textContent?.trim() ?? '',
  };
});
comprobar(
  'Productos: cuerdas de compra conjunta',
  Boolean(cuerdas.titulo) && cuerdas.arcos >= 4,
  `${cuerdas.titulo ?? 'sin título'} · ${cuerdas.arcos} arcos`,
);
comprobar('Productos: bandas de compra conjunta y cobertura', cuerdas.bandas >= 3 && cuerdas.cobertura.includes('pares'), cuerdas.cobertura);
const alcance = await pagina.evaluate(() => {
  const panel = document.querySelector('[data-testid="cuerdas-alcance"]');
  const texto = panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return { texto, insignia: texto.includes('No depende de los filtros'), periodo: /2020-11-01/.test(texto) };
});
comprobar(
  'Productos: la afinidad declara que no depende de los filtros',
  alcance.insignia && alcance.periodo,
  alcance.texto.slice(0, 110),
);
await pagina.evaluate(() => document.querySelector('[data-testid="panel-cuerdas"]')?.scrollIntoView({ block: 'center' }));
await pagina.waitForTimeout(600);
await pagina.screenshot({ path: `${EVIDENCIAS}/adquisicion-cuerdas-${sufijo}.png` });
await pagina.screenshot({ path: `${EVIDENCIAS}/adquisicion-${sufijo}.png` });

/* Selección de canal → panel contextual */
await pagina.locator('.mk-ranking-nombre').first().evaluate((nodo) => nodo.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await pagina.waitForSelector('[data-testid="panel-canal"]', { timeout: 30_000 });
await pagina.waitForTimeout(1800);
const panelCanal = await pagina.evaluate(() => ({
  titulo: document.querySelector('[data-testid="panel-canal"] h3')?.textContent?.trim(),
  series: document.querySelectorAll('[data-testid="panel-canal"] svg').length,
}));
comprobar('Adquisición: panel contextual del canal', Boolean(panelCanal.titulo) && panelCanal.series >= 1, panelCanal.titulo ?? '');
await pagina.screenshot({ path: `${EVIDENCIAS}/adquisicion-detalle-${sufijo}.png` });
await restablecer.click().catch(() => {});
await pagina.waitForTimeout(1000);

/* Conversión */
await pagina.getByRole('button', { name: /^Conversión$/ }).first().click();
await pagina.waitForSelector('[data-testid="panel-embudo"]', { timeout: 30_000 });
await pagina.waitForTimeout(2600);
const embudo = await pagina.evaluate(() => ({
  bandas: document.querySelectorAll('[data-testid="panel-embudo"] svg rect').length,
  transiciones: document.querySelectorAll('.mk-embudo-transicion').length,
  texto: document.querySelector('[data-testid="panel-embudo"]')?.textContent?.replace(/\s+/g, ' ') ?? '',
}));
comprobar('Conversión: cuatro bandas proporcionales', embudo.bandas >= 4, `${embudo.bandas} bandas`);
comprobar('Conversión: salidas laterales y transiciones', embudo.transiciones >= 3, `${embudo.transiciones} transiciones`);
comprobar('Conversión: explica compras vs embudo', embudo.texto.includes('compras totales') || embudo.texto.includes('Compras totales'));
await pagina.waitForSelector('[data-testid="panel-friccion"]', { timeout: 45_000 });
await pagina.waitForFunction(
  () => document.querySelectorAll('[data-testid="panel-friccion"] [role="cell"]').length > 3,
  { timeout: 45_000 },
);
const friccion = await pagina.evaluate(() => {
  const panel = document.querySelector('[data-testid="panel-friccion"]');
  return {
    titulo:
      panel?.closest('section')?.querySelector('h3')?.textContent?.trim() ??
      panel?.querySelector('h3')?.textContent?.trim(),
    celdas: panel?.querySelectorAll('[role="cell"]').length ?? 0,
    canales: panel?.querySelectorAll('[role="rowheader"]').length ?? 0,
    texto: panel?.textContent?.replace(/\s+/g, ' ') ?? '',
  };
});
comprobar(
  'Conversión: mapa de fricción por canal y transición',
  friccion.titulo === 'Mapa de fricción del embudo' && friccion.celdas >= 6 && friccion.canales >= 2,
  `${friccion.celdas} celdas · ${friccion.canales} canales`,
);
comprobar(
  'Conversión: el mapa declara su referencia y sus límites',
  friccion.texto.includes('pp') && /base reducida|sin avance/i.test(friccion.texto),
  friccion.texto.slice(0, 90),
);
await pagina.evaluate(() => document.querySelector('[data-testid="panel-friccion"]')?.scrollIntoView({ block: 'center' }));
await pagina.waitForTimeout(600);
await pagina.screenshot({ path: `${EVIDENCIAS}/conversion-friccion-${sufijo}.png` });
await pagina.screenshot({ path: `${EVIDENCIAS}/conversion-${sufijo}.png` });

/* Detalle de transición */
await pagina.locator('.mk-embudo-transicion').first().evaluate((nodo) => nodo.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await pagina.waitForSelector('[data-testid="panel-transicion"]', { timeout: 20_000 });
await pagina.waitForTimeout(1500);
const transicion = await pagina.evaluate(() => ({
  titulo: document.querySelector('[data-testid="panel-transicion"] h3')?.textContent?.trim(),
  tramos: [
    ...document.querySelectorAll('[data-testid="panel-transicion"] .mk-lista-barras li'),
  ].map((li) => li.querySelector('span')?.textContent?.trim() ?? ''),
}));
comprobar(
  'Conversión: detalle de transición con tiempos',
  Boolean(transicion.titulo) && transicion.tramos.length > 0,
  `${transicion.titulo} · ${transicion.tramos.length} tramos`,
);
comprobar(
  'Conversión: cada tramo lleva su etiqueta de tiempo',
  transicion.tramos.length > 0 &&
    transicion.tramos.every((tramo) => /min$|h$|más de 24/.test(tramo)),
  transicion.tramos.join(' · '),
);
await pagina.screenshot({ path: `${EVIDENCIAS}/conversion-transicion-${sufijo}.png` });

/* Cohortes */
await pagina.getByRole('button', { name: /^Cohortes y retención$/ }).first().click();
await pagina.waitForSelector('[data-testid="panel-matriz"]', { timeout: 30_000 });
await pagina.waitForTimeout(2600);
const cohortes = await pagina.evaluate(() => ({
  curvas: document.querySelectorAll('[data-testid="panel-curvas"] svg path').length,
  celdas: document.querySelectorAll('.mk-matriz .mk-celda').length,
  puntos: document.querySelectorAll('[data-testid="panel-puntos"] circle').length,
  leyenda: document.querySelectorAll('.mk-leyenda-item').length,
}));
comprobar('Cohortes: curvas por segmento', cohortes.curvas >= 1, `${cohortes.curvas} trazos`);
comprobar('Cohortes: matriz con celdas', cohortes.celdas > 0, `${cohortes.celdas} celdas`);
comprobar('Cohortes: puntos emparejados S1', cohortes.puntos > 0, `${cohortes.puntos} puntos`);
await pagina.screenshot({ path: `${EVIDENCIAS}/cohortes-${sufijo}.png` });

/* La dimensión del selector cambia las curvas */
const antes = await pagina.evaluate(() => document.querySelector('[data-testid="panel-curvas"]')?.textContent ?? '');
await pagina.getByRole('button', { name: /^Dispositivo$/ }).first().click();
await pagina.waitForTimeout(2600);
const despues = await pagina.evaluate(() => document.querySelector('[data-testid="panel-curvas"]')?.textContent ?? '');
comprobar('Cohortes: el selector de dimensión cambia el gráfico', antes !== despues);

await pagina.getByRole('button', { name: /^País$/ }).first().click();
await pagina.waitForTimeout(4000);
const controlesCohortes = await pagina.evaluate(() => {
  const botones = [...document.querySelectorAll('[data-testid="panel-curvas"] .mk-seg')];
  const selector = document.querySelector('[data-testid="panel-curvas"] .mk-selector-trigger');
  const cajas = botones.map((b) => b.getBoundingClientRect());
  const cajaSelector = selector?.getBoundingClientRect();
  return {
    botones: botones.map((b) => b.textContent.trim()),
    filas: new Set(cajas.map((c) => Math.round(c.y))).size,
    texto: selector?.textContent?.trim() ?? '',
    alineado: cajaSelector && cajas.length
      ? Math.abs(cajaSelector.y + cajaSelector.height / 2 - (cajas[0].y + cajas[0].height / 2)) <= 4
      : false,
    unaLinea: selector ? selector.getBoundingClientRect().height <= 34 : false,
  };
});
comprobar(
  'Cohortes: Canal / Dispositivo / País en una sola fila',
  controlesCohortes.filas === 1 && controlesCohortes.botones.length === 3,
  controlesCohortes.botones.join(' · '),
);
// En escritorio y tablet va alineado junto a la dimensión; en móvil el grupo
// completo de controles baja a su propia fila (sin desbordar la página).
comprobar(
  movil
    ? 'Cohortes: en móvil los controles bajan a su propia fila'
    : 'Cohortes: el selector de países queda alineado junto a la dimensión',
  movil ? !controlesCohortes.alineado && controlesCohortes.unaLinea : controlesCohortes.alineado && controlesCohortes.unaLinea,
  controlesCohortes.texto,
);
comprobar(
  'Cohortes: el selector resume la selección sin partir el texto',
  /Países · \d+ seleccionados?/.test(controlesCohortes.texto),
  controlesCohortes.texto,
);
await pagina.screenshot({ path: `${EVIDENCIAS}/cohortes-controles-${sufijo}.png` });
await pagina.getByRole('button', { name: /^Canal$/ }).first().click();
await pagina.waitForTimeout(1500);
await pagina.screenshot({ path: `${EVIDENCIAS}/cohortes-dispositivo-${sufijo}.png` });

/* Sin desbordamiento horizontal */
const ancho = await pagina.evaluate(() => ({
  documento: document.documentElement.scrollWidth,
  ventana: window.innerWidth,
}));
comprobar('Sin desplazamiento horizontal', ancho.documento <= ancho.ventana + 1, `${ancho.documento}/${ancho.ventana}`);

await navegador.close();
comprobar('Sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

const fallos = resultados.filter((r) => !r.correcto);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas`);
if (fallos.length > 0) process.exitCode = 1;




