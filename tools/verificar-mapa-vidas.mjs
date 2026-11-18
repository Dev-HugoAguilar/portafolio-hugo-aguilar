/**
 * Verificación del mapa de «Vidas en tránsito» sobre el build servido.
 *
 * Cubre la composición cartográfica y las capas con datos:
 *   · red ferroviaria oficial (ARTF · IDE, 809 tramos; 270 de Ferromex por el campo ENTIDAD),
 *   · tránsito migrante documentado (INM 2023, 13 zonas estatales),
 *   · corredor generalizado de OIM DTM e incidentes ICIJ/CLIP.
 * Comprueba geometría servida y sus hashes, controles y filtros, fichas por ratón,
 * teclado y lista sin mapa, capas conmutables, textos de fuente/límite, móvil.
 *
 *   node tools/verificar-mapa-vidas.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'vidas-en-transito');
const BASE = 'http://127.0.0.1:8000/dashboards/vidas-en-transito/';
const DIRECTO = `${BASE}index.html`;

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(SALIDA, { recursive: true });
const ok = [];
const fallos = [];
const comprobar = (condicion, mensaje) => (condicion ? ok : fallos).push(mensaje);

/* ------------------------------------------------ 0. geometría servida */
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const descargar = async (nombre) => {
  const respuesta = await fetch(BASE + 'geografia/' + nombre);
  if (!respuesta.ok) throw new Error(`${respuesta.status} ${nombre}`);
  return Buffer.from(await respuesta.arrayBuffer());
};
const hashesEsperados = {
  'ferroviaria.geojson': '1c4af1d0aa5d74014af1994cf9c6cc54d7fb67563c87b806d9fde039ebe57d8c',
  'evidencia_transito.geojson': '314ab5ada5cee301ecbaa9045800791f363c19ca953bb7a13f918aef87e34dc2',
  'corredor.geojson': 'ebf8a2a2c19ff4acbfb1eb060bf3597cc4b780fe87de5547e424f13a8221eeca',
  'paises.geojson': '6325e36b0a8d404a9a9d1045d73445b2c36ad37b830735345bb89736f4dc9da8',
};
const geo = {};
for (const [nombre, esperado] of Object.entries(hashesEsperados)) {
  const buffer = await descargar(nombre);
  geo[nombre] = { buffer, hash: sha256(buffer), esperado };
}
comprobar(
  Object.values(geo).every((g) => g.hash === g.esperado),
  `geometría servida idéntica a la registrada (SHA-256): ${Object.entries(geo).map(([n, g]) => `${n.slice(0, 12)}… ${g.hash.slice(0, 8)}`).join(' · ')}`,
);

const ferroGeo = JSON.parse(geo['ferroviaria.geojson'].buffer.toString('utf8'));
const zonasGeo = JSON.parse(geo['evidencia_transito.geojson'].buffer.toString('utf8'));
const bboxDe = (features) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const recorrer = (c) => {
    if (typeof c[0] === 'number') {
      x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]);
      x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]);
    } else c.forEach(recorrer);
  };
  features.forEach((f) => recorrer(f.geometry.coordinates));
  return [x0.toFixed(4), y0.toFixed(4), x1.toFixed(4), y1.toFixed(4)].map(Number);
};
const bboxFerro = bboxDe(ferroGeo.features);
const bboxZonas = bboxDe(zonasGeo.features);
const operadores = ferroGeo.features.reduce((acc, f) => {
  const clave = f.properties.operador || 'sin dato';
  acc[clave] = (acc[clave] || 0) + 1;
  return acc;
}, {});
const vertices = ferroGeo.features.reduce((total, f) => {
  const lineas = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
  return total + lineas.reduce((suma, l) => suma + l.length, 0);
}, 0);
const estadosZona = zonasGeo.features.map((f) => f.properties.estado).sort();
const inmEsperados = ['Aguascalientes', 'Chihuahua', 'Coahuila', 'Durango', 'Guanajuato', 'Hidalgo', 'México', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Tlaxcala', 'Veracruz'].sort();

comprobar(ferroGeo.features.length === 809 && ferroGeo.features.every((f) => f.geometry.type === 'LineString'), `red ferroviaria: ${ferroGeo.features.length} entidades LineString, ${vertices.toLocaleString('es-MX')} vértices`);
comprobar(operadores.Ferromex === 270, `Ferromex por el campo ENTIDAD: ${operadores.Ferromex} tramos (${Object.entries(operadores).map(([k, v]) => `${k} ${v}`).join(' · ')})`);
comprobar(bboxFerro[0] > -118.7 && bboxFerro[2] < -86.6 && bboxFerro[1] > 14.4 && bboxFerro[3] < 32.8, `extensión ferroviaria dentro de México: ${bboxFerro.join(' , ')}`);
comprobar(zonasGeo.features.length === 13 && estadosZona.join('|') === inmEsperados.join('|'), `zonas del INM: ${zonasGeo.features.length} estados (${estadosZona.join(', ')})`);
comprobar(bboxZonas[0] > -118.7 && bboxZonas[2] < -86.6 && bboxZonas[1] > 14.4 && bboxZonas[3] < 32.8, `extensión de las zonas dentro de México: ${bboxZonas.join(' , ')}`);
comprobar(new Set(zonasGeo.features.map((f) => f.properties.periodo)).size === 1 && zonasGeo.features.every((f) => f.properties.periodo === '2023') && zonasGeo.metadata.fuentes.length === 2 && /No son trayectos/.test(zonasGeo.metadata.descripcion), 'las 13 zonas declaran período 2023, dos comunicados del INM y que no son trayectos');

const metaFerro = JSON.parse((await descargar('ferroviaria.json')).toString('utf8'));
comprobar(metaFerro.fuente.nombre === 'Vías ferroviarias' && /CC BY 4\.0/.test(metaFerro.fuente.licencia) && metaFerro.fuente.descargado === '2026-11-13' && metaFerro.fuente.actualizacion_datos.max === '2023-08-14', `metadatos de la capa: «${metaFerro.fuente.nombre}», ${metaFerro.fuente.licencia}, descarga ${metaFerro.fuente.descargado}, datos hasta ${metaFerro.fuente.actualizacion_datos.max}`);
comprobar(metaFerro.resumen.ferromex.tramos === 270 && metaFerro.resumen.ferromex.campo === 'ENTIDAD', `Ferromex documentado en metadatos: campo ${metaFerro.resumen.ferromex.campo}, ${metaFerro.resumen.ferromex.tramos} tramos`);
comprobar(metaFerro.attrapi && metaFerro.attrapi.estado === 'no incorporada' && /403/.test(JSON.stringify(metaFerro.attrapi)), 'el SHP de ATTRAPI 2025 queda registrado como no incorporado (HTTP 403)');

/* ------------------------------------------------------- navegador */
const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-MX' });
const pagina = await contexto.newPage();
const errores = [];
const red = [];
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 200)); });
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message.slice(0, 200)));
pagina.on('response', (r) => { if (r.status() >= 400) red.push(`${r.status()} ${r.url()}`); });
pagina.on('requestfailed', (r) => red.push(`fallo ${r.url()}`));

await pagina.goto(DIRECTO, { waitUntil: 'load' });
await pagina.waitForSelector('.geo-svg-ferro-g', { timeout: 60_000 });
await pagina.waitForSelector('.geo-svg-zona-g', { timeout: 60_000 });
await pagina.evaluate(() => document.getElementById('geoMap').scrollIntoView({ block: 'center' }));
await pagina.waitForTimeout(700);

const leerFicha = () => pagina.evaluate(() => ({
  titulo: document.getElementById('geoDetailTitle').textContent.trim(),
  texto: document.getElementById('geoDetail').innerText.replace(/\s+/g, ' ').trim(),
  encabezado: document.querySelector('#geoDetail p b')?.textContent.trim() || '',
  activos: [...document.querySelectorAll('#geoMap .is-activo')].map((n) => ({
    tramo: n.getAttribute('data-tramo'),
    paso: n.getAttribute('data-paso'),
    incidente: n.getAttribute('data-incidente'),
    ferroviaria: n.getAttribute('data-ferroviaria'),
    evidencia: n.getAttribute('data-evidencia'),
    pressed: n.getAttribute('aria-pressed'),
  })),
  limpiarVisible: !document.getElementById('geoClear').hidden,
}));

/**
 * Busca un punto del trazo o del polígono que el navegador atribuya a esa entidad
 * (el elemento superior en ese píxel pertenece al grupo buscado), para no depender
 * de que el centro de la caja caiga sobre la línea.
 */
const puntoDeCapa = (grupoSel, trazoSel, atributo, limite = 40) => pagina.evaluate(({ grupoSel, trazoSel, atributo, limite }) => {
  const mapa = document.getElementById('geoMap').getBoundingClientRect();
  const fracciones = [0.5, 0.36, 0.62, 0.24, 0.74, 0.14, 0.86, 0.44, 0.56, 0.06, 0.94];
  for (const grupo of [...document.querySelectorAll(grupoSel)].slice(0, limite)) {
    const trazo = grupo.querySelector(trazoSel);
    if (!trazo || !trazo.getTotalLength) continue;
    const largo = trazo.getTotalLength();
    if (!largo) continue;
    const m = trazo.getScreenCTM();
    for (const f of fracciones) {
      const pt = trazo.getPointAtLength(largo * f);
      const x = m.a * pt.x + m.c * pt.y + m.e;
      const y = m.b * pt.x + m.d * pt.y + m.f;
      if (x < mapa.left + 6 || x > mapa.right - 6 || y < mapa.top + 6 || y > mapa.bottom - 6) continue;
      const arriba = document.elementFromPoint(x, y);
      if (arriba && arriba.closest(`[${atributo}]`) === grupo) return { x, y, id: Number(grupo.getAttribute(atributo)) };
    }
  }
  return null;
}, { grupoSel, trazoSel, atributo, limite });

/* ------------------------------------------------------- 1. composición */
const estructura = await pagina.evaluate(() => {
  const svg = document.getElementById('geoMap');
  const caja = svg.getBoundingClientRect();
  const css = (sel) => getComputedStyle(document.querySelector(sel));
  return {
    mapa: { w: Math.round(caja.width), h: Math.round(caja.height) },
    viewBox: svg.getAttribute('viewBox'),
    paises: document.querySelectorAll('.geo-svg-pais').length,
    etiquetas: [...document.querySelectorAll('.geo-svg-etiqueta')].map((n) => n.textContent),
    graticula: document.querySelectorAll('.geo-svg-graticula').length,
    tramos: document.querySelectorAll('.geo-svg-tramo-g').length,
    pasos: document.querySelectorAll('.geo-svg-paso').length,
    incidentes: document.querySelectorAll('.geo-svg-incidente-g').length,
    ferroviaria: document.querySelectorAll('.geo-svg-ferro-g').length,
    ferromex: document.querySelectorAll('.geo-svg-ferro-g.is-ferromex').length,
    sinUso: document.querySelectorAll('.geo-svg-ferro-g.is-sin-uso').length,
    zonas: document.querySelectorAll('.geo-svg-zona-g').length,
    divisiones: document.querySelectorAll('.geo-svg-estado').length,
    columnas: css('.geo-grid').gridTemplateColumns,
    ladoAncho: Math.round(document.querySelector('.geo-side').getBoundingClientRect().width),
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    filasLista: document.querySelectorAll('#geoLista tbody tr').length,
    filasFerroDuplicada: Boolean(document.getElementById('geoListaFerro')),
    anchoTramo: css('.geo-svg-tramo').strokeWidth,
    anchoHit: Number(document.querySelector('.geo-svg-hit').getAttribute('stroke-width')),
    radioPunto: Number(document.querySelector('.geo-svg-incidente').getAttribute('r')),
    radioHitPunto: Number(document.querySelector('.geo-svg-incidente-hit').getAttribute('r')),
    anchoHitFerro: Number(document.querySelector('.geo-svg-hit-ferro').getAttribute('stroke-width')),
    dentroDelMapa: (() => {
      const dentro = [...document.querySelectorAll('.geo-svg-ferro-g .geo-svg-ferroviaria')].every((p) => {
        const d = p.getAttribute('d') || '';
        const b = p.getBBox();
        return d.length > 10 && (b.width > 0 || b.height > 0);
      });
      return { dentro };
    })(),
  };
});

comprobar(estructura.mapa.w > 820 && estructura.mapa.h > 600, `mapa amplio: ${estructura.mapa.w}×${estructura.mapa.h} px en el panel principal`);
comprobar(estructura.columnas.split(' ').length === 2 && estructura.mapa.w / (estructura.mapa.w + estructura.ladoAncho) > 0.62, `mapa cerca de dos tercios del ancho disponible (${estructura.mapa.w} px de ${estructura.mapa.w + estructura.ladoAncho} px)`);
comprobar(estructura.viewBox === '0 0 1080 780', `lienzo cartográfico 1080×780 (${estructura.viewBox})`);
comprobar(estructura.paises === 10, `geografía real con 10 países (${estructura.paises})`);
comprobar(estructura.etiquetas.length >= 8 && estructura.etiquetas.includes('MÉXICO'), `nombres de países legibles (${estructura.etiquetas.length})`);
comprobar(estructura.graticula > 0, `retícula discreta presente (${estructura.graticula} líneas)`);
comprobar(estructura.tramos === 5 && estructura.pasos === 6, 'corredor OIM: 5 tramos y 6 nodos de secuencia');
comprobar(estructura.incidentes === 148, `incidentes ICIJ/CLIP dibujados: ${estructura.incidentes}`);
comprobar(estructura.ferroviaria === 809, `red ferroviaria dibujada: ${estructura.ferroviaria} tramos`);
comprobar(estructura.ferromex === 270, `Ferromex diferenciado en el mapa: ${estructura.ferromex} tramos`);
comprobar(estructura.sinUso > 0 && estructura.sinUso < estructura.ferroviaria, `tramos sin uso con estilo discontinuo: ${estructura.sinUso}`);
comprobar(estructura.zonas === 13, `zonas documentadas dibujadas: ${estructura.zonas}`);
comprobar(estructura.divisiones === 32, `divisiones estatales dibujadas: ${estructura.divisiones}`);
comprobar(estructura.anchoTramo === '3.2px', `corredor fino sobre las vías (${estructura.anchoTramo})`);
comprobar(estructura.radioPunto >= 2.5 && estructura.radioPunto <= 9, `símbolo puntual moderado (r=${estructura.radioPunto.toFixed(1)})`);
comprobar(estructura.radioHitPunto >= estructura.radioPunto * 2 && estructura.anchoHit >= 18 && estructura.anchoHitFerro >= 8, 'áreas de interacción amplias en puntos, corredor y vías');
comprobar(estructura.dentroDelMapa.dentro, 'cada uno de los 809 tramos tiene geometría dibujada no vacía');
comprobar(estructura.desborde <= 0, 'sin desbordamiento horizontal en escritorio');

const jerarquia = await pagina.evaluate(() => {
  const rect = (s) => document.querySelector(s)?.getBoundingClientRect();
  const mapa = rect('.geo-frame');
  const mapaCol = rect('.geo-main');
  const leyenda = rect('.geo-legend-panel');
  const fuentes = rect('.geo-sources');
  const tabla = rect('.geo-table-panel');
  const lado = rect('.geo-side');
  const normal = (s) => (s || '').replace(/\s+/g, ' ').trim();
  return {
    titulo: normal(document.getElementById('geoTitle')?.textContent),
    descripcion: normal(document.querySelector('.geo-lede')?.textContent),
    titulos: document.querySelectorAll('#geoTitle').length,
    descripciones: (document.body.innerText.match(/El mapa reúne cuatro capas de evidencia/g) || []).length,
    leyendaAncho: Math.round(leyenda.width),
    mapaAncho: Math.round(mapa.width),
    leyendaDespues: leyenda.top >= mapa.bottom - 1,
    fuentesDespues: fuentes.top >= leyenda.bottom - 1,
    tablaDespues: tabla.top >= fuentes.bottom - 1,
    ladoArriba: Math.abs(lado.top - mapaCol.top) <= 2,
    fuentesCerradas: !document.querySelector('.geo-sources').open,
    resumenTabla: normal(document.querySelector('.geo-table-panel summary')?.textContent),
    enLado: Boolean(document.querySelector('.geo-side .geo-layers')),
    leyendaFueraLado: !document.querySelector('.geo-side .geo-legend'),
    fuentesFueraLado: !document.querySelector('.geo-side .geo-sources'),
  };
});
comprobar(jerarquia.titulo === 'Corredor, ferrocarril e incidentes documentados', `título cartográfico exacto («${jerarquia.titulo}»)`);
comprobar(jerarquia.titulos === 1 && jerarquia.descripciones === 1, 'el encabezado y la descripción no se repiten en la sección');
comprobar(jerarquia.descripcion === 'El mapa reúne cuatro capas de evidencia: el corredor centroamericano generalizado descrito por OIM DTM; incidentes de transporte con coordenadas documentados por ICIJ/CLIP; infraestructura ferroviaria oficial de ARTF/IDE; y zonas estatales que el INM relacionó con el uso migrante del tren en 2023. Las capas tienen escalas, periodos y unidades distintos. Su superposición ofrece contexto geográfico; no demuestra que una persona haya recorrido una vía ni establece causalidad.', 'la descripción del mapa es la solicitada y no se repite');
comprobar(jerarquia.leyendaDespues && Math.abs(jerarquia.leyendaAncho - jerarquia.mapaAncho) <= 4, `leyenda inmediatamente debajo del mapa y dentro de su ancho (${jerarquia.leyendaAncho}/${jerarquia.mapaAncho})`);
comprobar(jerarquia.fuentesDespues && jerarquia.tablaDespues && jerarquia.fuentesCerradas, 'fuentes plegadas debajo de la leyenda y tabla debajo de las fuentes');
comprobar(jerarquia.ladoArriba && jerarquia.enLado && jerarquia.leyendaFueraLado && jerarquia.fuentesFueraLado, 'capas y filtros en el panel lateral; leyenda y fuentes fuera de él');
comprobar(jerarquia.resumenTabla === 'Explorar datos en tabla', `tabla accesible rotulada «${jerarquia.resumenTabla}»`);
comprobar(estructura.filasLista === 981, `tabla única: ${estructura.filasLista} elementos (5 tramos + 6 pasos + 13 zonas + 148 incidentes + 809 vías)`);
comprobar(!estructura.filasFerroDuplicada, 'la tabla ferroviaria separada se integró en «Explorar datos en tabla»');

const estilosMapa = await pagina.evaluate(() => {
  const cs = (sel) => getComputedStyle(document.querySelector(sel));
  return {
    mar: cs('.geo-svg-mar').fill,
    pais: cs('.geo-svg-pais').fill,
    zona: cs('.geo-svg-zona').fill,
    estado: cs('.geo-svg-estado').stroke,
    incidente: cs('.geo-svg-incidente').fill,
    incidenteLeyenda: cs('.incidentes-punto').backgroundColor,
    texto: (document.querySelector('.geo-main').innerText + ' ' + document.querySelector('.geo-legend').innerText).replace(/\s+/g, ' '),
  };
});
comprobar(estilosMapa.mar === 'rgb(255, 255, 255)' && estilosMapa.pais === 'rgb(255, 255, 255)', 'fondo y países en blanco');
comprobar(estilosMapa.zona === 'rgb(232, 234, 237)', `zonas del INM en gris claro (${estilosMapa.zona})`);
comprobar(estilosMapa.estado === 'rgb(137, 147, 162)', `divisiones estatales en gris medio (${estilosMapa.estado})`);
comprobar(estilosMapa.incidente === 'rgb(217, 106, 43)' && estilosMapa.incidenteLeyenda === 'rgb(217, 106, 43)', `incidentes y su clave comparten naranja (${estilosMapa.incidente})`);
comprobar(!/\b148\b|\b809\b|\b270\b|\b172\b/.test(estilosMapa.texto), 'sin conteos en el área del mapa, controles ni leyenda');

/* -------------------------------------------------------------- 2. capas */
const panelCapas = await pagina.evaluate(() => ({
  boton: Boolean(document.getElementById('geoCapasBoton')),
  panel: Boolean(document.getElementById('geoCapasPanel')),
  hidden: document.getElementById('geoCapasPanel')?.hidden,
  expandido: document.getElementById('geoCapasBoton')?.getAttribute('aria-expanded'),
}));
comprobar(panelCapas.boton && panelCapas.panel && !panelCapas.hidden && panelCapas.expandido === 'true', 'el panel «Capas y filtros» está abierto en escritorio');
const panelAbierto = await pagina.evaluate(() => ({
  hidden: document.getElementById('geoCapasPanel').hidden,
  expandido: document.getElementById('geoCapasBoton').getAttribute('aria-expanded'),
  switches: [...document.querySelectorAll('#geoCapasPanel input[role="switch"]')].map((i) => ({ id: i.id, label: i.getAttribute('aria-label'), checked: i.checked, disabled: i.disabled })),
  grupos: [...document.querySelectorAll('#geoCapasPanel .geo-grupo-titulo')].map((n) => n.textContent.trim()),
  razon: document.getElementById('centrosEstado')?.textContent.trim() || '',
  reset: Boolean(document.getElementById('geoCapasReset')),
}));
comprobar(panelAbierto.expandido === 'true' && !panelAbierto.hidden, 'el botón despliega el panel de capas');
comprobar(panelAbierto.switches.length === 7 && panelAbierto.switches.every((s) => s.label), 'siete interruptores accesibles con nombre');
comprobar(panelAbierto.grupos.join('|') === 'Movilidad|Ferrocarril|Evidencia|Contexto|Centros de apoyo|Filtros', `grupos de capas y filtros en un solo panel (${panelAbierto.grupos.join(' · ')})`);
comprobar(panelAbierto.switches.find((s) => s.id === 'capaCentros')?.disabled && /Desactivado/.test(panelAbierto.razon), 'Centros de apoyo desactivado con la razón visible');
comprobar(panelAbierto.reset, 'existe «Restablecer capas»');
const capas = await pagina.evaluate(() => ({
  controles: [...document.querySelectorAll('.geo-layers .geo-layer')].map((n) => n.innerText.replace(/\s+/g, ' ').trim()),
  corredor: !document.getElementById('capaCorredor').disabled && document.getElementById('capaCorredor').checked,
  incidentes: !document.getElementById('capaIncidentes').disabled && document.getElementById('capaIncidentes').checked,
  ferroviaria: !document.getElementById('capaFerroviaria').disabled && document.getElementById('capaFerroviaria').checked,
  evidencia: !document.getElementById('capaEvidencia').disabled && document.getElementById('capaEvidencia').checked,
  centros: document.getElementById('capaCentros').disabled,
  etiquetas: Boolean(document.getElementById('layer-geography')),
  filtros: [...document.querySelectorAll('.geo-filtro select')].map((n) => n.id),
  opcionesOperador: [...document.getElementById('geoOperador').options].map((o) => o.textContent.trim()),
  opcionesAnio: [...document.getElementById('geoAnio').options].map((o) => o.value),
}));
comprobar(capas.corredor && capas.incidentes && capas.ferroviaria && capas.evidencia && capas.etiquetas, 'capas activas y visibles: corredor, incidentes, red ferroviaria, evidencia, etiquetas');
comprobar(capas.centros, 'los centros de apoyo siguen desactivados (sin registros verificados)');
comprobar(capas.controles.length === 7, `siete controles de capa (${capas.controles.length})`);
comprobar(capas.controles.some((t) => /Red ferroviaria oficial/.test(t)) && capas.controles.some((t) => /Tránsito migrante documentado/.test(t)), 'controles separados para infraestructura y evidencia de tránsito');
comprobar(capas.filtros.includes('geoOperador') && capas.filtros.includes('geoAnio'), 'filtros por operador y por año de incidentes');
comprobar(capas.opcionesOperador.includes('Todos los operadores') && capas.opcionesOperador.includes('Ferromex') && capas.opcionesOperador.includes('Otras redes'), `el filtro de operador no muestra conteos (${capas.opcionesOperador.join(' · ')})`);
comprobar(capas.opcionesAnio.length === 7 && capas.opcionesAnio[0] === '', `filtro de año con «Todos» y seis años (${capas.opcionesAnio.slice(1).join(' · ')})`);

/* conmutar cada capa */
const visibilidad = async (sel) => pagina.evaluate((s) => getComputedStyle(document.querySelector(s)).display, sel);
for (const [control, grupo, nombre] of [
  ['#capaCorredor', '#geoCorredor', 'corredor'],
  ['#capaIncidentes', '#geoIncidentes', 'incidentes'],
  ['#capaFerroviaria', '#geoFerroviaria', 'red ferroviaria'],
  ['#capaEvidencia', '#geoEvidencia', 'zonas del INM'],
  ['#layer-geography', '#geographyLabels', 'etiquetas'],
]) {
  await pagina.locator(control).uncheck();
  comprobar((await visibilidad(grupo)) === 'none', `apagar «${nombre}» la oculta del mapa`);
  await pagina.locator(control).check();
  comprobar((await visibilidad(grupo)) !== 'none', `encender «${nombre}» la vuelve a mostrar`);
}

/* leyenda reactiva: al apagar una capa se marca como oculta */
await pagina.locator('#capaCorredor').uncheck();
await pagina.waitForTimeout(200);
const leyendaOff = await pagina.evaluate(() => {
  const clave = document.querySelector('.geo-key[data-capa="corredor"]');
  return { off: clave.classList.contains('is-off'), texto: clave.querySelector('.geo-key-estado')?.textContent.trim() };
});
comprobar(leyendaOff.off && /oculta/i.test(leyendaOff.texto), 'la leyenda marca la capa apagada');
await pagina.locator('#capaCorredor').check();
await pagina.waitForTimeout(200);
const leyendaOn = await pagina.evaluate(() => document.querySelectorAll('.geo-key.is-off').length);
comprobar(leyendaOn === 0, 'la leyenda vuelve a mostrar la capa encendida');

/* restablecer capas */
await pagina.locator('#capaIncidentes').uncheck();
await pagina.locator('#capaPaises').uncheck();
await pagina.waitForTimeout(200);
await pagina.locator('#geoCapasReset').click();
await pagina.waitForTimeout(300);
const trasReset = await pagina.evaluate(() => ({
  incidentes: document.getElementById('capaIncidentes').checked,
  paises: document.getElementById('capaPaises').checked,
  apagadas: document.querySelectorAll('.geo-key.is-off').length,
  centros: document.getElementById('capaCentros').disabled,
}));
comprobar(trasReset.incidentes && trasReset.paises && trasReset.apagadas === 0 && trasReset.centros, '«Restablecer capas» vuelve al estado inicial');

/* teclado: Enter abre, Escape cierra y devuelve el foco al botón */
await pagina.locator('#geoCapasBoton').click();
await pagina.waitForTimeout(200);
await pagina.locator('#geoCapasBoton').focus();
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(250);
const tecladoAbierto = await pagina.evaluate(() => ({ hidden: document.getElementById('geoCapasPanel').hidden, foco: document.activeElement?.id }));
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(250);
const tecladoCerrado = await pagina.evaluate(() => ({ hidden: document.getElementById('geoCapasPanel').hidden, foco: document.activeElement?.id }));
comprobar(!tecladoAbierto.hidden && tecladoAbierto.foco === 'capaCorredor', 'Enter abre el panel y enfoca el primer interruptor');
comprobar(tecladoCerrado.hidden && tecladoCerrado.foco === 'geoCapasBoton', 'Escape cierra el panel y devuelve el foco al botón');

/* ------------------------------------------------------------ 3. filtros */
if (await pagina.evaluate(() => document.getElementById('geoCapasPanel').hidden)) {
  await pagina.locator('#geoCapasBoton').click();
  await pagina.waitForTimeout(250);
}
await pagina.selectOption('#geoOperador', 'Ferromex');
await pagina.waitForTimeout(300);
const soloFerromex = await pagina.evaluate(() => [
  [...document.querySelectorAll('.geo-svg-ferro-g')].filter((n) => n.style.display !== 'none').length,
  [...document.querySelectorAll('.geo-svg-ferro-g')].filter((n) => n.style.display !== 'none' && n.classList.contains('is-ferromex')).length,
]);
await pagina.selectOption('#geoOperador', 'otras');
await pagina.waitForTimeout(300);
const soloOtras = await pagina.evaluate(() => [...document.querySelectorAll('.geo-svg-ferro-g')].filter((n) => n.style.display !== 'none').length);
await pagina.selectOption('#geoOperador', '');
await pagina.waitForTimeout(300);
const todas = await pagina.evaluate(() => [...document.querySelectorAll('.geo-svg-ferro-g')].filter((n) => n.style.display !== 'none').length);
comprobar(soloFerromex[0] === 270 && soloFerromex[1] === 270 && soloOtras === 539 && todas === 809, `filtro de operador funcional: Ferromex ${soloFerromex[0]}, otras ${soloOtras}, todas ${todas}`);

await pagina.locator('#geoMap').scrollIntoViewIfNeeded();

/* zoom: los símbolos mantienen tamaño en pantalla y la vista se restablece */
const zoomInfo = await pagina.evaluate(async () => {
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const anchoPunto = () => document.querySelector('.geo-svg-incidente').getBoundingClientRect().width;
  const base = anchoPunto();
  document.getElementById('geoZoomIn').click();
  document.getElementById('geoZoomIn').click();
  await esperar(450);
  const nivel = document.getElementById('geoZoomLevel').textContent.trim();
  const ampliado = anchoPunto();
  document.getElementById('geoReset').click();
  await esperar(450);
  return { base, ampliado, nivel, tras: document.getElementById('geoZoomLevel').textContent.trim() };
});
comprobar(/^\d{3} %$/.test(zoomInfo.nivel) && Number.parseInt(zoomInfo.nivel, 10) > 100, `los botones de zoom acercan (${zoomInfo.nivel})`);
comprobar(Math.abs(zoomInfo.ampliado - zoomInfo.base) < 1.5, `el símbolo conserva su tamaño en pantalla al acercar (${zoomInfo.base.toFixed(1)} → ${zoomInfo.ampliado.toFixed(1)} px)`);
comprobar(zoomInfo.tras === '100 %', `«Restablecer vista» vuelve al 100 % (${zoomInfo.tras})`);

const antesFiltro = await pagina.evaluate(() => document.querySelectorAll('.geo-svg-incidente-g').length);
await pagina.selectOption('#geoAnio', '2019');
await pagina.waitForTimeout(500);
const trasFiltro = await pagina.evaluate(() => ({
  puntos: document.querySelectorAll('.geo-svg-incidente-g').length,
  nota: document.getElementById('geoAnioNota').textContent.trim(),
  filasLista: document.querySelectorAll('#geoLista tbody tr').length,
  seleccionados: document.querySelectorAll('#geoMap .is-activo').length,
}));
comprobar(trasFiltro.puntos > 0 && trasFiltro.puntos < antesFiltro && /^Incidentes con coordenadas registrados en 2019\.$/.test(trasFiltro.nota), `filtro por año sin conteos: ${antesFiltro} → ${trasFiltro.puntos} («${trasFiltro.nota}»)`);
comprobar(trasFiltro.filasLista === trasFiltro.puntos + 833, 'la tabla única respeta el filtro (24 tramos, pasos y zonas + 809 vías + incidentes filtrados)');
comprobar(trasFiltro.seleccionados === 0, 'cambiar el filtro limpia la selección');
await pagina.selectOption('#geoAnio', '');
await pagina.waitForTimeout(500);
const trasVolver = await pagina.evaluate(() => document.querySelectorAll('.geo-svg-incidente-g').length);
comprobar(trasVolver === 148, `al quitar el filtro vuelven los 148 incidentes (${trasVolver})`);

/* ------------------------------------------------------------ 4. textos */
comprobar(await pagina.evaluate(() => !document.querySelector('.geo-sources').open), '«Fuentes, disponibilidad y límites» empieza cerrado');
await pagina.evaluate(() => { const d = document.querySelector('.geo-sources'); if (d && 'open' in d) d.open = true; });
await pagina.waitForTimeout(200);
const textos = await pagina.evaluate(() => {
  const panel = document.querySelector('.geo-sources');
  const nota = document.querySelector('.geo-note')?.innerText.replace(/\s+/g, ' ').trim() || '';
  return {
    nota,
    fuentes: panel.innerText.replace(/\s+/g, ' ').trim(),
    leyenda: [...document.querySelectorAll('.geo-legend .geo-key')].map((n) => n.innerText.replace(/\s+/g, ' ').trim()),
    enlaces: [...panel.querySelectorAll('a')].map((a) => ({ texto: a.textContent.trim(), href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') })),
    badgeEvidencia: document.getElementById('evidenciaEstado').innerText.replace(/\s+/g, ' ').trim(),
    caveat: document.querySelector('.geo-caveat').innerText.replace(/\s+/g, ' ').trim(),
    hero: document.querySelector('.hero-head p').innerText.replace(/\s+/g, ' ').trim(),
    requiere: ['pendiente de incorporación', 'no se pudo descargar', 'no tiene geometría', 'sin capa ferroviaria', 'ocho puertos']
      .filter((f) => document.body.innerText.toLowerCase().includes(f.toLowerCase())),
  };
});
comprobar(
  textos.nota === 'Las vías representan infraestructura ferroviaria. Las capas de uso migrante se basan en fuentes y períodos específicos; no muestran todos los trayectos ni prueban que se haya utilizado cada tramo de la red. La superposición de capas no implica causalidad.',
  'nota metodológica visible con el texto exacto solicitado',
);
comprobar(/Red ferroviaria oficial/.test(textos.fuentes) && /ENTIDAD/.test(textos.fuentes) && /Ferromex/.test(textos.fuentes) && !/809 tramos|270/.test(textos.fuentes), 'las fuentes declaran la red y el criterio Ferromex sin conteos');
comprobar(/portal corporativo/.test(textos.fuentes), 'la cobertura de Ferromex se atribuye a su portal sin cifras');
comprobar(/CC BY 4\.0/.test(textos.fuentes) && /13 de noviembre de 2026/.test(textos.fuentes) && /agosto de 2023/.test(textos.fuentes), 'licencia, descarga y actualización de la capa ferroviaria');
comprobar(/INM/.test(textos.badgeEvidencia) && /119\/23/.test(textos.badgeEvidencia) && /124\/23/.test(textos.badgeEvidencia) && !/13 estados/.test(textos.badgeEvidencia), 'la capa de tránsito declara ambos comunicados del INM sin conteos');
comprobar(/El Colegio de México/.test(textos.badgeEvidencia) && /2014/.test(textos.badgeEvidencia) && /CC BY-NC-ND/.test(textos.badgeEvidencia), 'El Colegio de México se cita como referencia histórica de 2014, sin geometría');
comprobar(textos.leyenda.length === 8 && textos.leyenda.filter((t) => /Ferromex|Otras redes|Tramos sin uso/.test(t)).length === 3 && textos.leyenda.some((t) => /Incidentes ICIJ\/CLIP/.test(t)) && textos.leyenda.some((t) => /Zonas INM 2023/.test(t)) && textos.leyenda.some((t) => /Divisiones estatales/.test(t)), `leyenda con ocho claves y tres trazos ferroviarios (${textos.leyenda.length})`);
comprobar(/naranja/.test(textos.leyenda.find((t) => /Incidentes ICIJ/.test(t)) || ''), 'la leyenda de incidentes declara el marcador naranja');
comprobar(textos.enlaces.length >= 7 && textos.enlaces.every((e) => /^https:\/\//.test(e.href) && e.target === '_blank' && /noopener/.test(e.rel)), `fuentes enlazadas con noopener (${textos.enlaces.length})`);
comprobar(textos.enlaces.some((e) => e.href.includes('dtm.iom.int')) && textos.enlaces.some((e) => e.href.includes('icij.org')) && textos.enlaces.some((e) => e.href.includes('arcgis.com')) && textos.enlaces.some((e) => e.href.includes('ferromex.mx')) && textos.enlaces.some((e) => e.href.includes('gob.mx/inm')) && textos.enlaces.some((e) => e.href.includes('colmex')), 'enlaces a OIM, ICIJ, servicio ARTF, Ferromex, INM y COLMEX');
comprobar(/«La Bestia»/.test(textos.caveat) && /no se afirma/.test(textos.caveat) && /no implican causalidad/.test(textos.caveat) || /no implica causalidad/.test(textos.caveat), 'la advertencia separa infraestructura, zonas y causalidad');
comprobar(/corredor centroamericano generalizado/.test(textos.hero) && /ICIJ\/CLIP/.test(textos.hero) && /ARTF\/IDE/.test(textos.hero) && /INM/.test(textos.hero) && !/809 tramos|270/.test(textos.hero), 'la entradilla describe las cuatro capas sin conteos');
comprobar(textos.requiere.length === 0, `sin frases prohibidas ni cifras retiradas (${textos.requiere.join(' | ') || 'ninguna'})`);
await pagina.evaluate(() => { const d = document.querySelector('.geo-sources'); if (d) d.open = false; });

/* ---------------------------------------- 5. selección con ratón y teclado */
await pagina.evaluate(() => document.getElementById('geoMap').scrollIntoView({ block: 'center' }));
await pagina.waitForTimeout(300);

/* tooltip de incidente */
const puntoInc = await pagina.evaluate(() => {
  const mapa = document.getElementById('geoMap').getBoundingClientRect();
  for (const g of document.querySelectorAll('.geo-svg-incidente-g')) {
    const c = g.querySelector('.geo-svg-incidente-hit');
    const b = c.getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    if (x < mapa.left + 6 || x > mapa.right - 6 || y < mapa.top + 6 || y > mapa.bottom - 6) continue;
    if (document.elementFromPoint(x, y)?.closest('.geo-svg-incidente-g') === g) return { x, y };
  }
  return null;
});
if (puntoInc) { await pagina.mouse.move(puntoInc.x, puntoInc.y); await pagina.waitForTimeout(300); }
const tipInc = await pagina.evaluate(() => { const t = document.getElementById('geoTip'); return t.hidden ? '' : t.innerText.replace(/\s+/g, ' '); });
comprobar(Boolean(puntoInc) && /Tipo de hecho declarado:/.test(tipInc) && /Precisión de la coordenada:/.test(tipInc) && /no una persona/.test(tipInc), `tooltip del incidente con tipo de hecho, precisión y límite («${tipInc.slice(0, 90)}…»)`);
comprobar(/Tipo de hecho declarado: No disponible/.test(tipInc) && /No disponible.*no es cero/.test(tipInc), 'el tooltip usa «No disponible» en los campos ausentes, sin inventar ceros');
await pagina.mouse.move(5, 5);

/* toggle de límites de países */
if (await pagina.evaluate(() => document.getElementById('geoCapasPanel').hidden)) {
  await pagina.locator('#geoCapasBoton').click();
  await pagina.waitForTimeout(250);
}
await pagina.locator('#capaPaises').uncheck();
await pagina.waitForTimeout(150);
const paisesOcultos = await pagina.evaluate(() => { const g = document.getElementById('geoPaises'); return g ? getComputedStyle(g).display : 'none'; });
await pagina.locator('#capaPaises').check();
await pagina.waitForTimeout(150);
comprobar(paisesOcultos === 'none', 'el control de límites de países oculta la capa');
await pagina.locator('#geoCapasBoton').click();
await pagina.waitForTimeout(250);

/* corredor */
const tramo = await pagina.evaluate(() => {
  const trazo = document.querySelector('.geo-svg-tramo-g[data-tramo="4"] .geo-svg-hit');
  const pt = trazo.getPointAtLength(trazo.getTotalLength() / 2);
  const m = trazo.getScreenCTM();
  return { x: m.a * pt.x + m.c * pt.y + m.e, y: m.b * pt.x + m.d * pt.y + m.f };
});
await pagina.mouse.click(tramo.x, tramo.y);
await pagina.waitForTimeout(350);
let ficha = await leerFicha();
comprobar(ficha.titulo === 'Tramo del corredor' && /Honduras → Guatemala/.test(ficha.texto) && /OIM DTM/.test(ficha.texto), `clic en el corredor abre su ficha (${ficha.titulo})`);
comprobar(ficha.activos.length === 1 && ficha.activos[0].tramo === '4' && ficha.limpiarVisible, 'el tramo queda marcado y aparece «Limpiar selección»');

/* vía ferroviaria */
const puntoVía = await puntoDeCapa('.geo-svg-ferro-g', '.geo-svg-ferroviaria', 'data-ferroviaria', 200);
if (puntoVía) await pagina.mouse.click(puntoVía.x, puntoVía.y);
await pagina.waitForTimeout(350);
ficha = await leerFicha();
comprobar(Boolean(puntoVía) && ficha.titulo === 'Tramo ferroviario', `clic en una vía abre su ficha (${ficha.titulo})`);
comprobar(/Operador/.test(ficha.texto) && /ARTF/.test(ficha.texto) && /CC BY 4\.0/.test(ficha.texto) && /No prueba que una persona migrante/.test(ficha.texto), 'la ficha de la vía declara operador, fuente, licencia y límite de uso');
comprobar(ficha.activos.length === 1 && ficha.activos[0].ferroviaria !== null && ficha.activos[0].pressed === 'true', 'la vía seleccionada queda marcada (aria-pressed)');
await pagina.locator('.geo-side').screenshot({ path: path.join(SALIDA, 'mapa-ficha-ferroviaria.png') });

/* zona documentada desde la tabla accesible */
await pagina.locator('.geo-table-panel summary').click();
await pagina.waitForTimeout(300);
await pagina.locator('[data-lista-evidencia="7"]').scrollIntoViewIfNeeded();
await pagina.locator('[data-lista-evidencia="7"]').click();
await pagina.waitForTimeout(350);
ficha = await leerFicha();
comprobar(ficha.titulo === 'Zona documentada · INM 2023' && /2023/.test(ficha.texto) && /zona estatal/.test(ficha.texto), `la zona del INM abre su ficha (${ficha.titulo})`);
comprobar(/119\/23/.test(ficha.texto) && /Fuentes/.test(ficha.texto) && /Período/.test(ficha.texto), 'la ficha de la zona cita su comunicado, período y bloque de fuentes');
comprobar(/no es una ruta ni una estación/.test(ficha.texto) && /no indica por dónde pasó/.test(ficha.texto), 'la ficha de la zona advierte que no es un trayecto');
comprobar(ficha.activos.length === 1 && ficha.activos[0].evidencia !== null, 'la zona queda marcada');
await pagina.locator('.geo-side').screenshot({ path: path.join(SALIDA, 'mapa-ficha-evidencia.png') });

/* zona documentada con clic directo en el mapa */
await pagina.evaluate(() => document.getElementById('geoMap').scrollIntoView({ block: 'center' }));
const puntoZona = await puntoDeCapa('.geo-svg-zona-g', '.geo-svg-zona', 'data-evidencia', 13);
if (puntoZona) await pagina.mouse.click(puntoZona.x, puntoZona.y);
await pagina.waitForTimeout(350);
ficha = await leerFicha();
comprobar(Boolean(puntoZona) && ficha.titulo === 'Zona documentada · INM 2023', `clic directo en una zona abre su ficha (${ficha.titulo})`);

/* incidente desde la lista */
await pagina.locator('[data-lista-incidente="5"]').scrollIntoViewIfNeeded();
await pagina.locator('[data-lista-incidente="5"]').click();
await pagina.waitForTimeout(350);
ficha = await leerFicha();
comprobar(ficha.titulo === 'Incidente documentado' && /ICIJ\/CLIP/.test(ficha.texto) && /Tipo de hecho declarado/.test(ficha.texto) && /No disponible/.test(ficha.texto) && !/Fila \d|de 148/.test(ficha.texto), 'la ficha del incidente declara tipo de hecho y «No disponible» sin conteos');
comprobar(!/Tramo ferroviario|Zona documentada/.test(ficha.texto), 'la ficha del incidente no conserva datos de la selección anterior');

/* ferroviaria desde la tabla accesible */
await pagina.locator('[data-lista-ferro="10"]').scrollIntoViewIfNeeded();
await pagina.locator('[data-lista-ferro="10"]').click();
await pagina.waitForTimeout(350);
ficha = await leerFicha();
comprobar(ficha.titulo === 'Tramo ferroviario' && /Operador/.test(ficha.texto) && ficha.activos.length === 1, 'la lista ferroviaria abre la ficha de la vía');

/* teclado */
await pagina.evaluate(() => document.getElementById('geoMap').scrollIntoView({ block: 'center' }));
await pagina.locator('.geo-svg-ferro-g').nth(3).focus();
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(350);
ficha = await leerFicha();
comprobar(ficha.titulo === 'Tramo ferroviario', 'Enter sobre una vía enfocada abre su ficha');
await pagina.locator('.geo-svg-zona-g').nth(2).focus();
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(350);
ficha = await leerFicha();
comprobar(ficha.titulo === 'Zona documentada · INM 2023', 'Enter sobre una zona enfocada abre su ficha');
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(300);
ficha = await leerFicha();
comprobar(ficha.titulo === 'Selección en el mapa' && ficha.activos.length === 0 && !ficha.limpiarVisible, 'Escape limpia la selección');

/* ------------------------------------------------------- 6. capturas */
await pagina.waitForTimeout(300);
const capasAntes = await pagina.evaluate(() => ({
  ferro: getComputedStyle(document.getElementById('geoFerroviaria')).display,
  zonas: getComputedStyle(document.getElementById('geoEvidencia')).display,
  corredor: getComputedStyle(document.getElementById('geoCorredor')).display,
  incidentes: getComputedStyle(document.getElementById('geoIncidentes')).display,
}));
comprobar(Object.values(capasAntes).every((v) => v !== 'none'), 'las cuatro capas con datos se ven a la vez antes de la captura');
const panelQuedaAbierto = await pagina.evaluate(() => !document.getElementById('geoCapasPanel').hidden);
if (panelQuedaAbierto) { await pagina.locator('#geoCapasBoton').click(); await pagina.waitForTimeout(250); }
await pagina.locator('#geoMap').screenshot({ path: path.join(SALIDA, 'mapa-ferroviaria-evidencia.png') });
await pagina.locator('.hero-card').screenshot({ path: path.join(SALIDA, 'mapa-bloque-escritorio.png') });

/* ---------------------------------------------------------- 7. móvil */
const movilContexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX' });
const movil = await movilContexto.newPage();
const erroresMovil = [];
movil.on('console', (m) => { if (m.type() === 'error') erroresMovil.push(m.text().slice(0, 160)); });
movil.on('pageerror', (e) => erroresMovil.push('pageerror: ' + e.message.slice(0, 160)));
await movil.goto(DIRECTO, { waitUntil: 'load' });
await movil.waitForSelector('.geo-svg-ferro-g', { timeout: 60_000 });
await movil.waitForTimeout(800);
const movilInfo = await movil.evaluate(() => {
  const svg = document.getElementById('geoMap');
  const caja = svg.getBoundingClientRect();
  const lado = document.querySelector('.geo-side').getBoundingClientRect();
  return {
    ferro: document.querySelectorAll('.geo-svg-ferro-g').length,
    ferromex: document.querySelectorAll('.geo-svg-ferro-g.is-ferromex').length,
    zonas: document.querySelectorAll('.geo-svg-zona-g').length,
    incidentes: document.querySelectorAll('.geo-svg-incidente-g').length,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    viewport: window.innerWidth,
    mapa: { w: Math.round(caja.width), h: Math.round(caja.height) },
    viewBox: svg.getAttribute('viewBox'),
    panelesDebajo: lado.top > caja.bottom - 1,
    leyenda: document.querySelectorAll('.geo-legend .geo-key').length,
    panelPlegado: document.getElementById('geoCapasPanel').hidden,
    ariaMapa: svg.getAttribute('aria-label') || '',
  };
});
comprobar(movilInfo.ferro === 809 && movilInfo.ferromex === 270 && movilInfo.zonas === 13, `móvil: 809 vías (270 Ferromex) y 13 zonas (${movilInfo.ferro} · ${movilInfo.ferromex} · ${movilInfo.zonas})`);
comprobar(movilInfo.desborde <= 0 && movilInfo.viewport <= 390, `móvil: sin desplazamiento horizontal (${movilInfo.desborde} px)`);
comprobar(movilInfo.mapa.w >= 300 && movilInfo.mapa.h >= 280, `móvil: mapa con altura útil (${movilInfo.mapa.w}×${movilInfo.mapa.h})`);
comprobar(movilInfo.viewBox === '0 0 1080 1040', `móvil: lienzo adaptado (${movilInfo.viewBox})`);
comprobar(movilInfo.panelesDebajo && movilInfo.leyenda === 8 && movilInfo.panelPlegado, 'móvil: leyenda bajo el mapa, ocho claves y panel de capas plegado');
comprobar(/Ferromex/.test(movilInfo.ariaMapa) && /INM/.test(movilInfo.ariaMapa), 'móvil: la etiqueta accesible del mapa describe las capas nuevas');

/* toque en una vía ferroviaria (punto verificado en el propio móvil) */
await movil.evaluate(() => document.getElementById('geoMap').scrollIntoView({ block: 'center' }));
await movil.waitForTimeout(400);
const puntoMovil = await movil.evaluate(() => {
  const mapa = document.getElementById('geoMap').getBoundingClientRect();
  const desfases = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]];
  const estable = (x, y, grupo) => desfases.every(([dx, dy]) => {
    const nodo = document.elementFromPoint(x + dx, y + dy);
    const destino = nodo && nodo.closest('[data-ferroviaria]');
    return destino === grupo;
  });
  for (const grupo of document.querySelectorAll('.geo-svg-ferro-g.is-ferromex')) {
    const trazo = grupo.querySelector('.geo-svg-ferroviaria');
    const largo = trazo.getTotalLength();
    if (!largo) continue;
    const m = trazo.getScreenCTM();
    for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9]) {
      const pt = trazo.getPointAtLength(largo * f);
      const x = m.a * pt.x + m.c * pt.y + m.e;
      const y = m.b * pt.x + m.d * pt.y + m.f;
      if (x < mapa.left + 9 || x > mapa.right - 9 || y < mapa.top + 9 || y > mapa.bottom - 9) continue;
      if (estable(x, y, grupo)) return { x, y, id: grupo.getAttribute('data-ferroviaria') };
    }
  }
  return null;
});
if (puntoMovil) await movil.touchscreen.tap(puntoMovil.x, puntoMovil.y);
await movil.waitForTimeout(500);
const fichaMovil = await movil.evaluate(() => ({
  titulo: document.getElementById('geoDetailTitle').textContent.trim(),
  texto: document.getElementById('geoDetail').innerText.replace(/\s+/g, ' '),
  activos: document.querySelectorAll('#geoMap .is-activo').length,
  activoFerromex: Boolean(document.querySelector('#geoMap .geo-svg-ferro-g.is-activo.is-ferromex')),
  activoId: document.querySelector('#geoMap .is-activo')?.getAttribute('data-ferroviaria'),
}));
comprobar(Boolean(puntoMovil) && fichaMovil.titulo === 'Tramo ferroviario' && fichaMovil.activos === 1, `móvil: tocar una vía abre su ficha (${fichaMovil.titulo} · tramo ${fichaMovil.activoId})`);
comprobar(fichaMovil.activoFerromex && /Operador/.test(fichaMovil.texto), 'móvil: la vía tocada de Ferromex queda seleccionada con su operador en la ficha');
await movil.locator('#geoCapasBoton').click();
await movil.waitForTimeout(300);
const capasMovil = await movil.evaluate(() => {
  const panel = document.getElementById('geoCapasPanel');
  const caja = panel.getBoundingClientRect();
  const pista = panel.querySelector('.geo-switch-pista').getBoundingClientRect();
  return {
    visible: !panel.hidden,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ancho: Math.round(caja.width),
    pista: { w: Math.round(pista.width), h: Math.round(pista.height) },
    columnas: getComputedStyle(panel).gridTemplateColumns.split(' ').length,
    boton: document.getElementById('geoCapasBoton').getBoundingClientRect().height,
  };
});
comprobar(capasMovil.visible && capasMovil.desborde <= 0, `móvil: panel de capas sin desbordamiento (${capasMovil.desborde} px)`);
comprobar(capasMovil.pista.w >= 36 && capasMovil.pista.h >= 20 && capasMovil.boton >= 36, `móvil: interruptores y botón con objetivo táctil (${capasMovil.pista.w}×${capasMovil.pista.h})`);
comprobar(capasMovil.columnas === 1, `móvil: capas en una columna (${capasMovil.columnas})`);
comprobar(erroresMovil.length === 0, `móvil: sin errores de consola (${erroresMovil.slice(0, 2).join(' | ')})`);
await movil.locator('#geoMap').screenshot({ path: path.join(SALIDA, 'mapa-ferroviaria-evidencia-movil.png') });
await movil.locator('.hero-card').screenshot({ path: path.join(SALIDA, 'mapa-bloque-movil.png') });

/* --------------------------------------------- 8. otras vistas intactas */
const otras = await pagina.evaluate(() => ({
  tablas: document.querySelectorAll('table').length,
  kpis: document.querySelectorAll('.metric .value').length,
  secciones: document.querySelectorAll('.section').length,
  burbujas: document.querySelectorAll('.bv-circulo').length,
}));
comprobar(otras.tablas >= 33, `las tablas de las demás vistas siguen presentes (${otras.tablas})`);
comprobar(otras.secciones === 6, `las seis vistas del tablero se mantienen (${otras.secciones})`);
comprobar(otras.kpis > 0, `los indicadores del panorama siguen dibujados (${otras.kpis})`);

comprobar(errores.length === 0, `escritorio: sin errores de consola (${errores.slice(0, 2).join(' | ')})`);
comprobar(red.length === 0, `escritorio: sin recursos faltantes (${red.slice(0, 2).join(' | ')})`);

await navegador.close();

console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
for (const linea of ok) console.log('OK    ' + linea);
for (const linea of fallos) console.log('FALLA ' + linea);
if (fallos.length) process.exitCode = 1;
