"""Temporal proof of feasibility for campaign redemption propensity.

Builds one row per household-campaign exposure and uses only information
available before each campaign start. The bundled transactions_sample is not
used: the script requires the full Complete Journey transactions RDS file.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pyreadr
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    log_loss,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


CAT_FEATURES = [
    "campaign_type",
    "age",
    "income",
    "home_ownership",
    "marital_status",
    "household_size",
    "household_comp",
    "kids_count",
]
NUM_FEATURES = [
    "purchase_lines_90d",
    "baskets_90d",
    "products_90d",
    "log_sales_90d",
    "coupon_discount_90d",
    "recency_days",
    "history_coverage_days",
    "prior_campaigns",
    "prior_redemptions",
    "prior_response_rate",
]


def read_full_transactions(path: Path) -> pd.DataFrame:
    objects = pyreadr.read_r(str(path))
    if len(objects) != 1:
        raise ValueError(f"Expected one RDS object, got {len(objects)}")
    tx = next(iter(objects.values())).copy()
    tx["household_id"] = tx["household_id"].astype(str)
    tx["product_id"] = tx["product_id"].astype(str)
    tx["basket_id"] = tx["basket_id"].astype(str)
    tx["transaction_timestamp"] = pd.to_datetime(tx["transaction_timestamp"])
    return tx


def build_exposure_frame(data_dir: Path, transactions_rds: Path) -> pd.DataFrame:
    descriptions = pd.read_csv(data_dir / "campaign_descriptions.csv", parse_dates=["start_date", "end_date"])
    exposures = pd.read_csv(data_dir / "campaigns.csv", dtype={"household_id": str})
    exposures = exposures.merge(descriptions, on="campaign_id", validate="many_to_one")
    exposures = exposures.drop_duplicates(["household_id", "campaign_id"]).copy()

    redemptions = pd.read_csv(
        data_dir / "coupon_redemptions.csv",
        dtype={"household_id": str},
        parse_dates=["redemption_date"],
    ).merge(descriptions[["campaign_id", "start_date", "end_date"]], on="campaign_id", validate="many_to_one")
    valid_redemptions = redemptions[redemptions["redemption_date"].between(redemptions["start_date"], redemptions["end_date"])]
    positive_pairs = valid_redemptions[["household_id", "campaign_id"]].drop_duplicates().assign(response=1)
    exposures = exposures.merge(positive_pairs, on=["household_id", "campaign_id"], how="left", validate="one_to_one")
    exposures["response"] = exposures["response"].fillna(0).astype(int)

    tx = read_full_transactions(transactions_rds)
    data_start = tx["transaction_timestamp"].min().normalize()
    pieces: list[pd.DataFrame] = []
    for campaign_id, group in exposures.groupby("campaign_id", sort=False):
        start = group["start_date"].iloc[0]
        lower = start - pd.Timedelta(days=90)
        history = tx.loc[
            tx["transaction_timestamp"].ge(lower) & tx["transaction_timestamp"].lt(start),
            ["household_id", "basket_id", "product_id", "sales_value", "coupon_disc", "transaction_timestamp"],
        ]
        if history.empty:
            aggregates = pd.DataFrame(columns=["household_id", *NUM_FEATURES[:6]])
        else:
            aggregates = history.groupby("household_id").agg(
                purchase_lines_90d=("basket_id", "size"),
                baskets_90d=("basket_id", "nunique"),
                products_90d=("product_id", "nunique"),
                sales_90d=("sales_value", "sum"),
                coupon_discount_90d=("coupon_disc", "sum"),
                last_purchase=("transaction_timestamp", "max"),
            ).reset_index()
            aggregates["log_sales_90d"] = np.log1p(aggregates["sales_90d"].clip(lower=0))
            aggregates["recency_days"] = (
                (start - aggregates["last_purchase"]).dt.total_seconds() / 86400
            ).clip(lower=0)
            aggregates = aggregates.drop(columns=["sales_90d", "last_purchase"])

        current = group[["household_id", "campaign_id", "campaign_type", "start_date", "end_date", "response"]].merge(
            aggregates, on="household_id", how="left", validate="many_to_one"
        )
        current["history_coverage_days"] = max(0, min(90, (start.normalize() - data_start).days))
        # Exposure counts are known at the current campaign start. Response history
        # includes only redemptions that had already occurred by that date.
        previous_exposures = exposures.loc[exposures["start_date"].lt(start)].groupby("household_id")["campaign_id"].nunique()
        previous_redemptions = valid_redemptions.loc[valid_redemptions["redemption_date"].lt(start)].groupby("household_id")["campaign_id"].nunique()
        current["prior_campaigns"] = current["household_id"].map(previous_exposures).fillna(0)
        current["prior_redemptions"] = current["household_id"].map(previous_redemptions).fillna(0)
        current["prior_response_rate"] = np.divide(
            current["prior_redemptions"],
            current["prior_campaigns"],
            out=np.zeros(len(current), dtype=float),
            where=current["prior_campaigns"].to_numpy() > 0,
        )
        # A few early campaigns precede the transaction-history start. Drop
        # feature columns that are entirely NA for that campaign before concat.
        pieces.append(current.dropna(axis=1, how="all"))

    frame = pd.concat(pieces, ignore_index=True)
    demographics = pd.read_csv(data_dir / "demographics.csv", dtype={"household_id": str})
    frame = frame.merge(demographics, on="household_id", how="left", validate="many_to_one")
    for column in CAT_FEATURES:
        frame[column] = frame[column].astype("object")
    return frame


def scores(y_true: np.ndarray, p: np.ndarray) -> dict[str, float]:
    return {
        "roc_auc": float(roc_auc_score(y_true, p)),
        "average_precision": float(average_precision_score(y_true, p)),
        "brier": float(brier_score_loss(y_true, p)),
        "log_loss": float(log_loss(y_true, p, labels=[0, 1])),
    }


def evaluate(frame: pd.DataFrame, cutoff: str) -> dict:
    boundary = pd.Timestamp(cutoff)
    train = frame.loc[frame["start_date"].lt(boundary)].copy()
    test = frame.loc[frame["start_date"].ge(boundary)].copy()
    if train["response"].nunique() < 2 or test["response"].nunique() < 2:
        raise ValueError("Temporal split needs both response classes in train and test")

    preprocessor = ColumnTransformer(
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
                Pipeline(
                    [("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]
                ),
                NUM_FEATURES,
            ),
        ]
    )
    model = Pipeline(
        [("features", preprocessor), ("classifier", LogisticRegression(max_iter=2000, random_state=17))]
    )
    feature_columns = CAT_FEATURES + NUM_FEATURES
    model.fit(train[feature_columns], train["response"])
    predicted = model.predict_proba(test[feature_columns])[:, 1]
    baseline_rate = float(train["response"].mean())
    baseline = np.full(len(test), baseline_rate)
    order = np.argsort(-predicted, kind="stable")
    top_n = max(1, int(np.ceil(0.10 * len(test))))
    top_rate = float(test["response"].to_numpy()[order[:top_n]].mean())
    per_campaign = (
        test.assign(predicted_probability=predicted)
        .groupby(["campaign_id", "campaign_type", "start_date"], as_index=False)
        .agg(exposures=("response", "size"), responses=("response", "sum"), observed_rate=("response", "mean"), mean_score=("predicted_probability", "mean"))
        .sort_values("start_date")
    )
    return {
        "cutoff": cutoff,
        "train": {
            "rows": int(len(train)),
            "positive_pairs": int(train["response"].sum()),
            "response_rate": float(train["response"].mean()),
            "campaigns": int(train["campaign_id"].nunique()),
        },
        "test": {
            "rows": int(len(test)),
            "positive_pairs": int(test["response"].sum()),
            "response_rate": float(test["response"].mean()),
            "campaigns": int(test["campaign_id"].nunique()),
        },
        "baseline_campaign_type": scores(test["response"].to_numpy(), test["campaign_type"].map(train.groupby("campaign_type")["response"].mean()).fillna(baseline_rate).to_numpy()),
        "baseline_prevalence": scores(test["response"].to_numpy(), baseline),
        "logistic_regression": scores(test["response"].to_numpy(), predicted),
        "top_decile": {
            "rows": top_n,
            "observed_response_rate": top_rate,
            "test_base_rate": float(test["response"].mean()),
            "lift_vs_test_rate": float(top_rate / test["response"].mean()),
        },
        "campaign_results": per_campaign.assign(start_date=per_campaign["start_date"].dt.strftime("%Y-%m-%d")).to_dict(orient="records"),
        "coverage": {
            "test_exposures_with_any_prior_90d_transaction": float(test["purchase_lines_90d"].notna().mean()),
            "test_exposures_with_demographics": float(test["age"].notna().mean()),
            "overlapping_households_train_test": int(len(set(train["household_id"]) & set(test["household_id"]))),
            "unique_test_households": int(test["household_id"].nunique()),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("marketing_customer_audit/exports"))
    parser.add_argument("--transactions-rds", type=Path, default=Path("marketing_customer_audit/raw/transactions_full.rds"))
    parser.add_argument("--cutoff", default="2017-08-01")
    parser.add_argument("--output", type=Path, default=Path("marketing_customer_project/reports/response_propensity.json"))
    args = parser.parse_args()
    frame = build_exposure_frame(args.data_dir, args.transactions_rds)
    result = evaluate(frame, args.cutoff)
    result["dataset"] = {
        "source": "Complete Journey / 84.51°, via completejourney R package public repository",
        "transaction_rows": int(len(read_full_transactions(args.transactions_rds))),
        "exposure_rows": int(len(frame)),
        "unique_households_in_exposure": int(frame["household_id"].nunique()),
        "unique_campaigns": int(frame["campaign_id"].nunique()),
        "positive_household_campaign_pairs": int(frame["response"].sum()),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
