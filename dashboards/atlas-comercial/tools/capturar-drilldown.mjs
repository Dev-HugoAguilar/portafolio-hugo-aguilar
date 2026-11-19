/** Capturas reales del drill-down en el sitio (viewport, escritorio y móvil). */
import { chromium } from "@playwright/test";

const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const conQuery = (q) => `http://127.0.0.1:8000/?ac_pantalla=exploracion${q ? `&${q}` : ""}${HASH}`;
const EV = "../../evidencias/comercial";

const b = await chromium.launch();

const preparar = async (pagina) => {
  await pagina.evaluate(() => {
    const app = document.querySelector(".ac-app");
    if (app) window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 96));
  });
  await pagina.waitForTimeout(600);
};

/* Escritorio: tiendas, departamentos y productos. */
const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
await p.goto(conQuery(""), { waitUntil: "domcontentloaded" });
await p.waitForSelector(".ac-rejilla-tiendas svg", { timeout: 180000 });
await p.waitForTimeout(1200);
await preparar(p);
await p.screenshot({ path: `${EV}/drill-1-tiendas.png` });

await p.locator('[data-testid="explorar-CA_1"]').click();
await p.waitForSelector('.ac-mini[data-clave="FOODS_1"] svg', { timeout: 120000 });
await p.waitForTimeout(1000);
await preparar(p);
await p.screenshot({ path: `${EV}/drill-2-departamentos.png` });

await p.locator('[data-testid="explorar-FOODS_3"]').click();
await p.waitForSelector(".ac-explorador", { timeout: 120000 });
await p.waitForTimeout(1000);
await preparar(p);
await p.screenshot({ path: `${EV}/drill-3-productos.png` });

/* Buscador en uso: la barra de búsqueda vive en el explorador, siempre visible. */
const buscador = p.locator(".ac-explorador-filtros input[type=search]").first();
await buscador.waitFor({ timeout: 60000 });
await buscador.fill("FOODS_3_090");
await buscador.focus();
await p.waitForTimeout(1400);
await preparar(p);
await p.screenshot({ path: `${EV}/drill-4-buscador.png` });

/* Foco de teclado en un encabezado explorable. */
await p.goto(conQuery("ac_nivel=departamento&ac_tienda=CA_1"), { waitUntil: "domcontentloaded" });
await p.waitForSelector('.ac-mini[data-clave="FOODS_1"] svg', { timeout: 180000 });
await p.waitForTimeout(900);
await p.locator('[data-testid="explorar-FOODS_2"]').focus();
await preparar(p);
await p.screenshot({ path: `${EV}/drill-5-foco-teclado.png` });

/* Móvil. */
const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(conQuery("ac_nivel=departamento&ac_tienda=CA_1"), { waitUntil: "domcontentloaded" });
await m.waitForSelector('.ac-mini[data-clave="FOODS_1"] svg', { timeout: 180000 });
await m.waitForTimeout(1200);
await preparar(m);
await m.screenshot({ path: `${EV}/drill-6-movil.png` });

const dept = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await dept.goto(conQuery("ac_nivel=producto&ac_tienda=CA_1&ac_dept=FOODS_3"), { waitUntil: "domcontentloaded" });
await dept.waitForSelector(".ac-explorador", { timeout: 180000 });
await dept.waitForTimeout(1200);
await preparar(dept);
await dept.screenshot({ path: `${EV}/drill-7-movil-productos.png` });

await b.close();
console.log("capturas listas");
