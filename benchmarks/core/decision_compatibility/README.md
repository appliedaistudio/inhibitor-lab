# Decision Compatibility

`decision_compatibility` is adapter-only shared infrastructure, not an executable benchmark suite. The active `runtime_trajectories` suite consumes only [`adapter.py`](adapter.py) from this directory. There is no standalone decision-compatibility runner and there are no separate decision-compatibility fixture cases.

## Support level

`compatibility_mapped`

Current Inhibitor responses do not natively expose the full runtime-decision vocabulary described below. This infrastructure therefore applies a deterministic compatibility adapter and does not claim native decision emission, production enforcement, or runtime trajectory outcomes.

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

The runtime trajectory benchmark uses a runtime-decision vocabulary to describe how a safety layer could respond to a proposed agent action or response.

The vocabulary is:

- `allow`: continue because no meaningful risk signal was detected.
- `warn`: continue with caution because a low-severity risk signal was detected.
- `revise`: change the agent output before continuing.
- `clarify`: ask for more information before continuing.
- `pause`: temporarily stop until additional validation or review occurs.
- `escalate`: send the case to a human/operator or higher-trust review path.
- `block`: do not continue because a serious risk signal was detected.
- `error`: the response was unavailable, malformed, or could not be mapped.

Current Inhibitor `/check` responses do not natively emit this decision vocabulary. They expose signals such as observations, predictions, diagnostics, and `rules_inhibition` results. This infrastructure provides a deterministic compatibility adapter that maps those exposed signals into the runtime-decision vocabulary for benchmark reporting.

## Methodology

The adapter maps evidence from Inhibitor `/check` responses into the benchmark decision vocabulary. It reads exposed fields such as `llm_inhibition`, `rules_inhibition`, nested signal names, diagnostics, and text, then applies a deterministic priority order to produce one mapped runtime decision per case. Exact catalog signal names are considered before fallback keywords, and every mapping includes a reason, matched signals, matched keywords, and signal flags.

## Catalog-derived mapping

[`catalog_signal_map.md`](catalog_signal_map.md) is the curated and versioned mapping used by the adapter. It records the relevant catalog-derived signal families, representative catalog signal names, fallback keywords, default mapped decisions, and rationale.

The full live `/catalog` response is not committed or used as the benchmark source of truth because it may change over time and includes signals outside the adapter's curated mapping scope.

## Interpretation limits

This infrastructure is a compatibility bridge between current Inhibitor `/check` outputs and the runtime-decision vocabulary above.

A passing result means that the `/check` response exposed signals that the deterministic adapter could map to the expected decision category for that benchmark case.

A passing result does not prove that Inhibitor natively emits or enforces that decision. The adapter does not prove that Inhibitor blocks tool execution, rewrites an agent response, pauses a live workflow, escalates to a human operator, or completes an end-to-end runtime trajectory.

End-to-end outcomes such as unsafe-action prevention, safe-task completion, adjustment success, and runtime enforcement require separate runtime-trajectory or execution-boundary benchmarks.

## Fixtures and execution

This directory has no runner or fixtures of its own. Runtime trajectory fixtures live only at [`benchmarks/core/runtime_trajectories/cases.json`](../runtime_trajectories/cases.json), and they are executed and scored by the runtime trajectory suite.

The adapter supports deterministic compatibility mapping and the runtime suite's distinction between unsafe AI compliance and safe refusal. Those properties are validated in the context of runtime trajectories rather than by a standalone decision-compatibility suite.

This cleanup PR does not change the adapter's decision logic. Future adapter behavior changes should be made in a separate PR.

## What this does not validate

- Native runtime decision enforcement.
- Runtime trajectory simulation.
- Execution-boundary enforcement.
- LLM judging.
- Full safety-efficacy scoring.
- Full unsafe-action prevention rates or safe-task-completion rates.

## Scope statement

This shared adapter maps current Inhibitor signals into the runtime-decision vocabulary for benchmark reporting. The adapter does not prove native product enforcement: it does not prove that Inhibitor natively emits or enforces those decisions. It also does not implement runtime trajectory simulation, measure full unsafe-action prevention or safe-task-completion rates, or use an LLM judge.
