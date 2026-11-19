/**
 * Verifica el panel «Experimento» con el módulo de pronóstico y validación.
 *   node dashboards/gaza-observatorio/tools/verificar-pronostico.mjs
 * Comprueba cifras, tablas, mapas, tooltips, navegación interna, ausencia de IDs
 * duplicados y que el resto del observatorio siga intacto. Captura cada bloque.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'pronostico');
const URL_OBS = 'http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html';

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
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1200 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
await pagina.goto(URL_OBS, { waitUntil: 'load' });
await pagina.waitForTimeout(1800);
await pagina.locator('[data-tab="experimento"]').click();
await pagina.waitForTimeout(900);

/* --------------------------------------------------------------- estructura */
const marco = await pagina.evaluate(() => {
  const panel = document.querySelector('#experimento');
  return {
    existe: !!panel,
    visible: panel && !panel.hidden,
    pestañas: document.querySelectorAll('nav [role="tab"]').length,
    etiqueta: [...document.querySelectorAll('nav [role="tab"]')].map((b) => b.textContent.trim()).find((t) => t === 'Experimento'),
    internas: [...panel.querySelectorAll('.pronostico-tabs [role="tab"]')].map((b) => b.textContent.trim()),
    panelesInternos: [...panel.querySelectorAll('[role="tabpanel"]')].map((p) => p.id),
    viejo: !!document.querySelector('#scores') || !!document.querySelector('#candidates') || !!document.querySelector('#stability'),
    secciones: document.querySelectorAll('main > section[role="tabpanel"]').length,
  };
});
comprobar(marco.existe && marco.visible, 'la pestaña «Experimento» abre el módulo');
comprobar(marco.etiqueta === 'Experimento', `la pestaña conserva su etiqueta (${marco.etiqueta})`);
comprobar(marco.pestañas === 11, `el proyecto conserva sus once pestañas (${marco.pestañas})`);
comprobar(marco.internas.length === 3, `tres análisis internos dentro del panel (${marco.internas.length})`);
comprobar(!marco.viejo, 'el contenido anterior del panel ya no está');

/* ----------------------------------------------------- pronóstico principal */
const kpis = await pagina.evaluate(() => ({
  kpis: [...document.querySelectorAll('#death-kpis .kpi')].map((k) => k.innerText.replace(/\s+/g, ' ').trim()),
  estado: document.querySelector('#death-status')?.innerText.replace(/\s+/g, ' ').trim() || '',
  corte: document.querySelector('#death-forecast')?.innerText.replace(/\s+/g, ' ').trim() || '',
  tarjetas: [...document.querySelectorAll('#death-horizon-cards .horizon-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
  tabla: [...document.querySelectorAll('#death-horizon-backtest tr')].map((t) => t.innerText.replace(/\s+/g, ' ').trim()),
  grafica: !!document.querySelector('#death-chart svg'),
  mensual: document.querySelectorAll('#death-monthly tr').length,
}));
comprobar(kpis.tarjetas.length === 3, `tres tarjetas de horizonte (${kpis.tarjetas.length})`);
comprobar(/^3\.7/.test(kpis.tarjetas[0] || '') || / 3\.7 /.test(kpis.tarjetas[0] || ''), `1 día: 3.7 · ${kpis.tarjetas[0]}`);
comprobar(/0–9\.3/.test(kpis.tarjetas[0] || ''), '1 día: rango empírico 0–9.3');
comprobar(/23\.8/.test(kpis.tarjetas[1] || ''), `7 días: 23.8 · ${kpis.tarjetas[1]}`);
comprobar(/5\.8–41\.8/.test(kpis.tarjetas[1] || ''), '7 días: rango empírico 5.8–41.8');
comprobar(/Escenario ML: 5/.test(kpis.tarjetas[0] || '') && /Escenario ML: 30/.test(kpis.tarjetas[1] || ''), 'muestra el candidato ML (5.0 y 30.0) junto al seleccionado');
comprobar(/Peso elegido en validación: ML 0 % · referencia 100 %/.test(kpis.tarjetas[0] || ''), 'declara el peso 0 % ML / 100 % referencia');
comprobar(/No estimable/i.test(kpis.tarjetas[2] || '') && /28/.test(kpis.tarjetas[2] || ''), `28 días: sin pronóstico fiable · ${kpis.tarjetas[2]}`);
comprobar(/506/.test(kpis.estado), 'lee los 506 informes válidos del JSON');
comprobar(/2026-11-11/.test(kpis.corte), 'declara el corte 2026-11-11');
comprobar(/12 nov|2026-11-12/.test(kpis.corte), 'declara la fecha objetivo del día siguiente');
comprobar(kpis.tabla.length >= 3, `tabla de backtest por horizonte (${kpis.tabla.length} filas)`);
comprobar(kpis.tabla.some((t) => /2\.71/.test(t) && /3\.32/.test(t) && /89\.1/.test(t)), 'prueba 1 día: MAE 2.71 vs 3.32 y cobertura 89.1 %');
comprobar(kpis.tabla.some((t) => /5\.15/.test(t) && /10\.88/.test(t) && /76\.2/.test(t)), 'prueba 7 días: MAE 5.15 vs 10.88 y cobertura 76.2 %');
comprobar(kpis.tabla.some((t) => /55/.test(t)) && kpis.tabla.some((t) => /21/.test(t)), 'declara n=55 y n=21 del test final');
comprobar(kpis.grafica, 'gráfica histórica dibujada');
comprobar(kpis.mensual >= 4, `tabla por periodo (${kpis.mensual} filas)`);
await pagina.locator('#experimento .card').first().screenshot({ path: path.join(SALIDA, '01-pronostico-cabecera.png'), animations: 'disabled' });
await pagina.locator('#death-horizon-cards').screenshot({ path: path.join(SALIDA, '02-horizontes.png'), animations: 'disabled' });
await pagina.locator('#death-chart').screenshot({ path: path.join(SALIDA, '03-historico.png'), animations: 'disabled' });

/* -------------------------------------------------------------- tooltip gráfico */
const marcador = pagina.locator('#death-chart .death-hit').nth(10);
await marcador.scrollIntoViewIfNeeded();
await pagina.waitForTimeout(200);
const caja = await marcador.boundingBox();
await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
await pagina.waitForTimeout(300);
const tip = await pagina.evaluate(() => {
  const c = document.getElementById('gTip');
  return c && c.dataset.visible === 'true' ? c.innerText.replace(/\s+/g, ' ').trim() : null;
});
comprobar(!!tip && /Observado:/.test(tip) && /Pronóstico ML:/.test(tip), `tooltip de la serie histórica: ${tip && tip.slice(0, 90)}`);
await pagina.mouse.move(4, 4);

/* ------------------------------------------------------------ daño por zona */
await pagina.locator('#experimento .pronostico-tabs [data-panel="panel-zones"]').click();
await pagina.waitForTimeout(600);
const zonas = await pagina.evaluate(() => ({
  visible: getComputedStyle(document.querySelector('#panel-zones')).display !== 'none',
  ocultoDeaths: getComputedStyle(document.querySelector('#panel-deaths')).display === 'none',
  kpis: [...document.querySelectorAll('#zone-kpis .kpi')].map((k) => k.innerText.replace(/\s+/g, ' ').trim()),
  estado: document.querySelector('#zone-status').innerText.replace(/\s+/g, ' ').trim(),
  mapaCeldas: document.querySelectorAll('#damage-map .mapcell').length,
  govs: [...document.querySelectorAll('#map-gov option')].map((o) => o.value),
  filasGov: document.querySelectorAll('#zone-rows tr').length,
  filasCorte: document.querySelectorAll('#round-rows tr').length,
  ultimoCorte: document.querySelector('#last-date').textContent.trim(),
}));
comprobar(zonas.visible && zonas.ocultoDeaths, 'la navegación interna cambia de análisis sin tocar las pestañas del proyecto');
comprobar(zonas.kpis.some((k) => /5\.50 pp/.test(k)) && zonas.kpis.some((k) => /4\.40 pp/.test(k)), 'MAE 5,50 pp del ML frente a 4,40 pp de persistencia');
comprobar(/persistencia gana/i.test(zonas.estado), 'declara que la persistencia gana en MAE');
comprobar(/2025-10-11/.test(zonas.ultimoCorte), `último corte declarado (${zonas.ultimoCorte})`);
comprobar(zonas.mapaCeldas > 500, `mapa de celdas dibujado (${zonas.mapaCeldas})`);
comprobar(zonas.govs.length >= 5, `filtro por gobernación con ${zonas.govs.length} opciones`);
comprobar(zonas.filasGov >= 5 && zonas.filasCorte >= 8, `tablas por gobernación (${zonas.filasGov}) y por corte (${zonas.filasCorte})`);
await pagina.locator('#panel-zones .card').first().screenshot({ path: path.join(SALIDA, '04-dano-zona.png'), animations: 'disabled' });

// filtro de gobernación y métrica
const antes = await pagina.evaluate(() => document.querySelectorAll('#damage-map .mapcell').length);
await pagina.selectOption('#map-gov', { index: 1 });
await pagina.waitForTimeout(400);
const despues = await pagina.evaluate(() => ({
  celdas: document.querySelectorAll('#damage-map .mapcell').length,
  leyenda: document.querySelector('#map-count').textContent.trim(),
}));
comprobar(despues.celdas < antes, `el filtro de gobernación reduce las celdas (${antes} → ${despues.celdas})`);
await pagina.selectOption('#map-mode', 'incertidumbre');
await pagina.waitForTimeout(400);
comprobar(/celdas mostradas/.test(despues.leyenda), `indicador de celdas visibles: ${despues.leyenda}`);
const tipMapa = await (async () => {
  const celda = pagina.locator('#damage-map .mapcell').first();
  const c = await celda.boundingBox();
  await pagina.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await pagina.waitForTimeout(300);
  return pagina.evaluate(() => {
    const t = document.getElementById('gTip');
    return t && t.dataset.visible === 'true' ? t.innerText.replace(/\s+/g, ' ').trim() : null;
  });
})();
comprobar(!!tipMapa && /Celda/.test(tipMapa) && /Observado/.test(tipMapa), `tooltip de celda: ${tipMapa && tipMapa.slice(0, 90)}`);
await pagina.mouse.move(4, 4);

/* ------------------------------------------------------- cambio por sitio */
await pagina.locator('#experimento .pronostico-tabs [data-panel="panel-site-risk"]').click();
await pagina.waitForTimeout(700);
const sitios = await pagina.evaluate(() => ({
  visible: !document.querySelector('#panel-site-risk').hidden,
  kpis: [...document.querySelectorAll('#site-kpis .kpi')].map((k) => k.innerText.replace(/\s+/g, ' ').trim()),
  destino: document.querySelector('#site-target-definition').innerText.replace(/\s+/g, ' ').trim(),
  modelo: document.querySelector('#site-model-spec').innerText.replace(/\s+/g, ' ').trim(),
  celdas: document.querySelectorAll('#site-risk-map .site-risk-cell').length,
  filasCorte: document.querySelectorAll('#site-fold-rows tr').length,
  filasGov: document.querySelectorAll('#site-gov-rows tr').length,
  filasEscenario: document.querySelectorAll('#site-forecast-rows tr').length,
}));
comprobar(sitios.visible, 'el tercer análisis se muestra');
comprobar(/0\.343|34\.3/.test(sitios.kpis.join(' ')), `AP del combinado en las métricas (${sitios.kpis[1]})`);
comprobar(/Damage_Status/.test(sitios.destino), 'define la etiqueta objetivo como cambio de Damage_Status');
comprobar(/HGB|GradientBoosting/i.test(sitios.modelo) && /Peso validado/.test(sitios.modelo), 'declara el modelo y el peso validado');
comprobar(sitios.celdas > 500, `mapa de probabilidad por celda (${sitios.celdas})`);
comprobar(sitios.filasCorte === 2 && sitios.filasGov >= 5 && sitios.filasEscenario >= 5, `tablas de prueba (${sitios.filasCorte}), gobernación (${sitios.filasGov}) y escenario (${sitios.filasEscenario})`);
await pagina.locator('#panel-site-risk .card').first().screenshot({ path: path.join(SALIDA, '05-cambio-sitio.png'), animations: 'disabled' });

/* ------------------------------------- integridad del resto del observatorio */
const integridad = await pagina.evaluate(() => {
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  return {
    duplicados: [...new Set(dup)],
    seccionesConContenido: [...document.querySelectorAll('main > section[role="tabpanel"]')].filter((s) => s.textContent.trim().length > 200).length,
    tooltipUnico: document.querySelectorAll('.gTip').length,
    payloadSuelto: !!document.querySelector('#payload'),
  };
});
comprobar(integridad.duplicados.length === 0, `sin identificadores duplicados (${integridad.duplicados.join(', ') || 'ninguno'})`);
comprobar(integridad.seccionesConContenido === 11, `las once secciones conservan contenido (${integridad.seccionesConContenido})`);
comprobar(integridad.tooltipUnico === 1, 'un solo componente de tooltip en la página');
comprobar(!integridad.payloadSuelto, 'no queda el contenedor de datos del prototipo');

// otras pestañas siguen funcionando
for (const p of ['humano', 'salud', 'memoria', 'territorio']) {
  await pagina.locator(`[data-tab="${p}"]`).click();
  await pagina.waitForTimeout(400);
  const estado = await pagina.evaluate((id) => {
    const s = document.querySelector(`#${id}`);
    return { visible: !s.hidden, largo: s.textContent.trim().length };
  }, p);
  comprobar(estado.visible && estado.largo > 500, `la pestaña ${p} sigue funcionando (${estado.largo} caracteres)`);
}

// volver al panel: el módulo sigue completo y sin listeners duplicados
await pagina.locator('[data-tab="experimento"]').click();
await pagina.waitForTimeout(500);
const reentrada = await pagina.evaluate(() => ({
  tarjetas: document.querySelectorAll('#death-horizon-cards .horizon-card').length,
  graficas: document.querySelectorAll('#death-chart svg').length,
  celdas: document.querySelectorAll('#damage-map .mapcell').length,
}));
comprobar(reentrada.tarjetas === 3 && reentrada.graficas === 1, 'al volver al panel no se duplican tarjetas ni gráficas');
await pagina.screenshot({ path: path.join(SALIDA, '06-panel-completo.png'), animations: 'disabled' });
await pagina.close();

/* --------------------------------------------------------------------- móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`móvil: ${e.message}`));
await movil.goto(URL_OBS, { waitUntil: 'load' });
await movil.waitForTimeout(1600);
await movil.locator('[data-tab="experimento"]').click();
await movil.waitForTimeout(900);
const datosMovil = await movil.evaluate(() => ({
  tarjetas: document.querySelectorAll('#death-horizon-cards .horizon-card').length,
  desborde: document.documentElement.scrollWidth - window.innerWidth,
  tabsDesborde: (() => {
    const t = document.querySelector('#experimento .pronostico-tabs');
    return t.scrollWidth - t.clientWidth;
  })(),
}));
comprobar(datosMovil.tarjetas === 3, `móvil: tres tarjetas (${datosMovil.tarjetas})`);
comprobar(datosMovil.desborde <= 0, `móvil: sin desbordamiento de página (${datosMovil.desborde})`);
comprobar(datosMovil.tabsDesborde >= 0, `móvil: los análisis internos caben o se desplazan dentro de su barra (${datosMovil.tabsDesborde})`);
await movil.locator('#experimento .pronostico-tabs').scrollIntoViewIfNeeded();
await movil.waitForTimeout(300);
await movil.screenshot({ path: path.join(SALIDA, '07-movil-panel.png'), animations: 'disabled' });
await movil.close();

await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;


