"""Download and audit a reproducible random sample of Criteo Uplift v2.1.

Downloads the licensed public archive locally, streams an exact whole-file
audit, and creates a deterministic reservoir sample without loading 14M rows
into memory. Do not redistribute the full source archive.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import random
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

FEATURES = [f"f{i}" for i in range(12)]
LABELS = ["treatment", "conversion", "visit", "exposure"]
FIELDS = FEATURES + LABELS
DATA_URL = "https://huggingface.co/datasets/criteo/criteo-uplift/resolve/main/criteo-research-uplift-v2.1.csv.gz"
EXPECTED_BYTES = 311_422_618
EXPECTED_ROWS = 13_979_592


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(url: str, dest: Path) -> tuple[int, str, str | None]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "CustomerGrowthIntelligence/0.1"})
    digest = hashlib.sha256()
    size = 0
    with urllib.request.urlopen(request, timeout=90) as response, dest.open("wb") as out:
        etag = response.headers.get("ETag", "").strip('"') or None
        expected = response.headers.get("Content-Length")
        while chunk := response.read(1024 * 1024):
            out.write(chunk)
            digest.update(chunk)
            size += len(chunk)
        if expected and size != int(expected):
            raise ValueError(f"Incomplete download: received {size} bytes, expected {expected}")
    return size, digest.hexdigest(), etag


def audit_and_sample(source: Path, sample_path: Path, sample_size: int, seed: int) -> dict:
    rng = random.Random(seed)
    reservoir: list[list[str]] = []
    totals = Counter()
    by_treatment: dict[str, Counter] = {"0": Counter(), "1": Counter()}
    treatment_exposure = Counter()
    feature_stats = {name: {"min": float("inf"), "max": float("-inf"), "sum": 0.0, "count": 0} for name in FEATURES}
    invalid_rows = []
    rows = 0
    with gzip.open(source, "rt", newline="", encoding="utf-8") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != FIELDS:
            raise ValueError(f"Unexpected schema: {reader.fieldnames}")
        for row in reader:
            rows += 1
            if any(row.get(name) in (None, "") for name in FIELDS):
                totals["rows_with_missing"] += 1
                continue
            try:
                treatment = int(row["treatment"])
                conversion = int(row["conversion"])
                visit = int(row["visit"])
                exposure = int(row["exposure"])
                values = [float(row[name]) for name in FEATURES]
            except (TypeError, ValueError):
                invalid_rows.append(rows)
                continue
            if treatment not in (0, 1) or conversion not in (0, 1) or visit not in (0, 1) or exposure not in (0, 1):
                invalid_rows.append(rows)
                continue
            if not all(value == value and abs(value) != float("inf") for value in values):
                totals["rows_with_nonfinite_features"] += 1
                continue
            totals["valid_rows"] += 1
            arm = by_treatment[str(treatment)]
            arm["rows"] += 1
            arm["conversions"] += conversion
            arm["visits"] += visit
            arm["exposures"] += exposure
            treatment_exposure[(treatment, exposure)] += 1
            for name, value in zip(FEATURES, values):
                stats = feature_stats[name]
                stats["min"] = min(stats["min"], value)
                stats["max"] = max(stats["max"], value)
                stats["sum"] += value
                stats["count"] += 1
            valid_seen = totals["valid_rows"]
            if len(reservoir) < sample_size:
                reservoir.append([row[name] for name in FIELDS])
            else:
                index = rng.randrange(valid_seen)
                if index < sample_size:
                    reservoir[index] = [row[name] for name in FIELDS]

    if rows != EXPECTED_ROWS:
        raise ValueError(f"Row count mismatch: got {rows}, expected {EXPECTED_ROWS}")
    sample_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(sample_path, "wt", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(FIELDS)
        writer.writerows(reservoir)

    def rate(counter: Counter, numerator: str) -> float:
        return float(counter[numerator] / counter["rows"]) if counter["rows"] else 0.0

    arms = {}
    for treatment, counter in by_treatment.items():
        arms[treatment] = {
            "rows": counter["rows"],
            "conversions": counter["conversions"],
            "conversion_rate": rate(counter, "conversions"),
            "visits": counter["visits"],
            "visit_rate": rate(counter, "visits"),
            "exposure_rate": rate(counter, "exposures"),
        }
    treatment_difference = arms["1"]["conversion_rate"] - arms["0"]["conversion_rate"]
    visit_difference = arms["1"]["visit_rate"] - arms["0"]["visit_rate"]
    for name, stats in feature_stats.items():
        stats["mean"] = stats["sum"] / stats["count"] if stats["count"] else None
        del stats["sum"]
    return {
        "source": DATA_URL,
        "license": "CC BY-NC-SA 4.0",
        "attribution": "Criteo AI Lab, Diemert et al. (2018), A Large Scale Benchmark for Uplift Modeling; dataset v2.1.",
        "audited_at_utc": datetime.now(timezone.utc).isoformat(),
        "schema": FIELDS,
        "rows": rows,
        "valid_rows": int(totals["valid_rows"]),
        "rows_with_missing": int(totals["rows_with_missing"]),
        "rows_with_nonfinite_features": int(totals["rows_with_nonfinite_features"]),
        "invalid_rows": invalid_rows[:20],
        "invalid_row_count": len(invalid_rows),
        "treatment_ratio": arms["1"]["rows"] / rows,
        "arms": arms,
        "conversion_itt_difference_treatment_minus_control": treatment_difference,
        "visit_itt_difference_treatment_minus_control": visit_difference,
        "treatment_by_exposure_counts": {
            f"treatment={t},exposure={e}": n for (t, e), n in sorted(treatment_exposure.items())
        },
        "feature_summary": feature_stats,
        "sample": {
            "path": str(sample_path),
            "rows": len(reservoir),
            "sampling": "uniform reservoir sample over all source rows",
            "seed": seed,
            "sha256": file_sha256(sample_path),
            "compressed_bytes": sample_path.stat().st_size,
        },
        "limits": [
            "Criteo v2.1 combines several incrementality tests; it has no advertiser, campaign, calendar, geography, or interpretable customer identity fields.",
            "The randomized assignment is treatment. Analyze intention-to-treat by treatment; exposure is a post-assignment delivery variable and conditioning on it changes the estimand.",
            "The published sample is deliberately non-uniformly subsampled, so arm differences describe this benchmark version and must not be reported as original campaign ROI or lift.",
            "Conversion is rare; small samples are suitable for schema and pipeline checks, not stable heterogeneous-effect estimates.",
            "The license is noncommercial share-alike; inspect it before redistributing data or using derived artifacts in a commercial setting.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", type=Path, default=Path("marketing_customer_audit/raw/criteo-research-uplift-v2.1.csv.gz"))
    parser.add_argument("--sample", type=Path, default=Path("marketing_customer_project/data/criteo_uplift_sample_100k.csv.gz"))
    parser.add_argument("--report", type=Path, default=Path("marketing_customer_project/reports/criteo_uplift_audit.json"))
    parser.add_argument("--sample-size", type=int, default=500_000)
    parser.add_argument("--seed", type=int, default=20261110)
    args = parser.parse_args()
    if args.archive.exists():
        size = args.archive.stat().st_size
        if size != EXPECTED_BYTES:
            raise ValueError(f"Existing archive has unexpected size: {size}")
        archive_sha = file_sha256(args.archive)
        archive_etag = None
    else:
        size, archive_sha, archive_etag = fetch(DATA_URL, args.archive)
    if size != EXPECTED_BYTES:
        raise ValueError(f"Archive size mismatch: got {size}, expected {EXPECTED_BYTES}")
    result = audit_and_sample(args.archive, args.sample, args.sample_size, args.seed)
    result["archive"] = {
        "path": str(args.archive),
        "compressed_bytes": size,
        "sha256": archive_sha,
        "source_etag": archive_etag,
        "expected_rows_from_source_card": EXPECTED_ROWS,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
