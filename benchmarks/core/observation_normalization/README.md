# Observation Normalization Benchmark

## Purpose

This Phase 4 core suite validates native observation-normalization-compatible signals exposed by the current Inhibitor `/check` API. It focuses on structural and lightweight behavioral checks around observations, observation normalization, retained or suppressed observations, predictions, inference-like fields, temporal/evidence diagnostics, and prediction consistency where those signals are exposed by the response.

Support level: `native`.

## Paper-derived fixture methodology

Codex does not have access to private benchmark methodology notes or source papers. For this public suite, the embedded taxonomy below is the authoritative paper-derived basis for fixtures. Cases are concise, public-safe, and representative; they are not arbitrary examples. Each case carries traceability fields:

- `paper_tags`
- `risk_category`
- `expected_signal_family`

## Embedded taxonomy used in this phase

Benchmark dimensions:

1. Safety efficacy: whether unsafe or harmful requests and unsafe AI compliance produce detectable native signals.
2. Utility preservation: whether safe refusals or safe redirections can be distinguished from unsafe compliance without treating every harmful user request as equivalent to harmful AI behavior.
3. Adjustment quality: whether safe refusal, redirection, or corrective behavior is represented in the native observation/prediction signal layer when exposed.
4. Operational reliability: whether malformed, incomplete, invalid, or process-breaking scenarios produce usable structural signals rather than silent success.
5. Auditability: whether output exposes enough observations, predictions, diagnostics, evidence-like fields, or normalization artifacts to support later reporting and incident reconstruction.

Risk categories:

- `unsafe_action`
- `unsafe_ai_compliance`
- `safe_refusal`
- `privacy_leakage`
- `invalid_input_structure`
- `process_integrity`
- `auditability_diagnostics`

Expected signal families:

- `safety_harm`
- `safe_refusal`
- `privacy_confidentiality`
- `system_integrity`
- `auditability_diagnostics`

Paper tags:

- `runtime_inhibition`
- `observation_normalization`
- `safety_efficacy`
- `utility_preservation`
- `adjustment_quality`
- `operational_reliability`
- `auditability`
- `privacy_leakage`
- `unsafe_action_prevention`
- `evidence_traceability`

## What this validates

- `/check` responses are successful for valid benchmark cases.
- Configured result fields such as `llm_inhibition` and `rules_inhibition` are present when required by a case.
- Observation-normalization-compatible containers are exposed when required, including flexible support for `observations`, `observation_normalization`, `predictions`, `diagnostics`, and nested equivalents.
- Lightweight keyword checks can find a relevant native signal family when exposed.
- Insight mode can remain compatible with observation-normalization-compatible fields.

## What this does not validate

- It does not map outputs to paper-defined runtime decisions.
- It does not implement decision compatibility or map responses to `allow`, `warn`, `revise`, or `block`.
- It does not simulate runtime trajectories.
- It does not measure full unsafe-action prevention or safe-task-completion rates.
- It does not claim full runtime safety, action prevention, or end-to-end unsafe-action prevention.

## Environment variables

- `INHIBITOR_BASE_URL`: base URL used when `--endpoint` and `INHIBITOR_API_URL` are unset.
- `INHIBITOR_API_URL`: preferred base URL environment override.
- `INHIBITOR_API_KEY`: API key sent through `X-API-Key`.

Endpoint resolution order is:

1. `--endpoint`
2. `INHIBITOR_API_URL`
3. `INHIBITOR_BASE_URL`

## Example commands

```bash
python benchmarks/core/observation_normalization/runner.py --dry-run
INHIBITOR_BASE_URL=https://iaas.appliedai.studio INHIBITOR_API_KEY=<key> python benchmarks/core/observation_normalization/runner.py --require-live
```

## Result artifact layout

Live runs write artifacts under:

```text
benchmarks/results/observation_normalization/<run_id>/
├── manifest.json
├── raw_responses.jsonl
├── normalized_results.jsonl
└── summary.md
```

## Scope statement

This suite validates observation-normalization-compatible signals exposed by the current Inhibitor API. The fixtures are paper-derived and traceable through `paper_tags`, `risk_category`, and `expected_signal_family`. It does not map outputs to paper-defined runtime decisions. It does not measure full unsafe-action prevention or safe-task-completion rates.
