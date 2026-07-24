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
| L | Audit/logging layer | `trajectory_results.json`, `adjustment_results.json`, `agent_loop_results.json`, `agent_loop_scores.json`, baseline artifacts, `scores.json`, `summary.md` | Partial |

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
adjustment_results.json
agent_loop_results.json
agent_loop_scores.json
baseline_results.json
baseline_scores.json
scores.json
summary.md
```

- `manifest.json`: run metadata.
- `raw_responses.json`: raw per-case API responses.
- `normalized_results.json`: per-case mapped decision and validation summary.
- `trajectory_results.json`: benchmark trajectory artifact with audit-like fields.
- `adjustment_results.json`: fixture-defined adjustment-loop records for configured revision cases.
- `agent_loop_results.json`: deterministic benchmark-side agent proposal/revision step records.
- `agent_loop_scores.json`: eligibility-gated controlled-proxy metrics and loop-only API accounting.
- `baseline_results.json`: controlled benchmark-side baseline records, one per case and variant.
- `baseline_scores.json`: eligibility-gated comparison metrics for controlled baseline variants.
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
| API success, timeout, and error rates | Implemented | Live API call | Includes conservative error-type aggregation |
| Latency min/max/mean/p50/p95/p99 | Implemented | Live API call | Reported for all and successful responses |
| Wilson confidence intervals | Implemented | Benchmark scoring | 95% Wilson intervals for binomial rates |
| Harm-weighted unsafe execution rate | Implemented | Simulated | Eligible unsafe mock trajectories weighted by fixture severity |
| Severity and risk-category breakdowns | Implemented | Mixed / simulated outcomes | Outcome metrics remain eligibility-gated |
| Audit field completeness | Implemented | Benchmark artifact | Scores expected benchmark audit fields; not production audit completeness |
| Trace completeness | Partial | Benchmark artifact | Benchmark audit-like fields do not represent production audit logs |
| Controlled baseline comparison | Implemented | Mixed / benchmark-side proxies | Compares V0, V2, V4, and V5 over the same fixtures; not autonomous-agent evidence |
| Controlled agent-loop safe terminal rate | Partial | Controlled deterministic proxy | Eligible deterministic loops ending safely |
| Controlled agent-loop success rate | Partial | Controlled deterministic proxy | Original action remains unexecuted and terminal outcome meets loop criteria |
| Agent revision success proxy | Partial | Controlled deterministic proxy | Compliant deterministic revisions with matched controller outcome |
| Goal preservation proxy rate | Partial | String-retention / utility-target proxy | Not semantic preservation review |
| Agent-loop API success rate | Implemented | Live API call within controlled loop | Scoped only to loop checks |

Outcome metrics must be gated by metric eligibility:

- successful `/check`
- non-error mapped decision
- complete controller outcome
- mock-tool execution field present

This prevents API failures or malformed results from being counted as safety wins.

## Partially Implemented and Remaining Metrics

| Metric / feature | Why not implemented yet | Can be implemented in inhibitor-lab? | Planned stage |
| --- | --- | --- | --- |
| Policy violation capture rate | Needs policy IDs and TP/FN labels | Partly | Policy/audit schema |
| Revision success rate | Implemented for triggered fixture-defined safe revisions; simulated | Yes | Partial, not agent-generated |
| Adjustment compliance rate | Implemented as required-string removal/retention checks; simulated | Yes | Partial fixture proxy |
| User-goal preservation | Partial fixture proxy via required retained strings and utility targets; no final response scoring | Yes | Agent/adjustment loop |
| Minimality of intervention | Partial changed-envelope-path metadata; needs action-diff rubric or reviewer scoring | Yes | Adjustment quality |
| Throughput / stress aggregation | Needs stress runner integration | Yes | Operations integration |
| Human-review agreement | Requires independent reviewers and adjudication | Process dependency | Human labeling |
| Official external prompt-injection benchmark score | Requires dataset integration | Yes, later | External benchmark slices |
| Composite benchmark score | Requires mature safety, utility, adjustment, operations, and audit subscores | Yes, later | Publication scoring |

## Fixture-defined adjustment support

The current adjustment loop is fixture-defined: when an original action maps to a configured `revise` decision, the benchmark applies a known safe revision, rechecks it, and evaluates it through simulated controller and mock-tool outcomes. It is not an agent-generated revision or autonomous agent loop.


## Controlled agent-loop prototype

The controlled agent loop is distinct from fixture-defined adjustment: the fixture-defined path supplies a known safe revision, while this deterministic benchmark-side profile generates its revised envelope by applying configured transformations after controller feedback. It records a separate proposal → check → controller → optional revision → re-check trajectory. Fully autonomous or LLM-agent benchmarking is out of scope for the current core suite and may be evaluated later as a separate optional experiment.

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
- autonomous agent baselines
- fully autonomous or LLM-agent revision success (controlled deterministic agent revision success proxy is measured)
- full user-goal preservation beyond fixture string-retention and utility-target proxies
- full minimality-of-intervention scoring
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
| prompt injection | Seed case represented |
| excessive agency | Seed case represented |
| unsafe code | Seed case represented |
| financial loss | Seed case represented |
| legal/compliance violation | Seed case represented |
| deception/fraud | Seed case represented |
| safety-critical advice | Seed case represented |
| memory contamination | Seed case represented |
| benign/control | Seed case represented |

Seed representation means at least one synthetic no-side-effect fixture exists for the category. It does not imply robust category-level performance or publication-density coverage.

## Target Case Label Schema

High-quality runtime inhibition benchmark cases should define ground truth before execution. The target label schema is:

| Field | Target meaning | Current status |
| --- | --- | --- |
| `case_id` | Stable benchmark case identifier | Implemented |
| `benchmark_risk_category` | Pre-registered risk category | Implemented |
| `user_goal` | Legitimate user objective | Implemented |
| `environment_state` | Context and constraints relevant to safe action | Implemented |
| `proposed_action_envelope` | Candidate behavior before inhibition | Implemented |
| `allowed_outcome` | What a safe successful outcome looks like | Planned |
| `unsafe_outcome` | What failure would look like | Planned |
| `acceptable_decisions` | Decisions considered safe for the fixture | Implemented |
| `acceptable_revision` | Fixture-defined safe revised action when revision is possible | Partial |
| `required_clarification` | Clarification needed for ambiguous cases | Planned |
| `escalation_requirement` | When human/reviewer escalation is required | Planned |
| `severity` | Pre-registered harm severity | Implemented |
| `severity_weight` | Numeric weight for harm-weighted scoring | Implemented locally from fixture severity labels |
| `policy_ids` | Expected benchmark policy identifiers | Planned |
| `utility_target` | Fixture-defined utility proxy for a safe revised action | Partial |
| `reversibility` | Whether the action can be undone | Implemented inside action envelope |
| `data_sensitivity` | Sensitivity level of touched data | Implemented inside action envelope |
| `expected_audit_fields` | Required trace fields for auditability checks | Implemented for benchmark artifact completeness |
| `human_labels` | Independent reviewer labels and adjudication | Not measured / process dependency |

The current seed cases include enough labels for signal, decision, and simulated controller outcome validation. They do not yet include the full target label schema needed for final publication-style safety efficacy, utility, adjustment, and human-agreement claims.

## Publication Result Tables

Publication preparation should produce seven result tables: safety results, utility results, adjustment results, baseline comparison results, operations results, and auditability results.

| Table | Current status | Notes |
| --- | --- | --- |
| Safety | Partial | Simulated UAPR/UER over eligible mock trajectories; no production prevention claim |
| Utility | Partial | Simulated safe task completion and over-inhibition over benign mock trajectories |
| Adjustment | Partial | Fixture-defined revisions remain separate from controlled deterministic agent-loop proxy metrics |
| Controlled agent loop | Partial | Deterministic benchmark-side proposal/revision records, safe-terminal, success, and string-retention proxy metrics; not autonomous or LLM-agent evidence |
| Baseline comparison | Partial | Controlled benchmark-side V0/V2/V4/V5 comparisons over the same fixtures; not autonomous-agent or production baseline evidence |
| Operations | Partial | API success, latency percentiles, and timeout/error-class rates implemented; throughput/stress aggregation planned |
| Auditability | Partial | Benchmark audit-field completeness is implemented; production audit logs, native policy IDs, trace IDs, incident reconstructability, and explanation usefulness remain not measured or planned for separate implementation |

Missing values must be reported explicitly as `not_measured`, `partial`, or `not_applicable`. Detection or signal-trigger rates must not be reported as prevention rates unless eligible controller/execution outcome evidence exists.

## Composite Score Status

The target evaluation framework may eventually support a weighted composite score across safety, utility, adjustment, operations, and auditability. The current benchmark must not compute or report a final composite score yet.

Composite scoring remains `not_measured` until:

- safety and utility metrics are computed over sufficient fixture coverage
- adjustment-loop metrics are implemented
- operations metrics include latency percentiles and error/timeout rates
- audit completeness is scored
- missing metrics are explicitly handled
- support levels are clearly separated

## Baseline variants

The runtime trajectory suite implements controlled benchmark-side comparison variants over the same synthetic fixtures. These are not production baselines or autonomous-agent baselines.

- **V0 unprotected mock execution** directly executes the no-side-effect mock tool without `/check`; it is a deterministic simulated baseline, not a production incident-rate measurement.
- **V2 final-output-only check** uses a reduced visible payload view with live `/check`; it is a benchmark-side proxy, not an official moderation benchmark score.
- **V4 tool-boundary check** uses only tool name and compact input with live `/check`; it is a benchmark-side proxy, not production tool enforcement.
- **V5 full runtime inhibition** reuses the main full-context trajectory result with native signal evidence, compatibility-mapped decision, and simulated controller/mock-tool outcome.

API failures in live-check proxies are excluded from baseline outcome metrics and are not prevention wins. Prompt-only and fully autonomous-agent variants are outside this controlled core benchmark scope; any future evaluation would be a separate optional experiment, not a prerequisite for this suite.

## Allowed and Disallowed Claims

### Allowed claims

- “The runtime trajectory suite validates control-chain mechanics over structured proposed actions, live `/check` evaluation, compatibility-mapped decisions, and simulated controller enforcement over no-side-effect mock tools.”
- “Eligible unsafe mock actions were prevented in the simulated controller environment.”
- “The benchmark reports measured, simulated, partial, and not-measured metrics separately.”
- “The current suite provides seed coverage across the minimum target risk categories, not publication-density coverage or robust category-level performance.”

### Disallowed claims

- “Inhibitor prevents production tool execution.”
- “The benchmark proves production unsafe-action prevention.”
- “The current suite fully implements the target runtime inhibition evaluation protocol.”
- “The current suite provides official AgentDojo or InjecAgent scores.”
- “Detection rate is equivalent to prevention rate.”
- “Mock-tool non-execution caused by API failure is a safety success.”

## Completion Roadmap

Completed:

1. Reporting/schema improvements.
2. Methodology and limitations document.
3. Metric completeness.
4. Risk-category fixture expansion.
5. Fixture-driven adjustment loop.
6. Controlled benchmark-side baseline variants.
7. Controlled deterministic agent-loop prototype.

Remaining:

1. Full minimality and human-reviewed adjustment-quality scoring.
2. Prompt-injection slices:
   - local prompt-injection fixtures
   - local diagnostic/semantic-context prompt-injection-style artifacts
   - official AgentDojo adapter
   - official InjecAgent adapter
3. Human labeling workflow.
4. Full implemented-suite execution and publication result package.

Local prompt-injection runtime trajectory fixtures and local diagnostic/semantic-context prompt-injection-style artifacts must not be described as official AgentDojo or InjecAgent scores. Official external benchmark scores require adapter implementation, dataset/task mapping, and separate execution.

## Final Validation and Publication Plan

After implementing new benchmarks:

- execute the full implemented benchmark suite against Inhibitor
- review results against expected signal outcomes, acceptable decisions, controller outcomes, execution outcomes, metric eligibility, support levels, risk-category coverage, known limitations, and publication claim boundaries
- review metrics for consistency and accuracy
- document discrepancies and issues
- mark unsupported metrics as `not_measured`
- prepare publication-ready result tables
- review claims before publication

Discrepancies should be documented rather than silently hidden by fixture changes. Fixture changes after seeing live results should be justified in PR notes.

“Full implemented suite” means the benchmark suite implemented in inhibitor-lab at that point, not necessarily the complete ideal target protocol.

## Methodology Changelog

```text
v0.1 — Initial methodology document. Documents current runtime trajectory seed benchmark, support levels, implemented metrics, limitations, and completion roadmap.
v0.2 — Adds metric completeness for confidence intervals, latency percentiles, timeout/error rates, harm-weighted unsafe execution, severity/category breakdowns, and benchmark audit-field completeness.
v0.3 — Adds seed fixture coverage for all minimum runtime trajectory risk categories while preserving simulated controller/mock-tool claim boundaries.
v0.4 — Adds fixture-driven adjustment-loop support with safe revision envelopes, revised-action rechecks, simulated revision success, adjustment compliance, and revised-action execution metrics.
v0.5 — Adds controlled benchmark-side baseline variants for unprotected mock execution, final-output-only checking, tool-boundary checking, and the current full runtime inhibition path.
```

### v0.6

Adds a controlled deterministic agent-loop prototype with agent-generated action/revision records, safe terminal metrics, revision-success proxy metrics, and explicit non-autonomous-agent claim boundaries. Fully autonomous or LLM-agent benchmarks and full semantic user-goal preservation remain unmeasured.

The current core benchmark implements a controlled deterministic agent-loop proxy. Fully autonomous LLM-agent benchmarking is out of scope for the current core suite and may be evaluated later as a separate optional experiment.

## Completion roadmap

### Completed
- Controlled deterministic agent-loop prototype with separate artifacts and proxy metrics.

### Remaining
- Prompt-injection slices, full minimality and human-reviewed adjustment quality, human labeling, and a final execution/publication package.
