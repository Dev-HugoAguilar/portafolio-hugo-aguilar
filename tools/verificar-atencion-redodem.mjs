/**
 * Verificación de «Atención y perfiles · detalle» (REDODEM).
 *
 *   node tools/verificar-atencion-redodem.mjs
 *
 * Comprueba las combinaciones de motivos, la matriz violencia × perpetrador con
 * umbral de privacidad, los rankings de menciones, la cobertura del campo por
 * año, las tablas accesibles, el teclado, el contraste y 390 px.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'vidas-en-transito');
const URL = 'http://127.0.0.1:8000/dashboards/vidas-en-transito/index.html';
const DATOS = await (await fetch('http://127.0.0.1:8000/dashboards/vidas-en-transito/data.json')).json();
const D = DATOS.redodem;
const M = D?.motif_combinations;
const VP = D?.violence_perpetrator;
const Y = D?.violence_coverage_by_year;
const nf = new Intl.NumberFormat('es-MX');

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
const comprobar = (c, m) => (c ? ok : fallos).push(m);
const num = (s) => Number(String(s).replace(/[^\d]/g, ''));

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
const respuestas = [];
pagina.on('response', (r) => { if (r.status() >= 400) respuestas.push(`${r.status()} ${r.url()}`); });

await pagina.goto(URL, { waitUntil: 'load' });
await pagina.waitForTimeout(1600);
await pagina.locator('[data-target="contexto"]').click();
await pagina.waitForSelector('#redodemMotifUpSet .atn-upset-row');

/* 1 · datos y reconciliación */
comprobar(M && M.records_with_value === 6338 && M.literal_na === 34462 && M.blank === 0, 'motivos: 6,338 con valor, 34,462 NA y 0 en blanco');
comprobar(M?.mentions_total === 7863 && M?.combination_count === 14 && M?.combinations?.length === 14, 'motivos: 7,863 menciones y 14 combinaciones observadas');
comprobar(M?.combinations?.reduce((a, c) => a + c.rows, 0) === 6338, 'las combinaciones suman 6,338 filas');
comprobar(M?.combinations?.reduce((a, c) => a + c.category_count, 0) === 29, 'las combinaciones contienen 29 pertenencias de categoría');
comprobar(M?.combinations?.[0]?.rows === 2720 && M?.combinations?.[0]?.key === 'Socioeconómicos' && M?.combinations?.[1]?.rows === 2049 && M?.combinations?.[2]?.rows === 1103, 'las tres combinaciones principales son 2,720, 2,049 y 1,103');
const catM = Object.fromEntries((M?.categories || []).map((x) => [x.category, x.mentions]));
comprobar(catM['Socioeconómicos'] === 4066 && catM['De violencias'] === 3325 && catM['Personales'] === 405 && catM['Ambientales'] === 67, 'las menciones por motivo son 4,066 / 3,325 / 405 / 67');

comprobar(VP && VP.privacy_threshold === 5 && VP.visible_cells === 38 && VP.suppressed_cells === 38 && VP.zero_pairs === 64, 'matriz: umbral 5, 38 celdas visibles, 38 suprimidas y 64 pares con 0');
comprobar(VP?.pair_rows_total === 950 && VP?.both_fields_rows === 469 && VP?.violence_only_rows === 30 && VP?.perpetrator_only_rows === 0 && VP?.neither_field_rows === 40301, 'matriz: 950 coapariciones en 469 filas; 30 solo violencias; 0 solo perpetradores; 40,301 sin ninguno');
comprobar(VP?.violence_na === 40301 && VP?.perpetrator_na === 40331, 'matriz: NA separados en violencias (40,301) y perpetradores (40,331)');
comprobar(VP?.cells?.length === 76 && VP.cells.filter((c) => c.status === 'visible').every((c) => Number(c.rows) >= 5) && VP.cells.filter((c) => c.status === 'suppressed').every((c) => c.rows === null && c.range === '1–4'), 'las celdas 1–4 no exportan la cifra exacta');
comprobar(VP?.cells?.[0]?.rows === 78 && VP?.cells?.[0]?.violence === 'Robo o asalto' && VP?.cells?.[0]?.perpetrator === 'Crimen organizado', 'la celda mayor es Robo o asalto × Crimen organizado: 78 filas');
comprobar(Y?.length === 2 && Y[0].year === '2023' && Y[0].total_rows === 22123 && Y[0].rows_with_value === 317 && Y[0].literal_na === 21806 && Y[0].blank === 0 && Y[1].year === '2024' && Y[1].total_rows === 18677 && Y[1].rows_with_value === 182 && Y[1].literal_na === 18495, 'cobertura anual: 317/22,123 en 2023 y 182/18,677 en 2024');
comprobar(D?.analysis_meta?.reconciliation?.total_rows === 40800 && D?.analysis_meta?.reconciliation?.cooccurrence_pair_rows === 950, 'analysis_meta conserva las reconciliaciones del ETL');

/* 2 · estructura y contexto */
const inicial = await pagina.evaluate(() => ({
  titulo: document.querySelector('#contexto h2')?.textContent.trim() || '',
  guia: document.querySelector('#contexto .atn-guide')?.textContent.replace(/\s+/g, ' ').trim() || '',
  contexto: [...document.querySelectorAll('#redodemContext .atn-context-item')].map((n) => n.innerText.replace(/\s+/g, ' ').trim()),
  anio: document.querySelector('#redodemYear')?.innerText.replace(/\s+/g, ' ').trim() || '',
  upsetRows: [...document.querySelectorAll('#redodemMotifUpSet .atn-upset-row')].map((n) => ({
    label: n.querySelector('.atn-upset-label')?.textContent.trim() || '',
    count: n.querySelector('.atn-upset-count')?.textContent.trim() || '',
    title: n.getAttribute('title') || '',
    dots: n.querySelectorAll('.atn-dot.is-on').length,
    selected: n.classList.contains('is-selected'),
  })),
  upsetNa: document.querySelector('#redodemMotifUpSet .atn-upset-na')?.innerText.replace(/\s+/g, ' ').trim() || '',
  upsetDetail: document.querySelector('#redodemMotifDetail')?.innerText.replace(/\s+/g, ' ').trim() || '',
  upsetTableRows: [...document.querySelectorAll('#redodemMotifUpSet .chart-table tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim())),
  heatCells: document.querySelectorAll('#redodemCooccurrence .atn-heat-cell').length,
  heatVisible: document.querySelectorAll('#redodemCooccurrence .atn-heat-cell.is-visible').length,
  heatSuppressed: document.querySelectorAll('#redodemCooccurrence .atn-heat-cell.is-suppressed').length,
  heatZero: document.querySelectorAll('#redodemCooccurrence .atn-heat-cell.is-zero').length,
  heatStatus: document.querySelector('#redodemCooccurrence .atn-matrix-status')?.innerText.replace(/\s+/g, ' ').trim() || '',
  heatDetail: document.querySelector('#redodemCooccurrenceDetail')?.innerText.replace(/\s+/g, ' ').trim() || '',
  heatTableRows: [...document.querySelectorAll('#redodemCooccurrence .chart-table tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim())),
  heatTableCaption: document.querySelector('#redodemCooccurrence .chart-table caption')?.textContent.replace(/\s+/g, ' ').trim() || '',
  heatScroll: (() => { const n = document.querySelector('#redodemCooccurrence .atn-heat-scroll'); return n ? { client: n.clientWidth, scroll: n.scrollWidth } : null; })(),
  rankViolence: [...document.querySelectorAll('#redodemViolenceRanking .atn-dotplot-row')].map((n) => ({ label: n.querySelector('.atn-dotplot-label')?.textContent.trim() || '', value: n.querySelector('.atn-dotplot-value')?.textContent.trim() || '', title: n.getAttribute('title') || '' })),
  rankPerps: [...document.querySelectorAll('#redodemPerpetratorRanking .atn-dotplot-row')].map((n) => ({ label: n.querySelector('.atn-dotplot-label')?.textContent.trim() || '', value: n.querySelector('.atn-dotplot-value')?.textContent.trim() || '', title: n.getAttribute('title') || '' })),
  rankViolenceTable: document.querySelectorAll('#redodemViolenceRanking .chart-table tbody tr').length,
  rankPerpsTable: document.querySelectorAll('#redodemPerpetratorRanking .chart-table tbody tr').length,
  yearPoints: [...document.querySelectorAll('#redodemYearCoverage [data-year]')].map((n) => ({ year: n.dataset.year, title: n.getAttribute('aria-label') || '' })),
  yearDetail: document.querySelector('#redodemYearDetail')?.innerText.replace(/\s+/g, ' ').trim() || '',
  yearRows: document.querySelectorAll('#redodemYearCoverage .chart-table tbody tr').length,
  warning: document.querySelector('#contexto .atn-warning')?.textContent.replace(/\s+/g, ' ').trim() || '',
  tables: document.querySelectorAll('#contexto .chart-table').length,
  overflows: [...document.querySelectorAll('#contexto .atn-upset-row, #contexto .atn-heat-cell')].filter((n) => n.scrollWidth > n.clientWidth + 1).length,
}));

comprobar(inicial.titulo === 'Qué motivos, violencias y actores aparecen en las fichas', `título editorial correcto (${inicial.titulo})`);
comprobar(/una ficha puede aportar varias categorías/.test(inicial.guia) && /NA/.test(inicial.guia) && /No especificado/.test(inicial.guia), 'la guía compartida separa menciones, NA y No especificado');
comprobar(inicial.contexto.length === 4 && /40,800/.test(inicial.contexto[0]) && /6,338/.test(inicial.contexto[1]) && /499/.test(inicial.contexto[2]) && /469/.test(inicial.contexto[3]), 'el contexto muestra archivo, motivos, violencias y perpetradores');
comprobar(/2023/.test(inicial.anio) && /2024/.test(inicial.anio), 'el contexto conserva los dos años del archivo');

/* 3 · UpSet */
comprobar(inicial.upsetRows.length === 14 && inicial.upsetRows[0].label === 'Socioeconómicos' && num(inicial.upsetRows[0].count) === 2720 && inicial.upsetRows[0].selected, 'el UpSet dibuja las 14 combinaciones y selecciona la principal');
comprobar(inicial.upsetRows.reduce((a, r) => a + r.dots, 0) === 29, 'los puntos del UpSet suman 29 pertenencias de categoría');
comprobar(/34,462 filas con NA/.test(inicial.upsetNa) && /No son un motivo/.test(inicial.upsetNa), 'el NA de motivos se separa del UpSet');
comprobar(/2,720 filas/.test(inicial.upsetDetail) && /6,338 filas con motivos/.test(inicial.upsetDetail) && /Fuente REDODEM/.test(inicial.upsetDetail), 'el detalle del UpSet declara filas, denominador y fuente');
comprobar(inicial.upsetTableRows.length === 15 && inicial.upsetTableRows.reduce((a, r) => a + num(r[1]), 0) === 40800, 'la tabla del UpSet conserva las 14 combinaciones y el NA (40,800 filas)');
comprobar(inicial.upsetTableRows[0][0] === 'Socioeconómicos' && num(inicial.upsetTableRows[0][1]) === 2720, 'la tabla del UpSet coincide con la primera combinación');
comprobar(inicial.upsetRows.every((r) => /Fuente REDODEM/.test(r.title) && /filas de atención/.test(r.title) && /no son personas únicas/.test(r.title)), 'cada tooltip del UpSet declara fuente, unidad y límite');

/* 4 · matriz */
comprobar(inicial.heatCells === 140 && inicial.heatVisible === 38 && inicial.heatSuppressed === 38 && inicial.heatZero === 64, 'la matriz dibuja 140 cruces: 38 visibles, 38 suprimidos y 64 ceros');
comprobar(/469 filas con ambos campos/.test(inicial.heatStatus) && /30 solo violencias/.test(inicial.heatStatus) && /0 solo perpetradores/.test(inicial.heatStatus) && /40,301 sin valor en ninguno/.test(inicial.heatStatus), 'la matriz separa los estados sin valor y los campos parciales');
comprobar(/78 filas/.test(inicial.heatDetail) && /469 filas con ambos campos/.test(inicial.heatDetail) && /Fuente REDODEM/.test(inicial.heatDetail) && /no demuestra causalidad/.test(inicial.heatDetail), 'el detalle de la matriz declara valor, denominador, fuente y límite');
comprobar(inicial.heatTableRows.length === 76 && inicial.heatTableRows.filter((r) => /suprimido/i.test(r[3])).length === 38, 'la tabla de la matriz conserva 76 cruces y 38 celdas suprimidas');
comprobar(!inicial.heatTableRows.some((r) => /^[1-4]$/.test(r[2])) && inicial.heatTableRows.every((r) => r[3] === 'Cifra publicada' || r[2] === '1–4 (suprimido)'), 'la tabla no publica cifras exactas de celdas 1–4');
comprobar(/umbral de privacidad 5/i.test(inicial.heatTableCaption) && /Fuente REDODEM/.test(inicial.heatTableCaption) && /no demuestra causalidad/.test(inicial.heatTableCaption), 'la tabla de la matriz documenta el umbral, la fuente y el límite');
comprobar(inicial.heatScroll && inicial.heatScroll.scroll <= inicial.heatScroll.client + 1, `la matriz cabe en su contenedor (${inicial.heatScroll?.scroll}/${inicial.heatScroll?.client})`);

/* 5 · rankings */
comprobar(inicial.rankViolence.length === 14 && inicial.rankPerps.length === 10, 'los rankings conservan 14 violencias y 10 perpetradores');
comprobar(inicial.rankViolence[0].label === 'Robo o asalto' && num(inicial.rankViolence[0].value) === 228 && num(inicial.rankViolence[1].value) === 151 && num(inicial.rankPerps[0].value) === 128 && num(inicial.rankPerps[1].value) === 112, 'los rankings empiezan por Robo o asalto 228 y Crimen organizado 128');
comprobar(inicial.rankViolenceTable === 14 && inicial.rankPerpsTable === 10, 'cada ranking tiene su tabla accesible completa');
comprobar(inicial.rankViolence.every((r) => /499 filas/.test(r.title) && /Fuente REDODEM/.test(r.title) && /no es prevalencia/.test(r.title)) && inicial.rankPerps.every((r) => /469 filas/.test(r.title) && /Fuente REDODEM/.test(r.title) && /no es prevalencia/.test(r.title)), 'los tooltips de los rankings declaran denominador, fuente y límite');
comprobar(inicial.rankPerps.some((r) => r.label === 'No especificado' && num(r.value) === 7), '«No especificado» se conserva como categoría explícita con 7 menciones');

/* 6 · cobertura anual */
comprobar(inicial.yearPoints.length === 2 && inicial.yearPoints.some((p) => p.year === '2023') && inicial.yearPoints.some((p) => p.year === '2024'), 'la cobertura anual dibuja 2023 y 2024');
comprobar(/317 de 22,123/.test(inicial.yearDetail) && /1,43 %/.test(inicial.yearDetail) && /21,806 con NA/.test(inicial.yearDetail) && /Fuente REDODEM/.test(inicial.yearDetail), 'el detalle de 2023 conserva numerador, denominador, NA y fuente');
comprobar(/describe qué proporción de fichas contiene un valor en este campo/.test(inicial.warning) && /no mide la prevalencia ni la evolución de la violencia/.test(inicial.warning), 'la advertencia metodológica exacta está visible');
comprobar(inicial.yearRows === 2, 'la tabla de cobertura anual conserva dos años');
comprobar(inicial.tables >= 6 && inicial.overflows === 0, `cada gráfica tiene tabla y ningún control desborda (${inicial.tables} tablas)`);

/* 7 · selección y teclado */
await pagina.locator('#redodemCooccurrence .atn-heat-cell.is-suppressed').first().click();
await pagina.waitForTimeout(150);
const suprimida = await pagina.evaluate(() => ({
  detail: document.querySelector('#redodemCooccurrenceDetail')?.innerText.replace(/\s+/g, ' ').trim() || '',
  selected: document.querySelector('#redodemCooccurrenceDetail .atn-selection-value')?.textContent.trim() || '',
}));
comprobar(suprimida.selected === '1–4 filas' && /se suprime por el umbral de privacidad 5/.test(suprimida.detail), 'al seleccionar una celda suprimida no se revela la cifra exacta');
await pagina.locator('#redodemMotifUpSet .atn-upset-row').nth(2).click();
await pagina.waitForTimeout(150);
const tercerUpSet = await pagina.evaluate(() => document.querySelector('#redodemMotifDetail')?.innerText.replace(/\s+/g, ' ').trim() || '');
comprobar(/Socioeconómicos \+ De violencias/.test(tercerUpSet) && /1,103 filas/.test(tercerUpSet), 'seleccionar una combinación actualiza su detalle agregado');

await pagina.locator('#redodemYear .chart-table summary').focus();
await pagina.keyboard.press('Tab');
const focoUpSet = await pagina.evaluate(() => {
  const n = document.activeElement;
  return { tag: n.tagName, label: n.getAttribute('aria-label') || n.textContent.trim(), outline: getComputedStyle(n).outline, visible: n.matches(':focus-visible') };
});
comprobar(focoUpSet.tag === 'BUTTON' && /Socioeconómicos/.test(focoUpSet.label) && /solid/.test(focoUpSet.outline) && focoUpSet.visible, `el teclado entra al UpSet con foco visible (${focoUpSet.outline})`);
await pagina.locator('#redodemYearCoverage [data-year="2024"]').focus();
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(150);
const tecladoAnio = await pagina.evaluate(() => document.querySelector('#redodemYearDetail')?.innerText.replace(/\s+/g, ' ').trim() || '');
comprobar(/182 de 18,677/.test(tecladoAnio) && /0,97 %/.test(tecladoAnio), 'Enter sobre el punto de 2024 actualiza la lectura anual');

await pagina.locator('#contexto').screenshot({ path: path.join(SALIDA, 'atencion-perfiles-escritorio.png'), animations: 'disabled' });
await pagina.locator('#redodemCooccurrence').screenshot({ path: path.join(SALIDA, 'atencion-matriz-escritorio.png'), animations: 'disabled' });

/* 8 · móvil y contraste */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`390 JS: ${e.message}`));
movil.on('console', (m) => { if (m.type() === 'error') errores.push(`390 consola: ${m.text()}`); });
await movil.goto(URL, { waitUntil: 'load' });
await movil.waitForTimeout(1500);
await movil.locator('[data-target="contexto"]').click();
await movil.waitForSelector('#redodemMotifUpSet .atn-upset-row');
const movilDatos = await movil.evaluate(() => {
  const lum = (rgb) => {
    const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    return .2126 * f(rgb[0]) + .7152 * f(rgb[1]) + .0722 * f(rgb[2]);
  };
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const composite = (fg) => { const [r, g, b, a = 1] = parse(fg); return [r * a + 255 * (1 - a), g * a + 255 * (1 - a), b * a + 255 * (1 - a)]; };
  const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
  const cells = [...document.querySelectorAll('#redodemCooccurrence .atn-heat-cell.is-visible')];
  const ratios = cells.map((n) => { const s = getComputedStyle(n); return contrast(composite(s.backgroundColor), parse(s.color).slice(0, 3)); });
  const heat = document.querySelector('#redodemCooccurrence .atn-heat-scroll');
  const ctx = document.querySelector('#redodemContext .atn-context-grid');
  return {
    desborde: document.documentElement.scrollWidth - innerWidth,
    ancho: Math.round(document.querySelector('#contexto').getBoundingClientRect().width),
    viewport: innerWidth,
    contextoColumnas: getComputedStyle(ctx).gridTemplateColumns.split(' ').length,
    upsetRows: document.querySelectorAll('#redodemMotifUpSet .atn-upset-row').length,
    heatClient: heat.clientWidth,
    heatScroll: heat.scrollWidth,
    yearWidth: Math.round(document.querySelector('#redodemYearCoverage .atn-year-svg').getBoundingClientRect().width),
    minContrast: +Math.min(...ratios).toFixed(2),
    tables: document.querySelectorAll('#contexto .chart-table').length,
  };
});
comprobar(movilDatos.desborde <= 0, `390px: sin desbordamiento de página (${movilDatos.desborde})`);
comprobar(movilDatos.ancho <= movilDatos.viewport, `390px: la sección cabe en el ancho (${movilDatos.ancho} ≤ ${movilDatos.viewport})`);
comprobar(movilDatos.contextoColumnas === 2 && movilDatos.upsetRows === 14, '390px: contexto en dos columnas y 14 combinaciones');
comprobar(movilDatos.heatScroll <= movilDatos.heatClient + 1, `390px: la matriz cabe sin recorte horizontal (${movilDatos.heatScroll}/${movilDatos.heatClient})`);
comprobar(movilDatos.yearWidth <= movilDatos.ancho, '390px: el gráfico anual cabe en su tarjeta');
comprobar(movilDatos.minContrast >= 4.5, `390px: las celdas visibles cumplen contraste AA (${movilDatos.minContrast}:1)`);
comprobar(movilDatos.tables >= 6, `390px: las tablas accesibles se conservan (${movilDatos.tables})`);
await movil.locator('#contexto').screenshot({ path: path.join(SALIDA, 'atencion-perfiles-movil.png'), animations: 'disabled' });
await movil.locator('#redodemCooccurrence').screenshot({ path: path.join(SALIDA, 'atencion-matriz-movil.png'), animations: 'disabled' });
await movil.locator('#redodemYearCoverage').screenshot({ path: path.join(SALIDA, 'atencion-anio-movil.png'), animations: 'disabled' });
await movil.close();

comprobar(respuestas.length === 0, `sin respuestas 4xx/5xx (${respuestas.slice(0, 3).join(' · ') || 'ninguna'})`);
await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores de consola:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;
