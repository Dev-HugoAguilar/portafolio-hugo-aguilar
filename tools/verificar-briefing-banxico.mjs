/**
 * Verificación de «Briefing con evidencia · Banco de México».
 *
 *   node tools/verificar-briefing-banxico.mjs
 *
 * Comprueba la demo estática, la API/Atlas opcional, el fallback local, las
 * citas, la gráfica D3, la tabla accesible, el teclado, la ficha del portafolio
 * y el ancho móvil.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'briefing-banxico');
const URL = 'http://127.0.0.1:8000/dashboards/briefing-banxico/index.html';
const API = 'http://127.0.0.1:8010/api/v1/briefing-banxico';
const PREGUNTA_TASA = '¿Cuál fue la decisión sobre la tasa y desde cuándo aplica?';
const PREGUNTA_SIN_EVIDENCIA = '¿Cuál es la capital de Francia?';

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
const num = (s) => Number(String(s).replace(/[^\d.,-]/g, '').replace(',', '.'));

const apiHealth = await fetch(`${API}/health`).then(async (r) => r.ok ? r.json() : null).catch(() => null);
const apiActiva = Boolean(apiHealth?.ok);

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
const respuestas = [];
pagina.on('response', (r) => { if (r.status() >= 400) respuestas.push(`${r.status()} ${r.url()}`); });

await pagina.goto(URL, { waitUntil: 'load' });
await pagina.waitForSelector('#forecast-chart svg');
await pagina.waitForFunction(() => document.querySelectorAll('.source-card').length === 2 && !/Comprobando/i.test(document.querySelector('#api-status')?.textContent || ''), null, { timeout: 10_000 }).catch(() => {});
await pagina.waitForTimeout(500);

/* 1 · API opcional y Atlas, sin secretos */
comprobar(apiActiva, 'la API local del briefing responde');
if (apiActiva) {
  comprobar(apiHealth.corpus_chunks === 7 && apiHealth.retrieval === 'lexical' && apiHealth.vector_search === false, 'la API declara 7 fragmentos y recuperación léxica');
  comprobar(apiHealth.mongo?.target === 'atlas' && apiHealth.mongo?.reachable === true && apiHealth.mongo?.chunks === 7, 'Atlas está disponible en la colección dedicada con 7 fragmentos');
  comprobar(apiHealth.mongo?.database === 'portfolio_demos' && apiHealth.mongo?.collection === 'rag_banxico_chunks', 'la colección es portfolio_demos.rag_banxico_chunks');
  comprobar(apiHealth.llm?.configured === false, 'no hay modelo configurado; la respuesta será extractiva');
  const serializado = JSON.stringify(apiHealth);
  comprobar(!/mongodb(?:\+srv)?:\/\//.test(serializado) && !/api[_-]?key/i.test(serializado), 'la salud no expone URI ni claves');
}
const apiQuery = await fetch(`${API}/query?question=${encodeURIComponent(PREGUNTA_TASA)}`, { headers: { Origin: 'http://127.0.0.1:8000' } }).then(async (r) => ({ ok: r.ok, cors: r.headers.get('access-control-allow-origin'), body: await r.json() })).catch(() => null);
if (apiActiva && apiQuery) {
  comprobar(apiQuery.ok && apiQuery.cors === 'http://127.0.0.1:8000', `la consulta API permite el origen del portafolio (${apiQuery.cors})`);
  comprobar(apiQuery.body.retrieval_mode === 'atlas' && apiQuery.body.mode === 'extractiva' && apiQuery.body.vector_search === false, 'la API responde en modo Atlas y extractivo, sin búsqueda vectorial');
  comprobar(apiQuery.body.evidence?.some((e) => e.chunk_id === 'BM-2026-11-05-TASA' && e.source?.url?.includes('banxico.org.mx')), 'la API devuelve el fragmento de tasa con enlace oficial');
  const sinEvidencia = await fetch(`${API}/query?question=${encodeURIComponent(PREGUNTA_SIN_EVIDENCIA)}`).then((r) => r.json()).catch(() => null);
  comprobar(sinEvidencia?.mode === 'sin-coincidencias' && sinEvidencia.evidence.length === 0, 'la API no inventa evidencia para una pregunta fuera del corpus');
}

/* 2 · estructura, fuentes y consulta */
const base = await pagina.evaluate(() => ({
  title: document.title,
  sourceCards: document.querySelectorAll('.source-card').length,
  sourceIds: [...document.querySelectorAll('.source-card .source-id')].map((n) => n.textContent.trim()),
  apiStatus: document.querySelector('#api-status')?.textContent.trim() || '',
  badge: document.querySelector('#local-badge')?.innerText.replace(/\s+/g, ' ').trim() || '',
  scripts: [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')),
  d3: window.d3?.version || '',
  snapshots: [...document.querySelectorAll('.snapshot-card strong')].map((n) => n.textContent.replace(/\s+/g, '').trim()),
  tableRows: document.querySelectorAll('#forecast-table tbody tr').length,
  circleCount: document.querySelectorAll('#forecast-chart circle').length,
  observed: document.querySelectorAll('#forecast-chart .actual-point').length,
  forecast: document.querySelectorAll('#forecast-chart .forecast-point').length,
  futureLines: document.querySelectorAll('#forecast-chart .forecast-line.future').length,
  targetLines: document.querySelectorAll('#forecast-chart .target-line').length,
  splitLines: document.querySelectorAll('#forecast-chart .split-line').length,
  statuses: [...document.querySelectorAll('#forecast-chart circle')].map((c) => ({ period: c.dataset.period, status: c.dataset.status })),
}));
comprobar(base.title === 'Briefing con evidencia · Banco de México', `título de la demo (${base.title})`);
comprobar(base.sourceCards === 2 && base.sourceIds.some((s) => s.includes('BM-2026-11-05')) && base.sourceIds.some((s) => s.includes('BM-2026-08-26')), 'las dos fuentes oficiales están declaradas');
comprobar(base.snapshots.includes('6.25%') && base.snapshots.includes('3.62%') && base.snapshots.includes('3.78%'), 'los datos destacados conservan 6.25, 3.62 y 3.78');
comprobar(base.scripts.some((s) => s.includes('vendor/d3.min.js')) && !base.scripts.some((s) => /cdn|jsdelivr/i.test(s)), 'D3 se sirve localmente, sin CDN');
comprobar(base.d3 === '7.9.2', `D3 local v7 (${base.d3})`);
if (apiActiva) comprobar(/Atlas/.test(base.apiStatus) && /7 fragmentos/.test(base.apiStatus) && /sin modelo/.test(base.apiStatus), `la interfaz informa Atlas y modelo sin secretos (${base.apiStatus})`);
else comprobar(/API no disponible|Modo local/.test(base.apiStatus), 'la interfaz informa el fallback local');

await pagina.locator(`[data-question="${PREGUNTA_TASA}"]`).click();
await pagina.waitForFunction(() => /EVIDENCIA RECUPERADA|SIN EVIDENCIA/.test(document.querySelector('#answer-status')?.textContent || ''), null, { timeout: 20_000 });
const tasa = await pagina.evaluate(() => ({
  answer: document.querySelector('#answer-content')?.innerText.replace(/\s+/g, ' ').trim() || '',
  evidence: document.querySelectorAll('.evidence-card').length,
  ids: [...document.querySelectorAll('.evidence-card .source-id')].map((n) => n.textContent.trim()),
  links: [...document.querySelectorAll('.evidence-card a')].map((n) => n.getAttribute('href')),
  mode: document.querySelector('#retrieval-mode')?.textContent.trim() || '',
  note: document.querySelector('#answer-content .mode-note')?.textContent.trim() || '',
}));
comprobar(tasa.evidence >= 1 && /6\.25/.test(tasa.answer) && /6 de noviembre de 2026/.test(tasa.answer), 'la pregunta sugerida devuelve la tasa y la vigencia');
comprobar(tasa.ids.some((s) => s.includes('BM-2026-11-05')) && tasa.links.some((u) => /banxico\.org\.mx/.test(u || '')), 'la respuesta muestra identificador y enlace del documento');
comprobar(/EXTRACTIVA/.test(tasa.mode) && /extraída|extractiva/.test(tasa.note), `la respuesta se etiqueta como extractiva (${tasa.mode})`);

await pagina.locator('#question').fill(PREGUNTA_SIN_EVIDENCIA);
await pagina.locator('#query-form').evaluate((form) => form.requestSubmit());
await pagina.waitForFunction(() => /SIN EVIDENCIA/.test(document.querySelector('#answer-status')?.textContent || ''), null, { timeout: 20_000 });
const sinEvidencia = await pagina.evaluate(() => ({
  answer: document.querySelector('#answer-content')?.innerText.replace(/\s+/g, ' ').trim() || '',
  evidence: document.querySelectorAll('.evidence-card').length,
  note: document.querySelector('#answer-content .mode-note')?.textContent.trim() || '',
}));
comprobar(sinEvidencia.evidence === 0 && /No encontré evidencia suficiente/.test(sinEvidencia.answer) && /no se completó|no se usa conocimiento externo/i.test(sinEvidencia.note), 'la pregunta sin evidencia se rechaza explícitamente');

/* 3 · gráfica D3 y tabla */
comprobar(base.circleCount === 12 && base.observed === 4 && base.forecast === 8, 'la gráfica conserva 12 trimestres: 4 observados y 8 pronosticados');
comprobar(base.futureLines === 1 && base.targetLines === 1 && base.splitLines === 1, 'gráfica: línea discontinua, meta y separador de pronóstico');
comprobar(base.statuses.find((x) => x.period === '2026-T3')?.status === 'observado' && base.statuses.find((x) => x.period === '2026-T4')?.status === 'pronóstico', '2026-T3 es observado; 2026-T4 inicia el pronóstico');
comprobar(base.tableRows === 12, `la tabla accesible conserva 12 trimestres (${base.tableRows})`);
const tablaGeneral = await pagina.evaluate(() => [...document.querySelectorAll('#forecast-table tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim())));
comprobar(tablaGeneral.find((r) => r[0] === '2026-T3')?.[2] === 'observado' && tablaGeneral.find((r) => r[0] === '2026-T4')?.[2] === 'pronóstico', 'la tabla separa 2026-T3 observado de 2026-T4 pronóstico');
comprobar(/2026-T4/.test(await pagina.locator('#forecast-table caption').textContent()) && /Banco de México/.test(await pagina.locator('#forecast-table caption').textContent()), 'la tabla declara el inicio del pronóstico y la fuente');

await pagina.locator('#forecast-chart [data-period="2026-T4"]').focus();
await pagina.waitForTimeout(200);
const tooltip = await pagina.evaluate(() => ({
  hidden: document.querySelector('#forecast-tooltip')?.hidden,
  text: document.querySelector('#forecast-tooltip')?.textContent.trim() || '',
  aria: document.querySelector('#forecast-chart [data-period="2026-T4"]')?.getAttribute('aria-label') || '',
}));
comprobar(tooltip.hidden === false && /2026-T4/.test(tooltip.text) && /3\.7%/.test(tooltip.text) && /pronóstico/i.test(tooltip.text), `el tooltip declara periodo, valor y estatus (${tooltip.text})`);
comprobar(/2026-T4.*3\.7 por ciento.*pronóstico/i.test(tooltip.aria) && /Banco de México/.test(tooltip.aria), 'el punto tiene nombre accesible con fuente');
const dash = await pagina.evaluate(() => getComputedStyle(document.querySelector('#forecast-chart .forecast-line.future')).strokeDasharray);
comprobar(dash && dash !== 'none' && !/^0(px)?$/.test(dash), `la línea de pronóstico es discontinua (${dash})`);

await pagina.locator('[data-series="core"]').click();
await pagina.waitForTimeout(250);
const subyacente = await pagina.evaluate(() => ({
  pressed: document.querySelector('[data-series="core"]')?.getAttribute('aria-pressed'),
  source: document.querySelector('#chart-source')?.textContent.trim() || '',
  first: document.querySelector('#forecast-table tbody tr')?.children[1]?.textContent.trim() || '',
  circles: document.querySelectorAll('#forecast-chart circle').length,
}));
comprobar(subyacente.pressed === 'true' && /subyacente/i.test(subyacente.source) && subyacente.first === '4.3 %' && subyacente.circles === 12, 'el control cambia a inflación subyacente y actualiza la tabla');

/* 4 · fallback local forzado */
const local = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const erroresLocal = [];
local.on('pageerror', (e) => erroresLocal.push(`JS: ${e.message}`));
local.on('console', (m) => { if (m.type() === 'error') erroresLocal.push(`consola: ${m.text()}`); });
await local.goto(`${URL}?local=1`, { waitUntil: 'load' });
await local.waitForSelector('#forecast-chart svg');
await local.waitForTimeout(600);
await local.locator(`[data-question="${PREGUNTA_TASA}"]`).click();
await local.waitForFunction(() => /EVIDENCIA RECUPERADA/.test(document.querySelector('#answer-status')?.textContent || ''), null, { timeout: 10_000 });
const localDatos = await local.evaluate(() => ({
  api: document.querySelector('#api-status')?.textContent.trim() || '',
  mode: document.querySelector('#retrieval-mode')?.textContent.trim() || '',
  evidence: document.querySelectorAll('.evidence-card').length,
  cards: document.querySelectorAll('.source-card').length,
}));
comprobar(/Modo local|corpus local|local/i.test(localDatos.api), 'el modo local se activa sin depender de la API');
comprobar(/CORPUS LOCAL/.test(localDatos.mode) && localDatos.evidence >= 1 && localDatos.cards === 2, 'el fallback local responde con evidencia y fuentes');
comprobar(erroresLocal.length === 0, `el fallback local no registra errores de consola (${erroresLocal.slice(0, 2).join(' | ')})`);

/* 4b · la API cae por completo: la página debe seguir respondiendo en local */
const caida = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const erroresCaida = [];
caida.on('pageerror', (e) => erroresCaida.push(`JS: ${e.message}`));
await caida.goto(`${URL}?api=http://127.0.0.1:9`, { waitUntil: 'load' });
await caida.waitForSelector('#forecast-chart svg');
await caida.waitForFunction(
  () => /API no disponible/i.test(document.querySelector('#api-status')?.textContent || ''),
  null,
  { timeout: 10_000 },
);
await caida.locator(`[data-question="${PREGUNTA_TASA}"]`).click();
await caida.waitForFunction(
  () => /EVIDENCIA RECUPERADA/.test(document.querySelector('#answer-status')?.textContent || ''),
  null,
  { timeout: 10_000 },
);
const caidaDatos = await caida.evaluate(() => ({
  api: document.querySelector('#api-status')?.textContent.trim() || '',
  mode: document.querySelector('#retrieval-mode')?.textContent.trim() || '',
  evidence: document.querySelectorAll('.evidence-card').length,
  cards: document.querySelectorAll('.source-card').length,
}));
comprobar(/API no disponible/i.test(caidaDatos.api), 'si la API no responde, la interfaz lo declara');
comprobar(/CORPUS LOCAL/.test(caidaDatos.mode) && caidaDatos.evidence >= 1 && caidaDatos.cards === 2, 'sin API, el corpus local conserva respuesta y fuentes');
comprobar(erroresCaida.length === 0, `la caída de API no produce errores de JavaScript (${erroresCaida.slice(0, 2).join(' | ')})`);

/* 5 · móvil y ficha del portafolio */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await movil.goto(`${URL}?local=1`, { waitUntil: 'load' });
await movil.waitForSelector('#forecast-chart svg');
await movil.waitForTimeout(500);
const movilDatos = await movil.evaluate(() => {
  const chart = document.querySelector('#forecast-chart');
  const card = document.querySelector('.chart-card');
  return {
    desborde: document.documentElement.scrollWidth - innerWidth,
    chartWidth: Math.round(chart.getBoundingClientRect().width),
    cardWidth: Math.round(card.getBoundingClientRect().width),
    circles: document.querySelectorAll('#forecast-chart circle').length,
    tableRows: document.querySelectorAll('#forecast-table tbody tr').length,
    tabs: [...document.querySelectorAll('.chart-tab')].map((b) => Math.round(b.getBoundingClientRect().width)),
  };
});
comprobar(movilDatos.desborde <= 0, `390px: sin desbordamiento de página (${movilDatos.desborde})`);
comprobar(movilDatos.chartWidth <= movilDatos.cardWidth, '390px: la gráfica cabe en su tarjeta');
comprobar(movilDatos.circles === 12 && movilDatos.tableRows === 12 && movilDatos.tabs.every((w) => w > 40), '390px: gráfica, tabla y controles se conservan');
await movil.locator('.chart-card').screenshot({ path: path.join(SALIDA, 'briefing-grafica-movil.png'), animations: 'disabled' });

const ficha = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
await ficha.goto('http://127.0.0.1:8000/#/area/ia-generativa/asistente-investigacion', { waitUntil: 'load' });
await ficha.waitForTimeout(2200);
const fichaDatos = await ficha.evaluate(() => {
  const marco = [...document.querySelectorAll('iframe')].find((f) => /dashboards\/briefing-banxico/.test(f.src));
  return {
    titulo: document.querySelector('#project-view-title')?.textContent.trim() || '',
    marco: Boolean(marco),
    src: marco?.src || '',
    title: marco?.title || '',
    alto: Math.round(marco?.getBoundingClientRect().height || 0),
    contenido: Math.round(marco?.contentDocument?.documentElement?.scrollHeight || 0),
  };
});
comprobar(/Briefing con evidencia/.test(fichaDatos.titulo), `la ficha usa el nombre de la demo (${fichaDatos.titulo})`);
comprobar(fichaDatos.marco && /dashboards\/briefing-banxico\/index\.html/.test(fichaDatos.src) && /Briefing con evidencia/.test(fichaDatos.title), 'la demo se monta en un marco dentro de la ficha');
comprobar(
  fichaDatos.alto >= 1500 && fichaDatos.alto <= 3200 && Math.abs(fichaDatos.alto - fichaDatos.contenido) <= 12,
  `el marco ajusta su altura al contenido (${fichaDatos.alto} px ≈ ${fichaDatos.contenido} px)`,
);
await ficha.screenshot({ path: path.join(SALIDA, 'briefing-ficha.png'), fullPage: true, animations: 'disabled' });

/* 5b · la ficha también está en la galería del área */
const area = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
await area.goto('http://127.0.0.1:8000/#/area/ia-generativa', { waitUntil: 'load' });
await area.waitForTimeout(1000);
await area.waitForFunction(
  () => {
    const item = [...document.querySelectorAll('.project-list > li')]
      .find((nodo) => /Briefing con evidencia · Banco de México/.test(nodo.textContent || ''));
    const imagen = item?.querySelector('img');
    return Boolean(imagen?.complete && imagen.naturalWidth === 1600);
  },
  null,
  { timeout: 10_000 },
);
const areaDatos = await area.evaluate(() => {
  const item = [...document.querySelectorAll('.project-list > li')]
    .find((nodo) => /Briefing con evidencia · Banco de México/.test(nodo.textContent || ''));
  const enlace = item?.querySelector('a.card-hit');
  const imagen = item?.querySelector('img');
  return {
    titulo: item?.querySelector('h2, h3')?.textContent.trim() || '',
    href: enlace?.getAttribute('href') || '',
    estado: item?.querySelector('.card-meta .chip')?.textContent.trim() || '',
    imagen: imagen?.getAttribute('src') || '',
    ancho: imagen?.naturalWidth || 0,
    alto: imagen?.naturalHeight || 0,
  };
});
comprobar(
  /Briefing con evidencia/.test(areaDatos.titulo) && /asistente-investigacion/.test(areaDatos.href) && /desarrollo/i.test(areaDatos.estado),
  `la tarjeta aparece en IA generativa y abre la ficha (${areaDatos.titulo} · ${areaDatos.estado})`,
);
comprobar(
  /briefing-banxico-resumen\.jpg/.test(areaDatos.imagen) && areaDatos.ancho === 1600 && areaDatos.alto === 1726,
  `la tarjeta usa la captura real de la demo (${areaDatos.ancho} × ${areaDatos.alto})`,
);
await area.screenshot({ path: path.join(SALIDA, 'briefing-tarjeta.png'), fullPage: false, animations: 'disabled' });

/* 6 · cierre, capturas y red */
await pagina.locator('[data-series="general"]').click();
await pagina.locator(`[data-question="${PREGUNTA_TASA}"]`).click();
await pagina.waitForTimeout(500);
await pagina.screenshot({ path: path.join(SALIDA, 'briefing-escritorio.png'), fullPage: true, animations: 'disabled' });
await pagina.locator('.chart-card').screenshot({ path: path.join(SALIDA, 'briefing-grafica-escritorio.png'), animations: 'disabled' });
await pagina.locator('#answer-content').screenshot({ path: path.join(SALIDA, 'briefing-respuesta.png'), animations: 'disabled' });
await movil.screenshot({ path: path.join(SALIDA, 'briefing-movil.png'), fullPage: true, animations: 'disabled' });
comprobar(respuestas.length === 0, `sin respuestas 4xx/5xx en la demo (${respuestas.slice(0, 3).join(' · ') || 'ninguna'})`);

await navegador.close();
console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores de consola:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;
