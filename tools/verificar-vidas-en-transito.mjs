/**
 * Verifica la integración de «Vidas en tránsito» en el portafolio servido.
 *
 *   node tools/verificar-vidas-en-transito.mjs
 *
 * Comprueba: tarjeta en «Dashboards y visualización» con su etiqueta secundaria,
 * imagen 1600 × 1726 en la caja de Walmart M5, apertura de la ficha con el marco
 * (altura ≥ 85vh y ajustada al contenido), navegación interna del tablero, gráficos
 * y tablas, mapa de incidentes, regreso al área, ruta directa, ausencia de errores
 * de consola y 404, y comportamiento a 1440, 1024 y 390 px. Guarda capturas.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'vidas-en-transito');
const BASE = 'http://127.0.0.1:8000';
const URL_AREA = `${BASE}/#/area/dashboards`;
const URL_FICHA = `${BASE}/#/area/dashboards/vidas-en-transito`;
const URL_DIRECTA = `${BASE}/dashboards/vidas-en-transito/index.html`;
const DATOS = await (await fetch(`${BASE}/dashboards/vidas-en-transito/data.json`)).json();
const RD = DATOS.redodem;
const nf = new Intl.NumberFormat('es-MX');

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  await import(pathToFileURL(ruta).href);
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(SALIDA, { recursive: true });
const ok = [];
const fallos = [];
const errores = [];
const comprobar = (c, m) => (c ? ok : fallos).push(m);

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
pagina.on('pageerror', (e) => errores.push(`JS portafolio: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola portafolio: ${m.text()}`); });
const respuestas = [];
pagina.on('response', (r) => { if (r.status() >= 400) respuestas.push(`${r.status()} ${r.url()}`); });

/* ------------------------------------------------- 1. tarjeta en el área */
await pagina.goto(URL_AREA, { waitUntil: 'load' });
await pagina.waitForTimeout(1500);
const tarjeta = await pagina.evaluate(() => {
  const item = [...document.querySelectorAll('.project-list > li, .project-list article, li[data-categoria]')]
    .find((n) => /Vidas en tránsito/.test(n.textContent));
  if (!item) return null;
  const img = item.querySelector('img');
  const chip = item.querySelector('.card-meta .chip');
  return {
    titulo: (item.querySelector('h2, h3, .card-title') || {}).textContent?.trim() || '',
    categoria: (item.querySelector('.card-meta span') || {}).textContent?.trim() || '',
    estado: chip ? chip.textContent.trim() : '',
    resumen: (item.querySelector('.card-text') || {}).textContent?.trim() || '',
    imagen: img ? img.getAttribute('src') : '',
    natural: img ? [img.naturalWidth, img.naturalHeight] : null,
    caja: img ? (() => { const r = img.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() : null,
    proporcion: img ? getComputedStyle(img.parentElement).aspectRatio : '',
    ajuste: img ? getComputedStyle(img).objectFit : '',
    enlace: (item.querySelector('a') || {}).getAttribute?.('href') || '',
    totalTarjetas: document.querySelectorAll('.project-list > li, .project-list article').length,
  };
});
comprobar(!!tarjeta, 'la tarjeta aparece en «Dashboards y visualización»');
comprobar(/Vidas en tránsito/.test(tarjeta?.titulo || ''), `título de la tarjeta: ${tarjeta?.titulo}`);
comprobar(/Ciencia de datos · Observatorio humanitario/.test(tarjeta?.categoria || ''), `etiqueta secundaria: ${tarjeta?.categoria}`);
comprobar(/En desarrollo/i.test(tarjeta?.estado || ''), `estado local, no publicado: ${tarjeta?.estado}`);
comprobar(/vidas-en-transito-resumen/.test(tarjeta?.imagen || ''), `portada propia: ${tarjeta?.imagen}`);
comprobar(
  JSON.stringify(tarjeta?.natural) === JSON.stringify([1600, 1726]),
  `portada de 1600 × 1726 como Walmart M5 (${tarjeta?.natural?.join(' × ')})`,
);
comprobar(tarjeta?.ajuste === 'cover' && /1600/.test(tarjeta?.proporcion || ''), `la portada llena la caja (${tarjeta?.ajuste}, ratio ${tarjeta?.proporcion})`);
comprobar(/vidas-en-transito/.test(tarjeta?.enlace || ''), `destino de la tarjeta: ${tarjeta?.enlace}`);
comprobar(tarjeta?.totalTarjetas >= 5, `el área conserva sus demás tarjetas (${tarjeta?.totalTarjetas})`);
const nodoTarjeta = pagina.locator('.project-list > li, .project-list article').filter({ hasText: 'Vidas en tránsito' }).first();
await pagina.screenshot({ path: path.join(SALIDA, '01b-area-arriba.png'), animations: 'disabled' });
await nodoTarjeta.scrollIntoViewIfNeeded().catch(() => {});
await pagina.waitForTimeout(400);
await pagina.screenshot({ path: path.join(SALIDA, '01-area-dashboards.png'), animations: 'disabled' });
await nodoTarjeta.screenshot({ path: path.join(SALIDA, '02-tarjeta.png'), animations: 'disabled' }).catch(() => {});

/* ------------------------------------------------------- 2. ficha y marco */
await pagina.goto(URL_FICHA, { waitUntil: 'load' });
await pagina.waitForTimeout(3500);
const ficha = await pagina.evaluate(() => {
  const marco = document.querySelector('#demo-host iframe');
  const r = marco ? marco.getBoundingClientRect() : null;
  return {
    titulo: document.querySelector('#project-view-title')?.textContent.trim() || '',
    estado: document.querySelector('.view-chips .chip')?.textContent.trim() || '',
    marco: r ? { ancho: Math.round(r.width), alto: Math.round(r.height) } : null,
    tituloMarco: marco ? marco.getAttribute('title') : '',
    vh: Math.round(window.innerHeight * 0.85),
    nota: document.querySelector('.ficha-note')?.textContent.trim().slice(0, 80) || '',
  };
});
comprobar(/Vidas en tránsito/.test(ficha.titulo), `ficha abierta: ${ficha.titulo}`);
comprobar(ficha.marco && ficha.marco.ancho >= 900, `marco a ancho completo (${ficha.marco?.ancho} px)`);
comprobar(ficha.marco && ficha.marco.alto >= ficha.vh, `altura útil ≥ 85vh (${ficha.marco?.alto} px ≥ ${ficha.vh})`);
comprobar(!!ficha.tituloMarco && ficha.tituloMarco.length > 20, `marco con título accesible: ${ficha.tituloMarco}`);

/* ------------------------------------- 3. contenido del tablero en el marco */
const marco = pagina.frameLocator('#demo-host iframe');
const contenido = await marco.locator('body').evaluate((body) => ({
  alto: Math.round(document.documentElement.scrollHeight),
  tablas: document.querySelectorAll('table').length,
  svg: document.querySelectorAll('svg').length,
  botones: [...document.querySelectorAll('#tabs button')].map((b) => b.textContent.trim()),
  secciones: document.querySelectorAll('section').length,
  fuentes: body.innerText.replace(/\s+/g, ' ').slice(0, 160),
  texto: body.innerText.replace(/\s+/g, ' '),
  puntos: document.querySelectorAll('.icij-point').length,
  fechas: {
    enPanorama: Boolean(document.querySelector('#panorama #fechasRegistro')),
    enMetodo: Boolean(document.querySelector('#metodo #fechasRegistro')),
    plegado: document.querySelector('#metodo #fechasRegistro')?.open === false,
    etiqueta: document.querySelector('#metodo #fechasRegistro > summary')?.textContent.replace(/\s+/g, ' ').trim() || '',
    titulo: document.querySelector('#metodo #fechasRegistro .fechas-fold-title')?.textContent.trim() || '',
    pregunta: document.querySelector('#metodo #fechasRegistro .block-intro')?.textContent.replace(/\s+/g, ' ').trim() || '',
    calendarios: [...document.querySelectorAll('#metodo #calendarPanels .calendar-source')].map((n) => ({
      titulo: n.querySelector('h3')?.textContent.trim() || '',
      significado: n.querySelector('.calendar-date-meaning')?.textContent.replace(/\s+/g, ' ').trim() || '',
      meta: n.querySelector('.calendar-meta')?.textContent.replace(/\s+/g, ' ').trim() || '',
    })),
    restosPanorama: {
      fuentes: document.querySelectorAll('#panorama .calendar-source').length,
      celdas: document.querySelectorAll('#panorama .month-cell').length,
      paneles: document.querySelectorAll('#panorama #calendarPanels').length,
      titulo: /Fechas de registro en las fuentes/.test(document.querySelector('#panorama')?.innerText || ''),
    },
  },
  panorama: {
    route: Boolean(document.querySelector('#panorama .route-sequence')),
    metrics: Boolean(document.querySelector('#panorama #sourceMetrics')),
    coverage: Boolean(document.querySelector('#panorama #coverageRows')),
  },
  metodo: {
    route: Boolean(document.querySelector('#metodo .route-sequence')),
    metrics: Boolean(document.querySelector('#metodo #sourceMetrics')),
    coverage: Boolean(document.querySelector('#metodo #coverageRows')),
    metricas: document.querySelector('#metodo #sourceMetrics')?.innerText.replace(/\s+/g, ' ') || '',
    detalle: document.querySelector('#metodo #sourceFileDetails')?.innerText.replace(/\s+/g, ' ') || '',
  },
  muerte: {
    nota: document.querySelector('#muertes .view-title .editorial-note')?.textContent.replace(/\s+/g, ' ').trim() || '',
    fechaNota: document.querySelector('#hxFechaNota')?.textContent.replace(/\s+/g, ' ').trim() || '',
    volumen: document.querySelectorAll('#muertes .year-panels .year-panel').length,
    analisis: document.querySelectorAll('#deathSourceDetails .grid-two .year-panel').length,
  },
  perfil: {
    titulo: document.querySelector('#redodemSummary .scope-title')?.textContent.trim() || '',
    resumen: document.querySelector('#redodemSummary')?.innerText.replace(/\s+/g, ' ').trim() || '',
    total: document.querySelector('#redodemSummary .scope-title')?.textContent.trim() || '',
    orden: (() => {
      const perfil = document.querySelector('#panorama .profile-section');
      const mapa = document.querySelector('#panorama .hero-card');
      return Boolean(perfil && mapa && (mapa.compareDocumentPosition(perfil) & Node.DOCUMENT_POSITION_FOLLOWING));
    })(),
    primerBloque: document.querySelector('#panorama')?.firstElementChild?.id || '',
    notaDespuesMapa: (() => {
      const mapa = document.querySelector('#panorama .hero-card')?.getBoundingClientRect();
      const nota = document.querySelector('#panorama .profile-cannot')?.getBoundingClientRect();
      return Boolean(mapa && nota && nota.top >= mapa.bottom - 1);
    })(),
    origen: {
      titulo: document.querySelectorAll('#panorama .profile-card h2')[1]?.textContent.trim() || '',
      svg: document.querySelectorAll('#redodemOrigin .bv-svg').length,
      tabla: document.querySelectorAll('#redodemOrigin table').length,
      texto: document.querySelector('#redodemOrigin')?.innerText.replace(/\s+/g, ' ') || '',
      nota: document.querySelector('#origenFaltante')?.textContent.trim() || '',
      notaCompleta: document.querySelectorAll('#panorama .profile-card .unit-note')[1]?.textContent.replace(/\s+/g, ' ').trim() || '',
    },
    edad: {
      titulo: document.querySelector('#panorama .profile-card h2')?.textContent.trim() || '',
      celdas: document.querySelectorAll('#redodemAgeGender .heat-cell:not(.heat-cell--total)').length,
      tabla: document.querySelectorAll('#redodemAgeGender table').length,
      notaCompleta: document.querySelectorAll('#panorama .profile-card .unit-note')[0]?.textContent.replace(/\s+/g, ' ').trim() || '',
    },
    destino: {
      titulo: document.querySelectorAll('#panorama .profile-card h2')[2]?.textContent.trim() || '',
      svg: document.querySelectorAll('#redodemDestination .bv-svg').length,
      tabla: document.querySelectorAll('#redodemDestination table').length,
      texto: document.querySelector('#redodemDestination')?.innerText.replace(/\s+/g, ' ') || '',
      nota: document.querySelector('#destinoFaltante')?.textContent.trim() || '',
      notaCompleta: document.querySelectorAll('#panorama .profile-card .unit-note')[2]?.textContent.replace(/\s+/g, ' ').trim() || '',
    },
    noCruce: document.querySelector('#panorama .profile-cannot')?.textContent.replace(/\s+/g, ' ').trim() || '',
    graficas: [...document.querySelectorAll('#panorama .profile-card h2')].map((n) => n.textContent.trim()),
    contexto: {
      origen: Boolean(document.querySelector('#contexto #redodemOrigin')),
      edad: Boolean(document.querySelector('#contexto #redodemAgeGender')),
      destino: Boolean(document.querySelector('#contexto #redodemDestination')),
      cobertura: Boolean(document.querySelector('#contexto #redodemViolenceCoverage')),
    },
    metodo: {
      cobertura: Boolean(document.querySelector('#metodo #redodemViolenceCoverage')),
    },
  },
}));
comprobar(contenido.tablas >= 20, `el tablero carga su bloque ampliado (${contenido.tablas} tablas)`);
comprobar(contenido.botones.length === 6, `seis vistas internas (${contenido.botones.length})`);
const tabsInfo = await marco.locator('body').evaluate(() => {
  const tabs = document.getElementById('tabs');
  const cs = getComputedStyle(tabs);
  const activo = tabs.querySelector('.wm-tab.is-activa');
  const indicador = tabs.querySelector('.wm-tabs-indicador');
  const iconos = tabs.querySelectorAll('.wm-tab svg').length;
  return {
    clase: tabs.className,
    display: cs.display,
    radio: cs.borderRadius,
    fondo: cs.backgroundColor,
    iconos,
    etiquetas: [...tabs.querySelectorAll('.wm-tab')].map((b) => b.textContent.trim()),
    activo: activo ? activo.textContent.trim() : '',
    activoColor: activo ? getComputedStyle(activo).color : '',
    activoSel: activo ? activo.getAttribute('aria-selected') : '',
    indicadorFondo: indicador ? getComputedStyle(indicador).backgroundColor : '',
    indicadorAncho: indicador ? Math.round(indicador.getBoundingClientRect().width) : 0,
    activoAncho: activo ? Math.round(activo.getBoundingClientRect().width) : 0,
  };
});
comprobar(/wm-tabs/.test(tabsInfo.clase) && /wm-tabs--atlas/.test(tabsInfo.clase) && tabsInfo.display === 'flex' && tabsInfo.radio === '999px', `tabs con el contenedor píldora del Atlas (${tabsInfo.display}, ${tabsInfo.radio})`);
comprobar(tabsInfo.iconos === 6, `seis iconos en las pestañas (${tabsInfo.iconos})`);
comprobar(tabsInfo.etiquetas.every((t) => t && !/^\d/.test(t)), `etiquetas sin prefijos numéricos (${tabsInfo.etiquetas.join(' · ')})`);
comprobar(tabsInfo.activo === 'Panorama' && tabsInfo.activoColor === 'rgb(255, 255, 255)' && tabsInfo.activoSel === 'true', `pestaña activa en blanco sobre la cápsula («${tabsInfo.activo}», ${tabsInfo.activoColor})`);
comprobar(tabsInfo.indicadorFondo === 'rgb(55, 65, 81)' && Math.abs(tabsInfo.indicadorAncho - tabsInfo.activoAncho) <= 1, `cápsula del Atlas alineada con la pestaña activa (${tabsInfo.indicadorAncho}px)`);

comprobar(contenido.svg >= 2, `gráficos dibujados (${contenido.svg} svg)`);
comprobar(contenido.puntos === 148, `mapa de incidentes con 148 puntos (${contenido.puntos})`);
comprobar(!contenido.fechas.enPanorama && contenido.fechas.enMetodo && contenido.fechas.plegado, 'los calendarios viven solo en Fuentes y método, dentro de un bloque plegable cerrado');
comprobar(contenido.fechas.titulo === 'Fechas de registro de MMP y El Paso' && /Fechas de registro de MMP y El Paso/.test(contenido.fechas.etiqueta), `el bloque plegable se llama «${contenido.fechas.titulo}»`);
comprobar(/Pregunta editorial/.test(contenido.fechas.pregunta) && /reported_date/.test(contenido.fechas.pregunta) && /Pronouncement Date/.test(contenido.fechas.pregunta) && /no una cronología de muertes/.test(contenido.fechas.pregunta), 'el bloque declara pregunta editorial y las dos semánticas de fecha');
comprobar(contenido.fechas.calendarios.length === 2 && contenido.fechas.calendarios[0].titulo.includes('reported_date') && contenido.fechas.calendarios[1].titulo.includes('Pronouncement Date'), 'cada calendario etiqueta su campo temporal exacto');
comprobar(contenido.fechas.calendarios.every((c) => /No es una fecha de muerte/.test(c.significado) && /escala independiente/.test(c.meta)), 'los calendarios separan escalas y advierten que no son fechas de muerte');
comprobar(contenido.fechas.restosPanorama.fuentes === 0 && contenido.fechas.restosPanorama.celdas === 0 && contenido.fechas.restosPanorama.paneles === 0 && !contenido.fechas.restosPanorama.titulo, 'Panorama no conserva calendarios, celdas, paneles ni el título de fechas');
comprobar(!/Calendario de evidencia|Cuándo aparecen los registros/.test(contenido.texto), 'se retiró el rótulo que presentaba la sección como cronología');
comprobar(!contenido.panorama.route && !contenido.panorama.metrics && !contenido.panorama.coverage && contenido.metodo.route && contenido.metodo.metrics && contenido.metodo.coverage, 'contexto, volumen y cobertura viven en Fuentes y método, no en Panorama');
comprobar(/Archivos de registros/.test(contenido.metodo.metricas) && /Agregados EAAF · otra unidad/.test(contenido.metodo.metricas) && /no familias, perfiles ni personas identificadas/.test(contenido.metodo.metricas), 'los volúmenes separan filas de archivo y casos EAAF');
comprobar(/23,826 filas/.test(contenido.metodo.detalle) && /793 filas/.test(contenido.metodo.detalle) && /reported_date/.test(contenido.metodo.detalle) && /Pronouncement Date/.test(contenido.metodo.detalle), 'el detalle de archivos declara volumen y campo temporal de cada fuente');
comprobar(contenido.muerte.volumen === 0 && contenido.muerte.analisis >= 2, 'la vista Muertes conserva análisis de víctimas y ya no muestra tarjetas de volumen de archivo');
comprobar(/no dibuja una tendencia de muertes ocurridas/.test(contenido.muerte.nota) && /fecha de fallecimiento comparable/.test(contenido.muerte.nota) && /no son una serie de muertes ocurridas/.test(contenido.muerte.fechaNota), 'Muertes declara que no hay fecha de fallecimiento comparable ni tendencia inventada');
const totalRD = nf.format(RD.total_source_rows);
comprobar(/Base analizada: 40,800 registros REDODEM · 2023–2024/.test(contenido.perfil.titulo) && contenido.perfil.total.includes(totalRD), `la nota de alcance declara ${totalRD} registros y el periodo`);
comprobar(contenido.perfil.orden && contenido.perfil.primerBloque === 'geoCard' && contenido.perfil.notaDespuesMapa && /2023–2024/.test(contenido.perfil.resumen) && /filas de atención\/observación/i.test(contenido.perfil.resumen) && /no representan necesariamente personas distintas/.test(contenido.perfil.resumen), 'el mapa abre Panorama; perfiles y nota de alcance quedan después, con periodo y unidad');
comprobar(/no es un censo/i.test(contenido.perfil.resumen) && /no verifica el cruce/.test(contenido.perfil.resumen) && !/Total de migrantes/i.test(contenido.perfil.resumen), 'la nota de alcance evita el total de migrantes y el cruce verificado');
comprobar(contenido.perfil.origen.titulo === 'País registrado en el campo de nacimiento' && contenido.perfil.origen.svg === 1 && contenido.perfil.origen.tabla === 1 && /No especificado/.test(contenido.perfil.origen.texto), `país de nacimiento con gráfica y tabla (${contenido.perfil.origen.svg} svg)`);
comprobar(/no una nacionalidad verificada/i.test(contenido.perfil.origen.notaCompleta) && contenido.perfil.origen.notaCompleta.includes(nf.format(RD.field_summaries.pais_de_nacimiento.categories['No especificado'])), 'país de nacimiento informa «No especificado» y no lo llama nacionalidad');
comprobar(contenido.perfil.edad.titulo === 'Adultos y adultos jóvenes concentran el 74,5 % de los registros.' && contenido.perfil.edad.celdas === 24 && contenido.perfil.edad.tabla === 1, `edad y sexo con matriz completa y tabla (${contenido.perfil.edad.celdas} celdas)`);
comprobar(contenido.perfil.edad.notaCompleta.includes(nf.format(RD.field_summaries.genero.not_specified)) && /No especificado/.test(contenido.perfil.edad.notaCompleta), 'edad y sexo declara el faltante de género y su denominador');
comprobar(contenido.perfil.destino.titulo === 'Destino capturado en el registro' && contenido.perfil.destino.svg === 1 && contenido.perfil.destino.tabla === 1 && /\bNA\b/.test(contenido.perfil.destino.texto), `destino capturado con gráfica, tabla y NA visible (${contenido.perfil.destino.svg} svg)`);
comprobar(/No confirma cruce fronterizo, destino final ni permanencia en México/i.test(contenido.perfil.destino.notaCompleta) && contenido.perfil.destino.notaCompleta.includes(nf.format(RD.field_summaries.pais_destino.literal_na)), 'destino declara NA y no afirma cruce, destino final ni permanencia');
comprobar(/cuántas cruzaron a Estados Unidos o cuántas se quedaron en México/.test(contenido.perfil.noCruce) && /no se dibuja una gráfica de resultados de cruce/.test(contenido.perfil.noCruce), 'Panorama explicita la pregunta de cruce que no puede responderse');
comprobar(contenido.perfil.graficas.every((t) => !/cruce|permanenc/i.test(t)), `ninguna gráfica de Panorama presenta resultados de cruce (${contenido.perfil.graficas.join(' · ')})`);
comprobar(!contenido.perfil.contexto.origen && !contenido.perfil.contexto.edad && !contenido.perfil.contexto.destino && !contenido.perfil.contexto.cobertura && contenido.perfil.metodo.cobertura, 'los perfiles se movieron a Panorama y la cobertura de campos a Fuentes y método');
comprobar(/Vidas en tránsito/.test(contenido.fuentes), `contenido del tablero: ${contenido.fuentes.slice(0, 80)}`);
await pagina.screenshot({ path: path.join(SALIDA, '03-ficha-dashboard.png'), animations: 'disabled' });

// navegación interna: cada vista se abre y tiene contenido propio
const vistas = [];
for (const nombre of contenido.botones) {
  await marco.locator('#tabs button', { hasText: nombre }).first().click();
  await pagina.waitForTimeout(450);
  const estado = await marco.locator('body').evaluate((body, etiqueta) => {
    const activa = document.querySelector('section.active');
    const marcada = document.querySelector('#tabs [aria-current="page"]');
    return {
      etiqueta,
      activo: marcada ? marcada.textContent.trim() : '',
      seccion: activa ? activa.id : '',
      largo: activa ? activa.innerText.trim().length : 0,
      tablas: activa ? activa.querySelectorAll('table').length : 0,
    };
  }, nombre);
  vistas.push(estado);
}
comprobar(vistas.every((v) => v.largo > 300), `las seis vistas internas muestran contenido (${vistas.map((v) => v.seccion).join(' · ')})`);
comprobar(vistas.every((v) => v.activo === v.etiqueta), 'al abrir cada vista su pestaña queda marcada con aria-current');

// las fechas se despliegan en Fuentes y método, no en Panorama
const plegableFechas = marco.locator('#metodo #fechasRegistro');
const fechasAntes = await plegableFechas.evaluate((el) => el.open);
await marco.locator('#metodo #fechasRegistro > summary').click();
await pagina.waitForTimeout(350);
const fechasAbiertas = await plegableFechas.evaluate((el) => ({
  open: el.open,
  visible: Boolean(el.querySelector('#calendarPanels .calendar-grid')?.getClientRects().length),
  fuentes: el.querySelectorAll('.calendar-source').length,
  celdas: el.querySelectorAll('.month-cell').length,
}));
comprobar(!fechasAntes && fechasAbiertas.open && fechasAbiertas.visible && fechasAbiertas.fuentes === 2 && fechasAbiertas.celdas > 0, `el bloque plegable abre sus dos calendarios en Fuentes y método (${fechasAbiertas.celdas} celdas)`);
const detalleMesAntes = await plegableFechas.locator('.calendar-detail').first().innerText();
await plegableFechas.locator('.month-cell.has-record').first().click();
await pagina.waitForTimeout(250);
const detalleMes = await plegableFechas.locator('.calendar-detail').first().innerText();
comprobar(detalleMes !== detalleMesAntes && /filas/.test(detalleMes), `el calendario de Fuentes y método responde al seleccionar un mes (${detalleMes.replace(/\s+/g, ' ').slice(0, 60)})`);

// mapa de incidentes: un punto se puede seleccionar
await marco.locator('#tabs button', { hasText: 'Riesgo y respuesta' }).first().click();
await pagina.waitForTimeout(600);
const punto = await marco.locator('.icij-point').first();
if (await punto.count()) {
  await punto.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await pagina.waitForTimeout(400);
  const detalle = await marco.locator('#icijSelected').innerText().catch(() => '');
  comprobar(/precisión|Migrantes|Muertes/i.test(detalle), `el mapa de incidentes selecciona un punto (${detalle.replace(/\s+/g, ' ').slice(0, 70)})`);
} else {
  fallos.push('no se encontraron puntos del mapa de incidentes');
}
await marco.locator('#tabs button', { hasText: 'Panorama' }).first().click();
await pagina.waitForTimeout(600);
await pagina.locator('#demo-host').screenshot({ path: path.join(SALIDA, '04-dashboard-top.png'), animations: 'disabled' }).catch(() => {});
await marco.locator('#tabs button', { hasText: 'Riesgo y respuesta' }).first().click();
await pagina.waitForTimeout(700);
const mapa = marco.locator('.event-map-wrap').first();
if (await mapa.count()) {
  /* El marco crece con el contenido: hay que desplazar la página del portafolio
     hasta la posición absoluta del elemento dentro del marco. */
  await pagina.evaluate((selector) => {
    const m = document.querySelector('#demo-host iframe');
    const doc = m && m.contentDocument;
    const el = doc && doc.querySelector(selector);
    if (!el) return;
    let y = 0;
    let n = el;
    while (n && n !== doc.body) {
      y += n.offsetTop;
      n = n.offsetParent;
    }
    window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY + y - 90);
  }, '.event-map-wrap');
  await pagina.waitForTimeout(700);
  await pagina.screenshot({ path: path.join(SALIDA, '05-mapa-incidentes.png'), animations: 'disabled' });
  await marco.locator('#icijSelected').first().evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
  await pagina.waitForTimeout(400);
  await pagina.screenshot({ path: path.join(SALIDA, '05b-detalle-incidente.png'), animations: 'disabled' });
} else {
  fallos.push('no se encontró el mapa de incidentes');
}

// ajuste de altura al contenido
const ajuste = await pagina.evaluate(() => {
  const m = document.querySelector('#demo-host iframe');
  const doc = m && m.contentDocument;
  return {
    marco: m ? Math.round(m.getBoundingClientRect().height) : 0,
    contenido: doc ? Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight) : 0,
    seccion: doc ? (doc.querySelector('section.active') || {}).id : '',
    vh: Math.round(window.innerHeight * 0.85),
  };
});
comprobar(Math.abs(ajuste.marco - ajuste.contenido) <= 40, `el marco se ajusta al contenido en la vista activa «${ajuste.seccion}» (${ajuste.marco} ≈ ${ajuste.contenido} px)`);
comprobar(ajuste.marco >= ajuste.vh, `la altura útil sigue siendo ≥ 85vh (${ajuste.marco} ≥ ${ajuste.vh})`);

/* --------------------------------------- 4. regreso al área y ruta directa */
await pagina.locator('.view-back').first().click();
await pagina.waitForTimeout(900);
comprobar(/dashboards/.test(pagina.url()), `«Volver» regresa al área (${pagina.url().split('#')[1]})`);

await pagina.goto(URL_DIRECTA, { waitUntil: 'load' });
await pagina.waitForTimeout(2500);
const directa = await pagina.evaluate(() => ({
  titulo: document.title,
  tablas: document.querySelectorAll('table').length,
  h1: (document.querySelector('h1') || {}).textContent?.trim() || '',
}));
comprobar(/Vidas en tránsito/.test(directa.titulo), `ruta directa sirve el tablero: ${directa.titulo}`);
comprobar(directa.tablas >= 20, `ruta directa con datos cargados (${directa.tablas} tablas)`);

/* --------------------------------------------------- 5. otros tamaños */
for (const ancho of [1024, 390]) {
  const p2 = await navegador.newPage({ viewport: { width: ancho, height: ancho === 390 ? 844 : 900 }, hasTouch: ancho === 390, isMobile: ancho === 390 });
  p2.on('pageerror', (e) => errores.push(`${ancho}px JS: ${e.message}`));
  p2.on('console', (m) => { if (m.type() === 'error') errores.push(`${ancho}px consola: ${m.text()}`); });
  await p2.goto(URL_FICHA, { waitUntil: 'load' });
  await p2.waitForTimeout(3200);
  const datos = await p2.evaluate(() => {
    const m = document.querySelector('#demo-host iframe');
    return {
      desborde: document.documentElement.scrollWidth - window.innerWidth,
      marco: m ? { ancho: Math.round(m.getBoundingClientRect().width), alto: Math.round(m.getBoundingClientRect().height) } : null,
      vh: Math.round(window.innerHeight * 0.85),
    };
  });
  comprobar(datos.desborde <= 0, `${ancho}px: sin desbordamiento de página (${datos.desborde})`);
  comprobar(datos.marco && datos.marco.ancho >= ancho * 0.6, `${ancho}px: marco utilizable (${datos.marco?.ancho} px)`);
  comprobar(datos.marco && datos.marco.alto >= datos.vh, `${ancho}px: altura ≥ 85vh (${datos.marco?.alto} ≥ ${datos.vh})`);
  await p2.screenshot({ path: path.join(SALIDA, `06-ficha-${ancho}.png`), animations: 'disabled' });
  await p2.close();
}

await navegador.close();

comprobar(respuestas.length === 0, `sin respuestas 4xx/5xx (${respuestas.slice(0, 3).join(' · ') || 'ninguna'})`);
console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores de consola:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;







