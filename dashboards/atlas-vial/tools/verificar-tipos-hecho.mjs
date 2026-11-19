/* Verifica en la app servida el bloque «Tipos de hechos en [alcaldía]» del panel
   derecho: cifras contra la API, orden, porcentajes, denominador, altura del
   panel, cambio de alcaldía y cambio de filtro. */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const EVIDENCIAS = join(AQUI, '..', 'evidencias');
mkdirSync(EVIDENCIAS, { recursive: true });

const APP = 'http://127.0.0.1:8000/#/area/dashboards/atlas-vial';
const urlDe = (alcaldia) => {
  const seleccion = encodeURIComponent(alcaldia);
  const base = 'http://127.0.0.1:8000/?at_v=territorio';
  return `${base}&at_sel=${seleccion}&at_alcaldia=${seleccion}#/area/dashboards/atlas-vial`;
};
const API = 'http://127.0.0.1:8010/api/v1/atlas-vial';

const aNumero = (texto) => Number(String(texto).replace(/[^\d]/g, ''));
const aDecimal = (texto) => Number(String(texto).replace(/[^\d,.-]/g, '').replace(',', '.'));

const resultados = [];
function comprobar(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok, detalle });
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

async function api(ruta) {
  const r = await fetch(`${API}${ruta}`);
  if (!r.ok) throw new Error(`${ruta} → ${r.status}`);
  return r.json();
}

async function leerBloque(page) {
  return page.evaluate(() => {
    const seccion = document.querySelector('.at-tipos-hecho');
    if (!seccion) return null;
    const filas = [...seccion.querySelectorAll('.at-tipos-lista li')].map((li) => {
      const barra = li.querySelector('.at-tipos-barra');
      return {
        nombre: li.querySelector('.at-tipos-nombre')?.textContent?.trim() ?? '',
        cifra: li.querySelector('.at-tipos-cifra')?.textContent?.trim() ?? '',
        pct: li.querySelector('.at-tipos-pct')?.textContent?.trim() ?? '',
        anchoBarra: barra ? barra.getBoundingClientRect().width : 0,
        colorBarra: barra ? getComputedStyle(barra).backgroundColor : '',
      };
    });
    const panel = document.querySelector('[data-testid="panel-contexto"]');
    const mapa = document.querySelector('[data-testid="panel-mapa"]');
    const caja = panel.getBoundingClientRect();
    return {
      titulo: seccion.querySelector('h4')?.textContent?.trim() ?? '',
      nota: seccion.querySelector('.at-contexto-nota')?.textContent?.trim() ?? '',
      filas,
      altoPanel: caja.height,
      altoPanelScroll: panel.scrollHeight,
      desbordePanel: panel.scrollWidth - panel.clientWidth,
      altoMapa: mapa.getBoundingClientRect().height,
      anchoBarraMax: Math.max(...filas.map((f) => f.anchoBarra)),
    };
  });
}

/* Compara el bloque visible con la distribución que devuelve la API para los
   mismos filtros. */
function compararConAPI(bloque, distribucion, total, etiqueta) {
  const esperado = [...distribucion].sort((a, b) => b.hechos - a.hechos);
  comprobar(
    `${etiqueta}: número de filas = ${esperado.length}`,
    bloque.filas.length === esperado.length,
    `vistas ${bloque.filas.length}`,
  );
  const nombresOk = esperado.every((t, i) => (t.valor ?? 'Sin dato') === bloque.filas[i]?.nombre);
  comprobar(`${etiqueta}: nombres y orden descendente coinciden con la API`, nombresOk,
    bloque.filas.map((f) => f.nombre).join(' > '));
  const cifrasOk = esperado.every((t, i) => aNumero(bloque.filas[i]?.cifra) === t.hechos);
  comprobar(`${etiqueta}: cifras exactas de la API`, cifrasOk,
    bloque.filas.map((f) => aNumero(f.cifra)).join(' / '));
  const pctOk = esperado.every((t, i) => {
    const real = Number(((100 * t.hechos) / total).toFixed(1));
    return Math.abs(aDecimal(bloque.filas[i]?.pct) - real) < 0.051;
  });
  comprobar(`${etiqueta}: porcentajes sobre el total de la alcaldía`, pctOk,
    bloque.filas.map((f) => f.pct).join(' / '));
  const suma = bloque.filas.reduce((s, f) => s + aDecimal(f.pct), 0);
  comprobar(`${etiqueta}: los porcentajes suman 100 %`, Math.abs(suma - 100) < 0.5, suma.toFixed(1));
  const maxBarra = Math.max(...bloque.filas.map((f) => f.anchoBarra));
  comprobar(`${etiqueta}: la primera barra es la más larga`,
    Math.abs(bloque.filas[0].anchoBarra - maxBarra) < 0.6, `${maxBarra.toFixed(1)} px`);
  comprobar(`${etiqueta}: barras azules de hechos`,
    bloque.filas.every((f) => f.colorBarra === 'rgb(52, 88, 245)'), bloque.filas[0]?.colorBarra);
  comprobar(`${etiqueta}: denominador declarado = ${total}`,
    aNumero(bloque.nota.split('hechos')[0]) === total, bloque.nota);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1024 } });
const page = await contexto.newPage();

// ---------- 1) Iztapalapa ----------
await page.goto(urlDe('Iztapalapa'), { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle');
await page.waitForSelector('.at-tipos-hecho', { timeout: 20000 });
await page.waitForSelector('[data-testid="detalle-cifras-alcaldia"]');

const bloque = await leerBloque(page);
const tiempo = await api('/tiempo?alcaldia=Iztapalapa&agregacion=mes');
const resumen = await api('/resumen?alcaldia=Iztapalapa');
const total = resumen.indicadores.hechos.valor;

comprobar('título con la alcaldía seleccionada',
  bloque.titulo === 'Tipos de hechos en Iztapalapa', bloque.titulo);
comprobar('el panel derecho conserva las tres cifras',
  (await page.locator('[data-testid="detalle-cifras-alcaldia"] dd').count()) === 3);
comprobar('no aparecen las métricas eliminadas',
  (await page.locator('[data-testid="panel-contexto"]').innerText()).includes('Hechos con personas fallecidas') === false);
comprobar('no aparece «Comparación por alcaldía» en la selección',
  (await page.locator('[data-testid="panel-contexto"]').innerText()).includes('Comparación por alcaldía') === false);
compararConAPI(bloque, tiempo.distribuciones.tipo_evento, total, 'Iztapalapa');

// Altura: la tarjeta mide lo que ocupa su contenido y no estira como el mapa.
comprobar('la tarjeta no estira hasta el alto del mapa',
  bloque.altoPanel < bloque.altoMapa - 100, `${bloque.altoPanel.toFixed(0)} px vs ${bloque.altoMapa.toFixed(0)} px`);
comprobar('la tarjeta mide lo que ocupa su contenido',
  Math.abs(bloque.altoPanel - bloque.altoPanelScroll) < 2,
  `${bloque.altoPanel.toFixed(0)} px / scroll ${bloque.altoPanelScroll} px`);
comprobar('sin desborde horizontal en el panel', bloque.desbordePanel <= 0, `${bloque.desbordePanel} px`);

await page.mouse.move(4, 4);
await page.waitForTimeout(500);
await page.locator('[data-testid="panel-contexto"]').screenshot({ path: join(EVIDENCIAS, 'tipos-hecho-iztapalapa.png') });

// ---------- 2) Cambio de alcaldía ----------
await page.goto(urlDe('Coyoacán'), { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle');
await page.waitForFunction(
  () => document.querySelector('.at-tipos-hecho h4')?.textContent?.includes('Coyoacán'),
  null,
  { timeout: 20000 },
);
const bloqueCoyoacan = await leerBloque(page);
const tiempoCoyoacan = await api('/tiempo?alcaldia=Coyoac%C3%A1n&agregacion=mes');
const resumenCoyoacan = await api('/resumen?alcaldia=Coyoac%C3%A1n');
comprobar('al cambiar de alcaldía el título se actualiza',
  bloqueCoyoacan.titulo === 'Tipos de hechos en Coyoacán', bloqueCoyoacan.titulo);
compararConAPI(bloqueCoyoacan, tiempoCoyoacan.distribuciones.tipo_evento,
  resumenCoyoacan.indicadores.hechos.valor, 'Coyoacán');
comprobar('las cifras cambian con la alcaldía',
  aNumero(bloqueCoyoacan.filas[0].cifra) !== aNumero(bloque.filas[0].cifra),
  `${aNumero(bloque.filas[0].cifra)} → ${aNumero(bloqueCoyoacan.filas[0].cifra)}`);
await page.mouse.move(4, 4);
await page.waitForTimeout(500);
await page.locator('[data-testid="panel-contexto"]').screenshot({ path: join(EVIDENCIAS, 'tipos-hecho-coyoacan.png') });

// ---------- 3) Cambio de filtro ----------
const disparador = page.locator('.at-ctrl[aria-label^="Tipo de evento"]').first();
await disparador.scrollIntoViewIfNeeded();
await disparador.click();
const nombreOpcion = 'Atropellado';
const opcion = page.locator('.atf-opciones .at-opcion', { hasText: nombreOpcion }).first();
await opcion.click();
await page.waitForLoadState('networkidle');
await page.waitForTimeout(400);
await page.waitForFunction(
  (esperado) => {
    const filas = document.querySelectorAll('.at-tipos-hecho .at-tipos-lista li');
    return filas.length === 1 && filas[0].textContent.includes(esperado);
  },
  nombreOpcion,
  { timeout: 20000 },
);
const bloqueFiltrado = await leerBloque(page);
const tiempoFiltrado = await api(
  `/tiempo?alcaldia=Coyoac%C3%A1n&tipo_evento=${encodeURIComponent(nombreOpcion)}&agregacion=mes`,
);
const resumenFiltrado = await api(
  `/resumen?alcaldia=Coyoac%C3%A1n&tipo_evento=${encodeURIComponent(nombreOpcion)}`,
);
comprobar('el filtro de tipo de hecho se aplicó en la app',
  (await page.locator('.at-ctrl[aria-label^="Tipo de evento"]').first().getAttribute('aria-label'))
    ?.includes(nombreOpcion) === true, nombreOpcion);
compararConAPI(bloqueFiltrado, tiempoFiltrado.distribuciones.tipo_evento,
  resumenFiltrado.indicadores.hechos.valor, `Coyoacán + ${nombreOpcion}`);
comprobar('con un solo tipo el porcentaje es 100 %',
  Math.abs(aDecimal(bloqueFiltrado.filas[0].pct) - 100) < 0.05, bloqueFiltrado.filas[0].pct);
await page.mouse.move(4, 4);
await page.waitForTimeout(500);
await page.locator('[data-testid="panel-contexto"]').screenshot({ path: join(EVIDENCIAS, 'tipos-hecho-filtrado.png') });

await page.screenshot({ path: join(EVIDENCIAS, 'vista-territorial-tipos-hecho.png'), fullPage: false });

// ---------- 4) Móvil ----------
const movil = await contexto.newPage();
await movil.setViewportSize({ width: 390, height: 844 });
await movil.goto(urlDe('Iztapalapa'), { waitUntil: 'domcontentloaded' });
await movil.waitForLoadState('networkidle');
await movil.waitForSelector('.at-tipos-hecho', { timeout: 20000 });
const bloqueMovil = await movil.evaluate(() => {
  const seccion = document.querySelector('.at-tipos-hecho');
  const caja = seccion.getBoundingClientRect();
  return {
    filas: seccion.querySelectorAll('.at-tipos-lista li').length,
    dentroDelAncho: caja.right <= window.innerWidth + 1 && caja.left >= -1,
    ancho: caja.width,
    titulo: seccion.querySelector('h4')?.textContent?.trim() ?? '',
  };
});
comprobar('móvil: el bloque se muestra con sus filas',
  bloqueMovil.filas === 6 && bloqueMovil.titulo === 'Tipos de hechos en Iztapalapa', bloqueMovil.titulo);
comprobar('móvil: el bloque cabe en el ancho de la pantalla', bloqueMovil.dentroDelAncho,
  `${bloqueMovil.ancho.toFixed(0)} px`);
await movil.mouse.move(4, 4);
await movil.waitForTimeout(500);
await movil.locator('[data-testid="panel-contexto"]').screenshot({ path: join(EVIDENCIAS, 'tipos-hecho-movil.png') });

await navegador.close();

const fallas = resultados.filter((r) => !r.ok);
writeFileSync(
  join(EVIDENCIAS, 'verificacion-tipos-hecho.json'),
  JSON.stringify({ cuando: new Date().toISOString(), resultados }, null, 2),
  'utf8',
);
console.log(`\n${resultados.length - fallas.length}/${resultados.length} comprobaciones correctas`);
if (fallas.length) {
  console.log('FALLAS:', fallas.map((f) => f.nombre).join(' | '));
  process.exitCode = 1;
}




