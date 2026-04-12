# PhillyPulse

**Google Maps tells you the fastest way. PhillyPulse tells you the safest.**

PhillyPulse is a real-time safety-aware navigation tool for Philadelphia. It streams live police scanner audio, transcribes it with AI, plots incidents on an interactive map, and routes you around danger — walk, bike, or drive.

**Live demo:** [https://phlpulse.com](https://phlpulse.com)

---

## Team

- **Team name:** PhillyPulse
- **Team members:** Eli Young, Kethan Umanarayanan, Harsh Mahani

## Challenges Implemented

- **Challenge 1 — Trust Accelerator Campaign:** PhillyPulse itself is a public-facing demonstration of Inhibitor in production. Every incident on the map passed through Inhibitor's guardrails, and the app surfaces full transparency stats (processed / passed / blocked counts) so users can see the trust layer working in real time.
- **Challenge 2 — Inhibitor Innovation (Track A — Build with Inhibitor):** PhillyPulse is an original agent-powered system where Inhibitor serves as the critical safety gate between AI-extracted scanner data and public-facing map pins. Every LLM extraction is validated through Inhibitor before it can appear on the map — blocking PII, hallucinations, and harmful content.
- **Challenge 3 — Glass Box (Audit Dashboard):** The admin panel provides full pipeline visibility: every extraction shows its LLM prediction, confidence score, Inhibitor status (passed/blocked with reason), and geocode result. Admins can filter to only map-published incidents, toggle visibility, delete, and re-run predictions.

## How It Works

```
Broadcastify Live Audio
        ↓
  faster-whisper (transcription)
        ↓
  GPT-4o-mini (extraction: type, location, severity, confidence)
        ↓
  Applied AI Studio Inhibitor API (ethical guardrail — blocks PII, hallucinations, harmful content)
        ↓
  Geocoding (Nominatim → LLM fallback)
        ↓
  Firebase / Map Display
        ↓
  Safe Routing (OpenRouteService with dynamic avoid zones)
```

1. **Ingest** — `radiotranscriber.py` streams Philadelphia police scanner audio from Broadcastify and transcribes it with faster-whisper.
2. **Extract** — `philly_pulse/llm.py` sends transcripts to GPT-4o-mini to extract structured incident data (type, location, severity, confidence).
3. **Guard** — `philly_pulse/inhibitor.py` runs every extraction through the Applied AI Studio Inhibitor API. Content with PII, hallucinations, or potential for public harm is blocked before it ever reaches the map.
4. **Geocode** — `philly_pulse/geocode.py` resolves location text to lat/lng via Nominatim with an LLM-powered fallback for ambiguous addresses.
5. **Store** — Incidents are persisted to Firebase Firestore (or SQLite locally) with full audit trail.
6. **Display** — The Next.js frontend renders incidents on a Leaflet map with severity-coded markers, heatmap overlays, time decay, category filters, and a live ticker.
7. **Route** — Users enter a destination, and the app builds avoid zones around active high-severity incidents, then queries OpenRouteService for both direct and safe routes. It shows the tradeoff: *"Safe route is +3 min longer but avoids 2 incident zones."*
8. **Score** — Tap anywhere on the map to get a 0–100 safety score for that location based on nearby incident density and severity.

Every pin on the map is labeled **UNVERIFIED**. PhillyPulse is a situational awareness tool, not a source of truth.

## Architecture

| Layer | Tech |
|-------|------|
| Audio capture | Broadcastify stream + ffmpeg |
| Transcription | faster-whisper (Whisper base, INT8) |
| LLM extraction | OpenAI GPT-4o-mini |
| Ethical guardrail | Applied AI Studio Inhibitor API |
| Geocoding | Nominatim + LLM fallback |
| Backend API | Python, FastAPI, uvicorn |
| Database | Firebase Firestore (prod) / SQLite (dev) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| UI components | shadcn/ui, Leaflet, Framer Motion, Lucide React |
| Routing engine | OpenRouteService API |
| Hosting | Vercel (frontend), dedicated server (backend) |
| Domain | phlpulse.com (GoDaddy) |

## Run Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- ffmpeg in PATH
- A Broadcastify premium account
- API keys: OpenAI, Applied AI Studio Inhibitor, OpenRouteService

### Backend

```bash
git clone https://github.com/EYoung21/PhillyPulse.git
cd PhillyPulse

python -m venv venv
source venv/bin/activate

pip install -r requirements-philly-pulse.txt
pip install numpy scipy faster-whisper webrtcvad pyyaml

# Configure environment
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and INHIBITOR_API_KEY

# Configure feed settings
# Edit config.yaml with your Broadcastify credentials and feed number

# Start the API server
python -m uvicorn philly_pulse.server:app --host 0.0.0.0 --port 8000

# In a separate terminal, start the transcriber
python radiotranscriber.py
```

### Frontend

```bash
cd frontend

npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Firebase config and API URL

npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Production

- **Frontend** is deployed on Vercel at [phlpulse.com](https://phlpulse.com)
- **Backend API** runs on a dedicated server at `api.phlpulse.com`
- **Transcriber** runs continuously on the same server, ingesting live scanner audio 24/7

## Key Features

- **Real-time incident mapping** — Live police scanner → AI pipeline → map pins in seconds
- **Safe routing** — Walk, bike, or drive routes that avoid active incident zones with clear time tradeoff
- **Safety scoring** — Tap anywhere for a 0–100 safety score based on nearby activity
- **Inhibitor guardrails** — Every extraction validated; PII, hallucinations, and harmful content blocked
- **Transparency dashboard** — Full visibility into Inhibitor pass/block stats
- **Admin panel** — Pipeline audit trail, re-transcription, prediction re-runs, visibility toggles, "On Map" filter
- **Cluster list view** — Overlapping incidents at the same location expand into a scrollable list
- **Heatmap overlay** — Density visualization with vivid gradients
- **District breakdown** — Neighborhood-level incident analysis
- **Time decay** — Older incidents fade; configurable time filters (1h to 30d)
- **Category filters** — Filter by violent, medical, fire, vehicle, property, disorder
- **AI neighborhood summaries** — GPT-generated plain-English safety briefings
- **Dark/light theme** — Full theme support
- **Mobile responsive** — Works on phone, tablet, and desktop

## Assumptions and Limitations

- Scanner audio quality varies; transcription accuracy depends on signal clarity and dispatcher speaking patterns
- Geocoding relies on location text extracted by the LLM, which may be incomplete or ambiguous — the LLM fallback helps but is not perfect
- All incidents are labeled **UNVERIFIED** — this is a situational awareness tool, not a verified crime database
- The Inhibitor API blocks content that could cause harm, which means some real incidents may be filtered out (this is by design)
- Safe routing adds avoid zones around incidents but cannot guarantee safety — it reduces exposure to known reported activity
- Currently covers Philadelphia only (Broadcastify feed 4603 — Philadelphia Police Citywide)

## License and Copyright

Copyright (c) 2026 PhillyPulse Team (Eli Young, Kethan Umanarayanan, Harsh Mahani)

This team's submission is provided under the MIT License.

SPDX-License-Identifier: MIT
