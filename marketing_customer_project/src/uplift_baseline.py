"""Small-sample prototype for Criteo uplift ranking.

This is a pipeline smoke study, not the final benchmark. It compares a
regularized S-learner with treatment-feature interactions and a T-learner,
using a randomized train/test split of the supplied Criteo sample.
"""
from __future__ import annotations

import argparse
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

FEATURES = [f"f{i}" for i in range(12)]


def uplift_metrics(y: np.ndarray, treatment: np.ndarray, score: np.ndarray) -> dict:
    n = len(y)
    order = np.argsort(-score, kind="stable")
    treated_total = treatment == 1
    control_total = treatment == 0
    overall_ate = float(y[treated_total].mean() - y[control_total].mean())
    fractions = np.linspace(0.01, 1.0, 100)
    gains = []
    uplifts = []
    counts = []
    for fraction in fractions:
        k = max(2, int(np.ceil(fraction * n)))
        idx = order[:k]
        t_mask = treatment[idx] == 1
        c_mask = ~t_mask
        if not t_mask.any() or not c_mask.any():
            gains.append(np.nan)
            uplifts.append(np.nan)
            counts.append(k)
            continue
        tau = float(y[idx][t_mask].mean() - y[idx][c_mask].mean())
        gains.append(k * tau)
        uplifts.append(tau)
        counts.append(k)
    valid = np.isfinite(gains)
    x = np.asarray(counts, dtype=float)[valid] / n
    gain_per_user = np.asarray(gains, dtype=float)[valid] / n
    if len(x) < 2:
        auuc = qini = float("nan")
    else:
        auuc = float(np.trapz(gain_per_user, x))
        random_curve = x * overall_ate
        qini = float(np.trapz(gain_per_user - random_curve, x))
    top_index = order[: max(2, int(np.ceil(0.10 * n)))]
    top_t = treatment[top_index] == 1
    top_c = ~top_t
    top_uplift = float(y[top_index][top_t].mean() - y[top_index][top_c].mean())
    return {
        "qini_area_per_test_user": qini,
        "auuc_area_per_test_user": auuc,
        "uplift_top_10pct": top_uplift,
        "incremental_conversions_estimate_top_10pct": float(len(top_index) * top_uplift),
        "test_ate_treatment_minus_control": overall_ate,
        "top_10pct_rows": int(len(top_index)),
        "top_10pct_treated": int(top_t.sum()),
        "top_10pct_control": int(top_c.sum()),
    }


def fit_predict(train: pd.DataFrame, test: pd.DataFrame) -> dict[str, np.ndarray]:
    scaler = StandardScaler()
    x_train = scaler.fit_transform(train[FEATURES].to_numpy(dtype=np.float32))
    x_test = scaler.transform(test[FEATURES].to_numpy(dtype=np.float32))
    t_train = train.treatment.to_numpy(dtype=np.int8)
    y_train = train.conversion.to_numpy(dtype=np.int8)

    t_model = LogisticRegression(C=0.1, solver="lbfgs", max_iter=100, random_state=17)
    c_model = LogisticRegression(C=0.1, solver="lbfgs", max_iter=100, random_state=17)
    t_model.fit(x_train[t_train == 1], y_train[t_train == 1])
    c_model.fit(x_train[t_train == 0], y_train[t_train == 0])
    t_prob = t_model.predict_proba(x_test)[:, 1]
    c_prob = c_model.predict_proba(x_test)[:, 1]
    t_uplift = t_prob - c_prob

    # S-learner with explicit linear treatment-feature interactions. This
    # permits heterogeneous treatment effects while keeping the model simple.
    interaction_train = x_train * t_train[:, None]
    interaction_test_1 = x_test
    interaction_test_0 = np.zeros_like(x_test)
    s_train = np.column_stack([x_train, t_train, interaction_train])
    s_model = LogisticRegression(C=0.1, solver="lbfgs", max_iter=100, random_state=17)
    s_model.fit(s_train, y_train)
    s_x1 = np.column_stack([x_test, np.ones(len(x_test)), interaction_test_1])
    s_x0 = np.column_stack([x_test, np.zeros(len(x_test)), interaction_test_0])
    s_uplift = s_model.predict_proba(s_x1)[:, 1] - s_model.predict_proba(s_x0)[:, 1]

    # Practical response-propensity comparator: rank by conversion probability
    # under treatment, without modeling incremental effect.
    return {"t_learner": t_uplift, "s_learner": s_uplift, "treated_propensity": t_prob}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=Path, default=Path("marketing_customer_project/data/criteo_uplift_sample_500k.csv.gz"))
    parser.add_argument("--output", type=Path, default=Path("marketing_customer_project/reports/criteo_uplift_prototype.json"))
    parser.add_argument("--test-size", type=float, default=0.30)
    args = parser.parse_args()
    data = pd.read_csv(args.sample, compression="gzip")
    train_idx, test_idx = train_test_split(
        np.arange(len(data)), test_size=args.test_size, random_state=20261110, stratify=data.treatment
    )
    train, test = data.iloc[train_idx], data.iloc[test_idx]
    predictions = fit_predict(train, test)
    y = test.conversion.to_numpy(dtype=np.int8)
    treatment = test.treatment.to_numpy(dtype=np.int8)
    metrics = {name: uplift_metrics(y, treatment, prediction) for name, prediction in predictions.items()}
    rng = np.random.default_rng(20261110)
    random_scores = rng.random(len(test))
    metrics["random_targeting"] = uplift_metrics(y, treatment, random_scores)
    result = {
        "status": "sample prototype; not final evidence",
        "dataset": str(args.sample),
        "rows": int(len(data)),
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "train_treatment_rate": float(train.treatment.mean()),
        "test_treatment_rate": float(test.treatment.mean()),
        "train_conversion_rate_by_arm": {
            str(k): float(v) for k, v in train.groupby("treatment").conversion.mean().items()
        },
        "test_conversion_rate_by_arm": {
            str(k): float(v) for k, v in test.groupby("treatment").conversion.mean().items()
        },
        "metrics": metrics,
        "interpretation": [
            "Qini/AUUC use the held-out randomized treatment/control outcomes after ranking by predicted uplift.",
            "The metric implementation is preliminary and must be cross-checked against Criteo's reference benchmark before comparing published values.",
            "This random split evaluates individual rows; the source has no user, campaign, advertiser, or time identifiers for grouped or temporal holdouts.",
            "The 500k sample has few conversion events. Results are an implementation check and must not be used to declare a winning uplift model.",
            "Criteo v2.1 is deliberately subsampled; effects are benchmark diagnostics, not original campaign ROI.",
        ],
        "warnings": [],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        main()
