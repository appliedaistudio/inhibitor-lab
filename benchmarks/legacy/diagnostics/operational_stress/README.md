# Operational stress legacy diagnostics

[`progressive_load_results/`](progressive_load_results/) contains historical operational stress diagnostic outputs. These outputs evaluate concurrency, latency, throughput, errors, timeouts, and degradation behavior from prior progressive-load runs.

These artifacts are not current benchmark-suite results and are not stored under `benchmarks/results/`. They should not be reported as current production safety-efficacy evidence. They support operational maturity analysis and historical traceability, not direct safety-efficacy claims.

The retained operational stress notebook now lives under [`../../../diagnostics/operational_stress/notebooks/`](../../../diagnostics/operational_stress/notebooks/). That notebook is diagnostic methodology/tooling and requires review before any future execution because it performs live/API-based stress testing. Live execution remains a separate controlled task.
