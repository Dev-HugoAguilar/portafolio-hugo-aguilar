/**
 * Verificación del explorador EAAF de «Vidas en tránsito».
 *
 *   node tools/verificar-eaaf-vidas.mjs
 *
 * Comprueba el grano normalizado de `eaaf_public_detail`, los totales
 * reconciliados, las unidades separadas, el recorrido agregado → banco →
 * México* → entidad, la serie anual, el país de hallazgo, el corte 2026 sin
 * desglose, la tabla accesible, el respaldo embebido y el ancho móvil.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'vidas-en-transito');
const URL = 'http://127.0.0.1:8000/dashboards/vidas-en-transito/index.html';
const DATOS = await (await fetch('http://127.0.0.1:8000/dashboards/vidas-en-transito/data.json')).json();
const D = DATOS.eaaf_public_detail;

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
await pagina.waitForTimeout(1800);
await pagina.locator('[data-target="desapariciones"]').click();
await pagina.waitForSelector('#eaafExplorer .eaaf-metrics button');

/* 1 · contrato de datos */
comprobar(D && D.schema_version === '1.0.0' && D.cutoff_date === '2025-02-28', 'eaaf_public_detail declara esquema 1.0.0 y corte 28-feb-2025');
comprobar(D?.period_start === '2010' && D?.period_end === '2025' && /una observación por indicador × corte × dimensión de desglose × categoría publicada/.test(D?.grain || ''), 'el periodo y el grano son los publicados');
comprobar(D?.records?.length === 160, `el detalle conserva 160 observaciones (${D?.records?.length})`);
comprobar(D?.review_status === 'transcrito del PDF oficial; pendiente segunda revisión humana', 'se conserva la segunda revisión humana pendiente');

const totales = Object.fromEntries((D?.records || []).filter((r) => r.breakdown_dimension === 'total').map((r) => [r.metric_key, r]));
comprobar(totales.mnl_cases?.value === 2351 && totales.families?.value === 2240 && totales.dna_donors?.value === 6000 && totales.identifications?.value === 406, 'los cuatro totales son 2,351 casos, 2,240 familias, 6,000 donantes y 406 identificaciones');
comprobar(totales.mnl_cases?.unit === 'casos' && totales.families?.unit === 'familias' && totales.dna_donors?.unit === 'donantes' && totales.identifications?.unit === 'identificaciones', 'cada indicador conserva su unidad');
comprobar(Object.values(totales).every((r) => r.operator === '=' && r.cutoff_date === '2025-02-28'), 'los totales son exactos y del corte detallado');

const rec = D?.reconciliation || {};
comprobar(rec.cases_by_bank === 2351 && rec.families_by_bank === 2240 && rec.donors_by_bank === 6000 && rec.cases_by_year === 2351 && rec.donors_by_year === 6000 && rec.identifications_by_year === 406 && rec.identifications_by_bank === 406 && rec.identifications_by_place_found === 406, 'los desgloses reconcilian con sus totales impresos');
comprobar(rec.mexico_cases_by_state === 578 && rec.mexico_families_by_state === 529 && rec.mexico_donors_by_state === 1448, 'México* reconcilia por entidad: 578 casos, 529 familias y 1,448 donantes');

const c = (metric, dim) => (D?.records || []).filter((r) => r.metric_key === metric && r.breakdown_dimension === dim);
comprobar(c('mnl_cases', 'banco_mecanismo').length === 11 && c('families', 'banco_mecanismo').length === 11 && c('dna_donors', 'banco_mecanismo').length === 11 && c('identifications', 'banco_mecanismo').length === 7, 'los bancos/mecanismos publicados son 11 y las identificaciones por banco son 7');
comprobar(c('mnl_cases', 'year').length === 16 && c('dna_donors', 'year').length === 16 && c('identifications', 'year').length === 15, 'las series anuales son 2010–2025 para casos/donantes y 2011–2025 para identificaciones');
comprobar(c('mnl_cases', 'state_mexico').length === 22 && c('families', 'state_mexico').length === 22 && c('dna_donors', 'state_mexico').length === 22, 'México* publica 22 entidades por indicador');
comprobar(c('identifications', 'place_found_country').length === 3, 'las identificaciones publican tres países de hallazgo');
comprobar(c('mnl_cases', 'state_mexico').reduce((a, r) => a + r.value, 0) === 578 && c('families', 'state_mexico').reduce((a, r) => a + r.value, 0) === 529 && c('dna_donors', 'state_mexico').reduce((a, r) => a + r.value, 0) === 1448, 'las entidades suman el subtotal México* sin imputar ausentes');
comprobar(new Set((D?.records || []).map((r) => r.breakdown_dimension)).size === 5 && !(D?.records || []).some((r) => /edad|sexo|nacionalidad/.test(r.breakdown_dimension)), 'no se añaden dimensiones de edad, sexo ni nacionalidad');

const ag = DATOS?.missing_search_aggregates || [];
comprobar(ag.length === 5, `el Panorama conserva cinco indicadores EAAF (${ag.length})`);
comprobar(ag.some((r) => r.cutoff_date === '2026-08-14' && r.concept === 'casos_migrantes_desaparecidos' && r.operator === '>' && r.value === '2500') && ag.some((r) => r.cutoff_date === '2026-08-14' && r.concept === 'personas_identificadas' && r.operator === '>' && r.value === '490'), '2026 conserva >2,500 casos y >490 identificaciones como agregados separados');
comprobar(!ag.some((r) => r.cutoff_date === '2025-02-28' && r.concept === 'personas_identificadas'), 'el total de 406 no se duplica en missing_search_aggregates');
comprobar(/Año de toma\/registro/.test(D?.dimension_notes?.year || '') && /no es fecha de desaparición/.test(D?.dimension_notes?.year || ''), 'las notas aclaran que el año es el evento que titula la serie');

/* 2 · estado inicial: agregado → banco */
const leer = async () => pagina.evaluate(() => ({
  cards: [...document.querySelectorAll('#eaafExplorer .eaaf-metrics button')].map((n) => ({
    label: n.querySelector('small')?.textContent.trim() || '',
    value: n.querySelector('strong')?.textContent.trim() || '',
    unit: n.querySelector('span')?.textContent.trim() || '',
    active: n.classList.contains('active'),
  })),
  tabs: [...document.querySelectorAll('#eaafExplorer .eaaf-dimensions button')].map((n) => n.textContent.trim()),
  bars: [...document.querySelectorAll('#eaafExplorer .eaaf-bar-row')].map((n) => ({
    label: n.querySelector('.eaaf-bar-label')?.textContent.trim() || '',
    value: n.querySelector('.eaaf-bar-value')?.textContent.replace(/\s+/g, ' ').trim() || '',
    aria: n.getAttribute('aria-label') || '',
    selected: n.classList.contains('selected'),
  })),
  detail: document.querySelector('#eaafExplorer .eaaf-selected-detail')?.innerText.replace(/\s+/g, ' ').trim() || '',
  table: [...document.querySelectorAll('#eaafExplorer .chart-table tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim())),
  caption: document.querySelector('#eaafExplorer .chart-table caption')?.textContent.replace(/\s+/g, ' ').trim() || '',
  empty: document.querySelector('#eaafExplorer .eaaf-empty')?.textContent.replace(/\s+/g, ' ').trim() || '',
  note: document.querySelector('#eaafExplorer .eaaf-snapshot-note')?.textContent.replace(/\s+/g, ' ').trim() || '',
  source: document.querySelector('#eaafExplorer .eaaf-source-line')?.innerText.replace(/\s+/g, ' ').trim() || '',
  overflow: document.documentElement.scrollWidth - window.innerWidth,
}));

const inicial = await leer();
comprobar(inicial.cards.length === 4 && inicial.cards.every((x) => /corte detallado/.test(x.unit)), '2025 abre cuatro indicadores con corte detallado');
comprobar(inicial.cards[0].value === '2,351' && /casos/.test(inicial.cards[0].unit) && inicial.cards[1].value === '2,240' && /familias/.test(inicial.cards[1].unit) && inicial.cards[2].value === '6,000' && /donantes/.test(inicial.cards[2].unit) && inicial.cards[3].value === '406' && /identificaciones/.test(inicial.cards[3].unit), 'las cuatro cifras muestran valor y unidad correctos');
comprobar(inicial.tabs.join('|') === 'Banco o mecanismo|Año de toma/registro', `el desglose inicial ofrece banco y año (${inicial.tabs.join(' · ')})`);
comprobar(inicial.bars.length === 11 && inicial.bars[0].label === 'Honduras' && num(inicial.bars[0].value) === 814 && /casos/.test(inicial.bars[0].value), 'las barras de casos por banco empiezan en Honduras 814 casos');
comprobar(inicial.table.length === 11 && inicial.table[0][0] === inicial.bars[0].label && num(inicial.table[0][1]) === num(inicial.bars[0].value), 'la tabla accesible coincide con la primera barra');
comprobar(/unidad casos/.test(inicial.caption) && /corte 2025-02-28/.test(inicial.caption), 'la tabla declara unidad y corte');
comprobar(/Esta cifra es un desglose del agregado publicado/.test(inicial.detail) && /no identifica personas/.test(inicial.detail), 'la selección aclara que no identifica personas');
comprobar(/Unidad preservada: casos/.test(inicial.source) && /2025-02-28/.test(inicial.source) && /revisión humana/.test(inicial.source), 'la fuente conserva la unidad, el corte y la revisión pendiente');

/* 3 · México* → entidad */
await pagina.locator('#eaafExplorer [data-eaaf-category="México*"]').click();
await pagina.waitForTimeout(250);
const mexico = await leer();
comprobar(mexico.tabs.includes('Entidad de México*'), 'al seleccionar México* aparece el nivel por entidad');
comprobar(mexico.bars.find((b) => b.label === 'México*')?.selected === true, 'México* queda seleccionado en el banco');
const abrirEntidad = pagina.locator('#eaafExplorer [data-eaaf-child]');
comprobar(await abrirEntidad.count() === 1 && /Abrir el desglose de México\* por entidad/.test(await abrirEntidad.innerText()), 'se ofrece abrir el desglose de México* por entidad');
await abrirEntidad.click();
await pagina.waitForTimeout(250);
const estados = await leer();
comprobar(estados.bars.length === 22 && estados.table.length === 22, `México* abre 22 entidades en barras y tabla (${estados.bars.length})`);
comprobar(estados.bars[0].label === 'Tamaulipas' && num(estados.bars[0].value) === 255, 'las entidades se ordenan por valor y empiezan en Tamaulipas 255');
comprobar(/México\* es el subtotal de este nivel: 578 casos/.test(estados.detail) && /no se imputan a cero/.test(estados.detail), 'el detalle declara el subtotal 578 y la ausencia de imputación');
comprobar(estados.tabs.join('|') === 'Banco o mecanismo|Año de toma/registro|Entidad de México*', 'se puede volver al banco o al año desde el nivel estatal');
comprobar(estados.bars.reduce((a, b) => a + num(b.value), 0) === 578, 'las 22 entidades suman 578 casos publicados');
comprobar(estados.table[0][0] === 'Tamaulipas' && num(estados.table[0][1]) === 255 && estados.table[0][4] === '2025-02-28', 'la tabla del nivel estatal conserva categoría, valor y corte');

/* 4 · familias e identificaciones */
await pagina.locator('#eaafExplorer [data-eaaf-metric="families"]').click();
await pagina.waitForTimeout(250);
const familias = await leer();
comprobar(familias.cards.length === 4 && familias.cards.find((x) => x.active)?.value === '2,240' && /familias/.test(familias.cards.find((x) => x.active)?.unit || ''), 'familias conserva su propio total y unidad');
comprobar(familias.tabs.length === 1 && familias.tabs[0] === 'Banco o mecanismo' && familias.bars.length === 11, 'familias solo abre el desglose por banco/mecanismo');
comprobar(familias.bars.find((b) => b.label === 'México*') !== undefined, 'familias conserva la categoría México*');

await pagina.locator('#eaafExplorer [data-eaaf-metric="identifications"]').click();
await pagina.waitForTimeout(250);
const ids = await leer();
comprobar(ids.cards.find((x) => x.active)?.value === '406' && /identificaciones/.test(ids.cards.find((x) => x.active)?.unit || ''), 'identificaciones conserva su total y unidad');
comprobar(ids.tabs.join('|') === 'Banco o mecanismo|Año de identificación|País de hallazgo', `identificaciones abre banco, año y país de hallazgo (${ids.tabs.join(' · ')})`);
comprobar(ids.bars.length === 7 && ids.bars[0].label === 'México*' && num(ids.bars[0].value) === 118 && ids.bars[1].label === 'Honduras' && num(ids.bars[1].value) === 85, 'el desglose por banco de identificaciones ordena México* 118 y Honduras 85');

await pagina.locator('#eaafExplorer [data-eaaf-dimension="year"]').click();
await pagina.waitForTimeout(250);
const idsAnio = await leer();
comprobar(idsAnio.bars.length === 15 && idsAnio.bars[0].label === '2011' && idsAnio.bars[14].label === '2025', 'la serie de identificaciones va de 2011 a 2025 en orden');
comprobar(idsAnio.bars.reduce((a, b) => a + num(b.value), 0) === 406, 'la serie anual de identificaciones suma 406');
comprobar(/Año de identificación/.test(idsAnio.caption) || /año de identificación/i.test(idsAnio.caption), 'la tabla declara el año de identificación');

await pagina.locator('#eaafExplorer [data-eaaf-dimension="place_found_country"]').click();
await pagina.waitForTimeout(250);
const idsPais = await leer();
comprobar(idsPais.bars.length === 3 && idsPais.bars.map((b) => b.label).join('|') === 'Estados Unidos|México|Guatemala', 'el país de hallazgo conserva Estados Unidos, México y Guatemala');
comprobar(idsPais.bars.reduce((a, b) => a + num(b.value), 0) === 406, 'el país de hallazgo suma 406 identificaciones');

/* 5 · 2026 sin desglose */
await pagina.locator('#eaafExplorer [data-eaaf-snapshot="2026-08-14"]').click();
await pagina.waitForTimeout(250);
const dosMil = await leer();
comprobar(dosMil.cards.length === 2 && dosMil.cards[0].value === '>2,500' && /casos/.test(dosMil.cards[0].unit) && dosMil.cards[1].value === '>490' && /identificaciones/.test(dosMil.cards[1].unit), '2026 muestra >2,500 casos y >490 identificaciones');
comprobar(dosMil.tabs.length === 0 && dosMil.bars.length === 0 && dosMil.table.length === 0, '2026 no ofrece desglose comparable');
comprobar(/solo agregados generales, sin desglose comparable/.test(dosMil.empty) && /no se replica el desglose de 2025/.test(dosMil.empty), '2026 explica la ausencia de desglose');
comprobar(/>2,500/.test(dosMil.note) && />490/.test(dosMil.note), 'la nota de 2026 conserva los operadores >');
comprobar(/agregados del comunicado; pendiente segunda revisión humana/.test(dosMil.source), '2026 declara su propia revisión pendiente');

await pagina.locator('#eaafExplorer [data-eaaf-snapshot="2025-02-28"]').click();
await pagina.waitForTimeout(250);
const volver = await leer();
comprobar(volver.cards.length === 4 && volver.bars.length === 11, 'se puede volver al corte detallado de 2025');

/* 6 · teclado y foco visible */
await pagina.locator('[data-target="metodo"]').focus();
await pagina.keyboard.press('Tab');
const foco = await pagina.evaluate(() => {
  const n = document.activeElement;
  return { texto: (n.textContent || '').trim(), outline: getComputedStyle(n).outline, visible: n.matches(':focus-visible') };
});
comprobar(foco.visible && /Reporte detallado/.test(foco.texto) && /solid/.test(foco.outline) && /3px/.test(foco.outline), `el teclado entra al explorador con foco visible (${foco.outline})`);
await pagina.keyboard.press('Tab');
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(250);
const teclado2026 = await leer();
comprobar(teclado2026.cards.length === 2 && teclado2026.tabs.length === 0 && teclado2026.bars.length === 0, 'Enter sobre el corte 2026 lo activa sin ratón');

/* 7 · evidencia y móvil */
await pagina.locator('#eaafExplorer [data-eaaf-snapshot="2025-02-28"]').click();
await pagina.waitForTimeout(200);
await pagina.locator('#desapariciones').screenshot({ path: path.join(SALIDA, 'eaaf-explorer-escritorio.png'), animations: 'disabled' });
await pagina.locator('#eaafExplorer [data-eaaf-snapshot="2026-08-14"]').click();
await pagina.waitForTimeout(200);
await pagina.locator('#desapariciones').screenshot({ path: path.join(SALIDA, 'eaaf-explorer-2026.png'), animations: 'disabled' });

const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`390 JS: ${e.message}`));
movil.on('console', (m) => { if (m.type() === 'error') errores.push(`390 consola: ${m.text()}`); });
await movil.goto(URL, { waitUntil: 'load' });
await movil.waitForTimeout(1600);
await movil.locator('[data-target="desapariciones"]').click();
await movil.waitForSelector('#eaafExplorer .eaaf-metrics button');
const movilDatos = await movil.evaluate(() => ({
  desborde: document.documentElement.scrollWidth - window.innerWidth,
  ancho: Math.round(document.querySelector('#eaafExplorer').getBoundingClientRect().width),
  viewport: window.innerWidth,
  tarjetas: document.querySelectorAll('#eaafExplorer .eaaf-metrics button').length,
  columnas: getComputedStyle(document.querySelector('#eaafExplorer .eaaf-metrics')).gridTemplateColumns.split(' ').length,
  barras: document.querySelectorAll('#eaafExplorer .eaaf-bar-row').length,
  tabla: document.querySelectorAll('#eaafExplorer .chart-table tbody tr').length,
}));
comprobar(movilDatos.desborde <= 0, `390px: sin desbordamiento de página (${movilDatos.desborde})`);
comprobar(movilDatos.ancho <= movilDatos.viewport, `390px: el explorador cabe en el ancho (${movilDatos.ancho} ≤ ${movilDatos.viewport})`);
comprobar(movilDatos.tarjetas === 4 && movilDatos.columnas === 2, `390px: cuatro indicadores en dos columnas (${movilDatos.columnas})`);
comprobar(movilDatos.barras === 11 && movilDatos.tabla === 11, '390px: barras y tabla conservan las 11 categorías');
await movil.locator('#eaafExplorer [data-eaaf-category="México*"]').click();
await movil.waitForTimeout(200);
const movilEstado = await movil.evaluate(() => ({
  desborde: document.documentElement.scrollWidth - window.innerWidth,
  barras: document.querySelectorAll('#eaafExplorer .eaaf-bar-row').length,
  child: Boolean(document.querySelector('#eaafExplorer [data-eaaf-child]')),
}));
comprobar(movilEstado.desborde <= 0 && movilEstado.barras === 11 && movilEstado.child, '390px: México* ofrece el siguiente nivel sin desbordar');
await movil.locator('#eaafExplorer [data-eaaf-child]').click();
await movil.waitForTimeout(200);
const movilEntidades = await movil.evaluate(() => ({
  desborde: document.documentElement.scrollWidth - window.innerWidth,
  barras: document.querySelectorAll('#eaafExplorer .eaaf-bar-row').length,
  tabla: document.querySelectorAll('#eaafExplorer .chart-table tbody tr').length,
}));
comprobar(movilEntidades.desborde <= 0 && movilEntidades.barras === 22 && movilEntidades.tabla === 22, '390px: las 22 entidades caben sin recorte horizontal');
await movil.locator('#desapariciones').screenshot({ path: path.join(SALIDA, 'eaaf-explorer-movil.png'), animations: 'disabled' });
await movil.close();

/* 7 · respaldo embebido sin data.json */
const respaldo = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
await respaldo.route('**/dashboards/vidas-en-transito/data.json', (r) => r.abort());
await respaldo.goto(URL, { waitUntil: 'load' });
await respaldo.waitForTimeout(1200);
await respaldo.locator('[data-target="desapariciones"]').click();
await respaldo.waitForTimeout(300);
const fallback = await respaldo.evaluate(() => ({
  tarjetas: document.querySelectorAll('#eaafExplorer .eaaf-metrics button').length,
  barras: document.querySelectorAll('#eaafExplorer .eaaf-bar-row').length,
  timeline: document.querySelectorAll('#eaafTimeline .eaaf-indicador').length,
  detalle: document.querySelector('#eaafExplorer .eaaf-selected-detail')?.textContent.trim() || '',
}));
comprobar(fallback.tarjetas === 4 && fallback.barras === 11 && fallback.timeline === 5, 'sin data.json, el respaldo embebido dibuja el explorador y el Panorama EAAF');
comprobar(/Honduras/.test(fallback.detalle) && /814/.test(fallback.detalle), 'el respaldo conserva las cifras del desglose');
await respaldo.close();

comprobar(respuestas.length === 0, `sin respuestas 4xx/5xx (${respuestas.slice(0, 3).join(' · ') || 'ninguna'})`);
await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores de consola:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;
