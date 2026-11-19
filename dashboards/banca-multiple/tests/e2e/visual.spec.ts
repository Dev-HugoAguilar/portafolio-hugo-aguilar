/**
 * Prueba visual obligatoria (dirección aprobada).
 *
 * Reglas que fija esta prueba:
 *   A. Estado inicial: barras azules sólidas, puntos del mapa en azul, «Sistema»
 *      en naranja quemado discontinuo. Sin rayados ni anillos discontinuos.
 *   B. Dos instituciones: azul y violeta estables en todas las vistas, resto en
 *      contexto neutro, selección con contorno y marcador.
 *   C. Deseleccionar no recolorea a la otra institución.
 *   D. Cambio de periodo con colores estables.
 *   E. Filtro abierto con fondo blanco opaco.
 * Además: tooltips opacos, unidad monetaria con conversión comprobada, tono de
 * los indicadores, teclado + Escape, móvil y vista ampliada sin recortes.
 */

import { expect, test, type Locator, type Page } from '@playwright/test';

const RUTA = '/#/area/dashboards/comparativo-bancario';
const EVIDENCIAS = 'evidencias';

const BLANCO = 'rgb(255, 255, 255)';
const BORDE = 'rgb(221, 226, 235)'; // #DDE2EB
const TEXTO = 'rgb(17, 19, 24)'; // #111318
const RESALTADO = 'rgb(238, 241, 255)'; // #EEF1FF
const GRAFITO = 'rgb(17, 19, 24)';
const SECUNDARIO = 'rgb(89, 98, 115)'; // #596273
const TURQUESA = 'rgb(8, 127, 140)'; // #087F8C

const AZUL = '#3458F5';
const VIOLETA = '#8066E8';
const NEUTRO = '#C2CBDC';
/** Naranja quemado del «Sistema»: color exclusivo de la referencia del sector. */
const NARANJA = '#C05621';

const numero = (texto: string): number => Number(texto.replace(/[^\d.-]/g, ''));

/** Importe original en millones dentro del detalle del tooltip. */
const coincidencia = (texto: string) => /([\d.,]+)\s*millones/.exec(texto);

async function abrir(page: Page) {
  await page.goto(RUTA);
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByTestId('kpi-sistema').locator('.bm-kpi-value')).not.toHaveText('—');
  await expect(page.locator('[data-testid="panel-ranking"] rect[data-institucion]').first()).toBeVisible();
}

/* ------------------------------------------------------ consultas al DOM */

async function colorEnVista(page: Page, vista: 'ranking' | 'tabla' | 'dispersion', id: string) {
  const selector =
    vista === 'ranking'
      ? `[data-testid="panel-ranking"] rect[data-institucion="${id}"]`
      : vista === 'tabla'
        ? `[data-testid="tabla-detalle"] .bm-swatch[data-institucion="${id}"]`
        : `[data-testid="panel-dispersion"] circle[data-institucion="${id}"]`;
  const nodo = page.locator(selector).first();
  await expect(nodo, `${vista} · ${id}`).toHaveCount(1);
  return (await nodo.getAttribute('data-color')) ?? '';
}

async function coloresRanking(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid="panel-ranking"] rect[data-institucion]')
    .evaluateAll((nodos) => nodos.map((nodo) => nodo.getAttribute('data-color') ?? ''));
}

/** Estilos computados del contenido flotante y de su cadena de ancestros. */
async function auditarFlotante(page: Page, selector: string) {
  const panel = page.locator(selector).first();
  await expect(panel).toBeVisible();
  return await panel.evaluate((el) => {
    const estilo = getComputedStyle(el);
    const caja = el.getBoundingClientRect();
    const opacidades: number[] = [];
    let nodo: HTMLElement | null = el.parentElement;
    while (nodo) {
      opacidades.push(Number(getComputedStyle(nodo).opacity));
      nodo = nodo.parentElement;
    }
    const encima = document.elementFromPoint(caja.left + caja.width / 2, caja.top + caja.height / 2);
    return {
      fondo: estilo.backgroundColor,
      opacidad: Number(estilo.opacity),
      desenfoque: estilo.backdropFilter,
      borde: estilo.borderTopColor,
      texto: estilo.color,
      zIndex: Number(estilo.zIndex),
      caja: { x: caja.x, y: caja.y, ancho: caja.width, alto: caja.height },
      recibeClic: el.contains(encima),
      translucido:
        Number(estilo.opacity) < 1 ||
        estilo.backgroundColor === 'rgba(0, 0, 0, 0)' ||
        estilo.backdropFilter !== 'none' ||
        opacidades.some((valor) => valor < 1),
    };
  });
}

function esperarOpaco(auditoria: Awaited<ReturnType<typeof auditarFlotante>>) {
  expect(auditoria.fondo).toBe(BLANCO);
  expect(auditoria.opacidad).toBe(1);
  expect(['none', '']).toContain(auditoria.desenfoque);
  expect(auditoria.borde).toBe(BORDE);
  expect(auditoria.texto).toBe(TEXTO);
  expect(auditoria.translucido, 'ningún ancestro ni fondo translúcido').toBe(false);
  expect(auditoria.recibeClic).toBe(true);
  expect(auditoria.zIndex).toBeGreaterThanOrEqual(60);
}

async function elegirPeriodo(page: Page, periodo: string) {
  await page.getByTestId('filtro-periodo').click();
  await page.locator('.bm-pop .bm-option', { hasText: periodo }).first().click();
  await expect(page.getByTestId('meta-periodo')).toHaveText(periodo);
}

/* -------------------------------------------------------------- escenarios */

test.describe('Acabado visual del dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await abrir(page);
  });

  test('A. estado inicial: barras azules, puntos azules y Sistema naranja', async ({ page }, info) => {
    // Ranking: todas las barras en azul sólido.
    const barras = await coloresRanking(page);
    expect(barras.length).toBeGreaterThanOrEqual(10);
    expect(new Set(barras)).toEqual(new Set([AZUL]));

    // Sin rayados en las barras ni anillos discontinuos en la dispersión.
    const rayados = await page
      .locator('[data-testid="panel-ranking"] svg pattern')
      .count();
    expect(rayados, 'sin tramas diagonales').toBe(0);
    const anillos = await page
      .locator('[data-testid="panel-dispersion"] circle[stroke-dasharray]')
      .count();
    expect(anillos, 'sin anillos discontinuos').toBe(0);

    // Mapa de rentabilidad: todos los puntos en azul, con borde blanco fino.
    const puntos = await page
      .locator('[data-testid="panel-dispersion"] circle[data-institucion]')
      .evaluateAll((nodos) => nodos.map((nodo) => nodo.getAttribute('data-color') ?? ''));
    expect(puntos.length).toBeGreaterThan(10);
    expect(new Set(puntos)).toEqual(new Set([AZUL]));
    const bordes = await page
      .locator('[data-testid="panel-dispersion"] circle[data-institucion]')
      .evaluateAll((nodos) => nodos.map((nodo) => nodo.getAttribute('stroke') ?? ''));
    expect(new Set(bordes), 'borde blanco fino en todos los puntos').toEqual(new Set(['#FFFFFF']));

    // Crecimiento (predeterminado): el Sistema es la referencia en naranja discontinuo.
    await expect(page.locator('[data-testid="panel-evolucion"] h3')).toHaveText(
      'Crecimiento frente al sector',
    );
    const serieSistema = page
      .locator('[data-testid="panel-evolucion"] path[data-institucion="sistema"]')
      .first();
    expect(await serieSistema.getAttribute('data-color')).toBe(NARANJA);
    expect(await serieSistema.getAttribute('stroke-dasharray')).toBeTruthy();
    const puntoSistema = page
      .locator('[data-testid="panel-evolucion"] circle[data-institucion="sistema"]')
      .first();
    expect(await puntoSistema.getAttribute('data-color')).toBe(NARANJA);
    await expect(page.locator('.bm-legend-btn', { hasText: 'Sistema (agregado CNBV)' })).toBeVisible();

    await page.screenshot({ path: `${EVIDENCIAS}/A-inicial-${info.project.name}.png`, fullPage: true });
    await page
      .locator('[data-testid="panel-ranking"]')
      .screenshot({ path: `${EVIDENCIAS}/A-ranking-inicial-${info.project.name}.png` });
    await page
      .locator('[data-testid="panel-dispersion"]')
      .screenshot({ path: `${EVIDENCIAS}/A-dispersion-inicial-${info.project.name}.png` });
  });

  test('B. dos instituciones: azul y violeta estables, resto en neutro', async ({ page }, info) => {
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    await page.locator('.bm-row', { hasText: 'Santander' }).first().click();
    await expect(page.getByTestId('chip-bbva_mexico')).toBeVisible();
    await expect(page.getByTestId('chip-santander')).toBeVisible();

    // Asignación estable por orden de selección, igual en todas las vistas.
    expect(await colorEnVista(page, 'ranking', 'bbva_mexico')).toBe(AZUL);
    expect(await colorEnVista(page, 'tabla', 'bbva_mexico')).toBe(AZUL);
    expect(await colorEnVista(page, 'dispersion', 'bbva_mexico')).toBe(AZUL);
    expect(await colorEnVista(page, 'ranking', 'santander')).toBe(VIOLETA);
    expect(await colorEnVista(page, 'tabla', 'santander')).toBe(VIOLETA);
    expect(await colorEnVista(page, 'dispersion', 'santander')).toBe(VIOLETA);

    const serieBBVA = page
      .locator('[data-testid="panel-evolucion"] path[data-institucion="bbva_mexico"]')
      .first();
    expect(await serieBBVA.getAttribute('data-color')).toBe(AZUL);
    const serieSantander = page
      .locator('[data-testid="panel-evolucion"] path[data-institucion="santander"]')
      .first();
    expect(await serieSantander.getAttribute('data-color')).toBe(VIOLETA);

    // El resto pasa a contexto neutro legible (sin desaparecer).
    expect(await colorEnVista(page, 'ranking', 'hsbc')).toBe(NEUTRO);
    const etiquetaHSBC = page.locator('.bm-row', { hasText: 'HSBC' }).first().locator('text').nth(1);
    expect(await etiquetaHSBC.evaluate((el) => getComputedStyle(el).fill)).toBe(GRAFITO);

    // La selección se distingue también por contorno y marcador (no solo color).
    const barra = page
      .locator('[data-testid="panel-ranking"] rect[data-institucion="bbva_mexico"]')
      .first();
    await expect(barra).toHaveAttribute('data-seleccionada', 'true');
    expect(await barra.getAttribute('stroke')).toBe('#111318');
    await expect(page.locator('.bm-row', { hasText: 'BBVA México' }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // En crecimiento, el Sistema se mantiene como referencia del sector.
    const sistemaEvol = page.locator('[data-testid="panel-evolucion"] path[data-institucion="sistema"]');
    await expect(sistemaEvol).toHaveCount(1);
    expect(await sistemaEvol.first().getAttribute('stroke-dasharray')).toBeTruthy();

    // Tabla: fondo tenue + indicador explícito.
    const filaTabla = page.getByTestId('fila-bbva_mexico');
    await expect(filaTabla).toHaveClass(/is-selected/);
    // Fondo tenue derivado del color de la institución (no blanco).
    expect(await filaTabla.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      'rgb(255, 255, 255)',
    );
    await expect(filaTabla.locator('.bm-check.is-on')).toHaveText('✓');

    await page.screenshot({
      path: `${EVIDENCIAS}/B-dos-instituciones-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .locator('[data-testid="panel-ranking"]')
      .screenshot({ path: `${EVIDENCIAS}/B-ranking-dos-${info.project.name}.png` });
  });

  test('C. deseleccionar no recolorea a la otra institución', async ({ page }, info) => {
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    await page.locator('.bm-row', { hasText: 'Santander' }).first().click();
    expect(await colorEnVista(page, 'ranking', 'bbva_mexico')).toBe(AZUL);
    expect(await colorEnVista(page, 'ranking', 'santander')).toBe(VIOLETA);

    // Se retira BBVA desde su etiqueta: Santander conserva el violeta.
    await page.getByTestId('chip-bbva_mexico').locator('.bm-chip-x').click();
    await expect(page.getByTestId('chip-bbva_mexico')).toHaveCount(0);
    expect(await colorEnVista(page, 'ranking', 'santander')).toBe(VIOLETA);
    expect(await colorEnVista(page, 'tabla', 'santander')).toBe(VIOLETA);

    // BBVA vuelve al contexto neutro de la vista (ya no está comparado).
    expect(await colorEnVista(page, 'ranking', 'bbva_mexico')).toBe(NEUTRO);

    // Sin comparación, el ranking vuelve al azul sólido de partida.
    await page.getByTestId('chip-santander').locator('.bm-chip-x').click();
    await expect(page.getByTestId('chip-santander')).toHaveCount(0);
    const barras = await coloresRanking(page);
    expect(new Set(barras)).toEqual(new Set([AZUL]));

    await page.screenshot({
      path: `${EVIDENCIAS}/C-deseleccion-${info.project.name}.png`,
      fullPage: true,
    });
  });

  test('D. cambio de periodo con colores estables', async ({ page }, info) => {
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().click();
    await page.locator('.bm-row', { hasText: 'Banorte' }).first().click();
    expect(await colorEnVista(page, 'ranking', 'bbva_mexico')).toBe(AZUL);
    expect(await colorEnVista(page, 'ranking', 'banorte')).toBe(VIOLETA);

    await elegirPeriodo(page, 'ene 2024');
    expect(await colorEnVista(page, 'ranking', 'bbva_mexico')).toBe(AZUL);
    expect(await colorEnVista(page, 'ranking', 'banorte')).toBe(VIOLETA);
    expect(await colorEnVista(page, 'tabla', 'bbva_mexico')).toBe(AZUL);

    await elegirPeriodo(page, 'oct 2024');
    expect(await colorEnVista(page, 'ranking', 'bbva_mexico')).toBe(AZUL);
    expect(await colorEnVista(page, 'ranking', 'banorte')).toBe(VIOLETA);

    await page.screenshot({
      path: `${EVIDENCIAS}/D-cambio-periodo-${info.project.name}.png`,
      fullPage: true,
    });
  });

  test('E. filtro abierto con fondo blanco opaco', async ({ page }, info) => {
    await page.getByTestId('filtro-periodo').click();
    const auditoria = await auditarFlotante(page, '.bm-pop');
    esperarOpaco(auditoria);

    const viewport = page.viewportSize();
    expect(auditoria.caja.alto).toBeLessThanOrEqual(341);
    expect(auditoria.caja.alto).toBeLessThanOrEqual(viewport?.height ?? 0);

    const opcion = page.locator('.bm-pop .bm-option').nth(1);
    await opcion.hover();
    const estilosOpcion = await opcion.evaluate((el) => {
      const estilo = getComputedStyle(el);
      return { fondo: estilo.backgroundColor, texto: estilo.color };
    });
    expect(estilosOpcion.fondo).toBe(RESALTADO);
    expect(estilosOpcion.texto).toBe(TEXTO);

    const vigente = await page.locator('.bm-pop .bm-option.is-on').first().evaluate((el) => {
      const estilo = getComputedStyle(el);
      return { fondo: estilo.backgroundColor, sombra: estilo.boxShadow };
    });
    expect(vigente.fondo).toBe(RESALTADO);
    expect(vigente.sombra).toContain('rgb(52, 88, 245)');

    await page.screenshot({
      path: `${EVIDENCIAS}/E-filtro-abierto-${info.project.name}.png`,
      fullPage: false,
    });
  });

  test('tooltips opacos y unidad monetaria con conversión comprobada', async ({ page }) => {
    // Tooltip del ranking: fondo opaco.
    await page.locator('.bm-row', { hasText: 'BBVA México' }).first().hover();
    const tip: Locator = page.locator('.bm-tip').first();
    await expect(tip).toBeVisible();
    const estilosTip = await tip.evaluate((el) => {
      const estilo = getComputedStyle(el);
      return {
        fondo: estilo.backgroundColor,
        opacidad: Number(estilo.opacity),
        desenfoque: estilo.backdropFilter,
        borde: estilo.borderTopColor,
      };
    });
    expect(estilosTip.fondo).toBe(BLANCO);
    expect(estilosTip.opacidad).toBe(1);
    expect(['none', '']).toContain(estilosTip.desenfoque);
    expect(estilosTip.borde).toBe(BORDE);

    // Crecimiento es el modo predeterminado y declara su fecha base.
    const panelEvolucion = page.locator('[data-testid="panel-evolucion"]');
    await expect(panelEvolucion.locator('h3')).toHaveText('Crecimiento frente al sector');
    const notaCrecimiento = (await page.locator('[data-testid="nota-unidad"]').first().textContent()) ?? '';
    expect(notaCrecimiento).toContain('Índice base 100');

    // Modo Importe: la nota usa billones con el detalle en millones.
    await panelEvolucion.locator('.bm-seg-btn', { hasText: 'Importe' }).click();
    await expect(panelEvolucion.locator('.bm-panel-sub')).toContainText('billones de pesos');
    const nota = (await page.locator('[data-testid="nota-unidad"]').first().textContent()) ?? '';
    expect(nota).toContain('Valores en billones de MXN; detalle original en millones');

    const ticks = await page
      .locator('[data-testid="panel-evolucion"] svg text')
      .evaluateAll((nodos) => nodos.map((nodo) => (nodo.textContent ?? '').trim()));
    const numericos = ticks.filter((texto) => /^-?[\d.,]+$/.test(texto));
    expect(numericos.length).toBeGreaterThan(2);
    expect(numericos.every((texto) => Math.abs(numero(texto)) < 1000)).toBe(true);

    // Conversión exacta: 1 billón = 10¹² pesos = 1 000 000 de millones.
    // Cada punto publica el valor original y el valor mostrado en el eje.
    const puntos = await page
      .locator('[data-testid="panel-evolucion"] circle[data-millones]')
      .evaluateAll((nodos) =>
        nodos.map((nodo) => ({
          millones: Number(nodo.getAttribute('data-millones')),
          billones: nodo.getAttribute('data-billones') ?? '',
        })),
      );
    expect(puntos.length).toBeGreaterThan(4);
    for (const punto of puntos) {
      const mostrado = numero(punto.billones);
      expect(punto.millones).toBeGreaterThan(0);
      // billones × 1 000 000 = millones publicados (tolerancia de redondeo)
      expect(Math.abs(mostrado * 1_000_000 - punto.millones) / punto.millones).toBeLessThan(0.001);
    }

    // El tooltip declara la unidad y ofrece el detalle original.
    await page.mouse.move(4, 4);
    const zonaHover = page
      .locator('[data-testid="panel-evolucion"] svg rect[fill="transparent"]')
      .first();
    await zonaHover.hover();
    const tooltip = page.locator('.bm-chart--evolution .bm-tip').first();
    await expect(tooltip).toContainText('billones de pesos');
    await expect(tooltip).toContainText('millones');

    await page
      .locator('[data-testid="panel-evolucion"]')
      .screenshot({ path: `${EVIDENCIAS}/unidad-evolucion-${test.info().project.name}.png` });
  });

  test('indicadores: cifra en grafito y turquesa solo en variaciones justificables', async ({ page }) => {
    const valor = page.getByTestId('kpi-sistema').locator('.bm-kpi-value');
    const nota = page.getByTestId('kpi-sistema').locator('.bm-kpi-note');
    expect(await valor.evaluate((el) => getComputedStyle(el).color)).toBe(GRAFITO);

    const variacion = Number(/([-\d.,]+)\s*%/.exec(await nota.innerText())?.[1]?.replace(',', '.') ?? '');
    expect(await nota.evaluate((el) => getComputedStyle(el).color)).toBe(
      variacion >= 0 ? TURQUESA : SECUNDARIO,
    );

    // Gastos por intereses: crecer no es buena noticia → grafito.
    await page.getByTestId('filtro-concepto').click();
    await page.locator('.bm-pop-search input').first().fill('Gastos por intereses');
    await page.locator('.bm-pop .bm-option').first().click();
    await expect(page.getByTestId('meta-concepto')).toContainText('Gastos por intereses');
    await expect(page.getByTestId('kpi-sistema').locator('.bm-kpi-value')).not.toHaveText('—');
    expect(
      await page.getByTestId('kpi-sistema').locator('.bm-kpi-note').evaluate((el) => getComputedStyle(el).color),
    ).toBe(SECUNDARIO);

    await page.locator('.bm-kpis').first().screenshot({
      path: `${EVIDENCIAS}/kpis-${test.info().project.name}.png`,
    });
  });

  test('teclado: recorrer el popover y cerrar con Escape', async ({ page }) => {
    const disparador = page.getByTestId('filtro-periodo');
    await disparador.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.bm-pop')).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await expect(page.locator('.bm-pop')).toHaveCount(0);
    await expect(disparador).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('.bm-pop')).toBeVisible();
    await page.locator('.bm-pop .bm-option', { hasText: 'jul 2024' }).first().press('Enter');
    await expect(page.getByTestId('meta-periodo')).toHaveText('jul 2024');
    await expect(page.locator('.bm-pop')).toHaveCount(0);

    const acento = await disparador.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--primary').trim(),
    );
    expect(acento.toUpperCase()).toBe(AZUL);
  });

  test('móvil: el contenido flotante cabe en el viewport', async ({ page }, info) => {
    test.skip(info.project.name !== 'movil', 'captura y medidas del proyecto móvil');

    await page.getByTestId('filtro-instituciones').click();
    const auditoria = await auditarFlotante(page, '.bm-pop');
    esperarOpaco(auditoria);

    const viewport = page.viewportSize();
    expect(auditoria.caja.x).toBeGreaterThanOrEqual(0);
    expect(auditoria.caja.x + auditoria.caja.ancho).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
    expect(auditoria.caja.y + auditoria.caja.alto).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde).toBeLessThanOrEqual(1);

    await page.screenshot({ path: `${EVIDENCIAS}/G-movil-${info.project.name}.png`, fullPage: false });
  });

  test('vista ampliada: el dashboard completo es alcanzable sin recortes', async ({ page }) => {
    await page.locator('#demo-expand').click();
    await expect(page.locator('dialog.demo-dialog[open]')).toHaveCount(1);

    const medida = await page.locator('dialog.demo-dialog .demo-slot').evaluate((el) => ({
      alto: el.clientHeight,
      contenido: el.scrollHeight,
      desborde: getComputedStyle(el).overflowY,
    }));
    expect(medida.desborde).toBe('auto');
    expect(medida.contenido).toBeGreaterThanOrEqual(medida.alto);

    const pie = page.locator('dialog.demo-dialog [data-testid="pie-cobertura"]');
    await pie.scrollIntoViewIfNeeded();
    await expect(pie).toBeInViewport();
  });
});
