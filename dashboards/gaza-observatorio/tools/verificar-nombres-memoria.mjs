/**
 * Comprueba que el nombre original árabe y su transliteración comparten el borde
 * izquierdo en la ficha de persona (y en el tooltip), y captura la tarjeta.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-nombres-memoria.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'memoria-nombres');
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
    const arabe = document.querySelector('#memPerson .memName');
    const trans = document.querySelector('#memPerson h3');
    const r = (el) => el.getBoundingClientRect();
    const caja = document.querySelector('#memPerson').getBoundingClientRect();
    const rango = (el) => {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      return rg.getBoundingClientRect();
    };
    return {
      hayArabe: !!arabe,
      hayTrans: !!trans,
      dir: arabe ? arabe.getAttribute('dir') : '',
      alineacionArabe: arabe ? getComputedStyle(arabe).textAlign : '',
      alineacionTrans: trans ? getComputedStyle(trans).textAlign : '',
      bordeTextoArabe: arabe ? Math.round(rango(arabe).left) : null,
      bordeTextoTrans: trans ? Math.round(rango(trans).left) : null,
      cajaIzquierda: Math.round(caja.left),
      difArabe: arabe ? Math.round(rango(arabe).left - rango(trans).left) : null,
      textoArabe: arabe ? arabe.textContent.trim().slice(0, 30) : '',
      textoTrans: trans ? trans.textContent.trim().slice(0, 30) : '',
      desborde: Math.round(r(arabe || trans).right - caja.right),
      desbordePagina: document.documentElement.scrollWidth - window.innerWidth,
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

  const datos = await medir(pagina);
  comprobar(datos.hayArabe && datos.hayTrans, `${nombre}: la ficha muestra los dos nombres`);
  comprobar(datos.dir === 'rtl', `${nombre}: el nombre original conserva dir="rtl" (${datos.dir})`);
  comprobar(datos.alineacionArabe === 'left', `${nombre}: el nombre árabe se alinea a la izquierda (${datos.alineacionArabe})`);
  comprobar(Math.abs(datos.difArabe) <= 2, `${nombre}: ambos nombres comparten el borde izquierdo (Δ ${datos.difArabe} px)`);
  comprobar(datos.bordeTextoArabe - datos.cajaIzquierda < 40, `${nombre}: el nombre arranca junto al borde de la tarjeta (${datos.bordeTextoArabe - datos.cajaIzquierda} px)`);
  comprobar(datos.desborde <= 0, `${nombre}: el nombre no desborda la tarjeta (${datos.desborde} px)`);
  comprobar(datos.desbordePagina <= 0, `${nombre}: sin desbordamiento de página (${datos.desbordePagina})`);

  await pagina.locator('#memPerson').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(250);
  await pagina.locator('#memPerson').screenshot({ path: path.join(SALIDA, `0${nombre === 'escritorio' ? 1 : 2}-nombres-${nombre}.png`), animations: 'disabled' });

  if (nombre === 'escritorio') {
    // El tooltip del punto también alinea el nombre árabe a la izquierda
    const caja = await pagina.locator('#memCanvas').boundingBox();
    await pagina.mouse.move(caja.x + 60, caja.y + 60);
    await pagina.waitForTimeout(400);
    const tip = await pagina.evaluate(() => {
      const cajaTip = document.getElementById('gTip');
      if (!cajaTip || cajaTip.dataset.visible !== 'true') return null;
      const arabe = cajaTip.querySelector('[dir="rtl"]');
      return arabe ? { alineacion: getComputedStyle(arabe).textAlign, texto: arabe.textContent.trim().slice(0, 24) } : null;
    });
    comprobar(!!tip && tip.alineacion === 'left', `tooltip: el nombre árabe también va a la izquierda (${tip && tip.alineacion})`);
    await pagina.mouse.move(4, 4);
  }
  await pagina.close();
}

await navegador.close();
console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;
