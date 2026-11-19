/** Comprobación de que el sitio sigue intacto tras añadir el módulo. */
import { spawn } from 'node:child_process';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PUERTO = 9340;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const resultados = [];
const comprobar = (nombre, ok, detalle = '') => {
  resultados.push(ok);
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
};

const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--hide-scrollbars',
  `--remote-debugging-port=${PUERTO}`,'--user-data-dir=C:\\Temp\\bm-cdp7','--window-size=1440,1000','about:blank'], { stdio: 'ignore' });

let wsUrl = null;
for (let i = 0; i < 40 && !wsUrl; i += 1) {
  try { const l = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json();
    wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? null; } catch { /* arrancando */ }
  if (!wsUrl) await esperar(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = new Map(); const errores = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errores.push(m.params.exceptionDetails?.exception?.description ?? 'excepción');
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errores.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
});
const enviar = (method, params = {}) => new Promise((res) => { const n = ++id; pend.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluar = async (c) => {
  const r = await enviar('Runtime.evaluate', { expression: `(async () => { ${c} })()`, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description };
  return r.result?.result?.value;
};

await enviar('Runtime.enable');
await enviar('Page.enable');

const visitar = async (hash) => {
  await enviar('Page.navigate', { url: `http://localhost:8000/${hash}` });
  await esperar(2200);
};

// galería
await visitar('#portafolio');
const galeria = await evaluar(`
  return {
    titulo: document.title,
    areas: document.querySelectorAll('[data-area], .card, .area-card').length,
    tarjetas: document.querySelectorAll('a[href^="#/area/"]').length,
  };
`);
comprobar('La galería sigue cargando', galeria.titulo.includes('Hugo'), `${galeria.tarjetas} enlaces a áreas`);

// área de dashboards: dos proyectos
await visitar('#/area/dashboards');
const area = await evaluar(`
  const enlaces = [...document.querySelectorAll('a[href*="/comparativo-bancario"]')];
  return {
    titulo: document.title,
    proyectos: enlaces.length,
    chips: [...document.querySelectorAll('.chip')].map(c => c.textContent.trim()),
  };
`);
comprobar('El área de dashboards lista el comparativo bancario', area.proyectos >= 1,
  `${area.proyectos} enlace(s)`);
comprobar('El área muestra los estados de los proyectos', area.chips.length >= 2,
  area.chips.join(' / '));

// proyecto previo intacto
await visitar('#/area/ciencia-de-datos/prediccion-demanda');
const otro = await evaluar(`
  return {
    titulo: document.title,
    host: Boolean(document.getElementById('demo-host')),
    placeholder: Boolean(document.querySelector('.demo-placeholder')),
    errores: document.querySelectorAll('.bm-app').length,
  };
`);
comprobar('Otros proyectos siguen con su espacio reservado',
  otro.host && otro.placeholder && otro.errores === 0, JSON.stringify(otro));

// ficha del comparativo
await visitar('#/area/dashboards/comparativo-bancario');
const ficha = await evaluar(`
  // Se leen los nodos del DOM: innerText aplica text-transform (mayúsculas).
  const etiquetas = [...document.querySelectorAll('.project-fields dt')].map(d => d.textContent.trim().toLowerCase());
  const buscados = ['fuentes y datos', 'método y decisiones técnicas', 'hallazgos del análisis', 'limitaciones', 'tecnologías'];
  const texto = document.body.textContent || '';
  return {
    titulo: document.title,
    campos: buscados.filter(t => etiquetas.includes(t)).length,
    chipPublicado: [...document.querySelectorAll('.view-chips .chip')].some(c => c.textContent.trim() === 'Publicado'),
    sinNotaPlan: !texto.includes('Ficha de planificación'),
    enlaceCnvb: false,
  };
`);
// la atribución a la CNBV vive en el panel de fuentes del dashboard
ficha.enlaceCnvb = await evaluar(`
  const boton = document.querySelector('[data-testid="abrir-fuentes"]');
  if (boton) boton.click();
  await new Promise(r => setTimeout(r, 800));
  return Boolean(document.querySelector('a[href*="portafolioinfo.cnbv.gob.mx"]'));
`);
comprobar('La ficha del comparativo muestra los campos del caso',
  ficha.campos >= 4, `${ficha.campos}/5`);
comprobar('La ficha está marcada como publicada', ficha.chipPublicado === true);
comprobar('La ficha no muestra el aviso de planificación', ficha.sinNotaPlan === true);
comprobar('La ficha enlaza al portal de la CNBV', ficha.enlaceCnvb === true);

comprobar('Sin errores de JavaScript en el sitio', errores.length === 0, errores.slice(0, 2).join(' | '));

console.log(`\n${resultados.filter(Boolean).length}/${resultados.length} comprobaciones correctas`);
ws.close();
chrome.kill();
process.exit(resultados.every(Boolean) ? 0 : 1);
