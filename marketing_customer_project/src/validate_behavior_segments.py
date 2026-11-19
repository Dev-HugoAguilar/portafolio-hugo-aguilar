"""Temporal and subsampling validation for behavior-only customer segments.

No campaign outcome, demographic or post-cutoff variable enters clustering.
Campaign redemptions are joined only after clusters are frozen, as a
descriptive future-behavior check.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pyreadr
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score, calinski_harabasz_score, davies_bouldin_score, silhouette_score
from sklearn.preprocessing import StandardScaler


def load_transactions(path: Path) -> pd.DataFrame:
    objects = pyreadr.read_r(str(path))
    if len(objects) != 1:
        raise ValueError(f"Expected one RDS object, got {len(objects)}")
    tx = next(iter(objects.values())).copy()
    for col in ("household_id", "basket_id", "product_id"):
        tx[col] = tx[col].astype(str).str.replace(r"\.0$", "", regex=True)
    tx["transaction_timestamp"] = pd.to_datetime(tx["transaction_timestamp"])
    return tx


def build_snapshot(tx: pd.DataFrame, products: pd.DataFrame, cutoff: str, window_days: int,
                   department_levels: list[str]) -> tuple[pd.DataFrame, np.ndarray, list[str]]:
    boundary = pd.Timestamp(cutoff)
    lower = boundary - pd.Timedelta(days=window_days)
    hist = tx.loc[tx["transaction_timestamp"].ge(lower) & tx["transaction_timestamp"].lt(boundary)].copy()
    hist = hist.merge(products[["product_id", "department"]], on="product_id", how="left", validate="many_to_one")
    hist["department"] = hist["department"].fillna("UNKNOWN")
    hist["department_group"] = hist["department"].where(hist["department"].isin(department_levels), "OTHER")

    p = hist.groupby("household_id").agg(
        purchase_lines=("basket_id", "size"),
        baskets=("basket_id", "nunique"),
        sales=("sales_value", "sum"),
        distinct_products=("product_id", "nunique"),
        last_purchase=("transaction_timestamp", "max"),
        coupon_lines=("coupon_disc", lambda x: int((x > 0).sum())),
        retail_discount=("retail_disc", "sum"),
    )
    p["recency_days"] = (boundary - p["last_purchase"]).dt.total_seconds() / 86400
    p["sales_per_basket"] = p["sales"].clip(lower=0) / p["baskets"].clip(lower=1)
    p["lines_per_basket"] = p["purchase_lines"] / p["baskets"].clip(lower=1)
    p["coupon_line_rate"] = p["coupon_lines"] / p["purchase_lines"].clip(lower=1)
    p["retail_discount_per_line"] = p["retail_discount"] / p["purchase_lines"].clip(lower=1)
    p = p.drop(columns=["last_purchase", "coupon_lines", "retail_discount"])

    depts = department_levels + ["OTHER"]
    shares = pd.crosstab(hist["household_id"], hist["department_group"])
    shares = shares.reindex(columns=depts, fill_value=0)
    shares = shares.div(shares.sum(axis=1).replace(0, 1), axis=0)
    shares.columns = [f"department_share::{x}" for x in shares.columns]
    p = p.join(shares, how="left").fillna(0)

    feature_cols = ["purchase_lines", "baskets", "sales", "distinct_products", "recency_days", "sales_per_basket", "lines_per_basket", "coupon_line_rate", "retail_discount_per_line"] + list(shares.columns)
    x = p[feature_cols].replace([np.inf, -np.inf], np.nan).fillna(0).copy()
    for col in ["purchase_lines", "baskets", "sales", "distinct_products", "recency_days", "sales_per_basket", "lines_per_basket"]:
        x[col] = np.log1p(x[col].clip(lower=0))
    # Winsorize continuous behavior features to prevent rare outliers creating
    # tiny, non-actionable singleton clusters.
    for col in ["purchase_lines", "baskets", "sales", "distinct_products", "recency_days", "sales_per_basket", "lines_per_basket", "coupon_line_rate", "retail_discount_per_line"]:
        lo, hi = x[col].quantile([.005, .995])
        x[col] = x[col].clip(lo, hi)
    matrix = StandardScaler().fit_transform(x).astype(np.float32)
    return p, matrix, feature_cols


def fit_candidates(matrix: np.ndarray, seed: int) -> tuple[list[dict], dict[int, np.ndarray]]:
    rows, labels_by_k = [], {}
    for k in range(2, 9):
        model = KMeans(n_clusters=k, random_state=seed, n_init=30)
        labels = model.fit_predict(matrix)
        labels_by_k[k] = labels
        sizes = np.bincount(labels, minlength=k)
        rows.append({"k": k, "silhouette": float(silhouette_score(matrix, labels)),
                     "davies_bouldin": float(davies_bouldin_score(matrix, labels)),
                     "calinski_harabasz": float(calinski_harabasz_score(matrix, labels)),
                     "min_cluster_share": float(sizes.min() / len(labels)),
                     "cluster_sizes": [int(v) for v in sizes]})
    return rows, labels_by_k


def sample_stability(matrix: np.ndarray, reference: np.ndarray, k: int, seed: int, repeats: int = 20) -> dict:
    rng = np.random.default_rng(seed)
    vals = []
    n = len(matrix)
    for i in range(repeats):
        ids = rng.choice(n, size=max(k + 1, int(.80 * n)), replace=False)
        scaler = StandardScaler().fit(matrix[ids])
        # matrix is already standardized; re-scaling the subsample assesses
        # sensitivity to which households define the standardization as well.
        z = scaler.transform(matrix)
        model = KMeans(n_clusters=k, random_state=seed + i + 1, n_init=20).fit(z[ids])
        pred = model.predict(z)
        vals.append(float(adjusted_rand_score(reference, pred)))
    return {"method": "20 subsamples without replacement, 80% of households; refit scaler and KMeans, compare assignments by ARI",
            "ari_mean": float(np.mean(vals)), "ari_min": float(np.min(vals)), "ari_max": float(np.max(vals)), "ari_values": vals}


def response_check(data_dir: Path, tx_path: Path, tx: pd.DataFrame, snapshots: dict[str, pd.DataFrame], chosen_k: int, chosen_labels: dict[str, np.ndarray]) -> dict:
    from response_propensity import build_exposure_frame

    exposures = build_exposure_frame(data_dir, tx_path)
    redemptions = pd.read_csv(data_dir / "coupon_redemptions.csv", parse_dates=["redemption_date"])
    complete_through = redemptions["redemption_date"].max().normalize()
    out = []
    for cutoff, profile in snapshots.items():
        boundary = pd.Timestamp(cutoff)
        seg = pd.Series(chosen_labels[cutoff], index=profile.index, name="cluster")
        future = exposures.loc[exposures["start_date"].ge(boundary) & exposures["end_date"].le(complete_through)].copy()
        future["cluster"] = future["household_id"].map(seg)
        future = future.loc[future["cluster"].notna()].copy()
        if future.empty:
            out.append({"cutoff": cutoff, "campaigns": 0, "eligible_pairs": 0, "segments": []})
            continue
        future["cluster"] = future["cluster"].astype(int)
        grouped = future.groupby("cluster").agg(pairs=("response", "size"), responses=("response", "sum"), rate=("response", "mean"), households=("household_id", "nunique"), campaigns=("campaign_id", "nunique")).reset_index()
        out.append({"cutoff": cutoff, "complete_outcome_through": complete_through.strftime("%Y-%m-%d"),
                    "eligible_pairs": int(len(future)), "campaigns": int(future["campaign_id"].nunique()),
                    "segments": grouped.to_dict(orient="records"),
                    "interpretation": "descriptive future coupon redemption among exposed household-campaign pairs; campaigns and households repeat, and allocation was not established as randomized"})
    return {"results": out, "label_completeness_rule": "only future campaigns ending on/before last observed redemption date are included"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", type=Path, default=Path("marketing_customer_audit/exports"))
    ap.add_argument("--transactions-rds", type=Path, default=Path("marketing_customer_audit/raw/transactions_full.rds"))
    ap.add_argument("--cutoffs", nargs="+", default=["2017-07-01", "2017-08-01", "2017-09-01"])
    ap.add_argument("--window-days", type=int, default=90)
    ap.add_argument("--output", type=Path, default=Path("marketing_customer_project/reports/behavior_segments_validation.json"))
    a = ap.parse_args()
    tx = load_transactions(a.transactions_rds)
    products = pd.read_csv(a.data_dir / "products.csv", dtype={"product_id": str})
    products["product_id"] = products["product_id"].astype(str).str.replace(r"\.0$", "", regex=True)
    products["department"] = products["department"].fillna("UNKNOWN").astype(str)

    # Freeze the department vocabulary using the first available pre-cutoff
    # window; all later snapshots use the same top 10 + OTHER schema.
    first_boundary = pd.Timestamp(a.cutoffs[0])
    first_lower = first_boundary - pd.Timedelta(days=a.window_days)
    first_hist = tx.loc[tx["transaction_timestamp"].ge(first_lower) & tx["transaction_timestamp"].lt(first_boundary)]
    first_hist = first_hist.merge(products[["product_id", "department"]], on="product_id", how="left", validate="many_to_one")
    department_levels = first_hist["department"].fillna("UNKNOWN").astype(str).value_counts().head(10).index.tolist()

    snapshots, matrices, candidate_rows, labels_for_k = {}, {}, {}, {}
    for idx, cutoff in enumerate(a.cutoffs):
        profile, matrix, features = build_snapshot(tx, products, cutoff, a.window_days, department_levels)
        candidates, labels = fit_candidates(matrix, seed=42)
        snapshots[cutoff], matrices[cutoff], candidate_rows[cutoff], labels_for_k[cutoff] = profile, matrix, candidates, labels

    # Apply a business viability constraint: exclude clusters smaller than 5%
    # of households, then choose the highest silhouette among remaining k.
    selected_ks = {}
    for cutoff in a.cutoffs:
        viable = [row for row in candidate_rows[cutoff] if row["min_cluster_share"] >= .05]
        if not viable:
            raise ValueError(f"No viable clustering at {cutoff}; minimum cluster share is 5%")
        selected_ks[cutoff] = max(viable, key=lambda row: row["silhouette"])["k"]
    selected_labels = {cutoff: labels_for_k[cutoff][selected_ks[cutoff]] for cutoff in a.cutoffs}
    # For temporal ARI, use k=2 as a fixed common granularity across snapshots;
    # this keeps the month-to-month comparison interpretable even if a cutoff
    # selects a different k under the viability rule.
    stability_k = 2
    stability_labels = {cutoff: labels_for_k[cutoff][stability_k] for cutoff in a.cutoffs}
    per_cut = []
    for cutoff in a.cutoffs:
        p, matrix, labels = snapshots[cutoff], matrices[cutoff], selected_labels[cutoff]
        p = p.copy(); p["cluster"] = labels
        prof = p.groupby("cluster").agg(households=("baskets", "size"),
             median_baskets=("baskets", "median"), median_sales=("sales", "median"),
             median_recency_days=("recency_days", "median"), median_products=("distinct_products", "median"),
             median_coupon_line_rate=("coupon_line_rate", "median"), median_sales_per_basket=("sales_per_basket", "median")).reset_index()
        per_cut.append({"cutoff": cutoff, "window_start": (pd.Timestamp(cutoff)-pd.Timedelta(days=a.window_days)).strftime("%Y-%m-%d"),
            "window_days": a.window_days, "households": int(len(p)),
            "features": features, "candidate_k": candidate_rows[cutoff],
            "selected_k_minimum_5pct_cluster": int(selected_ks[cutoff]),
            "temporal_ari_comparison_k_common": stability_k,
            "selected_k_subsample_stability": sample_stability(matrix, labels, int(selected_ks[cutoff]), seed=500+len(per_cut)),
            "profiles": prof.to_dict(orient="records")})

    temporal = []
    for i, left in enumerate(a.cutoffs):
        for right in a.cutoffs[i+1:]:
            common = snapshots[left].index.intersection(snapshots[right].index)
            l = pd.Series(stability_labels[left], index=snapshots[left].index).loc[common]
            r = pd.Series(stability_labels[right], index=snapshots[right].index).loc[common]
            temporal.append({"cutoff_a": left, "cutoff_b": right, "common_households": int(len(common)),
                             "adjusted_rand_index_k2": float(adjusted_rand_score(l, r))})

    result = {"source": "Complete Journey full transactions RDS + product department catalog",
        "transaction_rows": int(len(tx)), "window_days": a.window_days, "cutoffs": a.cutoffs,
        "unit": "household; each snapshot includes households with at least one transaction in the trailing window",
        "features_policy": "behavioral variables and department shares from transactions strictly before each cutoff; department vocabulary fixed from first pre-cutoff window (top 10 + OTHER); continuous features log-transformed where appropriate and winsorized at 0.5/99.5 percentiles; no campaign outcomes, demographics, or post-cutoff information enter clustering",
        "candidate_selection_policy": "compare k=2..8; reject any solution with a cluster below 5% of households, then choose the highest silhouette among viable solutions; report all diagnostics and do not interpret this as a universal optimum",
        "department_vocabulary": department_levels + ["OTHER"],
        "per_cutoff": per_cut, "temporal_stability": temporal,
        "future_campaign_response_check": response_check(a.data_dir, a.transactions_rds, tx, snapshots, 0, selected_labels),
        "limits": ["Cutoffs and households overlap; temporal ARI is a stability diagnostic, not independent replication.",
                   "Subsample ARI measures assignment sensitivity under removal of 20% of households; it is not a confidence interval.",
                   "Future coupon response is descriptive, only among exposed household-campaign pairs, and not causal uplift.",
                   "Complete Journey covers one retailer and 2017-2018; profiles are behavioral patterns in this dataset, not universal customer types."]}
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(a.output), "transaction_rows": len(tx), "per_cutoff": per_cut,
                      "temporal_stability": temporal, "future_campaign_response_check": result["future_campaign_response_check"]}, indent=2, ensure_ascii=False))


if __name__ == "__main__": main()
