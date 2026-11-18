/**
 * Verificación de «Copiloto NL-to-SQL · indicadores económicos de México».
 *
 *   node tools/verificar-copiloto-nl-sql.mjs
 *
 * Comprueba API/SQLite, parser, las cuatro consultas sugeridas, ranking
 * completo, valores negativos, paneles separados, tooltips, teclado, tabla
 * móvil de 390 px y fallback local sin API.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'copiloto-nl-sql');
const URL = 'http://127.0.0.1:8000/dashboards/copiloto-nl-sql/index.html';
const API = 'http://127.0.0.1:8010/api/v1/copiloto-nl-sql';
const PREGUNTAS = {
  pib: '¿Cómo cambió el crecimiento del PIB entre 2019 y 2025?',
  inflacion: '¿En qué año fue mayor la inflación entre 2019 y 2025?',
  comparacion: 'Compara PIB e inflación durante 2020',
  desempleo: '¿Cómo evolucionó el desempleo de 2019 a 2025?'
};

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  await import(pathToFileURL(ruta).href);
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(SALIDA, { recursive: true });
const ok = [];
const fallos = [];
const errores = [];
const comprobar = (condicion, mensaje) => (condicion ? ok : fallos).push(mensaje);

const apiHealth = await fetch(`${API}/health`).then(async (r) => r.ok ? r.json() : null).catch(() => null);
const apiActiva = Boolean(apiHealth?.ok);
comprobar(apiActiva, 'la API local del copiloto responde');
if (apiActiva) {
  comprobar(apiHealth.observations === 21, 'el snapshot conserva 21 observaciones');
  comprobar(apiHealth.parser === 'lexico-plantillas', 'la API declara parser léxico, no semántico');
  comprobar(apiHealth.sqlite?.read_only === true, 'SQLite se declara de solo lectura');
  comprobar(apiHealth.llm?.configured === false, 'no hay modelo configurado');
  const serializado = JSON.stringify(apiHealth);
  comprobar(!/mongodb(?:\+srv)?:\/\//.test(serializado) && !/api[_-]?key/i.test(serializado), 'la salud no expone URI ni claves');
}

async function apiQuery(question) {
  return fetch(`${API}/query?question=${encodeURIComponent(question)}`).then(async (r) => ({
    ok: r.ok,
    status: r.status,
    body: await r.json()
  })).catch((error) => ({ ok: false, error }));
}

const apiPib = apiActiva ? await apiQuery(PREGUNTAS.pib) : null;
const apiInflacion = apiActiva ? await apiQuery(PREGUNTAS.inflacion) : null;
const apiComparacion = apiActiva ? await apiQuery(PREGUNTAS.comparacion) : null;
const apiNegativo = apiActiva ? await apiQuery('¿En qué año fue menor el crecimiento del PIB entre 2019 y 2025?') : null;
const apiInvalida = apiActiva ? await apiQuery('¿Cuál es la capital de Francia?') : null;
if (apiActiva) {
  comprobar(apiPib.ok && apiPib.body.row_count === 7 && apiPib.body.sql.includes('?'), 'la API devuelve la serie completa del PIB con placeholders');
  comprobar(apiPib.body.parameters.join('|') === 'MEX|NY.GDP.MKTP.KD.ZG|2019|2025', 'los parámetros SQL del PIB son los esperados');
  comprobar(!apiPib.body.sql.includes('¿') && !apiPib.body.sql.includes('PIB'), 'la pregunta libre no se incorpora al SQL');
  comprobar(apiInflacion.ok && apiInflacion.body.rows[0].year === 2022 && apiInflacion.body.rows[0].value > 7.8, 'el máximo de inflación es 2022');
  comprobar(apiInflacion.body.rows.length === 7 && !apiInflacion.body.sql.toUpperCase().includes('LIMIT'), 'el ranking recupera los siete años, no solo el ganador');
  comprobar(apiComparacion.ok && apiComparacion.body.spec.kind === 'comparison' && apiComparacion.body.row_count === 2, 'la comparación de 2020 conserva dos indicadores');
  comprobar(apiNegativo.ok && apiNegativo.body.rows[0].value < 0 && apiNegativo.body.spec.rank_order === 'ASC', 'el mínimo negativo del PIB se consulta con la serie completa');
  comprobar(apiInvalida.status === 422 && /No reconocí/.test(apiInvalida.body.detail), 'una pregunta sin indicador se rechaza');
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
const erroresPagina = [];
const respuestas = [];
pagina.on('pageerror', (e) => erroresPagina.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') erroresPagina.push(`consola: ${m.text()}`); });
pagina.on('response', (r) => { if (r.status() >= 400) respuestas.push(`${r.status()} ${r.url()}`); });

await pagina.goto(URL, { waitUntil: 'load' });
await pagina.waitForFunction(() => !/Comprobando/i.test(document.querySelector('#api-status')?.textContent || ''), null, { timeout: 10000 });
await pagina.waitForTimeout(500);

const base = await pagina.evaluate(() => ({
  title: document.title,
  scripts: [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')),
  cards: document.querySelectorAll('.metric-cards article').length,
  codes: [...document.querySelectorAll('.metric-cards strong')].map((n) => n.textContent.trim()),
  snapshot: document.querySelector('#snapshot-date')?.textContent.trim() || '',
  status: document.querySelector('#api-status')?.textContent.trim() || '',
  data: Boolean(window.__copilotoLastResult)
}));
comprobar(/Copiloto NL-to-SQL/.test(base.title), `título de la demo (${base.title})`);
comprobar(base.scripts.some((s) => s.includes('vendor/d3.min.js')) && !base.scripts.some((s) => /cdn|jsdelivr/i.test(s)), 'D3 se sirve localmente, sin CDN');
comprobar(base.cards === 3 && base.codes.includes('NY.GDP.MKTP.KD.ZG') && base.codes.includes('FP.CPI.TOTL.ZG') && base.codes.includes('SL.UEM.TOTL.ZS'), 'las tres fuentes y códigos WDI están visibles');
comprobar(/15 nov 2026/.test(base.snapshot), `la fecha de corte está visible (${base.snapshot})`);
if (apiActiva) comprobar(/SQLite/.test(base.status) && /sin modelo/.test(base.status), `la interfaz informa SQLite y ausencia de modelo (${base.status})`);
else comprobar(/API no disponible|snapshot local/i.test(base.status), 'la interfaz informa el fallback local');

async function consultar(question) {
  await pagina.locator('#question').fill(question);
  await pagina.locator('#run').click();
  await pagina.waitForFunction(
    () => {
      const modo = document.querySelector('#mode')?.textContent || '';
      return !/INTERPRETANDO|Comprobando/.test(modo) && !document.querySelector('#run')?.disabled;
    },
    null,
    { timeout: 20000 }
  );
  await pagina.waitForTimeout(200);
  return pagina.evaluate(() => ({
    mode: document.querySelector('#mode')?.textContent.trim() || '',
    summary: document.querySelector('#summary')?.textContent.trim() || '',
    rows: document.querySelectorAll('#table-wrap tbody tr').length,
    bars: document.querySelectorAll('#chart .rank-bar').length,
    circles: document.querySelectorAll('#chart circle').length,
    facets: document.querySelectorAll('#chart .facet-title').length,
    facetText: [...document.querySelectorAll('#chart .facet-title, #chart .facet-unit')].map((n) => n.textContent.trim()).join(' | '),
    valueLabel: document.querySelector('#chart .value-label')?.textContent.trim() || '',
    baseline: document.querySelectorAll('#chart .baseline').length,
    highlight: document.querySelectorAll('#table-wrap tbody tr.row-highlight').length,
    status: document.querySelector('#table-wrap .status-cell')?.textContent.trim() || '',
    sql: document.querySelector('#sql-code')?.textContent || '',
    params: document.querySelector('#sql-params')?.textContent || '',
    source: document.querySelector('#source-line')?.textContent || '',
    tooltip: document.querySelector('#chart .chart-tooltip')?.textContent || ''
  }));
}

const pib = await consultar(PREGUNTAS.pib);
comprobar(pib.rows === 7 && pib.circles === 7 && pib.baseline === 1, 'la tendencia del PIB muestra 7 puntos y referencia cero');
comprobar(/6\.00/.test(pib.valueLabel) && /2021/.test(pib.valueLabel), `la serie del PIB destaca el máximo de 2021 (${pib.valueLabel})`);
comprobar(/NY\.GDP\.MKTP\.KD\.ZG/.test(pib.source), 'la fuente y el código WDI acompañan al resultado');

const inflacion = await consultar(PREGUNTAS.inflacion);
comprobar(inflacion.rows === 7 && inflacion.bars === 7 && inflacion.highlight === 1, 'el ranking de inflación conserva 7 barras y resalta una');
comprobar(inflacion.status === 'Máximo' && /7\.90/.test(inflacion.summary), 'el máximo de inflación se etiqueta y se resume');
comprobar(/ORDER BY value DESC/.test(inflacion.sql) && !/LIMIT/i.test(inflacion.sql), 'el SQL del ranking no limita la serie');
comprobar(/"MEX"/.test(inflacion.params) && /"FP\.CPI\.TOTL\.ZG"/.test(inflacion.params), 'los parámetros del ranking están enlazados');

const comparacion = await consultar(PREGUNTAS.comparacion);
comprobar(comparacion.rows === 2 && comparacion.facets === 2 && comparacion.circles === 2, 'la comparación usa dos paneles separados de un punto cada uno');
comprobar(/Crecimiento del PIB real/.test(comparacion.facetText) && /Inflación al consumidor/.test(comparacion.facetText) && /% anual/.test(comparacion.facetText), 'los dos paneles declaran indicador y unidad propios');

const desempleo = await consultar(PREGUNTAS.desempleo);
comprobar(desempleo.rows === 7 && desempleo.circles === 7, 'la tendencia del desempleo conserva siete filas y puntos');
comprobar(/% fuerza laboral/.test(desempleo.summary) || /% fuerza laboral/.test(desempleo.source), 'el desempleo conserva su unidad de fuerza laboral');

/* Tooltip y teclado */
await pagina.locator('#chart circle').first().focus();
await pagina.waitForTimeout(150);
const tooltip = await pagina.evaluate(() => ({
  hidden: document.querySelector('#chart .chart-tooltip')?.hidden,
  text: document.querySelector('#chart .chart-tooltip')?.textContent.trim() || '',
  aria: document.activeElement?.getAttribute('aria-label') || ''
}));
comprobar(tooltip.hidden === false && /2019|2020|2021|2022|2023|2024|2025/.test(tooltip.text) && /WDI/.test(tooltip.text), `el tooltip de la serie declara periodo y fuente (${tooltip.text})`);
comprobar(/%/.test(tooltip.aria) && /WDI/.test(tooltip.aria), 'el punto tiene nombre accesible con unidad y fuente');
await pagina.locator('#tab-sql').focus();
await pagina.keyboard.press('ArrowRight');
const tabs = await pagina.evaluate(() => ({
  sqlHidden: document.querySelector('#sql-pane')?.hidden,
  pythonHidden: document.querySelector('#python-pane')?.hidden,
  selected: document.querySelector('#tab-python')?.getAttribute('aria-selected')
}));
comprobar(tabs.sqlHidden === true && tabs.pythonHidden === false && tabs.selected === 'true', 'las pestañas de código responden al teclado');
await pagina.keyboard.press('ArrowLeft');

/* Móvil: tabla apilada y sin desbordamiento de página */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await movil.goto(`${URL}?local=1`, { waitUntil: 'load' });
await movil.waitForTimeout(500);
await movil.locator('[data-q="¿En qué año fue mayor la inflación entre 2019 y 2025?"]').click();
await movil.waitForFunction(() => !/INTERPRETANDO/.test(document.querySelector('#mode')?.textContent || ''), null, { timeout: 10000 });
await movil.waitForTimeout(300);
const movilDatos = await movil.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - innerWidth,
  tableDisplay: getComputedStyle(document.querySelector('#table-wrap table')).display,
  rows: document.querySelectorAll('#table-wrap tbody tr').length,
  tableOverflow: document.querySelector('#table-wrap').scrollWidth - document.querySelector('#table-wrap').clientWidth,
  chart: Math.round(document.querySelector('#chart').getBoundingClientRect().width),
  panel: Math.round(document.querySelector('.result-panel').getBoundingClientRect().width)
}));
comprobar(movilDatos.overflow <= 0, `390px: sin desbordamiento de página (${movilDatos.overflow})`);
comprobar(movilDatos.rows === 7 && movilDatos.tableDisplay === 'block' && movilDatos.tableOverflow <= 0, '390px: la tabla apilada conserva las 7 filas sin scroll horizontal');
comprobar(movilDatos.chart <= movilDatos.panel, '390px: la gráfica cabe en su panel');
await movil.screenshot({ path: path.join(SALIDA, 'movil.png'), fullPage: true, animations: 'disabled' });

/* Fallback completo sin API */
const caida = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const erroresCaida = [];
caida.on('pageerror', (e) => erroresCaida.push(`JS: ${e.message}`));
await caida.goto(`${URL}?api=http://127.0.0.1:9`, { waitUntil: 'load' });
await caida.waitForSelector('#question');
await caida.waitForTimeout(800);
await caida.locator('[data-q="Compara PIB e inflación durante 2020"]').click();
await caida.waitForFunction(() => !/INTERPRETANDO/.test(document.querySelector('#mode')?.textContent || ''), null, { timeout: 10000 });
const caidaDatos = await caida.evaluate(() => ({
  status: document.querySelector('#api-status')?.textContent || '',
  mode: document.querySelector('#mode')?.textContent || '',
  rows: document.querySelectorAll('#table-wrap tbody tr').length,
  facets: document.querySelectorAll('#chart .facet-title').length,
  sql: document.querySelector('#sql-code')?.textContent || ''
}));
comprobar(/API no disponible/i.test(caidaDatos.status), 'si la API no responde, la interfaz lo declara');
comprobar(/MODO LOCAL/.test(caidaDatos.mode) && caidaDatos.rows === 2 && caidaDatos.facets === 2, 'el fallback local conserva la comparación y las filas');
comprobar(erroresCaida.length === 0, `la caída de API no produce errores de JavaScript (${erroresCaida.slice(0, 2).join(' | ')})`);

await pagina.screenshot({ path: path.join(SALIDA, 'escritorio.png'), fullPage: true, animations: 'disabled' });
await pagina.locator('.result-panel').screenshot({ path: path.join(SALIDA, 'resultado.png'), animations: 'disabled' });
await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores de consola:', erroresPagina.length ? erroresPagina : 'ninguno');
if (respuestas.length) console.log('respuestas 4xx/5xx:', respuestas);
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || erroresPagina.length || respuestas.length ? 1 : 0;
