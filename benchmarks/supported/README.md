# Supported benchmarks

This directory contains actively maintained benchmark workflows. Supported packages are the authoritative entry points for new benchmark execution.

A supported benchmark package should provide:

- a benchmark-specific `README.md`;
- an executable notebook or another clear execution entry point;
- version-controlled scenario or fixture inputs where the benchmark uses a
  maintained evaluation set;
- shared reporting code where applicable;
- reproducible result packages;
- clearly identified canonical evidence inputs;
- derived summaries and reports; and
- explicit interpretation boundaries.

The [`operational/`](operational/) benchmark is currently supported. Future supported categories may include runtime-trajectory, semantic, regression, or safety evaluation workflows, but those categories are not represented here as maintained implementations today.

Supported means maintained and reproducible. It does not automatically mean production-certified, statistically repeatable, a service-level guarantee, or proof of semantic correctness.
