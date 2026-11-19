/**
 * Mide la pirámide de edades tal como se ve **dentro de la ficha del portafolio**:
 * tamaño efectivo de la tipografía, alto de fila, escala, cruces entre textos y
 * puntos, y modo de maqueta. Escritorio (1440) y móvil (390), los dos modos.
 *
 *   node dashboards/gaza-observatorio/tools/medir-edades-ficha.mjs
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const URL_FICHA = 'http://127.0.0.1:8000/#/area/ciencia-de-datos/gaza-observatorio';

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  await import(pathToFileURL(ruta).href);
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

const medirEnFrame = (marco) =>
  marco.locator('#ageChart').evaluate((contenedor) => {
    const svg = contenedor.querySelector('svg');
    const filas = [...contenedor.querySelectorAll('.age-swarm-row')];
    const escala = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    const tamano = (t) => (t ? parseFloat(getComputedStyle(t).fontSize) * escala : 0);
    const conteos = [...svg.querySelectorAll('text')].filter((t) => /·/.test(t.textContent) && /%/.test(t.textContent));
    const textos = [...svg.querySelectorAll('text')].map((t) => t.getBoundingClientRect());
    const puntos = [...svg.querySelectorAll('circle')].map((c) => c.getBoundingClientRect());
    let cruces = 0;
    for (const a of textos) for (const b of puntos) {
      if (a.width && b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) cruces += 1;
    }
    return {
      modo: contenedor.querySelector('.is-movil') ? 'móvil' : 'ancho',
      filas: filas.length,
      pitch: filas.length > 1 ? Math.round(filas[1].getBoundingClientRect().top - filas[0].getBoundingClientRect().top) : 0,
      escala: Number(escala.toFixed(3)),
      anchoSvg: Math.round(svg.getBoundingClientRect().width),
      tipografiaConteos: Number(Math.max(...conteos.map(tamano), 0).toFixed(1)),
      tipografiaEtiquetas: Number(Math.max(...filas.map((f) => tamano(f.querySelector('rect + text') || f.querySelector('text'))), 0).toFixed(1)),
      radio: svg.querySelector('circle') ? Number((parseFloat(svg.querySelector('circle').getAttribute('r')) * escala).toFixed(2)) : 0,
      puntos: svg.querySelectorAll('circle').length,
      cruces,
      desbordePagina: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

const navegador = await chromium.launch();
const salida = {};

for (const [nombre, opciones] of [
  ['escritorio', { viewport: { width: 1440, height: 1200 } }],
  ['movil', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
]) {
  const pagina = await navegador.newPage(opciones);
  await pagina.goto(URL_FICHA, { waitUntil: 'load' });
  await pagina.waitForTimeout(3400);
  const marco = pagina.frameLocator('#demo-host iframe, iframe');
  await marco.locator('[data-tab="personas"]').click();
  await pagina.waitForTimeout(1000);
  salida[nombre] = { grupos: await medirEnFrame(marco) };
  await marco.locator('#ageMode').selectOption('single');
  await pagina.waitForTimeout(1000);
  salida[nombre].edades = await medirEnFrame(marco);
  await pagina.close();
}

await navegador.close();
console.log(JSON.stringify(salida, null, 2));

