/**
 * Verificación de la tarjeta «Marketing y clientes» del portafolio.
 *
 * Comprueba, en escritorio y en móvil, que la imagen de la tarjeta:
 *   1. carga de verdad (naturalWidth > 0 y sin error de red),
 *   2. tiene la misma proporción que su recuadro (ni bandas ni recorte),
 *   3. se ve entera (object-fit contiene la imagen completa),
 *   4. no desborda ni rompe el resto de la tarjeta.
 *
 * Guarda una captura de la tarjeta final en cada tamaño.
 *
 * Uso: node tools/verificar-tarjeta.mjs
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const SITIO = process.env.MARKETING_SITIO || 'http://127.0.0.1:8000';
const DESTINO = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
mkdirSync(DESTINO, { recursive: true });

const navegador = await chromium.launch();
const resultados = [];
const comprobar = (nombre, correcto, detalle = '') => {
  resultados.push({ nombre, correcto });
  console.log(`${correcto ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
};

for (const tamano of [
  { nombre: 'escritorio', viewport: { width: 1440, height: 960 }, sufijo: 'escritorio' },
  { nombre: 'movil', viewport: { width: 390, height: 844 }, sufijo: 'movil' },
]) {
  const contexto = await navegador.newContext({
    viewport: tamano.viewport,
    deviceScaleFactor: 2,
    isMobile: tamano.nombre === 'movil',
    hasTouch: tamano.nombre === 'movil',
  });
  const pagina = await contexto.newPage();
  const fallos = [];
  pagina.on('requestfailed', (peticion) => {
    if (peticion.url().includes('marketing-clientes')) fallos.push(peticion.url());
  });

  await pagina.goto(`${SITIO}/#/area/dashboards`, { waitUntil: 'domcontentloaded' });
  const tarjeta = pagina.locator('.project-card', { hasText: 'Marketing y clientes' }).first();
  await tarjeta.waitFor({ state: 'visible', timeout: 45_000 });
  const imagen = tarjeta.locator('.cover img');
  await imagen.waitFor({ state: 'visible', timeout: 45_000 });
  await pagina.waitForFunction(
    () =>
      [...document.querySelectorAll('.project-card .cover img')].every(
        (img) => img.complete && img.naturalWidth > 0,
      ),
    { timeout: 45_000 },
  );
  await pagina.evaluate(() => document.fonts?.ready);
  await pagina.waitForTimeout(700);

  const medidas = await pagina.evaluate(() => {
    const tarjeta = [...document.querySelectorAll('.project-card')].find((nodo) =>
      nodo.textContent.includes('Marketing y clientes'),
    );
    const caja = tarjeta.querySelector('.cover');
    const img = caja.querySelector('img');
    const rc = caja.getBoundingClientRect();
    const ri = img.getBoundingClientRect();
    const estilo = getComputedStyle(img);
    const estiloCaja = getComputedStyle(caja);
    // El recuadro tiene borde: la imagen ocupa el área de contenido, no el borde.
    const bordeX = parseFloat(estiloCaja.borderLeftWidth) + parseFloat(estiloCaja.borderRightWidth);
    const bordeY = parseFloat(estiloCaja.borderTopWidth) + parseFloat(estiloCaja.borderBottomWidth);
    return {
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      anchoAtributo: img.getAttribute('width'),
      altoAtributo: img.getAttribute('height'),
      natural: { ancho: img.naturalWidth, alto: img.naturalHeight },
      caja: { ancho: Math.round(rc.width), alto: Math.round(rc.height) },
      contenido: {
        ancho: Math.round(rc.width - bordeX),
        alto: Math.round(rc.height - bordeY),
      },
      imagen: { ancho: Math.round(ri.width), alto: Math.round(ri.height) },
      ajuste: estilo.objectFit,
      proporcionCaja: rc.width / rc.height,
      proporcionImagen: img.naturalWidth / img.naturalHeight,
      desborda: img.scrollWidth > Math.ceil(ri.width) + 1 || img.scrollHeight > Math.ceil(ri.height) + 1,
      anchoPagina: document.documentElement.scrollWidth,
      anchoVista: window.innerWidth,
    };
  });

  const etiqueta = tamano.nombre;
  comprobar(
    `${etiqueta}: la imagen de la tarjeta carga`,
    medidas.natural.ancho > 0 && fallos.length === 0,
    `${medidas.src} · ${medidas.natural.ancho}×${medidas.natural.alto} px`,
  );
  const diferencia = Math.abs(medidas.proporcionCaja - medidas.proporcionImagen);
  comprobar(
    `${etiqueta}: el recuadro tiene la proporción de la imagen`,
    diferencia < 0.01,
    `caja ${medidas.proporcionCaja.toFixed(3)} vs imagen ${medidas.proporcionImagen.toFixed(3)}`,
  );
  comprobar(
    `${etiqueta}: la captura se ve completa, sin bandas`,
    Math.abs(medidas.imagen.alto - medidas.contenido.alto) <= 1 &&
      Math.abs(medidas.imagen.ancho - medidas.contenido.ancho) <= 1,
    `contenido ${medidas.contenido.ancho}×${medidas.contenido.alto} · imagen ${medidas.imagen.ancho}×${medidas.imagen.alto}`,
  );
  comprobar(
    `${etiqueta}: la imagen declara dimensiones y texto alternativo`,
    Boolean(medidas.anchoAtributo && medidas.altoAtributo && medidas.alt && medidas.alt.length > 60),
    `${medidas.anchoAtributo}×${medidas.altoAtributo} · alt de ${medidas.alt.length} caracteres`,
  );
  comprobar(
    `${etiqueta}: sin desbordes horizontales`,
    medidas.anchoPagina <= medidas.anchoVista + 1 && !medidas.desborda,
    `${medidas.anchoPagina}/${medidas.anchoVista}`,
  );

  await tarjeta.scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  const archivo = `${DESTINO}tarjeta-${tamano.sufijo}.png`;
  await tarjeta.screenshot({ path: archivo, animations: 'disabled' });
  console.log(`captura de la tarjeta: ${archivo}`);
  await contexto.close();
}

const correctas = resultados.filter((r) => r.correcto).length;
console.log(`\n${correctas}/${resultados.length} comprobaciones correctas`);
await navegador.close();
process.exit(correctas === resultados.length ? 0 : 1);
