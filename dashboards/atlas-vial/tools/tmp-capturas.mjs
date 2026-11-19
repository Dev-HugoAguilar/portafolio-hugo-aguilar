import { chromium } from "@playwright/test";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto("http://127.0.0.1:8000/#/area/dashboards/atlas-vial", { waitUntil: "domcontentloaded" });
await p.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await p.getByRole("tab", { name: /Tiempo y entorno vial/i }).click();
await p.waitForSelector("[data-testid=panel-matriz] .at-matriz-celda", { timeout: 60000 });
await p.waitForSelector("[data-testid=panel-entorno] .at-mx-cab-col", { timeout: 60000 });
await p.waitForTimeout(1500);
const serie = await p.locator("[data-testid=panel-serie]").count();
const medidas = await p.evaluate(() => {
  const fila = document.querySelector("[data-testid=panel-matriz] .at-matriz-fila:not(.at-matriz-cabecera)");
  const celda = document.querySelector("[data-testid=panel-matriz] .at-matriz-celda");
  const panel = document.querySelector("[data-testid=panel-matriz]");
  return {
    altoFila: fila ? Math.round(fila.getBoundingClientRect().height) : 0,
    altoCelda: celda ? Math.round(celda.getBoundingClientRect().height) : 0,
    altoPanel: panel ? Math.round(panel.getBoundingClientRect().height) : 0,
    columnas: document.querySelectorAll("[data-testid=panel-matriz] .at-matriz-hora").length,
    dias: document.querySelectorAll("[data-testid=panel-matriz] .at-matriz-dia").length,
    documento: document.documentElement.scrollWidth,
  };
});
console.log(JSON.stringify({ serieTemporal: serie, ...medidas }));
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(400);
await p.screenshot({ path: "evidencias/tiempo/pestana-sin-serie.png" });
await p.locator("[data-testid=panel-matriz]").scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await p.locator("[data-testid=panel-matriz]").screenshot({ path: "evidencias/tiempo/matriz-horaria.png" });
const celdaCaja = await p.locator("[data-testid=panel-matriz] .at-matriz-celda").nth(30).boundingBox();
await p.mouse.move(celdaCaja.x + 4, celdaCaja.y + 4);
await p.waitForTimeout(400);
await p.locator("[data-testid=panel-matriz]").screenshot({ path: "evidencias/tiempo/matriz-horaria-tip.png" });
await p.locator("[data-testid=panel-entorno]").scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
await p.locator("[data-testid=panel-entorno]").getByRole("button", { name: "Mostrar cifras" }).click();
await p.waitForTimeout(400);
await p.locator("[data-testid=panel-entorno]").screenshot({ path: "evidencias/tiempo/matriz-circulos-cifras.png" });
await p.locator("[data-testid=panel-semaforo]").scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
await p.locator("[data-testid=panel-semaforo]").screenshot({ path: "evidencias/tiempo/barras-cantidad.png" });
await p.locator("[data-testid=panel-semaforo]").getByRole("button", { name: "Composición %" }).click();
await p.waitForTimeout(400);
await p.locator("[data-testid=panel-semaforo]").screenshot({ path: "evidencias/tiempo/barras-porcentaje.png" });
const m = await c.newPage();
await m.setViewportSize({ width: 390, height: 844 });
await m.goto("http://127.0.0.1:8000/#/area/dashboards/atlas-vial", { waitUntil: "domcontentloaded" });
await m.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await m.getByRole("tab", { name: /Tiempo y entorno vial/i }).click();
await m.waitForSelector("[data-testid=panel-matriz] .at-matriz-celda", { timeout: 60000 });
await m.waitForTimeout(1500);
const y = await m.evaluate(() => {
  const n = document.querySelector("[data-testid=panel-matriz]");
  return Math.max(0, n.getBoundingClientRect().top + window.scrollY - 10);
});
await m.evaluate((d) => window.scrollTo(0, d), y);
await m.waitForTimeout(500);
await m.screenshot({ path: "evidencias/tiempo/movil-matriz.png" });
const mov = await m.evaluate(() => ({
  documento: document.documentElement.scrollWidth,
  scrollInterno: document.querySelector(".at-matriz-scroll")?.scrollWidth ?? 0,
}));
console.log(JSON.stringify(mov));
await b.close();
