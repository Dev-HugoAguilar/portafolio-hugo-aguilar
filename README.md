# Portafolio de datos · Hugo Aguilar

Sitio integrador del portafolio: **20 fichas** de proyecto organizadas en **cinco
categorías oficiales**, cada una con su estado, su categoría visible y el enlace a
su repositorio público.

[![Integridad](https://github.com/Dev-HugoAguilar/portafolio-hugo-aguilar/actions/workflows/tests.yml/badge.svg)](https://github.com/Dev-HugoAguilar/portafolio-hugo-aguilar/actions/workflows/tests.yml)
[![Sitio](https://img.shields.io/badge/sitio-est%C3%A1tico-2f855a)](#ejecutar)
[![Repositorios](https://img.shields.io/badge/repositorios%20p%C3%BAblicos-18-4a5568)](#infraestructura-compartida)

> **Alcance.** Sitio estático: HTML, CSS y JavaScript sin compilación ni backend.
> No usa analítica, cookies ni servicios de terceros en tiempo de ejecución.

**Estados**: `Publicado` — terminado, documentado y verificable · `En desarrollo` — en construcción, sin resultados publicados · `Próximamente` — caso definido y pendiente de desarrollo (*roadmap*).

---

## 01 · Dashboards y visualización

`Etiqueta: Visualización`

| # | Proyecto | Estado | Categoría | Repositorio |
|---|---|---|---|---|
| 1 | Banca múltiple mexicana — Comparativo financiero | Publicado | Finanzas | [`mexican-banking-analytics`](https://github.com/Dev-HugoAguilar/mexican-banking-analytics) |
| 2 | Atlas vial · Ciudad de México | Publicado | Movilidad | [`cdmx-traffic-atlas`](https://github.com/Dev-HugoAguilar/cdmx-traffic-atlas) |
| 3 | Marketing y clientes | En desarrollo | Marketing | [`ga4-marketing-analytics`](https://github.com/Dev-HugoAguilar/ga4-marketing-analytics) |
| 4 | Pulso comercial · Walmex | Publicado | Finanzas | [`walmex-financial-pulse`](https://github.com/Dev-HugoAguilar/walmex-financial-pulse) |
| 5 | Vidas en tránsito | En desarrollo | Ciencia de datos · Observatorio humanitario | [`vidas-en-transito`](https://github.com/Dev-HugoAguilar/vidas-en-transito) |
| 6 | Observatorio financiero de México | Próximamente | Finanzas | Sin repositorio (Roadmap) |
| 7 | ORBITA — Inteligencia orbital | En desarrollo | Ingeniería de datos y visualización | [`orbita-orbital-intelligence`](https://github.com/Dev-HugoAguilar/orbita-orbital-intelligence) |

## 02 · Ciencia de datos y Machine Learning

`Etiqueta: Ciencia de datos`

| # | Proyecto | Estado | Categoría | Repositorio |
|---|---|---|---|---|
| 1 | Walmart M5 — Planeación de demanda y evaluación de pronósticos | Publicado | Demanda | [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5) |
| 2 | Clientes y campañas — Segmentación, propensión e incrementalidad | Publicado | Marketing | [`customer-growth-intelligence`](https://github.com/Dev-HugoAguilar/customer-growth-intelligence) |
| 3 | Clientes en movimiento | Publicado | Marketing | [`customer-growth-intelligence`](https://github.com/Dev-HugoAguilar/customer-growth-intelligence) |
| 4 | Gaza · Vidas y territorio | Publicado | Observatorio humanitario | [`gaza-humanitarian-observatory`](https://github.com/Dev-HugoAguilar/gaza-humanitarian-observatory) |
| 5 | RetailOps Unified | Publicado | Machine Learning | [`retailops-unified`](https://github.com/Dev-HugoAguilar/retailops-unified) |

## 03 · Ingeniería de datos

`Etiqueta: Ingeniería de datos`

| # | Proyecto | Estado | Categoría | Repositorio |
|---|---|---|---|---|
| 1 | Modernización SAS → Python | Próximamente | Arquitectura & ETL | Sin repositorio (Roadmap) |

## 04 · IA generativa y LLMs

`Etiqueta: IA generativa`

| # | Proyecto | Estado | Categoría | Repositorio |
|---|---|---|---|---|
| 1 | Briefing con evidencia · Banco de México | En desarrollo | RAG / Finanzas | [`banxico-evidence-briefing`](https://github.com/Dev-HugoAguilar/banxico-evidence-briefing) |
| 2 | Copiloto NL-to-SQL · indicadores económicos de México | En desarrollo | NL-to-SQL | [`nl2sql-economic-copilot`](https://github.com/Dev-HugoAguilar/nl2sql-economic-copilot) |

## 05 · Agentes y sistemas de decisión

`Etiqueta: Agentes`

| # | Proyecto | Estado | Categoría | Repositorio |
|---|---|---|---|---|
| 1 | Data Incident Commander | En desarrollo | Data Reliability | [`data-incident-commander`](https://github.com/Dev-HugoAguilar/data-incident-commander) |
| 2 | The Ripple Room — disrupciones de semiconductores | En desarrollo | Simulación / Supply Chain | [`ripple-room-supply-chain`](https://github.com/Dev-HugoAguilar/ripple-room-supply-chain) |
| 3 | Kilómetro Cero — control de red de envíos | En desarrollo | Logística | [`kilometro-cero-logistics`](https://github.com/Dev-HugoAguilar/kilometro-cero-logistics) |
| 4 | DockMind — pronóstico y planificación de inventario | En desarrollo | Operaciones | [`dockmind-demand-planning`](https://github.com/Dev-HugoAguilar/dockmind-demand-planning) |
| 5 | Analista asistido por IA | Próximamente | Agentes | Sin repositorio (Roadmap) |

## Infraestructura compartida

| Repositorio | Qué contiene |
|---|---|
| [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api) | API de solo lectura (FastAPI + MongoDB Atlas) que sirve a los tableros de las cinco categorías. |
| [`portafolio-hugo-aguilar`](https://github.com/Dev-HugoAguilar/portafolio-hugo-aguilar) | Este sitio integrador: galería, fichas y montaje de las demos. |

## Estado de publicación

Los **18 repositorios** enlazados se verificaron por API el **26 de noviembre de
2026**: los 18 responden **HTTP 200** y son públicos. Por eso ninguna fila de las
tablas anteriores lleva la marca *(Pendiente de publicación)*.

Los tres casos **Próximamente** —Observatorio financiero de México, Modernización
SAS → Python y Analista asistido por IA— no tienen repositorio todavía: solo
tienen caso definido. Cuando se publiquen se añadirá su enlace a la tabla y su
`codigoUrl` en el contenido; el sitio solo dibuja un enlace cuando el repositorio
existe, de modo que una fila nunca apunta a un destino inexistente.

## Stack tecnológico

**Cómo leer esta sección.** La auditoría de los 18 repositorios públicos distingue
tres niveles, para que nada se atribuya sin respaldo:

- ✅ **Demostrado** — la tecnología se importa o se configura en un repositorio
  público enlazado en esta tabla.
- ◐ **Documentado** — aparece en el diseño o en un caso de roadmap, sin
  repositorio público.
- ○ **Experiencia profesional** — se ha usado en contextos laborales, sin un
  repositorio público que lo demuestre.

### Ciencia de datos y Machine Learning

| Tecnología | Nivel | Dónde se demuestra |
|---|---|---|
| Python | ✅ | 15 repositorios: [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api), [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5), [`customer-growth-intelligence`](https://github.com/Dev-HugoAguilar/customer-growth-intelligence) y el resto de pipelines |
| Pandas | ✅ | [`customer-growth-intelligence`](https://github.com/Dev-HugoAguilar/customer-growth-intelligence), [`dockmind-demand-planning`](https://github.com/Dev-HugoAguilar/dockmind-demand-planning) |
| NumPy | ✅ | [`customer-growth-intelligence`](https://github.com/Dev-HugoAguilar/customer-growth-intelligence), [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5), [`dockmind-demand-planning`](https://github.com/Dev-HugoAguilar/dockmind-demand-planning) |
| SciPy | ✅ | [`customer-growth-intelligence`](https://github.com/Dev-HugoAguilar/customer-growth-intelligence) (potencia estadística y corrección de Holm) |
| Scikit-learn | ✅ | [`customer-growth-intelligence`](https://github.com/Dev-HugoAguilar/customer-growth-intelligence) (K-Means y propensión), [`dockmind-demand-planning`](https://github.com/Dev-HugoAguilar/dockmind-demand-planning) (Ridge y Random Forest multisalida) |
| LightGBM | ✅ | [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5) (modelo global por horizonte), [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api) |
| XGBoost | ○ | Experiencia profesional. No se usa en estos repositorios |
| Optuna | ○ | Experiencia profesional. La búsqueda de hiperparámetros de los casos publicados usa rejillas y cortes fijos |
| Validación cruzada y selección de modelo | ✅ | [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5): cortes de desarrollo para elegir por WAPE y cortes reservados para evaluar; [`customer-growth-intelligence`](https://github.com/Dev-HugoAguilar/customer-growth-intelligence): validación temporal y de estabilidad entre semillas |
| Pipelines de datos analíticos | ✅ | [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api) (ingesta idempotente con revisiones por hash), [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5) (importar → entrenar → pronosticar → agregar) |

### IA generativa y LLMs

| Capacidad | Nivel | Dónde se demuestra |
|---|---|---|
| Integración de modelos de lenguaje por API | ✅ | [`banxico-evidence-briefing`](https://github.com/Dev-HugoAguilar/banxico-evidence-briefing) (proveedor compatible con OpenAI, respuesta condicionada a la evidencia), [`nl2sql-economic-copilot`](https://github.com/Dev-HugoAguilar/nl2sql-economic-copilot) (plan JSON del modelo, validado antes de tocar la base) |
| Diseño de prompts contextuales | ✅ | [`banxico-evidence-briefing`](https://github.com/Dev-HugoAguilar/banxico-evidence-briefing): se envía solo la evidencia recuperada y se exige citar `[BM-…]` |
| Arquitecturas RAG | ✅ | [`banxico-evidence-briefing`](https://github.com/Dev-HugoAguilar/banxico-evidence-briefing): corpus versionado, recuperación léxica y abstención. **Sin embeddings**: el repositorio lo declara como límite, no como equivalencia |
| Flujos con agentes | ✅ | [`data-incident-commander`](https://github.com/Dev-HugoAguilar/data-incident-commander): agente supervisado que diagnostica, propone y se detiene para aprobación humana |
| Validación de entradas y salidas | ✅ | [`nl2sql-economic-copilot`](https://github.com/Dev-HugoAguilar/nl2sql-economic-copilot) (plan descartado si no pasa reglas), [`banxico-evidence-briefing`](https://github.com/Dev-HugoAguilar/banxico-evidence-briefing) (verificación de cita), [`data-incident-commander`](https://github.com/Dev-HugoAguilar/data-incident-commander) (reglas y límites de autoridad) |
| Orquestación multiagente en producción | ○ | Experiencia profesional. Los casos publicados usan un agente con aprobación humana, no una malla de agentes |

### Ingeniería de datos, bases de datos y cloud

| Tecnología | Nivel | Dónde se demuestra |
|---|---|---|
| SAS → Python: macros y reportes regulatorios (CNBV / banca) | ◐ ○ | Caso de roadmap *Modernización SAS → Python* (sin repositorio) y experiencia profesional en migración de procesos SAS con macros y reportes regulatorios |
| SQL | ✅ | [`nl2sql-economic-copilot`](https://github.com/Dev-HugoAguilar/nl2sql-economic-copilot) (plantillas parametrizadas sobre SQLite en solo lectura), [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api) (agregaciones y consultas) |
| MongoDB Atlas | ✅ | [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api) (pymongo, índices, importadores idempotentes con revisiones por hash), [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5) |
| SQLite | ✅ | [`nl2sql-economic-copilot`](https://github.com/Dev-HugoAguilar/nl2sql-economic-copilot) (base derivada abierta en modo lectura) |
| Neo4j · Cypher | ○ | Experiencia profesional en grafos y consultas Cypher. No hay repositorio público con Neo4j |
| Spark | ○ | Experiencia profesional. Los volúmenes de los casos publicados caben en memoria |
| Kafka | ○ | Experiencia profesional |
| HDFS | ○ | Experiencia profesional |
| Snowflake | ○ | Experiencia profesional |
| BigQuery | ✅ | [`ga4-marketing-analytics`](https://github.com/Dev-HugoAguilar/ga4-marketing-analytics), [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api) (extracción de la muestra pública de GA4) |
| Docker | ✅ | [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api) (`Dockerfile`) |
| Docker Compose | ◐ | Orquestación local del monorepo de trabajo; el archivo no se publica porque describe rutas y volúmenes del entorno de desarrollo |
| FastAPI | ✅ | [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api) y los servicios de dominio de varios repositorios |
| Pydantic | ✅ | [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api), [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5), [`data-incident-commander`](https://github.com/Dev-HugoAguilar/data-incident-commander), [`banxico-evidence-briefing`](https://github.com/Dev-HugoAguilar/banxico-evidence-briefing), [`nl2sql-economic-copilot`](https://github.com/Dev-HugoAguilar/nl2sql-economic-copilot) |
| APIs REST | ✅ | [`portfolio-api`](https://github.com/Dev-HugoAguilar/portfolio-api) (`/api/v1/…`) y las aplicaciones que la consumen |
| Git | ✅ | Los 18 repositorios, con commits convencionales |

### Business Intelligence y visualización

| Tecnología | Nivel | Dónde se demuestra |
|---|---|---|
| Power BI | ○ | Experiencia profesional en tableros corporativos. No hay `.pbix` publicado |
| D3.js | ✅ | 10 repositorios: [`vidas-en-transito`](https://github.com/Dev-HugoAguilar/vidas-en-transito), [`dockmind-demand-planning`](https://github.com/Dev-HugoAguilar/dockmind-demand-planning), [`cdmx-traffic-atlas`](https://github.com/Dev-HugoAguilar/cdmx-traffic-atlas), [`banxico-evidence-briefing`](https://github.com/Dev-HugoAguilar/banxico-evidence-briefing) y el resto |
| React | ✅ | [`cdmx-traffic-atlas`](https://github.com/Dev-HugoAguilar/cdmx-traffic-atlas), [`mexican-banking-analytics`](https://github.com/Dev-HugoAguilar/mexican-banking-analytics), [`ga4-marketing-analytics`](https://github.com/Dev-HugoAguilar/ga4-marketing-analytics), [`walmex-financial-pulse`](https://github.com/Dev-HugoAguilar/walmex-financial-pulse), [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5) |
| Vite | ✅ | Los cinco proyectos React anteriores, con build verificado en CI |
| HTML5 / CSS3 moderno | ✅ | Todos los sitios: sistema visual propio, sin frameworks de UI |
| Streamlit | ○ | Experiencia profesional en prototipos analíticos |
| Plotly | ○ | Experiencia profesional |
| MapLibre GL · Three.js · SGP4 | ✅ | [`kilometro-cero-logistics`](https://github.com/Dev-HugoAguilar/kilometro-cero-logistics) (mapa vectorial), [`orbita-orbital-intelligence`](https://github.com/Dev-HugoAguilar/orbita-orbital-intelligence) (Tierra 3D y propagación orbital) |
| Playwright · jsdom | ✅ | Verificadores de navegador de los repositorios y pruebas de interfaz en CI |

**Resumen de la auditoría.** De las tecnologías solicitadas, **17 tienen evidencia
pública** en estos repositorios (*Python, Pandas, NumPy, SciPy, Scikit-learn,
LightGBM, SQL/SQLite, MongoDB Atlas, BigQuery, Docker, FastAPI, Pydantic, REST,
Git, D3.js, React y Vite*), **2 están documentadas sin demo** (*SAS → Python*,
*Docker Compose*) y **11 se declaran como experiencia profesional sin repositorio
público** (*XGBoost, Optuna, Neo4j/Cypher, Spark, Kafka, HDFS, Snowflake, Power
BI, Streamlit, Plotly y orquestación multiagente*).

Esa separación es deliberada: un portafolio que atribuye a un repositorio lo que
el repositorio no demuestra pierde credibilidad en la primera entrevista técnica.
Cuando alguno de los casos pendientes incorpore una de esas tecnologías, su nivel
pasará a ✅ con el enlace correspondiente.
## Ejecutar

```bash
git clone https://github.com/Dev-HugoAguilar/portafolio-hugo-aguilar.git
cd portafolio-hugo-aguilar
python -m http.server 8000 --directory dist
```

Abre <http://127.0.0.1:8000/>. Las rutas son *hash*
(`#/area/<id>/<proyecto>`), así que el sitio funciona desde cualquier servidor de
archivos.

## Estructura

```text
dist/                  Sitio servible
  index.html           Documento único del sitio
  app.js               Navegación, vistas y renderizado
  content.js           Contenido: áreas, fichas, estados, categorías y enlaces
  style.css            Sistema visual
  projects/            Módulos que montan cada demo en su ficha
  dashboards/          Demos publicadas (una carpeta por proyecto)
  img/                 Capturas de tarjeta y ficha
tools/
  verificar-taxonomia.mjs   Comprueba categorías, estados, enlaces y roadmap
```

## Verificación

```bash
node tools/verificar-taxonomia.mjs
```

Comprueba en un navegador real el orden de las cinco áreas, sus etiquetas, el
recuento de casos por estado, las fichas de cada área, los 17 enlaces a
repositorio, los 12 enlaces a demo, el tratamiento de *roadmap* y la ausencia de
desbordes a 390 px.

La integración continua ejecuta además la comprobación de sintaxis del JavaScript
del sitio, la validación de la taxonomía (5 áreas, etiquetas, estados y URL de
repositorio) y el escaneo de credenciales.

## Límites

- Sitio estático sin backend: las demos funcionan con archivos del mismo origen.
- Algunas demos se montan dentro de la ficha y no se abren fuera del sitio; la
  tarjeta ofrece el enlace directo cuando existe una demo publicada.
- Dos fichas comparten repositorio (*Clientes y campañas* y *Clientes en
  movimiento* documentan dos enfoques del mismo trabajo).
- No hay analítica ni seguimiento de usuarios.

## Seguridad y contribución

El repositorio no contiene credenciales ni datos personales. Ver
[`SECURITY.md`](SECURITY.md) y [`CONTRIBUTING.md`](CONTRIBUTING.md).
