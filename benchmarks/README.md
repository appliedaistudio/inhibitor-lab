# Benchmarks

This directory organizes Inhibitor benchmark material by **lifecycle status**, not by benchmark purpose.

- [`supported/`](supported/) contains actively maintained, reproducible benchmark workflows and is the authoritative entry point for new execution.
- [`legacy/`](legacy/) contains historical benchmark implementations and result artifacts retained for provenance, reproducibility, publication history, comparison, and retrospective analysis.

Legacy does not mean invalid, but legacy results should not be reported as current Inhibitor benchmark evidence. Use the supported workflow and its current evidence boundaries for new claims.

Supported status means that a workflow is maintained and reproducible. It does not automatically mean that a benchmark or result is production-certified, statistically repeatable, or a capacity guarantee. Additional supported benchmark categories may be added over time.

## Directory map

- [`supported/`](supported/) — maintained benchmark workflows.
  - [`supported/operational/`](supported/operational/) — operational load and recovery benchmark.
- [`legacy/`](legacy/) — historical implementations and result artifacts.
  - [`legacy/diagnostics/`](legacy/diagnostics/) — archived operational-stress, semantic-context, and drift-audit material.
  - [`legacy/ieb/`](legacy/ieb/) — archived IEB benchmark versions.
