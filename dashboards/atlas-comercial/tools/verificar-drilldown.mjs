/**
 * Verificación de datos de la exploración tiendas → departamentos → productos,
 * adaptada a la pantalla con territorio y catálogo separados.
 *
 * Cubre lo que no cubre `verificar-territorio.mjs`: reconciliación de departamentos
 * contra la tienda, de productos contra sus bloques, búsqueda paginada, selección
 * explícita, periodos cortos y ausencia de consultas por cursor.
 */
import { chromium } from "@playwright/test";

const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const conQuery = (query) => `http://127.0.0.1:8000/?ac_pantalla=exploracion${query ? `&${query}` : ""}${HASH}`;
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";
const EV = "../../evidencias/comercial";

const numero = (texto) => Number(String(texto).replace(/[^\d-]/g, ""));
const resultados = [];
const comprobar = (nombre, condicion, detalle) => {
  resultados.push({ comprobacion: nombre, ok: Boolean(condicion), detalle });
  if (!condicion) console.log(`FALLO: ${nombre} · ${JSON.stringify(detalle)}`);
  return Boolean(condicion);
};

const b = await chromium.launch();
const pagina = await b.newPage({ viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 2 });
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

const paneles = () =>
  pagina.$$eval(".ac-grupo-rejilla .ac-mini", (nodos) =>
    nodos.map((nodo) => ({
      clave: nodo.getAttribute("data-clave"),
      total: nodo.querySelector(".ac-mini-total")?.textContent ?? "",
    })),
  );

/* --------------------------------------------------- departamentos de CA_1 */
await pagina.goto(conQuery("ac_estado=CA&ac_tienda=CA_1"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('.ac-mini[data-clave="FOODS_1"] svg', { timeout: 180000 });
await pagina.waitForTimeout(1200);

const dept = await paneles();
comprobar("CA_1: siete departamentos", dept.length === 7, dept.map((p) => p.clave));
const ruta = await pagina.locator('[data-testid="ruta-territorio"]').textContent();
comprobar(
  "CA_1: la ruta de territorio lo declara",
  /California/.test(ruta ?? "") && /CA_1/.test(ruta ?? ""),
  ruta?.replace(/\s+/g, " "),
);

const apiDept = await api("/pulso?nivel=departamento&tienda=CA_1&agregacion=semana");
const apiTienda = await api("/pulso?tiendas=CA_1&agregacion=semana");
const sumaDom = dept.reduce((total, panel) => total + numero(panel.total), 0);
comprobar("CA_1: DOM = suma de departamentos de la API", sumaDom === apiDept.cuerpo.resumen.total, {
  dom: sumaDom,
  api: apiDept.cuerpo.resumen.total,
});
comprobar(
  "CA_1: suma de departamentos = total de la tienda",
  apiDept.cuerpo.resumen.total === apiTienda.cuerpo.resumen.total,
  { departamentos: apiDept.cuerpo.resumen.total, tienda: apiTienda.cuerpo.resumen.total },
);
comprobar(
  "CA_1: concentración reconcilia con el resumen",
  apiDept.cuerpo.concentracion.total === apiDept.cuerpo.resumen.total,
  null,
);
const serieApi = new Map(apiDept.cuerpo.series.map((serie) => [serie.clave, serie.total]));
comprobar(
  "CA_1: cada total del DOM coincide con la API",
  dept.every((panel) => numero(panel.total) === serieApi.get(panel.clave)),
  dept.filter((panel) => numero(panel.total) !== serieApi.get(panel.clave)),
);

/* Filtro de categorías al descender. */
const hobbies = await api("/pulso?nivel=departamento&tienda=CA_1&categorias=HOBBIES&agregacion=semana");
comprobar(
  "categorías: HOBBIES solo trae sus departamentos",
  hobbies.cuerpo.series.length === 2 &&
    hobbies.cuerpo.series.every((serie) => serie.clave.startsWith("HOBBIES")),
  hobbies.cuerpo.series.map((serie) => serie.clave),
);

/* --------------------------------------------------- productos de FOODS_1 */
await pagina.locator('[data-testid="departamento-FOODS_1"]').click();
await pagina.waitForSelector('[data-testid="seccion-productos"]', { timeout: 60000 });
await pagina.waitForFunction(
  () => document.querySelectorAll('[data-testid="seccion-productos"] .ac-mini').length === 5,
  { timeout: 60000 },
);
await pagina.waitForTimeout(900);

const productos = await pagina.$$eval('[data-testid="seccion-productos"] .ac-mini', (nodos) =>
  nodos.map((nodo) => ({
    clave: nodo.getAttribute("data-clave"),
    total: nodo.querySelector(".ac-mini-total")?.textContent ?? "",
  })),
);
comprobar("FOODS_1: cinco series de producto", productos.length === 5, productos.map((p) => p.clave));
comprobar(
  "FOODS_1: selección automática rotulada «Top 5 por unidades»",
  /Top 5 por unidades/.test((await pagina.locator(".ac-explorador-contador").textContent()) ?? ""),
  null,
);

const apiProductos = await api("/pulso?nivel=producto&tienda=CA_1&departamento=FOODS_1&agregacion=semana");
const serieProductos = new Map(
  apiProductos.cuerpo.series.map((serie) => [serie.clave, serie.total]),
);
comprobar(
  "FOODS_1: cada serie coincide con la API de producto",
  productos.every((panel) => numero(panel.total) === serieProductos.get(panel.clave)),
  productos,
);
comprobar(
  "FOODS_1: departamento distinto de la selección y participación calculada",
  apiProductos.cuerpo.resumen.total_contexto > apiProductos.cuerpo.resumen.total_seleccion &&
    apiProductos.cuerpo.resumen.participacion_pct > 0,
  {
    contexto: apiProductos.cuerpo.resumen.total_contexto,
    seleccion: apiProductos.cuerpo.resumen.total_seleccion,
    participacion: apiProductos.cuerpo.resumen.participacion_pct,
  },
);
const notaProductos = await pagina.locator('[data-testid="seccion-productos"] .ac-nota').first().textContent();
comprobar(
  "FOODS_1: el total del departamento se declara aparte",
  /del departamento/.test(notaProductos ?? "") && /no es el total del departamento/.test(notaProductos ?? ""),
  notaProductos?.replace(/\s+/g, " ").slice(0, 140),
);

/* --------------------------------------------- búsqueda y selección explícita */
const filas = await pagina.$$eval(".ac-tabla-productos tbody tr", (nodos) => nodos.length);
comprobar("tabla: página de 10 filas", filas === 10, filas);
await pagina.locator(".ac-campo--texto input").fill("FOODS_1_01");
await pagina.waitForTimeout(1000);
const filtradas = await pagina.$$eval(".ac-tabla-id", (nodos) => nodos.map((n) => n.textContent));
comprobar(
  "buscador: filtra por identificador real",
  filtradas.length > 0 && filtradas.every((id) => id?.includes("FOODS_1_01")),
  filtradas.slice(0, 5),
);
await pagina.locator(".ac-campo--texto input").fill("");
await pagina.waitForTimeout(1000);

comprobar(
  "selección: el Top 5 aparece marcado en la tabla",
  (await pagina.locator(".ac-tabla-productos tbody tr input[type=checkbox]:checked").count()) === 5,
  null,
);
comprobar(
  "selección: al llegar a cinco, las demás casillas quedan deshabilitadas",
  (await pagina.locator(".ac-tabla-productos tbody tr input[type=checkbox]:disabled").count()) >= 5,
  null,
);
await pagina.locator(".ac-tabla-productos tbody tr input[type=checkbox]:checked").first().uncheck();
await pagina.waitForFunction(
  () => document.querySelectorAll('[data-testid="seccion-productos"] .ac-mini').length === 4,
  { timeout: 60000 },
);
await pagina.waitForTimeout(500);
comprobar(
  "selección: quitar un producto deja cuatro series y libera el límite",
  (await pagina.locator(".ac-tabla-productos tbody tr input[type=checkbox]:disabled").count()) === 0 &&
    /4 de 5 seleccionados/.test((await pagina.locator(".ac-explorador-contador").textContent()) ?? ""),
  (await pagina.locator(".ac-explorador-contador").textContent()) ?? "",
);

/* ------------------------------------------------------ cursor y periodos */
const antesDelCursor = peticiones.length;
const mini = pagina.locator('[data-testid="seccion-productos"] .ac-mini svg').first();
await mini.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(250);
const caja = await mini.boundingBox();
for (let paso = 2; paso <= 7; paso += 1) {
  await mini.hover({ position: { x: (caja.width * paso) / 9, y: caja.height / 2 } });
  await pagina.waitForTimeout(80);
}
comprobar(
  "cursor: mover sobre las series no consulta la red",
  peticiones.length === antesDelCursor,
  peticiones.length - antesDelCursor,
);

const corto = await api("/pulso?tiendas=CA_1&desde=2011-01-29&hasta=2011-12-31&agregacion=semana");
comprobar(
  "periodo corto: la concentración no falla y reconcilia",
  corto.estado === 200 && corto.cuerpo.concentracion.total === corto.cuerpo.resumen.total,
  { estado: corto.estado, total: corto.cuerpo?.resumen?.total },
);
const unDia = await api(
  "/pulso?nivel=producto&tienda=CA_1&departamento=FOODS_3&desde=2011-01-29&hasta=2011-01-29&agregacion=semana",
);
comprobar(
  "un solo día en nivel producto: responde y reconcilia",
  unDia.estado === 200 && unDia.cuerpo.resumen.total === unDia.cuerpo.concentracion.total,
  { estado: unDia.estado, total: unDia.cuerpo?.resumen?.total },
);

/* ------------------------------------------------------------- Escape */
const desplegable = pagina.getByRole("button", { name: /Comparar periodos/ }).first();
await desplegable.click();
await pagina.waitForSelector('.ac-pop[role="dialog"]', { timeout: 20000 });
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(400);
comprobar(
  "Escape: cierra el desplegable sin cambiar de nivel",
  (await pagina.locator('.ac-pop[role="dialog"]').count()) === 0 &&
    (await pagina.locator('[data-testid="seccion-productos"]').count()) === 1,
  null,
);
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(1000);
comprobar(
  "Escape: después cierra el detalle de productos y conserva la tienda",
  (await pagina.locator('[data-testid="seccion-productos"]').count()) === 0 &&
    new URL(pagina.url()).searchParams.get("ac_tienda") === "CA_1",
  pagina.url(),
);

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
