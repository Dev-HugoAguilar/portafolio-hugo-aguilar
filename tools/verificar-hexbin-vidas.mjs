/**
 * Verificación del mapa hexagonal de «Muertes documentadas» (build servido).
 *
 * Comprueba que los valores se calculan desde la malla y coinciden con los
 * totales derivados de las filas de la fuente, y que modos, medidas, periodo,
 * fuente, capas, fichas, teclado, zoom, tabla y móvil funcionan.
 *
 *   node tools/verificar-hexbin-vidas.mjs
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'vidas-en-transito');
const BASE = 'http://127.0.0.1:8000/dashboards/vidas-en-transito/';

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
const num = (texto) => Number(String(texto).replace(/[^\d]/g, ''));

/* ------------------------------------------------ totales esperados (nodo) */
const geo = await (await fetch(`${BASE}geografia/hexbin_muertes.geojson`)).json();
const meta = await (await fetch(`${BASE}geografia/hexbin_muertes.json`)).json();
const fuentes = await (await fetch(`${BASE}fuentes_ampliadas.json`)).json();
const filasIcij = (fuentes.icij_clip?.points || []).filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number');
const aniosIcij = [...new Set(filasIcij.map((p) => String(p.year)))].sort();
const suma = (modo, medida, anio) => geo.features.reduce((total, f) => {
  const p = f.properties;
  const par = modo === 'muertes' ? p.m : p.d;
  if (!par) return total;
  const campo = medida === 'incidentes' ? 0 : 1;
  if (!anio) return total + par[campo];
  const y = p.y && p.y[anio];
  if (!y) return total;
  return total + (modo === 'muertes' ? y[campo] : y[2 + campo]);
}, 0);
const celdasCon = (modo, medida, anio) => geo.features.filter((f) => {
  const p = f.properties;
  const par = modo === 'muertes' ? p.m : p.d;
  if (!par) return false;
  const campo = medida === 'incidentes' ? 0 : 1;
  if (!anio) return par[campo] > 0;
  const y = p.y && p.y[anio];
  return Boolean(y && (modo === 'muertes' ? y[campo] : y[2 + campo]));
}).length;

comprobar(geo.features.length === meta.resumen.celdas_totales, `malla servida: ${geo.features.length} celdas (${meta.resumen.celdas_con_datos} con datos)`);
comprobar(meta.comprobacion.coincide === true, 'los agregados por celda coinciden con las filas asignadas de la fuente');
comprobar(suma('muertes', 'incidentes') === meta.resumen.muertes.incidentes && suma('muertes', 'personas') === meta.resumen.muertes.personas, `muertes: ${suma('muertes', 'incidentes')} incidentes y ${suma('muertes', 'personas')} personas (MMP)`);
comprobar(suma('desapariciones', 'incidentes') === meta.resumen.desapariciones.incidentes && suma('desapariciones', 'personas') === meta.resumen.desapariciones.personas, `desapariciones: ${suma('desapariciones', 'incidentes')} incidentes y ${suma('desapariciones', 'personas')} personas (MMP)`);
comprobar(meta.fuente.licencia.includes('CC BY-IGO') && meta.fuente.descargado === '2026-11-13', 'la fuente declara licencia CC BY-IGO y fecha de descarga');

/* ------------------------------------------------------------ navegador */
const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-MX' });
const pagina = await contexto.newPage();
const errores = [];
const externos = [];
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 180)); });
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message.slice(0, 180)));
pagina.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:8000/') && !r.url().startsWith('data:')) externos.push(r.url()); });
pagina.on('response', (r) => { if (r.status() >= 400) errores.push(`${r.status()} ${r.url()}`); });

await pagina.goto(`${BASE}index.html`, { waitUntil: 'load' });
await pagina.locator('[data-target="muertes"]').click();
await pagina.waitForSelector('.hx-hex', { timeout: 30_000 });
await pagina.waitForTimeout(900);
await pagina.mouse.move(5, 5);

const estado = () => pagina.evaluate(() => {
  const limpio = (s) => (s || '').replace(/\s+/g, ' ').trim();
  return {
    titulo: limpio(document.getElementById('hxTitle').textContent),
    subtitulo: limpio(document.getElementById('hxSubtitle').textContent),
    resumen: limpio(document.getElementById('hxResumen').innerText),
    caption: limpio(document.querySelector('#hxTabla caption')?.textContent),
    tablaTexto: limpio(document.getElementById('hxTabla').textContent),
    filas: document.querySelectorAll('#hxTabla tbody tr').length,
    datos: document.querySelectorAll('.hx-hex-dato').length,
    totalCeldas: document.querySelectorAll('.hx-hex').length,
    ficha: limpio(document.getElementById('hxFicha').innerText),
    fichaTitulo: limpio(document.getElementById('hxFichaTitulo').textContent),
    eaaf: !document.getElementById('hxEaafPanel').hidden,
    eaafTexto: limpio(document.getElementById('hxEaaf').innerText),
    vacio: !document.getElementById('hxVacio').hidden,
    vacioTexto: limpio(document.getElementById('hxVacio').textContent),
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    activos: document.querySelectorAll('.hx-hex-activo').length,
    pressed: document.querySelectorAll('.hx-hex[aria-pressed="true"]').length,
    zoom: document.getElementById('hxZoomNivel').textContent.trim(),
    herramienta: (() => { const t = document.getElementById('hxTip'); return t.hidden ? '' : limpio(t.innerText); })(),
    fuente: document.getElementById('hxFuente').value,
    fuenteOpciones: [...document.getElementById('hxFuente').options].map((o) => o.value),
    medidaDeshabilitada: document.getElementById('hxMedida').disabled,
    modosDeshabilitados: [...document.querySelectorAll('.hx-modos button')].every((b) => b.disabled),
    medidaOpciones: [...document.getElementById('hxMedida').options].map((o) => o.textContent),
    periodoOpciones: [...document.getElementById('hxPeriodo').options].map((o) => o.value),
    leyenda: limpio(document.getElementById('hxLeyenda').innerText),
    capas: [...document.querySelectorAll('#hxCapas input[data-capa]')].map((i) => [i.getAttribute('data-capa'), i.checked]),
  };
});

let vista = await estado();
comprobar(vista.totalCeldas === geo.features.length && vista.datos === celdasCon('muertes', 'incidentes'), `mapa con ${vista.totalCeldas} hexágonos y ${vista.datos} celdas con dato`);
comprobar(vista.desborde <= 0, 'sin desbordamiento horizontal en escritorio');
comprobar(/^[\d,.]+ incidentes documentados en [\d,.]+ celdas del corredor$/.test(vista.titulo), `título derivado del subconjunto: «${vista.titulo}»`);
comprobar(vista.caption.includes(`${vista.datos} celdas con dato`), `la tabla declara las celdas visibles (${vista.filas} filas)`);
comprobar(vista.filas === vista.datos, 'una fila de tabla por celda con dato');

const sumaTabla = (caption) => {
  const m = caption.match(/suma ([\d,.]+) incidentes · ([\d,.]+) (muertes reportadas|personas desaparecidas reportadas)/);
  return m ? [num(m[1]), num(m[2])] : [null, null];
};
let [incTabla, perTabla] = sumaTabla(vista.caption);
comprobar(incTabla === suma('muertes', 'incidentes') && perTabla === suma('muertes', 'personas'), `la suma de celdas coincide con las filas MMP (${incTabla} · ${perTabla})`);
comprobar(/CC BY-IGO/.test(vista.resumen) && /sin celda terrestre cercana/.test(vista.resumen), 'el panel declara licencia y exclusiones sin celda');

/* estilos: celdas vacías, celdas con datos, zonas INM y divisiones estatales */
const estilos = await pagina.evaluate(() => {
  const cs = (n) => (n ? getComputedStyle(n) : null);
  const hex = document.querySelector('.hx-hex:not(.hx-hex-dato)');
  const dato = document.querySelector('.hx-hex-dato');
  const inm = document.querySelector('.hx-inm');
  const estado = document.querySelector('.hx-estado');
  const frontera = document.querySelector('.hx-frontera');
  return {
    vacio: cs(hex)?.fill,
    dato: cs(dato)?.fill,
    inm: cs(inm)?.fill,
    estado: cs(estado)?.stroke,
    frontera: cs(frontera)?.stroke,
  };
});
comprobar(estilos.vacio === 'rgb(255, 255, 255)', `celdas sin registros en blanco (${estilos.vacio})`);
comprobar(estilos.dato && estilos.dato !== 'rgb(255, 255, 255)', `celdas con datos coloreadas (${estilos.dato})`);
comprobar(estilos.inm === 'rgb(232, 234, 237)', `zonas INM en gris claro (${estilos.inm})`);
comprobar(estilos.estado === 'rgb(137, 147, 162)', `divisiones estatales en gris medio (${estilos.estado})`);
comprobar(estilos.frontera === 'rgb(174, 181, 192)', `fronteras nacionales finas y discretas (${estilos.frontera})`);

const coloresCapas = await pagina.evaluate(() => {
  const cs = (s) => {
    const nodo = document.querySelector(s);
    return nodo ? getComputedStyle(nodo) : null;
  };
  const rgb = (texto) => (texto || '').match(/\d+/g)?.slice(0, 3).map(Number) || [];
  const relleno = cs('.hx-hex-dato')?.fill;
  return {
    ferromex: cs('.hx-ferromex')?.stroke,
    otra: cs('.hx-ferro:not(.hx-ferromex)')?.stroke,
    hex: relleno,
    hexRgb: rgb(relleno),
    puntos: document.querySelectorAll('.hx-icij-punto, .hx-icij-punto-g').length,
  };
});
comprobar(coloresCapas.ferromex === 'rgb(74, 29, 110)' && coloresCapas.otra === 'rgb(157, 107, 196)', `ferrocarril en morado: Ferromex ${coloresCapas.ferromex} · otras redes ${coloresCapas.otra}`);
comprobar(coloresCapas.puntos === 0, 'no hay puntos circulares ICIJ/CLIP en el mapa (solo hexágonos)');
comprobar(coloresCapas.hexRgb[0] > coloresCapas.hexRgb[2] && coloresCapas.hexRgb[0] >= coloresCapas.hexRgb[1], `los hexágonos usan la rampa de la fuente activa (${coloresCapas.hex})`);

/* celda vacía: explica que no equivale a ausencia */
const celdaVacia = pagina.locator('.hx-hex:not(.hx-hex-dato)').first();
const cajaVacia = await celdaVacia.boundingBox();
await celdaVacia.hover();
await pagina.waitForTimeout(250);
const tipVacio = await pagina.evaluate(() => {
  const t = document.getElementById('hxTip');
  return t.hidden ? '' : t.innerText.replace(/\s+/g, ' ');
});
comprobar(/Sin registros/.test(tipVacio) && /no significa que no haya habido/i.test(tipVacio), 'la celda vacía explica que no equivale a ausencia');
await pagina.mouse.move(5, 5);

/* capturas del modo inicial */
await pagina.locator('#hxCard').screenshot({ path: path.join(SALIDA, 'hexbin-escritorio.png') });
await pagina.locator('.hx-frame').screenshot({ path: path.join(SALIDA, 'hexbin-mapa.png') });

/* medidas */
await pagina.selectOption('#hxMedida', 'personas');
await pagina.waitForTimeout(400);
vista = await estado();
comprobar(/muertes reportadas en .* celdas/.test(vista.titulo) && /muertes reportadas/i.test(vista.resumen), `medida «muertes reportadas» cambia título y resumen («${vista.titulo}»)`)
;
[incTabla, perTabla] = sumaTabla(vista.caption);
comprobar(perTabla === suma('muertes', 'personas') && incTabla === suma('muertes', 'incidentes'), 'la tabla mantiene ambas cifras con su unidad');

/* periodo */
await pagina.selectOption('#hxPeriodo', '2019');
await pagina.waitForTimeout(500);
vista = await estado();
const esperado2019 = suma('muertes', 'personas', '2019');
comprobar(new RegExp(`${esperado2019.toLocaleString('es-MX')} muertes reportadas`).test(vista.titulo), `el filtro de año recalcula el total (2019: ${esperado2019} muertes reportadas)`);
comprobar(vista.datos === celdasCon('muertes', 'personas', '2019'), `solo las celdas con dato en 2019 quedan activas (${vista.datos})`);
[incTabla, perTabla] = sumaTabla(vista.caption);
comprobar(perTabla === esperado2019 && incTabla === suma('muertes', 'incidentes', '2019'), 'la suma de 2019 coincide con las filas de ese año');
comprobar(vista.periodoOpciones.length === meta.resumen.anios.length + 1, `el selector temporal solo ofrece años con datos (${vista.periodoOpciones.length - 1})`);

/* tooltip y foco */
const celda = pagina.locator('.hx-hex-dato').first();
const caja = await celda.boundingBox();
await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
await pagina.waitForTimeout(250);
vista = await estado();
comprobar(/muertes reportadas/.test(vista.herramienta) && /OIM MMP/.test(vista.herramienta) && /no es la ubicación exacta/.test(vista.herramienta), `el tooltip muestra cifra, unidad, fuente y límite («${vista.herramienta.slice(0, 80)}…»)`);
await pagina.mouse.move(5, 5);
await celda.focus();
await pagina.waitForTimeout(250);
vista = await estado();
comprobar(vista.herramienta.length > 0, 'el foco por teclado también muestra la cifra');

/* selección */
await pagina.locator('.hx-hex-dato').first().focus();
await pagina.waitForTimeout(150);
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(300);
vista = await estado();
comprobar(vista.fichaTitulo.startsWith('Celda') && /muertes reportadas/.test(vista.ficha) && /Fechas de reporte/.test(vista.ficha) && /OIM Missing Migrants/.test(vista.ficha), `Enter abre la ficha de la celda («${vista.fichaTitulo}»)`);
comprobar(vista.activos === 1 && vista.pressed === 1, 'la celda seleccionada queda marcada una sola vez');
const otra = pagina.locator('.hx-hex-dato').nth(3);
const cajaOtra = await otra.boundingBox();
await pagina.mouse.click(cajaOtra.x + cajaOtra.width / 2, cajaOtra.y + cajaOtra.height / 2);
await pagina.waitForTimeout(300);
vista = await estado();
comprobar(vista.activos === 1 && vista.fichaTitulo.startsWith('Celda'), 'al elegir otra celda la ficha se sustituye');
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(250);
vista = await estado();
comprobar(vista.fichaTitulo === 'Selección' && vista.activos === 0, 'Escape cierra la ficha y limpia la marca');

/* restaurar periodo y medida */
await pagina.selectOption('#hxPeriodo', '');
await pagina.selectOption('#hxMedida', 'incidentes');
await pagina.waitForTimeout(400);

/* capas */
const capa = (id) => pagina.locator(`#hxCapas input[data-capa="${id}"]`);
const grupoVisible = (sel) => pagina.evaluate((s) => {
  const g = document.querySelector(s);
  return g ? getComputedStyle(g).display !== 'none' : false;
}, sel);
for (const [id, sel, nombre] of [
  ['ferro', '.hx-ferro-g', 'red ferroviaria'],
  ['inm', '.hx-inm-g', 'zonas INM'],
  ['corredor', '.hx-corredor-g', 'corredor OIM'],
]) {
  await capa(id).uncheck();
  await pagina.waitForTimeout(150);
  comprobar(!(await grupoVisible(sel)), `apagar «${nombre}» oculta la capa`);
  await capa(id).check();
  await pagina.waitForTimeout(150);
  comprobar(await grupoVisible(sel), `encender «${nombre}» la muestra`);
}

/* fuente ICIJ/CLIP: hexágonos con su propia unidad, sin puntos */
await pagina.selectOption('#hxFuente', 'icij');
await pagina.waitForTimeout(700);
await pagina.locator('#hxMap').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(300);
vista = await estado();
const esperadoIcij = filasIcij.length;
comprobar(vista.fuente === 'icij' && vista.fuenteOpciones.includes('mmp') && vista.fuenteOpciones.includes('icij'), 'el control de fuente ofrece OIM/MMP e ICIJ/CLIP');
comprobar(vista.medidaDeshabilitada && /Filas de incidentes documentados/.test(vista.medidaOpciones.join(' ')), 'con ICIJ la medida se fija en filas de incidentes documentados');
comprobar(vista.modosDeshabilitados, 'con ICIJ los modos MMP quedan deshabilitados');
comprobar(new RegExp(`^${esperadoIcij} filas de incidentes documentados en`).test(vista.titulo), `título ICIJ con unidad y total («${vista.titulo}»)`);
comprobar(/ICIJ\/CLIP/.test(vista.subtitulo) && /no se suma con OIM\/MMP/i.test(vista.subtitulo), 'subtítulo ICIJ declara fuente y que no se suma con MMP');
comprobar(/filas de incidentes documentados/.test(vista.resumen) && /no se suman/.test(vista.resumen) && !/OIM Missing Migrants Project/.test(vista.resumen), 'resumen ICIJ usa su unidad y no mezcla MMP');
comprobar(/ICIJ\/CLIP/.test(vista.leyenda) && /filas ICIJ\/CLIP/.test(vista.leyenda) && !/un punto naranja/.test(vista.leyenda), 'leyenda ICIJ describe hexágonos, no puntos');
comprobar(/filas ICIJ\/CLIP/.test(vista.caption) && /no se suma con MMP/.test(vista.caption), 'tabla ICIJ declara unidad y separación');
comprobar(!/Países/.test(vista.tablaTexto) && !/Muertes documentadas/.test(vista.resumen), 'la tabla y el resumen ICIJ no reutilizan campos ni cifras de MMP');
comprobar(vista.filas > 0 && vista.filas === vista.datos && vista.datos < esperadoIcij, `ICIJ agregado en ${vista.datos} celdas (${vista.filas} filas de tabla)`);
const sumaICIJ = (caption) => num(caption.match(/suma ([\d,.]+) filas/)?.[1] || '');
comprobar(sumaICIJ(vista.caption) === esperadoIcij, `la tabla ICIJ suma ${esperadoIcij} filas, no personas`);
await pagina.locator('.hx-frame').screenshot({ path: path.join(SALIDA, 'hexbin-icij-mapa.png') });
const colorICIJ = await pagina.evaluate(() => {
  const rgb = (t) => (getComputedStyle(document.querySelector('.hx-hex-dato')).fill.match(/\d+/g) || []).slice(0, 3).map(Number);
  return rgb();
});
comprobar(colorICIJ[0] > colorICIJ[1] && colorICIJ[1] > colorICIJ[2], `ICIJ usa la rampa naranja (${colorICIJ.join(',')})`);
comprobar(colorICIJ.join(',') !== coloresCapas.hexRgb.join(','), 'la fuente ICIJ cambia el color de los hexágonos');
const celdaIcij = await pagina.evaluate(() => {
  const mapa = document.getElementById('hxMap').getBoundingClientRect();
  for (const nodo of document.querySelectorAll('.hx-hex-dato')) {
    const b = nodo.getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    if (x < mapa.left + 8 || x > mapa.right - 8 || y < Math.max(0, mapa.top) + 8 || y > Math.min(innerHeight, mapa.bottom) - 8) continue;
    if (document.elementFromPoint(x, y)?.closest('.hx-hex-dato') === nodo) return { x, y };
  }
  return null;
});
if (celdaIcij) {
  await pagina.mouse.move(celdaIcij.x, celdaIcij.y);
  await pagina.waitForTimeout(300);
}
vista = await estado();
comprobar(Boolean(celdaIcij) && /filas? de incidentes documentados/.test(vista.herramienta) && /ICIJ\/CLIP/.test(vista.herramienta) && !/OIM MMP/.test(vista.herramienta), `tooltip ICIJ con unidad y fuente («${vista.herramienta.slice(0, 90)}…»)`);
if (celdaIcij) {
  await pagina.mouse.click(celdaIcij.x, celdaIcij.y);
  await pagina.waitForTimeout(300);
}
vista = await estado();
comprobar(vista.fichaTitulo === 'Celda ICIJ/CLIP' && /filas? de incidentes documentados/i.test(vista.ficha) && /no son personas/i.test(vista.ficha) && /no se suman/i.test(vista.ficha) && /no es la ubicación exacta/i.test(vista.ficha), `ficha de celda ICIJ con unidad, periodo y límites («${vista.fichaTitulo}»)`);
comprobar(vista.activos === 1, 'la celda ICIJ seleccionada queda marcada una sola vez');
await pagina.locator('.hx-side').screenshot({ path: path.join(SALIDA, 'hexbin-icij-ficha.png') });
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(200);
const anioICIJ = aniosIcij[aniosIcij.length - 1];
await pagina.selectOption('#hxPeriodo', anioICIJ);
await pagina.waitForTimeout(500);
vista = await estado();
const esperadoAnio = filasIcij.filter((p) => String(p.year) === anioICIJ).length;
comprobar(vista.titulo.startsWith(`${esperadoAnio} filas de incidentes documentados`) && sumaICIJ(vista.caption) === esperadoAnio, `el periodo ICIJ recalcula las filas (${anioICIJ}: ${esperadoAnio})`);
await pagina.selectOption('#hxPeriodo', '');
await pagina.waitForTimeout(300);
const tablaPuntos = await pagina.evaluate(() => ({
  filas: document.querySelectorAll('#hxTablaPuntos tbody tr').length,
  texto: document.querySelector('#hxTablaPuntos caption')?.textContent || '',
}));
comprobar(tablaPuntos.filas === 148 && /fila de incidente/.test(tablaPuntos.texto) && /no persona/.test(tablaPuntos.texto), `tabla accesible de filas ICIJ (${tablaPuntos.filas} filas)`);

/* volver a MMP: hexágonos, leyenda y unidades propias */
await pagina.selectOption('#hxFuente', 'mmp');
await pagina.waitForTimeout(600);
vista = await estado();
comprobar(vista.fuente === 'mmp' && /OIM\/MMP/.test(vista.leyenda) && /registros MMP/.test(vista.leyenda), 'al volver a MMP la leyenda describe registros MMP');
comprobar(!/filas ICIJ\/CLIP/.test(vista.caption) && /incidentes/.test(vista.caption), 'la tabla vuelve a la unidad de MMP');
const colorMMP = await pagina.evaluate(() => (getComputedStyle(document.querySelector('.hx-hex-dato')).fill.match(/\d+/g) || []).slice(0, 3).map(Number));
comprobar(colorMMP[2] > colorMMP[1], `MMP recupera su rampa (${colorMMP.join(',')})`);
await pagina.keyboard.press('Escape');

/* ficha de un tramo ferroviario */
const railPunto = await pagina.evaluate(() => {
  const mapa = document.getElementById('hxMap').getBoundingClientRect();
  for (const path of document.querySelectorAll('.hx-ferromex')) {
    const largo = path.getTotalLength();
    const m = path.getScreenCTM();
    for (const f of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const pt = path.getPointAtLength(largo * f);
      const x = m.a * pt.x + m.c * pt.y + m.e;
      const y = m.b * pt.x + m.d * pt.y + m.f;
      if (x < mapa.left + 8 || x > mapa.right - 8 || y < mapa.top + 8 || y > mapa.bottom - 8) continue;
      const top = document.elementFromPoint(x, y);
      if (top && top.closest('.hx-ferro') === path) return { x, y };
    }
  }
  return null;
});
if (railPunto) { await pagina.mouse.click(railPunto.x, railPunto.y); await pagina.waitForTimeout(300); }
const fichaRail = await pagina.evaluate(() => ({ titulo: document.getElementById('hxFichaTitulo').textContent.trim(), texto: document.getElementById('hxFicha').innerText.replace(/\s+/g, ' ') }));
comprobar(Boolean(railPunto) && fichaRail.titulo === 'Tramo ferroviario' && /Morado oscuro \(Ferromex\)/.test(fichaRail.texto), `la ficha del tramo distingue Ferromex en morado oscuro («${fichaRail.titulo}»)`);
await pagina.keyboard.press('Escape');

/* rueda: acerca y aleja centrado en el cursor, sin desplazar la página ni seleccionar */
await pagina.locator('#hxMap').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(300);
await pagina.locator('#hxReset').click();
await pagina.waitForTimeout(300);
const mapaCaja = await pagina.locator('#hxMap').boundingBox();
const cxMapa = mapaCaja.x + mapaCaja.width / 2;
const cyMapa = mapaCaja.y + mapaCaja.height / 2;
const contenidoEnCursor = () => pagina.evaluate(({ x, y }) => {
  const svg = document.getElementById('hxMap');
  const p = svg.createSVGPoint();
  p.x = x; p.y = y;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  const m = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)/.exec(document.querySelector('.hx-lienzo').getAttribute('transform'));
  return { x: (q.x - Number(m[1])) / Number(m[3]), y: (q.y - Number(m[2])) / Number(m[3]) };
}, { x: cxMapa, y: cyMapa });
await pagina.mouse.move(cxMapa, cyMapa);
const scrollAntesMapa = await pagina.evaluate(() => window.scrollY);
const anclaAntes = await contenidoEnCursor();
await pagina.mouse.wheel(0, -400);
await pagina.waitForTimeout(400);
vista = await estado();
const anclaDespues = await contenidoEnCursor();
const zoomRueda = num(vista.zoom);
comprobar(zoomRueda > 100, `la rueda hacia arriba acerca el mapa (${vista.zoom})`);
comprobar(Math.hypot(anclaAntes.x - anclaDespues.x, anclaAntes.y - anclaDespues.y) < 4, 'el zoom de rueda queda centrado en el cursor');
comprobar((await pagina.evaluate(() => window.scrollY)) === scrollAntesMapa, 'la rueda sobre el mapa no desplaza la página');
comprobar(vista.activos === 0 && vista.herramienta === '', 'la rueda no selecciona celdas ni deja tooltip abierto');
await pagina.mouse.wheel(0, 400);
await pagina.waitForTimeout(400);
vista = await estado();
comprobar(num(vista.zoom) < zoomRueda, `la rueda hacia abajo aleja el mapa (${vista.zoom})`);
/* rueda sobre una capa superpuesta (tramo ferroviario) */
await pagina.locator('#hxReset').click();
await pagina.waitForTimeout(300);
const capaPunto = await pagina.evaluate(() => {
  const mapa = document.getElementById('hxMap').getBoundingClientRect();
  for (const path of document.querySelectorAll('.hx-ferromex')) {
    const largo = path.getTotalLength();
    const m = path.getScreenCTM();
    for (const f of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const pt = path.getPointAtLength(largo * f);
      const x = m.a * pt.x + m.c * pt.y + m.e;
      const y = m.b * pt.x + m.d * pt.y + m.f;
      if (x < mapa.left + 8 || x > mapa.right - 8 || y < mapa.top + 8 || y > mapa.bottom - 8) continue;
      if (document.elementFromPoint(x, y)?.closest('.hx-ferro') === path) return { x, y };
    }
  }
  return null;
});
if (capaPunto) {
  const fichaAntesCapa = (await estado()).fichaTitulo;
  await pagina.mouse.move(capaPunto.x, capaPunto.y);
  await pagina.mouse.wheel(0, -200);
  await pagina.waitForTimeout(300);
  vista = await estado();
  comprobar(num(vista.zoom) > 100 && vista.fichaTitulo === fichaAntesCapa, `la rueda sobre una capa también acerca sin abrir ficha (${vista.zoom})`);
}
/* fuera del mapa, la página se desplaza con normalidad */
await pagina.locator('#hxReset').click();
await pagina.evaluate(() => window.scrollTo(0, 0));
await pagina.waitForTimeout(200);
await pagina.mouse.move(6, 320);
await pagina.mouse.wheel(0, 500);
await pagina.waitForTimeout(400);
comprobar((await pagina.evaluate(() => window.scrollY)) > 0, 'fuera del mapa la rueda desplaza la página');
await pagina.evaluate(() => window.scrollTo(0, 0));
await pagina.waitForTimeout(200);

/* pinza táctil: dos punteros separados acercan */
const zoomPinza = await pagina.evaluate(() => {
  const svg = document.getElementById('hxMap');
  const caja = svg.getBoundingClientRect();
  const cx = caja.left + caja.width / 2;
  const cy = caja.top + caja.height / 2;
  const ev = (tipo, id, x, y) => svg.dispatchEvent(new PointerEvent(tipo, {
    bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', clientX: x, clientY: y, button: 0,
  }));
  ev('pointerdown', 11, cx - 40, cy);
  ev('pointerdown', 12, cx + 40, cy);
  ev('pointermove', 11, cx - 80, cy);
  ev('pointermove', 12, cx + 80, cy);
  ev('pointerup', 11, cx - 80, cy);
  ev('pointerup', 12, cx + 80, cy);
  return document.getElementById('hxZoomNivel').textContent.trim();
});
comprobar(num(zoomPinza) > 100, `la pinza táctil acerca el mapa (${zoomPinza})`);
await pagina.waitForTimeout(300);
await pagina.locator('#hxReset').click();
await pagina.waitForTimeout(300);
vista = await estado();
const zoomBoton = vista.zoom;
await pagina.locator('#hxZoomIn').click();
await pagina.locator('#hxZoomIn').click();
await pagina.waitForTimeout(300);
const zoomGrande = (await estado()).zoom;
comprobar(num(zoomGrande) > num(zoomBoton) && num(zoomBoton) === 100, `zoom y restablecer siguen funcionando (${zoomGrande})`);
await pagina.locator('#hxReset').click();
await pagina.waitForTimeout(300);
comprobar((await estado()).zoom === '100 %', 'restablecer vuelve a 100 %');

/* desapariciones */
await pagina.locator('#hxModoDesapariciones').click();
await pagina.waitForTimeout(500);
vista = await estado();
const incDesap = suma('desapariciones', 'incidentes');
comprobar(/Desapariciones documentadas/.test(vista.resumen) && /desaparecidas/.test(vista.medidaOpciones.join(' ')), 'el modo desapariciones cambia fuente, unidad y medidas');
comprobar(/Personas desaparecidas reportadas/.test(vista.medidaOpciones.join(' ')), 'se ofrece la medida de personas desaparecidas');
comprobar(vista.datos === celdasCon('desapariciones', 'incidentes'), `el mapa usa el subconjunto de desapariciones (${vista.datos} celdas)`);
comprobar(vista.eaaf && /EAAF/.test(vista.eaafTexto) && /2[.,]?351/.test(vista.eaafTexto), 'el agregado del EAAF se muestra aparte, sin mapa');
comprobar(/no se suma con el mapa/.test(vista.resumen), 'se advierte que el EAAF no se suma con el mapa');
[incTabla] = sumaTabla(vista.caption);
comprobar(incTabla === incDesap, `la suma de desapariciones coincide (${incTabla} incidentes)`);

/* fuente agregada: EAAF sin mapa */
await pagina.selectOption('#hxFuente', 'eaaf');
await pagina.waitForTimeout(400);
vista = await estado();
comprobar(vista.vacio && /EAAF/.test(vista.vacioTexto), 'al elegir EAAF el mapa avisa que no tiene geometría');
comprobar(/^EAAF/.test(vista.titulo) && /EAAF/.test(vista.resumen) && !/5[.,]?926/.test(vista.resumen), 'con EAAF el título y el resumen declaran esa fuente sin reutilizar cifras MMP');
comprobar(/EAAF/.test(vista.leyenda) && /sin coordenadas/.test(vista.tablaTexto), `la leyenda y la tabla explican que EAAF no tiene celdas («${vista.leyenda.slice(0, 80)}» / «${vista.tablaTexto.slice(0, 90)}»)`);
const hexVisibles = await pagina.evaluate(() => {
  const g = document.querySelector('.hx-hex-g');
  return g ? getComputedStyle(g).display !== 'none' : true;
});
comprobar(!hexVisibles, 'la malla se oculta cuando la fuente es un agregado sin coordenadas');
await pagina.selectOption('#hxFuente', 'mmp');
await pagina.waitForTimeout(300);
await pagina.locator('#hxCard').screenshot({ path: path.join(SALIDA, 'hexbin-desapariciones.png') });

/* capturas */
const celdaCap = pagina.locator('.hx-hex-dato').nth(2);
const cajaCap = await celdaCap.boundingBox();
await pagina.mouse.click(cajaCap.x + cajaCap.width / 2, cajaCap.y + cajaCap.height / 2);
await pagina.waitForTimeout(300);
await pagina.locator('.hx-side').screenshot({ path: path.join(SALIDA, 'hexbin-ficha.png') });

/* ---------------------------------------------------------------- móvil */
const movilCtx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX' });
const movil = await movilCtx.newPage();
const erroresMovil = [];
movil.on('console', (m) => { if (m.type() === 'error') erroresMovil.push(m.text().slice(0, 160)); });
movil.on('pageerror', (e) => erroresMovil.push('pageerror: ' + e.message.slice(0, 160)));
await movil.goto(`${BASE}index.html`, { waitUntil: 'load' });
await movil.locator('[data-target="muertes"]').click();
const tabsMovil = await movil.evaluate(() => {
  const tabs = document.getElementById('tabs');
  const botones = [...tabs.querySelectorAll('.wm-tab')];
  return {
    iconos: tabs.querySelectorAll('.wm-tab svg').length,
    wrap: getComputedStyle(tabs).flexWrap,
    filas: new Set(botones.map((b) => Math.round(b.getBoundingClientRect().top))).size,
    alturas: botones.map((b) => Math.round(b.getBoundingClientRect().height)),
    ajustan: botones.every((b) => b.scrollWidth <= b.clientWidth + 1),
    activo: document.querySelector('.wm-tab.is-activa')?.textContent.trim() || '',
    aria: document.querySelector('.wm-tab.is-activa')?.getAttribute('aria-current') || '',
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
comprobar(tabsMovil.iconos === 6 && tabsMovil.wrap === 'wrap' && tabsMovil.filas >= 2, `móvil: pestañas del Atlas en varias filas (${tabsMovil.filas})`);
comprobar(tabsMovil.alturas.every((h) => h >= 44) && tabsMovil.ajustan && tabsMovil.desborde <= 0, `móvil: objetivos de 44 px, etiquetas sin cortes y sin desbordamiento (${tabsMovil.alturas.join('/')})`);
comprobar(tabsMovil.activo === 'Muertes documentadas' && tabsMovil.aria === 'page', `móvil: pestaña activa marcada («${tabsMovil.activo}»)`);
await movil.waitForSelector('.hx-hex', { timeout: 30_000 });
await movil.waitForTimeout(700);
await movil.locator('#hxMap').scrollIntoViewIfNeeded();
await movil.waitForTimeout(400);
const infoMovil = await movil.evaluate(() => {
  const svg = document.getElementById('hxMap');
  const caja = svg.getBoundingClientRect();
  return {
    ancho: Math.round(caja.width), alto: Math.round(caja.height),
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    viewport: window.innerWidth,
    hexes: document.querySelectorAll('.hx-hex').length,
    botones: document.querySelectorAll('.hx-modos button').length,
    leyenda: document.querySelectorAll('.hx-claves li').length,
  };
});
comprobar(infoMovil.ancho >= 300 && infoMovil.alto >= 300, `móvil: mapa utilizable (${infoMovil.ancho}×${infoMovil.alto})`);
comprobar(infoMovil.desborde <= 0, `móvil: sin scroll horizontal (${infoMovil.desborde} px)`);
comprobar(infoMovil.hexes === geo.features.length && infoMovil.botones === 2, 'móvil: se dibuja la malla y los dos modos');
const puntoMovil = await movil.evaluate(() => {
  const mapa = document.getElementById('hxMap').getBoundingClientRect();
  for (const c of document.querySelectorAll('.hx-hex-dato')) {
    const b = c.getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    if (x < mapa.left + 6 || x > mapa.right - 6 || y < Math.max(0, mapa.top) + 6 || y > Math.min(innerHeight, mapa.bottom) - 6) continue;
    const arriba = document.elementFromPoint(x, y);
    if (arriba && arriba.closest('.hx-hex-dato') === c) return { x, y };
  }
  return null;
});
if (puntoMovil) await movil.touchscreen.tap(puntoMovil.x, puntoMovil.y);
await movil.waitForTimeout(500);
const fichaMovil = await movil.evaluate(() => document.getElementById('hxFichaTitulo').textContent.trim());
comprobar(Boolean(puntoMovil) && fichaMovil.startsWith('Celda'), `móvil: tocar una celda abre su ficha (${fichaMovil})`);
comprobar(await movil.evaluate(() => getComputedStyle(document.getElementById('hxMap')).touchAction === 'none'), 'móvil: el mapa captura el gesto táctil para arrastrar y pellizcar');
await movil.selectOption('#hxFuente', 'icij');
await movil.waitForTimeout(600);
const iciJMovil = await movil.evaluate(() => {
  const rgb = (getComputedStyle(document.querySelector('.hx-hex-dato')).fill.match(/\d+/g) || []).slice(0, 3).map(Number);
  return {
    fuente: document.getElementById('hxFuente').value,
    titulo: document.getElementById('hxTitle').textContent.trim(),
    naranja: rgb[0] > rgb[1] && rgb[1] > rgb[2],
    deshabilitados: [...document.querySelectorAll('.hx-modos button')].every((b) => b.disabled),
    puntos: document.querySelectorAll('.hx-icij-punto').length,
  };
});
comprobar(iciJMovil.fuente === 'icij' && iciJMovil.naranja && iciJMovil.puntos === 0, 'móvil: la fuente ICIJ usa hexágonos naranjas sin puntos');
comprobar(iciJMovil.deshabilitados && /filas de incidentes documentados/.test(iciJMovil.titulo), 'móvil: ICIJ declara su unidad y deshabilita los modos MMP');
await movil.evaluate(() => window.scrollTo(0, 0));
await movil.waitForTimeout(300);
comprobar(erroresMovil.length === 0, `móvil: sin errores de consola (${erroresMovil.slice(0, 2).join(' | ')})`);
await movil.locator('#hxCard').screenshot({ path: path.join(SALIDA, 'hexbin-movil.png') });

comprobar(externos.length === 0, `sin peticiones externas en tiempo de ejecución (${externos.slice(0, 2).join(' | ') || 'ninguna'})`);
comprobar(errores.length === 0, `escritorio: sin errores de consola (${errores.slice(0, 2).join(' | ')})`);

await navegador.close();
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
for (const linea of ok) console.log('OK    ' + linea);
for (const linea of fallos) console.log('FALLA ' + linea);
if (fallos.length) process.exitCode = 1;
