import { chromium } from 'playwright';

const n = await chromium.launch({ channel: 'chrome' });
const errs = [];

/* Móvil */
const m = await n.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errs.push('movil: ' + e.message));
await m.goto('http://localhost:8000/#/area/dashboards/comparativo-bancario', { waitUntil: 'networkidle' });
await m.waitForTimeout(2400);
console.log('móvil:', JSON.stringify(await m.evaluate(() => {
  const f = document.querySelector('.project-fields');
  const b = (x) => x.getBoundingClientRect();
  return {
    columnas: getComputedStyle(f).gridTemplateColumns,
    titulo: getComputedStyle(document.querySelector('#view-project .view-title')).fontSize,
    subtitulo: getComputedStyle(document.querySelector('#view-project .view-subtitle')).fontSize,
    tecFilas: document.querySelectorAll('.tec-row').length,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})));
await m.screenshot({ path: 'evidencias/proyecto-movil.png', fullPage: true });

/* Hallazgos: deben seguir respondiendo a los filtros del tablero */
const p = await n.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => errs.push('hallazgos: ' + e.message));
await p.goto('http://localhost:8000/#/area/dashboards/comparativo-bancario', { waitUntil: 'networkidle' });
await p.waitForTimeout(2600);
const antes = await p.evaluate(() => (document.querySelector('#hallazgos-host') || {}).textContent.trim());
await p.locator('.bm-row', { hasText: 'Banorte' }).first().click();
await p.waitForTimeout(1400);
const despues = await p.evaluate(() => (document.querySelector('#hallazgos-host') || {}).textContent.trim());
console.log('hallazgos antes:', antes.slice(0, 90));
console.log('hallazgos después:', despues.slice(0, 90));
console.log('cambian con el filtro:', antes !== despues);
console.log('errores:', JSON.stringify(errs));
await n.close();
