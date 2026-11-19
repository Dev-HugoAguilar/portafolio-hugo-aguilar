# Data Incident Commander

Demo local de **AgentOps / Data Reliability** integrada en la ficha
`#/area/agentes/data-incident-commander` del portafolio. Recorre un incidente
determinista: diagnostica el linaje, compara remediaciones, ejecuta validaciones
y se detiene para una aprobación humana antes de simular una reparación en una
copia temporal.

No usa LLM, Atlas, credenciales ni dependencias externas. El estado de los runs
vive en memoria del proceso FastAPI y desaparece al reiniciarlo.

## Abrir la demo

Desde la raíz del repositorio:

```bash
cd dist
python -m http.server 8000 --bind 127.0.0.1
```

Abre:

- `http://127.0.0.1:8000/dashboards/data-incident-commander/index.html`
- o la ficha del portafolio:
  `http://127.0.0.1:8000/#/area/agentes/data-incident-commander`

La interfaz funciona en modo local si la API no responde (`?local=1` fuerza ese
modo). El flujo visual, las validaciones y el recibo se generan en el navegador;
la API solo añade runs y recibos efímeros para la aprobación/rechazo.

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

- `GET /api/v1/incident-commander/health`
- `GET /api/v1/incident-commander/snapshot`
- `POST /api/v1/incident-commander/runs` con `{"scenario_id":"missing|duplicate|schema"}`
- `POST /api/v1/incident-commander/runs/{run_id}/approve` con `{"approved":true|false,"plan_id":"..."}`

Los runs se mantienen en un único servicio en memoria por proceso. No hay
persistencia, archivos de salida ni escrituras externas.

## Escenarios

Los tres escenarios inyectan una falla **solo en una copia temporal**:

| Escenario | Falla inyectada | Regla |
|---|---|---|
| `missing` | Falta PIB 2025 | `period_coverage` |
| `duplicate` | Tres filas repetidas de PIB 2023 | `key_uniqueness` |
| `schema` | `indicator_code` cambia de tipo en PIB 2024 | `catalog_codes` / `known_indicators` |

No son incidentes reportados por Banco Mundial ni defectos del snapshot
original. El snapshot fuente conserva 21 observaciones reales de World
Development Indicators para México, 2019–2025, con sus unidades, metadatos y
fuente.

## Remediaciones

Planes permitidos: `quarantine`, `backfill` y `fullreload`. `forward` (imputar
el valor anterior) queda fuera de la lista permitida y la interfaz lo marca como
**NO APROBABLE**. Una aprobación solo simula la reparación sobre una copia en
memoria y devuelve un recibo local; un rechazo termina sin efecto.

Las puntuaciones 0–100 de las coordenadas paralelas son **hipótesis comparativas
del escenario**, no métricas observadas en producción. El Sankey representa
dependencias declaradas, no volumen de filas.

## Publicar la copia estática

```bash
python dashboards/data-incident-commander/publicar.py
```

La portada de la tarjeta se genera desde la demo servida, a 1600 × 1726:

```bash
node dashboards/data-incident-commander/capturar-portada.mjs
```

## Archivos

- `runtime/index.html`, `runtime/styles.css`, `runtime/app.js`: interfaz y SVG.
- `runtime/data.json`: snapshot WDI de 21 observaciones.
- `publicar.py`: copia verificada a `dist/dashboards/data-incident-commander/`.
- `capturar-portada.mjs`: portada real en `dist/img/`.
- `backend/app/incident_commander/service.py`: escenarios, validaciones, runs y recibos.
- `backend/app/api/v1/routes/incident_commander.py`: API.
- `backend/tests/test_incident_commander.py`: pruebas del servicio.
- `tools/verificar-data-incident-commander.mjs`: verificación de navegador/API.

## Límites

- Flujo determinista con reglas y fixtures; no hay LLM ni autonomía productiva.
- Las puntuaciones y reglas describen el escenario de demostración, no producción.
- El estado es efímero: al reiniciar el proceso no quedan runs ni recibos.
- La aprobación no escribe en archivos, bases de datos, Atlas ni sistemas externos.
- No se publica ni se despliega desde esta integración.
