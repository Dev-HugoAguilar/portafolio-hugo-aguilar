# Copiloto NL-to-SQL · indicadores económicos de México

Demo local de **IA generativa y LLMs** integrada en la ficha
`#/area/ia-generativa/copiloto-nl-sql` del portafolio. Responde en español
preguntas acotadas sobre tres indicadores de México y muestra la interpretación,
el SQL parametrizado, las filas, la tabla y la gráfica.

El parser es **léxico**, no semántico: reconoce PIB, inflación y desempleo, años
entre 2019 y 2025 y operaciones de tendencia, comparación, máximo o mínimo. El
texto libre nunca se convierte en SQL.

## Abrir la demo

Desde la raíz del repositorio:

```bash
cd dist
python -m http.server 8000 --bind 127.0.0.1
```

Abre:

- `http://127.0.0.1:8000/dashboards/copiloto-nl-sql/index.html`
- o la ficha del portafolio:
  `http://127.0.0.1:8000/#/area/ia-generativa/copiloto-nl-sql`

La página funciona solo con `data.json`; la API, SQLite, Atlas y el modelo son
opcionales para la interfaz. Añade `?local=1` para forzar la simulación local.

## API local opcional

La API reutiliza el backend FastAPI existente. Desde `backend/`:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

o desde la raíz:

```powershell
powershell -ExecutionPolicy Bypass -File backend\iniciar-api.ps1
```

Rutas:

- `GET /api/v1/copiloto-nl-sql/health`
- `GET /api/v1/copiloto-nl-sql/data`
- `GET /api/v1/copiloto-nl-sql/query?question=...`

La pregunta se envía como parámetro GET para conservar el CORS de solo lectura
del portafolio. La API no devuelve la URI de MongoDB ni claves. Si no responde,
el navegador simula la misma plantilla sobre el snapshot y lo etiqueta como
**modo local**.

La base SQLite se genera desde el snapshot en
`backend/data/copiloto_nl_sql/wdi.sqlite3` (carpeta ignorada por Git). Las
consultas abren esa base en `mode=ro` y solo ejecutan la plantilla `SELECT`.

## Snapshot y ETL

- Snapshot versionable: `runtime/data.json`
- Dataset: `WB-WDI-MEX-2019-2025-v1`
- Corte: `2026-11-15`
- Fuente: Banco Mundial, World Development Indicators, licencia CC BY 4.0

Indicadores:

| Indicador | Código WDI | Unidad |
|---|---|---|
| Crecimiento del PIB real | `NY.GDP.MKTP.KD.ZG` | % anual |
| Inflación al consumidor | `FP.CPI.TOTL.ZG` | % anual |
| Desempleo total, estimación modelada OIT | `SL.UEM.TOTL.ZS` | % de la fuerza laboral |

El desempleo es una estimación modelada por la OIT; no mide informalidad ni
subempleo. No se imputan faltantes ni se suman porcentajes de conceptos
distintos.

El ETL consulta la API oficial Indicators v2 y solo escribe si recibe
observaciones para los tres códigos:

```bash
python dashboards/copiloto-nl-sql/refresh_worldbank.py --dry-run
python dashboards/copiloto-nl-sql/refresh_worldbank.py
```

## Seguridad de la consulta

1. El parser reconoce indicadores, años y operaciones de un catálogo cerrado.
2. El SQL sale de una plantilla permitida con parámetros enlazados (`?`).
3. SQLite se abre con `mode=ro` y `PRAGMA query_only`.
4. No se ejecuta texto libre ni SQL generado por un modelo.
5. Si hay un LLM configurado (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`), solo
   puede devolver un plan JSON validado; ante cualquier fallo se usa el parser
   local.

## Atlas opcional

La auditoría reutiliza `MONGODB_URI` y escribe **solo** metadatos en
`portfolio_demos.nl_sql_query_audit`: indicadores, periodo, operación, número de
filas, motor y fecha de corte. **No guarda la pregunta libre.** Si Atlas no está
disponible, la consulta sigue funcionando y el resultado indica `audit: local`.

Variables opcionales: `NL_SQL_AUDIT_ENABLED`, `NL_SQL_AUDIT_DB` y
`NL_SQL_AUDIT_COLLECTION`. No se modificó `.env`.

## Publicar la copia estática

```bash
python dashboards/copiloto-nl-sql/publicar.py
```

La portada de la tarjeta se genera desde la demo servida, a 1600 × 1726:

```bash
node dashboards/copiloto-nl-sql/capturar-portada.mjs
```

## Archivos

- `runtime/index.html`, `runtime/styles.css`, `runtime/app.js`: interfaz.
- `runtime/data.json`: snapshot WDI versionable.
- `runtime/vendor/d3.min.js`: D3 local, sin CDN.
- `refresh_worldbank.py`: ETL desde World Bank Indicators API v2.
- `publicar.py`: copia verificada a `dist/dashboards/copiloto-nl-sql/`.
- `capturar-portada.mjs`: portada real en `dist/img/`.
- `backend/app/nl_sql/service.py`: parser, SQL, SQLite y auditoría.
- `backend/app/api/v1/routes/copiloto_nl_sql.py`: API.
- `backend/tests/test_copiloto_nl_sql.py`: pruebas del servicio.
- `tools/verificar-copiloto-nl-sql.mjs`: verificación de navegador/API.

## Límites

- Parser léxico: no comprende paráfrasis libres ni razonamiento semántico.
- Un país, tres indicadores y siete años; no es un catálogo abierto de SQL.
- No imputa faltantes ni convierte unidades.
- El LLM no es necesario y no ejecuta SQL.
- Atlas es opcional; la demo no se publica ni se despliega desde esta integración.
