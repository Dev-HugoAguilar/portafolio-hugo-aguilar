/**
 * «Una categoría, tres lecturas»: comprueba que las tres columnas ocupan todo el
 * ancho disponible de la tarjeta y que los conectores siguen alineados.
 */
import { chromium } from "@playwright/test";

const URL = "http://127.0.0.1:8000/#/area/dashboards/atlas-vial";
const PANEL = "[data-testid=panel-posiciones]";
const EV = "evidencias/personas";

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 2 });
await pagina.goto(URL, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await pagina.getByRole("tab", { name: /Personas y veh/i }).first().click();
await pagina.waitForSelector(`${PANEL} .at-pos-pildora`, { timeout: 60000 });
await pagina.waitForTimeout(1600);
const panel = pagina.locator(PANEL);
await panel.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(400);

const medir = () =>
  pagina.evaluate((sel) => {
    const panel = document.querySelector(sel);
    const cont = panel.querySelector(".at-pos");
    const lienzo = panel.querySelector(".at-pos-lienzo");
    const caja = panel.getBoundingClientRect();
    const cs = getComputedStyle(panel);
    const contenido = caja.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const columnas = [...panel.querySelectorAll(".at-pos-columna")].map((c) => Math.round(c.getBoundingClientRect().width));
    const lienzoCaja = lienzo.getBoundingClientRect();
    const pill = panel.querySelector(".at-pos-pildora").getBoundingClientRect();
    const cabecera = panel.querySelector(".at-pos-cabecera").getBoundingClientRect();
    return {
      contenido: Math.round(contenido),
      lienzo: Math.round(lienzoCaja.width),
      columnas,
      margenIzquierdo: Math.round(lienzoCaja.left - caja.left - parseFloat(cs.paddingLeft)),
      margenDerecho: Math.round(caja.right - parseFloat(cs.paddingRight) - lienzoCaja.right),
      pillAncho: Math.round(pill.width),
      cabeceraAncho: Math.round(cabecera.width),
      scrollInterno: cont.scrollWidth,
    };
  }, PANEL);

const escritorio = await medir();
await panel.screenshot({ path: `${EV}/posiciones-escritorio.png` });

/* Conectores: el extremo debe caer en el borde de la píldora de su columna. */
const conectores = await pagina.evaluate((sel) => {
  const panel = document.querySelector(sel);
  const lineas = [...panel.querySelectorAll(".at-pos-lineas line")];
  const cols = [...panel.querySelectorAll(".at-pos-columna")].map((c) => {
    const pildoras = [...c.querySelectorAll(".at-pos-pildora")].map((p) => p.getBoundingClientRect());
    return { pildoras, caja: c.getBoundingClientRect() };
  });
  const lienzo = panel.querySelector(".at-pos-lienzo").getBoundingClientRect();
  const desalineados = lineas.filter((linea) => {
    const x1 = Number(linea.getAttribute("x1")) + lienzo.left;
    const x2 = Number(linea.getAttribute("x2")) + lienzo.left;
    const y1 = Number(linea.getAttribute("y1")) + lienzo.top;
    const y2 = Number(linea.getAttribute("y2")) + lienzo.top;
    const cerca = (x, y) =>
      cols.some((col) => col.pildoras.some((p) => Math.abs(y - (p.top + p.height / 2)) < 1.5 && x >= p.left - 4 && x <= p.right + 4));
    return !(cerca(x1, y1) && cerca(x2, y2));
  }).length;
  return { lineas: lineas.length, desalineados };
}, PANEL);

/* Hover: la conexión de la categoría se resalta. */
await pagina.locator(`${PANEL} .at-pos-pildora`).first().hover();
await pagina.waitForTimeout(400);
const resaltado = await pagina.evaluate((sel) => {
  const panel = document.querySelector(sel);
  const activas = panel.querySelectorAll(".at-pos-pildora.is-activa").length;
  const azules = [...panel.querySelectorAll(".at-pos-lineas line")].filter(
    (l) => getComputedStyle(l).stroke === "rgb(52, 88, 245)",
  ).length;
  return { pildorasActivas: activas, conexionesResaltadas: azules };
}, PANEL);
await panel.screenshot({ path: `${EV}/posiciones-hover.png` });
await pagina.mouse.move(2, 2);

/* Móvil. */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(URL, { waitUntil: "domcontentloaded" });
await movil.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await movil.getByRole("tab", { name: /Personas y veh/i }).first().click();
await movil.waitForSelector(`${PANEL} .at-pos-pildora`, { timeout: 60000 });
await movil.waitForTimeout(1500);
const y = await movil.evaluate(
  (sel) => Math.max(0, document.querySelector(sel).getBoundingClientRect().top + window.scrollY - 96),
  PANEL,
);
await movil.evaluate((d) => window.scrollTo(0, d), y);
await movil.waitForTimeout(400);
await movil.screenshot({ path: `${EV}/posiciones-movil.png` });
const movilInfo = await movil.evaluate((sel) => {
  const panel = document.querySelector(sel);
  const cont = panel.querySelector(".at-pos");
  const lienzo = panel.querySelector(".at-pos-lienzo");
  return {
    scrollWidth: document.documentElement.scrollWidth,
    lienzo: Math.round(lienzo.getBoundingClientRect().width),
    scrollInterno: cont.scrollWidth,
    contenedor: Math.round(cont.getBoundingClientRect().width),
    columnas: [...panel.querySelectorAll(".at-pos-columna")].map((c) => Math.round(c.getBoundingClientRect().width)),
  };
}, PANEL);

console.log(
  JSON.stringify(
    { escritorio, conectores, resaltado, movil: movilInfo, capturas: [`${EV}/posiciones-escritorio.png`, `${EV}/posiciones-hover.png`, `${EV}/posiciones-movil.png`] },
    null,
    1,
  ),
);
await navegador.close();
