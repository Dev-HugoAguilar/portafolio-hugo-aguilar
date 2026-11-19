/**
 * Verifica por separado los dos modos de la pirámide de edades, en escritorio y
 * en móvil, midiendo lo que se ve: alto de fila, tamaño efectivo de la
 * tipografía, ancho del dibujo y desbordamientos. Captura cada caso.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-edades-dos-modos.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'edades-dos-modos');
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

/** Mide la gráfica tal como se ve: escala aplicada y tamaños efectivos. */
const medir = (pagina) =>
  pagina.evaluate(() => {
    const svg = document.querySelector('#ageChart svg');
    const filas = [...document.querySelectorAll('#ageChart .age-swarm-row')];
    const caja = document.querySelector('#ageChart').getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const escala = svg.getBoundingClientRect().width / vb.width;
    const textos = [...svg.querySelectorAll('text')];
    const tamano = (t) => (t ? parseFloat(getComputedStyle(t).fontSize) * escala : 0);
    const conteos = textos.filter((t) => /·/.test(t.textContent) && /%/.test(t.textContent));
    const pitch = filas.length > 1 ? filas[1].getBoundingClientRect().top - filas[0].getBoundingClientRect().top : 0;
    return {
      filas: filas.length,
      etiquetas: filas.map((f) => f.querySelector('rect + text')?.textContent.trim() || ''),
      escala: Number(escala.toFixed(3)),
      anchoSvg: Math.round(svg.getBoundingClientRect().width),
      altoSvg: Math.round(svg.getBoundingClientRect().height),
      anchoCaja: Math.round(caja.width),
      pitch: Math.round(pitch),
      tipografia: Number(Math.max(...conteos.map(tamano), 0).toFixed(1)),
      tipografiaEtiqueta: Number(Math.max(...filas.map((f) => tamano(f.querySelector('rect + text'))), 0).toFixed(1)),
      puntos: svg.querySelectorAll('circle').length,
      radioMedio: (() => {
        const c = svg.querySelector('circle');
        return c ? Number((parseFloat(c.getAttribute('r')) * escala).toFixed(2)) : 0;
      })(),
      movil: !!document.querySelector('#ageChart .ageSwarmViewport.is-movil'),
      scrollInterno: document.querySelector('#ageChart .ageSwarmViewport').scrollWidth - document.querySelector('#ageChart .ageSwarmViewport').clientWidth,
      desbordePagina: document.documentElement.scrollWidth - window.innerWidth,
      pagerVisible: !document.querySelector('#agePager').hidden,
      totales: [...document.querySelectorAll('#ageChart svg text')].filter((t) => /Masculino ·|Femenino ·/.test(t.textContent)).map((t) => t.textContent.trim()).slice(0, 2),
      tablaFilas: document.querySelectorAll('#ageTable > .scroll table tbody tr').length,
      solapes: (() => {
        const textos = [...svg.querySelectorAll('text')].map((t) => t.getBoundingClientRect());
        const puntos = [...svg.querySelectorAll('circle')].map((c) => c.getBoundingClientRect());
        let cruces = 0;
        for (const a of textos) for (const b of puntos) {
          if (a.width && b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) cruces += 1;
        }
        return cruces;
      })(),
    };
  });

const navegador = await chromium.launch();

/* -------------------------------------------------------- escritorio 1440 */
const escritorio = await navegador.newPage({ viewport: { width: 1440, height: 1200 } });
escritorio.on('pageerror', (e) => errores.push(`escritorio: ${e.message}`));
escritorio.on('console', (m) => { if (m.type() === 'error') errores.push(`escritorio consola: ${m.text()}`); });
await escritorio.goto(URL_OBS, { waitUntil: 'load' });
await escritorio.waitForTimeout(1500);
await escritorio.locator('[data-tab="personas"]').click();
await escritorio.waitForTimeout(900);

// --- Modo 1: grupos de edad
const grupos = await medir(escritorio);
comprobar(grupos.filas === 5, `grupos: cinco filas (${grupos.filas})`);
comprobar(grupos.etiquetas.join(' ') === 'Infancia · 0–11 Adolescencia · 12–17 Jóvenes · 18–24 Adultos · 25–59 Mayores · 60+', `grupos: etiquetas intactas (${grupos.etiquetas.join(' / ')})`);
comprobar(grupos.pitch >= 120, `grupos: altura de fila ampliada (${grupos.pitch} px)`);
comprobar(grupos.tipografia >= 14, `grupos: cifras legibles sin zoom (${grupos.tipografia} px efectivos)`);
comprobar(grupos.tipografiaEtiqueta >= 14, `grupos: etiquetas de grupo legibles (${grupos.tipografiaEtiqueta} px)`);
comprobar(grupos.radioMedio >= 3.6, `grupos: puntos ampliados (radio ${grupos.radioMedio} px)`);
comprobar(grupos.anchoSvg >= 1200, `grupos: la gráfica aprovecha el ancho de la tarjeta (${grupos.anchoSvg} de ${grupos.anchoCaja} px)`);
comprobar(grupos.escala >= 0.95 && grupos.escala <= 1.1, `grupos: se dibuja a escala natural (×${grupos.escala})`);
comprobar(grupos.puntos > 700, `grupos: puntos visibles (${grupos.puntos})`);
comprobar(grupos.totales.join(' ').includes('50,959') && grupos.totales.join(' ').includes('21,876'), `grupos: los dos totales en la cabecera (${grupos.totales.join(' | ')})`);
comprobar(!grupos.pagerVisible, 'grupos: sin paginación, es la vista general');
comprobar(grupos.tablaFilas === 5, `grupos: tabla accesible con cinco filas (${grupos.tablaFilas})`);
comprobar(grupos.scrollInterno <= 1, `grupos: sin desplazamiento horizontal interno (${grupos.scrollInterno})`);
await escritorio.mouse.move(3, 3);
await escritorio.keyboard.press('Escape');
await escritorio.waitForTimeout(250);
await escritorio.locator('#ageChart').screenshot({ path: path.join(SALIDA, '01-escritorio-grupos.png'), animations: 'disabled' });
await escritorio.screenshot({ path: path.join(SALIDA, '02-escritorio-grupos-tarjeta.png'), animations: 'disabled' });

// --- Modo 2: edad por año
await escritorio.selectOption('#ageMode', 'single');
await escritorio.waitForTimeout(900);
const edades = await medir(escritorio);
comprobar(edades.filas === 15, `edad por año: quince filas por página (${edades.filas})`);
comprobar(edades.pagerVisible, 'edad por año: paginación visible');
comprobar(edades.tipografia >= 12, `edad por año: cifras legibles (${edades.tipografia} px efectivos)`);
comprobar(edades.puntos > 100, `edad por año: puntos visibles (${edades.puntos})`);
await escritorio.mouse.move(3, 3);
await escritorio.keyboard.press('Escape');
await escritorio.waitForTimeout(250);
await escritorio.locator('#ageChart').screenshot({ path: path.join(SALIDA, '03-escritorio-edades.png'), animations: 'disabled' });
const rango = await escritorio.locator('#ageRange').textContent();
comprobar(/Edades 0–14 · 15 de 111 edades · vista 1 de 8/.test(rango), `edad por año: rango ${rango.trim()}`);
await escritorio.close();

/* ------------------------------------------------------------- móvil 390 */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`móvil: ${e.message}`));
await movil.goto(URL_OBS, { waitUntil: 'load' });
await movil.waitForTimeout(1500);
await movil.locator('[data-tab="personas"]').click();
await movil.waitForTimeout(900);

const gruposMovil = await medir(movil);
comprobar(gruposMovil.movil, 'móvil: se usa la maqueta compacta en grupos');
comprobar(gruposMovil.filas === 5, `móvil grupos: cinco bloques (${gruposMovil.filas})`);
comprobar(gruposMovil.anchoSvg <= gruposMovil.anchoCaja + 2, `móvil grupos: el dibujo cabe en la tarjeta (${gruposMovil.anchoSvg} ≤ ${gruposMovil.anchoCaja})`);
comprobar(gruposMovil.desbordePagina <= 0, `móvil grupos: sin desbordamiento de página (${gruposMovil.desbordePagina})`);
comprobar(gruposMovil.tipografia >= 9.5, `móvil grupos: cifras legibles (${gruposMovil.tipografia} px efectivos)`);
comprobar(gruposMovil.radioMedio >= 2, `móvil grupos: puntos visibles (radio ${gruposMovil.radioMedio} px)`);
comprobar(gruposMovil.escala >= 0.85, `móvil grupos: no se reduce a miniatura (×${gruposMovil.escala})`);
comprobar(gruposMovil.solapes === 0, `móvil grupos: ningún texto se encima con un punto (${gruposMovil.solapes} cruces)`);
await movil.locator('#ageChart').scrollIntoViewIfNeeded();
await movil.keyboard.press('Escape');
await movil.waitForTimeout(300);
await movil.locator('#personas .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '04-movil-grupos.png'), animations: 'disabled' });

await movil.selectOption('#ageMode', 'single');
await movil.waitForTimeout(900);
const edadesMovil = await medir(movil);
comprobar(edadesMovil.filas === 15, `móvil edad por año: quince bloques (${edadesMovil.filas})`);
comprobar(edadesMovil.movil, 'móvil: la maqueta compacta también se usa en edad por año');
comprobar(edadesMovil.desbordePagina <= 0, `móvil edad por año: sin desbordamiento (${edadesMovil.desbordePagina})`);
comprobar(edadesMovil.solapes === 0, `móvil edad por año: ningún texto se encima con un punto (${edadesMovil.solapes} cruces)`);
await movil.locator('#ageChart').scrollIntoViewIfNeeded();
await movil.keyboard.press('Escape');
await movil.waitForTimeout(300);
await movil.locator('#personas .card:nth-of-type(2)').screenshot({ path: path.join(SALIDA, '05-movil-edades.png'), animations: 'disabled' });
await movil.screenshot({ path: path.join(SALIDA, '06-movil-ventana.png'), animations: 'disabled' });
await movil.close();

await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;




