# Marketing y clientes · Adquisición, conversión y retención

Tablero interactivo para leer un embudo de comercio electrónico a partir de la
**muestra pública y ofuscada de Google Analytics 4 en BigQuery**, integrado en el
portafolio como proyecto del área «Dashboards y visualización» (categoría
**Marketing**).

Cuatro vistas comparten un mismo estado de filtros y una misma versión publicada:

- **Resumen**: indicadores del periodo, evolución diaria con selección por
  arrastre y **mapa de desempeño de canales** (usuarios × conversión, área =
  compras, referencia = conversión global; al pulsar una burbuja se filtra el
  tablero).
- **Adquisición**: **ranking interactivo** de canales con barras de usuarios y
  panel alineado de conversión, ordenable por volumen, conversión, compradores o
  ingresos; al seleccionar un canal se abre su evolución, dispositivos, países e
  indicadores conciliados. Bloque «Productos y compra» con granularidad declarada
  y tabla accesible como alternativa.
- **Conversión**: embudo de cuatro etapas con **bandas proporcionales**, salidas
  laterales por etapa y detalle de cada transición (sesiones que avanzaron, que no
  completaron, conversión y distribución del tiempo entre etapas).
- **Cohortes y retención**: **curvas por segmento** (canal, dispositivo o país),
  matriz con S0 al 100 % como referencia y **puntos emparejados** de retorno y
  compra en S1.

## Estado actual: tablero funcional con datos reales

La versión publicada contiene **1 343 898 documentos** de la muestra pública de
GA4 (1 nov 2020 – 31 ene 2021): 4 295 584 eventos, 270 154 usuarios, 360 974
sesiones, 5 256 compras y 337 314.00 USD de ingresos, reconciliados con una
consulta de control en BigQuery.

Arquitectura: BigQuery → extracción (solo preparación) → copia original con
manifiesto → normalización por versiones en MongoDB → API FastAPI → tablero. La
API **no consulta Google**: el arranque, los filtros, las exportaciones y los
diagnósticos funcionan sin credenciales de Google.

Pendiente declarado: la cadena de **MongoDB Atlas** entregada en este entorno
todavía no autentica (usuario y contraseña sin rellenar / IP sin autorizar), así
que la versión servida se apoya en una instancia local de desarrollo. El detalle
está en [`docs/marketing-clientes/FUENTE-Y-ACCESO.md`](../../docs/marketing-clientes/FUENTE-Y-ACCESO.md)
y se comprueba con `python -m scripts.verificar_atlas`.

## Datos

| Dato | Valor |
| --- | --- |
| Conjunto | `bigquery-public-data.ga4_obfuscated_sample_ecommerce` (`events_*`) |
| Documentación | <https://developers.google.com/analytics/bigquery/web-ecommerce-demo-dataset> |
| Periodo documentado | 2020-11-01 → 2021-01-31 |
| Condición | Muestra **histórica y ofuscada**: puede contener valores de marcador y su consistencia interna es limitada |
| Licencia | BigQuery Public Datasets (datos de demostración) |
| Estado de publicación | `desarrollo` — sin versión publicada por falta de acceso |

## Cómo se ejecuta

```bash
# 1. API (sirve la versión publicada desde MongoDB)
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010

# 2. Sitio del portafolio
cd dist
python -m http.server 8000 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8000/#/area/dashboards/marketing-clientes`.

La base de la API se resuelve así: `opts.apiBase` al montar el módulo →
`window.PORTFOLIO_MARKETING_API` → `http://127.0.0.1:8010/api/v1/marketing`.

## Ingesta

```bash
cd backend
.venv/Scripts/python.exe -m scripts.importar_marketing --diagnostico  # ¿hay acceso?
.venv/Scripts/python.exe -m scripts.importar_marketing                # consulta y publica
.venv/Scripts/python.exe -m scripts.importar_marketing --estado       # estado publicado
```

La ingesta resuelve el acceso en dos pasos (`google-cloud-bigquery` con
credenciales de aplicación por omisión y, si no, la herramienta `bq`),
**inspecciona el esquema real** antes de calcular, ejecuta las consultas agregadas,
valida coherencias y publica de forma atómica. Si algo falla, conserva la versión
anterior y registra el intento con su motivo.

Códigos de salida: `0` publicado o sin cambios · `1` fallo de validación ·
`3` sin acceso a BigQuery (no se publica nada).

## Desarrollo del módulo

```bash
cd dashboards/marketing-clientes
npm install
npm run dev        # arnés de Vite con index.html
npm run typecheck  # TypeScript estricto
npm run build      # bundle a dist/dashboards/marketing-clientes/{app.js,app.css}
```

El módulo se compila como **librería ESM** con `mount`/`unmount`; el portafolio lo
carga con `import()` dinámico, así que el resto del sitio no cambia.

## API

Ocho endpoints bajo `/api/v1/marketing`, todos con los mismos parámetros de filtro
(`desde`, `hasta`, `canal`, `dispositivo`, `pais`, `buscar`):

`/estado` · `/catalogo` · `/resumen` · `/adquisicion` · `/conversion` ·
`/cohortes` · `/tabla` · `/exportar` · `/dimensiones`

Mientras no haya versión publicada, los endpoints de datos responden **200 con
`datos_disponibles: false`** y el motivo: la interfaz muestra el estado pendiente en
lugar de ceros.

## Decisiones que sostienen el tablero

* **Unidades explícitas.** Usuario, sesión y compra tienen definición propia y se
  aplican igual en las cuatro vistas; los desgloses no se suman entre sí.
* **Los usuarios no se suman por día.** Se guarda un hash con sal por versión de
  `user_pseudo_id` para contar personas distintas sin almacenar el identificador.
* **Compras deduplicadas** por usuario + transacción; los ingresos salen solo de
  esas compras, en USD.
* **Adquisición ≠ atribución.** El canal es el de la primera actividad observada
  del usuario; el conjunto no documenta atribución por sesión y el tablero lo dice.
* **Embudo con orden y ventana** (24 h), con las diferencias mostradas como
  conteos, no como «abandono».
* **Cohortes honestas.** Las semanas sin ventana de observación se muestran vacías
  y marcadas, nunca como retención cero. Volver y recomprar se leen por separado.
* **Nada de datos inventados.** Sin acceso a BigQuery, el tablero declara el
  bloqueo, documenta el motivo y la vía de desbloqueo.

## Estructura

```
dashboards/marketing-clientes/
├── src/
│   ├── App.tsx              composición de las cuatro vistas y estado compartido
│   ├── api/                 tipos y cliente HTTP
│   ├── consultas.ts         consultas (TanStack Query) con claves por filtro
│   ├── estado.ts            almacén (Zustand) y proyección en la URL
│   ├── dominio.ts           formatos, etiquetas y filtros
│   ├── paleta.ts            colores semánticos y rampa de retención
│   ├── estilos.css          superficie del tablero (prefijo `mk-`)
│   └── ui/                  encabezado, filtros, indicadores, serie, embudo,
│                            cohortes, tabla, metodología y estado pendiente
├── tools/                   capturas y verificación con Playwright
└── evidencias/              capturas reales de escritorio y móvil
```

## Verificación

```bash
# Proceso de datos y API (fixture solo en la base de pruebas)
cd backend && .venv/Scripts/python.exe -m pytest tests/test_marketing.py -q

# Estado real del producto, sin datos: 19 comprobaciones
cd dashboards/marketing-clientes && node tools/revisar.mjs           # escritorio
cd dashboards/marketing-clientes && node tools/revisar.mjs --movil   # móvil

# Interfaz CON datos, usando una versión de demostración: 21 comprobaciones
cd backend
set MONGODB_DB=hugo_portfolio_demo
.venv/Scripts/python.exe -m tests.sembrar_demo
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8011
cd ..\dashboards\marketing-clientes && node tools/verificar-ui-demo.mjs
```

La versión de demostración vive en una base **aparte** (`hugo_portfolio_demo`) y
se publica con el mismo código de producción; las capturas `demo-*.png` de
`evidencias/` están etiquetadas como datos de prueba y **no** son cifras del
conjunto GA4.

## Límites conocidos

* Sin acceso a BigQuery no hay cifras: el tablero muestra el estado pendiente.
* El periodo termina el 31 de enero de 2021 y no se actualiza en tiempo real.
* La tabla de detalle es un extracto determinista, no el universo de eventos.
* No hay atribución por sesión, ni reparto de ingresos por categoría, ni causalidad.
