/**
 * Portadas de las tarjetas de «Ciencia de datos».
 *
 * Las tarjetas del área convierten su portada en la misma geometría: 1600 × 1726
 * (≈ 0,927), la proporción que ya usa la tarjeta de Walmart M5. Este script
 * fotografía los tableros propios con esa proporción —«Clientes y campañas»,
 * «Clientes en movimiento» y «Gaza · Vidas y territorio»— para que la imagen
 * llene el recuadro sin bandas ni deformación.
 *
 * Cómo se consigue el encuadre:
 *  - se fija el ancho del viewport al ancho real del contenido del tablero
 *    (su capa principal), de modo que no quede fondo de página a los lados;
 *  - la altura del viewport se deriva de la proporción de referencia;
 *  - `deviceScaleFactor` ajusta los píxeles finales a 1600 × 1726 exactos, así
 *    que el archivo se escribe ya a su tamaño definitivo, sin reescalado;
 *  - se ocultan las barras de desplazamiento y se espera al dibujo de los
 *    gráficos: no hay bordes del navegador en la imagen.
 *
 * Uso: node integrado/tools/capturar-portadas.mjs [--solo=gaza-observatorio]
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const DESTINO = resolve("../../dist/img");

/* Proporción de la tarjeta de referencia (Walmart M5): 1600 × 1726. */
const ANCHO = 1600;
const ALTO = 1726;

const PORTADAS = [
  {
    archivo: "clientes-campanas-resumen.jpg",
    etiqueta: "Clientes y campañas",
    /* La vista de campañas deja el encabezado y la curva de targeting completa:
       una visualización representativa, no solo la cabecera. */
    url: `${SITIO}/dashboards/clientes-campanas/index.html#campanas`,
    selectorListo: "#target-chart svg",
    contenedor: ".shell",
  },
  {
    archivo: "clientes-en-movimiento-resumen.jpg",
    etiqueta: "Clientes en movimiento",
    url: `${SITIO}/dashboards/clientes-en-movimiento/index.html`,
    selectorListo: "#scatter",
    contenedor: ".shell",
  },
  {
    archivo: "gaza-observatorio-resumen.jpg",
    etiqueta: "Gaza · Vidas y territorio",
    /* El mapa bivariado con su leyenda es la visualización más representativa;
       se captura con la cabecera del observatorio, que declara el corte de cada
       fuente. La pestaña se activa antes de fotografiar. */
    url: `${SITIO}/dashboards/gaza-observatorio/index.html`,
    selectorListo: "#biMap svg",
    contenedor: "main",
    /* Con el mapa al ancho de la sección, la tarjeta completa (mapa + leyenda y
       detalle debajo) mide más que el encuadre de la portada. Se fotografía a un
       ancho de contenido de 900 px, donde el mapa conserva resolución y la
       leyenda entra en el mismo plano vertical. */
    ancho: 900,
    preparar: async (pagina) => {
      await pagina.click('[role="tab"][data-tab="evolucion"]');
      await pagina.waitForTimeout(2400);
      await pagina.evaluate(() => {
        const tarjeta = document.querySelector("#biMap")?.closest(".card");
        if (tarjeta) window.scrollTo(0, Math.max(0, tarjeta.getBoundingClientRect().top + window.scrollY - 8));
      });
    },
  },
];

const solo = process.argv.find((argumento) => argumento.startsWith("--solo="))?.split("=")[1];
const navegador = await chromium.launch();
const resultados = [];

/**
 * Ancho al que el contenido del tablero llena el viewport.
 *
 * El tablero limita su capa (`.shell`) a un máximo y la centra: si se fotografía
 * a un ancho mayor, la captura arrastra una banda de fondo a los lados que no
 * forma parte del diseño. Se mide y se reduce el viewport hasta que la capa lo
 * ocupa por completo.
 */
async function anchoDelContenido(url, selector, contenedor) {
  let ancho = ANCHO;
  for (let intento = 0; intento < 5; intento += 1) {
    const sonda = await navegador.newPage({ viewport: { width: ancho, height: ALTO } });
    await sonda.goto(url, { waitUntil: "domcontentloaded" });
    await sonda.waitForSelector(selector, { state: "attached", timeout: 60000 });
    const medido = await sonda.evaluate((sel) => {
      const capa = document.querySelector(sel) || document.body;
      return Math.round(capa.getBoundingClientRect().width);
    }, contenedor);
    await sonda.close();
    if (medido >= ancho - 1) return ancho;
    ancho = medido;
  }
  return ancho;
}

for (const portada of PORTADAS) {
  if (solo && !portada.archivo.startsWith(solo)) continue;

  /* 1. Ancho exacto del contenido: sin bandas de fondo a los lados. */
  const anchoContenido = portada.ancho ?? (await anchoDelContenido(portada.url, portada.selectorListo, portada.contenedor));

  /* 2. Captura a la proporción de referencia, con píxeles exactos. */
  const alto = Math.round((anchoContenido * ALTO) / ANCHO);
  const pagina = await navegador.newPage({
    viewport: { width: anchoContenido, height: alto },
    deviceScaleFactor: ANCHO / anchoContenido,
  });
  const errores = [];
  pagina.on("pageerror", (error) => errores.push(error.message));
  await pagina.goto(portada.url, { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(portada.selectorListo, { state: "attached", timeout: 60000 });
  /* Algunas portadas necesitan activar una pestaña antes de fotografiar. */
  if (portada.preparar) await portada.preparar(pagina);
  /* Sin barras de desplazamiento: no son parte del tablero. */
  await pagina.addStyleTag({ content: "html{scrollbar-width:none}::-webkit-scrollbar{display:none}" });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(900);
  if (errores.length) throw new Error(`${portada.etiqueta}: error en el tablero (${errores[0]})`);

  const estado = await pagina.evaluate((sel) => {
    const capa = document.querySelector(sel) || document.body;
    return {
      anchoVentana: document.documentElement.clientWidth,
      anchoContenido: Math.round(capa.getBoundingClientRect().width),
      desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      nan: /NaN|undefined/.test(document.body.innerText),
    };
  }, portada.contenedor);
  if (estado.desborde > 1) throw new Error(`${portada.etiqueta}: el tablero desborda ${estado.desborde} px`);
  if (estado.nan) throw new Error(`${portada.etiqueta}: hay valores NaN en pantalla`);

  const ruta = resolve(DESTINO, portada.archivo);
  const buffer = await pagina.screenshot({ type: "jpeg", quality: 88 });
  writeFileSync(ruta, buffer);
  await pagina.close();

  /* 3. Se comprueba el tamaño real del archivo, no el esperado. */
  const dimensiones = dimensionesJpeg(buffer);
  if (dimensiones.ancho !== ANCHO || dimensiones.alto !== ALTO) {
    throw new Error(
      `${portada.etiqueta}: la captura salió ${dimensiones.ancho} × ${dimensiones.alto} en lugar de ${ANCHO} × ${ALTO}`,
    );
  }
  resultados.push({
    portada: portada.etiqueta,
    archivo: ruta,
    anchoCss: anchoContenido,
    altoCss: alto,
    escala: Number((ANCHO / anchoContenido).toFixed(4)),
    pixeles: `${dimensiones.ancho} × ${dimensiones.alto}`,
    kilobytes: Math.round(buffer.length / 1024),
  });
}

await navegador.close();

for (const fila of resultados) {
  console.log(
    `portada: ${fila.portada} → ${fila.archivo}\n` +
      `  contenido ${fila.anchoCss} × ${fila.altoCss} CSS · escala ${fila.escala}× · ` +
      `${fila.pixeles} px · ${fila.kilobytes} KB`,
  );
}
if (!resultados.length) {
  console.log("no se capturó ninguna portada (revisa --solo=)");
  process.exitCode = 1;
}

/** Lee ancho y alto de un JPEG recorriendo sus segmentos. */
function dimensionesJpeg(buffer) {
  let posicion = 2;
  while (posicion < buffer.length) {
    if (buffer[posicion] !== 0xff) {
      posicion += 1;
      continue;
    }
    const marcador = buffer[posicion + 1];
    const longitud = buffer.readUInt16BE(posicion + 2);
    /* SOF0…SOF15, excluyendo DHT (C4), JPG (C8) y DAC (CC). */
    if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
      return { alto: buffer.readUInt16BE(posicion + 5), ancho: buffer.readUInt16BE(posicion + 7) };
    }
    posicion += 2 + longitud;
  }
  throw new Error("no se pudo leer el tamaño del JPEG");
}
