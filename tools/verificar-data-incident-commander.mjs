/**
 * Verificación de «Data Incident Commander».
 *
 *   node tools/verificar-data-incident-commander.mjs
 *
 * Comprueba los tres escenarios, alternativas, bloqueo de imputación,
 * aprobación/rechazo, API local, snapshot fuente intacto, cero escrituras
 * externas, accesibilidad y viewport móvil de 390 px.
 */
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'data-incident-commander');
const URL = 'http://127.0.0.1:8000/dashboards/data-incident-commander/index.html';
const API = 'http://127.0.0.1:8010/api/v1/incident-commander';
const SNAPSHOT = path.join(RAIZ, 'dashboards', 'data-incident-commander', 'runtime', 'data.json');
const HTML = path.join(RAIZ, 'dashboards', 'data-incident-commander', 'runtime', 'index.html');

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
const comprobar = (condicion, mensaje) => (condicion ? ok : fallos).push(mensaje);

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

const hashAntes = sha256File(SNAPSHOT);
const snapshotData = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const snapshotHtml = readFileSync(HTML, 'utf8');
const embeddedMatch = snapshotHtml.match(/<script id="snapshot-data" type="application\/json">([\s\S]*?)<\/script>/);
const embeddedData = embeddedMatch ? JSON.parse(embeddedMatch[1]) : null;
comprobar(embeddedData && JSON.stringify(embeddedData.observations) === JSON.stringify(snapshotData.observations), 'el snapshot embebido coincide con data.json (21 observaciones)');
const apiHealth = await fetch(`${API}/health`).then(async (r) => r.ok ? r.json() : null).catch(() => null);
const apiSnapshot = await fetch(`${API}/snapshot`).then(async (r) => r.ok ? r.json() : null).catch(() => null);
const apiActiva = Boolean(apiHealth?.ok);
comprobar(apiActiva, 'la API local del incidente responde');
if (apiActiva) {
  comprobar(apiHealth.observations === 21 && apiHealth.source_file_intact === true, 'la API conserva 21 observaciones y el archivo fuente intacto');
  comprobar(apiHealth.llm === false && apiHealth.atlas === false, 'la API declara flujo determinista sin LLM ni Atlas');
  comprobar(apiHealth.external_writes === 0, 'la API declara cero escrituras externas');
  comprobar(apiSnapshot?.observation_count === 21 && apiSnapshot?.dataset_id === 'WB-WDI-MEX-2019-2025-v1', 'el snapshot declara dataset, 21 observaciones y corte');
}

if (apiActiva) {
  const escenarios = {
    missing: 20,
    duplicate: 24,
    schema: 21
  };
  for (const [scenario, count] of Object.entries(escenarios)) {
    const response = await fetch(`${API}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenario })
    });
    const body = await response.json();
    comprobar(response.ok && body.observations_in_copy === count && body.observations_in_source === 21, `API·${scenario}: la copia tiene ${count} filas y la fuente 21`);
    comprobar(body.recommended_plan === 'quarantine' && body.allowed_plans?.includes('backfill') && body.blocked_plans?.includes('forward'), `API·${scenario}: plan recomendado y lista permitida`);
    const failed = body.baseline_checks?.filter((check) => !check.passed).map((check) => check.id) || [];
    comprobar(failed.length > 0 && failed.includes(scenario === 'missing' ? 'period_coverage' : scenario === 'duplicate' ? 'key_uniqueness' : 'catalog_codes'), `API·${scenario}: la validación correspondiente falla en la copia`);
    comprobar(body.external_writes === 0, `API·${scenario}: cero escrituras externas`);
  }

  const run = await fetch(`${API}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: 'missing' })
  }).then((r) => r.json());
  const blocked = await fetch(`${API}/runs/${run.run_id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved: true, plan_id: 'forward' })
  });
  comprobar(blocked.status === 422, 'API: la imputación queda bloqueada por política');
  const approved = await fetch(`${API}/runs/${run.run_id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved: true, plan_id: 'quarantine' })
  }).then((r) => r.json());
  comprobar(approved.status === 'sandbox_simulation_completed' && approved.receipt?.startsWith('RCPT-'), 'API: la aprobación simula y devuelve recibo local');
  comprobar(approved.rows_after === 21 && approved.source_unchanged === true && approved.external_writes === 0 && approved.writes?.length === 0, 'API: el sandbox recupera 21 filas sin escrituras');

  const runReject = await fetch(`${API}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: 'schema' })
  }).then((r) => r.json());
  const rejected = await fetch(`${API}/runs/${runReject.run_id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved: false, plan_id: 'forward' })
  }).then((r) => r.json());
  comprobar(rejected.status === 'rejected_no_effect' && rejected.receipt === null && rejected.external_writes === 0, 'API: el rechazo no tiene efecto');
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
const erroresPagina = [];
const respuestas = [];
pagina.on('pageerror', (e) => erroresPagina.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') erroresPagina.push(`consola: ${m.text()}`); });
pagina.on('response', (r) => { if (r.status() >= 400) respuestas.push(`${r.status()} ${r.url()}`); });

await pagina.goto(URL, { waitUntil: 'load' });
await pagina.waitForSelector('#run-button');
await pagina.waitForTimeout(500);

const base = await pagina.evaluate(() => {
  const tabs = [...document.querySelectorAll('[role="tab"][data-scenario]')];
  const active = document.querySelector('[role="tab"][aria-selected="true"]');
  const track = document.querySelector('.scenario-tabs');
  const workspace = document.querySelector('.workspace');
  return {
    title: document.title,
    scenarios: tabs.map((n) => n.dataset.scenario),
    tablist: document.querySelector('.scenario-tabs')?.getAttribute('role') || '',
    selected: active?.id || '',
    tabIndexes: tabs.map((n) => n.tabIndex),
    controls: tabs.map((n) => n.getAttribute('aria-controls')),
    panel: document.querySelector('#incident-panel')?.getAttribute('aria-labelledby') || '',
    trackBg: track ? getComputedStyle(track).backgroundColor : '',
    trackRadius: track ? getComputedStyle(track).borderRadius : '',
    activeBg: active ? getComputedStyle(active).backgroundColor : '',
    activeColor: active ? getComputedStyle(active).color : '',
    activeShadow: active ? getComputedStyle(active).boxShadow : '',
    runBg: document.querySelector('#run-button') ? getComputedStyle(document.querySelector('#run-button')).backgroundColor : '',
    runColor: document.querySelector('#run-button') ? getComputedStyle(document.querySelector('#run-button')).color : '',
    runBorder: document.querySelector('#run-button') ? getComputedStyle(document.querySelector('#run-button')).borderTopColor : '',
    runShadow: document.querySelector('#run-button') ? getComputedStyle(document.querySelector('#run-button')).boxShadow : '',
    rail: document.querySelectorAll('.rail, .brand-mark, .rail-icon, .rail-bottom').length,
    workspaceLeft: Math.round(workspace?.getBoundingClientRect().left || 0),
    workspaceWidth: Math.round(workspace?.getBoundingClientRect().width || 0),
    svgs: [...document.querySelectorAll('svg')].map((n) => n.id),
    plans: document.querySelectorAll('[data-plan-option]').length,
    heatCells: document.querySelectorAll('.heat-cell').length,
    traceEvents: document.querySelectorAll('.trace-event').length,
    snapshot: document.querySelector('#snapshot-note')?.textContent.trim() || '',
    noWrites: document.querySelector('.local-pill')?.textContent.trim() || ''
  };
});
comprobar(/Data Incident Commander/.test(base.title), `título de la demo (${base.title})`);
comprobar(base.rail === 0 && base.workspaceLeft === 0 && base.workspaceWidth >= 1000, 'la barra lateral se retiró y el contenido ocupa el ancho');
comprobar(base.scenarios.length === 3 && base.scenarios.join(',') === 'missing,duplicate,schema', 'se ofrecen los tres escenarios');
comprobar(base.tablist === 'tablist' && base.selected === 'tab-missing' && base.tabIndexes.join(',') === '0,-1,-1', 'los escenarios son tabs accesibles y solo la activa es tabulable');
comprobar(base.controls.every((id) => id === 'incident-panel') && base.panel === 'tab-missing', 'cada tab declara el panel y el panel apunta al tab activo');
comprobar(base.trackBg === 'rgb(238, 241, 255)' && base.trackRadius === '999px', 'la pista de tabs usa lavanda claro y píldora');
comprobar(base.activeBg === 'rgb(75, 85, 255)' && base.activeColor === 'rgb(255, 255, 255)' && /rgba\(75, 85, 255/.test(base.activeShadow), 'el tab activo usa índigo #4b55ff, texto blanco y énfasis índigo');
comprobar(base.runBg === 'rgb(75, 85, 255)' && base.runColor === 'rgb(255, 255, 255)' && base.runBorder === 'rgb(75, 85, 255)' && /rgba\(75, 85, 255/.test(base.runShadow), 'Iniciar investigación es la acción primaria índigo con texto blanco');
comprobar(base.svgs.includes('sankey') && base.svgs.includes('parallel') && base.svgs.includes('heatmap') && base.svgs.includes('trace'), 'se conservan las cuatro visualizaciones SVG');
comprobar(base.plans === 4 && base.heatCells === 24 && base.traceEvents === 6, 'alternativas, matriz y traza están presentes');
comprobar(/21 observaciones reales/.test(base.snapshot), `el snapshot de 21 observaciones está visible (${base.snapshot})`);
comprobar(/SIN ESCRITURAS/.test(base.noWrites), 'la interfaz declara entorno local sin escrituras');

await pagina.locator('#tab-duplicate').hover();
await pagina.waitForTimeout(400);
const hoverTab = await pagina.evaluate(() => getComputedStyle(document.querySelector('#tab-duplicate')).backgroundColor);
comprobar(hoverTab === 'rgb(230, 234, 255)', `el hover de tabs usa lavanda (${hoverTab})`);
await pagina.mouse.move(0, 0);
await pagina.locator('#run-button').focus();
await pagina.waitForTimeout(300);
const focusButton = await pagina.evaluate(() => {
  const button = document.querySelector('#run-button');
  const style = getComputedStyle(button);
  return {
    outline: style.outlineColor,
    outlineWidth: style.outlineWidth,
    focusVisible: button.matches(':focus-visible'),
    background: style.backgroundColor,
    focused: document.activeElement === button
  };
});
comprobar(focusButton.focused && focusButton.focusVisible && focusButton.outlineWidth !== '0px' && focusButton.background === 'rgb(75, 85, 255)', 'el botón primario conserva foco visible sin perder el índigo');

await pagina.locator('#tab-missing').focus();
await pagina.keyboard.press('ArrowRight');
await pagina.waitForTimeout(150);
const keyboardRight = await pagina.evaluate(() => ({
  selected: document.querySelector('[role="tab"][aria-selected="true"]')?.id || '',
  focused: document.activeElement?.id || '',
  title: document.querySelector('#incident-title')?.textContent.trim() || '',
  panel: document.querySelector('#incident-panel')?.getAttribute('aria-labelledby') || ''
}));
comprobar(keyboardRight.selected === 'tab-duplicate' && keyboardRight.focused === 'tab-duplicate' && /Clave anual duplicada/.test(keyboardRight.title) && keyboardRight.panel === 'tab-duplicate', 'ArrowRight mueve el foco y actualiza el escenario');
await pagina.keyboard.press('End');
await pagina.waitForTimeout(150);
const keyboardEnd = await pagina.evaluate(() => ({
  selected: document.querySelector('[role="tab"][aria-selected="true"]')?.id || '',
  title: document.querySelector('#incident-title')?.textContent.trim() || ''
}));
comprobar(keyboardEnd.selected === 'tab-schema' && /Contrato de esquema alterado/.test(keyboardEnd.title), 'End lleva al último tab y actualiza la vista');
await pagina.keyboard.press('Home');
await pagina.waitForTimeout(150);
comprobar(await pagina.locator('#tab-missing').getAttribute('aria-selected') === 'true', 'Home vuelve al primer tab');

async function ejecutar(scenario) {
  await pagina.locator(`[data-scenario="${scenario}"]`).click();
  await pagina.locator('#run-button').click();
  await pagina.waitForFunction(
    () => /Diagnóstico completo/.test(document.querySelector('#incident-state')?.textContent || ''),
    null,
    { timeout: 15000 }
  );
  await pagina.waitForTimeout(150);
  return pagina.evaluate(() => ({
    title: document.querySelector('#incident-title')?.textContent.trim() || '',
    state: document.querySelector('#incident-state')?.textContent.trim() || '',
    sub: document.querySelector('#incident-sub')?.textContent.trim() || '',
    actual: document.querySelector('#actual-value')?.textContent.trim() || '',
    trace: document.querySelector('#trace-state')?.textContent.trim() || '',
    done: document.querySelectorAll('.trace-event.done').length,
    approveDisabled: document.querySelector('#approve-button')?.disabled,
    rejectDisabled: document.querySelector('#reject-button')?.disabled,
    note: document.querySelector('#approval-note')?.textContent.trim() || ''
  }));
}

const missingUi = await ejecutar('missing');
comprobar(/Observación 2025 ausente/.test(missingUi.title) && /6 años/.test(missingUi.actual), 'UI·missing: periodo ausente visible');
comprobar(/PAUSADO/.test(missingUi.trace) && missingUi.done === 5 && missingUi.approveDisabled === false, 'UI·missing: traza, pausa humana y aprobación habilitada');
const duplicateUi = await ejecutar('duplicate');
comprobar(/Clave anual duplicada/.test(duplicateUi.title) && /24 filas/.test(duplicateUi.actual), 'UI·duplicate: duplicados visibles');
const schemaUi = await ejecutar('schema');
comprobar(/Contrato de esquema alterado/.test(schemaUi.title) && /5 válidos/.test(schemaUi.actual), 'UI·schema: contrato alterado visible');

/* Volver a missing para bloquear imputación y aprobar backfill */
await pagina.locator('[data-scenario="missing"]').click();
await pagina.locator('#run-button').click();
await pagina.waitForFunction(() => /Diagnóstico completo/.test(document.querySelector('#incident-state')?.textContent || ''), null, { timeout: 15000 });
await pagina.locator('[data-plan-option="forward"]').click();
const forward = await pagina.evaluate(() => ({
  plan: document.querySelector('#plan-name')?.textContent.trim() || '',
  disabled: document.querySelector('#approve-button')?.disabled,
  note: document.querySelector('#approval-note')?.textContent.trim() || ''
}));
comprobar(/Imputar valor anterior/.test(forward.plan) && forward.disabled === true && /Bloqueado/.test(forward.note), 'UI: la imputación queda deshabilitada y explicada');

await pagina.locator('[data-plan-option="backfill"]').click();
await pagina.locator('#approve-button').click();
const modalVisible = await pagina.locator('#approval-modal').isVisible();
await pagina.locator('#confirm-approval').click();
await pagina.waitForFunction(() => /Sandbox validado/.test(document.querySelector('#incident-state')?.textContent || ''), null, { timeout: 10000 });
const aprobado = await pagina.evaluate(() => ({
  state: document.querySelector('#incident-state')?.textContent.trim() || '',
  trace: document.querySelector('#trace-state')?.textContent.trim() || '',
  note: document.querySelector('#approval-note')?.textContent.trim() || '',
  artifact: JSON.parse(document.querySelector('#artifact-json')?.textContent || '{}')
}));
comprobar(modalVisible, 'UI: la aprobación exige un modal de confirmación humana');
comprobar(/Sandbox validado/.test(aprobado.state) && /RECIBO/.test(aprobado.trace) && /0 escrituras/.test(aprobado.note), 'UI: la aprobación produce recibo y cero escrituras');
comprobar(aprobado.artifact.status === 'sandbox_simulation_completed' && aprobado.artifact.human_approval === true && aprobado.artifact.external_writes === 0, 'UI: el artefacto refleja el sandbox y la aprobación humana');

/* Rechazo */
await pagina.locator('[data-scenario="duplicate"]').click();
await pagina.locator('#run-button').click();
await pagina.waitForFunction(() => /Diagnóstico completo/.test(document.querySelector('#incident-state')?.textContent || ''), null, { timeout: 15000 });
await pagina.locator('#reject-button').click();
await pagina.waitForTimeout(300);
const rechazo = await pagina.evaluate(() => ({
  state: document.querySelector('#incident-state')?.textContent.trim() || '',
  trace: document.querySelector('#trace-state')?.textContent.trim() || '',
  note: document.querySelector('#approval-note')?.textContent.trim() || '',
  artifact: JSON.parse(document.querySelector('#artifact-json')?.textContent || '{}')
}));
comprobar(/rechazada/i.test(rechazo.state) && /SIN EFECTO/.test(rechazo.trace) && /no se modificó/i.test(rechazo.note), 'UI: el rechazo termina sin efecto');
comprobar(rechazo.artifact.status === 'rejected' && rechazo.artifact.external_writes === 0, 'UI: el artefacto del rechazo no declara escrituras');

/* Accesibilidad de SVG y teclado de alternativas */
const a11y = await pagina.evaluate(() => ({
  sankeyFocusable: [...document.querySelectorAll('#sankey g[tabindex="0"]')].length,
  heatFocusable: [...document.querySelectorAll('#heatmap [tabindex="0"]')].length,
  traceFocusable: [...document.querySelectorAll('#trace [tabindex="0"]')].length,
  planButtons: document.querySelectorAll('[data-plan-option]').length
}));
comprobar(a11y.sankeyFocusable >= 6 && a11y.heatFocusable === 24 && a11y.traceFocusable === 6 && a11y.planButtons === 4, 'Sankey, matriz, traza y alternativas tienen controles accesibles');
await pagina.locator('[data-plan-option="quarantine"]').focus();
await pagina.keyboard.press('Enter');
comprobar(await pagina.locator('[data-plan-option="quarantine"]').getAttribute('aria-pressed') === 'true', 'la alternativa se puede seleccionar con teclado');

/* Móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await movil.goto(`${URL}?local=1`, { waitUntil: 'load' });
await movil.waitForTimeout(500);
const movilDatos = await movil.evaluate(() => {
  const tabs = document.querySelector('.scenario-tabs');
  const active = document.querySelector('[role="tab"][aria-selected="true"]');
  const track = tabs?.getBoundingClientRect();
  const tabRect = active?.getBoundingClientRect();
  return {
    overflow: document.documentElement.scrollWidth - innerWidth,
    scenarios: [...document.querySelectorAll('[data-scenario]')].map((n) => Math.round(n.getBoundingClientRect().height)),
    strip: Math.round(document.querySelector('.scenario-strip').getBoundingClientRect().height),
    tabsClient: tabs?.clientWidth || 0,
    tabsScroll: tabs?.scrollWidth || 0,
    tabsOverflowX: tabs ? getComputedStyle(tabs).overflowX : '',
    tabsScrollbar: tabs ? getComputedStyle(tabs).scrollbarWidth : '',
    activeVisible: Boolean(track && tabRect && tabRect.left >= track.left - 1 && tabRect.right <= track.right + 1),
    hint: getComputedStyle(document.querySelector('.chart-hint')).display
  };
});
comprobar(movilDatos.overflow <= 0, `390px: sin desbordamiento de página (${movilDatos.overflow})`);
comprobar(movilDatos.scenarios.length === 3 && movilDatos.scenarios.every((alto) => alto > 30) && movilDatos.strip > 80, '390px: los tres tabs permanecen visibles en una tira adaptable');
comprobar(movilDatos.tabsScroll > movilDatos.tabsClient && movilDatos.tabsOverflowX === 'auto' && movilDatos.tabsScrollbar === 'none', '390px: los tabs se desplazan horizontalmente sin barra de scroll permanente');
comprobar(movilDatos.activeVisible, '390px: el tab activo queda dentro de la pista visible');
comprobar(movilDatos.hint === 'block', '390px: la pista de desplazamiento del linaje está visible');
await movil.locator('[data-scenario="schema"]').click();
await movil.waitForTimeout(250);
const movilSchema = await movil.evaluate(() => {
  const tabs = document.querySelector('.scenario-tabs');
  const active = document.querySelector('[role="tab"][aria-selected="true"]');
  const track = tabs.getBoundingClientRect();
  const tabRect = active.getBoundingClientRect();
  return {
    selected: active.id,
    title: document.querySelector('#incident-title')?.textContent || '',
    activeVisible: tabRect.left >= track.left - 1 && tabRect.right <= track.right + 1,
    scrollLeft: tabs.scrollLeft
  };
});
comprobar(movilSchema.selected === 'tab-schema' && /Contrato de esquema alterado/.test(movilSchema.title) && movilSchema.activeVisible && movilSchema.scrollLeft > 0, '390px: al elegir un tab fuera de vista, la tira lo desplaza y actualiza el escenario');
await movil.locator('[data-scenario="missing"]').click();
await movil.waitForTimeout(200);
await movil.locator('#run-button').click();
await movil.waitForFunction(() => /Diagnóstico completo/.test(document.querySelector('#incident-state')?.textContent || ''), null, { timeout: 15000 });
await movil.screenshot({ path: path.join(SALIDA, 'movil.png'), fullPage: true, animations: 'disabled' });

/* Fallback sin API */
const caida = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const erroresCaida = [];
caida.on('pageerror', (e) => erroresCaida.push(`JS: ${e.message}`));
await caida.goto(`${URL}?api=http://127.0.0.1:9`, { waitUntil: 'load' });
await caida.waitForSelector('#run-button');
await caida.waitForTimeout(500);
await caida.locator('#run-button').click();
await caida.waitForFunction(() => /Diagnóstico completo/.test(document.querySelector('#incident-state')?.textContent || ''), null, { timeout: 15000 });
const caidaDatos = await caida.evaluate(() => ({
  state: document.querySelector('#incident-state')?.textContent || '',
  artifact: JSON.parse(document.querySelector('#artifact-json')?.textContent || '{}')
}));
comprobar(/Diagnóstico completo/.test(caidaDatos.state) && caidaDatos.artifact.external_writes === 0, 'fallback local: el flujo completa sin API y sin escrituras');
comprobar(erroresCaida.length === 0, `fallback local: sin errores de JavaScript (${erroresCaida.slice(0, 2).join(' | ')})`);

/* Integración en la galería y ficha del portafolio */
const area = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
await area.goto('http://127.0.0.1:8000/#/area/agentes', { waitUntil: 'load' });
await area.waitForTimeout(1200);
const areaDatos = await area.evaluate(() => {
  const item = [...document.querySelectorAll('.project-list > li')]
    .find((node) => /Data Incident Commander/.test(node.textContent || ''));
  const image = item?.querySelector('img');
  return {
    title: item?.querySelector('h2, h3')?.textContent.trim() || '',
    href: item?.querySelector('a.card-hit')?.getAttribute('href') || '',
    image: image?.getAttribute('src') || '',
    width: image?.naturalWidth || 0,
    height: image?.naturalHeight || 0,
    preserved: /Analista asistido por IA/.test(document.body.textContent || '')
  };
});
comprobar(/Data Incident Commander/.test(areaDatos.title) && /data-incident-commander/.test(areaDatos.href), 'la tarjeta abre la ficha en Agentes');
comprobar(/data-incident-commander-resumen\.jpg/.test(areaDatos.image) && areaDatos.width === 1600 && areaDatos.height === 1726, 'la tarjeta usa la portada real de 1600 × 1726');
comprobar(areaDatos.preserved, 'la tarjeta del Analista asistido se conserva en el área');

const ficha = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });
const erroresFicha = [];
ficha.on('pageerror', (e) => erroresFicha.push(`JS: ${e.message}`));
ficha.on('console', (m) => { if (m.type() === 'error') erroresFicha.push(`consola: ${m.text()}`); });
await ficha.goto('http://127.0.0.1:8000/#/area/agentes/data-incident-commander', { waitUntil: 'load' });
await ficha.waitForTimeout(2200);
const fichaDatos = await ficha.evaluate(() => {
  const frame = document.querySelector('iframe[src*="data-incident-commander"]');
  return {
    title: document.querySelector('#project-view-title')?.textContent.trim() || '',
    frame: Boolean(frame),
    src: frame?.src || '',
    height: Math.round(frame?.getBoundingClientRect().height || 0),
    content: Math.round(frame?.contentDocument?.querySelector('.workspace')?.scrollHeight || 0)
  };
});
comprobar(/Data Incident Commander/.test(fichaDatos.title) && fichaDatos.frame && /dashboards\/data-incident-commander\/index\.html/.test(fichaDatos.src), 'la ficha monta la demo en un marco same-origin');
comprobar(fichaDatos.height > 1500 && fichaDatos.height < 3000 && Math.abs(fichaDatos.height - fichaDatos.content) <= 12, `el marco ajusta su altura al workspace (${fichaDatos.height} ≈ ${fichaDatos.content})`);
comprobar(erroresFicha.length === 0, `la ficha no registra errores (${erroresFicha.slice(0, 2).join(' | ')})`);
await ficha.screenshot({ path: path.join(SALIDA, 'ficha.png'), fullPage: false, animations: 'disabled' });

await pagina.screenshot({ path: path.join(SALIDA, 'escritorio.png'), fullPage: true, animations: 'disabled' });
await navegador.close();

const hashDespues = sha256File(SNAPSHOT);
comprobar(hashAntes === hashDespues, 'el archivo del snapshot fuente permanece byte a byte intacto');
comprobar(!erroresPagina.length, `sin errores de consola en la demo (${erroresPagina.slice(0, 2).join(' | ')})`);
comprobar(!respuestas.length, `sin respuestas 4xx/5xx en la demo (${respuestas.slice(0, 2).join(' | ') || 'ninguna'})`);

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores de consola:', erroresPagina.length ? erroresPagina : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || erroresPagina.length || respuestas.length ? 1 : 0;
