import { chromium } from 'playwright';

const EV = 'evidencias/';
const navegador = await chromium.launch({ channel: 'chrome' });
const errores = [];

/* ---- Móvil ---- */
const m = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errores.push('movil: ' + e.message));
await m.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });

await m.locator('.projects').scrollIntoViewIfNeeded();
await m.waitForTimeout(600);
console.log('móvil inicio (recién visible):', JSON.stringify(await m.evaluate(() => {
  const c = document.querySelector('.card[data-category="dashboards"]');
  return {
    isIn: c.classList.contains('is-in'),
    periodo: [...c.querySelectorAll('svg text')].filter((n) => /^periodo/.test(n.textContent)).map((n) => n.textContent),
    columnas: getComputedStyle(document.querySelector('.projects')).gridTemplateColumns,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})));

await m.waitForTimeout(4500);
await m.locator('.projects').screenshot({ path: EV + 'areas-movil.png' });
for (const id of ['dashboards', 'ciencia-de-datos', 'ingenieria-de-datos', 'ia-generativa', 'agentes']) {
  const cover = m.locator(`.card[data-category="${id}"] .cover`);
  await cover.scrollIntoViewIfNeeded();
  await m.waitForTimeout(4400);
  await cover.screenshot({ path: EV + `movil-escena-${id}.png` });
}
console.log('móvil final:', JSON.stringify(await m.evaluate(() => {
  const c = document.querySelector('.card[data-category="dashboards"]');
  const cover = c.querySelector('.cover').getBoundingClientRect();
  return {
    periodo: [...c.querySelectorAll('svg text')].filter((n) => /^periodo/.test(n.textContent)).map((n) => n.textContent),
    coverW: Math.round(cover.width), coverH: Math.round(cover.height),
    etiquetaPx: +(document.querySelector('.card svg text').getBoundingClientRect().height).toFixed(1),
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})));

/* Filtro en móvil */
await m.locator('button[data-filter="ia-generativa"]').click();
await m.waitForTimeout(500);
await m.locator('.projects').screenshot({ path: EV + 'areas-movil-filtro.png' });
console.log('móvil filtro:', JSON.stringify(await m.evaluate(() => {
  const visibles = [...document.querySelectorAll('.card')].filter((c) => getComputedStyle(c).display !== 'none');
  return {
    visibles: visibles.map((c) => c.getAttribute('data-category')),
    pill: !!document.querySelector('.filters-pill'),
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})));

/* ---- Movimiento reducido ---- */
const r = await navegador.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
r.on('pageerror', (e) => errores.push('reducido: ' + e.message));
await r.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await r.locator('.projects').scrollIntoViewIfNeeded();
await r.waitForTimeout(500);
console.log('reducido:', JSON.stringify(await r.evaluate(() => {
  const c = document.querySelector('.card[data-category="dashboards"]');
  const svg = c.querySelector('svg');
  const opacidades = [...document.querySelectorAll('.card > .cover, .card > h3')].map((n) => getComputedStyle(n).opacity);
  return {
    periodo: [...c.querySelectorAll('svg text')].filter((n) => /^periodo/.test(n.textContent)).map((n) => n.textContent),
    lineaVisible: getComputedStyle(svg.querySelector('path[stroke="#3458F5"]')).strokeDashoffset,
    opacidades: [...new Set(opacidades)],
    pill: getComputedStyle(document.querySelector('.filters-pill')).transitionDuration
  };
})));
await r.locator('.projects').screenshot({ path: EV + 'areas-reducido.png' });

console.log('errores:', JSON.stringify(errores));
await navegador.close();
