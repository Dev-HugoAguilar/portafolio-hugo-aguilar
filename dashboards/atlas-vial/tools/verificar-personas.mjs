import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
p.on("pageerror", (e) => console.log("PAGEERR", String(e).slice(0, 200)));
await p.goto("http://127.0.0.1:8000/#/area/dashboards/atlas-vial", { waitUntil: "domcontentloaded" });
await p.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await p.getByRole("tab", { name: /Personas y veh/i }).click();
await p.waitForSelector("[data-testid=panel-posiciones] svg", { timeout: 60000 });
await p.waitForTimeout(1500);
const bloque = p.locator("[data-testid=panel-posiciones]");
await bloque.scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
await bloque.screenshot({ path: "evidencias/personas/posiciones-tipo-persona.png" });
// Verificación: identidad de conexiones + totales
const info = await p.evaluate(() => {
  const svg = document.querySelector("[data-testid=panel-posiciones] svg");
  const textos = [...svg.querySelectorAll("text")].map((t) => t.textContent ?? "");
  const lineas = [...svg.querySelectorAll("line")].map((l) => ({
    x1: Number(l.getAttribute("x1")),
    y1: Number(l.getAttribute("y1")),
    x2: Number(l.getAttribute("x2")),
    y2: Number(l.getAttribute("y2")),
  }));
  const filas = Number(svg.getAttribute("height"));
  const altas = lineas.filter((l) => Math.abs(l.y1 - l.y2) > 1).length;
  return { textos: textos.length, lineas: lineas.length, lineasConCambioDePosicion: altas, alto: filas };
});
const filasApi = await (await fetch("http://127.0.0.1:8010/api/v1/atlas-vial/personas")).json();
const sumaHechos = filasApi.por_tipo_usuario.reduce((a, f) => a + f.hechos, 0);
const sumaLes = filasApi.por_tipo_usuario.reduce((a, f) => a + f.lesionadas, 0);
const sumaFal = filasApi.por_tipo_usuario.reduce((a, f) => a + f.fallecidas, 0);
console.log(JSON.stringify({ info, sumaHechos, sumaLes, sumaFal, totalHechos: filasApi.total_hechos, categorias: filasApi.por_tipo_usuario.length }));
await b.close();
