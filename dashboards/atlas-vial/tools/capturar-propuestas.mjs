/**
 * Capturas comparables de las dos composiciones y de la implementada.
 *
 * Uso: node tools/capturar-propuestas.mjs
 * Deja en evidencias/piloto/ las vistas de A y B en los estados pedidos.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SALIDA = fileURLToPath(new URL('evidencias/piloto/', new URL('../', import.meta.url)));
mkdirSync(SALIDA, { recursive: true });
const SITIO = 'http://127.0.0.1:8000';
const RUTA = '/#/area/dashboards/atlas-vial';

const navegador = await chromium.launch();

async function foto(pagina, nombre, elemento) {
  const objetivo = elemento ? pagina.locator(elemento) : pagina;
  await objetivo.screenshot({ path: `${SALIDA}${nombre}.png` });
}

async function preparar(ancho, alto, proto) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 2,
    locale: 'es-MX',
    isMobile: ancho < 600,
    hasTouch: ancho < 600,
  });
  const pagina = await ctx.newPage();
  const destino = proto ? `${SITIO}/?proto=${proto}#/area/dashboards/atlas-vial` : `${SITIO}/#/area/dashboards/atlas-vial`;
  await pagina.goto(destino, { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(2400);
  await pagina.locator('.at-head').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  console.log('proto', proto || '(B)', 'clase', await pagina.evaluate(() => document.querySelector('[data-testid="app"]')?.className));
  return { ctx, pagina };
}

for (const proto of ['a', '']) {
  const etiqueta = proto === 'a' ? 'A' : 'B';
  const { ctx, pagina } = await preparar(1440, 900, proto);

  await foto(pagina, `${etiqueta}-01-encabezado`, '.at-head');
  await foto(pagina, `${etiqueta}-02-filtros`, '[data-testid="filtros"]');

  /* Una alcaldía. */
  await pagina.locator('[data-testid="ctrl-alcaldias"]').click();
  await pagina.waitForTimeout(420);
  await foto(pagina, `${etiqueta}-03-alcaldia-abierto`, '.atf-panel');
  await pagina.locator('.at-opcion', { hasText: 'Tlalpan' }).first().click();
  await pagina.waitForTimeout(1500);
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(350);
  await foto(pagina, `${etiqueta}-04-una-alcaldia`, '.at-head');
  await foto(pagina, `${etiqueta}-05-filtros-activos`, '[data-testid="filtros"]');

  /* Selección múltiple. */
  await pagina.locator('[data-testid="ctrl-alcaldias"]').click();
  await pagina.waitForTimeout(320);
  await pagina.locator('.at-opcion', { hasText: 'Iztapalapa' }).first().click();
  await pagina.waitForTimeout(1400);
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(300);
  await foto(pagina, `${etiqueta}-06-multiple`, '[data-testid="filtros"]');

  /* Periodo abierto con vista previa. */
  await pagina.locator('[data-testid="ctrl-periodo"]').click();
  await pagina.waitForTimeout(300);
  await pagina.locator('[data-testid="mes-2024-03"]').click();
  await pagina.locator('[data-testid="mes-2024-06"]').hover();
  await pagina.waitForTimeout(320);
  await foto(pagina, `${etiqueta}-07-periodo`, '.atf-panel--periodo');
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(300);
  await ctx.close();
}

/* Móvil de la implementada y de la alternativa. */
for (const [proto, etiqueta] of [
  ['', 'B'],
  ['a', 'A'],
]) {
  const { ctx, pagina } = await preparar(390, 844, proto);
  await foto(pagina, `${etiqueta}-08-movil`, '.at-head');
  await pagina.locator('[data-testid="filtros"]').scrollIntoViewIfNeeded();
  await foto(pagina, `${etiqueta}-09-movil-filtros`, '[data-testid="filtros"]');
  await pagina.locator('[data-testid="ctrl-alcaldias"]').click();
  await pagina.waitForTimeout(420);
  await pagina.screenshot({ path: `${SALIDA}${etiqueta}-10-movil-panel.png` });
  await ctx.close();
}

await navegador.close();
console.log('capturas listas en evidencias/piloto/');
