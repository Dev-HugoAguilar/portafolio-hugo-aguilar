# ORBITA — integración en el portafolio

Explorador orbital con snapshot público, Tierra 3D y cálculo en navegador.
Integrado en **Dashboards y visualización** como `#/area/dashboards/orbita`.

- **Ficha:** `#/area/dashboards/orbita`
- **Demo:** `dist/dashboards/orbita/index.html`
- **Fuente estática:** `dashboards/orbita/index.html` (UI 26, 17,478,841 bytes)
- **Módulo de ficha:** `dist/projects/orbita.js`
- **Contenido estructurado:** `content/orbita.project.json`, `content/orbita.sources.json`
- **Ficha editorial de referencia:** `content/ORBITA_Ficha_Portafolio.md`

## Abrir en local

```bash
cd dist
python -m http.server 8000 --bind 127.0.0.1
```

Abre `http://127.0.0.1:8000/#/area/dashboards/orbita` o
`http://127.0.0.1:8000/dashboards/orbita/index.html`.

## Integración

- El HTML se sirve como recurso estático local y **no se importa al bundle**.
  Solo se carga en el iframe de la ficha; el catálogo usa una captura real.
- Iframe same-origin, sin `sandbox`: la demo necesita scripts inline, WebGL,
  Worker desde Blob, `srcdoc` para la escena y descargas. No se debilitó ninguna
  CSP global; el servidor local no añade una política que bloquee esos recursos.
- La altura se ajusta con `ResizeObserver` sobre el documento del iframe y un
  intervalo de respaldo; el hash interno de la demo no se propaga al router del
  portafolio.
- La ficha monta la demo directamente en el iframe, sin barra superior ni CTA
  duplicada. Se retiró la barra «Snapshot orbital · Demo interactiva» junto con
  **Explorar ORBITA**, **Datos y método** y **Abrir demo completa**, a petición;
  la demo sigue disponible en la ruta directa y en la pestaña interna
  «Datos y método».
- El menú interno de ORBITA permanece en el flujo normal (`position: relative`)
  como ancla de su indicador; no se convierte en sticky/fixed. El indicador mide
  la pestaña activa y se recalcula al cambiar de vista y de tamaño. En móvil el
  menú permite desplazamiento horizontal por toque para alcanzar las cinco
  vistas; el indicador queda alineado con la pestaña activa.

### Correcciones de integración sobre UI26

El paquete UI26 original se verificó sin cambios. La copia integrada añade tres
correcciones mínimas y auditables:

- sincronización del indicador de la pestaña activa al cambiar de vista o de
  tamaño;
- `overflow-x: auto` en el menú móvil (barra oculta), para que el swipe alcance
  las cinco pestañas;
- favicon `data:,` para evitar el 404 de `/favicon.ico` en la demo directa.

El archivo final mide **17,478,841 bytes** y su SHA-256 es
`E24239CC396C7F09FB97ACE7C248D8BB812BA106F01DF8C5048660C643903C6E`
(idéntico en `dashboards/orbita/index.html` y `dist/dashboards/orbita/index.html`).

### Ajuste de «Constelaciones visibles»

Se consolidaron en un solo bloque las reglas de `.filters` y `.filter-toolbar`,
eliminando los breakpoints antiguos de 3 y 2 columnas. Las seis tarjetas ahora
tienen:

- badge LEO/MEO eliminado y subtítulos funcionales sin el sufijo orbital;
- cabecera con punto de color, nombre y switch decorativo; conteo principal,
  altura mediana, barra de proporción y porcentaje del catálogo;
- **170 px** de alto común, conteos y barras alineados;
- seis columnas iguales en escritorio (141 px por tarjeta a 1024 px);
- una tira de una sola fila con tarjetas de **164 px** y scroll local por
  debajo de 1024 px; en 390 px `scrollIntoView` deja visible la tarjeta enfocada
  por teclado.

La clasificación LEO/MEO se conserva en «Datos y método» y en las gráficas.

## Datos, método y límites

- Snapshot CelesTrak: **12,308 registros / 12,308 NORAD únicos**, seis grupos
  (Starlink 11,185; Amazon Leo 391; OneWeb 651; GPS 32; Galileo 32; estaciones
  17). Descarga 2026-11-17T00:46:34Z; referencia temporal
  2026-11-16T12:05:12Z. Los conteos pertenecen al snapshot, no al presente.
- Los 17 registros de estaciones **no** son 17 estaciones independientes ni un
  censo completo.
- Propagación SGP4 con satellite.js, Web Worker, 24 h con muestras cada 30 s;
  comparación de 25 instantes cada 5 min; alturas medias aproximadas por
  movimiento medio.
- Un paso geométrico no garantiza visibilidad óptica, conectividad ni cobertura
  comercial. El relieve es una textura, no un DEM calibrado; la atmósfera es
  estilizada; la distancia lunar está comprimida.
- No hay telemetría en vivo, backend conectado, LLM, Atlas ni credenciales.
  El snapshot y los cálculos viven en el navegador.
- No se asigna una licencia nueva al conjunto. Se conservan y deben verificarse
  las atribuciones de CelesTrak, Earth3D, NASA GIBS, Solar System Scope y las
  referencias visuales de DataViz Inspiration.

## Verificación del paquete

`python scripts/verify_package.py` del paquete original pasó: 10 hashes,
12,308 registros/NORAD únicos, seis grupos y UI 26. La integración se verifica
además con `node tools/verificar-orbita-ui26.mjs` (92 comprobaciones, Chrome del
sistema) a 1440×900 y 390×844, incluyendo el indicador de la pestaña activa, las
seis capas, el worker real, las descargas y la ficha sin barra superior. El ajuste de las seis tarjetas se verifica con `node tools/verificar-orbita-tarjetas.mjs` (66 comprobaciones): 1440 px, 1024 px, 390 px, seis filtros y Mostrar/Ocultar todas.
