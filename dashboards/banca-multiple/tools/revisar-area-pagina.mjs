import { chromium } from 'playwright';

const EV = 'evidencias/';
const navegador = await chromium.launch({ channel: 'chrome' });

const d = await navegador.newPage({ viewport: { width: 1440, height: 1150 }, deviceScaleFactor: 2 });
await d.goto('http://localhost:8000/#/area/dashboards', { waitUntil: 'networkidle' });
await d.waitForTimeout(700);
await d.screenshot({ path: EV + 'area-pagina-escritorio.png', fullPage: false });

const m = await navegador.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto('http://localhost:8000/#/area/dashboards', { waitUntil: 'networkidle' });
await m.waitForTimeout(700);
await m.evaluate(() => window.scrollTo(0, 520));
await m.waitForTimeout(400);
await m.screenshot({ path: EV + 'area-pagina-movil.png', fullPage: false });

await navegador.close();
console.log('listo');
