/**
 * Verificación del incremento de corrección analítica e interacción.
 *
 * Comprueba en el navegador, contra la API viva y el bundle servido:
 *  1. etiqueta y valor del mismo grano en «Proyecto»;
 *  2. alcance nacional frente al subanálisis por tienda en «Datos y calidad»;
 *  3. formato correcto de millones en el eje de la comparación A/B;
 *  4. resumen de segmentos calculado sobre el nivel activo en «Evaluación»;
 *  5. colapsar/expandir A/B sin perder filtros, orden ni escalas y sin nuevas peticiones;
 *  6. orden global en lista plana y restauración de expansiones al volver a «Por tienda»;
 *  7. umbrales exactos de concentración (mínimo número de productos);
 *  8. casos límite: objetivo 100 %, un producto, total cero;
 *  9. consistencia entre curva, resumen y tabla de concentración;
 * 10. meses parciales identificados en la cuadrícula mensual;
 * 11. contexto conservado entre «Resultados» y «Evaluación».
 *
 * Capturas: `evidencias/comercial/inc-*.png`. Sale con código 1 si algo falla.
 */
import { chromium } from "@playwright/test";

const SITIO = "http://127.0.0.1:8000";
const HASH = "#/area/ciencia-de-datos/atlas-comercial";
const API = "http://127.0.0.1:8010/api/v1/comercial/m5";
const EV = "../../evidencias/comercial";

const url = (query = "") => `${SITIO}/${query ? `?${query}` : ""}${HASH}`;

const fallos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
  return Boolean(condicion);
};

const errores = [];
const navegador = await chromium.launch();

async function abrir(query = "", opciones = {}) {
  const pagina = await navegador.newPage({
    viewport: opciones.viewport ?? { width: 1400, height: 1200 },
  });
  const peticiones = [];
  pagina.on("pageerror", (error) => errores.push(`pageerror: ${error.message.slice(0, 160)}`));
  pagina.on("console", (mensaje) => {
    if (mensaje.type() === "error") errores.push(`console: ${mensaje.text().slice(0, 160)}`);
  });
  pagina.on("request", (peticion) => peticiones.push(peticion.url()));
  await pagina.goto(url(query), { waitUntil: "domcontentloaded" });
  await pagina.waitForSelector(".ac-app", { timeout: 120000 });
  await pagina.waitForTimeout(opciones.espera ?? 5000);
  return { pagina, peticiones };
}

/** Solo dígitos: comparar cifras sin depender de separadores de miles. */
const digitos = (cadena) => (cadena ?? "").replace(/[^\d]/g, "");

const texto = (pagina, selector) =>
  pagina.evaluate(
    (sel) => document.querySelector(sel)?.innerText?.replace(/\s+/g, " ") ?? null,
    selector,
  );

/** Cambia el objetivo de concentración moviendo el rango (paso 1 %). */
async function moverObjetivo(pagina, valor) {
  await pagina.evaluate((objetivo) => {
    const control = document.querySelector('[data-testid="concentracion-objetivo"]');
    if (!control) return;
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    );
    descriptor.set.call(control, String(objetivo));
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }, valor);
  await pagina.waitForTimeout(400);
}

/* ------------------------------------------------------------------ 1. Proyecto */
{
  const { pagina } = await abrir("ac_pantalla=proyecto", { espera: 6000 });
  const ventanas = await (await fetch(`${API}/evaluacion-ventanas?etapa=final`)).json();
  const detalle = ventanas.consolidado.detalle;
  const agregado = ventanas.consolidado.agregado;

  const tarjetaDetalle = await texto(pagina, '[data-testid="proyecto-grano-detalle"]');
  const tarjetaAgregado = await texto(pagina, '[data-testid="proyecto-grano-agregado"]');

  /* El valor se lee del elemento que lo contiene (no del texto de la tarjeta, donde el
     título puede aportar cifras). */
  const valorTarjeta = async (testid) => {
    const cifra = await pagina.evaluate(
      (sel) =>
        document.querySelector(`${sel} .ac-tarjeta-valor`)?.textContent?.trim() ?? null,
      testid,
    );
    if (!cifra) return null;
    const limpio = cifra.replace(/[^\d.,-]/g, "");
    if (/^\d{1,3}(\.\d{3})+,\d+$/.test(limpio)) return Number(limpio.replace(/\./g, "").replace(",", "."));
    if (/^\d{1,3}(,\d{3})+\.\d+$/.test(limpio)) return Number(limpio.replace(/,/g, ""));
    return Number(limpio.replace(",", "."));
  };
  comprobar(
    /artículo × tienda × día/i.test(tarjetaDetalle ?? ""),
    `Proyecto: la tarjeta de detalle no declara su grano: ${tarjetaDetalle?.slice(0, 120)}`,
  );
  comprobar(
    /total del segmento por día/i.test(tarjetaAgregado ?? ""),
    `Proyecto: la tarjeta agregada no declara su grano: ${tarjetaAgregado?.slice(0, 120)}`,
  );
  const maeDetalleUi = await valorTarjeta('[data-testid="proyecto-grano-detalle"]');
  const maeAgregadoUi = await valorTarjeta('[data-testid="proyecto-grano-agregado"]');
  comprobar(
    maeDetalleUi !== null && Math.abs(maeDetalleUi - detalle.candidato.mae) < 0.051,
    `Proyecto: MAE de detalle ${maeDetalleUi} no coincide con la API ${detalle.candidato.mae}`,
  );
  comprobar(
    maeAgregadoUi !== null && Math.abs(maeAgregadoUi - agregado.candidato.mae) < 0.6,
    `Proyecto: MAE agregado ${maeAgregadoUi} no coincide con la API ${agregado.candidato.mae}`,
  );
  comprobar(
    !/MAE · total diario/i.test(await texto(pagina, '[data-testid="proyecto-resultados"]')),
    "Proyecto: sigue existiendo la etiqueta «MAE · total diario» sobre el grano de detalle",
  );
  await pagina
    .locator('[data-testid="proyecto-resultados"]')
    .screenshot({ path: `${EV}/inc-proyecto.png` });
  await pagina.close();
}

/* -------------------------------------------------------- 2. Datos y calidad */
{
  const { pagina } = await abrir("ac_pantalla=datos", { espera: 7000 });
  const ambito = await texto(pagina, '[data-testid="datos-ambito-intermitencia"]');
  const mediana = await texto(pagina, '[data-testid="datos-mediana-ceros"]');
  const tarjetaSeries = await texto(pagina, '[data-testid="datos-cobertura"]');
  const api = await (await fetch(`${API}/intermitencia?tienda=CA_1&pagina=1&tamano=1`)).json();

  comprobar(
    /subanálisis por tienda/i.test(ambito ?? ""),
    `Datos: el bloque no declara que es un subanálisis por tienda: ${ambito?.slice(0, 120)}`,
  );
  comprobar(
    /CA_1/.test(ambito ?? ""),
    `Datos: el ámbito no identifica la tienda analizada: ${ambito?.slice(0, 120)}`,
  );
  comprobar(
    /Mediana del porcentaje de días en cero/i.test(mediana ?? ""),
    `Datos: la tarjeta de la mediana no se titula por lo que mide: ${mediana?.slice(0, 120)}`,
  );
  comprobar(
    /días con 0 unidades/i.test(mediana ?? "") && /días con dato/i.test(mediana ?? ""),
    "Datos: la tarjeta no explica el denominador del porcentaje",
  );
  comprobar(
    /Series de la tienda analizada/i.test(tarjetaSeries ?? ""),
    "Datos: sigue titulando «Series del contexto» un subconjunto por tienda",
  );
  comprobar(
    digitos(mediana).includes(digitos(api.resumen.pct_cero_mediana.toFixed(1))),
    `Datos: la mediana mostrada no coincide con la API (${api.resumen.pct_cero_mediana})`,
  );
  await pagina
    .locator('[data-testid="datos-cobertura"]')
    .screenshot({ path: `${EV}/inc-datos.png` });
  await pagina.close();
}

/* ------------------------------------------------- 3-6. Comparación A/B */
{
  const { pagina, peticiones } = await abrir("ac_pantalla=exploracion", { espera: 7000 });

  const boton = pagina.locator('[data-testid="ab-boton"]');
  const expandidoInicial = await boton.getAttribute("aria-expanded");
  comprobar(expandidoInicial === "false", "A/B: el bloque no arranca colapsado en una visita nueva");
  comprobar(
    (await texto(pagina, '[data-testid="ab-periodos"]'))?.includes("A:"),
    "A/B: la cabecera colapsada no muestra los periodos",
  );
  const resumenColapsado = await texto(pagina, '[data-testid="ab-resumen"]');
  comprobar(
    /aumentos/.test(resumenColapsado ?? "") &&
      /disminuciones/.test(resumenColapsado ?? "") &&
      /empates/.test(resumenColapsado ?? ""),
    `A/B: la cabecera no resume aumentos/disminuciones/empates: ${resumenColapsado}`,
  );
  const cuerpoOculto = await pagina.evaluate(
    () => document.getElementById("ac-ab-cuerpo")?.hasAttribute("hidden") ?? null,
  );
  comprobar(cuerpoOculto === true, "A/B: el cuerpo no está oculto con el bloque colapsado");
  await pagina
    .locator('[data-testid="comparacion-ab"]')
    .screenshot({ path: `${EV}/inc-ab-colapsada.png` });

  // Expandir: sin nuevas peticiones (se espera a que la carga inicial se asiente de verdad:
  // con la caché recién arrancada la comparación puede tardar más que una espera fija).
  const enReposo = async (quieto = 3000, limite = 120000) => {
    const inicio = Date.now();
    let ultimo = peticiones.length;
    let estable = Date.now();
    while (Date.now() - inicio < limite) {
      await new Promise((seguir) => setTimeout(seguir, 400));
      if (peticiones.length !== ultimo) {
        ultimo = peticiones.length;
        estable = Date.now();
      } else if (Date.now() - estable >= quieto) {
        return;
      }
    }
  };
  await enReposo();
  const antes = peticiones.filter((u) => u.includes("/comparacion")).length;
  await boton.click();
  await pagina.waitForTimeout(1200);
  const despues = peticiones.filter((u) => u.includes("/comparacion")).length;
  comprobar(despues === antes, "A/B: expandir provocó una nueva petición de comparación");

  const marcas = await pagina.evaluate(() =>
    [...document.querySelectorAll('[data-testid="ab-marca-eje"]')].map((nodo) => nodo.textContent),
  );
  comprobar(marcas.length === 5, `A/B: el eje no tiene cinco marcas (${marcas.length})`);
  comprobar(
    marcas.every((marca) => !/^\d{1,3}(,\d{3})+(\.\d+)?\s*M$/.test((marca ?? "").trim())),
    `A/B: hay marcas con el millón sin dividir: ${marcas.join(" | ")}`,
  );
  comprobar(
    marcas.some((marca) => /M$/.test((marca ?? "").trim())),
    `A/B: ninguna marca usa millones cuando el máximo lo requiere: ${marcas.join(" | ")}`,
  );

  // Escala: expandir/contraer no cambia las marcas.
  const marcasAntes = marcas.join("|");
  await pagina.locator('[data-testid^="ab-grupo-"]').first().click();
  await pagina.waitForTimeout(600);
  const marcasDespues = await pagina.evaluate(() =>
    [...document.querySelectorAll('[data-testid="ab-marca-eje"]')].map((nodo) => nodo.textContent).join("|"),
  );
  comprobar(marcasAntes === marcasDespues, "A/B: expandir una tienda cambió la escala del eje");

  // Detalle compacto con hover y foco (en una fila visible: las cerradas están ocultas).
  await pagina.evaluate(() => {
    const boton = [...document.querySelectorAll("button")].find((nodo) =>
      /Expandir todas/.test(nodo.textContent ?? ""),
    );
    if (boton) boton.click();
  });
  await pagina.waitForTimeout(700);
  const info = pagina.locator(".ac-ab2-grupo-lista:not([hidden]) .ac-ab2-info").first();
  await info.hover();
  await pagina.waitForTimeout(400);
  const detalleHover = await pagina
    .locator('[data-testid="ab-detalle"]')
    .first()
    .innerText()
    .catch(() => null);
  comprobar(
    /Periodo A/.test(detalleHover ?? "") && /Variación/.test(detalleHover ?? ""),
    `A/B: el detalle no muestra los cinco campos: ${detalleHover}`,
  );
  await pagina
    .locator('[data-testid="comparacion-ab"]')
    .screenshot({ path: `${EV}/inc-ab-expandida.png` });

  // Orden global: lista plana con ambas identificaciones.
  await pagina.evaluate(() => {
    const boton = [...document.querySelectorAll('[data-testid="selector-orden-ab"] .at-seg')].find(
      (nodo) => /Mayor aumento/.test(nodo.textContent ?? ""),
    );
    if (boton) boton.click();
  });
  await pagina.waitForTimeout(1200);
  const plana = await pagina.evaluate(() => ({
    grupos: document.querySelectorAll('[data-testid^="ab-grupo-"]').length,
    filas: [...document.querySelectorAll(".ac-ab2-fila .ac-ab2-nombre")].map((n) =>
      (n.textContent ?? "").trim(),
    ),
  }));
  comprobar(plana.grupos === 0, "A/B: el orden global conserva la agrupación por tienda");
  comprobar(
    plana.filas.length > 0 && plana.filas.every((fila) => /^[A-Z]{2}_\d · /.test(fila)),
    `A/B: las filas del orden global no incluyen tienda y categoría: ${plana.filas.slice(0, 3)}`,
  );

  // Volver a «Por tienda» restaura la expansión anterior.
  await pagina.evaluate(() => {
    const boton = [...document.querySelectorAll('[data-testid="selector-orden-ab"] .at-seg')].find(
      (nodo) => /Por tienda/.test(nodo.textContent ?? ""),
    );
    if (boton) boton.click();
  });
  await pagina.waitForTimeout(1200);
  const restaurado = await pagina.evaluate(() => {
    const abiertos = [...document.querySelectorAll('[data-testid^="ab-grupo-"]')].filter(
      (nodo) => nodo.getAttribute("aria-expanded") === "true",
    );
    return abiertos.length;
  });
  comprobar(restaurado >= 1, "A/B: no se restauraron las expansiones al volver a «Por tienda»");

  // Colapsar de nuevo conserva filtros y no pide datos.
  const peticionesAntes = peticiones.length;
  await pagina.locator('[data-testid="ab-boton"]').click();
  await pagina.waitForTimeout(800);
  comprobar(
    (await pagina.locator('[data-testid="ab-boton"]').getAttribute("aria-expanded")) === "false",
    "A/B: el botón no quedó colapsado",
  );
  comprobar(
    peticiones.length === peticionesAntes,
    "A/B: colapsar volvió a consultar datos",
  );

  // Persistencia al navegar: sigue colapsado al volver a Exploración.
  await pagina.locator('.ac-tabs-btn[data-pantalla="datos"]').click();
  await pagina.waitForTimeout(2500);
  await pagina.locator('.ac-tabs-btn[data-pantalla="exploracion"]').click();
  await pagina.waitForTimeout(3500);
  comprobar(
    (await pagina.locator('[data-testid="ab-boton"]').getAttribute("aria-expanded")) === "false",
    "A/B: el estado de plegado no se conservó al navegar",
  );

  // Teclado: el botón responde a Enter y Espacio.
  await pagina.locator('[data-testid="ab-boton"]').focus();
  await pagina.keyboard.press("Enter");
  await pagina.waitForTimeout(700);
  comprobar(
    (await pagina.locator('[data-testid="ab-boton"]').getAttribute("aria-expanded")) === "true",
    "A/B: Enter no expande el bloque",
  );
  await pagina.keyboard.press(" ");
  await pagina.waitForTimeout(700);
  comprobar(
    (await pagina.locator('[data-testid="ab-boton"]').getAttribute("aria-expanded")) === "false",
    "A/B: Espacio no colapsa el bloque",
  );
  await pagina.close();
}

/* --------------------------------------- 7-9. Concentración y umbrales */
{
  const { pagina, peticiones } = await abrir("ac_pantalla=exploracion", { espera: 3000 });
  /* La concentración se calcula después del pulso: se espera a que el panel tenga cifras. */
  await pagina.waitForSelector('[data-testid="concentracion-objetivo"]', { timeout: 180000 });
  await pagina.waitForFunction(
    () => (document.querySelector('[data-testid="concentracion-texto"]')?.textContent ?? "").length > 20,
    undefined,
    { timeout: 180000 },
  );
  await pagina.waitForTimeout(600);
  const pulso = await (
    await fetch(`${API}/pulso?agregacion=semana`)
  ).json();
  const exactos = pulso.concentracion.exacto.productos;
  const total = pulso.concentracion.exacto.total;

  /** Mínimo número de productos que alcanza el objetivo (cálculo de referencia). */
  const minimo = (objetivo) => {
    const meta = (objetivo / 100) * total;
    let acumulado = 0;
    let n = 0;
    for (const fila of exactos) {
      acumulado += Number(fila[1]);
      n += 1;
      if (acumulado >= meta) break;
    }
    return { n, acumulado, porcentaje: (100 * acumulado) / total };
  };

  const lectura = async () =>
    pagina.evaluate(() => {
      const bloque = document.querySelector('[data-testid="concentracion"]');
      const texto = bloque?.innerText.replace(/\s+/g, " ") ?? "";
      const cifras = [...(bloque?.querySelectorAll(".ac-conc-datos dd") ?? [])].map((nodo) =>
        nodo.textContent.trim(),
      );
      return {
        texto,
        objetivo: document.querySelector('[data-testid="concentracion-objetivo"]')?.value ?? null,
        cifras,
        guiaX: document.querySelector('[data-testid="concentracion-guia-x"]')?.getAttribute("x1") ?? null,
      };
    });

  const inicial = await lectura();
  comprobar(inicial.objetivo === "80", `Concentración: el objetivo inicial es ${inicial.objetivo}`);
  const referencia80 = minimo(80);
  comprobar(
    digitos(inicial.texto).includes(`${digitos(String(referencia80.n))}`),
    `Concentración: el texto no informa ${referencia80.n} productos para el 80 %: ${inicial.texto.slice(0, 200)}`,
  );
  await pagina
    .locator('[data-testid="concentracion"]')
    .screenshot({ path: `${EV}/inc-concentracion-80.png` });

  // Objetivo por rango: el marcador se mueve y el número se recalcula sin peticiones.
  const peticionesAntes = peticiones.filter((u) => u.includes("/pulso")).length;
  const guia80 = inicial.guiaX;
  await moverObjetivo(pagina, 90);
  const noventa = await lectura();
  const referencia90 = minimo(90);
  comprobar(noventa.objetivo === "90", `Concentración: el control no quedó en 90 (${noventa.objetivo})`);
  comprobar(
    digitos(noventa.texto).includes(`${digitos(String(referencia90.n))}`),
    `Concentración: el 90 % no informa ${referencia90.n} productos: ${noventa.texto.slice(0, 200)}`,
  );
  comprobar(noventa.guiaX !== guia80, "Concentración: la guía no se movió al cambiar el objetivo");
  comprobar(
    peticiones.filter((u) => u.includes("/pulso")).length === peticionesAntes,
    "Concentración: mover el objetivo generó peticiones al servidor",
  );
  await pagina
    .locator('[data-testid="concentracion"]')
    .screenshot({ path: `${EV}/inc-concentracion-90.png` });

  // Monotonía: más objetivo nunca requiere menos productos.
  const pasos = [];
  for (const objetivo of [10, 50, 200 - 130, 100]) {
    await moverObjetivo(pagina, objetivo);
    const paso = await lectura();
    pasos.push({ objetivo, texto: paso.texto });
  }
  comprobar(
    /se necesitan [\d.,]+ productos/.test(pasos[3].texto ?? ""),
    "Concentración: el objetivo 100 % no informa productos",
  );
  comprobar(
    digitos(pasos[3].texto).includes(digitos(String(total))),
    `Concentración: al 100 % deberían ser todos los productos (${total}): ${pasos[3].texto?.slice(0, 200)}`,
  );

  // Tabla del grupo: consistentes con el resumen.
  await moverObjetivo(pagina, 80);
  await pagina.evaluate(() => {
    const boton = [...document.querySelectorAll("button")].find((nodo) =>
      /Ver productos que forman este grupo/.test(nodo.textContent ?? ""),
    );
    if (boton) boton.click();
  });
  await pagina.waitForTimeout(700);
  const tabla = await pagina.evaluate(() => {
    const marco = document.querySelector(".ac-conc-tabla");
    if (!marco) return null;
    const filas = [...marco.querySelectorAll("tbody tr")];
    return {
      filas: filas.length,
      primera: filas[0]?.children[1]?.textContent?.trim() ?? null,
      ultimaAcumulada: filas.at(-1)?.children[5]?.textContent?.trim() ?? null,
      paginacion: marco.querySelector(".ac-conc-pagina")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    };
  });
  comprobar(Boolean(tabla), "Concentración: no se abrió la tabla del grupo");
  comprobar(tabla.filas === 12, `Concentración: la tabla muestra ${tabla.filas} filas por página`);
  comprobar(
    (tabla.primera ?? "").length > 5,
    `Concentración: la primera fila no identifica el artículo (${tabla.primera})`,
  );
  comprobar(
    /Página 1 de/.test(tabla.paginacion ?? ""),
    `Concentración: falta la paginación (${tabla.paginacion})`,
  );
  await pagina
    .locator('[data-testid="concentracion"]')
    .screenshot({ path: `${EV}/inc-concentracion-detalle.png` });
  await pagina.close();

  // Total cero: respuesta válida sin unidades → controles deshabilitados y explicación.
  const paginaCero = await navegador.newPage({ viewport: { width: 1280, height: 1000 } });
  const cuerpo = await (await fetch(`${API}/pulso?agregacion=semana&tiendas=CA_1`)).json();
  await paginaCero.route("**/api/v1/comercial/m5/pulso*", async (ruta) => {
    await ruta.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...cuerpo,
        concentracion: {
          ...cuerpo.concentracion,
          productos: 0,
          total: 0,
          puntos: [],
          exacto: { productos: [], total: 0, n: 0, orden: "", lectura_80: null },
          estado: "vacio",
        },
      }),
    });
  });
  await paginaCero.goto(url("ac_pantalla=exploracion"), { waitUntil: "domcontentloaded" });
  await paginaCero.waitForSelector(".ac-app");
  await paginaCero.waitForTimeout(5000);
  const cero = await paginaCero.evaluate(() => ({
    vacia: document.querySelector('[data-testid="concentracion-vacia"]')?.innerText ?? null,
    deshabilitados: document.querySelectorAll(".ac-conc-controles[disabled], .ac-conc-rapido[disabled]")
      .length,
  }));
  comprobar(/Total cero/i.test(cero.vacia ?? ""), `Concentración: sin total no se explica el vacío: ${cero.vacia}`);
  comprobar(cero.deshabilitados > 0, "Concentración: los controles no se deshabilitan con total cero");
  await paginaCero.locator('[data-testid="concentracion"]').screenshot({
    path: `${EV}/inc-concentracion-cero.png`,
  });
  await paginaCero.close();
}

/* ------------------------------------------- 10. Meses parciales */
{
  const { pagina } = await abrir("ac_pantalla=exploracion&ac_sub=estacionalidad", { espera: 8000 });
  const celdas = await pagina.evaluate(() => {
    const parciales = [...document.querySelectorAll(".ac-es-celda.is-parcial")];
    return {
      total: document.querySelectorAll(".ac-es-celda").length,
      parciales: parciales.length,
      textos: parciales.slice(0, 4).map((nodo) => nodo.getAttribute("aria-label") ?? nodo.textContent),
    };
  });
  comprobar(celdas.parciales > 0, "Meses: no hay celdas marcadas como parciales con el histórico completo");
  comprobar(
    celdas.textos.some((t) => /2011/.test(t ?? "") && /días observados de 31/.test(t ?? "")),
    `Meses: enero de 2011 no se identifica como parcial: ${celdas.textos.slice(0, 2).join(" | ")}`,
  );
  comprobar(
    celdas.textos.some((t) => /2016/.test(t ?? "")),
    "Meses: no se identifica el mes parcial de 2016",
  );
  await pagina.locator('[data-testid="seccion-estacionalidad"]').screenshot({
    path: `${EV}/inc-meses-parciales.png`,
  });
  await pagina.close();
}

/* ------------------------------- 11. Contexto entre Resultados y Evaluación */
{
  const { pagina } = await abrir("ac_pantalla=resultados&ac_estado=CA&ac_tienda=CA_1", { espera: 5000 });
  const urlResultados = pagina.url();
  await pagina.locator('.ac-tabs-btn[data-pantalla="evaluacion"]').click();
  await pagina.waitForTimeout(5000);
  const urlEvaluacion = pagina.url();
  comprobar(
    /ac_tienda=CA_1/.test(urlEvaluacion) && /ac_estado=CA/.test(urlEvaluacion),
    `Contexto: se perdió el territorio al pasar a Evaluación (${urlEvaluacion})`,
  );
  comprobar(
    urlResultados.includes("ac_nivel=") === urlEvaluacion.includes("ac_nivel="),
    "Contexto: el nivel de Resultados contaminó la URL de Evaluación",
  );
  const resumen = await texto(pagina, '[data-testid="resumen-segmentos"]');
  comprobar(
    /Nivel Tiendas/.test(resumen ?? "") && /10 segmentos/.test(resumen ?? ""),
    `Evaluación: el resumen no se calcula sobre el nivel activo: ${resumen?.slice(0, 180)}`,
  );
  await pagina
    .locator('[data-testid="evaluacion-segmentos"]')
    .screenshot({ path: `${EV}/inc-evaluacion-segmentos.png` });
  await pagina.close();
}

/* --------------------------------------------- Móvil 390 px y desbordes */
{
  const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  await movil.goto(url("ac_pantalla=exploracion"), { waitUntil: "domcontentloaded" });
  await movil.waitForSelector(".ac-app");
  await movil.waitForTimeout(6000);
  const desborde = await movil.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  comprobar(desborde <= 1, `Móvil: la exploración desborda ${desborde}px`);
  await movil.locator('[data-testid="ab-boton"]').click();
  await movil.waitForTimeout(900);
  const desbordeAbierto = await movil.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  comprobar(desbordeAbierto <= 1, `Móvil: la comparación A/B desborda ${desbordeAbierto}px`);
  await movil
    .locator('[data-testid="comparacion-ab"]')
    .screenshot({ path: `${EV}/inc-movil-ab.png` });
  await movil
    .locator('[data-testid="concentracion"]')
    .screenshot({ path: `${EV}/inc-movil-concentracion.png` });
  const alto = await movil.evaluate(() => {
    const svg = document.querySelector('[data-testid="concentracion"] svg');
    return svg ? Math.round(svg.getBoundingClientRect().height) : null;
  });
  comprobar(alto !== null && alto <= 250, `Móvil: el área de trazado mide ${alto}px (máx. 250)`);
  await movil.close();
}

await navegador.close();

comprobar(errores.length === 0, `errores de consola: ${errores.slice(0, 3).join(" | ")}`);

if (fallos.length) {
  console.error(`\n✗ ${fallos.length} fallo(s):`);
  for (const fallo of fallos) console.error(`  · ${fallo}`);
  process.exit(1);
}
console.log("\n✓ Incremento verificado: granos, alcances, millones, plegado, umbrales y meses parciales.");
