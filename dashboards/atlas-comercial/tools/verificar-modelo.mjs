/**
 * Verificación del motor predictivo en el tablero «Atlas comercial».
 *
 * Comprueba, contra la API real y la página publicada:
 *  1. la ejecución recomendada y sus supuestos;
 *  2. la evaluación publicada: MAE/WAPE del candidato frente al baseline, ventanas,
 *     horizontes y segmentos (con la cuenta de los que mejoran y empeoran);
 *  3. la pantalla «Evaluación»: corte, rango objetivo, cobertura, gráfica con sus
 *     cuatro trazos, zona del pronóstico, KPI rotulados con su origen y tablas;
 *  4. el corte de evaluación d_1913: aparece el observado posterior al corte;
 *  5. móvil: sin desbordamiento horizontal y con la gráfica legible.
 *
 * Capturas: ``evidencias/comercial/modelo-*.png``. Sale con código 1 si algo falla.
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const RUTA = "/?ac_pantalla=exploracion#/area/ciencia-de-datos/atlas-comercial";
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";
const EV = "../../evidencias/comercial";

const fallos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
  return Boolean(condicion);
};

const json = async (ruta) => {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`${ruta} → ${respuesta.status}`);
  return respuesta.json();
};

// ---------------------------------------------------------------------------
// 1. API
// ---------------------------------------------------------------------------
const estado = await json("/estado");
comprobar(estado.con_datos === true, "la API no tiene una versión publicada");

const modelos = await json("/modelos");
const recomendado = modelos.ejecuciones.find((e) => e.run_id === modelos.recomendado);
comprobar(Boolean(recomendado), "no hay ejecución recomendada");
comprobar(recomendado?.estado === "publicada", "la ejecución recomendada no está publicada");
comprobar(
  (recomendado?.cobertura?.fallback ?? 1) === 0,
  "la ejecución recomendada declara series con fallback",
);
comprobar(
  (recomendado?.cobertura?.series_modelo ?? 0) === (recomendado?.cobertura?.series ?? -1),
  "la cobertura no alcanza todas las series",
);
comprobar(
  Object.keys(recomendado?.supuestos ?? {}).length > 0,
  "la ejecución no declara supuestos",
);

const final = await json("/evaluacion?nivel=total&etapa=final");
const desarrollo = await json("/evaluacion?nivel=total&etapa=desarrollo");
comprobar(final.resumen.mae < final.baseline_resumen.mae, "el candidato no mejora el MAE en los cortes reservados");
comprobar(final.mejora_pct > 0, "la mejora del WAPE en los cortes reservados no es positiva");
comprobar(final.ventanas.length >= 2, "faltan ventanas reservadas");
comprobar(
  final.ventanas.every((v) => v.metricas.n === v.baseline.n),
  "candidato y baseline no se miden sobre las mismas observaciones",
);
comprobar(final.por_horizonte.length === 28, "la evaluación no cubre los 28 horizontes");
comprobar(
  final.por_horizonte.every((p) => p.candidato.wape !== null || p.candidato.denominador_cero),
  "hay WAPE inventado con denominador cero",
);
comprobar(final.segmentos.length > 0, "la evaluación no publica segmentos");
comprobar(
  final.segmentos.every((s) => s.agregado !== null),
  "faltan las métricas de las series agregadas por segmento",
);
comprobar(desarrollo.ventanas.length >= 2, "faltan ventanas de desarrollo");

// ---------------------------------------------------------------------------
// 2. Escritorio
// ---------------------------------------------------------------------------
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const errores = [];
pagina.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
pagina.on("console", (m) => {
  if (m.type() === "error") errores.push(m.text().slice(0, 160));
});
await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".ac-app", { timeout: 90000 });
await pagina.waitForTimeout(2000);

// Resultados: el pronóstico posterior al último dato, con su panel completo.
await pagina.locator('.ac-tabs-btn[data-pantalla="resultados"]').click();
await pagina.waitForSelector('[data-testid="plan-tabla-panel"]', { timeout: 120000 });
/* La curva del total nacional es una vista secundaria colapsable: se abre para verificarla. */
await pagina.locator('[data-testid="plan-curva-nacional"] > summary').first().click();
await pagina.waitForTimeout(1500);
await pagina.waitForSelector(".ac-df-grafico svg", { timeout: 120000 });
await pagina.waitForTimeout(1500);

const resumenUi = async () =>
  pagina.evaluate(() => {
    const texto = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? null;
    const trazos = (selector) =>
      [...document.querySelectorAll(selector)].map((p) => (p.getAttribute("d") ?? "").length);
    const cifras = [...document.querySelectorAll(".ac-metricas--modelo dd")].map((n) =>
      n.textContent.trim(),
    );
    const pies = [...document.querySelectorAll(".ac-kpi-pie")].map((n) => n.textContent.trim());
    const tablaSegmentos = document.querySelector(".ac-tabla-marco--segmentos table");
    const filasSegmentos = tablaSegmentos ? tablaSegmentos.querySelectorAll("tbody tr").length : 0;
    const tablaComparativa = document.querySelector(".ac-tabla--comparativa");
    return {
      datosCorte: texto("[data-testid=datos-corte]"),
      insignia: texto("[data-testid=estado-pronostico]"),
      modelo: texto(".ac-df-cab .ac-df-datos:nth-of-type(3)") ?? texto(".ac-df-datos"),
      cifras,
      pies,
      observado: trazos(".ac-df-observado"),
      modeloTrazo: trazos(".ac-df-modelo"),
      baseline: trazos(".ac-df-baseline"),
      real: trazos("[data-testid=observado-posterior]"),
      bandaAncho: document.querySelector("[data-testid=banda-pronostico]")?.getAttribute("width") ?? null,
      corte: Boolean(document.querySelector("[data-testid=corte]")),
      barras: document.querySelectorAll(".ac-df-barra-col").length,
      filasSegmentos,
      filasComparativa: tablaComparativa ? tablaComparativa.querySelectorAll("tbody tr").length : 0,
      mejora: texto("[data-testid=mejora-wape]"),
      selectorNivel: Boolean(document.querySelector("[data-testid=selector-nivel]")),
      dConNaN: [...document.querySelectorAll(".ac-df-grafico path")].filter((p) =>
        (p.getAttribute("d") ?? "").includes("NaN"),
      ).length,
      importancias: document.querySelectorAll(".ac-df-importancias li").length,
      /* La leyenda usa nombres comerciales. La definición de la agregación vive en una ayuda
         secundaria («Cómo se agrega esta gráfica»), no en la leyenda. */
      /* Se prefiere la leyenda con testid (la del panel de pronóstico o la del corte) frente a la
         primera leyenda de la página, que puede ser la del gráfico de barras por horizonte. */
      leyenda: [
        ...(
          (document.querySelector('[data-testid="leyenda-pronostico"]') ??
            document.querySelector('[data-testid="leyenda-corte"]') ??
            document.querySelector(".ac-df-leyenda"))?.querySelectorAll("li") ?? []
        ),
      ].map((n) => n.textContent.trim()),
      agregacion:
        document.querySelector(".ac-df-agregacion p")?.textContent.trim() ??
        document.querySelector(".ac-df-agregacion")?.textContent.trim() ??
        null,
    };
  });

const futuro = await resumenUi();

comprobar(futuro.datosCorte?.includes("28 días"), "la cabecera no declara el horizonte de 28 días");
comprobar(
  /no hay observaciones/i.test(futuro.insignia ?? ""),
  "el pronóstico final no se rotula como sin observaciones",
);
comprobar(futuro.observado.length === 1, "falta el trazo del histórico observado");
comprobar(futuro.modeloTrazo.length === 1, "falta el trazo del modelo");
comprobar(futuro.baseline.length === 1, "falta el trazo del baseline");
comprobar(
  (futuro.observado[0] ?? 0) > 50 && (futuro.modeloTrazo[0] ?? 0) > 50 && (futuro.baseline[0] ?? 0) > 50,
  "algún trazo de la gráfica está vacío",
);
comprobar(futuro.real.length === 0, "se dibuja observado posterior en un corte sin observaciones");
comprobar(Number(futuro.bandaAncho) > 0, "la zona del pronóstico no tiene ancho");
comprobar(futuro.corte === true, "falta la marca del corte");
comprobar(futuro.dConNaN === 0, "algún trazo contiene NaN");
comprobar(futuro.cifras.length >= 4, "faltan KPI del modelo");
comprobar(
  futuro.filasSegmentos === 0 && futuro.filasComparativa === 0,
  "Resultados sigue repitiendo las tablas de evaluación que pertenecen a «Evaluación»",
);
comprobar(
  futuro.pies.some((p) => p.includes("en los cortes finales")),
  "los KPI no declaran que la métrica viene de los cortes finales",
);
/* La mejora y las tablas se comprueban en «Evaluación», su pantalla. */
const resumenEval = await pagina.evaluate(() =>
  document.querySelector('[data-testid="resultados-resumen-evaluacion"]')?.innerText.replace(/\s+/g, " ") ?? null,
);
comprobar(
  /Resumen de evaluación/.test(resumenEval ?? ""),
  "Resultados no incluye un resumen breve de evaluación con enlace",
);
comprobar(futuro.selectorNivel === true, "no hay selector de nivel en Resultados");
comprobar(futuro.leyenda.length === 3, "la leyenda del pronóstico final no tiene tres series");
comprobar(
  futuro.leyenda.every((texto) =>
    /Ventas observadas antes del corte|Pronóstico del modelo|Referencia estacional/.test(texto),
  ),
  `la leyenda no usa los nombres comerciales: ${futuro.leyenda.join(" | ")}`,
);
comprobar(
  /suma/i.test(futuro.agregacion ?? ""),
  `la ayuda de agregación no explica la suma de series: ${futuro.agregacion}`,
);

const botonDescarga = await pagina.$('button:has-text("Descargar CSV")');
comprobar(Boolean(botonDescarga), "Resultados no ofrece la descarga de la selección");

await pagina.locator(".ac-app").screenshot({ path: `${EV}/modelo-futuro-escritorio.png` });

// Evaluación: el corte histórico ya tiene observaciones posteriores.
await pagina.locator('.ac-tabs-btn[data-pantalla="evaluacion"]').click();
await pagina.waitForSelector("[data-testid=selector-corte-evaluacion]", { timeout: 120000 });
const botonCorte = pagina
  .locator("[data-testid=selector-corte-evaluacion] .at-seg")
  .last();
await botonCorte.click();
await pagina.waitForSelector("[data-testid=observado-posterior]", { timeout: 120000 });
await pagina.waitForTimeout(1500);
const evaluacionUi = await resumenUi();

comprobar(evaluacionUi.real.length === 1, "falta el observado posterior al corte");
comprobar(evaluacionUi.barras === 28, `se esperaban 28 barras de horizonte y hay ${evaluacionUi.barras}`);
comprobar(evaluacionUi.filasSegmentos > 0, "la tabla de segmentos está vacía en Evaluación");
comprobar(evaluacionUi.mejora !== null, "no se muestra la mejora frente al baseline en Evaluación");
comprobar(evaluacionUi.leyenda.length === 4, "la leyenda no incluye el observado posterior");
comprobar(
  evaluacionUi.leyenda.some((texto) => /Ventas observadas después del corte/.test(texto)),
  `la leyenda del corte no nombra las ventas observadas después del corte: ${evaluacionUi.leyenda.join(
    " | ",
  )}`,
);
comprobar(
  /suma/i.test(evaluacionUi.agregacion ?? ""),
  `la ayuda de agregación no explica la suma de series: ${evaluacionUi.agregacion}`,
);
comprobar(evaluacionUi.dConNaN === 0, "algún trazo del corte de evaluación contiene NaN");

const kpiCorte = await pagina.evaluate(() =>
  [...document.querySelectorAll(".ac-metricas--modelo > div")].map((n) => ({
    etiqueta: n.querySelector("dt")?.textContent?.trim() ?? null,
    valor: n.querySelector("dd")?.textContent?.trim() ?? null,
  })),
);
await pagina.locator(".ac-app").screenshot({ path: `${EV}/modelo-corte-1913-escritorio.png` });

// Panel de evaluación completo (tabla comparativa, horizontes, segmentos, ventanas).
const panelEvaluacion = await pagina.evaluate(() => {
  const paneles = [...document.querySelectorAll(".ac-panel")];
  const panel = paneles.find((p) => p.querySelector(".ac-tabla--comparativa"));
  if (!panel) return null;
  return {
    comparativa: panel.querySelectorAll(".ac-tabla--comparativa tbody tr").length,
    ventanas: panel.querySelectorAll(".ac-df-ventanas tbody tr").length,
    segmentos: panel.querySelectorAll(".ac-tabla-marco--segmentos tbody tr").length,
    texto: panel.innerText.replace(/\s+/g, " ").slice(0, 400),
  };
});
comprobar(Boolean(panelEvaluacion), "no existe el panel de evaluación");
comprobar(panelEvaluacion?.comparativa > 0, "la tabla comparativa está vacía");
comprobar(panelEvaluacion?.ventanas >= 2, "faltan las ventanas evaluadas");
await pagina.locator(".ac-panel", { has: pagina.locator(".ac-tabla--comparativa") }).first().screenshot({
  path: `${EV}/modelo-evaluacion-escritorio.png`,
});

// ---------------------------------------------------------------------------
// 3. Móvil
// ---------------------------------------------------------------------------
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
movil.on("pageerror", (e) => errores.push(`móvil: ${e.message.slice(0, 140)}`));
await movil.goto(`${SITIO}${RUTA}`, { waitUntil: "domcontentloaded" });
await movil.waitForSelector(".ac-app", { timeout: 90000 });
await movil.locator('.ac-tabs-btn[data-pantalla="evaluacion"]').click();
await movil.waitForSelector(".ac-df-grafico svg", { timeout: 120000 });
await movil.waitForTimeout(1500);
const resumenMovil = await movil.evaluate(() => {
  const app = document.querySelector(".ac-app");
  const caja = app?.getBoundingClientRect();
  return {
    scrollWidth: document.documentElement.scrollWidth,
    desborda: document.documentElement.scrollWidth > window.innerWidth + 1,
    grafico: Boolean(document.querySelector(".ac-df-grafico svg")),
    controles: document.querySelectorAll("[data-testid=selector-corte-evaluacion] .at-seg").length,
    altoGrafico: Math.round(document.querySelector(".ac-df-grafico svg")?.getBoundingClientRect().height ?? 0),
    anchoApp: Math.round(caja?.width ?? 0),
  };
});
comprobar(resumenMovil.desborda === false, "la vista móvil desborda horizontalmente");
comprobar(resumenMovil.grafico === true, "la gráfica no se dibuja en móvil");
comprobar(resumenMovil.altoGrafico > 80, "la gráfica es demasiado baja en móvil");
await movil.evaluate(() => {
  const app = document.querySelector(".ac-app");
  if (app) window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 80));
});
await movil.waitForTimeout(400);
await movil.screenshot({ path: `${EV}/modelo-futuro-movil.png`, fullPage: false });

await navegador.close();

const informe = {
  version: estado.version,
  recomendado: modelos.recomendado,
  precios: modelos.version_precios,
  cortes: {
    reservados: final.ventanas.map((v) => ({
      origen: v.origen_d,
      fecha: v.origen_fecha,
      mae: v.metricas.mae,
      wape: v.metricas.wape,
      base_mae: v.baseline.mae,
      base_wape: v.baseline.wape,
      mejora: v.mejora_pct,
    })),
    agregado_reservados: { mae: final.resumen.mae, wape: final.resumen.wape, mejora: final.mejora_pct },
    agregado_baseline: { mae: final.baseline_resumen.mae, wape: final.baseline_resumen.wape },
    desarrollo: { mae: desarrollo.resumen.mae, wape: desarrollo.resumen.wape, mejora: desarrollo.mejora_pct },
    segmentos: final.mejoras,
  },
  ui: { futuro, evaluacion: evaluacionUi, kpiCorte, panelEvaluacion, movil: resumenMovil },
  errores,
  fallos,
};
console.log(JSON.stringify(informe, null, 1));
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
