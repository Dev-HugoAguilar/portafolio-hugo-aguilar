# Briefing con evidencia · Banco de México

Demo local de **IA generativa y LLMs** integrada en la ficha
`#/area/ia-generativa/asistente-investigacion` del portafolio.

Responde preguntas sobre dos publicaciones oficiales de Banco de México y
muestra los fragmentos exactos que respaldan la respuesta. La recuperación es
**léxica** (coincidencia de términos), no un RAG semántico con embeddings.

## Abrir la demo

Desde la raíz del repositorio:

```bash
cd dist
python -m http.server 8000 --bind 127.0.0.1
```

Abre:

- `http://127.0.0.1:8000/dashboards/briefing-banxico/index.html`
- o la ficha del portafolio:
  `http://127.0.0.1:8000/#/area/ia-generativa/asistente-investigacion`

La página funciona solo con `corpus.json`; la API, Atlas y el modelo son
opcionales. Añade `?local=1` para forzar el modo local y no consultar la API.

## API local opcional

El backend reutiliza la API FastAPI existente. Desde `backend/`:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

o desde la raíz:

```powershell
powershell -ExecutionPolicy Bypass -File backend\iniciar-api.ps1
```

Rutas:

- `GET /api/v1/briefing-banxico/health`
- `GET /api/v1/briefing-banxico/corpus`
- `GET /api/v1/briefing-banxico/query?question=...`

La API no devuelve la URI de MongoDB ni claves. Si no responde, el navegador
usa el corpus local y etiqueta la respuesta como extractiva.

## Atlas dedicado

La colección por omisión es `portfolio_demos.rag_banxico_chunks`; no usa
`MONGODB_DB` y no toca otras colecciones. La carga es idempotente por
`chunk_id`:

```bash
cd backend
python -m scripts.seed_rag_banxico --dry-run
python -m scripts.seed_rag_banxico
```

Variables opcionales: `RAG_BANXICO_MONGODB_DB` y `RAG_BANXICO_COLLECTION`.
La URI se toma de `MONGODB_URI` ya configurada; no se imprime.

## Modelo opcional

Sin las tres variables siguientes, la respuesta es la concatenación de los
fragmentos recuperados y se etiqueta **extractiva**:

```text
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
```

Si están configuradas, el backend solicita una respuesta al proveedor usando
solo los fragmentos recuperados y exige citar `[BM-...]`. Si el proveedor falla,
conserva la respuesta extractiva.

## Corpus y gráfica

`runtime/corpus.json` contiene dos fuentes oficiales y siete fragmentos:

- `BM-2026-11-05`: Anuncio de Política Monetaria, 5 nov 2026.
- `BM-2026-08-26`: Informe trimestral abril–junio 2026.

La serie de inflación conserva la meta de 3%, cuatro trimestres observados
(2025-T4 a 2026-T3) y el pronóstico publicado desde **2026-T4**. La línea
discontinua y los puntos huecos identifican el pronóstico; la tabla accesible
repite periodo, valor, estatus y fuente. D3 se sirve localmente desde
`runtime/vendor/d3.min.js` (v7.9.2, ISC).

## Publicar la copia estática

El sitio sirve `dist/`; después de editar `runtime/`:

```bash
python dashboards/briefing-banxico/publicar.py
```

La portada de la tarjeta se genera desde la demo servida, a 1600 × 1726:

```bash
node dashboards/briefing-banxico/capturar-portada.mjs
```

## Archivos

- `runtime/index.html`, `runtime/styles.css`, `runtime/app.js`: interfaz.
- `runtime/corpus.json`: corpus versionable.
- `runtime/vendor/d3.min.js`: D3 local, sin CDN.
- `publicar.py`: copia verificada a `dist/dashboards/briefing-banxico/`.
- `capturar-portada.mjs`: portada real de la tarjeta en `dist/img/`.
- `backend/app/rag_banxico/service.py`: recuperación, respuesta y salud.
- `backend/app/api/v1/routes/briefing_banxico.py`: API.
- `backend/scripts/seed_rag_banxico.py`: carga idempotente en Atlas.
- `tools/verificar-briefing-banxico.mjs`: verificación de navegador.
- `backend/tests/test_briefing_banxico.py`: pruebas del servicio.

## Límites

- La recuperación léxica no comprende paráfrasis fuera del vocabulario del corpus.
- El corpus es una transcripción resumida de dos documentos; no cubre toda la
  economía mexicana.
- La demo no estima pronósticos propios: reproduce el cuadro publicado.
- La cobertura de Atlas y el modelo dependen del entorno local; la interfaz
  informa qué modo está activo sin revelar secretos.
