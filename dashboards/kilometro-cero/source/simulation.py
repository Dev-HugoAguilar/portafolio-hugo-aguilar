"""Agregador determinista de una red logística totalmente sintética."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_PATH = Path(__file__).parent / "data" / "scenarios.json"
with DATA_PATH.open(encoding="utf-8") as file:
    DATA = json.load(file)


def simulate(incident: str = "none", status_filter: str = "all", corridor_id: str | None = None) -> dict[str, Any]:
    incident_map = {row["id"]: row for row in DATA["incidents"]}
    if incident not in incident_map:
        raise ValueError("Escenario no disponible")
    if status_filter not in {"all", "on_time", "delayed", "at_risk"}:
        raise ValueError("Filtro de estado no disponible")
    cities = {row["id"]: row["name"] for row in DATA["cities"]}
    affected = set(incident_map[incident]["affected_corridors"])
    rows = []
    for item in DATA["corridors"]:
        row = dict(item)
        if row["id"] in affected:
            shifted = max(3, round(row["shipments"] * (0.10 if incident == "closure" else 0.08)))
            shifted = min(shifted, row["on_time"])
            row["on_time"] -= shifted
            row["delayed"] += shifted
            if incident == "storm":
                risk_shift = min(row["delayed"], max(1, round(row["shipments"] * 0.025)))
                row["delayed"] -= risk_shift
                row["at_risk"] += risk_shift
        row["origin_name"] = cities[row["origin"]]
        row["destination_name"] = cities[row["destination"]]
        row["visible_shipments"] = row["shipments"] if status_filter == "all" else row[status_filter]
        if row["visible_shipments"]:
            rows.append(row)
    if corridor_id is not None and corridor_id not in {row["id"] for row in rows}:
        raise ValueError("El corredor no está en la vista filtrada")

    totals = {
        "shipments": sum(row["visible_shipments"] for row in rows),
        "on_time": sum(row["on_time"] for row in rows),
        "delayed": sum(row["delayed"] for row in rows),
        "at_risk": sum(row["at_risk"] for row in rows),
        "corridors": len(rows),
    }
    selected = next((row for row in rows if row["id"] == corridor_id), None)
    return {
        "status": "synthetic_scenario",
        "incident": incident_map[incident],
        "filter": status_filter,
        "totals": totals,
        "selected_corridor": selected,
        "corridors": rows,
        "recommendation": {
            "mode": "local_rule_based_simulation",
            "text": "La interpretación se calcula sobre los fixtures sintéticos; no hay telemetría ni sistema de despacho conectado.",
            "external_action_taken": False,
        },
        "data_limits": DATA["meta"]["notes"],
    }
