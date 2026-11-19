# Atlas Comercial (Walmart M5)

Análisis de ventas históricas y pronóstico diario a 28 días con Walmart M5.

El tablero se organiza en **seis pantallas** que siguen el ciclo de un proyecto de
ciencia de datos: **Proyecto → Datos y calidad → Exploración → Modelado → Evaluación →
Resultados**. Cada pantalla tiene su propia dirección, su título y su propósito, y
reutiliza los cálculos y componentes ya verificados; no hay una reconstrucción desde cero.

## Ruta

| Qué | Dónde |
|---|---|
| Proyecto en el portafolio | `#/area/ciencia-de-datos/atlas-comercial` |
| Pantalla (parámetro `ac_pantalla`) | `proyecto` · `datos` · `exploracion` · `modelado` · `evaluacion` · `resultados` |
| Subsección de Exploración (`ac_sub`) | `panorama` · `estacionalidad` · `precios` · `articulo` |
| Tienda del análisis de precios (`ac_tienda_precios`) | cualquier `store_id` del catálogo (pantalla «Datos y calidad») |
| Tablero (módulo compilado) | `dist/dashboards/atlas-comercial/app.js` + `app.css` |
| Código del tablero | `dashboards/atlas-comercial/` |
| API | `/api/v1/comercial/m5/{estado,catalogo,productos,pulso,historico,comparacion,estacionalidad,matriz-temporal,articulo,intermitencia,precios/*,pronosticos,evaluacion,evaluacion-ventanas,matriz-horizontes,modelos,planificacion,planificacion/serie,planificacion/exportar,evaluacion-horizonte}` |
| Backend del proyecto | `backend/app/comercial/`, `backend/app/api/v1/routes/comercial.py` |
| Pruebas | `backend/tests/` (**298 casos** en la suite completa) |
| Verificación del tablero | `tools/verificar-pantallas.mjs` (seis pantallas), `tools/verificar-resultados.mjs` (selección y estados del pronóstico), `tools/verificar-exploracion.mjs`, `tools/verificar-modelo.mjs`, `tools/verificar-territorio.mjs`, `tools/verificar-drilldown.mjs`, `tools/verificar-atlas-comercial.mjs`, `tools/verificar-ficha.mjs` |

### Direcciones de las seis pantallas

| Pantalla | URL (con el hash del portafolio delante del `#`) | Propósito |
|---|---|---|
| Proyecto | `/?ac_pantalla=proyecto#/area/ciencia-de-datos/atlas-comercial` | problema, fuentes, alcance, método y resultados principales |
| Datos y calidad | `/?ac_pantalla=datos#/area/ciencia-de-datos/atlas-comercial` | fuentes, estructura, cobertura, ceros, precios, reconciliación y versión |
| Exploración | `/?ac_pantalla=exploracion#/area/ciencia-de-datos/atlas-comercial` | panorama, estacionalidad, precios y detalle de artículo (`ac_sub`) |
| Modelado | `/?ac_pantalla=modelado#/area/ciencia-de-datos/atlas-comercial` | datos, variables, 28 pasos, baseline, anti-fuga y detalle técnico |
| Evaluación | `/?ac_pantalla=evaluacion#/area/ciencia-de-datos/atlas-comercial` | protocolo, comparación, corte histórico, ventana × horizonte y tabla completa |
| Resultados | `/?ac_pantalla=resultados#/area/ciencia-de-datos/atlas-comercial` | pronóstico de 28 días, desglose y descarga de la selección |

Las direcciones anteriores siguen funcionando: `ac_sec=panorama|estacionalidad|precios|articulo`
se traduce a `exploracion` con la misma subsección y se reescribe a la nueva forma sin
perder `ac_estado`, `ac_tienda`, `ac_cat`, `ac_dept`, `ac_skus`, `ac_anio`, `ac_modo`,
periodo ni A/B. Cambiar de pantalla **añade** una entrada de historial (Atrás/Adelante
funcionan); ajustar un filtro dentro de la misma pantalla la reemplaza.

> El encargo proponía `/api/comercial/m5/...`; el repositorio monta toda la API bajo
> `/api/v1`, así que se respeta esa convención y queda documentado aquí.

## Datos

Fuente: **M5 Forecasting - Accuracy** (Kaggle) —
https://www.kaggle.com/competitions/m5-forecasting-accuracy/data

- `sales_train_evaluation.csv` (unidades diarias por producto × tienda) — obligatorio.
- `calendar.csv` (fecha de cada `d_N`, eventos y SNAP) — obligatorio.
- `sell_prices.csv` (precio semanal por producto × tienda) — se usa en la exploración de
  precios y en la variante de precios del modelo; no produce métricas de ingresos.

Si solo existe `sales_train_validation.csv`, se importa con su cobertura real
(1913 días) y el manifiesto lo declara. Los dos archivos de ventas **no** se mezclan.

Los CSV no se versionan en el repositorio (condiciones de la competición). Se colocan
en `backend/data/m5/` y se importan en local.

**Estado actual:** la versión publicada es `m5-85e8ac8df562` (30 490 series, 1 941 días
con ventas, 66 927 173 unidades, 3 estados, 10 tiendas, 3 categorías y 7 departamentos).
Si no hubiera versión publicada, la API lo declararía y el tablero mostraría «Datos
pendientes de importar» sin cifras: ese estado sigue implementado y probado.

## Validación, importación y publicación segura

`python -m scripts.importar_m5 --validar` **no escribe nada** y comprueba, en una
sola pasada sin descartar registros:

- columnas requeridas y número de columnas `d_*` frente al calendario;
- identificadores únicos `item_id × store_id` (aborta e informa si hay repetidos);
- cantidades numéricas, finitas, enteras y no negativas (aborta indicando serie y día);
- fechas de calendario únicas y consecutivas, y correspondencia `d_N` ↔ fecha;
- tiendas, estados, categorías y departamentos observados;
- cobertura efectiva de ventas y, por separado, días de calendario **sin** ventas
  (M5 publica 1969 días de calendario y 1941 de ventas en evaluación);
- hashes SHA-256 y conteos que irán al manifiesto.

`python -m scripts.importar_m5` publica así:

- la versión se deriva del contenido (archivo + días + hashes), de modo que reejecutar
  no duplica;
- el calendario es **compartido**: si ya existe, se comprueba la compatibilidad
  `d → fecha` para los días con ventas y, si difiere, se aborta en lugar de
  sobrescribirlo (otra versión publicada depende de él);
- los documentos se escriben por lotes con `_id` deterministas;
- si la versión reimportada **es la activa**, no se borra: se reescribe por upsert y
  nunca queda incompleta; si no lo es, solo se limpian los documentos de esa versión;
- el puntero `m5_estado` se mueve **después** de validar reconciliación y calendario.

## Puesta en marcha

```bash
cd backend
python -m scripts.importar_m5 --validar       # cabeceras, hashes y versión
python -m scripts.importar_m5                 # importa por lotes y publica
python -m scripts.agregar_m5                  # derivado tienda × departamento (idempotente)
python -m scripts.pronosticar_m5              # baseline + backtesting (28 días)
python -m scripts.inventario_m5               # documentos, datos e índices
python -m scripts.inventario_m5 --exportar exportacion/m5   # paquete compacto
uvicorn app.main:app --port 8010
```

```bash
cd dashboards/atlas-comercial
npm install
npm run build        # tsc --noEmit && vite build → dist/dashboards/atlas-comercial
```

Sitio estático del portafolio: `cd dist && python -m http.server 8000`.

## Destino de escritura (verificado antes de conectar)

`app/comercial/conexion.py` valida el destino **sin abrir conexión** y rechaza:

- `mongodb+srv://` (siempre);
- hosts distintos de `127.0.0.1`, `localhost` o `::1`;
- esquemas que no sean `mongodb://`;
- que la URI y `COMERCIAL_MONGODB_DB` declaren bases distintas.

El proyecto usa **solo** `COMERCIAL_MONGODB_URI`; nunca hereda `MONGODB_URI`. Base
exclusiva: **`atlas_comercial_local`** (por omisión y en `.env`). La API publica el
destino sin credenciales en `/estado` (`destino`, `base`). Hay pruebas que verifican
el rechazo de URIs remotas sin crear cliente (`test_destino_rechaza_remotos_sin_abrir_red`).

| Colección | Documento | Por qué |
|---|---|---|
| `m5_importaciones` | Manifiesto por versión: archivos, hashes SHA-256, fechas, cobertura, conteos y validaciones. | Reproducibilidad y control de versiones. |
| `m5_estado` | Puntero `{_id:"actual", version}`. | Publicar en bloque, sin estados intermedios. |
| `m5_calendario` | Un documento por día (`d`, `fecha`, semana, evento, `snap`). | Traducir `d_N` a fecha sin abrir el CSV. |
| `m5_catalogo` | Tiendas, estados, categorías, departamentos y productos (`tipo`). | Filtros, búsqueda y validación de códigos. |
| `m5_agregados` | Un documento por `(versión, dimensión, clave)` con `d_inicio` y el vector diario. | Sirve series y comparación A/B con decenas de documentos. |
| `m5_bloques` | Serie producto × tienda en bloques de 196 días. | Acota el tamaño de documento; alimenta la concentración. |
| `m5_pronosticos` | Backtesting y pronóstico final por nivel (`total`, `tienda`, `categoria`). | Resultados versionados, no recalculados en cada visita. |
| `m5_evaluacion` | Métricas por ventana y resumen agregado. | Trazabilidad de la validación. |
| `m5_derivados` | Estado del derivado local `departamento_tienda`: `construyendo`, `publicado` o `fallo`, con huella, conteos, duración y reconciliación. | Evitar servir un derivado a medio construir. |

Un documento por serie y día habría supuesto ~59 millones de documentos
(30 490 series × 1 941 días); el modelo compacto deja los agregados en decenas de
documentos y el detalle en bloques acotados.

### Índices

| Colección | Índice | Motivo |
|---|---|---|
| `m5_agregados` | `(version, dimension, clave)` único | Una lectura por clave y versión. |
| `m5_bloques` | `(version, store_id, item_id)` | El filtro público acota versión y tiendas. |
| `m5_catalogo` | `(version, tipo)`, `(version, item_id)` | Listar el catálogo y buscar productos. |
| `m5_pronosticos` | `(version, nivel, tipo)` | Una lectura por vista. |
| `m5_evaluacion` | `(version, nivel)` único | Una evaluación por nivel. |
| `m5_calendario` | `(d)` único, `(fecha)` | Rango de días y traducción de fechas. |
| `m5_importaciones` | `(estado)` | Localizar versiones publicadas. |
| `m5_derivados` | ninguno (el `_id` es `versión:derivado`) | Se lee por clave exacta; un índice extra no ahorraría nada. |

El derivado `departamento_tienda` se guarda en `m5_agregados` y se lee con el índice
único `(version, dimension, clave)` que ya existía: **no se añadió ningún índice
nuevo**. Se comprobó con `explain` (`python -m scripts.agregar_m5 --explicar`): la
consulta de lectura resuelve con `IXSCAN` y sin `COLLSCAN`.

## Reglas analíticas

- Métrica única: **unidades vendidas**. Esta entrega no incluye ingresos ni precios.
- Intervalos inclusivos; semanas de **lunes a domingo** (M5 usa semanas que empiezan en
  sábado: se documenta la diferencia).
- Los días sin observación se devuelven como `null`; nunca se convierten en cero.
- Comparación A/B: mismos filtros no temporales, `diferencia = B − A`,
  `variación = (B − A) / A × 100` y «no calculable» si `A = 0`. No se interpreta como
  efecto causal.
- Concentración: acumulada **descendente** por producto entre las tiendas
  seleccionadas, universo = productos con ventas positivas, punto inicial (0 %, 0 %) y
  cierre (100 %, 100 %) si el total es positivo. No es la curva de Lorenz convencional.
- Reconciliación: series = resumen = total de la concentración para el mismo intervalo.
- Una selección inválida devuelve 422; nunca significa «todos».

## Baseline y validación

Pronóstico **ingenuo estacional semanal**: para un origen `O`, los 28 días siguientes
repiten el patrón de los últimos siete días observados; no se usan valores futuros.
El backtesting abre ventanas separadas un horizonte completo (no es una evaluación
rolling diaria) y calcula:

- **MAE**: media de |pronóstico − observado|.
- **Sesgo**: media de (pronóstico − observado); positivo = sobrestimación.
- **WAPE**: 100 × Σ|error| / Σobservado, solo si el denominador es positivo.

En los agregados las métricas se calculan desde errores y denominadores **sumados**,
no como promedio de porcentajes. No se declara WRMSSE oficial de M5 (la jerarquía, el
escalamiento y las ponderaciones no están implementados) ni se publican intervalos de
predicción (no se han calculado ni evaluado).

## Preparación para Atlas (no ejecutada)

`python -m scripts.inventario_m5 --exportar RUTA` escribe un paquete NDJSON con
catálogo, agregados, pronósticos, evaluación, calendario y metadatos. Los bloques
producto × tienda se quedan en local. Antes de migrar hay que comparar el tamaño real
(`--inventario`) con el límite vigente del plan.

## Verificación

```bash
cd backend && python -m pytest tests/test_comercial_m5.py -q     # 56 pruebas
cd dashboards/atlas-comercial && node tools/verificar-drilldown.mjs
cd dashboards/atlas-comercial && node tools/verificar-atlas-comercial.mjs
```

Las pruebas usan un conjunto **sintético** declarado como tal
(`backend/tests/m5_fixture.py`): no son datos de M5 y nunca se publican. Cubren
ingesta idempotente, calendario y claves, reconciliación de totales, filtros
inválidos, `A = 0`, concentración monótona con cierre, total cero, baseline sin
acceso al futuro, métricas reconciliadas y contrato HTTP (incluido el 503 de «datos
pendientes»).

## Carga real ejecutada (M5 · versión m5-85e8ac8df562)

Archivos usados, desde `backend/data/m5/m5-forecasting-accuracy/`:

| Archivo | Bytes | SHA-256 |
|---|---|---|
| `sales_train_evaluation.csv` | 121 736 518 | `4b4a47c44c38380d2a9168216fea8c9ff2f31b1ddb772f8a0995952a038b8aa0` |
| `calendar.csv` | 103 469 | `d12b5914ef03e66649adf5dd9e996e6602251c22b7a6af8f1f7e3aa12f8860f5` |

- Destino: **`127.0.0.1:27017/atlas_comercial_local`** (MongoDB local, base propia). No se
  conectó a Atlas ni se heredó `MONGODB_URI`.
- Versión: **`m5-85e8ac8df562`**, estado `publicada`.
- Cobertura de ventas: **2011-01-29 → 2016-05-22, 1 941 días** (el calendario trae 1 969:
  28 días finales sin ventas, declarados y excluidos de la cobertura pública).
- Conteos: **30 490 series** (3 049 productos × 10 tiendas), 3 estados (CA, TX, WI),
  3 categorías, 7 departamentos; 304 900 bloques; 54 agregados; 3 072 documentos de catálogo.
- Reconciliación: **66 927 173 unidades** = suma de series = agregado total = agregado por
  tienda = resumen = total de la concentración.
- Celdas con ventas positivas: 18 939 271 de 59 181 090 (32 %).

### Baseline real (ingenuo estacional semanal, horizonte 28)

Ventanas evaluadas (orígenes `d_1773, 1801, 1829, 1857, 1885, 1913`), todas con 28 días
observados posteriores:

| Nivel | MAE (u/día) | Sesgo (u/día) | WAPE | Denominador |
|---|---|---|---|---|
| Total (10 tiendas) | 4 090,3 | −1 636,0 | 10,005 % | 6 868 441 |
| Por tienda (10 series) | 5 025,7 | −1 636,0 | 12,293 % | 6 868 441 |
| Por categoría (3 series) | 4 520,9 | −1 636,0 | 11,058 % | 6 868 441 |

Ninguna ventana con denominador cero. Pronóstico posterior al último dato observado:
corte **2016-05-22**, 28 días (2016-05-23 → 2016-06-19), sin valores reales conocidos y sin
banda de incertidumbre.

### Defectos reales corregidos al importar

1. **Baseline con calendario más largo que las ventas**: tomaba `max(calendario)` (d_1969)
   como último día evaluable e intentaba leer 28 días inexistentes. Ahora el último origen
   se calcula sobre los días **con ventas** (d_1941) y las posiciones incompletas se recortan.
   Hay prueba de regresión con calendario de 5 días extra.
2. **Cobertura pública**: se tomaba del calendario (1969 días) y ofrecía 28 días sin
   observación. Ahora sale del manifiesto de importación (1941 días) y el catálogo declara
   `dias_de_calendario` y `dias_calendario_sin_ventas`.
3. **Concentración lentísima**: sumaba bloques en Python (≈92 s). Pasó a una agregación en
   MongoDB con `$slice`/`$sum` (≈7 s en frío y 0,1 s con caché), con muestra uniforme de
   101 puntos sobre el porcentaje real de productos y cierre (100 %, 100 %).
4. **A/B vacío por omisión**: sin fechas explícitas la comparación devolvía ceros. Ahora se
   proponen las dos mitades del intervalo y se informa (`ab_por_omision: true`).
5. **Caché por petición**: el repositorio se creaba en cada petición y la caché no servía.
   Ahora es único por proceso y se comparte con el precalentamiento del arranque; la
   cabecera `X-Comercial-Cache` informa `hit`/`miss` de verdad.
6. **Concentración con periodos cortos** (defecto encontrado al implementar la
   exploración): la agregación que recorta los bloques con `$slice` no filtraba por
   solapamiento, así que un bloque **posterior** al intervalo pedía un tramo de longitud
   0 y MongoDB rechazaba la consulta: cualquier periodo que terminara antes del último
   bloque devolvía error 500 en la concentración y, con ella, en `/pulso`. Ahora los
   bloques se acotan con `d_inicio <= hasta` y `d_fin >= desde`. Verificado con M5 real:
   el periodo 2011-01-29 – 2011-12-31 de CA_1 reconcilia (1 060 793 u) y hay prueba de
   regresión con un bloque futuro artificial.

### Almacenamiento (inventario real)

- 310 021 documentos en total; **567 138 783 B de datos**, 140 283 904 B de almacenamiento y
  14 671 872 B de índices.
- `m5_bloques` es la mayor parte (304 900 documentos) y queda marcada como **solo local**;
  el paquete compacto para una futura migración incluye catálogo, agregados, pronósticos,
  evaluación y calendario.
- Tras publicar el derivado `departamento_tienda`: **310 092 documentos**, 568 443 474 B de
  datos, 142 168 064 B de almacenamiento y 14 065 664 B de índices (el derivado añade
  70 documentos en `m5_agregados` y 1 documento de estado en `m5_derivados`).

## Presentación y exploración de «Pulso de ventas» (incremento visual)

- **Encabezado**: «Pulso de ventas» con subtítulo «Ventas históricas por tienda y categoría ·
  Walmart M5» y la cobertura real del intervalo consultado. Las pestañas (Pulso de ventas /
  Demanda futura) y la agregación (Día / Semana / Mes) van a la derecha con el segmentado del
  Atlas (pista gris, cápsula grafito, texto activo blanco, 200 ms por selector). La versión de
  datos se movió a «Fuente y metodología».
- **Filtros compactos**: Periodo, Tiendas, Categorías y Comparar periodos, distribuidos en una
  fila. El panel de periodo y el de A/B tienen aplicar y cancelar: editar fechas no consulta
  nada hasta aplicar, y la validación se hace contra la cobertura publicada. Debajo se resume
  «A: … · n días | B: … · n días».
- **Diez pequeños múltiplos**: 5 × 2 en escritorio amplio (≥1120 px), 2 columnas en anchos
  intermedios y 1 en móvil. El ancho se mide y el alto de dibujo se mantiene en 122 px, así que
  la línea no se deforma en ningún tamaño. Comparten dominio temporal, márgenes, posición X,
  escala Y desde cero y cursor; cada panel muestra tienda, total del intervalo, cuadrícula y
  etiquetas de tiempo.
- **Dos modos**: «Escala común» (inicial) y «Comparar tendencias» (índice base 100 con el mismo
  primer periodo completo para las diez tiendas, guía en 100, periodos parciales excluidos,
  tiendas con base cero avisadas). Cambiar de modo no consulta ni altera filtros.
- **Cursor sincronizado**: una sola tira de detalle con periodo y las diez tiendas (unidades, y
  en tendencias también índice). En los paneles se dibuja un punto solo donde hay dato y los
  ausentes interrumpen la línea.
- **A/B**: tres filas horizontales con eje lineal común desde cero, punto A hueco, B sólido,
  conector y columnas A, B, B − A y variación. Etiquetas Alimentos / Aficiones / Hogar (los
  códigos FOODS/HOBBIES/HOUSEHOLD siguen en los datos), «A = B» cuando coincide y «n/c» si A = 0.
  En móvil los valores bajan a una segunda línea con su rótulo.
- **Concentración**: se conserva la curva acumulada descendente y se añade la lectura calculada
  por la API con cantidades originales: «El 34,1 % de los productos concentra al menos el 80 % de
  las unidades · 1 039 de 3 049». El punto del 80 % se marca con guías, y el cursor explora
  productos acumulados, porcentaje de productos, unidades acumuladas y porcentaje de unidades.
- **Rendimiento**: la lectura del 80 % se calcula en el servidor sobre 3 049 productos y la caché
  por versión y filtros sigue activa; mover el cursor no consulta la API.

## Refinamiento de acabado (incremento visual, sin cambios analíticos)

**Pequeños múltiplos.** La primera columna de cada fila es la única que rotula el eje Y; el
resto conserva solo la cuadrícula tenue. La columna se calcula con `gridTemplateColumns` real,
así que en 5 columnas rotulan los paneles 1 y 6, en 2 columnas la 1 y la 3, y en móvil (una
columna) vuelven a rotular los diez. La escala sigue siendo una sola, desde cero, por vista.

**Trazos y último valor.** Línea de 1,5 px (1,8 en paneles anchos), segmentos rectos y sin
animación de la línea al explorar. Cada panel marca el **último periodo con dato** con un punto
sólido de 2,7 px y una etiqueta «valor · mes año» que se coloca a la izquierda y baja si el punto
está muy alto, para no salirse del panel. En modo indexado la etiqueta muestra el índice y el
detalle conserva las unidades. El punto de exploración es un anillo hueco, distinto del marcador
final; si la última observación no es el final del intervalo, la etiqueta lleva su propia fecha.

**Relleno: variante elegida A (línea sin relleno).** Se preparó una variante interna B (área con
degradado del 10 % al 0 %, mismo color que la línea, interrumpida en los huecos y con degradado
por panel) activable con `?relleno=1`, sin control público. Comparadas las dos capturas con los
mismos datos y viewport, **se conserva A**: con diez paneles y 278 semanas por panel el relleno
aporta una mancha gris que compite con la cuadrícula y no mejora la comparación entre tiendas,
que ya se lee por altura sobre la escala común. En la vista indexada no se aplica relleno.

**A/B.** El conector es ahora una línea gris pizarra (#A9B3C6) de 2,4 px con extremos redondeados
que va **solo de A a B** (se retiró la pista que recorría todo el eje); los marcadores se dibujan
encima, A hueco y B sólido, en sus posiciones matemáticas reales. Siguen contemplados «A = B» y
«n/c» con A = 0; los valores, diferencias y porcentajes son negros, tabulares y alineados por
columna.

**Concentración.** Sin cambios de universo, orden ni puntos: se conserva la curva, los ejes
discretos, el punto del 80 % con sus guías y el cursor con cantidades exactas. El borde de la
tarjeta es el mismo que el de las demás; los ejes internos no usan ese borde.

**Demanda futura.** La zona del horizonte pronosticado es un fondo gris muy claro, calculado con
las fechas reales de la API y recortado al área de trazado, dibujado detrás de cuadrícula y
series, rotulado «Pronóstico» (no es una banda de incertidumbre). La línea observada es sólida y
la pronosticada discontinua con extremos redondeados y el mismo grosor. La guía del corte pasó de
rojo a pizarra (#6B7583) y la anotación es un recuadro blanco opaco con borde neutro —
«Fin de datos observados · 22 may 2016», fecha tomada de `origen_fecha`— colocado dentro de la
banda del pronóstico para no tapar ninguna serie. Nunca se usa «Hoy»: el corte es histórico.

**KPI de evaluación (corrección de etiquetas, no de valores).** «MAE» y «Sesgo» son métricas
**agrupadas**: se suman los errores de las 10 series y de las 6 ventanas y se dividen entre las
observaciones serie-día evaluadas (168). No son el promedio de los MAE por tienda, así que las
etiquetas pasaron a «MAE agrupado» y «Sesgo agrupado», con unidades («unidades por tienda-día»)
y una línea de alcance (nivel, ventanas, observaciones, fórmula). «Denominador» pasó a
«Observado». Los valores no cambian: la API sigue devolviendo 5 025,661 · −1 636,03 · 12,293 % ·
6 868 441 para el nivel tienda.

## Exploración por niveles: tiendas → departamentos → productos

Incremento de **drill-down**. Sin reimportar ventas, sin MongoDB Atlas, sin DuckDB, sin
overlays de calendario, sin matriz temporal y sin modelos nuevos.

### 1. Derivado local `departamento_tienda` (lo que faltaba de verdad)

Antes de escribir nada se comprobó el estado real de `m5_agregados`: existían
**54 documentos** en seis dimensiones (`total` 1, `tienda` 10, `estado` 3, `categoria` 3,
`departamento` 7, `categoria_tienda` 30). La intersección **tienda × departamento no
existía**, y no puede deducirse de los marginales: sumar «departamento» por un lado y
«tienda» por otro inventaría una distribución que los datos no tienen.

`app/comercial/derivados.py` + `scripts/agregar_m5.py` calculan esa intersección
**desde los bloques producto × tienda y el catálogo**:

- proceso separado de las peticiones HTTP, invocado con `python -m scripts.agregar_m5`;
- **idempotente**: si la huella del derivado ya está publicada se reutiliza sin
  recalcular (`"reutilizado": true`, 0 s de cálculo);
- asociado a la versión de datos (`m5-85e8ac8df562`) mediante huella SHA-256 corta;
- no modifica bloques ni agregados válidos y **no mueve el puntero de la versión activa**;
- estado explícito en `m5_derivados`: `construyendo` → `publicado` (o `fallo`), con
  conteos, duración, almacenamiento y reconciliación;
- **nunca se exponen resultados parciales**: la API solo lee `m5_agregados` cuando el
  estado es `publicado`; en cualquier otro caso calcula la serie al vuelo desde los
  bloques de esa tienda (misma función, sin duplicar implementación).

Resultado real (M5 publicado, `atlas_comercial_local`):

| Medición | Valor |
|---|---|
| Combinaciones **reales** tienda × departamento | **70** (10 tiendas × 7 departamentos: no se forzó el número) |
| Documentos nuevos en `m5_agregados` | 70 (54 → 124) |
| Días por documento | 1 941 (`d_1 … d_1941`) |
| Bloques leídos | 304 900 |
| Duración de la construcción | **34,03 s** (una vez) |
| Datos añadidos | **+1 304 110 B** (1 000 848 → 2 304 958 B) |
| Almacenamiento añadido | **+1 564 672 B** (708 608 → 2 273 280 B) |
| Índices añadidos | **ninguno**; el único `(version, dimension, clave)` sirve la lectura |
| Reconciliación | `total_unidades = 66 927 173` = agregado `total`; 10 tiendas y 7 departamentos cuadran **por día** |

La reconciliación es triple y se ejecuta antes de publicar: la suma del derivado es el
agregado `total`; cada tienda coincide con su agregado `tienda`; cada departamento
coincide con su agregado `departamento` (cuya clave es `categoría|departamento`). Si
alguna no cuadra, se marca `fallo` y no se publica nada.

```bash
python -m scripts.agregar_m5              # publica (idempotente)
python -m scripts.agregar_m5 --estado     # estado, huella, duración y reconciliación
python -m scripts.agregar_m5 --verificar  # solo reconcilia, sin escribir
python -m scripts.agregar_m5 --reconstruir
python -m scripts.agregar_m5 --explicar   # IXSCAN sin COLLSCAN
```

### 2. Contrato `GET /api/v1/comercial/m5/pulso`

Parámetros nuevos (los anteriores siguen igual):

| Parámetro | Valores | Regla |
|---|---|---|
| `nivel` | `tienda` (omisión) · `departamento` · `producto` | Nivel de exploración |
| `tienda` | `CA_1…WI_3` | Obligatorio en `departamento` y `producto`; **prohibido** en `tienda` |
| `departamento` | `dept_id` | Obligatorio en `producto`; prohibido en `tienda` y `departamento` |
| `productos` | `item_id` (máx. 5) | Selección explícita; sin él, el servidor elige los cinco con más unidades |

Validaciones (todas devuelven **422** con `estado: "filtro_invalido"`, nunca «todos»):
nivel existente; tienda explícita y dentro del filtro `tiendas`; departamento existente
y dentro del filtro de categorías/departamentos; productos existentes, pertenecientes al
departamento y máximo cinco; contexto redundante o contradictorio.

La respuesta se amplía (todo lo anterior se conserva): `nivel`, `contexto`
(`tienda`, `departamento`, `departamentos`, `productos`, `productos_disponibles`,
`seleccion_automatica`, `total_contexto`, `total_seleccion`, `participacion_pct`,
`descripcion`), `migas`, `derivado` (`nombre`, `estado`, `publicado`, `origen`,
`documentos`, `dias`, `duracion_s`, `reconciliacion`), `version_derivado`, `cobertura`, y
en cada serie `clave`/`nombre`/`nivel`. `resumen` añade `nivel`, `series`,
`total_contexto`, `total_seleccion` y `participacion_pct`.

Ejemplo real (recortado), departamento:

```json
GET /pulso?nivel=departamento&tienda=CA_1&agregacion=semana
{
  "nivel": "departamento",
  "contexto": {
    "nivel": "departamento", "tienda": "CA_1", "departamento": null,
    "departamentos": ["FOODS_1","FOODS_2","FOODS_3","HOBBIES_1","HOBBIES_2","HOUSEHOLD_1","HOUSEHOLD_2"],
    "productos": [], "productos_disponibles": 0, "seleccion_automatica": false,
    "total_contexto": 7832248, "total_seleccion": 7832248, "participacion_pct": 100.0,
    "descripcion": "CA_1 · 7 departamentos permitidos por los filtros"
  },
  "migas": [
    {"nivel": "tienda", "etiqueta": "Tiendas", "tienda": null},
    {"nivel": "departamento", "etiqueta": "CA_1", "tienda": "CA_1"}
  ],
  "derivado": {"nombre": "departamento_tienda", "estado": "publicado", "publicado": true,
               "origen": "agregado derivado publicado en m5_agregados", "documentos": 70,
               "dias": 1941, "duracion_s": 34.029},
  "series": [{"clave": "FOODS_1", "nombre": "FOODS_1", "nivel": "departamento", "total": 577436, "...": "..."}],
  "resumen": {"total": 7832248, "total_contexto": 7832248, "total_seleccion": 7832248}
}
```

Ejemplo real (recortado), producto con selección automática:

```json
GET /pulso?nivel=producto&tienda=CA_1&departamento=FOODS_3&agregacion=semana
{
  "nivel": "producto",
  "contexto": {"tienda": "CA_1", "departamento": "FOODS_3", "productos_disponibles": 823,
               "seleccion_automatica": true,
               "productos": ["FOODS_3_090","FOODS_3_120","FOODS_3_252","FOODS_3_586","FOODS_3_714"],
               "descripcion": "CA_1 · FOODS_3 · 5 de 823 productos"},
  "resumen": {"total": 411480, "total_contexto": 3993834, "total_seleccion": 411480,
              "participacion_pct": 10.3},
  "concentracion": {"productos": 5, "total": 411480,
                    "alcance": "productos seleccionados (máximo 5)", "estado": "ok"}
}
```

### 3. `GET /api/v1/comercial/m5/productos` (nuevo)

Búsqueda paginada de productos del departamento y contexto vigentes:

| Parámetro | Por omisión | Nota |
|---|---|---|
| `tienda` | obligatorio | contexto territorial |
| `departamento` | — | si falta, todo el catálogo permitido por categorías |
| `categorias` | todas | se validan contra el catálogo |
| `desde` / `hasta` | cobertura publicada | acota las unidades devueltas |
| `texto` | — | búsqueda por `item_id` (máx. 40 caracteres) |
| `orden` | `unidades` | `unidades` (desc., desempate por identificador) o `item_id` (asc.) |
| `limite` / `desplazamiento` | 20 / 0 | `limite` ≤ 100 |

Devuelve `total` de coincidencias, la página con `unidades` reales, `seleccion_inicial`
(los cinco con más unidades, desempate estable por identificador) y `paginacion`.
Identificadores reales de M5: no hay nombres comerciales inventados.

### 4. Consultas y caché

- El nivel de departamento lee el derivado publicado (una lectura por clave); si no está
  publicado, calcula desde los bloques de esa tienda.
- El nivel de producto lee **solo** `m5_bloques` (producto × tienda): 5 series × 10
  bloques aproximados, no 3 049.
- La concentración usa los mismos agregados/bloques del alcance; nunca combina
  marginales para inventar `tienda × producto`.
- Clave de caché: versión + **huella y estado del derivado** + nivel + tienda +
  departamento + filtros + fechas + A/B + selección. Cambiar de contexto nunca reutiliza
  un resultado ajeno, y republicar el derivado invalida la caché.
- Sin consultas por hover: el cursor se resuelve con los datos ya recibidos (verificado
  en el navegador: 0 peticiones al mover el cursor).

Latencias y tamaños **medidos** con la API viva sobre M5 real (agregación semanal salvo
donde se indica):

| Consulta | Frío | Con caché | Respuesta |
|---|---|---|---|
| `pulso` nivel tienda (10 series) | 5 893 ms | 0 ms | 371 870 B |
| `pulso` nivel departamento (7 series) | 710–724 ms | 0 ms | 265 342 B |
| `pulso` nivel departamento (7 series, **día**) | 894 ms | 0 ms | 1 502 536 B |
| `pulso` nivel producto (5 series) | 101 ms | 0 ms | 175 645 B |
| `pulso` nivel producto (2 series explícitas) | 51 ms | 0 ms | 72 133 B |
| `pulso` nivel producto (5 series, **día**) | 87 ms | 0 ms | 1 053 079 B |
| `productos` (8 filas de 823) | 178 ms | 0 ms | 1 385 B |
| `productos` (100 filas) | 178 ms | 0 ms | 8 739 B |
| `productos` con `texto` | 12–42 ms | 0 ms | 650 B |

El frío alto del nivel de tienda es la concentración sobre las 10 tiendas (304 900
bloques), no el nuevo nivel: en departamento y producto el alcance es una tienda y baja
a ~0,1–0,9 s.

### 5. A/B y concentración con el mismo universo

- **Tienda**: A/B por categoría y concentración sobre todas las tiendas filtradas (igual
  que antes).
- **Departamento**: A/B con una fila por departamento representado; concentración sobre
  los productos de esos departamentos en esa tienda.
- **Producto**: la selección se aplica a series, resumen, A/B y concentración. El total
  del departamento se muestra **aparte y rotulado** («Total del departamento FOODS_3 en
  CA_1: 3 993 834 u · selección de 5 de 823 productos: 411 480 u (10,3 %)»), porque la
  selección es parcial por diseño.
- Reglas conservadas: A/B dentro del intervalo global, fechas y duración visibles,
  «n/c» cuando A = 0, curva descendente, lectura del 80 % con cantidades originales y
  reconciliación serie = resumen = total de la concentración para el mismo universo.
- Caso degenerado: con **un solo producto** la concentración devuelve
  `estado: "unico"` y el tablero lo explica con una frase, sin porcentajes engañosos. Si
  no hay unidades, no se calcula ningún porcentaje.

### 6. Interfaz

- **Encabezados explorables**: el nombre de cada panel es un `<button>` con foco visible,
  nombre accesible («Explorar los departamentos de CA_1», «Explorar los productos de
  FOODS_3»), activable con teclado y con un `›` discreto. El **cursor sigue explorando
  datos**; el área de trazado no navega.
- **Migas compactas** y navegables: «Tiendas › CA_1 › FOODS_3». Cada miga describe el
  estado al que vuelve, así el regreso restaura el contexto anterior (periodo, agregación,
  A/B y filtros intactos) y no limpia nada.
- **Buscador de productos**: identificadores reales, total del departamento, paginación,
  orden, búsqueda por identificador, casillas que se deshabilitan al llegar a cinco y
  contador «n de 5» anunciado con `aria-live`.
- **Selección inicial**: los cinco productos con más unidades del periodo y los filtros
  vigentes, rotulados como tales; se sustituyen desde el buscador y se restauran con
  «Volver a la selección inicial». Una selección explícita **no se reemplaza** al cambiar
  de fechas; si deja de ser válida se informa y se ofrece volver a la inicial.
- **URL**: `ac_nivel`, `ac_tienda`, `ac_dept`, `ac_skus` (repetido), y también `ac_agr`,
  `ac_desde`, `ac_hasta`, `ac_tiendas`, `ac_categorias`, `ac_ad/ah/bd/bh`. La consulta va
  **antes** del fragmento (`/#/area/...`), recargar reproduce la vista y Atrás/Adelante
  restauran el contexto; los filtros usan `replaceState` y la exploración `pushState`.
- **Escape**: un desplegable abierto se cierra primero (su manejador corre en captura y
  detiene la propagación); después se cierra el buscador; solo entonces se retrocede de
  nivel. Nunca se captura la tecla «en toda la página».
- **Escala y cursor**: al cambiar de nivel la escala común se recalcula para el conjunto
  representado (no se hereda la de tiendas), el dominio temporal y la agregación se
  conservan y el cursor sigue sincronizado; los totales del intervalo quedan en cada
  encabezado y los valores bajo el cursor en la tira de detalle.
- **Carga**: espacio reservado, respuestas obsoletas descartadas por número de turno,
  error con reintento y estados vacíos legibles («sin productos», «total cero»).
- Sin controles nuevos de matriz ni de calendario: no se anuncia lo que no funciona.

### 7. Verificación de este incremento

- `backend/tests/test_comercial_m5.py`: **40 pruebas** (12 nuevas en ese incremento): derivado idempotente
  y reconciliado, respaldo desde bloques cuando el derivado no está publicado,
  departamentos = tienda, filtro de categorías respetado al descender, contexto inválido
  (13 combinaciones) → 422, selección inicial y alcance, reconciliación de producto con
  sus bloques, búsqueda paginada/ordenada y estado publicado del derivado.
- Suite completa del repositorio: **231 pruebas en verde** al cerrar ese incremento.
- `tools/verificar-drilldown.mjs` con M5 real: **36 comprobaciones**, todas correctas.
  Cubre suma de departamentos = total de la tienda (DOM y API), totales del DOM contra la
  API, categorías excluidas, cinco productos con selección inicial, total del
  departamento distinto y rotulado, A/B por nivel, concentración de la selección,
  buscador (total real 823, paginación de una sola consulta, filtro por identificador),
  límite de cinco, URL, recarga, Atrás/Adelante, Escape en dos pasos, cursor sin
  peticiones, móvil sin desbordamiento y consola limpia.
- `tools/verificar-atlas-comercial.mjs` sigue en verde: diez paneles, cursor, A/B y
  **Demanda futura** con las mismas cifras (MAE agrupado 5 025,7 · sesgo −1 636 · WAPE
  12,293 % · observado 6 868 441).
- Capturas en `evidencias/comercial/`: `drill-1-tiendas.png`,
  `drill-2-departamentos.png`, `drill-3-productos.png`, `drill-4-buscador.png`,
  `drill-5-foco-teclado.png`, `drill-6-movil.png`, `drill-7-movil-productos.png`.
- TypeScript (`tsc --noEmit`) y build de producción sin avisos.

### 8. Dependencia de `m5_bloques` para una exportación compacta

El nivel de producto y la concentración por producto dependen de `m5_bloques`
(304 900 documentos, la mayor parte del almacenamiento). El paquete compacto
(`python -m scripts.inventario_m5 --exportar`) **no** los incluye: con solo catálogo,
agregados, pronósticos, evaluación y calendario se sirven las vistas de tienda y
departamento, pero **no** la búsqueda por volumen ni las series de producto. Si en el
futuro se publica en Atlas, hay que decidir entre (a) exportar también los bloques o
(b) materializar un derivado `producto_tienda` acotado (por ejemplo, solo top-N por
departamento y tienda) y aceptar que el explorador de productos se limite a esa lista.
Hoy no se hace ninguna de las dos cosas.

## Segmentación territorial, composición y comparación histórica

Incremento de **territorio + catálogo visible, navegación al detalle y gráfica editorial**.
Sin reimportar ventas, sin Atlas, sin DuckDB, sin overlays de calendario y sin tocar Atlas vial.

### 1. Dos jerarquías y un único estado de filtros

| Jerarquía | Ruta |
|---|---|
| Territorio | Estados Unidos → estado → tienda (CA: CA_1…CA_4 · TX: TX_1…TX_3 · WI: WI_1…WI_3) |
| Catálogo | categoría → departamento → producto (FOODS 1–3 · HOBBIES 1–2 · HOUSEHOLD 1–2) |

Se cruzan en un solo estado: territorio × catálogo × periodo. Las etiquetas de
presentación son «California / Texas / Wisconsin» y «Alimentos / Aficiones / Hogar»; los
identificadores de M5 se conservan tal cual y **no se inventan nombres** para los siete
departamentos (se muestran como `FOODS_1`, `HOUSEHOLD_2`, …).

El estado vive en la URL y en ningún otro sitio: `ac_estado`, `ac_tienda`, `ac_cat`,
`ac_dept`, `ac_skus` (repetido), `ac_anio`, `ac_modo`, `ac_agr`, `ac_desde/hasta`,
`ac_ad/ah/bd/bh`. Recargar, compartir y Atrás/Adelante reproducen la misma vista.

**Filtros incompatibles** (nunca silenciosos):

- elegir un estado que no contiene la tienda abierta baja el contexto al estado y avisa;
- elegir una categoría distinta de la del departamento abierto cierra el detalle de
  productos y avisa;
- sin contexto territorial (estado o tienda) no se ofrece el explorador de productos y
  la vista lo dice; el API responde 422 si se pide ese nivel sin contexto.

### 2. Panorama territorial

Tres tarjetas (nombre, código, unidades, participación y número de tiendas) y los
pequeños múltiplos **agrupados por estado**, con encabezado propio por bloque para no
mezclar TX_3 con WI_1 en la misma fila.

- Denominador de la participación: **total del contexto territorial** con los filtros
  comerciales y el periodo aplicados (se escribe en la cabecera del bloque).
- Agregado nuevo en la respuesta de `/pulso`: `panorama`
  (`estados[]` con unidades, tiendas incluidas, participación, más `total_unidades` y el
  texto del denominador). Se calcula sumando tiendas, no con un marginal suelto.
- Verificado con M5 real: CA 29 196 717 u (43,62 %), TX 19 228 405 u (28,73 %),
  WI 18 502 051 u (27,65 %); la suma es exactamente 66 927 173 u, el total del contexto.
- Seleccionar una tarjeta filtra las tiendas del estado y actualiza composición, A/B,
  concentración e histórico. Abrir una tienda es **una sola acción**: selecciona la tienda
  y muestra sus departamentos (no hay dos controles sobre el mismo encabezado).

Pequeños múltiplos: escala Y común desde cero **con dominio redondo** (`nice`) y marcas
calculadas; dominio temporal, márgenes y cursor compartidos; el último valor ya no se
rotula dentro del trazado (se superponía a la línea) sino en la cabecera del panel
(«Unidades del periodo · último …»); los periodos incompletos se marcan y un día sin
dato sigue siendo «sin dato».

### 3. Composición comercial

Barras horizontales de las tres categorías y sus departamentos, con **dos denominadores
explícitos y distintos**: la categoría se mide contra el total del contexto territorial y
el departamento contra el total de **su** categoría. La longitud de cada barra es su
porcentaje, así el dibujo y la cifra no se contradicen.

Agregado nuevo en `/pulso`: `composicion`
(`categorias[]`, `departamentos[]` con `codigo`, `etiqueta`, `categoria`, `unidades`,
`participacion_pct` y el texto del denominador). Es el **selector** del catálogo, así que
muestra todo el catálogo del territorio aunque haya una categoría o un departamento
elegidos; la fila activa se marca y el resto de las vistas se actualiza.

Verificado con M5 real: Alimentos 45 922 427 u (68,62 %), Aficiones 6 240 656 (9,32 %),
Hogar 14 764 090 (22,06 %); los siete departamentos suman su categoría y las tres
categorías suman 66 927 173 u. Intersección comprobada: la suma de los departamentos de
FOODS en CA_1 (5 471 661 u) es exactamente la categoría FOODS de CA_1.

### 4. Gráfica editorial de comparación histórica

`GET /api/v1/comercial/m5/historico?anio=…&modo=semana|acumulado`

Reglas implementadas (se publican en la respuesta):

- **Solo años anteriores** al analizado; nunca se usan años posteriores.
- Referencias = años con **cobertura completa** del 1 de enero al 31 de diciembre. Con M5:
  2012, 2013, 2014 y 2015; **2011 se excluye** (el conjunto empieza el 29 de enero) y se
  declara el motivo en `referencias.anios_excluidos`.
- Sin referencias: se dibuja solo la serie observada y se informa «Sin referencia
  histórica comparable»; no hay banda artificial.
- Una sola referencia: se dibuja la línea de ese año y **no** se dibuja rango (un único
  año no muestra variabilidad).
- **Semanas**: ISO completas de lunes a domingo, comparadas por número de semana ISO; las
  semanas cortadas por la cobertura no se comparan (motivo explícito). La semana 53 solo
  aparece si existe en el año analizado y, si ninguna referencia la tiene, se muestra con
  `referencias: 0` (M5: 2015 tiene semana 53; 2012–2014 no).
- **Acumulado**: se alinea por mes y día; **primero se acumula cada año** y después se
  promedian los acumulados (nunca se acumulan mínimos ni máximos diarios). Cada año suma
  sus ventas reales hasta esa fecha, así que los bisiestos incluyen el 29 de febrero.
  El 29 de febrero solo promedia referencias con esa fecha y se expone cuántas.
- Si el año analizado no empieza el 1 de enero se rotula «Acumulado desde el inicio
  disponible (2011-01-29)»; si empieza el 1 de enero pero la cobertura termina antes
  (2016) se rotula «… hasta el último dato (2016-05-22)» y `completo: false`.
- La línea observada termina en su último dato; la referencia puede continuar hasta el 31
  de diciembre y se identifica como referencia.
- Diferencias: absoluta = observado − referencia y porcentual = 100 × diferencia /
  referencia; «porcentaje no calculable» si la referencia es 0. Se habla de «diferencia
  respecto al promedio histórico», nunca de crecimiento ni de efecto causal.
- **Anotaciones**: como máximo dos hallazgos calculados (cierre y mayor diferencia), sin
  repetir el mismo cuando coinciden (el acumulado suele tener una sola).
- La banda se llama siempre **«Rango histórico observado»** y se declara que no es un
  intervalo de confianza, ni una predicción, ni un rango esperado: no hay modelo detrás.

La respuesta incluye versión, filtros efectivos, año y cobertura del año, modo, regla de
alineación, años incluidos y excluidos con motivos, puntos con `observado`,
`referencia_promedio`, `referencia_min`, `referencia_max`, `referencias`, `estado`,
`parcial`, `diferencia`, `diferencia_pct` y `motivo`, más `anotaciones`,
`ultimo_con_dato`, `acumulado` y `punto_con_referencia` agregado. El detalle anual usa la
cobertura completa del conjunto y **no** modifica el periodo global, el A/B ni la
concentración (`filtros.alcance_temporal` lo declara).

Interfaz: selector de año, segmentado «Por semana | Acumulado del año», línea azul del año,
línea gris del promedio, banda tenue del rango, relleno tenue entre observado y promedio,
etiquetas directas con halo y control de colisiones (las cajas de anotación se colocan en
la primera posición libre y nunca tapan las etiquetas finales), punto final con su
anotación (fecha, valor y diferencia), ejes con meses reconocibles y unidades explícitas,
lectura interactiva exacta con teclado y **tabla accesible** con los mismos valores.

### 5. Exploración de productos

Dentro del departamento elegido: buscador por identificador, tabla paginada con unidades y
**participación sobre el universo del departamento** (productos con ventas en ese contexto
y periodo), orden estable explícito (unidades con desempate por identificador, o
identificador) y hasta cinco productos para comparar series.

- La propuesta automática se rotula **«Top 5 por unidades»** y muestra su participación
  conjunta; la suma de los cinco **nunca** se presenta como el total del departamento.
- **Alcance declarado**: la selección afecta solo a la comparación de series de esa
  sección; el resto del tablero sigue mostrando el departamento completo.
- `/productos` acepta contexto territorial explícito (`tienda`, `estado` o `tiendas`) y
  devuelve `universo` (unidades, productos con ventas, productos de catálogo),
  `participacion_pct` por producto y `seleccion_inicial_participacion_pct`.

### 6. Contracto y compatibilidad

`/pulso` conserva todos sus campos y añade `panorama` y `composicion`; acepta `estado`
como contexto o filtro territorial y generaliza los niveles `departamento` y `producto`
para agregar **varias tiendas** cuando el contexto es un estado. `nivel=departamento` y
`nivel=producto` siguen exigiendo contexto territorial explícito (`tienda` o `estado`):
una petición sin contexto devuelve 422.

Defecto corregido (encontrado al implementar este incremento): la clave de caché de
`/pulso` tenía **un marcador menos que argumentos**, así que la firma de filtros
(fechas, tiendas, categorías, departamentos y productos) no entraba en la clave y una
respuesta de otro contexto podía reutilizarse — por ejemplo, la selección automática de
productos se servía para una selección explícita. Ahora la clave incluye los ocho bloques
y hay pruebas que lo cubren.

### 7. Medición real

| Consulta | Frío | Con caché | Respuesta |
|---|---|---|---|
| `/pulso` nivel tienda (panorama + composición) | 6 672 ms | 0 ms | 374 778 B |
| `/pulso` con `estado=CA` | 65 ms | 0 ms | 163 562 B |
| `/historico` semana 2014 / 2015 / 2016 | 59–96 ms | 0 ms | 19,5–21,3 kB |
| `/historico` acumulado 2014 / 2015 | 76 ms | 0 ms | 125 kB |
| `/productos` (10 filas) | 43–138 ms | 0 ms | 2,1–2,2 kB |

El frío de `/pulso` en el nivel de tienda lo domina la concentración sobre las diez tiendas
(304 900 bloques), no los bloques nuevos: el panorama cuesta 26 ms y la composición 68 ms
medidos por separado sobre los agregados; el histórico se calcula en 8–12 ms.

### 8. Verificación de este incremento

- `backend/tests/test_comercial_m5.py`: **56 pruebas** (16 nuevas) — panorama y
  composición reconciliados, contexto de estado, referencias solo de años anteriores
  completos, exclusión de 2011 con motivo, año sin referencia, año con una sola
  referencia, semana 53 sin referencias, semana parcial sin comparación, bisiesto con
  referencias elegibles, acumulado reconciliado con las unidades diarias, acumulado no
  completo si termina antes de diciembre, anotaciones no redundantes, participación de
  producto sobre el universo y validación de año/modo. Suite completa: **247 en verde**.
- `tools/verificar-territorio.mjs`: **41 comprobaciones** en navegador real, todas
  correctas (panorama = suma de tiendas, estados = total, departamentos = categoría,
  intersección CA_1 × FOODS, banda/promedio/observado, anotaciones ≤ 2, tabla accesible,
  `2011` sin banda, cambio de modo, navegación por estado y tienda, rutas independientes,
  explorador de productos, participación, cursor sin peticiones de red, URL, recarga,
  Atrás/Adelante y móvil sin desbordamiento).
- `tools/verificar-drilldown.mjs` (23 comprobaciones, actualizado a la nueva pantalla) y
  `verificar-atlas-comercial.mjs` siguen en verde: la vista de tiendas, el cursor, el A/B y
  «Demanda futura» conservan sus cifras (MAE agrupado 5 025,7 · sesgo −1 636,03 · WAPE
  12,293 % · observado 6 868 441).
- TypeScript (`tsc --noEmit`) y build de producción sin avisos.
- Capturas en `evidencias/comercial/`: `territorio-tablero.png`, `territorio-panorama.png`,
  `territorio-composicion.png`, `territorio-historico-semana.png`,
  `territorio-historico-acumulado.png`, `territorio-productos.png`,
  `territorio-movil-panorama.png`, `territorio-movil-composicion.png`,
  `territorio-movil-historico.png`, `territorio-movil-productos.png`.

> **Nota de continuidad.** Durante el desarrollo, un script de diagnóstico apuntó por
> error a la base del proyecto y borró sus colecciones `m5_*`. Los datos se reimportaron
> desde los CSV originales con el flujo documentado y se reconstruyeron el derivado y el
> baseline: la versión volvió a ser `m5-85e8ac8df562` (se deriva del contenido) y las
> cifras son idénticas (66 927 173 u; MAE 5 025,661 · WAPE 12,293 %). No se perdió
> información porque los archivos fuente y los scripts son reproducibles; los scripts de
> diagnóstico ya no se conservan en el repositorio.

## Motor predictivo de demanda diaria a 28 días

Este incremento **ejecuta** el objetivo predictivo: entrena, evalúa y publica un modelo
de ventas diarias a 28 días para las 30 490 series (3 049 artículos × 10 tiendas) del
universo M5, y muestra su desempeño medido —no estimado— en el tablero y en la ficha del
portafolio.

### Qué predice y con qué información

- **Objetivo**: unidades vendidas por artículo × tienda × día para los 28 días
  posteriores al corte (`d_1941` = 2016‑05‑22 → objetivo 2016‑05‑23 … 2016‑06‑19).
  Son unidades del conjunto histórico de M5, **no ventas actuales**.
- **Modelo**: un único LightGBM global para las 30 490 series, condicionado al horizonte
  (`h` = 1…28 es una variable más). No hay un modelo por nivel ni por tienda, así que las
  cifras de un nivel agregado se obtienen **sumando** las series antes de publicar.
- **50 variables** (variante recomendada): calendario del día objetivo (día de la semana,
  mes, día del mes, día del año, semana del año, fin de semana, evento 1/2 y su tipo,
  SNAP real del estado de la tienda, días desde el inicio); historia de ventas en el
  origen (rezagos 1–7, 14, 21, 28 y 364; medias y desviaciones móviles de 7/14/28/56/112
  días; medias del mismo día de la semana de 1 a 8 semanas; fracción de ceros en 28 y 56
  días; último valor positivo, días desde la última venta, positivos en 28 días y tres
  cocientes de nivel); e identificadores categóricos (tienda, estado, categoría,
  departamento, artículo).
- **Regla de disponibilidad**: toda variable de ventas usa `t ≤ origen`. El calendario, los
  eventos y los flags SNAP son información conocida por adelantado. Los **precios** son
  opcionales (variante `precios`): se usa el último precio conocido en la semana del
  origen y, para los 28 días pronosticados, se **supone** que el precio no cambia. Es un
  supuesto declarado en la respuesta de la API (`supuestos.precio_futuro`) y en el
  tablero; no se leen precios posteriores al corte.
- **Sin promociones inventadas**: M5 no trae campañas. Los cambios de precio no se
  etiquetan como promoción y el SNAP se presenta como lo que es (flag del calendario por
  estado), no como causa de demanda.
- **Entrenamiento**: 320 rondas, `learning_rate` 0,05, `num_leaves` 63,
  `min_data_in_leaf` 40, `feature_fraction` 0,85, `bagging` 0,85, `lambda_l2` 1,0,
  8 hilos, semilla 20260522, objetivo `tweedie` (`variance_power` 1,1). Las filas con cero
  se muestrean al 6 % y se reponderan por `1/0,06` **solo en entrenamiento**; la evaluación
  usa todas las filas. Un muestreo técnico de 4 000 series sirvió para elegir el objetivo
  (`tweedie` 79,47/79,29 frente a `regression_l2` 79,74/79,95 de WAPE en los cortes de
  desarrollo); esa muestra **no se publica** como resultado.
- **Baseline comparable**: ingenuo estacional semanal (repite los últimos siete días
  observados). Predice las mismas series, las mismas fechas y con los mismos filtros que
  el candidato; ambos se recortan a cero antes de medir.

### Cortes, selección y datos reservados

| Etapa | Orígenes | Ordena de entrenamiento | Serie de corte |
| --- | --- | --- | --- |
| Desarrollo | `d_1773`, `d_1801`, `d_1829`, `d_1857` | `d_1541`, `d_1609`, `d_1677`, `d_1745` | 2015‑12‑06 … 2016‑02‑28 |
| Reservados | `d_1885`, `d_1913` | `d_1621`, `d_1677`, `d_1745`, `d_1829`, `d_1857` | 2016‑03‑27 y 2016‑04‑24 |

Los cortes de desarrollo eligen la variante; los **reservados no participan en la
selección** y solo se reportan. La ejecución publicada se entrenó sin ver ninguna de las
observaciones de los cortes que evalúa.

### Resultados reales (ejecución `run-calendario-749b5ca3a8`)

Unidades por serie‑día; el error se mide al grano artículo × tienda.

| Ventana | MAE candidato | MAE baseline | WAPE candidato | WAPE baseline | Mejora WAPE |
| --- | --- | --- | --- | --- | --- |
| `d_1885` (2016‑03‑27) | 1,0625 | 1,2324 | 76,63 % | 88,89 % | +13,79 % |
| `d_1913` (2016‑04‑24) | 1,0775 | 1,2440 | 74,68 % | 86,22 % | +13,38 % |
| **Reservados (conjunto)** | **1,0700** | **1,2382** | **75,64 %** | **87,53 %** | **+13,58 %** |
| Desarrollo (4 cortes, 3 414 880 obs.) | 1,0252 | 1,2029 | 78,62 % | 92,25 % | +14,78 % |

- Sesgo en los cortes reservados: **+0,0951** u/serie‑día (el baseline, −0,0729): el
  candidato se queda ligeramente corto, no se le puede atribuir crecimiento.
- Por horizonte (reservados): el error crece con el plazo, como es esperable —
  MAE 0,9584 en `h`=1 → 1,2473 en `h`=28; WAPE 78,10 % → 73,04 % (el denominador también
  cambia). El baseline sigue por encima del candidato en los 28 días.
- 23 segmentos mejoran y **0 empeoran** en los cortes reservados (estado, tienda,
  categoría y departamento). En desarrollo mejoraban 22 y empeoraba 1; se declara tal cual.
- Error de la **serie agregada** del segmento (sumando predicción y observado antes de
  medir) frente al error por serie: son cifras distintas y no se mezclan. El WAPE alto
  (~75 %) es la consecuencia esperada de medir 30 490 series intermitentes (muchos ceros):
  el MAE es de ~1 unidad por serie‑día, no un error de 75 % sobre volúmenes grandes.
- WAPE no calculable se publica como `null` («n/c»), nunca como 0. No se usa MAPE ni se
  declara WRMSSE, que exigiría la implementación completa de la métrica de M5.

### Cobertura, reconciliación y respaldo

- Cobertura del candidato: **30 490 / 30 490 series** (100 %), `fallback` 0: ninguna serie
  necesitó el baseline por un valor no finito.
- Si una serie produjera una predicción no finita, se usa el baseline de esa serie
  completa y el conteo de `fallback` se publica con su motivo; no se deja un hueco ni se
  inventa un valor.
- Las predicciones se publican en 7 dimensiones (total, estado, tienda, categoría,
  departamento, categoría × tienda, departamento × tienda) y se verifican sumando el
  detalle: el total es la suma de las 30 490 series, no un modelo aparte.

### Variantes evaluadas

| Variante | Variables | Desarrollo WAPE | Decisión |
| --- | --- | --- | --- |
| `calendario` (recomendada) | 50 | 78,62 % | Publicada |
| `precios` | 59 | 78,68 % | Peor por 0,06 pp: no se recomienda |
| `baseline` | — | 92,25 % | Referencia, no candidato |

El modelo con precios **no** mejoró al de calendario, así que la ejecución publicada es la
de calendario; la variante con precios queda guardada como ejecución de desarrollo con su
métrica real, sin borrarse.

### Coste de ejecución (máquina de desarrollo, CPU)

- Modelo del universo completo: **44,1 s** de entrenamiento, pico de **367,2 MB**,
  1 887 452 filas tras el muestreo de ceros.
- Ejecución completa (2 modelos, 6 cortes evaluados, publicación): **108 s**.
- Datos en disco fuera de Git: matriz de ventas 226 MB (`backend/data/artefactos`),
  precios 33 MB en artefactos + 6 841 121 filas en MongoDB (252,7 MB de datos,
  41,3 MB de almacenamiento, importación de 70 s).
- Vectores por serie publicados solo para el corte final: **30 490** documentos
  (`m5_predicciones_series`); las dimensiones agregadas son 124 documentos por origen.

### Reproducir

```bash
cd backend
python -m scripts.importar_m5 --carpeta data\m5\m5-forecasting-accuracy      # ventas
python -m scripts.agregar_m5                                                  # derivado mensual
python -m scripts.importar_precios_m5 --carpeta data\m5\m5-forecasting-accuracy
python -m scripts.entrenar_m5 --variantes            # desarrollo: elige la variante
python -m scripts.entrenar_m5 --final --variante calendario   # reservados: publica
python -m scripts.entrenar_m5 --estado               # ejecuciones guardadas
```

- Todo queda en **MongoDB local** (`atlas_comercial_local`) en las colecciones
  `m5_modelos`, `m5_predicciones`, `m5_predicciones_series`, `m5_evaluacion_modelos` y
  `m5_precios`; no hay migración a Atlas en este incremento y no se usa un segundo motor
  de base de datos.
- Los modelos y las matrices pesadas viven en `backend/data/artefactos` y **no** se
  versionan; las predicciones, evaluaciones y manifiestos sí (son documentos pequeños).

### Evidencia en el tablero y en la ficha

- Pestaña **«Demanda futura»**: corte, rango objetivo exacto, cobertura, modelo y baseline;
  gráfica con histórico observado, pronóstico del modelo, baseline y —al elegir un corte de
  evaluación— el observado posterior al corte; KPI de MAE/WAPE que declaran de qué corte
  salen; comparación candidato–baseline; error por horizonte (día 1–28); segmentos con la
  cuenta de los que mejoran y empeoran; ventanas evaluadas; supuestos e importancias de
  variables (marcadas como **no causales**).
- Verificación en navegador: `dashboards/atlas-comercial/tools/verificar-modelo.mjs`
  (API + escritorio + móvil, 0 fallos) con capturas en
  `evidencias/comercial/modelo-futuro-escritorio.png`,
  `modelo-corte-1913-escritorio.png`, `modelo-evaluacion-escritorio.png` y
  `modelo-futuro-movil.png`.
- Pruebas: `backend/tests/test_modelo_m5.py` (24 pruebas: precios e idempotencia,
  ausencia de precio ≠ 0, variables sin fuga temporal, baseline equivalente al publicado,
  métricas y denominadores, reconciliación de agregados, fallback explícito, cortes y
  contrato HTTP).

## Exploración descriptiva: territorio, catálogo, estacionalidad, precios y artículo

Este incremento convierte el análisis exploratorio de referencia en funcionalidades
interactivas del tablero, **recalculadas** sobre la versión publicada. No se ejecutó el
notebook ni se copió su código: se tradujeron sus cálculos útiles al backend Python y sus
visualizaciones a React/D3 con el lenguaje del Atlas.

### Referencia analítica y atribución

- Fuente de referencia: **«Back to (predict) the future — Interactive M5 EDA»**, cuaderno
  R Markdown (`back-to-predict-the-future-interactive-m5-eda.Rmd`) sobre el conjunto
  *M5 Forecasting - Accuracy* de Kaggle. El archivo suministrado no declara un campo de
  autor; se cita por su título y se conserva la referencia a la competición.
- Qué se tomó: la **organización del análisis** (territorio y jerarquía de producto,
  estacionalidad global, calendario con SNAP y eventos, precios y cambios de precio,
  comportamiento de series individuales con ceros) y la idea de comparar por día de la
  semana y por mes.
- Qué **no** se tomó: ni una línea de R, ni `loess`, ni curvas de densidad, ni el
  muestreo aleatorio de series, ni los GIF y fotografías decorativas, ni el conjunto
  externo de desastres naturales (queda fuera de este incremento por encargo explícito).
- Las cifras del cuaderno **no se trasladan**: todas las de esta aplicación se recalculan
  sobre `atlas_comercial_local`. El cuaderno tampoco se presenta como solución ganadora de
  pronóstico: es una referencia de análisis exploratorio.

### Mapa Rmd → funcionalidad implementada

| Análisis del Rmd | Dónde vive ahora | Cálculo propio |
| --- | --- | --- |
| Ventas por estado, tienda y categoría | Panorama (tarjetas de estado, pequeños múltiplos, composición) | Agregados `estado`, `tienda`, `categoria_tienda` |
| Ventas por tienda y categoría (comparación) | **Comparación entre periodos por tienda y categoría** | `/comparacion`, 12 filas reales en California |
| Composición por categoría y departamento | Composición «Total del contexto \| Por tienda» | Matriz tienda × categoría del periodo principal |
| Estacionalidad semanal | **Estacionalidad · lunes a domingo** | `/estacionalidad`, promedio diario por día observado |
| Estacionalidad mensual | **Estacionalidad · enero a diciembre entre años** | Días observados/esperados y mes parcial |
| Series por año (densidad, medias) | **Matriz temporal tienda × día** | `/matriz-temporal`, cero vs. sin dato |
| Precios por categoría y variación | **Precios · distribución** | `/precios/distribucion`, media ponderada por días |
| Cambios de precio en el tiempo | **Precios · cambios** | `/precios/cambios`, tolerancia absoluta |
| Ventas y precio de un artículo | **Detalle de artículo × tienda** | `/articulo`, paneles alineados |
| SNAP y eventos del calendario | Capas opcionales del detalle y contexto del pronóstico | `m5_calendario` (flags por estado) |
| Intermitencia y ceros por serie | **Detalle de artículo · intermitencia** | `/intermitencia`, tabla paginada |
| Estadísticas de muestra (5 000 series) | **No se replica** | Se calculan estadísticas exactas, sin muestra |
| Desastres externos | **No se implementa** | Fuera de alcance por encargo |

### Navegación y estado

- «Pulso de ventas» se organiza en cuatro secciones con navegación secundaria: **Panorama ·
  Estacionalidad · Precios · Detalle de artículo**. La carga es progresiva: cada sección
  pide solo sus datos y descarta la respuesta anterior si cambia el contexto.
- Dos jerarquías independientes siguen compartiendo un único estado de filtros: territorio
  (Estados Unidos → estado → tienda) y catálogo (categoría → departamento → artículo).
- El estado vive en la URL (`ac_sec`, `ac_item`, además de los filtros existentes):
  recargar, compartir y Atrás/Adelante reproducen la misma vista.
- Cada carga lleva un turno: una respuesta vieja no se mezcla con un contexto nuevo.

### Comparación por tienda × categoría

- Filas = combinaciones **reales** del catálogo importado. California sin filtros
  comerciales: 4 tiendas × 3 categorías = **12 filas**; 3 categorías únicas, 7
  departamentos únicos y **28** combinaciones tienda × departamento.
- Se distinguen tres conteos que no se pueden confundir: **artículos únicos**
  (`item_id` distintos), **series artículo × tienda** (pares distintos) y **unidades**
  (suma de ventas). No se suman artículos únicos de varias tiendas.
- Métricas: unidades totales y **promedio diario** = unidades ÷ días con observación (un
  día con cero ventas cuenta; un día sin dato no). `diferencia = B − A`;
  `variación = 100 × (B − A) / A`, no calculable si A = 0 (se devuelve el motivo:
  «sin base en A» o «cero en ambos periodos»).
- Reconciliación declarada en la propia respuesta: la suma de las 12 filas se contrasta
  con el total del contexto para A y para B; si no cuadra, se informa la diferencia.
- Orden: por tienda (con encabezados de grupo), mayor volumen B, mayor aumento o mayor
  disminución. Al ordenar globalmente cada fila muestra «CA_2 · Alimentos» y no quedan
  encabezados de grupo. Las variaciones no calculables van al final.
- Accesible: cada fila es un botón con detalle completo, la etiqueta, el conector y las
  cuatro cifras comparten la misma fila de rejilla (no pueden desalinearse) y el orden
  cambia con una atenuación breve que respeta `prefers-reduced-motion`.

### Estacionalidad

- **Semanal**: por día de la semana, unidades, fechas con observación y promedio diario,
  en pequeños múltiplos con escala común. La lectura inicial es el promedio, para que no
  se confunda un mes con más lunes con más intensidad de ventas.
- **Mensual**: enero a diciembre entre años, con «unidades totales» o «promedio diario».
  Cada mes declara **cuatro conteos distintos** que no se mezclan: `dias_del_mes` (31 en
  enero), `dias_en_intervalo` (los que caen dentro del periodo solicitado),
  `dias_con_cobertura` (los que además tienen ventas publicadas) y `dias_observados` (los
  que tienen valor). El promedio divide entre `dias_observados`. Un mes incompleto se marca
  y su `motivo` nombra el límite real; por ejemplo, enero de 2011 sale como «3 días
  observados de 31 · datos disponibles desde el 29 de ene de 2011». Años bisiestos se
  manejan con el calendario real y un mes sin días del periodo se devuelve como «sin dato»,
  nunca como cero.
- La vista muestra perfiles históricos: **no** afirma que las diferencias entre años sean
  un efecto puro del mes (mezclan estacionalidad y tendencia) y no aplica suavizados ni
  descomposiciones.

### Matriz temporal

- Filas = tiendas del contexto; columnas = **todos** los días del año del calendario (365, o
  366 en bisiesto), no solo los que tienen ventas; color = unidades vendidas con una escala
  común y su dominio declarado.
- Cuatro estados distintos, cada uno con su leyenda: **cero observado**, **valor
  positivo**, **sin dato** (fecha fuera de la cobertura de ventas) y **fuera del filtro**
  (fecha con cobertura que el periodo solicitado excluye). Ninguno de los dos últimos es un
  cero y los totales observados no cambian con el recorte.
- Detalle de celda por fecha, tienda, unidades y cobertura; cursor por columna, teclado y
  tabla textual de respaldo (unidades por mes) para quien no usa el puntero.

### Precios (métrica separada de las unidades)

- Grano `store_id × item_id × wm_yr_wk`. Se valida la unicidad de la clave antes de
  cruzar: un duplicado es un error, no un promedio silencioso. **Un precio ausente es
  ausencia**: nunca se convierte en cero.
- **Distribución**: una observación por artículo × tienda, con el **precio medio ponderado
  por los días del periodo cubiertos por cada semana** (no ponderado por unidades). Se
  publican combinaciones incluidas, la regla de ponderación, la mediana, los cuartiles y la
  media; las cajas muestran mínimo, cuartiles y máximo con cifras exactas.
- La cobertura se publica con **estados mutuamente excluyentes** que suman el universo:
  `completa` (precio en todos los días del intervalo), `parcial` (algún día) y `sin_precio`
  (ninguno), más el porcentaje de **días** cubiertos. «Con algún precio» no es cobertura
  completa y la respuesta lo dice.
- **Cambios**: comparación de semanas consecutivas **con precio**; un hueco no genera una
  transición observada, se compara la siguiente semana con precio contra la última que lo
  tuvo, y la consecutividad sale del calendario (no se restan códigos `wm_yr_yr`). Las
  diferencias se calculan en **centavos enteros** porque el origen trae dos decimales: un
  cambio de **un centavo** cuenta como aumento o disminución. No hay tolerancia técnica
  invisible; si se aplicara un umbral **comercial** sería un parámetro explícito de la
  respuesta (`umbral`), que por omisión vale 0.
- **Ninguna bajada de precio se llama promoción** (M5 no trae campañas) y **no se
  construyen ingresos**: unidades y precio se publican por separado.

### Detalle de artículo × tienda

- Cabecera con artículo, tienda y estado, categoría y departamento, periodo y cobertura.
- Dos paneles **alineados** con el mismo dominio temporal y cursor compartido: ventas
  diarias y precio semanal en trazo escalonado, cada uno con su eje y su unidad (nunca un
  doble eje superpuesto).
- Capas opcionales: **SNAP del estado real de la tienda** y **eventos del calendario** con
  nombre y tipo. Se rotulan como coincidencias temporales, no como causas; el SNAP se lee
  de sus flags por estado, no de una regla genérica de días del mes.
- Búsqueda conectada al buscador de productos existente y navegación a departamento y
  tienda conservando periodo, métrica y filtros compatibles.

### Intermitencia y ceros

- Por serie artículo × tienda y periodo: días válidos, días con ventas positivas, días con
  cero, porcentaje de ceros, **mayor racha de ceros** y primera/última venta positiva
  observada, con tabla paginada y orden por ceros, unidades o racha.
- Un día **sin dato** no cuenta como cero e **interrumpe** la racha. Se incluyen las series
  con ventas siempre cero (nueve en `CA_1`): excluirlas sesgaría el porcentaje.
- Las fechas se rotulan «primera/última venta positiva observada»: no significan apertura,
  cierre, inventario ni rotura de stock, y no se confunden ventas observadas con demanda no
  satisfecha.

### Contrato de la API (ampliación)

| Endpoint | Contenido |
| --- | --- |
| `GET /comparacion` | Filas tienda × categoría con A, B, días válidos/esperados, cobertura, diferencia y variación; conteos del contexto y reconciliación |
| `GET /estacionalidad` | Perfil semanal por dimensión (estado, tienda o categoría) y mensual por año con días observados/esperados |
| `GET /matriz-temporal` | Matriz tienda × día del año con escala, marcas de mes y celdas sin dato |
| `GET /precios/distribucion` | Precio medio ponderado por días, cuartiles, cajas por categoría y detalle por artículo |
| `GET /precios/cambios` | Aumentos, disminuciones y estabilidad entre semanas con precio, con tolerancia |
| `GET /precios/evolucion` | Serie semanal del precio de un artículo en una tienda |
| `GET /articulo` | Ventas diarias, precio semanal, capas de SNAP y eventos, e intermitencia de la serie |
| `GET /intermitencia` | Resumen y tabla paginada de ceros por serie artículo × tienda |
| `GET /matriz-horizontes` | Desempeño por corte y horizonte (ventaja y sesgo) del modelo publicado |

Todas las respuestas identifican versión, filtros efectivos, periodo, grano, unidad,
cobertura y método. La caché se indexa por versión, filtros, periodo y tipo de análisis; no
hay consultas por hover ni por celda: las matrices y las tablas llegan completas en una
sola petición. Los conjuntos pesados se agregan en el servidor.

### Separación respecto al modelo predictivo

- Estos análisis son **descriptivos**. No alimentan el entrenamiento: el pipeline
  predictivo calcula sus propias variables con corte explícito en el origen y mantiene sus
  pruebas de ausencia de fuga temporal.
- No se reutilizan suavizados retrospectivos ni datos posteriores al origen como
  predictores, no se crean ceros artificiales para ventas futuras y no se sustituyen
  predicciones por observaciones.
- La matriz de desempeño de «Demanda futura» se calcula con las evaluaciones ya
  publicadas, al grano artículo × tienda, sobre las mismas series y fechas.

### Verificación ejecutada y mediciones

Todo lo siguiente se midió con la versión publicada `m5-85e8ac8df562` y
`m5p-b7dda45bfb08`, con `tools/verificar-exploracion.mjs` (0 fallos, 0 errores de consola)
y `backend/tests/test_exploracion_m5.py` (17 pruebas).

**Comparación por tienda × categoría (California, 2015)**

- 12 filas = 4 tiendas × 3 categorías; 3 categorías únicas, 7 departamentos únicos y 28
  combinaciones tienda × departamento; 3 049 artículos únicos y 12 196 series
  artículo × tienda.
- Las 12 filas tienen cobertura completa en A y en B (182 y 183 días).
- Reconciliación exacta: suma de filas 2 833 602 u en A = total del contexto 2 833 602 u;
  3 133 536 u en B = 3 133 536 u. `cuadra_a` y `cuadra_b` son `true` en la respuesta.

**Estacionalidad**

- Perfil semanal por tienda de California: 4 grupos, escala común 7 661,15 u de promedio
  diario. El promedio de cada día se verifica contra unidades ÷ fechas con observación.
- Mensual de 2015: los 12 meses salen completos (31, 28, 31… días). Enero de 2011 tiene
  31 días de mes, 31 dentro del periodo solicitado y **3 con cobertura** (del 29 al 31):
  «3 días observados de 31 · datos disponibles desde el 29 de ene de 2011». Mayo de 2016
  queda en 22 de 31 con cobertura hasta el día 22. Los meses sin días del periodo se
  devuelven como «sin dato».

**Matriz temporal**

- 2015: 365 columnas × 4 tiendas, escala 0–8 979 u, **0** celdas sin dato. 2012 (bisiesto):
  366 columnas y 0 sin dato. 2011: **365 columnas** con 112 celdas «sin dato» (las 28
  primeras fechas de enero, antes del inicio de las ventas) y 1 348 observadas. 2016: 366
  columnas, 572 observadas y 892 «sin dato» (posteriores al 22 de mayo). Con un periodo
  recortado, las fechas con cobertura quedan como «fuera del filtro» y los totales
  observados no cambian. Un año sin días dentro del periodo responde 422 con el motivo.
- Render medido en Chromium: 10 tiendas × 365 días (3 650 celdas) monta en 62–65 ms
  (105 ms el primero); California (1 460 celdas) en 27–28 ms; mover el cursor o el teclado
  cuesta 0,2–2,2 ms porque las filas están memorizadas. Se eligió **SVG** con esas cifras,
  no por un umbral inventado.

**Precios (`CA_1`, 1 ene 2015 – 22 may 2016)**

- Distribución (`CA_1`, 1 ene 2015 – 22 may 2016, 508 días): 3 049 combinaciones con
  **1 204 de cobertura completa** (39,49 %), **1 303 parciales** y **542 sin precio en el
  intervalo** (ausencia, nunca cero); 2 507 tienen algún precio (82,22 %) pero la cobertura
  real en días es **69,24 %** (1 072 523 de 1 548 892 días-combinación). Las 542 sin precio
  tienen precio en otras semanas del archivo (todas antes del periodo, última semana
  11 350) y ninguna está sin precio en toda la tienda. Cuartiles del precio medio por
  artículo: mín 0,20 · q1 2,1654 · mediana 3,4198 · q3 5,6595 · máx 30,5226 USD; media
  4,3435 USD. Cajas por categoría: Alimentos n=1 173 (mediana 2,7256), Aficiones n=481
  (3,97), Hogar n=853 (4,8911).
- Cambios, recalculados en **centavos exactos** (sin tolerancia técnica): 153 037
  transiciones = **1 369 aumentos + 1 632 disminuciones + 150 036 sin cambio**; 45,62 % de
  aumentos entre los cambios y **98,04 %** de semanas sin cambio. La versión anterior
  (tolerancia absoluta de 0,01 USD) perdía 47 cambios reales de un centavo: 1 350 / 1 604 /
  150 083 y 98,07 %. Por categoría (en centavos): Alimentos 72 313, Aficiones 28 448, Hogar
  52 276. Con umbral comercial explícito de 0,50 USD los conteos cambian (261 aumentos /
  315 disminuciones), lo que confirma que el umbral es un parámetro efectivo y declarado.
- Un artículo sin precio en el periodo devuelve `puntos: []` y su `motivo`, nunca ceros.

**Detalle de artículo e intermitencia**

- `FOODS_1_001` en `CA_1` (2015): 365 días de venta, 53 semanas con precio, 120 días SNAP
  de California y 30 eventos del calendario. La serie tiene 61,1 % de días con cero y una
  racha máxima de 10 días.
- Intermitencia de las 3 049 series de `CA_1` en 2015: 9 series con ventas siempre cero,
  mediana de ceros 59,45 % y media 56,26 %; distribución por tramos 413 / 756 / 1 048 /
  832 series. Ninguna fila tiene días que no sumen.

**Matriz de desempeño de «Demanda futura»**

- 2 cortes reservados × 28 horizontes = 56 celdas. Escalas: mejora máxima absoluta
  0,2708 u por serie; sesgo máximo absoluto 0,3321. En `h`=1 del corte `d_1885`
  (2016-03-28) el MAE es 0,9549 del candidato frente a 1,1056 del baseline, con 30 490
  observaciones y denominador de WAPE 36 041. **Una celda no es la mejora global**: las
  cifras por ventana, en los dos granos, están en la sección de auditoría siguiente.

**Latencias y tamaño de respuesta (API en frío / con caché)**

| Endpoint | Frío | Caché | Respuesta |
| --- | --- | --- | --- |
| `/comparacion` (CA 2015) | ~0,9 s | 50–69 ms | 10 kB |
| `/estacionalidad` | 48–61 ms | 48–61 ms | 6,9 kB |
| `/matriz-temporal` | 43–67 ms | 43–67 ms | 22,9 kB |
| `/precios/distribucion` (CA_1, 74 semanas) | 2,2 s | 119–126 ms | 398 kB (3 049 filas de detalle) |
| `/precios/cambios` | 42–49 ms | 42–49 ms | 8,6 kB |
| `/articulo` | ~0,5 s | 50 ms | 37 kB |
| `/intermitencia` (1 941 días) | 1,6 s | 92 ms | 7,5 kB |
| `/matriz-horizontes` | 9–17 ms | 9–17 ms | 14,5 kB |

La matriz temporal se calcula desde los agregados de tienda (no desde los bloques), y la
intermitencia lee solo los bloques que solapan el periodo pedido: con la ventana de un año
se decodifican dos bloques por serie en lugar de los diez del histórico completo.

**Navegador**

- Escritorio 1280 × 1000 y móvil 390 × 844, sin errores de consola. En móvil
  `document.documentElement.scrollWidth` = 390 (sin desbordamiento de la página) y las doce
  filas se ven con su etiqueta completa.
- Navegación secundaria de 4 secciones, URL con `ac_sec` y `ac_item`, Atrás/Adelante
  restaura sección, tienda, categoría y artículo.
- Capturas: `evidencias/comercial/exploracion-panorama-escritorio.png`,
  `exploracion-comparacion-tienda-categoria.png`, `exploracion-estacionalidad-escritorio.png`,
  `exploracion-precios-escritorio.png`, `exploracion-articulo-escritorio.png`,
  `exploracion-matriz-desempeno.png`, `exploracion-futura-escritorio.png`,
  `exploracion-panorama-movil.png` y `exploracion-comparacion-movil.png`.

## Auditoría del incremento de exploración (correcciones antes del cierre)

Revisión hecha sobre la implementación en marcha, con consultas y ejecución real contra
`atlas_comercial_local` (versión de ventas `m5-85e8ac8df562`, precios
`m5p-b7dda45bfb08`). Las cifras de esta sección están **recalculadas ahora**; las que
procedían de informes anteriores se corrigen o se marcan como heredadas.

### Hallazgos, causa, corrección y evidencia

| # | Hallazgo | Causa demostrada | Corrección aplicada | Evidencia |
| --- | --- | --- | --- | --- |
| 1 | «Enero de 2011 parcial con 3 días esperados» confundía cuatro conceptos | Un solo campo (`dias_esperados`) mezclaba días del mes, del intervalo, con cobertura y observados; además la API **rechazaba** una ventana que empezara el 1 de enero | Contrato con `dias_del_mes`, `dias_en_intervalo`, `dias_con_cobertura`, `dias_observados`, `dias_sin_dato`, `dias_fuera_intervalo` y `motivo` que nombra el límite; la ventana descriptiva admite el 1 de enero y marca los días sin dato | Enero 2011: 31 / 31 / 3 / 3, motivo «3 días observados de 31 · datos disponibles desde el 29 de ene de 2011»; promedio 12 702,67 = 38 108 ÷ 3 |
| 2 | La matriz de 2011 empezaba el 29 de enero (337 columnas) | El eje se construía con los días con ventas, no con el calendario del año | Eje anual completo con estado por celda: `observado`, `sin_dato`, `fuera_del_filtro`; leyenda, trama y tabla coherentes | 2011: 365 columnas, 1 348 observadas, 112 sin dato; 2012: 366 y 0 sin dato; 2016: 366, 572 observadas y 892 sin dato; recorte a febrero: 1 236 celdas «fuera del filtro» y los mismos 28 días observados |
| 3 | «2 507 con precio (82,22 %)» se leía como cobertura | Solo se contaban combinaciones con **algún** precio; no se distinguía completa, parcial ni la cobertura en días | Desglose mutuamente excluyente y porcentaje de días cubiertos, con explicación calculada de las combinaciones sin precio | `CA_1` 2015–may 2016: 1 204 completas (39,49 %), 1 303 parciales, 542 sin precio; días con precio 69,24 %; las 542 tienen precio antes del periodo (última semana 11 350) y ninguna carece de precio en la tienda |
| 4 | La tolerancia de 0,01 USD ocultaba cambios reales | Se comparaba con una tolerancia absoluta en coma flotante | Comparación en **centavos enteros**; el umbral comercial pasa a ser un parámetro explícito (0 por omisión) declarado en la respuesta | 1 369 aumentos / 1 632 disminuciones / 150 036 sin cambio (98,04 %); antes 1 350 / 1 604 / 150 083 (98,07 %): 47 cambios de un centavo que se perdían |
| 5 | La evaluación se resumía con una sola celda (`h`=1) | El informe citaba el MAE de un horizonte como si describiera los 28 días | Tabla completa por ventana y por los dos granos, con consolidado, estados, categorías, reconciliación y advertencias | Detalle 1,0700 vs 1,2382 (13,58 % menos error); total del segmento 3 050,23 vs 3 501,00 (12,88 % menos error); el primer corte **empeora** (23,71 % más error) y Texas (13,56 %) y Hogar (2,21 %) también en el grano agregado |
| 6 | Faltaba prueba de ausencia de fuga en la inferencia | No había una prueba que alterara el futuro con el modelo fijo | Pruebas nuevas: ventas posteriores, precios posteriores y separación entrenamiento/evaluación | 3 pruebas con un LightGBM entrenado en el acto: alterar ventas o precios posteriores al origen no cambia ninguna predicción; el entrenamiento termina en el día anterior a la primera fecha evaluada |

### Cobertura temporal: definición corregida

- **Periodo solicitado**: lo que el usuario pide; puede empezar el 1 de enero aunque las
  ventas empiecen el 29. Dominio admitido: 1 de enero del primer año con datos – 31 de
  diciembre del último año del calendario. Fuera de ahí es un error explícito (422).
- **Cobertura de ventas**: primera y última fecha con ventas publicadas
  (2011-01-29 – 2016-05-22).
- **Días del mes**: los del calendario (31 en enero, 28/29 en febrero).
- **Días en el intervalo**: los del mes que caen en el periodo solicitado.
- **Días con cobertura**: los del intervalo que además tienen ventas publicadas.
- **Días observados**: los que tienen valor; único denominador del promedio.
- **Sin dato** y **fuera del filtro** son estados distintos y ninguno es un cero.

La cabecera de la aplicación avisa cuando el periodo sale de la cobertura y el pulso se
calcula dentro de ella; las vistas descriptivas conservan el periodo completo.

### Cobertura de precios: desglose real (`CA_1`, 1 ene 2015 – 22 may 2016)

| Estado | Combinaciones | % del universo | Significado |
| --- | --- | --- | --- |
| Cobertura completa | 1 204 | 39,49 % | precio en los 508 días del intervalo |
| Cobertura parcial | 1 303 | 42,73 % | precio en parte del intervalo (mediana 401 días) |
| Sin precio en el intervalo | 542 | 17,78 % | ninguna semana con precio dentro del periodo |
| **Universo** | **3 049** | 100 % | artículos × tienda del alcance |

- Días con precio: **1 072 523 de 1 548 892** (69,24 %); la mediana por combinación con
  precio es de 401 días.
- Las 542 sin precio **no** carecen de precio en la tienda: todas lo tienen antes del
  periodo (la última semana con precio de esas series es la 11 350) y ninguna está sin
  precio en toda la historia importada. Es discontinuidad del archivo, no falta de
  inventario ni ventas cero.
- En la ventana completa (2011-01-29 – 2016-05-22) las mismas 1 204 combinaciones siguen
  siendo completas, las parciales suben a 1 845 y no queda ninguna sin precio: coherente con
  artículos que dejaron de venderse.

### Cambios de precio: recuento con centavos exactos

- Comparación en centavos enteros; **sin umbral comercial por omisión**.
- **153 037 transiciones = 1 369 aumentos + 1 632 disminuciones + 150 036 sin cambio**;
  45,62 % de aumentos entre los cambios y **98,04 %** de semanas sin cambio.
- Semanas del intervalo: 74; series con precio: 2 507. Por categoría: Alimentos 72 313,
  Aficiones 28 448, Hogar 52 276 (suman el total).
- Prueba unitaria con una serie sintética: `2,00 → 2,01` cuenta como aumento de un centavo,
  `2,01 → 2,01` no cuenta, `2,68 → 2,68` tampoco (el ruido de coma flotante se elimina
  redondeando a centavos) y con umbral comercial de 0,05 USD esos cambios dejan de contar.

### Evaluación predictiva: protocolo y resultados completos

**Ejecución publicada** `run-calendario-749b5ca3a8` (variante calendario): 50 variables,
LightGBM global condicionado al horizonte, semilla 20260522, horizonte 28, entrenamiento en
los orígenes `[1621, 1677, 1745, 1829, 1857]` (ventana hasta `d_1857`). Las ventanas
evaluadas son `d_1885` y `d_1913`: **el entrenamiento termina antes** de la primera fecha
objetivo evaluada (`1857 + 28 = 1885`). Precios: último conocido en el origen; el precio
futuro es un supuesto, no un dato. Los cortes de desarrollo (`d_1773` a `d_1857`) eligen la
variante; los reservados solo se reportan.

**Por ventana, grano detalle artículo × tienda** (unidades por serie y día):

| Ventana | Fechas objetivo | n | MAE cand. | MAE base | Sesgo cand. | Sesgo base | WAPE cand. | WAPE base | Diferencia | Mejora |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `d_1885` | 2016-03-27 → 2016-04-23 | 853 720 | 1,06 | 1,23 | 0,131 | −0,040 | 76,63 % | 88,89 % | 0,17 | 13,79 % |
| `d_1913` | 2016-04-24 → 2016-05-21 | 853 720 | 1,08 | 1,24 | 0,060 | −0,106 | 74,68 % | 86,22 % | 0,17 | 13,38 % |
| **Consolidado** | — | **1 707 440** | **1,07** | **1,2382** | **0,0951** | **−0,0729** | **75,64 %** | **87,53 %** | **0,1682** | **13,58 %** |

**Por ventana, grano total del segmento** (unidades por día del total de las 30 490 series;
se suma predicción y observado del día antes de medir). Cifras recalculadas desde la revisión
`rev-ec9b21cd45` (véase «Corrección de coherencia numérica y semántica»):

| Ventana | Observaciones | MAE cand. | MAE base | Sesgo cand. | Sesgo base | WAPE cand. | WAPE base | Mejora del MAE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `d_1885` | 28 días | 3 997,3064 | 3 231,1429 | 3 979,8333 | −1 206,9286 | 9,4561 % | 7,6436 % | **23,71 % más error** |
| `d_1913` | 28 días | 2 103,1614 | 3 770,8571 | 1 818,0259 | −3 237,4286 | 4,7808 % | 8,5718 % | **44,23 % menos error** |
| **Consolidado** | **56** | **3 050,2339** | **3 501,0000** | **2 898,9296** | **−2 222,1786** | **7,0719 %** | **8,1170 %** | **12,88 % menos error** |

Los dos granos no son comparables: al sumar series, los errores de signo contrario se compensan.
Aquí el candidato **sobreestima** el total del segmento (sesgo +3 979,83 y +1 818,03 unidades por
día) y aun así reduce el error consolidado; en el primer corte el baseline tiene menos error.
Sumar los MAE de los segmentos no da el MAE nacional: para el total se suma primero y se mide
después.

**Por estado y por categoría (consolidado de las dos ventanas)**

| Segmento | Series | MAE detalle cand./base | Mejora detalle | MAE total cand./base | Mejora total |
| --- | --- | --- | --- | --- | --- |
| CA | 12 196 | 1,13 / 1,33 | 14,97 % | 1 121,81 / 1 124,30 | 0,22 % |
| TX | 9 147 | 0,97 / 1,11 | 12,36 % | 1 143,09 / 1 006,63 | **−13,56 %** |
| WI | 9 147 | 1,08 / 1,24 | 12,71 % | 1 094,93 / 1 676,07 | 34,67 % |
| Alimentos | 14 370 | 1,39 / 1,62 | 14,32 % | 2 225,30 / 2 697,82 | 17,52 % |
| Aficiones | 5 650 | 0,76 / 0,85 | 11,17 % | 275,11 / 341,75 | 19,50 % |
| Hogar | 10 470 | 0,80 / 0,92 | 13,00 % | 798,86 / 781,57 | **−2,21 %** |

El candidato **empeora** en el total de Texas y en el total de Hogar, y así se publica.
Dos ventanas no permiten afirmar significancia estadística; no se declara WRMSSE oficial.

**Coherencia y reconciliación**

- El agregado publicado es la suma del detalle: para `d_1941` la diferencia máxima entre la
  suma de las 30 490 series y el total es **0,00** unidades.
- La matriz de 28 días y la tabla por ventana comparten origen, series y fechas; la ventaja
  es `MAE_baseline − MAE_candidato` y el sesgo `predicción − observado` en las dos vistas.
- Un pronóstico sin observaciones (corte final `d_1941`) no publica error: el grano
  agregado devuelve el motivo «este origen no tiene observaciones: es pronóstico, no
  evaluación».
- WAPE se publica como razón y como porcentaje; con denominador cero queda no calculable.

**Pruebas de ausencia de fuga temporal** (`backend/tests/test_modelo_m5.py`)

1. Entrenar un LightGBM pequeño y fijo, predecir desde un origen, **alterar todas las ventas
   posteriores** y volver a predecir: las 28 × series predicciones son idénticas.
2. Lo mismo alterando **los precios de las semanas posteriores** al origen: idénticas.
3. El entrenamiento de una ventana termina en el día anterior a la primera fecha objetivo
   que se evalúa desde ese origen.

### Capturas de la versión corregida

`evidencias/comercial/auditoria-estacionalidad-enero-2011.png`,
`auditoria-matriz-2011.png`, `auditoria-matriz-2012.png`, `auditoria-matriz-2016.png`,
`auditoria-precios-cobertura.png`, `auditoria-comparacion-12-filas.png`,
`auditoria-matriz-28-dias.png`, `auditoria-evaluacion-ventanas.png`,
`auditoria-pronostico-28-dias.png` y `auditoria-panorama-movil.png`. El informe con las
cifras está en `evidencias/comercial/informe-exploracion.json`.

## Reorganización en seis pantallas (entrega actual)

El tablero dejó de ser un panel único con dos vistas y pasó a **seis pantallas** que siguen
el ciclo de un proyecto de datos. No se reescribieron los cálculos: se reutilizaron los
endpoints, los componentes y las verificaciones ya existentes, y se añadió lo que faltaba
para que cada pantalla tenga sentido por sí sola.

### 1. Lo que cambió en la experiencia

- **Navegación**: una sola tira de pestañas (nunca filas apiladas) al estilo del Atlas Vial,
  con cápsula grafito, iconos, flechas/Inicio/Fin por teclado y etiquetas cortas en móvil.
  La navegación del portafolio (migas, cabecera del sitio, botón de ficha) queda intacta.
- **Contexto compartido**: una barra de contexto con los cuatro filtros compatibles
  (estado, tienda, categoría, departamento) y el artículo cuando el departamento está
  abierto. Es la misma fuente de estado para las seis pantallas, los valores imposibles no
  se ofrecen y los incompatible se resuelven con un aviso visible.
- **Cada pantalla con su URL**: recargar, compartir y Atrás/Adelante reproducen la misma
  vista. Cambiar de pantalla **añade** historial; ajustar un filtro lo **reemplaza**.
- **Direcciones antiguas**: `ac_sec=…` se traduce a `exploracion` con la misma subsección y
  se reescribe a la forma nueva conservando periodo, A/B, territorio y catálogo.
- **Descarga**: el CSV se genera desde las filas que la pantalla muestra (misma selección,
  mismos identificadores) con BOM, cabecera de metadatos (ejecución, modelo, versiones,
  corte, inicio/fin, horizonte, nivel, unidad, supuesto de precios) y celdas nulas vacías.

### 2. Rutas finales

| Pantalla | Ruta | Carga propia |
|---|---|---|
| Proyecto | `?ac_pantalla=proyecto` | `/estado`, `/catalogo`, `/modelos`, `/pronosticos?nivel=total`, `/evaluacion?nivel=total&etapa=final` |
| Datos y calidad | `?ac_pantalla=datos` | `/comparacion` (conteos y reconciliación), `/precios/distribucion`, `/intermitencia` |
| Exploración · panorama | `?ac_pantalla=exploracion&ac_sub=panorama` | `/pulso`, `/comparacion`, `/historico` |
| Exploración · estacionalidad | `?ac_pantalla=exploracion&ac_sub=estacionalidad` | `/estacionalidad`, `/matriz-temporal` |
| Exploración · precios | `?ac_pantalla=exploracion&ac_sub=precios` | `/precios/distribucion`, `/precios/cambios` |
| Exploración · artículo | `?ac_pantalla=exploracion&ac_sub=articulo` | `/articulo`, `/intermitencia`, `/productos` |
| Modelado | `?ac_pantalla=modelado` | `/modelos`, `/evaluacion-ventanas` |
| Evaluación | `?ac_pantalla=evaluacion` | `/pronosticos?origen=d_N`, `/evaluacion`, `/evaluacion-ventanas`, `/matriz-horizontes` |
| Resultados | `?ac_pantalla=resultados` | `/pronosticos?nivel=…&origen=null`, `/evaluacion` |

Todas las pantallas llevan estados de **carga**, **vacío** y **error** con reintento, y cada
una pide solo lo que muestra (no se descarga el conjunto completo al navegador).

### 3. Funciones reubicadas y pendientes cerrados

| Función existente | Dónde estaba | Dónde está |
|---|---|---|
| Panorama territorial y pequeños múltiplos | vista «Pulso de ventas» | Exploración · Panorama |
| Composición comercial, comparación A/B y concentración | vista «Pulso de ventas» | Exploración · Panorama |
| Comparación histórica por año | vista «Pulso de ventas» | Exploración · Panorama |
| Estacionalidad y matriz temporal | subsección de Pulso | Exploración · Estacionalidad |
| Distribución y cambios de precio | subsección de Pulso | Exploración · Precios (y resumen de cobertura en Datos) |
| Detalle de artículo e intermitencia | subsección de Pulso | Exploración · Detalle de artículo |
| Gráfica del corte, KPIs, desglose y descarga | «Demanda futura» | Resultados (`PanelPronostico`, con descarga) |
| Comparación por horizonte y segmento | «Demanda futura» | Evaluación (`PanelEvaluacion`) |
| Matriz ventana × horizonte | «Demanda futura» | Evaluación |
| Tabla completa en dos granos | «Demanda futura» | Evaluación |
| Ejecuciones del modelo, parámetros, variables, importancias | no visible | Modelado |
| Fuentes, estructura, cobertura, ceros, precios, reconciliación y versión | disperso en `/estado` y metodología | Datos y calidad |
| Resumen del problema, alcance y resultados principales | ficha del portafolio | Proyecto (dentro de la aplicación) |

Pendientes de la lista anterior que **quedan cerrados** con esta entrega: pantallas con
propósito propio, navegación única sin filas apiladas, contexto persistente entre pantallas,
enlaces directos y compatibilidad con las direcciones antiguas, descarga del resultado,
explicación del modelo sin SHAP decorativo, protocolo de evaluación legible y separación
explícita entre el error por artículo × tienda × día y el error del total del segmento.

### 4. Correcciones de lógica de esta entrega

- **Subsección perdida en direcciones mixtas**: una URL con `ac_pantalla` y `ac_sec` a la vez
  abría el panorama e ignoraba la subsección pedida. Ahora `ac_sub` manda y, si falta,
  `ac_sec` sigue sirviendo de subsección.
- **Historial real**: antes todos los cambios usaban `replaceState`, así que Atrás/Adelante
  nunca volvían a la pantalla anterior. Ahora el cambio de pantalla usa `pushState` y los
  filtros siguen usando `replaceState`.
- **`ac_anio` por omisión**: se escribía siempre (`2015`) aunque el usuario no hubiera
  cambiado el año; dejó de ensuciar la URL y ya no fuerza peticiones de un año fuera del
  periodo elegido.
- **Carga de la cobertura de precios en Datos**: el efecto se resolvía antes de que llegara
  el catálogo y nunca se reintentaba (la cobertura quedaba vacía). Se añadió el catálogo a
  las dependencias y la tienda por omisión se resuelve del contexto.
- **Evaluación abre un corte histórico**: el panel arranca en el primer corte publicado (no
  en el pronóstico futuro), porque esa pantalla mide lo que ya ocurrió.
- **Nivel artículo en el pronóstico**: el panel de Resultados ofrece el nivel «Artículo» y
  la API recibe `items`, de modo que el recorrido comercial termina en un artículo real y su
  descarga.
- **Desbordes en móvil**: la tabla de cada ventana evaluada y los controles de cabecera
  provocaban 15 px de desbordamiento a 390 px; ahora se desplazan dentro de su tarjeta.
- **Botón «Reintentar» muerto en Resultados y Evaluación**: el efecto del pronóstico no
  dependía del contador de refresco, así que el reintento no volvía a pedir los datos.
  Se añadió la dependencia y ahora el estado de error se recupera (lo comprueba la
  verificación cortando la red y restableciéndola). Además, un fallo de red ya no repite el
  título: dice «No se pudo contactar la API del pronóstico. Revisa la conexión y vuelve a
  intentar». La evidencia está en `pantallas-estado-error.png` (error) y
  `pantallas-error-recuperado.png` (misma pantalla tras reintentar).
- **Tienda del análisis de precios**: se guarda en la URL (`ac_tienda_precios`), sobrevive a
  la recarga y se reajusta sola si deja de existir en el contexto territorial.

### 5. Pruebas ejecutadas y resultados

| Prueba | Alcance | Resultado |
|---|---|---|
| `npx tsc --noEmit` + `npm run build` | tipos y bundle del tablero | sin errores |
| `pytest` (suite completa del backend) | 298 casos | **298 passed** |
| `tools/verificar-pantallas.mjs` | seis pantallas: enlaces directos, pestañas, Atrás/Adelante, recarga, direcciones antiguas, contexto persistente, recorrido técnico y comercial, CSV contra la tabla, cambio rápido de filtros sin respuestas obsoletas, estado de error con reintento y recuperación, móvil 390 px y teclado. Escribe `evidencias/comercial/informe-pantallas.json` | **0 fallos, 0 errores** |
| `tools/verificar-exploracion.mjs` | comparación, estacionalidad, matriz, precios, artículo, intermitencia, evaluación y móvil | **0 fallos, 0 errores** |
| `tools/verificar-modelo.mjs` | panel del pronóstico, corte histórico, evaluación y móvil | **0 fallos, 0 errores** |
| `tools/verificar-territorio.mjs`, `tools/verificar-drilldown.mjs`, `tools/verificar-atlas-comercial.mjs` | panorama, drilldown y panel del pronóstico | **sin fallos** |
| `tools/verificar-ficha.mjs` | ficha del portafolio: título y descripción públicos, las seis pantallas en el texto, la tarjeta del área con su captura (responde 200 y se decodifica con las medidas declaradas) y el tablero montado en «Proyecto» | **sin fallos** |

Comprobaciones de datos incluidas en `verificar-pantallas.mjs`: el total pronosticado de la
pantalla coincide con la suma de las series de la API y con la suma del desglose por clave;
el CSV contiene la cabecera declarada, el corte y las columnas de unidades.

### 6. Capturas

Escritorio (1400 px) y móvil (390 px) en `evidencias/comercial/`:

`pantallas-proyecto.png`, `pantallas-datos.png`, `pantallas-exploracion.png`,
`pantallas-modelado.png`, `pantallas-evaluacion.png`, `pantallas-resultados.png`,
`pantallas-movil-datos.png`, `pantallas-movil-resultados.png`,
`pantallas-comercial-contexto.png`, `pantallas-datos-precios.png` y
`pantallas-estado-error.png`.

Las imágenes de la ficha del portafolio (`dist/img/atlas-comercial-pantalla-*.png`,
`atlas-comercial-modelo.png`, `atlas-comercial-evaluacion.png`) se regeneraron desde el
bundle servido en esta sesión.

### 7. Limitaciones reales que quedan

- El error por artículo × tienda × día sigue siendo alto (WAPE 75–92 %) por la intermitencia
  de las series; es la limitación del problema, no un defecto de la interfaz, y por eso se
  publica también el error del total del segmento.
- Dos cortes finales no permiten afirmar significancia ni superioridad universal.
- El candidato **empeora** en el total de Texas (−13,56 %) y de Hogar (−2,21 %): está
  publicado en Evaluación y no se oculta.
- No hay intervalos de predicción, ni WRMSSE, ni comparación con el ranking de Kaggle.
- La importancia por ganancia **no** es SHAP ni causal; no se ha generado una versión
  cosmética de SHAP.
- La cobertura de precios es semanal por artículo × tienda: no hay precio diario, y la
  ausencia de precio no se interpreta como inventario cero.
- El pronóstico está anclado al último día del conjunto (2016-05-22): no hay ingesta
  incremental ni monitorización en producción.
- Los filtros de Exploración (periodo descriptivo y A/B) no se aplican al pronóstico: el
  corte y la ventana de evaluación se eligen en sus pantallas y la barra de contexto lo dice.

## Corrección del fallo de «Resultados» (nivel artículo residual y unidad de cobertura)

### Causa demostrada

El fallo se reprodujo con registro de peticiones, URL y texto en pantalla, sin tocar datos ni
modelo.

1. **El nivel «Artículo» se podía pedir sin sus campos obligatorios.** El selector de nivel se
   añadió en «Resultados», pero `nivelPronostico` era un único estado que se enviaba tal cual a
   la API. Con todos los filtros vacíos, elegir «Artículo» producía:

   ```
   GET /pronosticos?nivel=producto&dias_historico=90        →  422
   {"detail":{"estado":"filtro_invalido",
              "mensaje":"El nivel producto necesita «tienda» y «item» (o «items»)."}}
   ```

2. **Doble mensaje contradictorio.** `PanelPronostico` empezaba con
   `if (!pronosticos) return <p>Sin pronóstico publicado para esta versión.</p>`, así que
   *cualquier* motivo sin datos (cargando, 422, red caída) se traducía en una afirmación de
   ausencia que nadie había comprobado, además del panel de error.

3. **Sin salida.** El selector de nivel vivía dentro del panel que ese `return` sustituía: al
   quedar en error, el usuario perdía el control para volver a un nivel agregado. Reproducido:
   tras el 422, pulsar «Total» no enviaba ninguna petición (`nivel: []` en el DOM).

4. **Nivel residual al cambiar de contexto.** Con `nivel=producto` y un artículo elegido, quitar
   la tienda («Todas las tiendas») dejaba el nivel intacto y volvía a enviar
   `nivel=producto&…&items=FOODS_3_090` sin `tienda` → otro 422. La URL solo conservaba
   `ac_item`, no el nivel, así que recargar mezclaba un estado que el usuario no podía ver.

5. **«1941 meses».** La cifra del encabezado son **días de cobertura**, pero
   `resumenPeriodo(desde, hasta, agregacion, dias)` rotulaba esa cantidad con la unidad de la
   agregación de la gráfica (`día`, `semana`, `mes`). El parámetro compartido era la causa, no
   la cadena: con la gráfica en mensual el mismo 1 941 aparecía como «1941 meses».

Consulta inválida reproducida (sin datos sensibles):

```
GET /pronosticos?nivel=producto&dias_historico=90&estado=CA&categoria=FOODS
    &departamento=FOODS_3&items=FOODS_3_090                    →  422
```

### Corrección aplicada

- **Una sola resolución de la selección** (`src/seleccion.ts`): recibe nivel, tienda y artículo y
  devuelve `{estado, nivel, items, faltan, mensaje}`. Es la misma información que se envía a la
  API, la que el panel titula y la que la URL representa. Los niveles agregados siempre son
  válidos; el nivel `producto` exige tienda y artículo.
- **No se envían peticiones inválidas.** Si la selección está incompleta no se llama a la API;
  la API conserva sus validaciones y aquí no se convierten en «todos».
- **Ajuste coherente y comunicado.** Si el contexto invalida un artículo que era válido, el nivel
  baja al agregado equivalente (departamento, categoría o total) y se avisa. Si el usuario acaba
  de pedir «Artículo», se respeta su elección y se le pide completar la selección.
- **Niveles separados por pantalla** (`nivelResultados` y `nivelEvaluacion`): el detalle de
  artículo ya no contamina la evaluación, y la evaluación no pide niveles que no publica.
- **El nivel vive en la URL** (`ac_nivel`). Una URL con `nivel=producto` sin sus campos se
  normaliza a un nivel agregado y lo comunica, sin mensajes de ausencia.
- **Seis estados excluyentes** en el panel: `cargando`, `incompleta`, `error_validacion`,
  `error_conexion`, `sin_resultados` y `listo`. «Sin pronóstico publicado» ya no existe como
  texto: el estado vacío solo aparece con una respuesta válida sin series. «Reintentar» se
  ofrece únicamente en el error de conexión; la validación y la selección incompleta ofrecen
  controles.
- **Los controles nunca desaparecen**: el selector de nivel y la metodología general siguen
  visibles en cualquier estado; el contenido dependiente del resultado (fechas, totales,
  gráfica, tablas) solo se muestra cuando hay resultado.
- **Unye temporal corregida en el origen**: `resumenPeriodo` recibe solo los días y siempre los
  rotula como días; la agregación se declara aparte. `UNIDAD_COBERTURA` documenta la invariante.

Peticiones después de la corrección (sin datos sensibles):

```
# Resultados por omisión
GET /pronosticos?nivel=total&dias_historico=90                          → 200

# Artículo con contexto completo
GET /pronosticos?nivel=producto&dias_historico=90&tienda=CA_1&estado=CA
    &categoria=FOODS&departamento=FOODS_3&items=FOODS_3_090              → 200

# «Todas las tiendas» desde ese contexto (nivel resuelto a departamento)
GET /pronosticos?nivel=departamento&dias_historico=90&estado=CA
    &categoria=FOODS&departamento=FOODS_3                                → 200

# Artículo sin tienda: no se envía nada
(sin petición)  ·  estado «incompleta» con controles

# Además: la evaluación ya no se pide por artículo
GET /evaluacion?nivel=producto&etapa=final  (eliminada: producía 422 en consola)
```

### Pruebas de regresión

`tools/verificar-resultados.mjs` (nuevo) comprueba en navegador, inspeccionando **parámetros
enviados y contenido**, los nueve casos pedidos:

| Caso | Qué comprueba | Resultado |
|---|---|---|
| A | Resultados sin parámetros: una sola petición `nivel=total`, 200, gráfica y «Fin del histórico» | ok |
| B | Tienda + artículo: `nivel=producto&tienda=CA_1&items=FOODS_3_090`, desglose del artículo correcto (1 710 u) | ok |
| C | Desde ahí, «Todas las tiendas»: ninguna petición de nivel producto, sin 422, nivel resuelto y aviso visible | ok |
| D | Artículo → Resultados → contexto general: contexto conservado, artículo consultable, sin nivel residual | ok |
| E | URL con `ac_nivel=producto` incompleto: normalización + aviso, sin petición inválida; y el caso explícito muestra «Selección incompleta» y se resuelve al completar los controles | ok |
| F | Cambios rápidos de nivel y Atrás/Adelante entre pantallas: URL, controles y resultado coinciden | ok |
| G | Error real de red: estado `error_conexion`, reintento funcional | ok |
| H | Respuesta válida sin series: estado `sin_resultados` sin gráfica ni tablas, distinguido de los errores; un pronóstico de ceros sigue siendo resultado | ok |
| I | Día/Semana/Mes: la cobertura mantiene «1 941 días» en las tres | ok |

El resto de la verificación sigue en verde: `verificar-pantallas`, `verificar-exploracion`,
`verificar-modelo`, `verificar-atlas-comercial`, `verificar-territorio`, `verificar-drilldown` y
`verificar-ficha` (todas exit 0), `npx tsc --noEmit` y `npm run build` sin errores, y la suite
del backend en 298 casos.

### Capturas

`evidencias/comercial/resultados-general.png` (A), `resultados-articulo.png` (B),
`resultados-todas-las-tiendas.png` (C), `resultados-url-normalizada.png` (E),
`resultados-seleccion-incompleta.png` (E, elección explícita), `resultados-error-red.png` (G) y
`resultados-sin-resultados.png` (H).

## Incremento de corrección analítica e interacción

Alcance acotado sobre el código existente: mismas seis pantallas, mismos datos publicados y
mismo sistema visual. No se reentrenó, no se reimportó y no se cambió de base.

### 1. Correcciones analíticas

**Proyecto · grano de las métricas.** Las tarjetas rotulaban como «total diario» cifras que
corresponden al detalle artículo × tienda × día (MAE 1,07 · WAPE 75,64 % · mejora 13,58 %).
Ahora la pantalla lee el **consolidado de `/evaluacion-ventanas`**, que declara su grano, y
publica cuatro tarjetas separadas: *MAE · por artículo × tienda × día* (1,07 · baseline 1,24),
*MAE · total del segmento por día* (1 894,23 · baseline 3 501,00), *Mejora · por artículo ×
tienda × día* (13,58 %, con la del segmento al 45,90 % como dato aparte) y *WAPE · por
artículo × tienda × día* (75,64 % · baseline 87,53 %), con la nota de que los granos no son
comparables. Ninguna cifra está escrita a mano: las cuatro salen de la misma respuesta, con
su ejecución y su número de ventanas.

**Datos y calidad · alcance del bloque.** Con todas las tiendas seleccionadas, la
intermitencia mostraba 3 049 series porque se calcula por tienda. Ahora el bloque declara su
ámbito junto al título («subanálisis por tienda · CA_1 · 29 ene 2011 – 22 may 2016 · 1 941
días»), el selector que la gobierna vive dentro del bloque y la tarjeta se titula **«Series
de la tienda analizada»** en lugar de «Series del contexto». La distinción entre artículos
únicos y series artículo × tienda sigue en la sección de estructura.

**Datos y calidad · la tarjeta de ceros.** El campo era `pct_cero_mediana`: la mediana del
porcentaje de días en cero por serie. Se titula **«Mediana del porcentaje de días en cero»** y
el pie explica el denominador (días con 0 unidades ÷ días con dato de esa serie, mediana sobre
las series con datos, con la media y las series de todo cero).

**Modelado · variantes y protocolo.** La pantalla presenta ahora el **manifiesto real** de
ejecuciones con su rol y sus métricas publicadas, de modo que la variante publicada no puede
aparecer como descartada: `run-calendario-749b5ca3a8` (publicada), `run-precios-9cdc693291`
(evaluada y no publicada, WAPE de desarrollo 78,68 % frente a 78,62 %),
`run-calendario-10e4d28701` (evaluada y no publicada) y `run-baseline-4b34ca8abc` (referencia).
Una ejecución sin métricas se declara «registrada sin métricas»: existir no es haber sido
descartada.

La separación entre selección y evaluación **sí está acreditada con los registros**: el
entrenamiento de la ejecución publicada termina en d_1857 (orígenes d_1621, d_1677, d_1745,
d_1829 y d_1857) y los cortes finales son d_1885 y d_1913, posteriores a todo entrenamiento. La
pantalla muestra esos números. También declara el matiz honesto: los cortes de desarrollo
(d_1773, d_1801, d_1829 y d_1857) incluyen dos fechas que **coinciden con orígenes de
entrenamiento**, así que se usaron para ajustar, no como reporte independiente.

Las variables son las de la ejecución publicada: 50 variables sin ninguna de precio. La
pantalla deja de atribuirle precios y solo menciona la versión de precios cuando la propia
ejecución los usa (`precio_*`/`tiene_precio` en su lista de variables).

**Resúmenes por segmento.** El recuento de la tabla de segmentos se calcula sobre el nivel
activo (`tienda`, `estado`, `categoria`, `departamento`), no sobre el total del informe, y
distingue mejora, empate, deterioro y no calculable, indicando el grano del error
(artículo × tienda × día). Con el nivel tienda se informan 10 segmentos; el 23 del informe
completo ya no se presenta como resumen de esa pestaña.

En «Evaluación» la cifra principal de WAPE es el **consolidado** (Σ|error| ÷ Σobservado:
75,64 %), no el promedio simple de las ventanas; el texto lo explica. Los deterioros del grano
agregado se publican explícitamente: total de Texas −13,56 % y total de Hogar −2,21 %.

### 2. Comparación A/B colapsable

- Cabecera siempre visible: título, periodos A y B con su duración, métrica activa, número de
  tiendas y combinaciones, resumen de aumentos, disminuciones, empates y casos no calculables
  referido a la métrica activa, y el botón **«Mostrar comparación» / «Ocultar comparación»**
  con `aria-expanded` y `aria-controls`.
- Arranca **colapsada** en una visita nueva; si la URL trae periodos A/B explícitos
  (`ac_ad…`/`ac_bh…`) se abre, porque es un enlace dirigido a la comparación.
- El estado de plegado vive en la aplicación: se conserva al navegar entre pantallas. Colapsar
  no recalcula ni vuelve a consultar (se comprueba en la batería de pruebas contando peticiones).
- Teclado: Enter y Espacio funcionan sobre el botón, con foco visible; el movimiento de la
  lista respeta `prefers-reduced-motion`.
- En el orden **Por tienda**, cada tienda es una fila de encabezado expandible con el número de
  categorías que contiene, y hay **«Expandir todas» / «Contraer todas»**. Expandir es una
  acción distinta de navegar: la navegación sigue en el botón de la fila, y el detalle (Periodo
  A con cobertura, Periodo B con cobertura, diferencia y variación) se abre con el botón ⓘ.
- Los órdenes globales (volumen B, mayor aumento, mayor disminución) usan **lista plana** con
  `tienda · categoría` en cada fila; al volver a «Por tienda» se restauran las expansiones
  anteriores.
- La escala del eje se calcula con **todas** las filas del contexto filtrado: expandir una
  tienda no cambia el tamaño relativo de las demás (comprobado comparando las marcas del eje).
- Se conserva A hueco / B relleno, columnas alineadas A, B, diferencia (B − A) y variación,
  «n/c» con motivo cuando A = 0, navegación al detalle, reconciliación y tabla accesible.

### 3. Eje y tooltip de la comparación

El formateador dividía mal: añadía «M» sin dividir entre 1 000 000 y producía «1,969,700.0 M».
Ahora `marcaEje` divide antes de rotular y usa una unidad consistente por eje («985 mil»,
«2 M», «3,9 M»), con signo para negativos y respetando el formato numérico de es-MX. Las cifras
completas siguen en las columnas, en la tabla y en el título accesible de la fila.

El tooltip largo que atravesaba la tabla se sustituyó por un **panel compacto** (opaco, dentro
de la fila, dentro del viewport) con tienda · categoría, Periodo A (valor y cobertura), Periodo
B (valor y días), diferencia y variación o motivo de no calculable. Se abre con hover, foco y
toque en su propio botón y no bloquea el control activo.

### 4. Concentración compacta y explorable

- Pregunta explícita en el bloque y curva con dominio 0–100 % en ambos ejes, cierre en
  (100 %, 100 %) y orden descendente con desempate por identificador en el servidor.
- Área de trazado de 236 px en escritorio y 200 px en móvil (no se escala el SVG completo).
- Objetivos rápidos 50/70/80/90/95 % y control de rango de 1 % a 100 % con paso de 1; valor
  inicial 80 %. Todos se refieren al porcentaje de **unidades**, no de productos.
- El mínimo número de productos se calcula con los **productos exactos**: la API publica ahora
  `concentracion.exacto` (una fila por producto: identificador, unidades, categoría y
  departamento) y el navegador recorre esa lista tomando el primer producto cuyo acumulado
  alcanza el objetivo, sin interpolar y sin peticiones al mover el control. Del mismo payload
  salen la tabla del grupo y su paginación.
- El texto se calcula: «Para alcanzar al menos el 80 % de las unidades se necesitan 1 039
  productos, equivalentes al 34,1 % del universo.» El porcentaje alcanzado puede superar al
  objetivo porque las unidades son enteras.
- Estados: total cero con controles deshabilitados y explicación, un solo producto, recálculo
  al cambiar de filtros, y carga/error explícitos sin mezclar valores anteriores.
- Tabla «Ver productos que forman este grupo» con posición, artículo, categoría/departamento,
  unidades, participación y acumulada, 12 filas por página. El detalle artículo × tienda exige
  una **tienda explícita**: con varias tiendas en el contexto el bloque lo pide en lugar de
  inventar una. No se usan etiquetas de rentabilidad ni de prioridad de compra.

### 5. Meses parciales

La cuadrícula mensual ya marcaba los meses incompletos y ahora se verifica: enero de 2011 (88 k
con 3 días observados de 31) y mayo de 2016 (995 k con 22 de 31) aparecen con trama discontinua
y el estado «mes incompleto (parcial)»; el texto accesible de cada celda incluye días observados,
días del mes y el motivo. No se extrapola ni se convierte la ausencia en cero, y ninguna caída
se describe como pérdida de ventas.

### 6. Duplicaciones eliminadas

- **Resultados**: contexto y modelo, fechas del horizonte, total y promedio, gráfica, desglose y
  descarga, y un **resumen breve de evaluación** con enlace a «Evaluación». Ya no repite la
  comparación por horizonte, la matriz de error, la comparación extensa por segmento ni la
  metodología con importancias.
- **Evaluación**: una comparación principal (consolidado), gráfica histórica, matriz por
  horizonte, comparación por segmento y tabla exacta desplegable.
- **Modelado**: flujo compacto, baseline como rama de comparación, manifiesto de variantes
  reales, protocolo con evidencia y detalle técnico desplegable.
- **Proyecto**: resumen breve con accesos al proceso y al pronóstico; los detalles viven en sus
  pantallas.

### 7. Verificación de este incremento

| Prueba | Alcance | Resultado |
|---|---|---|
| `tools/verificar-incremento.mjs` (nuevo) | grano y valor de Proyecto contra la API, ámbito y mediana en Datos, formato de millones del eje, resumen por nivel activo, colapsar/expandir sin peticiones ni cambios de escala, orden global en lista plana y restauración de expansiones, umbrales exactos (80/90/100 %) contra los productos exactos, tabla del grupo, total cero, meses parciales, contexto entre Resultados y Evaluación, móvil 390 px y teclado | **0 fallos** |
| `tools/verificar-resultados.mjs` | A–I del incremento anterior, incluido el error de nivel producto sin tienda ni artículo | **0 fallos** |
| `tools/verificar-pantallas.mjs` | seis pantallas, rutas, historial, direcciones antiguas, CSV, móvil | **0 fallos** |
| `tools/verificar-exploracion.mjs`, `verificar-modelo.mjs`, `verificar-atlas-comercial.mjs`, `verificar-territorio.mjs`, `verificar-drilldown.mjs`, `verificar-ficha.mjs` | panorama, A/B, pronóstico, evaluación, ficha | **0 fallos** |
| `npx tsc --noEmit` + `npm run build` | tipos y bundle | sin errores |
| `pytest` (suite del backend) | 298 casos | **298 passed** |

Sin peticiones por hover (el detalle A/B y la concentración trabajan con datos ya cargados),
sin errores de consola, sin desbordes a 390 px y sin regresión del error de nivel producto.

### 8. Capturas

`evidencias/comercial/inc-ab-colapsada.png`, `inc-ab-expandida.png`,
`inc-concentracion-80.png`, `inc-concentracion-90.png`, `inc-concentracion-detalle.png`,
`inc-concentracion-cero.png`, `inc-proyecto.png`, `inc-datos.png`,
`inc-evaluacion-segmentos.png`, `inc-meses-parciales.png`, `inc-movil-ab.png` e
`inc-movil-concentracion.png`. Las de la ficha del portafolio se actualizaron con
`atlas-comercial-ab.png` y `atlas-comercial-concentracion.png`.

### 9. Límites que este incremento no cambia

- El pronóstico sigue anclado al último día del conjunto (2016-05-22): no hay ingesta
  incremental.
- Dos cortes finales no permiten afirmar significancia ni superioridad universal.
- Los granos de detalle y agregado no son comparables; el agregado empeora en Texas y Hogar.
- No hay intervalos de predicción ni WRMSSE.
- La concentración mide unidades vendidas, no rentabilidad ni prioridad de compra.
- Los cortes de desarrollo comparten dos orígenes con el entrenamiento de la ejecución
  publicada; se declara y no se usa como reporte independiente.

## Plan de ventas a cuatro semanas (incremento comercial)

### Qué se agregó

La pantalla «Resultados» deja de ser una curva agregada y pasa a ser un **plan de ventas por
artículo × tienda** con el recorrido completo: elegir tienda y departamento, ordenar por
volumen previsto o por cambio, abrir un artículo, revisar sus cuatro semanas y su desempeño
histórico, y descargar el plan filtrado.

| Qué | Dónde |
|---|---|
| Pantalla | `?ac_pantalla=resultados` (misma ruta; ahora con el plan como elemento principal) |
| Derivado | `scripts/derivar_planificacion.py` → `m5_planificacion` (30 490 docs) y `m5_evaluacion_series` (60 980 docs) |
| Endpoints | `/planificacion`, `/planificacion/serie`, `/planificacion/exportar`, `/evaluacion-horizonte` |
| Componentes | `src/etiquetas.ts` (etiquetas comerciales), `src/ui/Planificacion.tsx`, `src/ui/planificacion.css` |
| Prueba de aceptación | `tools/verificar-planificacion.mjs` |
| CSV de ejemplo | `evidencias/comercial/plan-ejemplo.csv` |

### De dónde salen los números

El derivado se generó **sin reentrenar y sin reimportar**: carga el artefacto LightGBM de la
ejecución publicada (`run-calendario-749b5ca3a8`) y la matriz de ventas ya importada, y
escribe dos colecciones con `_id` determinista (versión · ejecución · origen · tienda ·
artículo), de modo que volver a ejecutarlo deja el mismo estado.

- **Planificación**: usa las **predicciones publicadas** de la revisión vigente, con la serie
  canónica en decimales, para que el total, las semanas, el resumen y el CSV reconstruyan
  exactamente las series que sirve `/pronosticos`. Lo observado en los 28 días anteriores se
  calcula desde la matriz de ventas.
- **Evaluación a 28 días**: usa el artefacto y **no** las predicciones publicadas (que solo
  existen para el corte de planificación). Se comprobó que el artefacto reproduce las métricas
  publicadas exactamente (d_1885: MAE 1,0625 · WAPE 76,6325; d_1913: MAE 1,0775 · WAPE
  74,6794).

**Precisión numérica: política `decimal-v1`.** La publicación guarda la serie canónica en
decimales y el redondeo se aplica **solo al presentar**. Tabla, semanas, resumen, gráfico, CSV y
evaluación suman los mismos valores; el plan suma la serie publicada y las cuatro semanas suman
**exactamente** el total mostrado (0 diferencias en 30 490 series). La publicación anterior
(`enteros-por-dia`) redondeaba cada día antes de agregar y su total era 1 289 637 unidades frente
a las 1 335 219 del artefacto (−45 582 u, −3,4 %): esa diferencia está corregida y la revisión
antigua sigue guardada para poder volver a ella.

### Recorrido y reglas de la pantalla

- **A · Contexto**: tienda, categoría, departamento, búsqueda por código o etiqueta, corte y
  horizonte. Sin tienda se muestra el plan de **todas las tiendas** con su columna; nunca se
  elige una tienda en silencio. Si se llega desde otra pantalla con tienda y departamento, se
  heredan.
- **B · Resumen**: unidades previstas, observadas en los 28 días anteriores, diferencia y
  variación, y número de series; todos son totales del **conjunto filtrado**, no de la página.
- **C · Tabla**: una fila por artículo × tienda con observado, previsto, diferencia, variación,
  las cuatro semanas (días 1–7, 8–14, 15–21, 22–28, con sus fechas en el encabezado) y el
  estado de desempeño. Ordenación en el servidor sobre el conjunto completo con desempate por
  tienda y artículo; paginación de servidor (25 por página).
- **D · Detalle**: histórico reciente y pronóstico diario en la misma gráfica con el corte
  marcado, baseline opcional, cuatro totales semanales, total observado y pronosticado, y la
  evaluación a 28 días de **esa misma serie** con sus cortes.
- **E · Descarga** del plan filtrado (todas las filas, no la página) y enlace a la evaluación.

Órdenes: mayor volumen previsto, mayor aumento/disminución absoluta, mayor aumento/disminución
porcentual y mayor volumen observado. En los porcentuales, las series con base histórica cero no
admiten variación: quedan fuera del orden y se explica cuántas son y dónde siguen disponibles
(no se ocultan ni se convierten en infinito).

### Evaluación al horizonte de 28 días

Se añadió el grano que faltaba, sin confundirlo con los otros dos:

| Grano | Cálculo | Dónde |
|---|---|---|
| Diario por serie | error día a día | bloque diario de «Evaluación» |
| **Horizonte por serie** | `observado_28 = Σ observado(1..28)`, `pronostico_28 = Σ pronóstico(1..28)`, `error_28 = pronostico_28 − observado_28` | bloque «Evaluación al horizonte de 28 días» |
| Total agregado | suma de todas las series por día | bloque de ventanas |

Consolidado (2 cortes finales, 60 980 registros serie × corte): **MAE_28 = 12,11 · WAPE_28 =
30,57 %** frente a baseline **14,08 · 35,54 %** (**mejora 13,97 %**; sesgo 2,66 unidades por
serie-horizonte). Por corte: d_1885 WAPE_28 31,58 % y d_1913 29,60 %. Estado descriptivo por
serie: 11 255 con menor error, 4 981 con mayor error, 14 254 mixtas, 0 empates y 0 sin
evaluación. Cobertura honesta: 30 490 de 30 490 series (100 %) con 2 cortes.

Los grupos descriptivos se definen **solo con información anterior al corte** (8 semanas
previas): volumen previo y días en cero previos. No se usan ventas del horizonte evaluado. No
hay semáforos «confiable/no confiable»: se publican los cinco estados descriptivos con el número
de cortes que los sustenta, y «menor error» no es aprobación operativa.

### Lenguaje comercial

`src/etiquetas.ts` centraliza las etiquetas: `CA_1 → California · Tienda 1`,
`FOODS → Alimentos`, `FOODS_1 → Alimentos · Departamento 1`, `FOODS_3_090 → Artículo
FOODS_3_090` y `d_1913 → 24 de abril de 2016`. Los códigos originales se conservan en la tabla
(como línea secundaria), en la búsqueda, en el CSV y en el bloque de trazabilidad desplegable,
que es donde viven la ejecución y el orden aplicado.

### Ventas previstas no son órdenes de compra

La pantalla y el CSV lo advierten: las cifras estiman unidades vendidas y para abastecer harían
falta inventario utilizable, entradas confirmadas y sus fechas, compromisos, plazos de entrega,
múltiplos y mínimos, nivel de servicio, y capacidad o caducidad cuando aplique. No se añadió
columna «comprar» ni simulador, y ninguno de esos campos se rellena con valores inventados.

### Protocolo real de la versión publicada

- **Frontera de información (acreditada)**: el entrenamiento de la ejecución publicada usa
  orígenes hasta d_1857 y los cortes finales son d_1885 y d_1913, posteriores a todo
  entrenamiento. Esa separación se puede verificar con los registros.
- **Selección**: se hizo con los cortes de desarrollo de las variantes (d_1773, d_1801,
  d_1829, d_1857, registrados en `m5_evaluacion_modelos` para `run-calendario-10e4d28701`,
  `run-precios-9cdc693291` y `run-baseline-4b34ca8abc`).
- **Matiz que se declara**: la ejecución se marca «recomendada» después de evaluarse en los
  cortes finales, es decir, esos cortes **se vieron antes de publicar**. Por tanto no son una
  prueba independiente no contaminada: son la confirmación de publicación. La interfaz no
  presenta los cortes finales como holdout virgen ni cambia su nombre según convenga.
- **Variables**: la ejecución publicada usa 50 variables y **ninguna de precio**; la variante
  con precios (59 variables) se evaluó, no superó a la de calendario y no se publica.

### Medición del incremento

Latencia medida en esta máquina con la API local (consulta a consulta, sin concurrencia):

| Consulta | Frío | Con caché | Tamaño |
|---|---|---|---|
| `/planificacion` (25 filas, 1 tienda + 1 categoría) | 569 ms | 4,9 ms | 11,9 KB |
| `/planificacion` (25 filas, todas las tiendas) | 4,5 ms | 9,5 ms | 12,1 KB |
| `/planificacion/exportar` (1 437 filas) | 73 ms | — | 564 KB |
| `/planificacion/serie` | 47,6 ms | 4,3 ms | 8,5 KB |
| `/evaluacion-horizonte` (global) | 4,3 ms | 4,4 ms | 8,7 KB |

La generación del derivado completo (30 490 series de planificación + 60 980 registros de
evaluación) tarda **57–69 s** y se ejecuta una vez por versión y ejecución. El recorrido de
aceptación automatizado (abrir, filtrar, ordenar, abrir artículo, volver, descargar, recargar,
Atrás/Adelante, móvil) tarda **52,4 s** en el navegador headless; es tiempo de prueba
automatizada, no un ahorro de productividad de usuarios reales.

### Pruebas de aceptación

`tools/verificar-planificacion.mjs` ejecuta el recorrido del encargo y comprueba, contra la API
y el CSV, todas las verificaciones pedidas: semanas que suman el total (30 490 series sin
diferencias), totales del filtro que reconcilian con el detalle, paginación que no altera
totales, orden aplicado al conjunto completo, el mismo artículo en dos tiendas como dos series,
MAE_28 calculado tras sumar el horizonte, denominadores cero tratados, ausencia de evaluación
que no se convierte en buen desempeño, fechas sin desplazamiento de zona horaria, escritorio y
390 px sin desbordamiento, teclado, estados de carga/error/vacío con reintento y sin peticiones
por hover ni por fila.

Resultado: **0 fallos**. El resto de la verificación sigue en verde (`verificar-pantallas`,
`verificar-resultados`, `verificar-incremento`, `verificar-exploracion`, `verificar-modelo`,
`verificar-atlas-comercial`, `verificar-territorio`, `verificar-drilldown`, `verificar-ficha`),
con `npx tsc --noEmit`, `npm run build` y **305 pruebas del backend**, más el verificador nuevo
`tools/verificar-correcciones.mjs` para los cuatro grupos A–D de este incremento.

### Límites de este incremento

- El pronóstico sigue anclado al último día del conjunto (2016-05-22): no hay ingesta
  incremental ni planificación sobre ventas actuales.
- La evaluación a 28 días existe para los **dos cortes finales** de la ejecución publicada; no
  se derivaron los de desarrollo porque la selección ya está documentada y no se reentrena.
- Los grupos de volumen e intermitencia son descriptivos: no hay umbrales aprobados por negocio.
- El plan no calcula abastecimiento ni recomienda compras.
- La comparación con los 28 días anteriores es descriptiva y no una medida de mejora del modelo.

## Etiquetas comerciales transversales y plan en dos vistas

Incremento de corrección sobre la entrega anterior: el sistema de etiquetas existía
(`src/etiquetas.ts`) pero solo se aplicaba en el plan. Se revisó **cada superficie** y se
corrigieron los puntos donde el código seguía siendo el texto principal.

### Sistema único de etiquetas

| Código | Presentación principal | Dónde |
|---|---|---|
| `CA_1` | California · Tienda 1 | filtros, cabeceras, tooltips, nombres accesibles, CSV |
| `CA` | California | encabezado de grupos por estado |
| `FOODS` | Alimentos | filtros, encabezados de categoría |
| `FOODS_1` | Alimentos · Departamento 1 (nombre completo) / «Departamento 1» dentro de su grupo | composición, tabla del plan |
| `HOBBIES_2` | Aficiones · Departamento 2 | igual |
| `FOODS_3_090` | Artículo 090 + contexto «Alimentos · Departamento 3»; «Artículo FOODS_3_090» donde el nombre corto sería ambiguo | plan, concentración, detalle |
| `d_1885` | 27 mar 2016 (fecha real del calendario) | evaluación, ventanas, matriz, selector de corte |
| ejecución / versión | bloque de trazabilidad desplegable | plan, modelado, proyecto |

Los códigos originales se conservan como línea secundaria en tablas, en la búsqueda, en el CSV y
en los detalles técnicos. **No se modificó ninguna clave, ruta ni parámetro de API**: el
etiquetado es solo de presentación.

### Componentes revisados y corregidos

`Multiples` (títulos y nombres accesibles de los pequeños múltiplos), `Estacionalidad` (grupos
por estado, tienda y categoría; texto accesible), `Composicion` (categoría y tooltip de tienda),
`Concentracion` (artículo y contexto en la tabla del grupo), `DetalleArticulo` (cabecera y
buscador), `Pronostico`/`PanelEvaluacion` (etiqueta del corte), `PantallaEvaluacion`
(selector, tablas, corte histórico), `EvaluacionVentanas`, `MatrizDesempeno` y `Planificacion`
(cabecera, tabla, detalle, trazabilidad). La barra de contexto (`BarraContexto`) ya usaba las
etiquetas y ahora también aloja la búsqueda de artículo.

### Resultados: una sola barra de filtros y dos vistas

- Se **eliminaron los filtros duplicados**: estado, tienda, categoría, departamento y búsqueda
  viven en la barra de contexto compartida, que es la única fuente de verdad. Debajo quedan solo
  los controles de la tabla: orden, volumen histórico mínimo y vista.
- La cabecera muestra **modelo, corte, horizonte y tienda**; la versión de datos y la ejecución
  pasan al bloque de trazabilidad.
- La tabla prioriza **Artículo | Previsto 28 d | Semana 1–4** (plan semanal) o **Artículo |
  Observado 28 d | Previsto | Diferencia | Variación** (comparación histórica). Ambas vistas
  comparten filtros, orden, paginación y selección, y no cambian cálculos, universo ni descarga.
- Con una sola tienda, su nombre va en el encabezado y no se repite por fila; con varias, la
  columna «Tienda» aparece.
- Una sola acción de descarga, junto a la tabla.

### Precisión: una sola política y una revisión identificable

**Causa del defecto.** `scripts/entrenar_m5.py::_publicar_predicciones` aplicaba
`np.round(candidato)` a la predicción completa antes de `agregar_por_dimension` y guardaba
`[int(round(v)) for v in valores]` por día, mientras la evaluación medía el artefacto sin
redondear. Resultado: el total publicado era 1 289 637 u y la cifra evaluada 1 335 219 u
(−45 582 u, −3,4 %), y la diferencia se propagaba a tabla, gráfico, CSV y métricas.

**Política definitiva (`decimal-v1`).**

1. Una sola serie canónica **en decimales** por artículo × tienda × día; las semanas son
   `candidato.reshape(n, 4, 7).sum(axis=2)` sobre esas cifras, no sobre enteros.
2. Los agregados (total, estado, tienda, categoría, departamento) se obtienen **sumando la serie
   decimal**, nunca sumando cifras ya redondeadas.
3. El redondeo se aplica **solo al presentar**: la interfaz decide decimales visibles y el CSV
   exporta con cuatro decimales para que la suma de sus filas reconcile con el total publicado.
4. La evaluación histórica y el pronóstico publicado usan **la misma función de postproceso**;
   lo observado se conserva en unidades enteras de la fuente y la predicción no se recorta al
   publicar.
5. Los totales no se fuerzan a coincidir: si dos vistas no reconciliaran, se declara la
   diferencia en lugar de ajustar una cifra.

**Revisión publicada.** `rev-ec9b21cd45` (`politica: decimal-v1`, total del horizonte
1 335 219,04 u, 843 482 valores fraccionarios, 30 490 series, cortes d_1885 y d_1913). Se creó con
`python -m scripts.republicar_precision`, que **no reentrena ni reimporta**: carga el artefacto y
la matriz ya importada, valida antes de activar (semanas = horizonte, agregado = suma de las
series con tolerancia 1e-6, existencia de valores fraccionarios) y no sobrescribe en silencio.

**Revisión anterior recuperable.** `rev-enteros-legado` (`politica: enteros-por-dia`, 1 289 637 u)
se registró con `python -m scripts.marcar_publicacion_legado` y queda enlazada como `anterior` de
la revisión activa. Procedimiento de vuelta atrás:

```bash
cd backend
python -m scripts.republicar_precision --listar                 # revisa qué hay publicado
python -m scripts.republicar_precision --activar rev-enteros-legado
python -m scripts.republicar_precision --activar rev-ec9b21cd45  # volver a la decimal
```

**Antes y después (medido en la base, no estimado).**

| Concepto | `rev-enteros-legado` | `rev-ec9b21cd45` |
| --- | --- | --- |
| Total del horizonte | 1 289 637 u | 1 335 219,04 u |
| Diferencia con el artefacto | −45 582 u (−3,4 %) | 0 (tolerancia 1e-6) |
| Semanas vs. total | cuadraban por redondeo previo | cuadran por suma decimal |
| Reconciliación agregado = Σ detalle | toleraba 0,51 u/día | 0,000000 |
| MAE_28 d_1913 (CA_1 · FOODS) | 17,85 | 17,85 (misma medición canónica) |

**Verificación automatizada.** `tools/verificar-correcciones.mjs` comprueba en la aplicación
servida: revisión y política declaradas, total recalculado contra `/pronosticos` (y distinto de la
suma de días redondeados), semanas = total en el detalle, misma revisión en plan/detalle/
evaluación, CSV con decimales que reconcilia, contadores de tiendas del contexto, los dos cortes
finales en los cinco niveles con historia y observado posterior, y las etiquetas y afirmaciones de
las pantallas. En el backend, `tests/test_precision_publicacion.py` reproduce el defecto: dos
revisiones convivendo duplican el detalle si no se filtra, la tolerancia decimal detecta el
redondeo por día y la clave del agregado traduce `FOODS_1` → `FOODS|FOODS_1`.

### Pruebas

`tools/verificar-planificacion.mjs` se actualizó al nuevo layout (filtros compartidos, dos
vistas) y cubre las comprobaciones A–F del encargo: tiendas y departamentos legibles, corte con
fecha, una sola barra de filtros, cambio de vista sin perder contexto, CSV con identificadores y
etiquetas. El resto de la batería sigue en verde, con `npx tsc --noEmit`, `npm run build` y las
321 pruebas del backend.

Capturas: `evidencias/comercial/plan-tabla.png` (plan semanal),
`plan-comparacion-historica.png`, `plan-detalle.png`, `plan-evaluacion-28.png`,
`plan-resumen.png` y `plan-tabla-movil.png`.

## Corrección de coherencia numérica y semántica

Este incremento no cambia datos ni entrena nada: corrige **cómo se calcula, se presenta y se
interpreta** lo que ya está publicado en `rev-ec9b21cd45`.

### Defecto → causa comprobada → corrección → evidencia

| # | Defecto visible | Causa comprobada | Corrección | Evidencia |
| --- | --- | --- | --- | --- |
| 1 | Semanas 731 + 734 + 728 + 714 = 2 907 frente a un total de 2 908 | Solo formato: la tabla redondeaba a entero cada cifra por separado mientras el total se calculaba con la serie canónica. No había error de agregación: la suma canónica coincide con el total en las 30 490 series (`1e-6`) | Dos decimales en semanas y total, con el valor canónico expuesto en `data-cifra` y en la precisión ampliada del detalle; nota explícita de redondeo; se elimina la promesa de que «las cuatro semanas coinciden con el total mostrado» | `tools/verificar-coherencia.mjs` compara las tres filas citadas (canónico, formato y tolerancia ±0,025 u) y el CSV completo |
| 2 | MAE agregado diario 1 894,23 → 3 050,23; WAPE 4,39 % → 7,07 %; mejora 45,90 % → 12,88 % | **100 % política de precisión.** En la publicación anterior el agregado se construía sumando las predicciones **redondeadas por serie y día**: 1 246 832 u en `d_1885` y 1 234 881 u en `d_1913`, es decir −3,72 % y −3,73 % respecto de la suma canónica (1 295 061,33 y 1 282 668,72). Ese sesgo a la baja acercaba el agregado al observado y «mejoraba» el error. No hubo duplicados (0 claves repetidas), ni cambio de filtros, ni error de agregación: el agregado canónico es exactamente la suma del detalle | El agregado se calcula con la serie decimal; se documenta la causa y se recalcula toda la evaluación | `scripts/auditar_evaluacion.py` + `evidencias/comercial/auditoria-evaluacion.json` + `verificar-coherencia.mjs` (sección 3) |
| 3 | «−23,71 % menos error» en el primer corte | El texto se componía concatenando el porcentaje con signo y la frase «menos error» | `src/metricas.ts::interpretarMejora` centraliza la regla: positivo → «% menos error», negativo → «% más error» con magnitud positiva, empate bajo 0,05 % → «mismo error», baseline en cero → «no calculable» sin infinito | `verificar-metricas.mjs` (cuatro casos) y `tests/test_metricas_evaluacion.py` |
| 4 | Sesgo de 2,66 sin unidad correcta | Se etiquetaba como unidades por serie-día un valor que es la media de los errores del horizonte completo | Tres unidades declaradas y usadas: diario (`u/serie-día`), horizonte (`u/serie-horizonte de 28 días`) y agregado (`u/día del segmento`); la ayuda pasa a `<details>` con la definición esencial visible | `verificar-coherencia.mjs` sección 4 |
| 5 | «precios semanales conocidos» y «precios vigentes» en Modelado, con la misma pantalla declarando que no usa precios | Texto estático en las tarjetas de pasos y en el método de Proyecto | Tarjetas derivadas de `variables` del manifiesto; se distingue dato disponible en el proyecto, variable del modelo publicado y variable de la variante con precios | `verificar-coherencia.mjs` sección 6 |
| 6 | Protocolo contradictorio entre pantallas | Tres redacciones distintas, dos de ellas afirmando que los cortes finales «solo se reportan» | Un componente único `ProtocoloEvaluacion` usado en Modelado, Evaluación y Proyecto; declara frontera temporal, cortes de comparación, criterio de selección, resultados consultados, que **no hay holdout intacto** y por qué aparece «0 cortes de desarrollo» | `verificar-coherencia.mjs` sección 6 (compara el texto entre pantallas) |
| 7 | «Categoría · 3 series» con una sola curva | Se anunciaba el número de series del nivel mientras la gráfica dibuja la suma | Título dinámico «Total de N series del nivel X · una sola línea agregada (suma por fecha)» y leyenda que separa líneas dibujadas de series sumadas | `verificar-coherencia.mjs` sección 5 |
| 8 | Tablas inferiores con códigos | Faltaban etiquetas legibles en los segmentos de estado y categoría | California/Texas/Wisconsin y Alimentos/Aficiones/Hogar con el código como línea secundaria; encabezados de corte con fecha legible y `d_N` en trazabilidad | `verificar-coherencia.mjs` sección 5 |

### Recálculo independiente de la evaluación

`backend/scripts/auditar_evaluacion.py` vuelve a predecir con el artefacto publicado (sin
reentrenar), reconstruye el observado desde la matriz de ventas y calcula, para cada corte final:

- **A. Detalle diario**: MAE, WAPE y sesgo por serie × día.
- **B. Horizonte de 28 días**: suma de los 28 días por serie y después la métrica.
- **C. Agregado diario**: suma de las series del segmento por fecha y después la métrica, en
  total, estado, tienda, categoría y departamento.
- **D. Consolidación**: suma de numeradores y denominadores entre cortes.

Resultado (`auditoria-evaluacion.json`): todas las cifras publicadas coinciden con el recálculo
dentro de 5·10⁻⁵ (las métricas guardadas se publican con cuatro decimales). Los cinco niveles
reconcilian con la suma por serie; no hay claves duplicadas en ninguna colección de la revisión.

| Grano | Cifra | `d_1885` | `d_1913` | Consolidado |
| --- | --- | --- | --- | --- |
| Detalle diario | MAE cand. / base | 1,062459 / 1,232355 | 1,077488 / 1,243972 | 1,0700 / 1,2382 |
| Detalle diario | sesgo cand. (u/serie-día) | +0,130529 | +0,059627 | +0,0951 |
| Horizonte 28 d | MAE cand. / base | 12,2606 / 14,3771 | 11,9589 / 13,7750 | 12,1097 / 14,0760 |
| Horizonte 28 d | sesgo cand. (u/serie-horizonte) | +3,6548 | +1,6696 | +2,6622 |
| Agregado diario | MAE cand. / base | 3 997,3064 / 3 231,1429 | 2 103,1614 / 3 770,8571 | 3 050,2339 / 3 501,0000 |
| Agregado diario | sesgo cand. (u/día del segmento) | +3 979,8333 | +1 818,0259 | +2 898,9296 |

**Qué tablas cambiaron y cuáles no.** Cambiaron las del grano «total del segmento» (por ventana y
consolidada) y con ellas la conclusión agregada: el primer corte empeora. **Permanecen iguales**
las de detalle (1,07 vs 1,24; 13,58 % menos error) y las de estado y categoría, verificadas contra
el recálculo: California 1 121,81/1 124,30 (0,22 % menos error), Texas 1 143,09/1 006,63 (13,56 %
más error), Wisconsin 1 094,93/1 676,07 (34,67 % menos error), Alimentos 2 225,30/2 697,82 (17,52 %
menos), Aficiones 275,11/341,75 (19,50 % menos) y Hogar 798,86/781,57 (2,21 % más). No estaban
desactualizadas: coinciden con la revisión activa al dígito.

### Política de presentación y tolerancias

- **Canónico**: la serie publicada conserva todos los decimales; los agregados la suman.
- **Pantalla**: dos decimales. La suma de las cifras redondeadas de una fila puede diferir del
  total en hasta **±0,025 u** (5 cifras × 0,5 × 10⁻²); la igualdad exacta existe entre valores
  canónicos. Se muestra el valor canónico con seis decimales en «Precisión ampliada».
- **CSV**: cuatro decimales por valor. La suma de una columna con `n` filas difiere del total
  canónico en, como máximo, `n × 0,5 × 10⁻⁴`: **±0,1525 u** para las 3 049 series de una tienda y
  **±1,5245 u** para el filtro completo de 30 490. Medido: 144 665,1764 frente a 144 665,1767
  (±0,0003 u). El archivo declara la tolerancia y la diferencia observada; no afirma igualdad
  exacta.

### Pruebas de esta corrección

- `tools/verificar-coherencia.mjs`: las tres filas semanales, CSV completo, recálculo de métricas de
  ambos cortes en los cinco niveles, revisión y política en cada bloque, claves únicas, mejora
  positiva/negativa, unidades del sesgo, variables del modelo, protocolo entre pantallas, títulos
  de gráficas, etiquetas, 390 px y teclado.
- `tools/verificar-metricas.mjs`: regla de mejora (positiva, negativa, empate, baseline cero) y
  tolerancias de redondeo/CSV.
- `backend/tests/test_metricas_evaluacion.py`: agregado con vectores de 28 días, consolidación por
  numeradores y denominadores, signo de la mejora, política única y recálculo independiente.
- `backend/scripts/auditar_evaluacion.py`: auditoría reproducible con salida en JSON.

Capturas: `coh-plan-tabla.png`, `coh-plan-movil.png`, `coh-evaluacion-comparacion.png`,
`coh-modelado-protocolo.png`.

## Identidad de departamentos, diferencias pequeñas y auditoría temporal

Este incremento cierra tres pendientes y reorganiza «Evaluación». No reentrena, no sustituye el
modelo publicado y no elimina resultados: todo lo numérico sigue saliendo de `rev-ec9b21cd45`
(política `decimal-v1`).

### 1. Identidad completa de los departamentos

En una tabla que mezcla categorías, «Departamento 1» aparecía tres veces (FOODS_1, HOBBIES_1,
HOUSEHOLD_1). La etiqueta principal pasa a incluir la categoría y el código queda como
información secundaria:

`Alimentos · Departamento 1` · `Alimentos · Departamento 2` · `Alimentos · Departamento 3` ·
`Aficiones · Departamento 1` · `Aficiones · Departamento 2` · `Hogar · Departamento 1` ·
`Hogar · Departamento 2`

La regla vive en `src/etiquetas.ts`: `etiquetaNivel(nivel, clave, { agrupado })` devuelve la
identidad completa y solo usa «Departamento N» cuando la fila ya está bajo un encabezado de
categoría (composición del panorama). Se aplica a la tabla de segmentos, al desglose por clave, a
los títulos de las gráficas y a los selectores y exportaciones, que ya usaban la forma completa.
Abrir «Ver» muestra el detalle de ese mismo departamento (identidad y código) sin tocar la URL ni
los filtros compatibles.

### 2. Igualdad numérica frente a diferencia pequeña

La regla anterior declaraba «Mismo error» con un umbral exclusivamente visual (0,05 %). Ahora hay
dos decisiones separadas, centralizadas en `src/metricas.ts::interpretarDiferencia` (mismo
comportamiento en tablas, tarjetas, tooltips y en el informe de auditoría):

| Caso | Condición | Texto principal |
| --- | --- | --- |
| Igualdad numérica | `\|modelo − baseline\| ≤ max(5·10⁻⁵; 10⁻⁹ · max(\|modelo\|, \|baseline\|))` | «Mismo error dentro de la precisión del cálculo» |
| Diferencia relativa pequeña | no iguales y `\|mejora\| < 0,05 %` (0,0005 en razón) | «Diferencia inferior a 0,05 %», con signo y valor preciso en el detalle accesible |
| Mejora | `mejora ≥ 0,05 %` | «X % menos error que el baseline» |
| Deterioro | `mejora ≤ −0,05 %` | «X % más error que el baseline» (magnitud positiva) |
| Ambos errores cero | — | «ambos errores son cero; la mejora porcentual no está definida» |
| Solo baseline cero | — | diferencia absoluta y «Mejora porcentual no calculable» |

El umbral es **inclusivo** en 0,05 %: el límite exacto ya es diferencia apreciable (se compara con
un margen de 10⁻¹² por la representación en coma flotante de los decimales de entrada). No se
declara equivalencia estadística ni comercial en ningún caso. Los estados históricos por serie
(«Menor error», «Mayor error», «Mixto», «Empate») **no** se reclasifican con este umbral: su regla
es la comparación numérica por corte del derivado (ε = 10⁻⁹ al comparar errores absolutos del
horizonte) y se conserva tal cual.

### 3. Auditoría de separación temporal en desarrollo

`backend/scripts/auditar_separacion_temporal.py` reconstruye, por ejecución y corte, la evidencia
disponible. Comprueba la fecha de las **etiquetas** (origen + horizonte), no solo el origen de cada
fila, y no exige que el experimento se haya ejecutado antes del corte: lo relevante es qué
información entró al modelo.

| Variante · ejecución | Artefacto | Corte | Fechas del horizonte | Orígenes de entrenamiento | Última etiqueta | Uso del corte | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline · run-baseline-4b34ca8abc | regla determinista | d_1773 | 2015-12-07 – 2016-01-03 | — | — | desarrollo (selección) | Separación verificada |
| calendario · run-calendario-10e4d28701 | run-calendario-10e4d28701.txt | d_1773 | 2015-12-07 – 2016-01-03 | d_1541, d_1609, d_1677, d_1745 | d_1773 | desarrollo (selección) | Separación verificada |
| calendario · run-calendario-10e4d28701 | idem | d_1801 | 2016-01-04 – 2016-01-31 | idem | d_1773 | desarrollo | Separación verificada |
| calendario · run-calendario-10e4d28701 | idem | d_1829 | 2016-02-01 – 2016-02-28 | idem | d_1773 | desarrollo | Separación verificada |
| calendario · run-calendario-10e4d28701 | idem | d_1857 | 2016-02-29 – 2016-03-27 | idem | d_1773 | desarrollo | Separación verificada |
| precios · run-precios-9cdc693291 | run-precios-9cdc693291.txt | d_1773 … d_1857 | igual que el anterior | d_1541, d_1609, d_1677, d_1745 | d_1773 | desarrollo | Separación verificada |
| calendario · run-calendario-749b5ca3a8 | run-calendario-749b5ca3a8.txt | d_1885 | 2016-03-28 – 2016-04-24 | d_1621, d_1677, d_1745, d_1829, d_1857 | d_1885 | final (confirmación) | Separación verificada |
| calendario · run-calendario-749b5ca3a8 | idem | d_1913 | 2016-04-25 – 2016-05-22 | idem | d_1885 | final (confirmación) | Separación verificada |

Columnas de la tabla completa (en `evidencias/comercial/auditoria-temporal.md` y en la respuesta
`/auditoria-temporal`): run, artefacto, corte, ventana evaluada, orígenes, última etiqueta, uso del
corte, **early stopping** (no: `num_boost_round` fijo, sin `callbacks` ni `valid_sets`),
**selección de hiperparámetros** (no: parámetros fijos), transformaciones (ventanas causales
`t ≤ origen`; precio del horizonte supuesto solo en la variante con precios) y la fuente de cada
campo.

**Conclusión por corte.** 14 evaluaciones auditadas, 14 con separación verificada, ninguna
contaminada y ninguna no verificable. El modelo de desarrollo (orígenes ≤ d_1745) puntúa cortes
cuyos objetivos empiezan en d_1774; el artefacto publicado (orígenes ≤ d_1857) puntúa d_1886–d_1913
y d_1914–d_1941. La frontera temporal se cumple, pero eso **no** convierte los cortes finales en un
holdout intacto: se consultaron para confirmar la publicación.

**Procedencia declarada.** Las métricas de desarrollo del manifiesto publicado proceden de la
ejecución `run-calendario-10e4d28701` (misma variante, otro artefacto y otros orígenes), no del
artefacto publicado. Sin ese dato, comparar el WAPE de desarrollo del manifiesto con los cortes
finales induciría a error.

**Límite de la evidencia.** La auditoría acredita la separación temporal de entrenamiento y
evaluación; no acredita independencia respecto de la decisión de publicar. Para una evaluación
independiente habría que reservar cortes no consultados y reentrenar (fuera de este incremento).

### 4. «Evaluación» reordenada

Orden nuevo: **A** contexto y alcance (filtros, cortes, nivel y horizonte, limitación de
independencia visible) → **B** resumen del desempeño (horizonte de 28 días, que responde a los
filtros; comparación global del universo, que no responde) → **C** resultados por segmento (con
identidad completa, orden por MAE o por peor mejora y filtro «solo con más error que el baseline»)
→ **D** comparación visual del corte → **E** metodología desplegable (protocolo, definiciones,
matriz ventana × horizonte, tablas por ventana y auditoría temporal).

El desplegable es `<details>/<summary>` nativo: funciona con teclado, indica su estado y se abre
automáticamente si se llega con `?ac_abrir=metodologia` o con un fragmento que apunte a
`#evaluacion-metodologia`. El botón del bloque A expone `aria-expanded`/`aria-controls`.

### 5. Lenguaje de las gráficas

Título dinámico según el nivel: «Ventas de California · Tienda 3», «Ventas totales de las 10
tiendas seleccionadas», «Ventas de Aficiones · Departamento 1», «Ventas totales de los 7
departamentos seleccionados», «Ventas totales de todas las tiendas del contexto». La leyenda usa
«Ventas observadas antes del corte», «Pronóstico del modelo», «Referencia estacional» y «Ventas
observadas después del corte». El recuento de líneas dibujadas sale del contenido principal y la
definición de la suma vive en la ayuda «Cómo se agrega esta gráfica». El cálculo no cambia.

### 6. Recorrido comercial verificado

`tools/verificar-recorrido-comercial.mjs` ejecuta los doce pasos del encargo y cinco casos límite
(búsqueda sin resultados, serie sin evaluación con respuesta interceptada, cambio rápido de
filtros, error de red recuperable con reintento, 390 px y teclado). Además se guarda la búsqueda del
plan en `ac_texto`, de modo que recargar no la pierda. Registro de pasos:

| Paso | Resultado |
| --- | --- |
| 1 · abrir Resultados sin tienda implícita | correcto |
| 2 · elegir California · Tienda 3 | correcto |
| 3 · buscar FOODS_3_090 por código | correcto |
| 4 · identificar Artículo 090 · Alimentos · Departamento 3 | correcto |
| 5 · cuatro semanas y total previsto | correcto |
| 6 · detalle de la misma serie | correcto |
| 7 · evaluación histórica y número de cortes | correcto |
| 8 · comparación histórica sin perder contexto | correcto |
| 9 · descarga de todas las filas del filtro | correcto |
| 10 · identidad, fechas, revisión y cifras del CSV | correcto |
| 11 · volver a todas las tiendas, mismo artículo por tienda | correcto |
| 12 · atrás, adelante y recarga | correcto |
| 13 · búsqueda sin resultados | correcto |
| 14 · cambio rápido de filtros sin respuestas obsoletas | correcto |
| 15 · serie sin evaluación declarada | correcto |
| 16 · error de red recuperable con reintento | correcto |
| 17 · 390 px y teclado | correcto |

Fricciones observadas durante el recorrido: el selector de tienda se filtra por el estado activo
(elegir una tienda fija su estado), y con una sola tienda la columna «Tienda» desaparece porque el
nombre vive en el encabezado; ambas cosas están declaradas en la interfaz y se documentan aquí para
que una prueba futura no las interprete como fallo.

### 7. Pruebas de este incremento

- `tests/test_auditoria_temporal.py` (9): etiquetas posteriores al corte → contaminación, límite de
  un día, baseline verificado por construcción, evidencia ausente → no verificable.
- `tests/test_metricas_evaluacion.py` (7): igualdad numérica, diferencia pequeña, límite 0,05 %,
  baseline en cero, agregado de 28 días y consolidación por numeradores.
- `tools/verificar-metricas.mjs`: los mismos casos sobre el código de la interfaz.
- `tools/verificar-coherencia.mjs`: siete identidades de departamento, enlace «Ver» al departamento
  correcto sin alterar filtros, orden y filtro de segmentos, auditoría en pantalla, estado «no
  verificable» sin auditoría, accesibilidad del desplegable y orden de bloques.
- `tools/verificar-recorrido-comercial.mjs`: recorrido completo con casos límite.

Capturas: `ev-contexto.png`, `ev-resumen.png`, `ev-segmentos.png`,
`ev-segmentos-departamentos.png`, `ev-grafica.png`, `ev-grafica-departamentos.png`,
`ev-metodologia.png`, `ev-auditoria.png`, `ev-movil.png`, `recorrido-movil.png`.

## Controles locales de «Evaluación»

Los controles de la pantalla vivían en la cabecera general, lejos de la gráfica que modifican, y
sugerían que todo el informe cambiaba con ellos. Ahora cada control está dentro del bloque al que
afecta y declara su alcance.

**Relación control → bloques afectados (verificada en el código y en las peticiones):**

| Control | Fuente única de estado | Bloques que modifica | Petición que dispara |
| --- | --- | --- | --- |
| Nivel / «Agrupar por» | `nivelEvaluacion` (`ac_nivel`) | gráfica del corte; matriz ventana × horizonte; dimensión del desglose (mismo estado) | `/pronosticos?nivel=…`, `/matriz-horizontes?nivel=…` |
| Etapa | `etapa` (`ac_etapa`) | resumen consolidado, desglose por segmento, gráfica (lista de cortes) y matriz | `/evaluacion`, `/evaluacion-ventanas`, `/matriz-horizontes` |
| Corte | `origenPronostico` (`ac_origen`) | **solo** la gráfica del corte; nunca los consolidados | `/pronosticos?origen=…` |

**Dónde está cada control.** La tarjeta «4 · Comparación visual del corte» contiene, en este orden:
título de la sección, barra de controles (nivel, etapa, corte), título comercial del conjunto y
fechas, gráfica, leyenda y ayuda secundaria. La cabecera general ya no tiene controles. La tabla de
segmentos tiene su propio selector de dimensión junto a «Orden del detalle» y «Solo segmentos con
más error», con la etapa activa al lado; la dimensión comparte estado con el nivel de la gráfica y
solo ofrece dimensiones válidas para el desglose (nunca «Total»). El bloque de resumen expone
también la etapa y aclara que consolida los cortes de esa etapa y no el corte individual.

**Cortes dibujables.** La gráfica solo puede dibujar cortes con predicciones por día publicadas;
`/evaluacion-ventanas` publica `origenes_graficables` con esa lista. En la ejecución publicada son
d_1885 y d_1913; los cortes de desarrollo tienen métricas en las tablas pero **no** predicciones por
día, así que al elegir «Desarrollo» la tarjeta muestra un estado explícito de ausencia, sin fechas
de otra etapa y sin peticiones inválidas.

**Selección y navegación.** El corte se conserva mientras siga siendo válido para la etapa elegida;
si deja de serlo se toma el primero publicado de esa etapa. Etapa y corte se guardan en la URL
(`ac_etapa`, `ac_origen`), de modo que recarga e historial recuperan la selección; cambiar un
control local no desplaza la página. La carga se muestra dentro de cada bloque y se corrigió un
bucle de peticiones preexistente: la selección de evaluación se memoiza para que el efecto de carga
no se dispare en cada render.

**Pruebas.** `tools/verificar-controles-evaluacion.mjs` comprueba en el build servido: ubicación y
orden de los controles, cambios de corte y de nivel sin ir a la cabecera, sincronía entre el nivel
de la gráfica y la dimensión del desglose, que el corte no altere los consolidados, ausencia de
cortes dibujables sin peticiones inválidas, conservación del corte al cambiar de etapa, URL,
historial, recarga, scroll, teclado y 390 px. Capturas: `controles-grafica.png`,
`controles-grafica-movil.png`, `controles-tabla.png`.

## Paquete de publicación compacto para la demo (preparado en local, sin Atlas)

Este incremento prepara, mide y valida en local el paquete con el que la demo se podrá alojar en
MongoDB Atlas. **No se ha conectado a Atlas ni se ha cargado nada en remoto**; la base de trabajo
no se ha modificado, no se ha reentrenado ningún modelo, no se han reimportado los CSV originales y
las cifras publicadas son las mismas.

### 1. Qué consume realmente la demo

Inventario por pantalla y acción (`backend/scripts/inventariar_demo.py`, evidencia en
`evidencias/comercial/inventario-demo.json`). Cada fila declara endpoint, colección, grano, rango
temporal e índice que la sostiene:

| Pantalla | Acción | Endpoints | Colecciones | Grano | Rango | Índice que la sostiene |
| --- | --- | --- | --- | --- | --- | --- |
| Proyecto | portada: estado, catálogo, pronóstico, evaluación y modelos | /estado, /catalogo, /pronosticos, /evaluacion, /modelos | m5_estado, m5_importaciones, m5_catalogo, m5_predicciones, m5_evaluacion_modelos, m5_modelos | nivel agregado × ventana | histórico y cortes finales | m5_predicciones (revision, origen_d, dimension) · m5_modelos (version) |
| Datos y calidad | fuentes, estructura, ceros, cobertura de precios y reconciliación | /estado, /catalogo, /comparacion, /intermitencia, /precios/distribucion | m5_importaciones, m5_catalogo, m5_agregados, m5_bloques, m5_precios, m5_precios_manifest | dimensión × día · serie × día · tienda × semana | histórico completo; precios 2011-02-06 – 2016-06-19 | m5_bloques (version, store_id, item_id) · m5_precios (version_precios, store_id, wm_yr_wk) |
| Exploración · Panorama | pulso, A/B, composición, concentración y explorador | /pulso, /comparacion, /estacionalidad, /productos, /historico | m5_agregados, m5_bloques, m5_catalogo, m5_calendario | dimensión × día · serie × día (concentración) | periodo a elección | m5_agregados (version, dimension, clave) · m5_bloques (version, store_id) |
| Exploración · Estacionalidad | perfil semanal y mensual, matriz temporal | /estacionalidad, /matriz-temporal | m5_agregados, m5_calendario | dimensión × día | 2011–2016 | m5_agregados (version, dimension, clave) · m5_calendario (d) |
| Exploración · Precios | distribución, cambios semanales y evolución | /precios/distribucion, /precios/cambios, /precios/evolucion | m5_precios, m5_precios_manifest, m5_calendario, m5_catalogo | tienda × artículo × semana | 282 semanas | m5_precios (version_precios, store_id, wm_yr_wk) |
| Exploración · Detalle de artículo | ventas diarias, precio semanal, intermitencia y calendario | /articulo, /historico, /intermitencia | m5_bloques, m5_precios, m5_calendario, m5_catalogo | serie × día · serie × semana | histórico completo | m5_bloques (version, store_id, item_id) · m5_precios (version_precios, store_id, wm_yr_wk) |
| Modelado | manifiesto, variables, supuestos y protocolo | /modelos, /evaluacion, /evaluacion-ventanas, /auditoria-temporal | m5_modelos, m5_evaluacion_modelos, m5_auditoria_temporal | ejecución × corte | cortes de desarrollo y finales | m5_evaluacion_modelos (run_id, etapa, origen_d) |
| Evaluación | resumen, segmentos, cortes, horizontes, matriz y auditoría | /pronosticos, /evaluacion, /evaluacion-ventanas, /evaluacion-horizonte, /matriz-horizontes, /auditoria-temporal | m5_predicciones, m5_predicciones_series, m5_evaluacion_modelos, m5_evaluacion_series, m5_planificacion, m5_auditoria_temporal | serie × día · serie × corte · dimensión × día | d_1885 y d_1913 (finales), d_1773–d_1857 (desarrollo) | m5_predicciones (revision, origen_d, dimension) · m5_evaluacion_series (revision, origen_d, store_id, item_id) |
| Resultados | plan de 28 días, detalle, evaluación al horizonte y CSV | /planificacion, /planificacion/serie, /planificacion/exportar, /evaluacion-horizonte | m5_planificacion, m5_evaluacion_series, m5_publicacion, m5_predicciones, m5_estado | serie × horizonte | corte 2016-05-22, horizonte 2016-05-23 – 2016-06-19 | m5_planificacion (revision, store_id, item_id) y (revision, pronostico_28) |
| Navegación y estados vacíos | URL, recarga, búsqueda sin resultados, filtros imposibles | los anteriores con parámetros límite | las mismas (se aceptan respuestas vacías y 422 declarados) | — | — | los mismos |

Del inventario salen los hechos que gobiernan el diseño: `m5_bloques` (304 900 documentos) es la
colección grande y la única que la concentración agrega en el servidor; `m5_precios` era la segunda
(240,95 MB para 2 820 documentos, porque cada semana repite la lista de artículos y sus `float`);
`m5_predicciones_series`, `m5_evaluacion_series` y `m5_planificacion` guardan la revisión publicada
**y** una copia anterior sin campo `revision`, que ninguna pantalla necesita.

### 2. Contrato que la demo conserva

| Elemento | Valor publicado | Comprobado por |
| --- | --- | --- |
| Tiendas / estados / categorías / departamentos | 10 / 3 / 3 / 7 | validación del paquete |
| Artículos | 3 049 | `m5_catalogo` = 3 072 documentos (catálogo completo) |
| Series artículo × tienda | 30 490 | `m5_planificacion`, `m5_predicciones_series` |
| Bloques de venta | 304 900 | `m5_bloques` |
| Unidades totales | 66 927 173 | bloques = agregados = manifiesto |
| Revisión activa y política | `rev-ec9b21cd45` · `decimal-v1` | manifiesto, `m5_publicacion`, API |
| Total del horizonte | 1 335 219,04 | Σ`pronostico_28` en el plan |
| Semanas del plan | 4 | Σsemanas = pronóstico, desvío máximo 4,5·10⁻¹³ |
| Cortes finales | d_1885 y d_1913 | `m5_evaluacion_series` (60 980 = 30 490 × 2) |
| Etiquetas, filtros y búsqueda | California · Tienda 1, Alimentos · Departamento 1, Artículo 090 | catálogo y API |
| CSV completo del plan | 30 490 filas | exportación byte a byte |

Las funciones caras se mantienen, no se recortan: la concentración sigue calculándose en el servidor
sobre el arreglo `unidades` (≈ 1,5 s por consulta), la intermitencia recorre las series de una tienda
(≈ 3,6 s), la auditoría temporal reconstruye 14 evaluaciones y la exportación entrega las 30 490
filas con tolerancia declarada (1,5245 u). Lo que se reduce es almacenamiento, no cobertura.

### 3. Reducción por diseño

1. **Solo la publicación activa.** El paquete copia los documentos de `rev-ec9b21cd45`: la copia
   anterior (sin campo `revision`) se queda fuera. Efecto medido: `m5_evaluacion_series`
   121 960 → 60 980, `m5_planificacion` 60 980 → 30 490, `m5_predicciones_series` 60 980 → 30 490,
   `m5_predicciones` 744 → 372, `m5_publicacion` 2 → 1.
2. **Catálogo separado de las series.** Los precios dejan de repetir la lista de artículos en cada
   semana: un documento por tienda en `m5_precios_catalogo` (3 049 identificadores ordenados) y, por
   semana, `centavos` como `Binary` `int32` alineado al catálogo, con `0` = sin precio.
   `m5_precios` pasa de 240,95 MB a 33,4 MB de BSON y de 99,84 MB a 8,24 MB de almacenamiento
   (−91,7 %). Un lector compatible (`app/comercial/precios_almacen.py`) sirve los dos esquemas, de
   modo que el mismo código de API funciona contra la base local y contra la base de la demo.
3. **Bloques temporales compactos: se reutilizan.** `m5_bloques` ya guarda 196 días por documento en
   un arreglo de enteros (≈ 9 B por valor) y la concentración agrega en el servidor sobre ese
   arreglo. Se conserva tal cual. La alternativa medida —`Binary` `int32`, ≈ 4 B por valor, ≈ 35 %
   menos de esta colección— obligaría a traer los bloques al cliente y se documenta como no aplicada.
4. **Agregados y evaluaciones que se pueden recalcular.** Se copian tal cual: son la fuente de las
   métricas publicadas y su recálculo costaría minutos por consulta.
5. **Precios y calidad.** Los precios se reescriben (punto 2) y `m5_precios_manifest` conserva el
   manifiesto y la cobertura declarada.
6. **Exclusiones explícitas.** Fuera del paquete: matrices de entrenamiento, artefactos LightGBM
   (`artefacto` se sustituye por `artefacto_nombre`), CSV originales, registros y carpetas locales
   (`carpeta_origen`), predicciones de revisiones anteriores y cualquier ruta del equipo. La
   validación comprueba que no quedan rutas locales ni credenciales.

### 4. Precisión

- La revisión sigue siendo `decimal-v1`: la serie canónica conserva decimales, el redondeo se aplica
  solo al presentar y los agregados suman la serie decimal.
- Los precios caben exactos en centavos enteros (el archivo trae dos decimales) y el precio de venta
  es siempre positivo, así que `0` no puede confundirse con un precio real. Se validó con
  `round(precio × 100)` sobre 6 841 121 pares con precio; las pruebas cubren 0,01 / 0,29 / 0,99 /
  1 234,56… sin pérdida.
- Invariantes verificadas sobre la base compacta: Σsemanas del plan = pronóstico (4,5·10⁻¹³), total
  del horizonte = publicación (1 335 219,04), agregado de predicciones = suma de series por día
  (diferencia máxima 0,0), métricas de evaluación idénticas a la base de trabajo y observaciones
  intactas (66 927 173 unidades en bloques y en agregados).
- El almacenamiento se informa dos veces y por separado: **paquete comprimido** 70,48 MB (gzip) y
  **base importada** 164,81 MB de almacenamiento físico (más 17,54 MB de índices).

### 5. Base local de publicación, reproducible e idempotente

```bash
# 1. Inventario de lo que consume la demo (opcional, para la evidencia)
python -m scripts.inventariar_demo --json ../evidencias/comercial/inventario-demo.json

# 2. Generar la base compacta desde la base de trabajo (nunca al revés)
python -m scripts.generar_demo_publicacion --destino atlas_comercial_demo --vaciar

# 3. Validar el contrato antes de empaquetar
python -m scripts.validar_demo_publicacion --base atlas_comercial_demo

# 4. Exportar el paquete comprimido con su manifiesto
python -m scripts.exportar_demo_publicacion --base atlas_comercial_demo --destino ../paquete-demo
```

`generar_demo_publicacion.py` solo acepta bases destino locales con sufijo `_demo`, `_pub` o
`_demo_test`, distintas de la base de trabajo, y escribe `_id` deterministas. Repetibilidad
comprobada: una segunda generación completa en `atlas_comercial_demo_test` produjo el mismo
contenido en las 21 colecciones (comparación por huella de documento, evidencia
`evidencias/comercial/determinismo-demo.json`). Tiempos medidos: generación 152,9 s en la base de la
demo y 189,8 s en la repetición, exportación 33,9 s, importación de prueba 16,4 s.

### 6. Paquete de transferencia

`paquete-demo/atlas-comercial-demo.archive.gz` (70,48 MB, `mongodump --archive --gzip`, sha256
`d4fd7da5…`) y `manifiesto.json` (11 671 B) + `manifiesto.json.gz`. El manifiesto declara esquema
`atlas-comercial-demo-1`, base de origen, versión de datos `m5-85e8ac8df562`, ejecución
`run-calendario-749b5ca3a8`, revisión `rev-ec9b21cd45`, política `decimal-v1`, cobertura
(2011-01-29 – 2016-05-22, 1 941 días), contrato, recuentos y tamaños por colección, hashes, índices
indispensables, validación y tiempos. Las instrucciones usan variables de entorno y no llevan
credenciales:

```bash
# Importar en una base destino explícita (nunca la base de trabajo)
python -m scripts.importar_demo_publicacion \
  --archivo ../paquete-demo/atlas-comercial-demo.archive.gz \
  --destino <base_destino>          # sufijo _demo, _pub o _demo_test

# Apuntar la API a la base importada
COMERCIAL_MONGODB_URI=mongodb://HOST:PUERTO/<base_destino>
COMERCIAL_MONGODB_DB=<base_destino>
```

El importador verifica el sha256 antes de restaurar, rechaza `mongodb+srv://`, cualquier host remoto y
la base de trabajo, restaura con `--nsFrom/--nsTo` **sin `--drop`** y valida el contrato al terminar.
Prueba real en local: `atlas_comercial_demo_test`, 16,4 s, validación OK. **La importación remota no
se ha ejecutado.**

### 7. Validación de la demo contra la base compacta

`backend/scripts/comparar_api_demo.py` levanta la misma aplicación contra las dos bases y compara
respuestas normalizadas: **60 de 60 casos equivalentes** (35 byte a byte y 24 iguales tras descartar
marcas de tiempo, duraciones de cálculo y el nombre de la base; el caso 60 es el CSV completo, 2 551 504
bytes idénticos). Cubre todas las rutas, los tres niveles de exploración, periodos, A/B, estacionalidad,
matriz, intermitencia, concentración, precios (distribución, cambios y evolución), pronóstico en cuatro
niveles, evaluación en cuatro niveles y dos etapas, ventanas, horizontes, plan con filtros y orden,
detalle de serie, auditoría temporal y búsquedas sin resultados.

Latencias (p50 de 7 repeticiones, misma máquina, sin otra carga):

| Consulta | Base de trabajo | Base de la demo | Diferencia |
| --- | ---: | ---: | ---: |
| pulso | 207,6 ms | 202,7 ms | −2,4 % |
| pulso semanal | 71,4 ms | 68,9 ms | −3,5 % |
| productos | 35,9 ms | 30,2 ms | −15,9 % |
| comparación A/B | 76,6 ms | 59,6 ms | −22,2 % |
| estacionalidad | 54,2 ms | 63,8 ms | +17,7 % |
| matriz temporal | 74,3 ms | 45,5 ms | −38,8 % |
| artículo | 74,3 ms | 74,2 ms | −0,1 % |
| intermitencia | 54,8 ms | 54,5 ms | −0,5 % |
| precios · distribución | 79,0 ms | 81,1 ms | +2,7 % |
| precios · cambios | 51,9 ms | 46,2 ms | −11,0 % |
| precios · evolución | 56,5 ms | 52,1 ms | −7,8 % |
| pronóstico | 34,4 ms | 45,6 ms | +32,6 % |
| evaluación | 15,7 ms | 10,2 ms | −35,0 % |
| matriz de horizontes | 5,4 ms | 5,4 ms | 0,0 % |
| plan | 5,2 ms | 5,8 ms | +11,5 % |
| **mediana** | **53,0 ms** | **45,9 ms** | **−13,4 %** |

Con este tamaño la respuesta está dominada por el cálculo y la serialización, no por el
almacenamiento: la mediana baja 13 % y la media de las 18 consultas apenas cambia (+3,6 %), con
endpoints que empeoran y mejoran unos milisegundos según el orden de ejecución. La ganancia medida de
forma consistente es el espacio.

`dashboards/atlas-comercial/tools/verificar-demo-publicacion.mjs` recorre el tablero servido apuntado
a la base compacta (`window.PORTFOLIO_COMERCIAL_API`) y comprueba que **ninguna petición sale de la
base de trabajo**: las seis pantallas abren sin errores de consola, las cuatro subsecciones de
Exploración funcionan, la matriz dibuja 3 650 celdas, la concentración, la intermitencia y la
auditoría temporal responden, los controles de Evaluación cambian de etapa y declaran la ausencia de
cortes dibujables en desarrollo, el plan ordena, busca, abre el detalle (2 908,02 u), cambia a
comparación histórica y descarga el CSV, la recarga conserva pantalla y tienda, Atrás/Adelante
funcionan y 390 px no desborda. Las cifras visibles coinciden con la API de la demo: 75,64 % de WAPE,
30 490 series y 1 335 219,04 unidades en el horizonte. Capturas: `demo-*.png`.

### 8. Antes y después

| Métrica | Base de trabajo | Base de la demo | Cambio |
| --- | ---: | ---: | ---: |
| Documentos | 557 598 | 435 276 | −21,9 % |
| Datos (BSON lógico) | 958,13 MB | 659,87 MB | −31,1 % |
| Almacenamiento físico | 272,76 MB | 164,81 MB | −39,6 % |
| Índices | 26,99 MB | 17,54 MB | −35,0 % |
| Paquete comprimido | — | 70,48 MB | — |

| Colección | Documentos (antes → después) | Datos | Almacenamiento |
| --- | ---: | ---: | ---: |
| m5_bloques | 304 900 → 304 900 | 538,92 → 530,78 MB | 133,09 → 130,83 MB |
| m5_precios | 2 820 → 2 820 (+10 de catálogo) | 240,95 → 33,40 MB | 99,84 → 8,24 MB |
| m5_evaluacion_series | 121 960 → 60 980 | 70,66 → 36,11 MB | 10,87 → 5,18 MB |
| m5_predicciones_series | 60 980 → 30 490 | 52,11 → 28,95 MB | 17,02 → 12,78 MB |
| m5_planificacion | 60 980 → 30 490 | 50,45 → 25,62 MB | 8,43 → 5,21 MB |
| m5_predicciones | 744 → 372 | 1,54 → 0,83 MB | 0,68 → 0,27 MB |
| m5_agregados | 124 → 124 | 2,20 → 2,20 MB | 2,16 → 1,46 MB |
| m5_evaluacion_modelos | 14 → 14 | 0,26 → 0,26 MB | 0,20 → 0,09 MB |
| m5_publicacion | 2 → 1 | <0,01 MB | 0,04 → 0,02 MB |
| m5_catalogo, m5_calendario, m5_modelos, m5_pronosticos, m5_evaluacion, m5_estado, m5_importaciones, m5_derivados, m5_auditoria_temporal, m5_precios_manifest | 5 074 → 5 085 (el paquete añade `m5_precios_catalogo` y `m5_demo_manifest`) | 1,04 → 1,72 MB | 0,43 → 0,73 MB |

Tiempos medidos: generación 152,9 s y 189,8 s en dos ejecuciones con `--vaciar`, exportación
33,9 s, importación 16,4 s, validación < 1 s. Evidencia consolidada en
`evidencias/comercial/demo-paquete.json`.

### 9. Defecto encontrado por la comparación y corregido

El detalle de serie (`planificacion.detalle_serie`) leía `m5_evaluacion_series` **sin filtrar por
revisión**, así que cada corte aparecía dos veces —una copia con la política anterior de enteros y
otra con la decimal— y la ficha declaraba cuatro ventanas finales cuando la ejecución publicada tiene
dos. Como el paquete solo lleva la revisión activa, la comparación entre bases lo dejó a la vista
(4 ventanas frente a 2, con las mismas fechas repetidas). Ahora la consulta usa el mismo filtro de
revisión que el resto del módulo: ninguna métrica publicada cambia y la regresión queda cubierta por
`tests/test_demo_publicacion.py::test_detalle_no_duplica_las_ventanas_de_la_revision_anterior`.

### 10. Límites de este incremento

- **La demo no está desplegada en Atlas.** El incremento termina con los datos compactos generados,
  empaquetados y validados en local, y con la importación probada en una base local de prueba.
- `m5_bloques` sigue siendo el 79 % del almacenamiento: cualquier reducción adicional pasa por
  cambiar su codificación y el cálculo de concentración, y eso no se hizo.
- El paquete reproduce los datos publicados, no los regenera: si se reentrena o se republica otra
  revisión, hay que volver a ejecutar la generación y la exportación.
- La latencia no mejora de forma uniforme a este tamaño; la ventaja medida es de espacio y de coste
  de transferencia (70,48 MB frente a la base completa).

## Presentación del caso en el portafolio (ficha de «Ciencia de datos»)

El caso dejó de ser una idea genérica en el portafolio. La ficha que se abre al filtrar o entrar en
«Ciencia de datos y Machine Learning» presenta el proyecto construido, con su nombre comercial, sus
resultados publicados y la vista del tablero real.

**Nombre visible:** «Walmart M5 — Planeación de demanda y evaluación de pronósticos».
**Subtítulo:** «Analítica de ventas históricas y pronóstico diario a 28 días con datos de la
competencia M5 de Kaggle».
**Aclaración visible:** «Proyecto independiente con datos públicos de la competencia M5; no está
afiliado ni patrocinado por Walmart».

### Qué cambió y dónde

| Pieza | Archivo | Cambio |
| --- | --- | --- |
| Ficha del proyecto | `dist/content.js` | nombre, subtítulo, aclaración de independencia, apartado «Resultados publicados» con las cifras confirmadas y bloque técnico de la demo local |
| Portada de la tarjeta | `dist/content.js` y `dist/img/walmart-m5-resumen.jpg` | la captura anterior era una tira de 2 112 × 210 px declarada como 2 112 × 1 518: la tarjeta se veía casi vacía. Ahora es un resumen de página completa a 1 600 × 1 726 px, con el **mismo formato y encaje** que los tableros de «Dashboards y visualización» |
| Apartado «Resultados publicados» | `dist/app.js` | el renderizador de la ficha no mostraba el campo `resultados`; se añadió a `FIELD_LABELS` |
| Bloque «Optimización de la demo» | `dist/app.js`, `dist/style.css`, `dist/content.js` | bloque opcional (`demoTecnica`) a todo el ancho, con entrada, lista de cifras del paquete compacto y nota de que no se desplegó en Atlas |
| Cabecera del tablero | `dashboards/atlas-comercial/src/App.tsx` + `estilos.css` | el título visible pasa a «Walmart M5» con la línea «Planeación de demanda y evaluación de pronósticos», el subtítulo del caso y la nota de independencia; la sobrelínea dice «Ciencia de datos · competencia M5 de Kaggle» |
| Metadatos exportados | `src/App.tsx`, `src/ui/Pronostico.tsx` | la fila «Proyecto» de los CSV usa el nombre nuevo; los nombres de archivo y las rutas no cambian |
| Ficha genérica retirada | `dist/content.js`, `dist/index.html`, `dist/projects/` | se retiró la tarjeta «Predicción de demanda» (estado «previsto», con XGBoost e intervalos de predicción), que describía una idea que ya está construida y con otro enfoque |

No se renombraron colecciones, bases, rutas, endpoints, identificadores ni scripts: la marca cambia
solo en la presentación.

### Resultados que la ficha publica

Revisión `rev-ec9b21cd45`, política `decimal-v1`, versión de datos `m5-85e8ac8df562`. Histórico del
29 ene 2011 al 22 may 2016 (1 941 días), 3 estados, 10 tiendas, 3 categorías, 7 departamentos,
3 049 artículos y 30 490 series artículo × tienda, con 66 927 173 unidades conciliadas. Pronóstico
publicado de 28 días con un LightGBM global condicionado al horizonte y 50 variables (la variante
publicada no usa precios) frente a un baseline estacional semanal; total previsto **1 335 219,04**
unidades.

| Grano | Métrica | Modelo | Baseline | Lectura |
| --- | --- | ---: | ---: | --- |
| artículo × tienda × día | MAE | 1,07 | 1,24 | 13,58 % menos error |
| artículo × tienda × día | WAPE | 75,64 % | 87,53 % | — |
| total del segmento por día | MAE | 3 050,23 | 3 501,00 | 12,88 % menos error |

Los resultados varían por ventana y grano y así se muestran: en el primer corte final el error
agregado fue 23,71 % mayor que el baseline y en el segundo 44,23 % menor. Los dos cortes finales se
consultaron antes de confirmar la publicación, de modo que no son un holdout intacto ni una
evaluación independiente nueva. La ficha también declara que las cifras estiman unidades vendidas de
un conjunto histórico —no ventas actuales, ni ingresos, ni órdenes de compra, ni garantía de
abastecimiento— y que la serie canónica es decimal, con redondeo solo al presentar.

### Demo y vista del tablero

La ficha incrusta la aplicación real (`dist/projects/atlas-comercial.js` monta
`dist/dashboards/atlas-comercial/app.js`), que funciona con los datos publicados de la base local; la
vista estática es la portada de la tarjeta, capturada de ese mismo tablero con
`dashboards/atlas-comercial/tools/capturar-ficha-m5.mjs`.

La portada sigue el mismo formato que el resto de los tableros del portafolio
(`marketing-clientes-resumen.webp`, `pulso-comercial-resumen.webp`): una captura vertical de página
completa a 1 600 × 1 726 px, con la proporción declarada (`1600 / 1726`) y `object-fit: contain`, de
modo que la tarjeta mide lo mismo que sus vecinas (526 × 567 px en escritorio, 349 × 377 px en móvil).
La imagen se genera con `dashboards/atlas-comercial/tools/capturar-ficha-m5.mjs`, que **monta el
módulo real** del tablero (`dist/dashboards/atlas-comercial/app.js`) contra la API publicada en una
página en blanco del mismo origen —sin añadir páginas al sitio— y fotografía lo que dibuja: encabezado
del caso, filtros, plan a cuatro semanas, resumen con 1 335 219,04 unidades previstas, tabla semanal de
30 490 series, detalle de la serie y evaluación al horizonte. Se guarda en JPEG de calidad 90
(337 KB), como `atlas-vial-completo.jpg`.

Se probaron antes dos variantes que se descartaron: el tablero completo encogido con `zoom: 0.8`
(composición correcta pero texto ilegible a tamaño de tarjeta) y un recorte 16:10 de la banda de
cifras (legible, pero con un formato distinto al del resto de las tarjetas). La versión publicada
mantiene el formato de la casa y deja legibles el nombre del caso, las cifras del plan y las filas de
la tabla.

**No hay botón «Abrir tablero»**: no existe una URL pública verificada y no se inventa ninguna;
tampoco se enlaza `localhost`.

El bloque «Optimización de la demo» de la ficha resume el paquete compacto validado en local con
esta redacción, que es la que se publica: «La base compacta de demostración redujo el consumo de
recursos y mantuvo la paridad funcional», documentos 557 598 → 435 276 (−21,9 %), datos BSON
958,13 → 659,87 MB (−31,1 %), almacenamiento físico 272,76 → 164,81 MB (−39,6 %), paquete de
publicación comprimido de 70,48 MB y paridad de 60 de 60 casos de API. Cierra con «Estas
optimizaciones no modificaron las cifras del pronóstico» y aclara expresamente que el paquete se
generó, empaquetó y validó en local y que **no se ha cargado ni desplegado en MongoDB Atlas**.

### Verificación ejecutada

`dashboards/atlas-comercial/tools/verificar-ficha.mjs` comprueba, sobre el sitio servido: la tarjeta
del área (nombre, subtítulo, portada actual, tamaño declarado y texto alternativo), la ficha (título,
subtítulo, aclaración de independencia, cada cifra confirmada, limitaciones, bloque técnico con la
nota de Atlas y ausencia de enlaces a `localhost`), la cabecera del tablero con el nombre nuevo y el
montaje de la aplicación, y 390 px sin desbordes con la portada en proporción 16:10. También se
ejecutaron las verificaciones del tablero (`verificar-pantallas`, `verificar-resultados`,
`verificar-incremento`, `verificar-exploracion`, `verificar-modelo`, `verificar-atlas-comercial`,
`verificar-territorio`, `verificar-drilldown`, `verificar-planificacion`,
`verificar-controles-evaluacion`) y la de la demo compacta (`verificar-demo-publicacion`), además del
build `npm run build` del tablero. Capturas de esta entrega: `ficha-m5-tarjeta.png`,
`ficha-m5-tarjeta-movil.png`, `ficha-m5-escritorio.png`, `ficha-m5-resultados.png`,
`ficha-m5-movil.png`.

### Límites de esta actualización

- El sitio de portafolio es estático y se sirve en local (`dist/` con `python -m http.server`); no hay
  un flujo de publicación remoto configurado, así que la actualización queda en los archivos del
  sitio existente y **no se anuncia como desplegada** en ningún dominio público.
- La ficha no incluye una demo enlazable: la aplicación se ejecuta incrustada y necesita la API local
  del portafolio.

## Limitaciones

- Los CSV de M5 no se redistribuyen: hay que descargarlos aparte. Mientras no exista una
  versión publicada, la API declara «pendiente» y el tablero no muestra cifras.
- La primera entrega pronostica unidades agregadas; no hay ingresos, campañas,
  segmentación de clientes, logística ni compras a proveedores. M5 no contiene el
  historial individual de compradores necesario para esos módulos.
- Las tiendas conservan su código original (CA_1…WI_3) y no se renombran como ciudades
  mexicanas; no se convierten monedas.
- La migración a MongoDB Atlas queda fuera de este incremento.
- La exploración ya incluye capas de calendario (SNAP, eventos), matriz temporal de
  tienda × día y comparación entre tiendas de la misma categoría. Lo que sigue fuera:
  festivos locales fuera del calendario de M5 y cualquier lectura causal de esas capas.
- El nivel de producto se limita a **cinco series** y a la selección del usuario: no es
  una vista completa del departamento. El total del departamento se rotula aparte
  precisamente para no confundirlos.
- El derivado `departamento_tienda` se calcula una vez por versión (34 s) y se guarda en
  `m5_agregados`; republicar otra versión exige volver a ejecutar `scripts/agregar_m5`.
  Mientras no esté publicado, el nivel de departamento se sirve desde los bloques
  (~5 s por tienda) y la respuesta lo declara (`derivado.publicado: false`).
- La búsqueda de productos ordena por unidades del periodo o por identificador; no hay
  sinónimos, descripciones ni categorías de proveedor porque M5 no las trae.
- El A/B por producto compara dos intervalos con la misma selección; si el usuario cambia
  de selección, la comparación se recalcula con la nueva (no se conserva una comparación
  de productos anteriores).
- El panorama territorial solo tiene tres estados y no incluye mapa ni geografía: la
  posición se comunica con las tarjetas y con los bloques de pequeños múltiplos.
- La comparación histórica es **descriptiva**: no hay estacionalidad ajustada, ni
  intervalos, ni contraste de hipótesis. Tampoco compara tiendas entre sí ni corrige por
  días de venta: los años bisiestos y las semanas ISO pueden incluir un día más, y eso se
  declara en la propia gráfica.
- Los años con cobertura incompleta nunca entran como referencia, así que 2011 no se usa
  aunque tenga más de once meses de datos.
- La exploración de productos exige contexto territorial (estado o tienda): con las diez
  tiendas a la vez no se ofrecen series de producto, solo el panorama y la composición.
- El crecimiento del payload de `/pulso` (~3 kB) es el coste de servir panorama y
  composición coherentes con el mismo universo; no se han reducido las series diarias, que
  siguen siendo la mayor parte de la respuesta cuando la agregación es «día».
- **Modelo predictivo**: el WAPE a grano artículo × tienda es alto (75–92 %) porque la
  mayoría de las series son intermitentes; no debe leerse como un error porcentual sobre
  volumen agregado, y por eso el tablero publica también el MAE en unidades por serie‑día y
  el error de las series agregadas. El modelo **no** predice ingresos, precios ni
  promociones, y no se han calculado intervalos de predicción: no se dibuja banda de
  incertidumbre. No se reporta WRMSSE (métrica oficial de M5) porque exigiría implementar
  sus pesos por serie, nivel y periodo; el resultado no es comparable con el ranking
  oficial de la competencia.
- El precio de los 28 días pronosticados es un **supuesto** (último precio conocido): si un
  artículo cambia de precio durante el horizonte, el pronóstico no lo sabe. La variante con
  precios se entrenó y evaluó, y no superó a la de calendario.
- El pronóstico está anclado al último día observado del conjunto (2016‑05‑22) y **no** se
  actualiza con ventas nuevas: no hay ingesta incremental ni monitorización en producción.
  «Última ejecución completada» y «modelo recomendado» se muestran por separado.
- Las cifras publicadas salen de cortes propios (3 de desarrollo y 2 finales), no del
  `evaluation` oficial de Kaggle; sirven para comparar candidato y baseline entre sí, no
  para afirmar una posición en el ranking de M5.
