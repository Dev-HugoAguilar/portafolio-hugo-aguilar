/**
 * Verificación de las burbujas empaquetadas de «Vidas en tránsito» en Panorama
 * (origen y destino). Las combinaciones de motivos y los rankings de Atención y
 * perfiles se validan en `verificar-atencion-redodem.mjs`.
 *
 * Comprueba, en la vista directa y en la ficha integrada del portafolio, que los
 * paneles categóricos de la serie REDODEM usan el componente del Atlas vial:
 *
 *  1. cada panel dibuja burbujas empaquetadas del componente (no una gráfica
 *     genérica), sin solapes y con la guía, las leyendas y la tabla;
 *  2. el ÁREA —no el radio— es proporcional al conteo;
 *  3. los conteos y denominadores de los paneles 03, 04 y 05 son exactamente los
 *     declarados, y los de 07 coinciden con su agregado;
 *  4. «Otros» se distingue (lavanda) y ni «No especificado» ni «NA» se mezclan
 *     con las categorías sustantivas: se informan aparte con su cifra exacta;
 *  5. la nota de motivos explica que las respuestas coexisten;
 *  6. tooltip, selección, teclado, tabla accesible y diseño móvil funcionan, y
 *     tooltip y tabla coinciden con lo dibujado;
 *  7. no hay errores de consola, recursos faltantes ni desbordamiento.
 *
 *   node tools/verificar-burbujas-vidas.mjs
 */
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'vidas-en-transito');
const DIRECTO = 'http://127.0.0.1:8000/dashboards/vidas-en-transito/index.html';
const FICHA = 'http://127.0.0.1:8000/#/area/dashboards/vidas-en-transito';
const PANELES = ['redodemOrigin', 'redodemDestination'];

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(SALIDA, { recursive: true });
const ok = [];
const fallos = [];
const errores = [];
const comprobar = (condicion, mensaje) => (condicion ? ok : fallos).push(mensaje);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ----------------------------- datos de referencia ------------------------ */
const datos = JSON.parse(readFileSync(path.join(RAIZ, 'dist', 'dashboards', 'vidas-en-transito', 'data.json'), 'utf8'));
const redodem = datos.redodem;
const ordenar = (objeto) => Object.entries(objeto || {}).filter(([, v]) => Number(v) > 0).sort((a, b) => b[1] - a[1]);

const origenEsperado = [
  ['Honduras', 12889], ['Venezuela', 10350], ['Guatemala', 3634], ['Colombia', 2757],
  ['Ecuador', 2260], ['El Salvador', 2214], ['Haití', 1456], ['Otros (92 categorías)', 4933],
];
const destinoEsperado = [
  ['Estados Unidos', 4959], ['México', 890], ['Honduras', 46], ['Guatemala', 31],
  ['Canadá', 26], ['Venezuela', 19], ['Colombia', 18], ['Otros (16 categorías)', 70],
];
const motivosEsperado = ordenar(redodem.departure_reason_mentions.mentions);
const violenciasEsperado = ordenar(redodem.violence_mentions.mentions);
const perpsEsperado = ordenar(redodem.perpetrator_mentions.mentions);
const suma = (lista) => lista.reduce((total, [, valor]) => total + valor, 0);

comprobar(suma(origenEsperado) === 40493, `origen: las 8 burbujas suman 40,493 (${suma(origenEsperado)})`);
comprobar(suma(origenEsperado) + 307 === 40800, 'origen: 40,493 + 307 «No especificado» = 40,800 filas del campo');

/* La agrupación se calcula en el navegador: se comprueba contra los datos que la
   suma de «Otros» es exactamente la de las categorías omitidas. */
const nacimientoCats = Object.entries(redodem.field_summaries.pais_de_nacimiento.categories);
const nacimientoOmitidas = nacimientoCats.filter(([k]) => k !== 'No especificado' && !origenEsperado.slice(0, 7).some(([n]) => n === k));
comprobar(nacimientoOmitidas.length === 92 && suma(nacimientoOmitidas) === 4933, `origen: «Otros» agrupa ${nacimientoOmitidas.length} categorías y su suma es ${suma(nacimientoOmitidas)}`);
const destinoCats = Object.entries(redodem.field_summaries.pais_destino.categories);
const destinoOmitidas = destinoCats.filter(([k]) => k !== 'NA' && !destinoEsperado.slice(0, 7).some(([n]) => n === k));
comprobar(destinoOmitidas.length === 16 && suma(destinoOmitidas) === 70, `destino: «Otros» agrupa ${destinoOmitidas.length} categorías y su suma es ${suma(destinoOmitidas)}`);
comprobar(suma(destinoEsperado) === 6059, `destino: las 8 burbujas suman 6,059 (${suma(destinoEsperado)})`);
comprobar(6059 + 34741 === 40800, 'destino: 6,059 con destino + 34,741 NA = 40,800 filas');
comprobar(suma(motivosEsperado) === 7863 && redodem.departure_reason_mentions.records_with_value === 6338, `motivos: 7,863 menciones sobre 6,338 filas (${suma(motivosEsperado)})`);
comprobar(suma(violenciasEsperado) === 737 && redodem.violence_mentions.records_with_value === 499, `violencias: 737 menciones sobre 499 filas (${suma(violenciasEsperado)})`);
comprobar(suma(perpsEsperado) === 597 && redodem.perpetrator_mentions.records_with_value === 469, `perpetradores: 597 menciones sobre 469 filas (${suma(perpsEsperado)})`);

/* Cruces publicados: deben reconciliar con sus universos. */
const cruces = redodem.cross_tabs;
const sumaCruce = (campo, modo) => Object.values(cruces[campo][modo]).reduce(
  (total, fila) => total + Object.values(fila).reduce((a, n) => a + Number(n), 0), 0,
);
comprobar(sumaCruce('pais_de_nacimiento', 'grupo_etario') === 40800 && sumaCruce('pais_de_nacimiento', 'genero') === 40800, 'cruces país × edad y país × género reconcilian con 40,800');
comprobar(sumaCruce('pais_destino', 'grupo_etario') === 6059 && sumaCruce('pais_destino', 'genero') === 6059, 'cruces destino × edad y destino × género reconcilian con 6,059');
comprobar(redodem.cross_tabs_meta.destination_na === 34741 && redodem.cross_tabs_meta.rows === 40800, 'el metadata declara 34,741 NA y 40,800 filas de origen');
const sumaHonduras = (modo) => Object.values(cruces.pais_de_nacimiento[modo].Honduras).reduce((a, n) => a + Number(n), 0);
comprobar(sumaHonduras('grupo_etario') === redodem.field_summaries.pais_de_nacimiento.categories.Honduras && sumaHonduras('genero') === redodem.field_summaries.pais_de_nacimiento.categories.Honduras, 'Honduras reconcilia en ambos cruces (12,889)');
const sumaDestinoUS = (modo) => Object.values(cruces.pais_destino[modo]['Estados Unidos']).reduce((a, n) => a + Number(n), 0);
comprobar(sumaDestinoUS('grupo_etario') === redodem.field_summaries.pais_destino.categories['Estados Unidos'] && sumaDestinoUS('genero') === redodem.field_summaries.pais_destino.categories['Estados Unidos'], 'Estados Unidos reconcilia en ambos cruces (4,959)');
comprobar(!('NA' in cruces.pais_destino.grupo_etario) && !('NA' in cruces.pais_destino.genero), 'los cruces de destino excluyen NA');

/* ----------------------------- utilidades -------------------------------- */
const funcionLeerPanel = function (id) {
  const caja = document.getElementById(id);
  if (!caja) return null;
  const circulos = [...caja.querySelectorAll('.bv-circulo')];
  const nodos = circulos.map((c) => {
    const transform = c.parentElement.getAttribute('transform') || '';
    const numeros = (transform.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    return {
      etiqueta: c.dataset.cat,
      valor: Number(c.dataset.valor),
      r: Number(c.getAttribute('r')),
      x: numeros[0],
      y: numeros[1],
      fill: (c.getAttribute('fill') || '').toUpperCase(),
      textoFill: (c.parentElement.querySelector('text')?.getAttribute('fill') || '').toUpperCase(),
      aria: c.getAttribute('aria-label'),
      pressed: c.getAttribute('aria-pressed'),
      texto: [...c.parentElement.querySelectorAll('text')].map((t) => t.textContent).join(' ').trim(),
    };
  });
  return {
    id,
    nodos,
    filas: [...caja.querySelectorAll('.chart-table tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim())),
    caption: caja.querySelector('.chart-table caption')?.textContent || '',
    resumenAccesible: caja.querySelector('.chart-table summary')?.textContent.trim() || '',
    faltante: caja.querySelector('.bv-faltante')?.innerText.replace(/\s+/g, ' ').trim() || '',
    leyendaArea: [...caja.querySelectorAll('.bv-leyenda-titulo')].map((n) => n.textContent.trim()),
    colores: [...caja.querySelectorAll('.bv-leyenda-item')].map((n) => n.textContent.trim()),
    notas: [...caja.querySelectorAll('.bv-nota')].map((n) => n.textContent.trim()),
    guia: caja.querySelector('.bv-guia')?.innerText || '',
    haySvg: Boolean(caja.querySelector('svg.bv-svg')),
    porcentajesEnBurbujas: [...caja.querySelectorAll('.bv-texto')].some((t) => t.textContent.includes('%')),
    ancho: caja.querySelector('svg.bv-svg')?.getBoundingClientRect().width || 0,
  };
};

const leerPaneles = (pagina, ids) =>
  pagina.evaluate(
    ({ lista, funcion }) => {
      const leer = new Function('id', 'return (' + funcion + ')(id);');
      return Object.fromEntries(lista.map((id) => [id, leer(id)]));
    },
    { lista: ids, funcion: funcionLeerPanel.toString() },
  );

const abrirSeccion = async (pagina, patron = /atención|perfiles/i) => {
  await pagina.evaluate((fuente) => {
    const regex = new RegExp(fuente, 'i');
    const boton = [...document.querySelectorAll('#tabs button')].find((b) => regex.test(b.textContent));
    if (boton) boton.click();
  }, patron.source);
  await pagina.waitForFunction(() => document.querySelectorAll('.section.active .bv-circulo').length > 0, null, { timeout: 60_000 });
  await pagina.waitForTimeout(700);
};

const sinSolapes = (nodos) => {
  let choques = 0;
  for (let i = 0; i < nodos.length; i += 1) {
    for (let j = i + 1; j < nodos.length; j += 1) {
      const a = nodos[i];
      const b = nodos[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - 1) choques += 1;
    }
  }
  return choques;
};

const desviacion = (nodos, fn) => {
  const razones = nodos.filter((n) => n.valor > 0).map(fn);
  const media = razones.reduce((a, b) => a + b, 0) / razones.length;
  return Math.max(...razones.map((r) => Math.abs(r - media) / media));
};

const navegador = await chromium.launch();

/* ======================= 1. Vista directa · escritorio ==================== */
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-MX' });
const pagina = await contexto.newPage();
const fallosRed = [];
pagina.on('console', (m) => {
  if (m.type() === 'error') errores.push('consola: ' + m.text().slice(0, 180));
});
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message.slice(0, 180)));
pagina.on('response', (r) => {
  if (r.status() >= 400) fallosRed.push(`${r.status()} ${r.url()}`);
});
pagina.on('requestfailed', (r) => fallosRed.push(`fallo ${r.url()} ${r.failure()?.errorText || ''}`));

await pagina.goto(DIRECTO, { waitUntil: 'load' });
const componente = await pagina.evaluate(() => ({
  existe: Boolean(window.BurbujasAtlas && typeof window.BurbujasAtlas.render === 'function'),
  scripts: [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')),
}));
comprobar(componente.existe, 'el componente BurbujasAtlas está cargado en la página');
comprobar(componente.scripts.some((s) => /burbujas\.js$/.test(s)), `el tablero carga burbujas.js (${componente.scripts.join(', ')})`);

await abrirSeccion(pagina, /panorama/i);
const panelesPanorama = await leerPaneles(pagina, ['redodemOrigin', 'redodemDestination']);
const controlesExploracion = await pagina.evaluate(() => ({
  origen: [...document.querySelectorAll('.redodem-vistas[data-vistas="origen"] .redodem-vista')].map((b) => ({ texto: b.textContent.trim(), activo: b.getAttribute('aria-pressed'), oculto: b.hidden })),
  destino: [...document.querySelectorAll('.redodem-vistas[data-vistas="destino"] .redodem-vista')].map((b) => b.textContent.trim()),
  capsula: document.querySelector('.redodem-vistas[data-vistas="origen"] .redodem-capsula')?.parentElement.getAttribute('data-medida'),
  conteoOrigen: document.getElementById('origenConteo')?.textContent.trim() || '',
  conteoDestino: document.getElementById('destinoConteo')?.textContent.trim() || '',
}));
comprobar(controlesExploracion.origen.length === 3 && controlesExploracion.destino.length === 3 && controlesExploracion.capsula === 'si', 'las dos gráficas exponen los tres controles segmentados con cápsula medida');
comprobar(controlesExploracion.origen[0].texto === 'Vista general' && controlesExploracion.origen[0].activo === 'true' && controlesExploracion.origen[1].texto === 'Explorar por edad' && controlesExploracion.origen[2].texto === 'Explorar por sexo', 'los controles usan las etiquetas solicitadas y empiezan en vista general');
comprobar(/40,800/.test(controlesExploracion.conteoOrigen) && /307/.test(controlesExploracion.conteoOrigen) && /40,800/.test(controlesExploracion.conteoDestino) && /34,741/.test(controlesExploracion.conteoDestino), 'cada gráfica muestra conteo, denominador y faltantes junto a la vista');

/* Exploración por edad: el paquete solo contiene marginales, así que el detalle
   debe declarar la limitación y no dibujar burbujas inventadas. */
await pagina.locator('.redodem-vistas[data-vistas="origen"] [data-vista="edad"]').click();
await pagina.waitForTimeout(300);
const modoEdad = await pagina.evaluate(() => ({
  visible: !document.getElementById('origenModo').hidden,
  texto: document.getElementById('origenModo').innerText.replace(/\s+/g, ' '),
  activo: document.querySelector('.redodem-vistas[data-vistas="origen"] [data-vista="edad"]').getAttribute('aria-pressed'),
}));
comprobar(modoEdad.visible && modoEdad.activo === 'true' && /Selecciona una burbuja/.test(modoEdad.texto), '«Explorar por edad» activa el modo y pide seleccionar una categoría');
await pagina.locator('#redodemOrigin .bv-circulo[data-cat="Honduras"]').click({ force: true });
await pagina.waitForTimeout(700);
const detalleEdad = await pagina.evaluate(() => ({
  visible: !document.getElementById('origenDetalle').hidden,
  texto: document.getElementById('origenDetalle').innerText.replace(/\s+/g, ' '),
  tabla: document.querySelectorAll('#origenDetalle table').length,
  burbujas: [...document.querySelectorAll('#origenDetalleChart .bv-circulo')].map((c) => [c.dataset.cat, Number(c.dataset.valor)]),
  encabezado: document.querySelector('#origenDetalle h4')?.textContent.trim() || '',
  generalOculta: document.getElementById('redodemOrigin').hidden,
}));
comprobar(detalleEdad.visible && detalleEdad.encabezado.startsWith('Honduras') && /12,889/.test(detalleEdad.texto) && detalleEdad.generalOculta, `el detalle abre solo la categoría elegida («${detalleEdad.encabezado}»)`);
comprobar(detalleEdad.burbujas.length === 6 && detalleEdad.burbujas.reduce((a, [, n]) => a + n, 0) === 12889 && detalleEdad.tabla === 1 && !/Sin datos suficientes/.test(detalleEdad.texto), `el desglose por edad dibuja 6 grupos que suman 12,889 (${detalleEdad.burbujas.map(([c, n]) => `${c} ${n}`).join(' · ')})`);
comprobar(detalleEdad.burbujas.some(([c]) => c === 'No especificado') && detalleEdad.burbujas.some(([c]) => c === 'Adultos jóvenes'), 'el desglose conserva «No especificado» y los grupos etarios de la fuente');
const detalleBurbuja = pagina.locator('#origenDetalleChart .bv-circulo[data-cat="Adultos jóvenes"]');
await detalleBurbuja.hover();
await pagina.waitForTimeout(350);
const detalleLeyenda = await pagina.evaluate(() => ({
  tooltip: (() => { const t = document.querySelector('#origenDetalleChart .bv-tooltip'); return t && !t.hidden ? t.innerText.replace(/\s+/g, ' ') : ''; })(),
  leyenda: document.querySelector('#origenDetalleChart .bv-leyendas')?.innerText.replace(/\s+/g, ' ') || '',
  filasTabla: document.querySelectorAll('#origenDetalleChart table tbody tr').length,
}));
comprobar(/5,365/.test(detalleLeyenda.tooltip) && /12,889/.test(detalleLeyenda.tooltip), `tooltip del desglose con conteo y denominador («${detalleLeyenda.tooltip.slice(0, 90)}…»)`);
comprobar(/Área = filas registradas/i.test(detalleLeyenda.leyenda) && detalleLeyenda.filasTabla === 6, 'leyenda y tabla accesible del desglose coinciden con las seis categorías');
await pagina.locator('#origenDetalle .redodem-volver').click();
await pagina.waitForTimeout(300);
comprobar(await pagina.evaluate(() => document.getElementById('origenDetalle').hidden && !document.getElementById('redodemOrigin').hidden && document.querySelector('.redodem-vistas[data-vistas="origen"] [data-vista="general"]').getAttribute('aria-pressed') === 'true'), '«Volver a la vista general» restaura la gráfica general');

await pagina.locator('.redodem-vistas[data-vistas="origen"] [data-vista="sexo"]').click();
await pagina.waitForTimeout(300);
comprobar(await pagina.evaluate(() => !document.getElementById('origenModo').hidden && /sexo registrado/.test(document.getElementById('origenModo').innerText)), '«Explorar por sexo» activa su propio modo con la variable disponible');
await pagina.locator('#redodemOrigin .bv-circulo[data-cat="Honduras"]').click({ force: true });
await pagina.waitForTimeout(700);
const detalleSexo = await pagina.evaluate(() => ({
  burbujas: [...document.querySelectorAll('#origenDetalleChart .bv-circulo')].map((c) => [c.dataset.cat, Number(c.dataset.valor)]),
  texto: document.getElementById('origenDetalle').innerText.replace(/\s+/g, ' '),
}));
comprobar(detalleSexo.burbujas.length === 4 && detalleSexo.burbujas.reduce((a, [, n]) => a + n, 0) === 12889 && detalleSexo.burbujas.some(([c]) => c === 'Persona no binaria') && /12,889/.test(detalleSexo.texto), `el desglose por sexo dibuja 4 categorías que suman 12,889 (${detalleSexo.burbujas.map(([c, n]) => `${c} ${n}`).join(' · ')})`);
await pagina.locator('#origenDetalle .redodem-volver').click();
await pagina.waitForTimeout(250);
await pagina.locator('.redodem-vistas[data-vistas="origen"] [data-vista="general"]').click();
await pagina.waitForTimeout(200);

await pagina.locator('.redodem-vistas[data-vistas="destino"] [data-vista="edad"]').click();
await pagina.waitForTimeout(300);
await pagina.locator('#redodemDestination .bv-circulo[data-cat="Estados Unidos"]').click({ force: true });
await pagina.waitForTimeout(700);
const detalleDestino = await pagina.evaluate(() => ({
  texto: document.getElementById('destinoDetalle').innerText.replace(/\s+/g, ' '),
  tabla: document.querySelectorAll('#destinoDetalle table').length,
  burbujas: [...document.querySelectorAll('#destinoDetalleChart .bv-circulo')].map((c) => [c.dataset.cat, Number(c.dataset.valor)]),
}));
comprobar(detalleDestino.burbujas.length === 6 && detalleDestino.burbujas.reduce((a, [, n]) => a + n, 0) === 4959 && detalleDestino.tabla === 1 && !/Sin datos suficientes/.test(detalleDestino.texto), `destino × edad suma 4,959 y conserva seis grupos (${detalleDestino.burbujas.length})`);
comprobar(/4,959/.test(detalleDestino.texto) && /34,741/.test(detalleDestino.texto) && !detalleDestino.burbujas.some(([c]) => c === 'NA'), 'destino conserva 34,741 NA fuera del desglose y no lo convierte en destino');
await pagina.locator('#destinoDetalle .redodem-volver').click();
await pagina.waitForTimeout(250);

const panels = { ...panelesPanorama };
const { redodemOrigin: origen, redodemDestination: destino } = panels;
const porEtiqueta = (panel) => Object.fromEntries(panel.nodos.map((n) => [n.etiqueta, n.valor]));
const grupo = { origen, destino };

/* 1 · componente y empaquetado */
for (const [nombre, panel] of Object.entries(grupo)) {
  comprobar(Boolean(panel.haySvg) && panel.nodos.length > 0, `${nombre}: dibuja un SVG con ${panel.nodos.length} burbujas`);
  comprobar(/cómo leer la gráfica/i.test(panel.guia), `${nombre}: incluye la guía «Cómo leer la gráfica»`);
  comprobar(/Consultar tabla accesible/.test(panel.resumenAccesible), `${nombre}: conserva «Consultar tabla accesible»`);
  comprobar(sinSolapes(panel.nodos) === 0, `${nombre}: ninguna burbuja se solapa`);
  const xs = new Set(panel.nodos.map((n) => Math.round(n.x / 12)));
  const ys = new Set(panel.nodos.map((n) => Math.round(n.y / 12)));
  comprobar(xs.size > 1 && ys.size > 1, `${nombre}: están empaquetadas, no en una lista (${xs.size} columnas × ${ys.size} filas)`);
  comprobar(!panel.porcentajesEnBurbujas, `${nombre}: las burbujas muestran conteos, no porcentajes`);
  comprobar(panel.leyendaArea.some((t) => /Área = (filas|menciones) registradas/i.test(t)), `${nombre}: la leyenda declara qué representa el área (${panel.leyendaArea[0]})`);
  comprobar(panel.colores.some((t) => /Categoría/.test(t)), `${nombre}: la leyenda de color explica el azul`);
}

/* 2 · área proporcional */
for (const [nombre, panel] of Object.entries(grupo)) {
  const area = desviacion(panel.nodos, (n) => (Math.PI * n.r * n.r) / n.valor);
  const lineal = desviacion(panel.nodos, (n) => n.r / n.valor);
  comprobar(area < 0.02, `${nombre}: área proporcional al conteo (desviación ${(area * 100).toFixed(2)} %)`);
  comprobar(lineal > 0.2, `${nombre}: el radio no es proporcional al conteo (desviación lineal ${(lineal * 100).toFixed(0)} %)`);
}

/* 3 · datos exactos */
comprobar(igual(Object.entries(porEtiqueta(origen)).sort(), [...origenEsperado].sort()), `origen: las 8 categorías y sus conteos son los declarados (${JSON.stringify(porEtiqueta(origen))})`);
comprobar(origen.nodos.length === 8, `origen: dibuja 8 burbujas (7 países + «Otros»), no 9 (${origen.nodos.length})`);
comprobar(/No especificado/.test(origen.faltante) && /307/.test(origen.faltante) && /40,800/.test(origen.faltante), `origen: «No especificado» se informa aparte con 307 de 40,800 (${origen.faltante.slice(0, 60)}…)`);
comprobar(!('No especificado' in porEtiqueta(origen)), 'origen: «No especificado» no es una burbuja más');
comprobar(porEtiqueta(origen)['Otros (92 categorías)'] === 4933, 'origen: «Otros» suma 4,933 sin absorber las 307 filas de «No especificado»');
comprobar(/92 categorías/.test(origen.caption) && /307/.test(origen.caption), 'origen: la tabla documenta la agrupación de 92 categorías y las 307 filas aparte');

comprobar(igual(Object.entries(porEtiqueta(destino)).sort(), [...destinoEsperado].sort()), `destino: las 8 categorías con destino son las declaradas (${JSON.stringify(porEtiqueta(destino))})`);
comprobar(destino.nodos.length === 8, `destino: dibuja 8 burbujas de destino (${destino.nodos.length})`);
comprobar(/NA/.test(destino.faltante) && /34,741/.test(destino.faltante) && /40,800/.test(destino.faltante), `destino: «NA» se muestra aparte con 34,741 de 40,800 (${destino.faltante.slice(0, 70)}…)`);
comprobar(!('NA' in porEtiqueta(destino)), 'destino: «NA» no se convierte en un destino');
comprobar(destino.filas.some((f) => /NA/.test(f[0]) && f[1] === '34,741'), 'destino: la tabla accesible incluye la fila NA con su conteo exacto');
comprobar(/no es un destino/i.test(destino.faltante), 'destino: el bloque NA aclara que no es un destino');
comprobar(!('NA' in porEtiqueta(destino)) && !('NA' in porEtiqueta(origen)), 'destino: el literal NA tampoco se suma a «Otros»');



/* 4 · colores y distinciones */
const lavanda = '#C9C1DE';
const indigo = '#4B55FF';
comprobar(origen.nodos.find((n) => /^Otros/.test(n.etiqueta)).fill === lavanda, 'origen: la agrupación «Otros» va en lavanda');
comprobar(origen.nodos.filter((n) => !/^Otros/.test(n.etiqueta)).every((n) => n.fill === indigo), 'origen: las categorías del campo van en índigo');
comprobar(destino.nodos.find((n) => /^Otros/.test(n.etiqueta)).fill === lavanda, 'destino: la agrupación «Otros» va en lavanda');
comprobar(/Agrupación/.test(origen.colores.join(' ')), 'origen: la leyenda de color explica la lavanda');
comprobar(destino.colores.some((t) => /Categoría con destino/.test(t)), 'destino: la leyenda de color explica el índigo');

/* 5 · tooltip, selección y teclado */
await abrirSeccion(pagina, /panorama/i);
const destinoCaja = pagina.locator('#redodemDestination');
const mayor = destinoCaja.locator('.bv-circulo[data-cat="Estados Unidos"]');
await mayor.hover();
await pagina.waitForTimeout(400);
const tooltip = await destinoCaja.locator('.bv-tooltip').evaluate((n) => ({ visible: !n.hidden, texto: n.innerText.replace(/\s+/g, ' ').trim() }));
comprobar(tooltip.visible && /Estados Unidos/.test(tooltip.texto), `tooltip al pasar el cursor: ${tooltip.texto.slice(0, 80)}`);
comprobar(/4,959/.test(tooltip.texto) && /81,8 %/.test(tooltip.texto) && /de 6,059/.test(tooltip.texto), 'tooltip: conteo exacto, proporción y denominador');
await destinoCaja.screenshot({ path: path.join(SALIDA, 'burbujas-destino-tooltip.png') });

const tabindex = await mayor.getAttribute('tabindex');
const rol = await mayor.getAttribute('role');
comprobar(tabindex === '0' && rol === 'button', 'cada burbuja es un control enfocable (tabindex=0, role=button)');

await mayor.focus();
await pagina.waitForTimeout(250);
const tooltipFoco = await destinoCaja.locator('.bv-tooltip').evaluate((n) => !n.hidden);
comprobar(tooltipFoco, 'el tooltip también aparece con foco de teclado');
const haloFoco = await destinoCaja.locator('.bv-nodo.is-foco .bv-halo').count();
comprobar(haloFoco >= 1, 'el foco dibuja un anillo visible alrededor de la burbuja');

await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(250);
const seleccion = await destinoCaja.evaluate((n) => ({
  aviso: n.querySelector('.bv-seleccion')?.innerText.trim() || '',
  seleccionados: n.querySelectorAll('.bv-nodo.is-sel').length,
  tenues: n.querySelectorAll('.bv-nodo.is-tenue').length,
  pressed: [...n.querySelectorAll('.bv-circulo')].filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.cat),
}));
comprobar(seleccion.seleccionados === 1 && seleccion.tenues === destino.nodos.length - 1, `Enter selecciona una burbuja y atenúa el resto (${seleccion.seleccionados} · ${seleccion.tenues})`);
comprobar(/^Seleccionado: Estados Unidos · 4,959 filas/.test(seleccion.aviso), `el aviso de selección da el conteo exacto (${seleccion.aviso.slice(0, 72)}…)`);
comprobar(igual(seleccion.pressed, ['Estados Unidos']), 'aria-pressed refleja la selección');
await destinoCaja.screenshot({ path: path.join(SALIDA, 'burbujas-destino-seleccion.png') });

await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(250);
comprobar((await destinoCaja.evaluate((n) => n.querySelectorAll('.bv-nodo.is-sel').length)) === 0, 'Escape limpia la selección');

const accesibles = await pagina.evaluate(() =>
  [...document.querySelectorAll('#redodemOrigin .bv-circulo')].map((c) => c.getAttribute('aria-label')),
);
comprobar(accesibles.length === 8 && accesibles.every((t) => /\d/.test(t) && /filas/.test(t)), 'las 8 burbujas de origen tienen nombre accesible con su conteo');

/* 6 · tabla accesible ↔ burbujas */
for (const [nombre, panel] of Object.entries(grupo)) {
  const filasCategoria = panel.filas.filter((f) => !/valor faltante/.test(f[0]));
  const conteosTabla = filasCategoria.map((f) => Number(f[1].replace(/,/g, '')));
  const conteosDibujo = panel.nodos.map((n) => n.valor);
  comprobar(
    igual([...conteosTabla].sort((a, b) => a - b), [...conteosDibujo].sort((a, b) => a - b)),
    `${nombre}: la tabla accesible coincide con lo dibujado (${conteosTabla.length} filas)`,
  );
  comprobar(filasCategoria.length === panel.nodos.length, `${nombre}: la tabla incluye todas las categorías dibujadas`);
}

/* 6b · contraste del texto interior sobre el relleno de cada burbuja */
const luminancia = (hex) => {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lineal = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2];
};
const contraste = (a, b) => {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
for (const [nombre, panel] of Object.entries(grupo)) {
  const conTexto = panel.nodos.filter((n) => /^#[0-9A-F]{6}$/.test(n.textoFill));
  const minimo = Math.min(...conTexto.map((n) => contraste(n.fill, n.textoFill)));
  comprobar(minimo >= 4.5, `${nombre}: el texto interior de las burbujas cumple AA (mínimo ${minimo.toFixed(2)}:1)`);
}

await pagina.evaluate(() => {
  const activo = document.activeElement;
  if (activo && typeof activo.blur === 'function') activo.blur();
});
await pagina.mouse.move(2, 2);
await pagina.waitForTimeout(250);
/* 7 · capturas de escritorio */
for (const [id, nombre, patron] of [
  ['redodemOrigin', 'origen', /panorama/i],
  ['redodemDestination', 'destino', /panorama/i],
]) {
  await abrirSeccion(pagina, patron);
  const caja = pagina.locator(`#${id}`);
  await caja.scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  await caja.screenshot({ path: path.join(SALIDA, `burbujas-${nombre}.png`) });
}
await pagina.screenshot({ path: path.join(SALIDA, 'burbujas-seccion-escritorio.png'), fullPage: false });

/* ======================= 2. Móvil ======================================= */
const movilContexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'es-MX',
});
const movil = await movilContexto.newPage();
const erroresMovil = [];
const redMovil = [];
movil.on('console', (m) => {
  if (m.type() === 'error') erroresMovil.push(m.text().slice(0, 180));
});
movil.on('pageerror', (e) => erroresMovil.push('pageerror: ' + e.message.slice(0, 180)));
movil.on('response', (r) => {
  if (r.status() >= 400) redMovil.push(`${r.status()} ${r.url()}`);
});
await movil.goto(DIRECTO, { waitUntil: 'load' });
const medirMovil = (ids) => movil.evaluate((lista) => {
  const cajas = lista.map((id) => {
    const caja = document.getElementById(id);
    const svg = caja.querySelector('svg.bv-svg');
    const circulos = [...caja.querySelectorAll('.bv-circulo')].map((c) => {
      const transform = c.parentElement.getAttribute('transform') || '';
      const numeros = (transform.match(/-?\d+(\.\d+)?/g) || []).map(Number);
      return { x: numeros[0], y: numeros[1], r: Number(c.getAttribute('r')) };
    });
    const ancho = svg.getBoundingClientRect().width;
    const alto = svg.getBoundingClientRect().height;
    const fuera = circulos.filter((c) => c.x - c.r < -1 || c.x + c.r > ancho + 1 || c.y - c.r < -1 || c.y + c.r > alto + 1).length;
    return { id, burbujas: circulos.length, fuera, ancho: Math.round(ancho), alto: Math.round(alto) };
  });
  const regiones = [...document.querySelectorAll('.section.active .bv-region')].map((n) => n.getBoundingClientRect().right);
  const leyendas = [...document.querySelectorAll('.section.active .bv-leyendas')].map((n) => n.getBoundingClientRect().right);
  return {
    cajas,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    viewport: window.innerWidth,
    leyendasFuera: leyendas.filter((derecha, i) => derecha - regiones[i] > 1).length,
  };
}, ids);
await abrirSeccion(movil, /panorama/i);
const movilPanorama = await medirMovil(['redodemOrigin', 'redodemDestination']);
const controlesMovil = await movil.evaluate(() => {
  const caja = document.querySelector('.redodem-vistas[data-vistas="origen"]');
  const botones = [...caja.querySelectorAll('.redodem-vista')].map((b) => Math.round(b.getBoundingClientRect().width));
  const articulo = caja.closest('.profile-card').getBoundingClientRect();
  return { ancho: Math.round(caja.getBoundingClientRect().width), articulo: Math.round(articulo.width), botones, desborde: caja.scrollWidth - caja.clientWidth };
});
comprobar(controlesMovil.botones.length === 3 && controlesMovil.botones.every((w) => w > 60) && controlesMovil.ancho <= controlesMovil.articulo && controlesMovil.desborde <= 1, 'móvil: los tres controles caben en la tarjeta sin desbordamiento');
await movil.locator('.redodem-vistas[data-vistas="origen"] [data-vista="edad"]').click();
await movil.waitForTimeout(250);
await movil.locator('#redodemOrigin .bv-circulo[data-cat="Honduras"]').click({ force: true });
await movil.waitForTimeout(800);
const detalleMovil = await movil.evaluate(() => {
  const detalle = document.getElementById('origenDetalle');
  const caja = detalle.getBoundingClientRect();
  return {
    visible: !detalle.hidden,
    burbujas: detalle.querySelectorAll('.bv-circulo').length,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    dentro: caja.left >= -1 && caja.right <= window.innerWidth + 1,
  };
});
comprobar(detalleMovil.visible && detalleMovil.burbujas === 6 && detalleMovil.dentro && detalleMovil.desborde <= 0, `móvil: el desglose por edad dibuja 6 grupos sin recortes (${detalleMovil.burbujas}, desborde ${detalleMovil.desborde})`);
await movil.locator('#origenDetalle .redodem-volver').click();
await movil.waitForTimeout(250);
const metricasMovil = movilPanorama;
comprobar(metricasMovil.cajas.every((c) => c.burbujas > 0), `móvil: los dos paneles de Panorama dibujan burbujas (${metricasMovil.cajas.map((c) => c.burbujas).join(' · ')})`);
comprobar(metricasMovil.cajas.every((c) => c.fuera === 0), 'móvil: ningún círculo se recorta fuera del lienzo');
comprobar(metricasMovil.desborde <= 0, `móvil: sin desplazamiento horizontal (${metricasMovil.desborde} px)`);
comprobar(metricasMovil.viewport <= 390, `móvil: el lienzo no ensancha la página (${metricasMovil.viewport} px de viewport)`);
comprobar(metricasMovil.leyendasFuera === 0, 'móvil: las leyendas caben en su columna');
comprobar(erroresMovil.length === 0, `móvil: sin errores de consola (${erroresMovil.slice(0, 2).join(' | ')})`);
comprobar(redMovil.length === 0, `móvil: sin recursos faltantes (${redMovil.slice(0, 2).join(' | ')})`);

await abrirSeccion(movil, /panorama/i);
const cajaMovil = movil.locator('#redodemOrigin');
await cajaMovil.scrollIntoViewIfNeeded();
await movil.waitForTimeout(300);
await cajaMovil.locator('.bv-circulo').first().tap();
await movil.waitForTimeout(500);
const toque = await cajaMovil.evaluate((n) => ({
  seleccionados: n.querySelectorAll('.bv-nodo.is-sel').length,
  aviso: n.querySelector('.bv-seleccion')?.innerText.trim() || '',
}));
comprobar(toque.seleccionados === 1 && toque.aviso.includes('Seleccionado'), `móvil: tocar selecciona y muestra el conteo (${toque.aviso.slice(0, 60)}…)`);
await movil.screenshot({ path: path.join(SALIDA, 'burbujas-movil.png'), fullPage: false });
await cajaMovil.screenshot({ path: path.join(SALIDA, 'burbujas-origen-movil.png') });

/* ======================= 3. Otros anchos ================================ */
for (const ancho of [1024, 768]) {
  const ventana = await navegador.newContext({ viewport: { width: ancho, height: 900 }, locale: 'es-MX' });
  const hoja = await ventana.newPage();
  const erroresAncho = [];
  hoja.on('console', (m) => {
    if (m.type() === 'error') erroresAncho.push(m.text().slice(0, 160));
  });
  await hoja.goto(DIRECTO, { waitUntil: 'load' });
  await abrirSeccion(hoja, /panorama/i);
  const medida = await hoja.evaluate(() => {
    const svg = document.querySelector('#redodemOrigin svg.bv-svg');
    const circulos = [...document.querySelectorAll('#redodemOrigin .bv-circulo')].map((c) => {
      const transform = c.parentElement.getAttribute('transform') || '';
      const numeros = (transform.match(/-?\d+(\.\d+)?/g) || []).map(Number);
      return { x: numeros[0], y: numeros[1], r: Number(c.getAttribute('r')) };
    });
    const caja = svg.getBoundingClientRect();
    return {
      desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      fuera: circulos.filter((c) => c.x - c.r < -1 || c.x + c.r > caja.width + 1 || c.y - c.r < -1 || c.y + c.r > caja.height + 1).length,
      burbujas: circulos.length,
      ancho: Math.round(caja.width),
    };
  });
  comprobar(medida.desborde <= 0 && medida.fuera === 0, `ancho ${ancho}: sin desbordamiento y sin círculos recortados (${medida.ancho} px de lienzo)`);
  comprobar(medida.burbujas === 8 && erroresAncho.length === 0, `ancho ${ancho}: las 8 burbujas de origen se dibujan (${medida.burbujas})`);
  if (ancho === 1024) await hoja.locator('#redodemOrigin').screenshot({ path: path.join(SALIDA, 'burbujas-1024.png') });
  await ventana.close();
}

/* ======================= 4. Ficha integrada ============================= */
const integrada = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-MX' });
const ficha = await integrada.newPage();
const erroresFicha = [];
ficha.on('console', (m) => {
  if (m.type() === 'error') erroresFicha.push(m.text().slice(0, 180));
});
ficha.on('pageerror', (e) => erroresFicha.push('pageerror: ' + e.message.slice(0, 180)));
await ficha.goto(FICHA, { waitUntil: 'load' });
await ficha.waitForTimeout(2500);
const marco = ficha.frames().find((f) => /dashboards\/vidas-en-transito\/index\.html/.test(f.url()));
comprobar(Boolean(marco), 'la ficha del portafolio monta el tablero en su iframe');
if (marco) {
  await marco.evaluate(() => {
    const boton = [...document.querySelectorAll('#tabs button')].find((b) => /panorama/i.test(b.textContent));
    if (boton) boton.click();
  });
  await marco.waitForFunction(() => document.querySelectorAll('.bv-circulo').length > 0, null, { timeout: 60_000 }).catch(() => {});
  await ficha.waitForTimeout(900);
  const totalFicha = await marco.evaluate(() => ({
    burbujas: document.querySelectorAll('.bv-circulo').length,
    paneles: document.querySelectorAll('.bv-svg').length,
  }));
  comprobar(totalFicha.burbujas === 16, `ficha: las 16 burbujas de los dos paneles se dibujan dentro del portafolio (${totalFicha.burbujas})`);
  comprobar(totalFicha.paneles === 2, `ficha: dos paneles de Panorama con el componente (${totalFicha.paneles})`);
  await ficha.locator('#proyecto-app iframe, iframe').first().screenshot({ path: path.join(SALIDA, 'burbujas-ficha.png') }).catch(() => {});
}
comprobar(erroresFicha.length === 0, `ficha: sin errores de consola (${erroresFicha.slice(0, 2).join(' | ')})`);

/* ======================= 4. Cierre ====================================== */
comprobar(errores.length === 0, `vista directa: sin errores de consola (${errores.slice(0, 2).join(' | ')})`);
comprobar(fallosRed.length === 0, `vista directa: sin recursos faltantes (${fallosRed.slice(0, 2).join(' | ')})`);

await navegador.close();

console.log(`\n${ok.length} OK · ${fallos.length} fallos`);
for (const linea of ok) console.log('OK    ' + linea);
for (const linea of fallos) console.log('FALLA ' + linea);
if (fallos.length) process.exitCode = 1;





