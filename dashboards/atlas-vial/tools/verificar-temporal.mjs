/**
 * Verificación de «Evolución de hechos y personas afectadas» (tres paneles + tendencias).
 *
 * Uso: node tools/verificar-temporal.mjs
 * Guarda capturas en `evidencias/temporal/`.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/temporal/', new URL('../', import.meta.url)));
const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const API = process.env.ATLAS_API || 'http://127.0.0.1:8010/api/v1/atlas-vial';
const RUTA = '#/area/dashboards/atlas-vial';

mkdirSync(EVIDENCIAS, { recursive: true });

const resultados = [];
function revisar(nombre, condicion, detalle = '') {
  resultados.push({ nombre, ok: Boolean(condicion) });
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

const serieMes = (await (await fetch(`${API}/tiempo?agregacion=mes`)).json()).serie;
const resumen = await (await fetch(`${API}/resumen`)).json();
const numeros = (lista) => lista.map((fila) => Number(String(fila).replace(/[^\d]/g, '')));

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const pagina = await contexto.newPage();

const peticiones = [];
pagina.on('request', (peticion) => {
  if (peticion.url().includes('/tiempo')) peticiones.push(peticion.url());
});
const errores = [];
pagina.on('pageerror', (error) => errores.push(String(error)));

await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="tl-paneles"] .at-tl-panel', { timeout: 45_000 });
await pagina.waitForTimeout(1800);

const panel = pagina.locator('[data-testid="panel-linea"]');
const paneles = panel.locator('[data-testid="tl-paneles"] .at-tl-panel');
const textosY = async (locator) =>
  locator.evaluateAll((nodos) => nodos.map((nodo) => (nodo.textContent ?? '').trim()).filter(Boolean));

/* ---------------------------------------------- 1. Estado inicial mensual */

revisar('agregación inicial mensual', (await panel.getAttribute('data-agregacion')) === 'mes');
const capsulaAgregacion = panel
  .locator('[aria-label="Agregación temporal"]')
  .locator('.at-seg.is-activa');
revisar(
  'la cápsula activa es «Mes»',
  /Mes/.test(await capsulaAgregacion.innerText()),
  await capsulaAgregacion.innerText(),
);
revisar('presentación inicial «Cantidades»', (await panel.getAttribute('data-modo')) === 'cantidades');
revisar('tres paneles apilados en una sola tarjeta', (await paneles.count()) === 3);

/* --------------------------------- 2. Escalas independientes desde cero */

const ticksPorPanel = [];
for (let i = 0; i < 3; i += 1) {
  const svg = paneles.nth(i).locator('svg');
  ticksPorPanel.push(await textosY(svg.locator('text')));
}
const maximos = ticksPorPanel.map((ticks) => Math.max(...numeros(ticks)));
revisar(
  'cada panel tiene su propia escala desde cero',
  ticksPorPanel.every((ticks) => ticks.includes('0')) &&
    maximos[2] < maximos[0] &&
    maximos[2] < maximos[1] &&
    ticksPorPanel[0].length >= 3,
  `máximos ${maximos.join(' / ')}`,
);

const totalesPaneles = numeros(await paneles.locator('.at-tl-panel-total').allInnerTexts());
revisar(
  'los totales del intervalo coinciden con la serie y con el resumen',
  totalesPaneles[0] === serieMes.reduce((s, f) => s + f.hechos, 0) &&
    totalesPaneles[1] === serieMes.reduce((s, f) => s + f.lesionadas, 0) &&
    totalesPaneles[2] === serieMes.reduce((s, f) => s + f.fallecidas, 0) &&
    totalesPaneles[0] === resumen.indicadores.hechos.valor &&
    totalesPaneles[1] === resumen.indicadores.personas_lesionadas.valor &&
    totalesPaneles[2] === resumen.indicadores.personas_fallecidas.valor,
  `${totalesPaneles.join(' / ')} vs resumen ${resumen.indicadores.hechos.valor}/${resumen.indicadores.personas_lesionadas.valor}/${resumen.indicadores.personas_fallecidas.valor}`,
);

/* La línea de fallecimientos usa su panel: sus puntos no están aplanados. */
const puntosFallecidas = await paneles
  .nth(2)
  .locator('circle')
  .evaluateAll((nodos) => nodos.map((nodo) => Number(nodo.getAttribute('cy'))));
const amplitud = Math.max(...puntosFallecidas) - Math.min(...puntosFallecidas);
revisar('la evolución de fallecimientos es legible (no aplanada)', amplitud > 18, `amplitud ${Math.round(amplitud)} px`);

revisar('sin relleno de área', (await panel.locator('path[fill]:not([fill="none"])').count()) === 0);
const desplazamientos = await paneles
  .nth(0)
  .locator('path')
  .first()
  .evaluate((nodo) => (nodo.getAttribute('d') ?? '').slice(0, 40));
revisar('trazos rectos, sin suavizado', desplazamientos.includes('L'), desplazamientos);

const etiquetasX = await textosY(paneles.nth(2).locator('svg').locator('text'));
revisar(
  'meses abreviados sin repetir el año',
  etiquetasX.includes('ene') && etiquetasX.includes('dic') && !etiquetasX.some((t) => /2024/.test(t)),
  etiquetasX.join(' '),
);

/* ------------------------------- 3. Cursor y tooltip sincronizados */

await panel.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(400);
const cajaPaneles = await paneles.nth(0).locator('svg').boundingBox();
const urlAntesDeHover = pagina.url();
const peticionesAntes = peticiones.length;
await pagina.mouse.move(
  cajaPaneles.x + cajaPaneles.width * 0.45,
  cajaPaneles.y + cajaPaneles.height * 0.6,
);
await pagina.waitForTimeout(320);

const guias = await paneles.locator('svg line[stroke-dasharray="3 3"]').evaluateAll((nodos) =>
  nodos.map((nodo) => Number(nodo.getAttribute('x1'))),
);
revisar(
  'la guía vertical aparece alineada en los tres paneles',
  guias.length === 3 && new Set(guias.map((x) => Math.round(x))).size === 1,
  guias.map((x) => Math.round(x)).join(' / '),
);

const tooltip = pagina.locator('[data-testid="tl-tooltip"]');
const filasTip = await tooltip.locator('li').allInnerTexts();
revisar('un único tooltip con las tres series', (await tooltip.count()) === 1 && filasTip.length === 3,
  filasTip.join(' | ').replace(/\s+/g, ' '));

const periodoActivo = await tooltip.locator('.at-tl-tooltip-periodo').innerText();
const nombreMes = periodoActivo.trim().slice(0, 3);
revisar(
  'el tooltip coincide con la serie del periodo marcado',
  serieMes.some((fila) => {
    const valores = numeros(filasTip);
    return (
      valores[0] === fila.hechos && valores[1] === fila.lesionadas && valores[2] === fila.fallecidas
    );
  }),
  `${nombreMes} · ${numeros(filasTip).join('/')}`,
);

revisar('el hover no modifica la URL ni los filtros', pagina.url() === urlAntesDeHover);
revisar('el cursor no dispara consultas nuevas', peticiones.length === peticionesAntes, `${peticiones.length - peticionesAntes} peticiones`);

const cajaTooltip = await tooltip.boundingBox();
const cajaPanel = await panel.boundingBox();
revisar(
  'el tooltip permanece dentro del panel',
  cajaTooltip.x >= cajaPanel.x - 1 && cajaTooltip.x + cajaTooltip.width <= cajaPanel.x + cajaPanel.width + 1,
);

await panel.screenshot({ path: `${EVIDENCIAS}/evolucion-cantidades-mes.png` });

/* ------------------------------------------------ 4. Selección temporal */

await pagina.locator('[data-testid="tl-acotar"]').click();
await pagina.waitForTimeout(1600);
const urlSeleccion = new URL(pagina.url());
revisar(
  'acotar aplica una sola vez el periodo elegido',
  urlSeleccion.searchParams.get('at_desde') !== null &&
    urlSeleccion.searchParams.getAll('at_desde').length === 1 &&
    urlSeleccion.searchParams.get('at_desde') === urlSeleccion.searchParams.get('at_hasta')?.replace(/\d{2}$/, '01'),
  `${urlSeleccion.searchParams.get('at_desde')} → ${urlSeleccion.searchParams.get('at_hasta')}`,
);
revisar(
  'la agregación se conserva al aplicar el filtro',
  (await panel.getAttribute('data-agregacion')) === 'mes',
);

/* ---------------------------------------------- 5. Agregación Día/Semana */

await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="tl-paneles"] .at-tl-panel', { timeout: 45_000 });
await pagina.waitForTimeout(1500);

await panel.getByRole('button', { name: 'Día', exact: true }).click();
await pagina.waitForSelector('[data-testid="panel-linea"][data-agregacion="dia"]', { timeout: 30_000 });
await pagina.waitForTimeout(4000);
const puntosDia = await paneles.nth(0).locator('circle').count();
const subtituloDia = (await panel.locator('.at-panel-sub').innerText()).replace(/\s+/g, ' ');
revisar(
  'la agregación diaria usa los 366 periodos reales',
  /366 periodos/.test(subtituloDia) && puntosDia === 0,
  `${subtituloDia.trim()} · ${puntosDia} puntos`,
);
await panel.screenshot({ path: `${EVIDENCIAS}/evolucion-cantidades-dia.png` });

await panel.getByRole('button', { name: 'Semana', exact: true }).click();
await pagina.waitForSelector('[data-testid="panel-linea"][data-agregacion="semana"]', { timeout: 30_000 });
await pagina.waitForTimeout(4000);
const subtituloSemana = (await panel.locator('.at-panel-sub').innerText()).replace(/\s+/g, ' ');
revisar('la agregación semanal usa los periodos ISO del año', /5[2-3] periodos/.test(subtituloSemana), subtituloSemana.trim());

/* La agregación se restaura desde la URL y no se reinicia al filtrar. */
await pagina.goto(`${SITIO}/?at_ag=semana${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="panel-linea"]', { timeout: 45_000 });
await pagina.waitForTimeout(1500);
revisar(
  'la agregación guardada en la URL se respeta',
  (await pagina.locator('[data-testid="panel-linea"]').getAttribute('data-agregacion')) === 'semana',
);

/* ------------------------------------------- 6. Comparar tendencias */

await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await pagina.waitForTimeout(1500);
const peticionesAntesDeModo = peticiones.length;
await panel.getByRole('button', { name: 'Comparar tendencias' }).click();
await pagina.waitForSelector('[data-testid="tl-tendencia"]', { timeout: 20_000 });
await pagina.waitForTimeout(600);
revisar(
  'cambiar de presentación no dispara otra consulta',
  peticiones.length === peticionesAntesDeModo,
  `${peticiones.length - peticionesAntesDeModo} peticiones`,
);

const serieGrupos = await panel.locator('[data-testid="tl-tendencia"] g[data-serie]').count();
revisar('la vista de tendencias dibuja las tres series juntas', serieGrupos === 3);

const ticksIndice = await textosY(panel.locator('[data-testid="tl-tendencia"] svg text'));
revisar('el eje de tendencias es un índice con guía en 100', ticksIndice.includes('100'), ticksIndice.join(' '));

const pieTendencia = (await panel.locator('.at-linea-pie').innerText()).replace(/\s+/g, ' ');
revisar('el pie declara la referencia base 100', /Base 100 · ene 2024/.test(pieTendencia), pieTendencia.trim());

await panel.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(400);
const cajaTendencia = await panel.locator('[data-testid="tl-tendencia"] svg').boundingBox();
await pagina.mouse.move(cajaTendencia.x + 60, cajaTendencia.y + cajaTendencia.height * 0.5);
await pagina.waitForTimeout(320);
const indicesTip = await panel.locator('[data-testid="tl-tooltip"] .at-tl-tooltip-indice').allInnerTexts();
revisar(
  'el tooltip de tendencias muestra índice y cantidad original',
  indicesTip.length === 3 && indicesTip.every((texto) => /índice/.test(texto)),
  indicesTip.join(' / '),
);
const faltantes = (await panel.locator('[data-testid="tl-tooltip"] li').allInnerTexts()).length;
revisar('el tooltip conserva las tres cantidades', faltantes === 3);
await panel.screenshot({ path: `${EVIDENCIAS}/evolucion-tendencias.png` });

/* presentation not triggering queries is asserted above */

/* Referencia con denominador cero: Milpa Alta tiene 0 fallecidas en ene 2024. */
await pagina.goto(`${SITIO}/?at_v=territorio&at_alcaldia=Milpa%20Alta${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await pagina.waitForTimeout(1600);
await pagina.locator('[data-testid="panel-linea"]').getByRole('button', { name: 'Comparar tendencias' }).click();
await pagina.waitForTimeout(600);
const gruposCero = await pagina.locator('[data-testid="panel-linea"] [data-testid="tl-tendencia"] g[data-serie]').count();
const leyendaCero = (await pagina.locator('.at-tl-leyenda-tendencia').innerText()).replace(/\s+/g, ' ');
const pieCero = (await pagina.locator('[data-testid="panel-linea"] .at-linea-pie').innerText()).replace(/\s+/g, ' ');
revisar(
  'referencia cero: la serie no se indexa y se explica',
  gruposCero === 2 && /sin índice/i.test(leyendaCero) && /referencia cero o ausente: personas fallecidas/.test(pieCero),
  pieCero.trim(),
);
await pagina.locator('[data-testid="panel-linea"]').screenshot({ path: `${EVIDENCIAS}/evolucion-tendencias-sin-referencia.png` });

/* Periodos parciales: el intervalo recorta el primer y el último mes. */
await pagina.goto(
  `${SITIO}/?at_desde=2024-02-10&at_hasta=2024-11-20${RUTA}`,
  { waitUntil: 'domcontentloaded' },
);
await pagina.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await pagina.waitForTimeout(1800);
const huecos = await pagina
  .locator('[data-testid="tl-paneles"] .at-tl-panel')
  .first()
  .locator('circle[fill="#FFFFFF"]')
  .count();
const pieParcial = (await pagina.locator('[data-testid="panel-linea"] .at-linea-pie').innerText()).replace(/\s+/g, ' ');
revisar('los periodos recortados se marcan como parciales', huecos === 2 && /puntos huecos/.test(pieParcial), `${huecos} huecos`);

await pagina.locator('[data-testid="panel-linea"]').getByRole('button', { name: 'Comparar tendencias' }).click();
await pagina.waitForTimeout(600);
const pieRef = (await pagina.locator('[data-testid="panel-linea"] .at-linea-pie').innerText()).replace(/\s+/g, ' ');
revisar(
  'la referencia es el primer periodo completo, no el primero recortado',
  /Base 100 · mar 2024/.test(pieRef) && /parciales no se indexan/.test(pieRef),
  pieRef.trim(),
);

/* Un intervalo sin periodo completo no puede indexarse: se explica. */
await pagina.goto(`${SITIO}/?at_desde=2024-03-05&at_hasta=2024-03-20${RUTA}`, {
  waitUntil: 'domcontentloaded',
});
await pagina.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await pagina.waitForTimeout(1600);
await pagina.locator('[data-testid="panel-linea"]').getByRole('button', { name: 'Comparar tendencias' }).click();
await pagina.waitForTimeout(500);
const avisoReferencia = (await pagina.locator('[data-testid="tl-sin-referencia"]').innerText()).replace(/\s+/g, ' ');
revisar(
  'sin periodo completo se explica en lugar de indexar',
  /no hay un periodo completo/i.test(avisoReferencia) &&
    (await pagina.locator('[data-testid="tl-tendencia"]').count()) === 0,
  avisoReferencia.slice(0, 80),
);

/* Un único periodo: el punto se ve, no se fabrica una línea. */
await pagina.goto(`${SITIO}/?at_desde=2024-03-05&at_hasta=2024-03-30${RUTA}`, {
  waitUntil: 'domcontentloaded',
});
await pagina.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await pagina.waitForTimeout(1500);
const unSoloPeriodo = {
  periodos: (await pagina.locator('[data-testid="panel-linea"] .at-panel-sub').innerText()).replace(/\s+/g, ' '),
  puntos: await pagina.locator('[data-testid="tl-paneles"] .at-tl-panel').first().locator('circle').count(),
  trazos: await pagina.locator('[data-testid="tl-paneles"] .at-tl-panel').first().locator('path').count(),
};
revisar(
  'un único periodo muestra el punto sin línea inventada',
  /1 periodo/.test(unSoloPeriodo.periodos) && unSoloPeriodo.puntos === 1 && unSoloPeriodo.trazos === 0,
  JSON.stringify(unSoloPeriodo).slice(0, 90),
);
await pagina.locator('[data-testid="panel-linea"]').screenshot({ path: `${EVIDENCIAS}/evolucion-un-periodo.png` });

/* La otra pestaña temporal sigue usando el mismo estado sin romperse. */
await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await pagina.waitForTimeout(1200);
await pagina.getByRole('tab', { name: /Tiempo y entorno vial/i }).click();
await pagina.waitForSelector('[data-testid="panel-matriz"]', { timeout: 30_000 });
await pagina.waitForTimeout(900);
revisar(
  'la pestaña «Tiempo y entorno vial» sigue funcionando',
  (await pagina.locator('[data-testid="panel-serie"]').count()) === 1 &&
    (await pagina.locator('[data-testid="panel-matriz"]').count()) === 1,
);
await pagina.getByRole('button', { name: /^Territorio$/ }).click();
await pagina.waitForTimeout(900);

/* ------------------------------------------------- 7. Teclado */
await pagina.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await pagina.waitForTimeout(1500);
const lienzo = pagina.locator('.at-tl-lienzo');
await lienzo.focus();
const urlAntesTeclado = pagina.url();
await pagina.keyboard.press('ArrowRight');
await pagina.keyboard.press('ArrowRight');
await pagina.waitForTimeout(260);
revisar('las flechas recorren periodos sin filtrar', (await pagina.locator('[data-testid="tl-tooltip"]').count()) === 1 && pagina.url() === urlAntesTeclado);

const lectura = (await pagina.locator('.at-tl-sr').innerText()).trim();
revisar('hay lectura textual de las tres series', /hechos registrados .*personas lesionadas .*personas fallecidas/i.test(lectura), lectura.slice(0, 90));

await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(1600);
revisar('Enter acota el intervalo', new URL(pagina.url()).searchParams.get('at_desde') !== null, new URL(pagina.url()).searchParams.get('at_desde') ?? '');

await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(200);

/* ------------------------------------------------- 8. Móvil y movimiento */

const movil = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});
const paginaMovil = await movil.newPage();
await paginaMovil.goto(`${SITIO}/${RUTA}`, { waitUntil: 'domcontentloaded' });
await paginaMovil.waitForSelector('[data-testid="tl-paneles"]', { timeout: 45_000 });
await paginaMovil.waitForTimeout(1800);
const panelMovil = paginaMovil.locator('[data-testid="panel-linea"]');
await panelMovil.scrollIntoViewIfNeeded();
await paginaMovil.evaluate(() => window.scrollBy(0, -96));
await paginaMovil.waitForTimeout(500);

const desborde = await paginaMovil.evaluate(() => {
  const svg = document.querySelector('[data-testid="tl-paneles"] svg');
  const lienzo = document.querySelector('.at-tl-lienzo');
  return {
    svg: svg ? Math.round(svg.getBoundingClientRect().width) : null,
    lienzo: lienzo ? Math.round(lienzo.getBoundingClientRect().width) : null,
    documento: document.documentElement.scrollWidth,
    alto: lienzo ? Math.round(lienzo.getBoundingClientRect().height) : null,
  };
});
revisar(
  'en móvil los paneles caben y no desbordan',
  desborde.documento <= 390 && desborde.svg !== null && desborde.svg <= desborde.lienzo + 1,
  JSON.stringify(desborde),
);

const zona = await panelMovil.locator('[data-testid="tl-paneles"] .at-tl-panel').first().locator('svg').boundingBox();
await paginaMovil.mouse.move(zona.x + zona.width * 0.5, zona.y + zona.height * 0.5);
await paginaMovil.waitForTimeout(320);
const transicion = await paginaMovil
  .locator('[data-testid="tl-tooltip"]')
  .evaluate((nodo) => ({
    duracion: getComputedStyle(nodo).transitionDuration,
    reducido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }));
revisar(
  'con movimiento reducido no hay transición',
  transicion.reducido && Number.parseFloat(transicion.duracion) < 0.001,
  `${transicion.duracion} · reduce=${transicion.reducido}`,
);

await panelMovil.screenshot({ path: `${EVIDENCIAS}/evolucion-cantidades-movil.png` });
await paginaMovil.getByRole('button', { name: 'Comparar tendencias' }).click();
await paginaMovil.waitForTimeout(500);
await panelMovil.screenshot({ path: `${EVIDENCIAS}/evolucion-tendencias-movil.png` });

revisar('sin errores de consola en escritorio', errores.length === 0, errores.slice(0, 2).join(' | '));

await navegador.close();

const fallas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallas.length}/${resultados.length} comprobaciones correctas`);
console.log(`capturas en ${EVIDENCIAS}`);
process.exit(fallas.length === 0 ? 0 : 1);

