# Atlas vial · Ciudad de México

Tablero interactivo de los **hechos de tránsito registrados por la Secretaría de
Seguridad Ciudadana de la Ciudad de México** en 2024, integrado en el portafolio
como proyecto del área «Dashboards y visualización» (categoría **Movilidad**).

Tres vistas comparten un mismo estado de filtros: **Territorio** (mapa, panel
contextual y línea temporal), **Tiempo y entorno vial** (serie, matriz día × hora
y distribuciones) y **Personas y vehículos** (desgloses con su cobertura). La
ficha del proyecto, encima del tablero, muestra «Hallazgos del análisis»
**calculados con los filtros vigentes**: concentración territorial, peso de los
hechos con fallecimientos, tipo de evento más frecuente frente al de mayor
letalidad registrada y momento del día con más hechos.

## Datos

| Dato | Valor |
| --- | --- |
| Fuente | SSC · CDMX, «Hechos de tránsito registrados por la SSC 2024 (serie de datos ampliada, no comparativa)» |
| Licencia | CC-BY-4.0-ESP |
| Periodo de los eventos | 2024-01-01 → 2024-12-31 |
| Hechos | 30 655 (un folio por hecho) |
| Personas lesionadas | 36 266 |
| Personas fallecidas | 533 |
| Hechos con fallecimientos | 512 (1,67 %) |
| Hechos con coordenadas utilizables | 30 652 (99,99 %) |
| Alcaldías reconocidas | 16 |
| Límites de alcaldías | «Límite de Alcaldías», CC-BY-4.0-ESP, Marco Geoestadístico 2020 (INEGI) |

Lo comprobado leyendo los cinco archivos completos está en
[`docs/atlas-vial/AUDITORIA-FUENTES.md`](../../docs/atlas-vial/AUDITORIA-FUENTES.md);
la referencia de la API y de cada métrica, en
[`docs/atlas-vial/API-Y-METRICAS.md`](../../docs/atlas-vial/API-Y-METRICAS.md).

## Cómo se ejecuta

```bash
# 1. API (sirve la versión publicada desde MongoDB)
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010

# 2. Sitio del portafolio
cd dist
python -m http.server 8000 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8000/#/area/dashboards/atlas-vial`.

La base de la API se resuelve así: `opts.apiBase` al montar el módulo →
`window.PORTFOLIO_ATLAS_API` → `http://127.0.0.1:8010/api/v1/atlas-vial`.

## Desarrollo del módulo

```bash
cd dashboards/atlas-vial
npm install
npm run dev        # servidor de Vite con el arnés de index.html
npm run typecheck  # TypeScript estricto
npm run build      # bundle a dist/dashboards/atlas-vial/{app.js,app.css}
```

El módulo se compila como **librería ESM** con `mount`/`unmount` exportados;
`dist/projects/atlas-vial.js` lo carga con `import()` dinámico al abrir el
proyecto, así que el resto del sitio (sin empaquetador) no cambia.

## Decisiones que sostienen el tablero

* **Un hecho por folio.** Los cinco recursos tienen una fila por folio y el mismo
  conjunto de folios, así que el cruce es 1:1 y no se usa ninguna unión que pueda
  multiplicar hechos ni víctimas. La validación falla si esto deja de cumplirse.
* **Personas ≠ hechos.** Las personas se suman con los campos del archivo de
  hechos; los desgloses de sexo, edad, tipo de persona y vehículo describen **un
  registro por hecho** y se presentan como «hechos con registro de…», con su
  cobertura.
* **Sin datos no es cero.** «SD», «NA» y los códigos de la fuente se muestran como
  «Sin dato» agrupado; los 3 hechos sin coordenadas y el hecho sin alcaldía
  reconocible se conservan, se cuentan y no se reasignan.
* **Mapa sin terceros.** El mapa usa D3 para escalas y un `canvas` para el dibujo;
  los polígonos vienen del GeoJSON oficial servido por la propia API y los puntos
  de `/puntos`. No hay teselas, tokens ni peticiones a servicios externos. Los
  30 652 puntos se agrupan en el navegador según el zoom: mover o acercar el mapa
  no pide datos ni cambia totales.
* **El recorte por zona se pide.** «Filtrar por zona visible» es una acción
  explícita; desplazarse por el mapa nunca altera las cifras.
* **Filtros con la misma semántica en todo.** OR dentro de una dimensión, AND
  entre dimensiones; el estado vive en la URL y todos los paneles, la tabla y la
  exportación piden el mismo subconjunto.
* **Actualización sin inventar.** El navegador no descarga los CSV: la
  sincronización la ejecuta el backend y publica de forma atómica; si la
  validación falla, la versión anterior sigue publicada.

## Estructura

```
dashboards/atlas-vial/
├── src/
│   ├── AtlasApp.tsx          composición de las tres vistas y estado compartido
│   ├── api/                  tipos y cliente HTTP de la API
│   ├── consultas.ts          consultas (TanStack Query) con claves por filtro
│   ├── estado.ts             almacén (Zustand) y proyección en la URL
│   ├── dominio.ts            formatos, etiquetas y conversión de filtros
│   ├── paleta.ts             colores semánticos y rampas del mapa
│   ├── estilos.css           superficie del tablero (prefijo `at-`)
│   └── ui/                   encabezado, filtros, mapa, paneles, tabla, diálogo
├── tools/                    capturas y verificaciones con Playwright
└── evidencias/               capturas reales del tablero en escritorio y móvil
```

## Verificación

```bash
# Backend: proceso de datos y API
cd backend && .venv/Scripts/python.exe -m pytest tests/test_atlas_vial.py -q

# Endpoints contra los datos reales publicados
cd backend && .venv/Scripts/python.exe scripts/verificar_atlas_vial.py

# Interfaz integrada en el portafolio (requiere sitio y API en marcha)
cd dashboards/atlas-vial && node tools/revisar-portafolio.mjs
```

## Límites conocidos

* Los recursos de personas y vehículos describen a la persona y al vehículo
  principales del expediente, no a todos los involucrados.
* No se calculan tasas por población ni por viajes: la fuente no publica esos
  denominadores.
* La serie es anual y no comparativa por decisión de la propia fuente.
* La automatización diaria **no está activa**; ver
  [`deploy/atlas-vial/LEEME.md`](../../deploy/atlas-vial/LEEME.md).
