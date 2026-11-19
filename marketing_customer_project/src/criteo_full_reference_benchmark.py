"""Full-holdout Criteo uplift benchmark with a bounded training sample.

Streams the complete v2.1 source. A deterministic row split reserves 20% for
testing; up to 1.1M rows are randomly sampled from the remaining 80% for model
fit. Logistic learners are standardized on the training sample. The evaluation
metric is Criteo's separate-relative AUUC implementation.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

FEATURES = [f"f{i}" for i in range(12)]
LABELS = ["treatment", "conversion", "visit", "exposure"]
EXPECTED_ROWS = 13_979_592
REFERENCE_URL = "https://github.com/criteo-research/large-scale-ITE-UM-benchmark/blob/main/um_util.py"
DTYPES = {**{f: np.float32 for f in FEATURES}, **{name: np.int8 for name in LABELS}}


def chunks(path: Path, chunksize: int):
    return pd.read_csv(path, compression="gzip", dtype=DTYPES, chunksize=chunksize)


def reference_auuc(y: np.ndarray, t: np.ndarray, score: np.ndarray) -> float:
    yt, yc = y[t == 1], y[t == 0]
    st, sc = score[t == 1], score[t == 0]
    pt, pc = float(yt.mean()), float(yc.mean())
    return float(pt * (1 - pt) * roc_auc_score(yt, st) - pc * (1 - pc) * roc_auc_score(yc, sc) + (pt**2 - pc**2) / 2)


def top10(y: np.ndarray, t: np.ndarray, score: np.ndarray) -> dict:
    k = int(np.ceil(len(y) * .10))
    ix = np.argsort(-score, kind="stable")[:k]
    sel_t = t[ix] == 1
    rt, rc = float(y[ix][sel_t].mean()), float(y[ix][~sel_t].mean())
    se = np.sqrt(rt * (1-rt) / sel_t.sum() + rc * (1-rc) / (~sel_t).sum())
    delta = rt - rc
    return {"rows": k, "treated_rate": rt, "control_rate": rc, "uplift_pp": 100*delta,
            "approx_normal_95pct_ci_pp": [float(100*(delta-1.96*se)), float(100*(delta+1.96*se))],
            "incremental_outcomes_estimate_if_all_selected_treated": float(k*delta)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--archive", type=Path, default=Path("marketing_customer_audit/raw/criteo-research-uplift-v2.1.csv.gz"))
    ap.add_argument("--output", type=Path, default=Path("marketing_customer_project/reports/criteo_full_benchmark.json"))
    ap.add_argument("--chunksize", type=int, default=200_000)
    ap.add_argument("--max-train", type=int, default=1_100_000)
    ap.add_argument("--seed", type=int, default=111)
    a = ap.parse_args()
    tic = time.time()

    # Pass 1: random 80/20 assignment and a second independent thinning mask.
    # Row-wise RNG calls are regenerated identically for each subsequent pass.
    rng = np.random.default_rng(a.seed)
    train_parts = {"x": [], "t": [], "visit": [], "conversion": []}
    total = train_n = test_n = 0
    print("Pass 1/3: selecting a random training sample", flush=True)
    for df in chunks(a.archive, a.chunksize):
        if list(df.columns) != FEATURES + LABELS:
            raise ValueError("Unexpected Criteo schema")
        n = len(df)
        is_train = rng.random(n) >= .20
        train_n += int(is_train.sum()); test_n += int((~is_train).sum()); total += n
        # Select approximately max_train rows at random from training rows.
        keep = is_train & (rng.random(n) < min(1., a.max_train / (EXPECTED_ROWS * .8)))
        if keep.any():
            train_parts["x"].append(df.loc[keep, FEATURES].to_numpy(np.float32, copy=True))
            for label in ("treatment", "visit", "conversion"):
                key = "t" if label == "treatment" else label
                train_parts[key].append(df.loc[keep, label].to_numpy(np.int8, copy=True))
    if total != EXPECTED_ROWS:
        raise ValueError(f"Expected {EXPECTED_ROWS:,} rows, found {total:,}")
    X = np.concatenate(train_parts["x"]); t_train = np.concatenate(train_parts["t"])
    yv_train = np.concatenate(train_parts["visit"]); yc_train = np.concatenate(train_parts["conversion"])
    del train_parts
    scaler = StandardScaler(copy=False).fit(X)
    X = scaler.transform(X).astype(np.float32, copy=False)
    print(f"Training sample: {len(X):,}; full holdout: {test_n:,}", flush=True)

    models = {}
    for outcome, y in (("visit", yv_train), ("conversion", yc_train)):
        for arm in (0, 1):
            mask = t_train == arm
            model = LogisticRegression(C=1.0, solver="lbfgs", max_iter=300, random_state=a.seed)
            model.fit(X[mask], y[mask]); models[(outcome, arm)] = model
        # S learner with treatment and treatment-feature interactions.
        sx = np.column_stack((X, t_train.astype(np.float32), X * t_train[:, None]))
        model = LogisticRegression(C=1.0, solver="lbfgs", max_iter=300, random_state=a.seed)
        model.fit(sx, y); models[(outcome, "s")] = model
    del X, sx

    # Reconstruct the same row split on the scoring pass. Consume the second
    # random draw on every row so split masks stay aligned with pass 1.
    y_hold = {out: np.empty(test_n, dtype=np.int8) for out in ("visit", "conversion")}
    t_hold = np.empty(test_n, dtype=np.int8)
    score_hold = {f"{out}_{name}": np.empty(test_n, dtype=np.float32)
                  for out in ("visit", "conversion") for name in ("t_learner", "s_learner", "response_propensity")}
    rng = np.random.default_rng(a.seed); pos = 0
    print("Pass 3/3: scoring every holdout row", flush=True)
    for df in chunks(a.archive, a.chunksize):
        n = len(df); train_mask = rng.random(n) >= .20; rng.random(n)
        test_mask = ~train_mask; count = int(test_mask.sum())
        if not count: continue
        x = scaler.transform(df.loc[test_mask, FEATURES].to_numpy(np.float32, copy=True))
        t = df.loc[test_mask, "treatment"].to_numpy(np.int8, copy=False)
        for out in ("visit", "conversion"):
            p1 = models[(out, 1)].predict_proba(x)[:, 1]
            p0 = models[(out, 0)].predict_proba(x)[:, 1]
            sx1 = np.column_stack((x, np.ones(count, np.float32), x))
            sx0 = np.column_stack((x, np.zeros(count, np.float32), np.zeros_like(x)))
            ps1 = models[(out, "s")].predict_proba(sx1)[:, 1]
            ps0 = models[(out, "s")].predict_proba(sx0)[:, 1]
            score_hold[f"{out}_t_learner"][pos:pos+count] = p1-p0
            score_hold[f"{out}_s_learner"][pos:pos+count] = ps1-ps0
            score_hold[f"{out}_response_propensity"][pos:pos+count] = p1
            y_hold[out][pos:pos+count] = df.loc[test_mask, out].to_numpy(np.int8, copy=False)
        t_hold[pos:pos+count] = t; pos += count
    if pos != test_n: raise RuntimeError(f"Holdout rows mismatch: {pos} != {test_n}")

    outcomes = []
    for out in ("visit", "conversion"):
        y = y_hold[out]
        rates = {str(int(v)): float(y[t_hold == v].mean()) for v in (0, 1)}
        models_out = {}
        for name in ("t_learner", "s_learner", "response_propensity"):
            s = score_hold[f"{out}_{name}"]
            models_out[name] = {"criteo_separate_relative_auuc": reference_auuc(y, t_hold, s), "uplift_at_10pct": top10(y, t_hold, s)}
        rng = np.random.default_rng(a.seed + (0 if out == "visit" else 1000))
        rand_scores = rng.random(test_n).astype(np.float32)
        random_stats = [reference_auuc(y, t_hold, np.random.default_rng(seed).random(test_n)) for seed in range(a.seed+20, a.seed+40)]
        outcomes.append({"outcome": out, "test_events": int(y.sum()), "test_rate_by_treatment": rates,
                         "test_ate_treatment_minus_control": rates["1"] - rates["0"], "models": models_out,
                         "random_ranking_single_draw": {"criteo_separate_relative_auuc": reference_auuc(y,t_hold,rand_scores), "uplift_at_10pct": top10(y,t_hold,rand_scores)},
                         "random_ranking_20_draws": {"auuc_mean": float(np.mean(random_stats)), "auuc_sd": float(np.std(random_stats,ddof=1))}})
    result = {"status": "complete full-source holdout; bounded-sample model fit",
              "source_rows": total, "training_rows": int(train_n), "training_sample_rows": int(len(t_train)), "holdout_rows": int(test_n),
              "source_file": str(a.archive), "metric_reference": REFERENCE_URL,
              "protocol": {"split": "deterministic row-level 80/20 holdout; seed 111", "fit_sample": "random thinning of training rows, target 1.1M", "features": "12 anonymized numeric features, standardized using fit sample only", "models": "logistic T learner by randomized arm; S learner with treatment-feature interactions; treated-arm response-propensity comparator; random ranking", "metric": "Criteo separate-relative AUUC; uplift@10 is treated-control outcome rate difference among top 10%", "seed": a.seed, "elapsed_seconds": round(time.time()-tic,1)}, "outcomes": outcomes}
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(a.output), "training_sample_rows": len(t_train), "holdout_rows": test_n, "outcomes": outcomes}, indent=2), flush=True)


if __name__ == "__main__": main()
