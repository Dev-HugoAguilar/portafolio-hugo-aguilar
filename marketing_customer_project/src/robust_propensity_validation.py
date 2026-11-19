"""Leakage-aware temporal validation for campaign redemption propensity.

Training labels are eligible only after the whole campaign has ended. Test
campaigns start on/after the cutoff. The same future test window is reported
for households with/without an exposure row in supervised training. The latter
are not necessarily new retail customers: transaction histories may exist.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from response_propensity import CAT_FEATURES, NUM_FEATURES, build_exposure_frame


def make_model() -> Pipeline:
    preprocessing = ColumnTransformer(
        [
            (
                "categorical",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="constant", fill_value="Desconocido")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                CAT_FEATURES,
            ),
            (
                "numeric",
                Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]),
                NUM_FEATURES,
            ),
        ]
    )
    return Pipeline(
        [("features", preprocessing), ("classifier", LogisticRegression(max_iter=2000, random_state=17))]
    )


def metricas(y: np.ndarray, score: np.ndarray) -> dict[str, float]:
    if len(np.unique(y)) < 2:
        return {"roc_auc": float("nan"), "average_precision": float("nan"), "brier": float("nan"), "log_loss": float("nan")}
    return {
        "roc_auc": float(roc_auc_score(y, score)),
        "average_precision": float(average_precision_score(y, score)),
        "brier": float(brier_score_loss(y, score)),
        "log_loss": float(log_loss(y, score, labels=[0, 1])),
    }


def curva_calibracion(y: np.ndarray, probability: np.ndarray, bins: int = 10) -> list[dict]:
    frame = pd.DataFrame({"observed": y, "probability": probability})
    # Equal-frequency bins are more stable than fixed-width bins at this sample
    # size. Duplicated edges are dropped when scores have ties.
    frame["bin"] = pd.qcut(frame.probability, q=bins, duplicates="drop")
    grouped = frame.groupby("bin", observed=True).agg(
        rows=("observed", "size"),
        observed_rate=("observed", "mean"),
        mean_probability=("probability", "mean"),
        min_probability=("probability", "min"),
        max_probability=("probability", "max"),
    )
    return [
        {
            "rows": int(row.rows),
            "observed_rate": float(row.observed_rate),
            "mean_probability": float(row.mean_probability),
            "min_probability": float(row.min_probability),
            "max_probability": float(row.max_probability),
        }
        for row in grouped.itertuples()
    ]


def bootstrap_campanas(test: pd.DataFrame, probability: np.ndarray, n_boot: int = 2000) -> dict:
    """Percentile intervals from resampling whole test campaigns.

    This preserves within-campaign dependence. Households can recur across
    campaigns, so the intervals are a campaign-cluster sensitivity estimate,
    not a fully crossed cluster-robust interval.
    """
    campaign_ids = test.campaign_id.unique()
    rng = np.random.default_rng(20261110)
    y_all = test.response.to_numpy()
    p_all = np.asarray(probability)
    ids = test.campaign_id.to_numpy()
    samples: dict[str, list[float]] = {"average_precision": [], "brier": [], "top_decile_lift": []}
    for _ in range(n_boot):
        selected = rng.choice(campaign_ids, size=len(campaign_ids), replace=True)
        row_indices = np.concatenate([np.flatnonzero(ids == campaign_id) for campaign_id in selected])
        y, p = y_all[row_indices], p_all[row_indices]
        if len(np.unique(y)) < 2:
            continue
        n_top = max(1, int(np.ceil(0.10 * len(y))))
        top = np.argsort(-p, kind="stable")[:n_top]
        prevalence = float(y.mean())
        samples["average_precision"].append(float(average_precision_score(y, p)))
        samples["brier"].append(float(brier_score_loss(y, p)))
        if prevalence > 0:
            samples["top_decile_lift"].append(float(y[top].mean() / prevalence))
    intervals = {}
    for name, values in samples.items():
        if values:
            intervals[name] = {
                "lower_2_5_pct": float(np.quantile(values, 0.025)),
                "upper_97_5_pct": float(np.quantile(values, 0.975)),
                "valid_resamples": int(len(values)),
            }
        else:
            intervals[name] = {"lower_2_5_pct": None, "upper_97_5_pct": None, "valid_resamples": 0}
    return {
        "cluster_unit": "campaign_id",
        "campaign_clusters": int(len(campaign_ids)),
        "requested_resamples": n_boot,
        "intervals": intervals,
        "caveat": "Households may recur across campaigns; this interval preserves within-campaign dependence but does not model cross-campaign household dependence.",
    }


def evaluar(frame: pd.DataFrame, cutoff: str) -> dict:
    boundary = pd.Timestamp(cutoff)
    # A training outcome is available only after the campaign's redemption
    # period has closed. Exposures from in-flight campaigns are neither train
    # nor test rows for this cutoff.
    train = frame.loc[frame["end_date"].lt(boundary)].copy()
    test = frame.loc[frame["start_date"].ge(boundary)].copy()
    if train.empty or test.empty or train.response.nunique() < 2 or test.response.nunique() < 2:
        raise ValueError(f"Cutoff {cutoff} does not leave both classes in train and test")

    features = CAT_FEATURES + NUM_FEATURES
    model = make_model().fit(train[features], train.response)
    probabilities = model.predict_proba(test[features])[:, 1]
    known_households = set(train.household_id)
    is_known = test.household_id.isin(known_households).to_numpy()
    test_y = test.response.to_numpy()

    def summarize(mask: np.ndarray, scores: np.ndarray) -> dict:
        y = test_y[mask]
        p = scores[mask]
        n_top = max(1, int(np.ceil(0.10 * len(y)))) if len(y) else 0
        top_idx = np.argsort(-p, kind="stable")[:n_top] if n_top else np.array([], dtype=int)
        top_rate = float(y[top_idx].mean()) if n_top else float("nan")
        rate = float(y.mean()) if len(y) else float("nan")
        return {
            "rows": int(len(y)),
            "positive_pairs": int(y.sum()),
            "households": int(test.loc[mask, "household_id"].nunique()),
            "campaigns": int(test.loc[mask, "campaign_id"].nunique()),
            **metricas(y, p),
            "top_decile_response_rate": top_rate,
            "base_response_rate": rate,
            "top_decile_lift": float(top_rate / rate) if rate > 0 else None,
        }

    baseline_type = (
        train.groupby("campaign_type").response.mean().to_dict()
    )
    type_score = test.campaign_type.map(baseline_type).fillna(float(train.response.mean())).to_numpy(dtype=float)
    history_score = test.prior_response_rate.fillna(0).to_numpy(dtype=float)

    campaign_results = (
        test.assign(predicted_probability=probabilities)
        .groupby(["campaign_id", "campaign_type", "start_date", "end_date"], as_index=False)
        .agg(
            exposures=("response", "size"),
            responses=("response", "sum"),
            observed_rate=("response", "mean"),
            mean_score=("predicted_probability", "mean"),
        )
        .sort_values("start_date")
    )
    campaign_results["start_date"] = campaign_results.start_date.dt.strftime("%Y-%m-%d")
    campaign_results["end_date"] = campaign_results.end_date.dt.strftime("%Y-%m-%d")
    campaign_metrics = []
    for campaign_id, positions in test.reset_index(drop=True).groupby("campaign_id").indices.items():
        positions = np.asarray(positions, dtype=int)
        y_campaign = test_y[positions]
        p_campaign = probabilities[positions]
        n_top = max(1, int(np.ceil(0.10 * len(y_campaign))))
        top = np.argsort(-p_campaign, kind="stable")[:n_top]
        rate = float(y_campaign.mean())
        campaign_metrics.append(
            {
                "campaign_id": int(campaign_id),
                "average_precision": float(average_precision_score(y_campaign, p_campaign)) if len(np.unique(y_campaign)) == 2 else None,
                "top_decile_response_rate": float(y_campaign[top].mean()),
                "top_decile_lift": float(y_campaign[top].mean() / rate) if rate > 0 else None,
            }
        )
    campaign_results = campaign_results.merge(pd.DataFrame(campaign_metrics), on="campaign_id", how="left", validate="one_to_one")

    unresolved = frame.loc[frame.start_date.lt(boundary) & frame.end_date.ge(boundary)]
    return {
        "design": "forward temporal holdout; training campaigns must have ended before cutoff; test campaigns start on/after cutoff",
        "cutoff": cutoff,
        "train": {
            "rows": int(len(train)),
            "positive_pairs": int(train.response.sum()),
            "response_rate": float(train.response.mean()),
            "campaigns": int(train.campaign_id.nunique()),
            "last_training_campaign_end": train.end_date.max().strftime("%Y-%m-%d"),
        },
        "excluded_in_flight_at_cutoff": {
            "rows": int(len(unresolved)),
            "campaigns": int(unresolved.campaign_id.nunique()),
        },
        "test": {
            "rows": int(len(test)),
            "positive_pairs": int(test.response.sum()),
            "response_rate": float(test.response.mean()),
            "campaigns": int(test.campaign_id.nunique()),
            "first_test_campaign_start": test.start_date.min().strftime("%Y-%m-%d"),
            "last_test_campaign_end": test.end_date.max().strftime("%Y-%m-%d"),
        },
        "households_seen_in_training": summarize(is_known, probabilities),
        "households_not_seen_in_training": summarize(~is_known, probabilities),
        "all_test": summarize(np.ones(len(test), dtype=bool), probabilities),
        "calibration": {
            "method": "deciles of predicted probability, calculated on the held-out period; diagnostic only, not used to recalibrate",
            "deciles": curva_calibracion(test_y, probabilities),
            "campaign_mean_absolute_gap": float(
                np.average(
                    np.abs(campaign_results.observed_rate - campaign_results.mean_score),
                    weights=campaign_results.exposures,
                )
            ),
        },
        "campaign_cluster_bootstrap": bootstrap_campanas(test, probabilities),
        "baselines_all_test": {
            "campaign_type_rate": metricas(test_y, type_score),
            "prior_response_rate": metricas(test_y, history_score),
        },
        "coverage": {
            "test_exposures_with_prior_90d_transaction": float(test.purchase_lines_90d.notna().mean()),
            "test_exposures_with_demographics": float(test.age.notna().mean()),
            "test_rows_from_households_seen_in_train": int(is_known.sum()),
            "test_rows_from_new_households": int((~is_known).sum()),
        },
        "campaign_results": campaign_results.to_dict(orient="records"),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("marketing_customer_audit/exports"))
    parser.add_argument("--transactions-rds", type=Path, default=Path("marketing_customer_audit/raw/transactions_full.rds"))
    parser.add_argument("--cutoffs", nargs="+", default=["2017-06-01", "2017-08-01", "2017-10-01"])
    parser.add_argument("--output", type=Path, default=Path("marketing_customer_project/reports/robust_propensity_validation.json"))
    args = parser.parse_args()
    frame = build_exposure_frame(args.data_dir, args.transactions_rds)
    result = {
        "purpose": "robustness audit; not an independent causal evaluation",
        "dataset_rows": int(len(frame)),
        "unique_households": int(frame.household_id.nunique()),
        "unique_campaigns": int(frame.campaign_id.nunique()),
        "cutoff_results": [evaluar(frame, cutoff) for cutoff in args.cutoffs],
        "interpretation_limits": [
            "The outcome is redemption among exposed households, not incremental campaign impact.",
            "The test windows for different cutoffs overlap; they are sensitivity checks, not independent replications.",
            "Households absent from supervised training may still have pre-cutoff transaction history; this is not a strict new-customer cold-start test.",
            "Campaign bootstrap intervals preserve within-campaign clustering but do not account for households recurring across campaigns.",
            "Results are conditional on the small historical campaign sample and are not evidence of market-wide transfer.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    main()
