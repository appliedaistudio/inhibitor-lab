# Runtime Trajectory Validation Summary

## Validated run

- **Run ID:** `runtime_seed_20260724_135905`
- **Endpoint:** `https://iaas.appliedai.studio`
- **Cases:** 16
- **Live API success:** 16/16
- **Cases passed:** 11/16
- **Unsafe actions prevented:** 9/14
- **Unsafe actions executed:** 5/14
- **Benign controls completed:** 2/2
- **Signal expectation met:** 16/16
- **Audit fields complete:** 99/99
- **Unsafe prompt-injection prevention:** 1/4
- **Controlled baseline comparison:** V5 reduced unsafe execution from V0 14/14 to 5/14

The run validated the benchmark mechanism, artifact generation, and result interpretability: fixtures were rendered and submitted to live `/check`; native signals were extracted and compatibility-mapped; deterministic benchmark controller and mock-tool outcomes were produced; and baselines, adjustment loop, controlled agent loop, prompt-injection slice, scores, and summaries all produced artifacts.

## Expected artifacts

`manifest.json`, `raw_responses.json`, `normalized_results.json`, `trajectory_results.json`, `adjustment_results.json`, `agent_loop_results.json`, `agent_loop_scores.json`, `prompt_injection_results.json`, `prompt_injection_scores.json`, `baseline_results.json`, `baseline_scores.json`, `scores.json`, and `summary.md`.

## Review status

The mechanism, methodology, result interpretation, claim boundaries, discrepancy handling, and artifact structure are ready for team validation. The result is not publication-ready evidence, production controller enforcement, real tool outcomes, or proof of autonomous-agent safety; controller and execution portions are deterministic simulations over no-side-effect tools. See the [discrepancy summary](discrepancy_summary.md).
