import { chromium } from 'playwright';

const RUTA = 'http://localhost:8000/#/area/dashboards';
const EV = 'evidencias/';
const navegador = await chromium.launch({ channel: 'chrome' });

const d = await navegador.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await d.goto(RUTA, { waitUntil: 'networkidle' });
await d.waitForTimeout(700);
const duo = d.locator('.app-duo');
await duo.scrollIntoViewIfNeeded();
await d.waitForTimeout(400);

/* Reposo, recorte de la zona del enlace al pie de la ficha */
await d.locator('.app-ficha-pie').screenshot({ path: EV + 'duo-ficha-pie.png' });

/* Escaneo: recorte de la franja alrededor de la línea a mitad del recorrido */
await d.locator('.app-preview').hover();
await d.waitForTimeout(560);
const caja = await d.evaluate(() => {
  const m = document.querySelector('.app-preview-marco').getBoundingClientRect();
  const l = document.querySelector('.app-preview-linea').getBoundingClientRect();
  return {
    x: Math.round(m.left), y: Math.round(l.top - 110),
    width: Math.round(m.width), height: 220
  };
});
await d.screenshot({ path: EV + 'duo-escaneo-detalle.png', clip: caja });
console.log('franja', JSON.stringify(caja));
await navegador.close();
console.log('listo');
