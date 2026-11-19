import { chromium } from 'playwright';

const n = await chromium.launch({ channel: 'chrome' });
const errs = [];
const EV = 'evidencias/';

const p = await n.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8000/#/area/dashboards/comparativo-bancario', { waitUntil: 'networkidle' });
await p.waitForTimeout(2800);

const estilos = await p.evaluate(() => {
  const cs = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    return {
      bg: c.backgroundColor, border: c.borderTopColor, color: c.color,
      radius: c.borderTopLeftRadius, alto: Math.round(el.getBoundingClientRect().height),
      trans: c.transitionProperty + ' ' + c.transitionDuration
    };
  };
  return {
    filtroPeriodo: cs('[data-testid="filtro-periodo"]'),
    accionRestablecer: cs('[data-testid="restablecer"]'),
    segGrupo: cs('.bm-chart--ranking .bm-seg'),
    segActivo: cs('.bm-chart--ranking .bm-seg-btn.is-on'),
    segInactivo: cs('.bm-chart--ranking .bm-seg-btn:not(.is-on)'),
    comparar: cs('[data-testid="comparar-fechas"]'),
    zoomGrupo: cs('.bm-chart--scatter .bm-seg:nth-of-type(2)'),
    criterio: cs('.bm-chart--evolution .bm-seg-btn.is-on'),
    modo: cs('[data-testid="modo-seleccionar"]')
  };
});
console.log(JSON.stringify(estilos, null, 1));

/* Captura de las barras de herramientas */
await p.locator('[data-testid="panel-ranking"]').screenshot({ path: EV + 'ctrl-ranking.png' });
await p.locator('[data-testid="panel-evolucion"]').screenshot({ path: EV + 'ctrl-evolucion.png' });
await p.locator('[data-testid="panel-dispersion"]').screenshot({ path: EV + 'ctrl-dispersion.png' });
await p.locator('.bm-filters').screenshot({ path: EV + 'ctrl-filtros.png' });

/* Estados: hover y foco */
const seg = p.locator('.bm-chart--evolution .bm-seg-btn', { hasText: 'Importe' });
await seg.hover();
await p.waitForTimeout(220);
await p.locator('.bm-chart--evolution .bm-chart-tools').screenshot({ path: EV + 'ctrl-hover.png' });
await seg.focus();
await p.keyboard.press('Tab');
await p.waitForTimeout(200);
const foco = await p.evaluate(() => {
  const el = document.activeElement;
  return { etiqueta: el ? el.textContent.trim().slice(0, 24) : null, outline: el ? getComputedStyle(el).outlineColor + ' ' + getComputedStyle(el).outlineWidth : null };
});
console.log('foco de teclado:', JSON.stringify(foco));

/* Móvil */
const m = await n.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errs.push('movil: ' + e.message));
await m.goto('http://localhost:8000/#/area/dashboards/comparativo-bancario', { waitUntil: 'networkidle' });
await m.waitForTimeout(2600);
await m.locator('[data-testid="panel-ranking"]').scrollIntoViewIfNeeded();
await m.waitForTimeout(400);
await m.locator('[data-testid="panel-ranking"]').screenshot({ path: EV + 'ctrl-ranking-movil.png' });
await m.locator('[data-testid="panel-evolucion"]').screenshot({ path: EV + 'ctrl-evolucion-movil.png' });
console.log('móvil:', JSON.stringify(await m.evaluate(() => {
  const g = document.querySelector('.bm-chart--ranking .bm-seg');
  const b = g.getBoundingClientRect();
  return { grupo: Math.round(b.width) + 'x' + Math.round(b.height), desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth };
})));

console.log('errores:', JSON.stringify(errs));
await n.close();
