/**
 * Capturas de la pantalla «Evaluación» reorganizada y de la auditoría temporal.
 *
 * Genera, en `evidencias/comercial/`:
 *
 * - `ev-contexto.png`: contexto y alcance (bloque A).
 * - `ev-resumen.png`: resumen del desempeño con los dos alcances declarados (bloque B).
 * - `ev-segmentos.png`: tabla de segmentos con identidad completa de los siete departamentos (C).
 * - `ev-grafica.png`: comparación visual del corte (D).
 * - `ev-metodologia.png`: metodología desplegada con protocolo, definiciones y auditoría (E).
 * - `ev-auditoria.png`: tabla de evidencia de separación temporal.
 * - `ev-movil.png`: la pantalla a 390 px.
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const EV = "../../evidencias/comercial";
const url = (query = "") => `${SITIO}/${query ? `?${query}` : ""}${HASH}`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 1400 } });
const errores = [];
pagina.on("pageerror", (error) => errores.push(error.message.slice(0, 160)));
pagina.on("console", (mensaje) => {
  if (mensaje.type() === "error") errores.push(mensaje.text().slice(0, 160));
});

await pagina.goto(url("ac_pantalla=evaluacion"), { waitUntil: "domcontentloaded" });
/* Evidencia limpia: la cabecera fija del portafolio tapaba las capturas de bloque. */
await pagina.addStyleTag({ content: "header.site-header { position: static !important; }" });

await pagina.waitForSelector('[data-testid="evaluacion-contexto"]', { timeout: 180000 });
await pagina.waitForSelector('[data-testid="evaluacion-resumen"]', { timeout: 180000 });
await pagina.waitForFunction(
  () => (document.querySelector('[data-testid="evaluacion-mae-agregado"]')?.innerText ?? "").length > 40,
  undefined,
  { timeout: 180000 },
);
await pagina.waitForTimeout(1200);

await pagina.locator('[data-testid="evaluacion-contexto"]').screenshot({ path: `${EV}/ev-contexto.png` });
await pagina.locator('[data-testid="evaluacion-resumen"]').screenshot({ path: `${EV}/ev-resumen.png` });
await pagina.locator('[data-testid="evaluacion-segmentos"]').screenshot({ path: `${EV}/ev-segmentos.png` });
await pagina.locator('[data-testid="evaluacion-corte"]').screenshot({ path: `${EV}/ev-grafica.png` });

/* Nivel departamento: los siete nombres completos y el título comercial de la gráfica. */
await pagina.locator('[data-testid="selector-nivel-evaluacion"] button', { hasText: "Departamento" }).click();
await pagina.waitForTimeout(3500);
await pagina.locator('[data-testid="evaluacion-segmentos"]').screenshot({
  path: `${EV}/ev-segmentos-departamentos.png`,
});
await pagina.locator('[data-testid="evaluacion-corte"]').screenshot({
  path: `${EV}/ev-grafica-departamentos.png`,
});

/* Metodología desplegada con la auditoría temporal. */
await pagina.locator('[data-testid="evaluacion-abrir-metodologia"]').click();
await pagina.waitForFunction(
  () => document.querySelector('[data-testid="evaluacion-metodologia"]')?.hasAttribute("open"),
  undefined,
  { timeout: 60000 },
);
await pagina.waitForSelector('[data-testid="auditoria-temporal"]', { timeout: 180000 });
await pagina.locator('[data-testid="auditoria-temporal-detalle"] summary').first().click();
await pagina.waitForTimeout(800);
await pagina.locator('[data-testid="evaluacion-metodologia"]').screenshot({
  path: `${EV}/ev-metodologia.png`,
});
await pagina.locator('[data-testid="auditoria-temporal"]').screenshot({ path: `${EV}/ev-auditoria.png` });

const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(url("ac_pantalla=evaluacion"), { waitUntil: "domcontentloaded" });
await movil.waitForSelector('[data-testid="evaluacion-segmentos"]', { timeout: 180000 });
await movil.waitForTimeout(3000);
const desborde = await movil.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
}));
/* Captura del propio panel: en 390 px la página del portafolio envuelve el tablero y una
   captura de viewport podía caer en el texto de la ficha. */
await movil.locator('[data-testid="evaluacion-contexto"]').scrollIntoViewIfNeeded();
await movil.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
await movil.waitForTimeout(600);
await movil.screenshot({ path: `${EV}/ev-movil.png`, fullPage: false });
await movil.locator('[data-testid="evaluacion-segmentos"]').screenshot({
  path: `${EV}/ev-movil-segmentos.png`,
});
await movil.close();

console.log(
  JSON.stringify(
    {
      capturas: [
        "ev-contexto.png",
        "ev-resumen.png",
        "ev-segmentos.png",
        "ev-segmentos-departamentos.png",
        "ev-grafica.png",
        "ev-grafica-departamentos.png",
        "ev-metodologia.png",
        "ev-auditoria.png",
        "ev-movil.png",
        "ev-movil-segmentos.png",
      ],
      desbordeMovil: desborde,
      errores,
    },
    null,
    1,
  ),
);
await navegador.close();
