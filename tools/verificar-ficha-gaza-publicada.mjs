/**
 * Verifica la ficha publicada de «Gaza · Vidas y territorio»: estado visible,
 * textos entregados tal cual en la tarjeta y en el detalle, secciones legibles,
 * sin desbordamientos en escritorio y móvil, y capturas de ambos.
 *
 *   node tools/verificar-ficha-gaza-publicada.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'evidencias', 'gaza-observatorio', 'ficha-publicada');
const URL_AREA = 'http://127.0.0.1:8000/#/area/ciencia-de-datos';
const URL_FICHA = 'http://127.0.0.1:8000/#/area/ciencia-de-datos/gaza-observatorio';

const TEXTOS = {
  problema:
    'Cuatro fuentes describen el mismo conflicto con gránulos distintos: reportes diarios de Tech for Palestine, una lista identificada de fallecidos, estimaciones de necesidades de rehabilitación de la OMS y evaluaciones satelitales de UNOSAT. Leídas juntas sin cuidado producen errores previsibles: tomar un reporte publicado como la muerte ocurrida ese día, leer la falta de reporte como cero, sumar categorías de lesiones que se solapan, tratar las prótesis colocadas como personas o confundir un sitio evaluado con un edificio dañado.',
  destinatario:
    'Equipos de análisis humanitario, comunicación y política pública que necesitan leer el impacto con fuentes trazables y límites explícitos, sin confundir un reporte con un hecho, la ausencia de reporte con cero ni un sitio evaluado con un edificio dañado.',
  contribucion:
    'Construí el observatorio como una sola página con once vistas conectadas: impacto humano con calendario de intensidad, círculos proporcionales por reporte y curva acumulada; edades declaradas con trama de cien celdas y pirámide de puntos por sexo, más prensa; la lista nominal completa en «Cada punto, una vida», con un punto por persona, color por edad, ficha individual y tabla accesible; lesiones con rangos de necesidades de rehabilitación y actividad de prótesis; mapa bivariado del daño con catorce evaluaciones; explorador de sitios con selección vinculada y ficha del registro; trayectorias y un panel de pronóstico con validación temporal —muertes nuevas reportadas con sus rangos y su backtest, daño por zona y cambio de clasificación por sitio—; «Acceso y respuesta» con logística, IPC, financiación y efectivo; y las vistas de evidencia, archivo completo y referencias de diseño. Cada familia de cifras lleva su fuente y su fecha de corte junto a la visualización, los controles de universo, edad, año, métrica, evaluación, mínimo de sitios y búsqueda actúan sobre la vista que la contiene, y las tablas accesibles, la descarga de celdas visibles y el JSON del archivo filtrado permiten volver al registro original.',
  fuentes:
    'Tech for Palestine: 1 131 reportes diarios de Gaza y 1 131 de Cisjordania, 730 registros de infraestructura y 263 de prensa; los reportes llegan al corte del 10 de noviembre de 2026. Lista identificada de fallecidos: 72 835 registros con nombre y edad declarada, corte al 7 de mayo de 2026; el tablero la incluye completa en «Cada punto, una vida» y no completa ni estima las personas que la lista no identifica. OMS (EMRO): estimación de necesidades de rehabilitación por politrauma, mayo de 2026, con rangos de escenario que no son intervalos de confianza; 2 277 personas evaluadas y 502 prótesis colocadas son actividades con unidades distintas, no una cohorte uno a uno. UNOSAT, producto 4213: 198 308 sitios y 14 evaluaciones, con el último producto de comparación de octubre de 2025. Los enlaces completos, los metadatos y los créditos de inspiración están dentro del propio observatorio; los datos de terceros conservan su licencia y no se redistribuyen desde este portafolio.',
  metodo:
    'El mapa bivariado agrega el universo completo de sitios en 1 352 celdas de 0,005 grados: un eje es la cobertura con fecha y clase, el otro la proporción clasificada como destruida entre los sitios observados, y un mínimo de sitios por celda controla el ruido antes de dibujar. La vista de exploración usa una muestra visual fija de 10 000 puntos con selección vinculada a la ficha del sitio y no sirve para conteos locales. El experimento agrupa sitios por su secuencia de evaluaciones —seis categorías en one-hot por siete evaluaciones, 42 variables— sobre 155 112 sitios elegibles, con partición por bloques geográficos (118 889 de entrenamiento y 36 223 de validación) y k = 6 elegido entre 2 y 6 con silueta de 0,7005 en la muestra de validación. Los totales se leen de los acumulados publicados: las diferencias de acumulados no se presentan como datos diarios y la ausencia de reporte no se rellena con cero. En «Cada punto, una vida» los 72 835 registros nominales se dibujan sin muestreo sobre un lienzo, con una fila por edad y solo las filas visibles repintadas al desplazar; el color codifica la edad declarada, el tamaño es constante y el orden es por edad y luego por nombre, de modo que la posición no representa lugar ni fecha.',
  resultados:
    'Con el corte propio de cada fuente declarado en la cabecera —reportes al 10 de noviembre de 2026, edades al 7 de mayo de 2026, daño satelital de octubre de 2025 y OMS de mayo de 2026— el observatorio publica 74 645 fallecidos reportados y 175 978 heridos reportados, más los acumulados publicados de 21 976 niños y 263 periodistas con sus propias fechas de corte. La cobertura de reportes utilizables por año es 69 % en 2023, 92 % en 2024, 80 % en 2025 y 66 % en 2026, y los círculos dibujan 884 reportes positivos de 24 horas sobre 1 131 fechas. El mapa bivariado resume las 14 evaluaciones de UNOSAT sobre 198 308 sitios y el experimento retiene seis grupos con silueta de 0,701 en validación, concordancia ARI de 0,757 con clase inicial por clase final y asociación ajustada de 0,008 con la secuencia de sensores y 0,066 con la gobernación. La lista nominal dibuja 21 637 niños y adolescentes de 0 a 17 años —5 293 de ellos menores de 5— y 51 198 adultos sobre 72 835 registros con corte al 7 de mayo de 2026, frente a los 74 645 fallecidos reportados del acumulado al 10 de noviembre de 2026.',
  limitaciones:
    'Un reporte publicado no equivale necesariamente a un periodo de 24 horas ni a las muertes ocurridas ese día, y la ausencia de reporte no es un cero: se marca como falta de reporte utilizable. Las categorías de lesiones pueden solaparse y no se suman; los rangos de la OMS son escenarios, no intervalos de confianza, y las 502 prótesis colocadas no son personas. La lista nominal es incompleta y su corte —7 de mayo de 2026— no coincide con el acumulado diario del 10 de noviembre de 2026: la diferencia incluye personas no identificadas y no se rellena con nombres, edades ni puntos inventados; la edad es declarada (0 = menos de un año), no hay fecha individual de defunción y la fuente identifica personas en Gaza, no a todas las niñas y niños fallecidos en Palestina. UNOSAT es un universo seleccionado en el producto final, no un censo de edificios previo al conflicto; sus coordenadas son de sitios y la fecha de una evaluación no identifica el instante del daño ni su autor. El límite geográfico es una referencia territorial, no un frente militar. La partición del experimento se usó para elegir la configuración: no es una prueba final independiente, no hay validación de terreno ni buffer espacial, k alcanzó el extremo del rango explorado y la utilidad incremental frente a reglas simples no está demostrada. El observatorio no predice fallecimientos, ataques ni responsables, y no vincula sitios dañados con personas.',
};

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

/* ------------------------------------------------- tarjeta en el área */
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1100 } });
pagina.on('pageerror', (e) => errores.push(`JS: ${e.message}`));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
await pagina.goto(URL_AREA, { waitUntil: 'load' });
await pagina.waitForTimeout(1500);
const tarjeta = await pagina.evaluate(() => {
  const objetivo = [...document.querySelectorAll('article, li, a')].find((n) => /Gaza · Vidas y territorio/.test(n.textContent) && n.querySelector('.chip'));
  if (!objetivo) return null;
  const chip = objetivo.querySelector('.chip');
  return {
    estado: chip ? chip.textContent.trim() : '',
    estadoAttr: chip ? chip.getAttribute('data-estado') : '',
    titulo: (objetivo.querySelector('h2, h3, .card-title') || {}).textContent?.trim() || '',
    resumen: (objetivo.querySelector('.card-text') || {}).textContent?.trim() || '',
    imagen: (objetivo.querySelector('img') || {}).getAttribute?.('src') || '',
    enlace: (objetivo.closest('a') || {}).getAttribute?.('href') || objetivo.querySelector('a')?.getAttribute('href') || '',
    desborde: document.documentElement.scrollWidth - window.innerWidth,
  };
});
comprobar(!!tarjeta, 'la tarjeta de Gaza existe en Ciencia de datos');
comprobar(/Publicado/i.test(tarjeta?.estado || ''), `la tarjeta muestra el estado «${tarjeta?.estado}»`);
comprobar(tarjeta?.estadoAttr === 'publicado', `el estado del dato es publicado (${tarjeta?.estadoAttr})`);
comprobar(/Gaza · Vidas y territorio/.test(tarjeta?.titulo || ''), `nombre intacto: ${tarjeta?.titulo}`);
comprobar(/gaza-observatorio-resumen/.test(tarjeta?.imagen || ''), `se conserva la imagen (${tarjeta?.imagen})`);
comprobar(/gaza-observatorio/.test(tarjeta?.enlace || ''), `se conserva el destino (${tarjeta?.enlace})`);
await pagina.locator('article, li').filter({ hasText: 'Gaza · Vidas y territorio' }).first().screenshot({ path: path.join(SALIDA, '01-tarjeta-publicada.png'), animations: 'disabled' }).catch(() => pagina.screenshot({ path: path.join(SALIDA, '01-tarjeta-publicada.png') }));

/* ------------------------------------------------------- ficha / detalle */
await pagina.goto(URL_FICHA, { waitUntil: 'load' });
await pagina.waitForTimeout(3000);
const ficha = await pagina.evaluate(() => {
  const campos = {};
  document.querySelectorAll('.fields.project-fields > div, .project-fields dt').forEach((n) => {
    const t = n.textContent.trim();
    const m = t.match(/^([^:]{3,60}):/);
    if (m) campos[m[1].trim()] = t.slice(m[0].length).trim();
  });
  const secciones = [...document.querySelectorAll('.project-fields > div')].map((d) => ({
    titulo: (d.querySelector('dt, .field-label, h3') || {}).textContent?.trim() || '',
    largo: d.textContent.trim().length,
    alto: Math.round(d.getBoundingClientRect().height),
  }));
  return {
    titulo: document.querySelector('#project-view-title')?.textContent.trim() || '',
    subtitulo: document.querySelector('.view-subtitle')?.textContent.trim() || '',
    estado: document.querySelector('.view-chips .chip')?.textContent.trim() || '',
    campos,
    secciones,
    nota: document.querySelector('.ficha-note')?.textContent.trim() || '',
    texto: document.querySelector('#view-project')?.innerText || document.body.innerText,
    desborde: document.documentElement.scrollWidth - window.innerWidth,
    tecnologias: [...document.querySelectorAll('.tec-funcion, .tec-items')].map((t) => t.textContent.trim()),
  };
});
comprobar(ficha.titulo === 'Gaza · Vidas y territorio', `título del detalle intacto (${ficha.titulo})`);
comprobar(/Publicado/i.test(ficha.estado), `el detalle muestra el estado «${ficha.estado}»`);
comprobar(!ficha.nota, 'no queda la nota de «en desarrollo» en el detalle');
comprobar(ficha.desborde <= 0, `sin desbordamiento horizontal (${ficha.desborde})`);

const normalizar = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const cuerpo = normalizar(ficha.texto);
for (const [clave, esperado] of Object.entries(TEXTOS)) {
  comprobar(cuerpo.includes(normalizar(esperado)), `el detalle reproduce el texto de «${clave}» (${esperado.length} caracteres)`);
}
for (const etiqueta of ['Problema', 'Destinatario', 'Mi contribución', 'Fuentes y datos', 'Método y decisiones técnicas', 'Resultados publicados', 'Limitaciones']) {
  comprobar(ficha.secciones.some((s) => s.titulo.toLowerCase().includes(etiqueta.toLowerCase())) || cuerpo.includes(etiqueta), `apartado «${etiqueta}» presente`);
}
comprobar(ficha.secciones.every((s) => s.alto > 0), `los apartados ocupan espacio (${ficha.secciones.length} bloques)`);
comprobar(['Datos y análisis','Interfaz','Verificación'].every((g) => ficha.tecnologias.some((t) => t.startsWith(g))) && ['MiniBatchKMeans','Fuentes abiertas','D3.js 7.9.0','Playwright'].every((t) => ficha.tecnologias.join(' ').includes(t)), `tecnologías por grupos presentes (${ficha.tecnologias.length} bloques)`);

await pagina.screenshot({ path: path.join(SALIDA, '02-ficha-escritorio.png'), animations: 'disabled' });
await pagina.locator('.project-fields').screenshot({ path: path.join(SALIDA, '03-ficha-apartados.png'), animations: 'disabled' }).catch(() => {});
await pagina.close();

/* ------------------------------------------------------------- móvil */
const movil = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
movil.on('pageerror', (e) => errores.push(`móvil: ${e.message}`));
await movil.goto(URL_FICHA, { waitUntil: 'load' });
await movil.waitForTimeout(3000);
const movilDatos = await movil.evaluate(() => ({
  estado: document.querySelector('.view-chips .chip')?.textContent.trim() || '',
  desborde: document.documentElement.scrollWidth - window.innerWidth,
  titulo: document.querySelector('#project-view-title')?.textContent.trim() || '',
  texto: (document.querySelector('#view-project')?.innerText || '').length,
}));
comprobar(/Publicado/i.test(movilDatos.estado), `móvil: estado «${movilDatos.estado}»`);
comprobar(movilDatos.desborde <= 0, `móvil: sin desbordamiento horizontal (${movilDatos.desborde})`);
comprobar(movilDatos.texto > 3000, `móvil: el detalle conserva todo el texto (${movilDatos.texto} caracteres)`);
await movil.screenshot({ path: path.join(SALIDA, '04-ficha-movil.png'), animations: 'disabled' });
await movil.close();

await navegador.close();
console.log('\n' + ok.map((m) => '  ✓ ' + m).join('\n'));
if (fallos.length) console.log('\nFALLOS:\n' + fallos.map((m) => '  ✗ ' + m).join('\n'));
console.log('\nerrores JS:', errores.length ? errores : 'ninguno');
console.log(`\n${ok.length} comprobaciones correctas, ${fallos.length} fallos`);
process.exitCode = fallos.length || errores.length ? 1 : 0;

