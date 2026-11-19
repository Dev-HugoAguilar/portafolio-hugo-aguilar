/**
 * Medición del apartado «Tecnologías» (herramienta temporal).
 */
import { chromium } from 'playwright';

const RUTA = 'http://localhost:8000/#/area/dashboards/comparativo-bancario';
const navegador = await chromium.launch({ channel: 'chrome' });

const medir = async (pagina, etiqueta) => {
  const datos = await pagina.evaluate(() => {
    const lista = document.querySelector('.tec-grupos');
    if (!lista) return { error: 'sin .tec-grupos' };
    const filas = [...lista.querySelectorAll('.tec-row')].map((fila) => {
      const dt = fila.querySelector('.tec-funcion');
      const dd = fila.querySelector('.tec-items');
      const sdt = getComputedStyle(dt);
      const sdd = getComputedStyle(dd);
      const s = getComputedStyle(fila);
      return {
        funcion: dt.textContent.trim(),
        tecnologias: dd.textContent.trim(),
        funcionEstilo: `${sdt.fontSize} w${sdt.fontWeight} ${sdt.color} lh${sdt.lineHeight}`,
        tecnologiasEstilo: `${sdd.fontSize} ${sdd.color} lh${sdd.lineHeight}`,
        caja: `${s.display} ${s.gridTemplateColumns}`,
        relleno: s.padding,
        borde: s.borderTopWidth + ' ' + s.borderTopColor,
        dtTop: +dt.getBoundingClientRect().top.toFixed(1),
        ddTop: +dd.getBoundingClientRect().top.toFixed(1),
        filaTop: +fila.getBoundingClientRect().top.toFixed(1),
        filaBottom: +fila.getBoundingClientRect().bottom.toFixed(1),
      };
    });
    const pildoras = lista.querySelectorAll('.tag, .chip').length;
    return { filas, pildoras };
  });
  console.log(`\n=== ${etiqueta} ===`);
  console.log(JSON.stringify(datos, null, 1));
  if (datos.filas) {
    for (let i = 1; i < datos.filas.length; i++) {
      const hueco = datos.filas[i].filaTop - datos.filas[i - 1].filaBottom;
      console.log(`  separación de texto entre filas ${i - 1}→${i}: ${hueco.toFixed(1)}px`);
    }
  }
};

const escritorio = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
await escritorio.goto(RUTA, { waitUntil: 'networkidle' });
await escritorio.waitForTimeout(2200);
await medir(escritorio, 'escritorio 1440');
const caja = await escritorio.evaluate(() => {
  const celda = document.querySelector('.field-tecnologias');
  const b = celda.getBoundingClientRect();
  return { x: Math.max(0, b.left - 24), y: b.top + window.scrollY - 24, width: b.width + 48, height: b.height + 48 };
});
await escritorio.screenshot({ path: 'evidencias/tecnologias.png', fullPage: true, clip: caja });

const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await movil.goto(RUTA, { waitUntil: 'networkidle' });
await movil.waitForTimeout(2200);
await medir(movil, 'móvil 390');
const cajaMovil = await movil.evaluate(() => {
  const celda = document.querySelector('.field-tecnologias');
  const b = celda.getBoundingClientRect();
  return { x: 0, y: b.top + window.scrollY - 16, width: window.innerWidth, height: b.height + 32 };
});
await movil.screenshot({ path: 'evidencias/tecnologias-movil.png', fullPage: true, clip: cajaMovil });

await navegador.close();
console.log('\ncapturas listas');
