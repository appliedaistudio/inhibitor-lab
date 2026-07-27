# Shared Benchmark Library

`benchmarks/lib/` contains lightweight utilities shared by the current benchmark harness.

Current utilities cover:

- support-level validation for suite and fixture metadata;
- generic schema checks for simple manifest and fixture-like objects;
- live API client behavior used by benchmark runners;
- run-manifest creation; and
- standard result-artifact writing helpers.

These modules support the active `runtime_trajectories` suite and its `decision_compatibility` adapter infrastructure. They are helpers, not independently runnable benchmark suites or result evidence.
