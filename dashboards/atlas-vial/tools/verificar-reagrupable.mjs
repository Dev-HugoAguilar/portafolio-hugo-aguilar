/**
 * Verifica la composición y el acabado de «Edad y sexo de la persona principal»:
 * empaquetado circular compacto, escala de área única, mismas posiciones relativas
 * al reagrupar, sin solapes, tooltip junto al nodo, arrastre con reorganización,
 * filtros con pocas categorías y una sola, métricas, móvil y movimiento reducido.
 */
import { chromium } from "@playwright/test";

const API = "http://127.0.0.1:8010/api/v1/atlas-vial";
const URL = "http://127.0.0.1:8000/#/area/dashboards/atlas-vial";
const EV = "evidencias/personas";
const PANEL = "[data-testid=panel-burbujas]";

const datos = await (await fetch(`${API}/personas`)).json();
const cruce = datos.cruce_edad_sexo;
const esperados = [];
for (const grupo of cruce.grupos) {
  for (const celda of grupo.celdas) {
    esperados.push({
      clave: `${celda.etiqueta}|${grupo.sexo}`,
      edad: celda.etiqueta,
      sexo: grupo.sexo,
      hechos: celda.hechos,
      lesionadas: celda.lesionadas,
      fallecidas: celda.fallecidas,
    });
  }
}
const sumaAPI = (k) => esperados.reduce((total, n) => total + n[k], 0);

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 2 });
const peticiones = [];
pagina.on("request", (p) => peticiones.push(p.url()));

await pagina.goto(URL, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await pagina.getByRole("tab", { name: /Personas y veh/i }).first().click();
await pagina.waitForSelector(`${PANEL} [data-nodo]`, { timeout: 60000 });
await pagina.waitForTimeout(1500);

const panel = pagina.locator(PANEL);
await panel.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(300);

const leer = () =>
  pagina.evaluate((sel) => {
    const panel = document.querySelector(sel);
    const svg = panel.querySelector(".at-nr-region svg");
    const region = panel.querySelector(".at-nr-region").getBoundingClientRect();
    const nodos = [...svg.querySelectorAll("g[data-nodo]")].map((g) => {
      const circulo = g.querySelector("circle");
      const matriz = new DOMMatrix(getComputedStyle(g).transform);
      const textos = [...g.querySelectorAll("text")].map((t) => t.textContent.trim());
      return {
        clave: g.getAttribute("data-nodo"),
        r: Number(circulo.getAttribute("r")),
        fill: getComputedStyle(circulo).fill,
        stroke: getComputedStyle(circulo).stroke,
        x: matriz.m41,
        y: matriz.m42,
        textos,
      };
    });
    const externas = [...svg.querySelectorAll(":scope > text")].map((t) => t.textContent.trim());
    return {
      nodos,
      externas,
      region: { x: region.x, y: region.y, w: Math.round(region.width), h: Math.round(region.height) },
      canvas: { w: Number(svg.getAttribute("width")), h: Number(svg.getAttribute("height")) },
      etiquetasNodoRepetidas: nodos.filter((n) => new Set(n.textos).size !== n.textos.length).length,
      sinEtiqueta: nodos.filter((n) => n.textos.length === 0).length,
    };
  }, PANEL);

const solapes = (nodos) => {
  let choques = 0;
  let separacionMinima = Infinity;
  for (let i = 0; i < nodos.length; i += 1) {
    for (let j = i + 1; j < nodos.length; j += 1) {
      const hueco = Math.hypot(nodos[i].x - nodos[j].x, nodos[i].y - nodos[j].y) - nodos[i].r - nodos[j].r;
      separacionMinima = Math.min(separacionMinima, hueco);
      if (hueco < -0.5) choques += 1;
    }
  }
  return { choques, separacionMinima: Number.isFinite(separacionMinima) ? Number(separacionMinima.toFixed(2)) : null };
};

/** Métricas de composición: forma del conjunto, densidad y ausencia de filas. */
const composicion = (nodos) => {
  if (nodos.length === 0) return null;
  const minX = Math.min(...nodos.map((n) => n.x - n.r));
  const maxX = Math.max(...nodos.map((n) => n.x + n.r));
  const minY = Math.min(...nodos.map((n) => n.y - n.r));
  const maxY = Math.max(...nodos.map((n) => n.y + n.r));
  const ancho = maxX - minX;
  const alto = maxY - minY;
  const areaCirculos = nodos.reduce((suma, n) => suma + Math.PI * n.r * n.r, 0);
  let sumaHuecos = 0;
  let aislados = 0;
  for (const a of nodos) {
    let mejor = Infinity;
    for (const b of nodos) {
      if (a === b) continue;
      const hueco = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
      if (hueco < mejor) mejor = hueco;
    }
    if (Number.isFinite(mejor)) {
      sumaHuecos += mejor;
      if (mejor > 30) aislados += 1;
    }
  }
  const medioX = nodos.reduce((s, n) => s + n.x, 0) / nodos.length;
  const medioY = nodos.reduce((s, n) => s + n.y, 0) / nodos.length;
  const cov = nodos.reduce((s, n) => s + (n.x - medioX) * (n.r - 0), 0);
  const covY = nodos.reduce((s, n) => s + (n.y - medioY) * n.r, 0);
  const varX = Math.sqrt(nodos.reduce((s, n) => s + (n.x - medioX) ** 2, 0) / nodos.length);
  const varR = Math.sqrt(nodos.reduce((s, n) => s + (n.r - nodos.reduce((t, m) => t + m.r, 0) / nodos.length) ** 2, 0) / nodos.length);
  return {
    aspecto: Number((ancho / alto).toFixed(2)),
    ancho: Math.round(ancho),
    alto: Math.round(alto),
    relleno: Number((areaCirculos / (ancho * alto)).toFixed(2)),
    huecoMedio: Number((sumaHuecos / nodos.length).toFixed(1)),
    aislados,
    correlacionXRadio: Number((cov / (varX * varR * nodos.length) || 0).toFixed(2)),
    correlacionYRadio: Number((covY / (nodos.length * varX * varR) || 0).toFixed(2)),
    nivelesY: new Set(nodos.map((n) => Math.round(n.y / 6))).size,
  };
};

const informe = { api: { nodos: esperados.length, hechos: sumaAPI("hechos"), lesionadas: sumaAPI("lesionadas"), fallecidas: sumaAPI("fallecidas") } };
const capturas = [];

/* --- Tres agrupaciones ---------------------------------------------------- */
const vistas = {};
for (const [nombre, archivo] of [["Conjunto", "conjunto"], ["Por edad", "edad"], ["Por sexo", "sexo"]]) {
  await panel.getByRole("button", { name: nombre, exact: true }).click();
  await pagina.waitForTimeout(700);
  await pagina.mouse.move(2, 2);
  await pagina.waitForTimeout(250);
  vistas[nombre] = await leer();
  await panel.screenshot({ path: `${EV}/reagrupable-${archivo}.png` });
  capturas.push(`${EV}/reagrupable-${archivo}.png`);
}

const claves = Object.fromEntries(Object.entries(vistas).map(([v, d]) => [v, d.nodos.map((n) => n.clave).sort()]));
const mismosNodos = ["Por edad", "Por sexo"].every((v) => JSON.stringify(claves[v]) === JSON.stringify(claves.Conjunto));
const unicos = Object.fromEntries(Object.entries(vistas).map(([v, d]) => [v, new Set(d.nodos.map((n) => n.clave)).size === d.nodos.length]));
const radios = new Map();
for (const d of Object.values(vistas)) for (const n of d.nodos) {
  if (!radios.has(n.clave)) radios.set(n.clave, new Set());
  radios.get(n.clave).add(n.r.toFixed(3));
}
const radioInestable = [...radios.entries()].filter(([, s]) => s.size > 1).map(([c]) => c);
const porClave = new Map(esperados.map((n) => [n.clave, n.hechos]));
const ks = vistas.Conjunto.nodos.map((n) => n.r / Math.sqrt(porClave.get(n.clave)));
const kMin = Math.min(...ks);
const kMax = Math.max(...ks);

informe.reagrupacion = {
  nodosPorVista: Object.fromEntries(Object.entries(vistas).map(([v, d]) => [v, d.nodos.length])),
  unicos,
  mismosNodos,
  radioInestable: radioInestable.slice(0, 4),
  escala: { kMin: Number(kMin.toFixed(4)), kMax: Number(kMax.toFixed(4)), desvio: Number((kMax / kMin - 1).toFixed(4)) },
  solapes: Object.fromEntries(Object.entries(vistas).map(([v, d]) => [v, solapes(d.nodos)])),
  lienzo: Object.fromEntries(
    Object.entries(vistas).map(([v, d]) => [v, { canvas: d.canvas, region: d.region }]),
  ),
  composicion: Object.fromEntries(Object.entries(vistas).map(([v, d]) => [v, composicion(d.nodos)])),
  etiquetas: Object.fromEntries(
    Object.entries(vistas).map(([v, d]) => [v, { externas: d.externas, sinEtiqueta: d.sinEtiqueta, repetidas: d.etiquetasNodoRepetidas }]),
  ),
  rosaMujer: vistas["Por sexo"].nodos.filter((n) => n.clave.endsWith("|Mujer")).every((n) => n.fill === "rgb(236, 72, 153)"),
  contornoDistinto: vistas.Conjunto.nodos.every((n) => n.stroke !== "none" && n.stroke.replace(/[^0-9,]/g, "") !== n.fill.replace(/[^0-9,]/g, "")),
};

/* --- Columna explicativa, selectores y leyendas --------------------------- */
informe.tarjeta = await pagina.evaluate((sel) => {
  const panel = document.querySelector(sel);
  const guia = panel.querySelector(".at-nr-guia").getBoundingClientRect();
  const region = panel.querySelector(".at-nr-region").getBoundingClientRect();
  const svg = panel.querySelector(".at-nr-region svg").getBoundingClientRect();
  const controles = [...panel.querySelectorAll(".at-tl-controles .at-segmentado")].map((s) => {
    const c = s.getBoundingClientRect();
    return { top: Math.round(c.top), alto: Math.round(c.height), derecha: Math.round(c.right), izquierda: Math.round(c.left) };
  });
  const leyendas = [...panel.querySelectorAll(".at-nr-leyendas .at-nr-leyenda")].map((l) => {
    const c = l.getBoundingClientRect();
    return { clase: l.className, top: Math.round(c.top), derecha: Math.round(c.right), alto: Math.round(c.height) };
  });
  const tamano = panel.querySelector(".at-nr-leyenda--tamano")?.getBoundingClientRect();
  const sexo = panel.querySelector(".at-nr-leyenda--sexo")?.getBoundingClientRect();
  const itemsSexo = [...panel.querySelectorAll(".at-nr-leyenda--sexo .at-nr-leyenda-item")].map((i) => {
    const c = i.getBoundingClientRect();
    return { top: Math.round(c.top), left: Math.round(c.left), derecha: Math.round(c.right), texto: i.textContent.trim() };
  });
  const fuenteSexo = getComputedStyle(panel.querySelector(".at-nr-leyenda--sexo .at-nr-leyenda-item")).fontSize;
  return {
    guiaAncho: Math.round(guia.width),
    regionAlto: Math.round(region.height),
    dibujoAlto: Math.round(svg.height),
    selectoresMismaFila: new Set(controles.map((c) => c.top)).size === 1 && controles.length === 2,
    selectoresMismaAltura: new Set(controles.map((c) => c.alto)).size === 1,
    separacionEntreSelectores:
      controles.length === 2
        ? Math.round(Math.max(controles[0].izquierda, controles[1].izquierda) - Math.min(controles[0].derecha, controles[1].derecha))
        : null,
    alineadosDerecha:
      controles.length === 2 && Math.abs(controles[controles.length - 1].derecha - Math.round(panel.querySelector(".at-tl-cab").getBoundingClientRect().right)) <= 2,
    leyendasDebajoDelDibujo: Boolean(tamano) && tamano.top >= svg.bottom - 1,
    ordenLeyendas: leyendas.map((l) => (l.clase.includes("tamano") ? "tamano" : "sexo")),
    leyendasAlineadasDerecha: Boolean(sexo) && Math.abs(Math.round(sexo.right) - Math.round(region.right)) <= 2,
    sexoEnUnaFila: new Set(itemsSexo.map((i) => i.top)).size === 1,
    itemsSexo,
    fuenteSexo,
    sinBotonRestablecer: ![...panel.querySelectorAll('button')].some((b) => /Restablecer/i.test(b.textContent)),
    textosGuia: [...panel.querySelectorAll(".at-nr-guia h4, .at-nr-guia p")].map((p) => p.textContent.trim()),
  };
}, PANEL);

/* Superposiciones: leyendas contra burbujas y contra las notas metodológicas. */
informe.superposiciones = await pagina.evaluate((sel) => {
  const panel = document.querySelector(sel);
  const caja = (n) => n.getBoundingClientRect();
  const cruza = (a, b) =>
    a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  const leyendas = [...panel.querySelectorAll(".at-nr-leyendas .at-nr-leyenda")].map(caja);
  const nodos = [...panel.querySelectorAll("g[data-nodo] circle")].map(caja);
  const notas = [...panel.querySelectorAll(".at-nr-notas p")].map(caja);
  return {
    leyendasContraBurbujas: leyendas.filter((l) => nodos.some((n) => cruza(l, n))).length,
    leyendasContraNotas: leyendas.filter((l) => notas.some((n) => cruza(l, n))).length,
    burbujasFueraDelDibujo: nodos.filter((n) => n.bottom > panel.querySelector(".at-nr-region svg").getBoundingClientRect().bottom + 1).length,
  };
}, PANEL);

/* --- Tooltip junto al nodo ----------------------------------------------- */
const mayor = vistas.Conjunto.nodos.reduce((a, b) => (a.r > b.r ? a : b));
const nodoMayor = panel.locator(`g[data-nodo="${mayor.clave}"]`);
await nodoMayor.hover();
await pagina.waitForTimeout(400);
informe.tooltip = await pagina.evaluate(
  ({ sel, clave }) => {
    const panel = document.querySelector(sel);
    const region = panel.querySelector(".at-nr-region").getBoundingClientRect();
    const caja = panel.querySelector("[data-testid=burbujas-detalle]");
    if (!caja) return { existe: false };
    const r = caja.getBoundingClientRect();
    const g = panel.querySelector(`g[data-nodo="${clave}"]`);
    const matriz = new DOMMatrix(getComputedStyle(g).transform);
    const circulo = g.querySelector("circle");
    const centro = { x: region.x + matriz.m41, y: region.y + matriz.m42 };
    const radio = Number(circulo.getAttribute("r"));
    return {
      existe: true,
      texto: caja.innerText.replace(/\s+/g, " "),
      opaco: getComputedStyle(caja).backgroundColor,
      distanciaAlNodo: Math.round(Math.hypot(r.x + r.width / 2 - centro.x, r.y + r.height / 2 - centro.y) - radio),
      dentroDeRegion: r.left >= region.left - 1 && r.right <= region.right + 1 && r.top >= region.top - 1 && r.bottom <= region.bottom + 1,
      ancho: Math.round(r.width),
    };
  },
  { sel: PANEL, clave: mayor.clave },
);
await panel.screenshot({ path: `${EV}/reagrupable-detalle.png` });
capturas.push(`${EV}/reagrupable-detalle.png`);
await pagina.mouse.move(2, 2);

/* --- Transición al reagrupar --------------------------------------------- */
const posiciones = () =>
  pagina.evaluate((sel) => {
    const panel = document.querySelector(sel);
    const nodos = [...panel.querySelectorAll("g[data-nodo]")].map((g) => {
      const m = new DOMMatrix(getComputedStyle(g).transform);
      return { clave: g.getAttribute("data-nodo"), x: Math.round(m.m41), y: Math.round(m.m42) };
    });
    const duracion = getComputedStyle(panel.querySelector("g[data-nodo]")).transitionDuration;
    return { nodos, duracion };
  }, PANEL);
const origen = await posiciones();
const antesRed = peticiones.length;
await panel.getByRole("button", { name: "Por edad", exact: true }).click();
await pagina.waitForTimeout(110);
const durante = await posiciones();
await panel.screenshot({ path: `${EV}/reagrupable-transicion.png` });
capturas.push(`${EV}/reagrupable-transicion.png`);
await pagina.waitForTimeout(800);
const destino = await posiciones();
const mapaDestino = new Map(destino.nodos.map((n) => [n.clave, n]));
const mapaOrigen = new Map(origen.nodos.map((n) => [n.clave, n]));
informe.transicion = {
  duracion: durante.duracion,
  nodosQueCambian: origen.nodos.filter((n) => {
    const d = mapaDestino.get(n.clave);
    return d && (d.x !== n.x || d.y !== n.y);
  }).length,
  nodosEnMovimiento: durante.nodos.filter((n) => {
    const a = mapaOrigen.get(n.clave);
    const b = mapaDestino.get(n.clave);
    return a && b && (n.x !== a.x || n.y !== a.y) && (n.x !== b.x || n.y !== b.y);
  }).length,
  consultasNuevas: peticiones.length - antesRed,
};

/* --- Arrastre con reorganización local ----------------------------------- */
await panel.getByRole("button", { name: "Conjunto", exact: true }).click();
await pagina.waitForTimeout(700);
const previo = await leer();
const arrastrado = previo.nodos.reduce((a, b) => (a.r > b.r ? a : b));
const cajaRegion = await pagina.evaluate((sel) => {
  const r = document.querySelector(`${sel} .at-nr-region`).getBoundingClientRect();
  return { x: r.x, y: r.y };
}, PANEL);
await pagina.mouse.move(cajaRegion.x + arrastrado.x, cajaRegion.y + arrastrado.y);
await pagina.mouse.down();
await pagina.mouse.move(cajaRegion.x + arrastrado.x + 60, cajaRegion.y + arrastrado.y + 70, { steps: 14 });
const duranteArrastre = await pagina.evaluate((sel) => document.querySelector(`${sel} [data-testid=burbujas-detalle]`) === null, PANEL);
await pagina.mouse.up();
await pagina.waitForTimeout(900);
const trasArrastre = await leer();
const nodoFinal = trasArrastre.nodos.find((n) => n.clave === arrastrado.clave);
const vecinosMovidos = trasArrastre.nodos.filter((n) => {
  const antes = previo.nodos.find((m) => m.clave === n.clave);
  return antes && (Math.abs(antes.x - n.x) > 1 || Math.abs(antes.y - n.y) > 1);
}).length;
await panel.screenshot({ path: `${EV}/reagrupable-arrastre.png` });
capturas.push(`${EV}/reagrupable-arrastre.png`);
informe.arrastre = {
  clave: arrastrado.clave,
  desplazamiento: { dx: Math.round(nodoFinal.x - arrastrado.x), dy: Math.round(nodoFinal.y - arrastrado.y) },
  seMantieneAlSoltar: Math.abs(nodoFinal.x - arrastrado.x) > 8 || Math.abs(nodoFinal.y - arrastrado.y) > 8,
  tooltipOcultoDuranteArrastre: duranteArrastre,
  nodosVecinosMovidos: vecinosMovidos,
  solapesTrasArrastre: solapes(trasArrastre.nodos),
  dentroDelLienzo:
    nodoFinal.x - nodoFinal.r >= -1 &&
    nodoFinal.x + nodoFinal.r <= trasArrastre.canvas.w + 1 &&
    nodoFinal.y - nodoFinal.r >= -1 &&
    nodoFinal.y + nodoFinal.r <= trasArrastre.canvas.h + 1,
};
await pagina.mouse.move(2, 2);
await pagina.waitForTimeout(1200);
const trasReposo = await leer();
const enReposo = trasReposo.nodos.find((n) => n.clave === arrastrado.clave);
informe.arrastre.sinBoton = (await panel.getByRole("button", { name: /Restablecer/i }).count()) === 0;
informe.arrastre.persisteTrasReposo = {
  dx: Math.round(enReposo.x - arrastrado.x),
  dy: Math.round(enReposo.y - arrastrado.y),
  igualQueAlSoltar: Math.abs(enReposo.x - nodoFinal.x) < 1 && Math.abs(enReposo.y - nodoFinal.y) < 1,
  solapes: solapes(trasReposo.nodos),
};

/* --- Métricas ------------------------------------------------------------ */
await panel.getByRole("button", { name: "Lesionadas", exact: true }).click();
await pagina.waitForTimeout(700);
const lesionadas = await leer();
await panel.getByRole("button", { name: "Fallecidas", exact: true }).click();
await pagina.waitForTimeout(700);
await pagina.mouse.move(2, 2);
await pagina.waitForTimeout(250);
const fallecidas = await leer();
await panel.screenshot({ path: `${EV}/reagrupable-fallecidas.png` });
capturas.push(`${EV}/reagrupable-fallecidas.png`);
informe.metricas = {
  lesionadas: { nodos: lesionadas.nodos.length, solapes: solapes(lesionadas.nodos), radioMax: Math.round(Math.max(...lesionadas.nodos.map((n) => n.r))) },
  fallecidas: { nodos: fallecidas.nodos.length, solapes: solapes(fallecidas.nodos), radioMax: Math.round(Math.max(...fallecidas.nodos.map((n) => n.r))) },
};
await panel.getByRole("button", { name: "Hechos", exact: true }).click();
await pagina.waitForTimeout(600);

/* Estado compartido: la métrica elegida en vehículos manda también en burbujas. */
const vehiculos = pagina.locator("[data-testid=panel-vehiculos]");
await vehiculos.getByRole("button", { name: "Fallecidas", exact: true }).click();
await pagina.waitForTimeout(900);
const trasVehiculos = await leer();
await vehiculos.getByRole("button", { name: "Hechos", exact: true }).click();
await pagina.waitForTimeout(900);
const trasVolver = await leer();
informe.metricaCompartida = {
  nodosConFallecidasDesdeVehiculos: trasVehiculos.nodos.length,
  nodosAlVolverAHechos: trasVolver.nodos.length,
  coincide: trasVehiculos.nodos.length === informe.metricas.fallecidas.nodos,
};

/* --- Filtros: pocas categorías y una sola -------------------------------- */
const abrirFiltro = async (testid) => {
  await pagina.evaluate(() => window.scrollTo(0, 0));
  await pagina.waitForTimeout(600);
  if ((await pagina.locator("[data-testid=mas-filtros]").count()) === 0) {
    const editar = pagina.getByRole("button", { name: /Editar filtros/i });
    if (await editar.count()) {
      await editar.first().click();
      await pagina.waitForTimeout(900);
    }
  }
  await pagina.locator("[data-testid=mas-filtros]").click();
  await pagina.waitForSelector("[data-testid=panel-mas-filtros]", { timeout: 15000 });
  await pagina.locator(`[data-testid=${testid}]`).click();
  await pagina.waitForTimeout(300);
};
await abrirFiltro("mf-sexos");
await pagina.locator(".atf-opciones .at-opcion", { hasText: "Mujer" }).first().click();
await pagina.waitForTimeout(500);
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(1500);
const soloMujer = await leer();
await panel.screenshot({ path: `${EV}/reagrupable-filtro-mujer.png` });
capturas.push(`${EV}/reagrupable-filtro-mujer.png`);

await abrirFiltro("mf-edad");
await pagina.locator(".atf-campos input").first().fill("25");
await pagina.locator(".atf-campos input").last().fill("34");
await pagina.waitForTimeout(600);
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(1800);
const unaSola = await leer();
await panel.screenshot({ path: `${EV}/reagrupable-una-categoria.png` });
capturas.push(`${EV}/reagrupable-una-categoria.png`);

informe.filtros = {
  soloMujer: {
    nodos: soloMujer.nodos.length,
    todasRosa: soloMujer.nodos.every((n) => n.fill === "rgb(236, 72, 153)"),
    solapes: solapes(soloMujer.nodos),
    composicion: composicion(soloMujer.nodos),
  },
  unaCategoria: {
    nodos: unaSola.nodos.length,
    claves: unaSola.nodos.map((n) => n.clave),
    solapes: solapes(unaSola.nodos),
    centrado: unaSola.nodos.length
      ? Math.round(Math.hypot(unaSola.nodos[0].x - unaSola.canvas.w / 2, unaSola.nodos[0].y - unaSola.canvas.h / 2))
      : null,
  },
};
const limpiar = pagina.getByRole("button", { name: /Limpiar filtros/i });
if (await limpiar.count()) {
  await limpiar.first().click();
  await pagina.waitForTimeout(1600);
}

/* --- Movimiento reducido ------------------------------------------------- */
const contexto = await navegador.newContext({ reducedMotion: "reduce", viewport: { width: 1000, height: 900 } });
const reducida = await contexto.newPage();
await reducida.goto(URL, { waitUntil: "domcontentloaded" });
await reducida.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await reducida.getByRole("tab", { name: /Personas y veh/i }).first().click();
await reducida.waitForSelector(`${PANEL} [data-nodo]`, { timeout: 60000 });
await reducida.waitForTimeout(1200);
informe.movimientoReducido = await reducida.evaluate((sel) => {
  const g = document.querySelector(`${sel} g[data-nodo]`);
  return { duracion: getComputedStyle(g).transitionDuration };
}, PANEL);
await contexto.close();

/* --- Móvil --------------------------------------------------------------- */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(URL, { waitUntil: "domcontentloaded" });
await movil.waitForSelector(".at-kpi-valor", { timeout: 60000 });
await movil.getByRole("tab", { name: /Personas y veh/i }).first().click();
await movil.waitForSelector(`${PANEL} [data-nodo]`, { timeout: 60000 });
await movil.waitForTimeout(1500);
const y = await movil.evaluate(
  (sel) => Math.max(0, document.querySelector(sel).getBoundingClientRect().top + window.scrollY - 96),
  PANEL,
);
await movil.evaluate((d) => window.scrollTo(0, d), y);
await movil.waitForTimeout(400);
await movil.mouse.move(2, 2);
await movil.waitForTimeout(250);
await movil.screenshot({ path: `${EV}/reagrupable-movil.png` });
capturas.push(`${EV}/reagrupable-movil.png`);
await movil.locator(PANEL).screenshot({ path: `${EV}/reagrupable-movil-panel.png` });
capturas.push(`${EV}/reagrupable-movil-panel.png`);
informe.movil = await movil.evaluate((sel) => {
  const panel = document.querySelector(sel);
  const svg = panel.querySelector(".at-nr-region svg");
  const nodos = [...panel.querySelectorAll("g[data-nodo] circle")].map((c) => {
    const m = new DOMMatrix(getComputedStyle(c.parentElement).transform);
    return { r: Number(c.getAttribute("r")), x: m.m41, y: m.m42 };
  });
  const ancho = Number(svg.getAttribute("width"));
  return {
    scrollWidth: document.documentElement.scrollWidth,
    canvas: ancho,
    css: Math.round(svg.getBoundingClientRect().width),
    desborde: Math.round(Math.max(...nodos.map((n) => n.x + n.r)) - ancho),
    nodos: nodos.length,
  };
}, PANEL);

informe.capturas = capturas;
console.log(JSON.stringify(informe, null, 1));
await navegador.close();
