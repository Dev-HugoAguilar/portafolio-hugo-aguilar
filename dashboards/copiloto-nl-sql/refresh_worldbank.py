"""ETL opcional del snapshot WDI del copiloto NL-to-SQL.

Uso desde la raíz del repositorio::

    python dashboards/copiloto-nl-sql/refresh_worldbank.py --dry-run
    python dashboards/copiloto-nl-sql/refresh_worldbank.py

Consulta la API oficial World Bank Indicators v2 para tres indicadores y
reemplaza ``runtime/data.json`` solo si la respuesta trae observaciones para los
tres códigos. No imputa valores ausentes y no escribe nada si la API falla.
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "runtime" / "data.json"
CODES = ("NY.GDP.MKTP.KD.ZG", "FP.CPI.TOTL.ZG", "SL.UEM.TOTL.ZS")
LABELS = {
    "NY.GDP.MKTP.KD.ZG": ("Crecimiento del PIB real", "% anual"),
    "FP.CPI.TOTL.ZG": ("Inflación al consumidor", "% anual"),
    "SL.UEM.TOTL.ZS": ("Desempleo total · estimación OIT", "% fuerza laboral"),
}


def fetch_series(code: str) -> tuple[str, list[dict]]:
    url = (
        f"https://api.worldbank.org/v2/country/MEX/indicator/{code}"
        "?format=json&date=2019:2025&per_page=100"
    )
    request = Request(
        url,
        headers={"User-Agent": "PortfolioDemo/1.0 (local data refresh)"},
    )
    with urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    observations = payload[1] if len(payload) > 1 and payload[1] else []
    title = next(
        (
            observation["indicator"]["value"]
            for observation in observations
            if observation.get("indicator")
        ),
        code,
    )
    rows = []
    label, unit = LABELS[code]
    for observation in observations:
        if observation.get("value") is None:
            continue
        rows.append(
            {
                "year": int(observation["date"]),
                "indicator_code": code,
                "indicator": label,
                "value": float(observation["value"]),
                "unit": unit,
            }
        )
    return title, rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Consulta y valida la API sin escribir runtime/data.json.",
    )
    args = parser.parse_args()

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    rows: list[dict] = []
    titles: dict[str, str] = {}
    for code in CODES:
        try:
            title, series = fetch_series(code)
        except (URLError, TimeoutError, ValueError, KeyError) as exc:
            raise SystemExit(
                f"No se pudo consultar la API oficial ({code}): {exc}. "
                "Se conserva data.json sin cambios."
            ) from exc
        if not series:
            raise SystemExit(
                f"La API no devolvió observaciones para {code}. "
                "Se conserva data.json sin cambios."
            )
        titles[code] = title
        rows.extend(series)

    if not rows:
        raise SystemExit("La API no devolvió observaciones. Se conserva data.json sin cambios.")

    for source in data.get("sources", []):
        if source.get("indicator_code") in titles:
            source["title"] = titles[source["indicator_code"]]
    data["observations"] = sorted(
        rows, key=lambda row: (row["indicator_code"], row["year"])
    )
    data["snapshot_date"] = date.today().isoformat()
    data["period_start"] = min(row["year"] for row in rows)
    data["period_end"] = max(row["year"] for row in rows)
    data["note"] = (
        "Snapshot refrescado desde World Bank Indicators API v2, fuente World "
        "Development Indicators. No se imputan valores faltantes."
    )
    if args.dry_run:
        print(
            f"dry-run: {len(rows)} observaciones listas · "
            f"{data['period_start']}–{data['period_end']} · "
            f"corte {data['snapshot_date']} · sin escribir"
        )
        return 0
    DATA_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"WDI actualizado: {len(rows)} observaciones · "
        f"{data['period_start']}–{data['period_end']} · "
        f"corte {data['snapshot_date']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
