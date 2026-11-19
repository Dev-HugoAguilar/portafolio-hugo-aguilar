/**
 * Captura de la tarjeta «Marketing y clientes» del portafolio.
 *
 * Abre el tablero con los datos publicados en Atlas, espera a que las consultas
 * terminen y a que las gráficas se dibujen, y captura **solo el contenido del
 * tablero** (sin la navegación del portafolio ni barras del navegador) con el
 * encuadre que se pide por parámetro.
 *
 * Uso:
 *   node tools/captura-tarjeta.mjs                 # mide y guarda un borrador
 *   node tools/captura-tarjeta.mjs --final         # escribe la imagen de la tarjeta
 *   node tools/captura-tarjeta.mjs --alto 1180     # fuerza el alto del encuadre
 */

import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const SITIO = process.env.MARKETING_SITIO || 'http://127.0.0.1:8000';
const DESTINO = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
const SALIDA = fileURLToPath(new URL('../../dist/img/', new URL('../', import.meta.url)));
mkdirSync(DESTINO, { recursive: true });

const argumentos = process.argv.slice(2);
const final = argumentos.includes('--final');
const indiceAlto = argumentos.indexOf('--alto');
const altoPedido = indiceAlto >= 0 ? Number(argumentos[indiceAlto + 1]) : null;
const indiceAncho = argumentos.indexOf('--ancho');
const anchoPedido = indiceAncho >= 0 ? Number(argumentos[indiceAncho + 1]) : 1440;
const indiceDesde = argumentos.indexOf('--desde');
// Desde dónde empieza el encuadre: «cabecera», «filtros» o «kpis».
const desde = indiceDesde >= 0 ? argumentos[indiceDesde + 1] : 'cabecera';
const indiceHasta = argumentos.indexOf('--hasta');
// Hasta dónde llega: «serie», «sankey» o «lollipop».
const hasta = indiceHasta >= 0 ? argumentos[indiceHasta + 1] : 'serie';
const indiceMargen = argumentos.indexOf('--margen');
const margen = indiceMargen >= 0 ? Number(argumentos[indiceMargen + 1]) : 8;
const indiceCalidad = argumentos.indexOf('--calidad');
const calidad = indiceCalidad >= 0 ? Number(argumentos[indiceCalidad + 1]) : 0.86;
const indiceMaxAncho = argumentos.indexOf('--max-ancho');
// Ancho máximo en píxeles reales; 0 = tamaño nativo de la captura (×2 del CSS).
const maxAncho = indiceMaxAncho >= 0 ? Number(argumentos[indiceMaxAncho + 1]) : 0;

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: anchoPedido, height: 1400 },
  deviceScaleFactor: 2,
  locale: 'es-MX',
  colorScheme: 'light',
});
const pagina = await contexto.newPage();

await pagina.goto(`${SITIO}/#/area/dashboards/marketing-clientes`, { waitUntil: 'domcontentloaded' });

// 1. Datos publicados: las tarjetas dejan de decir «Sin datos».
await pagina.waitForSelector('.mk-app[data-disponible="true"]', { timeout: 60_000 });
await pagina.waitForFunction(
  () => {
    const valores = [...document.querySelectorAll('.mk-kpi-valor')].map((n) => n.textContent ?? '');
    return valores.length > 0 && valores.every((valor) => !valor.includes('Sin datos'));
  },
  { timeout: 90_000 },
);

// 2. Gráficas dibujadas: serie, Sankey y lollipop con nodos o trazos reales.
await pagina.waitForFunction(
  () => {
    const serie = document.querySelector('[data-testid="panel-serie"] svg path');
    const sankey = document.querySelectorAll('[data-testid="panel-sankey"] path, [data-testid="panel-sankey"] rect');
    const lollipop = document.querySelector('[data-testid="panel-lollipop"] svg circle');
    return Boolean(serie) && sankey.length > 3 && Boolean(lollipop);
  },
  { timeout: 90_000 },
);
// Sin animaciones de entrada y con las fuentes ya disponibles.
await pagina.evaluate(() => document.fonts?.ready);
await pagina.waitForTimeout(1200);

const cajas = await pagina.evaluate(() => {
  const caja = (selector) => {
    const nodo = document.querySelector(selector);
    if (!nodo) return null;
    const r = nodo.getBoundingClientRect();
    return {
      top: Math.round(r.top + window.scrollY),
      left: Math.round(r.left + window.scrollX),
      ancho: Math.round(r.width),
      alto: Math.round(r.height),
    };
  };
  return {
    raiz: caja('.mk-root'),
    app: caja('[data-testid="app"]'),
    cabecera: caja('.mk-head'),
    filtros: caja('[data-testid="filtros"]'),
    kpis: caja('[data-testid="kpis"]'),
    cobertura: caja('[data-testid="panel-cobertura"]'),
    serie: caja('[data-testid="panel-serie"]'),
    sankey: caja('[data-testid="panel-sankey"]'),
    lollipop: caja('[data-testid="panel-lollipop"]'),
    desplazamiento: Math.round(window.scrollY),
  };
});
console.log(JSON.stringify(cajas, null, 1));

const raiz = cajas.raiz ?? cajas.app;
if (!raiz) throw new Error('No se encontró el contenedor del tablero');

// El encuadre empieza en el bloque elegido y termina donde acaba la última
// visualización que se quiere mostrar completa (o donde pida --alto).
const MARGEN = margen;
const bloques = {
  cabecera: cajas.cabecera,
  filtros: cajas.filtros,
  kpis: cajas.kpis,
};
const referencia = bloques[desde] ?? cajas.cabecera ?? raiz;
const inicio = Math.round(referencia.top - MARGEN);
const finPorDefecto = (cajas[hasta]?.top ?? inicio) + (cajas[hasta]?.alto ?? 0) + MARGEN;
const alto = altoPedido ?? Math.round(finPorDefecto - inicio);
const ancho = raiz.ancho;

console.log({ inicio, alto, ancho, relacion: (ancho / alto).toFixed(4) });

const recorte = { x: raiz.left, y: inicio, width: ancho, height: alto };
const png = await pagina.screenshot({ clip: recorte, fullPage: true, animations: 'disabled' });

if (!final) {
  const nombre = `captura-tarjeta-${desde}-${hasta}.png`;
  await writeFile(`${DESTINO}${nombre}`, png);
  console.log(`borrador: ${DESTINO}${nombre} (${ancho * 2} × ${alto * 2} px)`);
} else {
  // WebP con el codificador del propio Chromium: se redibuja el PNG en un canvas
  // del mismo tamaño (sin reescalar, para no deformar) y se exporta con calidad.
  const webp = await pagina.evaluate(
    async ({ base64, calidad, maxAncho }) => {
      const imagen = new Image();
      imagen.src = 'data:image/png;base64,' + base64;
      await imagen.decode();
      const escala =
        maxAncho && imagen.naturalWidth > maxAncho ? maxAncho / imagen.naturalWidth : 1;
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(imagen.naturalWidth * escala);
      lienzo.height = Math.round(imagen.naturalHeight * escala);
      const contexto2d = lienzo.getContext('2d');
      contexto2d.imageSmoothingEnabled = true;
      contexto2d.imageSmoothingQuality = 'high';
      contexto2d.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      const blob = await new Promise((resolver) => lienzo.toBlob(resolver, 'image/webp', calidad));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binario = '';
      for (const byte of bytes) binario += String.fromCharCode(byte);
      return {
        base64: btoa(binario),
        ancho: lienzo.width,
        alto: lienzo.height,
        bytes: bytes.length,
      };
    },
    { base64: png.toString('base64'), calidad, maxAncho },
  );
  const destinoWebp = `${SALIDA}marketing-clientes-resumen.webp`;
  await writeFile(destinoWebp, Buffer.from(webp.base64, 'base64'));
  console.log(
    `imagen de la tarjeta: ${destinoWebp} · ${webp.ancho} × ${webp.alto} px · ` +
      `${(webp.bytes / 1024).toFixed(1)} KB · relación ${(webp.ancho / webp.alto).toFixed(4)}`,
  );
}

// 3. Comprobación: el recorte no corta ningún panel visible por la mitad.
const cortados = await pagina.evaluate((recorte) => {
  const fin = recorte.y + recorte.height;
  const paneles = [...document.querySelectorAll(
    '[data-testid="kpis"], [data-testid="panel-cobertura"], [data-testid="panel-serie"], [data-testid="panel-sankey"]',
  )];
  return paneles
    .map((nodo) => {
      const r = nodo.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const bottom = top + r.height;
      return { id: nodo.getAttribute('data-testid'), top: Math.round(top), bottom: Math.round(bottom) };
    })
    .filter((panel) => panel.top < fin && panel.bottom > fin);
}, recorte);
console.log('paneles cortados:', cortados.length ? cortados : 'ninguno');

if (final) {
  console.log(`siguiente paso: convertir a WebP con ${SALIDA}`);
}
await navegador.close();
