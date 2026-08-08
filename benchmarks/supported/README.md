# Supported benchmarks

This directory contains maintained benchmark workflows that can produce reviewed benchmark evidence. Each supported workflow owns its scenarios, implementation, tests, reporting entry point, and preserved results in one package.

## Packages

- [`runtime_trajectories/`](runtime_trajectories/) — maintained runtime inhibition trajectory workflow.
- `operational/` — the supported operational workflow on branches where that package is present.

The two packages are independent and are intended to coexist. Do not infer that a package is absent from `main` merely because it is not present on a topic branch.

Historical and provenance material belongs in [`../legacy/`](../legacy/). Diagnostics are useful engineering checks but are not supported publication evidence. Code in [`../lib/`](../lib/) is shared infrastructure, not an independently claimed benchmark.
