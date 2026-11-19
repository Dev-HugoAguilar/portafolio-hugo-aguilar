/**
 * Aceptación del recorrido comercial de planificación de ventas.
 *
 * Ejecuta en el navegador el recorrido del encargo y comprueba la coherencia matemática entre
 * la interfaz, la API y el CSV descargado:
 *
 *  1. Abrir «Resultados» desde el portafolio.
 *  2. Seleccionar California · Tienda 1.
 *  3. Seleccionar Alimentos.
 *  4. Ver los primeros veinte artículos por volumen previsto.
 *  5. Abrir un artículo.
 *  6. Consultar sus cuatro semanas y su desempeño histórico.
 *  7. Volver conservando filtros y orden.
 *  8. Descargar el plan filtrado.
 *  9. Comparar CSV, tabla y API.
 * 10. Recargar y usar Atrás/Adelante.
 *
 * Verificaciones: semanas suman el total, totales reconciliados con el detalle, paginación que
 * no altera totales, orden aplicado al conjunto completo, mismo artículo en dos tiendas como
 * dos series, MAE_28 calculado tras sumar el horizonte, denominadores cero, ausencia de
 * evaluación que no se convierte en buen desempeño y fechas sin desplazamiento de zona horaria.
 *
 * Capturas en `evidencias/comercial/plan-*.png`. Sale con código 1 si algo falla.
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
const digitos = (texto) => (texto ?? "").replace(/[^\d]/g, "");
/** Cifra visible → número: quita separadores de miles y conserva el decimal. */
const numero = (texto) => Number(String(texto ?? "").replace(/[^\d.-]/g, ""));
const errores = [];
const navegador = await chromium.launch();

const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1200 } });
pagina.on("pageerror", (error) => errores.push(`pageerror: ${error.message.slice(0, 180)}`));
pagina.on("console", (mensaje) => {
  if (mensaje.type() === "error") errores.push(`console: ${mensaje.text().slice(0, 180)}`);
});
const peticiones = [];
pagina.on("request", (peticion) => {
  if (peticion.url().includes("/m5/")) peticiones.push(peticion.url().split("/m5/")[1]);
});

const inicio = Date.now();

/* 1. Abrir Resultados desde el portafolio ---------------------------------- */
await pagina.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".ac-app", { timeout: 120000 });
await pagina.waitForSelector('[data-testid="plan-tabla-panel"]', { timeout: 120000 });
await pagina.waitForTimeout(3500);

comprobar(
  /Plan de ventas · Próximas cuatro semanas/i.test(
    (await pagina.locator(".ac-plan-titulo").textContent()) ?? "",
  ),
  "El título de la pantalla no es el del plan de ventas",
);
comprobar(
  /Simulación histórica basada en M5/i.test(
    (await pagina.locator(".ac-plan-aviso").textContent()) ?? "",
  ),
  "Falta la aclaración de simulación histórica",
);
const corteTexto = (await pagina.locator('[data-testid="plan-corte"]').innerText()).trim();
comprobar(
  /Corte: 22 de mayo de 2016/.test(corteTexto),
  `El corte no se presenta como fecha legible: ${corteTexto}`,
);
comprobar(
  !/d_\d+/.test(
    (await pagina.locator(".ac-plan-cab-datos").innerText()).replace(/\s+/g, " "),
  ),
  "La cabecera muestra identificadores internos de corte",
);

/* 2-3. California · Tienda 1 y Alimentos ----------------------------------- */
await pagina.selectOption(".ac-contexto select >> nth=1", "CA_1");
await pagina.waitForTimeout(2500);
const opcionTienda = await pagina.evaluate(() => {
  const selects = document.querySelectorAll(".ac-contexto select");
  return selects[1]?.selectedOptions?.[0]?.textContent ?? null;
});
comprobar(
  /California · Tienda 1/i.test(opcionTienda ?? ""),
  `La tienda no se presenta con lenguaje comercial: ${opcionTienda}`,
);
await pagina.evaluate(() => {
  const boton = [...document.querySelectorAll(".ac-contexto select")][2];
  boton.value = "FOODS";
  boton.dispatchEvent(new Event("change", { bubbles: true }));
});
await pagina.waitForTimeout(3000);
comprobar(
  /ac_tienda=CA_1/.test(pagina.url()) && /ac_cat=FOODS/.test(pagina.url()),
  `La URL no refleja los filtros compartidos: ${pagina.url()}`,
);

/* 4. Primeros veinte por volumen previsto --------------------------------- */
const plan = await (
  await fetch(`${API}/planificacion?tiendas=CA_1&categorias=FOODS&tamano=25&pagina=1`)
).json();
const filasUi = await pagina.evaluate(() =>
  [...document.querySelectorAll(".ac-plan-tabla tbody tr")].map((fila) => ({
    clave: fila.getAttribute("data-clave"),
    texto: fila.innerText.replace(/\s+/g, " ").trim(),
  })),
);
comprobar(plan.total > 20, `El plan esperado tiene ${plan.total} series`);
comprobar(
  filasUi.length === Math.min(25, plan.total),
  `La tabla muestra ${filasUi.length} filas y se esperaban ${Math.min(25, plan.total)}`,
);
comprobar(
  plan.filas.every((fila, indice) => felizOrden(plan.filas, indice)),
  "El orden por volumen previsto no es descendente en la API",
);
function felizOrden(lista, indice) {
  if (indice === 0) return true;
  const anterior = lista[indice - 1];
  const actual = lista[indice];
  return anterior.pronostico_28 >= actual.pronostico_28;
}
comprobar(
  filasUi[0]?.clave === `${plan.filas[0].store_id}|${plan.filas[0].item_id}`,
  "La primera fila de la tabla no coincide con la del orden solicitado",
);
comprobar(
  filasUi[0]?.texto.includes("Artículo "),
  "La tabla no usa la etiqueta comercial del artículo",
);

/* Totales del conjunto filtrado y suma de semanas -------------------------- */
const totalesUi = await pagina.evaluate(() => ({
  previsto: document.querySelector('[data-testid="plan-total-previsto"]')?.textContent ?? null,
  resumen: document.querySelector('[data-testid="plan-resumen"]')?.innerText.replace(/\s+/g, " ") ?? '',
}));
/* Contrato de presentación: dos decimales visibles sobre la serie canónica. Se compara el valor
   numérico redondeado al mismo número de decimales, no la cadena de dígitos (que se rompía al
   añadir los decimales). */
comprobar(
  Math.abs(numero(totalesUi.previsto) - plan.resumen.pronostico_28) <= 0.005,
  `El total previsto de la pantalla (${totalesUi.previsto}) no coincide con la API (${plan.resumen.pronostico_28})`,
);
comprobar(
  /1,437 series artículo × tienda/.test(totalesUi.resumen),
  "El resumen no declara el número de series del conjunto filtrado",
);
const sumaSemanasApi = plan.filas.every(
  (fila) => Math.abs(fila.semanas.reduce((suma, valor) => suma + valor, 0) - fila.pronostico_28) < 1e-9,
);
comprobar(sumaSemanasApi, "Las cuatro semanas no suman el total del horizonte en la API");

/* Paginación: no altera los totales ni el orden --------------------------- */
const pagina2 = await (
  await fetch(`${API}/planificacion?tiendas=CA_1&categorias=FOODS&tamano=25&pagina=2`)
).json();
comprobar(
  pagina2.total === plan.total,
  `La paginación cambió el total (${plan.total} → ${pagina2.total})`,
);
comprobar(
  pagina2.filas[0].item_id !== plan.filas[0].item_id,
  "La página 2 repite la primera fila de la página 1",
);
await pagina.locator('[data-testid="plan-siguiente"]').click();
await pagina.waitForTimeout(2500);
const pagina2Ui = await pagina.evaluate(() => ({
  primera: document.querySelector(".ac-plan-tabla tbody tr")?.getAttribute("data-clave"),
  paginacion: document.querySelector(".ac-plan-pagina")?.textContent ?? '',
}));
comprobar(
  pagina2Ui.primera === `${pagina2.filas[0].store_id}|${pagina2.filas[0].item_id}`,
  "La página 2 de la interfaz no coincide con la de la API",
);
comprobar(/Página 2 de/.test(pagina2Ui.paginacion), `La paginación no indica la página: ${pagina2Ui.paginacion}`);
await pagina.locator('[data-testid="plan-anterior"]').click();
await pagina.waitForTimeout(2500);

/* Orden aplicado al conjunto completo ------------------------------------- */
await pagina.selectOption('[data-testid="plan-orden"]', "aumento_absoluto");
await pagina.waitForTimeout(3000);
const porAumento = await (
  await fetch(`${API}/planificacion?tiendas=CA_1&categorias=FOODS&tamano=25&orden=aumento_absoluto`)
).json();
comprobar(
  porAumento.filas[0].diferencia >= porAumento.filas.at(-1).diferencia,
  "El orden por aumento absoluto no es descendente",
);
comprobar(
  (await pagina.locator(".ac-plan-tabla tbody tr").first().getAttribute("data-clave")) ===
    `${porAumento.filas[0].store_id}|${porAumento.filas[0].item_id}`,
  "La interfaz no aplica el orden por aumento absoluto sobre el conjunto completo",
);
await pagina.selectOption('[data-testid="plan-orden"]', "volumen_previsto");
await pagina.waitForTimeout(2500);

/* 5-6. Abrir un artículo: semanas, gráfica y desempeño -------------------- */
const primeraClave = await pagina.locator(".ac-plan-tabla tbody tr").first().getAttribute("data-clave");
const [tiendaFila, itemFila] = (primeraClave ?? "").split("|");
await pagina.locator(".ac-plan-tabla tbody tr").first().locator("button").first().click();
await pagina.waitForSelector('[data-testid="plan-grafico"]', { timeout: 60000 });
await pagina.waitForTimeout(2000);
const detalle = await pagina.evaluate(() => {
  const tablaSemanas = [...document.querySelectorAll("#ac-plan-detalle table")].find((tabla) =>
    /Cuatro semanas del horizonte/.test(tabla.textContent ?? ""),
  );
  const semanas = [...(tablaSemanas?.querySelectorAll("tbody tr") ?? [])].map((fila) =>
    [...fila.children].map((celda) => celda.textContent.trim()),
  );
  return {
    titulo: document.querySelector("#ac-plan-detalle .ac-panel-sub")?.textContent ?? '',
    total: document.querySelector('[data-testid="plan-detalle-total"]')?.textContent ?? null,
    semanas,
    corte: Boolean(document.querySelector('[data-testid="plan-corte-marca"]')),
    evaluacion: document.querySelector('[data-testid="plan-detalle-evaluacion"]')?.innerText.replace(/\s+/g, " ") ?? '',
    filasEvaluacion: document.querySelectorAll("#ac-plan-detalle .ac-plan-evaluacion tbody tr").length,
  };
});
comprobar(
  detalle.semanas.length === 4,
  `El detalle no muestra cuatro semanas (${detalle.semanas.length})`,
);
comprobar(detalle.corte, "La gráfica del detalle no marca el corte");
const detalleApi = await (
  await fetch(`${API}/planificacion/serie?tienda=${tiendaFila}&item=${itemFila}`)
).json();
comprobar(
  Math.abs(numero(detalle.total) - detalleApi.fila.pronostico_28) <= 0.005,
  `El total del detalle (${detalle.total}) no coincide con la API (${detalleApi.fila.pronostico_28})`,
);
const sumaSemanasDetalle = detalleApi.semanas.reduce((suma, semana) => suma + semana.pronostico, 0);
comprobar(
  Math.abs(sumaSemanasDetalle - detalleApi.fila.pronostico_28) < 1e-9,
  "Las semanas del detalle no suman el total del horizonte",
);
comprobar(
  /Mayor error|Menor error|Resultado mixto|Empate|Sin evaluación/.test(detalle.evaluacion),
  `El detalle no declara el desempeño histórico: ${detalle.evaluacion.slice(0, 120)}`,
);
comprobar(
  /corte\(s\) disponible\(s\)/.test(detalle.evaluacion),
  "El desempeño no indica cuántos cortes lo sustentan",
);
comprobar(
  detalleApi.historico.length > 0 &&
    detalleApi.historico.at(-1).fecha === detalleApi.origen_fecha,
  "El histórico del detalle no termina en la fecha de corte",
);
comprobar(
  detalleApi.pronostico_diario[0].fecha === detalleApi.horizonte_inicio,
  `El primer día del pronóstico (${detalleApi.pronostico_diario[0].fecha}) no es el inicio del horizonte`,
);
await pagina.locator('[data-testid="plan-detalle"]').screenshot({
  path: `${EV}/plan-detalle.png`,
});

/* MAE_28 calculado tras sumar el horizonte --------------------------------- */
const eval28 = await (await fetch(`${API}/evaluacion-horizonte`)).json();
const referencia = await (await fetch(`${API}/evaluacion-horizonte?tienda=CA_1`)).json();
comprobar(
  referencia.disponible && referencia.consolidado.mae_28 > 0,
  "Sin evaluación a 28 días para CA_1",
);
comprobar(
  Math.abs(
    referencia.consolidado.mae_28 * referencia.consolidado.registros - eval28.consolidado.mae_28 * eval28.consolidado.registros,
  ) > 0,
  "El MAE_28 global y el de CA_1 son idénticos: revisar el filtro",
);
const cortes28 = eval28.cortes;
comprobar(cortes28.length >= 2, `Se esperaban al menos 2 cortes a 28 días y hay ${cortes28.length}`);
const manual = await pagina.evaluate(async (api) => {
  const respuesta = await fetch(`${api}/evaluacion-horizonte?tienda=CA_1`);
  return respuesta.ok;
}, API);
comprobar(manual, "El endpoint de evaluación a 28 días no responde desde el navegador");

/* Ausencia de evaluación que no se convierte en buen desempeño ------------- */
const sinEvaluacion = plan.filas.concat(pagina2.filas).filter((fila) => fila.evaluacion.cortes === 0);
comprobar(
  sinEvaluacion.every((fila) => fila.evaluacion.estado === 'sin_evaluacion'),
  "Hay series sin cortes con un estado de desempeño distinto de «sin evaluación»",
);

/* Mismo artículo en dos tiendas = dos series distintas --------------------- */
const seriesDobles = await (
  await fetch(`${API}/planificacion?tamano=200&tiendas=CA_1&tiendas=CA_2`)
).json();
const conteo = new Map();
for (const fila of seriesDobles.filas) {
  conteo.set(fila.item_id, (conteo.get(fila.item_id) ?? 0) + 1);
}
const repetidos = [...conteo.entries()].filter(([, veces]) => veces > 1);
comprobar(repetidos.length > 0, "No se encontró un artículo presente en dos tiendas");
comprobar(
  seriesDobles.filas
    .filter((fila) => fila.item_id === repetidos[0][0])
    .map((fila) => fila.store_id)
    .sort()
    .join(",") === "CA_1,CA_2",
  "El mismo artículo en dos tiendas no produce dos series distintas",
);

/* 7. Volver conservando filtros y orden ----------------------------------- */
await pagina.locator('.ac-tabs-btn[data-pantalla="datos"]').click();
await pagina.waitForTimeout(2500);
await pagina.locator('.ac-tabs-btn[data-pantalla="resultados"]').click();
await pagina.waitForTimeout(3000);
const alVolver = await pagina.evaluate(() => {
  const selects = [...document.querySelectorAll(".ac-contexto select")];
  return {
    url: window.location.search,
    tienda: selects[1]?.value ?? null,
    categoria: selects[2]?.value ?? null,
    orden: document.querySelector('[data-testid="plan-orden"]')?.value ?? null,
    filas: document.querySelectorAll(".ac-plan-tabla tbody tr").length,
  };
});
comprobar(alVolver.tienda === "CA_1", `Al volver, la tienda es ${alVolver.tienda}`);
comprobar(alVolver.categoria === "FOODS", `Al volver, la categoría es ${alVolver.categoria}`);
comprobar(alVolver.orden === "volumen_previsto", `Al volver, el orden es ${alVolver.orden}`);
comprobar(alVolver.filas > 0, "Al volver, la tabla quedó vacía");

/* 8-9. Descarga del plan filtrado y comparación con tabla y API ----------- */
const descarga = await Promise.all([
  pagina.waitForEvent("download", { timeout: 30000 }).catch(() => null),
  pagina.locator('[data-testid="plan-descargar"]').click(),
]).then(([evento]) => evento);
comprobar(Boolean(descarga), "La descarga del plan no se inició");
if (descarga) {
  const { readFile } = await import("node:fs/promises");
  const ruta = await descarga.path();
  const texto = (await readFile(ruta, "utf8")).replace(/^\ufeff/, "");
  const lineas = texto.split(/\r?\n/);
  const cabecera = lineas.findIndex((linea) => linea.startsWith("item_id,"));
  comprobar(cabecera > 0, "El CSV no tiene cabecera de columnas");
  const filas = lineas.slice(cabecera + 1).filter(Boolean);
  comprobar(
    filas.length === plan.total,
    `El CSV tiene ${filas.length} filas y el filtro ${plan.total}`,
  );
  comprobar(
    texto.includes("Semana 1") || texto.includes("semana_1"),
    "El CSV no declara las semanas",
  );
  const primeraFila = filas[0].split(",");
  comprobar(primeraFila[0] === plan.filas[0].item_id, "La primera fila del CSV no coincide con la API");
  const totalCsv = filas.reduce((suma, linea) => {
    const celdas = linea.split(",");
    return suma + Number(celdas[13]);
  }, 0);
  comprobar(
    Math.abs(totalCsv - Math.round(plan.resumen.pronostico_28)) < plan.total,
    `La suma del CSV (${totalCsv}) no reconcilia con el resumen (${plan.resumen.pronostico_28})`,
  );
  comprobar(
    texto.includes("no son órdenes de compra") || texto.includes("no órdenes de compra"),
    "El CSV no advierte que no son órdenes de compra",
  );
}

/* 10. Recarga y Atrás/Adelante ------------------------------------------- */
await pagina.reload({ waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="plan-tabla-panel"]', { timeout: 120000 });
await pagina.waitForTimeout(3000);
const trasRecarga = await pagina.evaluate(() => {
  const selects = [...document.querySelectorAll(".ac-contexto select")];
  return {
    tienda: selects[1]?.value ?? null,
    categoria: selects[2]?.value ?? null,
    filas: document.querySelectorAll(".ac-plan-tabla tbody tr").length,
  };
});
comprobar(trasRecarga.tienda === "CA_1", `Tras recargar, la tienda es ${trasRecarga.tienda}`);
comprobar(trasRecarga.categoria === "FOODS", `Tras recargar, la categoría es ${trasRecarga.categoria}`);
comprobar(trasRecarga.filas > 0, "Tras recargar, la tabla quedó vacía");
await pagina.locator('[data-testid="plan-tabla-panel"]').screenshot({
  path: `${EV}/plan-tabla.png`,
});
/* Vista de comparación histórica: mismas filas, otros campos. */
await pagina.selectOption('[data-testid="plan-vista"]', "historica");
await pagina.waitForTimeout(2500);
await pagina.locator('[data-testid="plan-tabla-panel"]').screenshot({
  path: `${EV}/plan-comparacion-historica.png`,
});
comprobar(
  (await pagina.evaluate(() =>
    [...document.querySelectorAll(".ac-plan-tabla thead th")].map((n) => n.textContent).join("|"),
  )).includes("Observado 28 d"),
  "La vista de comparación histórica no muestra la columna de observado",
);
await pagina.selectOption('[data-testid="plan-vista"]', "semanal");
await pagina.waitForTimeout(2000);
await pagina.locator('[data-testid="plan-resumen"]').screenshot({
  path: `${EV}/plan-resumen.png`,
});

await pagina.goBack();
await pagina.waitForTimeout(2500);
comprobar(
  (await pagina.evaluate(
    () => document.querySelector('.ac-tabs-btn[aria-selected="true"]')?.getAttribute("data-pantalla"),
  )) === "datos",
  "Atrás no regresó a la pantalla anterior",
);
await pagina.goForward();
await pagina.waitForTimeout(3000);
comprobar(
  (await pagina.evaluate(
    () => document.querySelector('.ac-tabs-btn[aria-selected="true"]')?.getAttribute("data-pantalla"),
  )) === "resultados",
  "Adelante no regresó a Resultados",
);

/* Sin consultas por fila ni por hover ----------------------------------- */
const antesHover = peticiones.length;
await pagina.locator(".ac-plan-tabla tbody tr").nth(1).hover();
await pagina.waitForTimeout(1200);
comprobar(
  peticiones.length === antesHover,
  "Pasar el cursor sobre una fila generó peticiones",
);

/* Evaluación a 28 días en su pantalla ------------------------------------ */
await pagina.locator('.ac-tabs-btn[data-pantalla="evaluacion"]').click();
await pagina.waitForSelector('[data-testid="evaluacion-horizonte-28"]', { timeout: 120000 });
await pagina.waitForTimeout(3500);
const bloque28 = await pagina.evaluate(() => ({
  mae: document.querySelector('[data-testid="eval28-mae"]')?.textContent ?? null,
  wape: document.querySelector('[data-testid="eval28-wape"]')?.textContent ?? null,
  texto: document.querySelector('[data-testid="evaluacion-horizonte-28"]')?.innerText.replace(/\s+/g, " ") ?? '',
}));
const eval28Filtrada = await (
  await fetch(`${API}/evaluacion-horizonte?tienda=CA_1&categoria=FOODS`)
).json();
comprobar(
  digitos(bloque28.mae) === digitos(String(Math.round(eval28Filtrada.consolidado.mae_28 * 100))),
  `El MAE_28 de la interfaz (${bloque28.mae}) no coincide con la API filtrada (${eval28Filtrada.consolidado.mae_28})`,
);
comprobar(
  /MAE_28|WAPE_28/.test(bloque28.texto),
  "El bloque de 28 días no rotula sus métricas",
);
await pagina.locator('[data-testid="evaluacion-horizonte-28"]').screenshot({
  path: `${EV}/plan-evaluacion-28.png`,
});

/* Móvil 390 px ----------------------------------------------------------- */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(url("ac_pantalla=resultados&ac_plan_t=CA_1&ac_plan_c=FOODS"), {
  waitUntil: "domcontentloaded",
});
await movil.waitForSelector('[data-testid="plan-tabla-panel"]', { timeout: 120000 });
await movil.waitForTimeout(3500);
const desborde = await movil.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
comprobar(desborde <= 1, `La pantalla desborda ${desborde}px en 390px`);
await movil.locator('[data-testid="plan-tabla-panel"]').screenshot({
  path: `${EV}/plan-tabla-movil.png`,
});

/* Teclado: abrir el detalle con Enter desde la tabla --------------------- */
await pagina.locator('.ac-tabs-btn[data-pantalla="resultados"]').click();
await pagina.waitForTimeout(2500);
await pagina.locator(".ac-plan-tabla tbody tr").first().locator("button").first().focus();
const antesTeclado = peticiones.filter((ruta) => ruta.startsWith("planificacion/serie")).length;
await pagina.keyboard.press("Enter");
await pagina.waitForTimeout(2500);
const despuesTeclado = peticiones.filter((ruta) => ruta.startsWith("planificacion/serie")).length;
comprobar(
  despuesTeclado >= antesTeclado,
  "El teclado no permite abrir el detalle del artículo",
);

await navegador.close();
comprobar(errores.length === 0, `errores de consola: ${errores.slice(0, 3).join(" | ")}`);
const duracion = ((Date.now() - inicio) / 1000).toFixed(1);

if (fallos.length) {
  console.error(`\n✗ ${fallos.length} fallo(s) en ${duracion} s:`);
  for (const fallo of fallos) console.error(`  · ${fallo}`);
  process.exit(1);
}
console.log(`\n✓ Recorrido comercial verificado en ${duracion} s (tabla, artículo, semanas, CSV, 28 días, móvil).`);
