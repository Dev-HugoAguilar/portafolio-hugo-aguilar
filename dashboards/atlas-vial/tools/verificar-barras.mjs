import { chromium } from "@playwright/test";
const API = "http://127.0.0.1:8010/api/v1/atlas-vial";
const datos = await (await fetch(`${API}/tiempo?agregacion=mes`)).json();
const series = datos.cruces.interseccion_semaforo.series;
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto("http://127.0.0.1:8000/#/area/dashboards/atlas-vial", { waitUntil: "domcontentloaded" });
await p.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await p.getByRole("tab", { name: /Tiempo y entorno vial/i }).click();
await p.waitForSelector("[data-testid=panel-semaforo] .at-div-fila", { timeout: 60000 });
await p.waitForTimeout(1500);
const bloque = p.locator("[data-testid=panel-semaforo]");
await bloque.scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
// 1) reposo
await bloque.screenshot({ path: "evidencias/tiempo/barras-cantidad-reposo.png" });
// 2) explorada (hover) en Cantidad
const fila = bloque.locator(".at-div-fila").nth(2);
const caja = await fila.boundingBox();
await p.mouse.move(caja.x + 40, caja.y + 10);
await p.waitForTimeout(300);
await bloque.screenshot({ path: "evidencias/tiempo/barras-cantidad-explorada.png" });
// medidas de escala: anchos reales vs valores
const medidas = await bloque.locator(".at-div-fila svg").evaluateAll((nodos) =>
  nodos.map((svg) => ({
    sin: Number(svg.querySelectorAll("rect")[0].getAttribute("width")),
    con: Number(svg.querySelectorAll("rect")[1].getAttribute("width")),
    centro: Number(svg.querySelector("line").getAttribute("x1")),
    ancho: Number(svg.getAttribute("width")),
    origenSin: Number(svg.querySelectorAll("rect")[0].getAttribute("x")),
  })),
);
const maxCon = Math.max(...series.map((f) => f.con));
const maxSin = Math.max(...series.map((f) => f.sin));
const M = Math.max(maxCon, maxSin);
const esperado = (valor) => (valor / M) * (medidas[0].ancho / 2 - 48);
const errores = series.map((filaDatos, i) => ({
  etiqueta: filaDatos.etiqueta,
  con: filaDatos.con,
  ancho: Math.round(medidas[i].con),
  esperado: Math.round(esperado(filaDatos.con)),
}));
const proporcionOk = errores.every((e) => Math.abs(e.ancho - e.esperado) <= 1);
const origenOk = medidas.every(
  (m) => Math.abs(m.origenSin + m.sin - m.centro) <= 1 && Math.abs(m.centro - m.ancho / 2) <= 1,
);
// ratio 6271 vs 72 (valores pedidos) sobre la misma escala
const ratio = (6271 / 72);
const fila6271 = series.findIndex((f) => f.con === 6271 || f.sin === 6271);
const fila72 = series.findIndex((f) => f.con === 72 || f.sin === 72);
const ratioReal = fila6271 >= 0 && fila72 >= 0
  ? Number((Math.max(medidas[fila6271].con, medidas[fila6271].sin) / Math.max(medidas[fila72].con, medidas[fila72].sin)).toFixed(1))
  : null;
console.log(JSON.stringify({ proporcionOk, origenOk, ratioValores: Number(ratio.toFixed(1)), ratioAnchos: ratioReal, errores: errores.slice(0, 3) }));
// 3) explorada en Composición %
await bloque.getByRole("button", { name: "Composición %" }).click();
await p.waitForTimeout(500);
const caja2 = await bloque.locator(".at-div-fila").nth(2).boundingBox();
await p.mouse.move(caja2.x + 40, caja2.y + 10);
await p.waitForTimeout(300);
await bloque.screenshot({ path: "evidencias/tiempo/barras-porcentaje-explorada.png" });
// 4) sin tarjeta inferior + texto de detalle correcto
const tarjeta = await p.locator("[data-testid=barras-tooltip]").count();
const detalle = await p.locator("[data-testid=detalle-fila-2]").innerText();
const porcentajes = series[2];
const den = porcentajes.con + porcentajes.sin;
console.log(JSON.stringify({ tarjetaInferior: tarjeta, detalle, denominador: den, sin: porcentajes.sin, con: porcentajes.con }));
// 5) móvil
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.goto("http://127.0.0.1:8000/#/area/dashboards/atlas-vial", { waitUntil: "domcontentloaded" });
await m.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await m.getByRole("tab", { name: /Tiempo y entorno vial/i }).click();
await m.waitForSelector("[data-testid=panel-semaforo] .at-div-fila", { timeout: 60000 });
await m.waitForTimeout(1500);
const y = await m.evaluate(() => {
  const n = document.querySelector("[data-testid=panel-semaforo]");
  return Math.max(0, n.getBoundingClientRect().top + window.scrollY - 10);
});
await m.evaluate((d) => window.scrollTo(0, d), y);
await m.waitForTimeout(400);
await m.locator(".at-div-fila").nth(2).hover();
await m.waitForTimeout(300);
await m.screenshot({ path: "evidencias/tiempo/barras-movil-explorada.png" });
console.log(JSON.stringify({ movilDocumento: await m.evaluate(() => document.documentElement.scrollWidth) }));
await b.close();
