/**
 * Verificación de la serie anual de eventos migratorios (UPMRIP/INM).
 *
 *   node tools/verificar-eventos-migratorios.mjs
 *
 * Comprueba la fuente, los siete valores anuales, el corte parcial de 2026,
 * la ausencia de anualización, la escala, tooltips, teclado, tabla accesible,
 * colores y comportamiento móvil.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'vidas-en-transito');
const URL = 'http://127.0.0.1:8000/dashboards/vidas-en-transito/index.html';
const DATOS = await (await fetch('http://127.0.0.1:8000/dashboards/vidas-en-transito/data.json')).json();
const E = DATOS.eventos_migratorios;
const nf = new Intl.NumberFormat('es-MX');
const ESPERADO = new Map([[2021, 309692], [2022, 441409], [2023, 778907], [2024, 1234698], [2025, 155730], [2026, 31077]]);

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

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
const respuestas = [];
pagina.on('response', (r) => { if (r.status() >= 400) respuestas.push(`${r.status()} ${r.url()}`); });

await pagina.goto(URL, { waitUntil: 'load' });
await pagina.waitForTimeout(2500);
await pagina.waitForSelector('#eventosMigratorios .em-col');

const contenido = await pagina.evaluate(() => {
  const css = (sel, prop) => { const n = document.querySelector(sel); return n ? getComputedStyle(n)[prop] : ''; };
  const cols = [...document.querySelectorAll('#eventosMigratorios .em-col')].map((n) => ({
    year: Number(n.querySelector('.em-year')?.textContent.trim().slice(0, 4)),
    texto: n.querySelector('.em-value')?.textContent.trim() || '',
    yearTexto: n.querySelector('.em-year')?.textContent.replace(/\s+/g, ' ').trim() || '',
    parcial: n.classList.contains('is-parcial'),
    barClass: n.querySelector('.em-bar')?.className || '',
    barH: n.querySelector('.em-bar') ? Math.round(n.querySelector('.em-bar').getBoundingClientRect().height) : 0,
    barBg: n.querySelector('.em-bar') ? getComputedStyle(n.querySelector('.em-bar')).backgroundColor : '',
    barImg: n.querySelector('.em-bar') ? getComputedStyle(n.querySelector('.em-bar')).backgroundImage : '',
    aria: n.getAttribute('aria-label') || '',
    tabindex: n.getAttribute('tabindex') || '',
    tip: n.querySelector('.em-tip')?.innerText.replace(/\s+/g, ' ').trim() || '',
  }));
  return {
    card: Boolean(document.querySelector('#eventosMigratoriosCard')),
    titulo: document.querySelector('#emTitle')?.textContent.trim() || '',
    meta: document.querySelector('#eventosMigratorios .em-meta')?.innerText.replace(/\s+/g, ' ').trim() || '',
    definicion: document.querySelector('#eventosMigratorios .em-definicion')?.innerText.replace(/\s+/g, ' ').trim() || '',
    nota: document.querySelector('#eventosMigratoriosCard .unit-note')?.textContent.replace(/\s+/g, ' ').trim() || '',
    notas: document.querySelector('#eventosMigratorios .em-nota')?.textContent.replace(/\s+/g, ' ').trim() || '',
    legend: document.querySelector('#eventosMigratorios .em-legend')?.innerText.replace(/\s+/g, ' ').trim() || '',
    cols,
    chartAria: document.querySelector('#eventosMigratorios .em-chart')?.getAttribute('aria-label') || '',
    chartRole: document.querySelector('#eventosMigratorios .em-chart')?.getAttribute('role') || '',
    scroll: (() => { const n = document.querySelector('#eventosMigratorios .em-scroll'); return n ? { client: n.clientWidth, scroll: n.scrollWidth } : null; })(),
    hint: css('#eventosMigratorios .em-scroll-hint', 'display'),
    tablaFilas: document.querySelectorAll('#eventosMigratorios .chart-table tbody tr').length,
    tabla: [...document.querySelectorAll('#eventosMigratorios .chart-table tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim())),
    tablaCapt: document.querySelector('#eventosMigratorios .chart-table caption')?.textContent || '',
    enlaces: [...document.querySelectorAll('#eventosMigratorios .em-definicion a')].map((a) => ({ href: a.getAttribute('href'), rel: a.getAttribute('rel') })),
    textoCard: document.querySelector('#eventosMigratoriosCard')?.innerText.replace(/\s+/g, ' ') || '',
    orden: (() => {
      const card = document.querySelector('#eventosMigratoriosCard');
      const perfil = document.querySelector('#panorama .profile-section');
      const eaaf = document.querySelector('#panorama .eaaf-block');
      return Boolean(card && perfil && eaaf && (perfil.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING) && (card.compareDocumentPosition(eaaf) & Node.DOCUMENT_POSITION_FOLLOWING));
    })(),
    yLabels: [...document.querySelectorAll('#eventosMigratorios .em-yaxis span')].map((n) => n.textContent.trim()),
  };
});

const num = (s) => Number(String(s).replace(/[^\d]/g, ''));
const prohibidos = [[217, 106, 43], [91, 31, 122], [169, 127, 196], [180, 138, 201]];
const rgb = (s) => (String(s).match(/\d+/g) || []).map(Number).slice(0, 3);
const esProhibido = (c) => prohibidos.some((p) => p.every((v, i) => Math.abs(v - c[i]) <= 2));

/* 1 · datos de origen */
comprobar(E && E.unit === 'eventos' && E.series.length === 6, 'data.json publica seis años comparables y la unidad eventos');
comprobar(E.series.every((s) => s.eventos === ESPERADO.get(s.year)), 'los totales coinciden con los cuadros 3.1 verificados');
comprobar(!E.series.some((s) => s.year === 2020) && /2020 no se incluye/.test(E.notes.join(' ')), '2020 queda excluido por cambio de definición y columnas');
comprobar(E.series.find((s) => s.year === 2026)?.status === 'parcial' && E.series.find((s) => s.year === 2026)?.months === 9, '2026 se conserva como parcial de enero–septiembre');
comprobar(E.series.filter((s) => s.year !== 2026).every((s) => s.status === 'completo' && s.months === 12), '2021–2025 son años completos de doce meses');
comprobar(E.cutoff === '2026-09' && /septiembre de 2026/.test(E.cutoff_label), 'el corte declarado es septiembre de 2026');

/* 2 · tarjeta y textos editoriales */
comprobar(contenido.card && contenido.titulo === 'Eventos de personas en situación migratoria irregular registrados en México', `título exacto (${contenido.titulo})`);
comprobar(contenido.orden, 'la gráfica queda dentro de Panorama, después de perfiles y antes de búsqueda e identificación');
comprobar(/UPMRIP\/SEGOB/.test(contenido.meta) && /UNIDAD eventos/i.test(contenido.meta), 'la gráfica declara fuente y unidad');
comprobar(/PERIODO 2021–2025 completos/i.test(contenido.meta) && /2026 enero–septiembre \(parcial\)/i.test(contenido.meta), 'la gráfica declara periodo completo y corte parcial');
comprobar(/ACTUALIZACIÓN 13 nov 2026/i.test(contenido.meta) && /CORTE 2026 septiembre de 2026/i.test(contenido.meta), 'la gráfica declara actualización y corte');
comprobar(/Procedimiento Administrativo Migratorio \(PAM\)/.test(contenido.definicion) && /una misma persona pudo tener más de un evento/.test(contenido.definicion), 'la definición oficial y la unidad de evento son visibles');
comprobar(contenido.enlaces.length === 2 && contenido.enlaces.every((a) => /noopener/.test(a.rel || '')) && contenido.enlaces.some((a) => /EvPerMigrIrreg/.test(a.href)) && contenido.enlaces.some((a) => /CuadrosBOLETIN/.test(a.href)), 'la fuente y la definición enlazan al portal oficial');
comprobar(contenido.nota === 'Son eventos administrativos registrados por el INM; no equivalen necesariamente a personas únicas ni al total de quienes iniciaron la migración desde su hogar.', 'la nota editorial solicitada está visible y literal');
comprobar(/no se proyecta ni se anualiza/i.test(contenido.notas) && /información preliminar/i.test(contenido.notas), 'las notas declaran que 2026 no se anualiza y que la fuente es preliminar');
comprobar(!/40,800|REDODEM/.test(contenido.textoCard), 'la gráfica no reutiliza los 40,800 registros REDODEM');

/* 3 · columnas y valores */
comprobar(contenido.cols.length === 6, `seis columnas anuales comparables (${contenido.cols.length})`);
comprobar(contenido.cols.every((c) => num(c.texto) === ESPERADO.get(c.year)), `los valores impresos coinciden (${contenido.cols.map((c) => `${c.year}: ${c.texto}`).join(' · ')})`);
comprobar(contenido.cols.find((c) => c.year === 2026)?.parcial === true && /em-bar--parcial/.test(contenido.cols.find((c) => c.year === 2026)?.barClass || ''), '2026 se distingue con una barra parcial');
comprobar(contenido.cols.find((c) => c.year === 2024)?.parcial === false && contenido.cols.find((c) => c.year === 2024)?.barH > contenido.cols.find((c) => c.year === 2025)?.barH, 'la escala conserva el orden de los conteos');
comprobar(/2026 parcial/i.test(contenido.legend) && /ene–sep/i.test(contenido.legend) && /no anualizado/i.test(contenido.legend), 'la leyenda distingue el año parcial y su corte');
comprobar(contenido.yLabels.includes('1,500,000') && contenido.yLabels.includes('0'), `la escala visible va de 0 a 1,500,000 (${contenido.yLabels.join(' · ')})`);
comprobar(contenido.cols.filter((c) => c.year !== 2026).every((c) => !esProhibido(rgb(c.barBg))), 'las barras completas usan el índigo del tablero, no naranja ni morado');
comprobar(contenido.cols.find((c) => c.year === 2026)?.barImg.includes('repeating-linear-gradient'), 'la barra parcial usa trama, no otro color semántico');

/* 4 · tooltips y teclado */
const col2026 = pagina.locator('#eventosMigratorios .em-col.is-parcial');
const col2024 = pagina.locator('#eventosMigratorios .em-col').filter({ hasText: '2024' }).first();
await col2026.focus();
await pagina.waitForTimeout(250);
const tip2026 = await pagina.evaluate(() => {
  const col = document.querySelector('#eventosMigratorios .em-col.is-parcial');
  const tip = col?.querySelector('.em-tip');
  return { visible: tip ? getComputedStyle(tip).visibility === 'visible' : false, texto: tip?.innerText.replace(/\s+/g, ' ').trim() || '', aria: col?.getAttribute('aria-label') || '' };
});
comprobar(tip2026.visible && /2026/.test(tip2026.texto) && /31,077/.test(tip2026.texto) && /Parcial/.test(tip2026.texto) && /enero–septiembre/.test(tip2026.texto) && /no anualizado/.test(tip2026.texto), `el tooltip de 2026 declara conteo, unidad y estado (${tip2026.texto})`);
comprobar(/2026: 31,077 eventos; Parcial · enero–septiembre · no anualizado/.test(tip2026.aria), 'la columna 2026 tiene nombre accesible completo');
await col2024.focus();
await pagina.waitForTimeout(250);
const tip2024 = await pagina.evaluate(() => {
  const col = [...document.querySelectorAll('#eventosMigratorios .em-col')].find((n) => n.querySelector('.em-year')?.textContent.trim().startsWith('2024'));
  const tip = col?.querySelector('.em-tip');
  return { visible: tip ? getComputedStyle(tip).visibility === 'visible' : false, texto: tip?.innerText.replace(/\s+/g, ' ').trim() || '' };
});
comprobar(tip2024.visible && /1,234,698/.test(tip2024.texto) && /Completo/.test(tip2024.texto) && /enero–diciembre/.test(tip2024.texto), `el tooltip de un año completo declara estado (${tip2024.texto})`);
comprobar(contenido.cols.every((c) => c.tabindex === '0' && c.aria), 'cada columna es enfocable y tiene etiqueta accesible');
comprobar(contenido.chartRole === 'group' && /2026/.test(contenido.chartAria) && /parcial/.test(contenido.chartAria), 'la gráfica tiene una descripción accesible del conjunto');

/* 5 · tabla accesible */
comprobar(contenido.tablaFilas === 6, `la tabla accesible conserva seis filas (${contenido.tablaFilas})`);
comprobar(contenido.tabla.every((r) => num(r[1]) === ESPERADO.get(Number(r[0]))), 'la tabla coincide con los valores dibujados');
comprobar(contenido.tabla.find((r) => r[0] === '2026')?.[4] === 'Parcial · no anualizado' && contenido.tabla.find((r) => r[0] === '2024')?.[4] === 'Completo', 'la tabla distingue el año parcial y los completos');
comprobar(/UPMRIP\/SEGOB/.test(contenido.tablaCapt) && /2026/.test(contenido.tablaCapt), 'la tabla declara fuente y corte');
await pagina.evaluate(() => { if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); });
await pagina.mouse.move(2, 2);
await pagina.waitForTimeout(200);
await pagina.locator('#eventosMigratoriosCard').screenshot({ path: path.join(SALIDA, 'eventos-migratorios.png'), animations: 'disabled' });

/* 6 · móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`390 JS: ${e.message}`));
movil.on('console', (m) => { if (m.type() === 'error') errores.push(`390 consola: ${m.text()}`); });
await movil.goto(URL, { waitUntil: 'load' });
await movil.waitForTimeout(2300);
const movilDatos = await movil.evaluate(() => {
  const scroll = document.querySelector('#eventosMigratorios .em-scroll');
  return {
    desborde: document.documentElement.scrollWidth - window.innerWidth,
    cols: document.querySelectorAll('#eventosMigratorios .em-col').length,
    scroll: scroll ? { client: scroll.clientWidth, width: scroll.scrollWidth } : null,
    hint: getComputedStyle(document.querySelector('#eventosMigratorios .em-scroll-hint')).display,
    tabla: document.querySelectorAll('#eventosMigratorios .chart-table tbody tr').length,
  };
});
comprobar(movilDatos.desborde <= 0, `390px: sin desbordamiento de página (${movilDatos.desborde})`);
comprobar(movilDatos.cols === 6 && movilDatos.tabla === 6, `390px: seis columnas y tabla (${movilDatos.cols} · ${movilDatos.tabla})`);
comprobar(movilDatos.scroll && movilDatos.scroll.width > movilDatos.scroll.client && movilDatos.hint === 'block', '390px: la gráfica se desplaza internamente y muestra la pista');
await movil.locator('#eventosMigratoriosCard').screenshot({ path: path.join(SALIDA, 'eventos-migratorios-movil.png'), animations: 'disabled' });
await movil.locator('#eventosMigratorios .em-scroll').evaluate((n) => { n.scrollLeft = n.scrollWidth; });
await movil.waitForTimeout(250);
await movil.locator('#eventosMigratoriosCard').screenshot({ path: path.join(SALIDA, 'eventos-migratorios-movil-corte.png'), animations: 'disabled' });
await movil.close();

comprobar(respuestas.length === 0, `sin respuestas 4xx/5xx (${respuestas.slice(0, 3).join(' · ') || 'ninguna'})`);
await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores de consola:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;
