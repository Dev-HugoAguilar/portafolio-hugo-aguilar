# API y métricas · Atlas vial · Ciudad de México

Documento de referencia del tablero «Atlas vial · Ciudad de México»: qué
endpoints existe, qué devuelve cada cifra y cómo se actualiza la versión
publicada. Complementa `docs/atlas-vial/AUDITORIA-FUENTES.md`, que registra lo
comprobado en los archivos originales.

## Arranque local

```bash
# 1. API (sirve la versión publicada de MongoDB)
powershell -ExecutionPolicy Bypass -File backend/iniciar-api.ps1
# equivalente manual:
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010

# 2. Sitio del portafolio (estático, sin empaquetador)
cd dist
python -m http.server 8000 --bind 127.0.0.1
```

El guion `backend/iniciar-api.ps1` levanta la API en el 8010, espera a que
`/api/v1/health/ready` responda `ready`, comprueba con una petición real que los
orígenes del portafolio reciben `Access-Control-Allow-Origin` y deja los
registros de uvicorn a la vista. Si ya hay una instancia en marcha, no arranca
una segunda.

El tablero vive en `http://127.0.0.1:8000/#/area/dashboards/atlas-vial`.

La base de la API se resuelve, en este orden: `opts.apiBase` al montar el módulo,
`window.PORTFOLIO_ATLAS_API` y, por omisión,
`http://127.0.0.1:8010/api/v1/atlas-vial`.

## Endpoints

Todos bajo `/api/v1/atlas-vial`. Los parámetros de filtro son **los mismos en
todos** los endpoints (están normalizados en `app/api/deps.py`).

| Método | Ruta | Qué devuelve |
| --- | --- | --- |
| GET | `/estado` | versión publicada, última sincronización correcta, último intento y periodo real de los eventos |
| GET | `/catalogo` | fuente, cobertura, valores reales de cada filtro y texto de metodología |
| GET | `/resumen` | hechos, personas lesionadas, personas fallecidas y hechos con fallecimientos, con base y denominador |
| GET | `/territorio` | agregado por alcaldía y, opcionalmente, puntos del mapa (`incluir_puntos`) |
| GET | `/puntos` | todos los puntos geolocalizados en listas paralelas (`folios`, `lat`, `lon`, `lesionadas`, `fallecidas`) |
| GET | `/geometria` | GeoJSON de las 16 alcaldías con su atribución |
| GET | `/tiempo` | serie (día/semana/mes), matriz día × hora y distribuciones del entorno vial |
| GET | `/personas` | desgloses por tipo de persona, sexo, grupos de edad y tipo de vehículo, con su cobertura |
| GET | `/comparar` | dos alcaldías con el mismo periodo, las mismas métricas y la misma escala |
| GET | `/tabla` | filas paginadas y ordenables del subconjunto filtrado |
| GET | `/evento/{folio}` | detalle de un hecho (el folio lleva barras: `C2C/20241231/00196`) |
| GET | `/exportar` | CSV del subconjunto filtrado con cabecera documentada |

### Parámetros de filtro

| Parámetro | Tipo | Significado |
| --- | --- | --- |
| `desde`, `hasta` | `AAAA-MM-DD` | intervalo sobre la fecha del hecho (inclusivo) |
| `alcaldia` | repetible | una o varias alcaldías |
| `tipo_evento` | repetible | tipo de evento en forma canónica |
| `consecuencia` | repetible | `con_fallecimientos` · `solo_lesionados` |
| `tipo_usuario` | repetible | tipo de persona registrado |
| `tipo_vehiculo` | repetible | tipo de vehículo registrado |
| `vialidad` | repetible | clasificación de la vialidad |
| `semaforizada` | repetible | `si` · `no` · `sin_dato` |
| `sexo` | repetible | sexo registrado |
| `edad_min`, `edad_max` | entero 0–120 | rango de edad registrada |
| `buscar` | texto ≤ 80 | folio, colonia o vialidad (el término se escapa: nunca es una expresión regular) |
| `bbox` + `filtrar_por_zona=true` | `lon_min,lat_min,lon_max,lat_max` | recorte por la zona visible del mapa; solo se aplica si se pide |

Reglas, documentadas también en la interfaz:

* **dentro de una dimensión** los valores se combinan con **OR**: dos alcaldías
  suman sus hechos;
* **entre dimensiones distintas** se combina con **AND**: alcaldía Y tipo de
  evento;
* el recorte por zona **no** se aplica por mover el mapa: exige la petición
  explícita, de modo que desplazarse nunca cambia los totales.

## Errores, CORS y reintentos

Las respuestas de error también viajan en JSON y conservan las cabeceras CORS del
origen permitido. Si no las llevaran, el navegador informaría de un problema de
CORS aunque la causa fuera otra: es exactamente lo que ocurría cuando una consulta
pesada recibía un 500.

| Situación | Código | Cuerpo |
| --- | --- | --- |
| Fallo interno no controlado | 500 | `detail` genérico; la traza queda en el registro del servidor |
| Corte de MongoDB (`PyMongoError`) | 503 | «La base de datos no respondió a tiempo. Vuelve a intentarlo en unos segundos…» |
| Origen no permitido | — | sin `Access-Control-Allow-Origin` (el preflight responde 400) |

`reintentar_lectura()` (`app/db/mongo.py`) repite **solo lecturas idempotentes**
hasta tres veces ante `AutoReconnect`/`NetworkTimeout`, con espera creciente;
cualquier otro error se propaga en el primer intento. La usa `/puntos`, que
recorre 30 655 documentos y es la lectura más expuesta a que el clúster cierre la
conexión a mitad del cursor.

El tablero muestra el `detail` que devuelve la API y ofrece «Reintentar», que
vuelve a pedir el catálogo sin recargar la página.

## Métricas

| Métrica | Cómo se calcula | Base |
| --- | --- | --- |
| Hechos | conteo de folios únicos del conjunto filtrado | 30 655 en el conjunto completo |
| Personas lesionadas | suma de `personas_lesionadas` del archivo de hechos | 36 266 |
| Personas fallecidas | suma de `personas_fallecidas` del archivo de hechos | 533 |
| Hechos con fallecimientos | folios con `personas_fallecidas > 0` | 512 (1,67 % de 30 655) |
| Hechos con registro de… | folios cuyo registro de persona o vehículo tiene ese valor | depende del valor; cada fila informa su cobertura |

Reglas que el código hace cumplir y las pruebas verifican:

* **personas ≠ hechos**: los conteos de personas se suman con los campos del
  archivo de hechos, nunca multiplicando por los desgloses;
* **ningún desglose se suma con otro**: sexo, edad, tipo de persona y tipo de
  vehículo describen a la misma persona registrada desde ángulos distintos;
* **los desgloses de persona no llevan consecuencias**: la colección operativa no
  guarda si la persona registrada fue la lesionada o la fallecida, así que sexo, edad
  y tipo de persona solo se publican como *hechos con ese registro*. En particular,
  **edad × personas fallecidas está excluido**: en los hechos con fallecimientos, 406
  de las 533 muertes no tienen edad y 122 de las 127 restantes quedan en 0–14 frente a
  5 en 15–64, de modo que la edad describe el registro del hecho y no a quien murió
  (`AUDITORIA-GRANO.md` §3);
* **edad × tipo de persona sí es válido** para la persona registrada: los dos campos
  viven en el mismo documento y la unión por folio ya se hizo en la importación (1:1,
  sin multiplicar filas);
* los valores desconocidos se muestran como **«Sin dato»** agrupado y nunca como
  cero;
* los porcentajes declaran su **denominador** (hechos del filtro vigente), no la
  población de la alcaldía;
* los hechos **sin coordenadas utilizables** se conservan en los totales, se
  cuentan y no se asignan a ninguna alcaldía.

Nomenclatura, unidades y frases permitidas o prohibidas: `DICCIONARIO-METRICAS.md`.

## Hallazgos de la ficha

La ficha del proyecto muestra «Hallazgos del análisis» **calculados con los
filtros vigentes** (no texto fijo). Se apoyan solo en datos devueltos por la API:

| Hallazgo | Datos que usa |
| --- | --- |
| Concentración territorial | /territorio (alcaldía con más y con menos hechos y su porcentaje sobre el filtro) |
| Hechos con personas fallecidas | /resumen (hechos con fallecimientos, personas fallecidas y lesionadas) |
| Tipo de evento | /tiempo (tipo más frecuente y **% de sus hechos con al menos una persona fallecida**) |
| Cuándo ocurren | /tiempo (hora y día con más hechos y peso de 18–20 h) |
| Tipo de persona registrado | /personas (registro más frecuente y su cobertura) |

Todas las frases son descriptivas; ninguna afirma una causa ni usa «letalidad»,
«riesgo» o «probabilidad», que el diccionario prohíbe. Si un hallazgo no se
puede sostener con los filtros activos (por ejemplo, con cero hechos) se omite en
lugar de rellenarse con texto genérico.

## Actualización

El navegador **nunca** descarga los CSV: solo consulta la API. La sincronización
la ejecuta el backend con el mismo proceso que la importación manual:

```bash
cd backend
.venv/Scripts/python.exe -m scripts.sincronizar_atlas_vial
```

Qué hace:

1. resuelve el catálogo oficial (CKAN) y los cinco recursos por su identificador;
2. descarga con validación condicional (`ETag` / `Last-Modified`) y calcula el
   SHA-256 de cada archivo;
3. si el contenido de los cinco no cambió, conserva la versión publicada
   (`sin_cambios`) sin volver a procesar;
4. procesa en una carpeta temporal y valida: columnas esperadas, folios únicos,
   igualdad de folios entre los cinco recursos, coherencia de cifras y cobertura;
5. publica de forma **atómica** (índice único por versión + folio y un solo
   cambio de puntero en `atlas_estado`);
6. si algo falla, **conserva la última versión válida** y registra el intento como
   `rechazada` con su motivo;
7. deja un registro rotativo en `backend/logs/atlas-vial.log`.

Un cerrojo en `atlas_bloqueos` impide dos ejecuciones simultáneas.

Códigos de salida del proceso programado: `0` publicado o sin cambios, `1` fallo
(la versión anterior sigue publicada), `2` ya había una sincronización en curso.

### Estado real de la automatización

**La tarea programada no está activa.** En este entorno no hay acceso al
programador de tareas ni al despliegue, así que se entrega la configuración lista
para activarla, junto con el comando exacto:

* `deploy/atlas-vial/registrar-tarea.ps1` — registra la tarea en el Programador de
  tareas de Windows (o la actualiza si ya existe);
* `deploy/atlas-vial/atlas-vial-sincronizacion.xml` — definición equivalente para
  importar a mano;
* `deploy/atlas-vial/compose-servicio.yml` — servicio equivalente para un
  despliegue con Docker Compose.

Mientras no se ejecute esa activación, la versión publicada solo cambia cuando
alguien corre el comando de sincronización a mano. El tablero lo dice: muestra la
**última sincronización correcta** y la versión publicada, y no afirma en ningún
sitio que se actualice sola.
