"""Reproduce the sample-size planning table from segment validation results."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from statistics import NormalDist, mean


def sample_size_per_arm(p0: float, relative_lift: float, alpha: float, power: float) -> tuple[int, float]:
    p1 = p0 * (1 + relative_lift)
    pbar = (p0 + p1) / 2
    z_alpha = NormalDist().inv_cdf(1 - alpha / 2)
    z_power = NormalDist().inv_cdf(power)
    n = (z_alpha * math.sqrt(2 * pbar * (1 - pbar)) +
         z_power * math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2 / (p1 - p0) ** 2
    return math.ceil(n), p1


def build(validation: dict) -> dict:
    rates = {}
    for cluster, name in ((0, "menor_actividad"), (1, "mayor_actividad")):
        cluster_rates = []
        for result in validation["future_campaign_response_check"]["results"]:
            row = next(x for x in result["segments"] if int(x["cluster"]) == cluster)
            cluster_rates.append(float(row["rate"]))
        rates[name] = {"cutoff_rates": cluster_rates, "planning_baseline": mean(cluster_rates)}

    scenarios = []
    for lift in (.20, .30, .50):
        scenario = {"relative_minimum_detectable_lift": lift, "by_segment": {}}
        total = 0
        for name, baseline in rates.items():
            n, target = sample_size_per_arm(baseline["planning_baseline"], lift, .025, .80)
            n_all_arms = 3 * n
            total += n_all_arms
            scenario["by_segment"][name] = {"baseline_proxy": baseline["planning_baseline"],
                "target_response_rate": target, "households_per_arm": n,
                "households_all_three_arms": n_all_arms}
        scenario["total_households_all_segments_and_arms"] = total
        scenarios.append(scenario)

    august = next(x for x in validation["per_cutoff"] if x["cutoff"] == "2017-08-01")
    by_cluster = {int(x["cluster"]): int(x["households"]) for x in august["profiles"]}
    return {"purpose": "planning only; no randomized experiment was run",
        "design": "3 arms within each behavior segment: holdout, generic campaign, segment-tailored campaign",
        "primary_comparison": "tailored vs generic within each segment (two primary segment comparisons)",
        "primary_outcome": "any coupon redemption within 30 days of assignment",
        "baseline_proxies": rates,
        "power_assumptions": {"two_sided_alpha_per_primary_comparison": .025, "power": .80,
            "allocation": "equal per arm within segment", "method": "normal approximation for two independent proportions, rounded up",
            "lifts": "relative lift above historical descriptive proxy"},
        "scenarios": scenarios,
        "current_data_capacity": {"unique_households_in_august_90d_cohort": int(august["households"]),
            "households_low_activity": by_cluster[0], "households_high_activity": by_cluster[1],
            "can_support_30pct_mde": False,
            "reason": "30% MDE requires 6,152 households per arm in the lower-activity segment and 1,217 per arm in the higher-activity segment; there are 749/1,568 households total in the respective segments at this cut and historical assignment cannot be randomized retroactively."},
        "limitations": [
            "Historical campaign response rates are nonrandomized, repeated household-campaign observations and not causal baselines.",
            "Cutoff rates overlap; their unweighted average is a planning proxy only.",
            "The calculation does not account for noncompliance, attrition, interference or household-level clustering beyond one-row-per-household randomization.",
            "A genuine campaign test requires a new prospective randomized assignment; no control assignment is fabricated from Complete Journey."]}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validation", type=Path, default=Path("marketing_customer_project/reports/behavior_segments_validation.json"))
    parser.add_argument("--output", type=Path, default=Path("marketing_customer_project/reports/segment_campaign_experiment_power.json"))
    args = parser.parse_args()
    result = build(json.loads(args.validation.read_text(encoding="utf-8")))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__": main()
