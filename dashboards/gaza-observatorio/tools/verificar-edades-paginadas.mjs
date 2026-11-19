/**
 * Verifica la paginación de «Edad por año» en la pirámide de edades y captura
 * la vista en escritorio y móvil.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-edades-paginadas.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'edades-paginadas');
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
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
const ok = [];
const fallos = [];
const errores = [];
const comprobar = (c, m) => (c ? ok : fallos).push(m);

pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
await pagina.goto(URL_OBS, { waitUntil: 'load' });
await pagina.waitForTimeout(1400);
await pagina.locator('[data-tab="personas"]').click();
await pagina.waitForTimeout(700);

const leer = () =>
  pagina.evaluate(() => {
    const filas = [...document.querySelectorAll('#ageChart .age-swarm-row')];
    return {
      filas: filas.length,
      etiquetas: filas.map((f) => f.querySelector('rect + text')?.textContent.trim() || ''),
      textos: filas.map((f) => f.getAttribute('aria-label')),
      puntos: document.querySelectorAll('#ageChart .age-swarm-row circle').length,
      rango: document.querySelector('#ageRange')?.textContent.trim() || '',
      pagerVisible: !document.querySelector('#agePager').hidden,
      prev: { disabled: document.querySelector('#agePrev').disabled, texto: document.querySelector('#agePrev').textContent.trim() },
      next: { disabled: document.querySelector('#ageNext').disabled, texto: document.querySelector('#ageNext').textContent.trim() },
      altoSvg: Math.round(document.querySelector('#ageChart svg').getBoundingClientRect().height),
      anchoSvg: Math.round(document.querySelector('#ageChart svg').getBoundingClientRect().width),
      altoFila: filas.length>1?Math.round(filas[1].getBoundingClientRect().top-filas[0].getBoundingClientRect().top):0,
      tablaFilas: document.querySelectorAll('#ageTable > .scroll table tbody tr').length,
      tablaCaption: document.querySelector('#ageTable caption')?.textContent.trim() || '',
      todasLasFilas: document.querySelectorAll('#ageTable .ageAll tbody tr').length,
    };
  });

/* ------------------------------------------------------------- grupos: base */
const grupos = await leer();
comprobar(grupos.filas === 5, `«Grupos de edad» conserva las cinco franjas (${grupos.filas})`);
comprobar(!grupos.pagerVisible, 'la paginación está oculta en «Grupos de edad»');
comprobar(grupos.todasLasFilas === 111, `la tabla completa sigue disponible con 111 edades (${grupos.todasLasFilas})`);

/* --------------------------------------------------- edades individuales: 1 */
await pagina.selectOption('#ageMode', 'single');
await pagina.waitForTimeout(700);
const primera = await leer();
comprobar(primera.filas === 15, `quince edades por vista (${primera.filas})`);
comprobar(primera.pagerVisible, 'los controles de paginación aparecen en «Edad por año»');
comprobar(/Edades 0–14 · 15 de 111 edades · vista 1 de 8/.test(primera.rango), `rango anunciado: ${primera.rango}`);
comprobar(primera.prev.disabled && primera.prev.texto.includes('Anterior'), '«Anterior» deshabilitado en la primera vista');
comprobar(!primera.next.disabled && primera.next.texto.includes('Siguiente'), '«Siguiente» activo en la primera vista');
comprobar(primera.altoFila >= 40, `filas con espacio suficiente (${primera.altoFila} px por fila)`);
comprobar(primera.anchoSvg <= 1060 && primera.anchoSvg >= 800, `el dibujo no se estira sin control (${primera.anchoSvg} px)`);
comprobar(primera.puntos > 40, `puntos visibles (${primera.puntos})`);
comprobar(/Masculino 560, 52\.2%/.test(primera.textos[0] || ''), `conteo y porcentaje del sexo conservados: ${primera.textos[0]}`);
comprobar(primera.tablaFilas === 15, `la tabla accesible sigue la vista (${primera.tablaFilas} filas)`);
await pagina.locator('#ageChart .age-swarm-row').first().scrollIntoViewIfNeeded();
await pagina.locator('#personas .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '01-edades-paginadas-escritorio.png'), animations: 'disabled' });
console.log('  captura 01-edades-paginadas-escritorio.png');

/* ------------------------------------------- recorrido completo 0 → 110 */
const recorrido = new Set();
let vistas = 0;
let ultima = null;
for (;;) {
  const actual = await leer();
  actual.etiquetas.forEach((e) => recorrido.add(Number(e.replace('Edad ', ''))));
  vistas += 1;
  ultima = actual;
  if (actual.next.disabled) break;
  await pagina.locator('#ageNext').click();
  await pagina.waitForTimeout(300);
  if (vistas > 12) { fallos.push('el recorrido no termina'); break; }
}
comprobar(vistas === 8, `ocho vistas para recorrer las 111 edades (${vistas})`);
comprobar(recorrido.size === 111, `se recorren las 111 edades sin perder registros (${recorrido.size})`);
comprobar(Math.min(...recorrido) === 0 && Math.max(...recorrido) === 110, `el recorrido va de la edad 0 a la 110 (${Math.min(...recorrido)}–${Math.max(...recorrido)})`);
comprobar(ultima.filas === 6 && /Edades 105–110/.test(ultima.rango), `última vista con seis edades y su rango: ${ultima.rango}`);
comprobar(ultima.next.disabled && !ultima.prev.disabled, '«Siguiente» deshabilitado al final y «Anterior» activo');
await pagina.locator('#personas .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '02-edades-paginadas-ultima-vista.png'), animations: 'disabled' });
console.log('  captura 02-edades-paginadas-ultima-vista.png');

// Volver con «Anterior» no pierde la posición
await pagina.locator('#agePrev').click();
await pagina.waitForTimeout(300);
const penultima = await leer();
comprobar(/Edades 90–104/.test(penultima.rango) && penultima.filas === 15, `«Anterior» retrocede una vista: ${penultima.rango}`);

// El universo no cambia al paginar
const totales = await pagina.evaluate(() => {
  const filas = [...document.querySelectorAll('#ageTable .ageAll tbody tr')];
  const suma = (col) => filas.reduce((s, f) => s + Number(f.children[col].textContent.replace(/[^\d]/g, '') || 0), 0);
  return { filas: filas.length, masculino: suma(1), femenino: suma(2), total: suma(3) };
});
comprobar(totales.masculino + totales.femenino === 72835 && totales.total === 72835, `la tabla completa suma 72 835 registros (${totales.masculino} + ${totales.femenino})`);

/* ------------------------------------------------------------- tooltips */
const etiquetaFila = pagina.locator('#ageChart .age-swarm-row').nth(3).locator('rect');
await etiquetaFila.scrollIntoViewIfNeeded();
const caja = await etiquetaFila.boundingBox();
await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
await pagina.waitForTimeout(320);
const tip = await pagina.evaluate(() => {
  const c = document.getElementById('gTip');
  return c && c.dataset.visible === 'true' ? c.innerText.replace(/\s+/g, ' ').trim().slice(0, 120) : null;
});
comprobar(!!tip && /Edad \d+/.test(tip), `tooltip con la edad y sus valores: ${tip}`);

/* ----------------------------------------------------------- teclado */
await pagina.locator('#agePrev').focus();
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(300);
const trasEnter = await leer();
comprobar(/Edades 75–89/.test(trasEnter.rango), `las flechas/Enter recorren la paginación: ${trasEnter.rango}`);
const foco = await pagina.evaluate(() => document.activeElement?.id);
comprobar(['agePrev', 'ageNext'].includes(foco), `el foco sigue en los controles (${foco})`);

await pagina.close();

/* ----------------------------------------------------------------- móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`JS móvil: ${e.message}`));
await movil.goto(URL_OBS, { waitUntil: 'load' });
await movil.waitForTimeout(1300);
await movil.locator('[data-tab="personas"]').click();
await movil.waitForTimeout(600);
await movil.selectOption('#ageMode', 'single');
await movil.waitForTimeout(700);
const datosMovil = await movil.evaluate(() => {
  const filas = document.querySelectorAll('#ageChart .age-swarm-row');
  const svg = document.querySelector('#ageChart svg').getBoundingClientRect();
  const caja = document.querySelector('#ageChart').getBoundingClientRect();
  return {
    filas: filas.length,
    rango: document.querySelector('#ageRange').textContent.trim(),
    anchoSvg: Math.round(svg.width),
    anchoCaja: Math.round(caja.width),
    desbordePagina: document.documentElement.scrollWidth - window.innerWidth,
    pagerVisible: getComputedStyle(document.querySelector('#agePager')).display !== 'none',
    movil: !!document.querySelector('#ageChart .is-movil'),
    tipografia: (() => {
      const svg = document.querySelector('#ageChart svg');
      const escala = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      const conteos = [...svg.querySelectorAll('text')].filter((t) => /·/.test(t.textContent) && /%/.test(t.textContent));
      return Number(Math.max(...conteos.map((t) => parseFloat(getComputedStyle(t).fontSize) * escala), 0).toFixed(1));
    })(),
  };
});
comprobar(datosMovil.filas === 15, `móvil: quince edades por vista (${datosMovil.filas})`);
comprobar(datosMovil.desbordePagina <= 0, `móvil: sin desbordamiento de la página (${datosMovil.desbordePagina})`);
comprobar(datosMovil.movil, 'móvil: se usa la maqueta compacta');
comprobar(datosMovil.anchoSvg <= datosMovil.anchoCaja + 2, `móvil: el dibujo cabe en la tarjeta (${datosMovil.anchoSvg} ≤ ${datosMovil.anchoCaja} px)`);
comprobar(datosMovil.tipografia >= 11, `móvil: cifras legibles (${datosMovil.tipografia} px efectivos)`);
comprobar(datosMovil.pagerVisible, 'móvil: la paginación está visible');
await movil.locator('#agePager').scrollIntoViewIfNeeded();
await movil.waitForTimeout(300);
await movil.locator('#personas .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '03-edades-paginadas-movil.png'), animations: 'disabled' });
console.log('  captura 03-edades-paginadas-movil.png');
await movil.close();

await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;


