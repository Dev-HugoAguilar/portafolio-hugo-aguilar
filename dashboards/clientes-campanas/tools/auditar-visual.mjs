/**
 * Auditoría visual de «Clientes y campañas»: capturas y datos de cada gráfica.
 *
 * No modifica la interfaz ni los datos. Para cada pantalla toma una captura
 * general, una por bloque con visualización y los datos que realmente alimentan
 * la representación (geometría dibujada en el SVG y tablas del DOM), además de
 * estados con filtros cambiados y vistas móviles.
 *
 * Uso (desde esta carpeta): node tools/auditar-visual.mjs <carpeta_salida>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const HASH = "#/area/ciencia-de-datos/clientes-campanas";
const SALIDA = process.argv[2] ?? "../../evidencias/clientes-campanas/auditoria";
const CAPTURAS = join(SALIDA, "capturas");
const DATOS = join(SALIDA, "datos_graficas");
mkdirSync(CAPTURAS, { recursive: true });
mkdirSync(DATOS, { recursive: true });

const manifiesto = { generado: new Date().toISOString(), sitio: SITIO, capturas: [], datos: [], estados: [] };

const csv = (filas) => {
  const escapar = (valor) => {
    const texto = valor === null || valor === undefined ? "" : String(valor);
    return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  return filas.map((fila) => fila.map(escapar).join(",")).join("\n") + "\n";
};

const guardarCsv = (nombre, filas) => {
  writeFileSync(join(DATOS, nombre), csv(filas), "utf8");
  manifiesto.datos.push(nombre);
};

/** Convierte "x1,y1 x2,y2" en filas numéricas. */
const puntos = (texto) =>
  String(texto ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((par) => {
      const [x, y] = par.split(",").map(Number);
      return { x, y };
    });

const navegador = await chromium.launch();

async function abrir(seccion, viewport = { width: 1440, height: 1300 }) {
  const pagina = await navegador.newPage({ viewport, deviceScaleFactor: 1 });
  await pagina.goto(`${SITIO}/?cg_pantalla=${seccion}${HASH}`, { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector('[data-testid="cg-contenido"]', { timeout: 180000 });
  await pagina.waitForTimeout(seccion === "perfiles" ? 2600 : 1800);
  return pagina;
}

/**
 * Deja el inicio del tablero justo debajo de la cabecera fija del portafolio,
 * para que la captura general no empiece a media página ni tape contenido.
 */
async function posicionarInicio(pagina) {
  await pagina.evaluate(() => {
    /* El portafolio usa desplazamiento suave: se desactiva para que la captura
       no se tome a mitad de la animación. */
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    const fija = [...document.querySelectorAll("header")].find((cabecera) => {
      const estilo = getComputedStyle(cabecera);
      return estilo.position === "fixed" || estilo.position === "sticky";
    });
    const alto = fija ? fija.getBoundingClientRect().height : 0;
    const app = document.querySelector(".cg-app");
    if (!app) return;
    window.scrollTo(0, Math.max(0, Math.round(app.getBoundingClientRect().top + window.scrollY - alto - 12)));
  });
  await pagina.waitForTimeout(700);
}

async function capturaPantalla(pagina, archivo) {
  await posicionarInicio(pagina);
  await pagina.screenshot({ path: join(CAPTURAS, archivo), fullPage: false });
  manifiesto.capturas.push(archivo);
}

async function capturaBloque(pagina, testid, archivo) {
  const bloque = pagina.locator(`[data-testid="${testid}"]`).first();
  await bloque.scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(200);
  await bloque.screenshot({ path: join(CAPTURAS, archivo) });
  manifiesto.capturas.push(archivo);
}

/** Cifras de un bloque (etiqueta, valor, pie). */
async function leerCifras(pagina, testid) {
  return pagina.$$eval(`[data-testid="${testid}"] .cg-cifra`, (nodos) =>
    nodos.map((nodo) => ({
      etiqueta: nodo.querySelector(".cg-cifra-etq")?.textContent?.trim() ?? "",
      valor: nodo.querySelector(".cg-cifra-valor")?.textContent?.trim() ?? "",
      pie: nodo.querySelector(".cg-cifra-pie")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    })),
  );
}

/**
 * Cambia un control segmentado y devuelve la etiqueta de la opción que queda activa.
 * Se elige siempre una opción distinta de la activa para que el estado capturado
 * represente de verdad un filtro cambiado.
 */
async function cambiarSegmentado(pagina, testid) {
  const botones = pagina.locator(`[data-testid="${testid}"] button`);
  const total = await botones.count();
  for (let indice = 0; indice < total; indice += 1) {
    const boton = botones.nth(indice);
    if ((await boton.getAttribute("aria-pressed")) !== "true") {
      const etiqueta = (await boton.textContent())?.trim() ?? "";
      await boton.click();
      await pagina.waitForTimeout(1200);
      return etiqueta;
    }
  }
  await pagina.waitForTimeout(800);
  return "";
}

/* ------------------------------------------------------------------ 01 Proyecto */
{
  const pagina = await abrir("proyecto");
  await capturaPantalla(pagina, "01_proyecto.png", "cg-proyecto-pregunta");
  for (const [testid, archivo] of [
    ["cg-proyecto-pregunta", "01a_indicadores_pregunta.png"],
    ["cg-proyecto-resultados", "01b_indicadores_resultados.png"],
    ["cg-proyecto-fuentes", "01c_fuentes_y_artefactos.png"],
    ["cg-proyecto-proceso", "01d_proceso_y_segmentos.png"],
    ["cg-proyecto-correcciones", "01e_correcciones.png"],
  ]) {
    await capturaBloque(pagina, testid, archivo);
  }
  const pregunta = await leerCifras(pagina, "cg-proyecto-pregunta");
  const resultados = await leerCifras(pagina, "cg-proyecto-resultados");
  guardarCsv("01_indicadores.csv", [
    ["bloque", "etiqueta", "valor", "pie"],
    ...pregunta.map((c) => ["pregunta", c.etiqueta, c.valor, c.pie]),
    ...resultados.map((c) => ["resultados", c.etiqueta, c.valor, c.pie]),
  ]);
  await pagina.close();
}

/* ------------------------------------------------------------------ 02 Perfiles */
{
  const pagina = await abrir("perfiles");
  await capturaPantalla(pagina, "02_perfiles.png", "cg-perfiles-tamano");
  for (const [testid, archivo] of [
    ["cg-perfiles-tamano", "02a_indicadores_tamano.png"],
    ["cg-perfiles-beeswarm", "02b_distribucion_beeswarm.png"],
    ["cg-perfiles-paralelas", "02c_coordenadas_paralelas.png"],
    ["cg-perfiles-departamentos", "02d_matriz_departamentos.png"],
  ]) {
    await capturaBloque(pagina, testid, archivo);
  }

  const cifras = await leerCifras(pagina, "cg-perfiles-tamano");
  guardarCsv("02a_indicadores_tamano.csv", [["etiqueta", "valor", "pie"], ...cifras.map((c) => [c.etiqueta, c.valor, c.pie])]);

  /* Beeswarm: círculos con su título (que incluye el valor y el hogar) + mediana. */
  const beeswarm = await pagina.evaluate(() => {
    const panel = document.querySelector('[data-testid="cg-perfiles-beeswarm"]');
    const svg = panel.querySelector("svg");
    const circulos = [...svg.querySelectorAll("circle")].map((c) => ({
      cx: Number(c.getAttribute("cx")),
      cy: Number(c.getAttribute("cy")),
      r: Number(c.getAttribute("r")),
      color: c.getAttribute("fill"),
      titulo: c.querySelector("title")?.textContent ?? "",
    }));
    const lineas = [...svg.querySelectorAll("line")].map((l) => ({
      x1: Number(l.getAttribute("x1")),
      x2: Number(l.getAttribute("x2")),
      y1: Number(l.getAttribute("y1")),
      y2: Number(l.getAttribute("y2")),
      color: l.getAttribute("stroke"),
      ancho: l.getAttribute("stroke-width"),
    }));
    const bandas = [...svg.querySelectorAll("rect")].map((r) => ({
      x: Number(r.getAttribute("x")),
      ancho: Number(r.getAttribute("width")),
      y: Number(r.getAttribute("y")),
      alto: Number(r.getAttribute("height")),
      color: r.getAttribute("fill"),
    }));
    const etiquetas = [...svg.querySelectorAll("text")].map((t) => t.textContent);
    return { circulos, lineas, bandas, etiquetas, viewBox: svg.getAttribute("viewBox"), metrica: panel.querySelector("select")?.value ?? "" };
  });
  writeFileSync(join(DATOS, "02b_beeswarm.json"), JSON.stringify(beeswarm, null, 1), "utf8");
  guardarCsv("02b_beeswarm_puntos.csv", [
    ["cx_px", "cy_px", "radio", "color", "titulo"],
    ...beeswarm.circulos.map((c) => [c.cx, c.cy, c.r, c.color, c.titulo]),
  ]);
  guardarCsv("02b_beeswarm_estadisticas.csv", [
    ["elemento", "x1", "x2", "y1", "y2", "color", "ancho"],
    ...beeswarm.lineas.map((l) => ["linea", l.x1, l.x2, l.y1, l.y2, l.color, l.ancho]),
    ...beeswarm.bandas.map((b) => ["banda_cuartiles", b.x, b.x + b.ancho, b.y, b.y + b.alto, b.color, ""]),
    ...beeswarm.etiquetas.map((t) => ["etiqueta", "", "", "", "", "", t]),
  ]);

  /* Coordenadas paralelas: líneas de selección con su título y ejes. */
  const paralelas = await pagina.evaluate(() => {
    const panel = document.querySelector('[data-testid="cg-perfiles-paralelas"]');
    const svg = panel.querySelector("svg");
    const lineas = [...svg.querySelectorAll("polyline.cg-hit")].map((p) => ({
      puntos: p.getAttribute("points"),
      titulo: p.querySelector("title")?.textContent ?? "",
      hogar: p.getAttribute("aria-label") ?? "",
    }));
    const visibles = [...svg.querySelectorAll("polyline:not(.cg-hit)")].map((p) => ({
      puntos: p.getAttribute("points"),
      color: p.getAttribute("stroke"),
      opacidad: p.getAttribute("opacity"),
    }));
    const ejes = [...svg.querySelectorAll("text")].map((t) => t.textContent);
    return { lineas, visibles, ejes, viewBox: svg.getAttribute("viewBox"), seleccionados: panel.querySelector('[data-testid="cg-perfiles-seleccionados"]')?.textContent ?? "" };
  });
  writeFileSync(join(DATOS, "02c_paralelas.json"), JSON.stringify(paralelas, null, 1), "utf8");
  guardarCsv("02c_paralelas_hogares.csv", [
    ["hogar", "titulo", "x1", "y1", "x2", "y2", "x3", "y3", "x4", "y4", "x5", "y5"],
    ...paralelas.lineas.map((l) => {
      const pts = puntos(l.puntos);
      return [l.hogar, l.titulo, ...pts.flatMap((p) => [p.x, p.y])];
    }),
  ]);
  guardarCsv("02c_paralelas_ejes.csv", [["texto"], ...paralelas.ejes.map((t) => [t])]);

  /* Matriz de departamentos: se lee de la tabla real del DOM. */
  const matriz = await pagina.evaluate(() => {
    const panel = document.querySelector('[data-testid="cg-perfiles-departamentos"]');
    const tabla = panel.querySelector("table.cg-calor");
    const encabezados = [...tabla.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    const filas = [...tabla.querySelectorAll("tbody tr")].map((tr) => {
      const celdas = [...tr.querySelectorAll("th,td")].map((celda) => {
        const partes = celda.innerText.split("\n").map((t) => t.trim()).filter(Boolean);
        return { valor: partes[0] ?? "", soporte: partes[1] ?? "", fondo: getComputedStyle(celda).backgroundColor };
      });
      return celdas;
    });
    return { encabezados, filas: filas.map((f) => f.map((c) => c.valor)), soportes: filas.map((f) => f.map((c) => c.soporte)), fondos: filas.map((f) => f.map((c) => c.fondo)) };
  });
  writeFileSync(join(DATOS, "02d_departamentos.json"), JSON.stringify(matriz, null, 1), "utf8");
  guardarCsv("02d_departamentos.csv", [
    matriz.encabezados,
    ...matriz.filas.map((fila, i) => [fila[0], ...fila.slice(1).map((v, j) => `${v} (${matriz.soportes[i][j + 1]})`)]),
  ]);

  /* Estado 1: otra métrica del enjambre. */
  const metricaAlterna = await pagina.selectOption('[data-testid="cg-perfiles-metrica"]', { index: 1 });
  await pagina.waitForTimeout(900);
  await capturaBloque(pagina, "cg-perfiles-beeswarm", "02b_distribucion_beeswarm_canastas.png");
  manifiesto.estados.push(`02b_distribucion_beeswarm_canastas.png (métrica: ${metricaAlterna})`);

  /* Estado 1b: ambos segmentos visibles en el enjambre. */
  await pagina.locator('[data-testid="cg-perfiles-segmento-destacado"] button').first().click();
  await pagina.waitForTimeout(900);
  await capturaBloque(pagina, "cg-perfiles-beeswarm", "02b_distribucion_beeswarm_ambos_segmentos.png");
  manifiesto.estados.push("02b_distribucion_beeswarm_ambos_segmentos.png (segmento: Ambos)");

  /* Estado 2: otro corte de segmentación. */
  const corteElegido = await cambiarSegmentado(pagina, "cg-perfiles-corte");
  await capturaBloque(pagina, "cg-perfiles-beeswarm", "02b_distribucion_beeswarm_otro_corte.png");
  await capturaBloque(pagina, "cg-perfiles-tamano", "02a_indicadores_tamano_otro_corte.png");
  const cifrasCorte = await leerCifras(pagina, "cg-perfiles-tamano");
  guardarCsv("02a_indicadores_tamano_otro_corte.csv", [
    ["corte", "etiqueta", "valor", "pie"],
    ...cifrasCorte.map((c) => [corteElegido, c.etiqueta, c.valor, c.pie.replace(/\s+/g, " ")]),
  ]);
  manifiesto.estados.push(`02b_distribucion_beeswarm_otro_corte.png (corte: ${corteElegido})`);
  await pagina.close();
}

/* ------------------------------------------------------------------ 03 Evolución */
{
  const pagina = await abrir("evolucion");
  await capturaPantalla(pagina, "03_evolucion.png", "cg-evolucion-alluvial");
  for (const [testid, archivo] of [
    ["cg-evolucion-alluvial", "03a_alluvial_transiciones.png"],
    ["cg-evolucion-estabilidad", "03b_estabilidad_segmentacion.png"],
  ]) {
    await capturaBloque(pagina, testid, archivo);
  }
  const alluvial = await pagina.evaluate(() => {
    const panel = document.querySelector('[data-testid="cg-evolucion-alluvial"]');
    const svg = panel.querySelector("svg");
    const cintas = [...svg.querySelectorAll("path")].map((p) => ({
      d: p.getAttribute("d"),
      color: p.getAttribute("fill"),
      opacidad: p.getAttribute("opacity"),
      titulo: p.querySelector("title")?.textContent ?? "",
    }));
    const nodos = [...svg.querySelectorAll("rect")].map((r) => ({
      x: Number(r.getAttribute("x")),
      y: Number(r.getAttribute("y")),
      ancho: Number(r.getAttribute("width")),
      alto: Number(r.getAttribute("height")),
      color: r.getAttribute("fill"),
    }));
    const textos = [...svg.querySelectorAll("text")].map((t) => ({ x: Number(t.getAttribute("x")), y: Number(t.getAttribute("y")), texto: t.textContent }));
    const cifras = [...panel.querySelectorAll(".cg-cifra")].map((n) => ({
      etiqueta: n.querySelector(".cg-cifra-etq")?.textContent ?? "",
      valor: n.querySelector(".cg-cifra-valor")?.textContent ?? "",
      pie: n.querySelector(".cg-cifra-pie")?.textContent ?? "",
    }));
    return { cintas, nodos, textos, cifras, viewBox: svg.getAttribute("viewBox") };
  });
  writeFileSync(join(DATOS, "03a_alluvial.json"), JSON.stringify(alluvial, null, 1), "utf8");
  guardarCsv("03a_alluvial_cintas.csv", [["titulo", "color", "opacidad", "d"], ...alluvial.cintas.map((c) => [c.titulo, c.color, c.opacidad, c.d])]);
  guardarCsv("03a_alluvial_nodos.csv", [["x", "y", "ancho", "alto", "color"], ...alluvial.nodos.map((n) => [n.x, n.y, n.ancho, n.alto, n.color])]);
  guardarCsv("03a_alluvial_etiquetas.csv", [["x", "y", "texto"], ...alluvial.textos.map((t) => [t.x, t.y, t.texto])]);
  guardarCsv("03a_indicadores.csv", [["etiqueta", "valor", "pie"], ...alluvial.cifras.map((c) => [c.etiqueta, c.valor, c.pie.replace(/\s+/g, " ")])]);

  /* Estado: otro par de cortes y un flujo seleccionado. */
  const parElegido = await cambiarSegmentado(pagina, "cg-evolucion-par");
  await capturaBloque(pagina, "cg-evolucion-alluvial", "03a_alluvial_otro_par.png");
  guardarCsv("03a_alluvial_cintas_otro_par.csv", [["titulo"], ...(await pagina.$$eval('[data-testid="cg-evolucion-alluvial"] svg path', (rutas) => rutas.map((p) => [p.querySelector("title")?.textContent ?? ""])))]);
  await pagina.locator('[data-testid="cg-evolucion-alluvial"] svg path').first().click();
  await pagina.waitForTimeout(700);
  await capturaBloque(pagina, "cg-evolucion-alluvial", "03a_alluvial_flujo_seleccionado.png");
  manifiesto.estados.push(`03a_alluvial_otro_par.png (par: ${parElegido})`, "03a_alluvial_flujo_seleccionado.png");
  await pagina.close();
}

/* ------------------------------------------------------------------ 04 Campañas */
{
  const pagina = await abrir("campanas");
  await capturaPantalla(pagina, "04_campanas.png", "cg-campanas-resumen");
  for (const [testid, archivo] of [
    ["cg-campanas-resumen", "04a_indicadores_propension.png"],
    ["cg-campanas-targeting", "04b_curva_targeting.png"],
    ["cg-campanas-calibracion", "04c_calibracion_deciles.png"],
    ["cg-campanas-lista", "04d_tabla_campanas.png"],
  ]) {
    await capturaBloque(pagina, testid, archivo);
  }

  const cifras = await leerCifras(pagina, "cg-campanas-resumen");
  guardarCsv("04a_indicadores_propension.csv", [["etiqueta", "valor", "pie"], ...cifras.map((c) => [c.etiqueta, c.valor, c.pie.replace(/\s+/g, " ")])]);

  const targeting = await pagina.evaluate(() => {
    const panel = document.querySelector('[data-testid="cg-campanas-targeting"]');
    const svg = panel.querySelector("svg");
    const lineas = [...svg.querySelectorAll("polyline")].map((p) => ({ puntos: p.getAttribute("points"), color: p.getAttribute("stroke"), guion: p.getAttribute("stroke-dasharray") }));
    const referencias = [...svg.querySelectorAll("line")].map((l) => ({
      x1: Number(l.getAttribute("x1")),
      y1: Number(l.getAttribute("y1")),
      x2: Number(l.getAttribute("x2")),
      y2: Number(l.getAttribute("y2")),
      color: l.getAttribute("stroke"),
      guion: l.getAttribute("stroke-dasharray"),
    }));
    const circulos = [...svg.querySelectorAll("circle")].map((c) => ({ cx: Number(c.getAttribute("cx")), cy: Number(c.getAttribute("cy")), r: Number(c.getAttribute("r")), titulo: c.querySelector("title")?.textContent ?? "" }));
    const textos = [...svg.querySelectorAll("text")].map((t) => t.textContent);
    return { lineas, referencias, circulos, textos, viewBox: svg.getAttribute("viewBox") };
  });
  writeFileSync(join(DATOS, "04b_targeting.json"), JSON.stringify(targeting, null, 1), "utf8");
  guardarCsv("04b_targeting_curvas.csv", [
    ["serie", "color", "x_px", "y_px"],
    ...targeting.lineas.flatMap((linea, i) => puntos(linea.puntos).map((p) => [`linea_${i + 1}`, linea.color, p.x, p.y])),
    ...targeting.referencias.map((r) => ["referencia", r.color, r.x1, r.y1]),
  ]);
  guardarCsv("04b_targeting_puntos.csv", [["cx_px", "cy_px", "radio", "titulo"], ...targeting.circulos.map((c) => [c.cx, c.cy, c.r, c.titulo])]);

  const calibracion = await pagina.evaluate(() => {
    const panel = document.querySelector('[data-testid="cg-campanas-calibracion"]');
    const svg = panel.querySelector("svg");
    return {
      circulos: [...svg.querySelectorAll("circle")].map((c) => ({ cx: Number(c.getAttribute("cx")), cy: Number(c.getAttribute("cy")), r: Number(c.getAttribute("r")), titulo: c.querySelector("title")?.textContent ?? "" })),
      lineas: [...svg.querySelectorAll("line")].map((l) => ({ x1: l.getAttribute("x1"), y1: l.getAttribute("y1"), x2: l.getAttribute("x2"), y2: l.getAttribute("y2"), guion: l.getAttribute("stroke-dasharray") })),
      textos: [...svg.querySelectorAll("text")].map((t) => t.textContent),
      viewBox: svg.getAttribute("viewBox"),
    };
  });
  writeFileSync(join(DATOS, "04c_calibracion.json"), JSON.stringify(calibracion, null, 1), "utf8");
  guardarCsv("04c_calibracion_deciles.csv", [["cx_px", "cy_px", "radio", "titulo"], ...calibracion.circulos.map((c) => [c.cx, c.cy, c.r, c.titulo])]);

  const campanas = await pagina.$$eval('[data-testid="cg-campanas-lista"] table tbody tr', (filas) =>
    filas.map((tr) => [...tr.querySelectorAll("th,td")].map((c) => c.textContent.trim())),
  );
  const encabezadoCampanas = await pagina.$$eval('[data-testid="cg-campanas-lista"] thead th', (ths) => ths.map((th) => th.textContent.trim()));
  guardarCsv("04d_campanas.csv", [encabezadoCampanas, ...campanas]);

  /* Ficha de una campaña concreta (fila 3 de la tabla, que es clicable). */
  const fila = pagina.locator('[data-testid="cg-campanas-lista"] table tbody tr').nth(2);
  const etiquetaFila = (await fila.locator("th").first().textContent())?.trim() ?? "";
  await fila.click();
  await pagina.waitForTimeout(900);
  await capturaBloque(pagina, "cg-campanas-lista", "04d_tabla_campanas_ficha.png");
  manifiesto.estados.push(`04d_tabla_campanas_ficha.png (campaña: ${etiquetaFila})`);

  /* Estado: otro corte de propensión. */
  const corteElegido = await cambiarSegmentado(pagina, "cg-campanas-corte");
  await capturaBloque(pagina, "cg-campanas-targeting", "04b_curva_targeting_otro_corte.png");
  await capturaBloque(pagina, "cg-campanas-resumen", "04a_indicadores_propension_otro_corte.png");
  const cifrasCorte = await leerCifras(pagina, "cg-campanas-resumen");
  guardarCsv("04a_indicadores_propension_otro_corte.csv", [
    ["corte", "etiqueta", "valor", "pie"],
    ...cifrasCorte.map((c) => [corteElegido, c.etiqueta, c.valor, c.pie.replace(/\s+/g, " ")]),
  ]);
  const puntosCorte = await pagina.evaluate(() => {
    const svg = document.querySelector('[data-testid="cg-campanas-targeting"] svg');
    return [...svg.querySelectorAll("polyline")].map((p) => p.getAttribute("points"));
  });
  guardarCsv("04b_targeting_curvas_otro_corte.csv", [
    ["corte", "serie", "x_px", "y_px"],
    ...puntosCorte.flatMap((texto, i) => puntos(texto).map((p) => [corteElegido, `linea_${i + 1}`, p.x, p.y])),
  ]);
  manifiesto.estados.push(`04b_curva_targeting_otro_corte.png (corte: ${corteElegido})`);
  await pagina.close();
}

/* ------------------------------------------------------------------ 05 Incrementalidad */
{
  const pagina = await abrir("incrementalidad");
  await capturaPantalla(pagina, "05_incrementalidad.png", "cg-incrementalidad-modelos");
  for (const [testid, archivo] of [
    ["cg-incrementalidad-contexto", "05a_contexto_criteo.png"],
    ["cg-incrementalidad-modelos", "05b_auuc_modelos_semillas.png"],
    ["cg-incrementalidad-curvas", "05c_curvas_uplift.png"],
    ["cg-incrementalidad-rangos", "05d_rangos_semillas.png"],
  ]) {
    await capturaBloque(pagina, testid, archivo);
  }

  const cifras = await leerCifras(pagina, "cg-incrementalidad-contexto");
  guardarCsv("05a_contexto_criteo.csv", [["etiqueta", "valor", "pie"], ...cifras.map((c) => [c.etiqueta, c.valor, c.pie.replace(/\s+/g, " ")])]);

  const modelos = await pagina.evaluate(() => {
    const panel = document.querySelector('[data-testid="cg-incrementalidad-modelos"]');
    const svg = panel.querySelector("svg");
    return {
      circulos: [...svg.querySelectorAll("circle")].map((c) => ({ cx: Number(c.getAttribute("cx")), cy: Number(c.getAttribute("cy")), r: Number(c.getAttribute("r")), color: c.getAttribute("fill"), titulo: c.querySelector("title")?.textContent ?? "" })),
      rangos: [...svg.querySelectorAll("line")].map((l) => ({ x1: Number(l.getAttribute("x1")), x2: Number(l.getAttribute("x2")), y1: Number(l.getAttribute("y1")), y2: Number(l.getAttribute("y2")), color: l.getAttribute("stroke"), ancho: l.getAttribute("stroke-width") })),
      etiquetas: [...svg.querySelectorAll("text")].map((t) => ({ x: Number(t.getAttribute("x")), y: Number(t.getAttribute("y")), texto: t.textContent })),
      viewBox: svg.getAttribute("viewBox"),
    };
  });
  writeFileSync(join(DATOS, "05b_auuc_modelos.json"), JSON.stringify(modelos, null, 1), "utf8");
  guardarCsv("05b_auuc_puntos.csv", [["cx_px", "cy_px", "radio", "color", "titulo"], ...modelos.circulos.map((c) => [c.cx, c.cy, c.r, c.color, c.titulo])]);
  guardarCsv("05b_auuc_rangos.csv", [["x1", "x2", "y", "color", "ancho"], ...modelos.rangos.map((r) => [r.x1, r.x2, r.y1, r.color, r.ancho])]);
  guardarCsv("05b_auuc_etiquetas.csv", [["x", "y", "texto"], ...modelos.etiquetas.map((t) => [t.x, t.y, t.texto])]);

  const curvas = await pagina.evaluate(() => {
    const panel = document.querySelector('[data-testid="cg-incrementalidad-curvas"]');
    const svg = panel.querySelector("svg");
    return {
      lineas: [...svg.querySelectorAll("polyline")].map((p) => ({ puntos: p.getAttribute("points"), color: p.getAttribute("stroke"), guion: p.getAttribute("stroke-dasharray"), ancho: p.getAttribute("stroke-width") })),
      leyenda: [...panel.querySelectorAll(".cg-leyenda li")].map((li) => ({ texto: li.textContent.trim(), color: getComputedStyle(li.querySelector(".cg-muestra")).backgroundColor })),
      textos: [...svg.querySelectorAll("text")].map((t) => t.textContent),
      viewBox: svg.getAttribute("viewBox"),
    };
  });
  writeFileSync(join(DATOS, "05c_curvas_uplift.json"), JSON.stringify(curvas, null, 1), "utf8");
  guardarCsv("05c_curvas_uplift.csv", [
    ["serie", "color", "x_px", "y_px"],
    ...curvas.lineas.flatMap((linea, i) => puntos(linea.puntos).map((p) => [`${curvas.leyenda[i]?.texto ?? `serie_${i + 1}`}`, linea.color, p.x, p.y])),
  ]);
  guardarCsv("05c_curvas_leyenda.csv", [["texto", "color"], ...curvas.leyenda.map((l) => [l.texto, l.color])]);

  /* Estado: resultado «Conversiones». */
  const resultadoElegido = await cambiarSegmentado(pagina, "cg-incrementalidad-resultado");
  await capturaBloque(pagina, "cg-incrementalidad-modelos", "05b_auuc_modelos_otro_resultado.png");
  const puntosResultado = await pagina.evaluate(() => {
    const svg = document.querySelector('[data-testid="cg-incrementalidad-modelos"] svg');
    return [...svg.querySelectorAll("circle")].map((c) => c.querySelector("title")?.textContent ?? "");
  });
  guardarCsv("05b_auuc_puntos_otro_resultado.csv", [["resultado", "titulo"], ...puntosResultado.map((t) => [resultadoElegido, t])]);
  manifiesto.estados.push(`05b_auuc_modelos_otro_resultado.png (resultado: ${resultadoElegido})`);
  await pagina.close();
}

/* ------------------------------------------------------------------ 06 Experimento */
{
  const pagina = await abrir("experimento");
  await capturaPantalla(pagina, "06_experimento.png", "cg-experimento-calculadora");
  for (const [testid, archivo] of [
    ["cg-experimento-estado", "06a_estado_experimento.png"],
    ["cg-experimento-diseno", "06b_diseno_experimento.png"],
    ["cg-experimento-calculadora", "06c_calculadora_potencia.png"],
    ["cg-experimento-escenarios", "06d_escenarios_potencia.png"],
    ["cg-experimento-capacidad", "06e_capacidad_actual.png"],
    ["cg-experimento-herramientas", "06f_plantillas.png"],
  ]) {
    await capturaBloque(pagina, testid, archivo);
  }

  /* La tabla de escenarios mezcla filas de segmento con filas de total: sus cifras
     se entregan normalizadas en datos_graficas/06d_escenarios_datos_reales.csv.
     Aquí solo se captura, no se vuelca una tabla con columnas irregulares. */

  const calculo = await pagina.$$eval('[data-testid="cg-experimento-calculadora"] .cg-cifra', (nodos) =>
    nodos.map((n) => ({
      etiqueta: n.querySelector(".cg-cifra-etq")?.textContent ?? "",
      valor: n.querySelector(".cg-cifra-valor")?.textContent ?? "",
      pie: n.querySelector(".cg-cifra-pie")?.textContent ?? "",
    })),
  );
  guardarCsv("06c_calculadora.csv", [["etiqueta", "valor", "pie"], ...calculo.map((c) => [c.etiqueta, c.valor, c.pie.replace(/\s+/g, " ")])]);

  const capacidad = await leerCifras(pagina, "cg-experimento-capacidad");
  guardarCsv("06e_capacidad.csv", [["etiqueta", "valor", "pie"], ...capacidad.map((c) => [c.etiqueta, c.valor, c.pie.replace(/\s+/g, " ")])]);

  /* Estado: efecto mínimo detectable más pequeño. */
  const mdeElegido = await pagina.selectOption('[data-testid="cg-experimento-mde"]', { index: 0 });
  await pagina.waitForTimeout(800);
  await capturaBloque(pagina, "cg-experimento-calculadora", "06c_calculadora_otro_mde.png");
  const calculoOtro = await pagina.$$eval('[data-testid="cg-experimento-calculadora"] .cg-cifra', (nodos) =>
    nodos.map((n) => ({
      etiqueta: n.querySelector(".cg-cifra-etq")?.textContent ?? "",
      valor: n.querySelector(".cg-cifra-valor")?.textContent ?? "",
      pie: n.querySelector(".cg-cifra-pie")?.textContent ?? "",
    })),
  );
  guardarCsv("06c_calculadora_otro_mde.csv", [["etiqueta", "valor", "pie"], ...calculoOtro.map((c) => [c.etiqueta, c.valor, c.pie.replace(/\s+/g, " ")])]);
  manifiesto.estados.push(`06c_calculadora_otro_mde.png (mde: ${mdeElegido})`);
  await pagina.close();
}

/* ------------------------------------------------------- tablas de cada pantalla */
/**
 * Las tablas también son visualizaciones del tablero (son la alternativa
 * accesible de cada gráfica). Se abren, se capturan y se vuelcan a CSV.
 * Las tablas largas se capturan desde su inicio y el CSV conserva todas las filas.
 */
const TABLAS = [
  { seccion: "proyecto", testid: "cg-proyecto-artefactos", archivo: "01f_tabla_artefactos.png", csv: "01f_artefactos.csv" },
  { seccion: "perfiles", testid: "cg-perfiles-medianas", archivo: "02a2_medianas_por_segmento.png", csv: "02a2_medianas_por_segmento.csv" },
  { seccion: "perfiles", testid: "cg-perfiles-cuantiles", archivo: "02b2_cuantiles_universo.png", csv: "02b2_cuantiles_universo.csv" },
  { seccion: "perfiles", testid: "cg-perfiles-tabla-hogares", archivo: "02c2_tabla_hogares.png", csv: "02c2_tabla_hogares.csv" },
  { seccion: "perfiles", testid: "cg-perfiles-tabla-departamentos", archivo: "02d2_tabla_departamentos.png", csv: "02d2_tabla_departamentos.csv" },
  { seccion: "perfiles", testid: "cg-perfiles-diagnostico-k", archivo: "02e_diagnostico_k.png", csv: "02e_diagnostico_k.csv" },
  { seccion: "evolucion", testid: "cg-evolucion-tabla", archivo: "03a2_tabla_transiciones.png", csv: "03a2_tabla_transiciones.csv" },
  { seccion: "campanas", testid: "cg-campanas-metricas-tabla", archivo: "04a2_tabla_metricas_grupo.png", csv: "04a2_tabla_metricas_grupo.csv" },
  { seccion: "campanas", testid: "cg-campanas-targeting-tabla", archivo: "04b2_tabla_targeting.png", csv: "04b2_tabla_targeting.csv" },
  { seccion: "campanas", testid: "cg-campanas-calibracion-tabla", archivo: "04c2_tabla_calibracion.png", csv: "04c2_tabla_calibracion.csv" },
  { seccion: "incrementalidad", testid: "cg-incrementalidad-tabla", archivo: "05b2_tabla_carreras_benchmark.png", csv: "05b2_tabla_carreras_benchmark.csv" },
  { seccion: "incrementalidad", testid: "cg-incrementalidad-resumen", archivo: "05b3_tabla_resumen_modelos.png", csv: "05b3_tabla_resumen_modelos.csv" },
  { seccion: "incrementalidad", testid: "cg-incrementalidad-curvas-tabla", archivo: "05c2_tabla_curvas_deciles.png", csv: "05c2_tabla_curvas_deciles.csv" },
  { seccion: "incrementalidad", testid: "cg-incrementalidad-rangos-tabla", archivo: "05d2_tabla_rangos.png", csv: "05d2_tabla_rangos.csv" },
  { seccion: "experimento", testid: "cg-experimento-tabla", archivo: "06c2_tabla_muestra_por_brazo.png", csv: "06c2_tabla_muestra_por_brazo.csv" },
];

async function leerTabla(pagina, testid) {
  return pagina.evaluate((id) => {
    const panel = document.querySelector(`[data-testid="${id}"]`);
    const tabla = panel?.querySelector("table");
    if (!tabla) return null;
    const encabezado = [...tabla.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    const filas = [...tabla.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("th,td")].map((c) => c.textContent.replace(/\s+/g, " ").trim()));
    return { encabezado, filas };
  }, testid);
}

const paginasPorSeccion = new Map();
for (const tabla of TABLAS) {
  let pagina = paginasPorSeccion.get(tabla.seccion);
  if (!pagina) {
    pagina = await abrir(tabla.seccion);
    paginasPorSeccion.set(tabla.seccion, pagina);
  }
  const bloque = pagina.locator(`[data-testid="${tabla.testid}"]`).first();
  if (!(await bloque.count())) {
    console.warn(`sin bloque: ${tabla.testid}`);
    continue;
  }
  try {
    await bloque.scrollIntoViewIfNeeded();
    await bloque.evaluate((nodo) => {
      /* Abre el propio bloque y todos los <details> que lo contienen: algunas
         tablas están dentro de la nota de metodología. */
      let actual = nodo;
      while (actual) {
        if (actual.tagName === "DETAILS") actual.open = true;
        actual = actual.parentElement;
      }
    });
    await pagina.waitForTimeout(500);
    const contenido = await leerTabla(pagina, tabla.testid);
    if (contenido && contenido.filas.length) {
      guardarCsv(tabla.csv, [contenido.encabezado, ...contenido.filas]);
    }
    const largo = !contenido || contenido.filas.length > 40;
    if (largo) {
      /* Tabla larga: se captura desde arriba, con la cabecera visible. */
      await bloque.scrollIntoViewIfNeeded();
      await pagina.waitForTimeout(400);
      await pagina.screenshot({ path: join(CAPTURAS, tabla.archivo), fullPage: false });
    } else {
      await bloque.screenshot({ path: join(CAPTURAS, tabla.archivo) });
    }
    manifiesto.capturas.push(tabla.archivo);
  } catch (error) {
    /* Si el bloque no se puede aislar (por ejemplo, una tabla muy alta),
       se deja constancia y se sigue con el resto. */
    await pagina.screenshot({ path: join(CAPTURAS, tabla.archivo), fullPage: false });
    manifiesto.capturas.push(tabla.archivo);
    console.warn(`captura parcial: ${tabla.testid} · ${String(error).slice(0, 120)}`);
  }
}
for (const pagina of paginasPorSeccion.values()) await pagina.close();

/* ------------------------------------------------------------------ móvil */
for (const [seccion, archivo] of [
  ["proyecto", "movil_01_proyecto.png"],
  ["perfiles", "movil_02_perfiles.png"],
  ["evolucion", "movil_03_evolucion.png"],
  ["campanas", "movil_04_campanas.png"],
  ["incrementalidad", "movil_05_incrementalidad.png"],
  ["experimento", "movil_06_experimento.png"],
]) {
  const pagina = await abrir(seccion, { width: 390, height: 844 });
  await posicionarInicio(pagina);
  await pagina.screenshot({ path: join(CAPTURAS, archivo), fullPage: false });
  manifiesto.capturas.push(archivo);
  await pagina.close();
}

writeFileSync(join(SALIDA, "manifiesto_capturas.json"), JSON.stringify(manifiesto, null, 1), "utf8");
await navegador.close();
console.log(`capturas: ${manifiesto.capturas.length} · datos: ${manifiesto.datos.length}`);
