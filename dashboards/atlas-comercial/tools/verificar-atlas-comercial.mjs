/**
 * Verificación del tablero «Walmart M5 — Planeación de demanda y evaluación de pronósticos»
 * dentro del portafolio.
 *
 * Comprueba: proyecto accesible desde «Ciencia de datos y Machine Learning», estado
 * «datos pendientes» sin cifras, controles del Atlas, y —cuando hay versión
 * publicada— pulso, demanda futura, evaluación y móvil.
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const RUTA = "/?ac_pantalla=exploracion#/area/ciencia-de-datos/atlas-comercial";
const EV = "../../evidencias/comercial";
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";

const estado = await (await fetch(`${API}/estado`)).json();
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".ac-app", { timeout: 90000 });
await pagina.waitForTimeout(2500);

const informe = { estadoApi: estado, version: estado.version };

informe.tarjeta = await pagina.evaluate(() => {
  const ficha = document.querySelector("h1, .area-titulo, [data-testid=ficha]");
  return {
    titulo: document.title,
    hayFicha: Boolean(ficha),
    textoArea: (document.body.innerText.match(/Ciencia de datos y Machine Learning/g) || []).length,
    textoProyecto: (document.body.innerText.match(/Walmart M5 — Planeación de demanda y evaluación de pronósticos/g) || []).length > 0,
  };
});

informe.pendiente = await pagina.evaluate(() => {
  const bloque = document.querySelector("[data-testid=estado-pendiente]");
  return {
    existe: Boolean(bloque),
    texto: bloque ? bloque.innerText.replace(/\s+/g, " ").slice(0, 200) : null,
    cifrasVisibles: Array.from(document.querySelectorAll(".ac-app *"))
      .filter((n) => /^\d[\d.,]*$/.test((n.textContent || "").trim())).length,
  };
});

informe.controles = await pagina.evaluate(() => {
  const seg = document.querySelectorAll(".at-segmentado .at-seg").length;
  const capsula = document.querySelector(".at-seg-capsula");
  return {
    segmentados: document.querySelectorAll(".at-segmentado").length,
    botones: seg,
    capsulaFondo: capsula ? getComputedStyle(capsula).backgroundColor : null,
    activoColor: document.querySelector(".at-seg.is-activa") ? getComputedStyle(document.querySelector(".at-seg.is-activa")).color : null,
  };
});

const irAlTablero = async (objetivo, etiqueta) => {
  await objetivo.evaluate(() => {
    const app = document.querySelector(".ac-app");
    if (app) window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 92));
  });
  await objetivo.waitForTimeout(500);
  void etiqueta;
};

if (estado.con_datos) {
  await pagina.waitForSelector(".ac-rejilla-tiendas svg", { timeout: 60000 });
  await pagina.waitForTimeout(1200);
  await irAlTablero(pagina, "pulso");
  informe.pulso = await pagina.evaluate(() => {
    const columnas = getComputedStyle(document.querySelector(".ac-rejilla-tiendas")).gridTemplateColumns.split(" ").length;
    return {
      paneles: document.querySelectorAll(".ac-mini").length,
      columnas,
      detalle: Boolean(document.querySelector(".ac-detalle")),
      // La comparación A/B por categoría se sustituyó por la sección por tienda × categoría.
      comparacionFilas: document.querySelectorAll(".ac-ab2-fila").length,
      secciones: [...document.querySelectorAll("[data-testid=selector-seccion] .at-seg")].map((n) =>
        n.textContent.trim(),
      ),
      concentracion: Boolean(document.querySelector(".ac-linea--concentracion")),
      lectura80: document.querySelector(".ac-lectura")?.textContent.trim() ?? null,
      metodologia: Boolean(document.querySelector(".ac-metodologia")),
      ejesTiempo: document.querySelectorAll(".ac-mini .ac-eje-texto").length,
      ticksPorPanel: document.querySelector(".ac-mini")?.querySelectorAll(".ac-eje-texto").length ?? 0,
    };
  });
  // Modo «Comparar tendencias»: guía en 100 y mismo periodo de referencia.
  await pagina.getByRole("button", { name: "Comparar tendencias", exact: true }).click();
  await pagina.waitForTimeout(500);
  informe.tendencias = await pagina.evaluate(() => ({
    guias100: document.querySelectorAll(".ac-guia-100").length,
    subtitulo: document.querySelector(".ac-panel-sub")?.textContent.trim() ?? null,
  }));
  await pagina.getByRole("button", { name: "Escala común", exact: true }).click();
  await pagina.waitForTimeout(300);
  // Cursor sincronizado: la guía aparece en los diez paneles.
  const caja = await pagina.locator(".ac-mini svg").first().boundingBox();
  await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await pagina.waitForTimeout(400);
  informe.acabado = await pagina.evaluate(() => {
    const paneles = [...document.querySelectorAll(".ac-mini")];
    return {
      /* Etiquetas Y solo en la primera columna de cada fila. */
      ejesYporPanel: paneles.map((panel) => panel.querySelectorAll("text.ac-eje-texto").length),
      marcadoresFinal: document.querySelectorAll(".ac-punto-final").length,
      etiquetasFinal: document.querySelectorAll(".ac-etiqueta-final").length,
      conRelleno: document.querySelectorAll(".ac-relleno").length,
      conectorAB: document.querySelector(".ac-ab2-conector")
        ? getComputedStyle(document.querySelector(".ac-ab2-conector")).backgroundColor
        : null,
    };
  });
  informe.cursor = await pagina.evaluate(() => ({
    guias: document.querySelectorAll(".ac-guia-linea").length,
    detalleItems: document.querySelectorAll(".ac-detalle-item").length,
    periodo: document.querySelector(".ac-detalle-periodo")?.textContent.trim() ?? null,
  }));
  await pagina.screenshot({ path: `${EV}/comercial-pulso-escritorio.png`, fullPage: false });
  await pagina.locator('.ac-tabs-btn[data-pantalla="resultados"]').click();
  await pagina.waitForSelector(".ac-corte", { timeout: 60000, state: "attached" });
  await pagina.waitForTimeout(900);
  await irAlTablero(pagina, "resultados");
  informe.futuro = await pagina.evaluate(() => ({
    corte: Boolean(document.querySelector(".ac-corte")),
    bandaPronostico: Boolean(document.querySelector(".ac-banda-pronostico")),
    anotacion: [...document.querySelectorAll(".ac-anotacion-titulo, .ac-anotacion-fecha")].map((n) => n.textContent),
    kpis: [...document.querySelectorAll(".ac-metricas dt")].map((n) => n.textContent),
    metricas: [...document.querySelectorAll(".ac-metricas dd")].map((d) => d.textContent.trim()),
    ventanas: document.querySelectorAll(".ac-tabla tbody tr").length,
    limitaciones: document.querySelectorAll(".ac-limites li").length,
  }));
  await pagina.screenshot({ path: `${EV}/comercial-futuro-escritorio.png` });

  const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  await movil.goto(`${SITIO}${RUTA}`, { waitUntil: "domcontentloaded" });
  await movil.waitForSelector(".ac-rejilla-tiendas svg", { timeout: 90000 });
  await movil.waitForTimeout(1500);
  await irAlTablero(movil, "movil");
  await movil.screenshot({ path: `${EV}/comercial-pulso-movil.png`, fullPage: false });
  informe.movil = await movil.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    paneles: document.querySelectorAll(".ac-mini").length,
  }));
  await movil.close();
} else {
  await irAlTablero(pagina, "pendiente");
  await pagina.screenshot({ path: `${EV}/comercial-pendiente.png` });
}

console.log(JSON.stringify(informe, null, 1));
await navegador.close();
