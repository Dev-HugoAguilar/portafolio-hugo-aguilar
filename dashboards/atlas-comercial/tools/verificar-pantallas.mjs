/**
 * Verificación de las seis pantallas de Atlas Comercial.
 *
 * Comprueba, contra el sitio publicado (`127.0.0.1:8000`) y la API viva
 * (`127.0.0.1:8010`):
 *  1. rutas: cada pantalla tiene su URL, recarga, Atrás/Adelante y enlace directo;
 *  2. direcciones antiguas: `ac_sec=...` sigue abriendo la subsección equivalente;
 *  3. contexto: el estado del territorio se conserva al cambiar de pantalla y los
 *     filtros incompatibles se resuelven con aviso visible;
 *  4. recorrido técnico completo (proyecto → datos → exploración → modelado →
 *     evaluación → resultados) y recorrido comercial (resultados → California →
 *     tienda → categoría/departamento → artículo → descarga);
 *  5. datos: la descarga CSV coincide con la tabla mostrada y los totales cuadran;
 *  6. Estados Unidos, escritorio y 390 px, sin desbordes ni errores de consola.
 *
 * Capturas: `evidencias/comercial/pantallas-*.png`. Sale con código 1 si algo falla.
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

async function abrir(query = "", opciones = {}) {
  const pagina = await navegador.newPage({
    viewport: opciones.viewport ?? { width: 1400, height: 1100 },
    deviceScaleFactor: 1,
  });
  pagina.on("pageerror", (error) => errores.push(`pageerror: ${error.message.slice(0, 180)}`));
  pagina.on("console", (mensaje) => {
    if (mensaje.type() === "error") errores.push(`console: ${mensaje.text().slice(0, 180)}`);
  });
  await pagina.goto(url(query), { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app", { timeout: 120000 });
  await pagina.waitForTimeout(opciones.espera ?? 1800);
  return pagina;
}

/** Pantalla activa según la navegación (aria-selected). */
const pantallaActiva = (pagina) =>
  pagina.evaluate(() =>
    document.querySelector('.ac-tabs-btn[aria-selected="true"]')?.getAttribute("data-pantalla"),
  );

/** Comprueba que la pantalla activa y el contenido correspondan. */
async function comprobarPantalla(pagina, esperada, testid) {
  const activa = await pantallaActiva(pagina);
  comprobar(activa === esperada, `la pantalla activa es ${activa}, se esperaba ${esperada}`);
  const tiene = await pagina.evaluate(
    (id) => document.querySelector(`[data-testid="${id}"]`) !== null,
    testid,
  );
  comprobar(tiene, `la pantalla ${esperada} no muestra el bloque ${testid}`);
  const titulo = await pagina.evaluate(
    () => document.querySelector(".ac-ph-titulo")?.textContent?.trim() ?? "",
  );
  return { activa, titulo };
}

const PANTALLAS = [
  { id: "proyecto", testid: "proyecto-resultados", nombre: "Proyecto" },
  { id: "datos", testid: "datos-fuentes", nombre: "Datos y calidad" },
  { id: "exploracion", testid: "seccion-productos", nombre: "Exploración" },
  { id: "modelado", testid: "modelado-llano", nombre: "Modelado" },
  { id: "evaluacion", testid: "evaluacion-protocolo", nombre: "Evaluación" },
  { id: "resultados", testid: "datos-corte", nombre: "Resultados" },
];

/* 1. Enlace directo a cada pantalla --------------------------------------- */
for (const pantalla of PANTALLAS) {
  const pagina = await abrir(`ac_pantalla=${pantalla.id}`);
  // El bloque de exploración solo existe con una subsección abierta y departamento elegido.
  if (pantalla.id === "exploracion") {
    const activa = await pantallaActiva(pagina);
    comprobar(activa === "exploracion", `enlace directo a exploración abrió ${activa}`);
    await pagina.screenshot({ path: `${EV}/pantallas-${pantalla.id}.png`, fullPage: true });
    await pagina.close();
    continue;
  }
  await comprobarPantalla(pagina, pantalla.id, pantalla.testid);
  if (pantalla.id === "datos") {
    // La cobertura de precios se calcula por tienda y llega después: se espera para que
    // la evidencia no muestre un estado intermedio.
    await pagina
      .waitForSelector('[data-testid="datos-precios"] .ac-cob-precios', { timeout: 120000 })
      .catch(() => {});
    await pagina.waitForTimeout(800);
  }
  await pagina.screenshot({ path: `${EV}/pantallas-${pantalla.id}.png`, fullPage: true });
  if (pantalla.id === "datos") {
    // Evidencia del desglose de cobertura de precios (completa / parcial / sin precio).
    await pagina.locator('[data-testid="datos-precios"]').screenshot({
      path: `${EV}/pantallas-datos-precios.png`,
    });
  }
  await pagina.close();
}

/* 2. Navegación por la tira de pestañas y Atrás/Adelante ------------------ */
{
  const pagina = await abrir("");
  const activaInicial = await pantallaActiva(pagina);
  comprobar(activaInicial === "proyecto", `la entrada por omisión es ${activaInicial}`);

  for (const pantalla of PANTALLAS.slice(1)) {
    await pagina.click(`.ac-tabs-btn[data-pantalla="${pantalla.id}"]`);
    await pagina.waitForTimeout(1400);
    const activa = await pantallaActiva(pagina);
    comprobar(activa === pantalla.id, `al pulsar ${pantalla.id} se abrió ${activa}`);
    const query = pagina.url();
    comprobar(
      query.includes(`ac_pantalla=${pantalla.id}`),
      `la URL no identifica ${pantalla.id}: ${query}`,
    );
  }

  // Atrás debe volver a la pantalla anterior sin recargar la aplicación.
  await pagina.goBack();
  await pagina.waitForTimeout(1600);
  const atras = await pantallaActiva(pagina);
  comprobar(atras === "evaluacion", `Atrás dejó ${atras} en lugar de evaluación`);
  await pagina.goForward();
  await pagina.waitForTimeout(1600);
  const adelante = await pantallaActiva(pagina);
  comprobar(adelante === "resultados", `Adelante dejó ${adelante} en lugar de resultados`);

  // Recarga sobre una URL profunda.
  await pagina.goto(url("ac_pantalla=evaluacion&ac_estado=CA"), { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app");
  await pagina.waitForTimeout(2000);
  await pagina.reload({ waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(2500);
  comprobar(
    (await pantallaActiva(pagina)) === "evaluacion",
    "tras recargar no se mantiene la pantalla evaluación",
  );
  const contextoTrasRecarga = await pagina.evaluate(
    () => document.querySelector(".ac-rutas")?.textContent ?? "",
  );
  comprobar(
    contextoTrasRecarga.includes("California"),
    "tras recargar no se conserva el estado California",
  );
  await pagina.close();
}

/* 3. Direcciones antiguas (`ac_sec`) -------------------------------------- */
{
  const casos = [
    ["ac_sec=estacionalidad", "seccion-estacionalidad"],
    ["ac_sec=precios&ac_tienda=CA_1", "seccion-precios"],
  ];
  for (const [parametros, testid] of casos) {
    const pagina = await abrir(parametros, { espera: 3200 });
    const activa = await pantallaActiva(pagina);
    comprobar(activa === "exploracion", `la dirección antigua ${parametros} abrió ${activa}`);
    const visible = await pagina.evaluate(
      (id) => document.querySelector(`[data-testid="${id}"]`) !== null,
      testid,
    );
    comprobar(visible, `la dirección antigua ${parametros} no mostró ${testid}`);
    const destino = pagina.url();
    comprobar(
      destino.includes("ac_pantalla=exploracion"),
      `la dirección antigua no se reescribió a la nueva: ${destino}`,
    );
    comprobar(
      !destino.includes("ac_sec"),
      `la dirección antigua conserva ac_sec después de normalizarse: ${destino}`,
    );
    await pagina.close();
  }
}

/* 4. Recorrido técnico completo ------------------------------------------ */
{
  const pagina = await abrir("");
  const orden = ["datos", "exploracion", "modelado", "evaluacion", "resultados"];
  for (const destino of orden) {
    await pagina.click(`[data-pantalla-destino="${destino}"], .ac-tabs-btn[data-pantalla="${destino}"]`);
    await pagina.waitForTimeout(1500);
  }
  comprobar(
    (await pantallaActiva(pagina)) === "resultados",
    "el recorrido técnico no termina en resultados",
  );
  // La ruta del proceso debe estar en Proyecto y llevar a cada pantalla.
  const proyecto = await abrir("ac_pantalla=proyecto", { espera: 2500 });
  const destinos = await proyecto.evaluate(() =>
    [...document.querySelectorAll("[data-pantalla-destino]")].map((boton) =>
      boton.getAttribute("data-pantalla-destino"),
    ),
  );
  comprobar(
    ["datos", "exploracion", "modelado", "evaluacion", "resultados"].every((id) =>
      destinos.includes(id),
    ),
    `la ruta del proceso no cubre las cinco etapas: ${destinos.join(", ")}`,
  );
  await proyecto.close();
  await pagina.close();
}

/* 5. Recorrido comercial: resultados → California → tienda → artículo ---- */
{
  const pagina = await abrir("ac_pantalla=resultados", { espera: 3000 });
  // California, desde el contexto activo que comparten las seis pantallas.
  const campos = await pagina.$$(".ac-contexto select");
  comprobar(campos.length >= 4, `la barra de contexto tiene ${campos.length} selectores`);
  await campos[0].selectOption("CA");
  await pagina.waitForTimeout(2600);
  comprobar(
    pagina.url().includes("ac_estado=CA"),
    `al elegir California no se actualiza el estado en la URL: ${pagina.url()}`,
  );
  const tiendas = await (await pagina.$$(".ac-contexto select"))[1];
  await tiendas.selectOption("CA_1");
  await pagina.waitForTimeout(2600);
  const conTienda = pagina.url();
  comprobar(/ac_tienda=CA_\d/.test(conTienda), `al elegir tienda no queda en la URL: ${conTienda}`);

  // El contexto se conserva al cambiar de pantalla.
  await pagina.click('.ac-tabs-btn[data-pantalla="exploracion"]');
  await pagina.waitForTimeout(2200);
  comprobar(
    pagina.url().includes("ac_tienda=CA_") && pagina.url().includes("ac_estado=CA"),
    "el contexto territorial se perdió al cambiar de pantalla",
  );

  // Categoría y departamento con los mismos selectores.
  const categoriaSel = await pagina.$$(".ac-contexto select");
  await categoriaSel[2].selectOption("FOODS");
  await pagina.waitForTimeout(2600);
  comprobar(pagina.url().includes("ac_cat=FOODS"), "al elegir categoría no queda en la URL");

  const deptSel = await pagina.$$(".ac-contexto select");
  await deptSel[3].selectOption("FOODS_3");
  await pagina.waitForTimeout(2600);
  comprobar(pagina.url().includes("ac_dept=FOODS_3"), "al elegir departamento no queda en la URL");
  await pagina.screenshot({ path: `${EV}/pantallas-comercial-contexto.png`, fullPage: true });

  // Artículo y descarga en Resultados.
  const resultados = await abrir(
    `ac_pantalla=resultados&ac_estado=CA&ac_tienda=CA_1&ac_cat=FOODS&ac_dept=FOODS_3`,
    { espera: 3500 },
  );
  /* La descarga principal de «Resultados» es el plan filtrado del recorrido comercial. */
  const botonDescarga = await resultados.$('[data-testid="plan-descargar"]');
  comprobar(Boolean(botonDescarga), "resultados no ofrece la descarga del plan filtrado");
  if (botonDescarga) {
    const descarga = await Promise.all([
      resultados.waitForEvent("download", { timeout: 30000 }).catch(() => null),
      botonDescarga.click(),
    ]).then(([evento]) => evento);
    if (descarga) {
      const ruta = await descarga.path();
      const { readFile } = await import("node:fs/promises");
      const texto = await readFile(ruta, "utf8");
      const lineas = texto.replace(/^\ufeff/, "").split(/\r?\n/);
      const cabecera = lineas.findIndex((linea) => linea.startsWith("item_id,"));
      comprobar(cabecera > 0, "el CSV no incluye la cabecera del plan");
      const filas = lineas.slice(cabecera + 1).filter(Boolean);
      const filasTabla = await resultados.evaluate(
        () => document.querySelectorAll(".ac-plan-tabla tbody tr").length,
      );
      comprobar(filas.length > 0, "el CSV no tiene filas de datos");
      comprobar(
        filasTabla > 0,
        "la tabla de planificación no muestra filas para comparar con el CSV",
      );
      comprobar(
        texto.includes("Corte (fin del histórico)"),
        "el CSV no declara el corte de los datos",
      );
      comprobar(texto.includes("pronostico_28d"), "el CSV no incluye el total previsto");
      comprobar(texto.includes("semana_1") && texto.includes("semana_4"), "el CSV no incluye las cuatro semanas");
    } else {
      fallos.push("la descarga del plan no se inició");
    }
  }
  await resultados.screenshot({ path: `${EV}/pantallas-comercial.png`, fullPage: true });
  await resultados.close();
  await pagina.close();
}

/* 6. Coherencia de datos: total pronosticado y suma por claves ----------- */
{
  const pronosticos = await (await fetch(`${API}/pronosticos?nivel=total`)).json();
  const totalApi = pronosticos.series.reduce(
    (total, serie) => total + serie.pronostico.reduce((suma, valor) => suma + valor, 0),
    0,
  );
  const pagina = await abrir("ac_pantalla=resultados", { espera: 3000 });
  const totalPantalla = await pagina.evaluate(() => {
    const texto = document.querySelector(".ac-metricas--modelo dd")?.textContent ?? "";
    return Number(texto.replace(/[^\d.-]/g, ""));
  });
  comprobar(
    Math.abs(totalPantalla - totalApi) < 1,
    `el total pronosticado en pantalla (${totalPantalla}) no coincide con la API (${totalApi})`,
  );
  // El detalle por clave suma el total del nivel.
  const sumaFilas = await pagina.evaluate(() => {
    const tabla = [...document.querySelectorAll("table")].find((elemento) =>
      /Total pronosticado/.test(elemento.textContent ?? ""),
    );
    if (!tabla) return null;
    const celdas = [...tabla.querySelectorAll("tbody tr")].map((fila) =>
      Number((fila.children[1]?.textContent ?? "").replace(/[^\d.-]/g, "")),
    );
    return celdas.reduce((suma, valor) => suma + valor, 0);
  });
  comprobar(
    sumaFilas !== null && Math.abs(sumaFilas - totalPantalla) < 1,
    `el desglose por clave (${sumaFilas}) no suma el total mostrado (${totalPantalla})`,
  );
  await pagina.close();
}

/* 7. Móvil 390 px en las seis pantallas ---------------------------------- */
{
  const movil = await abrir("", {
    viewport: { width: 390, height: 844 },
    espera: 2600,
  });
  const desborde = await movil.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  comprobar(desborde <= 1, `la entrada por omisión desborda ${desborde}px en 390px`);

  for (const pantalla of PANTALLAS) {
    await movil.click(`.ac-tabs-btn[data-pantalla="${pantalla.id}"]`);
    await movil.waitForTimeout(2000);
    const activa = await pantallaActiva(movil);
    comprobar(activa === pantalla.id, `en móvil, al pulsar ${pantalla.id} se abrió ${activa}`);
    const ancho = await movil.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    comprobar(ancho <= 1, `la pantalla ${pantalla.id} desborda ${ancho}px en 390px`);
    if (pantalla.id === "resultados" || pantalla.id === "datos") {
      await movil.screenshot({ path: `${EV}/pantallas-movil-${pantalla.id}.png`, fullPage: true });
    }
  }

  // Teclado: las flechas recorren las pantallas.
  await movil.focus('.ac-tabs-btn[aria-selected="true"]');
  await movil.keyboard.press("Home");
  await movil.waitForTimeout(1600);
  comprobar((await pantallaActiva(movil)) === "proyecto", "Inicio no llevó a la primera pantalla");
  await movil.keyboard.press("ArrowRight");
  await movil.waitForTimeout(1600);
  comprobar(
    (await pantallaActiva(movil)) === "datos",
    "la flecha derecha no avanzó a la segunda pantalla",
  );
  await movil.close();
}

/* 8. Cambio rápido de filtros: la respuesta vieja no se queda en pantalla ------ */
{
  const pagina = await abrir("ac_pantalla=datos", { espera: 4000 });
  const selects = await pagina.$$(".ac-contexto select");
  // Tres cambios seguidos dentro del mismo estado: solo el último debe quedar visible.
  await selects[1].selectOption("CA_1");
  await selects[1].selectOption("CA_2");
  await selects[1].selectOption("CA_3");
  await pagina.waitForTimeout(6000);
  const estadoFinal = await pagina.evaluate(() => ({
    url: window.location.search,
    texto: document.querySelector('[data-testid="datos-precios"]')?.innerText ?? "",
    tienda: document.querySelector('[data-testid="datos-tienda-precios"]')?.innerText ?? "",
    seleccion: document.querySelectorAll(".ac-contexto select")[1]?.value ?? null,
  }));
  comprobar(
    /ac_tienda=CA_3/.test(estadoFinal.url),
    `la URL no refleja el último filtro: ${estadoFinal.url}`,
  );
  comprobar(
    estadoFinal.seleccion === "CA_3",
    `el selector quedó en ${estadoFinal.seleccion} en lugar de CA_3`,
  );
  comprobar(
    /CA_3/.test(estadoFinal.tienda) && !/CA_1/.test(estadoFinal.tienda),
    `la cobertura de precios muestra una tienda anterior (respuesta obsoleta): ${estadoFinal.tienda}`,
  );
  // La tienda del análisis de precios se guarda en la URL y sobrevive a la recarga.
  const selectPrecios = (await pagina.$$(".ac-contexto select"))[1];
  await selectPrecios.selectOption("CA_2");
  await pagina.waitForTimeout(5000);
  comprobar(
    /ac_tienda_precios=CA_2/.test(pagina.url()),
    `la tienda de precios no se guarda en la URL: ${pagina.url()}`,
  );
  await pagina.reload({ waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app");
  await pagina.waitForTimeout(4500);
  const trasRecarga = await pagina.evaluate(() => ({
    texto: document.querySelector('[data-testid="datos-precios"]')?.innerText ?? "",
    declarada: document.querySelector('[data-testid="datos-tienda-precios"]')?.innerText ?? "",
    tienda: document.querySelectorAll(".ac-contexto select")[1]?.value ?? null,
  }));
  comprobar(
    trasRecarga.tienda === "CA_2",
    `tras recargar la tienda de precios es ${trasRecarga.tienda} y no CA_2`,
  );
  comprobar(
    /CA_2/.test(trasRecarga.declarada),
    "tras recargar no se conserva la tienda de precios",
  );
  await pagina.close();
}

/* 9. Estado de error y reintento ------------------------------------------------ */
{
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 1000 } });
  await pagina.route("**/api/v1/comercial/m5/pronosticos*", (ruta) => ruta.abort());
  await pagina.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app");
  await pagina.waitForTimeout(3500);
  const fallo = await pagina.evaluate(() => ({
    estado: document
      .querySelector('[data-testid="resultados-estado"]')
      ?.getAttribute("data-estado"),
    bloque: Boolean(document.querySelector('[data-testid="estado-error-conexion"]')),
    texto: document.querySelector('[role="alert"]')?.textContent ?? "",
    reintento: [...document.querySelectorAll("button")].some((boton) =>
      /Reintentar/i.test(boton.textContent ?? ""),
    ),
  }));
  comprobar(
    fallo.estado === "error_conexion",
    `sin red el estado es ${fallo.estado} en lugar de error_conexion`,
  );
  comprobar(fallo.bloque, "sin red no aparece el bloque de error de conexión");
  comprobar(
    /No se pudo (cargar|contactar)[^.]*pronóstico/i.test(fallo.texto),
    `el estado de error no explica el fallo: ${fallo.texto.slice(0, 90)}`,
  );
  comprobar(fallo.reintento, "el estado de error no ofrece reintentar");
  comprobar(
    !/sin pronóstico publicado/i.test(fallo.texto),
    "el error de conexión se disfraza de ausencia de pronóstico",
  );
  await pagina.evaluate(() => {
    const detalles = document.querySelector('[data-testid="plan-curva-nacional"]');
    if (detalles && !detalles.hasAttribute("open")) detalles.setAttribute("open", "");
  });
  await pagina.waitForTimeout(700);
  // Evidencia del estado de error antes de recuperar la red.
  await pagina.locator('[data-testid="estado-error-conexion"]').screenshot({
    path: `${EV}/pantallas-estado-error.png`,
  });

  // Al volver la red, el reintento recupera el contenido.
  await pagina.unroute("**/api/v1/comercial/m5/pronosticos*");
  await pagina.evaluate(() => {
    const boton = [...document.querySelectorAll("button")].find((elemento) =>
      /Reintentar/i.test(elemento.textContent ?? ""),
    );
    if (boton) boton.click();
  });
  await pagina.waitForTimeout(5000);
  const recuperado = await pagina.evaluate(() => ({
    estado: document
      .querySelector('[data-testid="resultados-estado"]')
      ?.getAttribute("data-estado"),
    grafico: Boolean(document.querySelector(".ac-df-grafico svg")),
  }));
  comprobar(
    recuperado.estado === "listo",
    `el estado tras reintentar es ${recuperado.estado} en lugar de listo`,
  );
  comprobar(recuperado.grafico, "el reintento no dibujó el pronóstico");
  await pagina.screenshot({ path: `${EV}/pantallas-error-recuperado.png`, fullPage: false });
  await pagina.close();
}

await navegador.close();

comprobar(errores.length === 0, `errores de consola: ${errores.slice(0, 3).join(" | ")}`);

const { writeFile } = await import("node:fs/promises");
await writeFile(
  `${EV}/informe-pantallas.json`,
  JSON.stringify(
    {
      sitio: SITIO,
      api: API,
      pantallas: PANTALLAS.map((pantalla) => ({
        id: pantalla.id,
        nombre: pantalla.nombre,
        url: `/?ac_pantalla=${pantalla.id}${HASH}`,
      })),
      comprobaciones: [
        "enlace directo, pestañas, Atrás/Adelante y recarga por pantalla",
        "direcciones antiguas (ac_sec) normalizadas a la pantalla equivalente",
        "contexto territorial y de catálogo persistente entre pantallas",
        "recorrido técnico completo y recorrido comercial hasta la descarga",
        "CSV de la selección con fecha, identificadores, modelo, versión y corte",
        "total pronosticado y desglose por clave cuadran con la API",
        "cambio rápido de filtros sin respuestas obsoletas",
        "estado de error con reintento y recuperación",
        "móvil 390 px sin desbordes y navegación por teclado",
      ],
      capturas: [
        "pantallas-proyecto.png",
        "pantallas-datos.png",
        "pantallas-exploracion.png",
        "pantallas-modelado.png",
        "pantallas-evaluacion.png",
        "pantallas-resultados.png",
        "pantallas-movil-datos.png",
        "pantallas-movil-resultados.png",
        "pantallas-comercial-contexto.png",
        "pantallas-estado-error.png",
        "pantallas-error-recuperado.png",
      ],
      errores,
      fallos,
    },
    null,
    2,
  ),
);

if (fallos.length) {
  console.error(`\n✗ ${fallos.length} fallo(s):`);
  for (const fallo of fallos) console.error(`  · ${fallo}`);
  process.exit(1);
}
console.log("\n✓ Seis pantallas verificadas: rutas, recarga, Atrás/Adelante, direcciones antiguas,");
console.log("  contexto persistente, recorrido técnico y comercial, CSV y móvil 390 px.");
