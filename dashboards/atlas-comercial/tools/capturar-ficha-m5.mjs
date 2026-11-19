/**
 * Resumen del tablero para la portada de la tarjeta del caso.
 *
 * Genera la imagen con el **mismo formato que el resto de los tableros** del
 * portafolio (`*-resumen`): una captura vertical de página completa del tablero
 * a 1 600 px de ancho, con su encabezado, las cifras del plan y el inicio de la
 * tabla. No es una maqueta ni una reconstrucción: se monta el módulo real
 * (`dist/dashboards/atlas-comercial/app.js`) contra la API publicada y se
 * fotografía lo que dibuja.
 *
 * No añade páginas al sitio: el tablero se monta en una página en blanco del
 * mismo origen, con `base href` para resolver el módulo y su hoja de estilos.
 *
 * Destino: `dist/img/walmart-m5-resumen.jpg` (1 600 × 1 726 px, JPEG calidad 90).
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";
const PANTALLA = "resultados";
const DESTINO = "../../dist/img/walmart-m5-resumen.jpg";

/* Mismo tamaño que los resúmenes ya publicados de otros tableros. */
const ANCHO = 1600;
const ALTO = 1726;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({
  viewport: { width: ANCHO, height: ALTO },
  deviceScaleFactor: 1,
});

const errores = [];
pagina.on("pageerror", (error) => errores.push(error.message.slice(0, 160)));

/* Mismo origen que el sitio para que el módulo y sus estilos carguen igual. */
await pagina.goto(`${SITIO}/`, { waitUntil: "domcontentloaded" });
await pagina.setContent(
  `<!doctype html>
   <html lang="es"><head>
     <meta charset="utf-8">
     <base href="${SITIO}/">
     <link rel="stylesheet" href="dashboards/atlas-comercial/app.css">
     <style>
       html, body { margin: 0; padding: 0; background: #f7f8fc; }
       #host { width: ${ANCHO}px; }
     </style>
   </head>
   <body>
     <div id="host"></div>
     <script type="module">
       window.PORTFOLIO_COMERCIAL_API = ${JSON.stringify(API)};
       const url = new URL("?ac_pantalla=${PANTALLA}", location.href);
       history.replaceState(null, "", url);
       import(${JSON.stringify(SITIO + "/dashboards/atlas-comercial/app.js")}).then((modulo) => {
         window.__instancia = modulo.mount(document.getElementById("host"), {
           apiBase: ${JSON.stringify(API)},
         });
       });
     </script>
   </body></html>`,
  { waitUntil: "domcontentloaded" },
);

await pagina.waitForSelector(".ac-app", { timeout: 180000 });
/* Se espera a las cifras del plan: la imagen no puede salir a medio cargar. */
await pagina.waitForSelector(".ac-plan-resumen", { timeout: 180000 });
await pagina.waitForFunction(
  () => /1[\s.,]?335[\s.,]?219/.test(document.querySelector(".ac-plan-resumen")?.textContent ?? ""),
  undefined,
  { timeout: 180000 },
);
await pagina.waitForTimeout(1500);

const activa = await pagina.evaluate(
  () => document.querySelector('.ac-tabs-btn[aria-selected="true"]')?.dataset.pantalla ?? null,
);
if (activa !== PANTALLA) {
  throw new Error(`el tablero abrió «${activa}» y se esperaba «${PANTALLA}»`);
}

await pagina.screenshot({ path: DESTINO, type: "jpeg", quality: 90 });
console.log(`${DESTINO} · ${ANCHO}×${ALTO} px JPEG`);
if (errores.length) console.log("errores de página:", errores.slice(0, 3));

await navegador.close();
