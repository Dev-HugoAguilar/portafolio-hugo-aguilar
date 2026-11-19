/**
 * Evidencias del prototipo aislado: estados, anchos y secuencia en vídeo.
 * Uso: node tools/capturar-prototipo.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SALIDA = fileURLToPath(new URL('evidencias/prototipo/', new URL('../', import.meta.url)));
mkdirSync(SALIDA, { recursive: true });
const URL_PROTO = 'http://127.0.0.1:8000/prototipo/';
const navegador = await chromium.launch();

async function abrir(ancho, alto, video = false) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 2,
    locale: 'es-MX',
    isMobile: ancho < 600,
    hasTouch: ancho < 600,
    ...(video ? { recordVideo: { dir: SALIDA, size: { width: ancho, height: alto } } } : {}),
  });
  const pagina = await ctx.newPage();
  await pagina.goto(URL_PROTO, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.pt-zona');
  await pagina.waitForTimeout(1600);
  return { ctx, pagina };
}

/* ------------------------------- estados ------------------------------- */
for (const [etiqueta, ancho, alto] of [
  ['1440', 1440, 1000],
  ['834', 834, 1112],
  ['390', 390, 844],
]) {
  const { ctx, pagina } = await abrir(ancho, alto);
  await pagina.screenshot({ path: `${SALIDA}${etiqueta}-01-pagina.png`, fullPage: true });

  /* Alcaldía abierta con búsqueda y selección múltiple. */
  await pagina.locator('[data-testid="zona-alcaldia"]').click();
  await pagina.waitForTimeout(360);
  await pagina.locator('.pt-panel-buscar input').fill('izta');
  await pagina.waitForTimeout(280);
  await pagina.locator('.pt-opcion', { hasText: 'Iztapalapa' }).first().click();
  await pagina.locator('.pt-panel-buscar input').fill('tla');
  await pagina.waitForTimeout(280);
  await pagina.locator('.pt-opcion', { hasText: 'Tlalpan' }).first().click();
  await pagina.waitForTimeout(320);
  await pagina.screenshot({ path: `${SALIDA}${etiqueta}-02-alcaldia.png` });
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(360);

  /* Etiquetas activas. */
  await pagina.locator('[data-testid="zona-evento"]').click();
  await pagina.waitForTimeout(320);
  await pagina.locator('.pt-opcion', { hasText: 'Choque' }).first().click();
  await pagina.waitForTimeout(900);
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(360);
  await pagina.screenshot({ path: `${SALIDA}${etiqueta}-03-etiquetas.png` });

  /* Periodo con intervalo elegido. */
  await pagina.locator('[data-testid="zona-periodo"]').click();
  await pagina.waitForTimeout(320);
  await pagina.locator('.pt-mes', { hasText: 'Mar' }).first().click();
  await pagina.locator('.pt-mes', { hasText: 'Jun' }).first().hover();
  await pagina.waitForTimeout(320);
  await pagina.screenshot({ path: `${SALIDA}${etiqueta}-04-periodo.png` });
  await pagina.keyboard.press('Escape');
  await ctx.close();
}

/* ------------------------------- secuencia ----------------------------- */
const { ctx, pagina } = await abrir(1440, 900, true);
await pagina.getByRole('tab', { name: /Tiempo y entorno vial/ }).click();
await pagina.waitForTimeout(700);
await pagina.getByRole('tab', { name: /Territorio/ }).click();
await pagina.waitForTimeout(700);
await pagina.locator('[data-testid="zona-alcaldia"]').click();
await pagina.waitForTimeout(400);
await pagina.locator('.pt-panel-buscar input').fill('izta');
await pagina.waitForTimeout(500);
await pagina.locator('.pt-opcion', { hasText: 'Iztapalapa' }).first().click();
await pagina.waitForTimeout(400);
await pagina.locator('.pt-panel-buscar input').fill('tla');
await pagina.waitForTimeout(400);
await pagina.locator('.pt-opcion', { hasText: 'Tlalpan' }).first().click();
await pagina.waitForTimeout(700);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(500);
await pagina.locator('.pt-chip', { hasText: 'Tlalpan' }).first().click();
await pagina.waitForTimeout(700);
await pagina.locator('[data-testid="zona-periodo"]').click();
await pagina.waitForTimeout(500);
await pagina.locator('.pt-mes', { hasText: 'Mar' }).first().click();
await pagina.locator('.pt-mes', { hasText: 'Jun' }).first().hover();
await pagina.waitForTimeout(500);
await pagina.locator('.pt-pie-primaria').click();
await pagina.waitForTimeout(1400);
const video = pagina.video();
await ctx.close();
if (video) {
  const ruta = await video.path();
  try {
    renameSync(ruta, `${SALIDA}secuencia-prototipo.webm`);
  } catch {
    // el archivo queda en la carpeta temporal del contexto
  }
}

await navegador.close();
console.log('evidencias del prototipo listas');
