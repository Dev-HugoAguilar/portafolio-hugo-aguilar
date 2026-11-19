/**
 * Verificación del tooltip compartido y de las dos gráficas corregidas.
 *   node dashboards/gaza-observatorio/tools/verificar-tooltips.mjs
 * Comprueba, sobre el build servido, ratón, teclado y tacto en cada gráfica.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'tooltips');
let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(SALIDA, { recursive: true });
const URL_OBS = 'http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html';
const navegador = await chromium.launch();
const fallos = [];
const ok = [];
const errores = [];

function comprobar(cond, mensaje) {
  (cond ? ok : fallos).push(mensaje);
}

async function abrir(ancho = 1440) {
  const tactil = ancho <= 480;
  const pagina = await navegador.newPage({
    viewport: { width: ancho, height: tactil ? 844 : 1000 },
    hasTouch: tactil,
    isMobile: tactil,
  });
  pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
  await pagina.goto(URL_OBS, { waitUntil: 'load' });
  await pagina.waitForTimeout(1200);
  return pagina;
}

const irA = async (pagina, pestaña) => {
  await pagina.locator(`[data-tab="${pestaña}"]`).click();
  await pagina.waitForTimeout(600);
};

const tip = async (pagina) =>
  pagina.evaluate(() => {
    const caja = document.getElementById('gTip');
    if (!caja || caja.dataset.visible !== 'true' || caja.hidden) return null;
    return {
      texto: caja.innerText.replace(/\s+/g, ' ').trim(),
      pin: caja.dataset.pin === 'true',
      izq: Math.round(parseFloat(caja.style.left)),
      arr: Math.round(parseFloat(caja.style.top)),
      ancho: Math.round(caja.getBoundingClientRect().width),
      alto: Math.round(caja.getBoundingClientRect().height),
      conCerrar: !caja.querySelector('.gTipClose').hidden,
    };
  });

/* Un <g> no captura el puntero por sí solo y las gráficas quedan más abajo del
   pliegue: se desplaza la marca a la vista y se apunta a su centro con el ratón
   real, en lugar de usar el hover sintético de Playwright. */
async function apuntar(pagina, localizador) {
  try {
    await localizador.scrollIntoViewIfNeeded();
  } catch {}
  await pagina.waitForTimeout(150);
  const caja = await localizador.boundingBox();
  if (!caja) {
    await localizador.hover({ force: true });
    return;
  }
  await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
}

/* ---------------------------------------------------------------- escritorio */
const pagina = await abrir();

// 1 · Lesiones: rangos con extremos distinguibles y valores exactos
await irA(pagina, 'salud');
const lesiones = await pagina.evaluate(() => {
  const caja = document.querySelector('#injuryChart');
  const filas = [...caja.querySelectorAll('.injRow')];
  const minimos = [...caja.querySelectorAll('circle[data-tip-min]:not([data-tip-max])')].map((c) => c.getAttribute('fill'));
  const maximos = [...caja.querySelectorAll('circle[data-tip-max]:not([data-tip-min]):not([data-tip-serie*="Límite mínimo"])')].map((c) => c.getAttribute('fill'));
  const textos = [...caja.querySelectorAll('text')].map((t) => t.textContent);
  return {
    filas: filas.length,
    minimos,
    maximos,
    tiene30k: textos.includes('30,000'),
    tiene0: textos.includes('0'),
    valores: textos.filter((t) => /^\d[\d,]* – \d[\d,]*$/.test(t)),
    caption: caja.innerText.includes('escenarios estimados'),
    focusables: filas.every((f) => f.getAttribute('tabindex') === '0'),
  };
});
comprobar(lesiones.filas === 6, `lesiones: ${lesiones.filas} categorías dibujadas`);
comprobar(lesiones.minimos.every((c) => c === '#4b55ff'), `lesiones: mínimo en índigo (${lesiones.minimos.join(',')})`);
comprobar(lesiones.maximos.every((c) => c === '#9b8bc4'), `lesiones: máximo en lavanda (${lesiones.maximos.join(',')})`);
comprobar(lesiones.tiene30k && lesiones.tiene0, 'lesiones: escala 0–30 000 rotulada');
comprobar(lesiones.valores.length === 6, `lesiones: ${lesiones.valores.length} rangos escritos junto a la fila`);
comprobar(lesiones.caption, 'lesiones: aclaración de escenarios estimados visible');
comprobar(lesiones.focusables, 'lesiones: las seis filas son enfocables por teclado');

await apuntar(pagina, pagina.locator('#injuryChart .injRow').first());
await pagina.waitForTimeout(250);
const tipLesion = await tip(pagina);
comprobar(!!tipLesion && /Mínimo estimado/.test(tipLesion.texto) && /Máximo estimado/.test(tipLesion.texto), `tooltip lesiones: ${tipLesion && tipLesion.texto}`);
comprobar(!!tipLesion && /OMS/.test(tipLesion.texto), 'tooltip lesiones: declara la fuente OMS');

// 2 · Prótesis: dos barras independientes, sin flujo
const protesis = await pagina.evaluate(() => {
  const caja = document.querySelector('#prosthetics');
  const filas = [...caja.querySelectorAll('.prosRow')];
  const textos = [...caja.querySelectorAll('text')].map((t) => t.textContent);
  return {
    filas: filas.length,
    etiquetas: filas.map((f) => f.getAttribute('aria-label')),
    tiene2500: textos.includes('2,500'),
    sinFlujo: !caja.querySelector('path[marker-end], line.stroke-dasharray, polyline'),
    flechas: caja.innerText.includes('→'),
  };
});
comprobar(protesis.filas === 2, `prótesis: ${protesis.filas} barras`);
comprobar(/2,277/.test(protesis.etiquetas[0] || '') && /502/.test(protesis.etiquetas[1] || ''), 'prótesis: 2 277 evaluadas y 502 colocadas');
comprobar(protesis.tiene2500, 'prótesis: eje común de 0 a 2 500');
comprobar(protesis.sinFlujo && !protesis.flechas, 'prótesis: sin flechas, embudo ni flujo entre las dos cifras');

await apuntar(pagina, pagina.locator('#prosthetics .prosRow').nth(1));
await pagina.waitForTimeout(250);
const tipProtesis = await tip(pagina);
comprobar(!!tipProtesis && /502/.test(tipProtesis.texto), `tooltip prótesis: ${tipProtesis && tipProtesis.texto}`);
comprobar(!!tipProtesis && /no permite|no permite calcular|cobertura|tasa/i.test(tipProtesis.texto), 'tooltip prótesis: no sugiere tasa ni cobertura');

// 3 · Recorrido del resto de gráficas
const casos = [
  { pestaña: 'humano', selector: '#calendar [data-day]', nombre: 'calendario (día)' },
  { pestaña: 'humano', selector: '#cumulative circle', nombre: 'curva acumulada (punto)' },
  { pestaña: 'humano', selector: '#reportPack circle[data-day]', nombre: 'archivo de magnitudes (círculo)' },
  { pestaña: 'personas', selector: '#ageChart rect', nombre: 'edades (barra)' },
  { pestaña: 'personas', selector: '#pressDots [data-press]', nombre: 'prensa (punto)' },
  { pestaña: 'personas', selector: '#pressTrend [data-cut]', nombre: 'prensa (corte)' },
  { pestaña: 'evolucion', selector: '#biMap [data-cell], #biMap [tabindex]', nombre: 'mapa bivariado (celda)' },
  { pestaña: 'territorio', selector: '#profiles .segbtn', nombre: 'perfiles de grupo (franja)' },
  { pestaña: 'evidencia', selector: '#coverage b[tabindex]', nombre: 'cobertura por evaluación (barra)' },
  { pestaña: 'archivo', selector: '#fieldChart circle', nombre: 'archivo completo (punto)' },
];

for (const caso of casos) {
  await irA(pagina, caso.pestaña);
  const marca = pagina.locator(caso.selector).first();
  if (!(await marca.count())) {
    fallos.push(`sin marca para ${caso.nombre}`);
    continue;
  }
  await apuntar(pagina, marca);
  await pagina.waitForTimeout(220);
  const t = await tip(pagina);
  comprobar(!!t && t.texto.length > 8, `tooltip ${caso.nombre}: ${t ? t.texto.slice(0, 90) : 'no apareció'}`);
  if (t) {
    comprobar(t.izq >= 0 && t.arr >= 0 && t.izq + t.ancho <= 1440 && t.arr + t.alto <= 1000, `tooltip ${caso.nombre}: dentro de la ventana`);
  }
}

// 3b · Teclado: cada gráfica con marcas enfocables muestra su tooltip al enfocar
const enfocables = [
  { pestaña: 'humano', selector: '#calendar [tabindex]', nombre: 'calendario' },
  { pestaña: 'humano', selector: '#reportPack [tabindex]', nombre: 'archivo de magnitudes' },
  { pestaña: 'personas', selector: '#pressDots [tabindex]', nombre: 'prensa (puntos)' },
  { pestaña: 'personas', selector: '#pressTrend [tabindex]', nombre: 'prensa (cortes)' },
  { pestaña: 'salud', selector: '#injuryChart .injRow', nombre: 'lesiones' },
  { pestaña: 'salud', selector: '#prosthetics .prosRow', nombre: 'prótesis' },
  { pestaña: 'evolucion', selector: '#biMap [tabindex]', nombre: 'mapa bivariado' },
  { pestaña: 'territorio', selector: '#profiles .segbtn', nombre: 'perfiles de grupo' },
  { pestaña: 'evidencia', selector: '#coverage b[tabindex]', nombre: 'cobertura' },
];

for (const caso of enfocables) {
  await irA(pagina, caso.pestaña);
  const marca = pagina.locator(caso.selector).first();
  if (!(await marca.count())) {
    fallos.push(`sin marca enfocable para ${caso.nombre}`);
    continue;
  }
  await marca.focus();
  await pagina.waitForTimeout(220);
  const t = await tip(pagina);
  comprobar(!!t && t.texto.length > 8, `teclado en ${caso.nombre}: ${t ? t.texto.slice(0, 70) : 'sin tooltip'}`);
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(140);
}

// 4 · Mapas de clasificación: proximidad sobre 10 000 puntos
await irA(pagina, 'evolucion');
await pagina.locator('#pairedMaps svg').first().scrollIntoViewIfNeeded();
await pagina.waitForTimeout(200);
const cajaMapa = await pagina.locator('#pairedMaps svg').first().boundingBox();
await pagina.mouse.move(cajaMapa.x + cajaMapa.width * 0.52, cajaMapa.y + cajaMapa.height * 0.42);
await pagina.waitForTimeout(400);
const tipMapa = await tip(pagina);
comprobar(!!tipMapa && /Evaluación/.test(tipMapa.texto), `tooltip mapa de clasificación: ${tipMapa && tipMapa.texto.slice(0, 90)}`);

// 5 · Mapa de la muestra (lienzo)
await irA(pagina, 'territorio');
await pagina.locator('#map').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(200);
const cajaMap = await pagina.locator('#map').boundingBox();
await pagina.mouse.move(cajaMap.x + cajaMap.width * 0.5, cajaMap.y + cajaMap.height * 0.5);
await pagina.waitForTimeout(350);
const tipMap = await tip(pagina);
comprobar(!!tipMap && /ID \d+/.test(tipMap.texto) && /Grupo \d+|Fuera del experimento/.test(tipMap.texto), `tooltip mapa de la muestra: ${tipMap && tipMap.texto.slice(0, 100)}`);

// 6 · Cuadrícula nominal (lienzo con 21 637 puntos)
await irA(pagina, 'memoria');
await pagina.locator('#memCanvas').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(200);
const cajaMem = await pagina.locator('#memCanvas').boundingBox();
await pagina.mouse.move(cajaMem.x + 60, cajaMem.y + 60);
await pagina.waitForTimeout(350);
const tipMem = await tip(pagina);
comprobar(!!tipMem && /lista nominal|edad|año/i.test(tipMem.texto), `tooltip cuadrícula nominal: ${tipMem && tipMem.texto.slice(0, 90)}`);

// 7 · Teclado: foco, contenido y cierre con Escape
await irA(pagina, 'salud');
await pagina.locator('#injuryChart .injRow').first().focus();
await pagina.waitForTimeout(220);
const tipFoco = await tip(pagina);
comprobar(!!tipFoco && /Mínimo estimado/.test(tipFoco.texto), 'tooltip con foco de teclado');
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(220);
comprobar((await tip(pagina)) === null, 'Escape cierra el tooltip');

// 8 · Sin restos de la leyenda del globo nativo en las gráficas consultables
const restos = await pagina.evaluate(() => document.querySelectorAll('[data-tip-scope] > svg > title').length);
comprobar(restos === 0, `sin títulos de SVG sueltos en los contenedores (${restos})`);

await pagina.close();

/* --------------------------------------------------------------------- móvil */
const movil = await abrir(390);
await irA(movil, 'salud');
await movil.locator('#injuryChart').scrollIntoViewIfNeeded();
await movil.waitForTimeout(250);
const marco = await movil.locator('#injuryChart').boundingBox();
const marcador = movil.locator('#injuryChart .injRow').first();
const cajaMovil = await marcador.boundingBox();
const xToque = Math.min(375, Math.max(16, marco.x + 24));
const yToque = cajaMovil.y + cajaMovil.height / 2;
await movil.touchscreen.tap(xToque, yToque);
await movil.waitForTimeout(300);
const tipTacto = await tip(movil);
comprobar(!!tipTacto, `tacto: el tooltip aparece al tocar (${tipTacto && tipTacto.texto.slice(0, 60)})`);
comprobar(!!tipTacto && tipTacto.pin && tipTacto.conCerrar, 'tacto: queda fijado y ofrece control de cierre');
if (tipTacto) {
  comprobar(tipTacto.ancho <= 390 && tipTacto.izq >= 0 && tipTacto.izq + tipTacto.ancho <= 390, `tacto: el globo cabe en 390 px (${tipTacto.ancho})`);
}
await movil.touchscreen.tap(10, 900);
await movil.waitForTimeout(300);
comprobar((await tip(movil)) === null, 'tacto: un toque fuera lo cierra');
const desborde = await movil.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
comprobar(desborde <= 0, `390 px: sin desbordamiento horizontal (${desborde})`);
await movil.screenshot({ path: path.join(SALIDA, 'movil-390-lesiones.png'), fullPage: false });
await movil.close();

await navegador.close();

console.log(ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;



