import { chromium } from 'playwright';

const RUTA = 'http://localhost:8000/#/area/dashboards';
const EV = 'evidencias/';
const navegador = await chromium.launch({ channel: 'chrome' });

const medir = (p) => p.evaluate(() => {
  const r = (s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) };
  };
  const img = document.querySelector('.app-preview-img');
  const nat = img ? { w: img.naturalWidth, h: img.naturalHeight } : null;
  return {
    ficha: r('.app-ficha'),
    preview: r('.app-preview'),
    marco: r('.app-preview-marco'),
    img: r('.app-preview-img'),
    banda: r('.app-preview-banda'),
    ctaFicha: r('.app-ficha-cta'),
    ctaPreview: r('.app-preview-cta'),
    natural: nat,
    relacionRender: img && img.naturalWidth ? +(img.getBoundingClientRect().height / img.getBoundingClientRect().width).toFixed(4) : null,
    relacionNatural: nat ? +(nat.h / nat.w).toFixed(4) : null,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    hrefs: [...document.querySelectorAll('.app-duo a')].map((a) => a.getAttribute('href')),
    nitidezClip: (() => {
      const n = document.querySelector('.app-preview-nitidez');
      return n ? getComputedStyle(n).clipPath : null;
    })(),
    fichaFondo: (() => {
      const n = document.querySelector('.app-ficha');
      return n ? getComputedStyle(n).backgroundColor : null;
    })()
  };
});

/* ---------------- Escritorio 1440 ---------------- */
const d = await navegador.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await d.goto(RUTA, { waitUntil: 'networkidle' });
await d.waitForTimeout(700);
const duo = d.locator('.app-duo');
await duo.scrollIntoViewIfNeeded();
await d.waitForTimeout(400);

console.log('REPOSO', JSON.stringify(await medir(d), null, 1));
await duo.screenshot({ path: EV + 'duo-reposo.png' });

/* Escaneo en curso (≈ mitad del recorrido) */
await d.locator('.app-preview').hover();
await d.waitForTimeout(620);
await duo.screenshot({ path: EV + 'duo-escaneo.png' });
const enCurso = await medir(d);
console.log('EN CURSO', JSON.stringify({ clip: enCurso.nitidezClip }));

/* Escaneo terminado */
await d.waitForTimeout(1400);
await duo.screenshot({ path: EV + 'duo-escaneado.png' });
const fin = await medir(d);
console.log('FIN', JSON.stringify({ clip: fin.nitidezClip }));

/* Ratón fuera: vuelve al reposo */
await d.mouse.move(4, 4);
await d.waitForTimeout(500);
const fuera = await medir(d);
console.log('FUERA', JSON.stringify({ clip: fuera.nitidezClip }));

/* Foco de teclado sobre el enlace de la ficha */
await d.locator('.app-ficha-cta').focus();
await d.waitForTimeout(200);
await duo.screenshot({ path: EV + 'duo-teclado-ficha.png' });
await d.locator('.app-preview').focus();
await d.waitForTimeout(700);
await duo.screenshot({ path: EV + 'duo-teclado-preview.png' });

/* ---------------- Móvil 390 ---------------- */
const m = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(RUTA, { waitUntil: 'networkidle' });
await m.waitForTimeout(700);
await m.locator('.app-duo').scrollIntoViewIfNeeded();
await m.waitForTimeout(300);
console.log('MÓVIL', JSON.stringify(await medir(m), null, 1));
await m.locator('.app-duo').screenshot({ path: EV + 'duo-movil.png' });

/* ---------------- Movimiento reducido ---------------- */
const r = await navegador.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
await r.goto(RUTA, { waitUntil: 'networkidle' });
await r.waitForTimeout(600);
await r.locator('.app-duo').scrollIntoViewIfNeeded();
await r.locator('.app-preview').hover();
await r.waitForTimeout(400);
const red = await medir(r);
console.log('REDUCIDO', JSON.stringify({ clip: red.nitidezClip }));
await r.locator('.app-duo').screenshot({ path: EV + 'duo-reducido.png' });

/* ---------------- Captura que no carga: la ficha y el enlace siguen ---------------- */
const f = await navegador.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await f.route('**/img/comparativo-completo.webp', (route) => route.abort());
await f.goto(RUTA, { waitUntil: 'domcontentloaded' });
await f.waitForTimeout(1200);
const fallo = await f.evaluate(() => ({
  ficha: !!document.querySelector('.app-ficha-cta'),
  banda: (document.querySelector('.app-preview-cta') || {}).textContent || null,
  href: (document.querySelector('.app-preview') || {}).getAttribute ? document.querySelector('.app-preview').getAttribute('href') : null
}));
console.log('SIN CAPTURA', JSON.stringify(fallo));

await navegador.close();
console.log('listo');
