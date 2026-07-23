# Reproducibility Protocol

This protocol defines the minimum metadata, artifacts, and validation checks expected for a reproducible benchmark run. It is intended for use after benchmark execution; it does not require live execution as a mandatory publication step.

## Required environment metadata

Each run should record:

- Benchmark repository commit SHA.
- Benchmark suite version or branch.
- Inhibitor endpoint.
- Inhibitor version returned by API responses when available.
- Run timestamp.
- Runner version.
- Suite id.
- Run id.
- Number of cases.
- Mode used by each case.
- Support level.
- Decision support level where applicable.
- Controller support level where applicable.

## Required artifacts

A reproducibility package should include:

- `manifest.json`
- `raw_responses.jsonl` (or `raw_responses.json` JSON array for `runtime_trajectories`)
- `normalized_results.jsonl` (or `normalized_results.json` JSON array for `runtime_trajectories`)
- `scores.json`
- `summary.md`
- `trajectory_results.json` JSON array for `runtime_trajectories` when available

For runtime trajectories, `summary.md` is the human-readable run report. The controller and mock-tool outcomes are simulated, and `trajectory_results.json` is a benchmark trajectory artifact with audit-like fields rather than a production audit log. Unsupported metrics are retained under `not_measured` in `scores.json`.

## Reproducibility expectations

- Fixtures, adapters, controller logic, validators, and scoring rules should be versioned and deterministic.
- Live `/check` responses should be recorded as run-specific evaluated-system outputs.
- Exact signal names, confidence values, and explanatory text should not be assumed identical across runs unless explicitly validated by the relevant suite.
- Raw responses must be retained for auditability.
- Publication reports should cite the run id and artifact package used to compute all reported summary values.
- Compatibility-mapped and simulated outputs should be reproducible from the retained raw responses plus versioned benchmark code.

## Minimum validation and dry-run commands

Run these commands before live suite execution or publication packaging:

```bash
python benchmarks/validate_fixtures.py
python benchmarks/run_all.py --suite capability_validation --dry-run
python benchmarks/run_all.py --suite observation_normalization --dry-run
python benchmarks/run_all.py --suite decision_compatibility --dry-run
python benchmarks/run_all.py --suite runtime_trajectories --dry-run
```

Live benchmark execution may be performed separately in an environment configured with the required endpoint and credentials. Do not include commands that require secrets as mandatory publication steps, and do not commit secrets or live result artifacts unless they are explicitly approved for publication.
