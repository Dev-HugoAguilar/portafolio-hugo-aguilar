/**
 * Verificación de la integración de «Clientes en movimiento» en el portafolio.
 *
 * Recorre el camino real sobre el sitio servido (127.0.0.1:8000):
 *
 *  1. tarjeta en «Ciencia de datos»: título, descripción, portada real 1600 × 1726
 *     ajustada al contenedor (misma geometría que Walmart M5) y enlace a la ficha;
 *  2. ficha: el tablero autónomo se monta en un marco y ajusta su altura;
 *  3. estado por omisión (agosto, cohorte común, ambos perfiles, 0 canastas) y
 *     cifras del contrato analítico;
 *  4. corte, perfil, cohorte, búsqueda del hogar 19 (96 canastas, 2250.38) y
 *     ritmo del hogar 1 en S13 (26–31 julio, 6 días, 1 canasta, 96.71);
 *  5. corrientes con filtro de cambios (local a esa vista), ejes y log1p;
 *  6. descarga CSV contrastada contra la selección completa;
 *  7. cambio rápido de filtros, estado vacío, teclado, 390 px y regreso al
 *     portafolio.
 *
 * Sale con código 1 si algo falla.
 */
import { readFileSync } from "node:fs";

/* Playwright vive en las dependencias del tablero de Walmart M5: se resuelve
   desde ahí para no duplicar la instalación en la raíz del repositorio. */
async function cargarPlaywright() {
  try {
    return await import("@playwright/test");
  } catch (error) {
    return import(
      new URL("../dashboards/atlas-comercial/node_modules/@playwright/test/index.mjs", import.meta.url).toString()
    );
  }
}
const { chromium } = await cargarPlaywright();

const SITIO = "http://127.0.0.1:8000";
const AREA = "/#/area/ciencia-de-datos";
const FICHA = "/#/area/ciencia-de-datos/clientes-en-movimiento";

const fallos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
  return Boolean(condicion);
};
const texto = (valor) => String(valor ?? "").replace(/\s+/g, " ").trim();
const numero = (valor) => Number(String(valor ?? "").replace(/[^\d.-]/g, ""));

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1400, height: 1200 } });
const errores = [];
pagina.on("pageerror", (error) => errores.push(error.message.slice(0, 160)));
pagina.on("console", (mensaje) => {
  if (mensaje.type() === "error") errores.push(mensaje.text().slice(0, 160));
});

/* ---------------- 1. Tarjeta en «Ciencia de datos» ---------------- */
console.log("\n1 · tarjeta en Ciencia de datos");
await pagina.goto(`${SITIO}${AREA}`, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector("li.project-card", { timeout: 120000 });
await pagina.waitForTimeout(2000);

const tarjeta = await pagina.evaluate(() => {
  const lista = [...document.querySelectorAll("li.project-card")];
  const objetivo = lista.find((item) => /Clientes en movimiento/.test(item.querySelector("h3")?.textContent ?? ""));
  if (!objetivo) return null;
  const imagen = objetivo.querySelector("img");
  const caja = imagen?.getBoundingClientRect();
  return {
    titulo: objetivo.querySelector("h3")?.textContent?.trim() ?? "",
    descripcion: objetivo.querySelector(".card-text")?.textContent?.trim() ?? "",
    archivo: imagen?.getAttribute("src") ?? null,
    alt: imagen?.alt ?? "",
    encaje: imagen ? getComputedStyle(imagen).objectFit : "",
    posicion: imagen ? getComputedStyle(imagen).objectPosition : "",
    natural: imagen ? [imagen.naturalWidth, imagen.naturalHeight] : null,
    render: caja ? [Math.round(caja.width), Math.round(caja.height)] : null,
    enlace: objetivo.querySelector(".card-hit")?.getAttribute("href") ?? null,
    cargada: Boolean(imagen?.complete && imagen?.naturalWidth > 0),
    proyectos: lista.length,
  };
});

comprobar(Boolean(tarjeta), "no se encontró la tarjeta «Clientes en movimiento»");
comprobar(tarjeta?.titulo === "Clientes en movimiento", `título inesperado: ${tarjeta?.titulo}`);
comprobar(
  /Segmentación de hogares compradores y evolución de sus hábitos con clustering y datos reales de Complete Journey/.test(
    tarjeta?.descripcion ?? "",
  ),
  `descripción inesperada: ${tarjeta?.descripcion}`,
);
comprobar(
  (tarjeta?.archivo ?? "").startsWith("img/clientes-en-movimiento-resumen.jpg"),
  `portada inesperada: ${tarjeta?.archivo}`,
);
comprobar((tarjeta?.alt ?? "").length > 80, "la portada no tiene texto alternativo útil");
/* Geometría compartida con la tarjeta de referencia del área (Walmart M5). */
comprobar(
  tarjeta?.cargada && tarjeta?.natural?.[0] === 1600 && tarjeta?.natural?.[1] === 1726,
  `la portada no es 1600 × 1726 (${tarjeta?.natural?.join("×")})`,
);
comprobar(tarjeta?.encaje === "cover", `la portada no usa cover (object-fit: ${tarjeta?.encaje})`);
comprobar(/(top|0%|0px)/.test(tarjeta?.posicion ?? ""), `la portada no ancla arriba (object-position: ${tarjeta?.posicion})`);
comprobar(
  Math.abs(tarjeta.render[0] / tarjeta.render[1] - 1600 / 1726) < 0.03,
  `la portada no llena el contenedor 1600:1726: ${tarjeta?.render?.join("×")}`,
);
comprobar(tarjeta?.enlace === "#/area/ciencia-de-datos/clientes-en-movimiento", `enlace inesperado: ${tarjeta?.enlace}`);
comprobar(
  !/paquete|empaquetado|infraestructura|mongodb|atlas/i.test(`${tarjeta?.descripcion}`),
  "la tarjeta expone notas de infraestructura",
);
comprobar(tarjeta?.proyectos >= 3, `la galería del área tiene ${tarjeta?.proyectos} tarjetas`);
console.log(`  ${tarjeta?.titulo} · ${tarjeta?.archivo} (${tarjeta?.natural?.join("×")}) · ${tarjeta?.render?.join("×")} en tarjeta`);

/* ---------------- 2. Ficha: montaje en marco ---------------- */
console.log("\n2 · ficha y tablero embebido");
await pagina.goto(`${SITIO}${FICHA}`, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('iframe[title*="Clientes en movimiento"]', { timeout: 180000 });
const marco = pagina.locator('iframe[title*="Clientes en movimiento"]');
await pagina.waitForTimeout(2500);

const montaje = await pagina.evaluate(() => {
  const iframe = document.querySelector('iframe[title*="Clientes en movimiento"]');
  if (!iframe) return null;
  const doc = iframe.contentDocument;
  return {
    alto: Math.round(iframe.getBoundingClientRect().height),
    altoContenido: doc?.body?.scrollHeight ?? 0,
    titulo: iframe.getAttribute("title"),
    src: iframe.getAttribute("src"),
    kpis: doc?.querySelectorAll(".kpi").length ?? 0,
    puntos: doc?.querySelectorAll("#scatter circle.point").length ?? 0,
  };
});
comprobar(Boolean(montaje), "no se montó el marco del tablero");
comprobar(montaje.alto >= montaje.altoContenido - 8, `el marco (${montaje.alto}) no cubre el contenido (${montaje.altoContenido})`);
comprobar(montaje.kpis === 4, `el tablero no dibujó sus cuatro cifras (${montaje.kpis})`);
comprobar(montaje.puntos > 1000, `la nube de hogares tiene ${montaje.puntos} puntos`);
comprobar(/clientes-en-movimiento/.test(montaje.src ?? ""), `ruta del marco inesperada: ${montaje.src}`);
console.log(`  marco ${montaje.alto}px · contenido ${montaje.altoContenido}px · ${montaje.kpis} cifras · ${montaje.puntos} hogares`);

/* Navegación: etiquetas sin numeración y estilos del componente de pestañas del
   portafolio (contenedor gris claro, activa gris oscuro con texto blanco). */
const pestanas = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  const contenedor = doc.querySelector(".tabs");
  const botones = [...doc.querySelectorAll(".tabs [data-view]")];
  const activa = botones.find((b) => b.getAttribute("aria-selected") === "true");
  const inactiva = botones.find((b) => b.getAttribute("aria-selected") !== "true");
  const estilo = (nodo) => {
    const cs = getComputedStyle(nodo);
    return {
      fondo: cs.backgroundColor,
      color: cs.color,
      radio: cs.borderRadius,
      alto: cs.minHeight,
      relleno: cs.padding,
      fuente: cs.fontSize,
      peso: cs.fontWeight,
      borde: cs.borderTopColor,
      bordeAncho: cs.borderTopWidth,
    };
  };
  return {
    etiquetas: botones.map((b) => b.textContent.trim()),
    contenedor: estilo(contenedor),
    contenedorRelleno: getComputedStyle(contenedor).padding,
    activa: estilo(activa),
    inactiva: estilo(inactiva),
    foco: getComputedStyle(activa).outlineColor,
    contenedorClase: contenedor.parentElement.className,
  };
});
const sinNumeracion = pestanas.etiquetas.every((etiqueta) => !/^\d+\s*\//.test(etiqueta));
comprobar(
  JSON.stringify(pestanas.etiquetas) ===
    JSON.stringify(["Explorar clientes", "Corrientes", "Ritmo de compra", "Evidencia"]),
  `etiquetas inesperadas: ${pestanas.etiquetas.join(" · ")}`,
);
comprobar(sinNumeracion, "las pestañas conservan numeración");
comprobar(pestanas.contenedor.fondo === "rgb(244, 246, 250)", `el contenedor no es gris claro: ${pestanas.contenedor.fondo}`);
comprobar(pestanas.contenedor.radio === "12px", `radio del contenedor inesperado: ${pestanas.contenedor.radio}`);
comprobar(pestanas.contenedorRelleno === "4px", `relleno del contenedor inesperado: ${pestanas.contenedorRelleno}`);
comprobar(pestanas.contenedor.bordeAncho === "1px", `borde del contenedor inesperado: ${pestanas.contenedor.borde}`);
comprobar(pestanas.activa.fondo === "rgb(55, 65, 81)", `la pestaña activa no es gris oscuro: ${pestanas.activa.fondo}`);
comprobar(pestanas.activa.color === "rgb(255, 255, 255)", `la pestaña activa no tiene texto blanco: ${pestanas.activa.color}`);
comprobar(pestanas.activa.peso === "600", `la pestaña activa no usa peso 600: ${pestanas.activa.peso}`);
comprobar(pestanas.inactiva.fondo === "rgba(0, 0, 0, 0)", `la pestaña inactiva no es transparente: ${pestanas.inactiva.fondo}`);
comprobar(pestanas.inactiva.color === "rgb(55, 65, 81)", `la pestaña inactiva no tiene texto gris del componente: ${pestanas.inactiva.color}`);
comprobar(pestanas.inactiva.peso === "500", `la pestaña inactiva no usa peso 500: ${pestanas.inactiva.peso}`);
for (const [nombre, valor] of [
  ["radio de las pestañas", pestanas.activa.radio],
  ["alto mínimo", pestanas.activa.alto],
  ["relleno horizontal", pestanas.activa.relleno],
  ["tamaño de fuente", pestanas.activa.fuente],
]) {
  const esperado = { "radio de las pestañas": "9px", "alto mínimo": "40px", "relleno horizontal": "0px 12px", "tamaño de fuente": "13.5px" }[nombre];
  comprobar(valor === esperado, `${nombre} inesperado: ${valor} (se esperaba ${esperado})`);
}
/* Foco visible del componente: se enfoca con el teclado y se lee el contorno real. */
await pagina
  .frameLocator('iframe[title*="Clientes en movimiento"]')
  .locator('[data-view="flows"]')
  .focus();
await pagina.waitForTimeout(200);
const focoReal = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  const boton = doc.querySelector('[data-view="flows"]');
  const cs = getComputedStyle(boton);
  return { color: cs.outlineColor, ancho: cs.outlineWidth, separacion: cs.outlineOffset, estilo: cs.outlineStyle };
});
comprobar(
  focoReal.color === "rgb(55, 65, 81)" && focoReal.ancho === "2px" && focoReal.separacion === "2px",
  `el foco de las pestañas no coincide con el componente: ${JSON.stringify(focoReal)}`,
);
comprobar(/navpantallas/.test(pestanas.contenedorClase), `contenedor sin la clase del componente: ${pestanas.contenedorClase}`);
console.log(`  pestañas: ${pestanas.etiquetas.join(" · ")} · activa ${pestanas.activa.fondo} / ${pestanas.activa.color}`);

const marco2 = pagina.frameLocator('iframe[title*="Clientes en movimiento"]');
const enMarco = (selector) => marco2.locator(selector);

/* ---------------- 3. Estado por omisión y contrato ---------------- */
console.log("\n3 · estado por omisión");
const inicial = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return {
    corte: doc.querySelector("#cut").value,
    perfil: doc.querySelector("#seg").value,
    cohorte: doc.querySelector("#cohort").value,
    minimo: doc.querySelector("#minb").value,
    hogares: doc.querySelector("#kpis .kpi strong").textContent,
    cohorteHeroe: doc.querySelector("#commonHero").textContent,
    alcance: doc.querySelector("#scope").textContent,
    vista: doc.querySelector('[data-view][aria-current="page"]')?.dataset.view,
  };
});
comprobar(inicial.corte === "1", `el corte por omisión es ${inicial.corte}`);
comprobar(inicial.perfil === "all" && inicial.cohorte === "common" && inicial.minimo === "0", "los filtros por omisión no son ambos perfiles / cohorte común / 0 canastas");
comprobar(numero(inicial.hogares) === 2207, `la selección por omisión es ${inicial.hogares} y se esperaban 2207`);
comprobar(numero(inicial.cohorteHeroe) === 2207, `la cohorte común publicada es ${inicial.cohorteHeroe}`);
comprobar(inicial.vista === "explore", `la vista inicial es ${inicial.vista}`);
comprobar(/Corte 2017-08-01/.test(inicial.alcance), `el alcance no declara el corte: ${inicial.alcance}`);
console.log(`  corte ${inicial.corte} · ${inicial.hogares} hogares · cohorte ${inicial.cohorteHeroe}`);

/* ---------------- 4. Filtros, búsqueda y ritmo ---------------- */
console.log("\n4 · corte, perfil, cohorte, búsqueda y ritmo");
await enMarco("#cut").selectOption("2");
await pagina.waitForTimeout(700);
const septiembre = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return { hogares: doc.querySelector("#kpis .kpi strong").textContent, alcance: doc.querySelector("#scope").textContent };
});
comprobar(numero(septiembre.hogares) === 2207, `en septiembre la cohorte común debería ser 2207 y es ${septiembre.hogares}`);
comprobar(/2017-09-01/.test(septiembre.alcance), "el alcance no cambió al cambiar de corte");

await enMarco("#cohort").selectOption("all");
await pagina.waitForTimeout(600);
const todos = await enMarco("#kpis .kpi strong").first().textContent();
comprobar(numero(todos) === 2311, `con «todos los hogares» en septiembre se esperaban 2311 y hay ${todos}`);

await enMarco("#cohort").selectOption("common");
await enMarco("#cut").selectOption("1");
await enMarco("#seg").selectOption("1");
await pagina.waitForTimeout(600);
const frecuentes = await enMarco("#kpis .kpi strong").first().textContent();
comprobar(numero(frecuentes) > 0 && numero(frecuentes) < 2207, `el filtro de perfil no acota la selección (${frecuentes})`);
await enMarco("#seg").selectOption("all");
await pagina.waitForTimeout(500);

/* Hogar 19 en agosto: 96 canastas, gasto 2250.38 */
await enMarco("#find").fill("19");
await enMarco("#findbtn").click();
await pagina.waitForTimeout(700);
const fichaHogar = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return {
    detalle: doc.querySelector("#detail").innerText.replace(/\s+/g, " "),
    estado: doc.querySelector("#findstatus").textContent,
  };
});
comprobar(/Hogar 19/.test(fichaHogar.detalle), `no se abrió la ficha del hogar 19: ${fichaHogar.detalle.slice(0, 80)}`);
comprobar(/96/.test(fichaHogar.detalle), `la ficha no muestra 96 canastas: ${fichaHogar.detalle.slice(0, 120)}`);
comprobar(/2[.,]?250[.,]38/.test(fichaHogar.detalle), `la ficha no muestra el gasto 2250.38: ${fichaHogar.detalle.slice(0, 140)}`);
comprobar(/Hogar 19 seleccionado/.test(fichaHogar.estado), `el aviso de búsqueda no confirma el hogar: ${fichaHogar.estado}`);

/* Ritmo del hogar 1 en agosto: S13 = 26–31 julio, 6 días, 1 canasta, gasto 96.71 */
await enMarco("#find").fill("1");
await enMarco("#findbtn").click();
await pagina.waitForTimeout(600);
await enMarco("#rhythmHouse").click();
await pagina.waitForTimeout(700);
const ritmo = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return {
    vista: doc.querySelector('[data-view][aria-current="page"]')?.dataset.view,
    alcance: doc.querySelector("#radialScope").value,
    semanas: doc.querySelectorAll("#weeks button").length,
    detalle: doc.querySelector("#weekdetail").innerText.replace(/\s+/g, " "),
  };
});
comprobar(ritmo.vista === "rhythm", `«Explorar su ritmo» no abrió la vista de ritmo (${ritmo.vista})`);
comprobar(ritmo.alcance === "household", "el ritmo no quedó en el hogar seleccionado");
comprobar(ritmo.semanas === 13, `la huella temporal tiene ${ritmo.semanas} bloques y se esperaban 13`);
await enMarco("#weeks button").nth(12).click();
await pagina.waitForTimeout(600);
const semana13 = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return doc.querySelector("#weekdetail").innerText.replace(/\s+/g, " ");
});
comprobar(/semana 13/i.test(semana13), `la semana seleccionada no es la 13: ${semana13.slice(0, 60)}`);
comprobar(/6 d[ií]as/i.test(semana13), `la semana 13 no declara 6 días: ${semana13.slice(0, 80)}`);
comprobar(/26 jul\s*–\s*31 jul|26 jul - 31 jul/i.test(semana13), `las fechas de S13 no son 26–31 de julio: ${semana13.slice(0, 90)}`);
comprobar(/1\s/.test(semana13) && /96[.,]71/.test(semana13), `S13 no muestra 1 canasta y 96.71 de gasto: ${semana13.slice(0, 160)}`);
console.log(`  S13 · ${texto(semana13).slice(0, 120)}`);

/* 4b. Gráfica «Trayectorias conectadas» a todo el ancho, con ficha debajo. */
await enMarco('[data-view="explore"]').click();
await pagina.waitForTimeout(500);
const grafos = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  const svg = doc.querySelector("#scatter");
  const cont = doc.querySelector(".grafo");
  const panel = doc.querySelector("#explore .panel");
  const detalle = doc.querySelector("#detail");
  const cajaSvg = svg.getBoundingClientRect();
  const cajaCont = cont.getBoundingClientRect();
  const cajaPanel = panel.getBoundingClientRect();
  const textos = [...svg.querySelectorAll("text")].map((t) => {
    const r = t.getBoundingClientRect();
    return { texto: t.textContent.slice(0, 10), izq: r.left - cajaSvg.left, der: cajaSvg.right - r.right, arriba: r.top - cajaSvg.top, abajo: cajaSvg.bottom - r.bottom };
  });
  const seleccion = svg.querySelectorAll("polyline");
  const puntos = [...svg.querySelectorAll("circle.point")];
  const radios = puntos.map((p) => Number(p.getAttribute("r")));
  const opacidades = puntos.map((p) => Number(p.getAttribute("opacity")));
  return {
    anchoSvg: Math.round(cajaSvg.width),
    anchoCont: Math.round(cajaCont.width),
    anchoPanel: Math.round(cajaPanel.width),
    altoSvg: Math.round(cajaSvg.height),
    viewBox: svg.getAttribute("viewBox"),
    detalleDebajo: Math.round(detalle.getBoundingClientRect().top) >= Math.round(cajaCont.bottom) - 4,
    campos: getComputedStyle(detalle.querySelector(".detail-datos") || detalle).gridTemplateColumns.split(" ").length,
    recortes: textos.filter((t) => t.izq < -1 || t.der < -1 || t.arriba < -1 || t.abajo < -1).map((t) => t.texto),
    radioMax: Math.max(...radios),
    opacidadMax: Math.max(...opacidades),
    trazoSeleccion: seleccion.length ? Number(getComputedStyle(seleccion[0]).strokeWidth.replace("px", "")) : 0,
    puntos: puntos.length,
    controlesEncima: doc.querySelector("#xmetric").getBoundingClientRect().bottom <= cajaCont.top,
  };
});
comprobar(grafos.anchoSvg === grafos.anchoCont && Math.abs(grafos.anchoCont - grafos.anchoPanel) <= 52, `la gráfica no ocupa el ancho del bloque: ${grafos.anchoSvg} de ${grafos.anchoPanel}`);
comprobar(grafos.altoSvg >= 520 && grafos.altoSvg <= 600, `alto de la gráfica en escritorio fuera de rango: ${grafos.altoSvg}`);
comprobar(/^0 0 \d+ 560$/.test(grafos.viewBox ?? ""), `viewBox inesperado: ${grafos.viewBox}`);
comprobar(grafos.detalleDebajo, "la ficha «Selección vinculada» no está debajo de la gráfica");
comprobar(grafos.campos >= 3, `la franja de selección no despliega sus campos (${grafos.campos} columnas)`);
comprobar(grafos.recortes.length === 0, `etiquetas recortadas: ${grafos.recortes.join(", ")}`);
comprobar(grafos.radioMax <= 3.2, `los puntos no son pequeños (radio ${grafos.radioMax})`);
comprobar(grafos.opacidadMax <= 0.45, `los puntos no son semitransparentes (opacidad ${grafos.opacidadMax})`);
comprobar(grafos.trazoSeleccion >= 3, `la trayectoria seleccionada no tiene más contraste (trazo ${grafos.trazoSeleccion})`);
comprobar(grafos.controlesEncima, "los controles de ejes no están encima de la gráfica");
console.log(`  gráfica ${grafos.anchoSvg}×${grafos.altoSvg}px · ficha debajo con ${grafos.campos} columnas · ${grafos.puntos} puntos`);

/* 4c. «Ampliar gráfica»: vista expandida con botón y Escape. */
await enMarco("#bigScatter").click();
await pagina.waitForTimeout(700);
const grande = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  const dlg = doc.querySelector("#bigDialog");
  const svg = dlg.querySelector("#bigGraph");
  const r = svg.getBoundingClientRect();
  const textos = [...svg.querySelectorAll("text")].map((t) => {
    const c = t.getBoundingClientRect();
    return { izq: c.left - r.left, der: r.right - c.right };
  });
  return {
    abierto: dlg.open,
    tipo: dlg.dataset.tipo,
    viewBox: svg.getAttribute("viewBox"),
    ancho: Math.round(r.width),
    alto: Math.round(r.height),
    puntos: svg.querySelectorAll("circle.point").length,
    seleccion: svg.querySelectorAll("polyline").length,
    recortes: textos.filter((t) => t.izq < -1 || t.der < -1).length,
    titulo: dlg.querySelector("#bigTitle").textContent,
  };
});
comprobar(grande.abierto && grande.tipo === "explore", "la vista ampliada de trayectorias no se abrió");
comprobar(grande.ancho > grafos.anchoSvg * 0.9, `la vista ampliada no aprovecha el espacio (${grande.ancho})`);
comprobar(grande.alto >= 420, `la vista ampliada es demasiado baja (${grande.alto})`);
comprobar(grande.puntos > 2000, `la vista ampliada pierde hogares (${grande.puntos})`);
comprobar(grande.seleccion >= 1, "la vista ampliada no dibuja la trayectoria del hogar seleccionado");
comprobar(grande.recortes === 0, "la vista ampliada recorta etiquetas de los ejes");
comprobar(/ampliad/i.test(grande.titulo), `título inesperado en la ampliación: ${grande.titulo}`);
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(400);
const trasEscape = await pagina.evaluate(() => document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument.querySelector("#bigDialog").open);
comprobar(!trasEscape, "Escape no cerró la vista ampliada");
await enMarco('[data-view="explore"]').click();
await pagina.waitForTimeout(400);
await enMarco("#find").fill("19");
await enMarco("#findbtn").click();
await pagina.waitForTimeout(500);
await enMarco("#bigScatter").click();
await pagina.waitForTimeout(700);
await enMarco("#bigClose").click();
await pagina.waitForTimeout(400);
const trasBoton = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return {
    abierto: doc.querySelector("#bigDialog").open,
    hogar: doc.querySelector("#detail h3")?.textContent ?? "",
    corte: doc.querySelector("#cut").value,
  };
});
comprobar(!trasBoton.abierto, "el botón «Cerrar» no cerró la vista ampliada");
comprobar(/19/.test(trasBoton.hogar) && trasBoton.corte === "1", "la ampliación no conservó selección ni filtros");

/* ---------------- 5. Corrientes y alcance del filtro ---------------- */
console.log("\n5 · corrientes y filtro local");
await enMarco('[data-view="flows"]').click();
await pagina.waitForTimeout(700);
const corrientes = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return {
    vista: doc.querySelector('[data-view][aria-current="page"]')?.dataset.view,
    lineas: doc.querySelectorAll("#currents polyline[data-id]").length,
    conteo: doc.querySelector("#flowcount").textContent,
    filtro: doc.querySelector("#change").value,
    scatter: doc.querySelector("#scatter").innerHTML.length,
  };
});
comprobar(corrientes.vista === "flows", "no se abrió la vista de corrientes");
comprobar(numero(corrientes.lineas) === numero(corrientes.conteo), `las líneas (${corrientes.lineas}) no coinciden con el conteo declarado (${corrientes.conteo})`);

await enMarco("#change").selectOption("changed");
await pagina.waitForTimeout(600);
const cambiados = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return { lineas: doc.querySelectorAll("#currents polyline[data-id]").length, conteo: doc.querySelector("#flowcount").textContent };
});
comprobar(numero(cambiados.lineas) < numero(corrientes.lineas), `el filtro de cambios no redujo las trayectorias (${cambiados.lineas})`);
comprobar(numero(cambiados.lineas) === numero(cambiados.conteo), "el conteo de cambios no coincide con las líneas dibujadas");
await enMarco("#change").selectOption("all");
await pagina.waitForTimeout(400);

const corrientesMetricas = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  const svg = doc.querySelector("#currents");
  const cont = doc.querySelector(".chartscroll");
  const panel = doc.querySelector("#flows .panel");
  const cajaSvg = svg.getBoundingClientRect();
  const cabeceras = [...svg.querySelectorAll("text")].filter((t) => /^(Julio|Agosto|Septiembre)$/.test(t.textContent.trim()));
  const xs = cabeceras.map((t) => Math.round(t.getBoundingClientRect().left - cajaSvg.left));
  const fondos = [...svg.querySelectorAll("polyline[data-id]")].map((p) => Number(p.getAttribute("opacity")));
  const resaltada = [...svg.querySelectorAll("polyline:not([data-id])")];
  const textos = [...svg.querySelectorAll("text")].map((t) => {
    const r = t.getBoundingClientRect();
    return { izq: r.left - cajaSvg.left, der: cajaSvg.right - r.right };
  });
  return {
    anchoSvg: Math.round(cajaSvg.width),
    anchoCont: Math.round(cont.getBoundingClientRect().width),
    anchoPanel: Math.round(panel.getBoundingClientRect().width),
    altoSvg: Math.round(cajaSvg.height),
    xs,
    opacidadFondo: Math.max(...fondos),
    trazoResaltado: resaltada.length ? Number(getComputedStyle(resaltada[0]).strokeWidth.replace("px", "")) : 0,
    recortes: textos.filter((t) => t.izq < -1 || t.der < -1).length,
    controlesEncima: doc.querySelector("#change").getBoundingClientRect().bottom <= cajaSvg.top,
    desbordePagina: doc.documentElement.scrollWidth - doc.documentElement.clientWidth,
  };
});
comprobar(Math.abs(corrientesMetricas.anchoSvg - corrientesMetricas.anchoPanel) <= 52, `corrientes no usa el ancho del bloque: ${corrientesMetricas.anchoSvg} de ${corrientesMetricas.anchoPanel}`);
comprobar(corrientesMetricas.altoSvg >= 550 && corrientesMetricas.altoSvg <= 650, `alto de corrientes fuera de rango: ${corrientesMetricas.altoSvg}`);
comprobar(corrientesMetricas.xs.length === 3 && corrientesMetricas.xs[0] < corrientesMetricas.xs[1] && corrientesMetricas.xs[1] < corrientesMetricas.xs[2], `los cortes no se distribuyen a lo ancho: ${corrientesMetricas.xs.join(", ")}`);
comprobar(corrientesMetricas.xs[2] - corrientesMetricas.xs[0] > corrientesMetricas.anchoSvg * 0.8, "julio y septiembre no ocupan el ancho útil");
comprobar(corrientesMetricas.opacidadFondo <= 0.12, `las trayectorias de fondo no están atenuadas (${corrientesMetricas.opacidadFondo})`);
comprobar(corrientesMetricas.trazoResaltado >= 3, `el hogar seleccionado no se destaca en corrientes (trazo ${corrientesMetricas.trazoResaltado})`);
comprobar(corrientesMetricas.recortes === 0, "corrientes recorta etiquetas en los extremos");
comprobar(corrientesMetricas.controlesEncima, "el filtro de trayectorias no está encima de la gráfica");
comprobar(corrientesMetricas.desbordePagina <= 2, `corrientes provoca desborde de página (${corrientesMetricas.desbordePagina})`);
console.log(`  corrientes ${corrientesMetricas.anchoSvg}×${corrientesMetricas.altoSvg}px · cortes en ${corrientesMetricas.xs.join(" / ")}`);

/* La vista de evidencia ya no publica la leyenda de inspiración visual. */
await enMarco('[data-view="evidence"]').click();
await pagina.waitForTimeout(500);
const evidencia = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return {
    texto: doc.querySelector("#evidence").innerText.replace(/\s+/g, " "),
    enlaces: [...doc.querySelectorAll("#evidence a[href*='dataviz-inspiration']")].length,
    seccion: Boolean(doc.querySelector("#evidence .panel")),
  };
});
comprobar(!/Inspiración visual/i.test(evidencia.texto), "la vista de evidencia sigue mostrando la leyenda de inspiración visual");
comprobar(evidencia.enlaces === 0, "la vista de evidencia conserva enlaces a la galería de inspiración");
comprobar(evidencia.seccion, "la vista de evidencia quedó vacía al retirar la leyenda");
await enMarco('[data-view="flows"]').click();
await pagina.waitForTimeout(400);

await enMarco("#bigFlows").click();
await pagina.waitForTimeout(700);
const grandeFlujos = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  const dlg = doc.querySelector("#bigDialog");
  const svg = dlg.querySelector("#bigGraph");
  const r = svg.getBoundingClientRect();
  return {
    abierto: dlg.open,
    tipo: dlg.dataset.tipo,
    ancho: Math.round(r.width),
    alto: Math.round(r.height),
    lineas: svg.querySelectorAll("polyline[data-id]").length,
    destacada: svg.querySelectorAll("polyline:not([data-id])").length,
    titulo: dlg.querySelector("#bigTitle").textContent,
  };
});
comprobar(grandeFlujos.abierto && grandeFlujos.tipo === "flows", "la vista ampliada de corrientes no se abrió");
comprobar(grandeFlujos.alto >= 460, `la ampliación de corrientes es demasiado baja (${grandeFlujos.alto})`);
comprobar(grandeFlujos.lineas > 300, `la ampliación de corrientes pierde trayectorias (${grandeFlujos.lineas})`);
comprobar(grandeFlujos.destacada >= 1, "la ampliación de corrientes no resalta el hogar seleccionado");
comprobar(/corrientes/i.test(grandeFlujos.titulo), `título inesperado: ${grandeFlujos.titulo}`);
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(400);
const cierreFlujos = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return { abierto: doc.querySelector("#bigDialog").open, hogares: doc.querySelector("#kpis .kpi strong").textContent };
});
comprobar(!cierreFlujos.abierto, "Escape no cerró la ampliación de corrientes");
comprobar(numero(cierreFlujos.hogares) === 2207, "la ampliación de corrientes alteró la selección");

/* El filtro «Trayectorias» es local: no debe alterar la selección ni otras vistas. */
const alcanceTrasFiltro = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return { hogares: doc.querySelector("#kpis .kpi strong").textContent, alcance: doc.querySelector("#scope").textContent };
});
comprobar(numero(alcanceTrasFiltro.hogares) === 2207, `el filtro de trayectorias alteró la selección global (${alcanceTrasFiltro.hogares})`);
await enMarco('[data-view="explore"]').click();
await pagina.waitForTimeout(500);
const trasVolver = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return doc.querySelectorAll("#scatter circle.point").length;
});
comprobar(trasVolver > 1000, `la vista de exploración no conserva la nube de hogares (${trasVolver})`);
console.log(`  ${corrientes.lineas} trayectorias · ${cambiados.lineas} cambian de perfil`);

/* Ejes configurables y log1p */
await enMarco("#xmetric").selectOption("recency_days");
await enMarco("#ymetric").selectOption("sales_per_basket");
await enMarco("#log").uncheck();
await pagina.waitForTimeout(600);
const ejes = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return { texto: doc.querySelector("#scatter").innerHTML, etiqueta: doc.querySelector("#scatter text")?.textContent };
});
comprobar(/Días desde última compra/.test(ejes.texto), "el eje X no cambió a recencia");
comprobar(/Gasto por canasta/.test(ejes.texto), "el eje Y no cambió a gasto por canasta");
await enMarco("#log").check();
await enMarco("#xmetric").selectOption("baskets");
await enMarco("#ymetric").selectOption("sales");

/* La selección y los filtros sobreviven al cambio de pestaña. */
await enMarco("#find").fill("19");
await enMarco("#findbtn").click();
await pagina.waitForTimeout(500);
const antesDePestana = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return {
    hogar: doc.querySelector("#detail h3")?.textContent ?? "",
    corte: doc.querySelector("#cut").value,
    perfil: doc.querySelector("#seg").value,
    cohorte: doc.querySelector("#cohort").value,
    hogares: doc.querySelector("#kpis .kpi strong").textContent,
  };
});
for (const vista of ["flows", "rhythm", "evidence", "explore"]) {
  await enMarco(`[data-view="${vista}"]`).click();
  await pagina.waitForTimeout(350);
}
const trasPestanas = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return {
    hogar: doc.querySelector("#detail h3")?.textContent ?? "",
    corte: doc.querySelector("#cut").value,
    perfil: doc.querySelector("#seg").value,
    cohorte: doc.querySelector("#cohort").value,
    hogares: doc.querySelector("#kpis .kpi strong").textContent,
    activa: doc.querySelector('[data-view][aria-selected="true"]')?.dataset.view,
  };
});
comprobar(antesDePestana.hogar === trasPestanas.hogar && /19/.test(trasPestanas.hogar), `el hogar seleccionado se perdió (${trasPestanas.hogar})`);
comprobar(
  antesDePestana.corte === trasPestanas.corte &&
    antesDePestana.perfil === trasPestanas.perfil &&
    antesDePestana.cohorte === trasPestanas.cohorte &&
    antesDePestana.hogares === trasPestanas.hogares,
  "algún filtro cambió al recorrer las pestañas",
);
comprobar(trasPestanas.activa === "explore", `la pestaña activa final es ${trasPestanas.activa}`);

/* ---------------- 6. CSV completo de la selección ---------------- */
console.log("\n6 · descarga CSV");
const descarga = await Promise.all([
  pagina.waitForEvent("download", { timeout: 120000 }).catch(() => null),
  enMarco("#csv").click(),
]).then(([evento]) => evento);
comprobar(Boolean(descarga), "la descarga del CSV no se inició");
let filasCsv = 0;
if (descarga) {
  const contenido = readFileSync(await descarga.path(), "utf8").trim().split(/\r?\n/);
  filasCsv = contenido.length - 1;
  comprobar(contenido[0].startsWith("cutoff,household_id"), `cabecera del CSV inesperada: ${contenido[0]}`);
  comprobar(/2017-08-01/.test(contenido[1] ?? ""), "el CSV no declara el corte seleccionado");
  comprobar(filasCsv === 2207, `el CSV tiene ${filasCsv} filas y la selección es de 2207 hogares`);
  const fila19 = contenido.find((linea) => linea.split(",")[1] === "19");
  const campos19 = fila19 ? fila19.split(",") : [];
  comprobar(Boolean(fila19), "el CSV no incluye el hogar 19");
  comprobar(campos19[0] === "2017-08-01", `el corte de la fila 19 es ${campos19[0]}`);
  comprobar(campos19[3] === "96", `el CSV no trae 96 canastas para el hogar 19: ${campos19[3]}`);
  comprobar(campos19[4] === "2250.38", `el CSV no trae 2250.38 de gasto para el hogar 19: ${campos19[4]}`);
  comprobar(contenido.every((linea) => linea.split(",").length === 8), "alguna fila del CSV no tiene las ocho columnas");
  comprobar(filasCsv > 30, "el CSV se quedó en las filas visibles de la tabla");
}
console.log(`  ${filasCsv} filas descargadas (selección completa)`);

/* ---------------- 7. Cambio rápido, vacío, teclado, 390 px y regreso ---------------- */
console.log("\n7 · robustez, teclado, móvil y regreso");
for (const valor of ["2", "0", "1", "2", "1"]) {
  await enMarco("#cut").selectOption(valor);
}
await pagina.waitForTimeout(800);
const trasRafaga = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return { corte: doc.querySelector("#cut").value, hogares: doc.querySelector("#kpis .kpi strong").textContent, puntos: doc.querySelectorAll("#scatter circle.point").length };
});
comprobar(trasRafaga.corte === "1" && numero(trasRafaga.hogares) === 2207 && trasRafaga.puntos > 1000, "el cambio rápido de filtros dejó el tablero inconsistente");

/* Estado vacío: en julio, perfil ocasional con 100 canastas mínimas no deja hogares. */
await enMarco("#cut").selectOption("0");
await enMarco("#seg").selectOption("0");
await enMarco("#minb").evaluate((nodo) => {
  nodo.value = "100";
  nodo.dispatchEvent(new Event("input", { bubbles: true }));
});
await pagina.waitForTimeout(700);
const vacio = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return {
    hogares: doc.querySelector("#kpis .kpi strong").textContent,
    scatter: doc.querySelector("#scatter").textContent,
    detalle: doc.querySelector("#detail").innerText,
  };
});
comprobar(numero(vacio.hogares) === 0, `el estado vacío no deja 0 hogares (${vacio.hogares})`);
comprobar(/No hay hogares/.test(vacio.scatter) || /No hay hogares/.test(vacio.detalle), "el estado vacío no se declara en la gráfica ni en la ficha");
await enMarco("#reset").click();
await pagina.waitForTimeout(700);
const trasReinicio = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return { corte: doc.querySelector("#cut").value, hogares: doc.querySelector("#kpis .kpi strong").textContent };
});
comprobar(trasReinicio.corte === "1" && numero(trasReinicio.hogares) === 2207, "«Restablecer» no devolvió el estado inicial");

/* Teclado: activar una vista con Enter y buscar con Enter. */
await enMarco('[data-view="evidence"]').focus();
await pagina.keyboard.press("Enter");
await pagina.waitForTimeout(600);
const porTeclado = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return { vista: doc.querySelector('[data-view][aria-current="page"]')?.dataset.view, activo: doc.activeElement?.tagName };
});
comprobar(porTeclado.vista === "evidence", `el teclado no cambió de vista (${porTeclado.vista})`);
await enMarco('[data-view="explore"]').click();
await pagina.waitForTimeout(400);
await enMarco("#find").fill("19");
await pagina.keyboard.press("Enter");
await pagina.waitForTimeout(700);
const busquedaTeclado = await pagina.evaluate(() => {
  const doc = document.querySelector('iframe[title*="Clientes en movimiento"]').contentDocument;
  return doc.querySelector("#findstatus").textContent;
});
comprobar(/Hogar 19 seleccionado/.test(busquedaTeclado), `buscar con Enter no seleccionó el hogar (${busquedaTeclado})`);

/* Móvil: la página dentro del marco no desborda y las cifras se apilan en dos columnas. */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await movil.goto(`${SITIO}${FICHA}`, { waitUntil: "domcontentloaded" });
await movil.waitForSelector('iframe[title*="Clientes en movimiento"]', { timeout: 180000 });
await movil.waitForTimeout(3000);
const enMovil = await movil.evaluate(() => {
  const iframe = document.querySelector('iframe[title*="Clientes en movimiento"]');
  const doc = iframe.contentDocument;
  const kpis = doc.querySelector(".kpis");
  return {
    desborde: doc.documentElement.scrollWidth - doc.documentElement.clientWidth,
    columnasKpi: kpis ? getComputedStyle(kpis).gridTemplateColumns.split(" ").length : 0,
    anchoPestanas: Math.round(doc.querySelector(".tabs").getBoundingClientRect().width),
    anchoNav: Math.round(doc.querySelector(".navpantallas").getBoundingClientRect().width),
    fuentePestanas: getComputedStyle(doc.querySelector(".tabs button")).fontSize,
    desbordePestanas: doc.querySelector(".tabs").scrollWidth - doc.querySelector(".tabs").clientWidth,
    altoScatter: Math.round(doc.querySelector("#scatter").getBoundingClientRect().height),
    detalleColumnas: getComputedStyle(doc.querySelector(".detail")).gridTemplateColumns.split(" ").length,
    camposColumnas: getComputedStyle(doc.querySelector(".detail-datos")).gridTemplateColumns.split(" ").length,
    detalleDebajo: Math.round(doc.querySelector("#detail").getBoundingClientRect().top) >= Math.round(doc.querySelector(".grafo").getBoundingClientRect().bottom) - 4,
    trazoSeleccion: (() => {
      const trazo = doc.querySelector("#currents polyline:not([data-id])") || doc.querySelector("#scatter polyline");
      return trazo ? Number(getComputedStyle(trazo).strokeWidth.replace("px", "")) : 0;
    })(),
    alto: Math.round(iframe.getBoundingClientRect().height),
    altoContenido: doc.body.scrollHeight,
    puntos: doc.querySelectorAll("#scatter circle.point").length,
  };
});
comprobar(enMovil.desborde <= 2, `el tablero desborda ${enMovil.desborde} px en 390 px`);
comprobar(enMovil.columnasKpi === 2, `las cifras usan ${enMovil.columnasKpi} columnas en móvil`);
comprobar(enMovil.alto >= enMovil.altoContenido - 8, "el marco no ajusta su altura en móvil");
comprobar(enMovil.puntos > 500, `en móvil la nube pierde hogares (${enMovil.puntos})`);
comprobar(
  Math.abs(enMovil.anchoPestanas - enMovil.anchoNav) <= 2,
  `en móvil las pestañas no ocupan el ancho disponible (${enMovil.anchoPestanas} de ${enMovil.anchoNav})`,
);
comprobar(enMovil.fuentePestanas === "12.5px", `en móvil la tipografía de las pestañas es ${enMovil.fuentePestanas}`);
comprobar(enMovil.altoScatter >= 360 && enMovil.altoScatter <= 420, `alto de la gráfica en móvil fuera de rango: ${enMovil.altoScatter}`);
comprobar(enMovil.detalleDebajo, "en móvil la ficha no queda debajo de la gráfica");
comprobar(enMovil.detalleColumnas === 1 && enMovil.camposColumnas === 1, `en móvil la ficha no se apila (${enMovil.detalleColumnas}/${enMovil.camposColumnas})`);
comprobar(enMovil.trazoSeleccion >= 3, `en móvil la trayectoria no se destaca (${enMovil.trazoSeleccion})`);
await movil.close();

/* Regreso al portafolio desde la ficha. */
await pagina.click('.view-back');
await pagina.waitForTimeout(1200);
const regreso = await pagina.evaluate(() => ({
  area: Boolean(document.querySelector('[data-testid="view-area"], .view-area, #view-area:not([hidden])')),
  hash: window.location.hash,
}));
comprobar(/ciencia-de-datos/.test(regreso.hash) && !/clientes-en-movimiento/.test(regreso.hash), `«Volver» no regresó al área: ${regreso.hash}`);

comprobar(errores.length === 0, `errores de consola: ${errores.slice(0, 3).join(" | ")}`);

console.log("\nResumen");
console.log(
  JSON.stringify(
    {
      tarjeta: tarjeta ? `${tarjeta.titulo} · ${tarjeta.archivo} (${tarjeta.natural?.join("×")})` : null,
      marco: montaje ? `${montaje.alto}px / contenido ${montaje.altoContenido}px` : null,
      seleccionInicial: inicial.hogares,
      corrientes: `${corrientes.lineas} trayectorias · ${cambiados.lineas} cambian`,
      csv: filasCsv,
      movil: enMovil,
      errores,
      fallos,
    },
    null,
    2,
  ),
);

await navegador.close();
if (fallos.length) {
  console.error(`\n✗ ${fallos.length} fallo(s) en la integración de Clientes en movimiento`);
  process.exit(1);
}
console.log("\n✓ Integración verificada: tarjeta, tablero embebido, filtros, CSV, teclado, móvil y regreso.");
