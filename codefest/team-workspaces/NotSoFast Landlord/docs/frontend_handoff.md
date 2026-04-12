# Frontend Team Handoff

The backend is done on the `backend` branch. This doc covers everything the frontend team needs to know while working on `main`.

## Quick start

```bash
# On main branch:
git clone https://github.com/chrishuss41/codefest-26.git
cd codefest-26

# Get API keys from the team lead out-of-band and put them in .env
cp .env.example .env
# fill in OPENAI_API_KEY and INHIBITOR_API_KEY (already in team .env)

# Backend (needs to run for frontend to work)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ..
python scripts/ingest_laws.py         # one-time: populate Chroma
cd backend && BACKEND_PORT=8765 python run.py

# Frontend (new terminal)
cd frontend
npm install
PORT=3001 NEXT_PUBLIC_API_URL=http://localhost:8765 npm run dev
```

Visit:
- http://localhost:3001 — main chat + PWA
- http://localhost:3001/glass-box — audit dashboard

## ⚠️ Why port 3001 and 8765

This laptop already has another project on port 3000 (e-agent) and another FastAPI server on port 8000 (ravenhill-api). **Don't use ports 3000 or 8000.**

## Backend API surface (everything the frontend can call)

Base URL: `http://localhost:8765`

### Chat (main UX)
```
POST /chat
Content-Type: application/json

Body: { "message": "...", "session_id": "..." }
```

**Response shape (rich now — see multi-agent update):**
```json
{
  "session_id": "...",
  "trace_id": "...",
  "response": "final text shown to user",
  "intervened": false,
  "citations": ["68 P.S. § 250.501", "..."],
  "inhibitor_verdict": { "allow": true, "flags": [...], "scores": {...}, "raw": {...} },
  "intake": {
    "category": "lockout | eviction | habitability | deposit | discrimination | entry | retaliation | crisis | other",
    "urgency": "immediate | urgent | standard",
    "entities": { "location": "...", "timeframe": "...", "described_action": "..." },
    "user_intent_summary": "...",
    "retrieval_queries": ["...", "..."]
  },
  "retrieval": {
    "queries": ["..."],
    "mode_counts": { "both": 5, "dense": 0, "sparse": 0 },
    "chunks": [
      { "id": "...", "source": "68 P.S. § 250.501", "heading": "Self-help eviction is illegal", "retrieval_mode": "both", "rrf_score": 0.03 }
    ]
  },
  "critic": {
    "decision": "approve | revise | escalate",
    "reasoning": "...",
    "required_changes": []
  },
  "trace": [
    { "name": "agent.intake", "duration_ms": 1920, "attributes": {...}, "events": [...] },
    { "name": "agent.retrieval", "duration_ms": 860, ... },
    { "name": "agent.drafting", "duration_ms": 2970, ... },
    { "name": "agent.critic", "duration_ms": 4070, ... },
    { "name": "agent.finalizer", "duration_ms": 0, ... }
  ]
}
```

The `response` and `intervened` fields match the old shape — the main chat page keeps working unchanged. The new fields (`intake`, `retrieval`, `critic`, `trace`) are for you to visualize if you want.

### Drone scan
```
POST /scan
Body: { "session_id": "...", "address": "optional street address" }
```
Returns evidence package with AI-annotated findings. Falls back to a simulated scan if no Tello is connected, so this always works.

### Intervention log (Glass Box — own traces tab)
```
GET /logs/interventions
```

### Glass Box shared dataset (the paid challenge)
```
GET /glass-box/sets                        → ["set_a", "set_b"]
GET /glass-box/{set_name}/summary          → stats, phases, rules, severity, etc.
GET /glass-box/{set_name}/summaries        → small intervention JSONL
GET /glass-box/{set_name}/events           → paginated pipeline events
GET /glass-box/{set_name}/lifecycles       → sample request lifecycles
```

### Agent traces (new!)
```
GET /traces                                → recent 50 traces
GET /traces/{trace_id}                     → single trace with all spans
```

Use this for a "watch the agents think" visualization — each trace has the five agent spans with durations, attributes, and events. Great demo material.

### Health
```
GET /health
```

## What the demo needs from the frontend

**Pitch script (`docs/pitch.md`) expects these UI moments:**

1. **Main chat page** — already built in `frontend/app/page.tsx`. Should work unchanged.

2. **🛡️ Inhibitor intervened badge** — appears when `intervened: true`. Already wired.

3. **Building Health Scan button** — already in `frontend/app/page.tsx`. Calls `/scan`, renders findings.

4. **Glass Box dashboard** — already built in `frontend/app/glass-box/page.tsx`. Has a dataset selector + own-logs toggle.

### Nice-to-have additions (any of these lifts the demo)

- **Agent trace visualizer** — on each chat response, show a collapsible section with the 5 agent steps, durations, and what each decided. Use `data.trace` from the chat response. The trace has `name` (e.g. `agent.intake`), `duration_ms`, `attributes.category`, `attributes.urgency`, etc.

- **Category + urgency chip** — show `data.intake.category` and `data.intake.urgency` as small pills next to each agent message. Immediate-urgency messages could have a red ring.

- **Retrieval mode indicator** — small legend showing how many chunks came from dense vs sparse vs both retrieval. Appeals to the 25-pt innovation rubric bucket.

- **Critic decision badge** — when `critic.decision === "revise"`, show a small badge explaining what Inhibitor caught. Visible rewrite loop is a big demo moment.

- **Streaming tokens** — backend doesn't stream yet, this would be a bigger change. Skip unless the rest is done.

## Environment variables used

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:8765` |
| `PORT` | Next.js dev port | `3000` (override to `3001` to avoid conflict) |

## Running the PWA install demo

In dev mode, the PWA is disabled (service workers cause headaches with hot reload). For the actual install demo:

```bash
cd frontend
npm run build
PORT=3001 NEXT_PUBLIC_API_URL=http://localhost:8765 npm run start
```

Open on a phone (same Wi-Fi as laptop, use laptop's local IP) → "Add to Home Screen" → installable.

## Files you should touch

- `frontend/app/page.tsx` — main chat page
- `frontend/app/glass-box/page.tsx` — dashboard
- `frontend/app/layout.tsx` — root layout
- `frontend/app/globals.css` — Tailwind directives only
- `frontend/tailwind.config.ts` — brand colors already set
- `frontend/public/manifest.json` — PWA manifest (don't break)
- `frontend/public/icons/` — PWA icons (already generated)

## Files you should NOT touch

- `backend/` — everything backend is mine on the `backend` branch
- `scripts/` — benchmark, seed, red team, ingest
- `codefest/` — challenge submission markers
- `docs/` — pitch script, rubric mapping, benchmark report, red team findings
- `.env` — shared env, don't commit it either

## Merging

Before submission, we merge `backend` into `main`. I'll do that when I'm done polishing.

## Open questions when I come back

- Twilio credentials if you want real SMS demo
- Tello vs Tello EDU so I can finalize the drone code
- Pitch rehearsal timing — the backend pitch script is in `docs/pitch.md`; update the 3-minute flow with whatever frontend visuals you build

## Contact

Backend is done and tested against live Inhibitor API. See `docs/benchmark_report.md` for measured numbers. If the backend throws, the agent has a graceful fallback path (dev stub for Inhibitor, simulated mode for drone, seed chunks for RAG) so the UI never sees a hard failure.

Questions → hit me on whatever channel the team uses.
