import { chromium } from 'playwright';

const navegador = await chromium.launch({ channel: 'chrome' });
const EV = 'evidencias/';
const errores = [];

const p = await navegador.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

await p.goto('http://localhost:8000/#portafolio', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);

/* Entrada en pantalla: estado de las tarjetas y de sus escenas */
await p.locator('.projects').scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
console.log('escenas:', JSON.stringify(await p.evaluate(() => {
  const cards = [...document.querySelectorAll('.card')];
  return cards.map((c) => ({
    id: c.getAttribute('data-category'),
    isIn: c.classList.contains('is-in'),
    svg: !!c.querySelector('svg.scene'),
    nodos: c.querySelectorAll('svg.scene *').length,
    paradas: c.querySelectorAll('.scene-stop').length
  }));
}), null, 0));

await p.waitForTimeout(3600);
await p.locator('.projects').screenshot({ path: EV + 'areas-final.png' });

/* Detalle de cada escena, ya en reposo */
for (const id of ['dashboards', 'ciencia-de-datos', 'ingenieria-de-datos', 'ia-generativa', 'agentes']) {
  const cover = p.locator(`.card[data-category="${id}"] .cover`);
  await cover.screenshot({ path: EV + `escena-${id}.png` });
}

/* Cursor sobre la serie del área 01: recorrido manual */
const serie = p.locator('.card[data-category="dashboards"] .cover');
await serie.scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
const sb = await serie.boundingBox();
await p.mouse.move(sb.x + sb.width * 0.18, sb.y + sb.height * 0.7);
await p.waitForTimeout(260);
const kpiUno = await p.evaluate(() => {
  const t = [...document.querySelectorAll('.card[data-category="dashboards"] svg text')];
  return t.map((n) => n.textContent).filter((x) => /periodo/.test(x));
});
await p.mouse.move(sb.x + sb.width * 0.86, sb.y + sb.height * 0.7);
await p.waitForTimeout(260);
const kpiDos = await p.evaluate(() => {
  const t = [...document.querySelectorAll('.card[data-category="dashboards"] svg text')];
  return t.map((n) => n.textContent).filter((x) => /periodo/.test(x));
});
await serie.screenshot({ path: EV + 'escena-dashboards-hover-derecha.png' });
console.log('scrub izquierda:', JSON.stringify(kpiUno), '→ derecha:', JSON.stringify(kpiDos));

/* Cursor sobre una observación del área 02 */
const mod = p.locator('.card[data-category="ciencia-de-datos"] .cover');
await mod.scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
const mb = await mod.boundingBox();
await p.mouse.move(mb.x + mb.width * 0.62, mb.y + mb.height * 0.45);
await p.waitForTimeout(240);
await mod.screenshot({ path: EV + 'escena-modelos-hover.png' });
console.log('hover residuo:', JSON.stringify(await p.evaluate(() => {
  const g = document.querySelectorAll('.card[data-category="ciencia-de-datos"] svg g[opacity="1"] text');
  return [...g].map((n) => n.textContent);
})));

/* Foco de teclado: una etapa del flujo y un nodo de agentes */
const etapa = p.locator('.card[data-category="ingenieria-de-datos"] .scene-stop').nth(2);
await etapa.focus();
await p.waitForTimeout(200);
await p.locator('.card[data-category="ingenieria-de-datos"] .cover').screenshot({ path: EV + 'escena-pipeline-foco.png' });
console.log('nota etapa:', await p.evaluate(() => {
  const t = [...document.querySelectorAll('.card[data-category="ingenieria-de-datos"] svg text')];
  return t[t.length - 1].textContent;
}));

const nodo = p.locator('.card[data-category="agentes"] .scene-stop').nth(1);
await nodo.focus();
await p.waitForTimeout(200);
await p.locator('.card[data-category="agentes"] .cover').screenshot({ path: EV + 'escena-agentes-foco.png' });
console.log('nota nodo:', await p.evaluate(() => {
  const t = [...document.querySelectorAll('.card[data-category="agentes"] svg text')];
  return t[t.length - 1].textContent;
}));

/* Referencia del área 04 */
await p.locator('.card[data-category="ia-generativa"] .scene-stop').nth(1).focus();
await p.waitForTimeout(200);
await p.locator('.card[data-category="ia-generativa"] .cover').screenshot({ path: EV + 'escena-rag-foco.png' });

/* Filtro: superficie azul y reorganización */
await p.locator('button[data-filter="agentes"]').click();
await p.waitForTimeout(90);
await p.locator('.filters').screenshot({ path: EV + 'filtro-en-movimiento.png' });
await p.waitForTimeout(400);
await p.locator('.projects').screenshot({ path: EV + 'filtro-agentes.png' });
console.log('filtro:', JSON.stringify(await p.evaluate(() => {
  const pill = document.querySelector('.filters-pill');
  const activo = document.querySelector('.filters-row button[aria-pressed="true"]');
  const visibles = [...document.querySelectorAll('.card')].filter((c) => !c.hidden);
  return {
    pill: pill ? { w: Math.round(pill.getBoundingClientRect().width), t: pill.style.transform } : null,
    activo: activo.textContent,
    foco: document.activeElement === activo,
    visibles: visibles.map((c) => c.getAttribute('data-category')),
    mostradas: [...document.querySelectorAll('.card')].map((c) => getComputedStyle(c).display),
    enfocables: [...document.querySelectorAll('.card:not([hidden]) .card-hit')].filter((n) => n.offsetParent !== null).length,
    ocultosEnfocables: [...document.querySelectorAll('.card[hidden] .card-hit')].filter((n) => n.offsetParent !== null).length,
    paradasOcultas: [...document.querySelectorAll('.card[hidden] .scene-stop')].length,
    huecos: getComputedStyle(document.querySelector('.projects')).gridTemplateColumns,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
}), null, 0));

await p.locator('button[data-filter="all"]').click();
await p.waitForTimeout(500);

console.log('errores:', JSON.stringify(errores));
await navegador.close();
