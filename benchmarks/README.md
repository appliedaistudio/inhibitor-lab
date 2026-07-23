# Benchmarks

The benchmark directory separates implemented core suites, retained diagnostics, legacy artifacts, shared utilities, and reporting guidance.

- `core/` contains capability validation, observation normalization, decision compatibility, and runtime trajectories.
- `diagnostics/` retains operational and semantic-context diagnostic materials, separate from core benchmark claims.
- `legacy/` preserves historical artifacts for traceability rather than current evaluated-system behavior.
- `lib/` provides shared fixture, manifest, API, support-level, and result-writing helpers.
- `reporting/` documents reproducibility and public claim boundaries.

Support levels distinguish native exposed API/signal evidence, `compatibility_mapped` decision compatibility, and `simulated` benchmark-controller behavior. Runtime trajectories are a seed/mechanics layer: action envelopes are deterministically rendered into `/check` `thought_chain` requests, then compatibility-mapped decisions drive no-side-effect mock-tool controller outcomes. Seed cases do not represent full benchmark risk taxonomy coverage; deferred categories are documented in the runtime trajectory README.

Runtime trajectory live runs write JSON array per-case artifacts: `raw_responses.json`, `normalized_results.json`, and `trajectory_results.json`. Their `summary.md` is the human-readable run report, and `scores.json` records unsupported metrics explicitly under `not_measured`. Controller and mock-tool outcomes are simulated; `trajectory_results.json` is a benchmark trajectory artifact with audit-like fields, not a production audit log.

Run all fixture checks with `python benchmarks/validate_fixtures.py`, or use `python benchmarks/run_all.py --suite <suite> --dry-run` to validate a planned suite without network calls.
