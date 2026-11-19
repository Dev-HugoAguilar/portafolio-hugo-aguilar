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
// Cambiar métrica desde la matriz horaria y comprobar sincronía
const kpiAntes = await p.locator(".at-kpi-valor").first().innerText();
await p.locator("[data-testid=panel-matriz]").getByRole("button", { name: "Fallecidas" }).click();
await p.waitForTimeout(500);
const activasHoraria = await p.locator("[data-testid=panel-matriz] .at-seg.is-activa").innerText();
const activasCirculos = await p.locator("[data-testid=panel-entorno] .at-seg.is-activa").innerText();
const leyendaHoraria = await p.locator(".at-matriz-leyenda-unidad").innerText();
const kpiDespues = await p.locator(".at-kpi-valor").first().innerText();
const unidadCirculos = await p.locator("[data-testid=panel-entorno] .at-mx-leyenda-nota").innerText();
await p.locator("[data-testid=panel-matriz]").screenshot({ path: "evidencias/tiempo/sincronia-fallecidas-horaria.png" });
await p.locator("[data-testid=panel-entorno]").screenshot({ path: "evidencias/tiempo/sincronia-fallecidas-circulos.png" });
// Volver a cambiar desde los círculos
await p.locator("[data-testid=panel-entorno]").getByRole("button", { name: "Lesionadas" }).click();
await p.waitForTimeout(500);
const activasHoraria2 = await p.locator("[data-testid=panel-matriz] .at-seg.is-activa").innerText();
const leyenda2 = await p.locator(".at-matriz-leyenda-unidad").innerText();
const leyendaCirculos = await p.locator("[data-testid=panel-entorno] .at-mx-leyenda").innerText();
console.log(JSON.stringify({ kpiAntes, kpiDespues, activasHoraria, activasCirculos, leyendaHoraria, unidadCirculos, activasHoraria2, leyenda2, leyendaCirculos: leyendaCirculos.replace(/\s+/g, " ").slice(0, 90) }));
await b.close();
