# Phase 6 Runtime-Trajectory Benchmark

This suite implements a deterministic, fixture-based runtime-trajectory benchmark around current Inhibitor `/check` responses.

## What this benchmark does

- Simulates a runtime trajectory around current Inhibitor `/check` responses.
- Uses Phase 5 decision compatibility mapping (`decision_support_level: compatibility_mapped`).
- Applies a deterministic simulated controller (`controller_support_level: simulated`).
- Produces trajectory-level proxy outcomes.
- Uses fixture-provided proposed agent responses, including the user goal, latest human message, proposed response, and exact `thought_chain` sent to `/check`.
- Does not create or reuse an autonomous agent.

The trajectory shape is:

```text
user goal
→ latest human message
→ fixture-provided proposed agent response
→ Inhibitor /check
→ Phase 5 mapped runtime decision
→ simulated controller action
→ final trajectory outcome
→ audit/trace result
```

The suite support level is `simulated` because current Inhibitor `/check` responses do not natively enforce tool execution, output revision, pausing, escalation, or blocking.

## What this benchmark does not do

- Does not prove native runtime enforcement.
- Does not execute real tools.
- Does not block production actions.
- Does not rewrite live agent output.
- Does not pause a live workflow.
- Does not escalate to a real human operator.
- Does not measure production unsafe-action prevention or safe-task-completion rates.
- Does not use an LLM judge.
- Does not implement or reuse an autonomous agent.
- Does not depend on any external demo, website demo, UI, or product demo implementation.

## Runtime-decision behavior

The simulated controller applies the Phase 5 mapped decision as follows:

| Mapped decision | Simulated controller behavior |
| --- | --- |
| `allow` | Simulated controller approves the proposed response. |
| `warn` | Simulated controller approves the proposed response with warning metadata. |
| `revise` | Simulated controller replaces the proposed response with a fixture-provided safe revision. |
| `clarify` | Simulated controller does not approve the proposed response and returns a clarification request. |
| `pause` | Simulated controller does not approve the proposed response and marks the trajectory paused for validation. |
| `escalate` | Simulated controller does not approve the proposed response and marks the trajectory routed to review. |
| `block` | Simulated controller does not approve the proposed response. |
| `error` | Simulated controller records an unmapped or malformed response. |

## Interpretation limits

Passing results mean the benchmark harness could simulate the expected controller behavior from `/check` response signals and the Phase 5 adapter. Passing results do not prove Inhibitor natively enforces those decisions. These are trajectory proxy outcomes, not production enforcement metrics.

## Mapping to benchmark claims

This suite maps runtime-inhibition benchmark concepts to simulated proxy fields. These are proxy benchmark measurements from a deterministic simulated controller. They should not be described as production unsafe-action prevention rates, production safe-task-completion rates, or native runtime enforcement metrics.

| Benchmark concept | Proxy field(s) | Aggregate | Interpretation |
| --- | --- | --- | --- |
| Unsafe response prevention | `unsafe_response_prevented` | `unsafe_response_prevention_proxy_rate` | Simulated controller prevented the proposed unsafe response from being approved; not production enforcement. |
| Safe completion / utility preservation | `safe_completion_preserved` | `safe_completion_preservation_proxy_rate` | Simulated controller preserved safe completion when the expected decision allowed, warned, or safely redirected the case. |
| Adjustment success | `adjustment_success` | `adjustment_success_proxy_rate` | Simulated controller successfully applied the expected safe revision, clarification, pause, escalation, or block behavior. |
| Auditability | `audit_trace_complete` | `audit_trace_completion_rate` | Trajectory result includes enough structured trace data to reconstruct the simulated decision path. |
| Runtime decision application | `mapped_decision`, `controller_action`, `trajectory_outcome` | n/a | Phase 5 compatibility-mapped decision was applied by a deterministic simulated controller. |

## Running

Dry run validates fixtures and prints planned cases without network calls or an API key:

```bash
python benchmarks/core/runtime_trajectories/runner.py --dry-run
```

A live run calls `/check`, maps the response with the Phase 5 adapter, and applies the deterministic simulated controller:

```bash
INHIBITOR_BASE_URL=<base-url> python benchmarks/core/runtime_trajectories/runner.py --require-live
```

Live results are written to:

```text
benchmarks/results/runtime_trajectories/<run_id>/
  manifest.json
  raw_responses.jsonl
  normalized_results.jsonl
  trajectory_results.jsonl
  scores.json
  summary.md
```
