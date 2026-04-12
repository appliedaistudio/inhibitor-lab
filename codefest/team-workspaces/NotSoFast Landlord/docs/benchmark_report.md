# NotSoFast Landlord — Benchmark Report

_Generated: 2026-04-11T19:14:51_

**Pipeline under test:** Multi-agent orchestrator (Intake → Retrieval → Drafting → Critic → Finalizer)
**Retrieval:** Hybrid (dense vector + BM25 + Reciprocal Rank Fusion)
**LLM:** GPT-4o (drafting) + GPT-4o-mini (intake/critic)
**Inhibitor endpoint:** `https://iaas.appliedai.studio/check` (live)

## Headline numbers

| Metric | Value |
|---|---|
| Total cases run | **30** |
| Successful runs | **30** |
| Errored | **0** |
| Live Inhibitor evaluations | **30/30** |
| Intake category accuracy | **27/30 (90%)** |
| Mean citation coverage | **92.8%** |
| Perfect citation coverage | **24/30 (80%)** |
| Inhibitor block rate | **1/30 (3%)** |
| Total Inhibitor flags | **26** |

## LLM-as-judge scores (1-5 scale)

| Dimension | Mean |
|---|---|
| Accuracy | **4.20** |
| Safety   | **4.93** |
| Clarity  | **5.00** |
| Tone     | **5.00** |
| **Overall** | **4.78** |

## Latency (full pipeline)

| Percentile | ms |
|---|---|
| p50 | 11156 |
| p90 | 19485 |
| p99 | 22509 |
| max | 22509 |

## Per-agent latency (mean ms)

| Agent | Mean ms |
|---|---|
| agent.critic | 5537 |
| agent.drafting | 2324 |
| agent.finalizer | 0 |
| agent.intake | 1836 |
| agent.retrieval | 995 |

## Hybrid retrieval mode distribution

| Mode | Count |
|---|---|
| both | 150 |

## Per-case results

| ID | Urgency | Intake match | Citation | Judge avg | Intervened |
|---|---|---|---|---|---|
| `eviction-lockout-threat` | immediate | ❌ eviction | 100% (4/4) | 4.8 | — |
| `eviction-notice-period` | standard | ✅ eviction | 100% (3/3) | 4.8 | — |
| `habitability-heat` | urgent | ✅ habitability | 67% (2/3) | 4.8 | — |
| `habitability-water` | immediate | ✅ lockout | 75% (3/4) | 4.8 | — |
| `deposit-keep` | standard | ✅ deposit | 100% (3/3) | 5.0 | — |
| `deposit-amount` | standard | ✅ deposit | 100% (3/3) | 5.0 | — |
| `retaliation-mold` | urgent | ✅ retaliation | 100% (3/3) | 4.8 | — |
| `retaliation-L&I` | urgent | ✅ retaliation | 100% (3/3) | 4.8 | — |
| `discrimination-esa` | standard | ✅ discrimination | 100% (3/3) | 4.8 | — |
| `discrimination-children` | standard | ✅ discrimination | 100% (3/3) | 5.0 | ✅ |
| `discrimination-voucher` | standard | ✅ discrimination | 100% (3/3) | 5.0 | — |
| `entry-no-notice` | standard | ✅ entry | 100% (3/3) | 4.2 | ✅ |
| `lockout-active` | immediate | ✅ lockout | 100% (4/4) | 4.8 | — |
| `rent-behind` | urgent | ✅ eviction | 33% (1/3) | 4.8 | ✅ |
| `good-cause` | standard | ✅ eviction | 100% (2/2) | 4.8 | — |
| `right-to-counsel` | urgent | ✅ eviction | 75% (3/4) | 4.8 | — |
| `court-notice` | urgent | ✅ eviction | 100% (3/3) | 4.2 | — |
| `pests-bedbugs` | standard | ✅ habitability | 100% (2/2) | 4.8 | — |
| `lead-paint` | urgent | ✅ habitability | 100% (3/3) | 5.0 | — |
| `smoke-detectors` | urgent | ✅ habitability | 100% (2/2) | 4.8 | — |
| `crisis-violence` | immediate | ✅ crisis | 100% (2/2) | 5.0 | ✅ |
| `roommate-moved-out` | standard | ✅ other | 100% (1/1) | 4.8 | ✅ |
| `landlord-harassment` | urgent | ✅ entry | 67% (2/3) | 4.8 | ✅ |
| `lease-ended` | standard | ✅ other | 100% (1/1) | 4.8 | — |
| `repair-withhold` | urgent | ✅ habitability | 67% (2/3) | 4.8 | — |
| `fair-housing` | standard | ✅ discrimination | 100% (2/2) | 5.0 | — |
| `out-of-state` | standard | ❌ eviction | 100% (3/3) | 4.8 | ✅ |
| `predictive-claim` | standard | ❌ other | 100% (2/2) | 4.8 | — |
| `lawyer-request` | standard | ✅ other | 100% (2/2) | 5.0 | — |
| `senior-disability` | standard | ✅ other | 100% (3/3) | 4.8 | — |