import { chromium } from 'playwright';
const navegador = await chromium.launch({ channel: 'chrome' });
const p = await navegador.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await p.goto('http://localhost:8000/#/area/dashboards/comparativo-bancario', { waitUntil: 'networkidle' });
await p.waitForTimeout(3500);
await p.waitForFunction(() => {
  const kpi = document.querySelector('[data-testid="kpi-sistema"] .bm-kpi-value');
  return kpi && kpi.textContent && kpi.textContent.trim() !== '—';
}, { timeout: 20000 });
await p.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
await p.waitForTimeout(600);
await p.locator('.bm-row', { hasText: 'Santander' }).first().click();
await p.waitForTimeout(1200);
await p.mouse.move(4, 4);
await p.waitForTimeout(900);
const estado = await p.evaluate(() => ({
  chips: [...document.querySelectorAll('[data-testid="etiquetas-seleccion"] .bm-chip')].map((n) => n.textContent.trim()),
  tooltip: document.querySelectorAll('.bm-tip').length,
  dialogo: document.querySelectorAll('dialog[open]').length,
  seleccionados: document.querySelectorAll('[data-testid="panel-ranking"] .bm-row[aria-pressed="true"]').length,
}));
console.log(JSON.stringify(estado));
const app = p.locator('#demo-host .bm-app');
const caja = await app.boundingBox();
console.log('caja:', JSON.stringify(caja));
await app.screenshot({ path: '../../dist/img/comparativo-bancario.png' });
await app.screenshot({ path: 'evidencias/tmp-captura.jpg', type: 'jpeg', quality: 84 });
await navegador.close();
console.log('captura lista');
