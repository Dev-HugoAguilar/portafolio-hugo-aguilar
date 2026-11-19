# Kilómetro Cero — integración en el portafolio

Torre de control de una red de envíos carreteros, integrada en **Agentes y
sistemas de decisión** con la etiqueta de categoría «Logística».

- Ficha: `#/area/agentes/kilometro-cero`
- Demo servida: `dist/dashboards/kilometro-cero/index.html`
- Fuente editable: `source/`
- Entrada autónoma: `runtime/index.html` (copia de
  `source/prototipo_local.html`)

## Abrir en local

El sitio ya se sirve desde `dist/`:

```bash
cd dist
python -m http.server 8000 --bind 127.0.0.1
```

Abre `http://127.0.0.1:8000/dashboards/kilometro-cero/index.html` o la ficha del
portafolio. MapLibre requiere WebGL activo. Para las pruebas automatizadas se
inicia Chromium con `--use-angle=swiftshader --enable-unsafe-swiftshader`.

La fuente también se puede abrir como `source/prototipo_local.html`, sin
servidor, o con `python -m http.server 8024` desde `source/`.

## Estructura

- `source/index.html`, `styles.css`, `app.js`: interfaz, MapLibre y D3.
- `source/data/scenarios.json`: fixture sintético de la red.
- `source/data/roads.geojson`: snapshot de tramos OSM/OSRM.
- `source/world.geojson`: Natural Earth 1:50m.
- `source/vendor/maplibre-gl.js`, `maplibre-gl.css`,
  `MAPLIBRE-LICENSE.txt`: MapLibre GL JS 5.6.1 (BSD-3-Clause).
- `source/vendor/d3.min.js`: D3 7.9.0.
- `source/simulation.py`, `main.py`: API local opcional, no conectada.
- `source/build_preview.py`: genera la salida autónoma.
- `runtime/index.html`: salida autónoma publicada.
- `publicar.py`: copia el índice y la licencia de MapLibre a `dist`.
- `capturar-portada.mjs`: captura real 1600 × 1726 para la tarjeta.

El HTML autónomo embebe HTML, CSS, MapLibre, D3, escenarios, carreteras y
geografía. No se requieren tiles, OSRM, CDN, API key ni conexión externa para
renderizar.

## Regenerar y publicar

```bash
cd dashboards/kilometro-cero/source
python build_preview.py
Copy-Item prototipo_local.html ..\runtime\index.html   # PowerShell
cd ../..
python dashboards/kilometro-cero/publicar.py
node dashboards/kilometro-cero/capturar-portada.mjs
```

## Datos, unidades y reconciliación

- **642 envíos sintéticos agregados** en **12 corredores**: 551 en ventana, 68
  con demora y 23 en riesgo. La unidad es «envíos del escenario», no camiones
  únicos, viajes, toneladas ni GPS.
- **17 pares de hubs** (tramos viales) consolidados una vez. Los conteos de cada
  tramo se solapan entre los corredores que lo comparten y no se suman como
  envíos únicos.
- **18 camiones virtuales de muestra**, no flota real ni telemetría. Hay 3
  terminales y 14 hubs.
- **7 corredores** visibles en el Sankey; la tabla contiene los 12 corredores
  del filtro actual.
- Geografía base: Natural Earth 1:50m, admin 0, dominio público, descarga
  2026-11-16.
- Carreteras: OpenStreetMap, ODbL 1.0, ruteadas con OSRM perfil automóvil el
  2026-11-16. No hay tráfico en vivo ni validación de restricciones de carga
  pesada.
- No se usaron geometrías ni volúmenes de INEGI o SICT. Sus enlaces se conservan
  como fuentes para una siguiente integración.
- No se inventan observaciones faltantes: los estados y distancias son parte
  explícita del fixture sintético.

## Interacción y accesibilidad

- Filtro por estado y escenario de red recalculan mapa, KPIs, Sankey,
  dispersión, tabla y copiloto con la misma regla.
- Selección de corredor/tramo, tabla con filas enfocables y Enter/Espacio,
  dispersión seleccionable con teclado, botones de flota y pausa.
- Zoom 50–800% anclado al cursor con rueda, +/−, doble clic y restablecer; al
  llegar al límite la rueda vuelve a desplazar la página.
- La flota y las etiquetas de unidad son sintéticas; no hay GPS.

## Copiloto

El copiloto es una lectura determinista por reglas sobre los valores visibles.
No hay LLM, inferencia de modelo, TMS, ERP, Atlas ni escritura externa. La demo
no despacha camiones ni modifica sistemas.

## Límites

- El ruteo es de perfil automóvil; no sustituye un ruteo de carga pesada.
- Los envíos, estados, incidentes, distancias, hubs y camiones son ficticios.
- No se consultan cierres, clima, seguridad, tráfico ni capacidad de flota en
  vivo.
- La demo no está desplegada en un servidor remoto y no persiste estado.
- La API FastAPI opcional no está conectada al portafolio y no se probó en esta
  integración.
