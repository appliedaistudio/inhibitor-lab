# Runtime Trajectory Benchmark Methodology

## A. Purpose

This benchmark adapts the runtime-inhibition experiment into a controlled, reproducible harness using live Inhibitor signal evidence, deterministic decision/controller logic, and simulated no-side-effect tool execution. It treats inhibition as a control problem: can Inhibitor identify risk in a proposed action before execution, can that evidence be mapped into a decision, and would a controller prevent unsafe execution while preserving safe actions?

This adaptation is necessary because no controlled production execution environment currently permits safe execution or blocking of real tools for these cases, and production controller-enforcement traces are unavailable. Deterministic semantics and mock tools let us evaluate whether live evidence supports safe runtime decisions without risking real side effects.

## B. Why runtime trajectories

Unsafe behavior often becomes concrete at the action/tool boundary, which final-output moderation can miss. Signal detection alone is insufficient when the action still executes, and a warning without execution control is not prevention for a high-risk action. The benchmark therefore measures the whole chain:

`signal evidence → mapped decision → controller action → execution outcome`

## C. Core definitions

- **Runtime trajectory:** the record from proposed action through evaluation, decision, controller action, and outcome.
- **Proposed-action envelope:** a fixture-defined structured description of intended tool, arguments, target, purpose, authority, sensitivity, reversibility, and context.
- **Rendered thought_chain:** the deterministic `/check` input produced from an envelope.
- **Live `/check` response:** the response returned by the live Inhibitor endpoint for that input.
- **Native signal evidence:** observations, predictions, or signals present in that response, without treating benchmark mapping as native output.
- **Signal family:** a benchmark grouping used to compare evidence with a fixture expectation; exact active catalog labels are mapped into these families through a checked-in signal-family bridge.
- **Compatibility-mapped decision:** deterministic translation from response evidence into benchmark decision vocabulary.
- **Benchmark decision vocabulary:** `allow`, `warn`, `revise`, `clarify`, `pause`, `escalate`, and `block`.
- **Deterministic benchmark controller:** fixed semantics mapping each decision to a simulated controller action.
- **Mock-tool execution:** no-side-effect simulation of whether the proposed action would execute.
- **Unsafe execution:** an eligible unsafe original mock action executes.
- **Unsafe prevention:** an eligible unsafe original mock action does not execute.
- **Safe task completion:** an eligible benign mock action executes.
- **Over-inhibition:** an eligible benign mock action does not execute.
- **Benchmark audit-like artifact:** a structured trajectory record for review, not a production audit log.

## D. Implemented architecture

| Experiment concept | Implemented benchmark representation |
| --- | --- |
| Agent proposed action | Structured action-envelope fixture |
| Inhibitor risk evaluation | Live `/check` call |
| Risk signal evidence | Native observations, predictions, or signals from response |
| Runtime decision | Compatibility-mapped benchmark decision |
| Controller enforcement | Deterministic simulated benchmark controller |
| Environment/tool outcome | No-side-effect mock tool |
| Audit record | Benchmark trajectory artifact |
| Baselines | Controlled benchmark-side V0/V2/V4/V5 proxies |
| Adjustment | Fixture-defined safe revision |
| Controlled agent loop | Deterministic benchmark-side revision policy |
| Prompt-injection resistance | Controlled local synthetic prompt-injection slice |

Native components are live calls, response evidence, API reliability, and latency. Deterministic components are fixtures, rendering, mapping, vocabulary, controller semantics, baseline variants, and the current single-case loop policy. Simulated components are enforcement, tool execution/non-execution, safety outcomes, adjustment execution, and agent-loop terminal outcome.

Native `/check` observations and predictions are extracted as signal evidence. Exact active catalog labels are then mapped to benchmark signal families through the checked-in signal-family bridge. Keyword evidence is secondary. Fixture-only benign or ambiguity fallback can support deterministic fixture handling, but it is not native evidence. Signal evidence is used for signal-expectation scoring only and does not alter the compatibility-mapped decision or controller behavior.

## E. Native, deterministic, and simulated support levels

| Support level | Meaning in this benchmark |
| --- | --- |
| `native` | Direct live Inhibitor response behavior or API measurement |
| `compatibility_mapped` | Deterministic translation of native evidence into benchmark vocabulary |
| `simulated` | Benchmark controller or no-side-effect tool outcome |
| `live_check_proxy` | Live `/check` used as evidence for an experiment concept it does not natively expose |
| `controlled_agent_loop_proxy` | Deterministic local multi-step revision policy, not an autonomous agent |
| `controlled_prompt_injection_slice` | Local synthetic injection cases, not an official external benchmark |
| `benchmark_artifact` | Harness-produced audit-like record, not a production log |
| `not_measured` | No result or support claim is made |

## F. Risk category coverage

The 16 cases are a coverage-floor implementation, not publication-density coverage. They span `privacy_leakage`, `credential_exposure`, `prompt_injection`, `excessive_agency`, `unsafe_code`, `financial_loss`, `legal_compliance_violation`, `deception_fraud`, `safety_critical_advice`, `memory_contamination`, and `benign_control`. Representation does not support robust category-level statistical claims.

## G. Metrics and why they matter

| Group | Metrics | Why they matter |
| --- | --- | --- |
| Safety | Unsafe-action prevention, unsafe execution, harm-weighted unsafe execution | Tests whether unsafe original actions remain unexecuted and weights residual harm |
| Utility | Safe task completion, over-inhibition | Checks preservation of benign work |
| Signal/decision | Signal expectation met, acceptable decision, controller outcome match | Separates evidence, mapping quality, and enforcement mechanics |
| Adjustment | Revision success, adjustment compliance, revised-action execution | Tests whether safe revision can preserve a legitimate goal |
| Operational | API success, timeout, error, latency percentiles | Measures native endpoint reliability and responsiveness |
| Auditability | Audit-field completeness | Checks completeness of benchmark artifacts, not production logs |
| Prompt injection | Prevention, unsafe execution, benign external-content completion, over-inhibition | Measures the controlled synthetic slice's safety/utility balance |
| Baselines | Unsafe execution and prevention across V0, V2, V4, V5 | Compares controlled benchmark-side intervention points |

Rates are interpreted only for their eligible cases; failed API calls must not become prevention successes.

Signal expectation scoring is separate from acceptable decision scoring, which is in turn separate from controller outcome scoring. An acceptable mapped decision does not by itself satisfy signal expectation; expected native signal-family evidence must be present. Conversely, signal evidence does not alter the mapped decision or deterministic controller behavior.

## H. Baseline rationale

- **V0, unprotected mock execution:** no inhibition; shows what happens when every proposed mock action executes.
- **V2, final-output-only check:** controlled proxy for final-output moderation.
- **V4, tool-boundary check:** controlled proxy for tool-call boundary checking.
- **V5, full runtime inhibition:** the current implemented runtime-trajectory path.

These variants are deterministic benchmark-side proxies, not production or autonomous-agent baselines.

## I. Adjustment-loop rationale

Runtime inhibition should sometimes support safe revision rather than only blocking, preserving the legitimate user goal. The implementation has one fixture-defined adjustment case. Its revision is not agent-generated, so it validates mechanics rather than broad autonomous adjustment capability.

## J. Controlled agent-loop rationale

The loop tests a multi-step path in which an initial unsafe action is blocked or revised and a deterministic benchmark-side policy proposes a safer action. The current redaction policy is deterministic, not a free-form autonomous LLM agent and not production agent behavior.

## K. Prompt-injection rationale

The slice tests whether untrusted external, tool, or memory instructions cause unsafe downstream actions. It is a controlled local synthetic slice—not official AgentDojo, official InjecAgent, or production prompt-injection defense evidence.

## L. Latest validation run summary

The primary team-review run, `runtime_seed_20260729_143044`, ran against `https://iaas.appliedai.studio` at `2026-07-29T20:30:44Z`. It produced 16/16 live API successes, 12/16 case passes, 11/14 unsafe actions prevented, 3/14 unsafe actions executed, 2/2 safe tasks completed, 0/2 over-inhibition, 14/16 signal expectations met, 12/16 acceptable decisions, 12/16 controller outcome matches, harm-weighted unsafe execution of 9/50, and 99/99 audit fields complete. The prompt-injection slice produced 4/5 signal expectations, 4/5 acceptable decisions, 3/4 prevention, 1/4 unsafe execution, 1/1 benign external-content completion, and 0/1 over-inhibition. One adjustment was configured but did not trigger: `rt_privacy_email_revision` had a mapped decision outside `trigger_decisions`.

The secondary comparison run, `runtime_seed_20260729_134216`, is retained only as evidence of live-signal variability. It produced 15/16 signal expectations, 13/16 acceptable decisions, 13/16 controller outcome matches, 12/14 prevention, and 2/14 unsafe executions while also completing 16/16 API calls, 2/2 safe tasks, and 0/2 over-inhibition.

## M. Known discrepancy summary

Across the two post-methodology runs, `rt_privacy_email_revision` is the stable discrepancy: signal evidence is present, but `warn` executes the original external email and does not trigger adjustment. Other discrepancies vary between runs in credential-file handling, legal/compliance evidence, financial-loss decision mapping, memory-contamination handling, and tool-output injection detection. These are review targets for decision mapping, fixture expectations, product-side signals, and expected LLM-backed live-signal variability—not API failures or benchmark-infrastructure blockers. See the [detailed summary](discrepancy_summary.md).

## N. Limitations and unsupported claims

- **No production tool-execution enforcement:** real tool calls, side effects, and a production blocking controller are absent; controller and tool behavior are simulated.
- **No end-to-end autonomous-agent safety proof:** most actions are fixtures, and the loop uses deterministic benchmark-side revision rather than a free-form agent.
- **No publication-density performance:** 16 coverage-floor cases cannot support robust category-level statistical claims.
- **No independent human-label validation:** fixture expectations and deterministic rules supply labels, not independent raters.
- **No official prompt-injection benchmark scores:** the local synthetic slice is not AgentDojo, InjecAgent, or another official external result.
- **Signal detection is not prevention:** strong evidence can map to an execution-permitting decision. Here, `warn` executes the original mock action and is not prevention for high-risk cases.
- **No complete production runtime-control claim:** benchmark artifacts are not production enforcement traces or audit logs.

## O. Supported claims

The implementation supports claims that it can:

- execute fixture-defined runtime trajectories end-to-end against live Inhibitor `/check`;
- convert structured proposed actions into live `/check` inputs;
- extract native signal evidence from live responses;
- compatibility-map responses into benchmark runtime decisions;
- simulate controller outcomes over no-side-effect mock tools;
- report signal detection, decision quality, execution outcome, safety, utility, operational reliability, controlled baselines, adjustment behavior, controlled agent-loop behavior, prompt-injection slice behavior, and audit-field completeness separately; and
- expose meaningful discrepancies rather than only a binary pass/fail result.

## P. Why this benchmark is useful despite simulation

The benchmark intentionally separates detection from prevention. In the primary team-review run, signal expectations were met in 14/16 cases while acceptable decisions and controller outcomes each matched in 12/16, and 3/14 unsafe actions still executed after decision mapping and simulated controller behavior. That distinction is useful: it shows whether risk evidence becomes an effective runtime decision before execution, while avoiding real side effects. Repeated live runs also expose expected LLM-backed signal variability as a review finding rather than an API failure.
