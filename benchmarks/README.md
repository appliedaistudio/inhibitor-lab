# Benchmarks

The benchmark system separates historical benchmark evidence, implemented primary benchmark suites, operational diagnostics, shared utilities, and publication reporting guidance.

Old IEB benchmark versions are preserved under [`legacy/ieb/`](legacy/ieb/) for traceability and comparison with prior work. Diagnostic materials are indexed under [`diagnostics/`](diagnostics/) for operational and robustness analysis.

## Top-level areas

- [`legacy/`](legacy/) preserves historical benchmark artifacts and evidence.
- [`core/`](core/) contains the implemented primary benchmark suites and any future core benchmark additions.
- [`diagnostics/`](diagnostics/) indexes operational and robustness diagnostic materials. Diagnostics can support operational maturity and robustness analysis, but they are not replacements for primary safety-efficacy benchmarks.
- [`reporting/`](reporting/) contains reproducibility, interpretation, publication-template, and claim-boundary documentation.

This directory now contains historical benchmark artifacts, implemented core benchmark suites, diagnostic indexes, shared benchmark utilities, and reporting guidance for reproducibility and publication use.

## Phase 2 scaffolding

Phase 2 adds lightweight benchmark-suite scaffolding without making the benchmarks executable end-to-end yet:

- [`benchmark_suite.yaml`](benchmark_suite.yaml) defines the planned core and diagnostic suite registry.
- [`lib/`](lib/) contains shared standard-library utilities for support level validation, generic schema checks, run manifest creation, and standard result artifact writing.
- [`validate_fixtures.py`](validate_fixtures.py) validates the suite manifest shape and confirms referenced suite directories exist. It does not require or validate benchmark case fixtures yet.
- [`run_all.py`](run_all.py) is a placeholder orchestrator that lists planned suites and confirms that actual suite runners will be added in later phases.

Full suite runners, fixtures, scoring, result reporting, and API integration are deferred to later phases.


## Phase 3 capability validation

Phase 3 makes [`core/capability_validation/`](core/capability_validation/) the first executable suite. It validates API compatibility and response shape for the current Inhibitor `/check` and `/catalog` contract using standard-library-only runner code.

This suite is intentionally limited: it does not validate full safety efficacy, decision compatibility, observation-normalization quality, runtime trajectories, scoring frameworks, diagnostic robustness, or runtime execution prevention.

## Phase 4 observation normalization

Phase 4 makes [`core/observation_normalization/`](core/observation_normalization/) the second executable core suite. It validates native observation-normalization-compatible signals from the current Inhibitor `/check` response, including flexible structural checks for observations, observation normalization, predictions, and diagnostics where exposed.

The fixtures are paper-derived using the embedded Phase 4 taxonomy and are traceable with `paper_tags`, `risk_category`, and `expected_signal_family` metadata. This suite remains intentionally limited: it does not perform decision compatibility mapping, runtime trajectory simulation, or full safety-efficacy scoring.

## Phase 5 decision compatibility

Phase 5 makes [`core/decision_compatibility/`](core/decision_compatibility/) the third executable core suite. It maps current Inhibitor `/check` signals into paper-compatible decision categories for benchmark reporting.

The suite support level is `compatibility_mapped`. It uses a curated and versioned [`catalog_signal_map.md`](core/decision_compatibility/catalog_signal_map.md) rather than committing or depending on the full live `/catalog` response. The suite does not claim native runtime enforcement, and it does not perform runtime trajectory simulation, LLM judging, or full safety-efficacy scoring.

## Phase 6: Runtime trajectories

Phase 6 makes [`core/runtime_trajectories/`](core/runtime_trajectories/) the fourth executable core suite. The suite support level is `simulated`: it uses Phase 5 compatibility mapping and fixture-provided proposed agent responses rather than implementing an autonomous agent.

The suite simulates deterministic controller behavior around current Inhibitor `/check` responses and produces simulated proxy outcomes for unsafe response prevention, safe completion preservation, adjustment success, and audit trace completion. These proxy outcomes do not claim native runtime enforcement, production unsafe-action prevention rates, or production safe-task-completion rates.

## Phase 7: Reproducibility and publication reporting

Phase 7 adds [`reporting/`](reporting/) documentation for reproducibility, support-level interpretation, publication report preparation, and public claim boundaries. The reporting materials define how completed benchmark runs should be packaged and described after execution.

Phase 7 does not execute benchmarks, add results, add notebooks, introduce LLM judging, add new benchmark suites, or change Phase 1–6 benchmark behavior. Full-suite execution and validation remain a separate next task.

