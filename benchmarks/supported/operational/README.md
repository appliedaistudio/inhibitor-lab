# Supported operational benchmark

This package evaluates live Inhibitor `/check` behavior under progressive burst concurrency and a short-window recovery probe. It measures transport reliability, successful throughput, latency, and configured structural response anomalies; it does not establish semantic correctness.

## Entry points and protocol

The authoritative executable entry point is [`inhibitor_operational_benchmark.ipynb`](inhibitor_operational_benchmark.ipynb). Run it top to bottom for a new live benchmark after reviewing its configuration. [`benchmark_reporting.py`](benchmark_reporting.py) provides evidence loading, aggregation, deterministic findings, charts, and Markdown report generation used by the notebook.

The protocol sends paired Insight and Performance traffic at configured concurrency levels **1, 20, 50, 100, and 200**. After the final scored burst, it sends one recovery probe per mode. Recovery probes are excluded from scored benchmark metrics.

The configured recovery rule compares each probe with its mode's same-trial concurrency-1 p50 latency and requires a value no greater than 2× that baseline, in addition to success and structural checks. This 2× threshold is a benchmark protocol rule, not a universal service-level objective.

## Running a new live benchmark

1. Review the notebook's dependency, endpoint, scenario, trial, timing, and output configuration.
2. Set `INHIBITOR_API_KEY` in the process environment; optionally configure the endpoint as described in the notebook. The credential is held in process memory and is not written to evidence or reports.
3. Configure `RESULTS_OUTPUT_DIR` as this package's `results/` directory so the run is written to `results/<benchmark_run_id>/`.
4. Run the notebook from top to bottom. Its formal execution cell clearly identifies when live API traffic begins.
5. Read the generated result package's `benchmark_report.md` before making run-specific claims.

New maintained result packages belong under [`results/`](results/) as `results/<benchmark_run_id>/`. Reports produced during either live execution or saved-run regeneration are written into the selected run directory as `benchmark_report.md`, with supporting derived artifacts alongside it.

## Evidence and report regeneration

The canonical regeneration inputs in each run package are:

- `request_records.jsonl` — request-level evidence, including scored and recovery records;
- `run_manifest.json` — execution and protocol provenance; and
- `scenario_manifest.json` — workload provenance.

Where present, the following are convenience or derived artifacts and can be rebuilt from canonical evidence:

- `request_records.csv`;
- `scored_request_records.jsonl`;
- `recovery_request_records.jsonl`;
- `per_trial_summary.csv`;
- `cross_trial_summary.csv`;
- `recovery_summary.csv`;
- `anomaly_summary.csv`;
- `anomaly_breakdown.csv`;
- `benchmark_report.md`;
- `report_manifest.json`; and
- `plots/`.

To regenerate a report without new API calls, open the notebook at **Regenerating reports from a saved run**, set `EXISTING_RUN_DIR` to the saved run package, and execute that section and the reporting cells below it. The loader reads only the three canonical inputs; derived summaries, findings, plots, and the report are then regenerated deterministically in that existing run directory. No API credential is required for saved-run regeneration.

## Included reference run and interpretation boundaries

[`results/operational-v2.24.1-2026-07-31T16-07-17Z/`](results/operational-v2.24.1-2026-07-31T16-07-17Z/) is a completed Inhibitor 2.24.1 reference run. It contains one trial and is descriptive. It is neither production-capacity certification nor statistically repeatable evidence; consult its [`benchmark_report.md`](results/operational-v2.24.1-2026-07-31T16-07-17Z/benchmark_report.md) for run-specific findings.

The concurrency-1 recovery baselines in that reference run contain one observation per mode. Ratios based on those baselines are diagnostic rather than statistically stable. Structural anomaly checks test configured response-shape expectations and do not establish semantic correctness. More generally, this protocol does not guarantee future behavior, maximum sustainable capacity, or a production service level.
