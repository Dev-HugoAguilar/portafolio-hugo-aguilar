/** Capturas reales del incremento (escritorio y móvil) con M5 publicado. */
import { chromium } from "@playwright/test";

const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const SITIO = `http://127.0.0.1:8000/?ac_pantalla=exploracion${HASH}`;
const conQuery = (q) => `http://127.0.0.1:8000/?ac_pantalla=exploracion${q ? `&${q}` : ""}${HASH}`;
const EV = "../../evidencias/comercial";

const b = await chromium.launch();

const escritorio = await b.newPage({ viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 2 });
await escritorio.goto(SITIO, { waitUntil: "domcontentloaded" });
await escritorio.waitForSelector(".ac-tarjetas .ac-tarjeta", { timeout: 180000 });
await escritorio.waitForSelector(".ac-hx-centro svg", { timeout: 180000 });
await escritorio.waitForTimeout(2400);

await escritorio.locator(".ac-panorama").screenshot({ path: `${EV}/territorio-panorama.png` });
await escritorio.locator(".ac-composicion").screenshot({ path: `${EV}/territorio-composicion.png` });
await escritorio.locator(".ac-historico").screenshot({ path: `${EV}/territorio-historico-semana.png` });

await escritorio.getByRole("button", { name: "Acumulado del año", exact: true }).click();
await escritorio.waitForTimeout(1800);
await escritorio.locator(".ac-historico").screenshot({ path: `${EV}/territorio-historico-acumulado.png` });

await escritorio.goto(conQuery("ac_estado=CA&ac_tienda=CA_1&ac_dept=FOODS_1"), { waitUntil: "domcontentloaded" });
await escritorio.waitForSelector('[data-testid="explorador-productos"]', { timeout: 180000 });
await escritorio.waitForTimeout(2200);
await escritorio.locator('[data-testid="seccion-productos"]').screenshot({ path: `${EV}/territorio-productos.png` });

/* Vista completa del tablero, sin recortes de cabecera pegajosa. */
const completo = await b.newPage({ viewport: { width: 1360, height: 2400 }, deviceScaleFactor: 1 });
await completo.goto(SITIO, { waitUntil: "domcontentloaded" });
await completo.waitForSelector(".ac-hx-centro svg", { timeout: 180000 });
await completo.waitForTimeout(2600);
await completo.locator(".ac-app").screenshot({ path: `${EV}/territorio-tablero.png` });

/* Móvil: panorama, histórico y productos. */
const movil = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await movil.goto(SITIO, { waitUntil: "domcontentloaded" });
await movil.waitForSelector(".ac-hx-centro svg", { timeout: 180000 });
await movil.waitForTimeout(2600);
await movil.locator(".ac-panorama").screenshot({ path: `${EV}/territorio-movil-panorama.png` });
await movil.locator(".ac-historico").screenshot({ path: `${EV}/territorio-movil-historico.png` });
await movil.locator(".ac-composicion").screenshot({ path: `${EV}/territorio-movil-composicion.png` });

await movil.goto(conQuery("ac_estado=CA&ac_tienda=CA_1&ac_dept=FOODS_1"), { waitUntil: "domcontentloaded" });
await movil.waitForSelector('[data-testid="explorador-productos"]', { timeout: 180000 });
await movil.waitForTimeout(2400);
await movil.locator('[data-testid="seccion-productos"]').screenshot({ path: `${EV}/territorio-movil-productos.png` });

const metricas = await movil.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
await b.close();
console.log(JSON.stringify({ capturas: "listas", movil: metricas }));
