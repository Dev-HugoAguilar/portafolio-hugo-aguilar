/**
 * Verificación real de RetailOps Unified en el portafolio.
 *
 *   node tools/verificar-retailops.mjs
 *
 * Requiere Chrome del sistema y el servidor local en http://127.0.0.1:8000.
 * Las pruebas DOM del paquete no sustituyen este recorrido: aquí se prueban
 * clics reales, zoom, arrastre, reset, Ubicar líder, capas y layout.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = 'D:/Portafolio/Portafolio_Hugo_Aguilar';
const EVIDENCIAS = path.join(RAIZ, 'evidencias', 'retailops');
const BASE = process.env.RETAILOPS_BASE || 'http://127.0.0.1:8000';
const DEMO = `${BASE}/dashboards/retailops/index.html`;
const FICHA = `${BASE}/#/area/ciencia-de-datos/retailops`;
const TABLERO = `${BASE}/#/area/ciencia-de-datos`;

let playwright;
try {
  playwright = await import('@playwright/test');
} catch {
  const ruta = path.join(
    RAIZ,
    'dashboards',
    'clientes-campanas',
    'node_modules',
    '@playwright',
    'test',
    'index.mjs',
  );
  playwright = await import(pathToFileURL(ruta).href);
}
const { chromium } = playwright;
const ok = [];
const fallos = [];
const detalles = [];
const comprobar = (condicion, etiqueta, detalle = '') => {
  (condicion ? ok : fallos).push(etiqueta);
  if (detalle) detalles.push(`${condicion ? 'OK ' : 'FALLO'} · ${etiqueta}: ${detalle}`);
};

mkdirSync(EVIDENCIAS, { recursive: true });
const navegador = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist'] });

const leerMapa = (frame) =>
  frame.evaluate(() => ({
    zoom: document.querySelector('#mapZoomReadout')?.textContent || '',
    viewBox: document.querySelector('#atlasMap')?.getAttribute('viewBox') || '',
    store: document.querySelector('#store')?.value || '',
    borough: document.querySelector('#borough')?.value || '',
    format: document.querySelector('#format')?.value || '',
    period: document.querySelector('#period')?.value || '',
    unit: document.querySelector('#mapUnit')?.textContent || '',
    heatMethod: document.querySelector('#heatMethod')?.textContent || '',
    leader: document.querySelector('#mapLeader')?.innerText || '',
    leaderAmount: document.querySelector('.leader-amount')?.innerText || '',
    stores: document.querySelectorAll('#atlasMap [data-store]').length,
    boroughs: document.querySelectorAll('#atlasMap [data-borough]').length,
    heatFilter: Boolean(document.querySelector('#atlasMap filter#heatSoftEdges')),
    heatArea: document.querySelectorAll('#atlasMap [filter="url(#heatSoftEdges)"]').length,
    activeLayer: [...document.querySelectorAll('.territory-toolbar button[aria-pressed="true"]')].map((b) => b.innerText.trim()),
    outDisabled: Boolean(document.querySelector('[data-map-control="out"]')?.disabled),
    readout: document.querySelector('#mapReadout')?.innerText || '',
    outline: document.activeElement ? getComputedStyle(document.activeElement).outlineStyle : '',
  }));

try {
  // 1. Página integrada: ficha, iframe y estado inicial.
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });

  await pagina.goto(TABLERO, { waitUntil: 'load', timeout: 90_000 });
  await pagina.waitForSelector('#area-view-title', { timeout: 60_000 });
  await pagina.waitForTimeout(900);
  const area = await pagina.evaluate(() => ({
    title: document.querySelector('#area-view-title')?.innerText || '',
    body: document.body.innerText,
  }));
  const tarjetas = await pagina.locator('#project-link-retailops').count();
  comprobar(/Ciencia de datos y Machine Learning/.test(area.title), 'área Machine Learning localizada', area.title);
  comprobar(tarjetas === 1, 'una sola tarjeta RetailOps en Machine Learning', String(tarjetas));
  comprobar(area.body.includes('MACHINE LEARNING') && area.body.includes('RetailOps Unified'), 'tarjeta con categoría Machine Learning y título RetailOps');

  await pagina.locator('#project-link-retailops').click();
  await pagina.waitForSelector('#project-view-title', { timeout: 60_000 });
  await pagina.waitForTimeout(1000);
  const ficha = await pagina.evaluate(() => ({
    hash: location.hash,
    h1: document.querySelector('#project-view-title')?.innerText || '',
    sub: document.querySelector('.view-subtitle')?.innerText || '',
    summary: document.querySelector('.view-summary')?.innerText || '',
    chips: [...document.querySelectorAll('.view-chips')].find((e) => e.offsetParent !== null)?.innerText || '',
    fields: [...document.querySelectorAll('.project-fields dt')].map((x) => x.innerText),
    groups: [...document.querySelectorAll('.field-tecnologias dt')].map((x) => x.innerText),
    cta: [...document.querySelectorAll('.view-chips a')].map((a) => ({ text: a.innerText.trim(), href: a.href, target: a.target })),
  }));
  comprobar(ficha.hash === '#/area/ciencia-de-datos/retailops', 'la tarjeta abre la ficha nativa', ficha.hash);
  comprobar(ficha.h1 === 'RetailOps Unified' && /Machine learning/.test(ficha.sub), 'título y subtítulo editoriales', `${ficha.h1} — ${ficha.sub}`);
  comprobar(/MACHINE LEARNING/i.test(ficha.chips), 'categoría Machine Learning visible en la ficha', ficha.chips);
  comprobar(/PUBLICADO/i.test(ficha.chips), 'estado editorial publicado', ficha.chips);
  comprobar(/Predicción de retrasos con red neuronal/.test(ficha.summary), 'resumen editorial visible en la ficha', ficha.summary);
  comprobar(['Problema','Destinatario','Mi contribución','Fuentes y datos','Método y decisiones técnicas','Resultados publicados','Limitaciones','Tecnologías'].every((x) => ficha.fields.includes(x)), 'ocho apartados completos en la ficha', ficha.fields.join(' · '));
  comprobar(ficha.groups.length >= 3, 'tecnologías agrupadas presentes', ficha.groups.join(' · '));
  comprobar(ficha.cta.length === 0, 'sin botón Ver demo ni CTA duplicada', JSON.stringify(ficha.cta));
  await pagina.waitForSelector('iframe', { state: 'attached', timeout: 60_000 });
  await pagina.waitForTimeout(2000);
  const marco = pagina.frames().find((f) => f.url() === DEMO);
  comprobar(Boolean(marco), 'la ficha monta el HTML RetailOps instalado');
  if (!marco) throw new Error('No se encontró el iframe de RetailOps');
  await marco.waitForSelector('#atlasMap', { timeout: 30_000 });
  await marco.waitForTimeout(1000);
  // La navegación desde el catálogo puede cancelar scripts defer ya iniciados;
  // la consola que importa es la de esta ficha ya montada.
  errores.length = 0;

  const outer = await pagina.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    c: document.documentElement.clientWidth,
    h: document.body.scrollHeight,
    src: document.querySelector('iframe')?.src || '',
  }));
  const inner = await marco.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    c: document.documentElement.clientWidth,
    h: document.body.scrollHeight,
    masthead: getComputedStyle(document.querySelector('.masthead')).display,
    scrollH: document.documentElement.scrollHeight,
    scrollClientH: document.documentElement.clientHeight,
  }));
  comprobar(outer.src === DEMO, 'iframe apunta al asset correcto', outer.src);
  comprobar(outer.w === outer.c, 'ficha 1440 sin overflow global', `${outer.w}/${outer.c}`);
  comprobar(inner.w === inner.c, 'documento RetailOps 1440 sin overflow', `${inner.w}/${inner.c}`);
  comprobar(inner.masthead === 'none', 'cabecera interna de la demo retirada en el embed', inner.masthead);
  comprobar(inner.scrollH <= inner.scrollClientH + 2, 'sin scrollbar vertical interno que corte el iframe', `${inner.scrollH}/${inner.scrollClientH} · scrolling=${await pagina.evaluate(() => document.querySelector('iframe').getAttribute('scrolling'))}`);

  let m = await leerMapa(marco);
  comprobar(m.zoom === '100%' && m.viewBox === '0 0 820 940', 'estado inicial: zoom 100 % y extensión CDMX', JSON.stringify({ zoom: m.zoom, viewBox: m.viewBox }));
  comprobar(m.unit.includes('CALOR POR SUCURSAL'), 'vista inicial Calor por sucursal', m.unit);
  comprobar(m.activeLayer.includes('Calor por sucursal') && m.activeLayer.includes('Ventas simuladas'), 'capa y métrica iniciales', m.activeLayer.join(' · '));
  comprobar(m.stores === 51 && m.boroughs === 16, '51 tiendas y 16 alcaldías en el SVG', `${m.stores}/${m.boroughs}`);
  comprobar(m.heatFilter && m.heatArea > 0, 'capa de intensidad gaussiana renderizada', `${m.heatFilter}/${m.heatArea}`);
  comprobar(m.leader.includes('Toreo') && m.leaderAmount.includes('$241,760'), 'tarjeta de líder inicial Toreo con importe', m.leader.replace(/\n/g, ' | '));
  comprobar(m.heatMethod.includes('σ ≈ 2 km') && /no suma tiendas vecinas/.test(m.heatMethod), 'método de calor y máximo local explícitos', m.heatMethod);

  // 2. Controles en el iframe integrado.
  const svg = marco.locator('#atlasMap');
  await svg.scrollIntoViewIfNeeded();
  await marco.locator('[data-map-control="in"]').click();
  await pagina.waitForTimeout(250);
  m = await leerMapa(marco);
  comprobar(m.zoom === '130%', '+ lleva de 100 % a 130 % una sola vez', m.zoom);
  await pagina.screenshot({ path: path.join(EVIDENCIAS, 'zoom-130-1440.png'), timeout: 60_000 });

  await marco.locator('[data-map-control="out"]').click();
  await pagina.waitForTimeout(250);
  m = await leerMapa(marco);
  comprobar(m.zoom === '100%' && m.outDisabled, '− vuelve a 100 % y se desactiva en el mínimo', `${m.zoom} · disabled=${m.outDisabled}`);

  // Arrastrar el SVG y comprobar que no selecciona una tienda.
  await svg.scrollIntoViewIfNeeded();
  const caja = await svg.boundingBox();
  const antesArrastre = await leerMapa(marco);
  const cx = caja.x + caja.width / 2;
  const cy = caja.y + caja.height / 2;
  await pagina.mouse.move(cx, cy);
  await pagina.mouse.down();
  await pagina.mouse.move(cx + 70, cy + 35, { steps: 10 });
  await pagina.mouse.up();
  await pagina.waitForTimeout(300);
  const despuesArrastre = await leerMapa(marco);
  comprobar(despuesArrastre.viewBox !== antesArrastre.viewBox, 'arrastrar cambia el viewBox', `${antesArrastre.viewBox} → ${despuesArrastre.viewBox}`);
  comprobar(despuesArrastre.store === 'all', 'arrastrar no selecciona una sucursal', despuesArrastre.store);
  await marco.locator('[data-map-control="in"]').click();
  await pagina.waitForTimeout(250);
  m = await leerMapa(marco);
  comprobar(m.zoom === '130%', 'los controles siguen funcionando después de arrastrar', m.zoom);
  const capaTrasArrastre = marco.locator('.territory-toolbar button').filter({ hasText: 'Sucursales' }).first();
  await capaTrasArrastre.click();
  await pagina.waitForTimeout(250);
  m = await leerMapa(marco);
  comprobar(m.activeLayer.includes('Sucursales'), 'capa funciona después de arrastrar y hacer zoom', m.activeLayer.join(' · '));
  await marco.locator('.territory-toolbar button').filter({ hasText: 'Calor por sucursal' }).first().click();
  await pagina.waitForTimeout(200);

  await marco.locator('[data-map-control="reset"]').click();
  await pagina.waitForTimeout(250);
  m = await leerMapa(marco);
  comprobar(m.zoom === '100%' && m.viewBox === '0 0 820 940', '↺ restablece extensión y desplazamiento', `${m.zoom} · ${m.viewBox}`);
  await pagina.screenshot({ path: path.join(EVIDENCIAS, 'reset-1440.png'), timeout: 60_000 });

  // 3. Ubicar líder y filtros.
  const filtrosAntes = await marco.evaluate(() => ({
    store: document.querySelector('#store').value,
    borough: document.querySelector('#borough').value,
    format: document.querySelector('#format').value,
    period: document.querySelector('#period').value,
  }));
  await marco.locator('[data-map-control="leader"]').click();
  await pagina.waitForTimeout(300);
  m = await leerMapa(marco);
  const filtrosDespues = await marco.evaluate(() => ({
    store: document.querySelector('#store').value,
    borough: document.querySelector('#borough').value,
    format: document.querySelector('#format').value,
    period: document.querySelector('#period').value,
  }));
  comprobar(m.zoom === '300%', 'Ubicar líder centra a 300 %', m.zoom);
  comprobar(JSON.stringify(filtrosAntes) === JSON.stringify(filtrosDespues), 'Ubicar líder conserva los filtros', JSON.stringify(filtrosDespues));
  await pagina.screenshot({ path: path.join(EVIDENCIAS, 'lider-300-1440.png'), timeout: 60_000 });

  // 4. Capas y métricas después de zoom/arrastre.
  await marco.locator('[data-map-control="reset"]').click();
  await pagina.waitForTimeout(200);
  for (const etiqueta of ['Sucursales', 'Alcaldías', 'Calor por sucursal']) {
    const boton = marco.locator('.territory-toolbar button').filter({ hasText: etiqueta }).first();
    await boton.click();
    await pagina.waitForTimeout(250);
    m = await leerMapa(marco);
    comprobar(m.activeLayer.includes(etiqueta), `capa ${etiqueta} activa`, m.activeLayer.join(' · '));
  }
  for (const etiqueta of ['Pedidos', 'Retrasos', 'Ventas simuladas']) {
    const boton = marco.locator('.territory-toolbar button').filter({ hasText: etiqueta }).first();
    await boton.click();
    await pagina.waitForTimeout(200);
    m = await leerMapa(marco);
    comprobar(m.activeLayer.includes(etiqueta), `métrica ${etiqueta} activa`, m.activeLayer.join(' · '));
  }

  // 5. Ranking enlaza el filtro global.
  const ranking = marco.locator('#mapRanks button').first();
  await ranking.click();
  await pagina.waitForTimeout(300);
  const filtroRanking = await leerMapa(marco);
  comprobar(filtroRanking.store !== 'all', 'clic en ranking selecciona la sucursal', filtroRanking.store);
  await marco.locator('#clearFilters').click();
  await pagina.waitForTimeout(300);
  const limpio = await leerMapa(marco);
  comprobar(limpio.store === 'all' && limpio.borough === 'all', 'Limpiar filtros restaura el alcance global', `${limpio.store}/${limpio.borough}`);

  // 6. Foco visible y teclado.
  await marco.locator('[data-map-control="in"]').focus();
  await pagina.keyboard.press('Shift');
  const foco = await marco.evaluate(() => ({
    tag: document.activeElement?.tagName,
    outline: getComputedStyle(document.activeElement).outlineStyle,
    label: document.activeElement?.getAttribute('aria-label'),
  }));
  comprobar(foco.tag === 'BUTTON' && foco.outline !== 'none', 'controles del mapa con foco visible', JSON.stringify(foco));

  // 7. Captura integrada de la zona del mapa.
  const offsetMapa1440 = await marco.evaluate(() => Math.round(document.querySelector('.territory-panel').getBoundingClientRect().top));
  await pagina.evaluate((offset) => {
    const f = document.querySelector('iframe');
    if (f) window.scrollTo(0, f.getBoundingClientRect().top + scrollY + offset - 30);
  }, offsetMapa1440);
  await pagina.waitForTimeout(350);
  await pagina.screenshot({ path: path.join(EVIDENCIAS, 'ficha-mapa-1440.png'), timeout: 60_000 });

  // 8. Layouts 1024/390 de la ficha integrada y del iframe.
  for (const ancho of [1024, 390]) {
    const ctx = await navegador.newContext({
      viewport: { width: ancho, height: 1000 },
      isMobile: ancho === 390,
      hasTouch: ancho === 390,
    });
    const p = await ctx.newPage();
    await p.goto(FICHA, { waitUntil: 'load', timeout: 90_000 });
    await p.waitForSelector('iframe', { state: 'attached', timeout: 60_000 });
    await p.waitForTimeout(2000);
    const fr = p.frames().find((f) => f.url() === DEMO);
    const o = await p.evaluate(() => ({
      w: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
      h: document.body.scrollHeight,
      iframeH: Math.round(document.querySelector('iframe').getBoundingClientRect().height),
    }));
    const i = fr
      ? await fr.evaluate(() => ({
          w: document.documentElement.scrollWidth,
          c: document.documentElement.clientWidth,
          h: document.body.scrollHeight,
          zoom: document.querySelector('#mapZoomReadout')?.textContent,
          stores: document.querySelectorAll('#atlasMap [data-store]').length,
          boroughs: document.querySelectorAll('#atlasMap [data-borough]').length,
        }))
      : null;
    comprobar(o.w === o.c, `ficha ${ancho} sin overflow global`, `${o.w}/${o.c}`);
    comprobar(Boolean(i) && i.w === i.c, `iframe RetailOps ${ancho} sin overflow`, i ? `${i.w}/${i.c}` : 'sin frame');
    comprobar(Boolean(i) && i.zoom === '100%' && i.stores === 51 && i.boroughs === 16, `iframe ${ancho} conserva mapa inicial`, i ? JSON.stringify(i) : 'sin frame');
    const offsetMapa = await fr.evaluate(() => Math.round(document.querySelector('.territory-panel').getBoundingClientRect().top));
    await p.evaluate((offset) => {
      const f = document.querySelector('iframe');
      if (f) window.scrollTo(0, f.getBoundingClientRect().top + scrollY + offset - 30);
    }, offsetMapa);
    await p.waitForTimeout(1000);
    await p.screenshot({ path: path.join(EVIDENCIAS, `ficha-mapa-${ancho}.png`), timeout: 60_000 });
    await ctx.close();
  }

  // 9. Movimiento reducido.
  const reducido = await navegador.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const pr = await reducido.newPage();
  await pr.goto(DEMO, { waitUntil: 'load', timeout: 90_000 });
  await pr.waitForSelector('#atlasMap', { timeout: 30_000 });
  await pr.waitForTimeout(800);
  const motion = await pr.evaluate(() => ({
    anim: getComputedStyle(document.querySelector('.reveal') || document.querySelector('#atlasMap')).animationName,
    canvas: getComputedStyle(document.querySelector('.territory-toolbar button')).transitionDuration,
  }));
  comprobar(motion.anim === 'none', 'movimiento reducido desactiva animaciones', JSON.stringify(motion));
  await reducido.close();

  comprobar(errores.length === 0, 'sin errores de consola/página en la ficha', errores.join(' | '));
  comprobar(await pagina.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), 'ficha final sin overflow global', '1440');
  await contexto.close();
} catch (error) {
  fallos.push(`excepción: ${error.message}`);
} finally {
  await navegador.close();
}

console.log(`RetailOps · verificación integrada · ${ok.length} OK · ${fallos.length} fallos`);
if (detalles.length) console.log(detalles.join('\n'));
if (fallos.length) {
  console.log('\nFALLOS:');
  for (const f of fallos) console.log(`- ${f}`);
  process.exitCode = 1;
} else {
  console.log('\nPASS: ficha, calor, zoom, reset, líder, capas, filtros y layouts.');
}
