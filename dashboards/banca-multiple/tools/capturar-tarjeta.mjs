import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const RUTA = 'http://localhost:8000/#/area/dashboards/comparativo-bancario';
const navegador = await chromium.launch({ channel: 'chrome' });

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
  await p.waitForTimeout(700);
};

const caja = (p, desde, hasta) => p.evaluate(({ desde, hasta }) => {
  const app = document.querySelector('#demo-host .bm-app');
  const b = app.getBoundingClientRect();
  return { x: Math.round(b.left + window.scrollX), y: Math.round(b.top + window.scrollY + desde), width: Math.round(b.width), height: hasta - desde };
}, { desde, hasta });

/* Escritorio: indicadores + ranking + crecimiento (paneles completos) */
const e = await navegador.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await e.goto(RUTA, { waitUntil: 'networkidle' });
await seleccionar(e);
const cE = await caja(e, 196, 639);
await e.screenshot({ path: '../../dist/img/tmp-tarjeta.png', clip: cE, fullPage: true });
console.log('escritorio', JSON.stringify(cE));

/* Móvil: panel de ranking completo (encuadre casi cuadrado) */
const m = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(RUTA, { waitUntil: 'networkidle' });
await seleccionar(m);
const cM = await caja(m, 596, 912);
await m.screenshot({ path: '../../dist/img/tmp-tarjeta-movil.png', clip: cM, fullPage: true });
console.log('móvil', JSON.stringify(cM));

const conv = await navegador.newPage();
await conv.goto('http://localhost:8000/#/area/dashboards');
for (const [origen, destino, q] of [
  ['http://localhost:8000/img/tmp-tarjeta.png', '../../dist/img/comparativo-tarjeta.webp', 0.88],
  ['http://localhost:8000/img/tmp-tarjeta-movil.png', '../../dist/img/comparativo-tarjeta-movil.webp', 0.88]
]) {
  const dataUrl = await conv.evaluate(async ({ src, calidad }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas.toDataURL('image/webp', calidad);
  }, { src: origen, calidad: q });
  writeFileSync(destino, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('webp', destino, Math.round(dataUrl.length * 0.75 / 1024) + ' KB');
}
await navegador.close();
console.log('listo');
