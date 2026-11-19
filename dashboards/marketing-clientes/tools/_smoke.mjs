import { chromium } from '@playwright/test';
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.goto('http://127.0.0.1:8000/#/area/dashboards/marketing-clientes', { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.mk-app[data-disponible]', { timeout: 45000 });
await pagina.waitForSelector('[data-testid="panel-lollipop"] svg', { timeout: 60000 });
await pagina.waitForTimeout(2000);

// 1) Productos y compra: un solo bloque
await pagina.getByRole('button', { name: /^Adquisición$/ }).first().click();
await pagina.waitForSelector('[data-testid="panel-productos"]', { timeout: 45000 });
await pagina.waitForSelector('.mk-ranking-fila', { timeout: 45000 });
await pagina.waitForTimeout(2000);
const productos = await pagina.evaluate(() => ({
  bloques: document.querySelectorAll('[data-testid="panel-productos"]').length,
  cuerdas: document.querySelectorAll('[data-testid="panel-productos"] [data-testid="panel-cuerdas"]').length,
  cabeceras: [...document.querySelectorAll('[data-testid="panel-productos"] h3')].map((n) => n.textContent?.trim()),
  segs: [...document.querySelectorAll('[data-testid="panel-productos"] .mk-seg')].map((b) => b.textContent?.trim()),
  tablas: document.querySelectorAll('[data-testid="panel-productos"] table').length,
}));
console.log('PRODUCTOS:', JSON.stringify(productos));
await pagina.locator('[data-testid="panel-productos"]').screenshot({ path: 'evidencias/bloque-productos-consolidado.png' });
await pagina.getByRole('button', { name: /^Tabla$/ }).click();
await pagina.waitForTimeout(500);
const trasTabla = await pagina.evaluate(() => ({
  cuerdas: document.querySelectorAll('[data-testid="panel-productos"] [data-testid="panel-cuerdas"]').length,
  tablas: document.querySelectorAll('[data-testid="panel-productos"] table').length,
}));
console.log('PRODUCTOS tras cambiar a Tabla:', JSON.stringify(trasTabla));
await pagina.getByRole('button', { name: /^Afinidad de categorías$/ }).click();

// 2) Mapa de fricción en Conversión
await pagina.getByRole('button', { name: /^Conversión$/ }).first().click();
await pagina.waitForSelector('[data-testid="panel-friccion"]', { timeout: 45000 });
await pagina.waitForSelector('.mk-friccion-celda', { timeout: 45000 });
await pagina.waitForTimeout(1500);
const friccion = await pagina.evaluate(() => ({
  titulo: document.querySelector('[data-testid="panel-friccion"] h3')?.textContent?.trim(),
  celdas: document.querySelectorAll('.mk-friccion-celda').length,
  filas: document.querySelectorAll('.mk-friccion-fila').length,
  modos: [...document.querySelectorAll('[data-testid="panel-friccion"] .mk-seg')].map((b) => b.textContent?.trim()),
  paralelas: document.querySelectorAll('[data-testid="panel-paralelas"]').length,
}));
console.log('FRICCIÓN:', JSON.stringify(friccion));
await pagina.locator('[data-testid="panel-friccion"]').screenshot({ path: 'evidencias/bloque-friccion-brecha.png' });
await pagina.locator('.mk-friccion-celda').first().click();
await pagina.waitForSelector('[data-testid="panel-friccion-detalle"]', { timeout: 20000 });
await pagina.waitForTimeout(600);
console.log('detalle:', await pagina.evaluate(() => document.querySelector('[data-testid="panel-friccion-detalle"]')?.textContent?.replace(/\s+/g,' ').slice(0,160)));
await pagina.screenshot({ path: 'evidencias/bloque-friccion-detalle.png' });
await pagina.getByRole('button', { name: /Volumen sin avance/ }).first().click();
await pagina.waitForTimeout(600);
await pagina.locator('[data-testid="panel-friccion"]').screenshot({ path: 'evidencias/bloque-friccion-volumen.png' });

// 3) Tabla de eventos plegada
await pagina.getByRole('button', { name: /^Resumen$/ }).first().click();
await pagina.waitForSelector('[data-testid="panel-tabla"]', { timeout: 45000 });
await pagina.waitForTimeout(1200);
const cerrada = await pagina.evaluate(() => ({
  titulo: document.querySelector('[data-testid="panel-tabla"] h3')?.textContent?.trim(),
  contenido: document.querySelectorAll('[data-testid="tabla-contenido"]').length,
  alto: Math.round(document.querySelector('[data-testid="panel-tabla"]')?.getBoundingClientRect().height ?? 0),
  exportar: document.querySelector('[data-testid="panel-tabla"] .mk-btn--ghost')?.textContent?.trim(),
}));
console.log('TABLA cerrada:', JSON.stringify(cerrada));
await pagina.getByRole('button', { name: /^Abrir$/ }).click();
await pagina.waitForSelector('[data-testid="tabla-contenido"] table', { timeout: 45000 });
await pagina.waitForTimeout(1500);
const abierta = await pagina.evaluate(() => ({
  filas: document.querySelectorAll('[data-testid="tabla-contenido"] tbody tr').length,
  columnas: [...document.querySelectorAll('[data-testid="tabla-contenido"] thead th')].map((n) => n.textContent?.trim()).filter(Boolean),
  tamano: document.querySelector('[data-testid="tabla-contenido"] select')?.value,
  cobertura: document.querySelector('[data-testid="panel-tabla"] .mk-panel-sub')?.textContent?.replace(/\s+/g,' ').trim(),
}));
console.log('TABLA abierta:', JSON.stringify(abierta));
await pagina.locator('[data-testid="tabla-contenido"] tbody tr').first().getByRole('button', { name: /Detalle/ }).click();
await pagina.waitForTimeout(400);
console.log('fila expandida:', await pagina.evaluate(() => document.querySelector('.mk-fila-detalle')?.textContent?.replace(/\s+/g,' ').slice(0,120)));
await pagina.screenshot({ path: 'evidencias/bloque-tabla-eventos.png' });
await pagina.getByRole('button', { name: /^Cerrar$/ }).click();
await pagina.waitForTimeout(600);
console.log('TABLA tras cerrar:', await pagina.evaluate(() => ({ contenido: document.querySelectorAll('[data-testid="tabla-contenido"]').length, alto: Math.round(document.querySelector('[data-testid="panel-tabla"]')?.getBoundingClientRect().height ?? 0) })));
console.log('errores:', JSON.stringify(errores.slice(0,3)));
await navegador.close();
