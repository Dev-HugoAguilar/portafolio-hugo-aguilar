import { chromium } from 'playwright';

const EV = 'evidencias/';
const navegador = await chromium.launch({ channel: 'chrome' });
const errores = [];

const p = await navegador.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

await p.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await p.locator('.projects').scrollIntoViewIfNeeded();
await p.waitForTimeout(4600);

/* Alineación por filas: misma altura de ilustración y mismas líneas base */
console.log('alineación:', JSON.stringify(await p.evaluate(() => {
  const filas = {};
  [...document.querySelectorAll('.card')].forEach((c) => {
    const cover = c.querySelector('.cover').getBoundingClientRect();
    const h3 = c.querySelector('h3').getBoundingClientRect();
    const meta = c.querySelector('.card-meta').getBoundingClientRect();
    const key = Math.round(c.getBoundingClientRect().top / 10);
    filas[key] = filas[key] || { covers: new Set(), metas: new Set(), titulos: new Set() };
    filas[key].covers.add(Math.round(cover.height));
    filas[key].metas.add(Math.round(meta.top));
    filas[key].titulos.add(Math.round(h3.top));
  });
  return Object.entries(filas).map(([k, v]) => ({
    fila: k, alturas: [...v.covers], metas: [...v.metas].length, titulos: [...v.titulos].length
  }));
}), null, 0));

await p.locator('.projects').screenshot({ path: EV + 'areas-final.png' });

/* Detalle final de cada escena */
for (const id of ['dashboards', 'ciencia-de-datos', 'ingenieria-de-datos', 'ia-generativa', 'agentes']) {
  await p.locator(`.card[data-category="${id}"] .cover`).screenshot({ path: EV + `escena-${id}.png` });
}

/* Orden de tabulación: enlace de la tarjeta y luego sus paradas */
await p.locator('button[data-filter="all"]').focus();
const orden = [];
for (let i = 0; i < 8; i++) {
  await p.keyboard.press('Tab');
  orden.push(await p.evaluate(() => {
    const el = document.activeElement;
    if (!el) return 'none';
    const card = el.closest ? el.closest('.card') : null;
    return (card ? card.getAttribute('data-category') : el.tagName.toLowerCase()) +
      (el.getAttribute && el.getAttribute('data-stop') ? ':' + el.getAttribute('data-stop') : '') +
      (el.classList && el.classList.contains('card-hit') ? ':enlace' : '');
  }));
}
console.log('orden de tabulación:', JSON.stringify(orden));

/* Teclado sobre una etapa: la nota cambia y el foco se ve */
await p.locator('.card[data-category="ingenieria-de-datos"] [data-stop="transformacion"]').focus();
await p.waitForTimeout(200);
await p.locator('.card[data-category="ingenieria-de-datos"] .cover').screenshot({ path: EV + 'escena-pipeline-foco.png' });

/* Navegación: abrir el área desde la tarjeta y volver */
await p.locator('#area-link-agentes').click();
await p.waitForTimeout(700);
const area = await p.evaluate(() => ({
  vista: document.body.getAttribute('data-vista'),
  titulo: (document.querySelector('#view-area .view-title') || {}).textContent || null,
  paradasVisibles: document.querySelectorAll('#view-area .scene-stop').length
}));
console.log('navegación a área:', JSON.stringify(area));
await p.goBack();
await p.waitForTimeout(900);
console.log('vuelta a galería:', JSON.stringify(await p.evaluate(() => ({
  vista: document.body.getAttribute('data-vista'),
  escenas: document.querySelectorAll('#projects svg.scene').length
}))));

/* Filtro: transición y resultado */
await p.locator('.projects').scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
await p.locator('button[data-filter="ciencia-de-datos"]').click();
await p.waitForTimeout(110);
await p.locator('.filters').screenshot({ path: EV + 'filtro-en-movimiento.png' });
await p.waitForTimeout(420);
await p.locator('.projects').screenshot({ path: EV + 'filtro-aplicado.png' });
console.log('filtro aplicado:', JSON.stringify(await p.evaluate(() => {
  const visibles = [...document.querySelectorAll('.card')].filter((c) => getComputedStyle(c).display !== 'none');
  const card = visibles[0];
  const grid = document.querySelector('.projects');
  const hijos = [...grid.children];
  return {
    visibles: visibles.map((c) => c.getAttribute('data-category')),
    enfocables: [...card.querySelectorAll('.card-hit, .scene-stop')].length,
    filasGrid: getComputedStyle(grid).gridTemplateRows.split(' ').length,
    notaCard: hijos.indexOf(document.querySelector('.note-card')),
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})));

await p.locator('button[data-filter="all"]').click();
await p.waitForTimeout(500);

/* Movimiento reducido */
const r = await navegador.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
r.on('pageerror', (e) => errores.push('reducido: ' + e.message));
await r.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await r.locator('.projects').scrollIntoViewIfNeeded();
await r.waitForTimeout(600);
await r.locator('.projects').screenshot({ path: EV + 'areas-reducido.png' });

/* Móvil */
const m = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errores.push('movil: ' + e.message));
await m.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await m.locator('.card[data-category="dashboards"] .cover').scrollIntoViewIfNeeded();
await m.waitForTimeout(4400);
for (const id of ['dashboards', 'ciencia-de-datos', 'ingenieria-de-datos', 'ia-generativa', 'agentes']) {
  const cover = m.locator(`.card[data-category="${id}"] .cover`);
  await cover.scrollIntoViewIfNeeded();
  await m.waitForTimeout(4400);
  await cover.screenshot({ path: EV + `movil-escena-${id}.png` });
}
await m.locator('button[data-filter="ia-generativa"]').click();
await m.waitForTimeout(500);
await m.locator('.projects').screenshot({ path: EV + 'areas-movil-filtro.png' });
console.log('móvil:', JSON.stringify(await m.evaluate(() => ({
  columnas: getComputedStyle(document.querySelector('.projects')).gridTemplateColumns,
  desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
}))));

console.log('errores:', JSON.stringify(errores));
await navegador.close();
