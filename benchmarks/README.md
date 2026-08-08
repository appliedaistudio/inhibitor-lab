# Inhibitor benchmarks

The benchmark lifecycle separates maintained evidence workflows from historical material:

- [`supported/`](supported/) contains maintained, reproducible packages with scenarios, execution, tests, reporting, canonical evidence, derived reports, and claim boundaries.
- [`legacy/`](legacy/) contains historical and provenance material.
- [`diagnostics/`](diagnostics/) contains diagnostic workflows and is not supported publication evidence.
- [`lib/`](lib/) contains shared harness utilities, not independently claimed benchmarks.

## Maintained benchmark

[`supported/runtime_trajectories/`](supported/runtime_trajectories/) is the authoritative runtime trajectory package. Its [README](supported/runtime_trajectories/README.md) consolidates the protocol, methodology, validation and discrepancy summaries, result interpretation, commands, and bounded publication framing. The canonical fixture is its checked-in [16-case scenario file](supported/runtime_trajectories/runtime_trajectory_scenarios.json).

## Preflight

Run from the repository root; these commands do not start a live benchmark:

```bash
python3 -m unittest discover -s benchmarks/supported/runtime_trajectories/tests -p 'test_*.py'
python3 benchmarks/validate_fixtures.py
python3 benchmarks/run_all.py --suite runtime_trajectories --dry-run
python3 -m py_compile benchmarks/supported/runtime_trajectories/*.py benchmarks/supported/runtime_trajectories/src/*.py benchmarks/lib/*.py
```

A live evidence-generation run is intentionally separate and should only be performed when a new run is approved. See the package README for its explicit command and artifact lifecycle.
