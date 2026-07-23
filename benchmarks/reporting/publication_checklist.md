# Publication Checklist

Use this checklist before publishing benchmark results or sharing a publication report.

## Validation and artifacts

- [ ] Fixtures validated.
- [ ] Suite manifest validated.
- [ ] Raw responses retained.
- [ ] Run metadata recorded.
- [ ] Required artifact inventory included:
  - [ ] `manifest.json`
  - [ ] `raw_responses.jsonl` (or `raw_responses.json` for `runtime_trajectories`)
  - [ ] `normalized_results.jsonl` (or `normalized_results.json` for `runtime_trajectories`)
  - [ ] `scores.json`
  - [ ] `summary.md`
  - [ ] `trajectory_results.json` for `runtime_trajectories` when available.

## Support-level disclosure

- [ ] Runtime inhibition benchmark methodology reviewed.
- [ ] Target case-label schema reviewed.
- [ ] Implemented metrics identified.
- [ ] Support levels disclosed for every reported suite.
- [ ] Compatibility-mapped results labeled.
- [ ] Simulated results labeled as proxy outcomes.
- [ ] Partial metrics labeled.
- [ ] Not-measured metrics listed with reasons.
- [ ] Publication result tables prepared or explicitly marked not available.
- [ ] Composite score omitted unless all required subscores are implemented and support levels are disclosed.
- [ ] Diagnostic results separated from core safety-efficacy claims.
- [ ] Limitations section included.

## Claim-boundary review

- [ ] Claim boundaries reviewed before publication.
- [ ] No native-enforcement claims unless supported by native outputs.
- [ ] No unverified production unsafe-action-prevention claims.
- [ ] No unverified production safe-task-completion claims.
- [ ] Simulated proxy rates are not described as production unsafe-response-prevention or production safe-completion rates.
- [ ] Diagnostic results are not used as direct production safety-efficacy proof.
- [ ] Compatibility-mapped results are not described as native runtime decisions unless native support is separately validated.
- [ ] Local prompt-injection fixtures or diagnostics are not described as official AgentDojo/InjecAgent scores.
- [ ] Detection/signal-trigger rates are not described as prevention rates without eligible controller/execution outcome evidence.

## Results review

- [ ] Results reviewed for publication accuracy.
- [ ] Discrepancies and issues documented.
- [ ] Discrepancies reviewed before fixture changes.
- [ ] Any fixture changes after live execution are justified in PR notes.
- [ ] Metric eligibility exclusions reviewed.
- [ ] Confidence intervals reviewed for every reported binomial rate.
- [ ] Latency p50/p95/p99 values reviewed.
- [ ] Timeout and API error rates, including error-type counts, reviewed.
- [ ] Simulated harm-weighted unsafe execution rate reviewed.
- [ ] Severity and risk-category breakdowns reviewed for eligibility gating and limited coverage.
- [ ] Benchmark audit-field completeness reviewed; it is not described as production audit-log completeness.
- [ ] Risk-category coverage reviewed for seed vs publication-density claims.
- [ ] Category-level claims do not exceed fixture density.

## Data and repository hygiene

- [ ] No secrets or API keys committed.
- [ ] No private data in fixtures or results.
- [ ] No financial-specific claims added to core benchmark framing.
- [ ] No benchmark result directories added unless explicitly approved for publication.
- [ ] No notebooks added.
- [ ] No LLM judge added.
