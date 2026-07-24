# Runtime Trajectories

This suite evaluates whether Inhibitor signals can support controller-enforced runtime decisions over structured proposed actions in a controlled mock-tool environment.

The [runtime inhibition benchmark methodology](../../reporting/runtime_inhibition_benchmark_methodology.md) is the canonical source for claim boundaries, metric status, limitations, and the implementation roadmap. This README describes the suite mechanics without duplicating that methodology.

Each fixture follows this deterministic sequence:

```text
task / user goal → environment state → proposed action envelope → rendered thought_chain
→ Inhibitor response → mapped runtime decision → benchmark controller action
→ mock-tool blocked/executed outcome → trajectory result artifact
```

Action envelopes are benchmark-side fixtures, not native Inhibitor objects. The renderer deterministically converts an envelope into the current `/check` `thought_chain` request. It performs no generation, external calls, or credential handling. The suite evaluates relevant mapped signal evidence rather than exact benchmark-risk category names.

The documented bridge in `action_envelope.py` maps benchmark risk categories to existing decision-compatibility catalog signal families. The existing decision-compatibility adapter maps current Inhibitor outputs into runtime decisions. A deterministic benchmark controller then applies those decisions to mock tools: `allow` and `warn` execute the mock record; `revise`, `clarify`, `pause`, `escalate`, and `block` prevent the original mock action.

Mock tools only record an attempted, executed, or blocked outcome with a sanitized payload summary. They never make external calls or create real side effects.

The risky seed cases use stronger synthetic context while retaining fake placeholder data and controlled no-side-effect mock tools.

Support levels are explicit in each result artifact: API/signal evidence is `native`, decisions are `compatibility_mapped`, and controller/mock-tool enforcement is `simulated`. This is controlled mock-tool trajectory evidence, not production tool-execution evidence or a claim of production-wide unsafe-action prevention.

The suite provides coverage-floor fixtures with seed coverage for all minimum target risk categories. This is not publication-density coverage: each fixture remains synthetic, and controller/mock-tool outcomes are simulated. The suite makes no production enforcement claim.

| Category | Current status |
| --- | --- |
| privacy_leakage | seed case represented |
| credential_exposure | seed case represented |
| prompt_injection | seed case represented |
| excessive_agency | seed case represented |
| unsafe_code | seed case represented |
| financial_loss | seed case represented |
| legal_compliance_violation | seed case represented |
| deception_fraud | seed case represented |
| safety_critical_advice | seed case represented |
| memory_contamination | seed case represented |
| benign/control allow path | seed case represented; no relevant risk signal expected |

Allowed claim: “The runtime trajectory suite evaluates whether Inhibitor signals can support compatibility-mapped runtime decisions that are enforced by a deterministic benchmark controller over no-side-effect mock tools.” It does not claim native runtime enforcement, real external action blocking, production tool execution, publication-density category coverage, or robust category-level performance.

## Run artifacts and reporting

Each live run writes `manifest.json`, `raw_responses.json`, `normalized_results.json`, `trajectory_results.json`, `adjustment_results.json`, `agent_loop_results.json`, `agent_loop_scores.json`, `prompt_injection_results.json`, `prompt_injection_scores.json`, `baseline_results.json`, `baseline_scores.json`, `scores.json`, and `summary.md`. The per-case result artifacts are JSON array artifacts, not JSONL streams. `summary.md` is the human-readable run report; `scores.json` reports harness pass/fail, metric eligibility, Wilson confidence intervals, operational latency/error metrics, severity/category breakdowns, benchmark audit-field completeness, support levels, compact baseline comparison data, and unsupported metrics under `not_measured`.

Controller and mock-tool outcomes are simulated benchmark enforcement. `trajectory_results.json` is a benchmark trajectory artifact with audit-like fields, not a production audit log.

The taxonomy registers privacy leakage, credential exposure, prompt injection, excessive agency, unsafe code, financial loss, legal compliance violation, deception/fraud, safety-critical advice, and memory contamination. Fixtures provide seed representation for every minimum target risk category in `cases.jsonl`; this coverage floor must not be inferred as publication-density coverage.

Run fixture-only validation with:

```bash
python3 benchmarks/core/runtime_trajectories/runner.py --dry-run
```

## Fixture-driven adjustment loop

Configured fixtures may provide a known safe revision for an original action mapped to `revise`. The benchmark controller keeps the original action blocked, renders the fixture-defined revised envelope, rechecks it through `/check`, and sends it through the same deterministic controller and no-side-effect mock tools. `adjustment_results.json` records the revised response, mapping, controller outcome, deterministic string-retention compliance checks, and partial changed-path minimality metadata.

These adjustment metrics are simulated benchmark metrics. The revision is fixture-defined rather than agent-generated, so this suite does not implement or claim an autonomous agent adjustment loop.

## Baseline variants

The suite runs controlled benchmark-side baselines over the same fixtures. They are not production baselines or autonomous-agent baselines.

- **V0 unprotected mock execution** executes the proposed no-side-effect mock action without `/check`; it is a deterministic simulated baseline, not an unprotected production agent.
- **V2 final-output-only check** sends only a compact visible payload to `/check`; it is a live-check proxy, not an official moderation benchmark or full agent baseline.
- **V4 tool-boundary check** sends only the tool name and compact tool input to `/check`; it is a live-check proxy, not production tool enforcement.
- **V5 full runtime inhibition** projects the main runtime trajectory result, including its full fixture context and simulated controller/mock-tool outcome. It is the main runtime inhibition path and does not make a duplicate `/check` call.

`baseline_results.json` contains one record per case and variant. `baseline_scores.json` reports eligibility-gated unsafe execution/prevention and safe completion/over-inhibition rates. Failed API calls in V2 and V4 are excluded rather than counted as prevention wins.
`baseline_scores.json` reports missing records, duplicate records, and ineligible proxy records so publication review can distinguish real outcome differences from incomplete baseline execution.

## Controlled agent-loop prototype

Configured `agent_loop` fixtures exercise a deterministic benchmark-side agent profile. The initial proposal is seeded from the fixture envelope and revisions use declared deterministic transformations after controller feedback; no external LLM calls, browser/tool use, or production tools are involved. The original unsafe proposal remains subject to the same controller and no-side-effect mock-tool logic. `agent_loop_results.json` records steps and terminal outcomes, while `agent_loop_scores.json` reports controlled agent-loop proxy metrics. This is not evidence of production, autonomous, or full agent-baseline behavior.

The current core benchmark implements a controlled deterministic agent-loop proxy. Fully autonomous LLM-agent benchmarking is out of scope for the current core suite and may be evaluated later as a separate optional experiment.

## Controlled local prompt-injection slice

Live runs also project `prompt_injection_results.json` and `prompt_injection_scores.json` from the already completed primary trajectory responses; the projection makes no additional `/check` calls. The slice uses synthetic, no-side-effect fixtures with explicit trusted goals and untrusted-content metadata. It is a controlled local prompt-injection slice, **not** an official AgentDojo or InjecAgent score, an autonomous-agent benchmark, or production prompt-injection defense evidence.
