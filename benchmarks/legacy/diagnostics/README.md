# Legacy diagnostics

`benchmarks/legacy/diagnostics/` archives historical diagnostic implementations and result artifacts. These materials are retained for provenance, traceability, reproducibility, and retrospective analysis, but they are not current benchmark-suite execution outputs and should not be reported as current production safety-efficacy evidence.

For maintained operational execution, use the [supported operational benchmark](../../supported/operational/) and write packages under `benchmarks/supported/operational/results/<benchmark_run_id>/`. No maintained semantic-context or drift-audit execution workflow is currently defined on this branch. Historical result-report README files inside versioned result folders remain archived result artifacts.

## Legacy diagnostic areas

### Operational stress

[`operational_stress/`](operational_stress/) contains the archived stress notebook and progressive-load result outputs from prior diagnostic runs. These materials evaluate concurrency, latency, throughput, errors, timeouts, and degradation behavior.

Historical outputs are under [`operational_stress/progressive_load_results/`](operational_stress/progressive_load_results/).

### Semantic-context robustness

[`semantic_context_robustness/`](semantic_context_robustness/) contains an archived notebook, its text fixture, and semantic-context robustness outputs. These outputs were generated from long, semantically rich contexts with embedded unsafe instructions. Long-context size is treated as a dimension of semantic-context robustness, not as a separate benchmark suite.

Historical outputs are under [`semantic_context_robustness/semantic_context_results/`](semantic_context_robustness/semantic_context_results/). The historical report included LLM-based detection-quality review and should not be confused with the supported operational methodology.

### Drift audit

[`drift_audit/`](drift_audit/) contains archived drift-audit diagnostic outputs. These outputs evaluate iterative adversarial reasoning drift across behavioral risk domains.

No current executable drift-audit suite is defined in `inhibitor-lab` unless a future methodology PR adds one. Historical outputs are under [`drift_audit/drift_audit_results/`](drift_audit/drift_audit_results/).
