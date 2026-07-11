# Decision Compatibility

This Phase 5 core suite maps current Inhibitor `/check` response signals into paper-compatible runtime decision categories for benchmark reporting.

## Support level

`compatibility_mapped`

Current Inhibitor responses do not natively expose the full paper-compatible `InhibitionResult` decision vocabulary. This suite therefore applies a deterministic compatibility adapter and does not claim native decision emission or enforcement.

## Decision vocabulary

- `allow`
- `warn`
- `revise`
- `clarify`
- `pause`
- `escalate`
- `block`
- `error`

## Background: runtime-decision vocabulary

This benchmark suite uses a runtime-decision vocabulary to describe how a safety layer could respond to a proposed agent action or response.

The vocabulary is:

- `allow`: continue because no meaningful risk signal was detected.
- `warn`: continue with caution because a low-severity risk signal was detected.
- `revise`: change the agent output before continuing.
- `clarify`: ask for more information before continuing.
- `pause`: temporarily stop until additional validation or review occurs.
- `escalate`: send the case to a human/operator or higher-trust review path.
- `block`: do not continue because a serious risk signal was detected.
- `error`: the response was unavailable, malformed, or could not be mapped.

Current Inhibitor `/check` responses do not natively emit this decision vocabulary. They expose signals such as observations, predictions, diagnostics, and `rules_inhibition` results. This suite provides a deterministic compatibility adapter that maps those exposed signals into the runtime-decision vocabulary for benchmark reporting.

## Methodology

The adapter reads exposed `/check` response fields such as `llm_inhibition`, `rules_inhibition`, nested signal names, diagnostics, and text. It then applies a deterministic priority order to produce one mapped decision per case. Exact catalog signal names are considered before fallback keywords, and every mapping includes a reason, matched signals, matched keywords, and signal flags.

## Catalog-derived mapping

[`catalog_signal_map.md`](catalog_signal_map.md) is the curated and versioned benchmark mapping for this suite. It records the relevant catalog-derived signal families, representative catalog signal names, fallback keywords, default mapped decisions, and rationale.

The full live `/catalog` response is not committed or used as the benchmark source of truth because it may change over time and includes many signals outside this suite's Phase 5 scope.

## Interpretation limits

This suite is a compatibility bridge between current Inhibitor `/check` outputs and the runtime-decision vocabulary above.

A passing result means that the `/check` response exposed signals that the deterministic adapter could map to the expected decision category for that benchmark case.

A passing result does not prove that Inhibitor natively enforces that decision. This suite does not prove that Inhibitor blocks tool execution, rewrites an agent response, pauses a live workflow, escalates to a human operator, or completes an end-to-end runtime trajectory.

End-to-end outcomes such as unsafe-action prevention, safe-task completion, adjustment success, and runtime enforcement require separate runtime-trajectory or execution-boundary benchmarks.

## What this validates

- Deterministic compatibility mapping from current Inhibitor `/check` signals to paper-compatible decision categories.
- Traceability from each fixture through `paper_tags`, `risk_category`, `expected_decision`, and `acceptable_decisions`.
- Utility-preserving distinction between unsafe AI compliance and safe refusal.
- Public-safe examples for privacy leakage, ambiguity, human review, and benign interactions.

## What this does not validate

- Native runtime decision enforcement.
- Runtime trajectory simulation.
- Execution-boundary enforcement.
- LLM judging.
- Full safety-efficacy scoring.
- Full unsafe-action prevention rates or safe-task-completion rates.

## Environment variables

- `INHIBITOR_BASE_URL`: fallback Inhibitor base URL.
- `INHIBITOR_API_URL`: preferred environment base URL when `--endpoint` is not supplied.
- `INHIBITOR_API_KEY`: API key sent as `X-API-Key` by the shared API client.

## Example commands

```bash
python benchmarks/core/decision_compatibility/runner.py --dry-run
INHIBITOR_BASE_URL=https://iaas.appliedai.studio INHIBITOR_API_KEY=<key> python benchmarks/core/decision_compatibility/runner.py --require-live
```

## Result artifact layout

Live runs write artifacts under:

```text
benchmarks/results/decision_compatibility/<run_id>/
├── manifest.json
├── raw_responses.jsonl
├── normalized_results.jsonl
└── summary.md
```

## Scope statement

This suite maps current Inhibitor signals into paper-compatible decisions for benchmark reporting. It does not prove that Inhibitor natively emits or enforces those decisions. It does not implement runtime trajectory simulation. It does not measure full unsafe-action prevention or safe-task-completion rates. It does not use an LLM judge.
