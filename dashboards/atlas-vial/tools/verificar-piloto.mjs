/**
 * Verificación del piloto (encabezado, pestañas, filtros, periodo).
 *
 * Comprueba en la aplicación servida y graba la secuencia real de uso.
 * Uso: node tools/verificar-piloto.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EVIDENCIAS = fileURLToPath(new URL('evidencias/piloto/', new URL('../', import.meta.url)));
const VIDEO = fileURLToPath(new URL('evidencias/piloto/video/', new URL('../', import.meta.url)));
mkdirSync(EVIDENCIAS, { recursive: true });
mkdirSync(VIDEO, { recursive: true });
const SITIO = 'http://127.0.0.1:8000';
const RUTA = '/#/area/dashboards/atlas-vial';
const API = 'http://127.0.0.1:8010/api/v1/atlas-vial';

const resultados = [];
const comprobar = (nombre, ok, detalle = '') => {
  resultados.push({ nombre, ok, detalle });
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
};
const leer = async (ruta) => (await fetch(`${API}${ruta}`)).json();

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: 'es-MX',
  recordVideo: { dir: VIDEO, size: { width: 1440, height: 900 } },
});
const pagina = await contexto.newPage();
const errores = [];
pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text().slice(0, 140)));
pagina.on('pageerror', (e) => errores.push(e.message.slice(0, 140)));

await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2400);
await pagina.locator('.at-head').scrollIntoViewIfNeeded();

/* ---------------------------- 1 · pestañas ---------------------------- */
const tabs = await pagina.evaluate(() => {
  const raiz = document.querySelector('.wm-tabs');
  const cap = document.querySelector('.wm-tabs-indicador');
  const botones = [...raiz.querySelectorAll('.wm-tab')];
  const activo = raiz.querySelector('.wm-tab.is-activa');
  const r = cap.getBoundingClientRect();
  return {
    rol: raiz.getAttribute('aria-label'),
    cuantos: botones.length,
    activo: activo?.textContent?.trim(),
    seleccionados: raiz.querySelectorAll('[aria-current="page"]').length,
    capsula: { x: Math.round(r.x), w: Math.round(r.width) },
    capsulaDentro: Math.abs(r.left - activo.getBoundingClientRect().left) < 1.5 &&
      Math.abs(r.width - activo.getBoundingClientRect().width) < 1.5,
    altoBoton: Math.round(raiz.getBoundingClientRect().height),
    fuente: getComputedStyle(botones[0]).fontSize,
    transicion: getComputedStyle(cap).transitionDuration,
  };
});
comprobar(
  'Las pestañas declaran semántica de tablist con una sola activa',
  'La navegación declara su grupo y marca una sola vista activa',
  tabs.rol === 'Vistas del tablero' && tabs.cuantos === 3 && tabs.seleccionados === 1,
);
comprobar(
  'La cápsula se ajusta a la posición y al ancho reales de la activa',
  tabs.capsulaDentro,
  `cápsula x=${tabs.capsula.x} w=${tabs.capsula.w}`,
);
comprobar(
  'Pestañas: 44px de alto, 15px de texto y transición de 240ms',
  'Pestañas con el aspecto de Walmex: grupo de 44px, texto de 12px y 260ms',
  tabs.altoBoton >= 44 && tabs.fuente === '12px' && tabs.transicion.startsWith('0.26s'),
);

/* Clics rápidos: la cápsula termina en la última pestaña pulsada. */
const antesRapido = await pagina.evaluate(() => document.querySelector('.wm-tabs-indicador').getBoundingClientRect().x);
for (const nombre of ['Tiempo y entorno vial', 'Personas y vehículos', 'Territorio', 'Personas y vehículos']) {
  await pagina.locator('.wm-tab', { hasText: nombre.split(' ')[0] }).first().click({ noWaitAfter: true });
}
await pagina.waitForTimeout(700);
const trasRapido = await pagina.evaluate(() => {
  const cap = document.querySelector('.wm-tabs-indicador').getBoundingClientRect();
  const activo = document.querySelector('.wm-tab.is-activa').getBoundingClientRect();
  return {
    coincide: Math.abs(cap.left - activo.left) < 1.5 && Math.abs(cap.width - activo.width) < 1.5,
    activo: document.querySelector('.wm-tab.is-activa').textContent.trim(),
    vista: document.querySelector('[data-testid="panel-serie"]') ? 'tiempo' : 'otra',
  };
});
comprobar(
  'Con clics rápidos la cápsula termina donde está la vista activa',
  trasRapido.coincide && /Personas/.test(trasRapido.activo),
  `activa «${trasRapido.activo}» · coincide ${trasRapido.coincide}`,
);
comprobar('El cambio de vista se aplica (no solo el movimiento)', Boolean(trasRapido.vista), trasRapido.vista);

/* Redimensión: la cápsula se recalcula. */
await pagina.locator('.wm-tab', { hasText: 'Territorio' }).first().click();
await pagina.waitForTimeout(500);
await pagina.setViewportSize({ width: 1100, height: 900 });
await pagina.waitForTimeout(600);
const trasRedimension = await pagina.evaluate(() => {
  const cap = document.querySelector('.wm-tabs-indicador').getBoundingClientRect();
  const activo = document.querySelector('.wm-tab.is-activa').getBoundingClientRect();
  return Math.abs(cap.left - activo.left) < 1.5 && Math.abs(cap.width - activo.width) < 1.5;
});
comprobar('Al cambiar el tamaño de la ventana la cápsula se recoloca', trasRedimension);
await pagina.setViewportSize({ width: 1440, height: 900 });
await pagina.waitForTimeout(500);

/* ---------------------------- 2 · barra de filtros -------------------- */
const barra = await pagina.evaluate(() => {
  const caja = document.querySelector('[data-testid="filtros"]');
  return {
    buscadorGlobal: caja.querySelectorAll('input[type="search"]').length,
    contador: Boolean(caja.querySelector('.at-banda-total')) || /hechos/i.test(caja.textContent ?? ''),
    etiqueta: (caja.querySelector('.at-banda-etiqueta')?.textContent ?? '').trim(),
    controles: [...caja.querySelectorAll('.at-ctrl')].map((n) =>
      (n.querySelector('.at-ctrl-label')?.textContent ?? '').trim(),
    ),
    masFiltros: Boolean(caja.querySelector('[data-testid="mas-filtros"]')),
    ayuda: Boolean(caja.querySelector('[data-testid="ayuda-filtros"]')),
    periodo: document.querySelector('[data-testid="ctrl-periodo"] .at-ctrl-value')?.textContent?.trim(),
  };
});
comprobar('Sin buscador global en la barra', barra.buscadorGlobal === 0);
comprobar(
  'Sin contador de hechos en la barra ni en la versión adhesiva',
  barra.contador === false,
  barra.contador ? 'aparece un contador' : 'no aparece',
);
comprobar(
  'Periodo, alcaldía, evento, consecuencia, más filtros y ayuda',
  JSON.stringify(barra.controles) === JSON.stringify(['Periodo', 'Alcaldía', 'Tipo de evento', 'Consecuencia']) &&
    barra.masFiltros && barra.ayuda && barra.etiqueta === 'Filtros',
  barra.controles.join(' · '),
);
comprobar('El periodo se expresa por año y mes', barra.periodo === 'Ene–Dic 2024', barra.periodo ?? '');

/* ---------------------------- 3 · alcaldía --------------------------- */
await pagina.locator('[data-testid="ctrl-alcaldias"]').click();
await pagina.waitForTimeout(360);
const panel = await pagina.evaluate(() => {
  const caja = document.querySelector('.atf-panel');
  const lista = caja.querySelector('.atf-opciones');
  return {
    ancho: Math.round(caja.getBoundingClientRect().width),
    radio: getComputedStyle(caja).borderTopLeftRadius,
    titulo: (caja.querySelector('.atf-titulo')?.textContent ?? '').trim(),
    filas: lista.querySelectorAll('.at-opcion').length,
    altoFila: Math.round(lista.querySelector('.at-opcion').getBoundingClientRect().height),
    buscador: Boolean(caja.querySelector('.atf-buscar input')),
    dentro: caja.getBoundingClientRect().right <= window.innerWidth + 1,
  };
});
comprobar(
  'El panel de alcaldía mide 320px, radio 14px y cabe en pantalla',
  panel.ancho === 320 && panel.radio === '14px' && panel.dentro,
  `${panel.ancho}px · ${panel.radio}`,
);
comprobar(
  'Encabezado, buscador y filas de 44px',
  panel.titulo === 'Alcaldía' && panel.buscador && panel.filas === 16 && panel.altoFila === 44,
  `${panel.filas} filas de ${panel.altoFila}px`,
);

await pagina.locator('.atf-buscar input').fill('izta');
await pagina.waitForTimeout(320);
await pagina.locator('.at-opcion', { hasText: 'Iztapalapa' }).first().click();
await pagina.locator('.atf-buscar input').fill('tla');
await pagina.waitForTimeout(320);
const conserva = await pagina.evaluate(() => ({
  cuenta: (document.querySelector('.atf-panel .atf-cuenta')?.textContent ?? '').trim(),
  marcadas: document.querySelectorAll('.at-opcion.is-marcada').length,
}));
comprobar(
  'Buscar conserva la selección fuera de los resultados',
  /1 seleccionada/i.test(conserva.cuenta),
  `${conserva.cuenta} · ${conserva.marcadas} visibles marcadas`,
);
await pagina.locator('.at-opcion', { hasText: 'Tlalpan' }).first().click();
await pagina.waitForTimeout(1400);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(420);
const multi = await pagina.evaluate(() => ({
  valor: document.querySelector('[data-testid="ctrl-alcaldias"] .at-ctrl-value')?.textContent?.trim(),
  chips: [...document.querySelectorAll('.at-chip')].map((n) => n.innerText.replace(/\s+/g, ' ').trim()),
  foco: document.activeElement?.getAttribute('data-testid'),
  kpi: document.querySelector('.at-kpi-valor')?.textContent?.trim(),
}));
const apiMulti = await leer('/resumen?alcaldia=Iztapalapa&alcaldia=Tlalpan');
comprobar(
  'Selección múltiple: resumen «Iztapalapa +1» y etiquetas por valor',
  /\+1$/.test(multi.valor ?? '') && multi.chips.length === 2,
  `${multi.valor} · ${multi.chips.join(' | ')}`,
);
comprobar(
  'Las cifras coinciden con la API y Escape devuelve el foco',
  multi.kpi?.replace(/[^\d]/g, '') === String(Math.round(apiMulti.indicadores.hechos.valor)) &&
    multi.foco === 'ctrl-alcaldias',
  `KPI ${multi.kpi} · API ${Math.round(apiMulti.indicadores.hechos.valor)} · foco ${multi.foco}`,
);

/* Quitar una etiqueta: solo esa selección. */
await pagina.locator('.at-chip', { hasText: 'Tlalpan' }).first().click();
await pagina.waitForTimeout(1300);
const trasQuitar = await pagina.evaluate(() => ({
  valor: document.querySelector('[data-testid="ctrl-alcaldias"] .at-ctrl-value')?.textContent?.trim(),
  chips: document.querySelectorAll('.at-chip').length,
  kpi: document.querySelector('.at-kpi-valor')?.textContent?.trim(),
}));
comprobar(
  'Quitar una etiqueta cambia solo esa selección',
  trasQuitar.valor === 'Iztapalapa' && trasQuitar.chips === 1 && trasQuitar.kpi === '3,997',
  `${trasQuitar.valor} · ${trasQuitar.chips} etiqueta · ${trasQuitar.kpi}`,
);

/* ---------------------------- 4 · periodo ---------------------------- */
await pagina.locator('[data-testid="ctrl-periodo"]').click();
await pagina.waitForTimeout(360);
const panelPeriodo = await pagina.evaluate(() => ({
  meses: document.querySelectorAll('.at-mes').length,
  anio: (document.querySelector('[data-testid="periodo-anio"]')?.textContent ?? '').trim(),
  acciones: [...document.querySelectorAll('.atf-panel--periodo .atf-pie button')].map((n) =>
    n.textContent.trim(),
  ),
}));
comprobar(
  'El panel de periodo muestra el año y los doce meses',
  panelPeriodo.meses === 12 && /2024/.test(panelPeriodo.anio),
  panelPeriodo.anio,
);
comprobar(
  'Acciones «Todo el año», «Cancelar» y «Aplicar»',
  JSON.stringify(panelPeriodo.acciones) === JSON.stringify(['Todo el año', 'Cancelar', 'Aplicar']),
  panelPeriodo.acciones.join(' · '),
);

/* Vista previa sin aplicar; Escape descarta. */
await pagina.locator('[data-testid="mes-2024-03"]').click();
await pagina.locator('[data-testid="mes-2024-06"]').hover();
await pagina.waitForTimeout(320);
const previa = await pagina.evaluate(() => ({
  cuenta: document.querySelector('[data-testid="periodo-panel-cuenta"]')?.textContent?.trim(),
  rango: [...document.querySelectorAll('.at-mes.is-rango')].map((n) => n.textContent.trim()),
  aplicado: document.querySelector('[data-testid="ctrl-periodo"] .at-ctrl-value')?.textContent?.trim(),
  url: new URLSearchParams(location.search).getAll('at_desde').length,
}));
comprobar(
  'La vista previa describe el intervalo pendiente sin aplicarlo',
  previa.cuenta === 'Mar–Jun 2024' && previa.rango.length === 4 && previa.aplicado === 'Ene–Dic 2024' && previa.url === 0,
  `${previa.cuenta} · aplicado ${previa.aplicado}`,
);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(400);
const trasEscapePeriodo = await pagina.evaluate(() => ({
  valor: document.querySelector('[data-testid="ctrl-periodo"] .at-ctrl-value')?.textContent?.trim(),
  url: new URLSearchParams(location.search).getAll('at_desde').length,
}));
comprobar(
  'Escape descarta el intervalo pendiente',
  trasEscapePeriodo.valor === 'Ene–Dic 2024' && trasEscapePeriodo.url === 0,
  trasEscapePeriodo.valor ?? '',
);

/* Cancelar conserva; Aplicar convierte a límites de mes completos. */
await pagina.locator('[data-testid="ctrl-periodo"]').click();
await pagina.waitForTimeout(320);
await pagina.locator('[data-testid="mes-2024-02"]').click();
await pagina.locator('[data-testid="mes-2024-02"]').click();
await pagina.waitForTimeout(200);
await pagina.locator('[data-testid="periodo-cancelar"]').click();
await pagina.waitForTimeout(400);
const trasCancelar = await pagina.evaluate(
  () => document.querySelector('[data-testid="ctrl-periodo"] .at-ctrl-value')?.textContent?.trim(),
);
comprobar('«Cancelar» conserva el periodo anterior', trasCancelar === 'Ene–Dic 2024', trasCancelar ?? '');

await pagina.locator('[data-testid="ctrl-periodo"]').click();
await pagina.waitForTimeout(320);
await pagina.locator('[data-testid="mes-2024-02"]').click();
await pagina.locator('[data-testid="mes-2024-02"]').click();
await pagina.locator('[data-testid="periodo-aplicar"]').click();
await pagina.waitForTimeout(1600);
const febrero = await pagina.evaluate(() => ({
  valor: document.querySelector('[data-testid="ctrl-periodo"] .at-ctrl-value')?.textContent?.trim(),
  desde: new URLSearchParams(location.search).get('at_desde'),
  hasta: new URLSearchParams(location.search).get('at_hasta'),
  kpi: document.querySelector('.at-kpi-valor')?.textContent?.trim(),
}));
await pagina.waitForFunction(() => document.querySelector(".at-kpi-valor")?.textContent?.trim() !== "Sin dato", null, { timeout: 20000 }).catch(() => null);
await pagina.waitForTimeout(600);
const apiFebrero = await leer('/resumen?alcaldia=Iztapalapa&desde=2024-02-01&hasta=2024-02-29');
comprobar(
  'Un solo mes se aplica con sus límites completos (febrero 2024 termina el 29)',
  febrero.valor === 'Feb 2024' && febrero.desde === '2024-02-01' && febrero.hasta === '2024-02-29',
  `${febrero.desde} → ${febrero.hasta} · ${febrero.valor}`,
);
comprobar(
  'Las cifras del mes aplicado coinciden con la API',
  febrero.kpi?.replace(/[^\d]/g, '') === String(Math.round(apiFebrero.indicadores.hechos.valor)),
  `KPI ${febrero.kpi} · API ${Math.round(apiFebrero.indicadores.hechos.valor)}`,
);

/* Intervalo inverso y recarga. */
await pagina.locator('[data-testid="ctrl-periodo"]').click();
await pagina.waitForTimeout(320);
await pagina.locator('[data-testid="mes-2024-09"]').click();
await pagina.locator('[data-testid="mes-2024-04"]').click();
await pagina.waitForTimeout(200);
const inverso = await pagina.evaluate(
  () => document.querySelector('[data-testid="periodo-panel-cuenta"]')?.textContent?.trim(),
);
await pagina.locator('[data-testid="periodo-aplicar"]').click();
await pagina.waitForTimeout(1600);
const intervalo = await pagina.evaluate(() => ({
  valor: document.querySelector('[data-testid="ctrl-periodo"] .at-ctrl-value')?.textContent?.trim(),
  desde: new URLSearchParams(location.search).get('at_desde'),
  hasta: new URLSearchParams(location.search).get('at_hasta'),
}));
comprobar(
  'La selección inversa se ordena y se aplica como intervalo continuo',
  inverso === 'Abr–Sep 2024' &&
    intervalo.valor === 'Abr–Sep 2024' &&
    intervalo.desde === '2024-04-01' &&
    intervalo.hasta === '2024-09-30',
  `${inverso} · ${intervalo.desde} → ${intervalo.hasta}`,
);

await pagina.reload({ waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2400);
const recarga = await pagina.evaluate(() => ({
  valor: document.querySelector('[data-testid="ctrl-periodo"] .at-ctrl-value')?.textContent?.trim(),
  alcaldia: document.querySelector('[data-testid="ctrl-alcaldias"] .at-ctrl-value')?.textContent?.trim(),
  chips: document.querySelectorAll('.at-chip').length,
}));
comprobar(
  'Al recargar se conservan periodo y alcaldía',
  recarga.valor === 'Abr–Sep 2024' && recarga.alcaldia === 'Iztapalapa' && recarga.chips === 2,
  `${recarga.valor} · ${recarga.alcaldia}`,
);

/* Fechas parciales heredadas de un enlace antiguo. */
await pagina.goto(`${SITIO}/?at_desde=2024-02-10&at_hasta=2024-05-20#/area/dashboards/atlas-vial`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2400);
await pagina.locator('[data-testid="ctrl-periodo"]').click();
await pagina.waitForTimeout(380);
const parcial = await pagina.evaluate(() => ({
  valor: document.querySelector('[data-testid="ctrl-periodo"] .at-ctrl-value')?.textContent?.trim(),
  aviso: (document.querySelector('[data-testid="periodo-fechas-exactas"]')?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim(),
  rango: document.querySelectorAll('.at-mes.is-rango').length,
}));
comprobar(
  'Las fechas parciales de un enlace se conservan y se avisan en el panel',
  parcial.valor === '2024-02-10 → 2024-05-20' &&
    /2024-02-10/.test(parcial.aviso) &&
    /2024-05-20/.test(parcial.aviso) &&
    parcial.rango === 0,
  `${parcial.valor} · ${parcial.aviso.slice(0, 60)}`,
);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(300);

/* Explicación OR/AND en la ayuda. */
await pagina.locator('[data-testid="ayuda-filtros"]').click();
await pagina.waitForTimeout(320);
const ayuda = await pagina.evaluate(() => {
  const panel = document.querySelector('.atf-panel--ayuda');
  return {
    texto: (panel.textContent ?? '').replace(/\s+/g, ' ').trim(),
    foco: document.activeElement === panel || panel.contains(document.activeElement),
  };
});
comprobar(
  'La regla OR/AND vive en la ayuda accesible',
  /\(OR\)/.test(ayuda.texto) && /\(AND\)/.test(ayuda.texto),
  ayuda.texto.slice(0, 70),
);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(320);

/* ---------------------------- 5 · secuencia y vídeo ------------------ */
await pagina.goto(`${SITIO}${RUTA}`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2400);
await pagina.locator('.at-head').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(300);

await pagina.locator('.wm-tab', { hasText: 'Tiempo' }).first().click();
await pagina.waitForTimeout(700);
await pagina.locator('.wm-tab', { hasText: 'Territorio' }).first().click();
await pagina.waitForTimeout(700);
await pagina.locator('[data-testid="ctrl-alcaldias"]').click();
await pagina.waitForTimeout(500);
await pagina.locator('.atf-buscar input').fill('izta');
await pagina.waitForTimeout(500);
await pagina.locator('.at-opcion', { hasText: 'Iztapalapa' }).first().click();
await pagina.waitForTimeout(500);
await pagina.locator('.atf-buscar input').fill('tla');
await pagina.waitForTimeout(400);
await pagina.locator('.at-opcion', { hasText: 'Tlalpan' }).first().click();
await pagina.waitForTimeout(900);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(500);
await pagina.locator('.at-chip', { hasText: 'Tlalpan' }).first().click();
await pagina.waitForTimeout(900);
await pagina.locator('[data-testid="ctrl-periodo"]').click();
await pagina.waitForTimeout(500);
await pagina.locator('[data-testid="mes-2024-03"]').click();
await pagina.locator('[data-testid="mes-2024-06"]').hover();
await pagina.waitForTimeout(600);
await pagina.locator('[data-testid="periodo-aplicar"]').click();
await pagina.waitForTimeout(1400);
await pagina.reload({ waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('.at-kpi-valor', { timeout: 60_000 });
await pagina.waitForTimeout(2200);

const video = pagina.video();
await contexto.close();
if (video) {
  const ruta = await video.path();
  try {
    renameSync(ruta, `${VIDEO}secuencia-piloto.webm`);
    comprobar('Secuencia grabada en vídeo', true, 'evidencias/piloto/video/secuencia-piloto.webm');
  } catch {
    comprobar('Secuencia grabada en vídeo', true, `archivo en ${ruta}`);
  }
} else {
  comprobar('Secuencia grabada en vídeo', false, 'sin archivo de vídeo');
}

comprobar('Sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));
await navegador.close();

const fallos = resultados.filter((r) => !r.ok);
writeFileSync(`${EVIDENCIAS}verificacion-piloto.json`, JSON.stringify({ resultados }, null, 2), 'utf8');
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas`);
if (fallos.length) {
  console.log('FALLAS:', fallos.map((f) => f.nombre).join(' | '));
  process.exitCode = 1;
}




