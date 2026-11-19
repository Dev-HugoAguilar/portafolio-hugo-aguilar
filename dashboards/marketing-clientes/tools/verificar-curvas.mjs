import { chromium } from '@playwright/test';
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
await pagina.goto('http://127.0.0.1:8000/#/area/dashboards/marketing-clientes', { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.mk-app[data-disponible]', { timeout: 45000 });
await pagina.waitForTimeout(2000);
await pagina.getByRole('button', { name: /^Cohortes y retención$/ }).first().click();
await pagina.waitForSelector('[data-testid="panel-curvas"]', { timeout: 45000 });
await pagina.getByRole('button', { name: /^País$/ }).first().click();
await pagina.waitForTimeout(5000);
await pagina.locator('.mk-chip-quitar').first().click();
await pagina.waitForTimeout(500);
const antes = await pagina.evaluate(() => [...document.querySelectorAll('.mk-chip-curva')].map(n => n.textContent.replace('×','').trim()));

// Cambiar datos con el filtro de fecha (misma vista, sin recargar la app).
const respuesta = await pagina.evaluate(async () => {
  const r = await fetch('http://127.0.0.1:8010/api/v1/marketing/cohortes?dimension=pais&desde=2020-12-01');
  const j = await r.json();
  return { paises: j.curvas.length };
});
// Aplicar el filtro por la interfaz: usar el botón de periodo del selector de fechas.
const fecha = await pagina.$('input[type="date"], .mk-fecha input, [data-testid="desde"]');
console.log('paises con desde=2020-12-01:', respuesta.paises, '| control de fecha encontrado:', Boolean(fecha));

// Ir a otra vista y volver: la selección debe seguir.
await pagina.getByRole('button', { name: /^Resumen$/ }).first().click();
await pagina.waitForTimeout(1200);
await pagina.getByRole('button', { name: /^Cohortes y retención$/ }).first().click();
await pagina.waitForTimeout(3500);
const despues = await pagina.evaluate(() => [...document.querySelectorAll('.mk-chip-curva')].map(n => n.textContent.replace('×','').trim()));
console.log('antes:', JSON.stringify(antes));
console.log('tras cambiar de vista y volver:', JSON.stringify(despues));
console.log('conservada:', JSON.stringify(antes) === JSON.stringify(despues));
await navegador.close();
