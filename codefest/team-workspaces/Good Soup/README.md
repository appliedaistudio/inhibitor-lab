# appliedAIstudio Submission Info

## Team Name
Good Soup
## Team Members
- Justin Gao
- Timothy Bunker
- Lucas Duong
- Ishan Patel

## Challenge Implemented
We implemented Challenge 2 option A for the innovative track

## Run/Test Instructions
See below for setup instructions

## Assumptions and Limitations
The agent cannot read attachments and is unable to search the internet aside from the apis we implemented. This system assumes the user is a student researching a topic or trying to learn.

## Copyright
Copyright (c) 2025 Good Soup

This team's submission is provided under the MIT License.

SPDX-License-Identifier: MIT

# Veritas — Verified Student Research & Learning Companion


> **Philadelphia Codefest 2026 · Inhibitor Innovation Track**

Students increasingly use AI for research and learning, but current systems can be confidently wrong, sycophantic, unsafe with actions, and weak on privacy. Veritas is a verified research and learning companion that uses the Inhibitor as its first gate, then routes every request through specialist verifier agents, before producing a final answer the student can actually trust.

---

## What It Does

Three modes, one pipeline:

| Mode | Purpose |
|---|---|
| **Research** | Source-backed literature summaries, novelty checks, grounding and citation verification |
| **Socratic** | Reasoning checks that push back on flawed logic instead of flattering it |
| **Retention** | Spaced-repetition study with AI coaching and comprehension checks |

Every request in Research and Socratic mode goes through:

```
Student input
  → Inhibitor gate (single initial pass)
  → Mode routing
  → Local corpus + OpenAlex evidence retrieval
  → Primary agent draft
  → Six parallel verifier agents
      grounding · anti-sycophancy · action-risk
      privacy/policy · emotional-calibration · learning-validation
  → Orchestration (revision or allow)
  → Synthesized final answer + citations
  → Session audit trail
```

---

## Why This Matters for Philadelphia

Philadelphia has one of the highest concentrations of university students on the East Coast. As AI writing and research tools become default study infrastructure, the failure modes — confident hallucinations, sycophantic agreement with weak ideas, unsafe research actions — land directly on students making real academic and career decisions. Veritas puts a verifiable safety and honesty layer between the student and the model, and makes every intervention visible so students learn from it.

---

## Benchmark Results

Current public campaign:
- `11` benchmarks
- `198 / 198` runs scored
- `0` execution errors
- `3` variants compared: `baseline`, `no_harness`, `full_harness`

### At A Glance

| Variant | Mean Score | Relative To Baseline | Score Bar |
|---|---:|---:|---|
| `baseline` | `0.558568` | `1.00x` | `███████████░░░░░░░░` |
| `no_harness` | `0.633229` | `1.13x` | `█████████████░░░░░░` |
| `full_harness` | `0.823274` | `1.47x` | `████████████████░░░` |

### Key Deltas Vs Baseline

| Benchmark | Baseline | Full Harness | Delta |
|---|---:|---:|---:|
| `custom_anti_sycophancy` | `0.000000` | `1.000000` | `+1.000000` |
| `custom_recall_understanding` | `0.000000` | `1.000000` | `+1.000000` |
| `HaluEval` | `0.494800` | `0.828451` | `+0.333651` |
| `BEIR` | `0.729485` | `0.998604` | `+0.269118` |
| `SciFact` | `0.357667` | `0.564975` | `+0.207308` |
| `MathDial` | `0.497123` | `0.615591` | `+0.118468` |

### Full Benchmark Scorecard

| Benchmark | Baseline | No Harness | Full Harness | Result |
|---|---:|---:|---:|---|
| `BEIR` | `0.729485` | `0.998604` | `0.998604` | major retrieval lift |
| `HaluEval` | `0.494800` | `0.844600` | `0.828451` | big hallucination reduction |
| `SciFact` | `0.357667` | `0.566392` | `0.564975` | much stronger scientific grounding |
| `MathDial` | `0.497123` | `0.498318` | `0.615591` | better tutoring correction |
| `TruthfulQA` | `0.534882` | `0.532715` | `0.552003` | modest truthfulness gain |
| `TutorBench` | `0.566473` | `0.563871` | `0.574168` | small tutoring gain |
| `AgentDojo` | `0.966220` | `0.963427` | `0.927686` | regression to tune next |
| `HarmBench` | `1.000000` | `1.000000` | `0.997685` | effectively saturated |
| `StrongREJECT` | `0.997596` | `0.997596` | `0.996855` | effectively saturated |
| `custom_anti_sycophancy` | `0.000000` | `0.000000` | `1.000000` | verifier wins clearly |
| `custom_recall_understanding` | `0.000000` | `0.000000` | `1.000000` | retention harness wins clearly |

### What This Shows

- The full verifier/orchestration harness lifts the mean score from `0.558568` to `0.823274`, a `+0.264706` absolute gain and `+47.39%` relative lift over baseline.
- The plain model interface without our harness helps somewhat, but it only reaches `0.633229`, so most of the improvement comes from the actual verification pipeline rather than just changing the wrapper.
- The strongest gains are in hallucination control, retrieval quality, grounding, anti-sycophancy, and recall checking.
- The main remaining regression is `AgentDojo`, where the current harness is too conservative in some agentic situations.
- `XSTest` and `PII-Bench` are wired in the harness and cache pipeline, but still require upstream Hugging Face access approval before we can include them in the published scorecard.

Run the harness yourself:

```bash
npm run benchmarks:sync
npm run benchmarks:campaign
```

---

## Architecture

```
src/
  app/                   Next.js UI + API routes
  components/
    chat/                Shell, composer, thread, session sidebar, resources rail
    retention/           Study workspace, deck management, review panel
  lib/
    companion/           Pipeline, primary agent, six verifiers, orchestrator,
                         synthesis, inhibitor adapter, OpenAlex adapter,
                         session workspace store
    retention/           Spaced-repetition service and types
  types/                 Shared contracts
data/
  corpus/                Local evidence fixtures (offline demo works)
  scenarios/             Harness fixtures across all failure categories
```

---

## Setup

```bash
npm install
npm run dev        # http://localhost:3000
```

Required `.env`:

```bash
OPENAI_API_KEY=...
INHIB_KEY=...
INHIBITOR_URL=https://iaas.appliedai.studio/check
PRIMARY_MODEL=gpt-4.1-mini
VERIFIER_MODEL=gpt-4.1-nano

DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=goodsoup
DB_PASSWORD=pass123
DB_PORT=5432

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET="long-secret-string"
NEXTAUTH_URL=http://localhost:3000
```

Optional OpenCode backend:

```bash
OPENCODE_SERVER_URL=http://127.0.0.1:4096
OPENCODE_MODEL=openai/gpt-5.4-mini
```

---

## What's Real vs Stubbed

**Real:**
- Inhibitor adapter with a live single-pass gate
- OpenAI-backed primary agent
- Six verifier agents with structured outputs
- OpenAlex evidence retrieval and normalization
- Session workspace with ownership isolation
- Retention spaced-repetition with AI coaching
- Orchestration, synthesis, audit logging, and eval harness
- Benchmark matrix with `baseline` vs `no_harness` vs `full_harness`

**Intentionally thin for the hackathon:**
- Auth (NextAuth scaffold, not hardened)
- Vector/semantic retrieval (keyword-based today)
- Production database (PostgreSQL schema ready, SQLite in dev)
- Direct action execution is intentionally disabled; action-risk is evaluated, not carried out

---

## References

- [OpenAlex API](https://docs.openalex.org/)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [Inhibitor (Applied AI Studio)](https://iaas.appliedai.studio)
- [OpenCode](https://opencode.ai/docs/server/)
