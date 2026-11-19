/**
 * Verifica «Cada punto, una vida»: encuadre completo por defecto (sin scroll
 * interno), zoom con −/+/«Ver todos», puntos visibles, selección y filtros
 * intactos. Captura a 100 % y con zoom, en escritorio y móvil.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-memoria-zoom.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'memoria-zoom');
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
    const vp = document.querySelector('#memViewport');
    const lienzo = document.querySelector('#memCanvas');
    const espacio = document.querySelector('#memSpace');
    const r = (el) => el.getBoundingClientRect();
    const zoom = Number(lienzo.dataset.memZoom || 1);
    const cols = Number(lienzo.dataset.memCols || 1);
    const step = Number(lienzo.dataset.memStep || 0);
    const n = Number((document.querySelector('#memCount').textContent || '0').replace(/[^\d]/g, '')) || 0;
    const filas = Math.max(1, Math.ceil(n / cols));
    // extensión real de la tinta dibujada
    let tinta = null;
    try {
      const ctx = lienzo.getContext('2d');
      const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height).data;
      let y0 = -1;
      let y1 = -1;
      for (let y = 0; y < lienzo.height; y += 1) {
        let hay = false;
        for (let x = 0; x < lienzo.width; x += 4) {
          if (datos[(y * lienzo.width + x) * 4 + 3] > 10) { hay = true; break; }
        }
        if (hay) { if (y0 < 0) y0 = y; y1 = y; }
      }
      if (y0 >= 0) tinta = Math.round(((y1 - y0) / lienzo.height) * 100);
    } catch (e) { tinta = null; }
    return {
      zoom,
      cols,
      step: Number(step.toFixed(2)),
      filas,
      puntos: n,
      ancho: Math.round(r(lienzo).width),
      alto: Math.round(r(lienzo).height),
      altoCaja: Math.round(r(vp).height),
      scrollInterno: vp.scrollHeight - vp.clientHeight,
      altoEspacio: Math.round(r(espacio).height),
      nivel: document.querySelector('#memZoomLevel').textContent.trim(),
      menosDeshabilitado: document.querySelector('#memZoomOut').disabled,
      masDeshabilitado: document.querySelector('#memZoomIn').disabled,
      desbordePagina: document.documentElement.scrollWidth - window.innerWidth,
      tinta,
      estado: document.querySelector('#memStatus').textContent.trim(),
      ayuda: document.querySelector('#memHelp').textContent.trim().slice(0, 70),
    };
  });

const navegador = await chromium.launch();

/* ------------------------------------------------------------ escritorio */
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
await pagina.goto(URL_OBS, { waitUntil: 'load' });
await pagina.waitForTimeout(1600);
await pagina.locator('[data-tab="memoria"]').click();
await pagina.waitForTimeout(1200);

const cien = await medir(pagina);
comprobar(cien.puntos === 21637, `la selección arranca con 21 637 puntos (${cien.puntos})`);
comprobar(cien.zoom === 1 && cien.nivel === '100 %', `zoom inicial al 100 % (${cien.nivel})`);
comprobar(cien.scrollInterno <= 1, `sin desplazamiento interno al 100 %: caben todos (${cien.scrollInterno} px)`);
comprobar(cien.cols * cien.step <= cien.ancho - 10 && cien.filas * cien.step <= cien.altoCaja - 10, `la rejilla completa cabe en el marco (${cien.cols} × ${cien.filas} a ${cien.step} px)`);
comprobar(cien.step >= 4.5, `puntos legibles con todos a la vista (paso ${cien.step} px)`);
comprobar(cien.tinta >= 90, `los puntos ocupan el lienzo (${cien.tinta} % del alto)`);
comprobar(cien.menosDeshabilitado && !cien.masDeshabilitado, 'los controles de zoom arrancan coherentes');
comprobar(/columnas × .* filas/.test(cien.estado), `el estado declara la rejilla: ${cien.estado}`);
comprobar(/Todos los puntos están a la vista/.test(cien.ayuda), 'la ayuda explica el encuadre completo');
comprobar(cien.desbordePagina <= 0, `sin desbordamiento de página (${cien.desbordePagina})`);
await pagina.locator('#memoria .card.memorial').screenshot({ path: path.join(SALIDA, '01-todos-a-la-vista.png'), animations: 'disabled' });

/* ---------------------------------------------------------------- zoom */
await pagina.locator('#memZoomIn').click();
await pagina.waitForTimeout(600);
const uno = await medir(pagina);
comprobar(uno.zoom > 1 && uno.step > cien.step * 1.5, `«+» acerca: paso ${cien.step} → ${uno.step} px (${uno.nivel})`);
comprobar(uno.nivel !== '100 %', `el indicador refleja el nivel (${uno.nivel})`);
comprobar(uno.scrollInterno > 10, `con zoom la cuadrícula se recorre dentro de su marco (${uno.scrollInterno} px)`);
comprobar(uno.desbordePagina <= 0, `con zoom la página sigue sin desbordar (${uno.desbordePagina})`);

await pagina.locator('#memZoomIn').click();
await pagina.waitForTimeout(600);
const dos = await medir(pagina);
comprobar(dos.zoom > uno.zoom, `acercar otra vez sube el nivel (${dos.nivel})`);

// La selección sigue siendo visible y centrada al acercarse
const centrado = await pagina.evaluate(() => {
  const lienzo = document.querySelector('#memCanvas');
  const vp = document.querySelector('#memViewport');
  const step = Number(lienzo.dataset.memStep);
  const cols = Number(lienzo.dataset.memCols);
  const i = Number(document.querySelector('#memPerson').textContent ? 0 : 0);
  const texto = document.querySelector('#memPerson').textContent || '';
  const m = texto.match(/registro (\d[\d.,]*) de/);
  const indice = m ? Number(m[1].replace(/[^\d]/g, '')) - 1 : 0;
  const fila = Math.floor(indice / cols);
  const y = 12 + fila * step;
  return { y: Math.round(y - vp.scrollTop), alto: Math.round(vp.clientHeight), indice };
});
comprobar(centrado.y >= -10 && centrado.y <= centrado.alto + 10, `el punto seleccionado queda visible tras el zoom (y=${centrado.y}, alto=${centrado.alto})`);
await pagina.locator('#memoria .card.memorial').screenshot({ path: path.join(SALIDA, '02-con-zoom.png'), animations: 'disabled' });

// «Ver todos» vuelve al encuadre completo
await pagina.locator('#memFit').click();
await pagina.waitForTimeout(600);
const vuelta = await medir(pagina);
comprobar(vuelta.zoom === 1 && vuelta.nivel === '100 %' && vuelta.scrollInterno <= 1, `«Ver todos» recupera el encuadre completo (${vuelta.nivel}, ${vuelta.scrollInterno} px)`);

/* ------------------------------------------- teclado, selección, filtros */
await pagina.locator('#memCanvas').focus();
await pagina.keyboard.press('+');
await pagina.waitForTimeout(400);
const conTecla = await medir(pagina);
comprobar(conTecla.zoom > 1, `el teclado también acerca (${conTecla.nivel})`);
await pagina.keyboard.press('0');
await pagina.waitForTimeout(400);
comprobar((await medir(pagina)).zoom === 1, 'la tecla 0 vuelve al encuadre completo');

const seleccion = await pagina.evaluate(() => {
  const antes = document.querySelector('#memPerson').textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
  return { antes };
});
const caja = await pagina.locator('#memCanvas').boundingBox();
await pagina.mouse.click(caja.x + 60, caja.y + 60);
await pagina.waitForTimeout(500);
const trasClic = await pagina.evaluate(() => ({
  detalle: document.querySelector('#memPerson').textContent.replace(/\s+/g, ' ').trim().slice(0, 60),
  posicion: document.querySelector('#memPosition').textContent.trim(),
}));
comprobar(trasClic.detalle.length > 5 && trasClic.detalle !== seleccion.antes, `el clic sigue seleccionando (${trasClic.detalle})`);

await pagina.selectOption('#memUniverse', 'adults');
await pagina.waitForTimeout(700);
const adultos = await medir(pagina);
comprobar(adultos.puntos === 51198, `el filtro de universo sigue funcionando (${adultos.puntos})`);
comprobar(adultos.scrollInterno <= 1, `la nueva selección también cabe completa (${adultos.scrollInterno} px)`);
await pagina.locator('#memReset').click();
await pagina.waitForTimeout(600);

/* ------------------------------------------------------------------ móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`móvil: ${e.message}`));
await movil.goto(URL_OBS, { waitUntil: 'load' });
await movil.waitForTimeout(1600);
await movil.locator('[data-tab="memoria"]').click();
await movil.waitForTimeout(1200);
const movilDatos = await medir(movil);
comprobar(movilDatos.zoom === 1, `móvil: arranca al 100 % (${movilDatos.nivel})`);
comprobar(movilDatos.scrollInterno <= 1, `móvil: todos los puntos caben sin desplazarse (${movilDatos.scrollInterno} px)`);
comprobar(movilDatos.cols * movilDatos.step <= movilDatos.ancho - 6, `móvil: la rejilla cabe en el ancho (${movilDatos.cols} × ${movilDatos.step} px en ${movilDatos.ancho})`);
comprobar(movilDatos.desbordePagina <= 0, `móvil: sin desbordamiento de página (${movilDatos.desbordePagina})`);
comprobar(movilDatos.tinta >= 80, `móvil: los puntos ocupan el lienzo (${movilDatos.tinta} %)`);
await movil.locator('#memZoomIn').click();
await movil.waitForTimeout(500);
comprobar((await medir(movil)).zoom > 1, 'móvil: el control de zoom funciona');
await movil.locator('#memFit').click();
await movil.waitForTimeout(500);
await movil.locator('#memoria .card.memorial').scrollIntoViewIfNeeded();
await movil.waitForTimeout(300);
await movil.locator('#memoria .card.memorial').screenshot({ path: path.join(SALIDA, '03-movil-todos.png'), animations: 'disabled' });
await movil.close();

await navegador.close();
console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log('\nmedidas 100 %:', JSON.stringify(cien, null, 1));
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;
