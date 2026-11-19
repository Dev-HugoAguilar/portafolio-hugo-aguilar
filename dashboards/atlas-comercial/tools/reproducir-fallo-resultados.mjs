/**
 * Reproducción del fallo de «Resultados»: nivel producto residual sin tienda ni artículo,
 * mensaje doble (validación + «sin pronóstico») y unidad de cobertura equivocada.
 *
 * Registra la URL, los parámetros enviados a /pronosticos, el estado de la respuesta y el
 * texto visible. No modifica nada: solo observa.
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const url = (query = "") => `${SITIO}/${query ? `?${query}` : ""}${HASH}`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });

const peticiones = [];
p.on("request", (r) => {
  if (r.url().includes("/pronosticos")) peticiones.push({ tipo: "peticion", url: r.url().split("?")[1] });
});
p.on("response", async (r) => {
  if (!r.url().includes("/pronosticos")) return;
  let cuerpo = "";
  try {
    cuerpo = (await r.text()).slice(0, 220);
  } catch {
    cuerpo = "(sin cuerpo)";
  }
  peticiones.push({ tipo: "respuesta", estado: r.status(), cuerpo });
});

const estado = async (etiqueta) => {
  const datos = await p.evaluate(() => ({
    url: window.location.search,
    titulo: document.querySelector(".ac-ph-titulo")?.textContent?.trim() ?? null,
    cabecera: document.querySelector(".ac-cobertura")?.textContent?.trim() ?? null,
    nivel: [...document.querySelectorAll("[data-testid=selector-nivel] .at-seg")]
      .filter((n) => n.getAttribute("aria-pressed") === "true" || n.classList.contains("is-activa"))
      .map((n) => n.textContent.trim()),
    panel: document.querySelector(".ac-df-panel, .ac-panel")?.innerText?.replace(/\s+/g, " ").slice(0, 320) ?? null,
    avisos: [...document.querySelectorAll(".ac-vacio, [role=alert], .ac-hx-aviso, .ac-nota")]
      .map((n) => n.innerText.replace(/\s+/g, " ").slice(0, 160))
      .slice(0, 6),
  }));
  console.log(`\n=== ${etiqueta}`);
  console.log(JSON.stringify(datos, null, 1));
  console.log("peticiones:", JSON.stringify(peticiones.splice(0), null, 1));
};

/* A. Resultados directo, sin parámetros. */
await p.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
await p.waitForSelector(".ac-app");
await p.waitForTimeout(4000);
await estado("A · Resultados por omisión");

/* B. Elegir el nivel «Artículo» sin tienda ni artículo. */
await p.evaluate(() => {
  const boton = [...document.querySelectorAll("[data-testid=selector-nivel] .at-seg")].find(
    (n) => n.textContent.trim() === "Artículo",
  );
  if (boton) boton.click();
});
await p.waitForTimeout(4000);
await estado("B · nivel Artículo sin tienda ni artículo");

/* C. Volver a un nivel agregado. */
await p.evaluate(() => {
  const boton = [...document.querySelectorAll("[data-testid=selector-nivel] .at-seg")].find(
    (n) => n.textContent.trim() === "Total",
  );
  if (boton) boton.click();
});
await p.waitForTimeout(4000);
await estado("C · vuelta a Total");

/* D. Contexto con tienda y artículo y después quitar la tienda. */
await p.goto(url("ac_pantalla=resultados&ac_estado=CA&ac_tienda=CA_1&ac_cat=FOODS&ac_dept=FOODS_3&ac_item=FOODS_3_090"), {
  waitUntil: "domcontentloaded",
});
await p.waitForSelector(".ac-app");
await p.waitForTimeout(4500);
await estado("D1 · tienda + artículo desde la URL");

await p.evaluate(() => {
  const boton = [...document.querySelectorAll("[data-testid=selector-nivel] .at-seg")].find(
    (n) => n.textContent.trim() === "Artículo",
  );
  if (boton) boton.click();
});
await p.waitForTimeout(4000);
await estado("D2 · nivel Artículo con tienda y artículo");

/* Quitar la tienda: el nivel producto deja de ser válido. */
await p.evaluate(() => {
  const select = document.querySelectorAll(".ac-contexto select")[1];
  if (select) {
    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
});
await p.waitForTimeout(4500);
await estado("D3 · nivel Artículo sin tienda (todas las tiendas)");

/* E. Unidad de cobertura al cambiar la agregación. */
await p.goto(url("ac_pantalla=exploracion"), { waitUntil: "domcontentloaded" });
await p.waitForSelector(".ac-app");
await p.waitForTimeout(4000);
for (const agregacion of ["Mes", "Semana", "Día"]) {
  await p.evaluate((texto) => {
    const boton = [...document.querySelectorAll("[data-testid=selector-agregacion] .at-seg")].find(
      (n) => n.textContent.trim() === texto,
    );
    if (boton) boton.click();
  }, agregacion);
  await p.waitForTimeout(2500);
  const cabecera = await p.evaluate(
    () => document.querySelector(".ac-cobertura")?.textContent?.trim() ?? null,
  );
  console.log(`\n=== E · agregación ${agregacion}`);
  console.log(cabecera);
}

await b.close();
