import { chromium } from 'playwright';

const EV = 'evidencias/';
const navegador = await chromium.launch({ channel: 'chrome' });
const p = await navegador.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });

await p.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const caja = async (sel) => {
  const el = p.locator(sel);
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(200);
  return el.boundingBox();
};
const b1 = await caja('#view-gallery .section-head');
await p.screenshot({ path: EV + 'cmp-galeria-encabezado.png', clip: { x: b1.x - 8, y: b1.y - 8, width: b1.width + 16, height: b1.height + 16 } });
console.log('galería:', JSON.stringify(await p.evaluate(() => {
  const s = document.querySelector('#view-gallery .section-head');
  const h2 = s.querySelector('h2');
  const intro = s.querySelector('.section-intro');
  const eb = s.querySelector('.eyebrow');
  const cs = (n) => { const c = getComputedStyle(n); return { font: c.fontFamily.split(',')[0], size: c.fontSize, weight: c.fontWeight, lh: c.lineHeight, color: c.color, max: c.maxWidth }; };
  return { grid: getComputedStyle(s).gridTemplateColumns, gap: getComputedStyle(s).gap, h2: cs(h2), intro: cs(intro), eyebrow: cs(eb), margenEyebrow: getComputedStyle(eb).marginBottom };
})));

await p.goto('http://localhost:8000/#/area/dashboards', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const b2 = await caja('#view-area .view-head');
await p.screenshot({ path: EV + 'cmp-area-encabezado.png', clip: { x: b2.x - 8, y: b2.y - 8, width: Math.max(b2.width, 900) + 16, height: b2.height + 120 } });
console.log('área:', JSON.stringify(await p.evaluate(() => {
  const s = document.querySelector('#view-area .view-head');
  const h2 = s.querySelector('h2');
  const lead = s.querySelector('.section-intro');
  const eb = s.querySelector('.eyebrow');
  const chips = document.querySelector('#view-area .view-chips');
  const cs = (n) => { const c = getComputedStyle(n); return { font: c.fontFamily.split(',')[0], size: c.fontSize, weight: c.fontWeight, lh: c.lineHeight, color: c.color, max: c.maxWidth, margin: c.margin }; };
  return { ancho: getComputedStyle(s).maxWidth, grid: getComputedStyle(s).gridTemplateColumns, align: getComputedStyle(s).alignItems, h2: cs(h2), lead: cs(lead), eyebrow: cs(eb), chips: cs(chips) };
})));

await navegador.close();
