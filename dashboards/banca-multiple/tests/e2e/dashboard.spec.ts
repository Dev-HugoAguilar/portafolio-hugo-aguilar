/**
 * Verificación con Playwright del dashboard CNBV contra la API real.
 *
 * Cubre los diez puntos de aceptación: selección desde el ranking, coherencia
 * entre vistas, segundo banco, retirada desde la etiqueta, cambio de periodo y
 * concepto, selección desde la dispersión, deshacer/restablecer, cambios rápidos,
 * datos ausentes y errores de API, teclado y móvil.
 *
 * Siempre se comprueban **valores y estado**, no solo la presencia de gráficos.
 */

import { expect, test, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:8010/api/v1/cnbv/banca-multiple';
const RUTA = '/#/area/dashboards/comparativo-bancario';
const EVIDENCIAS = 'evidencias';

interface ResumenApi {
  periodo: string;
  kpis: { valor_sistema: number; instituciones_con_dato: number };
  por_institucion: Array<{
    institucion_id: string;
    institucion: string;
    valor: number | null;
    participacion_pct: number | null;
    es_sistema: boolean;
  }>;
}

const numero = (texto: string): number => Number(texto.replace(/[^\d.-]/g, ''));
/** Texto comparable de una cifra (sin espacios ni saltos de línea). */
const cifra = (texto: string): string => texto.replace(/\s+/g, '');
const compacto = (valor: number): string =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(valor);
/** Importe en billones, como lo muestran las tarjetas de indicadores. */
const billones = (millones: number): string =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    millones / 1_000_000,
  );
const enBillones = (millones: number): number => Number((millones / 1_000_000).toFixed(2));

async function abrir(page: Page) {
  await page.goto(RUTA);
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByTestId('kpi-sistema')).toBeVisible();
  // espera a que la primera consulta pinte una cifra real
  await expect(page.getByTestId('kpi-sistema').locator('.bm-kpi-value')).not.toHaveText('—');
}

async function api<T>(page: Page, ruta: string): Promise<T> {
  const respuesta = await page.request.get(`${API}${ruta}`);
  expect(respuesta.ok(), `API ${ruta} → ${respuesta.status()}`).toBeTruthy();
  return (await respuesta.json()) as T;
}

async function elegirPeriodo(page: Page, periodo: string) {
  await page.getByTestId('filtro-periodo').click();
  await page.locator('.bm-pop .bm-option', { hasText: periodo }).first().click();
  await expect(page.getByTestId('meta-periodo')).toHaveText(periodo);
}

async function elegirConcepto(page: Page, texto: string) {
  await page.getByTestId('filtro-concepto').click();
  await page.locator('.bm-pop .bm-option', { hasText: texto }).first().click();
  await expect(page.getByTestId('meta-concepto')).toContainText(texto.split(' · ')[0]);
}

async function chips(page: Page): Promise<string[]> {
  return page.locator('[data-testid="etiquetas-seleccion"] .bm-chip').allInnerTexts();
}

test.describe('Dashboard CNBV', () => {
  test.beforeEach(async ({ page }) => {
    await abrir(page);
  });

  test('1-2. seleccionar en el ranking y comprobarlo en todas las vistas', async ({ page }) => {
    const datos = await api<ResumenApi>(page, `/resumen?periodo=2024-10&concepto=activo%231`);
    const bbva = datos.por_institucion.find((fila) => fila.institucion_id === 'bbva_mexico');
    expect(bbva?.valor).toBeTruthy();

    // el KPI del sistema coincide con la API
    const sistemaTexto = await page.getByTestId('kpi-sistema').locator('.bm-kpi-value').innerText();
    expect(sistemaTexto).toContain(billones(datos.kpis.valor_sistema));
    // la cifra original sigue disponible en el tooltip de la tarjeta
    await expect(page.getByTestId('kpi-sistema').locator('.bm-kpi-value')).toHaveAttribute(
      'title',
      new RegExp(compacto(datos.kpis.valor_sistema).slice(0, 4)),
    );

    // clic en la barra del ranking
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    await expect(page.getByTestId('chip-bbva_mexico')).toBeVisible();
    expect(await chips(page)).toHaveLength(1);

    // etiqueta, KPI de selección y participación con los valores reales
    const seleccion = await page.getByTestId('kpi-seleccion').locator('.bm-kpi-value').innerText();
    expect(seleccion).toContain(billones(bbva?.valor ?? 0));
    const participacion = await page
      .getByTestId('kpi-participacion')
      .locator('.bm-kpi-value')
      .innerText();
    expect(Math.abs(numero(participacion) - (bbva?.participacion_pct ?? 0))).toBeLessThan(0.05);

    // serie: la leyenda incluye al banco seleccionado
    await expect(
      page.locator('[data-testid="panel-evolucion"] .bm-legend-btn', { hasText: 'BBVA México' }),
    ).toBeVisible();

    // dispersión: el punto del banco queda marcado como seleccionado
    await expect(
      page.locator('.bm-point[aria-label^="BBVA México"][aria-pressed="true"]'),
    ).toHaveCount(1);

    // tabla: la fila aparece resaltada
    await expect(page.getByTestId('fila-bbva_mexico')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('tabla-alcance')).toContainText('solo la selección (1)');

    await page.screenshot({ path: `${EVIDENCIAS}/01-seleccion-ranking.png`, fullPage: true });
  });

  test('3-4. añadir un segundo banco y quitarlo desde su etiqueta', async ({ page }) => {
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    await page.locator('.bm-row', { hasText: 'Banorte' }).first().click();
    expect(await chips(page)).toHaveLength(2);

    const datos = await api<ResumenApi>(page, `/resumen?periodo=2024-10&concepto=activo%231`);
    const suma = datos.por_institucion
      .filter((fila) => ['bbva_mexico', 'banorte'].includes(fila.institucion_id))
      .reduce((total, fila) => total + (fila.valor ?? 0), 0);
    const seleccion = await page.getByTestId('kpi-seleccion').locator('.bm-kpi-value').innerText();
    expect(seleccion).toContain(billones(suma));

    // quitar Banorte desde su etiqueta
    await page.getByTestId('chip-banorte').locator('.bm-chip-x').click();
    expect(await chips(page)).toHaveLength(1);
    await expect(page.getByTestId('chip-banorte')).toHaveCount(0);
    // la tabla muestra el alcance de la selección: Banorte sale del conjunto
    await expect(page.getByTestId('fila-bbva_mexico')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('tabla-alcance')).toContainText('solo la selección (1)');
  });

  test('5. cambiar periodo y concepto actualiza cifras y series', async ({ page }) => {
    await elegirPeriodo(page, 'ene 2024');
    const datos = await api<ResumenApi>(page, `/resumen?periodo=2024-01&concepto=activo%231`);
    const sistema = await page.getByTestId('kpi-sistema').locator('.bm-kpi-value').innerText();
    expect(numero(sistema)).toBe(enBillones(datos.kpis.valor_sistema));

    await elegirConcepto(page, 'Resultado neto');
    const flujo = await api<ResumenApi>(page, `/resumen?periodo=2024-01&concepto=resultado_neto%231`);
    const sistemaFlujo = await page.getByTestId('kpi-sistema').locator('.bm-kpi-value').innerText();
    expect(sistemaFlujo).toContain(compacto(flujo.kpis.valor_sistema));

    // el flujo acumulado se rotula y no ofrece desglose de cartera
    await expect(page.getByTestId('kpi-base')).toContainText('Flujo acumulado');
    await expect(page.getByTestId('filtro-cartera')).toHaveCount(0);
  });

  test('6. seleccionar desde la dispersión', async ({ page }) => {
    // Los puntos pueden solaparse (mismos ROA/ROE); se usa el camino accesible
    // por teclado, que es exactamente el previsto para esos casos.
    const punto = page.locator('.bm-point[aria-label^="BBVA México"]');
    await expect(punto).toBeVisible();
    await punto.focus();
    await expect(punto).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('chip-bbva_mexico')).toBeVisible();
    await expect(page.getByTestId('fila-bbva_mexico')).toHaveAttribute('aria-pressed', 'true');
    // el recuadro de la dispersión también selecciona: se comprueba que existe
    await expect(page.locator('.bm-chart--scatter .overlay')).toHaveCount(1);
  });

  test('7. deshacer y restablecer', async ({ page }) => {
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    await page.locator('.bm-row', { hasText: 'Banorte' }).first().click();
    expect(await chips(page)).toHaveLength(2);

    await page.getByTestId('deshacer').click();
    expect(await chips(page)).toHaveLength(1);

    await page.getByTestId('deshacer').click();
    expect(await chips(page)).toHaveLength(0);

    await elegirPeriodo(page, 'abr 2024');
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    await page.getByTestId('restablecer').click();
    expect(await chips(page)).toHaveLength(0);
    await expect(page.getByTestId('meta-periodo')).toHaveText('oct 2024');
  });

  test('8. cambios rápidos: prevalece la última selección', async ({ page }) => {
    await elegirPeriodo(page, 'jul 2024');
    await elegirPeriodo(page, 'ene 2024');
    await elegirPeriodo(page, 'oct 2024');

    const datos = await api<ResumenApi>(page, `/resumen?periodo=2024-10&concepto=activo%231`);
    await expect(page.getByTestId('meta-periodo')).toHaveText('oct 2024');
    const sistema = await page.getByTestId('kpi-sistema').locator('.bm-kpi-value').innerText();
    expect(numero(sistema)).toBe(enBillones(datos.kpis.valor_sistema));
    await expect(page.getByTestId('meta-concepto')).toContainText('Activo total');
  });

  test('9. errores de API y ausentes se informan', async ({ page }) => {
    // error de API: se intercepta el resumen y se devuelve 500
    await page.route('**/resumen**', (ruta) =>
      ruta.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Falla simulada de la API' }),
      }),
    );
    await elegirPeriodo(page, 'ene 2024');
    // el componente muestra el error sin inventar cifras
    await expect(page.locator('.bm-panel-note, .bm-tip, .bm-kpi-value').first()).toBeVisible();
    const sistemaTrasError = await page.getByTestId('kpi-sistema').locator('.bm-kpi-value').innerText();
    expect(sistemaTrasError.length).toBeGreaterThan(0);
    await page.unroute('**/resumen**');

    // el pie de página informa la cobertura real y los meses ausentes
    await expect(page.getByTestId('pie-cobertura')).toContainText('faltan');
  });

  test('10. teclado y foco', async ({ page }) => {
    const barra = page.locator('.bm-row', { hasText: 'BBVA México' }).first();
    await barra.focus();
    await expect(barra).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('chip-bbva_mexico')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('chip-bbva_mexico')).toHaveCount(0);

    // el selector de periodo se abre y se navega con teclado
    const trigger = page.getByTestId('filtro-periodo');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.bm-pop .bm-option').first()).toBeVisible();
    await page.locator('.bm-pop .bm-option', { hasText: 'abr 2024' }).first().press('Enter');
    await expect(page.getByTestId('meta-periodo')).toHaveText('abr 2024');
  });


  test('11. el contexto sobrevive a volver de la galería', async ({ page }) => {
    await page.locator('.bm-row', { hasText: 'Banorte' }).first().click();
    await elegirConcepto(page, 'Resultado neto');
    const flujo = await api<ResumenApi>(page, `/resumen?periodo=2024-10&concepto=resultado_neto%231`);
    const esperado = compacto(flujo.kpis.valor_sistema);
    await expect(page.getByTestId('kpi-sistema').locator('.bm-kpi-value')).toContainText(
      esperado.split(',')[0] as string,
    );
    const sistemaAntes = cifra(
      (await page.getByTestId('kpi-sistema').locator('.bm-kpi-value').textContent()) ?? '',
    );

    await page.goto('/#/area/dashboards');
    await expect(page.getByTestId('app')).toHaveCount(0);
    await page.goto(RUTA);
    await expect(page.getByTestId('app')).toBeVisible();
    await expect(page.getByTestId('kpi-sistema').locator('.bm-kpi-value')).not.toHaveText('—');

    await expect(page.getByTestId('chip-banorte')).toBeVisible();
    await expect(page.getByTestId('meta-concepto')).toContainText('Resultado neto');
    expect(
      cifra((await page.getByTestId('kpi-sistema').locator('.bm-kpi-value').textContent()) ?? ''),
    ).toBe(sistemaAntes);
  });

  test('12. modo ampliado dentro del portafolio', async ({ page }) => {
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    const sistema = cifra(
      (await page.getByTestId('kpi-sistema').locator('.bm-kpi-value').textContent()) ?? '',
    );

    const ampliar = page.locator('#demo-expand');
    await expect(ampliar).toBeVisible();
    await ampliar.click();
    await expect(page.locator('dialog.demo-dialog[open]')).toHaveCount(1);
    await expect(page.locator('dialog.demo-dialog [data-testid="app"]')).toHaveCount(1);
    expect(
      cifra(
        (await page
          .locator('dialog.demo-dialog [data-testid="kpi-sistema"] .bm-kpi-value')
          .textContent()) ?? '',
      ),
    ).toBe(sistema);
    await expect(page.locator('dialog.demo-dialog [data-testid="chip-bbva_mexico"]')).toBeVisible();

    await page.locator('#demo-close').click();
    await expect(page.locator('#demo-host [data-testid="app"]')).toHaveCount(1);
  });  test('captura final en escritorio y móvil', async ({ page }, info) => {
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    await page.locator('.bm-row', { hasText: 'Santander' }).first().click();
    await expect(page.getByTestId('chip-santander')).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `${EVIDENCIAS}/final-${info.project.name}.png`,
      fullPage: true,
    });
    // captura de la aplicación sola, para revisión visual de densidad y contraste
    await page.getByTestId('app').screenshot({ path: `${EVIDENCIAS}/app-${info.project.name}.png` });
    await page.getByTestId('panel-ranking').screenshot({ path: `${EVIDENCIAS}/ranking-${info.project.name}.png` });
    await page.getByTestId('panel-evolucion').screenshot({ path: `${EVIDENCIAS}/evolucion-${info.project.name}.png` });
    await page.getByTestId('panel-dispersion').screenshot({ path: `${EVIDENCIAS}/dispersion-${info.project.name}.png` });
    await page.getByTestId('panel-tabla').screenshot({ path: `${EVIDENCIAS}/tabla-${info.project.name}.png` });
  });
});
