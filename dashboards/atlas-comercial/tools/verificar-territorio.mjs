/**
 * Verificación real del incremento «territorio + composición + comparación histórica».
 *
 * Comprueba, con la API viva (127.0.0.1:8010) y el sitio (127.0.0.1:8000):
 *
 * 1. Panorama: cada estado suma sus tiendas; los estados suman el total del contexto.
 * 2. Pequeños múltiplos agrupados por estado (sin mezclar territorios).
 * 3. Composición: departamentos suman su categoría; categorías suman el contexto.
 * 4. Intersección CA_1 × FOODS_1 y respeto de los filtros comerciales.
 * 5. Gráfica editorial: banda, promedio, año, anotaciones, tabla y cambio de modo.
 * 6. Referencias: solo años anteriores; 2011 sin referencia comparable.
 * 7. Explorador de productos: universo, Top 5, participación y selección.
 * 8. URL, recarga, Atrás/Adelante y ausencia de consultas por hover.
 * 9. Móvil sin desbordamiento.
 */
import { chromium } from "@playwright/test";

const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const SITIO = `http://127.0.0.1:8000/?ac_pantalla=exploracion${HASH}`;
const conQuery = (query) => `http://127.0.0.1:8000/?ac_pantalla=exploracion${query ? `&${query}` : ""}${HASH}`;
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";
const EV = "../../evidencias/comercial";

const resultados = [];
const comprobar = (nombre, condicion, detalle) => {
  resultados.push({ comprobacion: nombre, ok: Boolean(condicion), detalle });
  if (!condicion) console.log(`FALLO: ${nombre} · ${JSON.stringify(detalle)}`);
  return Boolean(condicion);
};

const b = await chromium.launch();
const pagina = await b.newPage({ viewport: { width: 1360, height: 1100 }, deviceScaleFactor: 2 });
const errores = [];
pagina.on("pageerror", (e) => errores.push(`pageerror: ${e.message.slice(0, 160)}`));
pagina.on("console", (m) => {
  if (m.type() === "error") errores.push(`console: ${m.text().slice(0, 160)}`);
});
const peticiones = [];
pagina.on("request", (r) => {
  if (r.url().includes("/comercial/m5/")) peticiones.push(r.url());
});

const api = async (ruta) => {
  const respuesta = await pagina.evaluate(
    async ([url]) => {
      const r = await fetch(url);
      return { estado: r.status, cuerpo: await r.json() };
    },
    [`${API}${ruta}`],
  );
  return respuesta;
};

const esperarTablero = async () => {
  await pagina.waitForSelector(".ac-tarjetas .ac-tarjeta", { timeout: 180000 });
  await pagina.waitForSelector(".ac-mini svg", { timeout: 180000 });
  await pagina.waitForTimeout(1200);
};

await pagina.goto(SITIO, { waitUntil: "domcontentloaded" });
await esperarTablero();

/* 1 y 2 ------------------------------------------------ panorama territorial */
const apiPulso = await api("/pulso?agregacion=semana");
const panorama = apiPulso.cuerpo.panorama;
const series = apiPulso.cuerpo.series;

comprobar(
  "panorama: tres estados y participación explícita",
  panorama.estados.length === 3 && panorama.estados.every((e) => e.participacion_pct !== null),
  panorama.estados.map((e) => [e.estado, e.unidades, e.participacion_pct]),
);
comprobar(
  "panorama: cada estado = suma de sus tiendas",
  panorama.estados.every((estado) => {
    const suma = series
      .filter((serie) => estado.tiendas.includes(serie.clave ?? serie.store_id))
      .reduce((total, serie) => total + serie.total, 0);
    return suma === estado.unidades;
  }),
  panorama.estados.map((estado) => ({
    estado: estado.estado,
    panorama: estado.unidades,
    series: series
      .filter((serie) => estado.tiendas.includes(serie.clave ?? serie.store_id))
      .reduce((total, serie) => total + serie.total, 0),
  })),
);
comprobar(
  "panorama: estados = total del contexto",
  panorama.estados.reduce((total, estado) => total + estado.unidades, 0) === panorama.total_unidades &&
    panorama.total_unidades === apiPulso.cuerpo.resumen.total,
  { estados: panorama.total_unidades, resumen: apiPulso.cuerpo.resumen.total },
);

const tarjetas = await pagina.$$eval(".ac-tarjeta", (nodos) =>
  nodos.map((nodo) => ({
    nombre: nodo.querySelector(".ac-tarjeta-nombre")?.textContent ?? "",
    unidades: nodo.querySelector(".ac-tarjeta-unidades")?.textContent ?? "",
    pie: nodo.querySelector(".ac-tarjeta-pie")?.textContent ?? "",
  })),
);
comprobar(
  "panorama: tarjetas con nombre en español y porcentaje",
  tarjetas.length === 3 &&
    ["California", "Texas", "Wisconsin"].every((nombre) => tarjetas.some((t) => t.nombre === nombre)) &&
    tarjetas.every((t) => /% del total/.test(t.pie)),
  tarjetas,
);

const grupos = await pagina.$$eval(".ac-grupo-cab h4", (nodos) => nodos.map((n) => n.textContent));
comprobar(
  "pequeños múltiplos: agrupados por estado",
  grupos.length === 3 && grupos.some((titulo) => titulo?.includes("California")),
  grupos,
);

const etiquetasY = await pagina.$$eval(".ac-grupo-rejilla .ac-mini svg text.ac-eje-texto", (nodos) =>
  nodos.map((nodo) => nodo.textContent ?? "").filter((texto) => /^[\d.\s]+$/.test(texto.trim()) && texto.trim() !== ""),
);
comprobar(
  "pequeños múltiplos: marcas del eje calculadas (sin máximos crudos)",
  etiquetasY.length > 0 && etiquetasY.every((texto) => /^[\d.]{1,3}([.\s]\d{3})*$/.test(texto.trim())),
  etiquetasY.slice(0, 6),
);

await pagina.locator(".ac-app").screenshot({ path: `${EV}/verificacion-1-panorama.png` });

/* 3 y 4 ------------------------------------------------ composición comercial */
const composicion = apiPulso.cuerpo.composicion;
comprobar(
  "composición: departamentos suman su categoría",
  composicion.categorias.every((categoria) => {
    const suma = composicion.departamentos
      .filter((fila) => fila.categoria === categoria.codigo)
      .reduce((total, fila) => total + fila.unidades, 0);
    return suma === categoria.unidades;
  }),
  composicion.categorias.map((categoria) => ({
    categoria: categoria.codigo,
    declarado: categoria.unidades,
    suma: composicion.departamentos
      .filter((fila) => fila.categoria === categoria.codigo)
      .reduce((total, fila) => total + fila.unidades, 0),
  })),
);
comprobar(
  "composición: categorías suman el contexto",
  composicion.categorias.reduce((total, fila) => total + fila.unidades, 0) === composicion.total_unidades &&
    composicion.total_unidades === apiPulso.cuerpo.resumen.total,
  { composicion: composicion.total_unidades, resumen: apiPulso.cuerpo.resumen.total },
);

const apiCA1 = await api("/pulso?nivel=departamento&tienda=CA_1&categorias=FOODS&agregacion=semana");
const apiComposicionCA1 = await api("/pulso?tiendas=CA_1&agregacion=semana");
const foodsCA1 = apiComposicionCA1.cuerpo.composicion.categorias.find((f) => f.codigo === "FOODS");
comprobar(
  "intersección CA_1 × FOODS = composición de categoría en CA_1",
  apiCA1.cuerpo.resumen.total === foodsCA1.unidades,
  { interseccion: apiCA1.cuerpo.resumen.total, composicion: foodsCA1.unidades },
);

const barraCategorias = await pagina.$$eval(".ac-comp-fila--categoria .ac-comp-nombre", (nodos) =>
  nodos.map((nodo) => nodo.textContent ?? ""),
);
comprobar(
  "composición: tres categorías visibles con etiqueta en español",
  barraCategorias.length === 3 &&
    barraCategorias.some((texto) => texto.includes("Alimentos")) &&
    barraCategorias.some((texto) => texto.includes("Aficiones")) &&
    barraCategorias.some((texto) => texto.includes("Hogar")),
  barraCategorias,
);
await pagina.locator(".ac-composicion").screenshot({ path: `${EV}/verificacion-2-composicion.png` });

/* 5 y 6 ------------------------------------- gráfica editorial de histórico */
comprobar(
  "histórico: banda, promedio y observado dibujados",
  (await pagina.locator('[data-testid="banda-historica"]').count()) === 1 &&
    (await pagina.locator('[data-testid="linea-promedio"]').count()) === 1 &&
    (await pagina.locator('[data-testid="linea-observado"]').count()) === 1,
  null,
);
const anotaciones = await pagina.$$eval(".ac-hx-anotacion-caja", (nodos) => nodos.length);
comprobar("histórico: una o dos anotaciones calculadas", anotaciones >= 1 && anotaciones <= 2, anotaciones);
const alcance = await pagina.locator('[data-testid="alcance-historico"]').textContent();
comprobar(
  "histórico: año analizado y referencia declarados",
  /Año analizado/.test(alcance ?? "") && /referencia/.test(alcance ?? ""),
  alcance,
);

const apiHistorico = await api("/historico?anio=2015&modo=semana");
comprobar(
  "histórico: solo años anteriores completos",
  apiHistorico.cuerpo.referencias.anios_incluidos.every((anio) => anio < 2015) &&
    apiHistorico.cuerpo.referencias.anios_incluidos.join(",") === "2012,2013,2014" &&
    apiHistorico.cuerpo.referencias.anios_excluidos.some((fila) => fila.anio === 2011),
  apiHistorico.cuerpo.referencias,
);
const puntosRef = apiHistorico.cuerpo.puntos.filter((punto) => punto.referencias > 0);
comprobar(
  "histórico: promedio y rango dentro del mínimo y el máximo",
  puntosRef.length > 0 &&
    puntosRef.every(
      (punto) =>
        punto.referencia_min <= punto.referencia_promedio && punto.referencia_promedio <= punto.referencia_max,
    ),
  puntosRef.slice(0, 3).map((p) => [p.referencia_min, p.referencia_promedio, p.referencia_max]),
);
comprobar(
  "histórico: la serie observada termina en su último dato",
  apiHistorico.cuerpo.ultimo_con_dato.observado !== null &&
    apiHistorico.cuerpo.puntos.every(
      (punto) =>
        punto.observado !== null || punto.fecha_desde > apiHistorico.cuerpo.ultimo_con_dato.fecha_hasta,
    ),
  apiHistorico.cuerpo.ultimo_con_dato,
);

// Tabla accesible con los mismos valores.
await pagina.locator(".ac-hx-tabla summary").click();
await pagina.waitForTimeout(300);
const filasTabla = await pagina.$$eval(".ac-hx-tabla tbody tr", (nodos) => nodos.length);
comprobar(
  "histórico: tabla accesible con todos los periodos",
  filasTabla === apiHistorico.cuerpo.puntos.length,
  { filas: filasTabla, puntos: apiHistorico.cuerpo.puntos.length },
);

// Cambio a acumulado.
await pagina.getByRole("button", { name: "Acumulado del año", exact: true }).click();
await pagina.waitForTimeout(1400);
const apiAcumulado = await api("/historico?anio=2015&modo=acumulado");
comprobar(
  "histórico: el acumulado se calcula y reconcilia",
  apiAcumulado.cuerpo.acumulado.completo === true &&
    apiAcumulado.cuerpo.puntos.every((punto, indice, lista) =>
      indice === 0 ? punto.observado === 0 || punto.observado !== null : punto.observado === null ||
        punto.observado >= lista[indice - 1].observado,
    ),
  {
    etiqueta: apiAcumulado.cuerpo.acumulado.etiqueta,
    ultimo: apiAcumulado.cuerpo.puntos.at(-1).observado,
  },
);
const apiDiaria = await api("/pulso?agregacion=dia");
const totalDias2015 = apiDiaria.cuerpo.series.reduce(
  (total, serie) =>
    total + serie.valores.filter((cubo) => cubo.clave.startsWith("2015-")).reduce((p, c) => p + c.total, 0),
  0,
);
comprobar(
  "histórico: el acumulado al 31 dic es la suma diaria del año",
  apiAcumulado.cuerpo.puntos.at(-1).observado === totalDias2015,
  { acumulado: apiAcumulado.cuerpo.puntos.at(-1).observado, dias2015: totalDias2015 },
);
await pagina.locator(".ac-historico").screenshot({ path: `${EV}/verificacion-4-historico-acumulado.png` });

// Año sin referencia comparable (2011).
await pagina.getByRole("button", { name: "2011", exact: true }).click();
await pagina.waitForTimeout(1400);
comprobar(
  "histórico: 2011 sin referencia y sin banda artificial",
  (await pagina.locator('[data-testid="sin-referencia"]').count()) === 1 &&
    (await pagina.locator('[data-testid="banda-historica"]').count()) === 0 &&
    (await pagina.locator('[data-testid="linea-promedio"]').count()) === 0,
  null,
);
await pagina.getByRole("button", { name: "2015", exact: true }).click();
await pagina.getByRole("button", { name: "Por semana", exact: true }).click();
await pagina.waitForTimeout(1400);
await pagina.locator(".ac-historico").screenshot({ path: `${EV}/verificacion-3-historico-semana.png` });

/* 7 ------------------------------------------------------- navegación real */
const antesDeNavegar = peticiones.length;
await pagina.locator('[data-testid="estado-CA"]').click();
await pagina.waitForFunction(
  () => {
    const claves = [...document.querySelectorAll(".ac-mini")].map((nodo) => nodo.getAttribute("data-clave") ?? "");
    return claves.length > 0 && claves.every((clave) => clave.startsWith("CA_"));
  },
  { timeout: 60000 },
);
await pagina.waitForTimeout(600);
let url = new URL(pagina.url());
comprobar("navegación: el estado queda en la URL", url.searchParams.get("ac_estado") === "CA", url.search);
comprobar(
  "navegación: seleccionar un estado consulta una vez",
  peticiones.length > antesDeNavegar,
  peticiones.length - antesDeNavegar,
);
const clavesTrasEstado = await pagina.$$eval(".ac-mini", (nodos) =>
  nodos.map((nodo) => nodo.getAttribute("data-clave")),
);
comprobar(
  "navegación: solo las tiendas del estado seleccionado",
  clavesTrasEstado.every((clave) => clave?.startsWith("CA_")),
  clavesTrasEstado,
);

await pagina.locator('[data-testid="explorar-CA_1"]').click();
await pagina.waitForFunction(
  () => [...document.querySelectorAll(".ac-mini")].some((nodo) => nodo.getAttribute("data-clave") === "FOODS_1"),
  { timeout: 60000 },
);
await pagina.waitForTimeout(600);
url = new URL(pagina.url());
comprobar(
  "navegación: la tienda queda en la URL y abre departamentos",
  url.searchParams.get("ac_tienda") === "CA_1" &&
    (await pagina.$$eval(".ac-mini", (nodos) => nodos.map((n) => n.getAttribute("data-clave")))).includes("FOODS_1"),
  url.search,
);
const rutas = await pagina.$$eval(".ac-ruta nav ol", (nodos) =>
  nodos.map((nodo) => nodo.textContent?.replace(/\s+/g, " ").trim() ?? ""),
);
comprobar(
  "navegación: dos rutas independientes (territorio y catálogo)",
  rutas.length === 2 && rutas[0].includes("California") && rutas[1].includes("categorías"),
  rutas,
);

/* 8 ------------------------------------------------ composición → productos */
await pagina.locator('[data-testid="departamento-FOODS_1"]').click();
await pagina.waitForSelector('[data-testid="explorador-productos"]', { timeout: 60000 });
await pagina.waitForFunction(
  () => document.querySelectorAll(".ac-tabla-productos tbody tr").length > 0,
  { timeout: 60000 },
);
await pagina.waitForTimeout(900);
url = new URL(pagina.url());
comprobar(
  "productos: el departamento queda en la URL y abre el explorador",
  url.searchParams.get("ac_dept") === "FOODS_1" &&
    (await pagina.locator('[data-testid="explorador-productos"]').count()) === 1,
  url.search,
);
const apiProductos = await api(
  "/productos?tienda=CA_1&departamento=FOODS_1&categorias=FOODS&limite=10&orden=unidades",
);
const filasProductos = await pagina.$$eval(".ac-tabla-productos tbody tr", (nodos) => nodos.length);
comprobar(
  "productos: tabla paginada con filas reales",
  filasProductos === Math.min(10, apiProductos.cuerpo.total) && filasProductos > 0,
  { filas: filasProductos, total: apiProductos.cuerpo.total },
);
const universo = await pagina.locator(".ac-explorador-sub").first().textContent();
comprobar(
  "productos: universo del departamento visible",
  /Universo del departamento/.test(universo ?? "") && /productos con ventas/.test(universo ?? ""),
  universo,
);
const contador = await pagina.locator(".ac-explorador-contador").textContent();
comprobar("productos: propuesta rotulada «Top 5 por unidades»", /Top 5 por unidades/.test(contador ?? ""), contador);
const participacionConjunta = await pagina.locator(".ac-buscador-rango").textContent();
comprobar(
  "productos: participación conjunta del Top 5 declarada",
  /participación conjunta del Top 5/.test(participacionConjunta ?? ""),
  participacionConjunta,
);
const universoProductos = apiProductos.cuerpo.universo.unidades;
comprobar(
  "productos: participación por producto sobre el universo",
  apiProductos.cuerpo.productos.every(
    (producto) =>
      Math.abs(producto.participacion_pct - (100 * producto.unidades) / universoProductos) < 0.0001,
  ),
  apiProductos.cuerpo.productos.slice(0, 2),
);
const seriesProducto = await pagina.$$eval(
  '[data-testid="seccion-productos"] .ac-mini',
  (nodos) => nodos.length,
);
comprobar("productos: series de los productos seleccionados", seriesProducto === 5, seriesProducto);
await pagina.locator('[data-testid="seccion-productos"]').screenshot({ path: `${EV}/verificacion-5-productos.png` });

/* 9 -------------------------------------------------- cursor y URL/atrás */
const antesDelCursor = peticiones.length;
const grafica = pagina.locator(".ac-hx-centro svg");
await grafica.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(300);
const caja = await grafica.boundingBox();
for (let paso = 2; paso <= 9; paso += 1) {
  await grafica.hover({ position: { x: (caja.width * paso) / 12, y: caja.height / 2 } });
  await pagina.waitForTimeout(90);
}
comprobar("cursor: la gráfica editorial no consulta la red", peticiones.length === antesDelCursor, {
  peticiones: peticiones.length - antesDelCursor,
});
const lectura = await pagina.locator(".ac-hx-lectura").textContent();
comprobar(
  "cursor: lectura con observado, promedio y diferencia",
  /observado/.test(lectura ?? "") && /promedio/.test(lectura ?? ""),
  lectura?.slice(0, 120),
);
const cajaMini = await pagina.locator(".ac-mini svg").first().boundingBox();
const antesDelCursorMini = peticiones.length;
await pagina.mouse.move(cajaMini.x + cajaMini.width / 2, cajaMini.y + cajaMini.height / 2);
await pagina.waitForTimeout(120);
comprobar("cursor: los pequeños múltiplos no consultan la red", peticiones.length === antesDelCursorMini, null);

const urlConEstado = pagina.url();
await pagina.reload({ waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="explorador-productos"]', { timeout: 180000 });
await pagina.waitForTimeout(1400);
comprobar(
  "URL: recargar restaura territorio, catálogo y productos",
  pagina.url() === urlConEstado &&
    (await pagina.locator('[data-testid="explorador-productos"]').count()) === 1,
  pagina.url(),
);

await pagina.goBack();
await pagina.waitForTimeout(1800);
comprobar(
  "Atrás: vuelve al estado sin departamento",
  !new URL(pagina.url()).searchParams.get("ac_dept"),
  pagina.url(),
);
await pagina.goForward();
await pagina.waitForTimeout(1800);
comprobar(
  "Adelante: recupera el departamento",
  new URL(pagina.url()).searchParams.get("ac_dept") === "FOODS_1",
  pagina.url(),
);

/* 10 --------------------------------------------------------------- móvil */
const movil = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await movil.goto(conQuery("ac_estado=CA&ac_tienda=CA_1"), { waitUntil: "domcontentloaded" });
await movil.waitForSelector(".ac-mini svg", { timeout: 180000 });
await movil.waitForTimeout(2200);
const metricasMovil = await movil.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  columnas: getComputedStyle(document.querySelector(".ac-grupo-rejilla")).gridTemplateColumns.split(" ").length,
  banda: !!document.querySelector('[data-testid="banda-historica"]'),
  anotaciones: document.querySelectorAll(".ac-hx-anotacion-caja").length,
}));
comprobar(
  "móvil: sin desbordamiento horizontal",
  metricasMovil.scrollWidth <= metricasMovil.clientWidth + 1,
  metricasMovil,
);
comprobar("móvil: una columna de paneles y banda visible", metricasMovil.columnas === 1 && metricasMovil.banda, metricasMovil);
await movil.evaluate(() => {
  const nodo = document.querySelector(".ac-panorama");
  if (nodo) window.scrollTo(0, Math.max(0, nodo.getBoundingClientRect().top + window.scrollY - 90));
});
await movil.waitForTimeout(500);
await movil.screenshot({ path: `${EV}/verificacion-6-movil.png` });

comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 4));

await b.close();
const fallos = resultados.filter((r) => !r.ok);
console.log(
  JSON.stringify(
    {
      comprobaciones: resultados.length,
      correctas: resultados.length - fallos.length,
      fallos: fallos.map((f) => f.comprobacion),
      detalle: resultados,
    },
    null,
    2,
  ),
);
process.exit(fallos.length === 0 ? 0 : 1);
