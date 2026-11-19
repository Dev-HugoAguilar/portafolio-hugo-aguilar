/**
 * Verifica y captura los módulos añadidos: las dos vistas de edades y las cuatro
 * vistas de «Acceso y respuesta», sobre el build servido del portafolio.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-modulos-nuevos.mjs
 *
 * Escribe capturas en `evidencias/gaza-observatorio/modulos-nuevos/`.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'modulos-nuevos');
const URL_OBS = 'http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html';

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(RAIZ, 'dashboards', 'clientes-campanas', 'node_modules', '@playwright', 'test', 'index.mjs');
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;

mkdirSync(SALIDA, { recursive: true });
const navegador = await chromium.launch();
const ok = [];
const fallos = [];
const errores = [];
const comprobar = (cond, mensaje) => (cond ? ok : fallos).push(mensaje);

const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
await pagina.goto(URL_OBS, { waitUntil: 'load' });
await pagina.waitForTimeout(1500);

const foto = async (nombre, recorte) => {
  const destino = path.join(SALIDA, nombre);
  if (recorte) await pagina.locator(recorte).first().screenshot({ path: destino, animations: 'disabled' });
  else await pagina.screenshot({ path: destino, animations: 'disabled' });
  console.log('  captura', nombre);
};

const irA = async (p) => {
  await pagina.locator(`[data-tab="${p}"]`).click();
  await pagina.waitForTimeout(700);
};

/* ------------------------------------------------------------------ pestañas */
const pestañas = await pagina.evaluate(() => [...document.querySelectorAll('nav [role="tab"]')].map((b) => ({ id: b.dataset.tab, texto: b.textContent.trim() })));
comprobar(pestañas.length === 11, `once pestañas en la navegación (${pestañas.length})`);
comprobar(pestañas.some((p) => p.id === 'respuesta' && /Acceso y respuesta/.test(p.texto)), '«Acceso y respuesta» está en la navegación');

/* -------------------------------------------------------------------- edades */
await irA('personas');
const trama = await pagina.evaluate(() => {
  const t = document.querySelectorAll('#ageWaffle .age-tile');
  const legend = [...document.querySelectorAll('#ageLegend button')];
  const ancho = document.querySelector('#ageWaffle').getBoundingClientRect().width;
  const panel = document.querySelector('#personas').getBoundingClientRect().width;
  return {
    celdas: t.length,
    colores: [...new Set([...t].map((c) => c.style.background))],
    leyenda: legend.map((b) => ({ texto: b.innerText.replace(/\s+/g, ' ').trim(), pressed: b.getAttribute('aria-pressed') })),
    detalle: document.querySelector('#ageDetail').innerText.trim(),
    ancho: Math.round(ancho),
    panel: Math.round(panel),
  };
});
comprobar(trama.celdas === 100, `trama de cien celdas (${trama.celdas})`);
comprobar(trama.colores.length === 4, `trama con cuatro franjas de color (${trama.colores.length})`);
comprobar(trama.leyenda.length === 4 && trama.leyenda[0].pressed === 'true', 'leyenda con cuatro grupos y el primero activo');
comprobar(/21,637|13,013|niños/i.test(trama.leyenda[0].texto + ' ' + trama.detalle), `conteos exactos en la leyenda y el detalle: ${trama.detalle}`);
comprobar(trama.ancho >= trama.panel - 120, `la trama ocupa el ancho disponible (${trama.ancho} de ${trama.panel})`);
await foto('01-edades-trama.png', '#personas .ageprofile-card');

// Selección de una franja
await pagina.locator('#ageLegend button[data-age-group="adults"]').click();
await pagina.waitForTimeout(300);
const detalleAdultos = await pagina.evaluate(() => ({
  detalle: document.querySelector('#ageDetail').innerText.replace(/\s+/g, ' ').trim(),
  pressed: [...document.querySelectorAll('#ageLegend button')].map((b) => b.getAttribute('aria-pressed')),
}));
comprobar(/34,795/.test(detalleAdultos.detalle) && detalleAdultos.pressed[2] === 'true', `la franja seleccionada actualiza el conteo: ${detalleAdultos.detalle}`);

// Pirámide por grupos
const piramide = await pagina.evaluate(() => {
  const filas = [...document.querySelectorAll('#ageChart .age-swarm-row')];
  return {
    filas: filas.length,
    puntos: document.querySelectorAll('#ageChart .age-swarm-row circle').length,
    enfocables: filas.filter((f) => f.getAttribute('tabindex') === '0').length,
    aria: filas[0] && filas[0].getAttribute('aria-label'),
    leyenda: document.querySelector('#personas .legend')?.innerText.replace(/\s+/g, ' ').trim() || '',
    tablaFilas: document.querySelectorAll('#ageTable > .scroll table tbody tr').length,
    tablaTexto: document.querySelector('#ageTable').innerText.replace(/\s+/g, ' ').trim().slice(0, 120),
    porcentajes: (document.querySelector('#ageChart').textContent.match(/\d+[.,]\d%/g) || []).length,
  };
});
comprobar(piramide.filas === 5, `pirámide con cinco franjas de grupo (${piramide.filas})`);
comprobar(piramide.puntos > 700, `pirámide de puntos (${piramide.puntos} puntos)`);
comprobar(piramide.enfocables === 5, 'cada franja de la pirámide es enfocable');
comprobar(/Masculino 6,930/.test(piramide.aria || ''), `aria-label con conteo y porcentaje: ${piramide.aria}`);
comprobar(piramide.porcentajes >= 10, `porcentajes escritos junto a cada franja (${piramide.porcentajes})`);
comprobar(piramide.tablaFilas === 5, `tabla accesible con cinco filas (${piramide.tablaFilas})`);
await foto('02-edades-piramide-grupos.png', '#personas .card:nth-of-type(2)');

// Modo edad individual
await pagina.selectOption('#ageMode', 'single');
await pagina.waitForTimeout(700);
const individual = await pagina.evaluate(() => ({
  filas: document.querySelectorAll('#ageChart .age-swarm-row').length,
  etiqueta: document.querySelector('#ageChart .age-swarm-row')?.getAttribute('aria-label'),
  puntos: document.querySelectorAll('#ageChart .age-swarm-row circle').length,
}));
comprobar(individual.filas === 15, `paginación de quince edades por vista (${individual.filas})`);
comprobar(/Edades 0–14/.test(await pagina.evaluate(() => document.querySelector('#ageRange').textContent)), 'rango de la primera vista anunciado');
comprobar(/Edad 0\. Masculino 560/.test(individual.etiqueta || ''), `edad individual con conteo exacto: ${individual.etiqueta}`);
await foto('03-edades-piramide-edades.png', '#personas .card:nth-of-type(2)');
await pagina.selectOption('#ageMode', 'groups');
await pagina.waitForTimeout(500);

// Tooltips en edades
const loc = await pagina.locator('#ageChart .age-swarm-row').first().boundingBox();
await pagina.mouse.move(loc.x + loc.width / 2, loc.y + loc.height / 2);
await pagina.waitForTimeout(300);
const tipEdades = await pagina.evaluate(() => {
  const c = document.getElementById('gTip');
  return c && c.dataset.visible === 'true' ? c.innerText.replace(/\s+/g, ' ').trim().slice(0, 110) : null;
});
comprobar(!!tipEdades && /Infancia|Edad/.test(tipEdades), `tooltip en la pirámide: ${tipEdades}`);

/* --------------------------------------------------------- acceso y respuesta */
await irA('respuesta');
const vistas = await pagina.evaluate(() => {
  const botones = [...document.querySelectorAll('.response-tabs [data-rview]')];
  return {
    botones: botones.map((b) => b.textContent.trim()),
    paneles: [...document.querySelectorAll('#respuesta .response-view')].map((v) => ({ id: v.id, visible: !v.hidden })),
  };
});
comprobar(vistas.botones.length === 4, `cuatro vistas en «Acceso y respuesta» (${vistas.botones.length})`);
comprobar(vistas.paneles.length === 4, 'cuatro paneles declarados');
comprobar(vistas.paneles.filter((p) => p.visible).length === 1, 'un solo panel visible a la vez');
comprobar(/Acceso|logística/i.test(vistas.botones[0]) && /Seguridad alimentaria/i.test(vistas.botones[1]) && /financiaci/i.test(vistas.botones[2]) && /Efectivo/i.test(vistas.botones[3]), `nombres de las cuatro vistas: ${vistas.botones.join(' · ')}`);

// 01 acceso logístico
const acceso = await pagina.evaluate(() => ({
  svg: !!document.querySelector('#truckFlow svg'),
  aria: document.querySelector('#truckFlow svg')?.getAttribute('aria-label') || '',
  etiquetas: document.querySelector('.flow-labels')?.innerText.replace(/\s+/g, ' ').trim() || '',
  legend: document.querySelector('.flow-legend')?.innerText.replace(/\s+/g, ' ').trim() || '',
  micro: document.querySelectorAll('#rview-acceso .micro-metrics > div').length,
}));
comprobar(acceso.svg && /480/.test(acceso.aria) && /367/.test(acceso.aria), 'acceso logístico: flujo 480 → 367 dibujado');
comprobar(/480/.test(acceso.etiquetas) && /367/.test(acceso.etiquetas), `cifras junto al flujo: ${acceso.etiquetas}`);
comprobar(acceso.micro === 3, `segunda ventana con tres métricas (${acceso.micro})`);
await foto('04-respuesta-acceso.png', '#rview-acceso');

// 02 seguridad alimentaria IPC
await pagina.locator('.response-tabs [data-rview="alimentos"]').click();
await pagina.waitForTimeout(500);
const alimentos = await pagina.evaluate(() => ({
  svg: !!document.querySelector('#ipcChart svg'),
  aria: document.querySelector('#ipcChart svg')?.getAttribute('aria-label') || '',
  activo: document.querySelector('[data-ipc].active')?.textContent,
  notas: document.querySelectorAll('.ipc-notes > div').length,
  contraste: document.querySelectorAll('.market-contrast > div').length,
}));
comprobar(alimentos.svg && /1,2 M|1.2 M/.test(alimentos.aria), `IPC dibujado: ${alimentos.aria}`);
comprobar(alimentos.notas === 3, `tres notas de lectura del IPC (${alimentos.notas})`);
comprobar(alimentos.contraste === 2, 'contraste oferta / acceso económico presente');
await foto('05-respuesta-alimentos.png', '#rview-alimentos');

// cambio de métrica del IPC
await pagina.locator('[data-ipc="share"]').click();
await pagina.waitForTimeout(400);
const ipcShare = await pagina.evaluate(() => document.querySelector('#ipcChart svg')?.getAttribute('aria-label') || '');
comprobar(/59 %|67 %/.test(ipcShare), `IPC en porcentaje: ${ipcShare}`);
await pagina.locator('[data-ipc="people"]').click();
await pagina.waitForTimeout(300);

// 03 cobertura financiera
await pagina.locator('.response-tabs [data-rview="financiamiento"]').click();
await pagina.waitForTimeout(500);
const financiamiento = await pagina.evaluate(() => ({
  filas: [...document.querySelectorAll('#fundingChart .funding-row')].map((f) => f.getAttribute('aria-label')),
  enfocables: [...document.querySelectorAll('#fundingChart .funding-row')].filter((f) => f.getAttribute('tabindex') === '0').length,
  alcance: document.querySelectorAll('#reachChart .reach-row').length,
  callout: /55,3|35,7/.test(document.querySelector('#rview-financiamiento .data-quality')?.innerText || ''),
}));
comprobar(financiamiento.filas.length === 9, `nueve sectores en cobertura financiera (${financiamiento.filas.length})`);
comprobar(financiamiento.enfocables === 9, 'los sectores son enfocables');
comprobar(financiamiento.filas.some((f) => /Seguridad alimentaria: 35\.6 por ciento financiado/.test(f || '')), `aria-label con montos y porcentaje: ${financiamiento.filas[0]}`);
comprobar(financiamiento.alcance === 9, `alcance por sector con nueve filas (${financiamiento.alcance})`);
comprobar(financiamiento.callout, 'control de consistencia del dato fuente visible');
await foto('06-respuesta-financiamiento.png', '#rview-financiamiento');

// orden por brecha
await pagina.selectOption('#fundSort', 'gap');
await pagina.waitForTimeout(400);
const primero = await pagina.evaluate(() => document.querySelector('#fundingChart .funding-row')?.getAttribute('aria-label'));
comprobar(/Seguridad alimentaria/.test(primero || ''), `el orden por brecha cambia la primera fila: ${primero}`);
await pagina.selectOption('#fundSort', 'coverage');
await pagina.waitForTimeout(300);

// 04 efectivo y mercados
await pagina.locator('.response-tabs [data-rview="efectivo"]').click();
await pagina.waitForTimeout(500);
const efectivo = await pagina.evaluate(() => ({
  metricas: [...document.querySelectorAll('#cashMetrics .cash-metric')].map((m) => m.innerText.replace(/\s+/g, ' ').trim().slice(0, 40)),
  siguiente: document.querySelectorAll('.market-next .market-next-num').length,
}));
comprobar(efectivo.metricas.length === 4, `cuatro métricas de efectivo (${efectivo.metricas.length})`);
comprobar(efectivo.siguiente === 3, 'siguiente capa analítica con tres pasos');
await foto('07-respuesta-efectivo.png', '#rview-efectivo');

// fuentes y definiciones
await pagina.locator('#responseSources').click();
await pagina.waitForTimeout(300);
const fuentes = await pagina.evaluate(() => !document.querySelector('#responseSourcesPanel').hidden);
comprobar(fuentes, 'el panel de fuentes y definiciones se abre');
await pagina.locator('#responseSources').click();

/* ------------------------------------------------------------ tooltips nuevos */
const tipsRespuesta = [];
for (const [nombre, selector] of [
  ['acceso', '#truckFlow svg'],
  ['ipc', '#ipcChart svg'],
  ['financiamiento', '#fundingChart .funding-row'],
  ['alcance', '#reachChart .reach-bars'],
  ['efectivo', '#cashMetrics .cash-metric'],
]) {
  const pestaña = { acceso: 'acceso', ipc: 'alimentos', financiamiento: 'financiamiento', alcance: 'financiamiento', efectivo: 'efectivo' }[nombre];
  await pagina.locator(`.response-tabs [data-rview="${pestaña}"]`).click();
  await pagina.waitForTimeout(400);
  const marca = pagina.locator(selector).first();
  await marca.scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(200);
  const caja = await marca.boundingBox();
  await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await pagina.waitForTimeout(300);
  const t = await pagina.evaluate(() => {
    const c = document.getElementById('gTip');
    return c && c.dataset.visible === 'true' ? c.innerText.replace(/\s+/g, ' ').trim().slice(0, 90) : null;
  });
  tipsRespuesta.push(`${nombre}: ${t ? 'ok' : 'sin tooltip'}`);
  comprobar(!!t, `tooltip en ${nombre} · ${t}`);
}

/* --------------------------------------------------------------- móvil 390 px */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`JS móvil: ${e.message}`));
await movil.goto(URL_OBS, { waitUntil: 'load' });
await movil.waitForTimeout(1400);
await movil.locator('[data-tab="personas"]').click();
await movil.waitForTimeout(600);
const desbordePersonas = await movil.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
comprobar(desbordePersonas <= 0, `390 px · edades sin desbordamiento (${desbordePersonas})`);
await movil.locator('#personas .ageprofile-card').screenshot({ path: path.join(SALIDA, '08-movil-edades.png'), animations: 'disabled' });
await movil.locator('[data-tab="respuesta"]').click();
await movil.waitForTimeout(700);
const desbordeRespuesta = await movil.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
comprobar(desbordeRespuesta <= 0, `390 px · acceso y respuesta sin desbordamiento (${desbordeRespuesta})`);
await movil.locator('#rview-acceso').screenshot({ path: path.join(SALIDA, '09-movil-respuesta.png'), animations: 'disabled' });
await movil.close();

await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;


