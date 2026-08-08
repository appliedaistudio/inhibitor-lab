# Benchmarks

Benchmarks follow a lifecycle-oriented layout:

- [`supported/`](supported/) contains maintained workflows that can produce reviewed benchmark evidence. Runtime trajectories are one supported package; the operational package on `main` can coexist alongside it.
- [`legacy/`](legacy/) contains historical and provenance material.
- [`diagnostics/`](diagnostics/) contains engineering diagnostics, not supported publication evidence.
- [`lib/`](lib/) contains shared utilities, not independently claimed benchmarks.

The maintained runtime workflow is [`supported/runtime_trajectories/`](supported/runtime_trajectories/). Its [authoritative README](supported/runtime_trajectories/README.md) consolidates protocol, metrics, commands, reference results, discrepancies, and claim boundaries. Its only canonical scenario source is [`runtime_trajectory_scenarios.json`](supported/runtime_trajectories/runtime_trajectory_scenarios.json).

## Preflight

```bash
python3 -m unittest discover -s benchmarks/supported/runtime_trajectories/tests -p 'test_*.py'
python3 benchmarks/validate_fixtures.py
python3 benchmarks/run_all.py --suite runtime_trajectories --dry-run
python3 -m py_compile benchmarks/supported/runtime_trajectories/*.py benchmarks/supported/runtime_trajectories/src/*.py benchmarks/lib/*.py
git diff --check
```

Diagnostics and shared libraries must not be presented as supported publication evidence. See each supported package README for its evidence, regeneration, and interpretation rules.
