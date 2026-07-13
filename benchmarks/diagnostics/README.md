# Diagnostics

`benchmarks/diagnostics/` contains retained diagnostic notebooks and reusable fixtures for targeted investigations of Inhibitor behavior.

Diagnostics are separate from the implemented core benchmark suites under `benchmarks/core/`. Core suites are the primary structured benchmark layer used for current benchmark execution and reporting. Diagnostic assets are supporting tools for investigating system behavior under specific operating conditions, such as high load, long context windows, or semantically rich prompts with embedded risky instructions.

Diagnostic notebooks may perform live API calls. Review notebooks before running them, and confirm endpoint configuration, API credentials, execution scope, and result-handling expectations. Historical diagnostic outputs live under [`../legacy/diagnostics/`](../legacy/diagnostics/). Diagnostic notebooks and fixtures live in this directory. When a diagnostic notebook is executed as a controlled current run, generated run artifacts should be written under `benchmarks/results/<diagnostic_area>/<run_id>/`, not into `benchmarks/diagnostics/`. For example, use `benchmarks/results/operational_stress/<run_id>/` or `benchmarks/results/semantic_context_robustness/<run_id>/`. Historical diagnostic outputs remain archived under `benchmarks/legacy/diagnostics/`.

## Diagnostic areas

### Operational stress

`operational_stress/` retains tooling for investigating behavior under load, including concurrency, latency, throughput, errors, timeouts, and degradation behavior. This area supports operational maturity analysis, not direct safety-efficacy claims.

- Notebook: [`operational_stress/notebooks/inhibitor_stress_test_notebook.ipynb`](operational_stress/notebooks/inhibitor_stress_test_notebook.ipynb)
- Historical outputs: [`../legacy/diagnostics/operational_stress/progressive_load_results/`](../legacy/diagnostics/operational_stress/progressive_load_results/)

### Semantic-context robustness

`semantic_context_robustness/` retains tooling and fixtures for investigating long-context dimensions and embedded risky instructions in semantically rich context. The notebook uses the cybersecurity article fixture to place unsafe instructions at different positions and context sizes.

The historical semantic-context report included LLM-based detection-quality review and should not be confused with the deterministic core benchmark methodology. These diagnostics can support robustness discussion, but they do not prove direct production safety efficacy, native runtime enforcement, or replacement for core benchmark claims.

- Notebook: [`semantic_context_robustness/notebooks/inhibitor_large_context_stress_test.ipynb`](semantic_context_robustness/notebooks/inhibitor_large_context_stress_test.ipynb)
- Fixture: [`semantic_context_robustness/fixtures/comprehensive_cybersecurity_article.txt`](semantic_context_robustness/fixtures/comprehensive_cybersecurity_article.txt)
- Historical outputs: [`../legacy/diagnostics/semantic_context_robustness/semantic_context_results/`](../legacy/diagnostics/semantic_context_robustness/semantic_context_results/)
