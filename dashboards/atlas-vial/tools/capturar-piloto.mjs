/**
 * Capturas finales del piloto (versión implementada) a tres anchos.
 * Uso: node tools/capturar-piloto.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SALIDA = fileURLToPath(new URL('evidencias/piloto/', new URL('../', import.meta.url)));
mkdirSync(SALIDA, { recursive: true });
const SITIO = 'http://127.0.0.1:8000';
const navegador = await chromium.launch();

for (const tamano of [
  { nombre: '1440', ancho: 1440, alto: 900 },
  { nombre: '834', ancho: 834, alto: 1112 },
  { nombre: '390', ancho: 390, alto: 844 },
]) {
  const ctx = await navegador.newContext({
    viewport: { width: tamano.ancho, height: tamano.alto },
    deviceScaleFactor: 2,
    locale: 'es-MX',
    isMobile: tamano.ancho < 600,
    hasTouch: tamano.ancho < 600,
  });
  const pagina = await ctx.newPage();
  await pagina.goto(`${SITIO}/#/area/dashboards/atlas-vial`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
  await pagina.waitForTimeout(2400);
  await pagina.locator('.at-head').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  await pagina.screenshot({ path: `${SALIDA}final-${tamano.nombre}-vista.png` });

  /* Filtros activos: una alcaldía y un evento. */
  await pagina.locator('[data-testid="ctrl-alcaldias"]').click();
  await pagina.waitForTimeout(360);
  await pagina.screenshot({ path: `${SALIDA}final-${tamano.nombre}-alcaldia.png` });
  await pagina.locator('.at-opcion', { hasText: 'Iztapalapa' }).first().click();
  await pagina.waitForTimeout(1200);
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(320);
  await pagina.locator('[data-testid="ctrl-tiposEvento"]').click();
  await pagina.waitForTimeout(320);
  await pagina.locator('.at-opcion', { hasText: 'Choque' }).first().click();
  await pagina.waitForTimeout(1200);
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(320);
  await pagina.locator('.at-head').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(250);
  await pagina.screenshot({ path: `${SALIDA}final-${tamano.nombre}-activos.png` });

  /* Periodo abierto. */
  await pagina.locator('[data-testid="ctrl-periodo"]').click();
  await pagina.waitForTimeout(320);
  await pagina.locator('[data-testid="mes-2024-03"]').click();
  await pagina.locator('[data-testid="mes-2024-06"]').hover();
  await pagina.waitForTimeout(340);
  await pagina.screenshot({ path: `${SALIDA}final-${tamano.nombre}-periodo.png` });
  await ctx.close();
}

await navegador.close();
console.log('capturas finales listas');
