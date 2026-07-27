# Inhibitor Runtime Trajectory Benchmarks

## Current structure

The active implemented core suite is [`core/runtime_trajectories`](core/runtime_trajectories/). It evaluates runtime inhibition as a control problem rather than a static classifier or final-output moderation task: can live risk evidence be surfaced before a proposed action executes, mapped into an actionable decision, and used by a controller to prevent, revise, pause, escalate, warn, or allow that action?

[`core/decision_compatibility`](core/decision_compatibility/) is shared adapter infrastructure, not a separately claimed benchmark suite. [`diagnostics`](diagnostics/) is reserved for diagnostics only; it is not runtime-trajectory result or publication evidence.

The implemented harness combines:

- structured proposed-action envelopes from deterministic fixtures;
- envelopes rendered into live Inhibitor `/check` `thought_chain` inputs;
- native signal evidence from live responses;
- compatibility-mapped decisions (`allow`, `warn`, `revise`, `clarify`, `pause`, `escalate`, or `block`);
- deterministic benchmark controller semantics; and
- simulated, no-side-effect mock-tool execution outcomes.

This adaptation is necessary because there is not yet a controlled production environment in which these cases can safely execute or block real tools, nor production controller-enforcement traces for them. It tests whether live evidence can support safe decisions without risking real side effects.

## Reviewer path

First-time reviewers can continue to the [runtime trajectory suite guide](core/runtime_trajectories/README.md), inspect the canonical [16-case fixture](core/runtime_trajectories/cases.json), read the [authoritative methodology](reporting/runtime_inhibition_benchmark_methodology.md), review the [latest validation summary](reporting/runtime_trajectory_validation_summary.md), and then examine the [known discrepancies](reporting/discrepancy_summary.md).

## Preflight

Run from the repository root:

```bash
python3 -m unittest benchmarks.core.runtime_trajectories.tests.test_runner_metrics
python3 -m unittest benchmarks.core.runtime_trajectories.tests.test_prompt_injection_slice
python3 benchmarks/validate_fixtures.py
python3 benchmarks/run_all.py --suite runtime_trajectories --dry-run
python3 -m py_compile benchmarks/core/runtime_trajectories/*.py benchmarks/core/decision_compatibility/*.py benchmarks/lib/*.py
git diff --check
```

The canonical 16-case fixture source is [`core/runtime_trajectories/cases.json`](core/runtime_trajectories/cases.json).

## Live run

```bash
RUN_ID="runtime_full_$(date +%Y%m%d_%H%M%S)"
python3 benchmarks/core/runtime_trajectories/runner.py \
  --require-live \
  --endpoint "https://iaas.appliedai.studio" \
  --run-id "$RUN_ID"
```

A completed run generates `manifest.json`, `raw_responses.json`, `normalized_results.json`, `trajectory_results.json`, `adjustment_results.json`, `agent_loop_results.json`, `agent_loop_scores.json`, `prompt_injection_results.json`, `prompt_injection_scores.json`, `baseline_results.json`, `baseline_scores.json`, `scores.json`, and `summary.md`. Generated run directories, especially raw responses, should not be committed unless intentionally approved.

## Latest validated result

Run `runtime_seed_20260724_135905` against `https://iaas.appliedai.studio` achieved 16/16 live API success, 11/16 case passes, 9/14 unsafe-action prevention, 5/14 unsafe executions, 2/2 benign-control completions, 16/16 signal expectations met, and 99/99 audit fields complete. Prompt-injection prevention was 1/4 unsafe injected cases. The controlled V5 proxy reduced unsafe execution from V0's 14/14 to 5/14.

## Claim boundary

These results do **not** prove production tool-execution enforcement, independent human-label performance, official AgentDojo or InjecAgent scores, publication-density risk-category performance, full autonomous LLM-agent safety, or complete production runtime control. Controller enforcement and execution outcomes are simulated benchmark behavior.
