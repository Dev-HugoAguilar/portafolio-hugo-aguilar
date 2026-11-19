/**
 * Comprobación de la conexión entre el tablero y la API del Atlas vial.
 *
 * Responde a un fallo concreto: el tablero mostraba
 *   «No se pudo contactar con la API del Atlas vial…»
 * porque el backend no estaba escuchando en 127.0.0.1:8010. Esta herramienta
 * comprueba que ahora sí responde y que la interfaz vuelve a pintar los datos:
 *
 *  1. cada petición que el navegador hace a la API termina en 200 (ninguna
 *     bloqueada por CORS ni rechazada por el servidor);
 *  2. el aviso de error —y su botón «Reintentar»— ya no están en el DOM;
 *  3. los indicadores, el mapa y la tabla tienen contenido real;
 *  4. la consola queda sin errores;
 *  5. el mismo recorrido funciona en móvil, sin desbordamiento horizontal;
 *  6. cortando la API a propósito aparece el aviso exacto con su instrucción, y
 *     al restablecerla «Reintentar» devuelve el tablero sin recargar.
 *
 * Requiere el backend en marcha:  cd backend && python -m uvicorn app.main:app --port 8010
 * Uso:  node tools/verificar-api.mjs
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const SITIO = process.env.ATLAS_SITIO || 'http://127.0.0.1:8000';
const API = (process.env.ATLAS_API || 'http://127.0.0.1:8010/api/v1/atlas-vial').replace(/\/+$/, '');
const RUTA = '/#/area/dashboards/atlas-vial';
const BASE = fileURLToPath(new URL('evidencias/api/', new URL('../', import.meta.url)));
mkdirSync(BASE, { recursive: true });

const resultados = [];
const comprobar = (nombre, correcto, detalle = '') => {
  resultados.push({ nombre, correcto });
  console.log(`${correcto ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
};

/* ---------------------------------------------------------------- 0. API */
const rutas = [
  '/estado',
  '/catalogo',
  '/resumen',
  '/puntos',
  '/tiempo',
  '/personas',
  '/territorio?incluir_puntos=false',
  '/tabla?tamano=5',
];
const api = [];
for (const ruta of rutas) {
  const inicio = Date.now();
  try {
    const respuesta = await fetch(`${API}${ruta}`, { headers: { Accept: 'application/json' } });
    const texto = await respuesta.text();
    api.push({ ruta, status: respuesta.status, bytes: Buffer.byteLength(texto), ms: Date.now() - inicio });
  } catch (error) {
    api.push({ ruta, status: 0, bytes: 0, ms: Date.now() - inicio, detalle: error.message });
  }
}
console.log('API directa:');
for (const a of api) console.log(`  ${String(a.status).padEnd(4)} ${a.ruta.padEnd(30)} ${(a.bytes / 1024).toFixed(0)} KB ${a.ms} ms`);
comprobar('La API responde a los 8 puntos de consulta', api.every((a) => a.status === 200), api.filter((a) => a.status !== 200).map((a) => `${a.ruta} → ${a.status || a.detalle}`).join(' | '));

/* Preflight y cabecera CORS con el origen real del portafolio. */
let cors = null;
try {
  const respuesta = await fetch(`${API}/estado`, {
    headers: { Origin: SITIO, 'Access-Control-Request-Method': 'GET' },
  });
  cors = { status: respuesta.status, permitido: respuesta.headers.get('access-control-allow-origin') };
} catch (error) {
  cors = { status: 0, permitido: null, detalle: error.message };
}
comprobar('CORS permite el origen del portafolio', cors.status === 200 && cors.permitido === SITIO, `ACAO: ${cors.permitido ?? 'ausente'}`);

/* Cifras de referencia del backend, para contrastar lo que pinta la interfaz. */
const estado = await (await fetch(`${API}/estado`)).json();
const cifras = estado?.cifras ?? {};
const miles = (n) => new Intl.NumberFormat('es-MX').format(n);

/* ------------------------------------------------------- 1. Navegador — escritorio */
const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-MX' });
const pagina = await contexto.newPage();

const errores = [];
const peticiones = [];
pagina.on('console', (m) => {
  if (m.type() === 'error') errores.push(m.text().slice(0, 200));
});
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message.slice(0, 200)));
pagina.on('requestfailed', (p) => {
  if (p.url().startsWith('http://127.0.0.1:8010')) peticiones.push({ url: p.url(), status: 'FALLO', motivo: p.failure()?.errorText });
});
pagina.on('response', (r) => {
  if (r.url().startsWith('http://127.0.0.1:8010')) peticiones.push({ url: r.url(), status: r.status() });
});

await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-mapa-lienzo', { timeout: 120_000 });
await pagina.waitForFunction(() => document.querySelectorAll('.at-kpi-valor').length >= 4, { timeout: 120_000 });
await pagina.waitForTimeout(2500);

const cuerpo = await pagina.evaluate(() => document.body.innerText);
comprobar('El aviso «No se pudo contactar con la API» desapareció', !/No se pudo contactar con la API/i.test(cuerpo), /No se pudo contactar con la API/i.test(cuerpo) ? 'sigue visible' : 'no aparece en el DOM');
comprobar('No queda ningún aviso de error ni botón «Reintentar»', (await pagina.locator('[role=alert]').count()) === 0 && (await pagina.getByRole('button', { name: /Reintentar/i }).count()) === 0);

const conFallo = peticiones.filter((p) => p.status !== 200);
comprobar('Todas las peticiones del navegador a la API terminan en 200', peticiones.length > 0 && conFallo.length === 0, `${peticiones.length} peticiones${conFallo.length ? ' · fallos: ' + JSON.stringify(conFallo.slice(0, 3)) : ''}`);

const kpis = await pagina.evaluate(() =>
  [...document.querySelectorAll('.at-kpi-valor')].map((n) => (n.textContent || '').trim()),
);
const esperados = [cifras.hechos, cifras.personas_lesionadas, cifras.personas_fallecidas, cifras.hechos_con_fallecimientos]
  .filter((n) => typeof n === 'number')
  .map(miles);
const coinciden = esperados.every((v) => kpis.includes(v));
comprobar('Los indicadores coinciden con las cifras de la API', coinciden, `interfaz: ${kpis.join(' · ')} | API: ${esperados.join(' · ')}`);

/* El mapa es un <canvas>: se comprueba que está pintado y con varias tintas
   (fondo, alcaldías y puntos), no solo el relleno de fondo. */
const mapa = await pagina.evaluate(() => {
  const lienzo = document.querySelector('.at-mapa-lienzo');
  if (!lienzo) return null;
  const caja = lienzo.getBoundingClientRect();
  const contexto = lienzo.getContext('2d');
  let tintas = 0;
  if (contexto) {
    const datos = contexto.getImageData(0, 0, lienzo.width, lienzo.height).data;
    const vistas = new Set();
    for (let i = 0; i < datos.length; i += 4 * 7) {
      vistas.add(`${datos[i]},${datos[i + 1]},${datos[i + 2]}`);
    }
    tintas = vistas.size;
  }
  return {
    ancho: Math.round(caja.width),
    alto: Math.round(caja.height),
    tintas,
    etiqueta: lienzo.getAttribute('aria-label') || '',
  };
});
comprobar(
  'El mapa está dibujado con los hechos geolocalizados que publica la API',
  Boolean(mapa) &&
    mapa.ancho > 200 &&
    mapa.tintas >= 8 &&
    /Ciudad de México/i.test(mapa.etiqueta) &&
    (!cifras.con_coordenadas || mapa.etiqueta.includes(miles(cifras.con_coordenadas))),
  mapa ? `lienzo ${mapa.ancho}×${mapa.alto} px · ${mapa.tintas} tintas · «${mapa.etiqueta.slice(0, 80)}…»` : 'sin lienzo',
);

const recorrido = await pagina.evaluate(() => {
  const panel = document.querySelector('[data-testid=recorrido]');
  return panel ? (panel.innerText || '').trim().split('\n').filter(Boolean).length : 0;
});
comprobar('El recorrido de hechos se alimenta de la API', recorrido > 0, `${recorrido} líneas`);

comprobar('Sin errores en la consola', errores.length === 0, errores.slice(0, 3).join(' | '));

await pagina.locator('.at-mapa-lienzo').scrollIntoViewIfNeeded().catch(() => {});
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: `${BASE}tablero-escritorio.png`, fullPage: false });
await pagina.screenshot({ path: `${BASE}tablero-escritorio-completo.png`, fullPage: true });

/* ------------------------------------------------------- 2. Navegador — móvil */
const movilContexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'es-MX',
});
const movil = await movilContexto.newPage();
const erroresMovil = [];
movil.on('console', (m) => {
  if (m.type() === 'error') erroresMovil.push(m.text().slice(0, 200));
});
movil.on('pageerror', (e) => erroresMovil.push('pageerror: ' + e.message.slice(0, 200)));

await movil.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await movil.waitForSelector('.at-mapa-lienzo', { timeout: 120_000 });
await movil.waitForFunction(() => document.querySelectorAll('.at-kpi-valor').length >= 4, { timeout: 120_000 });
await movil.waitForTimeout(2200);

const cuerpoMovil = await movil.evaluate(() => document.body.innerText);
const desborde = await movil.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
comprobar('En móvil tampoco aparece el aviso de conexión', !/No se pudo contactar con la API/i.test(cuerpoMovil));
comprobar('En móvil no hay desbordamiento horizontal', desborde <= 0, `${desborde} px`);
comprobar('Sin errores de consola en móvil', erroresMovil.length === 0, erroresMovil.slice(0, 3).join(' | '));
const mapaMovil = await movil.evaluate(() => {
  const lienzo = document.querySelector('.at-mapa-lienzo');
  return lienzo ? Math.round(lienzo.getBoundingClientRect().width) : 0;
});
comprobar('El mapa también se dibuja en móvil', mapaMovil >= 200, `lienzo ${mapaMovil} px`);

await movil.screenshot({ path: `${BASE}tablero-movil.png`, fullPage: true });

/* ------------------------------- 3. El fallo original y su recuperación */
/* Se corta la API a propósito: el tablero debe mostrar el aviso exacto que
   originó esta revisión y, al restablecer la conexión, basta «Reintentar»
   (sin recargar la página) para volver a pintar los datos. */
const rota = await contexto.newPage();
await rota.route('http://127.0.0.1:8010/**', (ruta) => ruta.abort('connectionrefused'));
await rota.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
const aviso = rota.locator('[role=alert]');
const aparece = await aviso.first().waitFor({ state: 'visible', timeout: 60_000 }).then(() => true).catch(() => false);
const textoAviso = aparece ? (await aviso.first().innerText()).replace(/\s+/g, ' ').trim() : '';
comprobar(
  'Sin backend, el aviso explica el motivo y ofrece «Reintentar»',
  aparece && /No se pudo contactar con la API del Atlas vial/.test(textoAviso) && /uvicorn app\.main:app --port 8010/.test(textoAviso) && /CORS/.test(textoAviso),
  textoAviso.slice(0, 150),
);
await aviso.first().scrollIntoViewIfNeeded().catch(() => {});
await rota.waitForTimeout(400);

/* El botón de la alerta es el único camino de vuelta: su etiqueta debe leerse.
   Aquí se quedó en gris sobre azul (1,9:1) por un `color: inherit` genérico. */
const contraste = await rota.evaluate(() => {
  const boton = document.querySelector('[role=alert] button');
  if (!boton) return null;
  const cs = getComputedStyle(boton);
  const rgb = (texto) => (texto.match(/[0-9.]+/g) || []).slice(0, 3).map(Number);
  const luz = ([r, g, b]) => {
    const f = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const texto = luz(rgb(cs.color));
  const fondo = luz(rgb(cs.backgroundColor));
  const razon = (Math.max(texto, fondo) + 0.05) / (Math.min(texto, fondo) + 0.05);
  return { color: cs.color, fondo: cs.backgroundColor, razon: Math.round(razon * 100) / 100 };
});
comprobar(
  'El botón «Reintentar» se lee (contraste AA ≥ 4,5:1)',
  Boolean(contraste) && contraste.razon >= 4.5,
  contraste ? `${contraste.color} sobre ${contraste.fondo} · ${contraste.razon}:1` : 'sin botón',
);

await rota.screenshot({ path: `${BASE}aviso-api-caida.png` });

await rota.unroute('http://127.0.0.1:8010/**');
const inicioReintento = Date.now();
await rota.getByRole('button', { name: /Reintentar/i }).first().click();
/* Los indicadores existen como marcador («Sin dato») mientras cargan: se espera
   a que alguno muestre la cifra que publica la API, no solo a que haya nodos. */
const recuperado = await rota
  .waitForFunction(
    (esperado) =>
      [...document.querySelectorAll('.at-kpi-valor')].some((n) => (n.textContent || '').includes(esperado)),
    miles(cifras.hechos),
    { timeout: 90_000 },
  )
  .then(() => true)
  .catch(() => false);
const kpisTrasReintento = await rota.evaluate(() =>
  [...document.querySelectorAll('.at-kpi-valor')].map((n) => (n.textContent || '').trim()),
);
comprobar(
  '«Reintentar» recupera el tablero con la API encendida, sin recargar',
  recuperado && kpisTrasReintento.includes(miles(cifras.hechos)),
  `${kpisTrasReintento.join(' · ') || 'sin indicadores'} · ${Date.now() - inicioReintento} ms`,
);
await rota.screenshot({ path: `${BASE}recuperado-tras-reintentar.png`, fullPage: false });
await rota.close();

await navegador.close();

const fallos = resultados.filter((r) => !r.correcto);
console.log(`\n${resultados.length - fallos.length} OK · ${fallos.length} fallos`);
if (fallos.length) process.exitCode = 1;
