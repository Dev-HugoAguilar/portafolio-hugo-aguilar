"""Create a reproducible 1:1:1 household-level campaign assignment.

Input must be a real eligible-household roster supplied for a prospective
experiment. This script intentionally is not run against Complete Journey's
historical households, which cannot receive a real campaign intervention.
"""
from __future__ import annotations

import argparse
import json
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

ARMS = ("holdout", "generic", "tailored")


def randomize(
    frame: pd.DataFrame,
    seed: int,
    experiment_id: str,
    days: int = 30,
    assigned_at: str | None = None,
) -> pd.DataFrame:
    required = {"household_id", "segment"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Input requires columns: {sorted(required)}")
    roster = frame.copy()
    roster["household_id"] = roster["household_id"].astype(str).str.strip()
    if roster["household_id"].eq("").any() or roster["household_id"].duplicated().any():
        raise ValueError("household_id must be nonempty and unique: one row per eligible household")
    if roster["segment"].isna().any():
        raise ValueError("Every eligible household must have a precomputed segment")
    if days <= 0:
        raise ValueError("days must be positive")

    rng = np.random.default_rng(seed)
    randomized = []
    strata_cols = ["segment"] + (["randomization_stratum"] if "randomization_stratum" in roster.columns else [])
    for _, part in roster.groupby(strata_cols, dropna=False, sort=True):
        if len(part) < len(ARMS):
            raise ValueError("Every randomization stratum needs at least 3 households (one per arm)")
        order = rng.permutation(len(part))
        arm_sequence = np.resize(np.array(ARMS, dtype=object), len(part))
        randomized.append(pd.DataFrame({
            "household_id": part.iloc[order]["household_id"].to_numpy(),
            "segment": part.iloc[order]["segment"].astype(str).to_numpy(),
            "arm": arm_sequence,
        }))
    result = pd.concat(randomized, ignore_index=True)
    hoy = date.fromisoformat(assigned_at) if assigned_at else date.today()
    today = hoy
    result.insert(0, "experiment_id", experiment_id)
    result["assigned_at"] = today.isoformat()
    result["outcome_window_end"] = (today + timedelta(days=days)).isoformat()
    result["outcome_complete"] = False
    result["redeemed_30d"] = ""
    result["sales_30d"] = ""
    result["margin_30d"] = ""
    # Una columna no demuestra aleatorización: el script deja el estado en
    # blanco y el analizador exige un manifiesto externo verificable.
    result["randomization_confirmed"] = ""
    result["randomization_seed"] = seed
    result["assignment_unit"] = "household"
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("eligible_households_csv", type=Path, help="one row per eligible household; IDs should be pseudonymous")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--experiment-id", required=True)
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--assigned-at", default=None, help="fecha de asignación (AAAA-MM-DD); por omisión, hoy")
    args = parser.parse_args()
    source = pd.read_csv(args.eligible_households_csv, dtype={"household_id": str})
    result = randomize(source, args.seed, args.experiment_id, args.days, args.assigned_at)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False)
    counts = result.groupby(["segment", "arm"], as_index=False).size().to_dict(orient="records")
    import hashlib

    por_estrato = (
        result.groupby(["segment", "arm"], as_index=False).size().to_dict(orient="records")
    )
    metadata = {
        "experiment_id": args.experiment_id,
        "seed": args.seed,
        "assignment": "1:1:1 por posición tras permutación aleatoria dentro de cada estrato (patrón equilibrado, no Bernoulli independiente)",
        "unit": "household",
        "rows": len(result),
        "counts": counts,
        "strata_counts": por_estrato,
        "max_stratum_arm_imbalance": int(
            max(
                (max(part["arm"].value_counts().reindex(ARMS, fill_value=0)) - min(part["arm"].value_counts().reindex(ARMS, fill_value=0)))
                for _, part in result.groupby("segment")
            )
            if len(result)
            else 0
        ),
        "assignment_sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
        "randomization_confirmed": False,
        "randomization_evidence": "pendiente: la confirmación de aleatorización debe venir de fuera del script (registro de campaña o auditoría)",
        "note": "Keep assignment immutable; execute assigned campaign; fill outcome fields only after outcome_window_end.",
    }
    args.output.with_suffix(args.output.suffix + ".manifest.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__": main()
