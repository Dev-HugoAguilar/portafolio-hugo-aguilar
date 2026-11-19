# Comparativo financiero del sector bancario mexicano — datos reales de la CNBV

Primer dashboard del portafolio con **información pública real**. Sustituye, para
este tablero, al dataset sintético de desarrollo (que se conserva y sigue marcado
como exclusivo de pruebas).

> **Estado**: integración validada para los **7 boletines importados**
> (2023-10, 2024-01, 2024-04, 2024-07, 2024-08, 2024-09, 2024-10). No está
> validada "de punta a punta para toda la CNBV": el boletín en Excel deja de
> publicarse después de 2024-10 y los meses posteriores solo existen en PDF, que
> no se importan.

---

## 1. Archivo oficial realmente descargado

| Dato | Valor |
|---|---|
| Organismo | Comisión Nacional Bancaria y de Valores (CNBV) |
| Producto | **Boletín Estadístico de Banca Múltiple** (sector 40 del Portafolio de Información) |
| Portal | <https://portafolioinfo.cnbv.gob.mx/Paginas/Inicio.aspx> |
| Página oficial de origen | <https://www.cnbv.gob.mx/SECTORES-SUPERVISADOS/BANCA-MULTIPLE/Paginas/Información-Estadística.aspx> |
| Patrón de archivo | `BE_BM_AAAAMM.xlsx` |
| URL base de descarga | `https://portafolioinfo.cnbv.gob.mx/PortafolioInformacion/` |
| Ejemplo (2024-10) | `https://portafolioinfo.cnbv.gob.mx/PortafolioInformacion/BE_BM_202410.xlsx` |
| Formato | XLSX (hojas de cálculo, sin macros) |
| Tamaño típico | 1,7 – 2,8 MB por mes |

Los archivos se descubrieron listando la **biblioteca de documentos pública** del
portal (`/PortafolioInformacion/`), no adivinando rutas. Las URLs que el sitio
antiguo todavía muestra (`portafolioinfdoctos.cnbv.gob.mx/.../Indicadores
financieros.xlsm`) devuelven **404**: están obsoletas y no se usaron.

### 1.1 Boletines importados (con hash verificado)

| Periodo | Archivo | Bytes | SHA-256 (12 primeros) |
|---|---|---|---|
| 2023-10 | `BE_BM_202310.xlsx` | 1 725 164 | `fbb576f312d7` |
| 2024-01 | `BE_BM_202401.xlsx` | 2 025 385 | `6a33e9998f8f` |
| 2024-04 | `BE_BM_202404.xlsx` | 2 056 983 | `a2245246d72a` |
| 2024-07 | `BE_BM_202407.xlsx` | 2 709 157 | `2386121912c1` |
| 2024-08 | `BE_BM_202408.xlsx` | 2 715 925 | `93309bf3fe46` |
| 2024-09 | `BE_BM_202409.xlsx` | 2 045 345 | `1dd50987b9e2` |
| 2024-10 | `BE_BM_202410.xlsx` | 2 817 599 | `9f74f43c9e56` |

Los hashes completos, la URL, la fecha de importación y la revisión quedan en la
colección `cnbv_boletines` y se exponen en `GET /cnbv/banca-multiple/catalogo`.

### 1.2 Cobertura real (verificada una por una)

* El boletín en XLSX existe para **40 meses** entre 2020-05 y 2024-10; la lista de
  periodos comprobados está en `app/cnbv/sources.py`
  (`PERIODOS_VERIFICADOS`). El importador **rechaza** cualquier periodo que no
  esté en esa lista: no se inventan URLs.
* **Hay huecos reales**: 2024-06, 2023-08, 2023-09, 2021-03 a 2021-11, 2020-09 y
  2020-10 no están publicados en Excel. Se comprobó que `BE_BM_202406.xlsx`
  responde **HTTP 404**.
* A partir de 2025-03 el boletín solo se publica en PDF (`40_BE_*.pdf`), que
  **no** se importa.
* El número de instituciones **cambia** entre periodos (50 en 2023-10; 51 en
  2024). El conjunto no es una serie constante.

---

## 2. Periodos y campos comprobados

### 2.1 Estructura del archivo

Hoja principal: **`EF Resumen`** (estados financieros resumidos por institución).
Hojas auxiliares: `Indicadores` (porcentajes), `Nota` (metodología), `Portada`,
`Índice`, `Cartera y calif`, `CaptRec`, entre otras (33 hojas en 2024; 5 en el
boletín `40_BE_*`, que es otro producto).

| Comprobación | Resultado |
|---|---|
| Unidad declarada | `"... de 2024\nMillones de pesos"` → **millones de pesos** (no miles) |
| Fila del encabezado | **No es fija**: fila 5 en 2022-05 y 2023-01; fila 6 en 2024. Se detecta buscando la celda `Sistema`. |
| Columna de conceptos | La anterior a `Sistema` (columna B) |
| Instituciones | A la derecha de `Sistema`; **orden y número cambian** por periodo (se identifican por nombre, nunca por posición) |
| Conceptos por boletín | **158** filas con valores (+ 2 notas al pie que se rechazan) |
| Conceptos repetidos | 11 nombres se repiten con distinto significado (`Créditos Comerciales` en etapa 1, 2 y 3). El identificador lleva el número de ocurrencia: `creditos_comerciales#1`, `#2`, `#3`. |
| Notas al pie | Filas `(1) ...` y `(2) ...` dentro de la columna de conceptos → se rechazan y se informan |
| Celdas vacías | 100–102 por boletín → **no se convierten en cero** ni se imputan |
| Estructura entre periodos | La secuencia de 163 textos es **idéntica** entre 2023-01 y 2024-10. En 2022-05 cambia la capitalización ("Estado de situación financiera") y aparece `Capital Social*`; el slug normalizado lo resuelve. |
| Erratas de la fuente | El boletín de 2024-09 titula "Septimebre de 2024": se emite un aviso y el periodo se toma del nombre del archivo |
| Periodo del dato | Se toma del **nombre del archivo** y se contrasta con el título; si se contradicen, el archivo se rechaza |

### 2.2 Saldos vs flujos acumulados (comprobado con datos)

El estado de resultado integral se publica **acumulado del ejercicio**, no mensual:

| Periodo | `Resultado Neto` (Sistema, millones MXN) |
|---|---|
| 2024-01 | 26 860,6 |
| 2024-02 | 48 368,0 |
| 2024-09 | 222 656,9 |
| 2024-10 | 245 903,9 |

Por eso cada concepto lleva `naturaleza`:

* `saldo` → estado de situación financiera y cuentas de orden. Se compara con el
  **periodo importado inmediatamente anterior**.
* `flujo_acumulado` → estado de resultado integral. Se compara **solo con el
  mismo mes del año anterior**; nunca con el mes previo, y no se suman los meses.

### 2.3 La columna `Sistema`

Es el **agregado publicado por la CNBV**. Se usa como denominador de las
participaciones y **nunca se suma con las instituciones** (sería doble conteo).
La API la devuelve como primera fila con `es_sistema: true` y participación 100 %.

### 2.4 Condiciones de uso y atribución

* **Atribución**: "Fuente: Comisión Nacional Bancaria y de Valores (CNBV),
  Boletín Estadístico de Banca Múltiple." Se incluye en cada respuesta
  (`fuente.atribucion`, `boletines[].url`).
* La nota metodológica del boletín advierte que la información proviene de los
  reportes regulatorios de las entidades y **"puede ser modificada derivado de
  las revisiones internas"**; además, **"las cifras aquí contenidas no se
  actualizan en el tiempo"** (para series históricas la CNBV remite al Portafolio
  de Información).
* En los archivos descargados **no hay una licencia de datos abiertos explícita**:
  aplican los términos de uso del portal de la CNBV. Por eso el proyecto solo
  cita la fuente, **no redistribuye** los archivos y los mantiene fuera de Git
  (`backend/data/` está en `.gitignore`).

---

## 3. Registros reales importados

| Métrica | Valor |
|---|---|
| Periodos | **7** (2023-10, 2024-01, 2024-04, 2024-07, 2024-08, 2024-09, 2024-10) |
| Hechos (periodo × institución × concepto) | **56 248** |
| Filas del archivo original (contadas, no almacenadas) | **1 106** (158 por boletín) |
| Indicadores publicados (ROA, ROE × 3 fechas × institución) | **2 116** |
| Celdas vacías no imputadas | **712** (100 en 2023-10 y 102 en los demás) |
| Notas al pie rechazadas | 14 (2 por boletín) |
| Conceptos distintos | 158 (149 identificadores únicos) |
| Instituciones | 51 columnas por boletín (Sistema + 50/51 instituciones) |

### 3.1 Separación de datos y metadatos

| Colección | Contenido |
|---|---|
| `cnbv_hechos` | **Normalizado**: `periodo`, `institucion_id`, `concepto_id`, `seccion`, `naturaleza`, `valor`, `unidad`, `fila`/`columna` de origen |
| `cnbv_indicadores` | **Normalizado**: porcentajes publicados (ROA, ROE) con su nota |
| `cnbv_boletines` | **Metadatos de importación**: URL, archivo, SHA-256, bytes, fecha, periodo, revisión, conteos, ausentes y rechazados |

Reglas aplicadas:

* **Idempotencia**: cada registro se escribe con *upsert* sobre su clave natural.
  Volver a importar el mismo archivo responde `sin_cambios` y no duplica nada.
* **Revisiones**: si el hash del archivo cambia, se crea una revisión nueva; la
  anterior **se conserva** marcada como no vigente (nunca se sobrescribe en
  silencio). Las consultas solo sirven la revisión vigente.
* **Ausentes ≠ cero**: una celda vacía no genera hecho y se cuenta en el reporte.
* **Unidades originales**: los valores se guardan en millones de pesos exactamente
  como vienen; solo se redondean los porcentajes derivados.
* **Solo lo que el tablero usa**: las filas del .xlsx tal cual **no** se guardan en
  Atlas (el clúster gratuito está al límite). Se cuentan al importar y ese número
  queda en la ficha del boletín, que es de donde lo lee la cobertura; el archivo
  original con su SHA-256 se conserva en `backend/data/cnbv` y sigue disponible
  para conciliar. El detalle de cada hecho conserva su hoja, fila y columna de
  origen, así que cualquier cifra se puede volver a localizar en el archivo.

---

## 4. Métricas que ya se pueden mostrar

Todas se calculan sobre los hechos importados y son verificables en el archivo.

| Métrica | Fórmula / origen |
|---|---|
| Valor del sector por concepto | Columna `Sistema` del boletín, sin transformación |
| Valor por institución | Celda de la institución para ese concepto |
| Participación de mercado | `100 × valor_institución / valor_Sistema` (mismo periodo y concepto) |
| Variación absoluta | `valor_actual − valor_periodo_comparable` |
| Variación relativa | `100 × (valor_actual − valor_anterior) / |valor_anterior|` |
| Participación de la mayor institución | `100 × mayor valor / Sistema` |
| Concentración de las 5 mayores | `100 × Σ(5 mayores valores) / Sistema` |
| Mediana de instituciones | Mediana de **valores** (no de porcentajes) |
| Máximo / mínimo por institución | Sobre valores del periodo |
| Ranking | Posición por valor descendente (del sector completo) |
| ROA y ROE | **Publicados por la CNBV**, se muestran tal cual (nota: flujo 12 meses) |

Ejemplos reales (2024-10, `activo#1`, millones MXN):

* Sistema: **14 798 027,40**; periodo anterior (2024-09): 14 248 939,91 →
  variación **+3,85 %**.
* BBVA México: 3 276 217,49 → participación **22,14 %**, posición 1.
* Concentración de las 5 mayores: **64,10 %** del activo del sector.
* `resultado_neto#1`: 245 903,86 con comparación contra **2023-10** (no contra
  2024-09) por ser flujo acumulado: **+7,86 %**.

### 4.1 Lo que deliberadamente NO se calcula

* **ROA, ROE o morosidad propios**: los publicados por la CNBV se muestran tal
  cual; no se recalculan con denominadores o periodos que podrían no coincidir.
* **Sumas de saldos a través del tiempo**: no hay "activo acumulado del año".
* **Mezcla de flujos y saldos**: la comparación de un flujo acumulado nunca usa el
  mes inmediato anterior.
* **Promedio de porcentajes**: no se promedian ratios; la mediana que se devuelve
  es de valores.
* **Tipo de cartera por monto total**: el boletín parte la cartera por **etapa**
  (1, 2, 3) en `EF Resumen`; el corte por tipo con monto y porcentaje está en la
  hoja `Cartera y calif`, que **todavía no se importa** (ver §7).

---

## 5. Endpoints

Base: `http://127.0.0.1:8000/api/v1/cnbv/banca-multiple` (uvicorn) o `:8001`
(Docker Compose). Los importes van en `valor` con `unidad: "millones_mxn"`.

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/catalogo` | Fuente, condiciones de uso, boletines importados (URL, hash, revisión), periodos, 158 conceptos con unidad y naturaleza, instituciones y grupos de cartera |
| GET | `/resumen` | KPIs del sector, comparación comparable, tabla por institución (participación, variación, posición), serie del sector, ausentes y advertencias |
| GET | `/series` | Series por concepto e institución en todos los periodos importados |
| GET | `/detalle` | Tabla paginada de hechos con archivo y fila de origen (conciliable) |
| GET | `/indicadores` | ROA y ROE publicados por la CNBV, con su nota |

### 5.1 Filtros

| Parámetro | Aplica a | Reglas |
|---|---|---|
| `periodo` | resumen, detalle, indicadores | `AAAA-MM`. Si se omite, se usa el más reciente importado. Un periodo no importado devuelve **422** con la lista de disponibles. |
| `concepto` | resumen, series, detalle | Identificador del catálogo (`activo#1`, `resultado_neto#1`, ...). Desconocido → **422**. |
| `institucion` | resumen, series, detalle | Repetible. Solo limita las **filas de la tabla**; los KPIs describen siempre al sector. |
| `incluir_sistema` | resumen | `false` oculta la fila del agregado. |
| `seccion` | detalle | `balance`, `resultados`, `cuentas_orden`, `sin_clasificar`. |
| `periodo_desde`, `periodo_hasta` | series | Rango de periodos ya importados. |

### 5.2 Ejemplo real: `GET /resumen?concepto=activo#1&institucion=bbva_mexico`

```json
{
  "filtros": {
    "dataset_id": "cnbv_banca_multiple_boletin",
    "periodo": "2024-10",
    "concepto": "activo#1",
    "instituciones": ["bbva_mexico"],
    "incluir_sistema": true
  },
  "concepto": {
    "concepto_id": "activo#1",
    "nombre": "Activo total",
    "seccion": "balance",
    "naturaleza": "saldo",
    "unidad": "millones_mxn",
    "destacado": true
  },
  "kpis": {
    "valor_sistema": 14798027.40327502,
    "unidad": "millones_mxn",
    "naturaleza": "saldo",
    "instituciones_con_dato": 50,
    "instituciones_sin_dato": 0,
    "participacion_mayor_pct": 22.14,
    "institucion_mayor": "BBVA México",
    "concentracion_top5_pct": 64.1,
    "mediana_instituciones": 62236.121859,
    "maximo_institucion": 3276217.4868954904,
    "minimo_institucion": 383.806396
  },
  "comparacion": {
    "periodo_comparado": "2024-09",
    "tipo": "periodo_anterior",
    "valor_sistema_periodo_comparado": 14248939.909508841,
    "variacion": 549087.493766,
    "variacion_sistema_pct": 3.85,
    "motivo": null
  },
  "por_institucion": [
    {
      "institucion_id": "sistema",
      "institucion": "Sistema (agregado publicado por la CNBV)",
      "es_sistema": true,
      "valor": 14798027.40327502,
      "participacion_pct": 100.0,
      "variacion_pct": 3.85,
      "posicion": null
    },
    {
      "institucion_id": "bbva_mexico",
      "institucion": "BBVA México",
      "es_sistema": false,
      "valor": 3276217.4868954904,
      "participacion_pct": 22.14,
      "valor_periodo_comparado": 3112767.25537178,
      "variacion_pct": 5.25,
      "posicion": 1
    }
  ],
  "serie": [{ "periodo": "2023-10", "valor": 13429246.925548, "instituciones_con_dato": 50 }],
  "valores_ausentes": {
    "celdas_ausentes_boletin": 102,
    "instituciones_sin_dato": 0,
    "nota": "Celdas vacías en el archivo original. No se convierten en cero ni se imputan."
  },
  "advertencias": ["..."]
}
```

### 5.3 Ejemplo real: `GET /indicadores`

```json
{
  "periodo_boletin": "2024-10",
  "indicadores": [
    {
      "indicador_id": "roa_flujo_12_meses",
      "nombre": "ROA  (Flujo 12 meses)  3/",
      "nota": "Flujo 12 meses",
      "unidad": "porcentaje",
      "valores": [
        { "periodo": "2024-10", "institucion_id": "sistema", "valor": 2.080008, "unidad": "porcentaje" }
      ]
    },
    {
      "indicador_id": "roe_flujo_12_meses",
      "nombre": "ROE  (Flujo 12 meses)  4/",
      "nota": "Flujo 12 meses",
      "unidad": "porcentaje",
      "valores": [
        { "periodo": "2024-10", "institucion_id": "sistema", "valor": 18.49444, "unidad": "porcentaje" }
      ]
    }
  ]
}
```

### 5.4 Tiempos medidos (mismo equipo, en caliente)

| Petición | Tiempo | Tamaño |
|---|---|---|
| `resumen` (un concepto, 50 instituciones) | ~0,12 s | 17 KB |
| `series` (un concepto, 7 periodos) | ~0,01 s | 51 KB |
| `detalle` (50 filas) | ~0,01 s | 16 KB |
| `indicadores` (ROA y ROE, 3 fechas) | ~0,01 s | 52 KB |
| `catalogo` (158 conceptos + 51 instituciones) | ~0,41 s | 49 KB |

### 5.5 Errores

| Código | Cuándo |
|---|---|
| 404 | No hay boletines importados, o el periodo existe pero el concepto no trae valores en él |
| 422 | Periodo con formato inválido o no importado, concepto desconocido, `page_size` excesivo, demasiadas instituciones |
| 500 | Error no previsto (queda en el log) |

Si no hay datos reales, **no se devuelve el dataset sintético**: los endpoints
fallan con un mensaje que indica cómo importar (`python -m scripts.importar_cnbv
--descargar`).

---

## 6. Comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| Descarga real de los 7 boletines (HTTP 200, XLSX válido) | Sí |
| Estructura, unidades, encabezado y notas al pie documentadas | Sí (§2) |
| **Conciliación celda por celda** contra el archivo original (`scripts/verificar_cnbv`) | **56 248 hechos, 0 discrepancias** |
| Hash del archivo local vs. registrado en la importación | Coincide en los 7 periodos |
| Ausentes no convertidos en cero | 712 celdas vacías contadas, sin hechos |
| Notas al pie rechazadas e informadas | 14 |
| Idempotencia (reimportar el mismo archivo) | `sin_cambios`, sin duplicados |
| Revisión nueva (hash distinto) | Conserva la anterior como no vigente y sirve solo la nueva |
| Filtros combinados (periodo + concepto + institución + sección) | Probados |
| Coherencia resumen ↔ detalle | El valor del Sistema y el total de filas coinciden |
| Comparación de saldos vs flujos | Tipos distintos y motivados (`periodo_anterior` / `mismo_mes_anio_anterior`) |
| Pruebas automatizadas | **111** (12 nuevas de CNBV + 99 previas), todas en verde |
| Sin respaldo sintético cuando faltan datos reales | Probado (404 explícito) |

Comandos (desde `backend/`):

```bash
python -m scripts.create_indexes                        # incluye índices cnbv_*
python -m scripts.importar_cnbv --descargar             # descarga e importa 7 periodos
python -m scripts.importar_cnbv --dry-run --periodo 202410
python -m scripts.verificar_cnbv                        # conciliación contra el archivo
python -m pytest -q
```

Con Docker Compose, **descarga en el host** y luego importa montando el
directorio (los archivos viven fuera de la imagen y de Git):

```bash
# 1) en el host
cd backend && python -m scripts.importar_cnbv --descargar
# 2) hacia el MongoDB del contenedor
cd .. && docker compose run --rm -v "${PWD}/backend/data:/app/data" backend \
  python -m scripts.importar_cnbv
```

> **Aviso técnico**: `--descargar` **dentro** del contenedor falla con
> `CERTIFICATE_VERIFY_FAILED: unable to get local issuer certificate`. El servidor
> de la CNBV presenta una cadena de certificados incompleta que Windows resuelve
> con su almacén y OpenSSL (Linux) no. La descarga funciona en el host (curl,
> PowerShell o Python en Windows) y la importación funciona en el contenedor con
> el volumen montado; no se desactiva la verificación TLS.

---

## 7. Limitaciones y pendientes

1. **Cobertura del Excel**: solo hasta 2024-10. De 2025-03 en adelante el boletín
   se publica en PDF y no se importa (requeriría un lector de PDF, fuera de este
   alcance).
2. **Huecos reales de publicación**: 2024-06, 2023-08/09 y otros meses no existen
   en Excel; la API no los inventa.
3. **Tipo de cartera con monto y porcentaje**: `EF Resumen` trae la cartera por
   **etapa**; el corte por tipo (comercial/consumo/vivienda) con monto y
   porcentaje está en la hoja `Cartera y calif`, **pendiente de importar**. Los
   grupos de cartera que ya se exponen usan las filas de etapa 1/2/3.
4. **Cifras publicadas vs. revisadas**: el boletín no se actualiza; para series
   históricas revisadas la CNBV remite al Portafolio de Información interactivo.
5. **Sin licencia de datos abiertos explícita**: se cita la fuente y no se
   redistribuyen los archivos.
6. **Unidades**: solo se sirven las unidades del boletín (millones de pesos y
   porcentajes); no hay conversión a pesos ni a miles.
7. ~~El dashboard visual no está construido~~: **ya está construido** e
   integrado (§8).

---

## 8. Dashboard interactivo (frontend)

El dashboard «Banca múltiple mexicana — Comparativo financiero» vive en
**Portafolio → Dashboards y visualización → Comparativo bancario** y consume
únicamente los endpoints de este documento.

### 8.1 Cómo está hecho

| Pieza | Detalle |
|---|---|
| Módulo | React 19 + TypeScript + D3.js, empaquetado con Vite (`dashboards/banca-multiple/`) |
| Estado | **Zustand**: periodo, concepto, instituciones, ranuras de color por institución, resaltado temporal, ventana temporal e historial de deshacer |
| Consultas | **TanStack Query** con claves que incluyen todos los filtros, `keepPreviousData` y `AbortSignal` para cancelar respuestas obsoletas |
| Tabla | **TanStack Table** (ordenación y paginación) |
| Controles | **Radix UI** (Popover, Dialog, Checkbox) + CSS propio |
| Pruebas | **Playwright** contra la API real (`tests/e2e/{dashboard,visual,interaccion,portafolio}.spec.ts`) |
| Integración | `dist/projects/comparativo-bancario.js` carga `dist/dashboards/banca-multiple/app.js` con `import()` y monta la aplicación dentro del portafolio |

El sitio **no** se reconstruyó: se conservan diseño, navegación, animaciones,
rutas hash, «Ampliar» y el resto de las fichas.

### 8.2 Composición (compacta)

```
barra de aplicación · título con insignia · filtros · etiquetas · 4 indicadores
[ ranking 5 | evolución 7 ]        ≈ 40 % / 60 %
[ dispersión 5 | tabla 7 ]         ≈ 43 % / 57 %
pie: cobertura histórica + «Fuentes y metodología»
```

1. **Cabecera**: título, periodo y concepto activos, chip de cobertura y acceso a
   fuentes.
2. **Filtros**: periodo (popover), concepto (popover con búsqueda), instituciones
   (popover con búsqueda y casillas), etiquetas eliminables, *Deshacer* y
   *Restablecer*. El desglose de cartera aparece solo si el concepto lo admite.
3. **Indicadores**: total del sistema (con variación y su base), total de la
   selección, participación de la selección y contexto del mercado (global, no
   cambia al seleccionar).
4. **Ranking**: barras con eje ajustado a los bancos visibles, Top 10/20/todas,
   seleccionados fuera del top incluidos, base neutra y color estable por
   institución (azul, violeta, turquesa y, de la cuarta en adelante, color
   complementario con textura diagonal).
5. **Evolución**: marcadores reales, bandas de meses sin boletín, tramos solo
   entre meses consecutivos, tooltip compartido por fecha, leyenda interactiva,
   brush temporal y modos *Valor* / *Base 100*.
6. **Dispersión**: ROA/ROE publicados, zoom +/− y «Grupo central», brush
   rectangular de selección, contador de puntos fuera del encuadre.
7. **Tabla**: institución, valor, % del sistema, ROA y ROE; ordenación,
   paginación, fila de procedencia y panel lateral del banco seleccionado.
8. **Fuentes y metodología**: panel desplegable (Radix Dialog) con trazabilidad
   de archivos, revisiones, reglas de cálculo, advertencias y condiciones de uso.

### 8.3 Interacciones coordinadas

* Un único estado en Zustand: resaltar (hover/foco) no consulta ni filtra;
  seleccionar actualiza etiquetas, indicadores, serie, dispersión y tabla.
* Brush temporal (ventana de exploración, sin sumar saldos) y brush rectangular
  en la dispersión (selecciona instituciones comprendidas).
* Deshacer y restablecer sobre el mismo estado; etiquetas eliminables.
* El contexto se conserva al volver de la galería (`sessionStorage`).
* Cada consulta tiene su clave completa y su `AbortSignal`: una respuesta
  antigua no puede reemplazar a una selección más reciente.

### 8.4 Qué se comprobó en el navegador

Con **Playwright** sobre Chrome instalado (`npx playwright test`): **66 pruebas
(33 escritorio + 33 móvil), 65 correctas y una omitida** (la captura móvil
dedicada no se repite en escritorio). Comparan la interfaz con respuestas reales
de la API:

* Activo total del sistema = `14,798,027` millones y resultado neto `245,904`
  millones para 2024-10, idénticos a la API.
* Selección desde el ranking y coherencia en etiquetas, KPI de selección,
  participación, leyenda de la serie, dispersión y tabla.
* Dos bancos: `5,231,419` millones y `35.35 %` del sistema (suma y porcentaje
  exactos).
* Retirada desde la etiqueta; cambio de periodo y concepto; cambios rápidos de
  filtro con la última selección prevaleciendo.
* Deshacer/restablecer, teclado, contexto al volver de la galería y modo ampliado
  del portafolio.
* Errores de API informados y ausentes/cobertura visibles en el pie.
* **Acabado visual (`tests/e2e/visual.spec.ts`)**: estado inicial con barras
  azules sólidas, puntos turquesa sólidos y «Sistema» en azul; dos bancos con
  azul/violeta estables en ranking, serie, dispersión, leyenda y tabla mientras el
  resto queda en neutro; deseleccionar sin recolorear; cambio de periodo con los
  mismos colores; los desplegables se abren **sobre contenido** y se auditan sus
  estilos computados (fondo `#FFFFFF` opaco, `opacity: 1`, sin `backdrop-filter`,
  borde `#DDE2EB`, texto `#111318`, resaltado `#EEF1FF`, indicador `#3458F5`,
  scroll interno y encaje en el viewport); tooltips opacos; unidad única del
  gráfico temporal con la conversión comprobada número a número; cifra principal
  en grafito y turquesa solo en variaciones interpretables; teclado y Escape;
  móvil y vista ampliada sin recortes.
* **Interconexión (`tests/e2e/interaccion.spec.ts`)**: una respuesta lenta no
  sustituye a la selección vigente, el hover no dispara consultas, el brush
  temporal acota y se quita, y las transiciones duran 200 ms (anuladas con
  movimiento reducido).
* **Navegación del portafolio (`tests/e2e/portafolio.spec.ts`)**: Inicio con hero
  y red animada montada; Portafolio solo con la galería de áreas; cada área con su
  galería y sin hero ni biografía; proyecto con su aplicación; Sobre mí aislado;
  ruta desconocida con estado explícito; recarga y Atrás/Adelante; títulos nunca
  ocultos por la cabecera fija.

**Causa del defecto de opacidad.** Los estilos computados del contenido portalado
daban `background-color: rgba(0, 0, 0, 0)`: la paleta `--bm-*` estaba declarada
solo dentro de `.bm-app` y Radix monta Popover y Dialog en `document.body`. No era
`z-index` (el panel ya superaba la cabecera del sitio), ni `opacity` (valía 1), ni
`backdrop-filter` (no había). Ahora la paleta vive en `src/colors.ts`, se declara
en `:root` y en los contenedores alcanzables desde el portal (`src/theme.ts`) y
los paneles fijan sus valores críticos también con literal de respaldo.

**Causa del defecto de navegación.** El router del portafolio cambiaba la vista
del portafolio (galería, área o proyecto) pero dejaba visible el contenedor del
inicio con el hero, la franja de áreas y el contacto, además de caer en la galería
ante cualquier ruta desconocida. Ahora cada nivel decide qué se ve (`home`,
`gallery`, `area`, `project`, `about`, `error`), el hero y la red animada se
montan solo en Inicio —con desmontaje de frames, observadores y listeners— y una
ruta desconocida muestra un estado explícito con la ruta pedida.

Capturas en `dashboards/banca-multiple/evidencias/` (`A-…` estado inicial, `B-…`
dos y cuatro bancos, `C-…` periodo abierto, `D-…` concepto abierto, `E-…`
instituciones abierto, `F-…` teclado, `G-…` móvil, además de tooltips y
paneles). **Pendiente**: Safari, Firefox, lectores de pantalla reales y
dispositivos físicos.

### 8.5 Cómo levantarlo en local

```bash
# backend
cd backend && python -m uvicorn app.main:app --port 8010
# módulo (una vez)
cd dashboards/banca-multiple && npm install && npm run build
# sitio
cd dist && python -m http.server 8000
# abrir
# http://localhost:8000/#/area/dashboards/comparativo-bancario
```

Si la API corre en otro puerto, se ajusta con `window.PORTFOLIO_BANCA_API`.