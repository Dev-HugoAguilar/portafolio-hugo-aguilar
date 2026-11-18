/**
 * Verificación visual de Panorama: lenguaje del mapa, escala y contraste.
 *
 *   node tools/verificar-panorama-visual.mjs
 *
 * Comprueba la nota de alcance, los totales de la matriz edad × sexo y su
 * conciliación con data.json, el selector Conteos/Composición, los bloques
 * editoriales EAAF y la coherencia visual con el mapa cartográfico.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'vidas-en-transito');
const URL = 'http://127.0.0.1:8000/dashboards/vidas-en-transito/index.html';
const DATOS = await (await fetch('http://127.0.0.1:8000/dashboards/vidas-en-transito/data.json')).json();
const RD = DATOS.redodem;
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

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
const respuestas = [];
pagina.on('response', (r) => { if (r.status() >= 400) respuestas.push(`${r.status()} ${r.url()}`); });

await pagina.goto(URL, { waitUntil: 'load' });
await pagina.waitForTimeout(2600);
await pagina.waitForSelector('#geoMap .geo-svg-incidente');

const contenido = await pagina.evaluate(() => {
  const css = (n, p) => (n ? getComputedStyle(n)[p] : '');
  const caja = (sel) => {
    const n = document.querySelector(sel);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) };
  };
  const mapa = {
    first: document.querySelector('#panorama')?.firstElementChild?.id || '',
    corridor: css(document.querySelector('#geoMap .geo-svg-tramo'), 'stroke'),
    incident: css(document.querySelector('#geoMap .geo-svg-incidente'), 'fill'),
    zone: css(document.querySelector('#geoMap .geo-svg-zona'), 'fill'),
    state: css(document.querySelector('#geoMap .geo-svg-estado'), 'stroke'),
    railFerromex: css(document.querySelector('#geoMap .geo-svg-ferro-g.is-ferromex .geo-svg-ferroviaria'), 'stroke'),
    railOtras: css(document.querySelector('#geoMap .geo-svg-ferro-g:not(.is-ferromex) .geo-svg-ferroviaria'), 'stroke'),
    h2: css(document.querySelector('#geoTitle'), 'fontSize'),
    frame: css(document.querySelector('#geoMap'), 'borderRadius'),
    card: caja('#geoCard'),
  };
  const perfil = caja('#panorama .profile-section');
  const heat = [...document.querySelectorAll('#redodemAgeGender .heat-cell:not(.heat-cell--total)')].map((n) => ({
    valor: Number(n.dataset.valor || 0),
    edad: n.dataset.edad || '',
    sexo: n.dataset.sexo || '',
    texto: n.textContent.trim(),
    clase: n.className,
    fondo: getComputedStyle(n).backgroundColor,
    color: getComputedStyle(n).color,
    title: n.getAttribute('title') || '',
    aria: n.getAttribute('aria-label') || '',
  }));
  const heatTotales = [...document.querySelectorAll('#redodemAgeGender .heat-cell--total')].map((n) => ({
    valor: Number(n.dataset.valor || 0),
    texto: n.textContent.trim(),
    tipo: n.dataset.total || '',
    edad: n.dataset.edad || '',
    sexo: n.dataset.sexo || '',
    title: n.getAttribute('title') || '',
    aria: n.getAttribute('aria-label') || '',
  }));
  const panel = (id) => {
    const cajaPanel = document.getElementById(id);
    const svg = cajaPanel?.querySelector('svg.bv-svg');
    return {
      w: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
      h: svg ? Math.round(svg.getBoundingClientRect().height) : 0,
      nodos: [...(cajaPanel?.querySelectorAll('.bv-circulo') || [])].map((c) => ({
        etiqueta: c.dataset.cat,
        valor: Number(c.dataset.valor),
        fill: (c.getAttribute('fill') || '').toUpperCase(),
        texto: (c.parentElement.querySelector('text')?.getAttribute('fill') || '').toUpperCase(),
      })),
      leyendas: [...(cajaPanel?.querySelectorAll('.bv-leyenda-item') || [])].map((n) => n.textContent.trim()),
      guia: cajaPanel?.querySelector('.bv-guia')?.innerText.replace(/\s+/g, ' ').trim() || '',
      tablaFilas: cajaPanel?.querySelectorAll('.chart-table tbody tr').length || 0,
      tablaCaption: cajaPanel?.querySelector('.chart-table caption')?.textContent || '',
    };
  };
  const tabla = (sel) => {
    const cab = document.querySelector(`${sel} thead th`);
    const sum = document.querySelector(`${sel} summary`);
    return {
      headerBg: cab ? getComputedStyle(cab).backgroundColor : '',
      headerSize: cab ? getComputedStyle(cab).fontSize : '',
      summaryTransform: sum ? getComputedStyle(sum).textTransform : '',
      summaryColor: sum ? getComputedStyle(sum).color : '',
      summarySize: sum ? getComputedStyle(sum).fontSize : '',
    };
  };
  return {
    mapa,
    perfil,
    perfilH2: css(document.querySelector('#panorama .profile-card h2'), 'fontSize'),
    resumen: {
      valor: document.querySelector('#redodemSummary .scope-title')?.textContent.trim() || '',
      meta: document.querySelector('#redodemSummary .scope-meta')?.innerText.replace(/\s+/g, ' ').trim() || '',
      caveat: document.querySelector('#redodemSummary .scope-caveat')?.textContent.replace(/\s+/g, ' ').trim() || '',
      limit: document.querySelector('#redodemSummary .scope-limit')?.textContent.replace(/\s+/g, ' ').trim() || '',
      kpi: document.querySelectorAll('#panorama .profile-total').length,
      heatTitle: document.querySelector('#edadTitulo')?.textContent.trim() || '',
      heatCeldas: heat.length,
      heatTotales,
      heatControl: [...document.querySelectorAll('#redodemAgeGender .heat-vistas .redodem-vista')].map((n) => ({
        texto: n.textContent.trim(),
        activo: n.getAttribute('aria-pressed'),
      })),
    },
    heat,
    heatLegend: document.querySelector('#panorama .heat-legend')?.innerText.replace(/\s+/g, ' ').trim() || '',
    heatNote: document.querySelector('#panorama .bubble-note')?.textContent.replace(/\s+/g, ' ').trim() || '',
    heatReconciliacion: document.querySelector('#panorama .heat-reconciliacion')?.textContent.replace(/\s+/g, ' ').trim() || '',
    heatTabla: tabla('#redodemAgeGender .chart-table'),
    heatTablaFilas: document.querySelectorAll('#redodemAgeGender .chart-table tbody tr').length,
    origen: panel('redodemOrigin'),
    destino: panel('redodemDestination'),
    origenTabla: tabla('#redodemOrigin .chart-table'),
    destinoTabla: tabla('#redodemDestination .chart-table'),
    eaaf: {
      grupos: document.querySelectorAll('#eaafTimeline .eaaf-grupo').length,
      indicadores: document.querySelectorAll('#eaafTimeline .eaaf-indicador').length,
      gruposFecha: [...document.querySelectorAll('#eaafTimeline .eaaf-grupo-fecha')].map((n) => n.textContent.trim()),
      cifras: [...document.querySelectorAll('#eaafTimeline .eaaf-cifra')].map((n) => n.textContent.trim()),
      fuentes: [...document.querySelectorAll('#eaafTimeline .eaaf-fuente')].map((n) => n.innerText.replace(/\s+/g, ' ').trim()),
      nota: document.querySelector('#eaafTimeline .eaaf-independientes')?.textContent.replace(/\s+/g, ' ').trim() || '',
      timelineRows: document.querySelectorAll('#eaafTimeline .timeline-row').length,
      timelineMarks: document.querySelectorAll('#eaafTimeline .timeline-mark').length,
      meta: document.querySelector('#panorama .eaaf-block .chart-meta')?.innerText.replace(/\s+/g, ' ').trim() || '',
      notaBloque: document.querySelector('#panorama .eaaf-block .unit-note')?.textContent.replace(/\s+/g, ' ').trim() || '',
      tablaFilas: document.querySelectorAll('#eaafTimeline .chart-table tbody tr').length,
      cifraColor: css(document.querySelector('#eaafTimeline .eaaf-cifra'), 'color'),
    },
    notas: {
      unitBorder: css(document.querySelector('#redodemAgeGender')?.closest('.profile-card')?.querySelector('.unit-note'), 'borderLeftColor'),
      unitBg: css(document.querySelector('#redodemAgeGender')?.closest('.profile-card')?.querySelector('.unit-note'), 'backgroundColor'),
      cannotBorder: css(document.querySelector('#panorama .profile-cannot'), 'borderLeftColor'),
      traceBorder: css(document.querySelector('#panorama .profile-trace'), 'borderLeftColor'),
    },
    calendarios: {
      panorama: document.querySelectorAll('#panorama #calendarPanels, #panorama .calendar-source, #panorama .month-cell').length,
      titulo: /Fechas de registro en las fuentes/.test(document.querySelector('#panorama')?.innerText || ''),
    },
  };
});

/* Contraste WCAG para texto normal (AA ≥ 4.5). */
const rgb = (s) => (String(s).match(/\d+/g) || []).map(Number).slice(0, 3);
const lum = (canales) => {
  const lineal = canales.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2];
};
const contraste = (a, b) => {
  const la = lum(rgb(a));
  const lb = lum(rgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const prohibidos = [
  [217, 106, 43], // naranja de incidentes ICIJ/CLIP
  [91, 31, 122], // Ferromex
  [169, 127, 196], // otras redes ferroviarias
  [180, 138, 201], // tramos sin uso
];
const esProhibido = (canales) => prohibidos.some((p) => p.every((v, i) => Math.abs(v - canales[i]) <= 2));
const hex = (s) => (String(s).match(/[0-9A-F]{2}/gi) || []).map((x) => parseInt(x, 16));
const colorDe = (s) => (s.startsWith('#') ? hex(s) : rgb(s));

/* 1 · el mapa manda y conserva sus colores */
comprobar(contenido.mapa.first === 'geoCard', `el mapa sigue siendo el primer bloque de Panorama (${contenido.mapa.first})`);
comprobar(contenido.mapa.corridor === 'rgb(47, 62, 207)', `corredor OIM en azul (${contenido.mapa.corridor})`);
comprobar(contenido.mapa.incident === 'rgb(217, 106, 43)', `incidentes ICIJ/CLIP en naranja (${contenido.mapa.incident})`);
comprobar(contenido.mapa.zone === 'rgb(232, 234, 237)', `zonas INM en gris claro (${contenido.mapa.zone})`);
comprobar(contenido.mapa.state === 'rgb(137, 147, 162)', `divisiones estatales en gris medio (${contenido.mapa.state})`);
comprobar(contenido.mapa.railFerromex === 'rgb(91, 31, 122)' && contenido.mapa.railOtras === 'rgb(169, 127, 196)', `ferrocarril morado intacto (${contenido.mapa.railFerromex} · ${contenido.mapa.railOtras})`);
comprobar(parseFloat(contenido.mapa.h2) >= 40 && parseFloat(contenido.perfilH2) < parseFloat(contenido.mapa.h2), `jerarquía: título del mapa ${contenido.mapa.h2} > títulos de perfiles ${contenido.perfilH2}`);
comprobar(contenido.perfil && contenido.mapa.card && contenido.perfil.top >= contenido.mapa.card.bottom, 'las gráficas de perfiles quedan debajo del mapa');

/* Cálculos independientes desde data.json para conciliar la matriz. */
const ageOrder = ['Niñxs', 'Adolescentes', 'Adultos jóvenes', 'Adultos', 'Adultos mayores', 'No especificado'];
const genderOrder = ['Hombre', 'Mujer', 'Persona no binaria', 'No especificado'];
const matriz = RD.age_gender_matrix;
const valorCelda = (a, g) => Number((matriz[a] || {})[g] || 0);
const filasEsperadas = Object.fromEntries(ageOrder.map((a) => [a, genderOrder.reduce((s, g) => s + valorCelda(a, g), 0)]));
const columnasEsperadas = Object.fromEntries(genderOrder.map((g) => [g, ageOrder.reduce((s, a) => s + valorCelda(a, g), 0)]));
const totalEsperado = genderOrder.reduce((s, g) => s + columnasEsperadas[g], 0);
const adultosEsperados = filasEsperadas['Adultos'] + filasEsperadas['Adultos jóvenes'];
const pctEsperado = (v, d) => (d ? `${(100 * v / d).toFixed(1).replace('.', ',')} %` : '—');
const num = (s) => Number(String(s).replace(/[^\d]/g, ''));

/* 2 · nota de alcance */
comprobar(contenido.resumen.valor === `Base analizada: ${nf.format(40800)} registros REDODEM · 2023–2024`, `la nota de alcance declara la base (${contenido.resumen.valor})`);
comprobar(contenido.resumen.kpi === 0, 'la cifra 40,800 ya no se presenta como KPI aislado');
comprobar(/Son filas de atención u observación; no representan necesariamente personas distintas ni el total de población migrante/.test(contenido.resumen.caveat), 'la nota de alcance explica que las filas no son personas distintas ni el total migrante');
comprobar(/Fuente\s+REDODEM/i.test(contenido.resumen.meta) && /Periodo\s+2023–2024/i.test(contenido.resumen.meta) && /Unidad\s+filas de atención\/observación/i.test(contenido.resumen.meta) && /Cobertura\s+organizaciones participantes/i.test(contenido.resumen.meta), 'la nota de alcance mantiene fuente, periodo, unidad y cobertura');
comprobar(/no es un censo/i.test(contenido.resumen.limit) && /no verifica el cruce/i.test(contenido.resumen.limit), 'la nota conserva los límites de censo y cruce');
comprobar(contenido.resumen.heatTitle === `Adultos y adultos jóvenes concentran el ${pctEsperado(adultosEsperados, totalEsperado)} de los registros.`, `el título de la matriz se calcula desde los conteos (${contenido.resumen.heatTitle})`);

/* 3 · matriz edad × sexo, totales y selector */
comprobar(contenido.resumen.heatCeldas === 24, `la matriz conserva sus 24 celdas (${contenido.resumen.heatCeldas})`);
comprobar(contenido.resumen.heatTotales.length === 11, `la matriz añade 11 celdas de total (${contenido.resumen.heatTotales.length})`);
comprobar(contenido.resumen.heatControl.length === 2 && contenido.resumen.heatControl[0].texto === 'Conteos' && contenido.resumen.heatControl[0].activo === 'true' && contenido.resumen.heatControl[1].texto === 'Composición dentro del grupo de edad', 'el selector accesible ofrece Conteos y Composición');
const grises = contenido.heat.filter((c) => c.clase.includes('heat-cell--gris'));
const ceros = contenido.heat.filter((c) => c.texto === '0');
comprobar(grises.length === 9 && grises.every((c) => c.fondo === 'rgb(223, 227, 234)'), `«No especificado» se conserva en gris (${grises.length} celdas)`);
comprobar(ceros.length === 2 && ceros.every((c) => c.valor === 0 && (c.fondo === 'rgb(223, 227, 234)' || c.fondo === 'rgb(244, 245, 249)')), `los ceros se identifican como cero (${ceros.length} celdas)`);
comprobar(contenido.heat.filter((c) => !c.clase.includes('heat-cell--gris') && !c.clase.includes('heat-cell--cero')).every((c) => {
  const canales = rgb(c.fondo);
  return canales[2] >= canales[0] && canales[2] >= canales[1];
}), 'las celdas con conteo usan una escala índigo–lavanda');
comprobar(contenido.heat.every((c) => !esProhibido(rgb(c.fondo))), 'ninguna celda usa naranja de incidentes ni morado ferroviario');
const contrasteHeat = Math.min(...contenido.heat.map((c) => contraste(c.color, c.fondo)));
comprobar(contrasteHeat >= 4.5, `las cifras de la matriz cumplen AA (mínimo ${contrasteHeat.toFixed(2)}:1)`);
const totalesFila = contenido.resumen.heatTotales.filter((t) => t.tipo === 'fila');
const totalesColumna = contenido.resumen.heatTotales.filter((t) => t.tipo === 'columna');
const totalBase = contenido.resumen.heatTotales.find((t) => t.tipo === 'base');
comprobar(totalesFila.length === 6 && totalesFila.every((t) => num(t.texto) === filasEsperadas[t.edad]), `los totales por fila concilian con los conteos (${totalesFila.map((t) => `${t.edad} ${t.texto}`).join(' · ')})`);
comprobar(totalesColumna.length === 4 && totalesColumna.every((t) => num(t.texto) === columnasEsperadas[t.sexo]), `los totales por columna concilian con los conteos (${totalesColumna.map((t) => `${t.sexo} ${t.texto}`).join(' · ')})`);
comprobar(!!totalBase && num(totalBase.texto) === totalEsperado && totalEsperado === RD.total_source_rows, `el total general concilia con la base (${totalBase?.texto} = ${nf.format(RD.total_source_rows)})`);
comprobar(/reconcilian con 40,800 filas/.test(contenido.heatReconciliacion) && /No especificado/.test(contenido.heatReconciliacion), 'la nota declara la conciliación de filas y columnas');
comprobar(/No especificado/.test(contenido.heatLegend) && /0 = ninguna fila/.test(contenido.heatLegend) && /Menos filas/.test(contenido.heatLegend) && /Más filas/.test(contenido.heatLegend), 'la leyenda explica escala, gris y cero');
comprobar(/no es una proporción de la población migrante/i.test(contenido.heatNote) && /índigo–lavanda/i.test(contenido.heatNote), 'la nota de conteos declara que no es una proporción poblacional');
comprobar(contenido.heatTabla.summaryTransform === 'uppercase' && contenido.heatTabla.headerBg === 'rgb(246, 248, 253)', 'la tabla de la matriz usa el encabezado del mapa');
comprobar(contenido.heatTablaFilas === 35, `la tabla accesible incluye celdas y totales (${contenido.heatTablaFilas} filas)`);

/* 3b · composición dentro del grupo de edad */
await pagina.locator('#redodemAgeGender [data-vista="composicion"]').click();
await pagina.waitForTimeout(350);
const composicion = await pagina.evaluate(() => {
  const cells = [...document.querySelectorAll('#redodemAgeGender .heat-cell:not(.heat-cell--total)')].map((n) => ({
    edad: n.dataset.edad || '', sexo: n.dataset.sexo || '', valor: Number(n.dataset.valor || 0), texto: n.textContent.trim(), title: n.getAttribute('title') || '',
  }));
  const totales = [...document.querySelectorAll('#redodemAgeGender .heat-cell--total')].map((n) => ({ tipo: n.dataset.total || '', edad: n.dataset.edad || '', sexo: n.dataset.sexo || '', texto: n.textContent.trim() }));
  return {
    activo: document.querySelector('#redodemAgeGender [data-vista="composicion"]').getAttribute('aria-pressed'),
    cells,
    totales,
    note: document.querySelector('#redodemAgeGender .bubble-note')?.textContent.replace(/\s+/g, ' ').trim() || '',
    legend: document.querySelector('#redodemAgeGender .heat-legend')?.innerText.replace(/\s+/g, ' ').trim() || '',
  };
});
const primera = composicion.cells.find((c) => c.edad === 'Niñxs' && c.sexo === 'Hombre');
comprobar(composicion.activo === 'true' && primera?.texto === pctEsperado(primera.valor, filasEsperadas['Niñxs']), `Composición calcula el porcentaje con el total de la fila (${primera?.texto})`);
comprobar(composicion.cells.every((c) => c.texto === pctEsperado(c.valor, filasEsperadas[c.edad])), 'todas las celdas de composición usan el total de su grupo de edad');
comprobar(/de 6,768 filas del grupo/.test(primera?.title || ''), 'el tooltip de composición declara el denominador de la fila');
comprobar(/denominador el total de registros de su grupo de edad/.test(composicion.note) && /No es una proporción de la población migrante/.test(composicion.note) && /fila «Total» permanece en filas absolutas/.test(composicion.note), 'la nota de composición declara denominador, límite y totales');
comprobar(/Menor %/.test(composicion.legend) && /Mayor %/.test(composicion.legend), 'la leyenda cambia a porcentajes en composición');
comprobar(composicion.totales.filter((t) => t.tipo === 'fila').every((t) => t.texto === '100,0 %') && composicion.totales.filter((t) => t.tipo === 'columna').every((t) => num(t.texto) === columnasEsperadas[t.sexo]), 'la columna Total muestra 100 % del grupo y la fila Total sigue en filas');
await pagina.locator('#redodemAgeGender').screenshot({ path: path.join(SALIDA, 'panorama-composicion.png'), animations: 'disabled' });

/* 3c · teclado y vuelta a conteos */
await pagina.locator('#redodemAgeGender [data-vista="composicion"]').focus();
await pagina.keyboard.press('Home');
await pagina.waitForTimeout(300);
const vuelta = await pagina.evaluate(() => ({
  activo: document.querySelector('#redodemAgeGender [data-vista="conteos"]').getAttribute('aria-pressed'),
  primera: document.querySelector('#redodemAgeGender .heat-cell:not(.heat-cell--total)')?.textContent.trim() || '',
  leyenda: document.querySelector('#redodemAgeGender .heat-legend')?.innerText.replace(/\s+/g, ' ').trim() || '',
}));
comprobar(vuelta.activo === 'true' && vuelta.primera === '3,436' && /Menos filas/.test(vuelta.leyenda), 'Home devuelve a Conteos y restaura los valores absolutos');

/* 4 · país y destino */
comprobar(contenido.origen.w === contenido.destino.w && contenido.origen.h === contenido.destino.h && contenido.origen.h === 340, `país y destino comparten lienzo (${contenido.origen.w}×${contenido.origen.h} · ${contenido.destino.w}×${contenido.destino.h})`);
const origenOtros = contenido.origen.nodos.find((n) => /^Otros/.test(n.etiqueta));
const destinoOtros = contenido.destino.nodos.find((n) => /^Otros/.test(n.etiqueta));
comprobar(origenOtros?.fill === '#C9C1DE' && origenOtros?.texto === '#28344A', 'origen: «Otros» en lavanda con texto oscuro');
comprobar(destinoOtros?.fill === '#C9C1DE' && destinoOtros?.texto === '#28344A', 'destino: «Otros» en lavanda con texto oscuro');
comprobar(contenido.origen.nodos.filter((n) => !/^Otros/.test(n.etiqueta)).every((n) => n.fill === '#4B55FF' && n.texto === '#FFFFFF'), 'origen: categorías en índigo con texto blanco');
comprobar(contenido.destino.nodos.filter((n) => !/^Otros/.test(n.etiqueta)).every((n) => n.fill === '#4B55FF' && n.texto === '#FFFFFF'), 'destino: categorías en índigo con texto blanco');
comprobar([...contenido.origen.nodos, ...contenido.destino.nodos].every((n) => !esProhibido(colorDe(n.fill))), 'país y destino no usan naranja ni morado ferroviario');
comprobar(contenido.origen.leyendas.join(' ').includes('Categoría del campo') && contenido.origen.leyendas.join(' ').includes('Agrupación «Otros»'), 'origen: la leyenda distingue categoría y agrupación');
comprobar(contenido.destino.leyendas.join(' ').includes('Categoría con destino') && contenido.destino.leyendas.join(' ').includes('Agrupación «Otros»'), 'destino: la leyenda distingue categoría y agrupación');
comprobar(/Cómo leer la gráfica/i.test(contenido.origen.guia) && /Cómo leer la gráfica/i.test(contenido.destino.guia), 'país y destino comparten la guía de lectura');
comprobar(contenido.origen.tablaFilas === 9 && contenido.destino.tablaFilas === 9, `las tablas conservan categorías y faltantes (${contenido.origen.tablaFilas} · ${contenido.destino.tablaFilas})`);

/* 5 · EAAF: grupos editoriales, cortes y unidades */
comprobar(contenido.eaaf.grupos === 2 && contenido.eaaf.indicadores === 5, `la comparación agrupa cinco indicadores en dos cortes (${contenido.eaaf.grupos} grupos)`);
comprobar(contenido.eaaf.timelineRows === 0 && contenido.eaaf.timelineMarks === 0, 'la comparación ya no usa puntos ni líneas de una supuesta evolución');
comprobar(contenido.eaaf.gruposFecha.some((f) => /Reporte · 28 feb 2025/.test(f)) && contenido.eaaf.gruposFecha.some((f) => /Comunicado · 14 ago 2026/.test(f)), `los grupos declaran fuente y fecha (${contenido.eaaf.gruposFecha.join(' · ')})`);
comprobar(contenido.eaaf.fuentes.length === 5 && contenido.eaaf.fuentes.every((f) => /Corte (28 feb 2025|14 ago 2026)/.test(f) && /EAAF/.test(f)), 'cada indicador declara su corte y su fuente');
comprobar(contenido.eaaf.cifras.some((v) => /2,351 casos/.test(v)) && contenido.eaaf.cifras.some((v) => /2,240 familias/.test(v)) && contenido.eaaf.cifras.some((v) => /6,000 perfiles/.test(v)) && contenido.eaaf.cifras.some((v) => />2,500 casos/.test(v)) && contenido.eaaf.cifras.some((v) => />490 personas/.test(v)), 'las cifras, unidades y signos > se conservan');
comprobar(/agregados independientes y no etapas de un mismo proceso/.test(contenido.eaaf.nota), 'la nota declara que los indicadores son agregados independientes');
comprobar(/Cortes/i.test(contenido.eaaf.meta) && /no sumables/i.test(contenido.eaaf.meta) && /unidad, corte y fuente/i.test(contenido.eaaf.notaBloque), 'la comparación conserva cortes, unidades y revisión');
comprobar(contenido.eaaf.tablaFilas === 5, `la tabla accesible conserva los cinco indicadores (${contenido.eaaf.tablaFilas})`);
comprobar(contenido.eaaf.cifraColor === 'rgb(75, 85, 255)', `las cifras EAAF usan el índigo del tablero (${contenido.eaaf.cifraColor})`);
comprobar(!esProhibido(rgb(contenido.eaaf.cifraColor)), 'las cifras EAAF no usan naranja ni morado ferroviario');

/* 6 · lenguaje compartido: notas, tablas y controles */
comprobar(contenido.notas.unitBorder === 'rgb(75, 85, 255)' && contenido.notas.unitBg === 'rgb(244, 246, 253)', 'las notas de fuente usan el tratamiento del mapa');
comprobar(contenido.notas.cannotBorder === 'rgb(137, 147, 162)' && contenido.notas.traceBorder === 'rgb(75, 85, 255)', 'las limitaciones usan el gris del mapa y la trazabilidad el índigo');
comprobar(contenido.heatTabla.summaryColor === 'rgb(85, 98, 124)' && parseFloat(contenido.heatTabla.summarySize) === 10, 'los resúmenes de tabla usan la etiqueta pequeña del mapa');
comprobar(contenido.origenTabla.headerBg === 'rgb(246, 248, 253)' && contenido.destinoTabla.headerBg === 'rgb(246, 248, 253)', 'las tablas de país y destino comparten encabezado');
comprobar(contenido.calendarios.panorama === 0 && !contenido.calendarios.titulo, 'Panorama sigue sin calendarios de fechas');

/* 7 · tooltip del mapa aplicado a las burbujas */
await pagina.locator('#redodemDestination .bv-circulo[data-cat="Estados Unidos"]').hover();
await pagina.waitForTimeout(350);
const tooltip = await pagina.locator('#redodemDestination .bv-tooltip').evaluate((n) => ({
  visible: !n.hidden,
  fondo: getComputedStyle(n).backgroundColor,
  color: getComputedStyle(n).color,
  texto: n.innerText.replace(/\s+/g, ' ').trim(),
}));
comprobar(tooltip.visible && /Estados Unidos/.test(tooltip.texto) && /4,959/.test(tooltip.texto), `el tooltip conserva conteo y denominador (${tooltip.texto.slice(0, 70)}…)`);
comprobar(tooltip.fondo === 'rgb(32, 43, 64)' && tooltip.color === 'rgb(255, 255, 255)' && contraste(tooltip.color, tooltip.fondo) >= 4.5, 'el tooltip de las burbujas usa el fondo oscuro y el contraste del mapa');
await pagina.locator('#redodemDestination').screenshot({ path: path.join(SALIDA, 'panorama-unificado-tooltip.png'), animations: 'disabled' }).catch(() => {});
await pagina.mouse.move(2, 1200);
await pagina.waitForTimeout(250);

await pagina.locator('#panorama .profile-section').screenshot({ path: path.join(SALIDA, 'panorama-unificado-perfiles.png'), animations: 'disabled' });
await pagina.locator('#panorama .eaaf-block').screenshot({ path: path.join(SALIDA, 'panorama-unificado-eaaf.png'), animations: 'disabled' });
await pagina.locator('#redodemAgeGender .chart-table summary').click();
await pagina.waitForTimeout(250);
await pagina.locator('#redodemAgeGender').screenshot({ path: path.join(SALIDA, 'panorama-unificado-tabla.png'), animations: 'disabled' });

/* El detalle conserva «No especificado» en gris, también dentro de las burbujas. */
await pagina.locator('#panorama .redodem-vistas[data-vistas="origen"] [data-vista="edad"]').click();
await pagina.waitForTimeout(300);
await pagina.locator('#redodemOrigin .bv-circulo[data-cat="Honduras"]').click({ force: true });
await pagina.waitForTimeout(700);
const detalleGris = await pagina.evaluate(() => {
  const c = document.querySelector('#origenDetalleChart .bv-circulo[data-cat="No especificado"]');
  return {
    fill: (c?.getAttribute('fill') || '').toUpperCase(),
    texto: (c?.parentElement.querySelector('text')?.getAttribute('fill') || '').toUpperCase(),
    leyenda: document.querySelector('#origenDetalleChart .bv-leyendas')?.innerText.replace(/\s+/g, ' ') || '',
  };
});
comprobar(detalleGris.fill === '#DFE3EA' && detalleGris.texto === '#28344A' && /No especificado/i.test(detalleGris.leyenda), 'el desglose conserva «No especificado» en gris y con texto oscuro');

/* 8 · móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`390 JS: ${e.message}`));
movil.on('console', (m) => { if (m.type() === 'error') errores.push(`390 consola: ${m.text()}`); });
await movil.goto(URL, { waitUntil: 'load' });
await movil.waitForTimeout(2300);
const movilDatos = await movil.evaluate(() => {
  const panel = (id) => {
    const svg = document.querySelector(`#${id} svg.bv-svg`);
    return svg ? { w: Math.round(svg.getBoundingClientRect().width), h: Math.round(svg.getBoundingClientRect().height) } : null;
  };
  const heat = document.querySelector('#redodemAgeGender .redodem-heat');
  const eaaf = document.querySelector('#eaafTimeline .eaaf-grupos');
  return {
    desborde: document.documentElement.scrollWidth - window.innerWidth,
    primero: document.querySelector('#panorama')?.firstElementChild?.id || '',
    scope: document.querySelector('#redodemSummary .scope-title')?.textContent.trim() || '',
    title: document.querySelector('#edadTitulo')?.textContent.trim() || '',
    heat: heat ? { w: Math.round(heat.getBoundingClientRect().width), scroll: heat.scrollWidth - heat.clientWidth } : null,
    heatCeldas: document.querySelectorAll('#redodemAgeGender .heat-cell:not(.heat-cell--total)').length,
    heatTotales: document.querySelectorAll('#redodemAgeGender .heat-cell--total').length,
    origen: panel('redodemOrigin'),
    destino: panel('redodemDestination'),
    eaaf: eaaf ? { w: Math.round(eaaf.getBoundingClientRect().width), scroll: eaaf.scrollWidth - eaaf.clientWidth } : null,
    eaafGrupos: document.querySelectorAll('#eaafTimeline .eaaf-grupo').length,
    calendarios: document.querySelectorAll('#panorama #calendarPanels, #panorama .calendar-source, #panorama .month-cell').length,
  };
});
comprobar(movilDatos.desborde <= 0, `390px: sin desbordamiento de página (${movilDatos.desborde})`);
comprobar(movilDatos.primero === 'geoCard', '390px: el mapa sigue abriendo Panorama');
comprobar(movilDatos.calendarios === 0, '390px: Panorama sigue sin calendarios');
comprobar(/Base analizada: 40,800 registros REDODEM · 2023–2024/.test(movilDatos.scope), '390px: la nota de alcance se mantiene legible');
comprobar(movilDatos.heatCeldas === 24 && movilDatos.heatTotales === 11, `390px: la matriz conserva celdas y totales (${movilDatos.heatCeldas} + ${movilDatos.heatTotales})`);
comprobar(movilDatos.eaafGrupos === 2, `390px: los dos bloques EAAF se mantienen (${movilDatos.eaafGrupos})`);
comprobar(movilDatos.heat && movilDatos.heat.scroll <= 0, `390px: la matriz cabe en su tarjeta (${movilDatos.heat?.scroll} px de exceso)`);
comprobar(movilDatos.origen?.h === 340 && movilDatos.destino?.h === 340 && movilDatos.origen?.w === movilDatos.destino?.w, `390px: país y destino conservan el mismo lienzo (${movilDatos.origen?.w}×${movilDatos.origen?.h})`);
comprobar(movilDatos.eaaf && movilDatos.eaaf.scroll <= 0, `390px: la comparación EAAF cabe en su tarjeta (${movilDatos.eaaf?.scroll} px de exceso)`);
await movil.locator('#panorama .profile-section').screenshot({ path: path.join(SALIDA, 'panorama-unificado-movil.png'), animations: 'disabled' });
await movil.locator('#redodemAgeGender [data-vista="composicion"]').click();
await movil.waitForTimeout(350);
const movilComposicion = await movil.evaluate(() => {
  const heat = document.querySelector('#redodemAgeGender .redodem-heat');
  return {
    desborde: document.documentElement.scrollWidth - window.innerWidth,
    scroll: heat ? heat.scrollWidth - heat.clientWidth : null,
    primera: document.querySelector('#redodemAgeGender .heat-cell:not(.heat-cell--total)')?.textContent.trim() || '',
    activo: document.querySelector('#redodemAgeGender [data-vista="composicion"]').getAttribute('aria-pressed'),
  };
});
comprobar(movilComposicion.desborde <= 0 && movilComposicion.scroll <= 0 && movilComposicion.activo === 'true' && /%$/.test(movilComposicion.primera), `390px: la composición cabe y muestra porcentajes (${movilComposicion.primera}, ${movilComposicion.scroll} px)`);
await movil.locator('#redodemAgeGender').screenshot({ path: path.join(SALIDA, 'panorama-composicion-movil.png'), animations: 'disabled' });
await movil.close();

comprobar(respuestas.length === 0, `sin respuestas 4xx/5xx (${respuestas.slice(0, 3).join(' · ') || 'ninguna'})`);
await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores de consola:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;
