import { chromium } from "@playwright/test";
const API = "http://127.0.0.1:8010/api/v1/atlas-vial";
const t = await (await fetch(`${API}/tiempo?agregacion=mes`)).json();
const s = t.cruces.interseccion_semaforo;
const resumen = await (await fetch(`${API}/resumen`)).json();
const suma = (clave, lado) => s.series.reduce((a, f) => a + f.medidas[lado][clave], 0);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto("http://127.0.0.1:8000/#/area/dashboards/atlas-vial", { waitUntil: "domcontentloaded" });
await p.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await p.getByRole("tab", { name: /Tiempo y entorno vial/i }).click();
await p.waitForSelector("[data-testid=panel-semaforo] .at-div-fila", { timeout: 60000 });
await p.waitForTimeout(1500);
const kpiA = await p.locator(".at-kpi-valor").first().innerText();
const barras = p.locator("[data-testid=panel-semaforo]");
// Cambiar a Fallecidas desde la gráfica de barras
await barras.getByRole("button", { name: "Fallecidas" }).click();
await p.waitForTimeout(500);
const caps = {
  horaria: await p.locator("[data-testid=panel-matriz] .at-seg.is-activa").innerText(),
  circulos: await p.locator("[data-testid=panel-entorno] .at-seg.is-activa").innerText(),
  barras: await barras.locator(".at-seg.is-activa").first().innerText(),
};
const kpiB = await p.locator(".at-kpi-valor").first().innerText();
const ejeFallecidas = await barras.locator(".at-div-eje-etq").innerText();
const cabFallecidas = await barras.locator(".at-div-cab-eje").innerText();
// Composición % en Fallecidas
await barras.getByRole("button", { name: "Composición %" }).click();
await p.waitForTimeout(400);
const fila0 = await barras.locator(".at-div-fila").first().boundingBox();
await p.mouse.move(fila0.x + 40, fila0.y + 10);
await p.waitForTimeout(300);
const detalleFallecidas = await p.locator("[data-testid=detalle-fila-0]").innerText();
const med0 = s.series[0].medidas;
const denEsperado = med0.con.fallecidas + med0.sin.fallecidas;
barras && (await barras.scrollIntoViewIfNeeded());
await p.waitForTimeout(300);
await barras.screenshot({ path: "evidencias/tiempo/barras-fallecidas-composicion.png" });
// Lesionadas / Cantidad
await barras.getByRole("button", { name: "Lesionadas" }).click();
await p.waitForTimeout(300);
await barras.getByRole("button", { name: "Cantidad" }).click();
await p.waitForTimeout(500);
const ejeLesionadas = await barras.locator(".at-div-eje-etq").innerText();
const anchos = await barras.locator(".at-div-fila svg").evaluateAll((nodos) => nodos.map((svg) => Number(svg.querySelectorAll("rect")[1].getAttribute("width"))));
const maxApi = Math.max(...s.series.map((f) => f.medidas.con.lesionadas));
await barras.screenshot({ path: "evidencias/tiempo/barras-lesionadas-cantidad.png" });
// Tres selectores sincronizados (captura conjunta)
await p.locator("[data-testid=panel-matriz]").scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
const sinTarjeta = await p.locator("[data-testid=barras-tooltip]").count();
const url = p.url();
console.log(JSON.stringify({
  sumas: { hechos: [suma("hechos","con"), suma("hechos","sin"), suma("hechos","sin_dato")], lesionadas: [suma("lesionadas","con"), suma("lesionadas","sin"), suma("lesionadas","sin_dato")], fallecidas: [suma("fallecidas","con"), suma("fallecidas","sin"), suma("fallecidas","sin_dato")] },
  kpi: [resumen.indicadores.hechos.valor, resumen.indicadores.personas_lesionadas.valor, resumen.indicadores.personas_fallecidas.valor],
  kpiA, kpiB, caps, ejeFallecidas, cabFallecidas, ejeLesionadas,
  detalleFallecidas, denEsperado, denDetalleOk: detalleFallecidas.includes(String(denEsperado).replace(/\B(?=(\d{3})+(?!\d))/g, ",")),
  proporcionLesionadas: anchos.map((a, i) => Math.abs(a - (s.series[i].medidas.con.lesionadas / maxApi) * (anchos[0] / (s.series[0].medidas.con.lesionadas / maxApi)))).every((d) => d <= 2),
  sinTarjeta, url,
}));
await b.close();

