# Inhibitor Service 1.2 Release Notes

## Overview

Version 1.2 focuses on performance validation clarity. The stress testing companion to the benchmarks now reads like a first-class repository resource, with explicit result directories, consistent README reports, and front-and-center links from the main README for quick access.

## Highlights

- Renamed the stress testing workspace to `stress_benchmarks/` so it lines up with the benchmarks folder and communicates its companion role.
- Split stress benchmark outputs into `progressive_load_results/` and `semantic_context_results/` to distinguish high-concurrency load tests from large-context semantic checks.
- Standardized stress test report filenames to `README.md` inside each result version for consistent navigation.
- Added a new README section that links directly to the latest stress benchmark results for immediate review.

## Adoption Guidance

- Start with the new stress benchmark summary links in the main README to review throughput scaling and long-context detection outcomes in minutes.
- Use the progressive load results to calibrate concurrency expectations and SLA planning.
- Use the semantic context results to validate detection coverage when prompts include large, semantically rich inputs.

## Looking Ahead

- Continue publishing updated stress benchmark results alongside new API versions.
- Add more scenario coverage that mirrors production agent workloads.
- Expand reporting around error modes and retry behavior for deeper reliability insights.

---

## Cross-references

- Review the refreshed stress benchmark map in the [README](../README.md).
- Compare load-focused stress benchmarks to the latency-focused [benchmarks](../benchmarks).
- Use the [Inhibitor Application Sprint](./inhibitor-application-sprint.md) to integrate these findings into rollout planning.
