"""Behavior-only segmentation with an out-of-time descriptive response check."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pyreadr
from sklearn.cluster import KMeans
from sklearn.metrics import davies_bouldin_score, silhouette_score
from sklearn.preprocessing import StandardScaler

from response_propensity import build_exposure_frame


def normalize_id(values: pd.Series) -> pd.Series:
    return values.astype(str).str.replace(r"\.0$", "", regex=True)


def run(data_dir: Path, transactions_rds: Path, cutoff: str) -> dict:
    transactions = next(iter(pyreadr.read_r(str(transactions_rds)).values())).copy()
    transactions["household_id"] = transactions["household_id"].astype(str)
    transactions["product_id"] = normalize_id(transactions["product_id"])
    transactions["transaction_timestamp"] = pd.to_datetime(transactions["transaction_timestamp"])
    boundary = pd.Timestamp(cutoff)
    history = transactions.loc[transactions["transaction_timestamp"].lt(boundary)].copy()

    products = pd.read_csv(data_dir / "products.csv", dtype={"product_id": str})
    products["product_id"] = normalize_id(products["product_id"])
    history = history.merge(
        products[["product_id", "department"]].drop_duplicates("product_id"),
        on="product_id",
        how="left",
        validate="many_to_one",
    )

    profile = history.groupby("household_id").agg(
        purchase_lines=("basket_id", "size"),
        baskets=("basket_id", "nunique"),
        sales=("sales_value", "sum"),
        distinct_products=("product_id", "nunique"),
        last_purchase=("transaction_timestamp", "max"),
        coupon_lines=("coupon_disc", lambda values: int((values > 0).sum())),
        retail_discount=("retail_disc", "sum"),
    )
    profile["recency_days"] = (boundary - profile["last_purchase"]).dt.total_seconds() / 86400
    profile["sales_per_basket"] = profile["sales"] / profile["baskets"].clip(lower=1)
    profile["coupon_line_rate"] = profile["coupon_lines"] / profile["purchase_lines"].clip(lower=1)
    profile["retail_discount_per_line"] = profile["retail_discount"] / profile["purchase_lines"].clip(lower=1)
    profile = profile.drop(columns=["last_purchase", "coupon_lines", "retail_discount"])

    top_departments = history["department"].fillna("Unknown").value_counts().head(10).index
    department_mix = pd.crosstab(history["household_id"], history["department"].fillna("Unknown"))
    department_mix = department_mix.reindex(columns=top_departments, fill_value=0)
    department_mix = department_mix.div(department_mix.sum(axis=1).replace(0, 1), axis=0)
    department_mix.columns = [f"department_share_{index}" for index in range(department_mix.shape[1])]
    profile = profile.join(department_mix, how="left").fillna(0)

    features = profile.copy()
    for column in ["purchase_lines", "baskets", "sales", "distinct_products", "recency_days", "sales_per_basket"]:
        features[column] = np.log1p(features[column].clip(lower=0))
    matrix = StandardScaler().fit_transform(features)

    candidates = []
    for k in range(2, 9):
        clusterer = KMeans(n_clusters=k, random_state=42, n_init=20)
        labels = clusterer.fit_predict(matrix)
        candidates.append(
            {
                "k": k,
                "silhouette": float(silhouette_score(matrix, labels)),
                "davies_bouldin": float(davies_bouldin_score(matrix, labels)),
                "labels": labels,
            }
        )
    selected = max(candidates, key=lambda row: row["silhouette"])
    profile["cluster"] = selected["labels"]

    exposures = build_exposure_frame(data_dir, transactions_rds)
    future = exposures.loc[exposures["start_date"].ge(boundary)].copy()
    future["cluster"] = future["household_id"].map(profile["cluster"])
    future["cluster"] = future["cluster"].fillna(-1).astype(int)

    operational_profile = (
        profile.groupby("cluster")
        .agg(
            households=("baskets", "size"),
            median_baskets=("baskets", "median"),
            median_sales=("sales", "median"),
            median_recency_days=("recency_days", "median"),
            median_products=("distinct_products", "median"),
            median_coupon_line_rate=("coupon_line_rate", "median"),
        )
        .reset_index()
    )
    future_response = (
        future.groupby("cluster", as_index=False)
        .agg(exposed_household_campaigns=("response", "size"), responded_pairs=("response", "sum"), response_rate=("response", "mean"))
    )
    return {
        "cutoff": cutoff,
        "feature_window_start": history["transaction_timestamp"].min().strftime("%Y-%m-%d"),
        "transactions_before_cutoff": int(len(history)),
        "households_clustered": int(profile.shape[0]),
        "product_department_metadata_coverage": float(history["department"].notna().mean()),
        "selection_rule": "highest silhouette over k=2..8; exploratory, not a business optimum",
        "candidate_k": [{key: row[key] for key in ("k", "silhouette", "davies_bouldin")} for row in candidates],
        "selected_k": selected["k"],
        "profiles": operational_profile.to_dict(orient="records"),
        "future_campaign_response_by_cluster": future_response.to_dict(orient="records"),
        "future_campaign_response_overall": {
            "exposed_pairs": int(len(future)),
            "responded_pairs": int(future["response"].sum()),
            "rate": float(future["response"].mean()),
            "campaigns": int(future["campaign_id"].nunique()),
        },
        "interpretation_limit": "Response rates are descriptive among previously exposed households; this is not campaign uplift or causal impact.",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("marketing_customer_audit/exports"))
    parser.add_argument("--transactions-rds", type=Path, default=Path("marketing_customer_audit/raw/transactions_full.rds"))
    parser.add_argument("--cutoff", default="2017-08-01")
    parser.add_argument("--output", type=Path, default=Path("marketing_customer_project/reports/behavior_segments.json"))
    args = parser.parse_args()
    result = run(args.data_dir, args.transactions_rds, args.cutoff)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
