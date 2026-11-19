/**
 * Medición del hueco entre la ficha descriptiva y la aplicación (revisión puntual).
 */
import { chromium } from 'playwright';

const RUTA = 'http://localhost:8000/#/area/dashboards/comparativo-bancario';
const navegador = await chromium.launch({ channel: 'chrome' });

const medir = (pagina) =>
  pagina.evaluate(() => {
    const tec = document.querySelector('.field-tecnologias dd') ?? document.querySelector('.field-tecnologias');
    const cuerpo = document.querySelector('#demo-back');
    const app = document.querySelector('#demo-host .bm-app');
    const barra = document.querySelector('#demo-host .bm-appbar');
    const caja = (nodo) => (nodo ? nodo.getBoundingClientRect() : null);
    const cTec = caja(tec);
    const cCuerpo = caja(cuerpo);
    const cApp = caja(app);
    const cBarra = caja(barra);
    return {
      finTecnologias: cTec ? +cTec.bottom.toFixed(1) : null,
      inicioContenedor: cCuerpo ? +cCuerpo.top.toFixed(1) : null,
      inicioApp: cApp ? +cApp.top.toFixed(1) : null,
      inicioCabeceraApp: cBarra ? +cBarra.top.toFixed(1) : null,
      margenExterior: cuerpo ? getComputedStyle(cuerpo).marginTop : null,
      paddingApp: app ? getComputedStyle(app).paddingTop : null,
      huecoHastaCabecera:
        cTec && cBarra ? +(cBarra.top - cTec.bottom).toFixed(1) : null,
      huecoHastaApp: cTec && cApp ? +(cApp.top - cTec.bottom).toFixed(1) : null,
      alineacionIzquierda: {
        ficha: cTec ? +cTec.left.toFixed(1) : null,
        app: cApp ? +cApp.left.toFixed(1) : null,
        cabecera: cBarra ? +cBarra.left.toFixed(1) : null,
      },
      fondo: {
        contenedor: cuerpo ? getComputedStyle(cuerpo).backgroundColor : null,
        app: app ? getComputedStyle(app).backgroundColor : null,
      },
      claseAmpliado: document.body.classList.contains('demo-ampliado'),
    };
  });

const escritorio = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
await escritorio.goto(RUTA, { waitUntil: 'networkidle' });
await escritorio.waitForTimeout(2200);
console.log('=== escritorio 1440 ===');
console.log(JSON.stringify(await medir(escritorio), null, 1));

/* captura del hueco: desde la última fila de Tecnologías hasta la cabecera del dashboard */
const recorte = await escritorio.evaluate(() => {
  const tec = document.querySelector('.field-tecnologias');
  const barra = document.querySelector('#demo-host .bm-appbar');
  const a = tec.getBoundingClientRect();
  const b = barra.getBoundingClientRect();
  return {
    x: 0,
    y: a.top + window.scrollY - 16,
    width: window.innerWidth,
    height: b.bottom - a.top + 120,
  };
});
await escritorio.screenshot({ path: 'evidencias/hueco-ficha-app.png', fullPage: true, clip: recorte });

/* modo ampliado: el contenedor exterior pierde el hueco */
await escritorio.getByTestId('ampliar').click();
await escritorio.waitForTimeout(900);
console.log('=== ampliado ===');
console.log(
  JSON.stringify(
    await escritorio.evaluate(() => ({
      claseAmpliado: document.body.classList.contains('demo-ampliado'),
      margenExterior: getComputedStyle(document.querySelector('#demo-back')).marginTop,
      dialogoAbierto: document.querySelector('dialog.demo-dialog')?.open ?? null,
    })),
    null,
    1,
  ),
);
await escritorio.keyboard.press('Escape');
await escritorio.waitForTimeout(600);
console.log(
  'tras cerrar:',
  JSON.stringify(
    await escritorio.evaluate(() => ({
      claseAmpliado: document.body.classList.contains('demo-ampliado'),
      margenExterior: getComputedStyle(document.querySelector('#demo-back')).marginTop,
    })),
  ),
);

const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await movil.goto(RUTA, { waitUntil: 'networkidle' });
await movil.waitForTimeout(2200);
console.log('=== móvil 390 ===');
const datosMovil = await medir(movil);
console.log(
  JSON.stringify(
    {
      huecoHastaCabecera: datosMovil.huecoHastaCabecera,
      margenExterior: datosMovil.margenExterior,
      paddingApp: datosMovil.paddingApp,
      claseAmpliado: datosMovil.claseAmpliado,
    },
    null,
    1,
  ),
);
console.log('desborde móvil', await movil.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth })));

await navegador.close();
console.log('revisión lista');
