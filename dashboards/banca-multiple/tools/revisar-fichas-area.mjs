import { chromium } from 'playwright';

const EV = 'evidencias/';
const errores = [];
const navegador = await chromium.launch({ channel: 'chrome' });

const d = await navegador.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
d.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
d.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

await d.goto('http://localhost:8000/#/area/dashboards', { waitUntil: 'networkidle' });
await d.waitForTimeout(700);
await d.locator('.project-list').scrollIntoViewIfNeeded();
await d.waitForTimeout(500);
await d.locator('.project-list').screenshot({ path: EV + 'area-proyectos.png' });

const datos = await d.evaluate(() => {
  const fichas = [...document.querySelectorAll('.project-list > li')].map((li) => {
    const cover = li.querySelector('.cover');
    const img = li.querySelector('.cover img');
    const h3 = li.querySelector('h3');
    const meta = li.querySelector('.card-meta');
    const hit = li.querySelector('.card-hit');
    const cb = cover.getBoundingClientRect();
    const hb = h3.getBoundingClientRect();
    const ib = img ? img.getBoundingClientRect() : null;
    return {
      titulo: h3.textContent.trim(),
      categoria: meta.textContent.trim().replace(/\s+/g, ' '),
      enlaces: li.querySelectorAll('a').length,
      href: hit.getAttribute('href'),
      nombreAccesible: hit.getAttribute('aria-labelledby'),
      cover: { w: Math.round(cb.width), h: Math.round(cb.height), ratio: +(cb.width / cb.height).toFixed(4) },
      img: ib ? { w: Math.round(ib.width), h: Math.round(ib.height), ratio: +(ib.width / ib.height).toFixed(4) } : null,
      natural: img ? img.naturalWidth + 'x' + img.naturalHeight : null,
      objFit: img ? getComputedStyle(img).objectFit : null,
      tituloY: Math.round(hb.top),
      oscuro: getComputedStyle(li.querySelector('.card')).backgroundColor
    };
  });
  const grid = getComputedStyle(document.querySelector('.project-list'));
  return {
    fichas,
    columnas: grid.gridTemplateColumns,
    gap: grid.gap,
    negro: document.querySelectorAll('.app-ficha, .app-preview, .app-duo, .project-row').length,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
});
console.log('fichas:', JSON.stringify(datos, null, 1));

/* Interacción: borde y flecha al pasar el cursor */
const primera = d.locator('.project-list > li').first();
const cob = await primera.locator('.cover').boundingBox();
await d.mouse.move(cob.x + cob.width / 2, cob.y + 40);
await d.waitForTimeout(260);
console.log('hover:', JSON.stringify(await d.evaluate(() => {
  const li = document.querySelector('.project-list > li');
  const cover = li.querySelector('.cover');
  const arrow = li.querySelector('.card-arrow');
  const h3 = li.querySelector('h3');
  return {
    borde: getComputedStyle(cover).borderColor,
    flecha: getComputedStyle(arrow).transform + ' / ' + getComputedStyle(arrow).opacity,
    titulo: getComputedStyle(h3).color
  };
})));
await d.locator('.project-list > li').first().screenshot({ path: EV + 'area-ficha-hover.png' });

/* Foco de teclado sobre la ficha */
await d.locator('.project-list .card-hit').first().focus();
await d.waitForTimeout(200);
await d.locator('.project-list > li').first().screenshot({ path: EV + 'area-ficha-foco.png' });

/* Abrir el proyecto desde la imagen/tarjeta y volver */
await d.locator('.project-list .card-hit').first().click();
await d.waitForTimeout(1400);
console.log('proyecto:', JSON.stringify(await d.evaluate(() => ({
  vista: document.body.getAttribute('data-vista'),
  titulo: (document.querySelector('#view-project h2') || {}).textContent || null,
  tablero: Boolean(document.querySelector('.bm-app'))
}))));
await d.goBack();
await d.waitForTimeout(800);
console.log('vuelta:', JSON.stringify(await d.evaluate(() => document.body.getAttribute('data-vista'))));

/* Móvil */
const m = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errores.push('movil: ' + e.message));
await m.goto('http://localhost:8000/#/area/dashboards', { waitUntil: 'networkidle' });
await m.waitForTimeout(600);
await m.locator('.project-list').scrollIntoViewIfNeeded();
await m.waitForTimeout(400);
await m.locator('.project-list').screenshot({ path: EV + 'area-proyectos-movil.png' });
console.log('móvil:', JSON.stringify(await m.evaluate(() => {
  const grid = document.querySelector('.project-list');
  return {
    columnas: getComputedStyle(grid).gridTemplateColumns,
    fichas: document.querySelectorAll('.project-list > li').length,
    cover: (() => { const c = document.querySelector('.project-list .cover').getBoundingClientRect(); return { w: Math.round(c.width), h: Math.round(c.height) }; })(),
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})));

console.log('errores:', JSON.stringify(errores));
await navegador.close();
