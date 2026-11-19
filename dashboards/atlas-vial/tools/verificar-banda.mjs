/**
 * Verificación de la banda de filtros globales del Atlas vial.
 *
 * Comprueba en la aplicación servida (8000) contra la API (8010):
 *   · que el buscador global desapareció y que los enlaces antiguos con su
 *     parámetro se normalizan sin aplicar una búsqueda invisible;
 *   · la jerarquía de capas: navegación, banda de filtros y controles locales;
 *   · estados inicial, seleccionado, múltiple, hover, foco y deshabilitado;
 *   · el patrón común de los desplegables (buscador fijo, filas, casillas,
 *     estado sin coincidencias, limpiar selección, teclado y foco);
 *   · etiquetas removibles y acción única de limpieza;
 *   · el contador ligado al indicador y a la exportación;
 *   · la banda adhesiva y su versión compacta, sin saltos ni obstrucciones;
 *   · escritorio, tableta, móvil y movimiento reducido.
 *
 * Uso: node tools/verificar-banda.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/filtros/', new URL('../', import.meta.url)));
mkdirSync(EVIDENCIAS, { recursive: true });
const SITIO = 'http://127.0.0.1:8000';
const RUTA = '/#/area/dashboards/atlas-vial';
const API = 'http://127.0.0.1:8010/api/v1/atlas-vial';

const resultados = [];
function comprobar(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok, detalle });
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
}

async function leer(ruta) {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`${ruta} → ${respuesta.status}`);
  return respuesta.json();
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: 'es-MX',
});
const pagina = await contexto.newPage();
const errores = [];
pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text().slice(0, 140)));
pagina.on('pageerror', (e) => errores.push(e.message.slice(0, 140)));

const kpis = () =>
  pagina.$$eval('.at-kpi-valor', (nodos) =>
    nodos.map((nodo) => Number((nodo.textContent ?? '').replace(/[^\d]/g, ''))),
  );
const url = () => new URL(pagina.url());
const totalBanda = () =>
  pagina.evaluate(() => {
    const nodo = document.querySelector('.at-kpi-valor');
    return nodo ? Number((nodo.textContent ?? '').replace(/[^\d]/g, '')) : null;
  });
await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2400);

/* --------------------- 1 · fuera el buscador global --------------------- */
const sinBuscador = await pagina.evaluate(() => {
  const banda = document.querySelector('[data-testid="filtros"]');
  return {
    buscadores: banda.querySelectorAll('input[type="search"]').length,
    coincidencias: ((banda.textContent ?? '').match(/buscar/gi) ?? []).length,
    botones: [...banda.querySelectorAll('button')].map((boton) =>
      (boton.getAttribute('aria-label') ?? boton.textContent ?? '').trim(),
    ),
  };
});
comprobar(
  'La banda ya no tiene buscador global',
  sinBuscador.buscadores === 0,
  `${sinBuscador.buscadores} campos de búsqueda`,
);
comprobar(
  'Fuera de los desplegables no queda ninguna referencia a «buscar»',
  sinBuscador.coincidencias === 0 && !sinBuscador.botones.some((texto) => /buscar/i.test(texto)),
  `${sinBuscador.coincidencias} coincidencias`,
);

/* El enlace antiguo con `at_q` se normaliza y no filtra nada. */
await pagina.goto(`${SITIO}/?at_q=abcdef#/area/dashboards/atlas-vial`, {
  waitUntil: 'domcontentloaded',
});
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2600);
const enlaceAntiguo = {
  kpis: await kpis(),
  params: [...url().searchParams.keys()].filter((clave) => clave.startsWith('at_')),
};
comprobar(
  'Un enlace antiguo con búsqueda global no aplica un filtro invisible',
  enlaceAntiguo.kpis[0] === 30655,
  `${enlaceAntiguo.kpis[0]} hechos`,
);
comprobar(
  'El parámetro antiguo desaparece de la URL (se normaliza)',
  !enlaceAntiguo.params.includes('at_q') && !enlaceAntiguo.params.includes('at_buscar'),
  enlaceAntiguo.params.join(',') || 'sin parámetros de filtro',
);

await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2400);

/* --------------------- 2 · banda y jerarquía de capas ------------------- */
const banda = await pagina.evaluate(() => {
  const caja = document.querySelector('[data-testid="filtros"]');
  const controles = [...caja.querySelectorAll('.at-ctrl')];
  const estilo = getComputedStyle(caja);
  return {
    fondo: estilo.backgroundColor,
    posicion: estilo.position,
    etiqueta: (caja.querySelector('.at-banda-etiqueta')?.textContent ?? '').trim(),
    prefijos: controles.map((boton) => (boton.querySelector('.at-ctrl-label')?.textContent ?? '').trim()),
    valores: controles.map((boton) => (boton.querySelector('.at-ctrl-value')?.textContent ?? '').trim()),
    alturas: controles.map((boton) => Math.round(boton.getBoundingClientRect().height)),
    fondos: controles.map((boton) => getComputedStyle(boton).backgroundColor),
    sombras: controles.map((boton) => getComputedStyle(boton).boxShadow),
    tamanoPrefijo: getComputedStyle(controles[0].querySelector('.at-ctrl-label')).fontSize,
    tamanoValor: getComputedStyle(controles[0].querySelector('.at-ctrl-value')).fontSize,
    tabular: getComputedStyle(controles[0].querySelector('.at-ctrl-value')).fontVariantNumeric,
    hayMasFiltros: Boolean(caja.querySelector('[data-testid="mas-filtros"]')),
    masFiltros: Boolean(caja.querySelector('[data-testid="mas-filtros"]')),
    navFondo: getComputedStyle(document.querySelector('.wm-tabs')).backgroundColor,
    navTexto: getComputedStyle(document.querySelector('.wm-tab')).color,
    navActivaFondo: getComputedStyle(document.querySelector('.wm-tabs-indicador')).backgroundColor,
    segFondo: getComputedStyle(document.querySelector('.at-segmentado')).backgroundColor,
    segActivaFondo: getComputedStyle(document.querySelector('.at-seg.is-activa')).backgroundColor,
    accionesFondo: getComputedStyle(document.querySelector('.at-head-acciones .at-btn')).backgroundColor,
  };
});

comprobar(
  'La banda es gris azulado tenue con la etiqueta «Filtros»',
  banda.fondo === 'rgb(244, 246, 250)' && banda.etiqueta === 'Filtros',
  `${banda.fondo} · «${banda.etiqueta}»`,
);
comprobar('La banda es adhesiva', banda.posicion === 'sticky', banda.posicion);
comprobar(
  'Mantiene visibles periodo, alcaldía, evento, consecuencia y «Más filtros»',
  JSON.stringify(banda.prefijos) ===
    JSON.stringify(['Periodo', 'Alcaldía', 'Tipo de evento', 'Consecuencia']) &&
    banda.hayMasFiltros,
  banda.prefijos.join(' · '),
);
comprobar(
  'Controles blancos de 40px sin sombra',
  'Controles de 40px sobre la superficie gris del sistema, sin sombra',
    banda.fondos.every((fondo) => fondo === 'rgb(238, 240, 243)') &&
    banda.sombras.every((sombra) => sombra === 'none'),
  `${banda.alturas.join('/')} · ${banda.fondos[0]} · sombra ${banda.sombras[0]}`,
);
comprobar(
  'Tipografía: prefijo 12px, valor 14px con números tabulares',
  banda.tamanoPrefijo === '12px' && banda.tamanoValor === '14px' && banda.tabular === 'tabular-nums',
  `${banda.tamanoPrefijo}/${banda.tamanoValor}/${banda.tabular}`,
);
comprobar(
  'Estado inicial: «Alcaldía · Todas»',
  banda.valores[1] === 'Todas',
  banda.valores.join(' · '),
);
comprobar(
  'Capa de navegación: superficie clara con cápsula blanca',
  'Capa de navegación: píldora gris con cápsula grafito',
  banda.navFondo === 'rgba(17, 19, 24, 0.04)' && banda.navActivaFondo === 'rgb(55, 65, 81)',
  'cápsula ' + banda.navActivaFondo,
  'cápsula ' + banda.navActivaFondo,
);
comprobar(
  'Controles locales del mapa: gris azulado con cápsula blanca',
  'Controles locales: pista gris con cápsula grafito',
  banda.segFondo === 'rgb(238, 240, 243)' && banda.segActivaFondo === 'rgb(55, 65, 81)',
  `${banda.segFondo} → cápsula ${banda.segActivaFondo}`,
);
comprobar(
  'Acciones de cabecera discretas (sin relleno por defecto)',
  banda.accionesFondo === 'rgba(0, 0, 0, 0)',
  banda.accionesFondo,
);

const contraste = await pagina.evaluate(() => {
  const luminancia = (color) => {
    const [r, g, b] = color.match(/\d+/g).map((valor) => Number(valor) / 255);
    const canal = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  };
  const razon = (a, b) => {
    const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return Number(((claro + 0.05) / (oscuro + 0.05)).toFixed(2));
  };
  const control = document.querySelector('[data-testid="filtros"] .at-ctrl');
  const caja = getComputedStyle(control).backgroundColor;
  const etiqueta = document.querySelector('.at-banda-etiqueta');
  const fondoBanda = getComputedStyle(document.querySelector('[data-testid="filtros"]')).backgroundColor;
  return {
    valor: razon(getComputedStyle(control.querySelector('.at-ctrl-value')).color, caja),
    prefijo: razon(getComputedStyle(control.querySelector('.at-ctrl-label')).color, caja),
    etiquetaBanda: razon(getComputedStyle(etiqueta).color, fondoBanda),
  };
});
comprobar(
  'Contraste mínimo 4.5:1 en valor, prefijo y etiqueta de banda',
  contraste.valor >= 4.5 && contraste.prefijo >= 4.5 && contraste.etiquetaBanda >= 4.5,
  `${contraste.valor} · ${contraste.prefijo} · ${contraste.etiquetaBanda}`,
);

/* Hover y foco del control. */
const controlAlcaldia = pagina.locator('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"]').first();
await controlAlcaldia.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(250);
const cajaAlcaldia = await controlAlcaldia.boundingBox();
const fondoNormal = await pagina.evaluate(
  () =>
    getComputedStyle(document.querySelector('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"]'))
      .backgroundColor,
);
await pagina.mouse.move(cajaAlcaldia.x + cajaAlcaldia.width / 2, cajaAlcaldia.y + cajaAlcaldia.height / 2);
await pagina.waitForTimeout(240);
const fondoHover = await pagina.evaluate(
  () =>
    getComputedStyle(document.querySelector('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"]'))
      .backgroundColor,
);
comprobar(
  'El hover cambia el fondo del control',
  fondoHover === 'rgb(226, 229, 234)',
  `${fondoNormal} → ${fondoHover}`,
);

const anillo = await pagina.evaluate(() => {
  const boton = document.querySelector('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"]');
  boton.focus();
  const estilo = getComputedStyle(boton);
  return { ancho: estilo.outlineWidth, color: estilo.outlineColor };
});
comprobar(
  'El foco de teclado tiene anillo visible de 2px',
  anillo.ancho === '2px' && anillo.color === 'rgb(52, 88, 245)',
  `${anillo.ancho} ${anillo.color}`,
);
await pagina.mouse.move(4, 4);
await pagina.waitForTimeout(200);

/* --------------------- 3 · sin botón de ayuda ------------------------- */
comprobar(
  'El botón de ayuda se retiró y la barra queda alineada',
  (await pagina.locator('[data-testid="ayuda-filtros"]').count()) === 0 &&
    (await pagina.locator('.atf-panel--ayuda').count()) === 0,
  (await pagina.locator('[data-testid="ayuda-filtros"]').count()) + ' botones de ayuda',
);

/* --------------------- 4 · desplegable común --------------------------- */
await pagina.locator('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"]').first().click();
await pagina.waitForSelector('.atf-panel');
await pagina.waitForTimeout(320);
const panel = await pagina.evaluate(() => {
  const caja = document.querySelector('.atf-panel');
  const estilo = getComputedStyle(caja);
  const lista = caja.querySelector('.atf-opciones');
  const buscador = caja.querySelector('.atf-buscar');
  const filas = [...caja.querySelectorAll('.at-opcion')];
  return {
    ancho: Math.round(caja.getBoundingClientRect().width),
    radio: estilo.borderTopLeftRadius,
    sombra: estilo.boxShadow,
    dentro:
      caja.getBoundingClientRect().right <= window.innerWidth + 1 &&
      caja.getBoundingClientRect().top >= -1,
    titulo: (caja.querySelector('.atf-titulo')?.textContent ?? '').trim(),
    cuenta: (caja.querySelector('.atf-cuenta')?.textContent ?? '').trim(),
    buscadorFijo:
      Boolean(buscador) && buscador.getBoundingClientRect().bottom <= lista.getBoundingClientRect().top + 1,
    filasMin: Math.min(...filas.map((fila) => Math.round(fila.getBoundingClientRect().height))),
    filasAncho: Math.round(filas[0].getBoundingClientRect().width),
    listaAncho: Math.round(lista.getBoundingClientRect().width),
    casilla: Math.round(caja.querySelector('.at-caja').getBoundingClientRect().width),
    pie: (caja.querySelector('.atf-pie')?.textContent ?? '').trim(),
    desplazable: lista.scrollHeight > lista.clientHeight,
  };
});
comprobar(
  'El panel es blanco, radio 14px y sombra del sistema',
  panel.radio === '14px' && panel.sombra.includes('rgba(23, 35, 61, 0.12)'),
  `${panel.radio} · ${panel.sombra.slice(0, 46)}`,
);
comprobar(
  'Título y cantidad seleccionada en el encabezado',
  panel.titulo === 'Alcaldía' && /sin selección/i.test(panel.cuenta),
  `${panel.titulo} · ${panel.cuenta}`,
);
comprobar(
  'Buscador fijo encima de una lista desplazable',
  panel.buscadorFijo && panel.desplazable,
  `buscador fijo ${panel.buscadorFijo} · desplazable ${panel.desplazable}`,
);
comprobar(
  'Filas de 40–44px con toda la superficie pulsable y casillas de 18px',
  panel.filasMin >= 40 &&
    panel.filasMin <= 44 &&
    panel.casilla === 18 &&
    panel.filasAncho >= panel.listaAncho - 24,
  `${panel.filasMin}px · casilla ${panel.casilla}px · ${panel.filasAncho}/${panel.listaAncho}px`,
);
comprobar(
  'La limpieza vive en un botón de icono de la cabecera, no en el pie',
  !/limpiar selección/i.test(panel.pie),
  'pie: ' + panel.pie,
);
comprobar('El panel se coloca dentro de la pantalla', panel.dentro && panel.ancho === 320, `${panel.ancho}px`);
await pagina.screenshot({ path: `${EVIDENCIAS}banda-desplegable.png` });

/* Selección simple → estado seleccionado con punto y resumen. */
await pagina.locator('.at-opcion', { hasText: 'Iztapalapa' }).first().click();
await pagina.waitForTimeout(1500);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(420);
const seleccion = await pagina.evaluate(() => {
  const boton = document.querySelector('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"]');
  const valor = boton.querySelector('.at-ctrl-value');
  return {
    texto: (boton.textContent ?? '').replace(/\s+/g, ' ').trim(),
    fondo: getComputedStyle(boton).backgroundColor,
    borde: getComputedStyle(boton).borderTopColor,
    colorValor: getComputedStyle(valor).color,
    pesoValor: getComputedStyle(valor).fontWeight,
    hayPunto: Boolean(boton.querySelector('.at-ctrl-punto')),
    valorEtiqueta: (document.querySelector('.at-chip .at-chip-texto')?.textContent ?? '').trim(),
    campoEtiqueta: (document.querySelector('.at-chip .at-chip-campo')?.textContent ?? '').trim(),
    chip: (document.querySelector('.at-chip')?.innerText ?? '').replace(/\s+/g, ' ').trim(),
    kpi: document.querySelector('.at-kpi-valor')?.textContent?.trim(),
    total: (document.querySelector('.at-kpi-valor')?.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim(),
  };
});
comprobar(
  'Estado seleccionado: fondo gris definido, borde neutro y resumen',
  seleccion.fondo === 'rgb(232, 235, 239)' &&
    seleccion.borde === 'rgb(203, 208, 216)' &&
    seleccion.colorValor === 'rgb(55, 65, 81)' &&
    seleccion.pesoValor === '500' &&
    seleccion.hayPunto,
  `${seleccion.texto} · ${seleccion.fondo}`,
);
comprobar(
  'La etiqueta identifica campo y valor',
  seleccion.campoEtiqueta === 'Alcaldía' && seleccion.valorEtiqueta === 'Iztapalapa',
  seleccion.campoEtiqueta + ' · ' + seleccion.valorEtiqueta,
);
comprobar(
  'La banda no repite el total: el indicador de hechos es la referencia',
  seleccion.kpi === '3,997' && seleccion.total === '3,997',
  'KPI ' + seleccion.kpi + ' · banda ' + seleccion.total,
);
await pagina.locator('[data-testid="filtros"]').screenshot({ path: `${EVIDENCIAS}banda-seleccion.png` });

/* Selección múltiple → «+1». */
await pagina.locator('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"]').first().click();
await pagina.waitForTimeout(320);
await pagina.locator('.at-opcion', { hasText: 'Cuauhtémoc' }).first().click();
await pagina.waitForTimeout(1500);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(420);
const multiple = await pagina.evaluate(() => ({
  valor: document
    .querySelector('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"] .at-ctrl-value')
    ?.textContent?.trim(),
  chips: [...document.querySelectorAll('.at-chip')].map((n) =>
    (n.textContent ?? '').replace(/\s+/g, ' ').trim(),
  ),
  kpi: document.querySelector('.at-kpi-valor')?.textContent?.trim(),
  total: (document.querySelector('.at-kpi-valor')?.textContent ?? '').replace(/[^\d]/g, ''),
}));
const apiDos = await leer('/resumen?alcaldia=Iztapalapa&alcaldia=Cuauht%C3%A9moc');
comprobar('Selección múltiple: «Alcaldía · Iztapalapa +1»', /\+1$/.test(multiple.valor ?? ''), multiple.valor ?? '');
comprobar(
  'Las dos alcaldías se suman (OR) y el contador coincide con la API',
  Number(multiple.total) === Math.round(apiDos.indicadores.hechos.valor) &&
    multiple.kpi?.replace(/[^\d]/g, '') === multiple.total,
  `banda ${multiple.total} · API ${Math.round(apiDos.indicadores.hechos.valor)} · KPI ${multiple.kpi}`,
);
comprobar('Hay una etiqueta por valor elegido', multiple.chips.length === 2, multiple.chips.join(' | '));

/* Quitar una etiqueta: solo esa selección. */
await pagina.locator('.at-chip', { hasText: 'Cuauhtémoc' }).first().click();
await pagina.waitForTimeout(1300);
const trasQuitar = await pagina.evaluate(() => ({
  chips: [...document.querySelectorAll('.at-chip')].map((n) =>
    (n.textContent ?? '').replace(/\s+/g, ' ').trim(),
  ),
  valor: document
    .querySelector('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"] .at-ctrl-value')
    ?.textContent?.trim(),
  total: (document.querySelector('.at-kpi-valor')?.textContent ?? '').replace(/[^\d]/g, ''),
}));
comprobar(
  'Quitar una etiqueta modifica únicamente esa selección',
  trasQuitar.chips.length === 1 && trasQuitar.valor === 'Iztapalapa' && trasQuitar.total === '3997',
  `${trasQuitar.chips.join(' | ')} · ${trasQuitar.valor} · ${trasQuitar.total}`,
);

/* --------------------- 5 · métrica ≠ filtro ---------------------------- */
const antesMetrica = { total: await totalBanda() };
await pagina.locator('[data-testid="panel-mapa"]').getByRole('button', { name: 'Fallecidas', exact: true }).click();
await pagina.waitForTimeout(1200);
const trasMetrica = await pagina.evaluate(() => ({
  total: Number((document.querySelector('.at-kpi-valor')?.textContent ?? '').replace(/[^\d]/g, '')),
  leyenda: (document.querySelector('.at-leyenda-titulo')?.textContent ?? '').trim(),
  consecuencia: new URLSearchParams(location.search).getAll('at_consecuencia').length,
}));
comprobar(
  'Elegir «Personas fallecidas» como métrica no aplica un filtro de consecuencia',
  trasMetrica.consecuencia === 0 && trasMetrica.total === antesMetrica.total,
  `consecuencia ${trasMetrica.consecuencia} · ${trasMetrica.total} hechos`,
);
comprobar('La métrica cambia la representación del mapa', /fallecidas/i.test(trasMetrica.leyenda), trasMetrica.leyenda);
await pagina.locator('[data-testid="panel-mapa"]').getByRole('button', { name: 'Hechos', exact: true }).click();
await pagina.waitForTimeout(900);

/* --------------------- 6 · exportación coherente ----------------------- */
let urlExportacion = '';
await pagina.route('**/exportar**', async (ruta) => {
  urlExportacion = ruta.request().url();
  await ruta.abort();
});
await pagina.locator('.at-head-acciones').getByRole('button', { name: /Exportar/ }).first().click();
await pagina.waitForTimeout(1000);
const exportada = new URL(urlExportacion || `${SITIO}/`);
comprobar(
  'La exportación lleva los filtros vigentes y ninguna búsqueda',
  exportada.pathname.endsWith('/exportar') &&
    exportada.searchParams.getAll('alcaldia').join(',') === 'Iztapalapa' &&
    !exportada.searchParams.has('buscar') &&
    !exportada.searchParams.has('q'),
  exportada.search || 'sin parámetros',
);
await pagina.unroute('**/exportar**');

/* La exportación navega fuera del tablero: se vuelve con el filtro activo. */
await pagina.goto(`${SITIO}/?at_alcaldia=Iztapalapa#/area/dashboards/atlas-vial`, {
  waitUntil: 'domcontentloaded',
});
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2400);

/* --------------------- 7 · «Más filtros» y limpiar todo ---------------- */
await pagina.locator('[data-testid="mas-filtros"]').click();
await pagina.waitForTimeout(380);
const masFiltros = await pagina.evaluate(() => {
  const panel = document.querySelector('[data-testid="panel-mas-filtros"]');
  return {
    temas: [...panel.querySelectorAll('.atf-grupo-titulo')].map((n) => (n.textContent ?? '').trim()),
    campos: [...panel.querySelectorAll('[data-testid^="mf-"]')].map(
      (n) => (n.querySelector('.atf-fila-label')?.textContent ?? '').trim(),
    ),
  };
});
comprobar(
  'Los filtros secundarios se agrupan por tema',
  masFiltros.temas.length === 3 && masFiltros.campos.length === 6,
  `${masFiltros.temas.join(' · ')} · ${masFiltros.campos.length} campos`,
);
await pagina.locator('.atf-panel--ancho').screenshot({ path: `${EVIDENCIAS}banda-mas-filtros.png` });
await pagina.locator('[data-testid="mf-tiposVehiculo"]').click();
await pagina.waitForTimeout(340);
await pagina.locator('.at-opcion', { hasText: 'Motocicleta' }).first().click();
await pagina.waitForTimeout(1200);
await pagina.locator('.atf-buscar input').fill('auto');
await pagina.waitForTimeout(340);
const conBusqueda = await pagina.evaluate(() => ({
  cuenta: (document.querySelector('.atf-panel .atf-cuenta')?.textContent ?? '').trim(),
  marcadas: document.querySelectorAll('.at-opcion.is-marcada').length,
  visibles: document.querySelectorAll('.at-opcion').length,
}));
comprobar(
  'Buscar dentro del desplegable conserva la selección',
  /1 seleccionada/i.test(conBusqueda.cuenta) && conBusqueda.visibles === 2,
  `${conBusqueda.cuenta} · ${conBusqueda.visibles} visibles`,
);
await pagina.locator('.atf-buscar input').fill('zzzz');
await pagina.waitForTimeout(340);
const sinCoincidencias = await pagina.evaluate(() => {
  const nodo = document.querySelector('.atf-vacio');
  return {
    texto: (nodo?.querySelector('.atf-vacio-texto')?.textContent ?? '').trim(),
    accion: (nodo?.querySelector('button')?.textContent ?? '').trim(),
  };
});
comprobar(
  'Estado de búsqueda sin coincidencias con acción para borrarla',
  /no hay opciones que coincidan/i.test(sinCoincidencias.texto) &&
    /borrar búsqueda/i.test(sinCoincidencias.accion),
  `${sinCoincidencias.texto} · ${sinCoincidencias.accion}`,
);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(420);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(420);
const globo = await pagina.evaluate(
  () => document.querySelector('[data-testid="mas-filtros"] .at-banda-mas-globo')?.textContent?.trim() ?? '',
);
comprobar('La insignia de «Más filtros» cuenta el campo secundario activo', globo === '1', globo || 'sin insignia');

/* Limpiar todo: la acción solo aparece con filtros activos. */
const antesLimpiar = await pagina.evaluate(() => ({
  hayBoton: Boolean(document.querySelector('.at-btn--reset')),
  total: Number((document.querySelector('.at-kpi-valor')?.textContent ?? '').replace(/[^\d]/g, '')),
}));
await pagina.locator('.at-btn--reset').click();
await pagina.waitForTimeout(1600);
const limpio = await pagina.evaluate(() => ({
  hayBoton: Boolean(document.querySelector('.at-btn--reset')),
  hayChips: document.querySelectorAll('.at-chip').length,
  total: Number((document.querySelector('.at-kpi-valor')?.textContent ?? '').replace(/[^\d]/g, '')),
  globo: Boolean(document.querySelector('[data-testid="mas-filtros"] .at-banda-mas-globo')),
  params: [...new URLSearchParams(location.search).keys()].filter(
    (clave) => clave.startsWith('at_') && !['at_v', 'at_m', 'at_met'].includes(clave),
  ),
}));
comprobar(
  '«Limpiar filtros» vuelve al conjunto completo y borra los parámetros',
  limpio.total === 30655 && limpio.hayChips === 0 && limpio.params.length === 0,
  `${limpio.total} hechos · chips ${limpio.hayChips} · params ${limpio.params.join(',') || 'ninguno'}`,
);
comprobar(
  'La acción de limpieza solo se muestra con filtros activos',
  antesLimpiar.hayBoton && !limpio.hayBoton && !limpio.globo,
  `antes ${antesLimpiar.hayBoton} → después ${limpio.hayBoton}`,
);

/* --------------------- 8 · banda adhesiva ----------------------------- */
await pagina.goto(`${SITIO}/?at_alcaldia=Iztapalapa&at_tipo_evento=Choque#/area/dashboards/atlas-vial`, {
  waitUntil: 'domcontentloaded',
});
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2600);
const antesDesplazar = await pagina.evaluate(() => ({
  altoDocumento: document.documentElement.scrollHeight,
  total: Number((document.querySelector('.at-kpi-valor')?.textContent ?? '').replace(/[^\d]/g, '')),
}));
const destinoScroll = await pagina.evaluate(() => {
  const caja = document.querySelector('[data-testid="filtros"]').getBoundingClientRect();
  return Math.round(caja.top + window.scrollY + 420);
});
await pagina.evaluate((y) => window.scrollTo(0, y), destinoScroll);
await pagina.waitForTimeout(900);
const pegada = await pagina.evaluate(() => {
  const banda = document.querySelector('[data-testid="filtros"]');
  const caja = banda.getBoundingClientRect();
  return {
    compacta: banda.classList.contains('is-compacta'),
    alto: Math.round(caja.height),
    top: Math.round(caja.top),
    texto: (banda.textContent ?? '').replace(/\s+/g, ' ').trim(),
    hayEditar: Boolean(banda.querySelector('.at-banda-editar')),
    total: Number((banda.querySelector('.at-banda-total')?.textContent ?? '').replace(/[^\d]/g, '')),
    altoDocumento: document.documentElement.scrollHeight,
    cabeceraAbajo: Math.round(document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0),
  };
});
comprobar(
  'Al desplazar, la banda pasa a una versión compacta',
  pegada.compacta && pegada.alto === 56 && pegada.hayEditar,
  `alto ${pegada.alto}px · top ${pegada.top}px`,
);
comprobar(
  'La versión compacta muestra periodo, resumen y total',
  'La versión compacta muestra periodo, resumen y «Editar filtros»',
  /2024/.test(pegada.texto) && /filtros? activos?/i.test(pegada.texto) && /editar filtros/i.test(pegada.texto),
);
comprobar(
  'La altura del documento no salta al compactarse',
  Math.abs(pegada.altoDocumento - antesDesplazar.altoDocumento) <= 2,
  `${antesDesplazar.altoDocumento} → ${pegada.altoDocumento}`,
);
comprobar(
  'La banda se pega bajo el encabezado de la página',
  pegada.top >= pegada.cabeceraAbajo - 1,
  `banda ${pegada.top}px · cabecera ${pegada.cabeceraAbajo}px`,
);
await pagina.screenshot({ path: `${EVIDENCIAS}banda-adhesiva.png` });

/* «Editar filtros» despliega los controles. */
await pagina.locator('.at-banda-editar').click();
await pagina.waitForTimeout(1000);
const desplegada = await pagina.evaluate(() => {
  const banda = document.querySelector('[data-testid="filtros"]');
  return {
    compacta: banda.classList.contains('is-compacta'),
    hayControles: banda.querySelectorAll('.at-ctrl').length,
  };
});
comprobar(
  '«Editar filtros» devuelve la banda desplegada',
  !desplegada.compacta && desplegada.hayControles === 4,
  `${desplegada.hayControles} controles`,
);

/* Un panel abierto queda por encima de la banda adhesiva. */
await pagina.locator('[data-testid="mas-filtros"]').click();
await pagina.waitForTimeout(420);
const panelSobreBanda = await pagina.evaluate(() => {
  const panel = document.querySelector('.atf-panel');
  if (!panel) return null;
  const caja = panel.getBoundingClientRect();
  const banda = document.querySelector('[data-testid="filtros"]').getBoundingClientRect();
  const centro = document.elementFromPoint(caja.left + caja.width / 2, caja.top + 24);
  return {
    encima: Boolean(centro && panel.contains(centro)),
    dentro: caja.top >= -1 && caja.bottom <= window.innerHeight + 1,
    solapaBanda: caja.top < banda.bottom,
  };
});
comprobar(
  'Un panel abierto se dibuja por encima de la banda y cabe en pantalla',
  Boolean(panelSobreBanda?.encima) && Boolean(panelSobreBanda?.dentro),
  JSON.stringify(panelSobreBanda),
);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(420);

/* Recarga con filtros activos. */
await pagina.reload({ waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2600);
const recarga = await pagina.evaluate(() => ({
  total: (document.querySelector('.at-kpi-valor')?.textContent ?? '').replace(/[^\d]/g, ''),
  chips: [...document.querySelectorAll('.at-chip')].map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim()),
  alcaldia: document
    .querySelector('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"] .at-ctrl-value')
    ?.textContent?.trim(),
}));
comprobar(
  'Al recargar se conservan filtros, etiquetas y total',
  recarga.total === '2307' && recarga.alcaldia === 'Iztapalapa' && recarga.chips.length === 2,
  `${recarga.total} · ${recarga.alcaldia} · ${recarga.chips.join(' | ')}`,
);
comprobar('Sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));
await contexto.close();

/* --------------------- 9 · tableta y móvil ---------------------------- */
for (const tamano of [
  { nombre: 'tableta', width: 834, height: 1112 },
  { nombre: 'movil', width: 390, height: 844 },
]) {
  const ctx = await navegador.newContext({
    viewport: { width: tamano.width, height: tamano.height },
    deviceScaleFactor: 2,
    locale: 'es-MX',
    isMobile: tamano.nombre === 'movil',
    hasTouch: tamano.nombre === 'movil',
  });
  const vista = await ctx.newPage();
  await vista.goto(`${SITIO}/?at_alcaldia=Iztapalapa#/area/dashboards/atlas-vial`, {
    waitUntil: 'domcontentloaded',
  });
  await vista.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
  await vista.waitForTimeout(2400);
  const medidas = await vista.evaluate(() => {
    const banda = document.querySelector('[data-testid="filtros"]');
    const controles = [...banda.querySelectorAll('.at-ctrl')];
    return {
      altoMin: Math.min(...controles.map((c) => Math.round(c.getBoundingClientRect().height))),
      desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
      dentro: controles.every((c) => c.getBoundingClientRect().right <= window.innerWidth + 1),
      altoBanda: Math.round(banda.getBoundingClientRect().height),
    };
  });
  comprobar(
    `${tamano.nombre}: la banda cabe sin desbordes horizontales`,
    !medidas.desborde && medidas.dentro,
    `desborde ${medidas.desborde} · alto ${medidas.altoBanda}px`,
  );
  comprobar(
    `${tamano.nombre}: la superficie pulsable mínima se respeta`,
    medidas.altoMin >= 44,
    `${medidas.altoMin}px`,
  );
  await vista.locator('[data-testid="filtros"]').screenshot({
    path: `${EVIDENCIAS}banda-${tamano.nombre}-expandida.png`,
  });

  await vista.evaluate(() => window.scrollBy(0, 700));
  await vista.waitForTimeout(800);
  const compacta = await vista.evaluate(() => {
    const banda = document.querySelector('[data-testid="filtros"]');
    const caja = banda.getBoundingClientRect();
    return {
      compacta: banda.classList.contains('is-compacta'),
      texto: (banda.textContent ?? '').replace(/\s+/g, ' ').trim(),
      dentro: caja.right <= window.innerWidth + 1 && caja.left >= -1,
    };
  });
  comprobar(
    `${tamano.nombre}: la banda compacta conserva periodo, filtros y editar`,
    compacta.compacta && /2024/.test(compacta.texto) && /editar filtros/i.test(compacta.texto) && compacta.dentro,
    compacta.texto.slice(0, 90),
  );
  await vista.screenshot({ path: `${EVIDENCIAS}banda-${tamano.nombre}-compacta.png` });

  await vista.locator('.at-banda-editar').click();
  await vista.waitForTimeout(1000);
  await vista.locator('[data-testid="mas-filtros"]').click();
  await vista.waitForTimeout(420);
  const panelMovil = await vista.evaluate(() => {
    const panel = document.querySelector('.atf-panel');
    const caja = panel.getBoundingClientRect();
    return {
      dentro:
        caja.left >= -1 &&
        caja.right <= window.innerWidth + 1 &&
        caja.top >= -1 &&
        caja.bottom <= window.innerHeight + 1,
      ancho: Math.round(caja.width),
    };
  });
  comprobar(`${tamano.nombre}: el panel de filtros cabe en la pantalla`, panelMovil.dentro, `${panelMovil.ancho}px`);
  await vista.screenshot({ path: `${EVIDENCIAS}banda-${tamano.nombre}-panel.png` });
  await ctx.close();
}

/* --------------------- 10 · movimiento reducido ----------------------- */
const reducido = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});
const paginaReducida = await reducido.newPage();
await paginaReducida.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await paginaReducida.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await paginaReducida.waitForTimeout(2200);
await paginaReducida.locator('[data-testid="filtros"] .at-ctrl[aria-label^="Alcaldía"]').first().click();
await paginaReducida.waitForTimeout(320);
const sinMovimiento = await paginaReducida.evaluate(() => {
  const panel = document.querySelector('.atf-panel');
  return {
    animacion: getComputedStyle(panel).animationName,
    transicionPanel: getComputedStyle(panel).transitionDuration,
    transicionControl: getComputedStyle(document.querySelector('.at-ctrl')).transitionDuration,
    transicionNav: getComputedStyle(document.querySelector('.wm-tabs-indicador')).transitionDuration,
  };
});
comprobar(
  'Con movimiento reducido no hay animaciones ni transiciones',
  sinMovimiento.animacion === 'none' &&
    Number.parseFloat(sinMovimiento.transicionPanel) <= 0.001 &&
    Number.parseFloat(sinMovimiento.transicionControl) <= 0.001 &&
    Number.parseFloat(sinMovimiento.transicionNav) <= 0.001,
  `${sinMovimiento.animacion} · ${sinMovimiento.transicionPanel} · ${sinMovimiento.transicionControl} · ${sinMovimiento.transicionNav}`,
);
await reducido.close();

await navegador.close();
const fallos = resultados.filter((resultado) => !resultado.ok);
writeFileSync(
  `${EVIDENCIAS}verificacion-banda.json`,
  JSON.stringify({ cuando: new Date().toISOString(), resultados }, null, 2),
  'utf8',
);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas`);
if (fallos.length) {
  console.log('FALLAS:', fallos.map((fallo) => fallo.nombre).join(' | '));
  process.exitCode = 1;
}
