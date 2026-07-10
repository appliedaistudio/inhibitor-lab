# Benchmarks

The benchmark system is being reorganized to separate historical benchmark evidence, planned primary benchmark definitions, operational diagnostics, and future reporting assets.

Old IEB benchmark versions are preserved under [`legacy/ieb/`](legacy/ieb/) for traceability and comparison with prior work. Existing diagnostic assets may remain in their current repository locations until migration is completed in later phases.

## Top-level areas

- [`legacy/`](legacy/) preserves historical benchmark artifacts and evidence. The archived IEB versions live under [`legacy/ieb/`](legacy/ieb/).
- [`core/`](core/) is reserved for the future primary paper-derived benchmark suite. Detailed benchmark behavior, runners, fixtures, validation logic, scoring, and API clients will be added in later phases.
- [`diagnostics/`](diagnostics/) indexes operational and robustness diagnostic materials. Diagnostics can support operational maturity and robustness analysis, but they are not replacements for primary safety-efficacy benchmarks.
- [`reporting/`](reporting/) is reserved for future reproducibility and publication reporting materials.

This phase only establishes the directory layout and safe documentation needed before benchmark harness code exists.

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
