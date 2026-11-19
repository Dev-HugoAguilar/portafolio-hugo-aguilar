/**
 * Capturas tomadas del build real del portafolio, dentro de la ficha del
 * proyecto (marco del mismo origen), para las dos vistas de edades y las cuatro
 * de «Acceso y respuesta».
 *
 *   node dashboards/gaza-observatorio/tools/capturar-ficha-modulos.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'modulos-nuevos');
const URL_FICHA = 'http://127.0.0.1:8000/#/area/ciencia-de-datos/gaza-observatorio';

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
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.goto(URL_FICHA, { waitUntil: 'load' });
await pagina.waitForTimeout(3200);

const marco = pagina.frameLocator('#demo-host iframe, iframe');
const foto = async (nombre, recorte) => {
  const destino = path.join(SALIDA, nombre);
  if (recorte) await marco.locator(recorte).first().screenshot({ path: destino, animations: 'disabled' });
  else await pagina.screenshot({ path: destino, animations: 'disabled' });
  console.log('  captura', nombre);
};

// 1 · Navegación del observatorio dentro de la ficha
const pestañas = await marco.locator('nav [role="tab"]').allTextContents();
console.log('  pestañas en la ficha:', pestañas.length, '·', pestañas.map((t) => t.trim()).join(' | '));

// 2 · Edades: trama y pirámide
await marco.locator('[data-tab="personas"]').click();
await pagina.waitForTimeout(900);
await foto('10-ficha-edades-trama.png', '#personas .ageprofile-card');
await marco.locator('#ageLegend button[data-age-group="youth"]').click();
await pagina.waitForTimeout(400);
await foto('11-ficha-edades-trama-seleccion.png', '#personas .ageprofile-card');
await foto('12-ficha-edades-piramide.png', '#personas .card:nth-of-type(2)');
await marco.locator('#ageMode').selectOption('single');
await pagina.waitForTimeout(900);
await foto('13-ficha-edades-piramide-edades.png', '#personas .card:nth-of-type(2)');
await marco.locator('#ageMode').selectOption('groups');
await pagina.waitForTimeout(500);

// 3 · Acceso y respuesta: cuatro vistas
await marco.locator('[data-tab="respuesta"]').click();
await pagina.waitForTimeout(900);
await foto('14-ficha-respuesta-acceso.png', '#rview-acceso');
const vistas = [
  ['alimentos', '15-ficha-respuesta-alimentos.png'],
  ['financiamiento', '16-ficha-respuesta-financiamiento.png'],
  ['efectivo', '17-ficha-respuesta-efectivo.png'],
];
for (const [vista, nombre] of vistas) {
  await marco.locator(`.response-tabs [data-rview="${vista}"]`).click();
  await pagina.waitForTimeout(600);
  await foto(nombre, `#rview-${vista}`);
}

// 4 · La pestaña dentro de la ficha, a la vista
await marco.locator('.response-tabs [data-rview="acceso"]').click();
await pagina.waitForTimeout(500);
await foto('18-ficha-respuesta-completa.png');

await navegador.close();
console.log('errores JS:', errores.length ? errores : 'ninguno');
process.exitCode = errores.length ? 1 : 0;
