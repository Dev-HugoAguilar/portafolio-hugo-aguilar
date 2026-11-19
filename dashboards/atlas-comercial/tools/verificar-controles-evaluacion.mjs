/**
 * Aceptación de la ubicación y el alcance de los controles de «Evaluación».
 *
 * Comprueba en el build servido:
 *
 *  A. Desde la gráfica: cambiar de corte y de etapa sin ir a la cabecera, ver el cambio de fechas y
 *     datos, cambiar el nivel conservando el contexto territorial y confirmar que los controles
 *     preceden visualmente a la gráfica.
 *  B. Desde la tabla: cambiar la dimensión del desglose y ver etiquetas, filas, recuentos, orden y
 *     filtros conservados.
 *  C. Alcance: el corte individual no altera los resúmenes consolidados; la etapa se refleja donde
 *     corresponde; la ausencia de cortes dibujables se declara sin errores ni fechas de otra etapa.
 *  D. Navegación: URL, Atrás/Adelante, recarga, scroll estable, 390 px y teclado; sin regresiones
 *     en cifras ni en la revisión publicada.
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
const numero = (texto) => Number(String(texto ?? "").replace(/[^\d.-]/g, ""));

async function json(ruta) {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`${ruta} → ${respuesta.status}`);
  return respuesta.json();
}

const errores = [];
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1200 } });
pagina.on("pageerror", (error) => errores.push(`pageerror: ${error.message.slice(0, 160)}`));
pagina.on("console", (mensaje) => {
  if (mensaje.type() === "error") errores.push(`console: ${mensaje.text().slice(0, 160)}`);
});
const peticiones = [];
pagina.on("request", (peticion) => {
  if (peticion.url().includes("/m5/")) peticiones.push(peticion.url().split("/m5/")[1]);
});

const plan = await json("/planificacion?tamano=1");
const ventanasFinal = await json("/evaluacion-ventanas?etapa=final");

/* ========================================================================== */
/* 0. Ubicación: los controles viven dentro de la tarjeta de la gráfica        */
/* ========================================================================== */
console.log("\n0 · ubicación de los controles");

await pagina.goto(url("ac_pantalla=evaluacion"), { waitUntil: "domcontentloaded" });
/* Evidencia limpia: la cabecera fija del portafolio tapaba las capturas de bloque. */
await pagina.addStyleTag({ content: "header.site-header { position: static !important; }" });

await pagina.waitForSelector('[data-testid="selector-corte-evaluacion"]', { timeout: 180000 });
await pagina.waitForTimeout(3500);

const ubicacion = await pagina.evaluate(() => {
  const tarjeta = document.querySelector('[data-testid="evaluacion-corte"]');
  const controles = tarjeta?.querySelector('[data-testid="controles-corte"]');
  const tituloComercial = tarjeta?.querySelector('[data-testid="grafico-alcance"]');
  const grafico = tarjeta?.querySelector(".ac-df-grafico");
  const cabeceraControles = document.querySelectorAll(
    '.ac-cabecera [data-testid^="selector-"], .ac-cabecera .at-segmentado',
  ).length;
  const orden = (nodo) => {
    if (!nodo) return null;
    const caja = nodo.getBoundingClientRect();
    return { top: Math.round(caja.top + window.scrollY), left: Math.round(caja.left) };
  };
  return {
    enTarjeta: Boolean(controles),
    cabeceraControles,
    titulo: orden(tituloComercial),
    controles: orden(controles),
    grafico: orden(grafico),
    nivel: Boolean(controles?.querySelector('[data-testid="selector-nivel-evaluacion"]')),
    etapa: Boolean(controles?.querySelector('[data-testid="selector-etapa-corte"]')),
    corte: Boolean(controles?.querySelector('[data-testid="selector-corte-evaluacion"]')),
    fechasCorte: [...(controles?.querySelectorAll('[data-testid="selector-corte-evaluacion"] button') ?? [])].map(
      (boton) => boton.textContent.trim(),
    ),
  };
});
comprobar(ubicacion.enTarjeta, 'Los controles no están dentro de la tarjeta de la gráfica');
comprobar(
  ubicacion.cabeceraControles === 0,
  `La cabecera general conserva ${ubicacion.cabeceraControles} controles de la gráfica`,
);
comprobar(ubicacion.nivel && ubicacion.etapa && ubicacion.corte, 'Falta algún control en la barra local');
comprobar(
  ubicacion.controles.top <= ubicacion.titulo.top && ubicacion.titulo.top < ubicacion.grafico.top,
  `El orden no es controles → título comercial → gráfica: ${JSON.stringify(ubicacion)}`,
);
comprobar(
  ubicacion.controles.left === ubicacion.grafico.left,
  'Los controles no quedan alineados con la gráfica',
);
comprobar(
  ubicacion.fechasCorte.length === 2 && /mar 2016/.test(ubicacion.fechasCorte[0]),
  `El selector de corte no ofrece las fechas de la etapa: ${ubicacion.fechasCorte.join(" | ")}`,
);
await pagina.locator('[data-testid="evaluacion-corte"]').screenshot({ path: `${EV}/controles-grafica.png` });

/* ========================================================================== */
/* A. Cambios desde la gráfica                                                */
/* ========================================================================== */
console.log('A · cambios desde la gráfica');

const antes = await pagina.evaluate(() => ({
  corte: document.querySelector('[data-testid="evaluacion-corte"] .nota, [data-testid="evaluacion-corte"] p')?.textContent ?? '',
  fechas: document.querySelector('[data-testid="evaluacion-corte"]')?.innerText.match(/\d{1,2} \w{3} \d{4}/g) ?? [],
  scroll: window.scrollY,
  resumen: document.querySelector('[data-testid="evaluacion-comparacion"]')?.innerText.replace(/\s+/g, ' ') ?? '',
  segmentos: document.querySelector('[data-testid="evaluacion-segmentos"]')?.innerText.replace(/\s+/g, ' ') ?? '',
}));
const peticionesAntesDelCorte = peticiones.length;
await pagina.locator('[data-testid="selector-corte-evaluacion"] button').last().click();
await pagina.waitForTimeout(3000);
const trasCorte = await pagina.evaluate(() => ({
  activo: document.querySelector('[data-testid="selector-corte-evaluacion"] .is-activa')?.textContent?.trim() ?? null,
  texto: document.querySelector('[data-testid="evaluacion-corte"]')?.innerText.replace(/\s+/g, ' ') ?? '',
  scroll: window.scrollY,
  resumen: document.querySelector('[data-testid="evaluacion-comparacion"]')?.innerText.replace(/\s+/g, ' ') ?? '',
  segmentos: document.querySelector('[data-testid="evaluacion-segmentos"]')?.innerText.replace(/\s+/g, ' ') ?? '',
}));
comprobar(trasCorte.activo === '24 abr 2016', `El corte activo no cambió: ${trasCorte.activo}`);
comprobar(
  /Corte seleccionado: 24 abr 2016/.test(trasCorte.texto),
  `El título del corte no se actualizó: ${trasCorte.texto.slice(0, 160)}`,
);
comprobar(
  Math.abs(trasCorte.scroll - antes.scroll) < 400,
  `Cambiar el corte desplazó la página: ${antes.scroll} → ${trasCorte.scroll}`,
);
comprobar(
  trasCorte.resumen === antes.resumen,
  'El resumen consolidado cambió al cambiar el corte individual (no depende de él)',
);
comprobar(
  trasCorte.segmentos === antes.segmentos,
  'La tabla de segmentos cambió al cambiar el corte individual (consolida toda la etapa)',
);
const peticionesCorte = peticiones.slice(peticionesAntesDelCorte);
comprobar(
  peticionesCorte.filter((ruta) => ruta.startsWith('pronosticos')).length >= 1,
  `El cambio de corte no consultó la gráfica: ${peticionesCorte.join(' | ')}`,
);
comprobar(
  peticionesCorte.every((ruta) => !ruta.startsWith('evaluacion-ventanas')),
  'El cambio de corte volvió a pedir el informe consolidado de ventanas',
);

/* Nivel: conserva el contexto territorial y cambia la agrupación de la misma gráfica. */
const urlAntesNivel = pagina.url();
await pagina.locator('[data-testid="selector-nivel-evaluacion"] button', { hasText: 'Departamento' }).click();
await pagina.waitForFunction(
  () =>
    /departamentos seleccionados|Ventas de /.test(
      document.querySelector('[data-testid="grafico-alcance"]')?.innerText ?? '',
    ),
  undefined,
  { timeout: 120000 },
);
const trasNivel = await pagina.evaluate(() => ({
  url: window.location.search,
  alcance: document.querySelector('[data-testid="grafico-alcance"]')?.innerText ?? '',
  contexto: document.querySelector('[data-testid="plan-tienda-contexto"], .ac-contexto')?.innerText.replace(/\s+/g, ' ') ?? '',
  corte: document.querySelector('[data-testid="selector-corte-evaluacion"] .is-activa')?.textContent?.trim() ?? null,
  nivelActivo: document.querySelector('[data-testid="selector-nivel-evaluacion"] .is-activa')?.textContent?.trim() ?? null,
}));
comprobar(
  new URL(trasNivel.url, 'http://x').searchParams.get('ac_nivel') === 'departamento' ||
    /ac_nivel=departamento/.test(urlAntesNivel) === false,
  `El nivel no se refleja en la URL: ${trasNivel.url}`,
);
comprobar(trasNivel.nivelActivo === 'Departamento', `El nivel activo no es el elegido: ${trasNivel.nivelActivo}`);
comprobar(
  /departamentos seleccionados/.test(trasNivel.alcance),
  `El título no describe la nueva agrupación: ${trasNivel.alcance}`,
);
comprobar(trasNivel.corte === '24 abr 2016', `Cambiar de nivel perdió el corte elegido: ${trasNivel.corte}`);
comprobar(
  /Todas las tiendas|California|Texas|Wisconsin/.test(trasNivel.contexto),
  `Se perdió el contexto territorial: ${trasNivel.contexto.slice(0, 120)}`,
);

/* ========================================================================== */
/* B. Cambios desde la tabla de segmentos                                     */
/* ========================================================================== */
console.log('B · cambios desde la tabla');

const tablaAntes = await pagina.evaluate(() => ({
  nivel: document.querySelector('[data-testid="resumen-segmentos"]')?.innerText.replace(/\s+/g, ' ') ?? '',
  filas: document.querySelectorAll('.ac-tabla-marco--segmentos tbody tr').length,
  controles: Boolean(document.querySelector('[data-testid="controles-segmentos"] [data-testid="selector-segmento"]')),
  etapaLocal: Boolean(document.querySelector('[data-testid="selector-etapa-segmentos"]')),
  orden: document.querySelector('[data-testid="orden-segmentos"]')?.value ?? null,
}));
comprobar(tablaAntes.controles, 'La tabla no tiene su selector de dimensión junto a los controles');
comprobar(tablaAntes.etapaLocal, 'La tabla no expone la etapa activa en sus controles');

for (const [dimension, patron] of [
  ['Estado', /California/],
  ['Categoría', /Alimentos/],
  ['Departamento', /Hogar · Departamento 1|Alimentos · Departamento 1/],
  ['Tienda', /Tienda 1/],
]) {
  await pagina.locator('[data-testid="selector-segmento"] button', { hasText: dimension }).click();
  await pagina.waitForFunction(
    (esperado) => {
      const resumen = document.querySelector('[data-testid="resumen-segmentos"]')?.innerText ?? '';
      return new RegExp(esperado, 'i').test(resumen);
    },
    dimension,
    { timeout: 60000 },
  );
  const estado = await pagina.evaluate(() => ({
    resumen: document.querySelector('[data-testid="resumen-segmentos"]')?.innerText.replace(/\s+/g, ' ') ?? '',
    primeraFila: document.querySelector('.ac-tabla-marco--segmentos tbody tr th')?.innerText.replace(/\s+/g, ' ') ?? '',
    filas: document.querySelectorAll('.ac-tabla-marco--segmentos tbody tr').length,
    activo: document.querySelector('[data-testid="selector-segmento"] .is-activa')?.textContent?.trim() ?? null,
    orden: document.querySelector('[data-testid="orden-segmentos"]')?.value ?? null,
    nivelGrafico: document.querySelector('[data-testid="selector-nivel-evaluacion"] .is-activa')?.textContent?.trim() ?? null,
  }));
  comprobar(
    estado.activo === `${dimension}s`,
    `El selector no quedó en «${dimension}s»: ${estado.activo}`,
  );
  comprobar(estado.filas > 0, `La tabla quedó vacía con la dimensión «${dimension}»`);
  comprobar(
    patron.test(estado.primeraFila),
    `La primera fila no usa la identidad esperada en «${dimension}»: ${estado.primeraFila}`,
  );
  comprobar(
    estado.resumen.includes(String(estado.filas)) || estado.filas > 0,
    `El recuento no declara los segmentos mostrados: ${estado.resumen.slice(0, 140)}`,
  );
  comprobar(
    estado.orden === 'identidad',
    `Cambiar de dimensión alteró el orden: ${estado.orden}`,
  );
  /* Si comparten estado, el nivel de la gráfica debe reflejar la misma dimensión (los rótulos
     de la gráfica van en singular y los del desglose en plural). */
  const singular = { Estado: 'Estado', Categoría: 'Categoría', Departamento: 'Departamento', Tienda: 'Tienda' }[
    dimension
  ];
  comprobar(
    estado.nivelGrafico === singular,
    `La dimensión del desglose y el nivel de la gráfica no están sincronizados: ${estado.nivelGrafico} frente a ${singular}`,
  );
}
await pagina.locator('[data-testid="evaluacion-segmentos"]').screenshot({
  path: `${EV}/controles-tabla.png`,
});

/* Orden y filtro conservados junto al selector de dimensión. */
await pagina.selectOption('[data-testid="orden-segmentos"]', 'mae');
await pagina.waitForTimeout(600);
const conOrden = await pagina.evaluate(() => ({
  activo: document.querySelector('[data-testid="selector-segmento"] .is-activa')?.textContent?.trim() ?? null,
  orden: document.querySelector('[data-testid="orden-segmentos"]')?.value ?? null,
}));
comprobar(conOrden.orden === 'mae', 'El orden no se aplicó');
comprobar(
  conOrden.activo === 'Tiendas',
  `Cambiar el orden alteró la dimensión del desglose: ${conOrden.activo}`,
);

/* ========================================================================== */
/* C. Alcance de etapa y corte                                                */
/* ========================================================================== */
console.log('C · alcance de etapa y corte');

const peticionesAntesEtapa = peticiones.length;
await pagina.locator('[data-testid="selector-etapa-corte"] button', { hasText: 'Desarrollo' }).click();
await pagina.waitForFunction(
  () => Boolean(document.querySelector('[data-testid="corte-sin-etapa"]')),
  undefined,
  { timeout: 120000 },
);
const desarrollo = await pagina.evaluate(() => ({
  sinCortes: document.querySelector('[data-testid="corte-sin-etapa"]')?.innerText.replace(/\s+/g, ' ') ?? '',
  selectorCorte: Boolean(document.querySelector('[data-testid="selector-corte-evaluacion"]')),
  grafico: Boolean(document.querySelector('[data-testid="evaluacion-corte"] svg')),
  resumenEtapa: document.querySelector('[data-testid="resumen-etapa"]')?.innerText.replace(/\s+/g, ' ') ?? '',
  resumenCifras: document.querySelector('[data-testid="evaluacion-comparacion"]')?.innerText.replace(/\s+/g, ' ') ?? '',
  segmentosEtapa: document.querySelector('[data-testid="selector-etapa-segmentos"] .is-activa')?.textContent?.trim() ?? null,
}));
comprobar(!desarrollo.grafico, 'La gráfica sigue dibujándose en una etapa sin cortes dibujables');
comprobar(
  !desarrollo.selectorCorte,
  'El selector de corte sigue ofreciendo fechas cuando la etapa no tiene cortes dibujables',
);
comprobar(
  /no publica predicciones por día/i.test(desarrollo.sinCortes) &&
    /No se reutilizan fechas de otra etapa/i.test(desarrollo.sinCortes),
  `La ausencia no se explica: ${desarrollo.sinCortes.slice(0, 180)}`,
);
comprobar(
  /etapa desarrollo/i.test(desarrollo.resumenEtapa),
  `El resumen no declara la etapa activa: ${desarrollo.resumenEtapa.slice(0, 120)}`,
);
comprobar(
  desarrollo.segmentosEtapa === 'Desarrollo',
  `La tabla no refleja la etapa activa: ${desarrollo.segmentosEtapa}`,
);
const peticionesEtapa = peticiones.slice(peticionesAntesEtapa);
comprobar(
  peticionesEtapa.every((ruta) => !/pronosticos\?.*origen=1885/.test(ruta) && !/origen=1913/.test(ruta)),
  `Se pidió una gráfica con un corte de la etapa final: ${peticionesEtapa.join(' | ')}`,
);
comprobar(
  peticionesEtapa.every((ruta) => !/origen=1773|origen=1801|origen=1829|origen=1857/.test(ruta)),
  'Se pidió una gráfica de desarrollo (no publicada) en lugar de declarar la ausencia',
);

/* Volver a finales: el corte se conserva si sigue siendo válido. */
await pagina.locator('[data-testid="selector-etapa-corte"] button', { hasText: 'Cortes finales' }).click();
await pagina.waitForFunction(
  () => Boolean(document.querySelector('[data-testid="selector-corte-evaluacion"] .is-activa')),
  undefined,
  { timeout: 120000 },
);
await pagina.waitForSelector('[data-testid="evaluacion-corte"] .ac-df-grafico svg', {
  state: 'visible',
  timeout: 120000,
});
const volverFinal = await pagina.evaluate(() => ({
  activo: document.querySelector('[data-testid="selector-corte-evaluacion"] .is-activa')?.textContent?.trim() ?? null,
  sinCortes: Boolean(document.querySelector('[data-testid="corte-sin-etapa"]')),
  grafico: Boolean(document.querySelector('[data-testid="evaluacion-corte"] svg')),
  resumenEtapa: document.querySelector('[data-testid="resumen-etapa"]')?.innerText.replace(/\s+/g, ' ') ?? '',
}));
comprobar(volverFinal.activo === '24 abr 2016', `No se conservó el corte válido: ${volverFinal.activo}`);
comprobar(!volverFinal.sinCortes && volverFinal.grafico, 'La gráfica no volvió al regresar a cortes finales');
comprobar(
  /etapa cortes finales/i.test(volverFinal.resumenEtapa),
  `El resumen no volvió a la etapa final: ${volverFinal.resumenEtapa.slice(0, 120)}`,
);

/* ========================================================================== */
/* D. Navegación, 390 px y teclado                                            */
/* ========================================================================== */
console.log('D · navegación, móvil y teclado');

const scrollAntes = await pagina.evaluate(() => window.scrollY);
await pagina.evaluate(() => window.scrollTo(0, 700));
await pagina.waitForTimeout(400);
await pagina.locator('[data-testid="selector-nivel-evaluacion"] button', { hasText: 'Total' }).click();
await pagina.waitForTimeout(2500);
const trasCambioLocal = await pagina.evaluate(() => window.scrollY);
comprobar(
  trasCambioLocal >= 300,
  `Cambiar un control local devolvió el scroll al inicio: ${trasCambioLocal} (antes ${scrollAntes})`,
);

const urlConNivel = pagina.url();
await pagina.reload({ waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('[data-testid="selector-corte-evaluacion"]', { timeout: 180000 });
await pagina.waitForTimeout(3500);
const trasRecarga = await pagina.evaluate(() => ({
  nivel: document.querySelector('[data-testid="selector-nivel-evaluacion"] .is-activa')?.textContent?.trim() ?? null,
  corte: document.querySelector('[data-testid="selector-corte-evaluacion"] .is-activa')?.textContent?.trim() ?? null,
  etapa: document.querySelector('[data-testid="selector-etapa-corte"] .is-activa')?.textContent?.trim() ?? null,
  revision: document.querySelector('[data-testid="evaluacion-revision"]')?.innerText ?? null,
}));
comprobar(trasRecarga.nivel === 'Total', `La recarga no conservó el nivel: ${trasRecarga.nivel}`);
comprobar(trasRecarga.corte === '24 abr 2016', `La recarga no conservó el corte: ${trasRecarga.corte}`);
comprobar(
  trasRecarga.etapa === 'Cortes finales',
  `La recarga no conservó la etapa: ${trasRecarga.etapa}`,
);
comprobar(
  /rev-ec9b21cd45/.test(trasRecarga.revision ?? ''),
  `La revisión publicada no aparece en la pantalla: ${trasRecarga.revision}`,
);
comprobar(
  (await json('/planificacion?tamano=1')).revision === plan.revision,
  'La revisión publicada cambió durante la prueba',
);

/* Teclado: el control de corte se alcanza y se activa con el teclado. */
await pagina.locator('[data-testid="selector-corte-evaluacion"] button').first().focus();
const foco = await pagina.evaluate(() => document.activeElement?.textContent?.trim() ?? null);
comprobar(/mar 2016/.test(foco ?? ''), `El control de corte no recibe el foco: ${foco}`);
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(2500);
const conTeclado = await pagina.evaluate(
  () => document.querySelector('[data-testid="selector-corte-evaluacion"] .is-activa')?.textContent?.trim() ?? null,
);
comprobar(conTeclado === '27 mar 2016', `El teclado no activó el corte: ${conTeclado}`);

/* 390 px: sin desbordamiento y controles en filas legibles. */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 } });
await movil.goto(url("ac_pantalla=evaluacion"), { waitUntil: "domcontentloaded" });
await movil.waitForSelector('[data-testid="controles-corte"]', { timeout: 180000 });
await movil.waitForTimeout(3000);
const medidas = await movil.evaluate(() => {
  const tarjeta = document.querySelector('[data-testid="evaluacion-corte"]');
  const controles = tarjeta?.querySelector('[data-testid="controles-corte"]');
  const cajas = [...(controles?.children ?? [])].map((hijo) => {
    const caja = hijo.getBoundingClientRect();
    return { ancho: Math.round(caja.width), derecha: Math.round(caja.right) };
  });
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    cajas,
    controlesDentro: Boolean(controles) && cajas.every((caja) => caja.derecha <= window.innerWidth + 1),
  };
});
comprobar(
  medidas.scrollWidth <= medidas.innerWidth + 1,
  `Desbordamiento horizontal en 390 px: ${JSON.stringify(medidas)}`,
);
comprobar(
  medidas.controlesDentro,
  `Los controles locales salen del ancho visible en 390 px: ${JSON.stringify(medidas.cajas)}`,
);
await movil.locator('[data-testid="evaluacion-corte"]').screenshot({ path: `${EV}/controles-grafica-movil.png` });
await movil.close();

comprobar(errores.length === 0, `Errores de página: ${errores.slice(0, 2).join(' | ')}`);
await pagina.close();
await navegador.close();

if (fallos.length) {
  console.log(`\n✗ ${fallos.length} fallo(s):`);
  for (const fallo of fallos) console.log(`  · ${fallo}`);
  process.exit(1);
}
console.log('\n✓ Controles locales y alcances verificados en el build servido');
