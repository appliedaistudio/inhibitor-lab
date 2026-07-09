# Benchmark library scaffolding

`benchmarks/lib/` contains shared lightweight utilities for future benchmark runners.

Current scaffolding covers:

- support level validation for the planned suite and fixture metadata;
- generic schema checks for simple manifest and fixture-like objects;
- run manifest creation for future benchmark executions; and
- standard result artifact writing helpers for future runs.

API calling and scoring utilities are intentionally not included in this phase. Those utilities will be added in later phases when executable benchmark suites are implemented.
