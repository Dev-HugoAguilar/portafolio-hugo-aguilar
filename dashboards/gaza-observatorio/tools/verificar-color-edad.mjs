/**
 * Comprueba que el tono de los puntos refleja la edad en la selección actual:
 * muestrea el lienzo en la fila más joven y en la más mayor, mide la diferencia
 * de tono, revisa la leyenda y captura el gráfico en cada universo.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-color-edad.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'memoria-color');
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

/** Toma el color del primer punto de la primera fila y de la última fila pintada. */
const muestrear = (pagina) =>
  pagina.evaluate(() => {
    const lienzo = document.querySelector('#memCanvas');
    const step = Number(lienzo.dataset.memStep);
    const cols = Number(lienzo.dataset.memCols);
    const vp = document.querySelector('#memViewport');
    const dpr = lienzo.width / lienzo.clientWidth;
    const ctx = lienzo.getContext('2d');
    const n = Number((document.querySelector('#memCount').textContent || '0').replace(/[^\d]/g, ''));
    const filas = Math.max(1, Math.ceil(n / cols));
    const leer = (fila, columna = 0) => {
      const y = Math.round((12 + fila * step + step / 2) * dpr);
      const x = Math.round((12 + columna * step + step / 2) * dpr);
      // busca el píxel más oscuro del entorno del punto para evitar el borde suavizado
      let mejor = null;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const px = ctx.getImageData(x + dx, y + dy, 1, 1).data;
          if (px[3] > 200 && (!mejor || px[0] + px[1] + px[2] < mejor[0] + mejor[1] + mejor[2])) {
            mejor = [px[0], px[1], px[2]];
          }
        }
      }
      return mejor;
    };
    // se evita la primera columna: el registro seleccionado lleva anillo oscuro
    const primera = leer(0, 3);
    const ultima = leer(filas - 1);
    const dist = (a, b) => (a && b ? Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])) : 0);
    return {
      primera,
      ultima,
      distancia: dist(primera, ultima),
      filas,
      scroll: vp.scrollTop,
      escalaMin: document.querySelector('#memScaleMin').textContent.trim(),
      escalaMax: document.querySelector('#memScaleMax').textContent.trim(),
      escalaTexto: document.querySelector('#memScale').textContent.trim(),
      gradiente: getComputedStyle(document.querySelector('.memLegend i')).backgroundImage,
    };
  });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
await pagina.goto(URL_OBS, { waitUntil: 'load' });
await pagina.waitForTimeout(1600);
await pagina.locator('[data-tab="memoria"]').click();
await pagina.waitForTimeout(1200);

// --- menores 0–17: debe haber recorrido de tono
const menores = await muestrear(pagina);
comprobar(menores.escalaMin === '0' && menores.escalaMax === '17', `la leyenda declara el rango 0–17 (${menores.escalaMin}–${menores.escalaMax})`);
comprobar(/0–17 años \(según la selección\)/.test(menores.escalaTexto), `la leyenda explica la escala: ${menores.escalaTexto}`);
comprobar(menores.distancia >= 60, `el tono del más joven y del mayor difieren (Δ ${menores.distancia} · ${menores.primera} → ${menores.ultima})`);
comprobar(menores.primera[2] > menores.ultima[2] - 10 && menores.primera[1] < menores.ultima[1], 'el extremo joven es más violeta y el mayor más claro');
comprobar(/58, 54, 236/.test(menores.gradiente.replace(/\s+/g, ' ')) || /rgb\(58, 54, 236\)/.test(menores.gradiente), `la muestra de la leyenda usa la misma rampa (${menores.gradiente.slice(0, 60)})`);
await pagina.locator('#memoria .card.memorial').screenshot({ path: path.join(SALIDA, '01-menores-por-edad.png'), animations: 'disabled' });

// --- adultos 18–110
await pagina.selectOption('#memUniverse', 'adults');
await pagina.waitForTimeout(800);
const adultos = await muestrear(pagina);
comprobar(adultos.escalaMin === '18' && adultos.escalaMax === '110', `adultos: leyenda 18–110 (${adultos.escalaMin}–${adultos.escalaMax})`);
comprobar(adultos.distancia >= 100, `adultos: el tono recorre la escala (Δ ${adultos.distancia})`);
await pagina.locator('#memoria .card.memorial').screenshot({ path: path.join(SALIDA, '02-adultos-por-edad.png'), animations: 'disabled' });

// --- todas las edades 0–110
await pagina.selectOption('#memUniverse', 'all');
await pagina.waitForTimeout(800);
const todas = await muestrear(pagina);
comprobar(todas.escalaMin === '0' && todas.escalaMax === '110', `todas: leyenda 0–110 (${todas.escalaMin}–${todas.escalaMax})`);
comprobar(/Escala del tono: 0–110 años/.test(todas.escalaTexto), `todas: leyenda fija 0–110 (${todas.escalaTexto})`);
comprobar(todas.distancia >= 100, `todas: el tono recorre la escala completa (Δ ${todas.distancia})`);
await pagina.locator('#memoria .card.memorial').screenshot({ path: path.join(SALIDA, '03-todas-por-edad.png'), animations: 'disabled' });

// --- una búsqueda de un solo año: tono único, sin degradado falso
await pagina.locator('#memReset').click();
await pagina.waitForTimeout(500);
await pagina.fill('#memMin', '5');
await pagina.fill('#memMax', '5');
await pagina.waitForTimeout(700);
const uno = await muestrear(pagina);
comprobar(uno.escalaMin === '5' && uno.escalaMax === '5', `edad única: leyenda 5–5 (${uno.escalaMin}–${uno.escalaMax})`);
comprobar(uno.distancia <= 12, `edad única: un solo tono (Δ ${uno.distancia})`);

// --- móvil
await pagina.locator('#memReset').click();
await pagina.waitForTimeout(400);
await pagina.close();
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`móvil: ${e.message}`));
await movil.goto(URL_OBS, { waitUntil: 'load' });
await movil.waitForTimeout(1600);
await movil.locator('[data-tab="memoria"]').click();
await movil.waitForTimeout(1200);
const movilDatos = await muestrear(movil);
comprobar(movilDatos.escalaMin === '0' && movilDatos.escalaMax === '17', `móvil: leyenda 0–17 (${movilDatos.escalaMin}–${movilDatos.escalaMax})`);
comprobar(movilDatos.distancia >= 40, `móvil: el tono también cambia con la edad (Δ ${movilDatos.distancia})`);
await movil.locator('#memoria .card.memorial').scrollIntoViewIfNeeded();
await movil.waitForTimeout(300);
await movil.locator('#memoria .card.memorial').screenshot({ path: path.join(SALIDA, '04-movil-por-edad.png'), animations: 'disabled' });
await movil.close();

await navegador.close();
console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;

