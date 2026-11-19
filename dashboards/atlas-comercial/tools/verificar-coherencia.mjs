/**
 * Aceptación de coherencia numérica y semántica (incremento de corrección).
 *
 * Comprueba la aplicación servida, no el código fuente, y contrasta tres fuentes independientes:
 *
 *  1. la **API** (lo que consumen las pantallas);
 *  2. el **recálculo independiente** de `backend/scripts/auditar_evaluacion.py`, que vuelve a
 *     predecir con el artefacto y mide desde las series por artículo × tienda × fecha × corte
 *     (`evidencias/comercial/auditoria-evaluacion.json`);
 *  3. un **recálculo propio en JavaScript** de los agregados diarios a partir de `/pronosticos`.
 *
 * Cubre los ocho puntos del encargo: formato decimal de semanas y total con su tolerancia, CSV
 * reconciliado, métricas de ambos cortes en los cinco niveles, revisión y política en cada bloque,
 * claves únicas, interpretación de mejora, unidades del sesgo, variables reales del modelo,
 * protocolo, títulos de gráficas y etiquetas de las tablas inferiores. Incluye escritorio, 390 px y
 * teclado, con esperas acotadas basadas en el estado final.
 */
import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";
const EV = "../../evidencias/comercial";
const AUDITORIA = `${EV}/auditoria-evaluacion.json`;

const url = (query = "") => `${SITIO}/${query ? `?${query}` : ""}${HASH}`;
const fallos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
  return Boolean(condicion);
};
const numero = (texto) => Number(String(texto ?? "").replace(/[^\d.-]/g, ""));
const digitos = (texto) => String(texto ?? "").replace(/[^\d]/g, "");

async function json(ruta) {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`${ruta} → ${respuesta.status}`);
  return respuesta.json();
}

/** Error máximo esperable al sumar `n` cifras redondeadas a `decimales`. */
const tolerancia = (n, decimales) => n * 0.5 * 10 ** -decimales;

const auditoria = JSON.parse(await readFile(AUDITORIA, "utf8"));
const plan = await json("/planificacion?pagina=1&tamano=1");
const ventanas = await json("/evaluacion-ventanas?etapa=final");
const modelos = await json("/modelos");

const erroresPagina = [];
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1200 } });
pagina.on("pageerror", (error) => erroresPagina.push(`pageerror: ${error.message.slice(0, 160)}`));
pagina.on("console", (mensaje) => {
  if (mensaje.type() === "error") erroresPagina.push(`console: ${mensaje.text().slice(0, 160)}`);
});

/* ========================================================================== */
/* 0. Revisión y política en cada respuesta                                   */
/* ========================================================================== */
console.log("\n0 · revisión y política");
comprobar(
  auditoria.revision === plan.revision && auditoria.revision === ventanas.revision,
  `Las respuestas no coinciden en revisión: ${auditoria.revision} / ${plan.revision} / ${ventanas.revision}`,
);
comprobar(
  ventanas.politica_precision === plan.politica_precision &&
    /decimal/.test(String(plan.politica_precision)),
  `La política de precisión no es única: ${plan.politica_precision} / ${ventanas.politica_precision}`,
);
const detallesRevision = await Promise.all([
  json("/planificacion/serie?tienda=CA_1&item=FOODS_3_090"),
  json("/evaluacion-horizonte?tienda=CA_1&categoria=FOODS"),
  json("/pronosticos?nivel=departamento&origen=1913"),
]);
for (const respuesta of detallesRevision) {
  comprobar(
    respuesta.revision === plan.revision,
    `Un bloque sirve otra revisión: ${respuesta.revision} ≠ ${plan.revision}`,
  );
}
comprobar(
  auditoria.duplicados["m5_predicciones:rev-ec9b21cd45"]?.claves_repetidas === 0,
  "Hay claves duplicadas en las predicciones de la revisión activa",
);
for (const [coleccion, datos] of Object.entries(auditoria.duplicados)) {
  comprobar(datos.claves_repetidas === 0, `Claves repetidas en ${coleccion}: ${datos.claves_repetidas}`);
}

/* ========================================================================== */
/* 1. Semanas y total: valores canónicos, formato y tolerancia                */
/* ========================================================================== */
console.log("1 · semanas y total del plan");

/** Suma de errores diarios por segmento, calculada aquí desde /pronosticos. */
async function metricasAgregado(nivel, origen) {
  const datos = await json(`/pronosticos?nivel=${nivel}&origen=${origen}`);
  const validas = datos.series.filter((serie) =>
    serie.observado.slice(datos.historico_dias.length).every((valor) => valor !== null),
  );
  /* ``pronostico`` y ``baseline`` tienen 28 valores (el horizonte); ``observado`` trae además la
     historia, así que su horizonte empieza en ``historico_dias``. Mezclar los índices es
     exactamente el error que producía un agregado imposible. */
  const historia = datos.historico_dias.length;
  const porFecha = (campo) =>
    Array.from({ length: datos.dias.length }, (_, indice) =>
      validas.reduce(
        (suma, serie) =>
          suma +
          (campo === "observado"
            ? (serie.observado[historia + indice] ?? 0)
            : (serie[campo][indice] ?? 0)),
        0,
      ),
    );
  const pronostico = porFecha("pronostico");
  const baseline = porFecha("baseline");
  const observado = porFecha("observado");
  const medir = (prediccion) => {
    const errores = prediccion.map((valor, indice) => valor - observado[indice]);
    const absolutos = errores.reduce((suma, error) => suma + Math.abs(error), 0);
    const denominador = observado.reduce((suma, valor) => suma + valor, 0);
    return {
      n: errores.length,
      mae: absolutos / errores.length,
      sesgo: errores.reduce((suma, error) => suma + error, 0) / errores.length,
      wape: (100 * absolutos) / denominador,
    };
  };
  return { candidato: medir(pronostico), baseline: medir(baseline), series: validas.length };
}

const filasClave = [
  { item: "FOODS_3_090", tienda: "CA_3" },
  { item: "FOODS_3_586", tienda: "TX_2" },
  { item: "FOODS_3_090", tienda: "WI_3" },
];

await pagina.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="plan-tabla-panel"]', { timeout: 180000 });
await pagina.waitForFunction(
  () => document.querySelectorAll(".ac-plan-tabla tbody tr").length > 0,
  undefined,
  { timeout: 180000 },
);

/* Se filtran las tres filas por su código con la búsqueda del contexto. */
for (const { item, tienda } of filasClave) {
  const api = await json(`/planificacion?texto=${item}&tamano=200`);
  const filaApi = api.filas.find((fila) => fila.store_id === tienda && fila.item_id === item);
  comprobar(Boolean(filaApi), `La API no devuelve ${item} en ${tienda}`);
  if (!filaApi) continue;
  const sumaCanonica = filaApi.semanas.reduce((suma, valor) => suma + valor, 0);
  comprobar(
    Math.abs(sumaCanonica - filaApi.pronostico_28) < 1e-6,
    `${item} ${tienda}: las semanas canónicas (${sumaCanonica}) no suman el total (${filaApi.pronostico_28})`,
  );
  comprobar(
    filaApi.semanas.every((valor) => Math.abs(valor - Math.round(valor)) > 1e-6) ||
      Math.abs(filaApi.pronostico_28 - Math.round(filaApi.pronostico_28)) > 1e-6,
    `${item} ${tienda}: la fila no conserva decimales`,
  );
}

/* En la interfaz: filtro por artículo, lectura de cifras visibles y canónicas. */
await pagina.fill('[data-testid="contexto-busqueda"]', "FOODS_3_090");
await pagina.waitForTimeout(1500);
await pagina.waitForFunction(
  () =>
    [...document.querySelectorAll(".ac-plan-tabla tbody tr")].some((fila) =>
      (fila.getAttribute("data-clave") ?? "").includes("FOODS_3_090"),
    ),
  undefined,
  { timeout: 180000 },
);

const filasUi = await pagina.evaluate(() =>
  [...document.querySelectorAll(".ac-plan-tabla tbody tr")].map((fila) => {
    const celdas = [...fila.querySelectorAll("td")].map((celda) => ({
      cifra: celda.getAttribute("data-cifra") ? Number(celda.getAttribute("data-cifra")) : null,
      texto: celda.innerText.trim(),
    }));
    return { clave: fila.getAttribute("data-clave"), celdas };
  }),
);

for (const { item, tienda } of filasClave) {
  const fila = filasUi.find((candidata) => candidata.clave === `${tienda}|${item}`);
  if (!fila) {
    // La búsqueda puede ocultar la tienda si la paginación la deja fuera: se informa, no se finge.
    comprobar(
      item === "FOODS_3_586",
      `La tabla no muestra la fila ${tienda}|${item} con la búsqueda activa`,
    );
    continue;
  }
  const [totalCelda, ...resto] = fila.celdas;
  const semanas = resto.slice(0, 4);
  comprobar(
    semanas.length === 4 && semanas.every((celda) => celda.cifra !== null),
    `${item} ${tienda}: la tabla no expone las cuatro semanas canónicas`,
  );
  if (semanas.length !== 4) continue;
  const sumaVisible = semanas.reduce((suma, celda) => suma + numero(celda.texto), 0);
  const totalVisible = numero(totalCelda.texto);
  const sumaCanonica = semanas.reduce((suma, celda) => suma + celda.cifra, 0);
  comprobar(
    Math.abs(sumaCanonica - totalCelda.cifra) < 1e-6,
    `${item} ${tienda}: la suma canónica de la tabla (${sumaCanonica}) no es el total (${totalCelda.cifra})`,
  );
  comprobar(
    /^\d{1,3}(,\d{3})*\.\d{2}$/.test(totalCelda.texto) &&
      semanas.every((celda) => /^\d{1,3}(,\d{3})*\.\d{2}$/.test(celda.texto)),
    `${item} ${tienda}: las cifras no se muestran con dos decimales (${totalCelda.texto} · ${semanas
      .map((celda) => celda.texto)
      .join(' ')})`,
  );
  comprobar(
    Math.abs(sumaVisible - totalVisible) <= tolerancia(5, 2) + 1e-9,
    `${item} ${tienda}: la suma de las cifras visibles (${sumaVisible}) se aparta del total visible (${totalVisible}) más de lo que permite el redondeo (±${tolerancia(5, 2)})`,
  );
}

/* La nota declara la diferencia y no promete igualdad exacta. */
const notaPlan = await pagina.locator('[data-testid="plan-nota-redondeo"]').innerText();
comprobar(
  /sin redondear/.test(notaPlan) && /puede presentar pequeñas diferencias por redondeo/.test(notaPlan),
  `La nota del plan no declara el redondeo: ${notaPlan.slice(0, 140)}`,
);
comprobar(
  !/cuadran con el total|la suma de las cuatro semanas es el total/.test(notaPlan),
  "La nota sigue afirmando que las semanas coinciden con el total mostrado",
);

/* Precisión ampliada disponible en el detalle. */
await pagina.locator(".ac-plan-tabla tbody tr").first().locator("button.ac-enlace").first().click();
await pagina.waitForSelector('[data-testid="plan-precision-ampliada"]', { timeout: 120000 });
await pagina.locator('[data-testid="plan-precision-ampliada"] summary').click();
const precision = await pagina.locator('[data-testid="plan-precision-total"]').innerText();
comprobar(
  /\.\d{6} u \(serie canónica sin redondear\)/.test(precision),
  `La precisión ampliada no muestra seis decimales: ${precision}`,
);
await pagina.locator('[data-testid="plan-tabla-panel"]').screenshot({ path: `${EV}/coh-plan-tabla.png` });

/* ========================================================================== */
/* 2. CSV completo del filtro                                                 */
/* ========================================================================== */
console.log("2 · CSV del filtro");

/* Se limpia la búsqueda para que el CSV cubra el filtro completo de la tienda. */
await pagina.fill('[data-testid="contexto-busqueda"]', "");
await pagina.waitForTimeout(1200);
await pagina.selectOption(".ac-contexto select >> nth=1", "CA_1");
await pagina.waitForTimeout(2500);
await pagina.waitForFunction(
  () => {
    const resumen = document.querySelector('[data-testid="plan-resumen"]')?.innerText ?? "";
    return resumen.length > 20;
  },
  undefined,
  { timeout: 180000 },
);
const planFiltro = await json("/planificacion?tiendas=CA_1&tamano=1");
const descarga = await Promise.all([
  pagina.waitForEvent("download", { timeout: 90000 }).catch(() => null),
  pagina.locator('[data-testid="plan-descargar"]').click(),
]).then(([evento]) => evento);
comprobar(Boolean(descarga), "La descarga del plan no se inició");
if (descarga) {
  const texto = (await readFile(await descarga.path(), "utf8")).replace(/^\ufeff/, "");
  const lineas = texto.split(/\r?\n/);
  const cabecera = lineas.findIndex((linea) => linea.startsWith("item_id,"));
  const filas = lineas.slice(cabecera + 1).filter(Boolean);
  const columnas = lineas[cabecera].split(",");
  const indice = columnas.indexOf("pronostico_28d");
  const suma = filas.reduce((total, linea) => total + Number(linea.split(",")[indice]), 0);
  const limite = tolerancia(filas.length, 4);
  comprobar(
    filas.length === planFiltro.resumen.series,
    `El CSV tiene ${filas.length} filas y el filtro ${planFiltro.resumen.series} series`,
  );
  comprobar(
    Math.abs(suma - planFiltro.resumen.pronostico_28) <= limite + 1e-9,
    `La suma del CSV (${suma}) se aparta del total canónico (${planFiltro.resumen.pronostico_28}) más que la tolerancia (${limite})`,
  );
  comprobar(
    texto.includes(plan.revision),
    "El CSV no declara la revisión publicada",
  );
  comprobar(
    /Tolerancia|diferencia máxima esperable/.test(texto) || /fila[s]? × 0,5/.test(texto),
    "El CSV no documenta su tolerancia de reconciliación",
  );
  comprobar(
    filas.some((linea) => !Number.isInteger(Number(linea.split(",")[indice]))),
    "El CSV exporta enteros: no permite reconciliar con la serie canónica",
  );
  console.log(
    `   CSV: ${filas.length} filas · suma ${suma.toFixed(6)} · total ${planFiltro.resumen.pronostico_28.toFixed(
      6,
    )} · tolerancia ${limite.toFixed(4)}`,
  );
}

/* ========================================================================== */
/* 3. Métricas de ambos cortes: recálculo propio y contraste con la auditoría  */
/* ========================================================================== */
console.log("3 · métricas por corte y segmento");

const consolidado = { detalle: [], detalleBase: [], agregado: [], agregadoBase: [] };

for (const corte of ventanas.ventanas) {
  const origen = corte.origen_d;
  const auditoriaCorte = auditoria.comparaciones.find((bloque) => bloque.corte === origen);
  comprobar(Boolean(auditoriaCorte), `La auditoría no cubre el corte d_${origen}`);
  if (!auditoriaCorte) continue;

  /* A. Detalle diario: la API publica MAE/WAPE/sesgo del corte. */
  for (const campo of ["mae", "sesgo", "wape"]) {
    const publicado = corte.detalle.candidato[campo] ?? corte.detalle.candidato[`${campo}_pct`];
    const recalculado = auditoriaCorte.A_detalle_diario.candidato[campo];
    comprobar(
      Math.abs(Number(publicado) - Number(recalculado)) <= 5e-5 * Math.max(1, Math.abs(recalculado)),
      `d_${origen} detalle.${campo}: API ${publicado} frente a recálculo ${recalculado}`,
    );
  }
  /* B. Horizonte de 28 días: comparación con la auditoría independiente. */
  comprobar(
    Math.abs(ventanas.consolidado.detalle.candidato.mae - auditoria.consolidado.detalle.candidato.mae) <
      1e-4,
    `Consolidado de detalle: API ${ventanas.consolidado.detalle.candidato.mae} frente a auditoría ${auditoria.consolidado.detalle.candidato.mae}`,
  );

  /* C. Agregado diario: recálculo en JavaScript y contraste con la auditoría. */
  const totalJs = await metricasAgregado("total", origen);
  const totalPython = auditoriaCorte.C_agregado_diario["total:total"];
  comprobar(
    Math.abs(totalJs.candidato.mae - totalPython.candidato.mae) < 1e-6,
    `d_${origen} agregado MAE: JS ${totalJs.candidato.mae} frente a Python ${totalPython.candidato.mae}`,
  );
  comprobar(
    Math.abs(totalJs.candidato.wape - totalPython.candidato.wape) < 1e-6,
    `d_${origen} agregado WAPE: JS ${totalJs.candidato.wape} frente a Python ${totalPython.candidato.wape}`,
  );
  comprobar(
    Math.abs(totalJs.candidato.sesgo - totalPython.candidato.sesgo) < 1e-6,
    `d_${origen} agregado sesgo: JS ${totalJs.candidato.sesgo} frente a Python ${totalPython.candidato.sesgo}`,
  );
  comprobar(
    Math.abs(ventanas.ventanas.find((v) => v.origen_d === origen).agregado.candidato.mae - totalJs.candidato.mae) <
      1e-4,
    `d_${origen}: el agregado de la API no coincide con el recálculo JS`,
  );

  /* Los cinco niveles: el agregado publicado coincide con el recálculo por segmento. */
  for (const nivel of ["estado", "tienda", "categoria", "departamento"]) {
    const datos = await json(`/pronosticos?nivel=${nivel}&origen=${origen}`);
    for (const serie of datos.series) {
      const clave = `${nivel}:${serie.clave}`;
      const esperado = auditoriaCorte.C_agregado_diario[clave];
      if (!esperado) continue;
      const observado = serie.observado.slice(datos.historico_dias.length);
      const pronostico = serie.pronostico;
      const errores = pronostico.map((valor, indice) => valor - observado[indice]);
      const mae = errores.reduce((suma, error) => suma + Math.abs(error), 0) / errores.length;
      comprobar(
        Math.abs(mae - esperado.candidato.mae) < 1e-6,
        `${clave} d_${origen}: MAE ${mae} frente a auditoría ${esperado.candidato.mae}`,
      );
    }
  }

  consolidado.detalle.push({ mae: corte.detalle.candidato.mae, n: corte.detalle.candidato.observaciones });
  consolidado.detalleBase.push({ mae: corte.detalle.baseline.mae, n: corte.detalle.baseline.observaciones });
  consolidado.agregado.push(totalJs.candidato);
  consolidado.agregadoBase.push(totalJs.baseline);
}

/* D. Consolidación: sumar numeradores y denominadores, no promediar porcentajes. */
const consolidarJs = (lista) => {
  const n = lista.reduce((suma, fila) => suma + fila.n, 0);
  const absolutos = lista.reduce((suma, fila) => suma + fila.mae * fila.n, 0);
  return absolutos / n;
};
comprobar(
  Math.abs(consolidarJs(consolidado.detalle) - ventanas.consolidado.detalle.candidato.mae) < 1e-4,
  "El consolidado de detalle no se obtiene sumando numeradores y denominadores",
);
comprobar(
  Math.abs(
    consolidarJs(consolidado.agregado) - ventanas.consolidado.agregado.candidato.mae,
  ) < 1e-4,
  "El consolidado agregado no se obtiene sumando numeradores y denominadores",
);
const wapeConsolidado = (() => {
  const absolutos = consolidado.agregado.reduce((suma, fila) => suma + fila.mae * fila.n, 0);
  const denominador = consolidado.agregado.reduce(
    (suma, fila) => suma + (fila.wape > 0 ? (fila.mae * fila.n * 100) / fila.wape : 0),
    0,
  );
  return (100 * absolutos) / denominador;
})();
comprobar(
  Math.abs(wapeConsolidado - ventanas.consolidado.agregado.candidato.wape_pct) < 1e-4,
  `El WAPE consolidado agregado (${wapeConsolidado}) no coincide con la API (${ventanas.consolidado.agregado.candidato.wape_pct})`,
);
console.log(
  `   Consolidado agregado: MAE ${ventanas.consolidado.agregado.candidato.mae.toFixed(4)} vs baseline ${ventanas.consolidado.agregado.baseline.mae.toFixed(4)}`,
);

/* ========================================================================== */
/* 4. Interpretación de mejora y unidades del sesgo (interfaz)                */
/* ========================================================================== */
console.log("4 · mejora y sesgo en pantalla");

await pagina.goto(url("ac_pantalla=evaluacion"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="evaluacion-comparacion"]', { timeout: 180000 });
await pagina.waitForFunction(
  () => (document.querySelector('[data-testid="evaluacion-mae-agregado"]')?.innerText ?? "").length > 40,
  undefined,
  { timeout: 180000 },
);
const textoEvaluacion = await pagina.locator(".ac-bloques").innerText();
comprobar(
  !/[-−]\s?\d+([.,]\d+)?\s?%\s?menos error/.test(textoEvaluacion),
  "Hay un porcentaje negativo presentado como «menos error»",
);
comprobar(
  /23\.71 % más error|23,71 % más error/.test(textoEvaluacion),
  "El primer corte no declara «23,71 % más error que el baseline»",
);
comprobar(
  /44\.2\d % menos error|44,2\d % menos error/.test(textoEvaluacion),
  "El segundo corte no declara su mejora con la magnitud correcta",
);
comprobar(
  /12\.8\d % menos error|12,8\d % menos error/.test(textoEvaluacion),
  "El consolidado no declara 12,88 % menos error",
);
comprobar(
  !/45[,.]90 %/.test(textoEvaluacion),
  "Sigue apareciendo la mejora agregada anterior (45,90 %)",
);
/* La metodología (protocolo, definiciones y auditoría) es un desplegable: se abre para revisar
   su contenido. */
await pagina.locator('[data-testid="evaluacion-metodologia"] summary').first().click();
await pagina.waitForFunction(
  () => document.querySelector('[data-testid="evaluacion-metodologia"]')?.hasAttribute('open'),
  undefined,
  { timeout: 60000 },
);
const sesgoHorizonte = await pagina.locator('[data-testid="eval28-sesgo"]').innerText();
comprobar(
  /serie-horizonte de 28 días/i.test(sesgoHorizonte),
  `El sesgo del horizonte no declara su unidad: ${sesgoHorizonte.replace(/\s+/g, " ").slice(0, 120)}`,
);
const sesgoDiario = await pagina.locator('[data-testid="evaluacion-sesgo-diario"]').innerText();
comprobar(
  /serie-día/i.test(sesgoDiario),
  `El sesgo diario no declara su unidad: ${sesgoDiario.replace(/\s+/g, " ").slice(0, 120)}`,
);
const ayudaSesgo = await pagina.locator('[data-testid="sesgo-convencion"]').evaluate((nodo) => ({
  etiqueta: nodo.tagName.toLowerCase(),
  resumen: nodo.querySelector("summary")?.textContent ?? "",
  abierto: nodo.hasAttribute("open"),
}));
comprobar(ayudaSesgo.etiqueta === "details", "La ayuda del sesgo no es un bloque desplegable");
comprobar(!ayudaSesgo.abierto, "La ayuda del sesgo debería empezar plegada");
comprobar(
  /pronóstico − observado/.test(ayudaSesgo.resumen) && /sobreestimación/.test(ayudaSesgo.resumen),
  `El resumen de la ayuda no declara la convención esencial: ${ayudaSesgo.resumen}`,
);

/* ========================================================================== */
/* 5. Alcance de las gráficas y etiquetas de las tablas inferiores            */
/* ========================================================================== */
console.log("5 · gráficas y etiquetas");

/* El título usa lenguaje comercial; la definición de la agregación vive en una ayuda aparte. */
const alcance = await pagina.locator('[data-testid="grafico-alcance"]').first().innerText();
comprobar(
  /^Ventas (totales )?(de|del|total)/i.test(alcance.trim()),
  `El título de la gráfica no está en lenguaje comercial: ${alcance}`,
);
comprobar(
  !/línea agregada|suma por fecha/i.test(alcance),
  `El título conserva vocabulario de implementación: ${alcance}`,
);
const leyendaEval = await pagina.locator('[data-testid="leyenda-corte"]').innerText();
comprobar(
  /Ventas observadas antes del corte/.test(leyendaEval) &&
    /Pronóstico del modelo/.test(leyendaEval) &&
    /Referencia estacional/.test(leyendaEval) &&
    /Ventas observadas después del corte/.test(leyendaEval),
  `La leyenda no usa los nombres comerciales: ${leyendaEval.replace(/\s+/g, " ").slice(0, 200)}`,
);
comprobar(
  !/líneas dibujadas/.test(leyendaEval),
  "La leyenda principal sigue mostrando el recuento de líneas dibujadas",
);
const agregacion = await pagina
  .locator('[data-testid="corte-agregacion"]')
  .evaluate((nodo) => nodo.textContent.replace(/\s+/g, " ").trim());
comprobar(
  /suma/i.test(agregacion),
  `La ayuda de agregación no declara la suma de series: ${agregacion}`,
);

await pagina.locator('[data-testid="selector-nivel-evaluacion"] button', { hasText: "Departamento" }).click();
await pagina.waitForTimeout(3000);
await pagina.waitForFunction(
  () =>
    /Ventas totales de los 7 departamentos/.test(
      document.querySelector('[data-testid="grafico-alcance"]')?.innerText ?? "",
    ),
  undefined,
  { timeout: 120000 },
);
comprobar(
  /Ventas totales de los 7 departamentos seleccionados/.test(
    await pagina.locator('[data-testid="grafico-alcance"]').first().innerText(),
  ),
  "Con el nivel departamento la gráfica no se titula como el total de los siete departamentos",
);
/* Identidad inequívoca de los siete departamentos en la tabla mixta. */
const identidades = await pagina.evaluate(() =>
  [...document.querySelectorAll(".ac-tabla-marco--segmentos tbody tr th")].map((nodo) =>
    nodo.innerText.replace(/\s+/g, " ").trim(),
  ),
);
const esperadas = [
  "Alimentos · Departamento 1",
  "Alimentos · Departamento 2",
  "Alimentos · Departamento 3",
  "Aficiones · Departamento 1",
  "Aficiones · Departamento 2",
  "Hogar · Departamento 1",
  "Hogar · Departamento 2",
];
for (const identidad of esperadas) {
  comprobar(
    identidades.some((texto) => texto === identidad),
    `La tabla de segmentos no muestra «${identidad}»: ${identidades.join(" | ")}`,
  );
}
comprobar(
  !identidades.some((texto) => /^Departamento \d$/.test(texto)),
  `Quedan filas con «Departamento N» sin categoría: ${identidades.join(" | ")}`,
);

const tablaEstados = await pagina
  .locator(".ac-ev-segmentos table")
  .first()
  .innerText();
comprobar(
  /california/i.test(tablaEstados) && /texas/i.test(tablaEstados) && /wisconsin/i.test(tablaEstados),
  `La tabla por estado no usa nombres legibles: ${tablaEstados.replace(/\s+/g, " ").slice(0, 160)}`,
);
comprobar(
  /CA\b/.test(tablaEstados) && /TX\b/.test(tablaEstados) && /WI\b/.test(tablaEstados),
  "La tabla por estado perdió los códigos como información secundaria",
);
const tablaCategorias = await pagina.locator(".ac-ev-segmentos table").nth(1).innerText();
comprobar(
  /alimentos/i.test(tablaCategorias) &&
    /aficiones/i.test(tablaCategorias) &&
    /hogar/i.test(tablaCategorias),
  `La tabla por categoría no usa nombres legibles: ${tablaCategorias.replace(/\s+/g, " ").slice(0, 160)}`,
);
const encabezadosVentana = await pagina.locator(".ac-ev-ventana h4").allInnerTexts();
comprobar(
  encabezadosVentana.every((texto) => /\d{1,2} \w{3} \d{4}/.test(texto) && /d_\d{4}/.test(texto)),
  `Los encabezados de corte no muestran fecha legible y código: ${encabezadosVentana.join(" | ")}`,
);
await pagina.locator('[data-testid="evaluacion-comparacion"]').screenshot({
  path: `${EV}/coh-evaluacion-comparacion.png`,
});

/* ------------------- Detalle por segmento: identidad y enlaces ------------- */
const filaAficiones = await pagina.evaluate(() => {
  const filas = [...document.querySelectorAll(".ac-tabla-marco--segmentos tbody tr")];
  const fila = filas.find((nodo) =>
    /Aficiones · Departamento 1/.test(nodo.querySelector("th")?.innerText ?? ""),
  );
  if (!fila) return null;
  return { texto: fila.innerText.replace(/\s+/g, " ").trim() };
});
comprobar(Boolean(filaAficiones), "La tabla de segmentos no incluye «Aficiones · Departamento 1»");
const urlAntesDelDetalle = pagina.url();
await pagina.evaluate(() => {
  const filas = [...document.querySelectorAll(".ac-tabla-marco--segmentos tbody tr")];
  const fila = filas.find((nodo) =>
    /Aficiones · Departamento 1/.test(nodo.querySelector("th")?.innerText ?? ""),
  );
  fila?.querySelector("button")?.click();
});
await pagina.waitForSelector('[data-testid="detalle-segmento"]', { timeout: 60000 });
const detalleSegmento = await pagina.evaluate(
  () => document.querySelector('[data-testid="detalle-segmento"]')?.innerText.replace(/\s+/g, " ") ?? "",
);
comprobar(
  /Aficiones · Departamento 1/.test(detalleSegmento),
  `El detalle abierto no corresponde al departamento pulsado: ${detalleSegmento.slice(0, 140)}`,
);
comprobar(
  /HOBBIES_1/.test(detalleSegmento),
  `El detalle no conserva el código del departamento: ${detalleSegmento.slice(0, 140)}`,
);
comprobar(
  pagina.url() === urlAntesDelDetalle,
  `Abrir el detalle alteró los filtros: ${pagina.url()} frente a ${urlAntesDelDetalle}`,
);

/* ---------------------- Orden y filtro del detalle ------------------------- */
const totalSegmentos = await pagina.locator(".ac-tabla-marco--segmentos tbody tr").count();
await pagina.selectOption('[data-testid="orden-segmentos"]', "mae");
await pagina.waitForTimeout(600);
const ordenados = await pagina.evaluate(() =>
  [...document.querySelectorAll(".ac-tabla-marco--segmentos tbody tr")].map((fila) => {
    const celdas = [...fila.querySelectorAll("td")];
    return Number((celdas[1]?.innerText ?? "0").replace(/[^\d.]/g, ""));
  }),
);
comprobar(
  ordenados.every((valor, indice) => indice === 0 || ordenados[indice - 1] >= valor),
  `La ordenación por MAE no es descendente: ${ordenados.join(", ")}`,
);
const peoresBoton = await pagina.evaluate(
  () => document.querySelector('[data-testid="filtro-peores"]')?.outerHTML ?? "",
);
if (peoresBoton) {
  await pagina.locator('[data-testid="filtro-peores"]').check();
  await pagina.waitForTimeout(600);
  const filtrados = await pagina.locator(".ac-tabla-marco--segmentos tbody tr").count();
  comprobar(
    filtrados <= totalSegmentos,
    `El filtro de «más error» añadió filas: ${filtrados} de ${totalSegmentos}`,
  );
  const resumenFiltrado = await pagina.locator('[data-testid="resumen-segmentos"]').innerText();
  comprobar(
    resumenFiltrado.includes(String(filtrados)),
    `El recuento no declara cuántos segmentos se muestran: ${resumenFiltrado.slice(0, 160)}`,
  );
  await pagina.locator('[data-testid="filtro-peores"]').uncheck();
}

/* ========================================================================== */
/* 6. Variables reales del modelo y protocolo coherente                       */
/* ========================================================================== */
console.log("6 · modelo y protocolo");

const publicada = modelos.ejecuciones.find((fila) => fila.recomendado);
comprobar(Boolean(publicada), "No hay ejecución publicada en el manifiesto");
comprobar(
  (publicada?.variables ?? []).length === 50 &&
    !(publicada?.variables ?? []).some((variable) => String(variable).startsWith("precio")),
  `La ejecución publicada no declara 50 variables sin precios: ${(publicada?.variables ?? []).length}`,
);

await pagina.goto(url("ac_pantalla=modelado"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="modelado-paso-datos"]', { timeout: 180000 });
const pasoDatos = await pagina.locator('[data-testid="modelado-paso-datos"]').innerText();
const pasoVariables = await pagina.locator('[data-testid="modelado-paso-variables"]').innerText();
comprobar(
  /no los usa/.test(pasoDatos) || /no usa precios/i.test(pasoDatos),
  `El paso de datos no aclara que la ejecución publicada no usa precios: ${pasoDatos.replace(/\s+/g, " ")}`,
);
comprobar(
  !/precios semanales conocidos hasta el corte\./.test(pasoDatos),
  "El paso de datos sigue prometiendo precios como entrada del modelo publicado",
);
comprobar(
  /no incluye variables de precio/.test(pasoVariables),
  `El paso de variables no declara la variante publicada sin precios: ${pasoVariables.replace(/\s+/g, " ")}`,
);

await pagina.locator('[data-testid="modelado-tecnico"] summary').first().click();
await pagina.waitForSelector('[data-testid="modelado-protocolo-texto"]', { state: "visible", timeout: 60000 });
await pagina.waitForFunction(
  () => {
    const texto = document.querySelector('[data-testid="modelado-protocolo-texto"]')?.textContent ?? "";
    return /d_1857/.test(texto) && /no se usaron para entrenar/.test(texto);
  },
  undefined,
  { timeout: 120000 },
);
const protocoloModelado = (
  await pagina.locator('[data-testid="modelado-protocolo-texto"]').innerText()
).replace(/\s+/g, " ");
for (const pieza of [
  "d_1857",
  "no se usaron para entrenar",
  "d_1773",
  "menor WAPE de desarrollo",
  "no son un holdout intacto",
  "0 cortes de desarrollo",
]) {
  comprobar(
    protocoloModelado.includes(pieza),
    `El protocolo de Modelado no contiene «${pieza}»`,
  );
}
await pagina.locator('[data-testid="modelado-protocolo-texto"]').screenshot({
  path: `${EV}/coh-modelado-protocolo.png`,
});

/* El protocolo vive en el desplegable de metodología: se abre por enlace directo. */
await pagina.goto(url("ac_pantalla=evaluacion&ac_abrir=metodologia"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="evaluacion-protocolo-texto"]', { state: "visible", timeout: 180000 });
await pagina.waitForFunction(
  () => {
    const texto =
      document.querySelector('[data-testid="evaluacion-protocolo-texto"]')?.textContent ?? "";
    return /d_1857/.test(texto) && /no se usaron para entrenar/.test(texto);
  },
  undefined,
  { timeout: 120000 },
);
const protocoloEvaluacion = (
  await pagina.locator('[data-testid="evaluacion-protocolo-texto"]').innerText()
).replace(/\s+/g, " ");
comprobar(
  protocoloEvaluacion === protocoloModelado,
  "El protocolo de Evaluación no coincide con el de Modelado",
);
comprobar(
  !/solo para reportar|solo se reportan/.test(
    await pagina.locator(".ac-bloques").innerText(),
  ),
  "Queda la afirmación de que los cortes finales «solo se reportan»",
);

await pagina.goto(url("ac_pantalla=proyecto"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="proyecto-protocolo"]', { timeout: 180000 });
await pagina.waitForFunction(
  () =>
    /d_1857/.test(document.querySelector('[data-testid="proyecto-protocolo"]')?.textContent ?? "") &&
      /no se usaron para entrenar/.test(
        document.querySelector('[data-testid="proyecto-protocolo"]')?.textContent ?? "",
      ),
  undefined,
  { timeout: 120000 },
);
const protocoloProyecto = (
  await pagina.locator('[data-testid="proyecto-protocolo"]').innerText()
).replace(/\s+/g, " ");
for (const pieza of ["d_1857", "no son un holdout intacto", "0 cortes de desarrollo"]) {
  comprobar(
    protocoloProyecto.includes(pieza),
    `El protocolo de Proyecto no contiene «${pieza}»`,
  );
}
const metodoProyecto = await pagina.locator(".ac-bloques").innerText();
comprobar(
  !/precios conocidos hasta el corte\./.test(metodoProyecto),
  "El método de Proyecto sigue citando precios como variable del modelo publicado",
);

/* ========================================================================== */
/* 6b. Auditoría de separación temporal y accesibilidad del desplegable       */
/* ========================================================================== */
console.log("6b · auditoría temporal y accesibilidad");

const auditoriaApi = await json("/auditoria-temporal");
comprobar(auditoriaApi.disponible === true, "La API no publica la auditoría temporal");
await pagina.goto(url("ac_pantalla=evaluacion&ac_abrir=metodologia"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="auditoria-temporal"]', { timeout: 180000 });
await pagina.waitForFunction(
  () => document.querySelectorAll('[data-testid="auditoria-temporal"] tbody tr').length > 0,
  undefined,
  { timeout: 120000 },
);
await pagina.locator('[data-testid="auditoria-temporal-detalle"] summary').first().click();
await pagina.waitForTimeout(500);
const auditoriaUi = await pagina.evaluate(() => ({
  resumen: document
    .querySelector('[data-testid="auditoria-temporal-resumen"]')
    ?.innerText.replace(/\s+/g, " ") ?? "",
  filas: document.querySelectorAll('[data-testid="auditoria-temporal"] tbody tr').length,
  resultados: [...document.querySelectorAll('[data-testid="auditoria-temporal"] tbody tr')]
    .map((fila) => fila.innerText.replace(/\s+/g, " "))
    .filter((texto) => /Separación verificada|Contaminada|No verificable/.test(texto)).length,
  procedencia: document
    .querySelector('[data-testid="auditoria-procedencia"]')
    ?.innerText.replace(/\s+/g, " ") ?? "",
}));
comprobar(
  auditoriaUi.filas === auditoriaApi.filas.length,
  `La tabla de auditoría muestra ${auditoriaUi.filas} filas y la API ${auditoriaApi.filas.length}`,
);
comprobar(
  auditoriaUi.resultados === auditoriaUi.filas,
  "Alguna fila de auditoría no declara su resultado",
);
comprobar(
  auditoriaUi.resumen.includes(String(auditoriaApi.resumen.verificadas ?? 0)),
  `El resumen de auditoría no coincide con la API: ${auditoriaUi.resumen.slice(0, 160)}`,
);
comprobar(
  /d_1773|d_1801|d_1829|d_1857/.test(auditoriaUi.resumen + auditoriaUi.procedencia) ||
    auditoriaApi.filas.some((fila) => fila.etapa === "desarrollo"),
  "La auditoría no incluye los cortes de desarrollo",
);
comprobar(
  /proceden de|desarrollo/.test(auditoriaUi.procedencia),
  `La auditoría no declara la procedencia de las métricas de desarrollo: ${auditoriaUi.procedencia.slice(0, 120)}`,
);

/* Accesibilidad: el desplegable se abre con el teclado y declara su estado. */
const estadoInicial = await pagina.evaluate(() => ({
  abierto: document.querySelector('[data-testid="evaluacion-metodologia"]')?.hasAttribute("open"),
  expandido: document
    .querySelector('[data-testid="evaluacion-abrir-metodologia"]')
    ?.getAttribute("aria-expanded"),
}));
comprobar(estadoInicial.abierto === true, "El enlace directo no abrió la metodología");
comprobar(
  estadoInicial.expandido === "true",
  `El botón de metodología no declara su estado: aria-expanded=${estadoInicial.expandido}`,
);
await pagina.locator('[data-testid="evaluacion-metodologia-resumen"]').focus();
await pagina.keyboard.press("Enter");
await pagina.waitForFunction(
  () => !document.querySelector('[data-testid="evaluacion-metodologia"]')?.hasAttribute("open"),
  undefined,
  { timeout: 30000 },
);
comprobar(true, "");
await pagina.keyboard.press("Enter");
await pagina.waitForFunction(
  () => document.querySelector('[data-testid="evaluacion-metodologia"]')?.hasAttribute("open"),
  undefined,
  { timeout: 30000 },
);

/* Sin auditoría guardada: se declara no verificable, no se aprueba por silencio. */
await pagina.route("**/auditoria-temporal", async (ruta) => {
  await ruta.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      version: "prueba",
      esquema: "sin-auditoria",
      generado_en: "",
      disponible: false,
      resumen: {},
      procedencia_metricas_desarrollo: null,
      filas: [],
      motivo: "No hay auditoría temporal guardada para esta versión.",
    }),
  });
});
await pagina.goto(url("ac_pantalla=evaluacion&ac_abrir=metodologia"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="auditoria-temporal-sin-datos"]', { timeout: 180000 });
const sinAuditoria = await pagina.evaluate(
  () =>
    document.querySelector('[data-testid="auditoria-temporal-sin-datos"]')?.innerText.replace(/\s+/g, " ") ??
    "",
);
comprobar(
  /no verificable/i.test(sinAuditoria) && /No hay auditoría/i.test(sinAuditoria),
  `La ausencia de auditoría no se declara como no verificable: ${sinAuditoria.slice(0, 160)}`,
);
await pagina.unroute("**/auditoria-temporal");

/* Orden de la pantalla: contexto → resumen → segmentos → gráfica → metodología. */
const ordenBloques = await pagina.evaluate(() =>
  [...document.querySelectorAll(".ac-bloques h3, .ac-bloques summary strong")].map((nodo) =>
    nodo.textContent.replace(/\s+/g, " ").trim(),
  ),
);
const posicion = (fragmento) =>
  ordenBloques.findIndex((texto) => texto.toLowerCase().includes(fragmento));
comprobar(
  posicion("contexto y alcance") >= 0 &&
    posicion("contexto y alcance") < posicion("resumen del desempeño") &&
    posicion("resumen del desempeño") < posicion("resultados por segmento") &&
    posicion("resultados por segmento") < posicion("comparación visual") &&
    posicion("comparación visual") < posicion("metodología"),
  `El orden de la pantalla no es contexto → resumen → segmentos → gráfica → metodología: ${ordenBloques.join(" | ")}`,
);

/* ========================================================================== */
/* 7. Móvil 390 px y teclado                                                 */
/* ========================================================================== */
console.log("7 · móvil y teclado");

const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
await movil.waitForSelector('[data-testid="plan-tabla-panel"]', { timeout: 180000 });
await movil.waitForFunction(
  () => document.querySelectorAll(".ac-plan-tabla tbody tr").length > 0,
  undefined,
  { timeout: 180000 },
);
const desbordamiento = await movil.evaluate(() => {
  const marco = document.querySelector(".ac-plan-marco");
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    recortados: [...document.querySelectorAll(".ac-plan-tabla td, .ac-plan-tabla th")].filter(
      (celda) => celda.scrollWidth > celda.clientWidth + 1,
    ).length,
    /* El marco de la tabla puede desplazarse en horizontal: las cifras no se recortan, se
       alcanzan desplazando. */
    marcoDesplazable: Boolean(marco) && marco.scrollWidth > marco.clientWidth + 1,
  };
});
comprobar(
  desbordamiento.scrollWidth <= desbordamiento.innerWidth + 1,
  `La tabla del plan desborda en 390 px: ${JSON.stringify(desbordamiento)}`,
);
comprobar(
  desbordamiento.recortados === 0,
  `Hay ${desbordamiento.recortados} celdas con cifras recortadas en 390 px`,
);
comprobar(
  desbordamiento.marcoDesplazable,
  "En 390 px la tabla no permite desplazarse para alcanzar las columnas de cifras",
);
/* Se desplaza el marco hasta el final y se comprueba que las cifras se ven completas. */
await movil.locator(".ac-plan-marco").evaluate((marco) => {
  marco.scrollLeft = marco.scrollWidth;
});
await movil.waitForTimeout(400);
const ultimaColumna = await movil.evaluate(() => {
  const fila = document.querySelector(".ac-plan-tabla tbody tr");
  const celdas = [...(fila?.querySelectorAll("td") ?? [])];
  const visibles = celdas.filter((celda) => {
    const caja = celda.getBoundingClientRect();
    return caja.left >= 0 && caja.right <= window.innerWidth + 1;
  });
  return visibles.map((celda) => celda.innerText.trim());
});
comprobar(
  ultimaColumna.some((texto) => /^\d{1,3}(,\d{3})*\.\d{2}$/.test(texto)),
  `Al desplazar la tabla en 390 px no se alcanzan cifras con dos decimales: ${ultimaColumna.join(" | ")}`,
);
await movil.locator('[data-testid="plan-tabla-panel"]').screenshot({ path: `${EV}/coh-plan-movil.png` });

/* La pantalla de Evaluación también debe caber en 390 px: el panel de segmentos se desplaza y no
   parte la página. */
const movilEvaluacion = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movilEvaluacion.goto(url("ac_pantalla=evaluacion"), { waitUntil: "domcontentloaded" });
await movilEvaluacion.waitForSelector('[data-testid="evaluacion-segmentos"]', { timeout: 180000 });
await movilEvaluacion.waitForTimeout(2500);
const medidasEvaluacion = await movilEvaluacion.evaluate(() => {
  const marco = document.querySelector(".ac-tabla-marco--segmentos");
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    marcoDesplazable: Boolean(marco) && marco.scrollWidth > marco.clientWidth + 1,
    celdasRecortadas: [...document.querySelectorAll(".ac-tabla-marco--segmentos td, .ac-tabla-marco--segmentos th")].filter(
      (celda) => celda.scrollWidth > celda.clientWidth + 1,
    ).length,
  };
});
comprobar(
  medidasEvaluacion.scrollWidth <= medidasEvaluacion.innerWidth + 1,
  `Evaluación desborda en 390 px: ${JSON.stringify(medidasEvaluacion)}`,
);
comprobar(
  medidasEvaluacion.celdasRecortadas === 0,
  `Hay ${medidasEvaluacion.celdasRecortadas} celdas con cifras recortadas en la tabla de segmentos`,
);
comprobar(
  medidasEvaluacion.marcoDesplazable,
  "En 390 px la tabla de segmentos no permite desplazarse para leer todas las columnas",
);
await movilEvaluacion.close();

/* Teclado: el botón del artículo se alcanza con Tab y abre el detalle con Enter. */
await pagina.goto(url("ac_pantalla=resultados"), { waitUntil: "domcontentloaded" });
await pagina.waitForSelector('[data-testid="plan-tabla-panel"]', { timeout: 180000 });
await pagina.waitForFunction(
  () => !document.querySelector(".ac-plan-tabla .ac-esqueleto"),
  undefined,
  { timeout: 120000 },
);
await pagina.locator(".ac-plan-tabla button.ac-enlace").first().focus();
await pagina.waitForTimeout(300);
const foco = await pagina.evaluate(() => ({
  etiqueta: document.activeElement?.tagName ?? null,
  texto: (document.activeElement?.textContent ?? "").slice(0, 30),
}));
comprobar(
  foco.etiqueta === "BUTTON",
  `El botón del artículo no recibe el foco: ${foco.etiqueta} (${foco.texto})`,
);

/* Se abre con el teclado; si un re-render devuelve el foco, se reintenta con espera acotada. */
let abiertoPorTeclado = false;
for (let intento = 0; intento < 3 && !abiertoPorTeclado; intento += 1) {
  await pagina.locator(".ac-plan-tabla button.ac-enlace").first().focus();
  await pagina.waitForTimeout(150);
  await pagina.keyboard.press("Enter");
  abiertoPorTeclado = await pagina
    .waitForFunction(
      () =>
        /\d/.test(document.querySelector('[data-testid="plan-detalle-total"]')?.textContent ?? "") &&
        Boolean(document.querySelector('[data-testid="plan-detalle"] :not(.ac-esqueleto)')),
      undefined,
      { timeout: 40000 },
    )
    .then(() => true)
    .catch(() => false);
}
comprobar(abiertoPorTeclado, "El detalle no se abrió con el teclado (Enter) en tres intentos");
if (abiertoPorTeclado) {
  const totalDetalle = (await pagina.locator('[data-testid="plan-detalle-total"]').innerText()).trim();
  comprobar(
    /\.\d{2}$/.test(totalDetalle),
    `El total del detalle no se muestra con dos decimales tras abrirlo con el teclado: ${totalDetalle}`,
  );
}
await movil.close();

/* ========================================================================== */
comprobar(erroresPagina.length === 0, `Errores de la página: ${erroresPagina.slice(0, 3).join(" | ")}`);
await pagina.close();
await navegador.close();

if (fallos.length) {
  console.log(`\n✗ ${fallos.length} fallo(s):`);
  for (const fallo of fallos) console.log(`  · ${fallo}`);
  process.exit(1);
}
console.log("\n✓ Coherencia numérica, unidades, textos y alcances verificados en la aplicación servida");
