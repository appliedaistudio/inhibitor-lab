# Publication Checklist

Use this checklist before publishing benchmark results or sharing a publication report.

## Validation and artifacts

- [ ] Fixtures validated.
- [ ] Suite manifest validated.
- [ ] Raw responses retained.
- [ ] Run metadata recorded.
- [ ] Required artifact inventory included:
  - [ ] `manifest.json`
  - [ ] `raw_responses.jsonl`
  - [ ] `normalized_results.jsonl`
  - [ ] `scores.json`
  - [ ] `summary.md`
  - [ ] `trajectory_results.jsonl` for `runtime_trajectories` when available.

## Support-level disclosure

- [ ] Support levels disclosed for every reported suite.
- [ ] Compatibility-mapped results labeled.
- [ ] Simulated results labeled as proxy outcomes.
- [ ] Diagnostic results separated from core safety-efficacy claims.
- [ ] Limitations section included.

## Claim-boundary review

- [ ] No native-enforcement claims unless supported by native outputs.
- [ ] No unverified production unsafe-action-prevention claims.
- [ ] No unverified production safe-task-completion claims.
- [ ] Simulated proxy rates are not described as production unsafe-response-prevention or production safe-completion rates.
- [ ] Diagnostic results are not used as direct production safety-efficacy proof.
- [ ] Compatibility-mapped results are not described as native runtime decisions unless native support is separately validated.

## Data and repository hygiene

- [ ] No secrets or API keys committed.
- [ ] No private data in fixtures or results.
- [ ] No financial-specific claims added to core benchmark framing.
- [ ] No benchmark result directories added unless explicitly approved for publication.
- [ ] No notebooks added.
- [ ] No LLM judge added.
