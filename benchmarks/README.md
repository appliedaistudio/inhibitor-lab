# Benchmarks

The benchmark system is being reorganized to separate historical benchmark evidence, planned primary benchmark definitions, operational diagnostics, and future reporting assets.

Old IEB benchmark versions are preserved under [`legacy/ieb/`](legacy/ieb/) for traceability and comparison with prior work. Existing diagnostic assets may remain in their current repository locations until migration is completed in later phases.

## Top-level areas

- [`legacy/`](legacy/) preserves historical benchmark artifacts and evidence. The archived IEB versions live under [`legacy/ieb/`](legacy/ieb/).
- [`core/`](core/) is reserved for the future primary paper-derived benchmark suite. Detailed benchmark behavior, runners, fixtures, validation logic, scoring, and API clients will be added in later phases.
- [`diagnostics/`](diagnostics/) indexes operational and robustness diagnostic materials. Diagnostics can support operational maturity and robustness analysis, but they are not replacements for primary safety-efficacy benchmarks.
- [`reporting/`](reporting/) is reserved for future reproducibility and publication reporting materials.

This phase only establishes the directory layout and safe documentation needed before benchmark harness code exists.
