/**
 * Medición de la jerarquía de títulos de la ficha (herramienta temporal).
 *
 * Imprime, para cada apartado: alto del título, separación título → contenido,
 * alto de la celda y separación vertical/horizontal respecto de las vecinas.
 */
import { chromium } from 'playwright';

const RUTA = process.env.RUTA || 'http://localhost:8000/#/area/dashboards/comparativo-bancario';
const navegador = await chromium.launch({ channel: 'chrome' });

const medir = async (pagina, etiqueta) => {
  const datos = await pagina.evaluate(() => {
    const caja = document.querySelector('.project-fields');
    if (!caja) return null;
    const estilo = getComputedStyle(caja);
    const celdas = [...caja.querySelectorAll(':scope > div')].map((div) => {
      const dt = div.querySelector('dt');
      const dd = div.querySelector('dd');
      const r = (n) => {
        const b = n.getBoundingClientRect();
        return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1), left: +b.left.toFixed(1), w: +b.width.toFixed(1) };
      };
      const sdt = getComputedStyle(dt);
      return {
        titulo: dt.textContent.trim(),
        celda: r(div),
        dt: r(dt),
        dd: r(dd),
        separacion: +(dd.getBoundingClientRect().top - dt.getBoundingClientRect().bottom).toFixed(1),
        fuente: `${sdt.fontFamily.split(',')[0]} ${sdt.fontSize} w${sdt.fontWeight} lh${sdt.lineHeight} ls${sdt.letterSpacing} tt${sdt.textTransform} color${sdt.color}`,
      };
    });
    return {
      columnas: estilo.gridTemplateColumns,
      gap: estilo.gap,
      celdas,
    };
  });
  console.log(`\n=== ${etiqueta} ===`);
  if (!datos) {
    console.log('sin .project-fields');
    return;
  }
  console.log('grid-template-columns:', datos.columnas, '| gap:', datos.gap);
  for (const c of datos.celdas) {
    console.log(
      `${c.titulo.padEnd(30)} celda[h=${String(c.celda.h).padStart(6)} top=${String(c.celda.top).padStart(7)}] dt[h=${c.dt.h}] dd[top=${c.dd.top} h=${c.dd.h}] sep=${c.separacion} | ${c.fuente}`
    );
  }
  /* separación entre filas consecutivas (bloques de la misma columna) */
  const orden = [...datos.celdas].sort((a, b) => a.celda.top - b.celda.top || a.celda.left - b.celda.left);
  for (let i = 1; i < orden.length; i++) {
    const prev = orden[i - 1];
    const act = orden[i];
    if (Math.abs(prev.celda.left - act.celda.left) < 2) {
      console.log(`  hueco vertical ${prev.titulo} → ${act.titulo}: ${(act.celda.top - prev.celda.bottom).toFixed(1)}px`);
    }
  }
};

const escritorio = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
await escritorio.goto(RUTA, { waitUntil: 'networkidle' });
await escritorio.waitForTimeout(2200);
await medir(escritorio, 'escritorio 1440');
await escritorio.locator('.project-fields').screenshot({ path: 'evidencias/tmp-ficha-escritorio.png' }).catch(() => {});

const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await movil.goto(RUTA, { waitUntil: 'networkidle' });
await movil.waitForTimeout(2200);
await medir(movil, 'móvil 390');
await movil.locator('.project-fields').screenshot({ path: 'evidencias/tmp-ficha-movil.png' }).catch(() => {});

await navegador.close();
