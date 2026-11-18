/**
 * Verificación del ajuste «Constelaciones visibles» de ORBITA.
 *
 *   node tools/verificar-orbita-tarjetas.mjs
 *
 * Requiere Chrome del sistema y el servidor local en http://127.0.0.1:8000.
 * Comprueba la estructura compacta, seis columnas en escritorio, una tira
 * horizontal en tablet/móvil, los seis filtros y Mostrar/Ocultar todas.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const EVIDENCIAS = path.join(RAIZ, 'evidencias', 'orbita');
const URL_DEMO = 'http://127.0.0.1:8000/dashboards/orbita/index.html';

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;
const ok = [];
const fallos = [];
const detalles = [];
const comprobar = (condicion, etiqueta, detalle = '') => {
  (condicion ? ok : fallos).push(etiqueta);
  if (detalle) detalles.push(`${condicion ? 'OK ' : 'FALLO'} · ${etiqueta}: ${detalle}`);
};

mkdirSync(EVIDENCIAS, { recursive: true });
const navegador = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist'] });

async function cargar(ancho, alto = 900) {
  const contexto = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (error) => errores.push(error.message));
  await pagina.goto(URL_DEMO, { waitUntil: 'load', timeout: 60_000 });
  await pagina.waitForSelector('#groups button', { timeout: 60_000 });
  await pagina.waitForTimeout(2400);
  return { contexto, pagina, errores };
}

async function medir(pagina) {
  return pagina.evaluate(() => {
    const tira = document.querySelector('#groups');
    const tarjetas = [...tira.querySelectorAll('button')];
    const caja = (el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
    };
    const estilo = getComputedStyle(tira);
    return {
      viewport: innerWidth,
      display: estilo.display,
      columnas: estilo.gridTemplateColumns,
      gap: estilo.gap,
      overflowX: estilo.overflowX,
      scrollWidth: tira.scrollWidth,
      clientWidth: tira.clientWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      cards: tarjetas.map((b) => ({
        ...caja(b),
        pressed: b.getAttribute('aria-pressed'),
        texto: b.innerText,
        badge: Boolean(b.querySelector('.orbit-badge')),
        topViejo: Boolean(b.querySelector('.orbital-card-top')),
        desc: b.querySelector('.group-desc')?.textContent || '',
        nombre: b.querySelector('.group-name')?.textContent || '',
        dot: Boolean(b.querySelector('.orbital-card-dot')),
        switchEnHead: Boolean(b.querySelector('.orbital-card-head .layer-state')),
        switchBoton: Boolean(b.querySelector('.layer-state button')),
        conteo: b.querySelector('b')?.textContent || '',
        mediana: b.querySelector('.layer-altitude')?.textContent || '',
        pie: b.querySelector('.orbital-card-bottom')?.textContent || '',
        conteoTop: b.querySelector('b') ? caja(b.querySelector('b')).top : null,
        medianaTop: b.querySelector('.layer-altitude') ? caja(b.querySelector('.layer-altitude')).top : null,
        pieTop: b.querySelector('.orbital-card-bottom') ? caja(b.querySelector('.orbital-card-bottom')).top : null,
      })),
      toolbar: document.querySelector('.filter-toolbar')?.innerText || '',
      summary: document.querySelector('#layerSummary')?.textContent || '',
      toggleAll: document.querySelector('#toggleAllLayers')?.textContent || '',
    };
  });
}

try {
  for (const ancho of [1440, 1024, 390]) {
    const { contexto, pagina, errores } = await cargar(ancho);
    try {
      const m = await medir(pagina);
      const tarjetas = m.cards;
      const descripciones = tarjetas.map((c) => c.desc).join('|');
      const esperadas = 'Internet|Internet|Internet|Navegación|Navegación|Estaciones';
      comprobar(tarjetas.length === 6, `${ancho}px · seis tarjetas`, String(tarjetas.length));
      comprobar(descripciones === esperadas, `${ancho}px · subtítulos sin LEO/MEO`, descripciones);
      comprobar(tarjetas.every((c) => !c.badge && !c.topViejo), `${ancho}px · sin badge LEO/MEO ni espacio superior`, tarjetas.map((c) => `${c.badge}/${c.topViejo}`).join(','));
      comprobar(tarjetas.every((c) => !/\\b(LEO|MEO)\\b/.test(c.texto)), `${ancho}px · ninguna tarjeta repite LEO/MEO`, tarjetas.map((c) => c.texto.replace(/\\n/g, ' | ')).join(' || '));
      comprobar(tarjetas.every((c) => c.dot && c.nombre), `${ancho}px · punto de color y nombre presentes`, tarjetas.map((c) => c.nombre).join(', '));
      comprobar(tarjetas.every((c) => c.switchEnHead && !c.switchBoton), `${ancho}px · switch decorativo dentro de la cabecera, sin botón anidado`, tarjetas.map((c) => `${c.switchEnHead}/${c.switchBoton}`).join(','));
      comprobar(new Set(tarjetas.map((c) => c.h)).size === 1 && tarjetas[0].h >= 155 && tarjetas[0].h <= 170, `${ancho}px · altura común 155–170 px`, tarjetas.map((c) => c.h).join(','));
      comprobar(new Set(tarjetas.map((c) => c.top)).size === 1, `${ancho}px · todas las tarjetas en una fila`, tarjetas.map((c) => c.top).join(','));
      comprobar(new Set(tarjetas.map((c) => c.conteoTop)).size === 1, `${ancho}px · conteos en la misma línea base`, tarjetas.map((c) => c.conteoTop).join(','));
      comprobar(new Set(tarjetas.map((c) => c.medianaTop)).size === 1, `${ancho}px · medianas alineadas`, tarjetas.map((c) => c.medianaTop).join(','));
      comprobar(new Set(tarjetas.map((c) => c.pieTop)).size === 1, `${ancho}px · barras y porcentajes alineados`, tarjetas.map((c) => c.pieTop).join(','));
      comprobar(m.docScrollWidth === m.docClientWidth, `${ancho}px · sin overflow global`, `${m.docScrollWidth}/${m.docClientWidth}`);
      comprobar(/constelaciones visibles/i.test(m.toolbar) && m.summary.includes('6 de 6') && m.toggleAll === 'Ocultar todas', `${ancho}px · cabecera de filtros y contador`, `${m.toolbar} · ${m.summary} · ${m.toggleAll}`);

      if (ancho >= 1024) {
        comprobar(m.display === 'grid' && m.columnas.split(' ').length === 6, `${ancho} · grid de seis columnas iguales`, `${m.display} · ${m.columnas}`);
        comprobar(m.scrollWidth === m.clientWidth, `${ancho} · seis columnas visibles sin scroll`, `${m.scrollWidth}/${m.clientWidth}`);
        await pagina.screenshot({ path: path.join(EVIDENCIAS, `tarjetas-explorador-${ancho}.png`), timeout: 60_000 });
      } else {
        comprobar(m.display === 'flex' && m.overflowX === 'auto', `${ancho} · una tira flexible con scroll local`, `${m.display} · ${m.overflowX}`);
        comprobar(m.scrollWidth > m.clientWidth, `${ancho} · la tira desborda sólo localmente`, `${m.scrollWidth}/${m.clientWidth}`);
        comprobar(tarjetas.every((c) => c.w >= 155 && c.w <= 175), `${ancho} · ancho de tarjeta 155–175 px`, tarjetas.map((c) => c.w).join(','));
        const ultima = pagina.locator('#groups button').last();
        await ultima.focus();
        await pagina.waitForTimeout(400);
        const foco = await pagina.evaluate(() => {
          const tira = document.querySelector('#groups');
          const cards = [...tira.querySelectorAll('button')];
          const last = cards[cards.length - 1];
          const r = last.getBoundingClientRect();
          const t = tira.getBoundingClientRect();
          return {
            activo: document.activeElement === last,
            scrollLeft: tira.scrollLeft,
            visible: r.left >= t.left - 1 && r.right <= t.right + 1,
            outline: getComputedStyle(last).outlineStyle,
          };
        });
        comprobar(foco.activo && foco.scrollLeft > 0 && foco.visible, `${ancho} · foco de teclado hace visible la última tarjeta`, JSON.stringify(foco));
        comprobar(foco.outline !== 'none', `${ancho} · foco visible en la tarjeta`, foco.outline);
        await pagina.screenshot({ path: path.join(EVIDENCIAS, `tarjetas-explorador-${ancho}.png`), timeout: 60_000 });
      }

      if (ancho === 1440) {
        const primera = pagina.locator('#groups button').first();
        await primera.click();
        await pagina.waitForTimeout(350);
        let estado = await medir(pagina);
        comprobar(estado.cards[0].pressed === 'false' && estado.summary.startsWith('5 de 6'), '1440 · primera capa se oculta', `${estado.cards[0].pressed} · ${estado.summary}`);
        await primera.click();
        await pagina.waitForTimeout(350);
        await pagina.locator('#toggleAllLayers').click();
        await pagina.waitForTimeout(350);
        estado = await medir(pagina);
        comprobar(estado.cards.every((c) => c.pressed === 'false') && estado.summary.startsWith('0 de 6') && estado.toggleAll === 'Mostrar todas', 'Mostrar/Ocultar todas · oculta las seis', `${estado.summary} · ${estado.toggleAll}`);
        await pagina.locator('#toggleAllLayers').click();
        await pagina.waitForTimeout(350);
        estado = await medir(pagina);
        comprobar(estado.cards.every((c) => c.pressed === 'true') && estado.summary.startsWith('6 de 6') && estado.toggleAll === 'Ocultar todas', 'Mostrar/Ocultar todas · restaura las seis', `${estado.summary} · ${estado.toggleAll}`);
      }
      comprobar(errores.length === 0, `${ancho}px · sin errores de página`, errores.join(' | '));
    } finally {
      await contexto.close();
    }
  }

  // Los seis filtros se prueban también por separado en páginas limpias.
  for (let i = 0; i < 6; i += 1) {
    const { contexto, pagina } = await cargar(1440);
    try {
      const boton = pagina.locator('#groups button').nth(i);
      const aria = await boton.getAttribute('aria-label');
      await boton.click({ timeout: 10_000 });
      await pagina.waitForTimeout(400);
      let m = await medir(pagina);
      comprobar(m.cards[i].pressed === 'false' && m.summary.startsWith('5 de 6'), `filtro ${i + 1} se desactiva individualmente`, `${aria} · ${m.summary}`);
      await boton.click({ timeout: 10_000 });
      await pagina.waitForTimeout(400);
      m = await medir(pagina);
      comprobar(m.cards[i].pressed === 'true' && m.summary.startsWith('6 de 6'), `filtro ${i + 1} se reactiva individualmente`, `${aria} · ${m.summary}`);
    } finally {
      await contexto.close();
    }
  }
} catch (error) {
  fallos.push(`excepción: ${error.message}`);
} finally {
  await navegador.close();
}

console.log(`ORBITA · tarjetas de constelaciones · ${ok.length} OK · ${fallos.length} fallos`);
if (detalles.length) console.log(detalles.join('\n'));
if (fallos.length) {
  console.log('\nFALLOS:');
  for (const f of fallos) console.log(`- ${f}`);
  process.exitCode = 1;
} else {
  console.log('\nPASS: seis tarjetas compactas, una fila, scroll local y filtros sincronizados.');
}
