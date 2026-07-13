# [Report Title]

## Benchmark version

- Benchmark repository commit SHA: `[commit-sha]`
- Benchmark suite version or branch: `[version-or-branch]`
- Benchmark suite manifest: `[manifest-reference]`

## Inhibitor version

- Inhibitor endpoint: `[endpoint]`
- Inhibitor version returned by API responses, when available: `[version]`

## Run metadata

- Run id: `[run-id]`
- Run timestamp: `[timestamp]`
- Runner version: `[runner-version]`
- Suites executed: `[suite-list]`
- Number of cases: `[case-count]`
- Modes used: `[mode-summary]`

## Suite coverage

Summarize executed suites and disclose omitted suites. Capability validation and observation normalization are native-support evaluations. Decision compatibility is compatibility-mapped. Runtime trajectories are simulated proxy evaluations. Diagnostic suites, if included, are operational or robustness diagnostics rather than direct production safety-efficacy measures.

## Support-level summary

| Suite | Category | Support level | Cases | Notes |
| --- | --- | --- | ---: | --- |
| capability_validation | core | native | `[n]` | Evaluates exposed API contract and response shape. |
| observation_normalization | core | native | `[n]` | Evaluates native observation-normalization-compatible outputs. |
| decision_compatibility | core | compatibility_mapped | `[n]` | Deterministically maps current outputs into the runtime-decision vocabulary. |
| runtime_trajectories | core | simulated | `[n]` | Reports deterministic controller proxy outcomes, not native runtime enforcement. |
| diagnostics, if any | diagnostic | diagnostic or disclosed manifest level | `[n]` | Operational or robustness diagnostics only. |

## Methodology

Describe fixtures, adapters, validators, scoring rules, deterministic mapping logic, deterministic controller logic, and artifact retention. State that live `/check` responses are captured as run-specific outputs from the evaluated system.

## Results summary

Provide aggregate results with support levels and confidence boundaries appropriate to the executed suites. Avoid describing compatibility-mapped or simulated results as native production enforcement.

## Capability validation results

Report native-support evaluation results for current `/check`, `/catalog`, response schemas, observations, predictions, rules output, and supported modes where applicable.

## Observation-normalization results

Report native-support evaluation results for observation-normalization-compatible signals exposed by current Inhibitor behavior.

## Decision-compatibility results

Report compatibility-mapped results produced by deterministic mapping from current Inhibitor outputs into the runtime-decision vocabulary. Do not describe these mapped decisions as native runtime decisions unless native output support is separately demonstrated.

## Runtime-trajectory proxy results

Report simulated/proxy outcomes produced by the deterministic benchmark controller or harness around current Inhibitor outputs. Simulated proxy rates should not be described as production unsafe-response-prevention rates or production safe-completion rates.

## Diagnostic results, if included

Report stress, large-context, or semantic-context robustness diagnostics separately. Diagnostic suites are operational or robustness diagnostics, not direct production safety-efficacy measures.

## Limitations

Document run-specific limitations, omitted suites, support-level boundaries, compatibility mapping assumptions, simulated controller assumptions, and any warnings or partial passes.

## Reproducibility package

- Artifact package location: `[location]`
- Included artifacts: `[artifact-list]`
- Raw responses retained: `[yes/no]`
- Reproduction commands: `[commands-or-reference]`

## Appendix: artifact inventory

| Artifact | Present | Notes |
| --- | --- | --- |
| `manifest.json` | `[yes/no]` | `[notes]` |
| `raw_responses.jsonl` | `[yes/no]` | `[notes]` |
| `normalized_results.jsonl` | `[yes/no]` | `[notes]` |
| `scores.json` | `[yes/no]` | `[notes]` |
| `summary.md` | `[yes/no]` | `[notes]` |
| `trajectory_results.jsonl` | `[yes/no/not applicable]` | Required for `runtime_trajectories` when available. |
