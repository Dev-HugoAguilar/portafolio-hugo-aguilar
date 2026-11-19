/**
 * Capturas de los wireframes de la Fase 1 (desechables, no producción).
 *
 * Abre `docs/atlas-vial/wireframes/index.html` por `file://` en tres anchos y en
 * las tres vistas, y escribe nueve PNG en la misma carpeta:
 *
 *   wireframe-{territorio,tiempo,personas}-{1280,768,390}.png
 *
 *   node tools/wireframes.mjs
 */

import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const RAIZ = fileURLToPath(new URL('../../../docs/atlas-vial/wireframes/', import.meta.url));
const ANCHOS = [
  { sufijo: '1280', width: 1280, height: 1100 },
  { sufijo: '768', width: 768, height: 1100 },
  { sufijo: '390', width: 390, height: 1200 },
];
const VISTAS = ['territorio', 'tiempo', 'personas'];

const navegador = await chromium.launch();
for (const vista of VISTAS) {
  for (const ancho of ANCHOS) {
    const contexto = await navegador.newContext({
      viewport: { width: ancho.width, height: ancho.height },
      deviceScaleFactor: 2,
      locale: 'es-MX',
    });
    const pagina = await contexto.newPage();
    const url = `${pathToFileURL(`${RAIZ}index.html`).href}?vista=${vista}`;
    await pagina.goto(url, { waitUntil: 'load' });
    await pagina.evaluate(() => document.fonts?.ready);
    await pagina.waitForTimeout(350);
    const destino = `${RAIZ}wireframe-${vista}-${ancho.sufijo}.png`;
    await pagina.screenshot({ path: destino, fullPage: true });
    console.log(`captura: ${destino.replace(RAIZ, '')}`);
    await contexto.close();
  }
}
await navegador.close();
