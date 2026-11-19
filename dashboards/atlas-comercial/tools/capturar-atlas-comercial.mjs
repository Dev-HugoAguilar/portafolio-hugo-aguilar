/** Capturas reales del tablero con datos M5 (escritorio y móvil). */
import { chromium } from "@playwright/test";

const RUTA = "http://127.0.0.1:8000/?ac_pantalla=exploracion#/area/ciencia-de-datos/atlas-comercial";
const EV = "../../evidencias/comercial";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message.slice(0, 140)));
p.on("console", (m) => { if (m.type() === "error") errores.push(m.text().slice(0, 140)); });

await p.goto(RUTA, { waitUntil: "domcontentloaded" });
await p.waitForSelector(".ac-rejilla-tiendas svg", { timeout: 120000 });
await p.waitForTimeout(2500);
await p.evaluate(() => {
  const app = document.querySelector(".ac-app");
  if (app) window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 92));
});
await p.waitForTimeout(500);
await p.locator(".ac-app").screenshot({ path: `${EV}/pulso-escritorio.png` });
await p.screenshot({ path: `${EV}/pulso-escritorio-viewport.png` });

await p.locator('[data-pantalla="resultados"]').click();
await p.waitForSelector(".ac-corte", { timeout: 120000, state: "attached" });
await p.waitForTimeout(1200);
await p.locator(".ac-app").screenshot({ path: `${EV}/futuro-escritorio.png` });

const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(RUTA, { waitUntil: "domcontentloaded" });
await m.waitForSelector(".ac-rejilla-tiendas svg", { timeout: 120000 });
await m.waitForTimeout(2200);
await m.evaluate(() => {
  const app = document.querySelector(".ac-app");
  if (app) window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 80));
});
await m.waitForTimeout(400);
await m.screenshot({ path: `${EV}/pulso-movil.png` });
const movil = await m.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  paneles: document.querySelectorAll(".ac-mini").length,
}));

console.log(JSON.stringify({
  movil,
  errores,
  capturas: ["pulso-escritorio.png", "pulso-escritorio-viewport.png", "futuro-escritorio.png", "pulso-movil.png"],
}, null, 1));
await b.close();
