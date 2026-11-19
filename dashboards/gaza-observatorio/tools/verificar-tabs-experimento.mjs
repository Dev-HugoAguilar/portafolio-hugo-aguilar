/**
 * Revisa la fila de análisis del panel «Experimento» en 1440, 1024 y 390 px:
 * posición (debajo del encabezado), una sola fila, alto de botón ≈42 px, texto en
 * una línea, encabezado sin recortes, desplazamiento horizontal solo en la fila y
 * navegación interna funcionando. Captura cada ancho.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-tabs-experimento.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'pronostico');
const URL_OBS = 'http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html';

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  await import(pathToFileURL(ruta).href);
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(SALIDA, { recursive: true });
const ok = [];
const fallos = [];
const errores = [];
const comprobar = (c, m) => (c ? ok : fallos).push(m);

const medir = (pagina) =>
  pagina.evaluate(() => {
    const fila = document.querySelector('#experimento .pronostico-tabs');
    const cabecera = document.querySelector('#experimento header.mast');
    const botones = [...fila.querySelectorAll('button')];
    const r = (el) => el.getBoundingClientRect();
    const lineas = (el) => {
      // Cuenta las líneas de texto reales de un botón.
      const rango = document.createRange();
      rango.selectNodeContents(el);
      return [...rango.getClientRects()].filter((x) => x.height > 0).length;
    };
    return {
      existeFila: !!fila,
      clase: fila.className,
      usaClaseGlobal: fila.classList.contains('tabs'),
      textoBoton: botones.map((b) => b.textContent.trim()),
      altos: botones.map((b) => Math.round(r(b).height)),
      lineas: botones.map((b) => lineas(b)),
      blancos: botones.map((b) => getComputedStyle(b).whiteSpace),
      filaTop: Math.round(r(fila).top),
      cabeceraBottom: Math.round(r(cabecera).bottom),
      cabeceraAlto: Math.round(r(cabecera).height),
      cabeceraRecortada: cabecera.scrollHeight > cabecera.clientHeight + 1,
      unaFila: new Set(botones.map((b) => Math.round(r(b).top))).size === 1,
      izq: Math.round(r(botones[0]).left - r(fila).left),
      scrollFila: fila.scrollWidth - fila.clientWidth,
      desbordePagina: document.documentElement.scrollWidth - window.innerWidth,
      anchoFila: Math.round(r(fila).width),
      botonDentroDeCabecera: cabecera.contains(fila),
      fuente: getComputedStyle(botones[0]).fontFamily.split(',')[0].replace(/["']/g, ''),
    };
  });

const navegador = await chromium.launch();
const resultados = {};

for (const ancho of [1440, 1024, 390]) {
  const tactil = ancho <= 480;
  const pagina = await navegador.newPage({
    viewport: { width: ancho, height: ancho === 390 ? 844 : 1000 },
    hasTouch: tactil,
    isMobile: tactil,
  });
  pagina.on('pageerror', (e) => errores.push(`${ancho}px JS: ${e.message}`));
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`${ancho}px consola: ${m.text()}`); });
  await pagina.goto(URL_OBS, { waitUntil: 'load' });
  await pagina.waitForTimeout(1700);
  await pagina.locator('[data-tab="experimento"]').click();
  await pagina.waitForTimeout(900);

  const datos = await medir(pagina);
  resultados[ancho] = datos;

  comprobar(datos.existeFila && !datos.usaClaseGlobal, `${ancho}px · la fila usa una clase propia (${datos.clase})`);
  comprobar(!datos.botonDentroDeCabecera, `${ancho}px · la fila no está dentro del encabezado`);
  comprobar(datos.filaTop >= datos.cabeceraBottom - 2, `${ancho}px · la fila va debajo del encabezado y su descripción (${datos.filaTop} ≥ ${datos.cabeceraBottom})`);
  comprobar(!datos.cabeceraRecortada, `${ancho}px · el encabezado no se recorta (${datos.cabeceraAlto} px)`);
  comprobar(datos.unaFila, `${ancho}px · los tres botones comparten una sola línea (${datos.altos.join(' / ')})`);
  comprobar(datos.altos.every((h) => h >= 38 && h <= 46), `${ancho}px · alto de botón ≈42 px (${datos.altos.join(' / ')})`);
  comprobar(datos.lineas.every((n) => n === 1), `${ancho}px · el texto de cada botón va en una línea (${datos.lineas.join(' / ')})`);
  comprobar(datos.blancos.every((v) => v === 'nowrap'), `${ancho}px · sin saltos de línea (${datos.blancos[0]})`);
  comprobar(datos.izq <= 2, `${ancho}px · alineada a la izquierda (${datos.izq} px)`);
  comprobar(datos.desbordePagina <= 0, `${ancho}px · sin desbordamiento de página (${datos.desbordePagina})`);
  if (ancho >= 1024) {
    comprobar(datos.scrollFila <= 1, `${ancho}px · la fila cabe completa (${datos.scrollFila} px de desborde interno)`);
  } else {
    comprobar(datos.scrollFila > 0, `${ancho}px · el desplazamiento horizontal queda dentro de la fila (${datos.scrollFila} px)`);
  }

  // Captura en el estado inicial (primera vista activa), antes de recorrerlas.
  await pagina.locator('#experimento .pronostico-tabs').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(350);
  const nombreFoto = `${ancho === 390 ? '10' : ancho === 1024 ? '09' : '08'}-tabs-${ancho}.png`;
  await pagina.screenshot({ path: path.join(SALIDA, nombreFoto), animations: 'disabled' });
  console.log('  captura', nombreFoto);

  // Navegación interna: las tres vistas responden y ninguna se queda vacía.
  const vistas = [];
  for (const panel of ['panel-deaths', 'panel-zones', 'panel-site-risk']) {
    await pagina.locator(`#experimento .pronostico-tabs [data-panel="${panel}"]`).click();
    await pagina.waitForTimeout(500);
    const estado = await pagina.evaluate((id) => {
      const p = document.getElementById(id);
      const boton = document.querySelector(`#experimento .pronostico-tabs [data-panel="${id}"]`);
      return {
        visible: getComputedStyle(p).display !== 'none',
        otros: [...document.querySelectorAll('#experimento .panel')].filter((x) => x.id !== id).every((x) => getComputedStyle(x).display === 'none'),
        seleccionado: boton.getAttribute('aria-selected'),
        alto: Math.round(document.getElementById('experimento').getBoundingClientRect().height),
        svg: p.querySelectorAll('svg').length,
        tablas: p.querySelectorAll('table').length,
      };
    }, panel);
    comprobar(estado.visible && estado.otros && estado.seleccionado === 'true', `${ancho}px · ${panel} se abre y oculta las demás`);
    comprobar(estado.svg + estado.tablas > 0, `${ancho}px · ${panel} conserva gráficas y tablas (${estado.svg} svg · ${estado.tablas} tablas)`);
    vistas.push(estado.alto);
  }
  comprobar(new Set(vistas).size > 1 || vistas[0] > 400, `${ancho}px · las tres vistas tienen contenido propio`);

  await pagina.close();
}

await navegador.close();
console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log('\nmedidas:', JSON.stringify(resultados, null, 1));
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;
