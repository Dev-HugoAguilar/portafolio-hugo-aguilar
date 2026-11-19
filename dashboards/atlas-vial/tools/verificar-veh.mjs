import { chromium } from "@playwright/test";
const API = "http://127.0.0.1:8010/api/v1/atlas-vial";
const p2 = await (await fetch(`${API}/personas`)).json();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
await p.goto("http://127.0.0.1:8000/#/area/dashboards/atlas-vial", { waitUntil: "domcontentloaded" });
await p.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await p.getByRole("tab", { name: /Personas y veh/i }).click();
await p.waitForSelector("[data-testid=panel-vehiculos] .at-veh-lienzo", { timeout: 60000 });
await p.waitForTimeout(1800);
const bloque = p.locator("[data-testid=panel-vehiculos]");
await bloque.scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
await bloque.screenshot({ path: "evidencias/personas/vehiculos-volumen-columnas.png" });
const volumen = await p.evaluate(() => {
  const panel = document.querySelector("[data-testid=panel-vehiculos]");
  return {
    filas: panel.querySelectorAll(".at-veh-nombre").length,
    columnas: [...panel.querySelectorAll(".at-veh-cambios li")].slice(0, 3).map((li) => li.textContent.replace(/\s+/g, " ").trim()),
    vista: panel.querySelector(".at-seg.is-activa")?.textContent?.trim(),
  };
});
await bloque.getByRole("button", { name: "Cambio entre periodos" }).click();
await p.waitForTimeout(500);
await bloque.screenshot({ path: "evidencias/personas/vehiculos-cambio.png" });
const cambio = await p.evaluate(() => {
  const svg = document.querySelector("[data-testid=panel-vehiculos] .at-veh-area svg");
  const ticks = [...svg.querySelectorAll("text")].map((t) => t.textContent).filter((t) => t.includes("%"));
  return { ticks, puntos: svg.querySelectorAll("circle").length };
});
console.log(JSON.stringify({ volumen, cambio, totalHechos: p2.total_hechos }));
await b.close();
