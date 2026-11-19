/**
 * Consistencia visual de pestañas, selectores y filtros del Atlas.
 *
 * Comprueba: cápsula grafito deslizante e independiente por selector, duración
 * 180–240 ms, misma altura/radio/tipografía, controles alineados a la derecha en la
 * cabecera de cada tarjeta con 12 px de separación, filtros repartidos a lo ancho y
 * popovers opacos. También que los valores y el estado se conservan.
 */
import { chromium } from "@playwright/test";

const URL = "http://127.0.0.1:8000/#/area/dashboards/atlas-vial";
const EV = "evidencias/atlas";

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 2 });
await pagina.goto(URL, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await pagina.getByRole("tab", { name: /Personas y veh/i }).first().click();
await pagina.waitForSelector("[data-testid=panel-burbujas] [data-nodo]", { timeout: 60000 });
await pagina.waitForTimeout(1600);

const informe = {};

/* --- 1. Cápsulas: una por selector, independientes y con 200 ms ------------- */
const capsulas = () =>
  pagina.evaluate(() =>
    [...document.querySelectorAll(".at-segmentado[data-con-capsula]")].map((s) => {
      const cap = s.querySelector(".at-seg-capsula");
      const estilo = getComputedStyle(cap);
      const caja = cap.getBoundingClientRect();
      const activo = s.querySelector(".at-seg.is-activa").getBoundingClientRect();
      const sCaja = s.getBoundingClientRect();
      return {
        id: cap.getAttribute("data-capsula"),
        etiqueta: s.getAttribute("aria-label"),
        activa: s.querySelector(".at-seg.is-activa").textContent.trim(),
        fondo: estilo.backgroundColor,
        duracion: estilo.transitionDuration,
        coincide: Math.abs(caja.left - activo.left) < 1.5 && Math.abs(caja.width - activo.width) < 1.5,
        fundidoVisible: estilo.opacity !== "0",
        altoCapsula: Math.round(caja.height),
        altoBoton: Math.round(activo.height),
        altoContenedor: Math.round(sCaja.height),
        radioContenedor: getComputedStyle(s).borderRadius,
        radioCapsula: estilo.borderRadius,
        fondoContenedor: getComputedStyle(s).backgroundColor,
        colorActivo: getComputedStyle(s.querySelector(".at-seg.is-activa")).color,
        colorInactivo: getComputedStyle(s.querySelector(".at-seg:not(.is-activa)")).color,
        fuente: getComputedStyle(s.querySelector(".at-seg")).fontSize,
      };
    }),
  );
informe.capsulas = await capsulas();

/* Independencia: mover la agrupación no debe mover la cápsula de la métrica. */
const antes = informe.capsulas;
await pagina.getByRole("button", { name: "Por sexo", exact: true }).click();
await pagina.waitForTimeout(400);
const despues = await capsulas();
informe.independencia = {
  metricasIguales: antes
    .filter((c) => c.etiqueta?.includes("Métrica"))
    .map((c) => c.activa)
    .join() === despues.filter((c) => c.etiqueta?.includes("Métrica")).map((c) => c.activa).join(),
  agrupacionCambio: antes.some((c) => c.etiqueta?.includes("Agrupación") && c.activa === "Conjunto")
    && despues.some((c) => c.etiqueta?.includes("Agrupación") && c.activa === "Por sexo"),
  idsDistintos: new Set(despues.map((c) => c.id)).size === despues.length,
};
await pagina.getByRole("button", { name: "Conjunto", exact: true }).click();
await pagina.waitForTimeout(300);

/* --- 2. Alineación en las cabeceras ---------------------------------------- */
informe.alineacion = await pagina.evaluate(() => {
  const datos = {};
  for (const testid of ["panel-burbujas", "panel-vehiculos"]) {
    const panel = document.querySelector(`[data-testid=${testid}]`);
    const cab = panel.querySelector(".at-tl-cab");
    const texto = cab.querySelector(".at-tl-cab-texto");
    const controles = cab.querySelectorAll(".at-tl-controles .at-segmentado");
    const cajas = [...controles].map((c) => c.getBoundingClientRect());
    const textoCaja = texto.getBoundingClientRect();
    const cabCaja = cab.getBoundingClientRect();
    const distintoNivel = cajas.map((c) => Math.round(c.top + c.height / 2));
    datos[testid] = {
      controles: cajas.length,
      tituloIzquierda: textoCaja.left < cajas[0].left,
      mismosSelectoresEnFila: new Set(cajas.map((c) => Math.round(c.top))).size === 1,
      centradoVerticalCompartido:
        new Set(distintoNivel).size === 1 &&
        Math.abs(distintoNivel[0] - Math.round(cabCaja.top + cabCaja.height / 2)) <= 8,
      separacion: cajas.length === 2 ? Math.round(cajas[1].left - cajas[0].right) : null,
      derechaDelPanel: Math.round(cajas[cajas.length - 1].right) === Math.round(cabCaja.right),
    };
  }
  return datos;
});

/* --- 3. Filtros: reparto del ancho y popover opaco -------------------------- */
await pagina.evaluate(() => window.scrollTo(0, 0));
await pagina.waitForTimeout(700);
if ((await pagina.locator(".at-banda-controles").count()) === 0) {
  const editar = pagina.getByRole("button", { name: /Editar filtros/i });
  if (await editar.count()) {
    await editar.first().click();
    await pagina.waitForTimeout(900);
  }
}
informe.filtros = await pagina.evaluate(() => {
  const controles = [...document.querySelectorAll(".at-filtros .at-ctrl, .at-filtros .at-banda-mas")];
  const cajas = controles.map((c) => c.getBoundingClientRect());
  const contenedor = document.querySelector(".at-banda-controles").getBoundingClientRect();
  const anchos = cajas.map((c) => Math.round(c.width));
  const huecos = [];
  for (let i = 1; i < cajas.length; i += 1) huecos.push(Math.round(cajas[i].left - cajas[i - 1].right));
  return {
    controles: cajas.length,
    anchos,
    anchosUniformes: new Set(anchos).size === 1,
    huecos,
    huecosUniformes: new Set(huecos).size <= 1,
    cubreAncho: Math.round(cajas[0].left) === Math.round(contenedor.left) &&
      Math.round(cajas[cajas.length - 1].right) === Math.round(contenedor.right),
    fondo: getComputedStyle(controles[0]).backgroundColor,
    borde: getComputedStyle(controles[0]).borderColor,
    radio: getComputedStyle(controles[0]).borderRadius,
    alto: Math.round(cajas[0].height),
  };
});

await pagina.locator("[data-testid=ctrl-alcaldias]").click();
await pagina.waitForSelector(".atf-panel", { timeout: 15000 });
await pagina.waitForTimeout(350);
informe.popover = await pagina.evaluate(() => {
  const panel = document.querySelector(".atf-panel");
  const caja = panel.getBoundingClientRect();
  const estilo = getComputedStyle(panel);
  return {
    fondo: estilo.backgroundColor,
    opacidad: estilo.opacity,
    borde: estilo.borderColor,
    sombra: estilo.boxShadow !== "none",
    dentroDelViewport:
      caja.top >= 0 && caja.left >= 0 && caja.bottom <= window.innerHeight + 1 && caja.right <= window.innerWidth + 1,
    fondoOpaco: estilo.backgroundColor === "rgb(255, 255, 255)" && estilo.opacity === "1",
  };
});
await pagina.screenshot({ path: `${EV}/tabs-filtros-popover.png`, clip: { x: 0, y: 0, width: 1240, height: 520 } });
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(300);

/* --- 3b. Pestañas de vista: misma cápsula grafito y 220 ms ------------------ */
informe.tabs = await pagina.evaluate(() => {
  const nav = document.querySelector(".wm-tabs");
  const indicador = document.querySelector(".wm-tabs-indicador");
  const activo = document.querySelector(".wm-tab.is-activa");
  const inactivo = document.querySelector(".wm-tab:not(.is-activa)");
  const iCaja = indicador.getBoundingClientRect();
  const aCaja = activo.getBoundingClientRect();
  return {
    existe: Boolean(nav),
    fondoNav: getComputedStyle(nav).backgroundColor,
    fondoIndicador: getComputedStyle(indicador).backgroundColor,
    colorActivo: getComputedStyle(activo).color,
    colorInactivo: getComputedStyle(inactivo).color,
    duracion: getComputedStyle(indicador).transitionDuration,
    radioNav: getComputedStyle(nav).borderRadius,
    indicadorCubreActiva: Math.abs(iCaja.left - aCaja.left) < 1.5 && Math.abs(iCaja.width - aCaja.width) < 1.5,
    alto: Math.round(nav.getBoundingClientRect().height),
    fuente: getComputedStyle(activo).fontSize,
  };
});

informe.semantica = await pagina.evaluate(() => {
  const nav = document.querySelector(".wm-tabs");
  const seg = document.querySelector(".at-segmentado[data-con-capsula]");
  return {
    tabsRole: nav.getAttribute("role"),
    tabsBotones: [...nav.querySelectorAll(".wm-tab")].map((b) => ({
      role: b.getAttribute("role"),
      seleccionado: b.getAttribute("aria-selected"),
      actual: b.getAttribute("aria-current"),
    })),
    grupoRole: seg.getAttribute("role"),
    segmentados: [...seg.querySelectorAll(".at-seg")].map((b) => b.getAttribute("aria-pressed")),
    etiquetas: seg.getAttribute("aria-label"),
  };
});
await pagina.evaluate(() => {
  const app = document.querySelector(".at-head-nav");
  if (app) window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 12));
});
await pagina.waitForTimeout(600);
await pagina.screenshot({ path: `${EV}/tabs-nav.png`, clip: { x: 0, y: 0, width: 1240, height: 260 } });
await pagina.evaluate(() => {
  const banda = document.querySelector(".at-filtros");
  if (banda) window.scrollTo(0, Math.max(0, banda.getBoundingClientRect().top + window.scrollY - 12));
});
await pagina.waitForTimeout(500);
await pagina.screenshot({ path: `${EV}/filtros-barra.png`, clip: { x: 0, y: 0, width: 1240, height: 300 } });

/* --- 4. Estado conservado --------------------------------------------------- */
const estado = {};
await pagina.getByRole("button", { name: "Lesionadas", exact: true }).first().click();
await pagina.waitForTimeout(900);
estado.metrica = await pagina.evaluate(() => {
  const burbujas = document.querySelector("[data-testid=panel-burbujas]");
  return {
    activa: [...burbujas.querySelectorAll(".at-seg.is-activa")].map((b) => b.textContent.trim())[0],
    nodos: burbujas.querySelectorAll("g[data-nodo]").length,
  };
});
estado.cabeceraVehiculos = await pagina.evaluate(() => {
  const veh = document.querySelector("[data-testid=panel-vehiculos]");
  return [...veh.querySelectorAll(".at-seg.is-activa")].map((b) => b.textContent.trim());
});
await pagina.getByRole("button", { name: "Hechos", exact: true }).first().click();
await pagina.waitForTimeout(800);
informe.estado = estado;

/* --- 5. Móvil -------------------------------------------------------------- */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(URL, { waitUntil: "domcontentloaded" });
await movil.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await movil.getByRole("tab", { name: /Personas y veh/i }).first().click();
await movil.waitForSelector("[data-testid=panel-burbujas] [data-nodo]", { timeout: 60000 });
await movil.waitForTimeout(1600);
const y = await movil.evaluate(
  () => Math.max(0, document.querySelector("[data-testid=panel-burbujas]").getBoundingClientRect().top + window.scrollY - 96),
);
await movil.evaluate((d) => window.scrollTo(0, d), y);
await movil.waitForTimeout(400);
await movil.mouse.move(2, 2);
await movil.waitForTimeout(200);
await movil.screenshot({ path: `${EV}/tabs-filtros-movil.png` });
informe.movil = await movil.evaluate(() => {
  const panel = document.querySelector("[data-testid=panel-burbujas]");
  const controles = [...panel.querySelectorAll(".at-tl-controles .at-segmentado")].map((c) => {
    const r = c.getBoundingClientRect();
    const cab = panel.querySelector(".at-tl-cab").getBoundingClientRect();
    return {
      dentro: r.left >= cab.left - 1 && r.right <= cab.right + 1,
      ancho: Math.round(r.width),
      alto: Math.round(r.height),
    };
  });
  return {
    scrollWidth: document.documentElement.scrollWidth,
    controles,
    sinDesborde: document.documentElement.scrollWidth <= 390,
  };
});

/* --- 6. Movimiento reducido ------------------------------------------------ */
const contexto = await navegador.newContext({ reducedMotion: "reduce", viewport: { width: 1100, height: 900 } });
const reducida = await contexto.newPage();
await reducida.goto(URL, { waitUntil: "domcontentloaded" });
await reducida.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await reducida.getByRole("tab", { name: /Personas y veh/i }).first().click();
await reducida.waitForSelector(".at-seg-capsula", { timeout: 60000 });
await reducida.waitForTimeout(1200);
informe.movimientoReducido = await reducida.evaluate(() => ({
  capsula: getComputedStyle(document.querySelector(".at-seg-capsula")).transitionDuration,
  indicadorNav: getComputedStyle(document.querySelector(".wm-tabs-indicador")).transitionDuration,
}));
await contexto.close();

await pagina.mouse.move(2, 2);
await pagina.waitForTimeout(300);
await pagina.locator("[data-testid=panel-burbujas]").screenshot({ path: `${EV}/tabs-filtros-escritorio.png` });
await pagina.screenshot({ path: `${EV}/tabs-filtros-pagina.png`, clip: { x: 0, y: 0, width: 1240, height: 460 } });

console.log(JSON.stringify(informe, null, 1));
await navegador.close();
