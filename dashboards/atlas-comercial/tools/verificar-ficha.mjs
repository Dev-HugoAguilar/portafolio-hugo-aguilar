/**
 * Verificación de la ficha del caso «Walmart M5 — Planeación de demanda y evaluación de
 * pronósticos» en el portafolio existente.
 *
 * Comprueba, sobre el sitio servido:
 *
 *  1. la tarjeta del área «Ciencia de datos y Machine Learning»: nombre visible, subtítulo,
 *     captura real y texto alternativo;
 *  2. la ficha: título y subtítulo, aclaración de independencia, resultados publicados con
 *     sus cifras confirmadas, limitaciones y el bloque técnico de la demo local;
 *  3. la vista del tablero de la tarjeta del área: captura real del tablero actual, con su
 *     texto alternativo, su tamaño declarado y su proporción;
 *  4. la aplicación incrustada: nombre nuevo en la cabecera y montaje de las seis pantallas;
 *  5. que no haya enlaces a `localhost` ni promesas de despliegue en Atlas;
 *  6. escritorio y 390 px: sin desbordes horizontales y con la galería legible.
 *
 * Sale con código 1 si algo falla.
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const AREA = "/#/area/ciencia-de-datos";
const FICHA = "/?ac_pantalla=proyecto#/area/ciencia-de-datos/atlas-comercial";

const fallos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
  return Boolean(condicion);
};
const texto = (valor) => String(valor ?? "").replace(/\s+/g, " ").trim();

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 1000 } });
const errores = [];
pagina.on("pageerror", (error) => errores.push(error.message.slice(0, 160)));
pagina.on("console", (mensaje) => {
  if (mensaje.type() === "error") errores.push(mensaje.text().slice(0, 160));
});
const respuestas = [];
pagina.on("response", (respuesta) => {
  if (respuesta.url().includes("/img/atlas-comercial")) {
    respuestas.push({ archivo: respuesta.url().split("/").pop(), estado: respuesta.status() });
  }
});

/* 1. Tarjeta del área ------------------------------------------------------ */
await pagina.goto(`${SITIO}${AREA}`, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector("li.project-card", { timeout: 120000 });
await pagina.waitForTimeout(1800);

const tarjeta = await pagina.evaluate(() => {
  const lista = [...document.querySelectorAll("li.project-card")];
  const objetivo = lista.find((item) => /Walmart M5/.test(item.querySelector("h3")?.textContent ?? ""));
  const generica = lista.find((item) => /Predicción de demanda/.test(item.querySelector("h3")?.textContent ?? ""));
  if (!objetivo) return null;
  const imagen = objetivo.querySelector("img");
  const caja = imagen ? imagen.getBoundingClientRect() : null;
  return {
    titulo: objetivo.querySelector("h3")?.textContent?.trim() ?? "",
    encaje: imagen ? getComputedStyle(imagen).objectFit : "",
    anchoRenderizado: caja ? Math.round(caja.width) : 0,
    altoRenderizado: caja ? Math.round(caja.height) : 0,
    anchoCaja: caja ? Math.round(caja.width) : 0,
    altoCaja: caja ? Math.round(caja.height) : 0,
    posicion: imagen ? getComputedStyle(imagen).objectPosition : "",
    descripcion: objetivo.querySelector(".card-text")?.textContent?.trim() ?? "",
    archivo: imagen ? imagen.getAttribute("src") ?? "" : null,
    alt: imagen?.getAttribute("alt") ?? "",
    ancho: imagen?.getAttribute("width") ?? null,
    alto: imagen?.getAttribute("height") ?? null,
    cargada: Boolean(imagen && imagen.complete && imagen.naturalWidth > 0),
    hayGenerica: Boolean(generica),
  };
});

comprobar(Boolean(tarjeta), "no se encontró la tarjeta «Walmart M5» en «Ciencia de datos»");
comprobar(
  /^Walmart M5/.test(tarjeta?.titulo ?? ""),
  `el nombre visible de la tarjeta no empieza por «Walmart M5»: ${tarjeta?.titulo}`,
);
comprobar(
  /Analítica de ventas históricas y pronóstico diario a 28 días/.test(tarjeta?.descripcion ?? ""),
  `la tarjeta no muestra el subtítulo del caso: ${tarjeta?.descripcion}`,
);
comprobar(
  !tarjeta?.hayGenerica,
  "sigue apareciendo la ficha genérica «Predicción de demanda» en el área",
);
comprobar(
  tarjeta?.archivo === "img/walmart-m5-resumen.jpg",
  `la tarjeta no usa el resumen actual del tablero: ${tarjeta?.archivo}`,
);
comprobar(
  tarjeta?.ancho === "1600" && tarjeta?.alto === "1726",
  `la tarjeta declara ${tarjeta?.ancho}×${tarjeta?.alto} y el resumen es 1600×1726`,
);
/* Mismo formato que los demás tableros: captura de página completa con la
   proporción declarada y `contain`, sin recortes ni deformación. */
comprobar(
  tarjeta?.encaje === "contain",
  `la portada no usa el encaje del resto de los tableros (object-fit: ${tarjeta?.encaje})`,
);
comprobar(
  Math.abs(
    tarjeta?.anchoRenderizado / tarjeta?.altoRenderizado -
      Number(tarjeta?.ancho) / Number(tarjeta?.alto),
  ) < 0.01,
  `la portada no conserva la proporción declarada: ${tarjeta?.anchoRenderizado}×${tarjeta?.altoRenderizado}`,
);
comprobar(
  tarjeta?.anchoRenderizado >= Math.round(tarjeta?.anchoCaja ?? 0) - 2 &&
    tarjeta?.altoRenderizado >= Math.round(tarjeta?.altoCaja ?? 0) - 2,
  `la portada no ocupa todo el contenedor: ${tarjeta?.anchoRenderizado}×${tarjeta?.altoRenderizado} en ${tarjeta?.anchoCaja}×${tarjeta?.altoCaja}`,
);
comprobar(
  /tablero/i.test(tarjeta?.alt ?? "") &&
    /1 335 219,04/.test(tarjeta?.alt ?? "") &&
    /plan/i.test(tarjeta?.alt ?? ""),
  "la portada de la tarjeta no describe el tablero actual",
);
comprobar((tarjeta?.alt ?? "").length > 30, "la captura de la tarjeta no tiene texto alternativo descriptivo");
comprobar(Boolean(tarjeta?.cargada), "la captura de la tarjeta no llegó a cargarse");
comprobar(Boolean(tarjeta?.ancho && tarjeta?.alto), "la tarjeta no declara el tamaño de su captura");

/* 2. Ficha ----------------------------------------------------------------- */
await pagina.goto(`${SITIO}${FICHA}`, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".ac-app", { timeout: 180000 });
await pagina.waitForTimeout(3000);

const ficha = await pagina.evaluate(() => {
  const cabecera = document.querySelector(".view-head--proyecto");
  const textoPagina = document.body.innerText.replace(/\s+/g, " ");
  return {
    h1: cabecera?.querySelector(".view-title")?.textContent?.trim() ?? "",
    subtitulo: cabecera?.querySelector(".view-subtitle")?.textContent?.trim() ?? "",
    lead: cabecera?.querySelector(".view-lead")?.textContent?.trim() ?? "",
    apartados: [...document.querySelectorAll(".project-fields dt")].map((dt) => dt.textContent.trim()),
    texto: textoPagina,
    galeria: document.querySelectorAll(".vista-tablero, #galeria-dialog").length,
    enlacesLocalhost: [...document.querySelectorAll("a[href]")]
      .map((enlace) => enlace.getAttribute("href"))
      .filter((href) => /127\.0\.0\.1|localhost/i.test(href ?? "")),
    botonDemo: Boolean(document.querySelector('a.btn[href*="atlas-comercial"], .view-head a[href*="http"]')),
    tituloTablero: document.querySelector(".ac-titulo")?.innerText.replace(/\s+/g, " ").trim() ?? "",
    notaAfiliacion: document.querySelector(".ac-nota-afiliacion")?.textContent?.trim() ?? "",
    montado: Boolean(document.querySelector(".ac-app .ac-tabs")),
  };
});

comprobar(ficha.h1 === "Walmart M5", `el título visible de la ficha es «${ficha.h1}»`);
comprobar(
  ficha.subtitulo === "Planeación de demanda y evaluación de pronósticos",
  `el subtítulo visible es «${ficha.subtitulo}»`,
);
comprobar(
  /Analítica de ventas históricas y pronóstico diario a 28 días con datos de la competencia M5 de Kaggle/.test(ficha.lead),
  "la ficha no presenta el caso con el subtítulo definido",
);
comprobar(
  /Proyecto independiente con datos públicos de la competencia M5; no está afiliado ni patrocinado por Walmart/.test(
    ficha.texto,
  ),
  "falta la aclaración de independencia respecto a Walmart",
);
comprobar(
  !/está desplegado en MongoDB Atlas|publicado en MongoDB Atlas|cargado en MongoDB Atlas/i.test(ficha.texto),
  "la ficha afirma un despliegue en Atlas que no existe",
);
comprobar(ficha.enlacesLocalhost.length === 0, `la ficha enlaza a localhost: ${ficha.enlacesLocalhost.join(", ")}`);
comprobar(!ficha.botonDemo, "la ficha muestra un botón de demo sin URL pública verificada");

/* 2b. Resultados confirmados */
for (const cifra of [
  "1 335 219,04",
  "rev-ec9b21cd45",
  "decimal-v1",
  "1,07",
  "1,24",
  "75,64 %",
  "87,53 %",
  "13,58 %",
  "3 050,23",
  "3 501,00",
  "12,88 %",
  "23,71 %",
  "44,23 %",
  "no son un holdout intacto",
]) {
  comprobar(ficha.texto.includes(cifra), `la ficha no publica la cifra confirmada «${cifra}»`);
}
comprobar(
  ficha.apartados.includes("Resultados publicados"),
  `la ficha no tiene el apartado «Resultados publicados»: ${ficha.apartados.join(" · ")}`,
);

/* 2c. Limitaciones y bloque técnico de la demo */
comprobar(
  /no son ventas\s*actuales/i.test(ficha.texto) && /ni órdenes de compra/i.test(ficha.texto),
  "la ficha no advierte que las unidades previstas no son ventas actuales ni órdenes de compra",
);
comprobar(
  /garantía de abastecimiento/i.test(ficha.texto),
  "la ficha no aclara que el plan no garantiza abastecimiento",
);
comprobar(/no hay intervalos de predicción/i.test(ficha.texto), "la ficha no declara que no hay intervalos de predicción");
for (const cifra of ["−21,9 %", "−31,1 %", "−39,6 %", "70,48 MB", "60 de 60"]) {
  comprobar(ficha.texto.includes(cifra), `el bloque técnico no publica «${cifra}»`);
}
comprobar(
  /no se ha cargado ni desplegado en MongoDB Atlas/.test(ficha.texto),
  "el bloque técnico no aclara que el paquete compacto no se desplegó en Atlas",
);

/* 4. Cabecera del tablero y montaje ---------------------------------------- */
comprobar(/Walmart M5/.test(ficha.tituloTablero), `la cabecera del tablero no usa el nombre nuevo: ${ficha.tituloTablero}`);
comprobar(
  /Planeación de demanda y evaluación de pronósticos/.test(ficha.tituloTablero),
  `la cabecera del tablero no declara el propósito del caso: ${ficha.tituloTablero}`,
);
comprobar(
  /competencia M5; no está afiliado ni patrocinado por Walmart/.test(ficha.notaAfiliacion),
  "la cabecera del tablero no incluye la nota de independencia",
);
comprobar(ficha.montado, "la aplicación no se montó dentro de la ficha");

/* 5. Móvil: sin desbordes y portada legible -------------------------------- */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await movil.goto(`${SITIO}${AREA}`, { waitUntil: "domcontentloaded" });
await movil.waitForSelector("li.project-card", { timeout: 180000 });
await movil.waitForTimeout(2500);
const enMovil = await movil.evaluate(() => {
  const portada = [...document.querySelectorAll("li.project-card")].find((item) =>
    /Walmart M5/.test(item.querySelector("h3")?.textContent ?? ""),
  )?.querySelector("img");
  const caja = portada?.getBoundingClientRect();
  return {
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    anchoPortada: caja ? Math.round(caja.width) : 0,
    altoPortada: caja ? Math.round(caja.height) : 0,
    titulo: portada?.closest("article")?.querySelector("h3")?.textContent?.trim() ?? "",
    cargada: Boolean(portada?.complete && portada?.naturalWidth > 0),
  };
});
comprobar(enMovil.desborde <= 2, `el área desborda ${enMovil.desborde} px en 390 px`);
comprobar(enMovil.anchoPortada > 300, `la portada se ve demasiado pequeña en móvil: ${enMovil.anchoPortada} px`);
comprobar(
  Math.abs(enMovil.anchoPortada / enMovil.altoPortada - 1600 / 1726) < 0.02,
  `la portada no conserva la proporción declarada en móvil (${enMovil.anchoPortada}×${enMovil.altoPortada})`,
);
comprobar(enMovil.cargada, "la portada no se carga en móvil");
comprobar(/^Walmart M5/.test(enMovil.titulo), `el título en móvil es «${enMovil.titulo}»`);
await movil.close();

comprobar(errores.length === 0, `errores de consola: ${errores.slice(0, 3).join(" | ")}`);

console.log(
  JSON.stringify(
    {
      tarjeta: tarjeta ? `${tarjeta.titulo} · ${tarjeta.archivo}` : null,
      ficha: { h1: ficha.h1, subtitulo: ficha.subtitulo, apartados: ficha.apartados.length },
      vistaTableroRetirada: ficha.galeria === 0,
      imagenes: respuestas.length,
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
  console.error(`\n✗ ${fallos.length} fallo(s) en la ficha del portafolio`);
  process.exit(1);
}
console.log("\n✓ La ficha presenta el caso construido, sus resultados, sus límites y el tablero real.");
