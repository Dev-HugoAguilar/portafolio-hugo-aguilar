# Kilómetro Cero — red de envíos carreteros

Prototipo local de una torre de control para una operación con muchos envíos
distribuidos en varios corredores. La vista inicial muestra **642 envíos
ficticios agregados en 12 corredores** y **18 camiones virtuales de muestra**.
El mapa consolida los tramos compartidos, distingue hubs y terminales y permite
filtrar por estado, activar escenarios de disrupción, mostrar/ocultar la flota y
pausarla.

La unidad de los fixtures es **envíos agregados por corredor**, no camiones
únicos, viajes GPS ni toneladas. Los camiones son marcadores sintéticos
representativos, no telemetría.

## Ejecutar

- **Sin servidor:** abre `prototipo_local.html` directamente (requiere WebGL).
- **Fuentes editables:** desde esta carpeta ejecuta `python -m http.server 8024`
  y abre `http://127.0.0.1:8024/`.
- **API local opcional:** `python -m pip install -r requirements.txt` y
  `uvicorn main:app --reload --port 8024`. Endpoints: `/api/health`,
  `/api/scenarios`, `/api/simulate`.
- Regenera el HTML independiente con `python build_preview.py`.

No requiere Atlas, claves, modelo externo ni conexión de red al ejecutarse.
MapLibre GL JS 5.6.1 y D3 7.9.0 están incluidos localmente.

## Datos y mapa

- `data/scenarios.json` es un fixture sintético: 642 envíos agregados en 12
  pares origen–destino, tres estados (551 en ventana, 68 con demora, 23 en
  riesgo) y tres escenarios de red (base, cierre y demora). Las distancias son
  ilustrativas. No pertenecen a una empresa ni representan operaciones
  observadas.
- `world.geojson` contiene límites Natural Earth 1:50m, admin 0, dominio
  público, para México, el sur de Estados Unidos y Centroamérica; descarga del
  16 nov 2026.
- `data/roads.geojson` contiene 17 tramos viales de OpenStreetMap (ODbL 1.0)
  ruteados con OSRM, perfil automóvil, el 16 nov 2026. La interfaz usa el
  snapshot y **no consulta OSRM, tiles ni APIs desde el navegador**.
- El perfil automóvil **no valida restricciones de carga pesada, cierres
  activos, clima, seguridad ni tráfico en vivo**. La red de envíos y la flota
  son simuladas.
- La geografía base, las carreteras, los hubs/terminales y la flota son capas
  separadas. Los tramos compartidos se consolidan una vez por par de hubs; sus
  conteos se solapan entre corredores y **no deben sumarse como envíos únicos**.
- El mapa se centra en `[[-118, 14], [-86, 33.5]]`, con México, el sur de
  Estados Unidos y Centroamérica en el encuadre.

Fuentes para una siguiente integración, no utilizadas en esta demo:

- [Red Nacional de Caminos — INEGI](https://www.inegi.org.mx/programas/rnc/)
- [API de Ruteo — INEGI](https://www.inegi.org.mx/servicios/Ruteo/): opciones
  por tipo de vehículo, ejes, ruta y tramos bloqueados; tiempos en condiciones
  óptimas, no tráfico en vivo.
- [Datos viales — SICT](https://www.datos.gob.mx/dataset/datos_viales): demanda
  carretera y composición vehicular, con unidades y coberturas propias.

## Visualizaciones

- **Mapa de red agregada:** tramos únicos por par de hubs, grosor por volumen y
  color por estado dominante. Al seleccionar un tramo se resalta un corredor y
  aparece una flecha pequeña solo en esa selección. Hubs circulares y
  terminales cuadradas se mantienen a tamaño constante en pantalla. Zoom de
  50% a 800%, anclado al cursor, con botones, doble clic y arrastre; al llegar
  al límite, la rueda vuelve a desplazar la página.
- **Flota virtual:** 18 marcadores sintéticos distribuidos en la red, con
  pictograma de camión distinto de los hubs. Azul = en ventana, naranja =
  demora, violeta = riesgo. Controles separados para mostrar/ocultar y
  pausar/reanudar; el contador indica las unidades visibles. El reloj de
  simulación sigue corriendo al pausar y reanudar.
- **Sankey por corredor:** el volumen visible de cada corredor se reparte entre
  los estados del filtro actual; los segmentos suman el total mostrado.
- **Dispersión volumen–puntualidad:** un punto por corredor; el tamaño
  comunica los envíos visibles y el color la puntualidad de la red. Sin doble
  eje.
- **Tabla ranking:** alternativa accesible y seleccionable con teclado; sus
  totales usan la misma regla que el mapa y las gráficas.

La selección de formas toma inspiración de las familias de mapas de flujo,
redes y Sankey de [DataViz Inspiration](https://www.dataviz-inspiration.com/).
El mapa está agregado para comunicar la red sin dibujar cientos de trayectorias
individuales encima unas de otras.

## Copiloto y límites

El copiloto es una lectura **simulada por reglas** sobre los valores visibles:
cita el corredor de mayor volumen, el peso relativo y el corredor con más
envíos en riesgo. No se conecta a un LLM, TMS, ERP, GPS, Atlas ni servicio de
tráfico. Los escenarios de disrupción actualizan reglas deterministas del
navegador; no ejecutan, despachan ni publican decisiones operativas y no
persisten datos.

## Archivos

- `index.html`, `styles.css`, `app.js`: aplicación, mapa MapLibre, gráficos
  D3/SVG y lógica determinista.
- `data/scenarios.json`: fixture con metadatos, ciudades, corredores, estados e
  incidentes sintéticos.
- `data/roads.geojson`: snapshot de tramos OSM/OSRM.
- `world.geojson`: base Natural Earth 1:50m.
- `vendor/maplibre-gl.js`, `vendor/maplibre-gl.css`,
  `vendor/MAPLIBRE-LICENSE.txt`: MapLibre GL JS 5.6.1, licencia BSD-3-Clause.
- `vendor/d3.min.js`: D3 7.9.0 local.
- `simulation.py`, `main.py`: agregación determinista y API local opcional.
- `build_preview.py`: genera el HTML autocontenido.

## Atribución

- OpenStreetMap: © OpenStreetMap contributors, ODbL 1.0,
  https://www.openstreetmap.org/copyright
- OSRM: ruteo de demostración, perfil automóvil,
  https://project-osrm.org/
- Natural Earth: dominio público,
  https://www.naturalearthdata.com/
- MapLibre GL JS: BSD-3-Clause; el texto completo está en
  `vendor/MAPLIBRE-LICENSE.txt`.
