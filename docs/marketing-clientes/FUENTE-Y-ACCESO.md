# Fuente, extracción y persistencia

De dónde salen los datos, cómo se extraen una sola vez, qué se publica en MongoDB
Atlas y dónde queda la copia original. El tablero funciona **sin Google Cloud**: la
API nunca consulta BigQuery, solo lee la versión publicada en Atlas.

```
BigQuery (muestra pública GA4)  →  extracción (bq CLI, solo preparación)
        →  copia original comprimida + manifiesto (backend/data/marketing/…)
        →  agregados calculados fuera de Atlas
        →  publicación por versiones en MongoDB Atlas
        →  API FastAPI (lee la versión activa)  →  tablero React
```

La regla de almacenamiento que siguen todos los tableros del portafolio —qué se
publica, qué se queda fuera y con qué presupuesto— está en
[`../ALMACENAMIENTO.md`](../ALMACENAMIENTO.md).

## 1. Fuente

| | |
|---|---|
| Conjunto | `bigquery-public-data.ga4_obfuscated_sample_ecommerce` (tablas `events_*`) |
| Documentación | <https://developers.google.com/analytics/bigquery/web-ecommerce-demo-dataset> |
| Esquema | <https://support.google.com/analytics/answer/7029846> |
| Periodo documentado | 2020-11-01 → 2021-01-31 (92 días) |
| Condición | muestra **histórica y ofuscada**: puede contener valores de marcador y no representa resultados comerciales actuales |

El acceso se hizo con **BigQuery Sandbox**: proyecto `ga4-marketing-sample-2026`
sin cuenta de facturación, API de BigQuery habilitada y consultas con
`--location=US`. No se habilitó facturación en ningún momento.

## 2. Muestra: 5 % de usuarios, no de filas

Contar usuarios distintos exige fijar primero **qué personas** entran al estudio:
si se muestrearan filas, un mismo usuario aparecería unos días sí y otros no.

```
MOD(ABS(FARM_FINGERPRINT(CONCAT('ga4-muestra-2026|', user_pseudo_id))), 10000) < 500
```

- Semilla `ga4-muestra-2026`, umbral 5 % → **13 509 usuarios** (de los 270 154
  usuarios distintos del conjunto completo, contados en la extracción sin muestra).
- La misma semilla da siempre la misma muestra: la extracción es reproducible.
- El predicado se aplica en el `WHERE` de todas las consultas; las métricas no
  aditivas (usuarios, compradores) y las aditivas (eventos, sesiones) describen el
  mismo conjunto de personas.
- Lo que se publica **no es una muestra de resultados**: los agregados cubren
  todas las sesiones, compras y eventos de esas 13 509 personas. Agrupar no es
  muestrear.

## 3. Extracción (tarea de preparación)

```powershell
# 1) extraer la copia original (no toca MongoDB)
python -m scripts.importar_marketing --extraer --carpeta data\marketing\muestra5 --muestra 5

# 2) si se interrumpe, continúa donde se quedó (no repite consultas ya hechas)
python -m scripts.importar_marketing --extraer --reanudar --carpeta data\marketing\muestra5

# 3) cargar esa copia en Atlas y publicar una versión
python -m scripts.importar_marketing --desde-local data\marketing\muestra5 --forzar

# 4) sustituir el detalle por los agregados que el tablero usa
python -m scripts.compactar_marketing --aplicar
```

La extracción escribe **un `CSV.gz` por entidad** y un `manifiesto.json` con la
fuente, la semilla y el porcentaje de la muestra, el periodo solicitado y el
observado, la fecha de extracción y de carga, el hash SHA-256 de cada archivo, el
hash del SQL de cada entidad, el esquema detectado y la validación.

### Volumen de la copia original (muestra del 5 %)

| Entidad | Filas |
|---|---:|
| `resumen` (día × dimensiones) | 13 892 |
| `usuarios` (usuario × día) | 15 860 |
| `sesiones` (recorridos reconstruidos) | 17 906 |
| `compras` deduplicadas | 261 |
| `articulos` (líneas de compra) | 719 |
| `embudo` (día × dimensiones × paso) | 33 484 |
| `cohortes` (cohorte × semana × dimensión) | 2 185 |
| `categorias` (día × dimensiones × categoría) | 10 598 |
| `eventos` (extracto de detalle) | 23 059 |
| **Total** | **117 964** |

La copia original vive en `backend/data/marketing/muestra5` (fuera de Git) y **no**
se publica: el tablero solo lee Atlas. Es el material con el que se recalculan los
agregados y con el que se concilia cada compactación.

## 4. Persistencia: MongoDB Atlas

- La URI y las credenciales viven **solo** en el entorno del backend (`.env`,
  fuera de Git). El navegador nunca las ve: consume la API.
- Con `mongodb+srv://` la conexión va cifrada con TLS y el driver comprime con
  zlib.
- Base `hugo_portfolio`, colecciones propias (`marketing_*`, `atlas_*`, `cnbv_*`).
  El clúster es compartido con otros proyectos: este portafolio no toca bases
  ajenas.
- La API no necesita credenciales de Google para arrancar, consultar, filtrar ni
  exportar.

### Qué se publica (modelo compacto)

| Colección | Granularidad | Uso |
|---|---|---|
| `marketing_resumen` | día × canal × dispositivo × país | eventos y sesiones por día |
| `marketing_usuarios` | usuario × día | usuarios distintos, canal de adquisición fijo |
| `marketing_compras` | compra deduplicada | compras, compradores, ingresos |
| `marketing_embudo` | día × dimensiones × paso | sesiones por paso (orden y ventana aplicados en SQL) |
| `marketing_cohortes` | cohorte × semana × dimensión | retención y compra por semana |
| `marketing_categorias` | compra × categoría | compras que incluyen la categoría, unidades e importe de línea |
| `marketing_flujo` | día × canal × dispositivo × país × resultado | Sankey de adquisición → compra |
| `marketing_tiempos` | día × canal × dispositivo × país × transición × tramo | tiempo entre etapas del embudo |
| `marketing_afinidad` | par de categorías | compras conjuntas |
| `marketing_estado`, `marketing_importaciones` | versión | puntero de la versión activa y manifiesto |

Ningún documento guarda el identificador original: se aplica un hash SHA-256 con
sal por versión (32 caracteres).

### Comprobación segura (no imprime la URI)

```powershell
cd backend
python -m scripts.verificar_atlas          # capas: configuración, DNS, red, TLS, auth
python -m scripts.verificar_compacto       # agregados, Atlas y API contra el original
```

## 5. Reproducir el estado publicado

```powershell
cd backend
.venv\Scripts\python.exe -m scripts.importar_marketing --estado
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8010
```

`--estado` devuelve la versión activa, el periodo, los conteos por colección y la
ruta del manifiesto.

## 6. Configuración de la conexión: precedencia y diagnóstico

`backend/app/config.py` usa `env_file=(PROJECT_ROOT/.env, backend/.env)`:

| Origen | Prioridad |
|---|---|
| Variables del **sistema/proceso** (`$env:MONGODB_URI`) | 1 (manda) |
| `backend/.env` | 2 |
| `.env` de la raíz | 3 |
| `environment:` de **Docker Compose** | dentro del contenedor manda sobre los archivos |

Hoy la API del portafolio corre **fuera de Docker** (uvicorn con el `.venv`, en
`127.0.0.1:8010`) y lee el `.env` de la raíz, que tiene **una** `MONGODB_URI`
apuntando a Atlas. Docker Compose exige esa misma variable
(`${MONGODB_URI:?…}`) y ya no levanta un MongoDB local propio.

### Diagnóstico por capas

`backend/app/db/diagnostico_mongo.py` separa cinco capas y nunca imprime la URI:

1. **configuración** — forma de la cadena, marcadores `<…>` sin reemplazar,
   caracteres especiales sin codificar (`@ : / ? # %`);
2. **DNS** — registros `SRV`/`TXT` del clúster;
3. **red / IP** — TCP al 27017 (una IP no autorizada se detiene aquí);
4. **TLS** — negociación y certificado;
5. **autenticación / autorización** — `ping`, lectura y escritura mínimas.

### Estado de la última comprobación (2026-11-05)

| Capa | Resultado |
|---|---|
| Configuración | OK (URI completa, sin marcadores) |
| DNS | OK (3 nodos `ac-qrturak-shard-00-0x`) |
| Red / IP | OK (TCP 27017 accesible · IP del equipo autorizada) |
| TLS | OK (TLS 1.3, certificado verificado) |
| Autenticación | OK (`ping`, lectura y escritura) |

La versión publicada vive en Atlas y el tablero la sirve desde ahí: no hay
instancia local de respaldo ni credenciales de Google en la API.
