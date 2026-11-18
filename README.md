# Portafolio de datos · Hugo Aguilar

Sitio integrador del portafolio: una galería estática agrupada por **cinco
categorías de trabajo**, con fichas de proyecto que declaran estado, categoría
visible y enlaces al repositorio y a la demo publicada.

[![Integridad](https://github.com/Dev-HugoAguilar/portfolio-hugo-aguilar/actions/workflows/tests.yml/badge.svg)](https://github.com/Dev-HugoAguilar/portfolio-hugo-aguilar/actions/workflows/tests.yml)
[![Sitio](https://img.shields.io/badge/sitio-est%C3%A1tico-2f855a)](#ejecutar)
[![Sin cookies](https://img.shields.io/badge/anal%C3%ADtica-ninguna-4a5568)](#límites)

> **Alcance.** Sitio estático: HTML, CSS y JavaScript sin compilación ni backend.
> No usa analítica, cookies ni servicios de terceros en tiempo de ejecución.

---

## Ejecutar

```bash
git clone https://github.com/Dev-HugoAguilar/portfolio-hugo-aguilar.git
cd portfolio-hugo-aguilar
python -m http.server 8000 --directory dist
```

Abre <http://127.0.0.1:8000/>. Las rutas son *hash* (`#/area/<id>/<proyecto>`),
así que el sitio funciona desde cualquier servidor de archivos.

## Las cinco categorías

| # | Categoría | Etiqueta | Fichas |
|---|---|---|---|
| 01 | Dashboards y visualización | Visualización | 7 |
| 02 | Ciencia de datos y Machine Learning | Ciencia de datos | 5 |
| 03 | Ingeniería de datos | Ingeniería de datos | 1 |
| 04 | IA generativa y LLMs | IA generativa | 2 |
| 05 | Agentes y sistemas de decisión | Agentes | 5 |

Cada ficha declara su estado —**Publicado**, **En desarrollo** o
**Próximamente**— y su categoría visible (Finanzas, Movilidad, Marketing,
Demanda, Machine Learning, Logística…). Los casos «Próximamente» se muestran
atenuados y con distintivo de *roadmap*: siguen visibles para comunicar el plan.

## Repositorios de los proyectos

Los nueve proyectos con código publicado enlazan a su repositorio desde la
tarjeta y desde la ficha:

| Proyecto | Repositorio |
|---|---|
| Vidas en tránsito | [`vidas-en-transito`](https://github.com/Dev-HugoAguilar/vidas-en-transito) |
| Walmart M5 · planeación de demanda | [`demand-forecasting-m5`](https://github.com/Dev-HugoAguilar/demand-forecasting-m5) |
| Clientes y campañas · Clientes en movimiento | [`customer-growth-intelligence`](https://github.com/Dev-HugoAguilar/customer-growth-intelligence) |
| RetailOps Unified | [`retailops-unified`](https://github.com/Dev-HugoAguilar/retailops-unified) |
| Briefing con evidencia · Banco de México | [`banxico-evidence-briefing`](https://github.com/Dev-HugoAguilar/banxico-evidence-briefing) |
| Copiloto NL-to-SQL | [`nl2sql-economic-copilot`](https://github.com/Dev-HugoAguilar/nl2sql-economic-copilot) |
| Data Incident Commander | [`data-incident-commander`](https://github.com/Dev-HugoAguilar/data-incident-commander) |
| DockMind | [`dockmind-demand-planning`](https://github.com/Dev-HugoAguilar/dockmind-demand-planning) |

## Estructura

```text
dist/                  Sitio servible
  index.html           Documento único del sitio
  app.js               Navegación, vistas y renderizado
  content.js           Contenido: áreas, fichas, estados y enlaces
  style.css            Sistema visual
  projects/            Módulos que montan cada demo en su ficha
  dashboards/          Demos publicadas (una carpeta por proyecto)
  img/                 Capturas de tarjeta y ficha
tools/                 Verificadores de navegador y utilidades
  verificar-taxonomia.mjs   Comprueba las cinco categorías, estados y enlaces
```

## Verificación

La estructura de la galería y de las tarjetas se verifica en un navegador real:

```bash
# requiere el sitio servido y Playwright disponible
node tools/verificar-taxonomia.mjs
```

Comprueba el orden de las cinco áreas, sus etiquetas, el recuento de casos por
estado, las fichas de cada área, los enlaces a repositorio y demo, el tratamiento
de *roadmap* y la ausencia de desbordes a 390 px.

La integración continua ejecuta además la comprobación de sintaxis del JavaScript
del sitio y el escaneo de credenciales.

## Límites

- Sitio estático sin backend: las demos funcionan con archivos del mismo origen.
- Algunas demos se montan como aplicaciones dentro de la ficha y no se abren
  fuera del sitio; la tarjeta ofrece el enlace directo cuando existe una demo
  publicada.
- No hay analítica ni seguimiento de usuarios.
- El contenido editorial vive en `dist/content.js`; la aplicación de cada
  proyecto, en `dist/projects/` y `dist/dashboards/`.

## Seguridad y contribución

El repositorio no contiene credenciales ni datos personales. Ver
[`SECURITY.md`](SECURITY.md) y [`CONTRIBUTING.md`](CONTRIBUTING.md).
