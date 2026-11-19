from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pydantic import BaseModel, Field

from simulation import DATA, simulate

app = FastAPI(title="Kilómetro Cero · Simulación logística local", version="0.1.0")
ROOT = Path(__file__).parent


class SimulationRequest(BaseModel):
    incident: str = Field(default="none")
    status_filter: str = Field(default="all")
    corridor_id: str | None = Field(default=None)


@app.get("/")
def index():
    return FileResponse(ROOT / "index.html")


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "local_synthetic_demo", "writes_external": False}


@app.get("/api/scenarios")
def scenarios():
    return DATA


@app.post("/api/simulate")
def run_scenario(request: SimulationRequest):
    try:
        return simulate(request.incident, request.status_filter, request.corridor_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


app.mount("/", StaticFiles(directory=ROOT, html=True), name="assets")
