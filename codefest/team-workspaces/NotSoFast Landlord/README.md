# NotSoFast Landlord

> A safety-guarded AI assistant that helps Philadelphia renters understand their rights -- before they lose their home.

## Team

- **Team name:** NotSoFast Landlord
- **Team members:** Muhammad Rashid, Chris Huss, [add other members]

## Challenges implemented

- **Challenge 1: Inhibitor Innovation (Track A)** -- 5-agent pipeline with Inhibitor guardrail on every draft. Hybrid RAG over PA Landlord-Tenant Act + Philadelphia Code. Every intervention logged with full audit trail. 78 live Inhibitor interventions captured. Red-team appendix (Track B): 22 adversarial attacks tested, strongest finding at 0.99 confidence.
- **Challenge 2: Glass Box (Audit Dashboard)** -- Interactive dashboard at `/glass-box` that parses Applied AI Studio's shared sample logs (set_a: 17,314 events, set_b: 2,651 events). Three views: Pipeline Overview, Event Stream, NotSoFast Logs. Full intervention replay.
- **Challenge 3: Culture & Community Innovation** -- Addresses Philadelphia's eviction crisis. Helps the most vulnerable tenants understand their legal rights in plain English. Multi-surface access (web app + SMS) to reach tenants regardless of device.

## Run instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key
- Inhibitor API key (from Applied AI Studio)

### Backend (port 8765)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # fill in API keys (see .env.example for all variables)
python ../scripts/ingest_laws.py   # rebuild ChromaDB legal corpus
BACKEND_PORT=8765 python run.py
```

### Vite Frontend (port 5173)

```bash
cd notsofastlandlord
npm install
VITE_BACKEND_URL=http://localhost:8765 npx vite --host
```

### Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Default: gpt-4o |
| `INHIBITOR_API_KEY` | Yes | From Applied AI Studio |
| `INHIBITOR_API_URL` | No | Default: https://iaas.appliedai.studio/check |
| `BACKEND_PORT` | No | Default: 8765 |
| `LLM_PROVIDER` | No | "openai" (default) or "claude_cli" |

### URLs once running

| URL | What |
|---|---|
| http://localhost:5173 | Main app |
| http://localhost:5173/glass-box | Glass Box audit dashboard |
| http://localhost:8765/health | Backend health check |
| http://localhost:8765/traces | Live agent traces |

### One-command setup (alternative)

```bash
chmod +x scripts/demo_setup.sh
./scripts/demo_setup.sh all
```

## Architecture

```
User (web / SMS)
      |
      v
FastAPI Backend (port 8765)
  |-- 5-Agent Orchestrator
  |     |-- Intake Agent (reads input)
  |     |-- Retrieval Agent (hybrid RAG: ChromaDB vectors + BM25 + RRF)
  |     |-- Drafting Agent (generates response)
  |     |-- Critic Agent (reviews + Inhibitor guardrail check)
  |     |-- Finalizer Agent (polishes output)
  |
  |-- Legal Corpus: 10 chunks from PA Landlord-Tenant Act + Philadelphia Code
  |-- Inhibitor Client: every draft evaluated via Applied AI Studio API
  |-- Glass Box Parser: reads shared sample_logs (set_a + set_b)
  |-- Async Span Tracing: /traces endpoint
      |
      v
Vite + React Frontend (port 5173)
  |-- Splash / Landing / Upload / Results pages
  |-- Glass Box Dashboard (/glass-box)
  |-- Tailwind CSS + Framer Motion
```

## How Inhibitor improves the agent

| Without Inhibitor | Inhibitor flag | Corrected output |
|---|---|---|
| "You don't have to pay rent." | No citation | "Under 68 P.S. 250.206, rent may be withheld ONLY if..." |
| Quotes California eviction law | Out-of-scope jurisdiction | Restricted to PA/Philadelphia only |
| "You'll win in court." | Predictive claim | "Outcomes depend on judge and evidence." |
| "As your lawyer, I advise..." | Impersonation | "I am not a lawyer. Contact Community Legal Services." |

## Evidence artifacts

- `backend/logs/inhibitor_events.jsonl` -- every Inhibitor verdict, timestamped
- `backend/logs/agent_events.jsonl` -- every agent pipeline event
- `backend/logs/traces.jsonl` -- full agent traces
- `backend/logs/evidence/` -- evidence packages
- `docs/benchmark_report.md` -- 30 cases, 4.78/5 judge score, 92.8% citation coverage
- `docs/red_team_findings.md` -- 22 attacks, 7/12 blocked, strongest at 0.99 confidence
- `docs/evidence/` -- 78 live Inhibitor intervention logs

## Assumptions and limitations

- Legal corpus is scoped to Pennsylvania and Philadelphia only -- not valid for other jurisdictions
- The system is an informational tool, not legal advice. Every response directs users to Community Legal Services (215-981-3700)
- Inhibitor API availability is required for guardrail checks; system falls back to unguarded responses if API is down (logged as a warning)
- RAG corpus is a curated 10-chunk subset; a production deployment would ingest the full statutory text
- Drone module runs in simulated mode unless a physical DJI Tello is connected

## Repository layout

```
NotSoFast Landlord/
|-- backend/                    # FastAPI + agents + Inhibitor + RAG
|   |-- app/
|   |   |-- agents/             # 5-agent orchestrator
|   |   |-- agent.py            # Main agent chat loop
|   |   |-- inhibitor.py        # Inhibitor API client
|   |   |-- rag.py              # Hybrid RAG (ChromaDB + BM25 + RRF)
|   |   |-- glass_box.py        # Glass Box log parser
|   |   |-- llm.py              # LLM provider abstraction
|   |   |-- tracing.py          # Async span tracing
|   |   |-- drone.py            # DJI Tello controller
|   |   |-- vision.py           # Vision pipeline
|   |   |-- twilio_handler.py   # SMS webhook
|   |   |-- logger.py           # JSONL event logger
|   |-- data/
|   |   |-- law/                # Legal corpus source
|   |   |-- glass_box_samples/  # Applied AI shared datasets
|   |-- logs/                   # Runtime logs + evidence
|   |-- main.py                 # FastAPI app
|   |-- run.py                  # Uvicorn entry point
|   |-- requirements.txt
|-- notsofastlandlord/          # Vite + React + Tailwind frontend
|   |-- src/
|   |   |-- pages/              # Landing, Upload, Results, GlassBox
|   |   |-- components/         # UI components
|   |-- package.json
|-- scripts/                    # Setup, ingest, benchmark, red team
|-- docs/                       # Pitch, benchmarks, red team findings
|-- .env.example                # Environment variable template
|-- README.md                   # This file
```

## License and copyright

Copyright (c) 2025 NotSoFast Landlord Team

This team's submission is provided under the MIT License.

SPDX-License-Identifier: MIT
