# Runtime Trajectory Helper Library

This package's `lib/` directory contains lightweight utilities used by the runtime trajectory benchmark.

Current utilities cover:

- support-level validation for benchmark metadata;
- generic schema checks for simple manifest and fixture-like objects;
- live API client behavior used by benchmark runners;
- run-manifest creation; and
- standard result-artifact writing helpers.

These modules are package-local helpers, not independently runnable benchmark suites or result evidence.
