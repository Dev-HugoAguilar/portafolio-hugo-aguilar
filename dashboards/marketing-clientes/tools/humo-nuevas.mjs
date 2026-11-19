import { chromium } from '@playwright/test';
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.goto('http://127.0.0.1:8000/#/area/dashboards/marketing-clientes', { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.mk-app[data-disponible]', { timeout: 45000 });
await pagina.waitForTimeout(2000);
await pagina.getByRole('button', { name: /^Adquisición$/ }).first().click();
await pagina.waitForSelector('[data-testid="panel-cuerdas"]', { timeout: 60000 });
await pagina.waitForTimeout(2500);
console.log('cuerdas:', JSON.stringify(await pagina.evaluate(() => ({
  arcos: document.querySelectorAll('[data-testid="panel-cuerdas"] path[role="button"]').length,
  bandas: document.querySelectorAll('[data-testid="panel-cuerdas"] path:not([role])').length,
  etiquetas: document.querySelectorAll('[data-testid="panel-cuerdas"] text').length,
}))));
await pagina.getByRole('button', { name: /^Conversión$/ }).first().click();
await pagina.waitForSelector('[data-testid="panel-paralelas"]', { timeout: 60000 });
await pagina.waitForTimeout(2500);
console.log('paralelas:', JSON.stringify(await pagina.evaluate(() => ({
  circulos: document.querySelectorAll('[data-testid="panel-paralelas"] circle').length,
  lineas: document.querySelectorAll('[data-testid="panel-paralelas"] line').length,
  leyenda: document.querySelectorAll('[data-testid="panel-paralelas"] .mk-leyenda-item').length,
}))));
console.log('errores:', JSON.stringify(errores.slice(0,2)));
await navegador.close();
