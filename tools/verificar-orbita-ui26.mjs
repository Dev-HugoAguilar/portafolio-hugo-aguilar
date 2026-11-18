/**
 * Verificación funcional de ORBITA · UI 26.
 *
 *   node tools/verificar-orbita-ui26.mjs
 *
 * Requiere el servidor estático local en http://127.0.0.1:8000.
 * Comprueba controles, worker real, rangos, comparación, exportaciones,
 * indicador de pestañas, menú móvil e integración de la ficha.
 *
 * No captura pantallas: la escena WebGL puede bloquear el compositor de
 * Chromium en `page.screenshot`. Las capturas se generan por separado con
 * Chrome del sistema (`capturar-*.mjs`).
 */
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:8000';
const DEMO = `${BASE}/dashboards/orbita/index.html`;
const FICHA = `${BASE}/#/area/dashboards/orbita`;
const PANEL = `${BASE}/#/area/dashboards`;

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

const ok = [];
const fallos = [];
const detalles = [];
const comprobar = (condicion, etiqueta, detalle = '') => {
  (condicion ? ok : fallos).push(etiqueta);
  if (detalle) detalles.push(`${condicion ? 'OK ' : 'FALLO'} · ${etiqueta}: ${detalle}`);
};

// Chrome del sistema: el Chromium empaquetado con SwiftShader se bloquea al
// alternar varias capas WebGL y también al capturar la escena.
const navegador = await chromium.launch({
  channel: 'chrome',
  args: ['--ignore-gpu-blocklist'],
});
const contexto = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});

await contexto.addInitScript(() => {
  window.__workerStats = { created: 0, messages: 0 };
  const Nativo = window.Worker;
  window.Worker = class extends Nativo {
    constructor(...args) {
      super(...args);
      window.__workerStats.created += 1;
      const enviar = this.postMessage.bind(this);
      this.postMessage = (...mensajes) => {
        window.__workerStats.messages += 1;
        return enviar(...mensajes);
      };
    }
  };
});

const pagina = await contexto.newPage();
const erroresConsola = [];
const erroresPagina = [];
const solicitudesFallidas = [];
pagina.on('console', (m) => {
  if (m.type() === 'error') erroresConsola.push(m.text());
});
pagina.on('pageerror', (e) => erroresPagina.push(e.message));
pagina.on('requestfailed', (r) => solicitudesFallidas.push(`${r.url()} · ${r.failure()?.errorText || 'sin detalle'}`));

const esperarDemo = async (p, timeout = 60_000) => {
  await p.waitForSelector('#count', { timeout });
  await p.waitForFunction(() => document.querySelectorAll('[data-tab]').length === 5, null, { timeout });
  await p.waitForTimeout(2200);
};

async function estadoDemo(p) {
  return p.evaluate(() => {
    const texto = (s) => document.querySelector(s)?.textContent?.trim() || '';
    const nav = document.querySelector('nav');
    const indicador = nav?.querySelector('.nav-indicator');
    const activo = nav?.querySelector('[aria-selected="true"]');
    const rect = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const estiloIndicador = indicador ? getComputedStyle(indicador) : null;
    return {
      tabs: [...document.querySelectorAll('[data-tab]')].map((b) => b.dataset.tab),
      activo: activo?.dataset.tab || null,
      panelesVisibles: [...document.querySelectorAll('.panel')].filter((x) => !x.hidden).map((x) => x.id),
      count: texto('#count'),
      layerSummary: texto('#layerSummary'),
      layers: [...document.querySelectorAll('button[aria-label$="Activar u ocultar capa"]')].map((b) => ({
        aria: b.getAttribute('aria-label'),
        pressed: b.getAttribute('aria-pressed'),
      })),
      toggleAll: texto('#toggleAllLayers'),
      navPosition: nav ? getComputedStyle(nav).position : null,
      navOverflowX: nav ? getComputedStyle(nav).overflowX : null,
      navScrollWidth: nav?.scrollWidth || 0,
      navClientWidth: nav?.clientWidth || 0,
      navScrollLeft: nav?.scrollLeft || 0,
      activeRect: rect(activo),
      indicatorRect: rect(indicador),
      indicatorTransition: estiloIndicador
        ? `${estiloIndicador.transitionProperty} ${estiloIndicador.transitionDuration}`
        : null,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      satName: texto('#satName'),
      satGroup: texto('#satGroup'),
      satMetrics: texto('#satMetrics'),
      mode: texto('#mode'),
      play: texto('#play'),
      time: document.querySelector('#time')?.value || null,
      speed: document.querySelector('#speed')?.value || null,
      passStatus: texto('#passStatus'),
      passRows: document.querySelectorAll('#passRows tr').length,
      passReadout: texto('#skyReadout'),
      altitudeSelection: texto('#altitudeSelection'),
      altitudeRows: document.querySelectorAll('#altitudeRows tr').length,
      compareStatus: texto('#compareStatus'),
      compareReadout: texto('#compareReadout'),
      compareRows: document.querySelectorAll('#comparisonRows tr').length,
      compareScale: document.querySelector('#compareScale')?.value || null,
      heatRects: document.querySelectorAll('#compareHeat rect').length,
      qualityRows: document.querySelectorAll('#qualityRows tr').length,
      sourceGroups: document.querySelectorAll('#sourceList details').length,
      cspMeta: Boolean(document.querySelector('meta[http-equiv="Content-Security-Policy"]')),
      baseURI: document.baseURI,
      worker: window.__workerStats,
    };
  });
}

try {
  await pagina.goto(DEMO, { waitUntil: 'load', timeout: 60_000 });
  await esperarDemo(pagina);
  let e = await estadoDemo(pagina);

  comprobar(e.tabs.join(',') === 'explore,constellations,passes,compare,method', 'las cinco vistas existen en orden', e.tabs.join(','));
  comprobar(e.activo === 'explore' && e.panelesVisibles.join(',') === 'explore', 'la vista inicial es Explorador y sólo hay un panel visible', `${e.activo} · ${e.panelesVisibles}`);
  comprobar(e.count.includes('12,308'), 'contador inicial del snapshot', e.count);
  comprobar(e.layerSummary.includes('6 de 6 visibles') && e.layers.length === 6, 'seis capas visibles al inicio', e.layerSummary);
  comprobar(e.layers.every((l) => l.pressed === 'true'), 'las seis capas inician activas', e.layers.map((l) => l.pressed).join(','));
  comprobar(e.toggleAll === 'Ocultar todas', 'acción global inicial', e.toggleAll);
  comprobar(e.mode === 'Mapa 2D' && /Reproducir/.test(e.play) && e.time === '0' && e.speed === '1', 'controles iniciales de escena y tiempo', JSON.stringify({ mode: e.mode, play: e.play, time: e.time, speed: e.speed }));
  comprobar(e.navPosition === 'relative', 'el menú permanece en el flujo (position: relative)', e.navPosition);
  comprobar(e.activeRect && e.indicatorRect && Math.abs(e.activeRect.x - e.indicatorRect.x) <= 1 && Math.abs(e.activeRect.w - e.indicatorRect.w) <= 1, 'indicador alineado al inicio', JSON.stringify({ a: e.activeRect, i: e.indicatorRect }));
  comprobar(/0\.35s/.test(e.indicatorTransition || ''), 'indicador declarado con transición CSS', e.indicatorTransition);
  comprobar(e.worker.created >= 1 && e.worker.messages >= 1, 'worker Blob creado y con mensajes', JSON.stringify(e.worker));
  comprobar(!e.cspMeta, 'sin CSP meta restrictiva en el documento', String(e.cspMeta));
  comprobar(e.documentScrollWidth === e.clientWidth, 'sin overflow horizontal a 1440', `${e.documentScrollWidth}/${e.clientWidth}`);

  const escena = pagina.frames().find((f) => f.url() === 'about:srcdoc');
  comprobar(Boolean(escena), 'escena 3D en iframe srcdoc');
  if (escena) {
    const gl = await escena.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      let ctx = null;
      for (const tipo of ['webgl2', 'webgl', 'experimental-webgl']) {
        try {
          ctx = c.getContext(tipo);
          if (ctx) break;
        } catch {
          /* probar el siguiente */
        }
      }
      if (!ctx) return { canvas: true, gl: false, width: c.width, height: c.height };
      return {
        canvas: true,
        gl: true,
        version: ctx.getParameter(ctx.VERSION),
        renderer: ctx.getParameter(ctx.RENDERER),
        width: c.width,
        height: c.height,
        error: ctx.getError(),
      };
    });
    comprobar(gl?.gl === true && gl.width > 0 && gl.height > 0, 'WebGL activo con canvas dimensionado', JSON.stringify(gl));
    comprobar(gl?.error === 0, 'sin error WebGL inmediato', String(gl?.error));
    const labels = await escena.evaluate(() => [...document.querySelectorAll('div')].some((d) => /Tiangong|Estación Espacial/.test(d.textContent || '')));
    comprobar(labels, 'etiquetas de estaciones presentes en la escena');
  }

  console.log('etapa: indicador');
  // Indicador: cambio de pestaña y animación.
  await pagina.locator('[data-tab="constellations"]').click();
  await pagina.waitForTimeout(650);
  const fin = await estadoDemo(pagina);
  comprobar(fin.activo === 'constellations' && fin.panelesVisibles.join(',') === 'constellations', 'cambio a Constelaciones', fin.activo);
  comprobar(fin.activeRect && fin.indicatorRect && Math.abs(fin.activeRect.x - fin.indicatorRect.x) <= 1 && Math.abs(fin.activeRect.w - fin.indicatorRect.w) <= 1, 'indicador final alineado tras cambiar de pestaña', JSON.stringify({ a: fin.activeRect, i: fin.indicatorRect }));
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.waitForTimeout(900);
  const estrecho = await estadoDemo(pagina);
  comprobar(estrecho.activeRect && estrecho.indicatorRect && Math.abs(estrecho.activeRect.x - estrecho.indicatorRect.x) <= 1 && Math.abs(estrecho.activeRect.w - estrecho.indicatorRect.w) <= 1 && estrecho.documentScrollWidth === estrecho.clientWidth, 'indicador alineado y sin overflow tras redimensionar a 390', JSON.stringify({ a: estrecho.activeRect, i: estrecho.indicatorRect, w: `${estrecho.documentScrollWidth}/${estrecho.clientWidth}`, nav: estrecho.navOverflowX }));
  await pagina.setViewportSize({ width: 1440, height: 900 });
  await pagina.waitForTimeout(900);
  const ancho = await estadoDemo(pagina);
  comprobar(ancho.activeRect && ancho.indicatorRect && Math.abs(ancho.activeRect.x - ancho.indicatorRect.x) <= 1 && Math.abs(ancho.activeRect.w - ancho.indicatorRect.w) <= 1, 'indicador vuelve a alinearse al restaurar 1440', JSON.stringify({ a: ancho.activeRect, i: ancho.indicatorRect }));
  await pagina.locator('[data-tab="explore"]').click();
  await pagina.waitForTimeout(350);

  console.log('etapa: capas');
  // Cada capa se prueba en una página limpia: alternar varias capas en la
  // misma escena WebGL acumula trabajo de render y puede bloquear el clic
  // nativo; una página nueva aísla el control sin cambiar su comportamiento.
  for (let i = 0; i < 6; i += 1) {
    console.log(`capa ${i + 1}/6`);
    const limpia = await contexto.newPage();
    try {
      await limpia.goto(DEMO, { waitUntil: 'load', timeout: 60_000 });
      await esperarDemo(limpia);
      const boton = limpia.locator('button[aria-label$="Activar u ocultar capa"]').nth(i);
      const aria = await boton.getAttribute('aria-label');
      await boton.click({ timeout: 10_000 });
      await limpia.waitForTimeout(450);
      let s = await estadoDemo(limpia);
      comprobar(s.layers[i]?.pressed === 'false' && s.layerSummary.startsWith('5 de 6'), `capa ${i + 1} se oculta individualmente`, `${aria} · ${s.layerSummary}`);
      await boton.click({ timeout: 10_000 });
      await limpia.waitForTimeout(450);
      s = await estadoDemo(limpia);
      comprobar(s.layers[i]?.pressed === 'true' && s.layerSummary.startsWith('6 de 6') && s.count.includes('12,308'), `capa ${i + 1} vuelve a mostrarse`, `${aria} · ${s.layerSummary}`);
    } catch (error) {
      fallos.push(`capa ${i + 1}: ${error.message.split('\n')[0]}`);
    } finally {
      await limpia.close();
    }
  }
  await pagina.locator('#toggleAllLayers').click({ timeout: 10_000 });
  await pagina.waitForTimeout(500);
  let ocultas = await estadoDemo(pagina);
  comprobar(ocultas.layerSummary.startsWith('0 de 6') && ocultas.count.startsWith('0 ') && ocultas.toggleAll === 'Mostrar todas', 'Ocultar todas deja contador en cero', `${ocultas.layerSummary} · ${ocultas.count} · ${ocultas.toggleAll}`);
  await pagina.locator('#toggleAllLayers').click({ timeout: 10_000 });
  await pagina.waitForTimeout(500);
  const visibles = await estadoDemo(pagina);
  comprobar(visibles.layerSummary.startsWith('6 de 6') && visibles.count.includes('12,308') && visibles.toggleAll === 'Ocultar todas', 'Mostrar todas restaura el snapshot', `${visibles.layerSummary} · ${visibles.count}`);

  console.log('etapa: ventanas');
  // Ventanas geométricas, worker real y selección de objeto desde el selector.
  const mensajesAntes = (await estadoDemo(pagina)).worker.messages;
  await pagina.locator('[data-tab="passes"]').click();
  await pagina.waitForTimeout(1800);
  let p = await estadoDemo(pagina);
  comprobar(p.passRows >= 1 && /ventanas|Selección|Calculando/.test(p.passStatus), 'vista Sobre mi ubicación calcula ventanas', `${p.passRows} filas · ${p.passStatus.slice(0, 90)}`);
  comprobar((await estadoDemo(pagina)).worker.messages > mensajesAntes, 'el cálculo de ventanas usa el worker real', `${mensajesAntes} → ${(await estadoDemo(pagina)).worker.messages}`);
  const nombreInicial = p.satName;
  await pagina.locator('#satSelect').selectOption({ index: 1 });
  await pagina.waitForTimeout(650);
  const seleccionado = await estadoDemo(pagina);
  comprobar(seleccionado.satName !== nombreInicial && /Starlink/.test(seleccionado.satGroup), 'selección de un objeto actualiza nombre, grupo y métricas', `${nombreInicial} → ${seleccionado.satName} (${seleccionado.satGroup})`);
  await pagina.locator('#calcPasses').click();
  await pagina.waitForTimeout(1400);
  p = await estadoDemo(pagina);
  comprobar(/STARLINK|ISS/.test(p.passStatus) && p.passRows >= 1, 'cambio de satélite y recálculo de ventanas', `${p.passRows} filas · ${p.passStatus.slice(0, 110)}`);
  const primeraLectura = (await estadoDemo(pagina)).passReadout;
  if (p.passRows > 1) {
    await pagina.locator('#passRows button').nth(1).click();
    await pagina.waitForTimeout(450);
    const segunda = await estadoDemo(pagina);
    comprobar(segunda.passReadout !== primeraLectura, 'selección de una segunda ventana actualiza la bóveda', `${primeraLectura} → ${segunda.passReadout}`);
  }

  console.log('etapa: altura');
  // Rango de altura, tabla y exportación.
  await pagina.locator('[data-tab="constellations"]').click();
  await pagina.waitForTimeout(500);
  await pagina.locator('#altitudeFrom').fill('400');
  await pagina.locator('#altitudeTo').fill('2000');
  await pagina.locator('#applyAltitude').click();
  await pagina.waitForTimeout(400);
  const rango = await estadoDemo(pagina);
  comprobar(rango.altitudeSelection.includes('11,042 de 12,308') && rango.altitudeSelection.includes('400–2,000'), 'rango de altura 400–2,000 km', rango.altitudeSelection.slice(0, 120));
  comprobar(rango.altitudeRows === 50, 'tabla de rango limitada a 50 filas', String(rango.altitudeRows));
  await pagina.evaluate(() => {
    const d = document.querySelector('#constellations details');
    if (d) d.open = true;
  });

  const descargar = async (selector) => {
    const [descarga] = await Promise.all([
      pagina.waitForEvent('download', { timeout: 10_000 }),
      pagina.evaluate((sel) => document.querySelector(sel)?.click(), selector),
    ]);
    const ruta = await descarga.path();
    const contenido = readFileSync(ruta, 'utf8');
    return {
      nombre: descarga.suggestedFilename(),
      bytes: statSync(ruta).size,
      lineas: contenido.split('\n').length,
      inicio: contenido.slice(0, 120),
    };
  };

  const rangoCsv = await descargar('#exportAltitude');
  comprobar(rangoCsv.nombre === 'orbita_seleccion_altura.csv' && rangoCsv.lineas === 11043, 'exportación del rango de altura', JSON.stringify({ nombre: rangoCsv.nombre, lineas: rangoCsv.lineas, bytes: rangoCsv.bytes }));
  comprobar(rangoCsv.inicio.includes('norad') && rangoCsv.inicio.includes('altura_media_km'), 'encabezado del CSV de rango', rangoCsv.inicio.slice(0, 100));
  await pagina.locator('#resetAltitude').click();
  await pagina.waitForTimeout(250);
  const catalogoCsv = await descargar('#catalogExport');
  comprobar(catalogoCsv.nombre === 'orbita_catalogo.csv' && catalogoCsv.lineas === 12309, 'exportación del catálogo completo', JSON.stringify({ nombre: catalogoCsv.nombre, lineas: catalogoCsv.lineas, bytes: catalogoCsv.bytes }));

  console.log('etapa: comparación');
  // Comparación: umbral, normalización, cursor y exportación.
  await pagina.locator('[data-tab="compare"]').click();
  await pagina.waitForTimeout(1600);
  await pagina.locator('#compareScale').selectOption('normalized');
  await pagina.locator('#compareCity').selectOption('25.6866,-100.3161');
  await pagina.locator('#compareElevation').selectOption('40');
  await pagina.locator('#calcCompare').click();
  await pagina.waitForTimeout(1600);
  const comparacion = await estadoDemo(pagina);
  comprobar(comparacion.compareScale === 'normalized' && comparacion.compareReadout.includes('1,000'), 'comparación normalizada por 1,000 objetos', comparacion.compareReadout);
  comprobar(comparacion.compareStatus.includes('≥40°') && comparacion.compareRows === 3, 'comparación con umbral 40° y tres grupos', comparacion.compareStatus);
  comprobar(comparacion.heatRects > 20, 'matriz de presencia renderizada', String(comparacion.heatRects));
  const lecturaCursor = comparacion.compareReadout;
  await pagina.locator('#compareCursor').fill('12');
  await pagina.waitForTimeout(350);
  const cursor = await estadoDemo(pagina);
  comprobar(cursor.compareReadout !== lecturaCursor, 'cursor temporal actualiza la lectura comparada', `${lecturaCursor.slice(0, 70)} → ${cursor.compareReadout.slice(0, 70)}`);
  const comparacionCsv = await descargar('#compareExport');
  comprobar(comparacionCsv.nombre === 'orbita_comparacion.csv' && comparacionCsv.lineas === 26, 'exportación de comparación (25 instantes)', JSON.stringify({ nombre: comparacionCsv.nombre, lineas: comparacionCsv.lineas, bytes: comparacionCsv.bytes }));

  console.log('etapa: anotaciones');
  // Anotaciones de gráficas y estado de método.
  const anotaciones = await pagina.evaluate(() => [...document.querySelectorAll('#constellations svg text')].map((t) => t.textContent.trim()).filter(Boolean));
  comprobar(anotaciones.some((t) => t.includes('LEO · hasta 2,000 km')), 'anotación de banda LEO', anotaciones.find((t) => t.includes('LEO ·')));
  comprobar(anotaciones.some((t) => t.includes('MEO · 2,000')), 'anotación de banda MEO', anotaciones.find((t) => t.includes('MEO ·')));
  comprobar(anotaciones.some((t) => t.includes('Escala común')), 'anotación de escala común', anotaciones.find((t) => t.includes('Escala común')));
  comprobar(anotaciones.some((t) => t.includes('Cifras: %')), 'anotación de lectura de matriz', anotaciones.find((t) => t.includes('Cifras: %')));
  const pieComparacion = await pagina.locator('#compare p.foot').innerText();
  comprobar(/ancho de banda|capacidad comercial/i.test(pieComparacion), 'aviso de no capacidad comercial en comparación', pieComparacion.slice(0, 110));

  await pagina.locator('[data-tab="passes"]').click();
  await pagina.waitForTimeout(400);
  const passCsv = await descargar('#passExport');
  const filasVentanas = (await estadoDemo(pagina)).passRows;
  comprobar(passCsv.nombre === 'orbita_ventanas.csv' && passCsv.lineas === filasVentanas + 1, 'exportación de ventanas coherente con la tabla', JSON.stringify({ nombre: passCsv.nombre, lineas: passCsv.lineas, filas: filasVentanas }));
  await pagina.locator('[data-tab="method"]').click();
  await pagina.waitForTimeout(500);
  const metodo = await estadoDemo(pagina);
  comprobar(metodo.qualityRows === 6 && metodo.sourceGroups === 6, 'calidad y trazabilidad de los seis grupos', `${metodo.qualityRows} filas · ${metodo.sourceGroups} fuentes`);
  const manifiesto = await descargar('#export');
  comprobar(manifiesto.nombre === 'orbita_snapshot_manifest.json' && manifiesto.lineas >= 20, 'exportación del manifiesto', JSON.stringify({ nombre: manifiesto.nombre, lineas: manifiesto.lineas, bytes: manifiesto.bytes }));

  console.log('etapa: recarga');
  // Recarga directa y base path.
  await pagina.goto(DEMO, { waitUntil: 'load', timeout: 60_000 });
  await esperarDemo(pagina);
  const recarga = await estadoDemo(pagina);
  comprobar(recarga.activo === 'explore' && recarga.baseURI.includes('/dashboards/orbita/') && recarga.baseURI.endsWith('/dashboards/orbita/index.html'), 'recarga directa y base path', `${recarga.activo} · ${recarga.baseURI}`);
  comprobar(solicitudesFallidas.length === 0, 'cero solicitudes fallidas en la demo', solicitudesFallidas.join(' | '));
  comprobar(erroresConsola.length === 0 && erroresPagina.length === 0, 'sin errores de consola ni de página en la demo', JSON.stringify({ consola: erroresConsola, pagina: erroresPagina }));

  console.log('etapa: móvil');
  // Vista móvil, menú desplazable y cinco paneles.
  const contextoMovil = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const movil = await contextoMovil.newPage();
  await movil.goto(DEMO, { waitUntil: 'load', timeout: 60_000 });
  await esperarDemo(movil);
  let m = await estadoDemo(movil);
  comprobar(m.navOverflowX === 'auto' && m.navScrollWidth > m.navClientWidth, 'menú móvil desplazable horizontalmente', `${m.navOverflowX} · ${m.navScrollWidth}/${m.navClientWidth}`);
  comprobar(m.documentScrollWidth === m.clientWidth, 'sin overflow global a 390', `${m.documentScrollWidth}/${m.clientWidth}`);
  const cajaNav = await movil.locator('nav').boundingBox();
  if (cajaNav) {
    const cdp = await contextoMovil.newCDPSession(movil);
    const y = cajaNav.y + cajaNav.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 350, y, id: 1 }] });
    for (let i = 1; i <= 12; i += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 350 - i * 20, y, id: 1 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await movil.waitForTimeout(350);
    const trasSwipe = await estadoDemo(movil);
    comprobar(trasSwipe.navScrollLeft > 0, 'el swipe táctil mueve el menú', String(trasSwipe.navScrollLeft));
  }
  for (const vista of ['explore', 'constellations', 'passes', 'compare', 'method']) {
    await movil.locator(`[data-tab="${vista}"]`).click();
    await movil.waitForTimeout(250);
    m = await estadoDemo(movil);
    comprobar(m.panelesVisibles.join(',') === vista, `vista móvil exclusiva: ${vista}`, m.panelesVisibles.join(','));
    comprobar(m.documentScrollWidth === m.clientWidth, `sin overflow en vista móvil ${vista}`, `${m.documentScrollWidth}/${m.clientWidth}`);
  }
  await contextoMovil.close();

  console.log('etapa: integración');
  // Integración: la portada no descarga el HTML de 17 MB; la ficha sí lo incrusta.
  const ficha = await contexto.newPage();
  const solicitudesFicha = [];
  const erroresFicha = [];
  const erroresConsolaFicha = [];
  const fallidasFicha = [];
  ficha.on('request', (r) => solicitudesFicha.push(r.url()));
  ficha.on('pageerror', (x) => erroresFicha.push(x.message));
  ficha.on('console', (m) => {
    if (m.type() === 'error') erroresConsolaFicha.push(m.text());
  });
  ficha.on('requestfailed', (r) => fallidasFicha.push(`${r.url()} · ${r.failure()?.errorText || 'sin detalle'}`));
  await ficha.goto(PANEL, { waitUntil: 'networkidle', timeout: 60_000 });
  await ficha.waitForTimeout(700);
  const tarjetas = await ficha.evaluate(() => [...document.querySelectorAll('article.card')].filter((a) => /ORBITA/.test(a.innerText)).length);
  comprobar(tarjetas === 1, 'una sola tarjeta ORBITA en Dashboards', String(tarjetas));
  comprobar(!solicitudesFicha.some((u) => u.includes('/dashboards/orbita/index.html')), 'la portada no descarga el HTML de ORBITA', 'asset ausente de la red de Dashboards');

  await ficha.goto(FICHA, { waitUntil: 'networkidle', timeout: 60_000 });
  await ficha.waitForSelector('iframe', { timeout: 60_000 });
  await ficha.waitForTimeout(1800);
  const integracion = await ficha.evaluate(() => {
    const marco = document.querySelector('iframe');
    const cta = [...document.querySelectorAll('button')].filter((b) => /Explorar ORBITA|Datos y método|Abrir demo completa/.test(b.textContent));
    const enlace = [...document.querySelectorAll('a')].find((a) => /Abrir demo completa/.test(a.textContent));
    const metodo = [...document.querySelectorAll('.project-fields dt')].find((dt) => /Método y decisiones técnicas/i.test(dt.textContent));
    return {
      marco: marco
        ? {
            src: marco.src,
            sandbox: marco.getAttribute('sandbox'),
            allow: marco.getAttribute('allow'),
            title: marco.title,
            alto: Math.round(marco.getBoundingClientRect().height),
            docAlto: marco.contentDocument?.body?.scrollHeight || null,
            padreHijos: marco.parentElement?.children.length || 0,
          }
        : null,
      cta: cta.length,
      enlace: Boolean(enlace),
      barra: document.body.innerText.includes('Snapshot orbital · Demo interactiva'),
      metodo: Boolean(metodo),
      ui26: document.body.innerText.includes('UI 26'),
      ui17: document.body.innerText.includes('UI 17'),
      cspMeta: Boolean(document.querySelector('meta[http-equiv="Content-Security-Policy"]')),
    };
  });
  comprobar(integracion.marco && integracion.marco.src === DEMO, 'la ficha incrusta la demo correcta', JSON.stringify(integracion.marco));
  comprobar(integracion.marco?.sandbox === null, 'iframe sin sandbox (Worker, WebGL, srcdoc y descargas)', String(integracion.marco?.sandbox));
  comprobar(integracion.marco?.allow === 'fullscreen', 'iframe conserva allow="fullscreen"', String(integracion.marco?.allow));
  comprobar(!integracion.barra && integracion.cta === 0 && !integracion.enlace, 'la barra superior y sus CTA se eliminaron', JSON.stringify({ barra: integracion.barra, cta: integracion.cta, enlace: integracion.enlace }));
  comprobar(integracion.marco?.padreHijos === 1, 'el iframe es el único contenido montado por la ficha', String(integracion.marco?.padreHijos));
  comprobar(integracion.metodo, 'la ficha contiene el apartado Método y decisiones técnicas');
  comprobar(integracion.ui26 && !integracion.ui17, 'la ficha declara UI 26 y no UI 17', JSON.stringify({ ui26: integracion.ui26, ui17: integracion.ui17 }));
  comprobar(!integracion.cspMeta, 'la ficha no introduce una CSP meta restrictiva');

  const alturas = [];
  for (let i = 0; i < 5; i += 1) {
    await ficha.waitForTimeout(600);
    alturas.push(await ficha.evaluate(() => Math.round(document.querySelector('iframe').getBoundingClientRect().height)));
  }
  comprobar(new Set(alturas).size === 1 && alturas[0] > 900, 'altura del iframe estable con ResizeObserver', alturas.join(','));

  // Cambio de vista dentro del iframe: la altura se adapta y las flechas persisten.
  const marcoDemo = ficha.frames().find((f) => f.url() === DEMO);
  comprobar(Boolean(marcoDemo), 'el iframe expone la demo same-origin');
  if (marcoDemo) {
    const alturaExplorador = await ficha.evaluate(() => Math.round(document.querySelector('iframe').getBoundingClientRect().height));
    await marcoDemo.locator('[data-tab="constellations"]').click();
    await ficha.waitForTimeout(1500);
    const trasVista = await ficha.evaluate(() => Math.round(document.querySelector('iframe').getBoundingClientRect().height));
    comprobar(trasVista > alturaExplorador, 'la altura del iframe sigue el contenido al cambiar de vista', `${alturaExplorador} → ${trasVista}`);
    await ficha.waitForTimeout(800);
    const estable = await ficha.evaluate(() => Math.round(document.querySelector('iframe').getBoundingClientRect().height));
    comprobar(estable === trasVista, 'altura estabilizada tras el cambio de vista', `${trasVista} → ${estable}`);

    const flechasAntes = await marcoDemo.evaluate(() => ({
      arrows: document.querySelectorAll('.action-arrow').length,
      icons: document.querySelectorAll('.action-icon').length,
      primarios: [...document.querySelectorAll('button.primary')].map((b) => b.querySelectorAll('.action-arrow').length),
    }));
    await ficha.waitForTimeout(4200);
    const flechasDespues = await marcoDemo.evaluate(() => ({
      arrows: document.querySelectorAll('.action-arrow').length,
      icons: document.querySelectorAll('.action-icon').length,
      primarios: [...document.querySelectorAll('button.primary')].map((b) => b.querySelectorAll('.action-arrow').length),
    }));
    comprobar(flechasAntes.arrows === 5 && flechasAntes.icons === 0 && flechasAntes.primarios.every((n) => n === 1), 'flechas de acción conservadas tras cambios del DOM', JSON.stringify(flechasAntes));
    comprobar(JSON.stringify(flechasAntes) === JSON.stringify(flechasDespues), 'flechas estables tras varios ciclos del reloj', JSON.stringify({ antes: flechasAntes, despues: flechasDespues }));
    await marcoDemo.locator('[data-tab="explore"]').click();
    await ficha.waitForTimeout(900);
    const vuelta = await ficha.evaluate(() => Math.round(document.querySelector('iframe').getBoundingClientRect().height));
    comprobar(vuelta < trasVista && Math.abs(vuelta - alturaExplorador) < 80, 'la altura vuelve al Explorador', `${trasVista} → ${vuelta} (inicial ${alturaExplorador})`);
  }
  comprobar(erroresFicha.length === 0 && erroresConsolaFicha.length === 0 && fallidasFicha.length === 0, 'sin errores de consola, página ni solicitudes fallidas en la ficha', JSON.stringify({ pagina: erroresFicha, consola: erroresConsolaFicha, fallidas: fallidasFicha }));

  // Fin.
} catch (error) {
  fallos.push(`excepción: ${error.message}`);
} finally {
  await navegador.close();
}

console.log(`ORBITA UI 26 · ${ok.length} OK · ${fallos.length} fallos`);
if (detalles.length) console.log(detalles.join('\n'));
if (fallos.length) {
  console.log('\nFALLOS:');
  for (const f of fallos) console.log(`- ${f}`);
  process.exitCode = 1;
} else {
  console.log('\nPASS: controles, worker, vistas, exportaciones, observador y flechas.');
}
