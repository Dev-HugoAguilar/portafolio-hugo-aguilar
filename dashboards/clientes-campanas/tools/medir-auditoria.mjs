/**
 * Mediciones de layout para la auditoría visual de «Clientes y campañas».
 *
 * Comprueba de forma automática tres cosas que a ojo son discutibles:
 *  1) textos que se salen del área del gráfico (etiquetas cortadas);
 *  2) textos que se solapan entre sí o con puntos del gráfico;
 *  3) contenedores vacíos visibles (bloques plegados que dejan hueco).
 *
 * No modifica nada de la interfaz: solo mide el DOM servido.
 *
 * Uso: node tools/medir-auditoria.mjs <carpeta_salida>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const HASH = "#/area/ciencia-de-datos/clientes-campanas";
const SALIDA = process.argv[2] ?? "../../evidencias/clientes-campanas/auditoria";
mkdirSync(join(SALIDA, "datos_graficas"), { recursive: true });

const PANTALLAS = ["proyecto", "perfiles", "evolucion", "campanas", "incrementalidad", "experimento"];

const navegador = await chromium.launch();
const informe = {};

for (const pantalla of PANTALLAS) {
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1300 } });
  await pagina.goto(`${SITIO}/?cg_pantalla=${pantalla}${HASH}`, { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector('[data-testid="cg-contenido"]', { timeout: 180000 });
  await pagina.waitForTimeout(pantalla === "perfiles" ? 2600 : 1800);

  informe[pantalla] = await pagina.evaluate(() => {
    const medir = (nodo) => nodo.getBoundingClientRect();
    const paneles = [...document.querySelectorAll('[data-testid^="cg-"]')].filter((nodo) =>
      /^cg-(proyecto|perfiles|evolucion|campanas|incrementalidad|experimento)-/.test(nodo.dataset.testid ?? ""),
    );

    const cortados = [];
    const solapesTexto = [];
    const solapesPunto = [];

    for (const panel of paneles) {
      const id = panel.dataset.testid;
      const svg = panel.querySelector("svg");
      if (!svg) continue;
      const area = medir(svg);
      const textos = [...svg.querySelectorAll("text")];
      for (const texto of textos) {
        const caja = medir(texto);
        if (!texto.textContent?.trim() || caja.width === 0) continue;
        if (caja.left < area.left - 0.5 || caja.right > area.right + 0.5) {
          cortados.push({
            panel: id,
            texto: texto.textContent.trim().slice(0, 60),
            izquierda_px: Number((caja.left - area.left).toFixed(1)),
            derecha_px: Number((caja.right - area.right).toFixed(1)),
          });
        }
      }
      for (let i = 0; i < textos.length; i += 1) {
        const a = medir(textos[i]);
        if (!textos[i].textContent?.trim() || a.width === 0) continue;
        for (let j = i + 1; j < textos.length; j += 1) {
          const b = medir(textos[j]);
          if (!textos[j].textContent?.trim() || b.width === 0) continue;
          const ancho = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const alto = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ancho > 2 && alto > 2) {
            solapesTexto.push({
              panel: id,
              a: textos[i].textContent.trim().slice(0, 40),
              b: textos[j].textContent.trim().slice(0, 40),
              ancho_px: Number(ancho.toFixed(1)),
              alto_px: Number(alto.toFixed(1)),
            });
          }
        }
      }
      /* Puntos (círculos) tapados por una etiqueta de texto. */
      const circulos = [...svg.querySelectorAll("circle")];
      for (const circulo of circulos) {
        const c = medir(circulo);
        for (const texto of textos) {
          if (!texto.textContent?.trim()) continue;
          const t = medir(texto);
          if (t.width === 0) continue;
          const ancho = Math.min(c.right, t.right) - Math.max(c.left, t.left);
          const alto = Math.min(c.bottom, t.bottom) - Math.max(c.top, t.top);
          if (ancho > 2 && alto > 2) {
            solapesPunto.push({
              panel: id,
              texto: texto.textContent.trim().slice(0, 40),
              ancho_px: Number(ancho.toFixed(1)),
              alto_px: Number(alto.toFixed(1)),
            });
            break;
          }
        }
      }
    }

    /* Contenedores plegados que dejan un hueco visible. */
    const huecos = [...document.querySelectorAll("details.cg-tabla-plegable, details.cg-metodologia")]
      .map((detalles) => {
        const caja = medir(detalles);
        const resumen = detalles.querySelector("summary");
        const altoResumen = resumen ? medir(resumen).height : 0;
        return {
          testid: detalles.dataset.testid ?? detalles.className,
          abierto: detalles.open,
          alto_px: Number(caja.height.toFixed(1)),
          alto_resumen_px: Number(altoResumen.toFixed(1)),
          hueco_px: Number((caja.height - altoResumen - 2).toFixed(1)),
        };
      })
      .filter((fila) => !fila.abierto && fila.hueco_px > 24);

    /* Área de dibujo frente a área disponible del gráfico. */
    const usoEspacio = [...document.querySelectorAll('[data-testid^="cg-"] svg')].map((svg) => {
      const panel = svg.closest('[data-testid^="cg-"]');
      const caja = medir(svg);
      const contenido = [...svg.querySelectorAll("circle, rect, polyline, path, line, text")]
        .map(medir)
        .reduce(
          (acc, c) => ({
            top: Math.min(acc.top, c.top),
            bottom: Math.max(acc.bottom, c.bottom),
            left: Math.min(acc.left, c.left),
            right: Math.max(acc.right, c.right),
          }),
          { top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity },
        );
      const alto = Number.isFinite(contenido.top) ? contenido.bottom - contenido.top : 0;
      return {
        panel: panel?.dataset.testid ?? "",
        ancho_px: Number(caja.width.toFixed(1)),
        alto_px: Number(caja.height.toFixed(1)),
        alto_contenido_px: Number(alto.toFixed(1)),
        desaprovechado_pct: caja.height > 0 ? Number((((caja.height - alto) / caja.height) * 100).toFixed(1)) : 0,
      };
    });

    return { cortados, solapesTexto, solapesPunto, huecos, usoEspacio };
  });

  await pagina.close();
}

writeFileSync(join(SALIDA, "datos_graficas", "00_mediciones_layout.json"), JSON.stringify(informe, null, 1), "utf8");
await navegador.close();

for (const [pantalla, datos] of Object.entries(informe)) {
  console.log(
    `${pantalla}: ${datos.cortados.length} textos cortados · ${datos.solapesTexto.length} solapes texto-texto · ` +
      `${datos.solapesPunto.length} textos sobre puntos · ${datos.huecos.length} huecos`,
  );
}
