/** Captura de la ficha: el panel de pronóstico del modelo publicado (corte d_1913). */
import { chromium } from "@playwright/test";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message.slice(0, 140)));
p.on("console", (m) => {
  if (m.type() === "error") errores.push(m.text().slice(0, 140));
});
await p.goto("http://127.0.0.1:8000/?ac_pantalla=exploracion#/area/ciencia-de-datos/atlas-comercial", {
  waitUntil: "domcontentloaded",
});
await p.waitForSelector(".ac-app", { timeout: 90000 });
// Hero de la ficha: el pronóstico de 28 días en «Resultados».
await p.locator('[data-pantalla="resultados"]').click();
/* La curva del total nacional es una vista secundaria colapsable. */
await p.waitForSelector('[data-testid="plan-curva-nacional"] > summary', { timeout: 120000 });
await p.locator('[data-testid="plan-curva-nacional"] > summary').first().click();
await p.waitForSelector(".ac-df-grafico svg", { state: "visible", timeout: 120000 });
await p.waitForTimeout(2200);
await p.evaluate(() => {
  const app = document.querySelector(".ac-app");
  if (app) window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 92));
});
await p.waitForTimeout(400);
await p.locator(".ac-panel").first().screenshot({ path: "../../dist/img/atlas-comercial-modelo.png" });

// Corte histórico y panel de evaluación: «Evaluación».
await p.locator('[data-pantalla="evaluacion"]').click();
await p.waitForSelector("[data-testid=selector-corte-evaluacion]", { timeout: 120000 });
/* Las opciones del selector se rotulan con la fecha del corte; el segundo es el más reciente. */
await p.locator("[data-testid=selector-corte-evaluacion] .at-seg").nth(1).click();
await p.waitForSelector("[data-testid=observado-posterior]", { timeout: 120000 });
await p.waitForTimeout(1600);
await p.locator(".ac-panel", { has: p.locator(".ac-tabla--comparativa") }).first().screenshot({
  path: "../../dist/img/atlas-comercial-evaluacion.png",
});
const medidas = await p.evaluate(() => {
  const primera = document.querySelector(".ac-panel");
  return { ancho: Math.round(primera.getBoundingClientRect().width), alto: Math.round(primera.getBoundingClientRect().height) };
});
console.log(JSON.stringify({ medidas, errores }, null, 1));
await b.close();
