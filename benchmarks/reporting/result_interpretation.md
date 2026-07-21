# Result Interpretation Guidance

This document defines public-safe interpretation rules for benchmark outputs. It is intended to prevent overclaiming and to keep native, compatibility-mapped, simulated, diagnostic, and historical evidence clearly separated.

## Suite-level claim boundaries

### `capability_validation`

Can claim:

- Native-support evaluation of current Inhibitor API compatibility and response shape.
- Evidence that exposed `/check`, `/catalog`, schemas, observations, predictions, rules output, or supported modes matched the suite's validators for the run.

Should not claim:

- Full safety efficacy.
- Runtime enforcement.
- Unsafe-action prevention or safe-task-completion rates.

### `observation_normalization`

Can claim:

- Native-support evaluation of observation-normalization-compatible outputs exposed by current Inhibitor behavior.
- Evidence that run-specific outputs satisfied fixture-defined structural or semantic validators.

Should not claim:

- Native runtime decisions unless explicitly exposed and validated.
- Production enforcement outcomes.
- End-to-end task success rates.

### `decision_compatibility`

Can claim:

- Compatibility-mapped evaluation using deterministic translation from current Inhibitor outputs into the runtime-decision vocabulary.
- Evidence that mapped decisions were consistent with fixture expectations for the run.

Should not claim:

- Native runtime-decision support unless separately demonstrated by native outputs.
- Production enforcement, unsafe-action prevention, or safe-completion performance.

### `runtime_trajectories`

Can claim:

- Native relevant signal evidence, compatibility-mapped runtime decisions, and simulated controller-enforced mock-tool outcomes for structured proposed actions.
- Evidence that the deterministic benchmark controller followed fixture-defined behavior for the run.

Should not claim:

- Native runtime enforcement.
- Production tool execution or production unsafe-action prevention.
- Autonomous-agent safety efficacy.

### Diagnostic suites

Can claim:

- Operational or robustness diagnostic observations for stress, large-context, or semantic-context conditions.
- Evidence relevant to operational maturity or robustness discussions.

Should not claim:

- Direct production safety efficacy.
- Native runtime enforcement.
- Replacement for core benchmark evidence.

### Legacy IEB artifacts

Can claim:

- Historical traceability to earlier benchmark evidence.
- Comparability with prior archived results when methodology is clearly disclosed.

Should not claim:

- Current-suite performance unless rerun under the current benchmark protocol.

## Interpreting failures

A failure means the evaluated output, mapped output, simulated controller result, fixture, validator, or artifact did not meet the relevant suite expectation. Report failures with the suite id, case id, support level, run id, and whether the failure occurred in native validation, compatibility mapping, simulated controller logic, diagnostic validation, or artifact generation.

Failures should not be generalized beyond the suite's support level. For example, a simulated trajectory failure is a simulated controller or harness outcome, not direct evidence of production runtime enforcement behavior.

## Interpreting warnings and partial passes

Warnings and partial passes should be reported separately from passes and failures. They may indicate optional fields, non-blocking schema variation, fixture coverage gaps, diagnostic limitations, or run-specific evaluated-system outputs that require reviewer attention. Do not convert warnings into successes or use partial passes to support stronger claims than the suite allows.

## Compatibility-mapped decisions

Compatibility-mapped decisions are deterministic reporting translations from current Inhibitor outputs into the runtime-decision vocabulary. They are useful for comparing current outputs with paper-facing decision categories, but they should be labeled as compatibility-mapped wherever reported.

Do not describe compatibility-mapped decisions as native runtime decisions unless the same decision vocabulary is directly exposed by supported native outputs and validated by the suite.

## Simulated trajectory proxy rates

Controller/mock-tool outcomes are simulated benchmark enforcement over deterministic mock tools. They can describe benchmark-controller behavior and fixture coverage, but must not be described as production tool execution or production unsafe-action-prevention.

## Run-specific evaluated-system outputs

Live `/check` responses are captured as run-specific outputs from the evaluated system. Reports may summarize observed structures and scores without exposing internal implementation details. Do not mention model selectors, internal evaluators, prompt chains, or proprietary implementation details. Exact signal names, confidence values, and explanatory text should not be assumed identical across runs unless explicitly validated.
