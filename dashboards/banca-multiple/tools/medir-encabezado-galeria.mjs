import { chromium } from 'playwright';

const navegador = await chromium.launch({ channel: 'chrome' });
const p = await navegador.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await p.locator('#view-gallery .section-head').scrollIntoViewIfNeeded();
await p.waitForTimeout(500);

const datos = await p.evaluate(() => {
  const head = document.querySelector('#view-gallery .section-head');
  const izq = head.firstElementChild;
  const eyebrow = head.querySelector('.eyebrow');
  const h2 = head.querySelector('h2');
  const intro = head.querySelector('.section-intro');
  const filtros = document.querySelector('.filters');
  const caja = (n) => { const b = n.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; };
  const cs = (n, props) => props.reduce((o, k) => (o[k] = getComputedStyle(n)[k], o), {});
  return {
    head: caja(head),
    align: getComputedStyle(head).alignItems,
    izq: caja(izq),
    eyebrow: caja(eyebrow),
    h2: caja(h2),
    intro: caja(intro),
    filtros: caja(filtros),
    margenes: {
      izq: cs(izq, ['marginTop', 'marginBottom', 'paddingTop']),
      eyebrow: cs(eyebrow, ['marginTop', 'marginBottom', 'fontSize', 'lineHeight']),
      h2: cs(h2, ['marginTop', 'marginBottom', 'fontSize', 'lineHeight']),
      intro: cs(intro, ['marginTop', 'marginBottom', 'fontSize', 'lineHeight']),
      filtros: cs(filtros, ['marginTop'])
    },
    huecoFiltros: +(document.querySelector('.filters').getBoundingClientRect().top - head.getBoundingClientRect().bottom).toFixed(1)
  };
});
console.log(JSON.stringify(datos, null, 1));
await navegador.close();
