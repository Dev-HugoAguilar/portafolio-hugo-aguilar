import { chromium } from 'playwright';

const EV = 'evidencias/';
const n = await chromium.launch({ channel: 'chrome' });
const errs = [];

const p = await n.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => errs.push(e.message));

await p.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);

const leer = () => p.evaluate(() => {
  const h = document.querySelector('.site-header');
  const c = getComputedStyle(h);
  const link = document.querySelector('#nav-portfolio');
  const after = getComputedStyle(link, '::after');
  return {
    p: h.style.getPropertyValue('--hdr-p'),
    fondo: c.backgroundColor,
    desenfoque: c.backdropFilter,
    divisor: c.borderBottomColor,
    alto: +h.getBoundingClientRect().height.toFixed(1),
    linea: { transform: after.transform, color: after.backgroundColor, alto: after.height },
    activo: link.getAttribute('aria-current')
  };
});

console.log('arriba:', JSON.stringify(await leer()));
await p.screenshot({ path: EV + 'cabecera-arriba.png', clip: { x: 0, y: 0, width: 1440, height: 110 } });

await p.evaluate(() => window.scrollTo(0, 40));
await p.waitForTimeout(250);
console.log('40 px:', JSON.stringify(await leer()));

await p.evaluate(() => window.scrollTo(0, 400));
await p.waitForTimeout(350);
console.log('400 px:', JSON.stringify(await leer()));
await p.screenshot({ path: EV + 'cabecera-desplazada.png', clip: { x: 0, y: 0, width: 1440, height: 110 } });

/* Hover y foco en los enlaces */
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(300);
await p.locator('#nav-about').hover();
await p.waitForTimeout(350);
const hover = await p.evaluate(() => {
  const link = document.querySelector('#nav-about');
  const a = getComputedStyle(link, '::after');
  return { transform: a.transform, color: getComputedStyle(link).color };
});
console.log('hover Sobre mí:', JSON.stringify(hover));
await p.screenshot({ path: EV + 'cabecera-hover.png', clip: { x: 700, y: 0, width: 740, height: 100 } });

await p.locator('#nav-about').focus();
await p.keyboard.press('Tab');
await p.waitForTimeout(300);
const foco = await p.evaluate(() => {
  const el = document.activeElement;
  const a = getComputedStyle(el, '::after');
  return {
    etiqueta: el.textContent.trim(),
    contorno: getComputedStyle(el).outlineColor + ' ' + getComputedStyle(el).outlineWidth,
    linea: a.transform
  };
});
console.log('foco de teclado:', JSON.stringify(foco));
await p.screenshot({ path: EV + 'cabecera-foco.png', clip: { x: 700, y: 0, width: 740, height: 100 } });

/* Estado activo: en la vista de área el enlace Portafolio queda marcado */
await p.goto('http://localhost:8000/#/area/dashboards', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
console.log('área:', JSON.stringify(await p.evaluate(() => {
  const l = document.querySelector('#nav-portfolio');
  return { activo: l.getAttribute('aria-current'), linea: getComputedStyle(l, '::after').transform };
})));
await p.screenshot({ path: EV + 'cabecera-activa.png', clip: { x: 700, y: 0, width: 740, height: 100 } });

/* Móvil */
const m = await n.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errs.push('movil: ' + e.message));
await m.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await m.waitForTimeout(700);
await m.screenshot({ path: EV + 'cabecera-movil.png', clip: { x: 0, y: 0, width: 390, height: 100 } });
await m.evaluate(() => window.scrollTo(0, 400));
await m.waitForTimeout(350);
await m.screenshot({ path: EV + 'cabecera-movil-desplazada.png', clip: { x: 0, y: 0, width: 390, height: 100 } });
console.log('móvil:', JSON.stringify(await m.evaluate(() => {
  const h = document.querySelector('.site-header');
  const nav = document.querySelector('.site-nav');
  const b = (x) => x.getBoundingClientRect();
  return {
    alto: Math.round(b(h).height),
    navAncho: Math.round(b(nav).width),
    enlaces: [...nav.querySelectorAll('a')].map((a) => a.textContent.trim() + ' ' + Math.round(b(a).width) + 'px'),
    p: h.style.getPropertyValue('--hdr-p'),
    fondo: getComputedStyle(h).backgroundColor,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})));

/* Movimiento reducido */
const r = await n.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await r.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await r.waitForTimeout(600);
await r.locator('#nav-about').hover();
await r.waitForTimeout(120);
console.log('reducido:', JSON.stringify(await r.evaluate(() => ({
  transicion: getComputedStyle(document.querySelector('#nav-about'), '::after').transitionDuration,
  linea: getComputedStyle(document.querySelector('#nav-about'), '::after').transform
}))));

console.log('errores:', JSON.stringify(errs));
await n.close();
