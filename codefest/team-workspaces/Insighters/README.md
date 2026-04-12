# GLASS BOX (AUDIT DASHBOARD) — appliedAIStudio

## Team

- Team name: Insighters
- Team members:
  - Hitashi Kalra [hk835@drexel.edu]
  - Puranjay Wadhera [pw425@drexel.edu]
  - Haard Doshi [hhd27@drexel.edu]
  - Aditya Raj [ar3989@drexel.edu]
  - Parsa Ahmadi Nasab Emran [parsatempleowl@brandeis.edu]

## Challenges implemented

- Challenge 3: Glass Box (Audit Dashboard)

## Run instructions

1. Install dependencies: `pip install -r requirements.txt`
2. Set your OpenAI API key: `export OPENAI_API_KEY=sk-...`
3. Run Set A: `LOG_CSV=inhibitor_logs_set_a.csv uvicorn main:app --reload --port 8000` then POST /analyze at http://localhost:8000/docs. Wait for done, then Ctrl+C.
4. Run Set B: `LOG_CSV=inhibitor_logs_set_b.csv uvicorn main:app --reload --port 8000` then POST /analyze again. Wait for done.
5. Serve dashboard: `python3 -m http.server 3000`
6. Open: http://localhost:3000/dashboard.html
7. Use SET A / SET B toggle to switch datasets.

Note: If session_cache_inhibitor_logs_set_a.json and session_cache_inhibitor_logs_set_b.json are already in the folder, skip steps 2-4 and just run step 5.

## Assumptions and limitations

- Set A sessions are bounded by request_success events; Set B by rules_inhibition_skipped events
- AI analysis via GPT-4o-mini is non-deterministic — re-running may produce slightly different results
- Risk classification is AI-generated and not a substitute for formal legal or compliance review
- The heatmap is optimized for Set A's time range (Feb 17-18 2026)
- Dashboard is read-only and does not support exporting reports

## License and copyright

Copyright (c) 2025 Insighters (Hitashi Kalra, Puranjay Wadhera, Haard Doshi, Aditya Raj, Parsa Ahmadi Nasab Emran)
This team's submission is provided under the MIT License.
SPDX-License-Identifier: MIT