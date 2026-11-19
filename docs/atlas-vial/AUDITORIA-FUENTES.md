# Auditoría de las fuentes · Atlas vial · Ciudad de México

Este documento registra lo que se **comprobó leyendo los cinco archivos completos**
del conjunto publicado por la Secretaría de Seguridad Ciudadana (SSC) y lo que se
decidió a partir de ello. Todo lo que afirma está calculado: no hay estimaciones
ni supuestos sin marcar.

El detalle máquina-legible está en `docs/atlas-vial/auditoria-fuentes.json`,
generado con `python -m scripts.auditar_atlas_vial` (lectura completa de los CSV,
sin muestreo).

## 1. Procedencia y fechas

| Dato | Valor comprobado |
| --- | --- |
| Conjunto | `hechos-de-transito-registrados-por-la-ssc-2024-serie-de-datos-ampliada-no-comparativa` |
| Identificador en el catálogo | `e5a4b451-46c8-4912-825d-3ceb60487e68` |
| Portal | catálogo de datos abiertos de la Ciudad de México (`datos.cdmx.gob.mx`) |
| Autoridad | Secretaría de Seguridad Ciudadana de la Ciudad de México |
| Licencia | CC-BY-4.0-ESP |
| Modificación del **conjunto** en el catálogo | 2026-09-01 |
| Modificación de cada **recurso** | 2026-08-28 |
| **Descarga** de los archivos usados | 2026-11-04 |
| **Periodo real de los eventos** | 2024-01-01 a 2024-12-31 |

Las cuatro fechas son distintas y se muestran por separado en la interfaz: la
fecha del catálogo no dice cuándo se actualizaron los archivos, y ninguna de las
dos dice a qué periodo corresponden los hechos. El periodo de los eventos se
obtuvo del propio contenido (`min` y `max` del campo de fecha), no de los
metadatos.

La descarga del 2026-11-04 coincidió **byte a byte** con el catálogo: los tamaños
declarados por el portal (6 836 970 · 6 874 648 · 6 905 016 · 6 996 186 ·
7 482 991 bytes) son los de los archivos usados, y los cinco se guardaron con su
SHA-256 y su ETag.

## 2. Los cinco recursos

| Recurso | Nombre en el catálogo | Filas | Folios únicos |
| --- | --- | ---: | ---: |
| `hechos` | Hechos de tránsito registrados por la SSC | 30 655 | 30 655 |
| `sexo` | Personas lesionadas o fallecidas (por sexo) | 30 655 | 30 655 |
| `edad` | Personas lesionadas o fallecidas (por edad) | 30 655 | 30 655 |
| `usuario` | Personas lesionadas o fallecidas (por tipo de persona) | 30 655 | 30 655 |
| `vehiculos` | Vehículos involucrados en hechos de tránsito | 30 655 | 30 655 |

**Conclusión que cambia el diseño:** los cinco archivos tienen exactamente **un
registro por folio**, y los cinco conjuntos de folios son idénticos. Por eso el
cruce 1:1 es seguro y no se usan uniones (`$lookup`) en ninguna consulta: unir
tablas de este tipo multiplicaría hechos y víctimas.

## 3. Qué significan de verdad los recursos de personas

El campo `total` de los recursos de personas suma **36 266**, exactamente la suma
de `personas_lesionadas` del archivo de hechos; y para **cada uno de los 30 655
folios** `total` coincide con `personas_lesionadas` de su hecho. Además hay 495
filas con `condicion_persona = fallecida` que suman 159, y el archivo de hechos
declara 533 personas fallecidas (159 de ellas registradas con nombre y detalle).

Consecuencias, aplicadas en todo el tablero:

* los recursos de personas **no** describen a todas las víctimas: describen **a la
  persona principal del expediente**, una por hecho;
* no se puede repartir el total de lesionadas entre sexos, edades o tipos de
  persona: se presentan como **«hechos con registro de…»** y cada fila declara su
  cobertura;
* los desgloses **no se suman entre sí** (describen a las mismas personas); **sí** se
  pueden cruzar entre ellos —edad × tipo de persona— porque ambos campos describen al
  mismo registro del folio (corrección de la auditoría del grano, §6 de
  `AUDITORIA-GRANO.md`);
* los desgloses de persona **no llevan consecuencias**: la colección operativa no
  guarda si la persona registrada fue la lesionada o la fallecida, así que publicar
  «fallecidos por edad o sexo» presentaría (B) como (A). Está excluido;
* el archivo de vehículos describe **el vehículo principal** del hecho.

## 4. Calidad de los datos

| Hallazgo | Cifra | Decisión |
| --- | ---: | --- |
| Filas por archivo | 30 655 (idéntico en los cinco) | Se valida en cada sincronización |
| Folios duplicados | 0 | La importación falla si aparecen |
| Coordenadas ausentes o no utilizables | 3 | Se conservan, se cuentan y no se asignan a ninguna alcaldía |
| Coordenadas fuera de la Ciudad de México | 0 | Se contarían aparte |
| Edades sin información (`SD`, `NA`, `2O`, `9M`) | 1 660 | «Sin dato»; nunca cero. `2O` se corrige a 20 y `9M` son meses de vida (0 años) |
| Sexo sin dato | 1 005 | «Sin dato» visible en la distribución |
| Tipos de persona sin dato | 0 | — |
| Vehículo sin dato | 2 | «Sin dato» visible |
| Desajuste entre la alcaldía de texto y la geometría oficial | 1 053 | Se informa; **no** se corrige a la fuerza |
| Alcaldía de texto no reconocida | 1 | El hecho se conserva sin alcaldía y se cuenta aparte |
| Valores vacíos en todo el conjunto | 1 (unidad_medica_de_apoyo) | Se conserva el vacío |

### Codificación

Los cinco archivos son UTF-8 con BOM y separador coma. Dos campos traen **doble
codificación**:

* `no_vehiculo` (archivo de vehículos): **todas** las filas traen «VehÃ­culo N»,
  que se repara a «Vehículo N»;
* `origen` (archivo de hechos): 3 filas traen «BOTÃ“N DE AUXILIO», reparadas a
  «BOTÓN DE AUXILIO». Este caso llega con la comilla tipográfica de cp1252, así
  que la reparación se intenta también por esa vía.

La regla es la misma en los dos casos y está en
`backend/app/atlas/normalizacion.py`: se repara **solo** si la marca de doble
codificación está presente y la reparación produce texto válido; si no, se deja
el valor original. El valor original se conserva siempre junto al normalizado.

### Encabezado duplicado

El recurso «por tipo de persona» repite el encabezado `condicion_persona`:

* **primera** aparición → **consecuencia** de la persona (lesionada / fallecida);
* **segunda** aparición → **tipo de persona** (peatón, conductor, pasajero,
  ciclista, motociclista…).

Las dos columnas se conservan con nombres distintos
(`consecuencia` y `tipo_usuario`) y el duplicado queda registrado en la tabla
leída (`duplicados: {"condicion_persona": 2}`) para poder auditarlo. Ninguna
columna se sobrescribe.

### Categorías

* 6 tipos de evento: `Choque`, `Derrapado`, `Atropellado`, `Caída de ciclista`,
  `Caída de pasajero`, `Volcadura`.
* 7 clasificaciones de vialidad; erratas reales corregidas en la forma canónica y
  conservadas en el valor original: `VIA PRIMA` → Vía primaria,
  `VAC  ANULAR` → Vía de acceso controlado (anular).
* 9 tipos de intersección; `semaforizada` es booleano con **un** valor sin dato.
* 17 cadenas distintas de alcaldía que corresponden a 16 demarcaciones (una no se
  reconoce) y variantes de mayúsculas en el día de la semana.

## 5. Lo que el conjunto **no** permite afirmar

* No hay denominadores de población, viajes ni tránsito: **no** se calculan tasas
  por habitante ni por vehículo.
* No hay causa del hecho: ninguna lectura del tablero se presenta como causal.
  `semaforizada` describe la intersección, no el estado del semáforo en el
  momento del hecho.
* La serie es anual y la propia fuente la publica como **no comparativa**: no se
  construyen series históricas ni comparaciones entre años.
* No hay datos personales (nombre, documento, domicilio): solo el folio del
  expediente, la fecha, la ubicación y los conteos.

## 6. Geometría de las alcaldías

| Dato | Valor |
| --- | --- |
| Conjunto | «Límite de Alcaldías (áreas geoestadísticas municipales)» |
| Portal | `https://datos.cdmx.gob.mx/dataset/alcaldias` |
| Licencia | CC-BY-4.0-ESP |
| Versión | Marco Geoestadístico 2020 (INEGI), publicado por la CDMX |
| Archivo usado | `alcaldias-cdmx.geojson` (774 029 bytes, 16 polígonos) |
| Simplificación | Douglas-Peucker con tolerancia 0.0006 ≈ 1 035 vértices en total |

La geometría se usa para tres cosas: dibujar el coroplético, comprobar la
pertenencia espacial de cada coordenada y detectar los desajustes de alcaldía. El
mapa **no** usa teselas ni servicios de terceros: solo este GeoJSON y los puntos
publicados, servidos por la propia API.

## 7. Reproducir la auditoría

```bash
cd backend
python -m scripts.auditar_atlas_vial          # escribe docs/atlas-vial/auditoria-fuentes.json
python -m pytest tests/test_atlas_vial.py -q   # pruebas del proceso y de la API
python -m scripts.sincronizar_atlas_vial       # misma ruta que la tarea programada
```
