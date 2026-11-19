/**
 * Recorrido comercial completo, sobre el build servido.
 *
 * Reproduce el recorrido del encargo y comprueba la coherencia entre lo que se pide a la API y lo
 * que se ve, sin dar por bueno «no hubo errores de consola»:
 *
 *  1. Abrir «Resultados» sin selección implícita de tienda.
 *  2. Elegir California · Tienda 3.
 *  3. Buscar FOODS_3_090 por su código.
 *  4. Identificar «Artículo 090 · Alimentos · Departamento 3».
 *  5. Consultar las cuatro semanas y el total previsto.
 *  6. Abrir el detalle y confirmar que es la misma serie.
 *  7. Consultar su evaluación histórica y el número de cortes.
 *  8. Cambiar a comparación histórica sin perder contexto.
 *  9. Descargar todas las filas del filtro.
 * 10. Verificar identidad, fechas, revisión y cifras del CSV.
 * 11. Volver a todas las tiendas y comprobar el mismo artículo por tienda.
 * 12. Atrás, adelante y recarga.
 *
 * Casos límite: búsqueda sin resultados, serie sin evaluación (caso controlado con respuesta
 * interceptada), cambio rápido de filtros, error recuperable de red, 390 px y teclado.
 *
 * Cada paso se registra con su resultado para poder leer el recorrido, no solo el veredicto.
 */
import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";
const EV = "../../evidencias/comercial";

const url = (query = "") => `${SITIO}/${query ? `?${query}` : ""}${HASH}`;
const fallos = [];
const pasos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
  return Boolean(condicion);
};
const paso = (numero, texto, ok = true) => {
  pasos.push({ paso: numero, texto, resultado: ok ? 'ok' : 'fallo' });
};
const numero = (texto) => Number(String(texto ?? "").replace(/[^\d.-]/g, ""));

async function json(ruta) {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`${ruta} → ${respuesta.status}`);
  return respuesta.json();
}

const errores = [];
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1200 } });
pagina.on("pageerror", (error) => errores.push(`pageerror: ${error.message.slice(0, 160)}`));

const esperarTabla = async (paginaObjetivo) => {
  await paginaObjetivo.waitForSelector('[data-testid="plan-tabla-panel"]', { timeout: 180000 });
  await paginaObjetivo.waitForFunction(
    () => document.querySelectorAll(".ac-plan-tabla tbody tr").length > 0,
    undefined,
    { timeout: 180000 },
  );
  await paginaObjetivo.waitForFunction(
    () => !document.querySelector(".ac-plan-tabla .ac-esqueleto"),
    undefined,
    { timeout: 180000 },
  );
};

/* 1. Resultados sin tienda implícita --------------------------------------- */
await pagina.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
await esperarTabla(pagina);
const inicial = await pagina.evaluate(() => ({
  tienda: document.querySelectorAll(".ac-contexto select")[1]?.value ?? null,
  opcion: document.querySelectorAll(".ac-contexto select")[1]?.selectedOptions?.[0]?.textContent ?? null,
  contexto: document.querySelector('[data-testid="plan-tienda-contexto"]')?.innerText ?? "",
  tiendasEnContexto: document.querySelector('[data-testid="plan-tienda-contexto"]')?.innerText ?? "",
}));
comprobar(inicial.tienda === "", `Resultados abrió con una tienda elegida: ${inicial.opcion}`);
comprobar(
  /Todas las tiendas/i.test(inicial.opcion ?? ""),
  `El selector no declara «Todas las tiendas»: ${inicial.opcion}`,
);
comprobar(
  /10/.test(inicial.contexto),
  `El contexto no declara las diez tiendas del resultado: ${inicial.contexto}`,
);
paso(1, 'abrir Resultados sin tienda implícita', fallos.length === 0);

/* 2. California · Tienda 3 ------------------------------------------------- */
await pagina.selectOption(".ac-contexto select >> nth=1", "CA_3");
await pagina.waitForTimeout(2500);
await esperarTabla(pagina);
const conTienda = await pagina.evaluate(() => ({
  url: window.location.search,
  contexto: document.querySelector('[data-testid="plan-tienda-contexto"]')?.innerText ?? "",
  opcion: document.querySelectorAll(".ac-contexto select")[1]?.selectedOptions?.[0]?.textContent ?? null,
}));
comprobar(/ac_tienda=CA_3/.test(conTienda.url), `La URL no refleja la tienda elegida: ${conTienda.url}`);
comprobar(
  /Tienda:\s*California · Tienda 3/.test(conTienda.contexto.replace(/\s+/g, " ")),
  `El encabezado no nombra la tienda: ${conTienda.contexto}`,
);
paso(2, 'elegir California · Tienda 3', /ac_tienda=CA_3/.test(conTienda.url));

/* 3-4. Buscar el artículo por su código ------------------------------------ */
await pagina.fill('[data-testid="contexto-busqueda"]', "FOODS_3_090");
await pagina.waitForTimeout(2000);
await pagina.waitForFunction(
  () =>
    [...document.querySelectorAll(".ac-plan-tabla tbody tr")].some(
      (fila) => fila.getAttribute("data-clave") === "CA_3|FOODS_3_090",
    ),
  undefined,
  { timeout: 120000 },
);
const filaVisible = await pagina.evaluate(() => {
  const fila = document.querySelector('.ac-plan-tabla tbody tr[data-clave="CA_3|FOODS_3_090"]');
  if (!fila) return null;
  return {
    texto: fila.innerText.replace(/\s+/g, " ").trim(),
    celdas: [...fila.querySelectorAll("td")].map((celda) => ({
      cifra: celda.getAttribute("data-cifra") ? Number(celda.getAttribute("data-cifra")) : null,
      texto: celda.innerText.trim(),
    })),
    tienda: fila.querySelector(".ac-plan-tienda")?.innerText.replace(/\s+/g, " ") ?? "",
  };
});
comprobar(Boolean(filaVisible), "No se encontró la fila CA_3|FOODS_3_090 con la búsqueda");
comprobar(
  /Artículo 090/.test(filaVisible?.texto ?? "") &&
    /FOODS_3_090/.test(filaVisible?.texto ?? "") &&
    /Alimentos/.test(filaVisible?.texto ?? "") &&
    /Departamento 3/.test(filaVisible?.texto ?? ""),
  `La fila no identifica el artículo con categoría y departamento: ${filaVisible?.texto}`,
);
/* Con una sola tienda el nombre vive en el encabezado y la tabla no repite la columna. */
comprobar(
  /California · Tienda 3/.test((filaVisible?.tienda ?? "") + (conTienda.contexto ?? "")),
  `Ni la fila ni el encabezado declaran la tienda: ${filaVisible?.tienda}`,
);
paso(3, 'buscar FOODS_3_090 por código', Boolean(filaVisible));
paso(4, 'identificar Artículo 090 · Alimentos · Departamento 3', /Departamento 3/.test(filaVisible?.texto ?? ""));

/* 5. Cuatro semanas y total ------------------------------------------------- */
const filaApi = (await json("/planificacion?tiendas=CA_3&texto=FOODS_3_090&tamano=50")).filas.find(
  (fila) => fila.item_id === "FOODS_3_090" && fila.store_id === "CA_3",
);
comprobar(Boolean(filaApi), "La API no devuelve CA_3|FOODS_3_090");
const semanasVisibles = (filaVisible?.celdas ?? []).slice(1, 5);
comprobar(
  semanasVisibles.length === 4,
  `La tabla no muestra cuatro semanas: ${semanasVisibles.length}`,
);
if (filaApi && semanasVisibles.length === 4) {
  comprobar(
    semanasVisibles.every(
      (celda, indice) => Math.abs((celda.cifra ?? 0) - filaApi.semanas[indice]) < 1e-6,
    ),
    "Las semanas visibles no coinciden con las canónicas de la API",
  );
  const totalVisible = filaVisible?.celdas[0];
  comprobar(
    Math.abs((totalVisible?.cifra ?? 0) - filaApi.pronostico_28) < 1e-6,
    `El total visible (${totalVisible?.texto}) no coincide con la API (${filaApi.pronostico_28})`,
  );
  comprobar(
    Math.abs(semanasVisibles.reduce((suma, celda) => suma + numero(celda.texto), 0) - numero(totalVisible?.texto)) <=
      0.03,
    "La suma de las cuatro cifras visibles se aparta del total más de lo que permite el redondeo",
  );
}
paso(5, 'consultar las cuatro semanas y el total previsto');

/* 6. Abrir el detalle y comprobar que es la misma serie ---------------------- */
await pagina.locator('.ac-plan-tabla tbody tr[data-clave="CA_3|FOODS_3_090"] button.ac-plan-articulo').click();
await pagina.waitForFunction(
  () => /\d/.test(document.querySelector('[data-testid="plan-detalle-total"]')?.textContent ?? ""),
  undefined,
  { timeout: 120000 },
);
const detalle = await pagina.evaluate(() => ({
  cabecera: document.querySelector(".ac-plan-detalle-cab")?.innerText.replace(/\s+/g, " ") ?? "",
  total: document.querySelector('[data-testid="plan-detalle-total"]')?.getAttribute("data-cifra") ?? null,
  grafico: Boolean(document.querySelector('[data-testid="plan-grafico"]')),
  seleccion: document.querySelector('.ac-plan-tabla tbody tr[data-clave="CA_3|FOODS_3_090"]')
    ?.className ?? "",
}));
comprobar(/FOODS_3_090/.test(detalle.cabecera), `El detalle no corresponde al artículo: ${detalle.cabecera}`);
comprobar(
  /California · Tienda 3/.test(detalle.cabecera),
  `El detalle no corresponde a la tienda elegida: ${detalle.cabecera}`,
);
comprobar(
  Math.abs(Number(detalle.total) - (filaApi?.pronostico_28 ?? Number.NaN)) < 1e-6,
  "El total del detalle no coincide con la fila de origen",
);
comprobar(detalle.grafico, "El detalle no dibuja la gráfica de la serie");
paso(6, 'abrir el detalle de la misma serie');

/* 7. Evaluación histórica de la serie y cortes ------------------------------ */
const evaluacionSerie = await pagina.evaluate(() => {
  const bloque = document.querySelector('[data-testid="plan-detalle-evaluacion"]');
  return {
    texto: bloque?.innerText.replace(/\s+/g, " ") ?? "",
    filas: bloque?.querySelectorAll("tbody tr").length ?? 0,
  };
});
comprobar(
  /Desempeño histórico de esta serie/.test(evaluacionSerie.texto),
  `El detalle no publica el desempeño histórico: ${evaluacionSerie.texto.slice(0, 120)}`,
);
comprobar(
  evaluacionSerie.filas > 0 && /corte\(s\) disponible/.test(evaluacionSerie.texto),
  `El detalle no declara los cortes que sustentan la evaluación: ${evaluacionSerie.texto.slice(0, 160)}`,
);
paso(7, 'consultar la evaluación histórica y el número de cortes');

/* 8. Comparación histórica sin perder contexto ------------------------------ */
await pagina.selectOption('[data-testid="plan-vista"]', "historica");
await pagina.waitForTimeout(2000);
const historica = await pagina.evaluate(() => ({
  url: window.location.search,
  cabeceras: [...document.querySelectorAll(".ac-plan-tabla thead th")].map((nodo) =>
    nodo.innerText.replace(/\s+/g, " ").trim(),
  ),
  filas: document.querySelectorAll(".ac-plan-tabla tbody tr").length,
}));
comprobar(
  /ac_tienda=CA_3/.test(historica.url) && /FOODS_3_090/.test(historica.url),
  `La comparación histórica perdió el contexto: ${historica.url}`,
);
comprobar(
  historica.cabeceras.some((texto) => /observado 28 d/i.test(texto)) &&
    historica.cabeceras.some((texto) => /previsto 28 d/i.test(texto)),
  `La comparación histórica no muestra observado y previsto: ${historica.cabeceras.join(" | ")}`,
);
paso(8, 'cambiar a comparación histórica conservando filtros');

/* 9-10. Descargar y verificar el CSV --------------------------------------- */
await pagina.selectOption('[data-testid="plan-vista"]', "semanal");
await pagina.waitForTimeout(1500);
const planFiltro = await json("/planificacion?tiendas=CA_3&texto=FOODS_3_090&tamano=1");
const descarga = await Promise.all([
  pagina.waitForEvent("download", { timeout: 60000 }).catch(() => null),
  pagina.locator('[data-testid="plan-descargar"]').click(),
]).then(([evento]) => evento);
comprobar(Boolean(descarga), "La descarga del plan no se inició");
if (descarga) {
  const texto = (await readFile(await descarga.path(), "utf8")).replace(/^\ufeff/, "");
  const lineas = texto.split(/\r?\n/);
  const cabecera = lineas.findIndex((linea) => linea.startsWith("item_id,"));
  const filas = lineas.slice(cabecera + 1).filter(Boolean);
  const columnas = lineas[cabecera].split(",");
  comprobar(
    filas.length === planFiltro.total,
    `El CSV tiene ${filas.length} filas y el filtro ${planFiltro.total}`,
  );
  const primera = filas[0]?.split(",") ?? [];
  comprobar(primera[0] === "FOODS_3_090", `La primera fila del CSV no es el artículo: ${primera[0]}`);
  comprobar(primera[2] === "CA_3", `La tienda del CSV no es CA_3: ${primera[2]}`);
  comprobar(
    /^Artículo /.test(primera[1] ?? "") && /FOODS_3_090/.test(primera[1] ?? ""),
    `El CSV no usa la etiqueta del artículo: ${primera[1]}`,
  );
  comprobar(
    /Alimentos/.test(primera[5] ?? "") && /Departamento 3/.test(primera[7] ?? ""),
    `El CSV no identifica categoría y departamento: ${primera[5]} / ${primera[7]}`,
  );
  comprobar(
    texto.includes(planFiltro.revision ?? "rev-"),
    "El CSV no declara la revisión publicada",
  );
  const semanas = columnas.filter((nombre) => nombre.startsWith("semana_"));
  comprobar(semanas.length === 4, `El CSV no exporta cuatro semanas: ${semanas.join(", ")}`);
  comprobar(
    /Precisión|tolerancia|diferencia máxima/i.test(texto),
    "El CSV no documenta su tolerancia de reconciliación",
  );
  const indice = columnas.indexOf("pronostico_28d");
  comprobar(
    Math.abs(Number(primera[indice]) - (filaApi?.pronostico_28 ?? Number.NaN)) < 1e-4,
    "El total del CSV no coincide con la serie canónica",
  );
  paso(9, 'descargar todas las filas del filtro', filas.length === planFiltro.total);
  paso(10, 'verificar identidad, fechas, revisión y cifras del CSV');
}

/* 11. Volver a todas las tiendas: el mismo artículo por tienda -------------- */
await pagina.fill('[data-testid="contexto-busqueda"]', "");
await pagina.waitForTimeout(1200);
await pagina.selectOption(".ac-contexto select >> nth=0", "");
await pagina.waitForTimeout(1500);
await pagina.selectOption(".ac-contexto select >> nth=1", "");
await pagina.waitForTimeout(2500);
await esperarTabla(pagina);
await pagina.fill('[data-testid="contexto-busqueda"]', "FOODS_3_090");
await pagina.waitForTimeout(2500);
const porTienda = await pagina.evaluate(() =>
  [...document.querySelectorAll(".ac-plan-tabla tbody tr")].map((fila) => ({
    clave: fila.getAttribute("data-clave"),
    tienda: fila.querySelector(".ac-plan-tienda")?.innerText.replace(/\s+/g, " ").trim() ?? "",
    total: fila.querySelector("td")?.getAttribute("data-cifra") ?? null,
  })),
);
comprobar(
  porTienda.length > 1,
  `Con todas las tiendas el artículo aparece ${porTienda.length} vez/veces`,
);
comprobar(
  new Set(porTienda.map((fila) => fila.clave?.split("|")[0])).size > 1,
  "El mismo artículo no se diferencia por tienda",
);
comprobar(
  porTienda.every((fila) => /tienda \d/i.test(fila.tienda)),
  `Alguna fila no declara su tienda: ${porTienda.map((fila) => fila.tienda).join(" | ")}`,
);
paso(11, 'volver a todas las tiendas y diferenciar por tienda');

/* 12. Atrás, adelante y recarga -------------------------------------------- */
/* El historial guarda cambios de pantalla: se visita «Datos y calidad» y se vuelve. */
await pagina.locator('.ac-tabs-btn[data-pantalla="datos"]').click();
await pagina.waitForTimeout(2500);
await pagina.locator('.ac-tabs-btn[data-pantalla="resultados"]').click();
await esperarTabla(pagina);
await pagina.goBack();
await pagina.waitForTimeout(2500);
const atras = await pagina.evaluate(
  () => document.querySelector('.ac-tabs-btn[aria-selected="true"]')?.getAttribute("data-pantalla"),
);
comprobar(atras === "datos", `Atrás no regresó a «Datos y calidad»: ${atras}`);
await pagina.goForward();
await pagina.waitForTimeout(2000);
await pagina.reload({ waitUntil: "domcontentloaded" });
await esperarTabla(pagina);
const trasRecarga = await pagina.evaluate(() => ({
  url: window.location.search,
  filas: document.querySelectorAll(".ac-plan-tabla tbody tr").length,
  busqueda: document.querySelector('[data-testid="contexto-busqueda"]')?.value ?? null,
}));
comprobar(trasRecarga.filas > 0, "Tras recargar, la tabla quedó vacía");
comprobar(
  /FOODS_3_090/.test(trasRecarga.busqueda ?? ""),
  `Tras recargar se perdió la búsqueda: ${trasRecarga.busqueda}`,
);
paso(12, 'atrás, adelante y recarga', trasRecarga.filas > 0);

/* Caso límite: búsqueda sin resultados ------------------------------------- */
await pagina.fill('[data-testid="contexto-busqueda"]', "ZZZ_SIN_RESULTADOS");
/* Espera acotada al estado final: la tabla debe quedar sin filas y con el aviso visible. */
const llegoVacio = await pagina
  .waitForFunction(
    () =>
      document.querySelectorAll(".ac-plan-tabla tbody tr").length === 0 &&
      Boolean(document.querySelector('[data-testid="plan-vacio"]')),
    undefined,
    { timeout: 60000 },
  )
  .then(() => true)
  .catch(() => false);
comprobar(llegoVacio, "La búsqueda sin resultados no llegó al estado vacío declarado");
const sinResultados = await pagina.evaluate(() => ({
  filas: document.querySelectorAll(".ac-plan-tabla tbody tr").length,
  vacio:
    document.querySelector('[data-testid="plan-vacio"]')?.innerText.replace(/\s+/g, " ").trim() ?? "",
  resumen: document.querySelector('[data-testid="plan-resumen"]')?.innerText.replace(/\s+/g, " ") ?? "",
}));
comprobar(sinResultados.filas === 0, "La búsqueda sin resultados sigue mostrando filas");
comprobar(
  /no devolvió series|sin (coincidencias|resultados)|no hay (series|filas)/i.test(
    sinResultados.vacio + sinResultados.resumen,
  ),
  `La pantalla no declara la búsqueda vacía: ${sinResultados.vacio.slice(0, 120)}`,
);
paso(13, 'búsqueda sin resultados');

/* Caso límite: cambio rápido de filtros ------------------------------------ */
await pagina.fill('[data-testid="contexto-busqueda"]', "FOODS_3_090");
await pagina.waitForTimeout(1200);
/* El selector de tienda se filtra por el estado activo: para cambiar entre estados se vuelve
   primero a «Todos los estados». */
await pagina.selectOption(".ac-contexto select >> nth=0", "");
await pagina.waitForTimeout(1500);
/* Elegir una tienda fija su estado (el catálogo se filtra por territorio), así que el cambio
   rápido se hace entre tiendas del mismo estado. */
await pagina.selectOption(".ac-contexto select >> nth=1", "CA_1");
await pagina.selectOption(".ac-contexto select >> nth=1", "CA_2");
await pagina.selectOption(".ac-contexto select >> nth=1", "CA_4");
await pagina.selectOption(".ac-contexto select >> nth=1", "CA_1");
await pagina.waitForTimeout(3000);
await pagina.waitForFunction(
  () => /ac_tienda=CA_1/.test(window.location.search),
  undefined,
  { timeout: 60000 },
);
await esperarTabla(pagina);
const rapido = await pagina.evaluate(() => ({
  url: window.location.search,
  claves: [...document.querySelectorAll(".ac-plan-tabla tbody tr")].map((fila) =>
    fila.getAttribute("data-clave"),
  ),
  contexto: document.querySelector('[data-testid="plan-tienda-contexto"]')?.innerText ?? "",
}));
comprobar(
  rapido.claves.every((clave) => clave?.startsWith("CA_1|")),
  `Respuestas obsoletas tras el cambio rápido: ${rapido.claves.slice(0, 3).join(", ")}`,
);
comprobar(
  /California · Tienda 1/.test(rapido.contexto.replace(/\s+/g, " ")),
  `El contexto no refleja el último filtro: ${rapido.contexto}`,
);
paso(14, 'cambio rápido de filtros sin respuestas obsoletas');

/* Caso límite: serie sin evaluación (respuesta interceptada) ---------------- */
await pagina.route("**/planificacion/serie?**", async (ruta) => {
  const respuesta = await ruta.fetch();
  const cuerpo = await respuesta.json();
  cuerpo.fila = {
    ...cuerpo.fila,
    evaluacion: { estado: "sin_evaluacion", cortes: 0, mejoran: 0, empeoran: 0, empatan: 0 },
  };
  cuerpo.evaluacion_horizonte = [];
  await ruta.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
});
await pagina.locator(".ac-plan-tabla tbody tr").first().locator("button.ac-plan-articulo").click();
await pagina.waitForFunction(
  () => /\d/.test(document.querySelector('[data-testid="plan-detalle-total"]')?.textContent ?? ""),
  undefined,
  { timeout: 120000 },
);
const sinEvaluacion = await pagina.evaluate(
  () =>
    document.querySelector('[data-testid="plan-detalle-evaluacion"]')?.innerText.replace(/\s+/g, " ") ??
    "",
);
comprobar(
  /Sin evaluación suficiente/i.test(sinEvaluacion),
  `Una serie sin evaluación no se declara como tal: ${sinEvaluacion.slice(0, 140)}`,
);
comprobar(
  !/Menor error/.test(sinEvaluacion),
  "Una serie sin evaluación se presenta como buen desempeño",
);
await pagina.unroute("**/planificacion/serie?**");
paso(15, 'serie sin evaluación declarada sin fingir desempeño');

/* Caso límite: error recuperable de red ------------------------------------ */
/* Se corta la red mientras se cambia el filtro: todas las peticiones del plan fallan hasta que
   se observe el estado de error. */
let cortandoRed = true;
await pagina.route("**/planificacion?**", async (ruta) => {
  if (cortandoRed) {
    await ruta.abort("failed");
    return;
  }
  await ruta.continue();
});
await pagina.fill('[data-testid="contexto-busqueda"]', "");
await pagina.waitForTimeout(800);
await pagina.selectOption(".ac-contexto select >> nth=2", "HOUSEHOLD");
/* Espera acotada basada en el estado final: el error debe declararse, no quedarse cargando. */
const aparecioError = await pagina
  .waitForSelector('[data-testid="plan-error"]', { state: "visible", timeout: 30000 })
  .then(() => true)
  .catch(() => false);
comprobar(aparecioError, "El error de red no se declara en la pantalla del plan");
cortandoRed = false;
const conError = await pagina.evaluate(() => ({
  /* textContent en lugar de innerText: el panel puede estar oculto mientras React reconcilia. */
  alerta:
    document.querySelector('[data-testid="plan-error"]')?.textContent?.replace(/\s+/g, " ") ?? "",
  reintentar: Boolean(
    [...document.querySelectorAll("button")].find((boton) => /Reintentar/i.test(boton.innerText)),
  ),
}));
comprobar(
  /No se pudo|error|Reintentar/i.test(conError.alerta) || conError.reintentar,
  `El error de red no se declara ni ofrece reintento: ${conError.alerta.slice(0, 120)}`,
);
/* Con la red restablecida, el reintento (manual o automático) debe devolver la tabla. */
await pagina
  .locator("button")
  .filter({ hasText: /Reintentar/i })
  .first()
  .click({ timeout: 5000 })
  .catch(() => undefined);
await esperarTabla(pagina);
const recuperado = await pagina.evaluate(
  () => document.querySelectorAll(".ac-plan-tabla tbody tr").length,
);
comprobar(recuperado > 0, "Tras reintentar no se recuperó la tabla");
await pagina.unroute("**/planificacion?**");
paso(16, 'error de red recuperable con reintento', recuperado > 0);

/* 390 px y teclado --------------------------------------------------------- */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(url("ac_pantalla=resultados&ac_tienda=CA_3"), { waitUntil: "domcontentloaded" });
await esperarTabla(movil);
const medidas = await movil.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  recortados: [...document.querySelectorAll(".ac-plan-tabla td, .ac-plan-tabla th")].filter(
    (celda) => celda.scrollWidth > celda.clientWidth + 1,
  ).length,
}));
comprobar(
  medidas.scrollWidth <= medidas.innerWidth + 1,
  `Desbordamiento horizontal en 390 px: ${JSON.stringify(medidas)}`,
);
comprobar(medidas.recortados === 0, `Cifras recortadas en 390 px: ${medidas.recortados}`);
await movil.locator('[data-testid="plan-tabla-panel"]').screenshot({ path: `${EV}/recorrido-movil.png` });
await movil.close();

await pagina.locator(".ac-plan-tabla button.ac-plan-articulo").first().focus();
await pagina.waitForTimeout(200);
const focoOk = await pagina.evaluate(() => document.activeElement?.tagName === "BUTTON");
comprobar(focoOk, "El botón del artículo no recibe el foco con el teclado");
await pagina.keyboard.press("Enter");
await pagina.waitForFunction(
  () => /\d/.test(document.querySelector('[data-testid="plan-detalle-total"]')?.textContent ?? ""),
  undefined,
  { timeout: 120000 },
);
paso(17, '390 px y navegación por teclado', focoOk);

comprobar(errores.length === 0, `Errores de página: ${errores.slice(0, 2).join(" | ")}`);
await pagina.close();
await navegador.close();

console.log('\nRecorrido comercial');
for (const registro of pasos) {
  console.log(
    `  ${registro.resultado === 'ok' ? '✓' : '✗'} paso ${String(registro.paso).padStart(2, '0')} · ${registro.texto}`,
  );
}
if (fallos.length) {
  console.log(`\n✗ ${fallos.length} fallo(s):`);
  for (const fallo of fallos) console.log(`  · ${fallo}`);
  process.exit(1);
}
console.log('\n✓ Recorrido comercial completo verificado en el build servido');
