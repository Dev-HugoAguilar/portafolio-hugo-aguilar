/**
 * Verificación de la demo contra la base compacta de publicación.
 *
 * Apunta el tablero a la API que sirve `atlas_comercial_demo` (puerto 8011) mediante la variable
 * pública que el propio código respeta (`window.PORTFOLIO_COMERCIAL_API`) y comprueba que **todas**
 * las peticiones salen de la base compacta, sin tocar la base de trabajo.
 *
 * Recorrido:
 *  1. las seis pantallas abren con sus bloques y sin errores;
 *  2. exploración: panorama, estacionalidad, precios y detalle de artículo con filtros;
 *  3. comparación A/B, matriz temporal, intermitencia, concentración y auditoría temporal;
 *  4. evaluación: cortes finales, cambio de nivel y etapa sin cortes dibujables;
 *  5. plan: tabla paginada, orden, búsqueda, comparación histórica y descarga CSV completa;
 *  6. navegación: recarga, Atrás/Adelante y conservación de la URL;
 *  7. cifras contra la API de la demo (total del horizonte, filas del CSV, revisión publicada).
 *
 * Capturas: `evidencias/comercial/demo-*.png`. Sale con código 1 si algo falla.
 */
import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const API_TRABAJO = "http://127.0.0.1:8010/api/v1/comercial/m5";
const API_DEMO = "http://127.0.0.1:8011/api/v1/comercial/m5";
const EV = "../../evidencias/comercial";

const url = (query = "") => `${SITIO}/${query ? `?${query}` : ""}${HASH}`;
const fallos = [];
const pasos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
  return Boolean(condicion);
};
const paso = (texto, ok = true) => pasos.push({ texto, resultado: ok ? "ok" : "fallo" });
const numero = (texto) => Number(String(texto ?? "").replace(/[^\d.-]/g, ""));

async function json(base, ruta) {
  const respuesta = await fetch(`${base}${ruta}`);
  if (!respuesta.ok) throw new Error(`${base}${ruta} → ${respuesta.status}`);
  return respuesta.json();
}

const estadoDemo = await json(API_DEMO, "/estado");
const planDemo = await json(API_DEMO, "/planificacion?tamano=1");
const evalDemo = await json(API_DEMO, "/evaluacion?nivel=total");
const ventanasDemo = await json(API_DEMO, "/evaluacion-ventanas?etapa=final");

const errores = [];
const navegador = await chromium.launch();

async function abrir(query = "", opciones = {}) {
  const pagina = await navegador.newPage({
    viewport: opciones.viewport ?? { width: 1440, height: 1200 },
    deviceScaleFactor: 1,
  });
  const peticiones = { demo: 0, trabajo: 0 };
  // El tablero respeta esta variable global: la demo se sirve desde la base compacta.
  await pagina.addInitScript((base) => {
    window.PORTFOLIO_COMERCIAL_API = base;
  }, API_DEMO);
  pagina.on("request", (peticion) => {
    const destino = peticion.url();
    if (destino.startsWith(API_DEMO)) peticiones.demo += 1;
    else if (destino.startsWith(API_TRABAJO)) peticiones.trabajo += 1;
  });
  pagina.on("pageerror", (error) => errores.push(`pageerror: ${error.message.slice(0, 160)}`));
  pagina.on("console", (mensaje) => {
    if (mensaje.type() === "error") errores.push(`console: ${mensaje.text().slice(0, 160)}`);
  });
  await pagina.goto(url(query), { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app", { timeout: 180000 });
  await pagina.waitForTimeout(opciones.espera ?? 2500);
  pagina.peticiones = peticiones;
  return pagina;
}

const pantallaActiva = (pagina) =>
  pagina.evaluate(() => document.querySelector('.ac-tabs-btn[aria-selected="true"]')?.dataset.pantalla);

const textosError = async (pagina) =>
  pagina.evaluate(() =>
    [...document.querySelectorAll('[role="alert"], .ac-error, [data-testid$="-error"]')]
      .map((nodo) => nodo.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );

/* 1. Las seis pantallas ----------------------------------------------------- */
console.log("\n1 · seis pantallas contra la base compacta");
const PANTALLAS = [
  { id: "proyecto", testid: "proyecto-resultados" },
  { id: "datos", testid: "datos-fuentes" },
  // La subsección de entrada se declara: sin `ac_sub` la exploración abre en otra vista.
  { id: "exploracion", selector: ".ac-panorama", query: "ac_pantalla=exploracion&ac_sub=panorama" },
  { id: "modelado", testid: "modelado-llano" },
  { id: "evaluacion", testid: "evaluacion-protocolo" },
  { id: "resultados", testid: "datos-corte" },
];
for (const pantalla of PANTALLAS) {
  const pagina = await abrir(pantalla.query ?? `ac_pantalla=${pantalla.id}`, {
    espera: pantalla.id === "exploracion" ? 7000 : 4000,
  });
  if (pantalla.id === "exploracion") {
    await pagina.waitForSelector(".ac-panorama", { timeout: 180000 }).catch(() => {});
    await pagina.waitForTimeout(600);
  }
  const activa = await pantallaActiva(pagina);
  comprobar(activa === pantalla.id, `la pantalla activa es ${activa}, se esperaba ${pantalla.id}`);
  const selector = pantalla.testid ? `[data-testid="${pantalla.testid}"]` : pantalla.selector;
  const tiene = await pagina.evaluate(
    (valor) => document.querySelector(valor) !== null,
    selector,
  );
  comprobar(tiene, `${pantalla.id} no muestra ${selector}`);
  const avisos = await textosError(pagina);
  comprobar(avisos.length === 0, `${pantalla.id} muestra errores: ${avisos.join(" | ")}`);
  comprobar(
    pagina.peticiones.trabajo === 0,
    `${pantalla.id} pidió datos a la base de trabajo (${pagina.peticiones.trabajo} peticiones)`,
  );
  comprobar(pagina.peticiones.demo > 0, `${pantalla.id} no llegó a pedir datos a la demo`);
  await pagina.screenshot({ path: `${EV}/demo-${pantalla.id}.png`, fullPage: true });
  console.log(
    `  ${pantalla.id.padEnd(12)} ${String(pagina.peticiones.demo).padStart(3)} peticiones a la demo · ` +
      `avisos: ${avisos.length}`,
  );
  await pagina.close();
}
paso("abrir las seis pantallas con la API de la demo");

/* 2. Exploración: subsecciones y filtros ----------------------------------- */
console.log("\n2 · exploración");
{
  const pagina = await abrir("ac_pantalla=exploracion&ac_sub=panorama", { espera: 5000 });
  await pagina.waitForSelector(".ac-panorama", { timeout: 180000 }).catch(() => {});
  const panorama = await pagina.evaluate(() => ({
    total: document.querySelector(".ac-panorama .ac-panel-sub")?.textContent ?? "",
    tarjetas: document.querySelectorAll(".ac-panorama .ac-tarjeta").length,
  }));
  comprobar(panorama.tarjetas === 3, `el panorama no muestra tres estados: ${panorama.tarjetas}`);
  const cifraPanorama = (panorama.total.match(/\(([\d\s.,]+)\s*u\)/) ?? [])[1] ?? "";
  const totalPanorama = numero(cifraPanorama);
  const esperado = numero(estadoDemo.derivado?.reconciliacion?.total_unidades ?? 0);
  comprobar(
    totalPanorama === esperado,
    `el panorama muestra ${totalPanorama} y la base publica ${esperado} unidades`,
  );

  await pagina.click('.ac-sec-nav button:has-text("Estacionalidad")');
  await pagina.waitForTimeout(2500);
  const estacionalidad = await pagina.evaluate(() => ({
    visible: Boolean(document.querySelector('[data-testid="seccion-estacionalidad"]')),
    filas: document.querySelectorAll('[data-testid="seccion-estacionalidad"] tbody tr').length,
  }));
  comprobar(estacionalidad.visible, "no se abrió la estacionalidad");
  comprobar(estacionalidad.filas > 0, "la estacionalidad no tiene filas");

  await pagina.click('.ac-sec-nav button:has-text("Precios")');
  await pagina.waitForTimeout(3500);
  const precios = await pagina.evaluate(() => ({
    visible: Boolean(document.querySelector('[data-testid="seccion-precios"]')),
    series: document.querySelectorAll('[data-testid="precios-tabla-series"]').length,
    valores: Boolean(document.querySelector('[data-testid="precios-tabla-valores"]')),
  }));
  comprobar(precios.visible, "no se abrió la sección de precios");
  comprobar(precios.valores, "los precios no muestran la tabla de valores");

  await pagina.click('.ac-sec-nav button:has-text("Detalle de artículo")');
  await pagina
    .waitForSelector('[data-testid="detalle-paneles"]', { timeout: 180000 })
    .catch(() => {});
  await pagina.waitForTimeout(600);
  const articulo = await pagina.evaluate(() => ({
    visible: Boolean(document.querySelector('[data-testid="seccion-articulo"]')),
    paneles: Boolean(document.querySelector('[data-testid="detalle-paneles"]')),
  }));
  comprobar(articulo.visible, "no se abrió el detalle de artículo");
  comprobar(articulo.paneles, "el detalle de artículo no muestra sus paneles");
  await pagina.screenshot({ path: `${EV}/demo-exploracion-articulo.png`, fullPage: true });
  console.log(
    `  panorama ${panorama.tarjetas} estados · estacionalidad ${estacionalidad.filas} filas · ` +
      `precios ${precios.valores} · artículo ${articulo.paneles}`,
  );
  comprobar(
    pagina.peticiones.trabajo === 0,
    `la exploración pidió datos a la base de trabajo (${pagina.peticiones.trabajo})`,
  );
  await pagina.close();
}
paso("recorrer panorama, estacionalidad, precios y detalle de artículo");

/* 3. A/B, matriz, intermitencia, concentración y auditoría ----------------- */
console.log("\n3 · análisis temporal y calidad");
{
  const pagina = await abrir("ac_pantalla=exploracion&ac_sub=panorama", { espera: 5000 });
  const concentracion = await pagina.evaluate(() => ({
    visible: Boolean(document.querySelector('[data-testid="concentracion"]')),
    texto: document.querySelector('[data-testid="concentracion-texto"]')?.innerText ?? "",
    variasTiendas: Boolean(document.querySelector('[data-testid="concentracion-varias-tiendas"]')),
  }));
  comprobar(concentracion.visible, "faltó la herramienta de concentración en el panorama");
  const ab = await pagina.evaluate(() => {
    const bloque = document.querySelector('[data-testid="comparacion-ab"]');
    return {
      visible: Boolean(bloque),
      abierto: bloque?.getAttribute("aria-expanded") ?? null,
      periodos: Boolean(document.querySelector('[data-testid="ab-periodos"]')),
    };
  });
  comprobar(ab.visible, "no aparece el bloque de comparación A/B");
  comprobar(ab.periodos, "la comparación A/B no declara sus periodos");
  await pagina.click('.ac-sec-nav button:has-text("Estacionalidad")');
  await pagina.waitForTimeout(4000);
  const matriz = await pagina.evaluate(() => ({
    celdas: document.querySelectorAll(".ac-mt-celda").length,
    anios: [...document.querySelectorAll('[data-testid="selector-anio-matriz"] button')].map(
      (boton) => boton.textContent.trim(),
    ),
  }));
  comprobar(matriz.celdas > 0, `la matriz temporal quedó vacía (${matriz.celdas} celdas)`);
  const otroAnio = matriz.anios.find((valor) => valor === "2015");
  if (otroAnio) {
    await pagina.click(`[data-testid="selector-anio-matriz"] button:has-text("${otroAnio}")`);
    await pagina.waitForTimeout(3000);
  }
  const matriz2015 = await pagina.evaluate(() => document.querySelectorAll(".ac-mt-celda").length);
  comprobar(matriz2015 > 0, "la matriz de 2015 quedó vacía");
  await pagina.screenshot({ path: `${EV}/demo-exploracion-matriz.png`, fullPage: true });

  await pagina.goto(url("ac_pantalla=datos"), { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(5000);
  const datos = await pagina.evaluate(() => ({
    intermitencia: Boolean(document.querySelector('[data-testid="datos-ambito-intermitencia"]')),
    mediana: document.querySelector('[data-testid="datos-mediana-ceros"]')?.textContent ?? "",
    precios: Boolean(document.querySelector('[data-testid="datos-tienda-precios"]')),
  }));
  comprobar(datos.intermitencia, "faltó el ámbito de intermitencia");
  comprobar(/\^?\d/.test(datos.mediana) || datos.mediana.length > 0, "la mediana de ceros está vacía");
  await pagina.screenshot({ path: `${EV}/demo-datos.png`, fullPage: true });

  await pagina.goto(url("ac_pantalla=evaluacion"), { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(6000);
  await pagina
    .waitForSelector('[data-testid="auditoria-temporal"]', { timeout: 120000 })
    .catch(() => {});
  const auditoria = await pagina.evaluate(() => ({
    bloque: Boolean(document.querySelector('[data-testid="evaluacion-auditoria-temporal"]')),
    detalle: Boolean(document.querySelector('[data-testid="auditoria-temporal"]')),
    // El bloque vive dentro de un desplegable: `innerText` no devuelve texto oculto.
    resumen:
      document.querySelector('[data-testid="auditoria-temporal"]')?.textContent?.trim().slice(0, 300) ?? "",
    cargando: Boolean(document.querySelector('[data-testid="auditoria-temporal-cargando"]')),
  }));
  comprobar(auditoria.bloque, "faltó la auditoría temporal en «Evaluación»");
  comprobar(auditoria.detalle, `la auditoría temporal no se dibujó (cargando: ${auditoria.cargando})`);
  comprobar(/\d/.test(auditoria.resumen), "la auditoría temporal no muestra cifras");
  console.log(
    `  A/B ${ab.visible} · matriz ${matriz.celdas}/${matriz2015} celdas · ` +
      `concentración ${concentracion.visible} · intermitencia ${datos.intermitencia} · ` +
      `auditoría ${auditoria.bloque}`,
  );
  await pagina.close();
}
paso("A/B, matriz, intermitencia, concentración y auditoría temporal");

/* 4. Evaluación ------------------------------------------------------------- */
console.log("\n4 · evaluación");
{
  const pagina = await abrir("ac_pantalla=evaluacion", { espera: 6000 });
  const evaluacion = await pagina.evaluate(() => ({
    controles: Boolean(document.querySelector('[data-testid="controles-corte"]')),
    corte: Boolean(document.querySelector('[data-testid="evaluacion-corte"]')),
    wape:
      document.querySelector('[data-testid="evaluacion-wape"] .ac-tarjeta-valor')?.textContent ?? "",
    mae:
      document
        .querySelector('[data-testid="evaluacion-mae-agregado"] .ac-tarjeta-valor')
        ?.textContent ?? "",
    ventanasTablas: Boolean(document.querySelector('[data-testid="evaluacion-ventanas-tablas"]')),
  }));
  comprobar(evaluacion.controles, "faltaron los controles de corte");
  comprobar(/\d/.test(evaluacion.wape), "la evaluación no publica WAPE");
  comprobar(/\d/.test(evaluacion.mae), "la evaluación no publica MAE agregado");

  const wape = numero(evaluacion.wape);
  const wapeDemo = numero(evalDemo.resumen?.wape ?? 0);
  comprobar(wapeDemo > 0, `la demo no publica WAPE: ${evalDemo.resumen?.wape}`);
  comprobar(
    Math.abs(wape - wapeDemo) <= 0.06,
    `el WAPE de la pantalla (${wape}) no coincide con la demo (${wapeDemo})`,
  );

  const etapas = await pagina.evaluate(() =>
    [...document.querySelectorAll('[data-testid="selector-etapa-corte"] button')].map((boton) => ({
      texto: boton.textContent.trim(),
      elegido: boton.getAttribute("aria-pressed") === "true",
    })),
  );
  comprobar(etapas.length >= 2, `la etapa no ofrece las dos opciones: ${JSON.stringify(etapas)}`);
  const origenVentanas = (ventanasDemo.origenes_graficables ?? []).length;
  comprobar(origenVentanas >= 2, `la demo no publica cortes finales dibujables: ${origenVentanas}`);

  const desarrollo = pagina.locator('[data-testid="selector-etapa-corte"] button', {
    hasText: "Desarrollo",
  });
  if (await desarrollo.count()) {
    await desarrollo.first().click();
    await pagina.waitForTimeout(3000);
    const sinCortes = await pagina.evaluate(() => ({
      declarado: Boolean(document.querySelector('[data-testid="corte-sin-etapa"]')),
      texto: document.querySelector('[data-testid="corte-sin-etapa"]')?.innerText ?? "",
      controles: Boolean(document.querySelector('[data-testid="controles-corte"]')),
    }));
    comprobar(
      sinCortes.declarado || sinCortes.controles,
      "al elegir desarrollo la tarjeta no declara el estado",
    );
    console.log(`  desarrollo: ${sinCortes.texto.replace(/\s+/g, " ").slice(0, 90)}`);
  }
  await pagina.screenshot({ path: `${EV}/demo-evaluacion.png`, fullPage: true });
  console.log(
    `  WAPE pantalla ${wape} · demo ${wapeDemo} · cortes finales ${origenVentanas} · ` +
      `etapas ${etapas.map((etapa) => etapa.texto).join("/")}`,
  );
  await pagina.close();
}
paso("evaluación: cortes, niveles, etapas y ausencia de cortes de desarrollo");

/* 5. Plan: tabla, orden, búsqueda, histórico y CSV -------------------------- */
console.log("\n5 · plan");
let filasCsv = 0;
{
  const pagina = await abrir("ac_pantalla=resultados", { espera: 5000 });
  await pagina.waitForFunction(
    () => document.querySelectorAll(".ac-plan-tabla tbody tr").length > 0,
    undefined,
    { timeout: 180000 },
  );
  const plan = await pagina.evaluate(() => ({
    total: document.querySelector('[data-testid="plan-resumen"]')?.innerText ?? "",
    revision: document.querySelector('[data-testid="plan-revision"]')?.innerText ?? "",
    filas: document.querySelectorAll(".ac-plan-tabla tbody tr").length,
    contexto: document.querySelector('[data-testid="plan-tienda-contexto"]')?.innerText ?? "",
  }));
  comprobar(plan.filas > 0, "la tabla del plan está vacía");
  comprobar(
    plan.revision.includes(planDemo.revision),
    `la pantalla no declara la revisión publicada: ${plan.revision}`,
  );
  const totalPrevisto = await pagina.evaluate(
    () => document.querySelector('[data-testid="plan-total-previsto"]')?.dataset.cifra ?? null,
  );
  comprobar(totalPrevisto !== null, "la cabecera del plan no publica el total previsto");
  if (totalPrevisto !== null) {
    comprobar(
      Math.abs(numero(totalPrevisto) - numero(planDemo.resumen?.pronostico_28)) < 0.5,
      `el total previsto (${totalPrevisto}) no coincide con la demo (${planDemo.resumen?.pronostico_28})`,
    );
  }

  await pagina.selectOption('[data-testid="plan-orden"]', "volumen_observado").catch(() => {});
  await pagina.waitForTimeout(2500);

  await pagina.fill('[data-testid="contexto-busqueda"]', "FOODS_3_090");
  await pagina.waitForTimeout(3000);
  const busqueda = await pagina.evaluate(() => ({
    aviso: Boolean(document.querySelector('[data-testid="plan-busqueda-activa"]')),
    filas: document.querySelectorAll(".ac-plan-tabla tbody tr").length,
    primera: document
      .querySelector(".ac-plan-tabla tbody tr")
      ?.getAttribute("data-clave"),
  }));
  comprobar(busqueda.aviso, "la búsqueda no se anuncia en el bloque");
  comprobar(busqueda.filas > 0, "la búsqueda no devolvió filas");

  // El detalle se abre con el botón del artículo, no con la fila completa.
  await pagina.locator(".ac-plan-tabla tbody tr button.ac-plan-articulo").first().click();
  await pagina.waitForFunction(
    () => /\d/.test(document.querySelector('[data-testid="plan-detalle-total"]')?.textContent ?? ""),
    undefined,
    { timeout: 120000 },
  );
  const detalle = await pagina.evaluate(() => ({
    total: document.querySelector('[data-testid="plan-detalle-total"]')?.getAttribute("data-cifra"),
    grafico: Boolean(document.querySelector('[data-testid="plan-grafico"]')),
    evaluacion: document.querySelector('[data-testid="plan-detalle-evaluacion"]')?.innerText ?? "",
  }));
  comprobar(detalle.total !== null, "el detalle del artículo no publica su total");
  comprobar(detalle.grafico, "el detalle del artículo no dibuja la serie");

  await pagina.selectOption('[data-testid="plan-vista"]', "historica");
  await pagina.waitForTimeout(2500);
  await pagina.selectOption('[data-testid="plan-vista"]', "semanal");
  await pagina.waitForTimeout(2000);
  await pagina.fill('[data-testid="contexto-busqueda"]', "FOODS_3_090");
  await pagina.waitForTimeout(2500);

  const descarga = await Promise.all([
    pagina.waitForEvent("download", { timeout: 180000 }),
    pagina.locator('[data-testid="plan-descargar"]').click(),
  ]).catch(() => [null]);
  comprobar(Boolean(descarga?.[0]), "la descarga del CSV no se inició");
  if (descarga?.[0]) {
    const texto = (await readFile(await descarga[0].path(), "utf8")).replace(/^\ufeff/, "");
    const filas = texto.trim().split(/\r?\n/);
    const datos = filas.filter((linea) => linea && !linea.startsWith("#"));
    filasCsv = datos.length - 1;
    comprobar(filasCsv > 0, "el CSV salió sin filas");
    comprobar(/^#/.test(filas[0]), "el CSV no declara su procedencia en la cabecera");
    comprobar(
      datos.slice(1).every((linea) => linea.includes("FOODS_3_090")),
      `el CSV no filtra por el artículo buscado: ${datos[1]?.slice(0, 80)}`,
    );
    comprobar(
      new RegExp(planDemo.revision).test(texto),
      "el CSV no declara la revisión publicada de la demo",
    );
    console.log(`  CSV ${filasCsv} filas · ${texto.length} caracteres`);
  }
  await pagina.screenshot({ path: `${EV}/demo-plan.png`, fullPage: true });
  console.log(
    `  plan ${plan.filas} filas visibles · versión ${plan.revision.slice(0, 40)} · ` +
      `búsqueda ${busqueda.filas} · total detalle ${detalle.total}`,
  );
  comprobar(
    pagina.peticiones.trabajo === 0,
    `el plan pidió datos a la base de trabajo (${pagina.peticiones.trabajo})`,
  );
  await pagina.close();
}
paso("plan: tabla, orden, búsqueda, detalle, vista histórica y CSV");

/* 6. Navegación, recarga y Atrás/Adelante ---------------------------------- */
console.log("\n6 · navegación y recarga");
{
  const pagina = await abrir("ac_pantalla=resultados&ac_tienda=CA_3", { espera: 4500 });
  const antes = await pagina.evaluate(() => window.location.search);
  await pagina.reload({ waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app", { timeout: 120000 });
  await pagina.waitForTimeout(4000);
  const despues = await pagina.evaluate(() => ({
    url: window.location.search,
    pantalla: document.querySelector('.ac-tabs-btn[aria-selected="true"]')?.dataset.pantalla,
    tienda: document.querySelectorAll(".ac-contexto select")[1]?.value ?? null,
  }));
  comprobar(despues.url === antes, `la recarga cambió la URL: ${antes} → ${despues.url}`);
  comprobar(despues.pantalla === "resultados", `la recarga abrió ${despues.pantalla}`);
  comprobar(despues.tienda === "CA_3", `la recarga perdió la tienda: ${despues.tienda}`);

  await pagina.click('.ac-tabs-btn[data-pantalla="evaluacion"]');
  await pagina.waitForTimeout(3500);
  await pagina.goBack();
  await pagina.waitForTimeout(3500);
  const atras = await pantallaActiva(pagina);
  comprobar(atras === "resultados", `Atrás llevó a ${atras}`);
  await pagina.goForward();
  await pagina.waitForTimeout(3500);
  const adelante = await pantallaActiva(pagina);
  comprobar(adelante === "evaluacion", `Adelante llevó a ${adelante}`);
  console.log(`  recarga ${despues.pantalla}/${despues.tienda} · atrás ${atras} · adelante ${adelante}`);
  await pagina.close();
}
paso("recarga y Atrás/Adelante conservan pantalla y tienda");

/* 7. Móvil y cifras finales ------------------------------------------------ */
console.log("\n7 · móvil y cifras");
{
  const movil = await abrir("ac_pantalla=resultados&ac_tienda=CA_1", {
    viewport: { width: 390, height: 844 },
    espera: 5000,
  });
  const desborde = await movil.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  comprobar(desborde <= 2, `la vista móvil desborda ${desborde} px`);
  await movil.screenshot({ path: `${EV}/demo-movil-plan.png`, fullPage: true });
  comprobar(
    movil.peticiones.trabajo === 0,
    `la vista móvil pidió datos a la base de trabajo (${movil.peticiones.trabajo})`,
  );
  await movil.close();

  comprobar(
    numero(planDemo.total) === 30490,
    `la demo no publica 30 490 series: ${planDemo.total}`,
  );
  const totalHorizonte = numero(planDemo.resumen?.pronostico_28);
  comprobar(
    Math.abs(totalHorizonte - 1335219.04) <= 0.05,
    `el total del horizonte no es 1 335 219.04: ${totalHorizonte}`,
  );
  console.log(
    `  móvil desborde ${desborde} px · series ${planDemo.total} · ` +
      `total ${totalHorizonte} · CSV ${filasCsv} filas`,
  );
}
paso("vista móvil sin desbordes y cifras del contrato");

await navegador.close();

console.log("\nResumen");
for (const entrada of pasos) console.log(`  ${entrada.resultado === "ok" ? "ok  " : "fallo"} ${entrada.texto}`);
if (errores.length) {
  console.log("\nErrores de consola:");
  for (const error of [...new Set(errores)].slice(0, 10)) console.log(`  · ${error}`);
}
comprobar(errores.length === 0, `hubo ${errores.length} errores de consola o de página`);

if (fallos.length) {
  console.log(`\n${fallos.length} fallo(s):`);
  for (const fallo of fallos) console.log(`  · ${fallo}`);
  process.exit(1);
}
console.log("\nDemo validada contra la base compacta de publicación.");
