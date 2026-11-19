/**
 * Navegación del portafolio anfitrión (no del dashboard).
 *
 * Comprueba la separación de vistas:
 *   - Inicio: presentación y red animada montada.
 *   - Portafolio: galería de las cinco áreas, sin hero.
 *   - Área: galería de proyectos, sin hero, biografía ni presentación de áreas.
 *   - Proyecto: aplicación y documentación.
 *   - Sobre mí: solo su página.
 *   - Ruta desconocida: estado explícito, sin regreso silencioso a Inicio.
 * Además: enlaces directos, recarga, Atrás/Adelante, foco accesible, título del
 * documento y títulos nunca ocultos por la cabecera fija.
 */

import { expect, test, type Page } from '@playwright/test';

const EVIDENCIAS = 'evidencias';

interface EstadoVista {
  hash: string;
  nivel: string;
  titulo: string;
  hero: boolean;
  red: boolean;
  franja: boolean;
  galeria: boolean;
  area: boolean;
  proyecto: boolean;
  error: boolean;
  contacto: boolean;
  sobreMi: boolean;
  encabezado: string | null;
  tapado: number | null;
  foco: string | null;
}

const leer = (page: Page): Promise<EstadoVista> =>
  page.evaluate(() => {
    const visible = (selector: string) => {
      const nodo = document.querySelector(selector);
      if (!nodo || nodo.hasAttribute('hidden')) return false;
      return nodo.getBoundingClientRect().height > 0;
    };
    const cabecera = document.querySelector('.site-header');
    const candidatos = [
      '#view-area:not([hidden]) .view-head h2',
      '#view-project:not([hidden]) .view-head :is(h1, h2)',
      '#view-error:not([hidden]) .view-head h2',
      '#view-gallery:not([hidden]) .section-head h2',
      '#page-about:not([hidden]) #about-title',
      '#inicio:not([hidden]) #hero-title',
    ];
    let encabezado: Element | null = null;
    for (const selector of candidatos) {
      const nodo = document.querySelector(selector);
      if (nodo) {
        encabezado = nodo;
        break;
      }
    }
    const cajaEncabezado = encabezado ? encabezado.getBoundingClientRect() : null;
    const cajaCabecera = cabecera ? cabecera.getBoundingClientRect() : null;
    const red = document.querySelector('#network');
    const activo = document.activeElement as HTMLElement | null;
    return {
      hash: window.location.hash || '(vacío)',
      nivel: document.body.getAttribute('data-vista') || '(sin nivel)',
      titulo: document.title,
      hero: visible('#inicio'),
      // La red está montada si el SVG tiene capas dibujadas (no solo título/desc).
      red: Boolean(red && red.querySelector('g, circle, path')),
      franja: visible('.areas-strip'),
      galeria: visible('#view-gallery'),
      area: visible('#view-area'),
      proyecto: visible('#view-project'),
      error: visible('#view-error'),
      contacto: visible('#contacto'),
      sobreMi: visible('#page-about'),
      encabezado: encabezado ? (encabezado.textContent || '').trim().slice(0, 60) : null,
      tapado:
        cajaEncabezado && cajaCabecera
          ? Math.round(cajaCabecera.bottom - cajaEncabezado.top)
          : null,
      foco: activo ? activo.id || activo.tagName : null,
    };
  });

async function ir(page: Page, hash: string) {
  await page.goto(`/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

test.describe('Navegación del portafolio', () => {
  test('Inicio conserva la presentación y la red animada', async ({ page }, info) => {
    await ir(page, '');
    const estado = await leer(page);
    expect(estado.nivel).toBe('home');
    expect(estado.hero).toBe(true);
    expect(estado.red).toBe(true);
    expect(estado.franja).toBe(true);
    expect(estado.contacto).toBe(true);
    expect(estado.galeria).toBe(false);
    expect(estado.area).toBe(false);
    expect(estado.proyecto).toBe(false);
    expect(estado.sobreMi).toBe(false);
    await page.screenshot({ path: `${EVIDENCIAS}/sitio-inicio-${info.project.name}.png` });
  });

  test('Portafolio muestra solo la galería de áreas', async ({ page }, info) => {
    await ir(page, '#portafolio');
    const estado = await leer(page);
    expect(estado.nivel).toBe('gallery');
    expect(estado.galeria).toBe(true);
    expect(estado.hero).toBe(false);
    expect(estado.red).toBe(false);
    expect(estado.area).toBe(false);
    expect(estado.proyecto).toBe(false);
    expect(estado.titulo).toContain('Portafolio');
    await page.screenshot({ path: `${EVIDENCIAS}/sitio-portafolio-${info.project.name}.png` });
  });

  test('Visualización muestra su galería y el hero ya no está montado', async ({ page }, info) => {
    await ir(page, '');
    // Camino real de una persona: desde Inicio hasta el área.
    await page.locator('#areas-strip [data-jump="dashboards"]').click();
    await page.waitForTimeout(700);

    const estado = await leer(page);
    expect(estado.hash).toBe('#/area/dashboards');
    expect(estado.nivel).toBe('area');
    expect(estado.area).toBe(true);
    expect(estado.hero).toBe(false);
    expect(estado.red, 'la red animada se desmonta al salir de Inicio').toBe(false);
    expect(estado.franja).toBe(false);
    expect(estado.galeria).toBe(false);
    expect(estado.contacto).toBe(false);
    expect(estado.sobreMi).toBe(false);
    expect(estado.encabezado).toBe('Dashboards y visualización');
    expect(estado.titulo).toBe('Dashboards y visualización · Hugo Aguilar');
    expect(estado.tapado, 'el título no queda bajo la cabecera').toBeLessThan(0);

    // Contenido pedido: descripción breve, migas y proyectos reales.
    await expect(page.locator('#view-area .crumbs')).toContainText('Portafolio');
    await expect(page.locator('#view-area .crumbs')).toContainText('Dashboards y visualización');
    await expect(page.locator('#view-area .view-lead').first()).toHaveText(
      'Explora los proyectos y sus aplicaciones interactivas.',
    );
    await expect(page.locator('#view-area a[href="#/area/dashboards/comparativo-bancario"]')).toBeVisible();
    await expect(page.locator('#view-area')).not.toContainText('Los datos tienen');
    await expect(page.locator('#view-area')).not.toContainText('Soy Hugo César Aguilar');
    await page.screenshot({ path: `${EVIDENCIAS}/sitio-area-visualizacion-${info.project.name}.png`, fullPage: true });
  });

  test('Visualización → CNBV muestra el dashboard y Volver regresa a la galería', async ({ page }) => {
    await ir(page, '#/area/dashboards');
    await page.locator('a[href*="/comparativo-bancario"]').first().click();
    await expect(page.getByTestId('app')).toBeVisible();
    await expect(page.getByTestId('kpi-sistema').locator('.bm-kpi-value')).not.toHaveText('—');

    const proyecto = await leer(page);
    expect(proyecto.nivel).toBe('project');
    expect(proyecto.proyecto).toBe(true);
    expect(proyecto.hero).toBe(false);
    expect(proyecto.red).toBe(false);
    expect(proyecto.tapado).toBeLessThan(0);

    // Al volver se recupera la galería del área (y su contexto).
    await page.goBack();
    await page.waitForTimeout(700);
    const area = await leer(page);
    expect(area.hash).toBe('#/area/dashboards');
    expect(area.area).toBe(true);
    expect(area.hero).toBe(false);
    expect(area.red).toBe(false);
    expect(area.encabezado).toBe('Dashboards y visualización');
  });

  test('Sobre mí muestra únicamente su contenido', async ({ page }) => {
    await ir(page, '#/sobre-mi');
    const estado = await leer(page);
    expect(estado.nivel).toBe('about');
    expect(estado.sobreMi).toBe(true);
    expect(estado.hero).toBe(false);
    expect(estado.red).toBe(false);
    expect(estado.galeria).toBe(false);
    expect(estado.area).toBe(false);
    expect(estado.proyecto).toBe(false);
    expect(estado.contacto).toBe(false);
    expect(estado.titulo).toBe('Sobre mí · Hugo Aguilar');
    await expect(page.locator('#page-about')).toContainText('Científico de datos');
  });

  test('Ruta desconocida: estado explícito y no un regreso silencioso', async ({ page }) => {
    await ir(page, '#/area/no-existe');
    const estado = await leer(page);
    expect(estado.nivel).toBe('error');
    expect(estado.error).toBe(true);
    expect(estado.hero).toBe(false);
    expect(estado.red).toBe(false);
    expect(estado.galeria).toBe(false);
    expect(estado.tapado).toBeLessThan(0);
    await expect(page.locator('#view-error')).toContainText('Esta ruta no existe');
    await expect(page.locator('#view-error')).toContainText('#/area/no-existe');
    await expect(page.locator('#view-error a.btn[href="#portafolio"]')).toBeVisible();

    // Y una ruta inventada cualquiera tampoco cae en Inicio.
    await ir(page, '#/loquesea');
    const otra = await leer(page);
    expect(otra.nivel).toBe('error');
    expect(otra.error).toBe(true);
    expect(otra.hero).toBe(false);
  });

  test('recarga y Atrás/Adelante conservan la vista', async ({ page }) => {
    await ir(page, '#/area/dashboards');
    await page.locator('a[href*="/comparativo-bancario"]').first().click();
    await expect(page.getByTestId('app')).toBeVisible();

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const trasRecarga = await leer(page);
    expect(trasRecarga.nivel).toBe('project');
    expect(trasRecarga.proyecto).toBe(true);
    expect(trasRecarga.hero).toBe(false);

    await page.goBack();
    await page.waitForTimeout(600);
    expect((await leer(page)).nivel).toBe('area');

    await page.goForward();
    await page.waitForTimeout(600);
    const trasAdelante = await leer(page);
    expect(trasAdelante.nivel).toBe('project');
    expect(trasAdelante.proyecto).toBe(true);
  });

  test('las cinco áreas abren su propia galería', async ({ page }) => {
    const areas = ['dashboards', 'ciencia-de-datos', 'ingenieria-de-datos', 'ia-generativa', 'agentes'];
    for (const area of areas) {
      await ir(page, `#/area/${area}`);
      const estado = await leer(page);
      expect(estado.nivel, `área ${area}`).toBe('area');
      expect(estado.area, `área ${area}`).toBe(true);
      expect(estado.hero, `área ${area}`).toBe(false);
      expect(estado.red, `área ${area}`).toBe(false);
      expect(estado.franja, `área ${area}`).toBe(false);
      expect(estado.tapado, `área ${area} sin título oculto`).toBeLessThan(0);
      expect(estado.encabezado?.length ?? 0).toBeGreaterThan(3);
    }
  });
});
