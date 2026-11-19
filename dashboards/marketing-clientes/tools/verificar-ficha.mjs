/**
 * Verificación de la ficha «Marketing y clientes» y de sus «Hallazgos del análisis».
 *
 * Comprueba, en escritorio y en móvil:
 *  1. que la sección existe y trae los cuatro hallazgos (adquisición, conversión,
 *     retención y productos), cada uno con título, cifras y nota;
 *  2. que el texto publicado no contiene marcadores de error («undefined»,
 *     «NaN», «Sin datos») ni cifras sin calcular;
 *  3. que el alcance declara periodo, muestra y que se calcula sin filtros;
 *  4. que los apartados editoriales siguen en la ficha y que el estado de
 *     publicación no cambió.
 *
 * Imprime los textos publicados y guarda capturas de la ficha en cada tamaño.
 *
 * Uso: node tools/verificar-ficha.mjs
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const SITIO = process.env.MARKETING_SITIO || 'http://127.0.0.1:8000';
const DESTINO = fileURLToPath(new URL('evidencias/', new URL('../', import.meta.url)));
mkdirSync(DESTINO, { recursive: true });

const ESPERADOS = ['adquisicion', 'conversion', 'retencion', 'productos'];
const APARTADOS = [
  'Problema',
  'Destinatario',
  'Mi contribución',
  'Fuentes y datos',
  'Método y decisiones técnicas',
  'Hallazgos del análisis',
  'Limitaciones',
];
const resultados = [];
const comprobar = (nombre, correcto, detalle = '') => {
  resultados.push({ nombre, correcto });
  console.log(`${correcto ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` :: ${detalle}` : ''}`);
};

const navegador = await chromium.launch();

for (const tamano of [
  { nombre: 'escritorio', viewport: { width: 1440, height: 960 }, sufijo: 'escritorio' },
  { nombre: 'movil', viewport: { width: 390, height: 844 }, sufijo: 'movil', movil: true },
]) {
  const contexto = await navegador.newContext({
    viewport: tamano.viewport,
    deviceScaleFactor: 2,
    isMobile: Boolean(tamano.movil),
    hasTouch: Boolean(tamano.movil),
  });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('console', (mensaje) => mensaje.type() === 'error' && errores.push(mensaje.text()));
  pagina.on('pageerror', (error) => errores.push(error.message));

  await pagina.goto(`${SITIO}/#/area/dashboards/marketing-clientes`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-testid="hallazgos-host"]', { timeout: 45_000 });
  await pagina.waitForFunction(
    () => document.querySelectorAll('[data-testid^="hallazgo-"]').length >= 4,
    { timeout: 60_000 },
  );
  await pagina.waitForTimeout(1200);

  const ficha = await pagina.evaluate(() => {
    const host = document.querySelector('[data-testid="hallazgos-host"]');
    const apartados = {};
    for (const dt of document.querySelectorAll('.project-fields dt')) {
      const dd = dt.nextElementSibling;
      apartados[dt.textContent.trim()] = (dd?.textContent ?? '').replace(/\s+/g, ' ').trim();
    }
    const hallazgos = [...host.querySelectorAll('[data-testid^="hallazgo-"]')].map((nodo) => ({
      id: nodo.getAttribute('data-testid').replace('hallazgo-', ''),
      titulo: nodo.querySelector('strong')?.textContent?.trim() ?? '',
      texto: nodo.textContent.replace(/\s+/g, ' ').trim(),
      nota: nodo.querySelector('.hallazgos-nota')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    }));
    return {
      alcance:
        host
          .querySelector('[data-testid="hallazgos-alcance"]')
          ?.textContent?.replace(/\s+/g, ' ')
          .trim() ?? '',
      hallazgos,
      apartados,
      estado: document.querySelector('.view-chips')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      anchoPagina: document.documentElement.scrollWidth,
      anchoVista: window.innerWidth,
    };
  });

  const etiqueta = tamano.nombre;
  comprobar(
    `${etiqueta}: los cuatro hallazgos están publicados`,
    ESPERADOS.every((id) => ficha.hallazgos.some((hallazgo) => hallazgo.id === id)),
    ficha.hallazgos.map((hallazgo) => hallazgo.id).join(', '),
  );
  comprobar(
    `${etiqueta}: cada hallazgo trae título, cifras y nota`,
    ficha.hallazgos.every(
      (hallazgo) =>
        hallazgo.titulo.length > 12 && hallazgo.texto.length > 120 && hallazgo.nota.length > 30,
    ),
    ficha.hallazgos.map((hallazgo) => hallazgo.titulo).join(' | ').slice(0, 160),
  );
  comprobar(
    `${etiqueta}: sin marcadores de error en el texto`,
    ficha.hallazgos.every((hallazgo) => !/undefined|NaN|Sin datos|null/.test(hallazgo.texto)),
  );
  comprobar(
    `${etiqueta}: el alcance declara periodo, muestra y «sin filtros»`,
    /2020/.test(ficha.alcance) && /13,509|13 509/.test(ficha.alcance) && /sin filtros/.test(ficha.alcance),
    ficha.alcance.slice(0, 120),
  );
  comprobar(
    `${etiqueta}: los apartados editoriales están en la ficha`,
    APARTADOS.every((clave) => Boolean(ficha.apartados[clave])),
    Object.keys(ficha.apartados).join(' · '),
  );
  comprobar(
    `${etiqueta}: el estado de publicación no cambió`,
    /En desarrollo/.test(ficha.estado),
    ficha.estado,
  );
  comprobar(
    `${etiqueta}: sin desbordes horizontales`,
    ficha.anchoPagina <= ficha.anchoVista + 1,
    `${ficha.anchoPagina}/${ficha.anchoVista}`,
  );
  comprobar(`${etiqueta}: sin errores de consola`, errores.length === 0, errores[0] ?? '');

  await pagina.locator('.project-fields').first().scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(400);
  const archivo = `${DESTINO}ficha-${tamano.sufijo}.png`;
  await pagina.screenshot({ path: archivo, fullPage: true, animations: 'disabled' });
  console.log(`captura de la ficha: ${archivo}`);

  if (tamano.nombre === 'escritorio') {
    console.log('\n--- textos publicados ---');
    console.log('ALCANCE:', ficha.alcance);
    for (const hallazgo of ficha.hallazgos) {
      console.log(`\n[${hallazgo.id}] ${hallazgo.titulo}`);
      console.log(hallazgo.texto);
    }
    for (const [clave, valor] of Object.entries(ficha.apartados)) {
      console.log(`\n${clave.toUpperCase()}: ${valor}`);
    }
  }

  await contexto.close();
}

const correctas = resultados.filter((r) => r.correcto).length;
console.log(`\n${correctas}/${resultados.length} comprobaciones correctas`);
await navegador.close();
process.exit(correctas === resultados.length ? 0 : 1);
