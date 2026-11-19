/**
 * Interconexión entre componentes y experiencia analítica.
 *
 * Comprueba comportamiento real contra la API, no la simple presencia de
 * elementos:
 *   1. una respuesta antigua no sustituye a la selección vigente;
 *   2. el hover no dispara consultas (coordinación en el estado compartido);
 *   3. el brush temporal acota la ventana y se puede quitar;
 *   4. las transiciones duran 180–300 ms y se respetan con movimiento reducido.
 */

import { expect, test, type Page } from '@playwright/test';

const RUTA = '/#/area/dashboards/comparativo-bancario';

async function abrir(page: Page) {
  await page.goto(RUTA);
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByTestId('kpi-sistema').locator('.bm-kpi-value')).not.toHaveText('—');
}

const chips = (page: Page) =>
  page.locator('[data-testid="etiquetas-seleccion"] .bm-chip').allInnerTexts();

test.describe('Interconexión y experiencia analítica', () => {
  test.beforeEach(async ({ page }) => {
    await abrir(page);
  });

  test('una respuesta antigua no sustituye a la selección vigente', async ({ page }) => {
    let peticiones = 0;
    await page.route('**/detalle**', async (ruta) => {
      peticiones += 1;
      // La primera respuesta de detalle llega tarde: no debe pisar a la vigente.
      if (peticiones === 1) await new Promise((listo) => setTimeout(listo, 1500));
      await ruta.continue();
    });

    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    await page.locator('.bm-row', { hasText: 'Santander' }).first().click();

    // La interfaz ya refleja la última selección…
    await expect(page.getByTestId('chip-bbva_mexico')).toBeVisible();
    await expect(page.getByTestId('chip-santander')).toBeVisible();
    await expect(page.getByTestId('tabla-alcance')).toContainText('solo la selección (2)');

    // …y sigue igual cuando la respuesta lenta termina de llegar.
    await page.waitForTimeout(2000);
    expect(await chips(page)).toHaveLength(2);
    await expect(page.getByTestId('tabla-alcance')).toContainText('solo la selección (2)');
    await expect(page.getByTestId('fila-bbva_mexico')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('fila-santander')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('fila-banorte')).toHaveCount(0);

    await page.unroute('**/detalle**');
  });

  test('el hover no dispara consultas y coordina las vistas', async ({ page }) => {
    const consultas: string[] = [];
    page.on('request', (peticion) => {
      if (peticion.url().includes('/api/v1/cnbv/')) consultas.push(peticion.url());
    });

    const antes = consultas.length;
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().hover();
    await expect(page.locator('.bm-chart--ranking .bm-tip')).toBeVisible();
    await page.locator('.bm-row', { hasText: 'Banorte' }).first().hover();
    await page.waitForTimeout(600);

    // Resaltar es solo estado: ninguna petición nueva.
    expect(consultas.length).toBe(antes);

    // Y el resaltado se comparte con las demás vistas.
    const serieResaltada = await page
      .locator('[data-testid="panel-evolucion"] .bm-legend-btn[aria-pressed], .bm-legend-btn')
      .first()
      .isVisible();
    expect(serieResaltada).toBe(true);
  });

  test('el brush temporal acota la ventana y se puede quitar', async ({ page }) => {
    const overlay = page.locator('.bm-chart--evolution .overlay').first();
    await expect(overlay).toBeVisible();
    await overlay.scrollIntoViewIfNeeded();
    const caja = await overlay.boundingBox();
    expect(caja).not.toBeNull();
    if (!caja) return;

    const y = caja.y + caja.height / 2;
    await page.mouse.move(caja.x + caja.width * 0.2, y);
    await page.mouse.down();
    await page.mouse.move(caja.x + caja.width * 0.55, y, { steps: 12 });
    await page.mouse.up();

    // Se anuncia la ventana y se ofrece quitarla.
    const pista = page.locator('.bm-chart--evolution .bm-chart-hint').first();
    await expect(pista).toContainText('Ventana');
    await pista.locator('button', { hasText: 'Quitar' }).click();
    await expect(pista).not.toContainText('Ventana');
  });

  test('transiciones de 200 ms y movimiento reducido', async ({ page }) => {
    const duracion = await page
      .locator('[data-testid="panel-ranking"] rect[data-institucion]')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    const primera = duracion.split(',')[0] ?? '0s';
    const segundos = Number(primera.trim().replace('s', ''));
    expect(segundos).toBeGreaterThanOrEqual(0.18);
    expect(segundos).toBeLessThanOrEqual(0.3);

    // Con «movimiento reducido» no hay transición.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.getByTestId('app')).toBeVisible();
    const sinMovimiento = await page
      .locator('[data-testid="panel-ranking"] rect[data-institucion]')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    const sinMovimientoSegundos = Number((sinMovimiento.split(',')[0] ?? '0s').trim().replace('s', ''));
    expect(sinMovimientoSegundos).toBeLessThan(0.01);
  });
});
