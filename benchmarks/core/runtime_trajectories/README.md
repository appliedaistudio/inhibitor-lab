# Runtime Trajectories

This suite evaluates whether Inhibitor signals can support controller-enforced runtime decisions over structured proposed actions in a controlled mock-tool environment.

Each fixture follows this deterministic sequence:

```text
task / user goal → environment state → proposed action envelope → rendered thought_chain
→ Inhibitor response → mapped runtime decision → benchmark controller action
→ mock-tool blocked/executed outcome → trajectory result artifact
```

Action envelopes are benchmark-side fixtures, not native Inhibitor objects. The renderer deterministically converts an envelope into the current `/check` `thought_chain` request. It performs no generation, external calls, or credential handling. The suite evaluates relevant mapped signal evidence rather than exact benchmark-risk category names.

The documented bridge in `action_envelope.py` maps benchmark risk categories to existing decision-compatibility catalog signal families. The existing decision-compatibility adapter maps current Inhibitor outputs into runtime decisions. A deterministic benchmark controller then applies those decisions to mock tools: `allow` and `warn` execute the mock record; `revise`, `clarify`, `pause`, `escalate`, and `block` prevent the original mock action.

Mock tools only record an attempted, executed, or blocked outcome with a sanitized payload summary. They never make external calls or create real side effects.

Support levels are explicit in each result artifact: API/signal evidence is `native`, decisions are `compatibility_mapped`, and controller/mock-tool enforcement is `simulated`. This is controlled mock-tool trajectory evidence, not production tool-execution evidence or a claim of production-wide unsafe-action prevention.

PR #106 introduces runtime trajectory mechanics and seed cases, not full benchmark risk taxonomy coverage. Categories without a represented fixture are deferred and are not counted as covered. Full category coverage belongs in a later fixture-expansion PR before publication-style execution.

| Category | Current status |
| --- | --- |
| privacy_leakage | seed case represented |
| credential_exposure | seed case represented |
| excessive_agency | seed case represented |
| benign/control allow path | seed case represented |
| prompt_injection | deferred |
| unsafe_code | deferred |
| financial_loss | deferred |
| legal_compliance_violation | deferred |
| deception_fraud | deferred |
| safety_critical_advice | deferred |
| memory_contamination | deferred |

Allowed claim: “The runtime trajectory suite evaluates whether Inhibitor signals can support compatibility-mapped runtime decisions that are enforced by a deterministic benchmark controller over no-side-effect mock tools.” It does not claim native runtime enforcement, real external action blocking, production tool execution, or full taxonomy coverage.

The taxonomy registers privacy leakage, credential exposure, prompt injection, excessive agency, unsafe code, financial loss, legal compliance violation, deception/fraud, safety-critical advice, and memory contamination. Fixtures currently represent only the categories in `cases.jsonl`; unrepresented categories are deferred rather than inferred as coverage.

Run fixture-only validation with:

```bash
python benchmarks/core/runtime_trajectories/runner.py --dry-run
```
