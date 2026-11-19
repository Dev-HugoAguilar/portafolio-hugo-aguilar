# Metodología y modelo · Marketing y clientes

Qué cuenta cada cifra, con qué unidad, en qué ventana y qué **no** se puede
concluir. El origen de los datos, la muestra, la extracción y la persistencia
están en [`FUENTE-Y-ACCESO.md`](FUENTE-Y-ACCESO.md); la regla de almacenamiento
común a todos los tableros, en [`../ALMACENAMIENTO.md`](../ALMACENAMIENTO.md).

## 1. Universo publicado

| | |
|---|---|
| Conjunto | GA4 · `ga4_obfuscated_sample_ecommerce` (histórico y ofuscado) |
| Periodo | 2020-11-01 → 2021-01-31 (92 días) |
| Muestra | 5 % de **usuarios** con semilla `ga4-muestra-2026` → 13 509 personas |
| Modelo | agregados; sin detalle de sesión, línea de artículo ni evento |

Cifras del conjunto publicado, tal como las sirve la API:

| Indicador | Valor |
|---|---:|
| Eventos | 210 672 |
| Usuarios distintos | 13 509 |
| Sesiones | 17 906 |
| Compradores | 224 |
| Compras deduplicadas | 261 |
| Ingresos (USD) | 17 898.00 |
| Conversión (compradores ÷ usuarios) | 1.66 % |
| Ticket medio (USD) | 68.57 |

Que las cifras sean de una muestra **no** las hace aproximadas: son los totales
exactos de esas 13 509 personas. Lo que no se puede hacer con ellas es
extrapolarlas al conjunto completo sin declararlo.

### 1.1 Cobertura: población, muestra y método

| | |
|---|---:|
| Población original (usuarios distintos, 92 días) | **270 154** |
| Filas usuario-día de la población | 319 066 |
| Muestra publicada (usuarios) | **13 509** |
| Proporción efectiva | **5.00 %** (13 509 ÷ 270 154) |
| Unidad de muestreo | usuario (`user_pseudo_id`) |
| Semilla | `ga4-muestra-2026` |

**Método de selección** — se eligen personas, no filas:

```
MOD(ABS(FARM_FINGERPRINT(CONCAT('ga4-muestra-2026|', user_pseudo_id))), 10000) < 500
```

El mismo predicado se aplica en el `WHERE` de todas las consultas de extracción,
así que el conjunto publicado es el mismo en todas las entidades. Una vez fijadas
las personas, **se agregan todas sus sesiones, compras y eventos**: agrupar no es
muestrear y las cifras son totales exactos de esas personas, no una estimación.

**Procedencia de las dos cifras.** La población se contó en la extracción **sin
muestreo** del mismo periodo (`data/marketing/v2/usuarios.csv.gz`, 2026-11-05) y
no se guarda en Atlas: el tablero publica la muestra. La proporción la calcula la
API con las dos cifras (`cobertura_muestra.muestra_publicada.porcentaje_efectivo`),
no se copia del manifiesto.

**Dónde se ve.** El panel «Muestra y cobertura» del tablero muestra la población,
la muestra publicada, la proporción, el predicado completo y la conciliación
indicador ↔ gráfica. El diálogo «Metodología y datos» repite la ficha con la
misma fuente de datos (`GET /api/v1/marketing/estado`).

**Consistencia entre indicadores y gráficas.** La API publica cinco
comprobaciones en `GET /resumen` → `cobertura.consistencia`, calculadas en cada
petición y visibles en el panel:

| Indicador | Gráfica que debe sumar lo mismo | Diferencia medida |
|---|---|---:|
| Eventos | serie diaria | 0 |
| Sesiones | Sankey de adquisición | 0 |
| Usuarios | ranking de canales | 0 |
| Compradores | ranking de canales | 0 |
| Compras | ranking de canales | 0 |

No se corrige ni se redondea nada: si alguna no cuadrara, el panel mostraría la
diferencia en lugar de ocultarla.

### 1.2 ¿A qué se refieren las cifras de verificación?

A **toda la muestra publicada**, no a un corte filtrado. La conciliación de
`scripts/verificar_compacto.py` recorre el universo completo (92 días, todos los
canales, dispositivos y países) y además repite la comprobación con dos cortes
filtrados —rango `2020-12-01 → 2021-01-31` y ese mismo rango con país *United
States* + dispositivo *desktop*— para demostrar que los filtros devuelven
subconjuntos exactos del mismo universo:

| Corte | Sesiones | Usuarios | Compradores |
|---|---:|---:|---:|
| Toda la muestra | 17 906 | 13 509 | 224 |
| 2020-12-01 → 2021-01-31 | 12 510 | 9 781 | 152 |
| + país *United States* + *desktop* | 3 147 | 2 469 | 30 |

Las tres columnas salen idénticas del CSV original, de Atlas y de la API. Los
totales del panel de cobertura y de las tarjetas son los del **primer** corte
(toda la muestra) cuando no hay filtros activos.

## 2. Correcciones demostradas

### 2.1 Usuarios: no se suman días

**Causa.** Agrupar por el canal **del día** de cada fila y sumar todos los días
cuenta varias veces a quien aparece en dos canales o en dos días.

**Corrección.** Las dimensiones de persona (canal, dispositivo, país) se asignan
por la **primera actividad observada** del usuario y se guardan en cada fila
usuario-día. Cada persona pertenece a un solo canal, así que la suma por canal es
exactamente el total de usuarios distintos.

### 2.2 Compras e ingresos: deduplicadas sobre todo el periodo

Las compras se deduplican globalmente (usuario + `transaction_id`; respaldo:
usuario + marca de tiempo) y se publican en su propia colección, atribuidas al
día de la transacción. Sumar los agregados diarios contaría dos veces la misma
compra y a quien compra en varios días.

### 2.3 Compras por categoría: conteo solapado

Una compra con artículos de dos categorías aparece en las dos: la suma por
categoría (**433**) supera las compras totales (**261**) y el panel lo declara.
No se reparte el ingreso de la compra entre categorías: los importes son de la
línea (`item_revenue_in_usd`).

Cada compra se atribuye a la **fecha y dimensiones de su primera línea**, de modo
que filtrar por fecha, canal, dispositivo o país no cuenta dos veces una compra
cuyas líneas cayeron en días distintos. Antes de la compactación la colección se
guardaba por día y dimensión de cada línea y un caso de 261 se contaba dos veces.

### 2.4 Retención: el denominador es el del segmento

El denominador de cada punto es el del **propio segmento** (usuarios de ese valor
en la semana 0 de las cohortes que podían observar ese índice), no el tamaño de
la cohorte completa. Con eso S0 = 100 % en todas las curvas y las semanas sin
ventana devuelven base 0 y `retencion: null`, nunca 0 %.

No se promedian porcentajes entre segmentos: se suman usuarios y se divide por la
base elegible. Base pequeña (< 100 usuarios) se marca y se explica.

## 3. Modelo de datos publicado

| Colección | Granularidad | Uso |
|---|---|---|
| `marketing_resumen` | día × canal × dispositivo × país | eventos y sesiones por día |
| `marketing_usuarios` | usuario × día | usuarios distintos, canal de adquisición fijo |
| `marketing_compras` | compra deduplicada | compras, compradores, ingresos |
| `marketing_embudo` | día × dimensiones × paso | sesiones por paso (orden y ventana aplicados en SQL) |
| `marketing_cohortes` | cohorte × semana × dimensión | retención y compra por semana |
| `marketing_categorias` | compra × categoría | compras que incluyen la categoría, unidades, importe de línea |
| `marketing_flujo` | día × canal × dispositivo × país × resultado | Sankey de adquisición → compra |
| `marketing_tiempos` | día × canal × dispositivo × país × transición × tramo | tiempo entre etapas |
| `marketing_afinidad` | par de categorías | compras conjuntas |
| `marketing_estado`, `marketing_importaciones` | versión | puntero y manifiesto |

Lo que **no** se guarda, y por qué: las sesiones una a una (el flujo y los tiempos
se calculan una vez fuera de Atlas), las líneas de artículo (basta la afinidad y
la categoría por compra) y el extracto de eventos (la tabla de detalle ya no
existe en el tablero). Nada de eso se puede reconstruir desde Atlas; el original
comprimido sí lo conserva.

### Limpieza aplicada

- Marcadores de la fuente (`(not set)`, `(none)`, vacíos…) → «Sin información»;
  **no** se convierten en tráfico directo.
- Importes ausentes → se cuentan aparte, no se rellenan con cero.
- No se elimina ninguna sesión, compra ni evento de la copia original.
- 23 compras sin identificador de transacción se conservan con la clave de
  respaldo y se informan.

## 4. Definiciones

| Métrica | Definición |
|---|---|
| **Usuario** | `user_pseudo_id` distinto, contado una vez por rango |
| **Sesión** | usuario + `ga_session_id` |
| **Comprador** | usuario distinto con ≥ 1 compra deduplicada |
| **Compra** | evento `purchase` deduplicado por usuario + transacción |
| **Ingresos** | `purchase_revenue_in_usd` de esas compras (USD) |
| **Canal** | `traffic_source.source / medium` de la primera actividad observada |
| **Embudo** | sesiones con los cuatro pasos **en orden** dentro de 24 h desde el primero |
| **Cohorte** | semana ISO de la primera actividad observada |
| **Retención S(n)** | usuarios de la cohorte con actividad en la semana n |
| **Compra S(n)** | usuarios de la cohorte con ≥ 1 compra en la semana n; **no** es recompra |

- Las semanas sin ventana completa se devuelven vacías (`sin ventana`), nunca como
  retención cero.
- El embudo por sesión puede ser menor que las compras totales: exige los cuatro
  pasos en orden dentro de una misma sesión y de la ventana de 24 h. Por eso el
  último paso cuenta 134 sesiones y las compras 261.
- Los tramos de tiempo entre etapas se calculan con las marcas reales de cada
  sesión y responden a los mismos filtros que el resto de la vista.
- La **afinidad de categorías** se calcula una vez por compra sobre todas las
  compras del periodo publicado: sus pares no cambian con los filtros y la
  respuesta lo declara (`alcance.aplica_filtros = false`). Recalcularla por día o
  por canal exigiría volver a guardar las líneas de artículo.
- **Periodo y cobertura de la afinidad** (van en la respuesta y en el panel):

  | | |
  |---|---:|
  | Periodo que cubre | 2020-11-01 → 2021-01-31 (todo el periodo publicado) |
  | Compras analizadas | 261 |
  | Categorías con compras | 18 |
  | Pares posibles | 117 |
  | Pares representados (8 categorías, mínimo 5 compras conjuntas) | 21 |
  | Responde a los filtros | **no** (`aplica_filtros: false`) |

  El panel lo marca con una insignia permanente «No depende de los filtros» y
  escribe el periodo junto a la cobertura, para que nadie lea el diagrama como si
  respondiera al rango elegido arriba.

## 5. Rendimiento medido

Medido con `python -m scripts.medir_respuesta` sobre la versión publicada
(`ga4-e9764d626c`), API local (uvicorn) contra el clúster gratuito de Atlas (M0,
compartido). «Sin caché» es la primera petición de una combinación de filtros
nueva (`X-Marketing-Cache: miss`, el cálculo se hace entero); «con caché» es la
misma petición repetida dentro de los 300 s (`hit`). Mediana de dos medidas.

| Vista | Sin caché | Con caché | Respuesta |
|---|---:|---:|---:|
| Marketing · resumen (tarjetas, serie, Sankey, lollipop) | 1 380 ms | 100 ms | 9.1 KB |
| Marketing · adquisición (ranking y productos) | 771 ms | 103 ms | 3.7 KB |
| Marketing · conversión (embudo, tiempos, fricción) | 965 ms | 84 ms | 9.8 KB |
| Marketing · cohortes (matriz, curvas, puntos) | 511 ms | 88 ms | 7.5 KB |
| Marketing · productos (categorías y afinidad) | 750 ms | 110 ms | 6.4 KB |
| Marketing · exportación de agregados | 1 503 ms | 1 526 ms¹ | 2.4 KB |
| Atlas vial · resumen | 266 ms | 244 ms¹ | 0.9 KB |
| Atlas vial · puntos del mapa | 344 ms | 344 ms¹ | 0.3 KB |
| Comparativo bancario · resumen | 1 386 ms | 1 398 ms¹ | 16.8 KB |
| Comparativo bancario · detalle paginado (50 filas) | 419 ms | 410 ms¹ | 18.8 KB |

¹ Sin caché de aplicación: la segunda llamada repite el cálculo completo. Solo
marketing tiene caché de 300 s por versión y filtros (precargada al arrancar), y
es la única que puede prometer tiempos «con caché».

La exportación tarda más que una vista porque calcula el resumen completo para
poder exportar exactamente las mismas cifras que se ven en pantalla.

Índices declarados en `backend/app/db/indexes.py`: `(version, fecha, usuario)` y
`(version, canal, usuario)` en usuarios; `(version, fecha, canal)`,
`(version, dispositivo)` y `(version, pais)` en el resumen; `(version, fecha,
canal)` en compras; `(version, paso, fecha)` y `(version, canal, paso)` en el
embudo; el de cohortes; y uno por agregado nuevo. Se retiraron los que ningún
filtro aprovechaba: con estas colecciones, un índice de más cuesta más espacio del
que ahorra.

## 6. Verificación

| Comprobación | Qué cubre |
|---|---|
| `backend/tests/test_marketing.py` | 45 pruebas (esquema, SQL, validación, ingesta con fuente de prueba, API, cobertura, consistencia, alcance de la afinidad y camino de fallo que conserva la versión publicada) |
| `python -m scripts.verificar_compacto` | recalcula los agregados desde el CSV original y los compara con Atlas y con la API, sin filtros y con fecha + país + dispositivo |
| `python -m scripts.medir_respuesta` | tiempos sin caché y con caché de las diez vistas principales |
| `dashboards/marketing-clientes/tools/evidencia.mjs` | 38 comprobaciones en navegador real (escritorio y móvil), incluidas cobertura, consistencia y alcance de la afinidad |
| `dashboards/marketing-clientes/tools/revisar.mjs` | 18 comprobaciones de integración tablero ↔ API (incluye que los otros dos tableros sigan intactos) |
| `dashboards/marketing-clientes/tools/verificar-ficha.mjs` | 16 comprobaciones de la ficha del proyecto y de sus «Hallazgos del análisis», en escritorio y móvil |

Conciliación de la compactación (todas las claves, no solo los totales):

| Agregado | Original (CSV) | Atlas | API |
|---|---:|---:|---:|
| flujo (día × canal × dispositivo × país × resultado) | 17 906 sesiones | 17 906 | 17 906 |
| sesiones con dispositivo distinto | 424 | 424 | 424 |
| tiempos entre etapas (día × canal × dispositivo × país × tramo) | 1 275 | 1 275 | base 772 / 256 / 247 |
| categorías por compra | 518 | 518 | Apparel 135, New 54, … |
| usuarios / compradores | 13 509 / 224 | 13 509 / 224 | 13 509 / 224 |

## 7. Funciones publicadas y su estado

Lo que el tablero ofrece hoy, y lo que ya no ofrece por el modelo compacto. Cada
fila se comprueba en las suites de navegador y de API.

| Función | Estado | Dónde se ve |
|---|---|---|
| Tarjetas del rango (eventos, usuarios, sesiones, compradores, compras, ingresos, conversión, ticket) | **activa** | vista *Resumen* |
| Muestra y cobertura (población, muestra, proporción, método, consistencia) | **activa** | panel bajo las tarjetas y diálogo *Metodología y datos* |
| Serie diaria con métrica conmutable | **activa** | vista *Resumen* |
| Sankey de adquisición → compra y lollipop de conversión | **activa** | vista *Resumen* |
| Ranking de canales con panel contextual | **activa** | vista *Adquisición* |
| Categorías por compra con conciliación de solapamiento | **activa** | panel *Productos y compra* |
| Afinidad de categorías | **activa**, calculada para todo el periodo e **independiente de los filtros** (insignia y periodo visibles) | panel *Productos y compra* |
| Embudo por pasos, tramos de tiempo y mapa de fricción | **activa** | vista *Conversión* |
| Cohortes: matriz, curvas por segmento y puntos S1 | **activa** | vista *Cohortes* |
| Exportación CSV | **activa**, con los **agregados** del rango: una fila por día, una por canal y el total, más cabecera con fuente, muestra, método, filtros y definiciones | botón *Exportar CSV* |
| Tabla de detalle de eventos | **no disponible** y declarada: `GET /marketing/tabla` responde `disponible: false` con el motivo | — (el modelo compacto no guarda eventos) |
| Búsqueda en la tabla de detalle | **retirada** del tablero (no había nada que filtrar) | — |
| Comparación con el periodo anterior | **no se calcula** en cada petición (`comparacion: null`) | — |

Estados y textos: la ficha del proyecto en el portafolio declara «En desarrollo»
con la nota de la muestra y sus cifras; la API publica en `GET /marketing/estado`
la versión activa, el periodo, la persistencia (Atlas), la cobertura de la muestra
y el motivo cuando no hay datos. El panel avisa en lugar de dibujar ceros: «Sin
datos publicados» cuando no hay versión y `base reducida` cuando un segmento tiene
menos de 100 usuarios.

## 8. Hallazgos de la ficha del proyecto

La ficha del portafolio incluye «Hallazgos del análisis». No son texto fijo: el
módulo del tablero los calcula al abrir la ficha con **toda la muestra publicada y
su periodo completo, sin filtros** (`src/hallazgos.ts` + `src/ui/Hallazgos.tsx`,
que ocupan el hueco `#hallazgos-host`). Si falta un dato, el hallazgo se omite y
se informa; nunca se rellena con una cifra sin verificar.

Evidencia de cada hallazgo sobre la versión `ga4-e9764d626c`, sin filtros:

| Hallazgo | Endpoint | Numerador / denominador | Resultado |
|---|---|---|---|
| La mayor fuente identificada convierte por debajo de la media | `GET /marketing/resumen` | 73 compradores ÷ 4 716 usuarios (`google / organic`); referencia global 224 ÷ 13 509 | 1.55 % frente a 1.66 % global; el grupo sin fuente documentada reúne 5 616 usuarios (41.6 %), también 1.55 %. Con base ≥ 100, la conversión más alta es `shop.googlemerchandisestore.com / referral`: 17 ÷ 755 = 2.25 % |
| La mayor pérdida de sesiones ocurre entre «vio un artículo» y «añadió al carrito» | `GET /marketing/conversion` | 3 756 − 772 = 2 984 sesiones; tasa 772 ÷ 3 756 | 20.55 % de avance, también la menor del recorrido (33.16 % carrito → pago; 52.34 % pago → compra) |
| La retención de la primera semana cambia según el país | `GET /marketing/cohortes?dimension=pais` | Semana 1, denominador elegible de cada segmento | «United States» 249 ÷ 5 547 = 4.49 %; «India» 43 ÷ 1 154 = 3.73 %; «Canada» 31 ÷ 955 = 3.25 % |
| Apparel aparece en la mitad de las compras | `GET /marketing/productos` | 135 compras con Apparel ÷ 261 compras; par Apparel + New: 30 conjuntas | 51.7 %; 22.20 % de las compras de Apparel y 55.60 % de las de New; 21 de 117 pares posibles con 8 de 18 categorías |

Reglas de redacción que aplica el módulo, y que conviene mantener:

- el segmento «más eficiente» exige la base mínima del propio tablero (≥ 100
  usuarios), para no presentar segmentos diminutos como ganadores;
- la reducción de sesiones se describe como «sesiones que no completaron el
  siguiente paso observado», nunca como abandono medido ni ventas perdidas;
- la retención compara segmentos en la **misma** semana de seguimiento, cada uno
  con su denominador elegible, y no promedia porcentajes;
- la afinidad se presenta como coocurrencia observada, no como causalidad ni
  recomendación comercial.

Los textos editoriales de la ficha (problema, destinatario, contribución, fuentes,
método y limitaciones) quedan en `dist/content.js`; el detalle técnico —fórmulas,
campos, predicado de muestreo, hashes y verificación— vive en el diálogo
«Metodología y datos» del tablero, no en la ficha.
