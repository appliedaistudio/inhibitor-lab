# Benchmark Reporting

This reporting documentation defines how completed benchmark-suite runs should be packaged, interpreted, reproduced, and described in public-facing materials. It does not execute benchmarks, add results, introduce new suites, or change benchmark behavior.

## What this folder is for

Use this folder after running the benchmark suite to prepare a reproducibility package and publication report that separate:

- **Native results**: results from current Inhibitor behavior directly exposed through `/check`, `/catalog`, response schemas, observations, predictions, rules output, and supported modes.
- **Compatibility-mapped results**: results produced by deterministic mapping from current Inhibitor outputs into the runtime-decision vocabulary.
- **Simulated results**: results produced by a deterministic benchmark controller or harness around current Inhibitor outputs. These are proxy outcomes, not native runtime enforcement.
- **Diagnostic results**: stress, large-context, and semantic-context robustness diagnostics. These may support operational maturity claims, but they should not be reported as direct safety-efficacy proof.

## How to use these docs after executing the suite

1. Read the [runtime inhibition benchmark methodology](runtime_inhibition_benchmark_methodology.md), the source of truth for runtime trajectory benchmark claim boundaries, metric status, limitations, and roadmap.
2. Follow [`reproducibility.md`](reproducibility.md) to confirm required run metadata and artifacts were captured.
3. Use [`support_level_matrix.md`](support_level_matrix.md) to label every suite by category, status, support level, and acceptable public claim.
4. Apply [`result_interpretation.md`](result_interpretation.md) before drafting claims, especially for compatibility-mapped, simulated, and diagnostic outputs.
5. Draft the report from [`publication_report_template.md`](publication_report_template.md).
6. Complete [`publication_checklist.md`](publication_checklist.md) before publishing or sharing results.

## Complete benchmark-run artifact inventory

A complete run package should include:

- `manifest.json`
- `raw_responses.jsonl` (or `raw_responses.json` JSON array for `runtime_trajectories`)
- `normalized_results.jsonl` (or `normalized_results.json` JSON array for `runtime_trajectories`)
- `scores.json`
- `summary.md`
- `trajectory_results.json` JSON array for `runtime_trajectories` when available

For runtime trajectories, `summary.md` is the human-readable run report and `scores.json` records unsupported metrics under `not_measured`. Controller and mock-tool outcomes are simulated. `trajectory_results.json` is a benchmark trajectory artifact with audit-like fields, not a production audit log.

The package should also preserve the benchmark repository commit SHA, suite version or branch, run timestamp, run id, suite id, runner version, endpoint metadata, case counts, per-case modes, and declared support levels.

## Interpreting support levels

Support levels describe the relationship between benchmark outputs and the evaluated system:

- `native`: directly evaluates currently exposed Inhibitor behavior or response shape.
- `compatibility_mapped`: deterministically translates current outputs into another reporting vocabulary.
- `simulated`: uses deterministic controller or harness logic around current outputs to produce proxy outcomes.
- `diagnostic`: evaluates robustness or operational behavior and should be reported separately from core safety-efficacy claims.
- `historical`: preserves legacy evidence for traceability rather than current benchmark-suite claims.

## Avoiding overclaims

Do not describe compatibility-mapped or simulated outputs as native production enforcement. Do not describe simulated proxy rates as production unsafe-response-prevention rates or production safe-completion rates. Diagnostic suites can support robustness or operational maturity discussion, but they should not be presented as direct proof of production safety efficacy.
