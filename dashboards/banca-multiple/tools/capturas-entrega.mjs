/**
 * Capturas de entrega del rediseño (no forma parte del producto).
 *
 * Deja el panel justo debajo de la cabecera fija del portafolio y captura:
 *   1. estado inicial;
 *   2. BBVA + Santander seleccionados;
 *   3. vista ampliada (comparación a ancho completo);
 *   4. móvil y filtro abierto.
 */
import { chromium } from 'playwright';

const RUTA = 'http://localhost:8000/#/area/dashboards/comparativo-bancario';
const navegador = await chromium.launch({ channel: 'chrome' });

const colocar = async (pagina) => {
  await pagina.evaluate(() => {
    const nodo = document.querySelector('[data-testid="app"]');
    if (nodo) {
      window.scrollTo({ top: Math.max(0, nodo.getBoundingClientRect().top + window.scrollY - 88) });
    }
  });
  await pagina.waitForTimeout(350);
};

const seleccionarDos = async (pagina) => {
  await pagina.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
  await pagina.locator('.bm-row', { hasText: 'Santander' }).first().click();
  await pagina.mouse.move(4, 4);
  await pagina.waitForTimeout(800);
};

/* --- escritorio --- */
const escritorio = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
await escritorio.goto(RUTA, { waitUntil: 'networkidle' });
await escritorio.waitForTimeout(1600);
await colocar(escritorio);
await escritorio.getByTestId('app').screenshot({ path: 'evidencias/entrega-inicial.png' });

await seleccionarDos(escritorio);
await colocar(escritorio);
await escritorio.getByTestId('app').screenshot({ path: 'evidencias/entrega-dos-bancos.png' });
await escritorio.screenshot({ path: 'evidencias/entrega-dos-bancos-pagina.png' });

/* filtro abierto sobre el contenido */
await escritorio.getByTestId('filtro-periodo').click();
await escritorio.waitForTimeout(400);
await escritorio.screenshot({ path: 'evidencias/entrega-filtro-abierto.png' });
await escritorio.keyboard.press('Escape');

/* vista ampliada: comparación a ancho completo */
await escritorio.locator('#demo-expand').click();
await escritorio.waitForTimeout(1200);
await escritorio.locator('dialog.demo-dialog').screenshot({ path: 'evidencias/entrega-ampliado.png' });

/* --- móvil --- */
const movil = await navegador.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await movil.goto(RUTA, { waitUntil: 'networkidle' });
await movil.waitForTimeout(1600);
await movil.getByTestId('app').screenshot({ path: 'evidencias/entrega-movil.png' });
await movil.getByTestId('filtro-instituciones').click();
await movil.waitForTimeout(400);
await movil.screenshot({ path: 'evidencias/entrega-movil-filtro.png' });

await navegador.close();
console.log('capturas listas');
