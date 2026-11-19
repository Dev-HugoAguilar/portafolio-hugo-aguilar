# Regla de almacenamiento de los tableros

El portafolio vive en el **plan gratuito de MongoDB Atlas**: un clúster M0 de
512 MB **compartido con otros proyectos**. Este documento fija la regla que
siguen los tres tableros publicados y la que debe seguir cualquier tablero nuevo.

## 1. La regla

1. **Todo se sirve desde Atlas.** Ninguna visualización del sitio consulta
   BigQuery, la CNBV, la SSC ni archivos locales: la API lee la versión publicada
   en MongoDB. Los originales se guardan fuera de Atlas solo como respaldo y como
   material de recálculo.
2. **Se prepara fuera y se publica lo agrupado.** Los cálculos pesados (cruces,
   deduplicaciones, ventanas de tiempo, cohortes, pares de categorías) se hacen en
   un script de preparación sobre el archivo original. En Atlas entran agregados,
   metadatos y catálogos: lo justo para las visualizaciones y los filtros.
3. **Detalle mínimo, solo si una función lo exige.** Un mapa de puntos necesita un
   documento por hecho; una serie diaria, un documento por día. Un detalle que
   ninguna vista dibuja no se publica.
4. **Las métricas no aditivas se guardan exactas.** Usuarios distintos,
   compradores, tasas y cohortes no se pueden sumar entre días ni entre filas: se
   guardan en una forma que permita contarlas exactamente (usuario-día, cohorte ×
   semana, compra deduplicada). Agrupar **no** es muestrear: los agregados cubren
   todos los registros del universo publicado.
5. **Sin duplicación ni versiones acumuladas.** Un dato se guarda una sola vez, en
   la colección que lo usa. Al publicar una versión nueva se sustituye la anterior
   y el puntero `*_estado` cambia de golpe, sin dejar copias a medias.
6. **Sin índices de adorno.** Cada índice tiene que servir una consulta real. Si
   una colección es pequeña, leerla completa es más barato que mantener el índice.
7. **Presupuesto por tablero.** Cada tablero tiene un techo declarado y se mide.
   Si una compactación lo excede, no se publica: se recorta el modelo.
8. **Se valida antes de borrar.** Primero se escribe el agregado, después se
   concilia contra el original (todas las claves, no solo los totales) y **solo
   entonces** se retira la colección anterior. La copia original nunca se borra.

## 2. Presupuesto y consumo medido

Presupuesto del proyecto dentro del clúster compartido: **≤ 225 MiB** en total,
con **≥ 40 MiB de reserva** para el resto de proyectos del clúster.

| Tablero | Presupuesto | Antes | Después | Cómo se redujo |
|---|---:|---:|---:|---|
| Marketing y clientes | 80 MiB | 50.2 MiB | 28.6 MiB | sesiones, artículos y eventos → `flujo`, `tiempos`, `categorias` por compra y `afinidad` |
| Comparativo bancario (CNBV) | 60 MiB | 52.3 MiB | 41.1 MiB | fuera las filas crudas del .xlsx; un índice compuesto redundante |
| Atlas vial | 60 MiB | 47.0 MiB | 30.1 MiB | 15 campos que ninguna vista leía; 3 índices sin consulta |
| Ventas / Rentabilidad (sintético) | 25 MiB | 20.1 MiB | 0 MiB | archivado fuera del clúster: el sitio no lo consulta |
| **Total del proyecto** | **225 MiB** | **169.6 MiB** | **99.8 MiB** | **−69.8 MiB** |

Medido con `dbStats`/`collStats` (datos + índices). El clúster guarda comprimido,
así que la reducción en disco es menor que la lógica (30.5 MiB en disco para los
99.8 MiB del proyecto); la cifra que limita la cuota es la suma lógica del
clúster, y ahí también se notó la baja.

Consumo del clúster al cerrar esta revisión, medido con `dbStats` de cada base:

| Base | Lógico (datos + índices) | En disco |
|---|---:|---:|
| `fiscal_reports` (otro proyecto) | 166.1 MiB | 50.6 MiB |
| **`hugo_portfolio` (este portafolio)** | **99.8 MiB** | **30.5 MiB** |
| `reportes_bi` (otro proyecto) | 96.6 MiB | 18.7 MiB |
| `eureka_db` (otro proyecto) | 14.3 MiB | 2.5 MiB |
| `PM_BD1` (otro proyecto) | 3.9 MiB | 1.1 MiB |
| Resto de bases ajenas | 0.3 MiB | 0.3 MiB |
| **Total del clúster** | **381.0 MiB de 512** | 103.7 MiB |

Reserva libre: **131 MiB**. Este portafolio no toca las bases de los otros
proyectos; solo se midieron.

> El briefing de Banco de México usa una base separada, `portfolio_demos`, con la
> colección dedicada `rag_banxico_chunks` (siete documentos). No se mezcla con
> `hugo_portfolio`; su volumen es despreciable frente al presupuesto y la carga es
> idempotente por `chunk_id`.
>
> El Copiloto NL-to-SQL usa SQLite local de solo lectura; su auditoría opcional
> escribe solo metadatos en `portfolio_demos.nl_sql_query_audit`, nunca la
> pregunta. Data Incident Commander no persiste nada: sus runs y recibos viven
> en memoria y desaparecen al reiniciar el proceso.

## 3. Qué se publica en cada tablero

### Marketing y clientes

| Se publica | Granularidad |
|---|---|
| `marketing_resumen` | día × canal × dispositivo × país |
| `marketing_usuarios` | usuario × día (conteo exacto de personas) |
| `marketing_compras` | compra deduplicada |
| `marketing_embudo` | día × dimensiones × paso |
| `marketing_cohortes` | cohorte × semana × dimensión |
| `marketing_categorias` | compra × categoría |
| `marketing_flujo` | día × canal × dispositivo × país × resultado |
| `marketing_tiempos` | día × canal × dispositivo × país × transición × tramo |
| `marketing_afinidad` | par de categorías |

Fuera: sesiones una a una, líneas de artículo y extracto de eventos. El Sankey, los
tiempos entre etapas y la afinidad se calculan **una vez**, con las marcas de
tiempo reales, en `scripts/compactar_marketing.py`.

### Comparativo bancario (CNBV)

Se publica un hecho por institución, concepto, periodo y revisión
(`cnbv_hechos`), los indicadores que publica la CNBV (`cnbv_indicadores`) y la
ficha de cada boletín con su hash (`cnbv_boletines`). Fuera: las filas del .xlsx
tal cual (`cnbv_filas_originales`), que solo se contaban; el número de filas se
lee de la ficha del boletín y el archivo original se conserva en `data/cnbv`.

### Atlas vial

Se publica un documento por hecho con lo que el mapa, los filtros y la ficha
necesitan: folio, fecha y hora, ubicación, alcaldía, tipo de evento, consecuencia,
sexo, edad, tipo de usuario, vehículo, vialidad y semáforo. Fuera: 15 campos
administrativos del archivo de la SSC que ninguna vista leía.

### Ventas / Rentabilidad

El conjunto sintético se cargó para una versión anterior del portafolio. El sitio
publicado no lo consulta. Se archivó en `backend/data/ventas/sales.jsonl.gz` y se
retiró del clúster; la ficha del dataset se conserva y se puede recargar con
`python -m scripts.seed_demo --replace`.

### 3.1 Agregaciones y detalle mínimo

No todo lo que se publica es del mismo tipo. Esta es la distinción explícita, con
la función que obliga a cada cosa y qué pasaría si se agregara más.

**Agregaciones puras** — nadie necesita las filas originales para responder lo que
la interfaz pregunta; se calculan una vez y se guardan ya sumadas:

| Colección | Qué agrega | Función que la usa |
|---|---|---|
| `marketing_flujo` | sesiones por día × canal × dispositivo × país × resultado | Sankey de adquisición → compra |
| `marketing_tiempos` | sesiones por transición y tramo de tiempo | «Tiempo entre ambas etapas» del embudo |
| `marketing_afinidad` | compras conjuntas por par de categorías | diagrama de cuerdas |
| `marketing_categorias` | compras, unidades e importe por compra y categoría | tabla de categorías |

**Detalle mínimo conservado** — cada fila existe porque una métrica **no es
aditiva** o porque un filtro la necesita; agregarla más cambiaría una cifra:

| Colección | Qué guarda | Por qué no se puede agregar más |
|---|---|---|
| `marketing_usuarios` | una fila por usuario y día | los **usuarios distintos** no se suman entre días: es la única forma de contarlos sin duplicar a quien vuelve. Su canal es el de la primera actividad |
| `marketing_compras` | una fila por compra deduplicada | compras, compradores e ingresos se deduplican sobre todo el periodo; sumar agregados diarios contaría dos veces la misma transacción |
| `marketing_resumen` | día × canal × dispositivo × país | alimenta la serie diaria y los filtros de canal, dispositivo y país con exactitud; es el grano mínimo que responde a esos filtros |
| `marketing_embudo` | día × dimensiones × paso | el embudo exige **orden y ventana de 24 h** por sesión: el resultado no se puede recombinar desde totales |
| `marketing_cohortes` | cohorte × semana × dimensión | retención y compra por semana necesitan la base de cada cohorte; promediar porcentajes daría otra cifra |
| `atlas_hechos` | un documento por hecho de tránsito | el mapa dibuja y filtra **punto a punto** (coordenadas, folio, hora); sin la fila no hay mapa ni ficha |
| `cnbv_hechos` | un hecho por institución × concepto × periodo | el comparativo y la serie son por institución y concepto: cada cifra es una celda del boletín, no una suma |

**Lo que no se publica** y por qué: las sesiones una a una (sus resultados están en
`flujo` y `tiempos`), las líneas de artículo (basta la categoría por compra y los
pares de afinidad) y el extracto de eventos (la tabla de detalle ya no existe). El
original comprimido conserva todo eso fuera de Atlas.

La afinidad es el caso límite: sus pares se calculan por compra sobre las líneas de
artículo, y como esas líneas ya no se guardan, se publica **una sola vez para todo
el periodo**. El tablero lo declara de forma permanente —insignia «No depende de
los filtros», periodo y cobertura visibles— y la API lo devuelve en
`alcance.aplica_filtros = false`.

## 4. Cómo aplicar la regla a un tablero nuevo

1. **Enumerar lo que la interfaz dibuja y filtra.** Ese es el universo de datos que
   se puede publicar, ni una columna más.
2. **Elegir la granularidad mínima** que responda a esos filtros. Si un filtro no
   se va a ofrecer, su dimensión no entra en el agregado.
3. **Separar lo aditivo de lo no aditivo.** Sumas (eventos, sesiones, unidades) y
   conteos distintos (usuarios, compradores) no viven en la misma fila si eso
   obliga a sumar mal.
4. **Calcular fuera de Atlas** y guardar el original comprimido con su manifiesto
   (hash, periodo, muestra, consultas).
5. **Publicar por versiones**: `tmp-…` → renombrar → mover el puntero `*_estado`.
   Nunca a medias.
6. **Conciliar antes de borrar** con un script de verificación que recalcule desde
   el original y compare contra Atlas **y** contra la API, sin filtros y con
   filtros.
7. **Declarar la granularidad en la interfaz**: qué se cuenta, con qué unidad, qué
   no cambia con los filtros y qué no se puede concluir.
8. **Declarar los índices** en `backend/app/db/indexes.py`. Un índice que no
   aparece ahí no debe existir en el clúster; uno que aparece se recrea al arrancar
   la API, así que retirarlo pide quitarlo también del archivo.

## 5. Herramientas

| Script | Para qué |
|---|---|
| `scripts/verificar_atlas.py` | diagnóstico por capas y consumo del clúster, sin imprimir la URI |
| `scripts/compactar_marketing.py` | sustituye el detalle de marketing por agregados |
| `scripts/verificar_compacto.py` | concilia agregados, Atlas y API contra el CSV original |
| `scripts/medir_respuesta.py` | tiempos sin caché y con caché de las diez vistas principales |
| `scripts/compactar_atlas_vial.py` | retira campos e índices sin uso del Atlas vial |
| `scripts/compactar_cnbv.py` | retira las filas crudas y el índice redundante de la CNBV |
| `scripts/archivar_ventas.py` | archiva y retira el dataset sintético de ventas |
| `scripts/migrar_a_atlas.py` | copia un tablero al clúster por colecciones |

Los de compactación aceptan modo simulación (sin `--aplicar`); ninguno imprime
credenciales.

## 6. Cierre de la reducción (lo que se comprobó al terminar)

- **Cobertura de marketing**: población original 270 154 usuarios, muestra
  publicada 13 509 (5.00 %), semilla `ga4-muestra-2026` y predicado
  `FARM_FINGERPRINT` completos. Visible en el panel «Muestra y cobertura» y en
  `GET /api/v1/marketing/estado` → `cobertura_muestra`.
- **Consistencia indicador ↔ gráfica**: cinco comprobaciones calculadas en cada
  petición de `/marketing/resumen` (eventos ↔ serie, sesiones ↔ Sankey,
  usuarios/compradores/compras ↔ canales). Las cinco dan diferencia 0.
- **Alcance de la verificación**: toda la muestra (92 días, sin filtros) **y**
  cortes filtrados por fecha, país y dispositivo. Detalle en
  [`marketing-clientes/METODOLOGIA.md`](marketing-clientes/METODOLOGIA.md) §1.2.
- **Afinidad**: declarada independiente de los filtros con insignia permanente,
  periodo (2020-11-01 → 2021-01-31) y cobertura (261 compras, 18 categorías, 117
  pares posibles, 21 representados).
- **Exportación**: pasó de exportar un extracto de eventos inexistente a exportar
  los agregados que la vista muestra (serie diaria, canales y total) con cabecera
  de fuente, muestra, método y filtros.
- **Respuesta** (mediana de tres medidas, este equipo): marketing entre 511 y
  1 380 ms sin caché (la exportación, 1 503 ms porque calcula el resumen completo)
  y entre 84 y 110 ms con caché; Atlas vial 244–344 ms; comparativo 410–1 398 ms.
  Solo marketing tiene caché de aplicación; los otros dos repiten el cálculo.
- **Sin cambios de almacenamiento** en este cierre: no se borró ninguna colección
  ni se retiró ningún índice. Comprobado al terminar: mismas 20 colecciones y los
  mismos 164 223 documentos (73.3 MiB de datos, 26.6 MiB de índices, 99.8 MiB en
  total). Las cifras por colección oscilan unas décimas entre lecturas porque
  `collStats` no es exacto, no porque se haya escrito o borrado algo. Lo único que
  cambió está fuera de la base: campos calculados en las respuestas de la API y
  paneles en la interfaz.
