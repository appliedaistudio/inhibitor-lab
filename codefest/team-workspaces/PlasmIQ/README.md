# PlasmIQ

PlasmIQ is a plasma donation platform built for the CSL hackathon challenge. It uses real-world data — traffic, weather, and live center wait times — to help donors find the best time and place to donate, reducing the friction that keeps people from showing up consistently.

The idea is simple: donating plasma is a meaningful act, but it has to fit into real life. PlasmIQ makes that easier by surfacing the right information at the right time, guiding donors from discovery through booking with an AI-powered concierge along the way.

---

## Team

- Keval Sompura
- Viraj Patel
- Priyank Jhaveri

---

## Challenges Implemented

**Challenge 1 — Making Healthcare Fit Into Real Life Using Real-World Data (CSL)**
The core of the project. PlasmIQ pulls together travel time estimates, OpenWeatherMap forecasts, and live center capacity data to compute a Friction Score for each available donation slot. Donors see which slot has the least friction right now, not just which one is geographically closest.

**Challenge 2 — Inhibitor Innovation and Red Team Gauntlet (Applied AI Studio, Track A)**
Every message the AI Concierge generates is evaluated by the Applied AI Studio Inhibitor API before it reaches the donor. This is not an optional safety layer — it is part of the core message pipeline. If the Inhibitor flags a response, the backend logs the issue and either suppresses the message or falls back to a safe generic reply.

The Inhibitor evaluates messages as a thought chain: the system context (what the AI is trying to do), the donor's message, and the AI's proposed response are submitted together. The API returns a risk assessment that tells us whether the message is coercive, medically speculative, inappropriately urgent, or otherwise harmful. We use performance mode for low-latency screening on every chat turn, and insight mode for deeper evaluation on messages that involve scheduling changes or eligibility-adjacent questions.

The practical impact is that the chatbot cannot tell a donor they are eligible to donate if they have not completed the formal screening process, cannot pressure a donor who has declined an appointment, and cannot promise compensation amounts or outcomes that are outside what the platform can actually deliver. Healthcare AI that talks directly to patients carries real responsibility, and the Inhibitor is what keeps that boundary from drifting under pressure.

**Challenge 3 — Culture and Community Innovation Award (CCI)**
PlasmIQ includes a rewards and streak system designed to build long-term donation habits. Donors earn points per visit, maintain streaks, and unlock tiers. The goal is to make regular plasma donation feel like something worth coming back to, not just a one-time transaction.

---

## How It Works

1. A donor registers or logs in. Their profile stores location, blood type, donation history, and preferences.
2. The Smart Suggest engine fetches nearby CSL centers, estimates travel time using the Haversine formula, pulls current weather, and reads live wait times from the database. It ranks centers by Friction Score: `(wait_time * 0.5) + (travel_time * 0.3) + (weather_impact * 0.2)`.
3. The donor picks a date, selects from capacity-managed time slots, completes a health pre-screening checklist, and confirms the booking.
4. The AI Concierge (GPT-4o with function calling) is available throughout — it can answer questions, help with scheduling, and handle rescheduling requests, with every response screened by the Inhibitor API.
5. Completed donations earn points, update the donor's streak, and feed into the rewards catalog.

---

## Tech Stack

**Backend**

- Python, FastAPI, Motor (async MongoDB driver)
- MongoDB Atlas for data storage
- OpenAI GPT-4o with function calling for the concierge agent
- Applied AI Studio Inhibitor API for ethical message screening
- OpenWeatherMap API for weather data
- JWT-based authentication with bcrypt password hashing

**Frontend**

- React 18 with Vite
- Tailwind CSS
- Google Maps JavaScript API (interactive center map)
- Recharts for donation history visualization
- Axios for API communication

---

## Run Instructions

**Prerequisites:** Python 3.12, Node.js 18+, a MongoDB Atlas cluster, and API keys for OpenAI, OpenWeatherMap, and Google Maps.

**1. Clone the repository**

```bash
git clone https://github.com/keval-som/PlasmIQ
cd PlasmIQ
```

**2. Set up the backend**

```bash
cd backend
cp .env.example .env
# Fill in your API keys and MongoDB URI in .env
pip install -r requirements.txt
python scripts/seed.py        # Populate the database with demo centers and donors
uvicorn app.main:app --reload --port 8000
```

**3. Set up the frontend**

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000 and VITE_GOOGLE_MAPS_KEY in .env
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

Demo accounts (created by the seed script):

- `alex@demo.com` / `Demo1234!`
- `jordan@demo.com` / `Demo1234!`
- `morgan@demo.com` / `Demo1234!`

---

## Assumptions and Limitations

- Wait times stored in the database are simulated. In a production deployment, these would be updated in real time from center management systems.
- Travel time is estimated using straight-line distance with a fixed speed assumption rather than live traffic data. The Google Maps Distance Matrix API integration is stubbed and can be activated with a valid key.
- The slot system uses a configurable template per center (stored in MongoDB). An admin panel for modifying slot capacity and schedules is scaffolded but not fully built out — it is designed to be added as a follow-on feature.
- The Inhibitor API key used during the hackathon is a temporary credential. In production, this would be a long-lived service account key.
- Free-tier Render deployments spin down after inactivity and may take a few seconds to respond on first load.

---

## Live Demo

https://plasmiq-1.onrender.com

Use one of the demo accounts to explore the platform without registering:

- `alex@demo.com` / `Demo1234!` — 12 donations, Gold tier
- `jordan@demo.com` / `Demo1234!` — 5 donations, Silver tier
- `morgan@demo.com` / `Demo1234!` — 30 donations, Platinum tier

Note: the backend runs on Render's free tier, so the first request after a period of inactivity may take 20–30 seconds to wake up.

---

## Deployment

The project is deployed on Render:

- Backend: Render Web Service (Python) — `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Frontend: Render Static Site — `cd frontend && npm install && npm run build`, publish directory `frontend/dist`

A `render.yaml` blueprint is included at the root of the repository for reference.

---

## License and Copyright

Copyright (c) 2026 Keval Sompura, Viraj Patel, Priyank Jhaveri

This project is submitted as a hackathon entry and is provided under the MIT License.

SPDX-License-Identifier: MIT
