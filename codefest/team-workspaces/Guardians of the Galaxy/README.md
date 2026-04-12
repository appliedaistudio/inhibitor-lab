# Guardians of the Galaxy Workspace

## Team

- **Team name:** Guardians of the Galaxy
- **Team members:**
  - Neel Rakeshbhai Patel (np928@drexel.edu)
  - Rutvij Upadhyay (ru45@drexel.edu)
  - Khushboo Patel (kp3329@drexel.edu)

## Challenges implemented

- Challenge 3: **GlassBox Explained** — AI Safety Audit Dashboard that parses Inhibitor log data and makes every intervention decision transparent to non-technical compliance reviewers. Single-page React app, all data loaded client-side from CSV + JSONL files.

## Run instructions

1. Navigate to the dashboard:
   ```bash
   cd codefest/team-workspaces/Guardians\ of\ the\ Galaxy/glass-box-dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
5. Click **"Try Instant Demo"** to load the bundled sample dataset, or upload your own CSV + JSONL files

## Assumptions and limitations

- 100% client-side application — no backend server required
- CSV files must contain columns: `timestamp`, `apiKey`, `event`, `meta`
- JSONL files must contain one valid JSON object per line with intervention event fields
- The `meta` column in CSV may use Python dict syntax (single quotes, True/False) — handled by a custom parser
- Session persistence uses browser localStorage and IndexedDB — clearing browser data removes saved sessions
- AI chatbot requires `VITE_OPENAI_API_KEY` in `.env` file — core dashboard works without it
- Tested on Chrome, Edge, and Firefox

## License and copyright

Copyright (c) 2026 Neel Rakeshbhai Patel, Rutvij Upadhyay, Khushboo Patel

This team's submission is provided under the MIT License.

SPDX-License-Identifier: MIT
