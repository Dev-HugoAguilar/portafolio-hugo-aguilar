/**
 * «Hallazgos del análisis»: todo el texto debe ir en negro (sin colores por métrica)
 * y seguir mostrando las cifras reales de los filtros vigentes.
 */
import { chromium } from "@playwright/test";

const URL = "http://127.0.0.1:8000/#/area/dashboards/atlas-vial";
const EV = "evidencias/atlas";

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 2 });
await pagina.goto(URL, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector("[data-testid=hallazgos]", { timeout: 90000 });
await pagina.waitForTimeout(1500);

const informe = await pagina.evaluate(() => {
  const lista = document.querySelector("[data-testid=hallazgos]");
  const host = lista.closest("#hallazgos-host") ?? lista.parentElement;
  const textos = [];
  const recorrer = (nodo) => {
    for (const hijo of nodo.querySelectorAll("*")) {
      const propio = [...hijo.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(" ")
        .trim();
      if (!propio) continue;
      const estilo = getComputedStyle(hijo);
      textos.push({
        etiqueta: hijo.tagName.toLowerCase(),
        clase: hijo.className,
        texto: propio.slice(0, 48),
        color: estilo.color,
        tamano: estilo.fontSize,
        peso: estilo.fontWeight,
      });
    }
  };
  recorrer(host);
  const titulo = host.querySelector("h1, h2, h3, h4");
  const colores = [...new Set(textos.map((t) => t.color))];
  return {
    textos,
    coloresDistintos: colores,
    todosNegros: colores.length === 1 && colores[0] === "rgb(17, 19, 24)",
    tituloHost: titulo ? { texto: titulo.textContent.trim(), color: getComputedStyle(titulo).color } : null,
    hallazgos: [...lista.querySelectorAll("li")].map((li) => ({
      titulo: li.querySelector(".at-hallazgo-titulo")?.textContent.trim(),
      colorTitulo: getComputedStyle(li.querySelector(".at-hallazgo-titulo")).color,
      colorTexto: getComputedStyle(li.querySelector(".at-hallazgo-texto")).color,
      detalle: li.querySelector(".at-hallazgo-texto")?.textContent.trim().slice(0, 70),
    })),
    caja: (() => {
      const c = host.getBoundingClientRect();
      return { ancho: Math.round(c.width), alto: Math.round(c.height) };
    })(),
  };
});

await pagina.locator("#hallazgos-host").screenshot({ path: `${EV}/hallazgos-negro.png` });
await pagina.screenshot({ path: `${EV}/hallazgos-pagina.png` });
console.log(
  JSON.stringify(
    {
      coloresDistintos: informe.coloresDistintos,
      todosNegros: informe.todosNegros,
      tituloHost: informe.tituloHost,
      cantidadTextos: informe.textos.length,
      hallazgos: informe.hallazgos,
      caja: informe.caja,
      capturas: [`${EV}/hallazgos-negro.png`, `${EV}/hallazgos-pagina.png`],
    },
    null,
    1,
  ),
);
await navegador.close();
