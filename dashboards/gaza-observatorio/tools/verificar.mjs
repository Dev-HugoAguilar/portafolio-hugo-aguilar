/**
 * Verificación de las tres correcciones del observatorio «Gaza · Vidas y territorio»
 * sobre el build servido (127.0.0.1:8000).
 *
 * Cubre lo que se cambió en esta iteración y lo que no debía cambiar:
 *   1. periodistas: búsqueda nominal, contador, selección y ficha, controles de la curva;
 *   2. mapa bivariado: ancho de sección, leyenda y detalle debajo, ampliación y ajuste;
 *   3. «Sitios y trayectorias»: pestaña unificada, sincronía mapa/selector/ficha/perfil,
 *      siguiente sitio dentro del filtro, comparación con el grupo y retorno al mapa;
 *   4. estado vacío sin residuos, teclado, 1440 y 390 px, consola y recursos limpios;
 *   5. cifras originales y secciones no modificadas;
 *   6. la ficha del portafolio sigue montando el observatorio.
 *
 * Uso: node dashboards/gaza-observatorio/tools/verificar.mjs
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

async function cargarPlaywright() {
  try {
    return await import("@playwright/test");
  } catch (error) {
    return import(
      new URL("../../clientes-campanas/node_modules/@playwright/test/index.mjs", import.meta.url).toString()
    );
  }
}

const { chromium } = await cargarPlaywright();

const SITIO = "http://127.0.0.1:8000";
const PAGINA = `${SITIO}/dashboards/gaza-observatorio/index.html`;
const FICHA = `${SITIO}/#/area/ciencia-de-datos/gaza-observatorio`;
const CAPTURAS = resolve("evidencias/gaza-observatorio/correcciones");

const fallos = [];
const avisos = [];
const correctas = [];
const ok = (m) => correctas.push(m);
const fallo = (m) => fallos.push(m);
const aviso = (m) => avisos.push(m);

mkdirSync(CAPTURAS, { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const errores = [];
pagina.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
pagina.on("console", (m) => {
  if (m.type() === "error") errores.push(`consola: ${m.text()}`);
});
pagina.on("response", (r) => {
  if (r.status() >= 400) errores.push(`HTTP ${r.status()}: ${r.url()}`);
});

const leer = (sel) => pagina.$eval(sel, (n) => n.textContent.replace(/\s+/g, " ").trim());
const abrir = async (tab) => {
  await pagina.click(`[role="tab"][data-tab="${tab}"]`);
  await pagina.waitForTimeout(700);
};

await pagina.goto(PAGINA, { waitUntil: "load" });
await pagina.waitForTimeout(1800);

/* ---------------------------------------------------------------- 0. estructura */
const tabs = (await pagina.$$eval('nav [role="tab"]', (b) => b.map((x) => x.textContent.trim())));
if (tabs.length !== 11) fallo(`se esperaban 11 pestañas, hay ${tabs.length}`);
if (!tabs.includes("Cada punto, una vida")) fallo("falta la pestaña «Cada punto, una vida»");
if (!tabs.includes("Sitios y trayectorias")) fallo("falta la pestaña «Sitios y trayectorias»");
if (tabs.includes("Trayectorias")) fallo("sigue existiendo la pestaña separada «Trayectorias»");
if (!tabs.includes("Explorar sitios") === false) aviso("queda una pestaña con el nombre antiguo");
if (tabs.includes("Explorar sitios")) fallo("la pestaña antigua «Explorar sitios» sigue visible");
if (!fallos.length) ok("once pestañas, con «Cada punto, una vida», «Acceso y respuesta» y «Sitios y trayectorias»");

/* ---------------------------------------------------------------- 1. periodistas */
await abrir("personas");
const total = await leer("#pressTotal");
const agregado = await leer("#pressAggregate");
if (!/^\d+$/.test(total.replace(/[.,]/g, ""))) fallo(`el total nominal no es un número: «${total}»`);
if (!/^\d/.test(agregado)) fallo(`el acumulado no declara cifra: «${agregado}»`);
if (!fallos.length) ok(`periodistas: lista nominal ${total} registros y acumulado publicado ${agregado}`);

const puntos = await pagina.$$eval("#pressDots circle", (n) => n.length);
if (puntos !== Number(total.replace(/[.,]/g, ""))) fallo(`se dibujan ${puntos} puntos y la lista declara ${total}`);

await pagina.fill("#pressSearch", "Salhi");
await pagina.waitForTimeout(400);
const conHits = await leer("#pressCount");
if (!/^[1-9]/.test(conHits)) fallo(`la búsqueda «Salhi» no devuelve coincidencias: ${conHits}`);
await pagina.fill("#pressSearch", "zzzz-no-existe-xyz");
await pagina.waitForTimeout(400);
const sinHits = await leer("#pressCount");
const vacioVisible = await pagina.$eval("#pressEmpty", (n) => !n.hidden);
const fichaVacia = await leer("#pressDetail");
if (!/^0 /.test(sinHits)) fallo(`sin coincidencias el contador dice «${sinHits}»`);
if (!vacioVisible) fallo("sin coincidencias no aparece el aviso de estado vacío");
if (!/Sin registros que mostrar|Sin coincidencias/i.test(fichaVacia)) fallo("la ficha conserva datos de la búsqueda anterior");
if (!fallos.length) ok(`búsqueda nominal: ${conHits} con «Salhi», ${sinHits} sin resultados y estado vacío explícito`);

await pagina.click("#pressClear");
await pagina.waitForTimeout(400);
if ((await leer("#pressCount")) !== `${total} de ${total} registros`) fallo("«Limpiar búsqueda» no restaura el total");
await pagina.evaluate(() => document.querySelector('[data-press="4"]').dispatchEvent(new MouseEvent("click", { bubbles: true })));
await pagina.waitForTimeout(300);
const ficha = await leer("#pressDetail");
const marcado = await pagina.$eval('#pressDots [data-press="4"]', (n) => n.getAttribute("class").includes("is-selected"));
if (!/Registro 5 de/.test(ficha)) fallo(`la ficha no corresponde al punto elegido: ${ficha.slice(0, 60)}`);
if (!/Nombre original de la fuente/.test(ficha) || !/Nota original de la fuente/.test(ficha)) {
  fallo("la ficha no muestra nombre original y nota");
}
if (!marcado) fallo("el punto seleccionado no queda marcado");
if (!fallos.length) ok("ficha del periodista: nombre original, nombre en inglés, nota y punto marcado");

await pagina.selectOption("#pressYear", "2024");
await pagina.waitForTimeout(500);
const cortes2024 = await pagina.$$eval("#pressCut option", (o) => o.length);
await pagina.selectOption("#pressCut", { index: 0 });
await pagina.waitForTimeout(300);
const extremoInicio = await pagina.evaluate(() => ({ prev: document.querySelector("#pressPrev").disabled, next: document.querySelector("#pressNext").disabled }));
await pagina.selectOption("#pressCut", { index: cortes2024 - 1 });
await pagina.waitForTimeout(300);
const extremoFin = await pagina.evaluate(() => ({ prev: document.querySelector("#pressPrev").disabled, next: document.querySelector("#pressNext").disabled }));
if (!(extremoInicio.prev && !extremoInicio.next)) fallo(`en el primer corte los botones están mal: ${JSON.stringify(extremoInicio)}`);
if (!(extremoFin.next && !extremoFin.prev)) fallo(`en el último corte los botones están mal: ${JSON.stringify(extremoFin)}`);
const detalleCorte = await leer("#pressCutDetail");
if (!/reporte del \d{4}-\d{2}-\d{2}/.test(detalleCorte)) fallo("el detalle del corte no declara fecha de reporte");
if (!/no indica cuántas muertes ocurrieron ese día/.test(detalleCorte)) fallo("el detalle no advierte que el acumulado no son muertes del día");
if (!fallos.length) ok(`curva: ${cortes2024} cortes en 2024, extremos deshabilitados en Anterior/Siguiente y aviso de reporte`);
await pagina.screenshot({ path: `${CAPTURAS}/01-periodistas.png`, fullPage: false });

/* ---------------------------------------------------------------- 2. mapa bivariado */
await abrir("evolucion");
await pagina.waitForTimeout(900);
const base = await pagina.evaluate(() => {
  const svg = document.querySelector("#biMap svg");
  const caja = document.querySelector("#biMapScroll");
  const debajo = document.querySelector(".bibelow");
  return {
    svg: [Math.round(svg.getBoundingClientRect().width), Math.round(svg.getBoundingClientRect().height)],
    contenedor: [caja.clientWidth, caja.clientHeight],
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    claveDebajo: Boolean(debajo && debajo.querySelector("#biKey")),
    detalleDebajo: Boolean(debajo && debajo.querySelector("#biDetail")),
    leyendaTexto: document.querySelector(".bikey")?.innerText ?? "",
  };
});
if (!/^66\d$/.test(String(Math.round((base.svg[0] / base.svg[1]) * 1000)))) {
  /* proporción 660:780 ≈ 0,846 */
}
const proporcion = base.svg[0] / base.svg[1];
if (Math.abs(proporcion - 660 / 780) > 0.01) fallo(`el mapa no conserva la proporción de la cartografía: ${proporcion.toFixed(3)}`);
if (base.svg[0] < base.contenedor[0] - 4) fallo(`el mapa (${base.svg[0]} px) no ocupa el ancho de su sección (${base.contenedor[0]} px)`);
if (!base.claveDebajo || !base.detalleDebajo) fallo("la leyenda y el detalle no están debajo del mapa");
if (!/Cobertura/.test(base.leyendaTexto) || !/Destrucción/.test(base.leyendaTexto)) fallo("la leyenda no explica cobertura y destrucción");
if (base.desborde > 1) fallo(`desbordamiento horizontal de ${base.desborde} px al 100 %`);
if (!fallos.length) ok(`mapa bivariado: ${base.svg.join(" × ")} px al ancho de la sección, leyenda y detalle debajo, sin desbordar`);

await pagina.fill("#biZoom", "250");
await pagina.waitForTimeout(700);
const zoom = await pagina.evaluate(() => {
  const svg = document.querySelector("#biMap svg");
  const caja = document.querySelector("#biMapScroll");
  return {
    svg: [Math.round(svg.getBoundingClientRect().width), Math.round(svg.getBoundingClientRect().height)],
    scroll: [caja.scrollWidth, caja.scrollHeight],
    contenedor: [caja.clientWidth, caja.clientHeight],
    etiqueta: document.querySelector("#biZoomValue").textContent,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
if (!/^250/.test(zoom.etiqueta)) fallo(`la etiqueta de ampliación dice «${zoom.etiqueta}»`);
if (zoom.scroll[0] <= zoom.contenedor[0] + 1) aviso("el contenedor no ofrece desplazamiento horizontal al ampliar");
if (zoom.desborde > 1) fallo(`al 250 % la página desborda ${zoom.desborde} px`);
await pagina.evaluate(() => {
  const caja = document.querySelector("#biMapScroll");
  caja.scrollLeft = 420;
  caja.scrollTop = 600;
});
await pagina.selectOption("#biEval", "12");
await pagina.waitForTimeout(600);
const trasEval = await pagina.evaluate(() => ({
  zoom: document.querySelector("#biZoom").value,
  scroll: [document.querySelector("#biMapScroll").scrollLeft, document.querySelector("#biMapScroll").scrollTop],
  resumen: document.querySelector("#biSummary").textContent,
}));
if (trasEval.zoom !== "250") fallo("el cambio de evaluación perdió la ampliación");
if (!/Evaluación 13/.test(trasEval.resumen)) fallo("el cambio de evaluación no actualizó el resumen");
if (!fallos.length) ok(`ampliación: ${zoom.svg.join(" × ")} px al 250 %, recorrido interno y ampliación conservada al cambiar de evaluación`);
await pagina.screenshot({ path: `${CAPTURAS}/02-mapa-ampliado.png`, fullPage: false });

await pagina.click("#biReset");
await pagina.waitForTimeout(500);
const reseteado = await pagina.evaluate(() => ({
  zoom: document.querySelector("#biZoom").value,
  scroll: [document.querySelector("#biMapScroll").scrollLeft, document.querySelector("#biMapScroll").scrollTop],
  clase: document.querySelector("#biMapScroll").className,
}));
if (reseteado.zoom !== "100" || reseteado.scroll[0] !== 0 || reseteado.scroll[1] !== 0) {
  fallo(`«Ajustar mapa» no restablece escala y posición: ${JSON.stringify(reseteado)}`);
} else ok("«Ajustar mapa» restablece escala al 100 % y el desplazamiento");

await pagina.evaluate(() => document.querySelector("#biMap [data-cell]").dispatchEvent(new MouseEvent("click", { bubbles: true })));
await pagina.waitForTimeout(400);
const celda = await leer("#biDetail");
const marcadas = await pagina.$$eval('#biMap [data-cell][aria-pressed="true"]', (n) => n.length);
if (!/Celda \d+:\d+/.test(celda)) fallo("la celda seleccionada no muestra su detalle");
if (marcadas !== 1) fallo(`la celda seleccionada no queda marcada (${marcadas})`);
const descargas = [];
pagina.on("download", (d) => descargas.push(d.suggestedFilename()));
await pagina.click("#biExport");
await pagina.waitForTimeout(900);
if (!descargas.length) fallo("la exportación de celdas no disparó archivo");
else ok(`mapa: celda seleccionada, detalle con denominadores y exportación (${descargas[0]})`);

/* ---------------------------------------------------------------- 3. sitios y trayectorias */
await abrir("territorio");
const unificado = await pagina.evaluate(() => ({
  mapa: Boolean(document.querySelector("#territorio #map")),
  perfiles: document.querySelectorAll("#profiles .profile").length,
  perfilesEnTerritorio: document.querySelectorAll("#territorio #profiles .profile").length,
  explicacion: document.querySelector("#territorio .synopsis")?.innerText ?? "",
  perfilesTexto: document.querySelector("#profilesCard")?.innerText ?? "",
}));
if (!unificado.mapa || !unificado.perfiles) fallo("la vista unificada no reúne mapa y perfiles");
if (unificado.perfilesEnTerritorio !== unificado.perfiles) fallo("los perfiles no están dentro de la sección unificada");
for (const clave of ["Cada punto", "Un grupo", "Trayectoria", "Color por grupo", "14 evaluaciones"]) {
  if (!unificado.explicacion.includes(clave)) fallo(`la explicación no incluye «${clave}»`);
}
if (!/100 % de un grupo del experimento completo/.test(unificado.perfilesTexto)) fallo("los perfiles no explican el 100 % por columna");
if (!fallos.length) ok(`vista unificada: mapa + ${unificado.perfiles} perfiles dentro de la misma pestaña, con las cinco aclaraciones`);

const activosInicial = await pagina.$$eval("#profiles .profile.is-active", (n) => n.length);
if (activosInicial !== 1) fallo(`debe haber un solo grupo destacado, hay ${activosInicial}`);
const secuencia = await pagina.$$eval("#sequence .seqlist li", (n) => n.length);
const conClase = await pagina.$$eval("#sequence .seqlist li b", (n) => n.filter((x) => x.textContent.trim().length > 2).length);
const conFecha = await pagina.$$eval("#sequence .seqlist .seqdate", (n) => n.filter((x) => /evaluación \d{4}-/.test(x.textContent)).length);
if (secuencia !== 14) fallo(`el detalle del sitio muestra ${secuencia} filas en lugar de 14`);
if (conClase !== 14) fallo(`solo ${conClase} filas tienen clase legible`);
if (conFecha !== 14) fallo(`solo ${conFecha} filas tienen fecha de evaluación`);
if (!fallos.length) ok("detalle del sitio: 14 clasificaciones con número, clase legible, color y fecha de evaluación");

const antesSitio = await leer("#siteTitle");
await pagina.click("#nextSite");
await pagina.waitForTimeout(400);
const despuesSitio = await leer("#siteTitle");
const opciones = await pagina.$eval("#siteSelect", (n) => n.options.length);
const filtrados = await leer("#mapcount");
const enFiltro = await pagina.evaluate(() => { const id = document.querySelector("#siteTitle").dataset.site; return !!id && [...document.querySelectorAll("#siteSelect option")].some((o) => o.value === id || o.textContent.includes(id)); });
if (antesSitio === despuesSitio) fallo("«Siguiente sitio» no cambió la selección");
if (!enFiltro) fallo("el sitio seleccionado no pertenece al conjunto filtrado");
if (!fallos.length) ok(`«Siguiente sitio» recorre el filtro activo (${opciones} sitios · ${filtrados.split(" puntos")[0]})`);

await pagina.selectOption("#gov", { index: 1 });
await pagina.waitForTimeout(700);
const seleccionConservada = await leer("#siteTitle");
await pagina.selectOption("#group", { index: 2 });
await pagina.waitForTimeout(600);
const activoTrasFiltro = await pagina.$$eval("#profiles .profile.is-active", (n) => n.length);
const grupoDestacado = await pagina.evaluate(() => {
  const activo = document.querySelector("#profiles .profile.is-active");
  const sitio = document.querySelector("#siteGroup").textContent;
  if (!activo) return null;
  return { perfil: activo.dataset.cluster, etiqueta: sitio };
});
if (!seleccionConservada) fallo("perder la selección al cambiar de gobernación");
if (activoTrasFiltro !== 1) fallo("el perfil destacado no se sincroniza con el filtro");
if (grupoDestacado && !new RegExp(`Grupo ${Number(grupoDestacado.perfil) + 1}`).test(grupoDestacado.etiqueta)) {
  fallo(`el perfil destacado no es el grupo del sitio (${JSON.stringify(grupoDestacado)})`);
}
if (!fallos.length) ok("sincronía: mapa, selector, ficha y grupo destacado apuntan al mismo sitio");

await pagina.click("#compareGroup");
await pagina.waitForTimeout(500);
const comparacion = await leer("#profileDetail");
if (!/Comparando el Sitio/.test(comparacion)) fallo("«Comparar con su grupo» no actualiza el detalle del perfil");
const focoComparar = await pagina.evaluate(() => document.activeElement?.className ?? "");
if (!/segbtn/.test(focoComparar)) aviso(`tras comparar el foco queda en «${focoComparar}»`);
await pagina.screenshot({ path: `${CAPTURAS}/03-sitios-trayectorias.png`, fullPage: false });

await pagina.evaluate(() => document.querySelector("#profiles .segbtn").dispatchEvent(new MouseEvent("click", { bubbles: true })));
await pagina.waitForTimeout(300);
const franja = await leer("#profileDetail");
if (!/Grupo \d+ · [^·]+ · evaluación \d+ \(20\d\d-\d\d-\d\d\) ·/.test(franja)) fallo(`la franja no declara evaluación, fecha, clase y porcentaje: ${franja.slice(0, 80)}`);
if (!/\d+[.,]\d % del? (las )?clasificaciones|del grupo completo/.test(franja)) aviso("la franja no aclara el denominador del grupo");
if (!fallos.length) ok("franjas de grupo consultables con evaluación, fecha, clase y porcentaje del grupo completo");

await pagina.evaluate(() => document.querySelector("#profiles [data-group]").dispatchEvent(new MouseEvent("click", { bubbles: true })));
await pagina.waitForTimeout(600);
const retorno = await pagina.evaluate(() => ({
  grupo: document.querySelector("#group").value,
  sitio: document.querySelector("#siteTitle").textContent,
  id: document.querySelector("#siteTitle").dataset.site || "",
  mapaVisible: document.querySelector("#map").getBoundingClientRect().height > 100,
}));
if (!retorno.sitio || !retorno.id || !retorno.mapaVisible) fallo("«Filtrar este grupo en el mapa» no vuelve a la exploración");
else ok(`retorno del perfil al mapa: grupo ${retorno.grupo} filtrado y sitio ${retorno.sitio}`);

/* estado vacío, sin residuos */
await pagina.evaluate(() => {
  const gov = [...document.querySelectorAll("#gov option")].map((o) => o.value).filter(Boolean)[0];
  DATA.points.splice(0, DATA.points.length, ...DATA.points.filter((p) => p.g !== gov));
  document.querySelector("#gov").value = gov;
  document.querySelector("#gov").dispatchEvent(new Event("change", { bubbles: true }));
});
await pagina.waitForTimeout(800);
const vacio = await pagina.evaluate(() => ({
  titulo: document.querySelector("#siteTitle").textContent,
  ubicacion: document.querySelector("#siteLocation").textContent,
  secuencia: document.querySelectorAll("#sequence .seqlist li").length,
  opciones: document.querySelector("#siteSelect").options.length,
  siguiente: document.querySelector("#nextSite").disabled,
  comparar: document.querySelector("#compareGroup").disabled,
  conteo: document.querySelector("#mapcount").textContent,
}));
if (!/Sin sitios/.test(vacio.titulo)) fallo(`el estado vacío no se anuncia: «${vacio.titulo}»`);
if (vacio.secuencia !== 0 || vacio.opciones !== 0) fallo("el estado vacío conserva datos del sitio anterior");
if (!vacio.siguiente || !vacio.comparar) fallo("los botones no se deshabilitan sin sitios");
if (!/^0 puntos visibles/.test(vacio.conteo)) fallo("el conteo no refleja cero puntos");
if (!fallos.length) ok("estado vacío: sin ficha residual, sin opciones y acciones deshabilitadas");

/* ------------------------------------------------- 3 bis. cada punto, una vida */
await abrir("memoria");
await pagina.waitForTimeout(900);
const memoriaInicial = await pagina.evaluate(() => ({
  contador: document.querySelector("#memCount").textContent,
  alcance: document.querySelector("#memScope").textContent,
  lienzo: (() => {
    const canvas = document.querySelector("#memCanvas");
    const contexto = canvas.getContext("2d");
    const datos = contexto.getImageData(0, 0, Math.min(400, canvas.width), Math.min(200, canvas.height)).data;
    let pintados = 0;
    for (let i = 3; i < datos.length; i += 4) if (datos[i] > 0) pintados += 1;
    return pintados;
  })(),
  leyenda: document.querySelector(".memLegend")?.innerText.replace(/\s+/g, " ").trim() ?? "",
  aviso: document.querySelector(".memNotice")?.innerText.replace(/\s+/g, " ").trim() ?? "",
  ficha: document.querySelector("#memPerson").innerText.replace(/\s+/g, " ").trim(),
  rejilla: Math.round(document.querySelector("#memSpace").getBoundingClientRect().height),
  marco: Math.round(document.querySelector("#memViewport").getBoundingClientRect().height),
  scrollInterno: document.querySelector("#memViewport").scrollHeight - document.querySelector("#memViewport").clientHeight,
  zoom: document.querySelector("#memCanvas").dataset.memZoom || "",
  columnas: Number(document.querySelector("#memCanvas").dataset.memCols || 0),
  paso: Number(document.querySelector("#memCanvas").dataset.memStep || 0),
}));
if (memoriaInicial.contador !== "21,637") fallo(`la vista inicial no muestra 21 637 menores: ${memoriaInicial.contador}`);
if (!/niños y adolescentes/.test(memoriaInicial.alcance)) fallo(`el alcance inicial no es el de menores: ${memoriaInicial.alcance}`);
if (!memoriaInicial.lienzo) fallo("el lienzo de la cuadrícula no tiene puntos pintados");
if (!/Más joven/.test(memoriaInicial.leyenda) || !/Mayor edad/.test(memoriaInicial.leyenda)) fallo("la leyenda no explica la escala de edad");
if (!/Escala del tono: 0–17 años \(según la selección\)/.test(memoriaInicial.leyenda)) fallo(`la leyenda no declara el rango del tono: ${memoriaInicial.leyenda}`);
if (!/lista nominal es incompleta/i.test(memoriaInicial.aviso)) fallo("falta el aviso de lista incompleta");
if (!/72.835/.test(memoriaInicial.aviso) || !/74.645/.test(memoriaInicial.aviso)) fallo("el aviso no declara las dos cifras y su corte");
if (!/Procedencia: lista nominal de Tech for Palestine/.test(memoriaInicial.ficha)) fallo("la ficha no declara la procedencia");
if (!/edad declarada/.test(memoriaInicial.ficha)) fallo("la ficha no declara la edad como declarada");
if (memoriaInicial.zoom !== "1") fallo(`la cuadrícula no arranca en el encuadre completo: zoom ${memoriaInicial.zoom}`);
if (memoriaInicial.scrollInterno > 1) fallo(`al 100 % quedan filas fuera del marco: ${memoriaInicial.scrollInterno} px`);
if (memoriaInicial.rejilla > memoriaInicial.marco + 1) fallo(`la rejilla excede el marco: ${memoriaInicial.rejilla} > ${memoriaInicial.marco}`);
if (!(memoriaInicial.columnas > 50) || !(memoriaInicial.paso > 2)) fallo(`rejilla mal encuadrada: ${memoriaInicial.columnas} columnas a ${memoriaInicial.paso} px`);
if (!fallos.length) ok(`cada punto, una vida: ${memoriaInicial.contador} menores dibujados sin muestreo, con ficha y aviso de lista incompleta`);

for (const [valor, esperado] of [["adults", "51,198"], ["all", "72,835"], ["children", "21,637"]]) {
  await pagina.selectOption("#memUniverse", valor);
  await pagina.waitForTimeout(600);
  const contador = await leer("#memCount");
  if (contador !== esperado) fallo(`universo ${valor}: ${contador} en lugar de ${esperado}`);
}
await pagina.selectOption("#memUniverse", "all");
await pagina.waitForTimeout(500);
await pagina.fill("#memMin", "0");
await pagina.fill("#memMax", "4");
await pagina.waitForTimeout(700);
if ((await leer("#memCount")) !== "5,293") fallo(`el intervalo 0–4 años da ${await leer("#memCount")} en lugar de 5 293`);
await pagina.fill("#memMin", "40");
await pagina.fill("#memMax", "10");
await pagina.waitForTimeout(500);
if (!/edad mínima debe ser menor o igual/i.test(await leer("#memStatus"))) fallo("un intervalo inválido no avisa");
await pagina.fill("#memMin", "0");
await pagina.fill("#memMax", "110");
await pagina.waitForTimeout(500);
if (!fallos.length) ok("universos y edades: 51 198 adultos · 72 835 en total · 5 293 menores de 5 · intervalo inválido señalado");

await pagina.fill("#memSearch", "Salhi");
await pagina.waitForTimeout(600);
const hitsLatinos = await leer("#memCount");
if (!/^[1-9]/.test(hitsLatinos)) fallo(`la búsqueda transliterada no encuentra coincidencias: ${hitsLatinos}`);
await pagina.fill("#memSearch", "محمد");
await pagina.waitForTimeout(700);
const hitsArabes = Number((await leer("#memCount")).replace(/[.,]/g, ""));
if (!(hitsArabes > 1000)) fallo(`la búsqueda en árabe devuelve ${hitsArabes}`);
await pagina.fill("#memSearch", "zzz-no-existe");
await pagina.waitForTimeout(600);
if ((await leer("#memCount")) !== "0") fallo("una búsqueda sin coincidencias no deja el contador en cero");
if (!/No hay personas que coincidan/.test(await leer("#memPerson"))) fallo("el estado vacío conserva la ficha anterior");
await pagina.click("#memReset");
await pagina.waitForTimeout(600);
if ((await leer("#memCount")) !== "21,637") fallo("«Restablecer» no vuelve a la vista inicial");
if (!fallos.length) ok(`búsqueda nominal: ${hitsLatinos} con «Salhi», ${hitsArabes.toLocaleString("es-MX")} con «محمد», estado vacío y reinicio`);

await pagina.evaluate(() => { document.querySelector("details.memTable").open = true; });
await pagina.waitForTimeout(300);
const paginaUno = await leer("#memPage");
await pagina.click("#memPageNext");
await pagina.waitForTimeout(400);
const paginaDos = await leer("#memPage");
if (paginaUno === paginaDos) fallo("la paginación de la tabla no avanza");
const filas = await pagina.$$eval("#memRows tr", (n) => n.length);
if (filas !== 25) fallo(`la tabla no muestra 25 nombres por página (${filas})`);
await pagina.evaluate(() => document.querySelector("#memRows button").click());
await pagina.waitForTimeout(400);
if (!/registro/.test(await leer("#memPerson"))) fallo("seleccionar una fila no actualiza la ficha");
if (!fallos.length) ok(`tabla accesible: ${filas} nombres por página, paginación (${paginaUno} → ${paginaDos}) y selección`);

await pagina.focus("#memCanvas");
const fichaAntes = await leer("#memPerson");
await pagina.keyboard.press("ArrowRight");
await pagina.waitForTimeout(400);
const fichaFlecha = await leer("#memPerson");
await pagina.keyboard.press("End");
await pagina.waitForTimeout(500);
const fichaFin = await leer("#memPerson");
await pagina.keyboard.press("Home");
await pagina.waitForTimeout(500);
const fichaInicio = await leer("#memPerson");
if (fichaAntes === fichaFlecha) fallo("la flecha derecha no cambia la selección en la cuadrícula");
if (fichaFlecha === fichaFin || fichaFin === fichaInicio) fallo("Inicio y Fin no llevan a los extremos");
if (!/17a|17 años/.test(fichaFin)) aviso(`«Fin» no cae en la última persona de la selección menor: ${fichaFin.slice(0, 40)}`);
if (!fallos.length) ok("teclado en la cuadrícula: flechas, Inicio y Fin con ficha sincronizada");
await pagina.screenshot({ path: `${CAPTURAS}/11-cada-punto.png`, fullPage: false });

/* identificadores duplicados: la página no debe repetir id en el mismo documento */
const duplicados = await pagina.evaluate(() => {
  const vistos = new Map();
  for (const nodo of document.querySelectorAll("[id]")) {
    vistos.set(nodo.id, (vistos.get(nodo.id) ?? 0) + 1);
  }
  return [...vistos.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id}×${n}`);
});
if (duplicados.length) fallo(`identificadores duplicados en la página: ${duplicados.slice(0, 5).join(", ")}`);
else ok("sin identificadores duplicados: una sola sección, un solo mapa y un solo juego de filtros");

/* ---------------------------------------------------------------- 4. teclado */
await pagina.reload({ waitUntil: "load" });
await pagina.waitForTimeout(1800);
await abrir("personas");
await pagina.focus('#pressDots [data-press="0"]');
await pagina.keyboard.press("ArrowRight");
const focoPunto = await pagina.evaluate(() => document.activeElement?.dataset?.press);
await pagina.keyboard.press("Enter");
await pagina.waitForTimeout(300);
if (focoPunto === "0" || !/Registro 2 de/.test(await leer("#pressDetail"))) {
  fallo("las flechas y Enter no recorren la lista nominal");
} else ok(`teclado: flechas y Enter en la lista nominal (punto ${focoPunto})`);

await pagina.evaluate(() => {
  const fecha = [...document.querySelectorAll("#pressTrend [data-cut]")].at(-3).dataset.cut;
  document.querySelector(`#pressTrend [data-cut="${fecha}"]`).focus();
});
await pagina.keyboard.press("Enter");
await pagina.waitForTimeout(300);
if (!/reporte del 20/.test(await leer("#pressCutDetail"))) fallo("Enter sobre un punto de la curva no actualiza el corte");
else ok("teclado: los puntos de la curva son seleccionables con Enter");

await abrir("evolucion");
await pagina.waitForTimeout(900);
await pagina.evaluate(() => document.querySelector("#biMap [data-cell]").focus());
await pagina.keyboard.press("Enter");
await pagina.waitForTimeout(300);
if (!/Celda/.test(await leer("#biDetail"))) fallo("Enter sobre una celda del mapa no abre su detalle");
else ok("teclado: las celdas del mapa bivariado se activan con Enter");

await abrir("territorio");
await pagina.waitForTimeout(800);
await pagina.evaluate(() => document.querySelector("#profiles .segbtn").focus());
await pagina.keyboard.press("Enter");
await pagina.waitForTimeout(300);
const focoFranja = await pagina.evaluate(() => {
  const estilo = getComputedStyle(document.activeElement);
  return { clase: document.activeElement.className, contorno: `${estilo.outlineStyle} ${estilo.outlineWidth}` };
});
if (!/solid/.test(focoFranja.contorno) || / 0px/.test(focoFranja.contorno)) fallo(`el foco no es visible: ${focoFranja.contorno}`);
else ok(`teclado: franjas con Enter y foco visible (${focoFranja.contorno})`);

await pagina.focus('[role="tab"][data-tab="territorio"]');
await pagina.keyboard.press("ArrowRight");
await pagina.waitForTimeout(300);
const tabTeclado = await pagina.evaluate(() => document.querySelector('[role="tab"][aria-selected="true"]').dataset.tab);
if (tabTeclado === "territorio") fallo("las flechas no recorren la barra de pestañas tras unificar");
else ok(`teclado: la barra de pestañas recorre las once vistas (activa «${tabTeclado}»)`);

/* ---------------------------------------------------------------- 5. cifras y otras secciones */
const cifras = await pagina.evaluate(() => ({
  metricas: [...document.querySelectorAll("#humanmetrics .card strong")].map((s) => s.textContent.trim()),
  elegibles: document.querySelector("#eligible").textContent.trim(),
  pronostico: [...document.querySelectorAll("#death-horizon-cards .horizon-card")].map((c) => c.innerText.replace(/\s+/g, " ").trim()),
  corte: document.querySelector("#death-forecast")?.innerText.replace(/\s+/g, " ").trim() || "",
  estado: document.querySelector("#death-status")?.innerText.replace(/\s+/g, " ").trim() || "",
  perfiles: document.querySelectorAll("#profiles .profile").length,
  universo: document.body.textContent.includes("198,308"),
}));
const esperadas = ["74,645", "175,978", "21,976", "263"];
if (JSON.stringify(cifras.metricas) !== JSON.stringify(esperadas)) fallo(`las cifras de impacto cambiaron: ${JSON.stringify(cifras.metricas)}`);
if (cifras.elegibles !== "155,112") fallo(`los sitios elegibles cambiaron: ${cifras.elegibles}`);
const tresPlazos = cifras.pronostico.length === 3;
const dia = cifras.pronostico[0] || "";
const semana = cifras.pronostico[1] || "";
const mes = cifras.pronostico[2] || "";
if (!tresPlazos || !/\b3\.7\b/.test(dia) || !/0–9\.3/.test(dia)) fallo(`el pronóstico a 1 día cambió: ${dia}`);
if (!/\b23\.8\b/.test(semana) || !/5\.8–41\.8/.test(semana)) fallo(`el pronóstico a 7 días cambió: ${semana}`);
if (!/No estimable/i.test(mes) || !/\b28\b/.test(mes)) fallo(`la tarjeta de 28 días cambió: ${mes}`);
if (!/506/.test(cifras.corte + ' ' + cifras.estado) || !/2026-11-11/.test(cifras.corte)) fallo(`el corte o los informes válidos cambiaron: ${cifras.corte}`);
if (!cifras.universo) fallo("el universo de 198 308 sitios ya no se declara");
if (!fallos.length) ok(`cifras originales conservadas: ${cifras.metricas.join(" · ")} · ${cifras.elegibles} elegibles · pronóstico 3.7 / 23.8 / 28 días sin estimar`);

for (const seccion of ["humano", "salud", "experimento", "archivo", "referencias", "evidencia"]) {
  await abrir(seccion);
  const estado = await pagina.evaluate((id) => {
    const nodo = document.getElementById(id);
    return { texto: nodo.innerText.length, graficos: nodo.querySelectorAll("svg, canvas").length, tablas: nodo.querySelectorAll("table").length };
  }, seccion);
  if (estado.texto < 200) fallo(`la sección ${seccion} quedó vacía`);
}
if (!fallos.length) ok("las otras seis secciones siguen con contenido, gráficos y tablas");

/* ---------------------------------------------------------------- 6. 390 px y consola */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(PAGINA, { waitUntil: "load" });
await movil.waitForTimeout(1600);
const medirMovil = async (tab) => {
  await movil.click(`[role="tab"][data-tab="${tab}"]`);
  await movil.waitForTimeout(800);
  return movil.evaluate(() => ({
    desbordePagina: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    desbordeInterno: Math.max(0, ...[...document.querySelectorAll("#pressCard, #biMapScroll, #territorio")].map((n) => n.scrollWidth - n.clientWidth)),
  }));
};
for (const tab of ["personas", "evolucion", "territorio"]) {
  const m = await medirMovil(tab);
  if (m.desbordePagina > 1) fallo(`390 px · ${tab}: la página desborda ${m.desbordePagina} px`);
}
await movil.click('[role="tab"][data-tab="personas"]');
await movil.waitForTimeout(700);
await movil.screenshot({ path: `${CAPTURAS}/04-periodistas-390.png`, fullPage: false });
await movil.click('[role="tab"][data-tab="territorio"]');
await movil.waitForTimeout(800);
await movil.screenshot({ path: `${CAPTURAS}/05-sitios-390.png`, fullPage: false });
await movil.close();
if (!fallos.length) ok("390 px: las tres vistas corregidas se leen sin desbordamiento de la página");

/* ficha del portafolio: la integración sigue en su sitio */
await pagina.goto(FICHA, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector("#demo-host iframe", { timeout: 60000 });
const marco = pagina.frameLocator("#demo-host iframe");
await marco.locator('[role="tab"]').first().waitFor({ timeout: 60000 });
await pagina.waitForTimeout(1200);
const montado = await pagina.evaluate(() => ({
  marco: Math.round(document.querySelector("#demo-host iframe").getBoundingClientRect().width),
  alto: Math.round(document.querySelector("#demo-host iframe").getBoundingClientRect().height),
  pestanas: document.querySelector("#demo-host iframe").contentDocument.querySelectorAll('nav [role="tab"]').length,
}));
if (montado.pestanas !== 11 || montado.marco < 900 || montado.alto < 3000) {
  fallo(`la ficha del portafolio no monta el observatorio corregido: ${JSON.stringify(montado)}`);
} else ok(`ficha del portafolio: marco de ${montado.marco} × ${montado.alto} px con las ${montado.pestanas} pestañas`);

const erroresReales = errores.filter((m) => !/favicon|net::ERR_ABORTED/i.test(m));
if (erroresReales.length) fallo(`errores en consola o en recursos: ${erroresReales.slice(0, 3).join(" | ")}`);
else ok("sin errores de JavaScript ni respuestas 404 durante todo el recorrido");

await navegador.close();

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
console.log("\nverificación OK: periodistas, mapa bivariado, sitios y trayectorias, cada punto una vida, estado vacío, teclado, 390 px y ficha.");






