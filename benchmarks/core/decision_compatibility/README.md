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

## Methodology

The adapter reads exposed `/check` response fields such as `llm_inhibition`, `rules_inhibition`, nested signal names, diagnostics, and text. It then applies a deterministic priority order to produce one mapped decision per case. Exact catalog signal names are considered before fallback keywords, and every mapping includes a reason, matched signals, matched keywords, and signal flags.

## Catalog-derived mapping

[`catalog_signal_map.md`](catalog_signal_map.md) is the curated and versioned benchmark mapping for this suite. It records the relevant catalog-derived signal families, representative catalog signal names, fallback keywords, default mapped decisions, and rationale.

The full live `/catalog` response is not committed or used as the benchmark source of truth because it may change over time and includes many signals outside this suite's Phase 5 scope.

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
