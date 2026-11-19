/**
 * Aceptación de las correcciones de precisión, contexto, evaluación y etiquetas.
 *
 * Reproduce en la aplicación servida (no en el código fuente) los cuatro grupos del encargo:
 *
 *  A. Precisión y publicación consistente: una sola cifra canónica en decimales, total
 *     reconciliado entre plan, pronóstico agregado, detalle, evaluación y CSV; revisión
 *     identificable y anterior recuperable.
 *  B. Contadores de contexto: las tiendas del resultado completo del filtro, nombre legible con
 *     una sola tienda y nunca «0» mientras se carga.
 *  C. Evaluación histórica: historia y observado posterior al corte en los dos cortes finales y
 *     en todos los niveles, sin huecos ni fechas repetidas.
 *  D. Etiquetas, afirmaciones y estados: nombres comerciales, sesgo con signo y ejemplos,
 *     supuestos del modelo que no contradicen la ejecución, protocolo declarado y tabla de
 *     segmentos que no queda vacía.
 *
 * Capturas en `evidencias/comercial/cor-*.png`. Sale con código 1 si algo falla.
 */
import { readFile } from "node:fs/promises";

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
const numero = (texto) => Number(String(texto ?? "").replace(/[^\d.-]/g, ""));

async function json(ruta) {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`${ruta} → ${respuesta.status}`);
  return respuesta.json();
}

const errores = [];
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1200 } });
pagina.on("pageerror", (error) => errores.push(`pageerror: ${error.message.slice(0, 180)}`));
pagina.on("console", (mensaje) => {
  if (mensaje.type() === "error") errores.push(`console: ${mensaje.text().slice(0, 180)}`);
});

/* ========================================================================== */
/* A. Precisión y publicación consistente                                     */
/* ========================================================================== */
console.log("\nA · precisión y publicación");

const plan = await json("/planificacion?pagina=1&tamano=1");
comprobar(/^rev-[0-9a-f]{6,}$/.test(plan.revision ?? ""), `La revisión publicada no se identifica: ${plan.revision}`);
comprobar(
  plan.revision_anterior && plan.revision_anterior !== plan.revision,
  `No se declara la revisión anterior recuperable: ${plan.revision_anterior}`,
);
comprobar(
  /decimal/.test(plan.politica_precision ?? ""),
  `La política de precisión no declara decimales: ${plan.politica_precision}`,
);
comprobar(
  (plan.tiendas_contexto ?? []).length === 10,
  `El contexto no declara las tiendas del resultado: ${(plan.tiendas_contexto ?? []).length}`,
);

/* El total se recalcula desde el pronóstico agregado del corte final, servido por otra
   colección: si la publicación redondeara por día, estas dos cifras no coincidirían. */
const pronTotal = await json("/pronosticos?nivel=total&origen=final");
const diasTotal = pronTotal.series[0].pronostico;
const totalDias = diasTotal.reduce((suma, valor) => suma + valor, 0);
const totalRedondeado = diasTotal.reduce((suma, valor) => suma + Math.round(valor), 0);
comprobar(
  Math.abs(totalDias - plan.resumen.pronostico_28) < 0.5,
  `El plan (${plan.resumen.pronostico_28}) no coincide con el pronóstico agregado (${totalDias})`,
);
comprobar(
  Math.abs(totalDias - totalRedondeado) > 1,
  "El total agregado coincide con la suma de días redondeados: la publicación seguiría redondeando por día",
);
comprobar(
  diasTotal.some((valor) => Math.abs(valor - Math.round(valor)) > 1e-6),
  "La serie canónica del corte final no conserva decimales",
);

/* Semanas, detalle y evaluación sobre la misma serie. */
const fila = plan.filas[0];
const detalle = await json(
  `/planificacion/serie?tienda=${fila.store_id}&item=${fila.item_id}`,
);
const sumaSemanas = detalle.semanas.reduce((suma, semana) => suma + semana.pronostico, 0);
comprobar(
  Math.abs(sumaSemanas - detalle.fila.pronostico_28) < 1e-6,
  `Las cuatro semanas (${sumaSemanas}) no suman el total de la fila (${detalle.fila.pronostico_28})`,
);
const sumaDiaria = detalle.pronostico_diario.reduce(
  (suma, dia) => suma + (dia.pronostico ?? 0),
  0,
);
comprobar(
  Math.abs(sumaDiaria - detalle.fila.pronostico_28) < 1e-6,
  `La serie diaria (${sumaDiaria}) no suma el total de la fila (${detalle.fila.pronostico_28})`,
);
comprobar(
  detalle.pronostico_diario.some((dia) => Math.abs((dia.pronostico ?? 0) - Math.round(dia.pronostico ?? 0)) > 1e-6),
  "El detalle diario no conserva decimales",
);
comprobar(
  detalle.revision === plan.revision,
  `El detalle sirve otra revisión: ${detalle.revision} ≠ ${plan.revision}`,
);
const evaluacion28 = await json('/evaluacion-horizonte?tienda=CA_1&categoria=FOODS');
comprobar(
  evaluacion28.revision === plan.revision,
  `La evaluación sirve otra revisión: ${evaluacion28.revision} ≠ ${plan.revision}`,
);
const corteDetalle = detalle.evaluacion_horizonte.find(
  (corte) => corte.origen_d === evaluacion28.cortes[0]?.origen_d,
);
if (corteDetalle) {
  comprobar(
    Math.abs(corteDetalle.error_28 - (corteDetalle.pronostico_28 - corteDetalle.observado_28)) < 1e-6,
    `El error del detalle no es pronóstico − observado (${corteDetalle.error_28})`,
  );
  comprobar(
    Math.abs(corteDetalle.error_absoluto_28 - Math.abs(corteDetalle.error_28)) < 1e-6,
    "El error absoluto del detalle no es el valor absoluto del error con signo",
  );
  comprobar(
    Math.abs(
      detalle.pronostico_diario.reduce((suma, dia) => suma + (dia.pronostico ?? 0), 0) -
        detalle.fila.pronostico_28,
    ) < 1e-6,
    "El detalle diario del corte no reconcilia con el total de la fila",
  );
} else {
  fallos.push("El detalle no publica la evaluación del mismo corte que /evaluacion-horizonte");
}

/* ========================================================================== */
/* B. Contadores de contexto y estados de carga                               */
/* ========================================================================== */
console.log("B · contadores de contexto");

/* Se retrasa la respuesta del plan para leer el estado intermedio: no puede haber «0». */
let liberarPlan;
const bloqueo = new Promise((resolver) => {
  liberarPlan = resolver;
});
await pagina.route("**/planificacion?**", async (ruta) => {
  if (!ruta.request().url().includes("tamano=1")) {
    await bloqueo;
  }
  await ruta.continue();
});
await pagina.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".ac-app", { timeout: 120000 });
const estadoCarga = await pagina.evaluate(
  () => document.querySelector('[data-testid="plan-tienda-contexto"]')?.innerText ?? "",
);
comprobar(
  !/Tiendas:\s*0\b/.test(estadoCarga.replace(/\s+/g, " ")),
  `Mientras carga, el contador muestra cero tiendas: «${estadoCarga.trim()}»`,
);
comprobar(
  /…/.test(estadoCarga) || /Tiendas/.test(estadoCarga),
  `El contador no declara estado pendiente ni tiendas: «${estadoCarga.trim()}»`,
);
liberarPlan();
await pagina.waitForSelector('[data-testid="plan-tabla-panel"]', { timeout: 180000 });
await pagina.waitForFunction(
  () => !document.querySelector('[data-testid="plan-tabla-panel"]')?.innerText.includes("…"),
  undefined,
  { timeout: 180000 },
);
await pagina.waitForTimeout(2500);

const contextoCompleto = await pagina.locator('[data-testid="plan-tienda-contexto"]').innerText();
comprobar(
  digitos(contextoCompleto) === String((plan.tiendas_contexto ?? []).length),
  `El contador de tiendas (${contextoCompleto.trim()}) no coincide con las tiendas del contexto (${(plan.tiendas_contexto ?? []).length})`,
);
comprobar(
  !/Tiendas:\s*0\b/.test(contextoCompleto.replace(/\s+/g, " ")),
  "El contador sigue mostrando cero tiendas con el resultado cargado",
);
comprobar(
  (await pagina.locator('[data-testid="plan-tabla-panel"]').innerText()).includes("30,490") ||
    (await pagina.locator('[data-testid="plan-resumen"]').innerText()).includes("30,490"),
  "El resumen no declara las 30 490 series del conjunto",
);
const revisionUi = await pagina.locator('[data-testid="plan-revision"]').innerText();
comprobar(revisionUi.includes(plan.revision), `La revisión no se muestra en la cabecera: ${revisionUi}`);
await pagina.locator('[data-testid="plan-tabla-panel"]').screenshot({ path: `${EV}/cor-plan-contexto.png` });
await pagina.locator(".ac-plan-cab").screenshot({ path: `${EV}/cor-plan-cabecera.png` });

/* Con una sola tienda se muestra su nombre legible, no el código suelto. */
await pagina.selectOption(".ac-contexto select >> nth=1", "CA_1");
await pagina.waitForTimeout(2500);
const contextoUna = await pagina.locator('[data-testid="plan-tienda-contexto"]').innerText();
comprobar(
  /Tienda:\s*California · Tienda 1/.test(contextoUna.replace(/\s+/g, " ")),
  `Con una tienda no se muestra su nombre legible: ${contextoUna.trim()}`,
);

/* Total de la tabla y del resumen frente a la API. */
const planTienda = await json("/planificacion?tiendas=CA_1&tamano=1");
const totalUi = await pagina.locator('[data-testid="plan-total-previsto"]').innerText();
comprobar(
  Math.abs(numero(totalUi) - planTienda.resumen.pronostico_28) <= 0.005,
  `El total de la pantalla con una tienda (${totalUi.trim()}) no coincide con la API (${planTienda.resumen.pronostico_28})`,
);

/* La revisión y la política están en la trazabilidad, con la anterior nombrada. */
await pagina.locator('[data-testid="plan-trazabilidad"] summary').click();
const traza = await pagina.locator('[data-testid="plan-trazabilidad"]').innerText();
comprobar(traza.includes(plan.revision), "La trazabilidad no muestra la revisión activa");
comprobar(
  /decimal/i.test(traza) && !/vector publicado es entero/i.test(traza),
  "La trazabilidad no declara la política decimal (o repite la política entera)",
);
comprobar(
  traza.includes(plan.revision_anterior ?? ""),
  "La trazabilidad no declara la revisión anterior recuperable",
);
await pagina.locator('[data-testid="plan-trazabilidad"]').screenshot({ path: `${EV}/cor-plan-trazabilidad.png` });

/* CSV: misma cifra, con decimales y con la revisión declarada. */
await pagina.evaluate(() => {
  const boton = [...document.querySelectorAll(".ac-contexto select")][2];
  boton.value = "FOODS";
  boton.dispatchEvent(new Event("change", { bubbles: true }));
});
await pagina.waitForTimeout(3000);
const planFiltrado = await json("/planificacion?tiendas=CA_1&categorias=FOODS&tamano=1");
const descarga = await Promise.all([
  pagina.waitForEvent("download", { timeout: 60000 }).catch(() => null),
  pagina.locator('[data-testid="plan-descargar"]').click(),
]).then(([evento]) => evento);
comprobar(Boolean(descarga), "La descarga del plan no se inició");
if (descarga) {
  const ruta = await descarga.path();
  const texto = (await readFile(ruta, "utf8")).replace(/^\ufeff/, "");
  const lineas = texto.split(/\r?\n/);
  const cabecera = lineas.findIndex((linea) => linea.startsWith("item_id,"));
  const filas = lineas.slice(cabecera + 1).filter(Boolean);
  comprobar(cabecera > 0, "El CSV no tiene cabecera de columnas");
  comprobar(
    filas.length === planFiltrado.total,
    `El CSV tiene ${filas.length} filas y el filtro ${planFiltrado.total}`,
  );
  const columna = lineas[cabecera].split(",").indexOf("pronostico_28d");
  const totalCsv = filas.reduce((suma, linea) => suma + Number(linea.split(",")[columna]), 0);
  comprobar(
    Math.abs(totalCsv - planFiltrado.resumen.pronostico_28) < 0.5,
    `La suma del CSV (${totalCsv}) no reconcilia con el total del filtro (${planFiltrado.resumen.pronostico_28})`,
  );
  comprobar(
    filas.some((linea) => Number.isFinite(Number(linea.split(",")[columna])) && !Number.isInteger(Number(linea.split(",")[columna]))),
    "El CSV exporta enteros: no permite reconciliar con la cifra publicada",
  );
  comprobar(
    texto.includes(plan.revision ?? "rev-"),
    "El CSV no declara la revisión publicada",
  );
}

/* ========================================================================== */
/* C. Evaluación histórica: dos cortes y todos los niveles                    */
/* ========================================================================== */
console.log("C · evaluación de los dos cortes");

const NIVELES = ["total", "estado", "tienda", "categoria", "departamento"];
const ventanas = await json("/evaluacion-ventanas?etapa=final");
const cortes = ventanas.ventanas.map((ventana) => ventana.origen_d).sort((a, b) => a - b);
comprobar(cortes.length === 2, `Se esperaban dos cortes finales y hay ${cortes.length}`);
for (const corte of cortes) {
  for (const nivel of NIVELES) {
    const corteDatos = await json(`/pronosticos?nivel=${nivel}&origen=${corte}`);
    const historico = corteDatos.historico_dias.length;
    const horizonte = corteDatos.dias.length;
    const serie = corteDatos.series[0];
    comprobar(horizonte === 28, `${nivel} d_${corte}: el horizonte tiene ${horizonte} días`);
    comprobar(
      serie.observado.length === historico + horizonte,
      `${nivel} d_${corte}: observado tiene ${serie.observado.length} y se esperaban ${historico + horizonte}`,
    );
    comprobar(
      serie.observado.slice(0, historico).every((valor) => valor !== null),
      `${nivel} d_${corte}: la historia previa al corte tiene huecos`,
    );
    comprobar(
      serie.observado.slice(historico).every((valor) => valor !== null),
      `${nivel} d_${corte}: el observado posterior al corte no está publicado`,
    );
    comprobar(
      corteDatos.es_futuro === false && corteDatos.estado_evaluacion === "con_observaciones",
      `${nivel} d_${corte}: el corte se declara sin observaciones (es_futuro=${corteDatos.es_futuro})`,
    );
    const fechas = corteDatos.dias.map((dia) => dia.fecha);
    comprobar(
      fechas.every((fecha, indice) => indice === 0 || fecha > fechas[indice - 1]),
      `${nivel} d_${corte}: las fechas del horizonte no son crecientes y únicas`,
    );
    comprobar(
      fechas[0] > corteDatos.origen_fecha,
      `${nivel} d_${corte}: el horizonte no empieza después del corte`,
    );
  }
}
const porDepartamento = await json(`/pronosticos?nivel=departamento&origen=${cortes.at(-1)}`);
comprobar(
  porDepartamento.series.length === 7,
  `El nivel departamento publica ${porDepartamento.series.length} series y el informe anuncia 7`,
);

/* UI: el corte histórico dibuja historia, zona de pronóstico y observado posterior. */
/* La metodología (sesgo, protocolo, matrices) vive en un desplegable: se abre por enlace directo. */
await pagina.goto(url("ac_pantalla=evaluacion&ac_abrir=metodologia"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="selector-nivel-evaluacion"]', { timeout: 180000 });
await pagina.locator('[data-testid="selector-nivel-evaluacion"] button', { hasText: "Departamento" }).click();
await pagina.waitForTimeout(4000);
await pagina.waitForSelector('[data-testid="observado-posterior"]', { timeout: 120000 });
const contextoPronostico = await pagina.locator('[data-testid="evaluacion-corte"]').innerText();
comprobar(
  /ya ocurrieron en el histórico|observado real/i.test(contextoPronostico),
  `El bloque del corte no declara que el observado ya ocurrió: ${contextoPronostico.slice(0, 160)}`,
);
const leyenda = await pagina.locator('[data-testid="leyenda-corte"]').innerText();
comprobar(
  /Ventas observadas después del corte/.test(leyenda.replace(/\s+/g, " ")),
  `La leyenda no declara las ventas observadas después del corte: ${leyenda.replace(/\s+/g, " ")}`,
);
const lectura = await pagina.evaluate(() => {
  const rutas = [...document.querySelectorAll(".ac-df-grafico path")];
  return rutas.map((ruta) => (ruta.getAttribute("d") ?? "").split("L").length - 1);
});
comprobar(
  lectura.some((puntos) => puntos >= 80),
  `El gráfico no dibuja el histórico completo junto al corte: ${JSON.stringify(lectura)}`,
);
comprobar(
  lectura.some((puntos) => puntos >= 25 && puntos <= 29),
  `El gráfico no dibuja los 28 días del horizonte: ${JSON.stringify(lectura)}`,
);
const contextoEval = await pagina.locator('[data-testid="evaluacion-corte"]').innerText();
comprobar(
  /7 series/.test(contextoEval.replace(/\s+/g, " ")),
  `La cabecera del corte no declara las 7 series del nivel: ${contextoEval.slice(0, 120)}`,
);
comprobar(
  /Corte( seleccionado)?:? \d+ \w+ \d{4}/.test(contextoPronostico.replace(/\s+/g, " ")),
  `El corte no se presenta como fecha legible: ${contextoPronostico.slice(0, 120)}`,
);
comprobar(
  !/d_\d+/.test(contextoPronostico),
  "La cabecera del corte muestra identificadores internos en lugar de fechas",
);
await pagina.locator('[data-testid="evaluacion-corte"]').screenshot({ path: `${EV}/cor-evaluacion-corte.png` });

/* El segundo corte: mismo control, otra fecha, mismo observado posterior. */
const botonesCorte = await pagina.locator('[data-testid="selector-corte-evaluacion"] button').allInnerTexts();
comprobar(botonesCorte.length === 2, `El selector de corte ofrece ${botonesCorte.length} cortes`);
await pagina.locator('[data-testid="selector-corte-evaluacion"] button').first().click();
await pagina.waitForTimeout(4000);
comprobar(
  (await pagina.locator('[data-testid="observado-posterior"]').count()) === 1,
  "El primer corte final no dibuja el observado posterior",
);
await pagina.locator('[data-testid="evaluacion-corte"]').screenshot({ path: `${EV}/cor-evaluacion-corte-1.png` });

/* Tabla de segmentos: no queda vacía y los recuentos son del nivel activo. */
/* La interfaz pide el informe con todos los niveles, aunque la gráfica esté en departamento. */
const evaluacion = await json("/evaluacion?nivel=total&etapa=final");
const segmentosDepartamento = evaluacion.segmentos.filter((fila) => fila.nivel === "departamento");
const resumenSegmentos = (await pagina.locator('[data-testid="resumen-segmentos"]').innerText()).replace(/\s+/g, " ");
comprobar(
  (await pagina.locator('[data-testid="evaluacion-comparacion"] tbody tr').count()) > 0,
  "La tabla de segmentos está vacía",
);
comprobar(
  resumenSegmentos.includes(String(segmentosDepartamento.length)),
  `El recuento de segmentos (${resumenSegmentos.slice(0, 90)}) no coincide con los ${segmentosDepartamento.length} del nivel`,
);
const opcionesNivel = await pagina.locator('[data-testid="selector-segmento"] button').allInnerTexts();
const nivelesInforme = [...new Set(evaluacion.segmentos.map((fila) => fila.nivel))];
comprobar(
  opcionesNivel.length === 0 || opcionesNivel.length === nivelesInforme.length,
  `El selector de nivel ofrece ${opcionesNivel.length} opciones y el informe publica ${nivelesInforme.length} niveles`,
);
comprobar(
  resumenSegmentos.includes(
    String(evaluacion.segmentos.filter((fila) => fila.nivel === "departamento").length),
  ),
  "El recuento del nivel activo no coincide con los segmentos publicados de ese nivel",
);
await pagina.locator('[data-testid="evaluacion-comparacion"]').screenshot({ path: `${EV}/cor-evaluacion-segmentos.png` });

/* ========================================================================== */
/* D. Etiquetas, afirmaciones y estados                                       */
/* ========================================================================== */
console.log("D · etiquetas, afirmaciones y estados");

/* La ayuda del sesgo es un bloque desplegable: se abre para comprobar su contenido completo. */
await pagina.locator('[data-testid="sesgo-convencion"] summary').click();
await pagina.waitForTimeout(400);
const sesgo = (await pagina.locator('[data-testid="sesgo-convencion"]').innerText()).replace(/\s+/g, " ");
comprobar(/pronóstico − observado|pronóstico - observado/.test(sesgo), "La convención del sesgo no declara el signo");
comprobar(/\+2/.test(sesgo) && /−2|-2/.test(sesgo), "La convención del sesgo no da los dos ejemplos verificables");
comprobar(/media/.test(sesgo) && /unidades/.test(sesgo), "La convención del sesgo no declara media ni unidad");
comprobar(/sobreestima/.test(sesgo) && /subestima/.test(sesgo), "La convención del sesgo no nombra sobreestimación y subestimación");

/* Modelado: ejecución publicada, variables reales y protocolo declarado. */
const modelos = await json("/modelos");
const publicada = modelos.ejecuciones.find((fila) => fila.recomendado);
comprobar(Boolean(publicada), "No hay ejecución publicada en el manifiesto");
comprobar(
  (publicada.variables ?? []).length === 50,
  `La ejecución publicada declara ${(publicada.variables ?? []).length} variables`,
);
comprobar(
  !(publicada.variables ?? []).some((variable) => String(variable).startsWith("precio")),
  "La ejecución publicada declara variables de precio",
);
comprobar(
  /no usa precios/i.test(publicada.supuestos?.precio_futuro ?? ""),
  `El manifiesto publicado todavía congela precios: ${publicada.supuestos?.precio_futuro}`,
);
const conPrecios = modelos.ejecuciones.find((fila) => (fila.variables ?? []).some((v) => String(v).startsWith("precio")));
comprobar(
  /precio/i.test(conPrecios?.supuestos?.precio_futuro ?? ""),
  "La variante con precios no declara su política de precios",
);

await pagina.goto(url("ac_pantalla=modelado"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="modelado-tecnico"]', { timeout: 180000 });
await pagina.locator('[data-testid="modelado-tecnico"] summary').first().click();
await pagina.waitForSelector('[data-testid="modelado-protocolo"]', { state: "visible", timeout: 60000 });
await pagina.waitForFunction(
  () => {
    const texto = document.querySelector('[data-testid="modelado-protocolo"]')?.textContent ?? "";
    return /d_\d{4}/.test(texto) && !/Cargando los cortes finales/.test(texto);
  },
  undefined,
  { timeout: 120000 },
);
await pagina.waitForTimeout(600);
const protocolo = (await pagina.locator('[data-testid="modelado-protocolo"]').innerText()).replace(/\s+/g, " ");
comprobar(/d_1857/.test(protocolo), "El protocolo no declara el fin del entrenamiento");
comprobar(/no son un holdout intacto/.test(protocolo), "El protocolo no advierte que los cortes finales no son holdout");
comprobar(/d_1773/.test(protocolo) && /d_1857/.test(protocolo), "El protocolo no declara los cortes de comparación de variantes");
comprobar(/WAPE de desarrollo/.test(protocolo), "El protocolo no declara el criterio de selección");
comprobar(/0 cortes de desarrollo|no tiene cortes de desarrollo/.test(protocolo), "El protocolo no explica el «0 cortes de desarrollo»");
comprobar(/d_1885/.test(protocolo) && /d_1913/.test(protocolo), `El protocolo no nombra los dos cortes finales: ${protocolo.slice(0, 400)}`);
await pagina.locator('[data-testid="modelado-protocolo"]').screenshot({ path: `${EV}/cor-modelado-protocolo.png` });

/* Datos y calidad: nombres legibles, tienda del bloque declarada y estados calculando. */
await pagina.goto(url("ac_pantalla=datos"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="datos-tienda-precios"]', { timeout: 180000 });
await pagina.waitForTimeout(4000);
const etiquetasDatos = await pagina.evaluate(() =>
  [...document.querySelectorAll(".ac-contexto select option")].map((opcion) => opcion.textContent ?? ""),
);
comprobar(
  etiquetasDatos.some((texto) => /California · Tienda 1/.test(texto)),
  `El selector de tienda no usa nombres comerciales: ${etiquetasDatos.join(" | ").slice(0, 160)}`,
);
comprobar(
  !etiquetasDatos.some((texto) => /^CA_\d$/.test(texto.trim())),
  `El selector de tienda sigue mostrando códigos sueltos: ${etiquetasDatos.join(" | ").slice(0, 160)}`,
);
const bloquePrecios = (await pagina.locator('[data-testid="datos-tienda-precios"]').innerText()).replace(/\s+/g, " ");
comprobar(/CA_\d/.test(bloquePrecios), `El bloque de precios no declara la tienda analizada: ${bloquePrecios}`);
const textoDatos = await pagina.locator(".ac-bloques").innerText();
comprobar(
  !/—/.test(textoDatos),
  "Quedan valores «—» en Datos y calidad: no se distingue pendiente de ausente",
);
await pagina.locator('[data-testid="datos-precios"]').screenshot({ path: `${EV}/cor-datos-precios.png` });

/* Concentración: artículo con categoría y departamento, código completo disponible. */
await pagina.goto(url("ac_pantalla=exploracion"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".ac-conc-acciones button", { timeout: 180000 });
await pagina.waitForTimeout(2000);
await pagina.locator(".ac-conc-acciones button").first().click();
await pagina.waitForSelector(".ac-conc-articulo", { timeout: 120000 });
await pagina.waitForTimeout(1500);
const primeraFila = await pagina.evaluate(() => {
  const celda = document.querySelector(".ac-conc-articulo");
  const fila = celda?.closest("tr");
  return {
    articulo: celda?.innerText ?? "",
    fila: fila?.innerText.replace(/\s+/g, " ") ?? "",
    codigo: celda?.querySelector(".ac-plan-codigo")?.textContent ?? "",
  };
});
comprobar(/Artículo \d+/.test(primeraFila.articulo), `La concentración no usa «Artículo N»: ${primeraFila.articulo}`);
comprobar(
  /(Alimentos|Aficiones|Hogar)/.test(primeraFila.fila),
  `La fila del artículo no declara su categoría: ${primeraFila.fila.slice(0, 100)}`,
);
comprobar(
  /Departamento \d/.test(primeraFila.fila) || /Alimentos|Aficiones|Hogar/.test(primeraFila.fila.split("Artículo").at(-1)),
  `La fila del artículo no declara su departamento: ${primeraFila.fila.slice(0, 100)}`,
);
comprobar(/FOODS_|HOBBIES_|HOUSEHOLD_/.test(primeraFila.codigo), "El identificador completo del artículo no está disponible");
await pagina.screenshot({ path: `${EV}/cor-concentracion.png`, fullPage: false });

/* ========================================================================== */
/* Cierre                                                                     */
/* ========================================================================== */
comprobar(errores.length === 0, `Errores de la página: ${errores.slice(0, 3).join(" | ")}`);
await pagina.close();
await navegador.close();

if (fallos.length) {
  console.log(`\n✗ ${fallos.length} fallo(s):`);
  for (const fallo of fallos) console.log(`  · ${fallo}`);
  process.exit(1);
}
console.log("\n✓ Precisión, contexto, evaluación y etiquetas coherentes en la aplicación servida");
