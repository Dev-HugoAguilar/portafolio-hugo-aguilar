import { chromium } from '@playwright/test';
const n = await chromium.launch();
const c = await n.newContext({ viewport: { width: 1440, height: 960 }, locale: 'es-MX' });
const p = await c.newPage();
p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 200)); });
await p.goto('http://127.0.0.1:8000/#/area/dashboards/marketing-clientes', { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.mk-kpi-valor', { timeout: 60000 });
await p.waitForTimeout(2500);
console.log(await p.evaluate(() => JSON.stringify({
  disponible: document.querySelector('.mk-app')?.getAttribute('data-disponible'),
  kpis: [...document.querySelectorAll('.mk-kpi-valor')].map(n => n.textContent.trim()),
})));
await n.close();
