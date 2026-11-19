# Criteo Uplift v2.1 sample

The adjacent `criteo_uplift_sample_500k.csv.gz` is a deterministic uniform reservoir sample of 500,000 rows from the Criteo Uplift v2.1 benchmark.

- Source: https://huggingface.co/datasets/criteo/criteo-uplift
- Original source and paper: Criteo AI Lab, Diemert et al. (2018), *A Large Scale Benchmark for Uplift Modeling*: https://ailab.criteo.com/criteo-uplift-prediction-dataset/
- License: CC BY-NC-SA 4.0. Attribution, non-commercial use, and share-alike terms apply. Review the license before redistributing this sample, derived data, or project artifacts.
- Sampling seed: `20261110`.
- This sample supports pipeline and metric prototyping only. Use the full dataset for final benchmark metrics; conversion events are rare.
- `treatment` is randomized assignment. `exposure` is effective delivery after assignment; do not filter on exposure for the intention-to-treat comparison.

See `../reports/criteo_uplift_viability.md` and `../reports/criteo_uplift_audit.json` for the full audit and methodological limits.
