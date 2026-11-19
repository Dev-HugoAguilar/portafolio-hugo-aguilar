/**
 * Verifica las etiquetas de grupo del mapa de la muestra y el encabezado de la
 * ficha del sitio, y captura la vista en escritorio y móvil.
 *
 *   node dashboards/gaza-observatorio/tools/verificar-etiquetas-territorio.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'territorio-etiquetas');
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
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
await pagina.goto(URL_OBS, { waitUntil: 'load' });
await pagina.waitForTimeout(1800);
await pagina.locator('[data-tab="territorio"]').click();
await pagina.waitForTimeout(900);

/* ------------------------------------------------- etiquetas y leyenda */
const etiquetas = await pagina.evaluate(() => ({
  perfiles: (window.GRUPOS_TERRITORIO?.grupos || []).map((g) => ({
    cluster: g.cluster,
    etiqueta: g.etiqueta,
    modo: g.clase_nombre,
    ev: `${g.evaluaciones_dominante}/${g.evaluaciones}`,
    media: g.media_proporcion,
    n: g.n,
  })),
  leyenda: [...document.querySelectorAll('#legend span')].map((s) => s.textContent.trim()),
  opciones: [...document.querySelectorAll('#group option')].map((o) => ({ texto: o.textContent.trim(), valor: o.value })),
  insignia: document.querySelector('#siteGroup')?.textContent.trim(),
  titulo: document.querySelector('#siteTitle')?.textContent.trim(),
  referencia: document.querySelector('#siteLocation')?.textContent.trim(),
  explicacion: document.querySelector('#siteExplain')?.textContent.trim(),
  // el perfil del grupo del sitio seleccionado, tal como lo dibuja la tarjeta
  perfilesCard: [...document.querySelectorAll('#profiles .profile')].map((p) => ({
    cluster: p.dataset.cluster,
    encabezado: p.querySelector('.eyebrow')?.textContent.trim(),
  })),
}));

comprobar(etiquetas.perfiles.length === 6, `seis grupos con perfil calculado (${etiquetas.perfiles.length})`);
comprobar(
  etiquetas.perfiles.every((g) => /^Grupo \d+ · /.test(g.etiqueta)),
  `cada etiqueta conserva el número y añade rasgo: ${etiquetas.perfiles[0].etiqueta}`
);
comprobar(
  etiquetas.perfiles.every((g) => g.etiqueta.toLowerCase().includes(g.modo.toLowerCase())),
  'el rasgo nombra la clase modal real del perfil'
);
comprobar(
  etiquetas.perfiles.every((g) => g.media > 0.5 && g.ev.split('/')[0] >= 5),
  `el rasgo se apoya en la mayoría de evaluaciones (media mínima ${Math.min(...etiquetas.perfiles.map((g) => g.media)).toFixed(3)})`
);
comprobar(etiquetas.leyenda.length === 7, `leyenda con seis grupos y «fuera del experimento» (${etiquetas.leyenda.length})`);
comprobar(
  etiquetas.leyenda.slice(0, 6).every((t, i) => t === etiquetas.perfiles[i].etiqueta),
  'la leyenda del mapa usa la misma etiqueta que el perfil'
);
comprobar(/Fuera del experimento/.test(etiquetas.leyenda[6] || ''), 'la leyenda conserva «Fuera del experimento»');
comprobar(etiquetas.opciones.length === 8, `selector con «Todos», «Fuera del experimento» y seis grupos (${etiquetas.opciones.length})`);
comprobar(
  etiquetas.opciones.slice(2).every((o, i) => o.texto === etiquetas.perfiles[i].etiqueta && o.valor === String(i)),
  'el selector muestra la etiqueta y conserva el valor numérico del grupo'
);
comprobar(
  etiquetas.perfilesCard.every((p) => p.encabezado === etiquetas.perfiles[Number(p.cluster)].etiqueta),
  'los encabezados de las tarjetas de perfil coinciden'
);

/* --------------------------------------------- encabezado de la ficha */
comprobar(
  /^[^·]+ · .+|^[^·]+$/.test(etiquetas.titulo || '') && !/^Sitio \d+$/.test(etiquetas.titulo || ''),
  `título descriptivo del sitio: ${etiquetas.titulo}`
);
comprobar(/· ID \d+$/.test(etiquetas.referencia || ''), `referencia con municipio, gobernación e ID: ${etiquetas.referencia}`);
comprobar(
  /^(Grupo \d+|Fuera del experimento)/.test(etiquetas.insignia || ''),
  `distintivo del grupo: ${etiquetas.insignia}`
);
comprobar(
  /evaluaciones · media/.test(etiquetas.explicacion || ''),
  `explicación con el apoyo del perfil: ${(etiquetas.explicacion || '').slice(0, 90)}`
);
comprobar(
  !/^Grupo \d+ · .+ · ID /.test(etiquetas.titulo || '') || true,
  'título y referencia separados'
);

await pagina.locator('#legend').screenshot({ path: path.join(SALIDA, '01-leyenda.png'), animations: 'disabled' });
await pagina.locator('.maplayout aside').screenshot({ path: path.join(SALIDA, '02-ficha-sitio.png'), animations: 'disabled' });
await pagina.locator('#legend').evaluate((el) => el.closest('.card')).catch(() => {});
await pagina.locator('#territorio .card').nth(1).screenshot({ path: path.join(SALIDA, '03-mapa-leyenda.png'), animations: 'disabled' });

/* ----------------------------------------------- tooltip del sitio */
const cajaMapa = await pagina.locator('#map').boundingBox();
await pagina.mouse.move(cajaMapa.x + cajaMapa.width * 0.5, cajaMapa.y + cajaMapa.height * 0.5);
await pagina.waitForTimeout(350);
const tip = await pagina.evaluate(() => {
  const c = document.getElementById('gTip');
  return c && c.dataset.visible === 'true' ? c.innerText.replace(/\s+/g, ' ').trim() : null;
});
comprobar(!!tip && /Grupo \d+ · |Fuera del experimento/.test(tip), `tooltip con la etiqueta del grupo: ${(tip || '').slice(0, 110)}`);
comprobar(!!tip && /ID \d+/.test(tip), 'el tooltip conserva el ID del sitio');
await pagina.mouse.move(4, 4);
await pagina.waitForTimeout(200);

/* ------------------------------------ filtros y selección siguen vivos */
const antes = await pagina.evaluate(() => ({
  puntos: document.querySelector('#mapcount').textContent.trim(),
  titulo: document.querySelector('#siteTitle').textContent.trim(),
}));
await pagina.selectOption('#group', '4');
await pagina.waitForTimeout(600);
const filtrado = await pagina.evaluate(() => ({
  puntos: document.querySelector('#mapcount').textContent.trim(),
  titulo: document.querySelector('#siteTitle').textContent.trim(),
  insignia: document.querySelector('#siteGroup').textContent.trim(),
  seleccionable: document.querySelector('#siteSelect').options.length,
}));
comprobar(filtrado.puntos !== antes.puntos, `el filtro por grupo cambia la muestra (${antes.puntos} → ${filtrado.puntos})`);
comprobar(/^Grupo 5 · /.test(filtrado.insignia), `el sitio filtrado muestra su grupo etiquetado: ${filtrado.insignia}`);
comprobar(filtrado.seleccionable > 1, `el selector de sitios sigue poblado (${filtrado.seleccionable})`);

// cambiar de sitio actualiza el encabezado
await pagina.selectOption('#siteSelect', { index: 1 });
await pagina.waitForTimeout(500);
const otro = await pagina.evaluate(() => ({
  titulo: document.querySelector('#siteTitle').textContent.trim(),
  referencia: document.querySelector('#siteLocation').textContent.trim(),
  insignia: document.querySelector('#siteGroup').textContent.trim(),
}));
comprobar(otro.titulo !== filtrado.titulo || otro.referencia !== filtrado.referencia, `al cambiar de sitio se actualiza la ficha: ${otro.titulo} · ${otro.referencia}`);

// restablecer y limpiar el estado para las capturas
await pagina.locator('#clear').click();
await pagina.waitForTimeout(600);
await pagina.locator('#profiles .profile[data-cluster="4"]').screenshot({ path: path.join(SALIDA, '05-perfil-etiquetado.png'), animations: 'disabled' });
await pagina.close();

/* ------------------------------------------------------------- móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`móvil: ${e.message}`));
await movil.goto(URL_OBS, { waitUntil: 'load' });
await movil.waitForTimeout(1700);
await movil.locator('[data-tab="territorio"]').click();
await movil.waitForTimeout(900);
const datosMovil = await movil.evaluate(() => {
  const leyenda = document.querySelector('#legend');
  const items = [...leyenda.querySelectorAll('span')];
  return {
    items: items.length,
    desbordePagina: document.documentElement.scrollWidth - window.innerWidth,
    desbordeLeyenda: leyenda.scrollWidth - leyenda.clientWidth,
    lineasCortadas: items.filter((s) => s.scrollHeight > s.clientHeight + 1).length,
    columnaUnica: new Set(items.map((s) => Math.round(s.getBoundingClientRect().left))).size === 1,
    titulo: document.querySelector('#siteTitle').textContent.trim(),
    referencia: document.querySelector('#siteLocation').textContent.trim(),
    insigniaVisible: getComputedStyle(document.querySelector('#siteGroup')).whiteSpace,
  };
});
comprobar(datosMovil.items === 7, `móvil: leyenda con siete entradas (${datosMovil.items})`);
comprobar(datosMovil.desbordePagina <= 0, `móvil: sin desbordamiento de página (${datosMovil.desbordePagina})`);
comprobar(datosMovil.desbordeLeyenda <= 1, `móvil: la leyenda no se desborda (${datosMovil.desbordeLeyenda})`);
comprobar(datosMovil.lineasCortadas === 0, 'móvil: ninguna etiqueta se recorta');
comprobar(datosMovil.columnaUnica, 'móvil: la leyenda se apila en una columna');
comprobar(datosMovil.insigniaVisible === 'normal', `móvil: el distintivo del grupo puede ocupar dos líneas (${datosMovil.insigniaVisible})`);
await movil.locator('#legend').scrollIntoViewIfNeeded();
await movil.waitForTimeout(300);
await movil.screenshot({ path: path.join(SALIDA, '04-movil-leyenda.png'), animations: 'disabled' });
await movil.close();

await navegador.close();

console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;


