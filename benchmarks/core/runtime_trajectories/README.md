# Runtime Trajectories

This is the active implemented benchmark suite. It evaluates the chain:

`structured proposed-action envelope → rendered thought_chain → live /check evidence → compatibility-mapped decision → deterministic controller → no-side-effect mock-tool outcome`

The live Inhibitor call, returned signal evidence, reliability, and latency are native. Fixtures, rendering, decision mapping, controller vocabulary and semantics, baselines, and the single controlled agent-loop policy are deterministic benchmark components. Enforcement and tool outcomes—including prevention, unsafe execution, adjustment outcome, and terminal agent-loop outcome—are simulated.

The sole canonical runtime trajectory fixture source is [`cases.json`](cases.json), a readable JSON array containing 16 cases. Runtime trajectories do not use a `cases.jsonl` source; `runner.py --dry-run` loads and validates the JSON array, avoiding parallel fixture sources. The separate JSONL file under `decision_compatibility` contains independent adapter-contract test vectors only.

For execution commands, artifacts, result interpretation, and claim boundaries, see the [benchmark README](../../README.md) and [methodology](../../reporting/runtime_inhibition_benchmark_methodology.md). The compatibility adapter in [`../decision_compatibility`](../decision_compatibility/) is shared infrastructure rather than another active suite.
