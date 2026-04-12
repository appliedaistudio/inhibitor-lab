# Glass Box (Audit Dashboard)

Challenge 1 submission for the Glass Box mission: an interactive audit dashboard that explains Inhibitor interventions using shared log-style datasets and reviewable system traces.

## Overview

This project is a React + TypeScript dashboard that presents:

- live agent runs and intervention state
- policy pressure and recent guardrail triggers
- decision-trace inspection for explainability
- operator intervention history
- alert and escalation context for reviewers

The experience is designed as a readable control center for trust, safety, and audit workflows around autonomous systems.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS

## Local Setup

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## Project Structure

- `src/` - UI application code and mock dashboard data
- `docs/` - project notes and implementation planning
- `scripts/` - utility scripts used during deployment/testing

## Submission Notes

- This submission is frontend-focused and currently uses curated mock data to demonstrate the audit, traceability, and intervention-review experience.
- Runtime/build artifacts and local environment files were excluded from the upload package so the challenge folder stays clean and source-focused.
