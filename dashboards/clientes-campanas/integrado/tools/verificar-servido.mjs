/**
 * Verificación sobre el sitio servido del tablero integrado «Clientes y campañas».
 *
 * Comprueba, con el portafolio real en 127.0.0.1:8000:
 *
 *  1. la tarjeta de Ciencia de datos abre el tablero sustituido (mismo id y ruta)
 *     y su imagen es la captura nueva;
 *  2. las seis pestañas cargan y cada uno de los 41 destinos del inventario
 *     auditado existe en la vista que le corresponde;
 *  3. filtros, selección vinculada, cambio de corte y de resultado, ampliación y
 *     descargas responden;
 *  4. no hay errores de JavaScript ni valores NaN;
 *  5. se lee a 1440 px y a 390 px sin desbordamiento de la página; el teclado
 *     llega a los controles y el foco es visible.
 *
 * Uso: node integrado/tools/verificar-servido.mjs
 * Sale con código 1 si algo falla.
 */
import { mkdirSync } from "node:fs";

import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const AREA = "/#/area/ciencia-de-datos";
const FICHA = "/#/area/ciencia-de-datos/clientes-campanas";
const PAGINA = "/dashboards/clientes-campanas/index.html";
const CAPTURAS = "../../evidencias/clientes-campanas/integrado";
const VISTAS = ["proyecto", "perfiles", "evolucion", "campanas", "incrementalidad", "experimento"];

const fallos = [];
const avisos = [];
const correctas = [];
const ok = (mensaje) => correctas.push(mensaje);
const fallo = (mensaje) => fallos.push(mensaje);
const aviso = (mensaje) => avisos.push(mensaje);

mkdirSync(CAPTURAS, { recursive: true });

/** Texto normalizado de un nodo del marco embebido. */
async function texto(marco, selector) {
  return (await marco.locator(selector).first().textContent())?.replace(/\s+/g, " ").trim() ?? "";
}

/** Identificadores presentes en el documento embebido. */
async function idsDelMarco(pagina) {
  return pagina.evaluate(() => {
    const marco = document.querySelector("#demo-host iframe");
    const doc = marco && marco.contentDocument;
    return doc ? [...doc.querySelectorAll("[id]")].map((nodo) => nodo.id) : [];
  });
}

/** Abre la ficha del proyecto y devuelve el localizador del marco. */
async function abrirFicha(pagina) {
  await pagina.goto(`${SITIO}${FICHA}`, { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector("#demo-host iframe", { timeout: 60000 });
  const marco = pagina.frameLocator("#demo-host iframe");
  await marco.locator("#tabs button").first().waitFor({ timeout: 60000 });
  return marco;
}

/** Activa una vista del tablero embebido. */
async function irAVista(pagina, marco, vista) {
  await marco.locator(`#tabs button:nth-child(${VISTAS.indexOf(vista) + 1})`).click();
  await marco.locator("#content .card").first().waitFor();
  await pagina.waitForTimeout(150);
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const errores = [];
pagina.on("pageerror", (error) => errores.push(`pageerror: ${error.message}`));
pagina.on("console", (mensaje) => {
  if (mensaje.type() === "error") errores.push(`console: ${mensaje.text()}`);
});

/* ------------------------------------------------- 1. tarjeta y montaje */
await pagina.goto(`${SITIO}${AREA}`, { waitUntil: "domcontentloaded" });
const tarjeta = pagina.locator('.project-card[data-proyecto="clientes-campanas"]');
await tarjeta.waitFor({ timeout: 30000 });
await pagina.waitForTimeout(1200);

/* Geometría de las portadas: la de Walmart M5 es la referencia y las otras dos
   deben ocupar un contenedor de las mismas dimensiones y proporción. */
const portadas = await pagina.evaluate(() => {
  return [...document.querySelectorAll(".project-list .project-card")].map((li) => {
    const cover = li.querySelector(".cover");
    const img = cover.querySelector("img");
    const caja = cover.getBoundingClientRect();
    const meta = li.querySelector(".card-meta").getBoundingClientRect();
    const titulo = li.querySelector("h3").getBoundingClientRect();
    return {
      id: li.dataset.proyecto,
      anchoTarjeta: Math.round(li.getBoundingClientRect().width),
      ancho: Math.round(caja.width),
      alto: Math.round(caja.height),
      ratio: Number((caja.width / caja.height).toFixed(4)),
      top: Math.round(caja.top),
      yEtiqueta: Math.round(meta.top),
      yTitulo: Math.round(titulo.top),
      src: img ? img.getAttribute("src") : null,
      natural: img ? [img.naturalWidth, img.naturalHeight] : null,
      ajuste: img ? getComputedStyle(img).objectFit : null,
      posicion: img ? getComputedStyle(img).objectPosition : null,
      clases: cover.className,
    };
  });
});

const referencia = portadas.find((fila) => fila.id === "atlas-comercial");
const propias = portadas.filter((fila) => fila.id === "clientes-campanas" || fila.id === "clientes-en-movimiento");
const campanas = portadas.find((fila) => fila.id === "clientes-campanas");
const movimiento = portadas.find((fila) => fila.id === "clientes-en-movimiento");

if (!referencia || propias.length !== 2) {
  fallo(`no se encontraron las tres tarjetas de Ciencia de datos (${portadas.map((f) => f.id).join(", ")})`);
}
if (referencia && propias.length === 2) {
  const mismaCaja = propias.every(
    (fila) => fila.ancho === referencia.ancho && fila.alto === referencia.alto && fila.anchoTarjeta === referencia.anchoTarjeta,
  );
  if (!mismaCaja) {
    fallo(
      `las portadas no comparten caja con Walmart M5: ` +
        portadas.map((f) => `${f.id} ${f.ancho}×${f.alto}`).join(" · "),
    );
  } else {
    ok(`portadas: las ${portadas.length} tarjetas del área miden ${referencia.ancho} × ${referencia.alto} px (proporción ${referencia.ratio})`);
  }
  if (Math.abs(referencia.ratio - 1600 / 1726) > 0.002) {
    fallo(`la referencia no conserva la proporción 1600 / 1726: ${referencia.ratio}`);
  }
  for (const fila of propias) {
    if (!fila.clases.includes("cover-tablero")) fallo(`${fila.id}: el contenedor no usa la clase compartida cover-tablero`);
    if (fila.natural?.[0] !== 1600 || fila.natural?.[1] !== 1726) {
      fallo(`${fila.id}: la imagen mide ${fila.natural?.join(" × ")}, no 1600 × 1726`);
    }
    if (fila.ajuste !== "cover" || !/^50% 0%$/.test(fila.posicion)) {
      fallo(`${fila.id}: la imagen usa ${fila.ajuste} / ${fila.posicion} en lugar de cover / top center`);
    }
    if (!/\?v=/.test(fila.src ?? "")) fallo(`${fila.id}: la portada no lleva versión y podría servirse en caché`);
  }
  if (propias.every((fila) => fila.natural?.[1] === 1726) && propias.every((fila) => fila.clases.includes("cover-tablero"))) {
    ok(`portadas: ${propias.length} archivos de 1600 × 1726 con la clase compartida cover-tablero y versión de caché`);
  }

  /* Las tarjetas de una misma fila deben alinear etiqueta y título. */
  const filas = {};
  for (const fila of portadas) {
    const clave = String(fila.top);
    (filas[clave] ??= []).push(fila);
  }
  const desalineadas = Object.values(filas).filter(
    (grupo) => grupo.length > 1 && new Set(grupo.map((f) => `${f.yEtiqueta}|${f.yTitulo}`)).size > 1,
  );
  if (desalineadas.length) {
    fallo(
      `tarjetas de la misma fila desalineadas: ` +
        desalineadas.map((g) => g.map((f) => `${f.id} etiqueta ${f.yEtiqueta}/título ${f.yTitulo}`).join(" · ")).join(" | "),
    );
  } else {
    ok("tarjetas: las de una misma fila alinean el inicio de etiqueta y título");
  }
}

/* Fuera de caché: el archivo servido debe ser el nuevo y medir lo declarado. */
const respuestas = {};
for (const [id, ruta] of [
  ["clientes-campanas", "/img/clientes-campanas-resumen.jpg"],
  ["clientes-en-movimiento", "/img/clientes-en-movimiento-resumen.jpg"],
]) {
  const respuesta = await pagina.request.get(`${SITIO}${ruta}`);
  const cuerpo = await respuesta.body();
  respuestas[id] = { estado: respuesta.status(), bytes: cuerpo.length };
  if (respuesta.status() !== 200 || cuerpo.length < 80_000) {
    fallo(`${id}: la portada servida responde ${respuesta.status()} con ${cuerpo.length} B`);
  }
}
const srcServidos = [campanas?.src, movimiento?.src].filter(Boolean);
if (srcServidos.some((src) => src.includes("?v=")) && srcServidos.length === 2) {
  ok(`servido: portadas nuevas con versión (${respuestas["clientes-campanas"].bytes} B y ${respuestas["clientes-en-movimiento"].bytes} B)`);
}

await tarjeta.locator("a.card-hit").click();
await pagina.waitForSelector("#demo-host", { timeout: 30000 });
if (!pagina.url().includes("clientes-campanas")) fallo(`la tarjeta no abrió la ficha: ${pagina.url()}`);
else ok("tarjeta: abre la misma ruta pública del proyecto");

/* ------------------------------------------------- 2. seis pestañas */
const marco = await abrirFicha(pagina);
const pestanas = await marco.locator("#tabs button").allTextContents();
if (pestanas.length !== 6) fallo(`pestañas: ${pestanas.length} en lugar de 6`);
const nombres = pestanas.map((texto) => texto.replace(/[^\p{L}áéíóúÁÉÍÓÚ ]/gu, "").trim());
for (const esperada of ["Proyecto", "Perfiles", "Evolución", "Campañas", "Incrementalidad", "Experimento"]) {
  if (!nombres.includes(esperada)) fallo(`falta la pestaña ${esperada} (encontradas: ${nombres.join(", ")})`);
}
if (!fallos.length) ok(`seis pestañas: ${nombres.join(" · ")}`);

/* Enlace directo a una vista y sincronía con la barra de direcciones. */
const enlace = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const urlEnlaceDirecto = new URL(`${SITIO}${FICHA}`);
urlEnlaceDirecto.searchParams.set("vista", "campanas");
await enlace.goto(urlEnlaceDirecto.toString(), { waitUntil: "domcontentloaded" });
await enlace.waitForSelector("#demo-host iframe", { timeout: 60000 });
const marcoEnlace = enlace.frameLocator("#demo-host iframe");
await marcoEnlace.locator("#tabs button").first().waitFor({ timeout: 60000 });
const activaEnlace = (await marcoEnlace.locator('#tabs button[aria-current="page"]').textContent())?.trim() ?? "";
if (!/Campañas/.test(activaEnlace)) fallo(`?vista=campanas abrió «${activaEnlace}»`);
await marcoEnlace.locator("#tabs button").nth(4).click();
await enlace.waitForTimeout(500);
const urlEnlace = new URL(enlace.url());
if (urlEnlace.searchParams.get("vista") !== "incrementalidad") {
  fallo(`la URL no refleja la vista activa: ${urlEnlace.search}`);
} else if (!enlace.url().includes("#/area/ciencia-de-datos/clientes-campanas")) {
  fallo("la sincronía de la vista alteró la ruta del proyecto");
} else {
  ok("enlace directo ?vista= y barra de direcciones sincronizada con las pestañas");
}
await enlace.reload({ waitUntil: "domcontentloaded" });
await enlace.waitForSelector("#demo-host iframe", { timeout: 60000 });
const marcoRecarga = enlace.frameLocator("#demo-host iframe");
await marcoRecarga.locator("#tabs button").first().waitFor({ timeout: 60000 });
if (!/Incrementalidad/.test((await marcoRecarga.locator('#tabs button[aria-current="page"]').textContent()) ?? "")) {
  fallo("al recargar no se conserva la vista pedida");
} else {
  ok("recarga: la vista de la URL se conserva");
}
await enlace.close();

/* Inventario servido y mapa de destinos del propio tablero. */
const htmlServido = await (await fetch(`${SITIO}${PAGINA}`)).text();
const datasetServido = JSON.parse(
  htmlServido.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/)[1],
);
const mapaReal = JSON.parse(htmlServido.match(/const coverage=(\{[\s\S]*?\});\n/)[1]);
const implementadas = (datasetServido.inventario ?? []).filter((fila) => fila.estado === "implementada");
if (implementadas.length !== 41) fallo(`el inventario servido declara ${implementadas.length} bloques implementados`);
if (Object.keys(mapaReal).length !== 41) fallo(`el mapa de cobertura declara ${Object.keys(mapaReal).length} destinos`);

let destinosOk = 0;
for (const vista of VISTAS) {
  await irAVista(pagina, marco, vista);
  await pagina.screenshot({ path: `${CAPTURAS}/vista-${vista}.png`, fullPage: false });
  const ids = new Set(await idsDelMarco(pagina));
  for (const [id, fila] of Object.entries(mapaReal)) {
    if (fila.view !== vista) continue;
    if (ids.has(fila.target)) destinosOk += 1;
    else fallo(`bloque ${id}: falta el destino #${fila.target} en la vista ${vista}`);
  }
}
if (destinosOk === 41) ok("41 destinos del inventario resueltos en las seis vistas");
else aviso(`destinos resueltos: ${destinosOk} de 41`);

/* ------------------------------------------------- 3. interacciones */
await irAVista(pagina, marco, "perfiles");
const cifraAntes = await texto(marco, "#profiles-filters .scope-pill");
await marco.locator("#minBaskets").fill("50");
await marco.locator("#apply-profile").click();
await pagina.waitForTimeout(250);
const cifraDespues = await texto(marco, "#profiles-filters .scope-pill");
if (cifraAntes === cifraDespues) fallo("el filtro de canastas mínimas no cambió el universo");
else ok(`filtro de perfiles: ${cifraAntes} → ${cifraDespues}`);
if (!/^120\b/.test(cifraDespues)) aviso(`filtro de 50 canastas: se esperaban 120 hogares, dio «${cifraDespues}»`);

await marco.locator('#distribution button[data-mode="paralelas"]').click();
await pagina.waitForTimeout(250);
if (!(await marco.locator("#distribution svg polyline").count())) fallo("las coordenadas paralelas no se dibujaron");
else ok("perfiles: cambio entre distribuciones y relaciones entre variables");
await marco.locator('#distribution button[data-mode="distribucion"]').click();
await marco.locator("#reset-profile").click();
await pagina.waitForTimeout(250);

await marco.locator("#metric").selectOption("canastas");
await pagina.waitForTimeout(250);
if (!(await marco.locator("#distribution svg circle").count())) fallo("el cambio de variable dejó el gráfico vacío");

await marco.locator("#household").fill("19");
await marco.locator("#find-household").click();
await pagina.waitForTimeout(300);
const fichaHogar = await texto(marco, "#household-detail");
if (!/Hogar 19/.test(fichaHogar)) fallo(`la ficha del hogar 19 no se abrió: ${fichaHogar.slice(0, 90)}`);
else ok("perfiles: ficha del hogar 19 con sus valores originales");
await pagina.screenshot({ path: `${CAPTURAS}/perfiles-hogar.png` });

await irAVista(pagina, marco, "evolucion");
const indicadoresPar = await texto(marco, "#flows .kpis");
await marco.locator("#flows svg path.pick").first().click();
await pagina.waitForTimeout(250);
if (!/Dentro del origen/.test(await texto(marco, "#flow-detail"))) fallo("la selección de una cinta no abrió su ficha");
else ok("evolución: selección vinculada entre cintas, mosaico y ficha");
await marco.locator("#pair").selectOption("2017-08-01");
await pagina.waitForTimeout(300);
if (indicadoresPar === (await texto(marco, "#flows .kpis"))) fallo("el cambio de par de cortes no actualizó los indicadores");
else ok("evolución: cambio de par de cortes (julio→agosto / agosto→septiembre)");
await pagina.screenshot({ path: `${CAPTURAS}/evolucion-par.png` });

await irAVista(pagina, marco, "campanas");
const kpiCapacidad = await texto(marco, "#target-kpis");
await marco.locator("#capacity").fill("60");
await pagina.waitForTimeout(250);
if (kpiCapacidad === (await texto(marco, "#target-kpis"))) fallo("el deslizador de capacidad no actualizó los indicadores");
else ok("campañas: deslizador de capacidad de contacto");
await marco.locator("#calibration svg g.pick").first().click();
await pagina.waitForTimeout(250);
if (!/Decil/.test(await texto(marco, "#calibration-detail"))) fallo("la selección de decil no mostró su detalle");
else ok("campañas: selección de decil en la calibración");
await marco.locator("#cut").selectOption("2017-07-01");
await pagina.waitForTimeout(350);
await marco.locator("#campaign-calendar svg g.pick, #campaign-calendar svg [data-campaign]").first().click();
await pagina.waitForTimeout(250);
if (!/Campaña/.test(await texto(marco, "#campaign-detail"))) aviso("la ficha de campaña no se actualizó al pulsar el calendario");
else ok("campañas: cambio de corte y ficha de campaña en el calendario");
await pagina.screenshot({ path: `${CAPTURAS}/campanas.png` });

await irAVista(pagina, marco, "incrementalidad");
await marco.locator("#outcome").selectOption("conversion");
await pagina.waitForTimeout(300);
const curvas = await marco.locator("#uplift-chart svg polyline").count();
if (!curvas) fallo("el cambio a conversiones dejó las curvas vacías");
else ok(`incrementalidad: cambio de resultado (${curvas} series de ganancia)`);
await marco.locator('[data-state="deltaMode"]').uncheck();
await pagina.waitForTimeout(300);
const absolutas = await texto(marco, "#uplift-detail");
await marco.locator('[data-state="deltaMode"]').check();
await pagina.waitForTimeout(300);
if (absolutas === (await texto(marco, "#uplift-detail"))) fallo("la alternancia diferencias/absolutas no cambió la lectura");
else ok("incrementalidad: alternancia entre diferencias frente al azar y curvas absolutas");
/* En modo diferencias el detalle es una nota fija; los valores por modelo se
   consultan en las curvas absolutas, así que la fracción se prueba ahí. */
await marco.locator('[data-state="deltaMode"]').uncheck();
await pagina.waitForTimeout(300);
const detalleAntes = await texto(marco, "#uplift-detail");
await marco.locator("#upliftCapacity").fill("40");
await pagina.waitForTimeout(300);
const detalleDespues = await texto(marco, "#uplift-detail");
if (detalleAntes === detalleDespues) fallo("el detalle de las curvas no cambió al mover la fracción seleccionada");
else ok("incrementalidad: valores del punto exportado al mover la fracción");
await marco.locator('[data-state="deltaMode"]').check();
await pagina.waitForTimeout(250);
await pagina.screenshot({ path: `${CAPTURAS}/incrementalidad.png` });

await irAVista(pagina, marco, "experimento");
const potenciaAntes = await texto(marco, "#power-calculator .kpis");
await marco.locator("#power").selectOption("0.9");
await pagina.waitForTimeout(300);
if (potenciaAntes === (await texto(marco, "#power-calculator .kpis"))) fallo("el simulador de potencia no recalculó la muestra");
else ok("experimento: simulador con potencia y α editables");
const escenarios = await texto(marco, "#trial .kpis");
if (!/22,107/.test(escenarios)) aviso(`el bloque de escenarios no muestra 22,107: ${escenarios.slice(0, 140)}`);
else ok("experimento: dimensionamiento publicado (22,107) separado del recálculo");
await pagina.screenshot({ path: `${CAPTURAS}/experimento.png` });

/* ------------------------------------------------- 4. ampliación y descargas */
await irAVista(pagina, marco, "perfiles");
await marco.locator('#distribution button.expand').click();
await pagina.waitForTimeout(450);
const dialogo = await pagina.evaluate(() => {
  const marco = document.querySelector("#demo-host iframe");
  const doc = marco.contentDocument;
  const dlg = doc.getElementById("expanded");
  const caja = dlg.getBoundingClientRect();
  /* El rectángulo del diálogo está en coordenadas del marco; se pasa a la ventana. */
  const origen = marco.getBoundingClientRect();
  const arriba = origen.top + caja.top;
  const abajo = arriba + caja.height;
  return {
    abierto: dlg.open,
    alto: Math.round(caja.height),
    top: Math.round(arriba),
    dentro: arriba >= -1 && abajo <= window.innerHeight + 4,
    bloqueado: document.body.style.overflow === "hidden",
  };
});
if (!dialogo.abierto) fallo("el botón Ampliar no abrió el diálogo");
else if (!dialogo.dentro) fallo(`el diálogo ampliado queda fuera de la ventana (top ${dialogo.top}, alto ${dialogo.alto})`);
else ok(`ampliación: diálogo dentro de la ventana (${dialogo.alto} px) y desplazamiento bloqueado`);
await pagina.screenshot({ path: `${CAPTURAS}/ampliada.png` });
await marco.locator("#close-expanded").click();
await pagina.waitForTimeout(350);
const cerrado = await pagina.evaluate(() => {
  const doc = document.querySelector("#demo-host iframe").contentDocument;
  return doc.getElementById("expanded").open === false && document.body.style.overflow !== "hidden";
});
if (!cerrado) fallo("el diálogo no se cerró o dejó bloqueado el desplazamiento");
else ok("ampliación: cierre con botón y desplazamiento restaurado");

const descargas = [];
pagina.on("download", (descarga) => descargas.push(descarga.suggestedFilename()));
/* El botón de descarga vive dentro de la tabla plegable: se abre antes de pulsarlo. */
const plegable = marco.locator("#distribution details").first();
await plegable.evaluate((nodo) => {
  nodo.open = true;
});
await pagina.waitForTimeout(250);
await plegable.locator("button[data-download]").first().click();
await pagina.waitForTimeout(700);
if (!descargas.length) fallo("la descarga de CSV no se disparó");
else ok(`descargas: ${descargas[0]}`);

/* ------------------------------------------------- 5. NaN y etiquetas */
let nan = 0;
let cortados = 0;
for (const vista of VISTAS) {
  await irAVista(pagina, marco, vista);
  const revision = await pagina.evaluate(() => {
    const doc = document.querySelector("#demo-host iframe").contentDocument;
    const contenido = doc.querySelector("#content");
    const malos = (contenido.innerText.match(/NaN|undefined|Infinity/g) ?? []).length;
    const etiquetas = [];
    for (const svg of contenido.querySelectorAll("svg")) {
      const area = svg.getBoundingClientRect();
      if (!area.width) continue;
      for (const nodo of svg.querySelectorAll("text")) {
        if (!nodo.textContent.trim()) continue;
        const caja = nodo.getBoundingClientRect();
        const exceso = Math.max(area.left - caja.left, caja.right - area.right);
        if (exceso > 1) etiquetas.push({ texto: nodo.textContent.trim().slice(0, 40), exceso: Math.round(exceso) });
      }
    }
    return { malos, etiquetas };
  });
  nan += revision.malos;
  cortados += revision.etiquetas.length;
  for (const etiqueta of revision.etiquetas.slice(0, 3)) {
    aviso(`${vista}: «${etiqueta.texto}» roza el borde del gráfico (${etiqueta.exceso} px)`);
  }
}
if (nan) fallo(`se encontraron ${nan} valores NaN/undefined/Infinity en las seis vistas`);
else ok("sin NaN, undefined ni Infinity en el contenido");
if (!cortados) ok("sin etiquetas cortadas en los gráficos");
else aviso(`${cortados} etiquetas se salen del área de su gráfico`);

/* ------------------------------------------------- 6. teclado y foco */
await irAVista(pagina, marco, "evolucion");
await marco.locator("#pair").focus();
const foco = await pagina.evaluate(() => {
  const doc = document.querySelector("#demo-host iframe").contentDocument;
  const nodo = doc.activeElement;
  const estilo = doc.defaultView.getComputedStyle(nodo);
  return { etiqueta: nodo.tagName + (nodo.id ? "#" + nodo.id : ""), contorno: `${estilo.outlineStyle} ${estilo.outlineWidth} ${estilo.outlineColor}` };
});
if (!/solid|dashed/.test(foco.contorno) || /^.* 0px/.test(foco.contorno)) fallo(`el foco del teclado no es visible: ${foco.contorno}`);
else ok(`teclado: foco visible en ${foco.etiqueta} (${foco.contorno})`);
await marco.locator("#flows svg path.pick").first().focus();
await pagina.keyboard.press("Enter");
await pagina.waitForTimeout(300);
if (!/Dentro del origen/.test(await texto(marco, "#flow-detail"))) fallo("Enter sobre una cinta no activó la selección");
else ok("teclado: Enter activa la selección de un flujo");

/* ------------------------------------------------- 7. móvil 390 px */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(`${SITIO}${FICHA}`, { waitUntil: "domcontentloaded" });
await movil.waitForSelector("#demo-host iframe", { timeout: 60000 });
const marcoMovil = movil.frameLocator("#demo-host iframe");
await marcoMovil.locator("#tabs button").first().waitFor({ timeout: 60000 });
for (const vista of ["perfiles", "campanas", "incrementalidad", "experimento"]) {
  await irAVista(movil, marcoMovil, vista);
  await movil.waitForTimeout(200);
  await movil.screenshot({ path: `${CAPTURAS}/movil-${vista}.png` });
  const desbordes = await movil.evaluate(() => {
    const doc = document.querySelector("#demo-host iframe").contentDocument;
    return {
      pagina: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      marco: doc.documentElement.scrollWidth - doc.documentElement.clientWidth,
    };
  });
  if (desbordes.pagina > 1) fallo(`390 px · ${vista}: la página desborda ${desbordes.pagina} px`);
  if (desbordes.marco > 1) aviso(`390 px · ${vista}: el tablero desborda ${desbordes.marco} px dentro de su marco`);
}
ok("390 px: cuatro vistas revisadas sin desbordamiento de la página");

/* Las portadas deben conservar la proporción también en móvil. */
await movil.goto(`${SITIO}${AREA}`, { waitUntil: "domcontentloaded" });
await movil.waitForSelector(".project-list .project-card");
await movil.waitForTimeout(1200);
const portadasMovil = await movil.evaluate(() => {
  const filas = [...document.querySelectorAll(".project-list .project-card")].map((li) => {
    const caja = li.querySelector(".cover").getBoundingClientRect();
    return { id: li.dataset.proyecto, ancho: Math.round(caja.width), alto: Math.round(caja.height) };
  });
  return { filas, desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
const medidasMovil = new Set(portadasMovil.filas.map((fila) => `${fila.ancho}x${fila.alto}`));
const ratioMovil = portadasMovil.filas.length ? portadasMovil.filas[0].ancho / portadasMovil.filas[0].alto : 0;
if (medidasMovil.size !== 1) {
  fallo(`390 px: las portadas no comparten medidas (${[...medidasMovil].join(" · ")})`);
} else if (Math.abs(ratioMovil - 1600 / 1726) > 0.005) {
  fallo(`390 px: la proporción de las portadas es ${ratioMovil.toFixed(3)}`);
} else if (portadasMovil.desborde > 1) {
  fallo(`390 px: la sección desborda ${portadasMovil.desborde} px con las portadas nuevas`);
} else {
  ok(`390 px: las tres portadas conservan ${[...medidasMovil][0]} px (proporción ${ratioMovil.toFixed(3)}) sin desbordar`);
}
await movil.close();

/* ------------------------------------------------- 8. consola */
const erroresReales = errores.filter((mensaje) => !/favicon|net::ERR/i.test(mensaje));
if (erroresReales.length) fallo(`errores en consola: ${erroresReales.slice(0, 3).join(" | ")}`);
else ok("sin errores de JavaScript ni de consola");

await navegador.close();

/* ------------------------------------------------- resumen */
console.log(`\ncomprobaciones correctas: ${correctas.length}`);
for (const linea of correctas) console.log(`  ✓ ${linea}`);
if (avisos.length) {
  console.log(`\navisos: ${avisos.length}`);
  for (const linea of avisos) console.log(`  · ${linea}`);
}
if (fallos.length) {
  console.log(`\nFALLOS: ${fallos.length}`);
  for (const linea of fallos) console.log(`  ✗ ${linea}`);
  process.exit(1);
}
console.log("\nverificación OK: tarjeta, seis pestañas, 41 destinos, interacciones, ampliación, descargas, teclado, móvil y consola.");
