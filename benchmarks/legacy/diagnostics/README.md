# Legacy diagnostics

`benchmarks/legacy/diagnostics/` archives historical diagnostic result artifacts. These materials are retained for traceability and retrospective analysis, but they are not current benchmark-suite execution outputs and should not be reported as current production safety-efficacy evidence.

New controlled diagnostic runs should write generated artifacts under `benchmarks/results/<diagnostic_area>/<run_id>/`. Retained diagnostic notebooks and reusable fixtures live under [`../../diagnostics/`](../../diagnostics/). Historical result report README files inside versioned result folders should remain because they are archived result artifacts.

## Legacy diagnostic areas

### Operational stress

[`operational_stress/`](operational_stress/) contains archived progressive-load result outputs from prior diagnostic runs. These outputs evaluate concurrency, latency, throughput, errors, timeouts, and degradation behavior.

Historical outputs are under [`operational_stress/progressive_load_results/`](operational_stress/progressive_load_results/).

### Semantic-context robustness

[`semantic_context_robustness/`](semantic_context_robustness/) contains archived semantic-context robustness outputs. These outputs were generated from long, semantically rich contexts with embedded unsafe instructions. Long-context size is treated as a dimension of semantic-context robustness, not as a separate benchmark suite.

Historical outputs are under [`semantic_context_robustness/semantic_context_results/`](semantic_context_robustness/semantic_context_results/). The historical report included LLM-based detection-quality review and should not be confused with the deterministic core benchmark methodology.

### Drift audit

[`drift_audit/`](drift_audit/) contains archived drift-audit diagnostic outputs. These outputs evaluate iterative adversarial reasoning drift across behavioral risk domains.

No current executable drift-audit suite is defined in `inhibitor-lab` unless a future methodology PR adds one. Historical outputs are under [`drift_audit/drift_audit_results/`](drift_audit/drift_audit_results/).
