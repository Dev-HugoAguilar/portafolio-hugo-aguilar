/**
 * Comprueba que el bloque «Cobertura del conjunto filtrado» ya no existe en la
 * pestaña de personas y que el resto de la vista sigue completo.
 */
import { chromium } from "@playwright/test";

const URL = "http://127.0.0.1:8000/#/area/dashboards/atlas-vial";
const EV = "evidencias/personas";

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1240, height: 1100 }, deviceScaleFactor: 2 });
await pagina.goto(URL, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await pagina.getByRole("tab", { name: /Personas y veh/i }).first().click();
await pagina.waitForSelector("[data-testid=panel-burbujas] [data-nodo]", { timeout: 60000 });
await pagina.waitForTimeout(1600);

const informe = await pagina.evaluate(() => {
  const vista = document.querySelector(".at-vista--personas");
  const paneles = [...vista.querySelectorAll("section")].map((s) => ({
    clase: s.className,
    titulo: s.querySelector("h3")?.textContent.trim() ?? null,
  }));
  return {
    paneles,
    existeTituloCobertura: [...vista.querySelectorAll("h3")].some((h) =>
      /Cobertura del conjunto/i.test(h.textContent ?? ""),
    ),
    restos: vista.querySelectorAll(".at-cob-lista, .at-panel--cobertura-personas").length,
    conservaAviso: Boolean(vista.querySelector(".at-aviso")),
    alto: Math.round(vista.getBoundingClientRect().height),
  };
});

/* Captura del final de la pestaña (donde estaba el bloque retirado). */
await pagina.evaluate(() => {
  const vista = document.querySelector(".at-vista--personas");
  const fin = vista.getBoundingClientRect().bottom + window.scrollY;
  window.scrollTo(0, Math.max(0, fin - window.innerHeight + 40));
});
await pagina.waitForTimeout(500);
await pagina.screenshot({ path: `${EV}/personas-sin-cobertura.png` });
await pagina.locator("[data-testid=panel-vehiculos]").screenshot({ path: `${EV}/vehiculos-tras-retiro.png` });

console.log(
  JSON.stringify(
    {
      existeTituloCobertura: informe.existeTituloCobertura,
      restosEnDom: informe.restos,
      paneles: informe.paneles.map((p) => p.titulo),
      conservaAviso: informe.conservaAviso,
      capturas: [`${EV}/personas-sin-cobertura.png`, `${EV}/vehiculos-tras-retiro.png`],
    },
    null,
    1,
  ),
);
await navegador.close();
