/**
 * Comprueba los controles de la cuadrícula nominal tras quitar «Grosor del punto»:
 * que el selector ya no exista, que «Ver todos» quepa entero dentro de su botón
 * (texto en una línea, sin desbordar la caja) en escritorio y móvil, y que el
 * zoom siga funcionando. Captura la fila de controles.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-controles-memoria.mjs
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

const medirBotones = (pagina) =>
  pagina.evaluate(() => {
    const grupo = document.querySelector('#memoria .memZoom');
    const botones = [...grupo.querySelectorAll('button')];
    const r = (el) => el.getBoundingClientRect();
    const lineas = (el) => {
      const rango = document.createRange();
      rango.selectNodeContents(el);
      return [...rango.getClientRects()].filter((x) => x.height > 0).length;
    };
    const verTodos = document.querySelector('#memFit');
    return {
      existeSelect: !!document.querySelector('#memSize'),
      textos: botones.map((b) => b.textContent.trim()),
      lineas: botones.map((b) => lineas(b)),
      ahoraNoParte: botones.every((b) => getComputedStyle(b).whiteSpace === 'nowrap'),
      // ¿el texto sobresale de la caja del botón?
      desborde: botones.map((b) => ({
        texto: b.textContent.trim(),
        scroll: b.scrollWidth - b.clientWidth,
        alto: b.scrollHeight - b.clientHeight,
      })),
      cajaVerTodos: { ancho: Math.round(r(verTodos).width), alto: Math.round(r(verTodos).height) },
      textoDentro: (() => {
        const rango = document.createRange();
        rango.selectNodeContents(verTodos);
        const caja = r(verTodos);
        return [...rango.getClientRects()].every((x) => x.left >= caja.left - 1 && x.right <= caja.right + 1 && x.top >= caja.top - 1 && x.bottom <= caja.bottom + 1);
      })(),
      filaAlto: Math.round(r(grupo).height),
      desbordeGrupo: grupo.scrollWidth - grupo.clientWidth,
      desbordePagina: document.documentElement.scrollWidth - window.innerWidth,
      nivel: document.querySelector('#memZoomLevel').textContent.trim(),
    };
  });

const navegador = await chromium.launch();

for (const [nombre, opciones] of [
  ['escritorio', { viewport: { width: 1440, height: 1100 } }],
  ['movil', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
]) {
  const pagina = await navegador.newPage(opciones);
  pagina.on('pageerror', (e) => errores.push(`${nombre}: ${e.message}`));
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`${nombre} consola: ${m.text()}`); });
  await pagina.goto(URL_OBS, { waitUntil: 'load' });
  await pagina.waitForTimeout(1600);
  await pagina.locator('[data-tab="memoria"]').click();
  await pagina.waitForTimeout(1100);

  const datos = await medirBotones(pagina);
  comprobar(!datos.existeSelect, `${nombre}: ya no existe el selector de grosor`);
  comprobar(datos.textos.length === 3, `${nombre}: quedan los tres controles (${datos.textos.join(' · ')})`);
  comprobar(datos.textos.includes('Ver todos'), `${nombre}: «Ver todos» sigue disponible`);
  comprobar(datos.lineas.every((n) => n === 1), `${nombre}: cada botón tiene el texto en una línea (${datos.lineas.join('/')})`);
  comprobar(datos.ahoraNoParte, `${nombre}: los botones no parten el texto (nowrap)`);
  comprobar(datos.desborde.every((d) => d.scroll <= 1 && d.alto <= 1), `${nombre}: ningún texto desborda su botón`);
  comprobar(datos.textoDentro, `${nombre}: el texto de «Ver todos» queda dentro de la caja (${datos.cajaVerTodos.ancho}×${datos.cajaVerTodos.alto})`);
  comprobar(datos.desbordeGrupo <= 1, `${nombre}: la fila de controles no se desborda (${datos.desbordeGrupo})`);
  comprobar(datos.desbordePagina <= 0, `${nombre}: sin desbordamiento de página (${datos.desbordePagina})`);
  comprobar(datos.nivel === '100 %', `${nombre}: el nivel sigue en 100 % (${datos.nivel})`);

  // El zoom sigue operativo sin el selector
  await pagina.locator('#memZoomIn').click();
  await pagina.waitForTimeout(500);
  const trasZoom = await medirBotones(pagina);
  comprobar(trasZoom.nivel !== '100 %', `${nombre}: «+» sigue acercando (${trasZoom.nivel})`);
  await pagina.locator('#memFit').click();
  await pagina.waitForTimeout(500);
  comprobar((await medirBotones(pagina)).nivel === '100 %', `${nombre}: «Ver todos» vuelve al encuadre`);

  await pagina.locator('#memoria .memTools').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  await pagina.locator('#memoria .memTools').screenshot({ path: path.join(SALIDA, `0${nombre === 'escritorio' ? 4 : 5}-controles-${nombre}.png`), animations: 'disabled' });
  await pagina.close();
}

await navegador.close();
console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;

