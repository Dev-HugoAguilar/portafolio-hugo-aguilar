/**
 * Regresión del fallo de «Resultados» (nivel artículo residual, mensajes contradictorios y
 * unidad de cobertura).
 *
 * Comprueba en el navegador, inspeccionando **los parámetros enviados y el contenido de la
 * pantalla** (no solo la presencia de pestañas):
 *
 *  A. Resultados por omisión: consulta agregada válida y resultado visible.
 *  B. Tienda + artículo: pronóstico del artículo correcto.
 *  C. Desde ese contexto, «Todas las tiendas»: sin petición inválida ni nivel residual.
 *  D. Artículo → Resultados → contexto general.
 *  E. URL con nivel producto sin sus campos: selección pendiente comprensible, sin falso
 *     «sin pronóstico publicado».
 *  F. Atrás/Adelante y cambios rápidos de filtros: URL, controles y resultado coincidentes.
 *  G. Error real de red: reintento funcional.
 *  H. Consulta válida sin resultados: estado vacío distinto de los errores.
 *  I. Día/Semana/Mes: la cobertura sigue en días.
 *
 * Capturas en `evidencias/comercial/resultados-*.png`. Sale con código 1 si algo falla.
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";
const EV = "../../evidencias/comercial";

const url = (query = "") => `${SITIO}/${query ? `?${query}` : ""}${HASH}`;

const fallos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
  return Boolean(condicion);
};

const errores = [];
const navegador = await chromium.launch();

/** Página con registro de las peticiones a /pronosticos y de su estado. */
async function abrir(query = "", opciones = {}) {
  const pagina = await navegador.newPage({
    viewport: opciones.viewport ?? { width: 1400, height: 1050 },
  });
  const registro = [];
  pagina.on("pageerror", (error) => errores.push(`pageerror: ${error.message.slice(0, 160)}`));
  pagina.on("console", (mensaje) => {
    if (mensaje.type() === "error") errores.push(`console: ${mensaje.text().slice(0, 160)}`);
  });
  pagina.on("request", (peticion) => {
    if (!peticion.url().includes("/pronosticos")) return;
    registro.push({ tipo: "peticion", parametros: peticion.url().split("/pronosticos?")[1] ?? "" });
  });
  pagina.on("response", (respuesta) => {
    if (!respuesta.url().includes("/pronosticos")) return;
    registro.push({ tipo: "respuesta", estado: respuesta.status() });
  });
  await pagina.goto(url(query), { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app", { timeout: 120000 });
  await pagina.waitForTimeout(opciones.espera ?? 3500);
  // La curva nacional es una vista secundaria colapsable dentro de «Resultados».
  const curva = pagina.locator('[data-testid="plan-curva-nacional"] > summary');
  if (await curva.count()) {
    const abierta = await pagina.evaluate(
      () => document.querySelector('[data-testid="plan-curva-nacional"]')?.hasAttribute("open") ?? false,
    );
    if (!abierta) {
      await curva.click();
      await pagina.waitForTimeout(1500);
    }
  }
  return { pagina, registro };
}

/**
 * Oculta la cabecera fija del portafolio antes de capturar: si no, se superpone a la mitad
 * de la imagen cuando la captura es de un elemento largo.
 */
async function sinCabeceraSitio(pagina) {
  await pagina.addStyleTag({
    content: "header.site-header, .site-header, .hero, nav.site-nav { visibility: hidden !important; }",
  });
  await pagina.waitForTimeout(150);
}

/** Estado visible de la consulta, tal y como lo ve el usuario. */
const leer = (pagina) =>
  pagina.evaluate(() => {
    /* La curva del total nacional (y sus estados) vive en la vista secundaria colapsable de
       «Resultados»: todas las lecturas del panel se hacen dentro de ese contenedor. */
    const raiz = document.querySelector('[data-testid="plan-curva-nacional"]') ?? document;
    const texto = (selector) => raiz.querySelector(selector)?.textContent?.replace(/\s+/g, " ") ?? null;
    const activo = (selector) =>
      [...raiz.querySelectorAll(`${selector} .at-seg`)]
        .filter((nodo) => nodo.classList.contains("is-activa"))
        .map((nodo) => nodo.textContent.trim());
    const marcaEstado = document.querySelector('[data-testid="resultados-estado"]');
    return {
      url: window.location.search,
      cobertura: texto(".ac-cobertura"),
      estado: marcaEstado?.getAttribute("data-estado") ?? null,
      nivelActivo: activo("[data-testid=selector-nivel]"),
      nivelContexto: texto(".ac-df-cab .ac-panel-sub, .ac-panel-sub"),
      datosCorte: texto("[data-testid=datos-corte]"),
      insignia: texto("[data-testid=estado-pronostico]"),
      mensaje: texto(".ac-estado, .ac-vacio, .ac-esqueleto, [role=alert]"),
      grafico: Boolean(raiz.querySelector(".ac-df-grafico svg")),
      filasDesglose: raiz.querySelectorAll(".ac-tabla tbody tr").length,
      avisos: [...document.querySelectorAll(".ac-aviso-inline")].map((n) =>
        n.textContent.replace(/\s+/g, " ").slice(0, 220),
      ),
    };
  });

/** Clic en una opción de un selector segmentado por su texto. */
async function elegirSegmento(pagina, testid, texto) {
  await pagina.evaluate(
    ({ testid, texto }) => {
      const boton = [...document.querySelectorAll(`[data-testid=${testid}] .at-seg`)].find(
        (nodo) => nodo.textContent.trim() === texto,
      );
      if (boton) boton.click();
    },
    { testid, texto },
  );
  await pagina.waitForTimeout(3200);
}

/* A. Resultados directo ---------------------------------------------------- */
{
  const { pagina, registro } = await abrir("ac_pantalla=resultados");
  const vista = await leer(pagina);
  const peticiones = registro.filter((r) => r.tipo === "peticion");
  const respuestas = registro.filter((r) => r.tipo === "respuesta");

  comprobar(peticiones.length === 1, `A: se esperaban 1 petición y hubo ${peticiones.length}`);
  comprobar(
    /(^|&)nivel=total(&|$)/.test(peticiones[0]?.parametros ?? ""),
    `A: la entrada general no pide un nivel agregado: ${peticiones[0]?.parametros}`,
  );
  comprobar(
    !/items=/.test(peticiones[0]?.parametros ?? ""),
    `A: la entrada general no debe enviar artículos: ${peticiones[0]?.parametros}`,
  );
  comprobar(respuestas.every((r) => r.estado === 200), "A: la entrada general recibió un error");
  comprobar(vista.estado === "listo", `A: estado ${vista.estado} en lugar de listo`);
  comprobar(vista.nivelActivo.includes("Total"), `A: nivel activo ${vista.nivelActivo}`);
  comprobar(vista.grafico, "A: no se dibujó la gráfica del pronóstico");
  comprobar(
    /Fin del histórico:/.test(vista.datosCorte ?? ""),
    `A: la cabecera del panel no declara el fin del histórico: ${vista.datosCorte}`,
  );
  comprobar(!/sin pronóstico publicado/i.test(vista.mensaje ?? ""), "A: mensaje de ausencia falso");
  await sinCabeceraSitio(pagina);
  await pagina.locator('[data-testid="resultados-estado"]').screenshot({
    path: `${EV}/resultados-general.png`,
  });
  await pagina.close();
}

/* B. Tienda + artículo ----------------------------------------------------- */
{
  const { pagina, registro } = await abrir(
    "ac_pantalla=resultados&ac_estado=CA&ac_tienda=CA_1&ac_cat=FOODS&ac_dept=FOODS_3&ac_item=FOODS_3_090&ac_nivel=producto",
  );
  const vista = await leer(pagina);
  const peticiones = registro.filter((r) => r.tipo === "peticion");
  const articulo = peticiones.find((r) => /items=/.test(r.parametros));

  comprobar(Boolean(articulo), "B: no se pidió el pronóstico del artículo");
  comprobar(
    /tienda=CA_1/.test(articulo?.parametros ?? "") &&
      /items=FOODS_3_090/.test(articulo?.parametros ?? ""),
    `B: la petición del artículo no lleva tienda y artículo: ${articulo?.parametros}`,
  );
  comprobar(/nivel=producto/.test(articulo?.parametros ?? ""), "B: el nivel enviado no es producto");
  comprobar(vista.estado === "listo", `B: estado ${vista.estado} en lugar de listo`);
  comprobar(
    /FOODS_3_090/.test(vista.nivelContexto ?? "") || vista.filasDesglose === 1,
    `B: el panel no describe el artículo elegido: ${vista.nivelContexto}`,
  );
  const totalArticulo = await pagina.evaluate(() => {
    const tabla = [...document.querySelectorAll("table")].find((elemento) =>
      /Total pronosticado/.test(elemento.textContent ?? ""),
    );
    return tabla?.querySelector("tbody tr th")?.textContent?.trim() ?? null;
  });
  /* La celda muestra «Artículo 090» y el código completo como línea secundaria: se comparan
     ambos, no solo el código suelto. */
  comprobar(
    /FOODS_3_090/.test(totalArticulo ?? "") && /Artículo\s*\d+/.test(totalArticulo ?? ""),
    `B: el desglose no corresponde al artículo pedido: ${totalArticulo}`,
  );
  await sinCabeceraSitio(pagina);
  await pagina.locator('[data-testid="resultados-estado"]').screenshot({
    path: `${EV}/resultados-articulo.png`,
  });
  await pagina.close();
}

/* C. Desde el artículo, «Todas las tiendas» --------------------------------- */
{
  const { pagina, registro } = await abrir(
    "ac_pantalla=resultados&ac_estado=CA&ac_tienda=CA_1&ac_cat=FOODS&ac_dept=FOODS_3&ac_item=FOODS_3_090&ac_nivel=producto",
  );
  registro.length = 0;
  await pagina.evaluate(() => {
    const select = document.querySelectorAll(".ac-contexto select")[1];
    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await pagina.waitForTimeout(4500);
  const vista = await leer(pagina);
  const peticiones = registro.filter((r) => r.tipo === "peticion");
  const respuestas = registro.filter((r) => r.tipo === "respuesta");

  comprobar(
    peticiones.every((r) => !/nivel=producto/.test(r.parametros)),
    `C: se envió una petición de nivel producto sin tienda: ${peticiones.map((r) => r.parametros).join(" | ")}`,
  );
  comprobar(
    respuestas.every((r) => r.estado === 200),
    `C: la API rechazó la consulta tras quitar la tienda (${respuestas.map((r) => r.estado)})`,
  );
  comprobar(
    !vista.nivelActivo.includes("Artículo"),
    `C: el nivel artículo quedó residual: ${vista.nivelActivo}`,
  );
  comprobar(vista.estado === "listo", `C: estado ${vista.estado} tras cambiar a todas las tiendas`);
  comprobar(
    vista.avisos.some((aviso) => /artículo|nivel/i.test(aviso)),
    `C: no se comunicó el ajuste de nivel: ${vista.avisos.join(" | ")}`,
  );
  comprobar(!/ac_nivel=producto/.test(vista.url), `C: la URL conserva el nivel residual: ${vista.url}`);
  await sinCabeceraSitio(pagina);
  await pagina.locator('[data-testid="resultados-estado"]').screenshot({
    path: `${EV}/resultados-todas-las-tiendas.png`,
  });
  await pagina.close();
}

/* D. Artículo → Resultados → contexto general ------------------------------- */
{
  const { pagina, registro } = await abrir(
    "ac_pantalla=exploracion&ac_sub=articulo&ac_estado=CA&ac_tienda=CA_1&ac_cat=FOODS&ac_dept=FOODS_3&ac_item=FOODS_3_090",
    { espera: 5000 },
  );
  registro.length = 0;
  await pagina.locator('.ac-tabs-btn[data-pantalla="resultados"]').click();
  await pagina.waitForTimeout(4500);
  const llegada = await leer(pagina);
  comprobar(llegada.estado === "listo", `D: al llegar a Resultados el estado es ${llegada.estado}`);
  comprobar(
    /CA_1/.test(llegada.nivelContexto ?? ""),
    `D: el contexto territorial se perdió al cambiar de pantalla: ${llegada.nivelContexto}`,
  );
  comprobar(
    registro.filter((r) => r.tipo === "respuesta").every((r) => r.estado === 200),
    "D: la transición desde el artículo provocó una consulta rechazada",
  );

  // Con ese contexto ya completo, pedir el artículo sí debe consultarlo.
  await elegirSegmento(pagina, "selector-nivel", "Artículo");
  const conArticulo = await leer(pagina);
  comprobar(conArticulo.estado === "listo", `D: el artículo no se consultó (${conArticulo.estado})`);
  comprobar(
    registro.filter((r) => r.tipo === "peticion").some((r) => /items=FOODS_3_090/.test(r.parametros)),
    "D: no se pidió el pronóstico del artículo elegido",
  );

  // Volver al contexto general: sin estado ni tienda.
  await pagina.evaluate(() => {
    const estado = document.querySelectorAll(".ac-contexto select")[0];
    estado.value = "";
    estado.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await pagina.waitForTimeout(4500);
  const general = await leer(pagina);
  comprobar(general.estado === "listo", `D: estado ${general.estado} al volver al contexto general`);
  comprobar(
    !/ac_tienda=/.test(general.url),
    `D: el contexto general conserva la tienda: ${general.url}`,
  );
  comprobar(
    !vistaTieneNivelProducto(general),
    `D: el nivel artículo sobrevivió al contexto general: ${general.nivelActivo}`,
  );
  comprobar(
    !/sin pronóstico publicado/i.test(general.mensaje ?? ""),
    "D: mensaje de ausencia falso al volver al contexto general",
  );
  await pagina.close();
}

/** ¿La pantalla quedó en nivel producto? */
function vistaTieneNivelProducto(vista) {
  return vista.nivelActivo.includes("Artículo");
}

/* E. URL con nivel producto sin campos obligatorios ------------------------ */
{
  const { pagina, registro } = await abrir("ac_pantalla=resultados&ac_nivel=producto");
  const vista = await leer(pagina);
  const peticiones = registro.filter((r) => r.tipo === "peticion");
  const respuestas = registro.filter((r) => r.tipo === "respuesta");

  // Nunca puede salir una petición de nivel producto sin tienda ni artículos.
  comprobar(
    peticiones.every((r) => !/nivel=producto/.test(r.parametros)),
    `E: se envió una petición de nivel producto incompleta: ${peticiones.map((r) => r.parametros).join(" | ")}`,
  );
  comprobar(
    respuestas.every((r) => r.estado === 200),
    `E: la API rechazó la consulta restaurada (${respuestas.map((r) => r.estado)})`,
  );
  comprobar(
    vista.estado === "listo" || vista.estado === "incompleta",
    `E: estado ${vista.estado} con nivel producto restaurado sin campos`,
  );
  comprobar(
    !/sin pronóstico publicado/i.test(vista.mensaje ?? ""),
    "E: se afirma ausencia de pronóstico en lugar de explicar el ajuste",
  );
  if (vista.estado === "incompleta") {
    comprobar(
      /necesita una tienda y un artículo/i.test(vista.mensaje ?? ""),
      `E: el pendiente no se explica: ${vista.mensaje}`,
    );
  } else {
    comprobar(
      vista.avisos.some((aviso) => /artículo|ajustó el nivel/i.test(aviso)),
      `E: la normalización del nivel no se comunica: ${vista.avisos.join(" | ")}`,
    );
    comprobar(
      !/ac_nivel=producto/.test(vista.url),
      `E: la URL conserva el nivel que se normalizó: ${vista.url}`,
    );
  }
  await sinCabeceraSitio(pagina);
  await pagina.locator('[data-testid="resultados-estado"]').screenshot({
    path: `${EV}/resultados-url-normalizada.png`,
  });

  // El mismo caso, pero pidiendo el artículo a mano: ahí sí se pide completar la selección.
  const manual = await abrir("ac_pantalla=resultados");
  manual.registro.length = 0;
  await elegirSegmento(manual.pagina, "selector-nivel", "Artículo");
  const pendiente = await leer(manual.pagina);
  comprobar(
    manual.registro.filter((r) => r.tipo === "peticion").length === 0,
    "E: al elegir Artículo sin tienda se envió una petición inválida",
  );
  comprobar(
    pendiente.estado === "incompleta",
    `E: elegir Artículo sin tienda dejó el estado ${pendiente.estado}`,
  );
  comprobar(
    /necesita una tienda y un artículo/i.test(pendiente.mensaje ?? ""),
    `E: el estado pendiente no indica qué falta: ${pendiente.mensaje}`,
  );
  comprobar(
    !/sin pronóstico publicado/i.test(pendiente.mensaje ?? ""),
    "E: el estado pendiente muestra un falso mensaje de ausencia",
  );
  await manual.pagina
    .locator('[data-testid="estado-incompleta"]')
    .screenshot({ path: `${EV}/resultados-seleccion-incompleta.png` });

  // Completar el contexto desde la misma pantalla resuelve la consulta.
  for (const [indice, valor] of [
    [1, "CA_1"],
    [2, "FOODS"],
    [3, "FOODS_3"],
  ]) {
    await manual.pagina.evaluate(
      ({ indice, valor }) => {
        const select = document.querySelectorAll(".ac-contexto select")[indice];
        select.value = valor;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      },
      { indice, valor },
    );
    await manual.pagina.waitForTimeout(3200);
  }
  const completado = await leer(manual.pagina);
  comprobar(
    completado.estado === "listo",
    `E: al completar tienda y departamento no se consultó (estado ${completado.estado})`,
  );
  comprobar(
    manual.registro.filter((r) => r.tipo === "peticion").every((r) => !/nivel=producto/.test(r.parametros) || /items=/.test(r.parametros)),
    "E: alguna petición de nivel producto viajó sin artículos",
  );
  await manual.pagina.close();
  await pagina.close();
}

/* F. Atrás/Adelante y cambios rápidos -------------------------------------- */
{
  const { pagina, registro } = await abrir("ac_pantalla=resultados");
  // Cambios rápidos de nivel: solo el último debe pedirse.
  registro.length = 0;
  await pagina.evaluate(() => {
    const opciones = ["Estado", "Tienda", "Categoría", "Departamento"];
    for (const texto of opciones) {
      const boton = [...document.querySelectorAll("[data-testid=selector-nivel] .at-seg")].find(
        (nodo) => nodo.textContent.trim() === texto,
      );
      if (boton) boton.click();
    }
  });
  await pagina.waitForTimeout(6000);
  const peticiones = registro.filter((r) => r.tipo === "peticion");
  const respuestas = registro.filter((r) => r.tipo === "respuesta");
  const vista = await leer(pagina);
  comprobar(
    respuestas.every((r) => r.estado === 200),
    `F: alguna petición del cambio rápido falló (${respuestas.map((r) => r.estado)})`,
  );
  const ultima = peticiones.at(-1)?.parametros ?? "";
  comprobar(
    vista.nivelActivo.includes("Departamento"),
    `F: el selector no quedó en el último nivel: ${vista.nivelActivo}`,
  );
  comprobar(
    /nivel=departamento/.test(vista.url) || /ac_nivel=departamento/.test(vista.url),
    `F: la URL no refleja el nivel activo: ${vista.url}`,
  );
  comprobar(
    ultima.includes("nivel=departamento") || ultima === "",
    `F: la última petición no corresponde al nivel visible: ${ultima}`,
  );
  comprobar(vista.estado === "listo", `F: estado ${vista.estado} tras los cambios`);

  // Atrás/Adelante entre pantallas: al volver, URL y resultado deben coincidir.
  await pagina.locator('.ac-tabs-btn[data-pantalla="datos"]').click();
  await pagina.waitForTimeout(3500);
  await pagina.goBack();
  await pagina.waitForTimeout(4500);
  const atras = await leer(pagina);
  comprobar(
    (await pagina.evaluate(
      () =>
        document.querySelector('.ac-tabs-btn[aria-selected="true"]')?.getAttribute("data-pantalla") ??
        null,
    )) === "resultados",
    "F: Atrás no volvió a Resultados",
  );
  comprobar(atras.estado === "listo", `F: Atrás dejó el estado ${atras.estado}`);
  comprobar(
    !/sin pronóstico publicado/i.test(atras.mensaje ?? ""),
    "F: Atrás mostró un mensaje de ausencia falso",
  );
  comprobar(
    atras.nivelActivo.join("|") === vista.nivelActivo.join("|"),
    `F: Atrás cambió el nivel visible (${atras.nivelActivo} frente a ${vista.nivelActivo})`,
  );
  await pagina.goForward();
  await pagina.waitForTimeout(4000);
  comprobar(
    (await pagina.evaluate(
      () =>
        document.querySelector('.ac-tabs-btn[aria-selected="true"]')?.getAttribute("data-pantalla") ??
        null,
    )) === "datos",
    "F: Adelante no regresó a Datos y calidad",
  );
  await pagina.close();
}

/* G. Error real de red con reintento -------------------------------------- */
{
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 1000 } });
  await pagina.route("**/api/v1/comercial/m5/pronosticos*", (ruta) => ruta.abort());
  await pagina.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app");
  await pagina.waitForTimeout(3500);
  const fallo = await leer(pagina);
  comprobar(fallo.estado === "error_conexion", `G: estado ${fallo.estado} sin red`);
  comprobar(
    /No se pudo contactar la API|No se pudo cargar/i.test(fallo.mensaje ?? ""),
    `G: el error de red no se explica: ${fallo.mensaje}`,
  );
  comprobar(
    !/sin pronóstico publicado/i.test(fallo.mensaje ?? ""),
    "G: el error de red se disfraza de ausencia de pronóstico",
  );
  // La curva nacional está dentro de la vista secundaria colapsable: se abre para capturarla.
  await pagina.evaluate(() => {
    const detalles = document.querySelector('[data-testid="plan-curva-nacional"]');
    if (detalles && !detalles.hasAttribute("open")) detalles.setAttribute("open", "");
  });
  await pagina.waitForTimeout(800);
  await pagina.locator('[data-testid="estado-error-conexion"]').screenshot({
    path: `${EV}/resultados-error-red.png`,
  });
  await pagina.unroute("**/api/v1/comercial/m5/pronosticos*");
  await pagina.evaluate(() => {
    const boton = [...document.querySelectorAll("button")].find((nodo) =>
      /Reintentar/i.test(nodo.textContent ?? ""),
    );
    if (boton) boton.click();
  });
  await pagina.waitForTimeout(5000);
  const recuperado = await leer(pagina);
  comprobar(recuperado.estado === "listo", `G: el reintento dejó ${recuperado.estado}`);
  comprobar(recuperado.grafico, "G: el reintento no dibujó la gráfica");
  await pagina.close();
}

/* H. Consulta válida sin resultados --------------------------------------- */
{
  /* La API publicada siempre devuelve al menos una serie (aunque sea de ceros), así que el
     camino «válida y sin series» se prueba sobre la respuesta real vaciando `series` en el
     navegador: es una prueba de la interfaz, no un dato inventado que se muestre al usuario. */
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 1000 } });
  const original = await (await fetch(`${API}/pronosticos?nivel=total&dias_historico=90`)).json();
  await pagina.route("**/api/v1/comercial/m5/pronosticos*", async (ruta) => {
    await ruta.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...original, series: [] }),
    });
  });
  await pagina.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app");
  await pagina.waitForTimeout(4000);
  const vacio = await leer(pagina);
  comprobar(vacio.estado === "sin_resultados", `H: estado ${vacio.estado} con respuesta vacía`);
  comprobar(
    /no devolvió series/i.test(vacio.mensaje ?? ""),
    `H: el estado vacío no se explica como respuesta válida: ${vacio.mensaje}`,
  );
  comprobar(
    !/Reintentar/i.test(vacio.mensaje ?? ""),
    "H: el estado vacío ofrece reintentar como si fuera un fallo",
  );
  comprobar(
    !/sin pronóstico publicado/i.test(vacio.mensaje ?? ""),
    "H: el estado vacío se confunde con ausencia de publicación",
  );
  await pagina.evaluate(() => {
    const detalles = document.querySelector('[data-testid="plan-curva-nacional"]');
    if (detalles && !detalles.hasAttribute("open")) detalles.setAttribute("open", "");
  });
  await pagina.waitForTimeout(700);
  await pagina.locator('[data-testid="estado-sin-resultados"]').screenshot({
    path: `${EV}/resultados-sin-resultados.png`,
  });

  // El estado vacío no debe mostrar gráfica ni desglose inventados.
  const contenido = await pagina.evaluate(() => {
    const raiz = document.querySelector('[data-testid="plan-curva-nacional"]') ?? document;
    return {
      grafico: Boolean(raiz.querySelector(".ac-df-grafico svg")),
      tablas: raiz.querySelectorAll(".ac-tabla tbody tr").length,
    };
  });
  comprobar(!contenido.grafico, "H: se dibujó una gráfica sin series");
  comprobar(contenido.tablas === 0, `H: hay ${contenido.tablas} filas de tabla sin series`);
  await pagina.close();

  // Y una consulta válida con pronóstico de ceros sí es un resultado, no un vacío.
  const ceros = await abrir("ac_pantalla=resultados&ac_tienda=WI_3&ac_dept=FOODS_1&ac_nivel=producto&ac_item=FOODS_1_001", {
    espera: 4500,
  });
  const vistaCeros = await leer(ceros.pagina);
  comprobar(
    vistaCeros.estado === "listo",
    `H: un pronóstico de ceros se trató como vacío (${vistaCeros.estado})`,
  );
  comprobar(vistaCeros.grafico, "H: no se dibujó la gráfica de un pronóstico de ceros");
  await ceros.pagina.close();
}

/* I. Día / Semana / Mes: la cobertura sigue en días ------------------------ */
{
  const { pagina } = await abrir("ac_pantalla=exploracion", { espera: 4500 });
  const coberturaApi = await (await fetch(`${API}/estado`)).json();
  const dias = coberturaApi.cobertura?.dias ?? null;
  const lecturas = [];
  for (const agregacion of ["Mes", "Semana", "Día"]) {
    await elegirSegmento(pagina, "selector-agregacion", agregacion);
    const vista = await leer(pagina);
    lecturas.push({ agregacion, cobertura: vista.cobertura });
    comprobar(
      new RegExp(`\\b${dias}\\b`).test((vista.cobertura ?? "").replace(/[.,]/g, "")) ||
        new RegExp(String(dias).replace(/(\\d)(?=(\\d{3})+$)/g, "$1[.,]?")).test(
          vista.cobertura ?? "",
        ),
      `I: con agregación ${agregacion} la cobertura no muestra ${dias} días: ${vista.cobertura}`,
    );
    comprobar(
      /días/.test(vista.cobertura ?? ""),
      `I: con agregación ${agregacion} la cobertura no se expresa en días: ${vista.cobertura}`,
    );
    comprobar(
      !/(mes|meses|semana|semanas)/i.test(
        (vista.cobertura ?? "").replace(/\d[\d.,]*/g, "").split("·")[1] ?? "",
      ),
      `I: la unidad de cobertura cambió con la agregación ${agregacion}: ${vista.cobertura}`,
    );
  }
  console.log("I · cobertura por agregación:", JSON.stringify(lecturas, null, 1));
  await pagina.close();
}

await navegador.close();

comprobar(errores.length === 0, `errores de consola: ${errores.slice(0, 3).join(" | ")}`);

if (fallos.length) {
  console.error(`\n✗ ${fallos.length} fallo(s):`);
  for (const fallo of fallos) console.error(`  · ${fallo}`);
  process.exit(1);
}
console.log("\n✓ Resultados: selección válida, estados excluyentes y cobertura en días.");
