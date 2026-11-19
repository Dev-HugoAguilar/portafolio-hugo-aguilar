/**
 * Capturas de la versión corregida (auditoría de cobertura, precios y evaluación).
 *
 * Cada captura se toma de la aplicación en vivo, con los estados que el informe afirma:
 * enero de 2011 con 3 días observados de 31, matrices de 2011/2012/2016 con cero, sin dato
 * y fuera del filtro, cobertura de precios desglosada, evaluación de cada corte con dos
 * granos y el pronóstico de 28 días. Escritorio y móvil.
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const EV = "../../evidencias/comercial";
const RUTA = (params) => `${SITIO}/?ac_pantalla=exploracion${params ? `&${params}` : ""}#/area/ciencia-de-datos/atlas-comercial`;

const errores = [];
const navegador = await chromium.launch();

async function abrir(parametros, opciones = {}) {
  const pagina = await navegador.newPage({
    viewport: opciones.viewport ?? { width: 1280, height: 1000 },
    deviceScaleFactor: opciones.escala ?? 2,
  });
  pagina.on("pageerror", (error) => errores.push(error.message.slice(0, 180)));
  pagina.on("console", (mensaje) => {
    if (mensaje.type() === "error") errores.push(mensaje.text().slice(0, 180));
  });
  await pagina.goto(RUTA(parametros), { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app", { timeout: 120000 });
  await pagina.evaluate(() => {
    for (const cabecera of document.querySelectorAll("header")) {
      if (!cabecera.closest(".ac-app")) cabecera.style.display = "none";
    }
  });
  return pagina;
}

const capturas = [];

// 1. Estacionalidad con enero de 2011 completo (3 días observados de 31).
{
  const pagina = await abrir("ac_sec=estacionalidad&ac_estado=CA&ac_desde=2011-01-01&ac_hasta=2011-12-31");
  await pagina.waitForSelector("[data-testid=seccion-estacionalidad] svg", { timeout: 120000 });
  await pagina.waitForTimeout(2500);
  const seccion = pagina.locator("[data-testid=seccion-estacionalidad]");
  await seccion.screenshot({ path: `${EV}/auditoria-estacionalidad-enero-2011.png` });
  capturas.push("auditoria-estacionalidad-enero-2011.png");
  await pagina.close();
}

// 2. Matriz temporal 2011, 2012 y 2016 (cero · sin dato · fuera del filtro).
for (const anio of [2011, 2012, 2016]) {
  const pagina = await abrir("ac_sec=estacionalidad&ac_estado=CA");
  await pagina.waitForSelector("[data-testid=selector-anio-matriz]", { timeout: 120000 });
  await pagina
    .locator("[data-testid=selector-anio-matriz] .at-seg", { hasText: String(anio) })
    .click();
  await pagina.waitForTimeout(2200);
  const panel = pagina.locator(".ac-panel", { has: pagina.locator(".ac-mt-marco") }).first();
  await panel.screenshot({ path: `${EV}/auditoria-matriz-${anio}.png` });
  capturas.push(`auditoria-matriz-${anio}.png`);
  await pagina.close();
}

// 3. Precios con cobertura desglosada.
{
  const pagina = await abrir("ac_sec=precios&ac_estado=CA&ac_tienda=CA_1");
  await pagina.waitForSelector("[data-testid=seccion-precios] svg", { timeout: 120000 });
  await pagina.waitForTimeout(2500);
  await pagina.locator("[data-testid=seccion-precios]").screenshot({
    path: `${EV}/auditoria-precios-cobertura.png`,
  });
  capturas.push("auditoria-precios-cobertura.png");
  await pagina.close();
}

// 4. Panorama con las doce filas A/B (desktop).
{
  const pagina = await abrir("ac_estado=CA");
  /* La comparación A/B es un bloque colapsable: se abre para la captura. */
  await pagina.waitForSelector('[data-testid="ab-boton"]', { timeout: 120000 });
  await pagina.locator('[data-testid="ab-boton"]').click();
  await pagina.waitForSelector(".ac-ab2-fila", { timeout: 120000 });
  await pagina.waitForTimeout(1800);
  await pagina.locator(".ac-ab2-marco").screenshot({
    path: `${EV}/auditoria-comparacion-12-filas.png`,
  });
  capturas.push("auditoria-comparacion-12-filas.png");
  await pagina.close();
}

// 5. Evaluación por ventana y matriz de 28 días.
{
  const pagina = await abrir("");
  await pagina.locator('[data-pantalla="evaluacion"]').click();
  await pagina.waitForSelector("[data-testid=selector-corte-evaluacion]", { timeout: 120000 });
  /* La matriz ventana × horizonte vive en el desplegable de metodología. */
  await pagina.locator('[data-testid="evaluacion-metodologia"] > summary').first().click();
  await pagina.waitForFunction(
    () => document.querySelector('[data-testid="evaluacion-metodologia"]')?.hasAttribute("open"),
    undefined,
    { timeout: 60000 },
  );
  await pagina.waitForSelector(".ac-md-tabla", { state: "visible", timeout: 120000 });
  await pagina.waitForTimeout(2000);
  await pagina.locator(".ac-md-marco").first().screenshot({
    path: `${EV}/auditoria-matriz-28-dias.png`,
  });
  capturas.push("auditoria-matriz-28-dias.png");
  await pagina
    .waitForSelector(".ac-ev-ventanas", { timeout: 120000 })
    .catch(() => {});
  await pagina.waitForTimeout(1500);
  await pagina.locator(".ac-ev-panel").screenshot({
    path: `${EV}/auditoria-evaluacion-ventanas.png`,
  });
  capturas.push("auditoria-evaluacion-ventanas.png");

  // Pronóstico de 28 días posterior al último dato: pantalla «Resultados».
  await pagina.locator('[data-pantalla="resultados"]').click();
  /* La curva del total nacional vive en un bloque colapsable: se abre para la captura. */
  await pagina.waitForSelector('[data-testid="plan-curva-nacional"] > summary', { timeout: 120000 });
  await pagina.locator('[data-testid="plan-curva-nacional"] > summary').first().click();
  await pagina.waitForSelector(".ac-df-grafico svg", { state: "visible", timeout: 120000 });
  await pagina.waitForTimeout(2000);
  await pagina.locator(".ac-panel").first().screenshot({
    path: `${EV}/auditoria-pronostico-28-dias.png`,
  });
  capturas.push("auditoria-pronostico-28-dias.png");
  await pagina.close();
}

// 6. Móvil: doce filas y evaluación.
{
  const pagina = await abrir("ac_estado=CA", { viewport: { width: 390, height: 844 } });
  await pagina.waitForSelector('[data-testid="ab-boton"]', { timeout: 120000 });
  await pagina.locator('[data-testid="ab-boton"]').click();
  await pagina.waitForSelector(".ac-ab2-fila", { timeout: 120000 });
  await pagina.waitForTimeout(1500);
  await pagina.locator(".ac-app").scrollIntoViewIfNeeded();
  await pagina.locator(".ac-ab2-marco").scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(800);
  await pagina.evaluate(() => {
    const marco = document.querySelector(".ac-ab2-marco");
    if (marco) window.scrollTo(0, Math.max(0, marco.getBoundingClientRect().top + window.scrollY - 60));
  });
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: `${EV}/auditoria-panorama-movil.png` });
  capturas.push("auditoria-panorama-movil.png");
  const movil = await pagina.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    inner: window.innerWidth,
    filas: document.querySelectorAll(".ac-ab2-fila").length,
  }));
  await pagina.close();
  await navegador.close();
  console.log(JSON.stringify({ capturas, movil, errores }, null, 1));
}
