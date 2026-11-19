/**
 * Medición del encabezado de la ficha del proyecto (herramienta temporal).
 */
import { chromium } from 'playwright';

const RUTA = 'http://localhost:8000/#/area/dashboards/comparativo-bancario';
const navegador = await chromium.launch({ channel: 'chrome' });

const leer = (pagina) =>
  pagina.evaluate(() => {
    const cabecera = document.querySelector('#view-project .view-head');
    if (!cabecera) return { error: 'sin encabezado' };
    const caja = (nodo) => (nodo ? nodo.getBoundingClientRect() : null);
    const estilo = (nodo) => {
      if (!nodo) return null;
      const s = getComputedStyle(nodo);
      const es = getComputedStyle(nodo, '::before');
      return {
        texto: (nodo.textContent ?? '').trim(),
        fuente: `${s.fontFamily.split(',')[0]} ${s.fontSize} w${s.fontWeight} lh${s.lineHeight} ls${s.letterSpacing} tt${s.textTransform} ${s.color}`,
        acento: `${es.width} × ${es.height} ${es.backgroundColor} margen ${es.marginBottom}`,
      };
    };
    const etiqueta = cabecera.querySelector('.eyebrow');
    const titulo = cabecera.querySelector('.view-title');
    const subtitulo = cabecera.querySelector('.view-subtitle');
    const lead = cabecera.querySelector('.view-lead');
    const h1Visibles = [...document.querySelectorAll('h1')].filter(
      (nodo) => !nodo.closest('[hidden]') && nodo.getBoundingClientRect().height > 0,
    );
    const separacion = (a, b) =>
      a && b ? +(b.getBoundingClientRect().top - a.getBoundingClientRect().bottom).toFixed(1) : null;
    return {
      etiqueta: estilo(etiqueta),
      titulo: estilo(titulo),
      tituloNivel: titulo ? titulo.tagName : null,
      subtitulo: estilo(subtitulo),
      lead: estilo(lead),
      acentoDeTitulo: getComputedStyle(titulo, '::before').content,
      etiquetaATitulo: separacion(etiqueta, titulo),
      tituloASubtitulo: separacion(titulo, subtitulo),
      subtituloALead: separacion(subtitulo || titulo, lead),
      h1Visibles: h1Visibles.length,
      h1Texto: h1Visibles.map((nodo) => (nodo.textContent ?? '').trim().slice(0, 40)),
      altoCabecera: Math.round(caja(cabecera).height),
    };
  });

const escritorio = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
await escritorio.goto(RUTA, { waitUntil: 'networkidle' });
await escritorio.waitForTimeout(2200);
console.log('=== escritorio 1440 ===');
console.log(JSON.stringify(await leer(escritorio), null, 1));
await escritorio.locator('#view-project .view-head').screenshot({ path: 'evidencias/encabezado-ficha.png' });

const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await movil.goto(RUTA, { waitUntil: 'networkidle' });
await movil.waitForTimeout(2200);
console.log('=== móvil 390 ===');
const datosMovil = await leer(movil);
console.log(JSON.stringify({ titulo: datosMovil.titulo, subtitulo: datosMovil.subtitulo, etiquetaATitulo: datosMovil.etiquetaATitulo, tituloASubtitulo: datosMovil.tituloASubtitulo, subtituloALead: datosMovil.subtituloALead, h1Visibles: datosMovil.h1Visibles }, null, 1));
console.log('desborde móvil', await movil.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth })));
await movil.locator('#view-project .view-head').screenshot({ path: 'evidencias/encabezado-ficha-movil.png' });

/* encabezado de un área: no debe haber cambiado */
const area = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
await area.goto('http://localhost:8000/#/area/dashboards', { waitUntil: 'networkidle' });
await area.waitForTimeout(1500);
const areaDatos = await area.evaluate(() => {
  const h2 = document.querySelector('#view-area .view-head h2');
  const eyebrow = document.querySelector('#view-area .view-head .eyebrow');
  const s = h2 ? getComputedStyle(h2) : null;
  const e = eyebrow ? getComputedStyle(eyebrow) : null;
  return {
    nivel: h2 ? h2.tagName : null,
    titulo: `${s?.fontSize} ${s?.color}`,
    etiqueta: `${e?.fontSize} ${e?.textTransform} ${e?.letterSpacing}`,
  };
});
console.log('área intacta:', JSON.stringify(areaDatos));

await navegador.close();
console.log('revisión lista');
