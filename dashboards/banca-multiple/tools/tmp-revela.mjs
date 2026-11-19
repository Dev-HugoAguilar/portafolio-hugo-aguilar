import { chromium } from 'playwright';
const navegador = await chromium.launch({ channel: 'chrome' });
const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
const errores = [];
p.on('pageerror', (e) => errores.push(String(e)));
await p.goto('http://localhost:8000/#/area/dashboards', { waitUntil: 'networkidle' });
await p.waitForTimeout(1600);

const caja = await p.evaluate(() => {
  const b = document.querySelector('.tarjeta').getBoundingClientRect();
  const s = getComputedStyle(document.querySelector('.tarjeta'));
  return { x: b.left, y: b.top + window.scrollY, w: b.width, h: b.height, radio: s.borderRadius, borde: s.borderTopColor, fondo: s.backgroundColor, ratio: +(b.width / b.height).toFixed(3) };
});
console.log('tarjeta:', JSON.stringify(caja));

const estado = () => p.evaluate(() => {
  const t = document.querySelector('.tarjeta');
  const panel = t.querySelector('.tarjeta-panel');
  const enlace = t.querySelector('.tarjeta-enlace');
  const desc = t.querySelector('.tarjeta-descripcion');
  const s = getComputedStyle(panel);
  return {
    revelado: t.classList.contains('is-revelado'),
    clip: s.clipPath,
    origen: [t.style.getPropertyValue('--origen-x'), t.style.getPropertyValue('--origen-y'), t.style.getPropertyValue('--radio')],
    descripcionOpacidad: getComputedStyle(desc).opacity,
    enlaceOpacidad: getComputedStyle(enlace).opacity,
    enlaceTabindex: enlace.getAttribute('tabindex'),
    ariaOculto: panel.getAttribute('aria-hidden'),
    duracion: s.transitionDuration,
  };
});

/* estado inicial */
console.log('inicial:', JSON.stringify(await estado()));

/* entrada del cursor por un punto concreto (esquina superior izquierda de la tarjeta) */
await p.mouse.move(caja.x + 60, caja.y + 40 + (await p.evaluate(() => 0)));
await p.waitForTimeout(120);
console.log('a mitad del revelado:', JSON.stringify(await estado()));
await p.waitForTimeout(600);
console.log('revelado:', JSON.stringify(await estado()));

/* salida rápida y reentrada */
await p.mouse.move(caja.x - 20, caja.y + 40);
await p.waitForTimeout(150);
console.log('saliendo:', JSON.stringify(await estado()));
await p.mouse.move(caja.x + 300, caja.y + 120);
await p.waitForTimeout(700);
const reentrada = await estado();
console.log('reentrada:', JSON.stringify(reentrada));

/* el enlace del revelado funciona */
await p.locator('.tarjeta-enlace').click();
await p.waitForTimeout(1200);
console.log('tras clic en «Ir al tablero»:', await p.evaluate(() => ({ hash: window.location.hash, titulo: document.querySelector('#project-view-title')?.textContent })));
console.log('errores:', errores);
await navegador.close();
