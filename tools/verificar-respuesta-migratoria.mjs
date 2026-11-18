/**
 * Verificación de «Respuesta y alojamiento registrados» (UPMRIP/INM).
 *
 *   node tools/verificar-respuesta-migratoria.mjs
 *
 * Comprueba devoluciones por año y tipo de resolución, escalas independientes,
 * 2026 parcial, tooltips, definiciones, tabla accesible y la ausencia de una
 * serie comparable de alojamiento.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'vidas-en-transito');
const URL = 'http://127.0.0.1:8000/dashboards/vidas-en-transito/index.html';
const DATOS = await (await fetch('http://127.0.0.1:8000/dashboards/vidas-en-transito/data.json')).json();
const D = DATOS.devoluciones;
const nf = new Intl.NumberFormat('es-MX');
const ESPERADO = new Map([
  [2021, { total: 130275, deportacion: 2298, retorno: 104929, nna: 23048 }],
  [2022, { total: 121963, deportacion: 4143, retorno: 104897, nna: 12923 }],
  [2023, { total: 54728, deportacion: 3626, retorno: 43437, nna: 7665 }],
  [2024, { total: 20834, deportacion: 516, retorno: 16398, nna: 3920 }],
  [2025, { total: 11804, deportacion: 1153, retorno: 9165, nna: 1486 }],
  [2026, { total: 10829, deportacion: 4559, retorno: 5832, nna: 438 }],
]);

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
await pagina.waitForSelector('#respuestaMigratoria .resp-panel');

const contenido = await pagina.evaluate(() => {
  const paneles = [...document.querySelectorAll('#respuestaMigratoria .resp-panel')].map((n) => ({
    titulo: n.querySelector('h3')?.textContent.trim() || '',
    meta: n.querySelector('.resp-meta')?.textContent.replace(/\s+/g, ' ').trim() || '',
    valores: [...n.querySelectorAll('.resp-value')].map((x) => x.textContent.trim()),
    years: [...n.querySelectorAll('.resp-year')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
    parciales: n.querySelectorAll('.resp-col.is-parcial').length,
    barrasParciales: n.querySelectorAll('.resp-bar--parcial').length,
    yLabels: [...n.querySelectorAll('.resp-yaxis span')].map((x) => x.textContent.trim()),
    aria: n.querySelector('.resp-chart')?.getAttribute('aria-label') || '',
    tips: [...n.querySelectorAll('.resp-tip')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()),
  }));
  return {
    card: Boolean(document.querySelector('#respuestaCard')),
    titulo: document.querySelector('#respTitle')?.textContent.trim() || '',
    meta: document.querySelector('#respuestaMigratoria .chart-meta')?.innerText.replace(/\s+/g, ' ').trim() || '',
    definicion: document.querySelector('#respuestaMigratoria .resp-definicion')?.innerText.replace(/\s+/g, ' ').trim() || '',
    notas: document.querySelector('#respuestaMigratoria .resp-nota')?.textContent.replace(/\s+/g, ' ').trim() || '',
    leyenda: document.querySelector('#respuestaMigratoria .resp-legend')?.innerText.replace(/\s+/g, ' ').trim() || '',
    definiciones: document.querySelector('#respuestaMigratoria .resp-definiciones')?.textContent.replace(/\s+/g, ' ').trim() || '',
    definicionesAbiertas: document.querySelector('#respuestaMigratoria .resp-definiciones')?.open ?? null,
    paneles,
    filasTabla: document.querySelectorAll('#respuestaMigratoria .chart-table tbody tr').length,
    tabla: [...document.querySelectorAll('#respuestaMigratoria .chart-table tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim())),
    tablaCapt: document.querySelector('#respuestaMigratoria .chart-table caption')?.textContent || '',
    apilados: document.querySelectorAll('#respuestaMigratoria [class*="stack"]').length,
    alojamiento: {
      titulo: document.querySelector('#respAlojamientoTitle')?.textContent.trim() || '',
      texto: document.querySelector('#respuestaCard .resp-alojamiento')?.innerText.replace(/\s+/g, ' ').trim() || '',
      columnas: document.querySelectorAll('#respuestaCard .resp-alojamiento .resp-col').length,
    },
    textoCard: document.querySelector('#respuestaCard')?.innerText.replace(/\s+/g, ' ') || '',
  };
});

const num = (s) => Number(String(s).replace(/[^\d]/g, ''));
const prohibidos = [[217, 106, 43], [91, 31, 122], [169, 127, 196], [180, 138, 201]];
const rgb = (s) => (String(s).match(/\d+/g) || []).map(Number).slice(0, 3);
const esProhibido = (c) => prohibidos.some((p) => p.every((v, i) => Math.abs(v - c[i]) <= 2));

/* 1 · datos verificados */
comprobar(D && D.unit === 'eventos' && D.series.length === 6, 'data.json publica seis años de devoluciones en eventos');
comprobar(D.series.every((s) => s.total === ESPERADO.get(s.year).total && s.deportacion === ESPERADO.get(s.year).deportacion && s.retorno_asistido === ESPERADO.get(s.year).retorno && s.retorno_asistido_nna === ESPERADO.get(s.year).nna), 'los totales y tipos de resolución coinciden con los cuadros 3.2.3');
comprobar(D.series.every((s) => s.deportacion + s.retorno_asistido + s.retorno_asistido_nna === s.total), 'cada total es exactamente la suma de sus tres tipos publicados');
comprobar(D.series.filter((s) => s.year !== 2026).every((s) => s.status === 'completo' && s.months === 12) && D.series.find((s) => s.year === 2026)?.status === 'parcial' && D.series.find((s) => s.year === 2026)?.months === 9, '2021–2025 completos; 2026 parcial de enero–septiembre');
comprobar(D.cutoff === '2026-09' && /septiembre de 2026/.test(D.cutoff_label), 'el corte declarado es septiembre de 2026');
comprobar(D.types.length === 3 && D.types.map((t) => t.label).join('|') === 'Eventos de deportación|Retorno asistido|Retorno asistido de niñas, niños o adolescentes', 'se conservan los tres nombres de tipo de resolución');

/* 2 · sección y pequeñas múltiplos */
comprobar(contenido.card && contenido.titulo === 'Respuesta y alojamiento registrados', `título exacto (${contenido.titulo})`);
comprobar(contenido.paneles.length === 4, `cuatro paneles separados (${contenido.paneles.length})`);
comprobar(contenido.paneles[0].titulo === 'Eventos de personas devueltas' && contenido.paneles[1].titulo === 'Eventos de deportación' && contenido.paneles[2].titulo === 'Retorno asistido' && contenido.paneles[3].titulo === 'Retorno asistido de niñas, niños o adolescentes', 'los paneles distinguen total y tipos sin llamar deportaciones a todo');
comprobar(contenido.paneles.every((p) => /unidad: eventos/i.test(p.meta) && /escala independiente/i.test(p.meta)), 'cada panel declara unidad y escala independiente');
comprobar(contenido.paneles.every((p) => p.years.length === 6 && p.years[0] === '2021' && p.years[5].startsWith('2026')), 'los paneles están alineados por los mismos años');
comprobar(contenido.paneles[0].yLabels.join('|') !== contenido.paneles[1].yLabels.join('|') && contenido.paneles[1].yLabels.join('|') !== contenido.paneles[3].yLabels.join('|'), 'las escalas no se comparten entre paneles');
comprobar(contenido.paneles.every((p) => p.parciales === 1 && p.barrasParciales === 1), '2026 es parcial y usa trama en cada panel');
comprobar(/Año completo/.test(contenido.leyenda) && /2026 parcial/i.test(contenido.leyenda) && /Corte 2026: septiembre de 2026/i.test(contenido.leyenda), 'la leyenda distingue año completo y corte parcial');
comprobar(/Fuente/i.test(contenido.meta) && /UNIDAD eventos/i.test(contenido.meta) && /PERIODO 2021–2025 completos/i.test(contenido.meta) && /CORTE 2026 septiembre de 2026/i.test(contenido.meta), 'la sección declara fuente, unidad, periodo y corte');
comprobar(/Eventos de personas devueltas por la autoridad migratoria mexicana/.test(contenido.definicion) && /Cuadro 3.2.3/.test(contenido.definicion), 'la definición y el cuadro de origen son visibles');

/* 3 · valores por panel */
const valoresEsperados = [
  [...ESPERADO.values()].map((v) => v.total),
  [...ESPERADO.values()].map((v) => v.deportacion),
  [...ESPERADO.values()].map((v) => v.retorno),
  [...ESPERADO.values()].map((v) => v.nna),
];
contenido.paneles.forEach((p, i) => {
  comprobar(p.valores.every((v, j) => num(v) === valoresEsperados[i][j]), `${p.titulo}: valores coinciden (${p.valores.join(' · ')})`);
});
comprobar(contenido.paneles.every((p) => p.aria && /2021/.test(p.aria) && /2026/.test(p.aria) && /Escala independiente/.test(p.aria)), 'cada panel tiene descripción accesible con años y escala');

/* 4 · tooltips, teclado y definiciones */
const col2026 = pagina.locator('#respuestaMigratoria .resp-panel').first().locator('.resp-col.is-parcial');
await col2026.focus();
await pagina.waitForTimeout(250);
const tip2026 = await pagina.evaluate(() => {
  const n = document.querySelector('#respuestaMigratoria .resp-panel .resp-col.is-parcial .resp-tip');
  return { visible: n ? getComputedStyle(n).visibility === 'visible' : false, texto: n?.innerText.replace(/\s+/g, ' ').trim() || '', aria: n?.closest('.resp-col')?.getAttribute('aria-label') || '' };
});
comprobar(tip2026.visible && /2026/.test(tip2026.texto) && /10,829/.test(tip2026.texto) && /eventos/i.test(tip2026.texto) && /Parcial/.test(tip2026.texto) && /enero–septiembre/.test(tip2026.texto) && /Fuente:/.test(tip2026.texto) && /Definición:/.test(tip2026.texto), `el tooltip declara valor, unidad, periodo, fuente y definición (${tip2026.texto.slice(0, 100)}…)`);
comprobar(/2026: 10,829 eventos; Parcial · enero–septiembre · no anualizado/.test(tip2026.aria), 'la columna parcial tiene nombre accesible completo');
comprobar(/Deportación|deportación/.test(contenido.definiciones) && /Retorno asistido/.test(contenido.definiciones) && /Ley General de los Derechos de Niñas, Niños y Adolescentes/.test(contenido.definiciones) && contenido.definicionesAbiertas === false, 'las definiciones completas están disponibles y plegadas');
comprobar(/no se apila/i.test(contenido.notas) && /No se suma con los eventos de movilidad ni con alojamiento/i.test(contenido.notas) && /no se proyecta ni se anualiza/i.test(contenido.notas), 'las notas impiden apilar o sumar las series');
comprobar(!/40,800|REDODEM/.test(contenido.textoCard), 'la respuesta no reutiliza el total REDODEM');

/* 5 · tabla accesible */
comprobar(contenido.filasTabla === 6, `la tabla accesible conserva seis años (${contenido.filasTabla})`);
comprobar(contenido.tabla.every((r) => num(r[1]) === ESPERADO.get(Number(r[0])).total && num(r[2]) === ESPERADO.get(Number(r[0])).deportacion && num(r[3]) === ESPERADO.get(Number(r[0])).retorno && num(r[4]) === ESPERADO.get(Number(r[0])).nna), 'la tabla coincide con los valores dibujados');
comprobar(contenido.tabla.find((r) => r[0] === '2026')?.[6] === 'Parcial · no anualizado' && /No incluye alojamiento/.test(contenido.tablaCapt), 'la tabla distingue 2026 y declara la ausencia de alojamiento');
comprobar(/UPMRIP\/SEGOB/.test(contenido.tablaCapt) && /Cuadro 3.2.3|3.2.3/.test(contenido.tablaCapt), 'la tabla declara fuente y cuadro');

/* 6 · alojamiento */
comprobar(/Personas alojadas en estaciones migratorias o estancias provisionales/.test(contenido.alojamiento.titulo), 'la sección de alojamiento nombra la unidad solicitada');
comprobar(/No se localizó una serie periódica comparable/.test(contenido.alojamiento.texto) && /Dato faltante/.test(contenido.alojamiento.texto), 'se informa que falta la serie comparable');
comprobar(/personas alojadas por periodo/i.test(contenido.alojamiento.texto) && /ocupación simultánea/i.test(contenido.alojamiento.texto) && /capacidad instalada/i.test(contenido.alojamiento.texto), 'se distingue el total del periodo de la ocupación y la capacidad');
comprobar(contenido.alojamiento.columnas === 0, 'no se dibuja una serie ficticia de alojamiento');

await pagina.locator('#respuestaCard').screenshot({ path: path.join(SALIDA, 'respuesta-alojamiento.png'), animations: 'disabled' });

/* 7 · móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`390 JS: ${e.message}`));
movil.on('console', (m) => { if (m.type() === 'error') errores.push(`390 consola: ${m.text()}`); });
await movil.goto(URL, { waitUntil: 'load' });
await movil.waitForTimeout(2300);
const movilDatos = await movil.evaluate(() => {
  const grid = document.querySelector('#respuestaMigratoria .resp-grid');
  return {
    desborde: document.documentElement.scrollWidth - window.innerWidth,
    paneles: document.querySelectorAll('#respuestaMigratoria .resp-panel').length,
    columnas: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
    tabla: document.querySelectorAll('#respuestaMigratoria .chart-table tbody tr').length,
    parciales: document.querySelectorAll('#respuestaMigratoria .resp-col.is-parcial').length,
    alojamiento: document.querySelectorAll('#respuestaCard .resp-alojamiento .resp-col').length,
  };
});
comprobar(movilDatos.desborde <= 0, `390px: sin desbordamiento de página (${movilDatos.desborde})`);
comprobar(movilDatos.paneles === 4 && movilDatos.columnas === 1, `390px: cuatro paneles en una columna (${movilDatos.paneles} · ${movilDatos.columnas})`);
comprobar(movilDatos.tabla === 6 && movilDatos.parciales === 4 && movilDatos.alojamiento === 0, '390px: tabla, 2026 parcial y ausencia de serie de alojamiento');
await movil.locator('#respuestaCard').screenshot({ path: path.join(SALIDA, 'respuesta-alojamiento-movil.png'), animations: 'disabled' });
await movil.close();

comprobar(respuestas.length === 0, `sin respuestas 4xx/5xx (${respuestas.slice(0, 3).join(' · ') || 'ninguna'})`);
await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores de consola:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;
