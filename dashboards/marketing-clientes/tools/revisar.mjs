/**
 * Verificación del tablero «Marketing y clientes» integrado en el portafolio.
 *
 * Comprueba, con el sitio en 8000 y la API en 8010:
 *  · que la tarjeta aparece en el catálogo del área con su estado real;
 *  · que la ficha muestra problema, fuente, método, limitaciones y tecnologías;
 *  · que la aplicación monta y declara el estado «datos pendientes» sin cifras;
 *  · que las cuatro vistas son navegables y cada una explica qué mostrará;
 *  · que el diálogo de metodología documenta fuente, definiciones y acceso;
 *  · que no hay errores de consola y que los otros tableros siguen funcionando.
 *
 * Uso: node tools/revisar.mjs [--movil]
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
const SITIO = process.env.MARKETING_SITIO || 'http://127.0.0.1:8000';
const movil = process.argv.includes('--movil');

mkdirSync(EVIDENCIAS, { recursive: true });

const errores = [];
const resultados = [];
function comprobar(nombre, correcto, detalle = '') {
  resultados.push({ nombre, correcto });
  console.log(`${correcto ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext(
  movil
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
);
const pagina = await contexto.newPage();
pagina.on('console', (mensaje) => mensaje.type() === 'error' && errores.push(mensaje.text()));
pagina.on('pageerror', (error) => errores.push(error.message));

const sufijo = movil ? 'movil' : 'escritorio';

/* 1. Tarjeta en el catálogo */
await pagina.goto(`${SITIO}/#/area/dashboards`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.project-card', { timeout: 30_000 });
await pagina.waitForTimeout(1400);
const tarjeta = await pagina.$('.project-card[data-categoria="Marketing"]');
comprobar('La tarjeta está en el catálogo con la categoría «Marketing»', Boolean(tarjeta));
if (tarjeta) {
  const datos = await tarjeta.evaluate((nodo) => ({
    titulo: nodo.querySelector('h3')?.textContent?.trim(),
    estado: nodo.querySelector('.card-meta')?.textContent?.trim(),
    texto: nodo.querySelector('.card-text')?.textContent?.trim(),
  }));
  comprobar(
    'Título y descripción son los pedidos',
    datos.titulo === 'Marketing y clientes' &&
      datos.texto ===
        'Explora adquisición, conversión y retorno de usuarios a partir de eventos de comercio electrónico.',
    `${datos.titulo} · ${datos.estado}`,
  );
  comprobar(
    'El estado es uno de los declarados del portafolio',
    ['En desarrollo', 'Publicado'].some((valor) => (datos.estado ?? '').includes(valor)),
    datos.estado ?? '',
  );
  await tarjeta.scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(500);
  await tarjeta.screenshot({ path: `${EVIDENCIAS}/tarjeta-${sufijo}.png` });
}
await pagina.screenshot({ path: `${EVIDENCIAS}/catalogo-${sufijo}.png` });

/* 2. Ficha del proyecto */
await pagina.goto(`${SITIO}/#/area/dashboards/marketing-clientes`, { waitUntil: 'domcontentloaded' });
// Espera a la aplicación real (el marcador de carga también usa `.mk-app`).
await pagina.waitForSelector('.mk-app[data-disponible]', { timeout: 45_000 });
await pagina.waitForSelector('.mk-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(1500);

const ficha = await pagina.evaluate(() => {
  const filas = [...document.querySelectorAll('.project-fields dt')].map((n) => n.textContent?.trim());
  return {
    filas,
    titulo: document.querySelector('.view-title')?.textContent?.trim(),
    nota: document.querySelector('.ficha-note')?.textContent?.trim() ?? '',
  };
});
comprobar(
  'La ficha incluye problema, fuente, método y limitaciones',
  ['Problema', 'Fuentes y datos', 'Método y decisiones técnicas', 'Limitaciones', 'Tecnologías'].every(
    (campo) => ficha.filas.includes(campo),
  ),
  ficha.filas.join(' · '),
);
comprobar('El título de la ficha es correcto', ficha.titulo === 'Marketing y clientes', ficha.titulo ?? '');
comprobar(
  'La nota de estado describe el tablero con datos y su persistencia',
  ficha.nota.includes('Versión publicada') && ficha.nota.includes('MongoDB'),
  ficha.nota.slice(0, 90),
);

/* 3. Estado con datos publicados */
const estadoApp = await pagina.evaluate(() => ({
  disponible: document.querySelector('.mk-app')?.getAttribute('data-disponible'),
  aviso: document.querySelector('[data-testid="aviso-datos"]')?.textContent?.trim(),
  panel: Boolean(document.querySelector('[data-testid="sin-datos"]')),
  kpis: [...document.querySelectorAll('.mk-kpi-valor')].map((n) => n.textContent?.trim()),
}));
comprobar(
  'El tablero sirve una versión publicada',
  estadoApp.disponible === 'true' && !estadoApp.panel,
  estadoApp.aviso?.slice(0, 80),
);
comprobar(
  'Las tarjetas muestran cifras y no «Sin datos»',
  estadoApp.kpis.length >= 4 && estadoApp.kpis.every((valor) => valor !== 'Sin datos'),
  estadoApp.kpis.join(' | '),
);
await pagina.evaluate(() => {
  const app = document.querySelector('.mk-app');
  const cabecera = document.querySelector('header');
  const alto = cabecera ? cabecera.getBoundingClientRect().height : 0;
  if (app) window.scrollTo({ top: app.getBoundingClientRect().top + window.scrollY - alto - 6, behavior: 'instant' });
});
await pagina.waitForTimeout(600);
await pagina.screenshot({ path: `${EVIDENCIAS}/resumen-${sufijo}.png` });

/* 4. Las cuatro vistas son navegables */
for (const vista of ['Adquisición', 'Conversión', 'Cohortes y retención', 'Resumen']) {
  await pagina.getByRole('button', { name: new RegExp(`^${vista}$`) }).first().click();
  await pagina.waitForTimeout(900);
  const activa = await pagina.evaluate(() => ({
    nav: document.querySelector('.mk-nav-btn.is-activa')?.textContent?.trim(),
    paneles: document.querySelectorAll('.mk-panel').length,
  }));
  comprobar(`La vista «${vista}» se abre con sus paneles`, activa.nav === vista && activa.paneles >= 2, `${activa.nav} · ${activa.paneles} paneles`);
  if (vista !== 'Resumen') {
    await pagina.screenshot({ path: `${EVIDENCIAS}/vista-${vista.split(' ')[0].toLowerCase()}-${sufijo}.png` });
  }
}

/* 5. Diálogo de metodología */
await pagina.getByRole('button', { name: /Metodología y datos/i }).first().click();
await pagina.waitForSelector('.mk-dialog', { timeout: 10_000 });
await pagina.waitForTimeout(700);
const dialogo = (await pagina.textContent('.mk-dialog'))?.replace(/\s+/g, ' ') ?? '';
comprobar(
  'La metodología documenta fuente, definiciones, límites y modelo publicado',
  dialogo.includes('bigquery-public-data') &&
    dialogo.includes('Definiciones de las métricas') &&
    dialogo.includes('Calidad y límites') &&
    dialogo.includes('Extracción, publicación y modelo') &&
    dialogo.includes('Fórmulas y reglas aplicadas') &&
    dialogo.includes('Verificación y conciliación'),
  dialogo.slice(0, 80),
);
await pagina.screenshot({ path: `${EVIDENCIAS}/metodologia-${sufijo}.png` });
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(500);

/* 6. Sin desbordamiento horizontal y con teclado */
const ancho = await pagina.evaluate(() => ({
  documento: document.documentElement.scrollWidth,
  ventana: window.innerWidth,
}));
comprobar(
  'No hay desplazamiento horizontal',
  ancho.documento <= ancho.ventana + 1,
  `${ancho.documento} / ${ancho.ventana}`,
);

const focoNav = await pagina.evaluate(() => {
  const boton = document.querySelector('.mk-nav-btn:nth-child(3)');
  boton?.focus();
  return document.activeElement === boton;
});
comprobar('Las vistas reciben el foco con el teclado', focoNav);

/* 7. Los otros tableros siguen funcionando */
await pagina.goto(`${SITIO}/#/area/dashboards/atlas-vial`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 45_000 });
await pagina.waitForTimeout(2500);
const atlas = await pagina.$$eval('.at-kpi-valor', (nodos) => nodos.map((n) => n.textContent?.trim()));
comprobar('El Atlas vial sigue mostrando sus cifras', atlas[0] === '30,655', atlas.join(' | '));

await pagina.goto(`${SITIO}/#/area/dashboards/comparativo-bancario`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.bm-app', { timeout: 45_000 });
await pagina.waitForTimeout(2000);
comprobar('El comparativo bancario sigue montando', Boolean(await pagina.$('.bm-app')));

await navegador.close();

comprobar('Sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

const fallos = resultados.filter((r) => !r.correcto);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas`);
if (fallos.length > 0) process.exitCode = 1;
