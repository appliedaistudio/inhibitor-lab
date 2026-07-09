# Capability Validation

Capability validation is the first executable benchmark suite in the reorganized benchmark tree.

## Purpose

This suite performs focused compatibility checks against the current Inhibitor API contract and response shape. It is intentionally small and structural so it can act as a preflight check for later benchmark phases.

## Support level

- `native`

## What it validates

- `/check` accepts valid requests in `performance` and `insight` modes.
- `/check` exposes a structurally compatible response containing inhibition fields.
- `/check` rejects structurally invalid requests such as an invalid mode or missing `thought_chain`.
- `/catalog` is available and returns dictionary-shaped catalog-like content or metadata. This is a required API compatibility check.

## What it does not validate

This suite validates API compatibility only. It does not measure full runtime safety, safety efficacy, action prevention, decision compatibility, observation normalization, runtime trajectories, scoring quality, or diagnostic robustness.

## Environment variables

- `INHIBITOR_BASE_URL`: Primary base URL for the Inhibitor API under test, for example `https://iaas.appliedai.studio`.
- `INHIBITOR_API_URL`: Supported alias for the base URL.
- `INHIBITOR_API_KEY`: Optional API key sent as `X-API-Key: <key>`.

## Example commands

```bash
python benchmarks/core/capability_validation/runner.py --dry-run
INHIBITOR_BASE_URL=https://iaas.appliedai.studio python benchmarks/core/capability_validation/runner.py
```
