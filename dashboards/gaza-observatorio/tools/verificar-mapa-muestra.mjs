/**
 * Verifica el mapa ampliado de la muestra visual: proporción de ancho, alto del
 * lienzo frente a la ficha, ausencia de bloque vacío, zoom, paneo, centrado y
 * resaltado del sitio, ficha vinculada, contracción y móvil a todo el ancho.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-mapa-muestra.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'mapa-muestra');
const URL_OBS = 'http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html';

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

const medir = (pagina) =>
  pagina.evaluate(() => {
    const lienzo = document.querySelector('#map');
    const caja = document.querySelector('.mapwrap');
    const layout = document.querySelector('.maplayout');
    const ficha = document.querySelector('.maplayout aside');
    const r = (el) => el.getBoundingClientRect();
    // Tinta dibujada en el lienzo: cuánto del alto usa realmente.
    let tinta = null;
    try {
      const ctx = lienzo.getContext('2d');
      const dpr = lienzo.width / Math.max(1, r(lienzo).width);
      const alto = Math.round(r(lienzo).height);
      const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height).data;
      let primera = -1;
      let ultima = -1;
      const anchoPx = lienzo.width;
      for (let y = 0; y < lienzo.height; y += 1) {
        let alguno = false;
        for (let x = 0; x < anchoPx; x += 4) {
          const i = (y * anchoPx + x) * 4;
          if (datos[i + 3] > 12) { alguno = true; break; }
        }
        if (alguno) {
          if (primera < 0) primera = y;
          ultima = y;
        }
      }
      if (primera >= 0) {
        const y0 = primera / dpr;
        const y1 = ultima / dpr;
        tinta = { desde: Math.round(y0), hasta: Math.round(y1), usado: Math.round(((y1 - y0) / alto) * 100) };
      }
    } catch (e) {
      tinta = null;
    }
    return {
      anchoMapa: Math.round(r(caja).width),
      anchoLayout: Math.round(r(layout).width),
      anchoFicha: Math.round(r(ficha).width),
      proporcion: Number((r(caja).width / r(layout).width).toFixed(3)),
      altoLienzo: Math.round(r(lienzo).height),
      altoCaja: Math.round(r(caja).height),
      altoFicha: Math.round(r(ficha).height),
      desbordeCaja: Math.round(r(caja).height - r(lienzo).height),
      altoCaption: Math.round(r(document.querySelector('#mapcount')).height),
      tinta,
      zoom: document.querySelector('#mapZoomLevel').textContent.trim(),
      botones: [...document.querySelectorAll('.maptools button')].map((b) => b.textContent.trim()),
      desbordePagina: document.documentElement.scrollWidth - window.innerWidth,
      columnaUnica: getComputedStyle(layout).gridTemplateColumns.split(' ').length === 1,
      mapaPrimero: r(caja).top <= r(ficha).top,
    };
  });

const seleccionado = (pagina) =>
  pagina.evaluate(() => {
    const t = document.querySelector('#siteTitle');
    return { id: t.dataset.site || '', titulo: t.textContent.trim(), sitio: document.querySelector('#siteSelect').value };
  });

const navegador = await chromium.launch();

/* ------------------------------------------------------------ escritorio */
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
await pagina.goto(URL_OBS, { waitUntil: 'load' });
await pagina.waitForTimeout(1800);
await pagina.locator('[data-tab="territorio"]').click();
await pagina.waitForTimeout(1000);

const base = await medir(pagina);
comprobar(base.proporcion >= 0.68 && base.proporcion <= 0.78, `el mapa ocupa ${(base.proporcion * 100).toFixed(0)} % del ancho (${base.anchoMapa} de ${base.anchoLayout} px)`);
comprobar(base.altoLienzo > 600, `el lienzo crece en alto (${base.altoLienzo} px)`);
comprobar(base.desbordeCaja - base.altoCaption <= 3, `la caja del mapa se ajusta al lienzo + su nota (${base.desbordeCaja} px, nota ${base.altoCaption} px)`);
comprobar(!!base.tinta && base.tinta.usado >= 55, `los puntos usan el alto del lienzo (${base.tinta ? base.tinta.usado + ' % del alto dibujado' : 'sin medición'})`);
comprobar(base.botones.length === 4, `controles de vista presentes (${base.botones.join(' · ')})`);
comprobar(base.zoom === '100 %', `indicador de zoom inicial (${base.zoom})`);
comprobar(base.desbordePagina <= 0, `sin desbordamiento de página (${base.desbordePagina})`);
await pagina.locator('#territorio .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '01-mapa-escritorio.png'), animations: 'disabled' });

/* ----------------------------------------------------- zoom y centrado */
const antesZoom = await seleccionado(pagina);
await pagina.locator('#mapZoomIn').click();
await pagina.waitForTimeout(400);
await pagina.locator('#mapZoomIn').click();
await pagina.waitForTimeout(400);
const conZoom = await medir(pagina);
comprobar(/1[0-9]{2} %|2[0-9]{2} %/.test(conZoom.zoom) && conZoom.zoom !== '100 %', `el botón de zoom cambia el nivel (${conZoom.zoom})`);

const geoTrasZoom = await pagina.evaluate(() => {
  const id = document.querySelector('#siteTitle').dataset.site;
  const sp = screenPoints.find((s) => s.p.id === id);
  const lienzo = document.querySelector('#map').getBoundingClientRect();
  return sp ? { x: Math.round(sp.x), y: Math.round(sp.y), ancho: Math.round(lienzo.width), alto: Math.round(lienzo.height) } : null;
});
comprobar(!!geoTrasZoom && geoTrasZoom.x >= 0 && geoTrasZoom.x <= geoTrasZoom.ancho && geoTrasZoom.y >= 0 && geoTrasZoom.y <= geoTrasZoom.alto, `con zoom, el sitio seleccionado sigue dentro del lienzo (${JSON.stringify(geoTrasZoom)})`);

// alejarse de la selección y volver con «Centrar en el sitio»
await pagina.evaluate(() => { MAPA.cx = MAPA.cx + 0.25; draw(); });
await pagina.waitForTimeout(300);
await pagina.locator('#mapCenter').click();
await pagina.waitForTimeout(400);
const centrado = await pagina.evaluate(() => {
  const id = document.querySelector('#siteTitle').dataset.site;
  const sp = screenPoints.find((s) => s.p.id === id);
  const lienzo = document.querySelector('#map').getBoundingClientRect();
  if (!sp) return null;
  return {
    desvioX: Math.round(Math.abs(sp.x - lienzo.width / 2)),
    desvioY: Math.round(Math.abs(sp.y - lienzo.height / 2)),
    id: id,
  };
});
comprobar(!!centrado && centrado.desvioX < 40 && centrado.desvioY < 60, `«Centrar en el sitio» deja el punto en el centro (Δ ${centrado && centrado.desvioX}/${centrado && centrado.desvioY} px)`);
comprobar((await seleccionado(pagina)).id === antesZoom.id, 'la selección se conserva al cambiar la vista');
await pagina.locator('#territorio .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '02-mapa-zoom.png'), animations: 'disabled' });

// restablecer vista
await pagina.locator('#mapReset').click();
await pagina.waitForTimeout(400);
const reseteado = await medir(pagina);
comprobar(reseteado.zoom === '100 %' && reseteado.altoLienzo === base.altoLienzo, `«Restablecer vista» vuelve al encuadre (${reseteado.zoom})`);

/* ------------------------------------- seleccionar otro punto del mapa */
const nuevoId = await pagina.evaluate(() => {
  const opciones = [...document.querySelectorAll('#siteSelect option')];
  const actual = document.querySelector('#siteSelect').value;
  const otra = opciones.find((o) => o.value !== actual);
  return otra ? otra.value : null;
});
await pagina.selectOption('#siteSelect', nuevoId);
await pagina.waitForTimeout(500);
const trasCambio = await seleccionado(pagina);
comprobar(trasCambio.id === nuevoId && trasCambio.titulo.length > 3, `la ficha sigue vinculada al punto (${trasCambio.titulo} · ID ${trasCambio.id})`);

// clic directo sobre el lienzo
const clic = await pagina.evaluate(() => {
  const sp = screenPoints[Math.floor(screenPoints.length / 3)];
  return sp ? { x: Math.round(sp.x), y: Math.round(sp.y), id: sp.p.id } : null;
});
const caja = await pagina.locator('#map').boundingBox();
await pagina.mouse.click(caja.x + clic.x, caja.y + clic.y);
await pagina.waitForTimeout(500);
const trasClic = await seleccionado(pagina);
comprobar(trasClic.id === clic.id, `el clic en el lienzo selecciona el punto (ID ${trasClic.id})`);

/* --------------------------------------------- filtros y contracción */
await pagina.selectOption('#group', '4');
await pagina.waitForTimeout(700);
const filtrado = await medir(pagina);
comprobar(filtrado.altoLienzo >= 340, `tras filtrar, el lienzo se reajusta a los puntos (${filtrado.altoLienzo} px)`);
comprobar(filtrado.desbordeCaja - filtrado.altoCaption <= 3, `tras filtrar, la caja sigue ajustada (${filtrado.desbordeCaja} px, nota ${filtrado.altoCaption} px)`);
await pagina.locator('#clear').click();
await pagina.waitForTimeout(600);

await pagina.locator('#siteCollapse').click();
await pagina.waitForTimeout(400);
const plegada = await pagina.evaluate(() => ({
  clase: document.querySelector('.maplayout aside').classList.contains('is-collapsed'),
  secuencia: getComputedStyle(document.querySelector('#sequence')).display,
  texto: document.querySelector('#siteCollapse').textContent.trim(),
  expandido: document.querySelector('#siteCollapse').getAttribute('aria-expanded'),
}));
comprobar(plegada.clase && plegada.secuencia === 'none', 'la ficha se puede contraer y libera espacio');
comprobar(/Ampliar/.test(plegada.texto) && plegada.expandido === 'false', 'el botón declara el estado de la ficha');
await pagina.locator('#territorio .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '03-mapa-ficha-plegada.png'), animations: 'disabled' });
await pagina.locator('#siteCollapse').click();
await pagina.close();

/* ------------------------------------------------------------------ móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`móvil: ${e.message}`));
await movil.goto(URL_OBS, { waitUntil: 'load' });
await movil.waitForTimeout(1700);
await movil.locator('[data-tab="territorio"]').click();
await movil.waitForTimeout(900);
const movilDatos = await medir(movil);
comprobar(movilDatos.columnaUnica, `móvil: una sola columna (${movilDatos.anchoMapa} px de mapa)`);
comprobar(movilDatos.mapaPrimero, 'móvil: el mapa va antes que la ficha');
comprobar(movilDatos.desbordePagina <= 0, `móvil: sin scroll horizontal de página (${movilDatos.desbordePagina})`);
comprobar(movilDatos.anchoMapa >= movilDatos.anchoLayout - 2, `móvil: el mapa ocupa todo el ancho (${movilDatos.anchoMapa} de ${movilDatos.anchoLayout})`);
comprobar(!!movilDatos.tinta && movilDatos.tinta.usado >= 45, `móvil: los puntos usan el lienzo (${movilDatos.tinta ? movilDatos.tinta.usado + ' %' : 'sin medición'})`);
comprobar(movilDatos.botones.length === 4, 'móvil: los controles siguen disponibles');
await movil.locator('#territorio .card:nth-of-type(2)').scrollIntoViewIfNeeded();
await movil.waitForTimeout(300);
await movil.locator('#territorio .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '04-mapa-movil.png'), animations: 'disabled' });
await movil.close();

await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log('\nmedidas escritorio:', JSON.stringify(base, null, 1));
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;

