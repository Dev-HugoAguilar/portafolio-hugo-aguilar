import { chromium } from 'playwright';

const navegador = await chromium.launch({ channel: 'chrome' });
const p = await navegador.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:8000/#/area/dashboards', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.screenshot({ path: 'evidencias/duo-pagina-area.png', fullPage: true });
const r = await p.evaluate(() => {
  const filas = [...document.querySelectorAll('.project-list > li')].map((li) => {
    const b = li.getBoundingClientRect();
    return { clase: li.className, w: Math.round(b.width), h: Math.round(b.height) };
  });
  return { filas, desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
console.log(JSON.stringify(r, null, 1));
await navegador.close();
