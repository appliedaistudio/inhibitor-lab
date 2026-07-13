# Operational stress diagnostics

The diagnostic audit is complete for operational stress assets. The retained diagnostic notebook lives in [`notebooks/inhibitor_stress_test_notebook.ipynb`](notebooks/inhibitor_stress_test_notebook.ipynb), while historical diagnostic result artifacts are archived under [`../../legacy/diagnostics/operational_stress/progressive_load_results/`](../../legacy/diagnostics/operational_stress/progressive_load_results/).

The archived progressive-load outputs evaluate concurrency, latency, throughput, errors, timeouts, and degradation behavior. They are historical diagnostic results, not current benchmark-suite outputs, and should not be reported as current production safety-efficacy evidence.

The retained notebook is diagnostic methodology/tooling for live/API-based stress testing. It requires review before any future execution, and live execution remains a separate controlled task. These materials support operational maturity analysis, not direct safety-efficacy claims.

`stress_benchmarks/` is no longer the canonical diagnostic location after this migration. Retained diagnostic notebooks and fixtures live under `benchmarks/diagnostics/`; archived historical diagnostic result artifacts live under `benchmarks/legacy/diagnostics/`.
