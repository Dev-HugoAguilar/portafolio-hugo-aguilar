import { chromium } from 'playwright';
const navegador = await chromium.launch({ channel: 'chrome' });
const medir = async (p) => p.evaluate(() => {
  const r = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), h: +b.height.toFixed(1) }; };
  const hero = document.querySelector('#page-about .about-hero');
  const intro = document.querySelector('#page-about .about-intro');
  const eyebrow01 = intro.querySelector('.eyebrow');
  const svg = document.querySelector('#network-sobre-mi');
  const nodos = [...svg.querySelectorAll('.net-nodes circle')].map((c) => c.getBoundingClientRect());
  const dibujo = { top: +Math.min(...nodos.map((b) => b.top)).toFixed(1), bottom: +Math.max(...nodos.map((b) => b.bottom)).toFixed(1), left: +Math.min(...nodos.map((b) => b.left)).toFixed(1), right: +Math.max(...nodos.map((b) => b.right)).toFixed(1) };
  const primero = document.querySelector('#page-about .about-hero + .about-block');
  const eyebrow02 = primero.querySelector('.eyebrow');
  const sHero = getComputedStyle(hero);
  return {
    alineacion: sHero.alignItems,
    viewBox: svg.getAttribute('viewBox'),
    eyebrow01: r(eyebrow01),
    svgCaja: r(svg),
    dibujo,
    huecoArribaSvg: +(dibujo.top - r(svg).top).toFixed(1),
    desfaseEyebrowVsDibujo: +(eyebrow01.getBoundingClientRect().top - dibujo.top).toFixed(1),
    hero: r(hero),
    bordeHero: sHero.borderBottomWidth,
    intro: r(intro),
    bloque02: r(primero),
    bordeBloque: getComputedStyle(primero).borderTopWidth,
    margenBloque: getComputedStyle(primero).marginTop,
    paddingBloque: getComputedStyle(primero).paddingTop,
    eyebrow02: r(eyebrow02),
    contenidoMasBajo: +Math.max(r(intro).bottom, dibujo.bottom).toFixed(1),
  };
});
for (const [nombre, vp] of [['escritorio', { width: 1440, height: 900 }], ['móvil', { width: 390, height: 844 }]]) {
  const p = await navegador.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await p.goto('http://localhost:8000/#/sobre-mi', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);
  const d = await medir(p);
  console.log(`=== ${nombre} ===`);
  console.log(JSON.stringify(d, null, 1));
  console.log('contenido→separador:', +(d.bloque02.top - d.contenidoMasBajo).toFixed(1), '| separador→02:', +(d.eyebrow02.top - d.bloque02.top).toFixed(1));
  await p.close();
}
await navegador.close();
