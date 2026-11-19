/**
 * Verificación de las dos cabeceras: gráfica temporal y rankings por alcaldía.
 *
 * Uso: node tools/verificar-cabeceras.mjs
 * Capturas en `evidencias/cabeceras/`.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/cabeceras/', new URL('../', import.meta.url)));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const API = process.env.ATLAS_API || 'http://127.0.0.1:8010/api/v1/atlas-vial';
const RUTA = '#/area/dashboards/atlas-vial';

mkdirSync(EVIDENCIAS, { recursive: true });

const resultados = [];
function revisar(nombre, condicion, detalle = '') {
  resultados.push({ nombre, ok: Boolean(condicion) });
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
const pagina = await contexto.newPage();
const errores = [];
pagina.on('pageerror', (error) => errores.push(String(error)));

await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await pagina.waitForTimeout(1800);

const panel = pagina.locator('[data-testid="panel-linea"]');
const cab = panel.locator('.at-tl-cab');
const controles = pagina.locator('[data-testid="tl-controles"]');

/* ------------------------------- 1. Cabecera de la gráfica temporal */

/* «Comparar tendencias» es la etiqueta más larga: se verifica con ella activa. */
await panel.getByRole('button', { name: 'Comparar tendencias' }).click();
await pagina.waitForSelector('[data-testid="tl-tendencia"]', { timeout: 20_000 });
await pagina.waitForTimeout(500);

const geometria = await pagina.evaluate(() => {
  const cabecera = document.querySelector('.at-tl-cab');
  const titulo = cabecera?.querySelector('h3');
  const sub = cabecera?.querySelector('.at-panel-sub');
  const controlesNodo = document.querySelector('[data-testid="tl-controles"]');
  const grupos = [...(controlesNodo?.querySelectorAll('.at-segmentado') ?? [])];
  const tarjeta = document.querySelector('[data-testid="panel-linea"]');
  const caja = (nodo) => {
    const r = nodo.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), fin: Math.round(r.right), centro: Math.round(r.y + r.height / 2) };
  };
  const estilo = tarjeta ? getComputedStyle(tarjeta) : null;
  const rellenoDerecha = estilo ? Number.parseFloat(estilo.paddingRight) : 0;
  return {
    titulo: caja(titulo),
    controles: caja(controlesNodo),
    grupos: grupos.map(caja),
    sub: caja(sub),
    tarjeta: caja(tarjeta),
    rellenoDerecha,
    altoControles: caja(controlesNodo).h,
    hijosCab: cabecera ? cabecera.children.length : 0,
  };
});

revisar(
  'los dos selectores están en una sola fila',
  geometria.grupos.length === 2 &&
    Math.abs(geometria.grupos[0].y - geometria.grupos[1].y) <= 1,
  `y ${geometria.grupos.map((g) => g.y).join(' / ')}`,
);
revisar(
  'los dos selectores tienen la misma altura',
  Math.abs(geometria.grupos[0].h - geometria.grupos[1].h) <= 1,
  `alto ${geometria.grupos.map((g) => g.h).join(' / ')} px`,
);
revisar(
  'separación de 8 px entre selectores',
  Math.abs(geometria.grupos[1].x - geometria.grupos[0].fin - 8) <= 1,
  `${geometria.grupos[1].x - geometria.grupos[0].fin} px`,
);
revisar(
  'centro vertical alineado con el bloque de título',
  Math.abs(geometria.controles.centro - geometria.sub.centro) <= 12,
  `controles ${geometria.controles.centro} vs subtítulo ${geometria.sub.centro}`,
);
revisar(
  'el grupo termina en el margen derecho interior de la tarjeta',
  Math.abs(geometria.tarjeta.fin - geometria.rellenoDerecha - geometria.controles.fin) <= 2,
  `borde ${geometria.tarjeta.fin - geometria.rellenoDerecha} vs controles ${geometria.controles.fin}`,
);
revisar(
  'no queda una segunda fila de controles',
  geometria.hijosCab === 2,
  `${geometria.hijosCab} bloques en la cabecera`,
);

const ordenTexto = (await controles.innerText()).replace(/\s+/g, ' ').trim();
revisar('orden: agregación primero, presentación después', /^Día Semana Mes Cantidades Comparar tendencias$/.test(ordenTexto), ordenTexto);
revisar(
  'cada selector conserva su nombre accesible',
  (await panel.locator('[aria-label="Agregación temporal"]').count()) === 1 &&
    (await panel.locator('[aria-label="Presentación de la gráfica"]').count()) === 1,
);
revisar('sin posiciones absolutas en la cabecera', await cab.evaluate((nodo) => {
  const estilos = getComputedStyle(nodo);
  const hijos = [...nodo.children].map((hijo) => getComputedStyle(hijo).position);
  return estilos.position === 'static' && hijos.every((p) => p === 'static');
}));

await panel.screenshot({ path: `${EVIDENCIAS}/temporal-cabecera-escritorio.png` });

/* ------------------------------- 2. Cabecera del panel de rankings */

const panelContexto = pagina.locator('[data-testid="panel-contexto"]');
await pagina.waitForSelector('[data-testid="rankings-alcaldias"]', { timeout: 30_000 });

const textos = {
  titulo: (await panelContexto.locator('h3').innerText()).trim(),
  subtitulo: (await panelContexto.locator('.at-panel-sub').innerText()).replace(/\s+/g, ' ').trim(),
  alcance: (await panelContexto.locator('.at-rankings-alcance').innerText()).replace(/\s+/g, ' ').trim(),
  escala: (await panelContexto.locator('.at-rankings-escala').innerText()).replace(/\s+/g, ' ').trim(),
  cuerpo: (await panelContexto.locator('.at-contexto-cuerpo').innerText()).replace(/\s+/g, ' '),
};
revisar('título «Comparación por alcaldía»', textos.titulo === 'Comparación por alcaldía', textos.titulo);
revisar('subtítulo de cinco por métrica', textos.subtitulo === 'Las cinco primeras por cada métrica', textos.subtitulo);
revisar(
  'nota de alcance con etiqueta',
  /^Alcance Todas las alcaldías; se aplican los demás filtros\.$/.test(textos.alcance),
  textos.alcance,
);
revisar('escala declarada una sola vez', textos.escala === 'Cada ranking utiliza su propia escala' && (textos.cuerpo.match(/Cada ranking utiliza su propia escala/g) ?? []).length === 1);
revisar(
  'ya no aparecen los textos anteriores',
  !/Resumen del filtro|Cobertura del filtro y alcance de los rankings|COMPARACIÓN POR ALCALDÍA/.test(
    (await panelContexto.innerText()).replace(/\s+/g, ' ') + textos.cuerpo,
  ) &&
    !/Elige una alcaldía en el mapa o en la lista/.test(textos.cuerpo),
);
revisar(
  'sin mayúsculas sostenidas ni iconos en la cabecera nueva',
  await panelContexto.evaluate((nodo) => {
    const titulo = nodo.querySelector('h3');
    const sub = nodo.querySelector('.at-panel-sub');
    return (
      getComputedStyle(titulo).textTransform === 'none' &&
      getComputedStyle(sub).textTransform === 'none' &&
      titulo.querySelector('svg') === null
    );
  }),
);

const tipografia = await panelContexto.evaluate((nodo) => {
  const titulo = nodo.querySelector('h3');
  const sub = nodo.querySelector('.at-panel-sub');
  const alcance = nodo.querySelector('.at-rankings-alcance');
  const cabecera = nodo.querySelector('.at-panel-head');
  const cabRankings = nodo.querySelector('.at-rankings-cab');
  const primeraLista = nodo.querySelector('.at-ranking-metrica');
  const caja = (n) => n.getBoundingClientRect();
  return {
    tituloTamano: Number.parseFloat(getComputedStyle(titulo).fontSize),
    tituloPeso: Number.parseFloat(getComputedStyle(titulo).fontWeight),
    tituloFuente: getComputedStyle(titulo).fontFamily,
    subTamano: Number.parseFloat(getComputedStyle(sub).fontSize),
    subColor: getComputedStyle(sub).color,
    distanciaSubTitulo: Math.round(caja(sub).top - caja(titulo).bottom),
    distanciaAlcance: Math.round(caja(alcance).top - caja(sub).bottom),
    distanciaPrimerRanking: Math.round(caja(primeraLista).top - caja(cabRankings).bottom),
    etqPeso: Number.parseFloat(getComputedStyle(nodo.querySelector('.at-rankings-etq')).fontWeight),
    huecoCabeceraCuerpo: Math.round(caja(cabecera).bottom - caja(cabecera).top),
  };
});
revisar(
  'título 16 px / 600 con la tipografía editorial',
  tipografia.tituloTamano === 16 && tipografia.tituloPeso === 600 && /Fraunces/.test(tipografia.tituloFuente),
  `${tipografia.tituloTamano}px / ${tipografia.tituloPeso} / ${tipografia.tituloFuente.split(',')[0]}`,
);
revisar(
  'subtítulo 12–13 px en gris legible y a 4 px del título',
  tipografia.subTamano >= 12 &&
    tipografia.subTamano <= 13.5 &&
    tipografia.subColor === 'rgb(89, 98, 115)' &&
    tipografia.distanciaSubTitulo <= 6,
  `${tipografia.subTamano}px · ${tipografia.subColor} · ${tipografia.distanciaSubTitulo}px`,
);
revisar(
  'nota de alcance a 10–12 px del subtítulo y etiqueta en peso medio',
  tipografia.distanciaAlcance >= 6 && tipografia.distanciaAlcance <= 16 && tipografia.etqPeso === 500,
  `${tipografia.distanciaAlcance}px · peso ${tipografia.etqPeso}`,
);
revisar(
  'unos 16 px antes del primer ranking',
  Math.abs(tipografia.distanciaPrimerRanking - 16) <= 4,
  `${tipografia.distanciaPrimerRanking}px`,
);
revisar(
  'la tarjeta no se estira ni deja huecos',
  await panelContexto.evaluate((nodo) => {
    const cuerpo = nodo.querySelector('.at-contexto-cuerpo');
    const estilo = getComputedStyle(cuerpo);
    return estilo.justifyContent === 'flex-start';
  }),
);

/* Cinco filas por ranking y el filtro de alcaldía no recorta la comparación. */
const filasPorRanking = await pagina.locator('[data-testid="rankings-alcaldias"] .at-ranking-metrica').evaluateAll(
  (nodos) => nodos.map((nodo) => nodo.querySelectorAll('.at-ranking-lista > li').length),
);
revisar('cada ranking muestra cinco alcaldías', filasPorRanking.every((n) => n === 5), filasPorRanking.join(' / '));

const antesDeFiltrar = await pagina
  .locator('[data-testid="ranking-hechos"] .at-ranking-valor')
  .allInnerTexts();
await pagina.goto(`${SITIO}/?at_alcaldia=Cuauht%C3%A9moc${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="ranking-hechos"]', { timeout: 45_000 });
await pagina.waitForTimeout(1600);
const despuesDeFiltrar = await pagina
  .locator('[data-testid="ranking-hechos"] .at-ranking-valor')
  .allInnerTexts();
revisar(
  'el ranking excluye el filtro de alcaldía (la comparación se conserva)',
  antesDeFiltrar.join() === despuesDeFiltrar.join() &&
    despuesDeFiltrar.length === 5 &&
    despuesDeFiltrar.some((valor) => valor !== '0'),
  `${antesDeFiltrar.join(' ')} → ${despuesDeFiltrar.join(' ')}`,
);

/* Con una alcaldía seleccionada no se muestran textos del ranking general. */
await pagina.goto(`${SITIO}/?at_alcaldia=Cuauht%C3%A9moc&at_sel=Cuauht%C3%A9moc${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="panel-contexto"]', { timeout: 45_000 });
await pagina.waitForTimeout(1500);
const detalle = (await pagina.locator('[data-testid="panel-contexto"]').innerText()).replace(/\s+/g, ' ');
revisar(
  'el detalle conserva el nombre de la alcaldía y no muestra textos del ranking',
  /Cuauhtémoc/.test(detalle) &&
    !/Todas las alcaldías|Las cinco primeras|Cada ranking utiliza su propia escala/.test(detalle),
  detalle.slice(0, 90),
);
await pagina.locator('[data-testid="panel-contexto"]').screenshot({
  path: `${EVIDENCIAS}/contexto-detalle-alcaldia.png`,
});

await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="rankings-alcaldias"]', { timeout: 45_000 });
await pagina.waitForTimeout(1600);
await panelContexto.screenshot({ path: `${EVIDENCIAS}/contexto-rankings-escritorio.png` });

/* ------------------------------------------- 3. Móvil y nombres largos */

const movil = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const paginaMovil = await movil.newPage();
await paginaMovil.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await paginaMovil.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await paginaMovil.waitForTimeout(1800);
const panelMovil = paginaMovil.locator('[data-testid="panel-linea"]');
await panelMovil.scrollIntoViewIfNeeded();
await paginaMovil.evaluate(() => window.scrollBy(0, -150));
await paginaMovil.waitForTimeout(500);
await panelMovil.getByRole('button', { name: 'Comparar tendencias' }).click();
await paginaMovil.waitForTimeout(500);

const movilMedidas = await paginaMovil.evaluate(() => {
  const cabecera = document.querySelector('.at-tl-cab');
  const controlesNodo = document.querySelector('[data-testid="tl-controles"]');
  const grupos = [...(controlesNodo?.querySelectorAll('.at-segmentado') ?? [])];
  const rect = (n) => n.getBoundingClientRect();
  return {
    documento: document.documentElement.scrollWidth,
    cabecera: Math.round(rect(cabecera).width),
    controles: Math.round(rect(controlesNodo).width),
    mismoRenglon: grupos.length === 2 && Math.abs(rect(grupos[0]).y - rect(grupos[1]).y) <= 1,
    derecha: Math.round(rect(controlesNodo).right),
    tarjetaDerecha: Math.round(rect(document.querySelector('[data-testid="panel-linea"]')).right),
    etiquetasCortadas: grupos.some((grupo) =>
      [...grupo.querySelectorAll('button')].some((b) => b.scrollWidth > b.clientWidth + 1),
    ),
  };
});
revisar(
  'en móvil los selectores envuelven a la derecha sin cortar textos ni desbordar',
  movilMedidas.documento <= 390 &&
    !movilMedidas.etiquetasCortadas &&
    movilMedidas.derecha <= movilMedidas.tarjetaDerecha &&
    movilMedidas.controles <= movilMedidas.cabecera + 1,
  JSON.stringify(movilMedidas),
);
await panelMovil.screenshot({ path: `${EVIDENCIAS}/temporal-cabecera-movil.png` });

/* Nombre de alcaldía largo en el detalle del panel de rankings. */
await pagina.goto(`${SITIO}/?at_sel=Gustavo%20A.%20Madero${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="panel-contexto"]', { timeout: 45_000 });
await pagina.waitForTimeout(1500);
const largoTitulo = await pagina.locator('[data-testid="panel-contexto"] h3').evaluate((nodo) => ({
  texto: nodo.textContent?.trim(),
  cortado: nodo.scrollWidth > nodo.clientWidth + 1,
  alto: Math.round(nodo.getBoundingClientRect().height),
}));
revisar(
  'los nombres largos caben sin cortarse',
  largoTitulo.texto === 'Gustavo A. Madero' && !largoTitulo.cortado,
  JSON.stringify(largoTitulo),
);

revisar('sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

await navegador.close();

const fallas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallas.length}/${resultados.length} comprobaciones correctas`);
console.log(`capturas en ${EVIDENCIAS}`);
process.exit(fallas.length === 0 ? 0 : 1);

