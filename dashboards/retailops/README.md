# RetailOps Unified — integración en Machine Learning

Aplicación autónoma de operación retail simulada, registrada en el área real
**02 · Ciencia de datos y Machine Learning** del portafolio.

- **Categoría principal:** Machine Learning
- **ID de área / ruta:** `ciencia-de-datos`
- **Ficha:** `#/area/ciencia-de-datos/retailops`
- **Demo servida:** `dist/dashboards/retailops/index.html`
- **Fuente del asset:** `dashboards/retailops/index.html`
- **Módulo de ficha:** `dist/projects/retailops.js`
- **Captura de tarjeta:** `dist/img/retailops-resumen.jpg`
- **Contenido editorial:** `dashboards/retailops/content/RETAILOPS_FICHA_PORTAFOLIO.md`
- **Fuente estructurada:** `dashboards/retailops/content/retailops.project-content.json`
- **Criterios de origen:** `dashboards/retailops/ACCEPTANCE.md`

La etiqueta visible de la ficha es **MACHINE LEARNING**. El asset puede vivir
bajo `dashboards/`; esa ubicación física no define la categoría editorial.

## Integración

Se reutilizó la ficha nativa del portafolio (la misma estructura de Gaza ·
Vidas y territorio): título, subtítulo, resumen, estado, categoría, ocho
apartados y tecnologías agrupadas. Los campos opcionales añadidos al template
solo se activan cuando el proyecto los declara:

- `etiquetaCategoria: 'Machine Learning'` en la ficha;
- `resumenFicha: true` para mostrar el resumen editorial.

Gaza no declara esos campos, por lo que conserva su presentación y sus datos.

La demo se monta en un iframe same-origin, sin backend ni dependencias de
producción, y ajusta su altura al documento interno. La tarjeta pasa primero
por la ficha. En el embed se retiran la cabecera propia de RetailOps y las
barras de scroll internas para evitar duplicación y franjas blancas; no hay
botón **Ver demo** ni CTA duplicada.

El asset es el `preview/index.html` del paquete, instalado con el instalador y
con dos correcciones de integración: regla móvil de `select` para evitar
overflow y favicon local. La vista inicial permanece **Calor por sucursal**.

## Asset y registro

- Tamaño final: **13,416,449 bytes**
- SHA-256: `CDC6D7C930ECEA96F9A61CCFBCDC18FA3BC96B9968E084D5B24A4DBE01D00AB5`
- El asset se instaló inicialmente en `dist/dashboards/retailops/index.html`
  mediante `tools/install_asset.py` y se copió a la fuente del proyecto.
- `dist/content.js` contiene una sola entrada `retailops`, dentro de
  `ciencia-de-datos`; no queda una tarjeta en Dashboards.
- `dist/app.js` y `dist/style.css` incorporan la categoría visible y el resumen
  opcionales de la ficha.

## Pruebas

Del paquete v2:

- `python tools/verify_package.py`: **42 archivos íntegros**
- `node --check app.js`, `core.js`, `heatmap.js`: correcto
- `node test_core.js`: **12/12**
- `node test_heatmap.js`: **6/6**
- `npm ci`: 20 paquetes de desarrollo, 0 vulnerabilidades
- `node test_ui.js`: **14/14**

Integración en Chrome real:

- `node tools/verificar-retailops.mjs`: **51 OK · 0 fallos**
- `recorrido-navegador`: **8 OK · 0 fallos**

Comprobado: área Machine Learning, una sola tarjeta, tarjeta → ficha,
ocho apartados, tecnologías agrupadas, resumen, estado, categoría, iframe sin
cabecera interna ni scrollbar, ausencia de CTA duplicada, 51 tiendas, 16 alcaldías, calor inicial,
100 % → 130 %, mínimo 100 %, reset de viewBox, arrastre sin selección,
capas/métricas después del gesto, líder Toreo a 300 % sin cambiar filtros,
foco visible, movimiento reducido y layouts 1440/1024/390 sin overflow global.

## Evidencia

- `evidencias/retailops/area-machine-learning-1440.png`
- `evidencias/retailops/ficha-1440.png`
- `evidencias/retailops/ficha-completa.png`
- `evidencias/retailops/ficha-mapa-1440.png`
- `evidencias/retailops/ficha-mapa-1024.png`
- `evidencias/retailops/ficha-mapa-390.png`
- `evidencias/retailops/zoom-130-1440.png`
- `evidencias/retailops/reset-1440.png`
- `evidencias/retailops/lider-300-1440.png`
- `evidencias/retailops/recorrido-entrega-1440.png`
- `evidencias/retailops/tarjeta.png`
- `evidencias/retailops/verificacion-navegador.log`
- `evidencias/retailops/recorrido-navegador.log`
- `evidencias/retailops/embed-sin-cabecera-1440.png`
- `evidencias/retailops/pruebas-source.log`
- `evidencias/retailops/verify-package.log`
- `evidencias/retailops/install.log`
- `evidencias/retailops/qa-syntax.log`

## Límites

- Operación **simulada**; no es información interna de Walmart.
- 51 ubicaciones recopiladas, lista parcial; 13 de 16 alcaldías con tiendas.
- Geometrías de referencia SHI CDMX / npalomin (2021).
- Ventas = valor de artículos surtidos; no cobros, ingresos, margen ni demanda.
- Resultados ML del generador sintético; no demuestran generalización ni
  superioridad estadística.
- No se probaron Safari, Firefox ni dispositivo físico; no se midieron FPS.
- El estado editorial se actualizó a **publicado** por indicación expresa; ficha y
  demo están integradas y verificadas. No se ejecutó un despliegue remoto nuevo.
- No se desplegó públicamente.
- No se modificaron ORBITA, Atlas Vial ni sus datos.
