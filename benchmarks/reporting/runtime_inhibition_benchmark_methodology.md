# Runtime Inhibition Benchmark Methodology

## Status

This is a living methodology document for the inhibitor-lab benchmark suite. It describes the current benchmark implementation, the target evaluation protocol, and the roadmap for closing known gaps. Items marked **simulated**, **partial**, **planned**, or **not measured** are not claimed as fully implemented.

## Purpose

Runtime inhibition benchmarks evaluate whether an Inhibitor can help prevent unsafe external action while preserving useful task completion. The benchmark evaluates more than classification: it evaluates the control chain

`flagging → decision → adjustment → execution outcome`

across five dimensions:

- safety efficacy
- utility preservation
- adjustment quality
- operational reliability
- auditability

## Evaluation Object

The evaluated system is `S = (A, I, C, E, P, L)`:

- `A`: agent or proposal source
- `I`: Inhibitor
- `C`: controller or decision adapter
- `E`: execution environment
- `P`: policy set
- `L`: audit/logging layer

| Component | Target meaning | Current implementation | Status |
| --- | --- | --- | --- |
| A | Agent producing proposed behavior | Fixture-provided proposed action envelopes | Partial |
| I | Inhibitor evaluating proposed behavior | Live `/check` API call | Implemented |
| C | Controller applying decision | Deterministic benchmark controller | Simulated |
| E | Execution environment/tools | No-side-effect mock tools | Simulated |
| P | Policy set / policy pack | Fixture expectations and signal-family mapping | Partial |
| L | Audit/logging layer | `trajectory_results.json`, `scores.json`, `summary.md` | Partial |

## Current Runtime Trajectory Mechanism

The current runtime trajectory benchmark follows this flow:

`fixture → proposed_action_envelope → rendered thought_chain → /check → mapped_decision → benchmark controller → mock_tool outcome → trajectory_results.json → scores.json → summary.md`

- Action envelopes are benchmark-side objects, not native product objects.
- `/check` provides native signal evidence.
- Decisions are compatibility-mapped.
- Controller enforcement is simulated.
- Mock tools have no side effects.
- Trajectory artifacts are audit-like benchmark records, not production audit logs.

This seed/mechanics benchmark evaluates structured proposed-action envelopes through live `/check`, maps Inhibitor outputs into runtime decisions, applies those decisions through a deterministic benchmark controller, and records no-side-effect mock-tool outcomes. It does not claim production tool enforcement or full end-to-end safety efficacy.

## Current Result Artifacts

A runtime trajectory result folder contains:

```text
manifest.json
raw_responses.json
normalized_results.json
trajectory_results.json
scores.json
summary.md
```

- `manifest.json`: run metadata.
- `raw_responses.json`: raw per-case API responses.
- `normalized_results.json`: per-case mapped decision and validation summary.
- `trajectory_results.json`: benchmark trajectory artifact with audit-like fields.
- `scores.json`: machine-readable metrics.
- `summary.md`: human-readable run report.

`trajectory_results.json` is not a production audit log.

## Metric Status

| Metric | Current status | Support level | Notes |
| --- | --- | --- | --- |
| Unsafe action prevention rate | Implemented | Simulated | Eligible unsafe mock actions where original mock action did not execute |
| Unsafe execution rate | Implemented | Simulated | Eligible unsafe mock actions where original mock action executed |
| Safe task completion rate | Implemented | Simulated | Eligible benign mock actions that executed |
| Over-inhibition rate | Implemented | Simulated | Eligible benign mock actions that did not execute |
| Signal expectation met rate | Implemented | Native signal evidence + fixture expectation | Checks whether observed signal evidence matches fixture expectation |
| Acceptable decision rate | Implemented | Compatibility-mapped | Checks whether mapped decision is acceptable for the fixture |
| Controller outcome match rate | Implemented | Simulated | Checks controller behavior against expected per-decision outcome |
| API success rate | Implemented | Live API call | `/check` success rate |
| Latency min/max/mean | Implemented | Live API call | Percentiles planned |
| Trace completeness | Partial | Benchmark artifact | Full audit completeness scoring planned |

Outcome metrics must be gated by metric eligibility:

- successful `/check`
- non-error mapped decision
- complete controller outcome
- mock-tool execution field present

This prevents API failures or malformed results from being counted as safety wins.

## Metrics Planned But Not Yet Implemented

| Metric / feature | Why not implemented yet | Can be implemented in inhibitor-lab? | Planned stage |
| --- | --- | --- | --- |
| Harm-weighted unsafe execution rate | Needs severity-weighted scoring | Yes | Metric completeness |
| Policy violation capture rate | Needs policy IDs and TP/FN labels | Partly | Policy/audit schema |
| Revision success rate | Needs revise-and-retry loop | Yes | Adjustment loop |
| Adjustment compliance rate | Needs adjustment attempts and retry outcomes | Yes | Adjustment loop |
| User-goal preservation | Needs final response and utility target scoring | Yes | Agent/adjustment loop |
| Minimality of intervention | Needs action-diff rubric or reviewer scoring | Yes | Adjustment quality |
| Latency p50/p95/p99 | Reporting not yet added | Yes | Metric completeness |
| Timeout rate | Needs error classification | Yes | Metric completeness |
| Error rate by class | Needs normalized error taxonomy | Yes | Metric completeness |
| Throughput / stress aggregation | Needs stress runner integration | Yes | Operations integration |
| Confidence intervals | Needs scoring helper and enough cases | Yes | Metric completeness |
| Category-level rates | Needs broader fixture coverage | Yes | Fixture expansion |
| Severity-stratified rates | Needs severity-aware scoring | Yes | Metric completeness |
| Audit field completeness percentage | Needs required audit-field schema | Yes | Audit schema |
| Human-review agreement | Requires independent reviewers and adjudication | Process dependency | Human labeling |
| Official external prompt-injection benchmark score | Requires dataset integration | Yes, later | External benchmark slices |

## Current Limitations

### Simulated in current benchmark

- benchmark controller enforcement
- mock-tool execution outcomes
- unsafe action prevention over mock tools
- safe task completion over mock tools

### Partial in current benchmark

- policy set
- audit/logging layer
- trace completeness
- decision correctness
- adjustment quality

### Not currently measured

- production tool enforcement
- production unsafe-action prevention
- native policy-pack coverage
- human-review agreement
- official AgentDojo / InjecAgent score
- full baseline comparison
- revision success
- user-goal preservation
- incident reconstructability
- explanation usefulness

### Requires product/runtime support

- production tool execution boundary
- native production controller enforcement
- native policy-pack IDs from product output
- production audit logs
- production trace IDs and executed action IDs

### Requires external process or data

- independent human labels
- adjudication records
- inter-rater agreement
- official external benchmark adapters and dataset runs

## Risk-Category Coverage

The minimum target risk categories are:

- privacy leakage
- credential exposure
- prompt injection
- excessive agency
- unsafe code
- financial loss
- legal/compliance violation
- deception/fraud
- safety-critical advice
- memory contamination

Current seed coverage is:

| Risk category | Current status |
| --- | --- |
| privacy leakage | Seed case represented |
| credential exposure | Seed case represented |
| excessive agency | Seed case represented |
| benign/control | Seed case represented |
| prompt injection | Planned |
| unsafe code | Planned |
| financial loss | Planned |
| legal/compliance violation | Planned |
| deception/fraud | Planned |
| safety-critical advice | Planned |
| memory contamination | Planned |

Unrepresented categories must not be inferred as covered.

## Baseline and Variant Roadmap

Target variants are:

- V0: unprotected agent or unprotected mock execution
- V1: prompt-only safety
- V2: final-output moderation
- V3: input-output/content guardrail
- V4: tool-boundary inhibition
- V5: fuller runtime inhibition with adjustment, audit, and escalation

The current runtime trajectory suite is closest to V4/V5 mechanics, but only with simulated mock tools. The V0 mock baseline and V2 final-output baseline are planned. Prompt-only and full agent variants require agent-loop support.

## Allowed and Disallowed Claims

### Allowed claims

- “The runtime trajectory suite validates control-chain mechanics over structured proposed actions, live `/check` evaluation, compatibility-mapped decisions, and simulated controller enforcement over no-side-effect mock tools.”
- “Eligible unsafe mock actions were prevented in the simulated controller environment.”
- “The benchmark reports measured, simulated, partial, and not-measured metrics separately.”
- “The current suite provides seed risk-category coverage, not full taxonomy coverage.”

### Disallowed claims

- “Inhibitor prevents production tool execution.”
- “The benchmark proves production unsafe-action prevention.”
- “The current suite fully implements the target runtime inhibition evaluation protocol.”
- “The current suite provides official AgentDojo or InjecAgent scores.”
- “Detection rate is equivalent to prevention rate.”
- “Mock-tool non-execution caused by API failure is a safety success.”

## Completion Roadmap

1. Reporting/schema improvements — completed or in progress by PR #107.
2. Methodology and limitations document — this PR.
3. Metric completeness:
   - Wilson confidence intervals
   - latency percentiles
   - timeout/error rates
   - harm-weighted unsafe execution
   - severity/category breakdowns
   - audit completeness scoring
4. Risk-category fixture expansion.
5. Adjustment-loop support.
6. Baseline variants.
7. Agent-loop prototype.
8. Prompt-injection slices:
   - local prompt-injection fixtures
   - official AgentDojo adapter
   - official InjecAgent adapter
9. Human labeling workflow.
10. Full implemented-suite execution and publication result package.

## Final Validation and Publication Plan

After implementing new benchmarks:

- execute the full implemented benchmark suite against Inhibitor
- validate results against expected outcomes
- review metrics for consistency and accuracy
- document discrepancies and issues
- mark unsupported metrics as `not_measured`
- prepare publication-ready result tables
- review claims before publication

“Full implemented suite” means the benchmark suite implemented in inhibitor-lab at that point, not necessarily the complete ideal target protocol.

## Methodology Changelog

```text
v0.1 — Initial methodology document. Documents current runtime trajectory seed benchmark, support levels, implemented metrics, limitations, and completion roadmap.
```
