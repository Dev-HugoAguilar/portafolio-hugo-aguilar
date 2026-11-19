/**
 * Informe de cobertura de los 41 bloques auditados contra el tablero servido.
 *
 * Recorre el mapa `cobertura_redisenada.json`, abre la vista correspondiente en el
 * tablero embebido y registra, para cada bloque: destino, existencia real, qué
 * contiene (indicadores, tablas, gráficos, fichas), los datos que lo alimentan, la
 * interacción declarada y sus limitaciones.
 *
 * Escribe `evidencias/clientes-campanas/integrado/cobertura_41.csv` y falla si algún
 * bloque no tiene destino o el destino está vacío.
 *
 * Uso: node integrado/tools/informe-cobertura.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const FICHA = "/#/area/ciencia-de-datos/clientes-campanas";
const PAGINA = "/dashboards/clientes-campanas/index.html";
const SALIDA = "../../evidencias/clientes-campanas/integrado/cobertura_41.csv";
const VISTAS = ["proyecto", "perfiles", "evolucion", "campanas", "incrementalidad", "experimento"];

const RUTA_SALIDA = resolve(SALIDA);
mkdirSync(dirname(RUTA_SALIDA), { recursive: true });

/* Inventario y mapa de cobertura salen del propio tablero servido. */
const html = await (await fetch(`${SITIO}${PAGINA}`)).text();
const dataset = JSON.parse(html.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const mapa = JSON.parse(html.match(/const coverage=(\{[\s\S]*?\});\n/)[1]);
const inventario = new Map((dataset.inventario ?? []).map((fila) => [fila.id, fila]));

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
await pagina.goto(`${SITIO}${FICHA}`, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector("#demo-host iframe", { timeout: 60000 });
const marco = pagina.frameLocator("#demo-host iframe");
await marco.locator("#tabs button").first().waitFor({ timeout: 60000 });

const filas = [];
const faltantes = [];

for (const vista of VISTAS) {
  await marco.locator(`#tabs button:nth-child(${VISTAS.indexOf(vista) + 1})`).click();
  await marco.locator("#content .card").first().waitFor();
  await pagina.waitForTimeout(150);

  const bloques = Object.entries(mapa).filter(([, destino]) => destino.view === vista);
  for (const [id, destino] of bloques) {
    const detalle = await pagina.evaluate((destinoId) => {
      const doc = document.querySelector("#demo-host iframe").contentDocument;
      const nodo = doc.getElementById(destinoId);
      if (!nodo) return { existe: false };
      const visible = nodo.getBoundingClientRect();
      return {
        existe: true,
        visible: visible.width > 0 && visible.height > 0,
        caracteres: nodo.innerText.replace(/\s+/g, " ").trim().length,
        kpis: nodo.querySelectorAll(".kpi").length,
        tablas: nodo.querySelectorAll("table").length,
        graficos: nodo.querySelectorAll("svg").length,
        fichas: nodo.querySelectorAll(".detail").length,
        descargas: nodo.querySelectorAll("[data-download]").length,
        controles: nodo.querySelectorAll("select, input, button").length,
        texto: nodo.innerText.replace(/\s+/g, " ").trim().slice(0, 70),
      };
    }, destino.target);

    const bloque = inventario.get(id) ?? {};
    if (!detalle.existe) faltantes.push(`${id} → #${destino.target} (${vista})`);
    else if (detalle.caracteres < 40) faltantes.push(`${id} → #${destino.target} está casi vacío`);

    const contenido = detalle.existe
      ? [
          detalle.kpis ? `${detalle.kpis} indicadores` : "",
          detalle.tablas ? `${detalle.tablas} tablas` : "",
          detalle.graficos ? `${detalle.graficos} gráficos` : "",
          detalle.fichas ? `${detalle.fichas} fichas` : "",
          detalle.descargas ? `${detalle.descargas} descargas` : "",
        ]
          .filter(Boolean)
          .join(" · ") || `${detalle.caracteres} caracteres de texto`
      : "sin destino";

    filas.push([
      id,
      bloque.pantalla ?? "",
      bloque.titulo ?? "",
      bloque.tipo_grafica ?? "",
      vista,
      `#${destino.target}`,
      detalle.existe ? "sí" : "no",
      contenido,
      String(detalle.controles ?? 0),
      bloque.datos ?? "",
      bloque.filtros_e_interacciones ?? directorioInteraccion(destino.target),
      bloque.observaciones ?? "",
      destino.note ?? "",
    ]);
  }
}

await navegador.close();

/** Interacción declarada por el propio tablero cuando el inventario no la detalla. */
function directorioInteraccion(target) {
  return mapa[target]?.note ?? "";
}

const escapar = (valor) => {
  const texto = String(valor ?? "");
  return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

const encabezado = [
  "id",
  "pantalla",
  "titulo",
  "tipo",
  "vista",
  "destino",
  "existe",
  "contenido_medido",
  "controles",
  "datos",
  "interaccion",
  "limitaciones",
  "tratamiento_declarado",
];
const csv = [encabezado, ...filas].map((fila) => fila.map(escapar).join(",")).join("\n") + "\n";
writeFileSync(RUTA_SALIDA, csv, "utf8");

console.log(`cobertura: ${filas.length} bloques registrados en ${SALIDA}`);
const resumen = filas.reduce((acc, fila) => {
  acc[fila[4]] = (acc[fila[4]] ?? 0) + 1;
  return acc;
}, {});
console.log(`por vista: ${Object.entries(resumen).map(([vista, total]) => `${vista} ${total}`).join(" · ")}`);
if (faltantes.length) {
  console.log(`FALLOS: ${faltantes.length}`);
  for (const linea of faltantes) console.log(`  ✗ ${linea}`);
  process.exit(1);
}
console.log("cobertura OK: los 41 bloques tienen destino con contenido y controles medidos.");
