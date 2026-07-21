# Benchmarks

This directory contains core benchmark suites, retained historical artifacts, diagnostics, shared utilities, and reporting guidance. Core suites preserve distinct layers: capability validation, observation normalization, decision compatibility, and runtime trajectories.

Runtime trajectories evaluate structured proposed actions. An action envelope is rendered deterministically into the current Inhibitor `/check` `thought_chain` format, native signal evidence is mapped through decision compatibility, and a benchmark controller records controller-enforced mock-tool outcomes. These controlled simulated outcomes are not production tool-execution evidence.

Support levels communicate the boundary of each result: `native` for exposed API evidence, `compatibility_mapped` for deterministic decision mapping, and `simulated` for controller/mock-tool enforcement. Diagnostics and legacy artifacts remain separate from core benchmark claims.

Run all fixture checks with `python benchmarks/validate_fixtures.py`, or use `python benchmarks/run_all.py --suite <suite> --dry-run` to validate a planned suite without network calls.
