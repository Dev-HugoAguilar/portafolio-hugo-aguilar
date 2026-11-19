"""Intent-to-treat analysis for a future randomized segment campaign test.

This deliberately refuses to analyze historical observational exposure data:
the input must explicitly mark its assignment as randomized. One row represents
one household enrolled in one experiment.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import norm, t as student_t, ttest_ind

ARMS = ("holdout", "generic", "tailored")
COMPARISONS = (("tailored", "generic"), ("tailored", "holdout"), ("generic", "holdout"))


def holm(p_values: list[float]) -> list[float]:
    """Corrección de Holm-Bonferroni sobre un conjunto de comparaciones primarias.

    Se aplica a las dos comparaciones primarias (una por segmento) para controlar
    el error de tipo I familiar; el resto de contrastes son secundarios y se
    reportan por separado sin inferencia.
    """
    orden = sorted(range(len(p_values)), key=lambda indice: p_values[indice])
    m = len(p_values)
    ajustados = [0.0] * m
    anterior = 0.0
    for posicion, indice in enumerate(orden):
        valor = min(1.0, (m - posicion) * p_values[indice])
        anterior = max(anterior, valor)
        ajustados[indice] = anterior
    return ajustados


def binary_effect(a: np.ndarray, b: np.ndarray) -> dict:
    na, nb = len(a), len(b)
    pa, pb = float(a.mean()), float(b.mean())
    delta = pa - pb
    se = float(np.sqrt(pa*(1-pa)/na + pb*(1-pb)/nb))
    z = delta / se if se else 0.0
    return {"rate_arm_a": pa, "rate_arm_b": pb, "risk_difference": delta,
            "risk_difference_pp": 100*delta,
            "normal_95pct_ci_pp": [100*(delta-1.96*se), 100*(delta+1.96*se)],
            "p_value_unadjusted": float(2*norm.sf(abs(z))) if se else 1.0,
            "n_arm_a": na, "n_arm_b": nb}


def continuous_effect(a: np.ndarray, b: np.ndarray) -> dict:
    a, b = a[np.isfinite(a)], b[np.isfinite(b)]
    stat = ttest_ind(a, b, equal_var=False)
    va, vb = float(np.var(a, ddof=1)), float(np.var(b, ddof=1))
    se2 = va/len(a) + vb/len(b)
    df = se2**2 / ((va/len(a))**2/(len(a)-1) + (vb/len(b))**2/(len(b)-1)) if se2 else len(a)+len(b)-2
    diff = float(a.mean()-b.mean()); se = float(np.sqrt(se2))
    crit = float(student_t.ppf(.975, df))
    return {"mean_arm_a": float(a.mean()), "mean_arm_b": float(b.mean()), "mean_difference": diff,
            "welch_95pct_ci": [diff-crit*se, diff+crit*se], "p_value_unadjusted": float(stat.pvalue),
            "n_arm_a": len(a), "n_arm_b": len(b)}


def analyze(frame: pd.DataFrame, assignment_manifest: dict | None = None) -> dict:
    required = {"household_id", "segment", "arm", "assigned_at", "outcome_window_end",
                "outcome_complete", "redeemed_30d", "randomization_confirmed"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")
    # La bandera por sí sola no demuestra aleatorización: se exige el manifiesto
    # del aleatorizador y que su sha256 coincida con la asignación recibida.
    if "assignment_manifest_sha256" not in frame.columns:
        raise ValueError(
            "Refusing ITT analysis: falta assignment_manifest_sha256; incluye el manifiesto producido por el aleatorizador"
        )
    huellas = frame["assignment_manifest_sha256"].astype(str).str.strip().unique()
    if len(huellas) != 1 or not huellas[0]:
        raise ValueError("Refusing ITT analysis: la huella del manifiesto no es única y no vacía")
    if not assignment_manifest:
        raise ValueError(
            "Refusing ITT analysis: se requiere el manifiesto de asignación (--manifest) para verificar el sha256"
        )
    if huellas[0] != str(assignment_manifest.get("assignment_sha256", "")):
        raise ValueError("Refusing ITT analysis: el sha256 del manifiesto no coincide con la asignación recibida")
    if str(frame["randomization_confirmed"].astype(str).str.lower().unique().tolist()) not in (
        "['true']",
        "['1']",
        "['yes']",
    ):
        raise ValueError(
            "Refusing causal/ITT analysis: el manifiesto debe declarar la aleatorización confirmada por evidencia externa"
        )
    if not frame["outcome_complete"].astype(str).str.lower().isin(["true", "1", "yes"]).all():
        raise ValueError("Refusing ITT analysis: wait until every 30-day outcome window is complete")
    assigned = pd.to_datetime(frame["assigned_at"], errors="coerce")
    window_end = pd.to_datetime(frame["outcome_window_end"], errors="coerce")
    if assigned.isna().any() or window_end.isna().any() or (window_end < assigned).any():
        raise ValueError("assigned_at and outcome_window_end must be valid, ordered dates")
    if frame["household_id"].duplicated().any():
        raise ValueError("Expected one row per household in one experiment; aggregate or define a new experiment first")
    if not frame["arm"].isin(ARMS).all():
        raise ValueError(f"arm must be one of {ARMS}")
    if frame["redeemed_30d"].isna().any() or not frame["redeemed_30d"].isin([0, 1]).all():
        raise ValueError("redeemed_30d must be complete and binary (0/1)")
    if "sales_30d" in frame and frame["sales_30d"].isna().any():
        raise ValueError("sales_30d must be complete to report ITT sales; include zeros where no purchase occurred")

    results = []
    for segment, group in frame.groupby("segment", sort=True):
        counts = group["arm"].value_counts().to_dict()
        absent = [arm for arm in ARMS if counts.get(arm, 0) == 0]
        if absent:
            raise ValueError(f"Segment {segment!r} has no assigned households in arms: {absent}")
        if "sales_30d" in group and any((group["arm"] == arm).sum() < 2 for arm in ARMS):
            raise ValueError("Need at least two households per arm to estimate sales variance")
        comparisons = []
        for arm_a, arm_b in COMPARISONS:
            a = group.loc[group["arm"].eq(arm_a)]
            b = group.loc[group["arm"].eq(arm_b)]
            item = {"arm_a": arm_a, "arm_b": arm_b,
                    "redemption_30d": binary_effect(a["redeemed_30d"].to_numpy(float), b["redeemed_30d"].to_numpy(float))}
            if "sales_30d" in group:
                item["sales_30d"] = continuous_effect(a["sales_30d"].to_numpy(float), b["sales_30d"].to_numpy(float))
            if "margin_30d" in group:
                if group["margin_30d"].isna().any():
                    raise ValueError("margin_30d must be complete if supplied")
                item["margin_30d"] = continuous_effect(a["margin_30d"].to_numpy(float), b["margin_30d"].to_numpy(float))
            comparisons.append(item)
        resultado_segmento = {
            "segment": str(segment),
            "assigned_households_by_arm": {a: int(counts.get(a, 0)) for a in ARMS},
            "comparisons": comparisons,
        }
        if "randomization_stratum" in group.columns:
            resultado_segmento["stratum_balance"] = (
                group.groupby(["randomization_stratum", "arm"]).size().unstack(fill_value=0).to_dict(orient="index")
            )
        results.append(resultado_segmento)
    # Holm sobre la comparación primaria (adaptada vs genérica) de cada segmento.
    primarias = []
    for resultado_segmento in results:
        for comparacion in resultado_segmento["comparisons"]:
            if (comparacion["arm_a"], comparacion["arm_b"]) == ("tailored", "generic"):
                primarias.append(comparacion["redemption_30d"]["p_value_unadjusted"])
    if len(primarias) == len(results) and primarias:
        ajustados = holm(primarias)
        for resultado_segmento, p_ajustado in zip(results, ajustados):
            for comparacion in resultado_segmento["comparisons"]:
                if (comparacion["arm_a"], comparacion["arm_b"]) == ("tailored", "generic"):
                    comparacion["redemption_30d"]["p_value_holm"] = p_ajustado
                    comparacion["redemption_30d"]["primaria"] = True
    return {"estimand": "intention-to-treat difference by segment, based on randomized household assignment",
            "assignment_manifest_sha256": str(assignment_manifest.get("assignment_sha256", "")),
            "primary_comparison": "tailored vs generic within segment; control comparisons are secondary",
            "outcomes": "30-day redemption primary; 30-day sales and margin secondary when provided",
            "multiple_testing": "las dos comparaciones primarias (adaptada vs genérica por segmento) llevan corrección de Holm; el resto son secundarias y no admiten inferencia",
            "segments": results}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input_csv", type=Path, help="one row per randomized household; see campaign_experiment_design.md")
    ap.add_argument("--output", type=Path, default=Path("marketing_customer_project/reports/campaign_trial_results.json"))
    args = ap.parse_args()
    frame = pd.read_csv(args.input_csv, dtype={"household_id": str, "segment": str, "arm": str})
    if args.manifest is None:
        raise SystemExit("Indica --manifest con el manifiesto del aleatorizador (verifica el sha256 de la asignación)")
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    result = analyze(frame, manifest)
    result["input_rows"] = int(len(frame))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
