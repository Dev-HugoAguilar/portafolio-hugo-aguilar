import { chromium } from 'playwright';
const RUTA = 'http://localhost:8000/#/area/dashboards/comparativo-bancario';

const seleccionar = async (p) => {
  await p.waitForTimeout(3200);
  await p.waitForFunction(() => {
    const kpi = document.querySelector('[data-testid="kpi-sistema"] .bm-kpi-value');
    return kpi && kpi.textContent && kpi.textContent.trim() !== '—';
  }, { timeout: 20000 });
  await p.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
  await p.waitForTimeout(500);
  await p.locator('.bm-row', { hasText: 'Santander' }).first().click();
  await p.waitForTimeout(900);
  await p.mouse.move(4, 4);
  await p.waitForTimeout(800);
};

const recorte = async (p, desde, hasta) => {
  return p.evaluate(({ desde, hasta }) => {
    const app = document.querySelector('#demo-host .bm-app');
    const base = app.getBoundingClientRect();
    return {
      x: Math.round(base.left + window.scrollX),
      y: Math.round(base.top + window.scrollY + desde),
      width: Math.round(base.width),
      height: hasta - desde,
    };
  }, { desde, hasta });
};

/* Escritorio: indicadores + ranking + crecimiento */
const e = await (await chromium.launch({ channel: 'chrome' })).newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
await e.goto(RUTA, { waitUntil: 'networkidle' });
await seleccionar(e);
const cajaE = await recorte(e, 196, 639);
console.log('escritorio', JSON.stringify(cajaE));
await e.screenshot({ path: '../../dist/img/comparativo-portada.png', clip: cajaE, fullPage: true });
await e.context().browser().close();

/* Móvil: ranking + crecimiento, apilados */
const m = await (await chromium.launch({ channel: 'chrome' })).newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(RUTA, { waitUntil: 'networkidle' });
await seleccionar(m);
const cajaM = await recorte(m, 596, 1281);
console.log('móvil', JSON.stringify(cajaM));
await m.screenshot({ path: '../../dist/img/comparativo-portada-movil.png', clip: cajaM, fullPage: true });
await m.context().browser().close();
console.log('portadas listas');
