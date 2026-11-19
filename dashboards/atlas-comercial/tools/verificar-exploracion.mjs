/**
 * Verificación del incremento de exploración de Atlas Comercial.
 *
 * Comprueba contra la API y contra la página publicada:
 *  1. comparación por tienda × categoría: 12 filas en California, reconciliación y métricas;
 *  2. estacionalidad: denominadores por día observado y meses parciales marcados;
 *  3. matriz temporal: cero observado distinto de «sin dato» y escala declarada;
 *  4. precios: distribución ponderada por días y cambios con tolerancia;
 *  5. detalle de artículo: ventas, precio semanal y SNAP del estado correcto;
 *  6. intermitencia: series incluidas, rachas y paginación;
 *  7. navegación secundaria, A/B en pantalla, matriz por tienda, matriz de 28 días y móvil.
 *
 * Capturas: `evidencias/comercial/exploracion-*.png`. Sale con código 1 si algo falla.
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const RUTA = "/?ac_pantalla=exploracion#/area/ciencia-de-datos/atlas-comercial";
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";
const EV = "../../evidencias/comercial";

const fallos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
  return Boolean(condicion);
};

const json = async (ruta) => {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`${ruta} → ${respuesta.status}`);
  return respuesta.json();
};

const ahora = () => Date.now();

// ---------------------------------------------------------------------------
// 1. API: comparación por tienda × categoría
// ---------------------------------------------------------------------------
const t0 = ahora();
const comparacion = await json("/comparacion?estado=CA&desde=2015-01-01&hasta=2015-12-31");
const msComparacion = ahora() - t0;

comprobar(comparacion.resumen_filas.combinaciones === 12, "California no devuelve 12 combinaciones");
comprobar(comparacion.resumen_filas.tiendas === 4, "California no tiene 4 tiendas");
comprobar(comparacion.conteos.categorias_unicas === 3, "no hay 3 categorías únicas");
comprobar(comparacion.conteos.departamentos_unicos === 7, "no hay 7 departamentos únicos");
comprobar(
  comparacion.conteos.combinaciones_tienda_departamento === 28,
  "California no tiene 28 combinaciones tienda × departamento",
);
comprobar(
  comparacion.conteos.articulos_unicos < comparacion.conteos.series_articulo_tienda,
  "los artículos únicos y las series no se distinguen",
);
comprobar(comparacion.reconciliacion.cuadra_a && comparacion.reconciliacion.cuadra_b, "el A/B no reconcilia con el total del contexto");
comprobar(
  comparacion.filas.every((fila) => fila.dias_validos_a === fila.dias_esperados_a),
  "hay filas con días esperados distintos de los observados",
);
comprobar(
  comparacion.filas.every(
    (fila) =>
      fila.metricas.promedio_diario.a === null ||
      Math.abs(fila.metricas.promedio_diario.a - fila.unidades_a / fila.dias_validos_a) < 1e-6,
  ),
  "el promedio diario no divide entre días observados",
);
comprobar(
  comparacion.filas.every(
    (fila) =>
      fila.metricas.total.diferencia === null ||
      Math.abs(fila.metricas.total.diferencia - (fila.unidades_b - fila.unidades_a)) < 1e-6,
  ),
  "la diferencia no es B − A",
);
comprobar(
  comparacion.filas.every((fila) => fila.unidades_periodo >= Math.max(fila.unidades_a, fila.unidades_b) * 0),
  "faltan las unidades del periodo principal",
);

// Variación no calculable con base cero: HOBBIES de una tienda del sintético no existe aquí,
// así que se comprueba la regla con una ventana de un solo día muy temprana en una serie rara.
const conCero = comparacion.filas.find((fila) => fila.metricas.total.a === 0);
if (conCero) {
  comprobar(conCero.metricas.total.variacion_pct === null, "una base cero publica variación");
  comprobar(Boolean(conCero.metricas.total.motivo), "una base cero no declara el motivo");
}

// ---------------------------------------------------------------------------
// 2. API: estacionalidad
// ---------------------------------------------------------------------------
const estacionalidad = await json("/estacionalidad?estado=CA&dimension=tienda&desde=2015-01-01&hasta=2015-12-31");
const sumaSemanal = estacionalidad.semanal.grupos.reduce((total, grupo) => total + grupo.total, 0);
const sumaMensual = estacionalidad.mensual.anios.reduce(
  (total, anio) => total + anio.meses.reduce((parcial, mes) => parcial + (mes.unidades ?? 0), 0),
  0,
);
comprobar(sumaSemanal === sumaMensual, "el perfil semanal y el mensual no cuadran");
comprobar(
  estacionalidad.semanal.grupos.every((grupo) =>
    grupo.puntos.every(
      (punto) =>
        punto.promedio === null ||
        Math.abs(punto.promedio - punto.unidades / punto.fechas_validas) < 1e-3,
    ),
  ),
  "el promedio semanal no divide entre fechas con observación",
);
comprobar(estacionalidad.semanal.escala_comun_max !== null, "no se declara la escala común");
const anio2015 = estacionalidad.mensual.anios.find((anio) => anio.anio === 2015);
comprobar(
  anio2015.meses.every((mes) => mes.completo === (mes.dias_observados === mes.dias_del_mes)),
  "los meses completos no se marcan bien",
);
const completos = estacionalidad.mensual.anios.flatMap((anio) => anio.meses).filter((mes) => mes.completo);
comprobar(completos.length === 12, "2015 debería tener los 12 meses completos");

// Enero de 2011 se puede pedir completo: 31 días del mes, 3 con cobertura.
const estacionalidad2011 = await json("/estacionalidad?estado=CA&desde=2011-01-01&hasta=2011-01-31");
const enero2011 = estacionalidad2011.mensual.anios[0].meses[0];
comprobar(enero2011.dias_del_mes === 31, "enero de 2011 debe declarar 31 días de mes");
comprobar(enero2011.dias_en_intervalo === 31, "el intervalo pedido cubre enero completo");
comprobar(enero2011.dias_con_cobertura === 3, "solo hay cobertura del 29 al 31 de enero");
comprobar(enero2011.dias_observados === 3, "deben observarse 3 días");
comprobar(enero2011.parcial === true, "enero de 2011 es parcial");
comprobar(
  /3 días observados de 31/.test(enero2011.motivo ?? ""),
  "el motivo debe decir «3 días observados de 31»",
);
comprobar(
  /29/.test(enero2011.motivo ?? ""),
  "el motivo debe nombrar el inicio de los datos (29 de enero)",
);
comprobar(
  enero2011.promedio_diario === null ||
    Math.abs(enero2011.promedio_diario - enero2011.unidades / enero2011.dias_observados) < 1e-3,
  "el promedio mensual debe dividir entre días observados",
);
comprobar(
  estacionalidad2011.cobertura_ventas.dias_fuera_de_cobertura === 28,
  "el periodo pedido deja 28 días fuera de la cobertura de ventas",
);

// ---------------------------------------------------------------------------
// 3. API: matriz temporal
// ---------------------------------------------------------------------------
const matriz = await json("/matriz-temporal?estado=CA&anio=2015");
comprobar(matriz.dias.length === 365, "2015 debería tener 365 columnas");
comprobar(matriz.tiendas.length === 4, "California debería tener 4 filas");
comprobar(matriz.escala.dominio[0] === 0, "la escala no parte de cero");
comprobar(
  matriz.tiendas.every((fila) =>
    fila.valores.every((valor) => valor === null || valor >= 0),
  ),
  "hay valores negativos en la matriz",
);
comprobar(matriz.cobertura.celdas_sin_dato === 0, "2015 no debería tener celdas sin dato");
const matriz2011 = await json("/matriz-temporal?estado=CA&anio=2011");
comprobar(matriz2011.dias.length === 365, "2011 debe representar el año completo");
comprobar(matriz2011.dias[0].fecha === "2011-01-01", "la primera columna es el 1 de enero");
comprobar(
  matriz2011.dias.filter((dia) => dia.estado === "sin_dato").length === 28,
  "del 1 al 28 de enero de 2011 no hay cobertura",
);
comprobar(
  matriz2011.cobertura.celdas_sin_dato === 28 * matriz2011.tiendas.length,
  "las celdas sin dato deben ser 28 por tienda",
);
const bisiesto = await json("/matriz-temporal?estado=CA&anio=2012");
comprobar(bisiesto.dias.length === 366, "2012 es bisiesto y debería tener 366 columnas");
comprobar(bisiesto.cobertura.celdas_fuera_filtro === 0, "sin recorte, no hay celdas fuera del filtro");
const matriz2016 = await json("/matriz-temporal?estado=CA&anio=2016");
comprobar(matriz2016.dias.length === 366, "2016 es bisiesto");
comprobar(
  matriz2016.dias.filter((dia) => dia.estado === "sin_dato").length > 0,
  "2016 debe marcar como sin dato las fechas posteriores al último día de ventas",
);
const matrizRecortada = await json("/matriz-temporal?estado=CA&anio=2011&desde=2011-02-01&hasta=2011-02-28");
comprobar(matrizRecortada.dias.length === 365, "el recorte no cambia el eje anual");
comprobar(
  matrizRecortada.dias.filter((dia) => dia.estado === "fuera_del_filtro").length === 365 - 28 - 28,
  "las fechas con cobertura fuera del periodo se marcan como fuera del filtro",
);
comprobar(
  matrizRecortada.tiendas[0].dias_observados === 28,
  "los totales observados no cambian con el recorte",
);

// ---------------------------------------------------------------------------
// 4. API: precios
// ---------------------------------------------------------------------------
const t1 = ahora();
const distribucion = await json("/precios/distribucion?tienda=CA_1&desde=2015-01-01&hasta=2016-05-22");
const msDistribucion = ahora() - t1;
comprobar(
  distribucion.cobertura.completa +
    distribucion.cobertura.parcial +
    distribucion.cobertura.sin_precio ===
    distribucion.combinaciones_incluidas,
  "el desglose completa + parcial + sin precio no suma el universo",
);
comprobar(
  distribucion.cobertura.pct_dias_cubiertos !== null,
  "falta el porcentaje de días con precio",
);
comprobar(
  distribucion.sin_precio.combinaciones === distribucion.cobertura.sin_precio,
  "el detalle de sin precio no coincide con el conteo",
);
comprobar(
  (distribucion.sin_precio.con_precio_fuera_del_intervalo ?? 0) +
    (distribucion.sin_precio.sin_precio_en_toda_la_tienda ?? 0) ===
    distribucion.sin_precio.combinaciones,
  "las combinaciones sin precio deben estar explicadas",
);
comprobar(distribucion.cuartiles !== null, "la distribución no devuelve cuartiles");
comprobar(
  distribucion.cuartiles.q1 <= distribucion.cuartiles.mediana &&
    distribucion.cuartiles.mediana <= distribucion.cuartiles.q3,
  "los cuartiles están desordenados",
);
comprobar(
  distribucion.valores.filter((valor) => valor.precio_medio === null).length ===
    distribucion.cobertura.sin_precio,
  "los artículos sin precio no se cuentan como ausencia",
);
comprobar(
  distribucion.valores.every((valor) => valor.precio_medio === null || valor.precio_medio > 0),
  "hay precios cero o negativos",
);

const cambios = await json("/precios/cambios?tienda=CA_1&desde=2015-01-01&hasta=2016-05-22");
const totales = cambios.totales;
comprobar(
  totales.transiciones === totales.aumentos + totales.disminuciones + totales.sin_cambio,
  "las transiciones no suman aumentos + disminuciones + sin cambio",
);
comprobar(
  cambios.umbral.valor_usd === 0,
  "por omisión no debe haber umbral comercial: un centavo cuenta",
);
comprobar(
  cambios.precision_comparacion === "centavos",
  "la comparación debe declararse en centavos",
);
comprobar(
  cambios.umbral.precision.includes("centavos"),
  "la precisión del origen debe declararse",
);
comprobar(
  cambios.por_categoria.reduce((total, fila) => total + fila.transiciones, 0) === totales.transiciones,
  "las categorías no suman las transiciones totales",
);
comprobar(/no es una promoción/.test(cambios.nota), "la nota no aclara que una bajada no es promoción");

const evolucion = await json("/precios/evolucion?tienda=CA_1&item=FOODS_1_001&desde=2015-01-01&hasta=2015-12-31");
comprobar(evolucion.puntos.length > 0, "la evolución no devuelve puntos");
comprobar(
  evolucion.puntos.every((punto, indice, lista) => indice === 0 || punto.wm_yr_wk > lista[indice - 1].wm_yr_wk),
  "los puntos de precio no están ordenados",
);
const sinPrecio = await json("/precios/evolucion?tienda=CA_1&item=FOODS_1_056&desde=2015-01-01&hasta=2015-12-31");
comprobar(sinPrecio.puntos.length === 0 && Boolean(sinPrecio.motivo), "un artículo sin precio no declara el motivo");

// ---------------------------------------------------------------------------
// 5. API: detalle de artículo e intermitencia
// ---------------------------------------------------------------------------
const articulo = await json("/articulo?item=FOODS_1_001&tienda=CA_1&desde=2015-01-01&hasta=2015-12-31");
comprobar(articulo.articulo.estado === "CA", "el estado del artículo no es CA");
comprobar(articulo.capas.snap.length > 0, "no se dibujan días SNAP de California");
comprobar(
  articulo.capas.snap.every(
    (marca) => marca.fecha >= "2015-01-01" && marca.fecha <= "2015-12-31",
  ),
  "hay días SNAP fuera del periodo pedido",
);
const articuloTx = await json("/articulo?item=FOODS_1_001&tienda=TX_1&desde=2015-01-01&hasta=2015-12-31");
comprobar(articuloTx.capas.estado === "TX", "el estado de la tienda TX no se declara");
// SNAP depende del estado: los dos territorios no pueden compartir el mismo conjunto.
const snapCa = new Set(articulo.capas.snap.map((marca) => marca.fecha));
const snapTx = new Set(articuloTx.capas.snap.map((marca) => marca.fecha));
comprobar(
  snapCa.size !== snapTx.size || [...snapCa].some((fecha) => !snapTx.has(fecha)),
  "los días SNAP de California y Texas son idénticos: no parecen flags por estado",
);
comprobar(
  articulo.intermitencia.dias_cero + articulo.intermitencia.dias_positivos ===
    articulo.intermitencia.dias_validos,
  "la intermitencia de la serie no cuadra",
);

const t2 = ahora();
const intermitencia = await json("/intermitencia?tienda=CA_1&desde=2015-01-01&hasta=2015-12-31&tamano=25");
const msIntermitencia = ahora() - t2;
comprobar(intermitencia.resumen.series === 3049, "la intermitencia no incluye todas las series");
comprobar(intermitencia.resumen.series_todas_cero > 0, "no se cuentan las series de todo cero");
comprobar(intermitencia.filas.length === 25, "la página no tiene 25 filas");
comprobar(
  intermitencia.filas.every(
    (fila) => fila.dias_cero + fila.dias_positivos === fila.dias_validos,
  ),
  "hay filas con días que no cuadran",
);
comprobar(
  intermitencia.filas.every((fila) => fila.racha_maxima_ceros <= fila.dias_cero),
  "la racha de ceros supera los días con cero",
);
const sinCeros = await json("/intermitencia?tienda=CA_1&desde=2015-01-01&hasta=2015-12-31&orden=unidades&tamano=5");
comprobar(sinCeros.filas[0].unidades >= sinCeros.filas[1].unidades, "el orden por unidades no se aplica");

// ---------------------------------------------------------------------------
// 6. API: matriz de desempeño de «Demanda futura»
// ---------------------------------------------------------------------------
const matrizDesempeno = await json("/matriz-horizontes?etapa=final");
comprobar(matrizDesempeno.origenes.length === 2, "faltan cortes reservados en la matriz");
comprobar(matrizDesempeno.origenes.every((fila) => fila.celdas.length === 28), "faltan horizontes");
comprobar(
  matrizDesempeno.origenes.every((fila) =>
    fila.celdas.every(
      (celda) =>
        celda.ventaja === null ||
        Math.abs(celda.ventaja - (celda.mae_baseline - celda.mae_candidato)) < 1e-3,
    ),
  ),
  "la ventaja no es MAE_baseline − MAE_candidato",
);
comprobar(
  /artículo × tienda/.test(matrizDesempeno.formulas.grano),
  "no se declara el grano del error",
);

// ---------------------------------------------------------------------------
// 6b. Protocolo de entrenamiento y evaluación (sin fuga temporal)
// ---------------------------------------------------------------------------
const modelos = await json("/modelos");
const recomendado = modelos.ejecuciones.find((ejecucion) => ejecucion.run_id === modelos.recomendado);
comprobar(Boolean(recomendado), "no hay ejecución recomendada");
const ventanasEval = await json("/evaluacion-ventanas?etapa=final");
comprobar(ventanasEval.run_id === modelos.recomendado, "la evaluación no es de la ejecución recomendada");
comprobar(
  ventanasEval.ventanas.length >= 2,
  "faltan ventanas reservadas en la tabla de evaluación",
);
const origenesEntrenamiento = recomendado.origenes_entrenamiento ?? [];
const maxEntrenamiento = Math.max(...origenesEntrenamiento);
const minEvaluado = Math.min(...ventanasEval.ventanas.map((ventana) => ventana.origen_d));
comprobar(
  maxEntrenamiento + recomendado.horizonte <= minEvaluado,
  `el entrenamiento (origen ${maxEntrenamiento} + ${recomendado.horizonte}) invade la primera ventana evaluada (${minEvaluado})`,
);
comprobar(
  ventanasEval.ventanas.every((ventana) => ventana.detalle.candidato.n === ventana.series * ventana.dias),
  "las observaciones de cada ventana no cuadran con series × días",
);
comprobar(
  ventanasEval.ventanas.every(
    (ventana) =>
      ventana.detalle.candidato.wape_pct === null ||
      Math.abs(ventana.detalle.candidato.wape_razon * 100 - ventana.detalle.candidato.wape_pct) < 1e-3,
  ),
  "el WAPE en razón y en porcentaje no coinciden",
);
comprobar(
  ventanasEval.ventanas.every(
    (ventana) =>
      ventana.detalle.diferencia_absoluta === null ||
      Math.abs(
        ventana.detalle.diferencia_absoluta -
          (ventana.detalle.baseline.mae - ventana.detalle.candidato.mae),
      ) < 1e-3,
  ),
  "la diferencia absoluta no es MAE_baseline − MAE_candidato",
);
comprobar(
  ventanasEval.ventanas.every(
    (ventana) =>
      ventana.agregado.candidato.n > 0 || ventana.agregado.motivo,
  ),
  "el grano agregado debe traer observaciones o motivo",
);
comprobar(
  ventanasEval.reconciliacion.cuadra === true,
  "el agregado publicado no reconcilia con la suma del detalle",
);
comprobar(
  ventanasEval.por_estado.length === 3 && ventanasEval.por_categoria.length === 3,
  "faltan resultados por estado o por categoría",
);
comprobar(
  ventanasEval.advertencias.some((texto) => /WRMSSE/.test(texto)),
  "no se advierte que no hay WRMSSE oficial",
);
comprobar(
  ventanasEval.advertencias.some((texto) => /significancia/.test(texto)),
  "no se advierte que dos ventanas no dan significancia",
);

// La matriz de horizontes debe coincidir con las ventanas evaluadas.
for (const ventana of ventanasEval.ventanas) {
  const fila = matrizDesempeno.origenes.find((origen) => origen.origen_d === ventana.origen_d);
  comprobar(Boolean(fila), `la matriz de horizontes no tiene el origen ${ventana.origen_d}`);
  if (!fila) continue;
  comprobar(
    Math.abs(fila.celdas[0].mae_candidato - ventana.detalle.candidato.mae) < 3,
    `la celda h=1 del origen ${ventana.origen_d} no concuerda con la ventana`,
  );
}

// ---------------------------------------------------------------------------
// 7. Navegador: navegación, A/B, matriz por tienda, 28 días y móvil
// ---------------------------------------------------------------------------
const ocultarCabeceraSitio = async (objetivo) => {
  await objetivo.evaluate(() => {
    for (const cabecera of document.querySelectorAll("header")) {
      if (!cabecera.closest(".ac-app")) cabecera.style.display = "none";
    }
  });
};

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const errores = [];
pagina.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
pagina.on("console", (m) => {
  if (m.type() === "error") errores.push(m.text().slice(0, 160));
});
await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: "domcontentloaded" });
await pagina.waitForSelector(".ac-app", { timeout: 90000 });
await pagina.waitForTimeout(2000);

const secciones = await pagina.evaluate(() =>
  [...document.querySelectorAll("[data-testid=selector-seccion] .at-seg")].map((n) => n.textContent.trim()),
);
comprobar(secciones.length === 4, `la navegación secundaria no tiene 4 secciones: ${secciones.join(", ")}`);

// California + periodo 2015
await pagina.getByRole("button", { name: "Estados Unidos", exact: true }).click().catch(() => {});
await pagina.waitForTimeout(400);
const tarjetaCa = pagina.locator(".ac-tarjeta", { hasText: "California" }).first();
if (await tarjetaCa.count()) await tarjetaCa.click();
await pagina.waitForTimeout(1500);

/* El bloque A/B arranca colapsado: se abre con su botón (aria-expanded) antes de leerlo. */
const cuerpoAbierto = await pagina
  .locator('[data-testid="ab-boton"]')
  .getAttribute("aria-expanded");
if (cuerpoAbierto !== "true") {
  await pagina.locator('[data-testid="ab-boton"]').click();
}
await pagina.waitForSelector("[data-testid=selector-orden-ab]", { timeout: 120000 });
await pagina.waitForTimeout(1200);
const ab = await pagina.evaluate(() => {
  const filas = [...document.querySelectorAll(".ac-ab2-fila")];
  return {
    filas: filas.length,
    claves: filas.slice(0, 3).map((fila) => fila.getAttribute("data-clave")),
    grupos: [...document.querySelectorAll(".ac-ab2-grupo-cab")].map((n) => n.textContent.trim()),
    leyenda: [...document.querySelectorAll(".ac-ab2-leyenda li")].map((n) => n.textContent.trim()),
    cifras: filas.slice(0, 2).map((fila) => [...fila.querySelectorAll(".ac-ab2-cifra")].map((n) => n.textContent.trim())),
    puntosA: document.querySelectorAll(".ac-ab2-punto--a").length,
    puntosB: document.querySelectorAll(".ac-ab2-punto--b").length,
    conector: document.querySelectorAll(".ac-ab2-conector").length,
  };
});
comprobar(ab.filas === 12, `la tabla A/B no muestra 12 filas (${ab.filas})`);
comprobar(ab.grupos.length === 4, "no hay 4 encabezados de tienda en el orden inicial");
comprobar(ab.puntosA === 12 && ab.puntosB === 12, "faltan puntos de A o B");
comprobar(ab.leyenda.length === 3, "la leyenda del A/B no tiene tres elementos");
comprobar(ab.cifras.every((fila) => fila.length === 4), "faltan columnas numéricas alineadas");

// Orden por mayor aumento: cada fila debe mostrar su identificación completa
await pagina.locator("[data-testid=selector-orden-ab] .at-seg", { hasText: "Mayor aumento" }).click();
await pagina.waitForTimeout(500);
const ordenado = await pagina.evaluate(() => ({
  grupos: document.querySelectorAll(".ac-ab2-grupo-cab").length,
  nombres: [...document.querySelectorAll(".ac-ab2-nombre")].slice(0, 3).map((n) => n.textContent.trim()),
  filas: document.querySelectorAll(".ac-ab2-fila").length,
}));
comprobar(ordenado.grupos === 0, "al ordenar globalmente quedan encabezados de grupo");
comprobar(
  ordenado.nombres.every((nombre) => nombre.includes("·")),
  "las filas ordenadas no muestran la identificación completa",
);
comprobar(ordenado.filas === 12, "se perdieron filas al ordenar");

// Métrica: promedio diario
await pagina.locator("[data-testid=selector-metrica-ab] .at-seg", { hasText: "Promedio diario" }).click();
await pagina.waitForTimeout(400);
const metricas = await pagina.evaluate(() =>
  [...document.querySelectorAll(".ac-ab2-eje-unidad")].map((n) => n.textContent.trim()),
);
comprobar(
  metricas.some((texto) => /por día observado/.test(texto)),
  "el eje no cambia de unidad al pasar a promedio diario",
);

// Navegación desde una fila a los departamentos de esa tienda
const primeraFila = pagina.locator(".ac-ab2-fila").first();
const clave = await primeraFila.getAttribute("data-clave");
const [tiendaFila, categoriaFila] = String(clave).split("|");
await primeraFila.click();
await pagina.waitForTimeout(1800);
const contextoTras = await pagina.evaluate(() => ({
  url: window.location.search,
  cabecera: document.querySelector(".ac-cab .ac-cobertura")?.textContent ?? "",
  migas: [...document.querySelectorAll(".ac-ruta")].map((n) => n.textContent.trim()),
}));
comprobar(contextoTras.url.includes(`ac_tienda=${tiendaFila}`), "la URL no refleja la tienda de la fila");
comprobar(contextoTras.url.includes(`ac_cat=${categoriaFila}`), "la URL no refleja la categoría de la fila");

// Matriz «por tienda» en la composición
await pagina.locator("[data-testid=selector-composicion] .at-seg", { hasText: "Por tienda" }).click();
await pagina.waitForTimeout(600);
const matrizUi = await pagina.evaluate(() => {
  const tabla = document.querySelector(".ac-comp-matriz");
  if (!tabla) return null;
  const celdas = [...tabla.querySelectorAll("tbody td .ac-comp-celda")].map((n) => n.textContent.trim());
  const pies = [...tabla.querySelectorAll("tfoot td strong")].map((n) => n.textContent.trim());
  const columnas = tabla.querySelectorAll("thead th").length;
  return {
    filas: tabla.querySelectorAll("tbody tr").length,
    celdas: celdas.length,
    pies,
    columnas,
    categorias: columnas - 2,
  };
});
comprobar(Boolean(matrizUi), "no se dibuja la matriz tienda × categoría");
comprobar(
  matrizUi?.columnas === (matrizUi?.categorias ?? 0) + 2,
  "la matriz no tiene tienda + categorías + total",
);
// Volver al contexto completo de California para las capturas de las demás secciones.
await pagina.locator(".ac-ruta", { hasText: "Estados Unidos" }).first().click();
await pagina.waitForTimeout(1200);
const botonTodas = pagina.locator("button", { hasText: "Ver todas las categorías" }).first();
if (await botonTodas.count()) {
  await botonTodas.click();
  await pagina.waitForTimeout(1200);
}
await pagina.waitForSelector(".ac-ab2-fila", { timeout: 120000 });
await pagina.evaluate(() => {
  const panel = document.querySelector(".ac-ab2-marco");
  panel?.scrollIntoView({ block: "center" });
});
await pagina.waitForTimeout(600);
await pagina.locator(".ac-ab2-marco").screenshot({
  path: `${EV}/exploracion-comparacion-tienda-categoria.png`,
});
await pagina.locator(".ac-app").screenshot({ path: `${EV}/exploracion-panorama-escritorio.png` });

// Estacionalidad
await pagina.locator("[data-testid=selector-seccion] .at-seg", { hasText: "Estacionalidad" }).click();
await pagina
  .waitForSelector("[data-testid=seccion-estacionalidad] svg", { timeout: 120000 })
  .catch(() => {});
await pagina.waitForTimeout(2000);
const estacionalidadUi = await pagina.evaluate(() => ({
  barras: document.querySelectorAll(".ac-es-grupo, .ac-es-barras").length,
  celdasMes: document.querySelectorAll(".ac-es-mes, .ac-es-celda").length,
  tablas: document.querySelectorAll(".ac-es-tabla, .ac-tabla").length,
  texto: (document.querySelector("[data-testid=seccion-estacionalidad]")?.textContent ?? "").slice(0, 200),
}));
comprobar(estacionalidadUi.texto.length > 40, "la sección de estacionalidad está vacía");
await ocultarCabeceraSitio(pagina);
await pagina.locator("[data-testid=seccion-estacionalidad]").screenshot({
  path: `${EV}/exploracion-estacionalidad-escritorio.png`,
});

// Precios
await pagina.locator("[data-testid=selector-seccion] .at-seg", { hasText: "Precios" }).click();
await pagina
  .waitForSelector("[data-testid=seccion-precios] svg", { timeout: 120000 })
  .catch(() => {});
await pagina.waitForTimeout(1500);
const preciosUi = await pagina.evaluate(() => ({
  texto: (document.querySelector("[data-testid=seccion-precios]")?.textContent ?? "").slice(0, 260),
  cajas: document.querySelectorAll(".ac-pr-caja").length,
  filas: document.querySelectorAll("[data-testid=seccion-precios] tr").length,
}));
comprobar(preciosUi.texto.length > 60, "la sección de precios está vacía");
await ocultarCabeceraSitio(pagina);
await pagina.locator("[data-testid=seccion-precios]").screenshot({
  path: `${EV}/exploracion-precios-escritorio.png`,
});

// Detalle de artículo
await pagina.locator("[data-testid=selector-seccion] .at-seg", { hasText: "Detalle de artículo" }).click();
await pagina
  .waitForSelector("[data-testid=seccion-articulo] tbody tr", { timeout: 120000 })
  .catch(() => {});
await pagina.waitForTimeout(1200);
const articuloUi = await pagina.evaluate(() => ({
  texto: (document.querySelector("[data-testid=seccion-articulo]")?.textContent ?? "").slice(0, 260),
  svgs: document.querySelectorAll("[data-testid=seccion-articulo] svg").length,
  filas: document.querySelectorAll("[data-testid=seccion-articulo] tbody tr").length,
}));
comprobar(articuloUi.svgs >= 1, "el detalle de artículo no dibuja paneles");
comprobar(articuloUi.filas > 0, "la tabla de intermitencia está vacía");
await ocultarCabeceraSitio(pagina);
await pagina.locator("[data-testid=seccion-articulo]").screenshot({
  path: `${EV}/exploracion-articulo-escritorio.png`,
});

// Evaluación: comparación por corte y matriz de 28 días
await pagina.locator('.ac-tabs-btn[data-pantalla="evaluacion"]').click();
await pagina.waitForSelector("[data-testid=selector-corte-evaluacion]", { timeout: 120000 });
await pagina.waitForTimeout(1800);
const modos = await pagina.evaluate(() =>
  [...document.querySelectorAll("[data-testid=selector-etapa-evaluacion] .at-seg")].map((n) => n.textContent.trim()),
);
comprobar(modos.length === 2, "no hay dos etapas de evaluación en la pantalla");
const cortesEvaluacion = await pagina.evaluate(
  () => document.querySelectorAll("[data-testid=selector-corte-evaluacion] .at-seg").length,
);
comprobar(cortesEvaluacion >= 2, "la pantalla de evaluación no ofrece los cortes publicados");
/* La matriz ventana × horizonte vive en el desplegable de metodología: se abre para leerla. */
await pagina.locator('[data-testid="evaluacion-metodologia"] > summary').first().click();
await pagina.waitForFunction(
  () => document.querySelector('[data-testid="evaluacion-metodologia"]')?.hasAttribute("open"),
  undefined,
  { timeout: 60000 },
);
await pagina.waitForSelector(".ac-md-tabla", { state: "visible", timeout: 120000 });
const matrizFutura = await pagina.evaluate(() => ({
  filas: document.querySelectorAll(".ac-md-tabla tbody tr").length,
  celdas: document.querySelectorAll(".ac-md-tabla tbody td").length,
  lectura: [...document.querySelectorAll("[data-testid=selector-lectura-matriz] .at-seg")].map((n) => n.textContent.trim()),
}));
comprobar(matrizFutura.filas === 2, "la matriz de desempeño no tiene 2 cortes");
comprobar(matrizFutura.celdas === 56, "la matriz de desempeño no tiene 28 días por corte");
comprobar(matrizFutura.lectura.length === 2, "no hay dos lecturas en la matriz");
await pagina.locator("[data-testid=selector-lectura-matriz] .at-seg", { hasText: "Sesgo" }).click();
await pagina.waitForTimeout(400);
const sesgoMetodo = await pagina.locator("[data-testid=selector-metodo-sesgo] .at-seg").count();
comprobar(sesgoMetodo === 2, "la lectura de sesgo no permite elegir candidato o baseline");
await pagina.locator(".ac-md-marco").first().screenshot({
  path: `${EV}/exploracion-matriz-desempeno.png`,
});
await pagina.locator(".ac-app").screenshot({ path: `${EV}/exploracion-futura-escritorio.png` });

// Móvil
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
movil.on("pageerror", (e) => errores.push(`móvil: ${e.message.slice(0, 140)}`));
await movil.goto(`${SITIO}/?ac_pantalla=exploracion&ac_estado=CA#/area/ciencia-de-datos/atlas-comercial`, { waitUntil: "domcontentloaded" });
await movil.waitForSelector(".ac-app", { timeout: 90000 });
await movil.waitForSelector('[data-testid="ab-boton"]', { timeout: 120000 });
/* El bloque arranca colapsado: en móvil se abre para comprobar las doce filas. */
await movil.locator('[data-testid="ab-boton"]').click();
await movil.waitForSelector(".ac-ab2-fila", { timeout: 120000 });
await movil.waitForTimeout(1500);
const movilAb = await movil.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  inner: window.innerWidth,
  filas: document.querySelectorAll(".ac-ab2-fila").length,
  botones: document.querySelectorAll("[data-testid=selector-seccion] .at-seg").length,
}));
comprobar(movilAb.filas === 12, "en móvil no se ven las 12 filas");
comprobar(movilAb.botones === 4, "en móvil falta la navegación secundaria");
comprobar(movilAb.scrollWidth <= movilAb.inner + 1, `en móvil la página desborda (${movilAb.scrollWidth} > ${movilAb.inner})`);
await movil.evaluate(() => {
  const app = document.querySelector(".ac-app");
  if (app) window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 8));
});
await movil.waitForTimeout(600);
await movil.screenshot({ path: `${EV}/exploracion-panorama-movil.png` });
await movil.evaluate(() => {
  const marco = document.querySelector(".ac-ab2-marco");
  if (marco) window.scrollTo(0, Math.max(0, marco.getBoundingClientRect().top + window.scrollY - 60));
});
await movil.waitForTimeout(400);
await movil.screenshot({ path: `${EV}/exploracion-comparacion-movil.png` });

await navegador.close();

const informe = {
  version: comparacion.version,
  api: {
    comparacion: {
      filas: comparacion.resumen_filas,
      conteos: {
        categorias_unicas: comparacion.conteos.categorias_unicas,
        combinaciones_tienda_categoria: comparacion.conteos.combinaciones_tienda_categoria,
        departamentos_unicos: comparacion.conteos.departamentos_unicos,
        combinaciones_tienda_departamento: comparacion.conteos.combinaciones_tienda_departamento,
        articulos_unicos: comparacion.conteos.articulos_unicos,
        series_articulo_tienda: comparacion.conteos.series_articulo_tienda,
      },
      reconciliacion: comparacion.reconciliacion,
      ms: msComparacion,
    },
    estacionalidad: {
      grupos: estacionalidad.semanal.grupos.length,
      escala: estacionalidad.semanal.escala_comun_max,
      meses_completos_2015: completos.length,
      enero_2011: {
        dias_del_mes: enero2011.dias_del_mes,
        dias_en_intervalo: enero2011.dias_en_intervalo,
        dias_con_cobertura: enero2011.dias_con_cobertura,
        dias_observados: enero2011.dias_observados,
        unidades: enero2011.unidades,
        promedio_diario: enero2011.promedio_diario,
        parcial: enero2011.parcial,
        motivo: enero2011.motivo,
      },
      dominio: estacionalidad2011.dominio,
      cobertura_ventas: estacionalidad2011.cobertura_ventas,
    },
    matriz: {
      anios: [matriz, matriz2011, bisiesto, matriz2016].map((anio) => ({
        anio: anio.anio,
        columnas: anio.dias.length,
        dias_del_anio: anio.cobertura.dias_del_anio,
        observadas: anio.cobertura.celdas_observadas,
        sin_dato: anio.cobertura.celdas_sin_dato,
        fuera_filtro: anio.cobertura.celdas_fuera_filtro,
        escala: anio.escala.dominio,
      })),
      recorte: {
        anio: matrizRecortada.anio,
        columnas: matrizRecortada.dias.length,
        fuera_filtro: matrizRecortada.cobertura.celdas_fuera_filtro,
        dias_observados: matrizRecortada.tiendas[0].dias_observados,
      },
    },
    precios: {
      distribucion: {
        combinaciones: distribucion.combinaciones_incluidas,
        articulos_con_precio: distribucion.articulos,
        cobertura: distribucion.cobertura,
        sin_precio: distribucion.sin_precio,
        cuartiles: distribucion.cuartiles,
        cajas: distribucion.cajas,
        ms: msDistribucion,
      },
      cambios: {
        totales,
        umbral: cambios.umbral,
        precision: cambios.precision_comparacion,
        semanas: cambios.semanas,
        semanas_del_intervalo: cambios.semanas_del_intervalo,
        series_con_precio: cambios.series_con_precio,
        por_categoria: cambios.por_categoria,
        ms: null,
      },
      evolucion: { puntos: evolucion.puntos.length },
    },
    articulo: { snap: articulo.capas.snap.length, eventos: articulo.capas.eventos.length, intermitencia: articulo.intermitencia },
    intermitencia: { resumen: intermitencia.resumen, ms: msIntermitencia },
    ventanas: {
      run_id: ventanasEval.run_id,
      cortes: ventanasEval.ventanas.map((ventana) => ({
        origen: ventana.origen_d,
        fechas: `${ventana.origen_fecha} → ${ventana.fin_fecha}`,
        etapa: ventana.etapa,
        series: ventana.series,
        observaciones: ventana.detalle.candidato.n,
        mae: [ventana.detalle.candidato.mae, ventana.detalle.baseline.mae],
        wape: [ventana.detalle.candidato.wape_pct, ventana.detalle.baseline.wape_pct],
        sesgo: [ventana.detalle.candidato.sesgo, ventana.detalle.baseline.sesgo],
        diferencia: ventana.detalle.diferencia_absoluta,
        mejora: ventana.detalle.mejora_relativa_pct,
        agregado: {
          mae: [ventana.agregado.candidato.mae, ventana.agregado.baseline.mae],
          wape: [ventana.agregado.candidato.wape_pct, ventana.agregado.baseline.wape_pct],
          sesgo: [ventana.agregado.candidato.sesgo, ventana.agregado.baseline.sesgo],
          mejora: ventana.agregado.mejora_relativa_pct,
        },
      })),
      consolidado: ventanasEval.consolidado,
      por_estado: ventanasEval.por_estado.map((segmento) => ({
        clave: segmento.clave,
        series: segmento.series,
        detalle: [segmento.detalle.candidato.mae, segmento.detalle.baseline.mae, segmento.detalle.mejora_relativa_pct],
        agregado: [segmento.agregado.candidato.mae, segmento.agregado.baseline.mae, segmento.agregado.mejora_relativa_pct],
      })),
      por_categoria: ventanasEval.por_categoria.map((segmento) => ({
        clave: segmento.clave,
        series: segmento.series,
        detalle: [segmento.detalle.candidato.mae, segmento.detalle.baseline.mae, segmento.detalle.mejora_relativa_pct],
        agregado: [segmento.agregado.candidato.mae, segmento.agregado.baseline.mae, segmento.agregado.mejora_relativa_pct],
      })),
      reconciliacion: ventanasEval.reconciliacion,
      protocolo: {
        origenes_entrenamiento: origenesEntrenamiento,
        horizonte: recomendado.horizonte,
        primera_ventana_evaluada: minEvaluado,
      },
    },
    matrizDesempeno: {
      cortes: matrizDesempeno.origenes.length,
      escala: matrizDesempeno.escala,
      hor_los_1: matrizDesempeno.origenes[0].celdas[0],
    },
  },
  ui: { secciones, ab, ordenado, metricas, contextoTras, matrizUi, estacionalidadUi, preciosUi, articuloUi, modos, matrizFutura, movilAb },
  errores,
  fallos,
};
console.log(JSON.stringify(informe, null, 1));
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
