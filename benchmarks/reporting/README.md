# Runtime Trajectory Reporting

This directory contains the small reviewer-facing documentation set for team validation:

- [`runtime_inhibition_benchmark_methodology.md`](runtime_inhibition_benchmark_methodology.md) is the authoritative design, rationale, metric, and claim-boundary reference.
- [`runtime_trajectory_validation_summary.md`](runtime_trajectory_validation_summary.md) records what the latest live run validated and which artifacts it generated.
- [`discrepancy_summary.md`](discrepancy_summary.md) explains the five signal-to-decision/controller discrepancies.

The current package is ready for Jerry / IT Operations to validate fixture mechanics, live API operation, compatibility mapping, deterministic controller behavior, simulated outcomes, metrics, and artifact completeness. It is **not publication-ready evidence** of production enforcement, autonomous-agent safety, independent human-label performance, official external prompt-injection scores, or category-level statistical performance.

Generated artifacts belong under the run results location and are not documentation. In particular, `raw_responses.json` may be large or sensitive and should not be added here.
