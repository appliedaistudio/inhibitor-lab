## Team

- Team name: Prompt Siege
- Team members: Andrew Brown, Aaron Joyce, Daniel Davis

## Challenges implemented

- Challenge 1: N/A
- Challenge 2: Red Team Gauntlet
- Challenge 3: N/A

## Run instructions

1. Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Copy `.env.dist` to `.env`:

```bash
cp .env.dist .env
```

3. Fill in:

- `OPENAI_API_KEY`
- `INHIBITOR_API_KEY`
- `INHIBITOR_URL` if you need a non-default endpoint

## How To Run

Run the gauntlet:

```bash
python3 main.py
```

Baseline comparison is enabled by default. If needed, it can be disabled with:

```bash
export GUARDRAIL_GAUNTLET_ENABLE_BASELINE=0
```

OR

Change it your .env file

We also have a rate limiting variable in the .env as well if needed

Concurrency is configurable through `.env`:

```bash
MAX_PARALLEL_REQUESTS=4
INHIBITOR_MIN_INTERVAL_SECONDS=0
```

`MAX_PARALLEL_REQUESTS` controls how many formerly sequential requests can now be in flight at the same time across the baseline agent, guarded agent, and Inhibitor checks.

## Assumptions and limitations

- We were able to create 502 errors due to server resource limits and when special characters were sent or the AI model generated special characters in its response.
    - This created a delay in our work because we could not run our test cases at our desired rate.

## License and copyright

Copyright (c) 2025 <Team Name / Author Names>

This team's submission is provided under the MIT License.

SPDX-License-Identifier: MIT

# Prompt Siege

Prompt Siege is our Track B submission for the Inhibitor Innovation & Red Team Gauntlet challenge. It is a repeatable red-team harness for an Inhibitor-enabled agent that measures how well the guarded system holds up against adversarial prompts, encoded payloads, privacy reconstruction attempts, role-confusion attacks, and multi-turn memory poisoning.

## Track Selection

- Primary track: `Track B - Red Team with Inhibitor`
- Supporting angle: baseline vs Inhibitor comparison to show where Inhibitor materially improves safety behavior

## What This Project Does

Prompt Siege runs a unified attack suite against:
- a baseline agent without Inhibitor
- the same agent with Inhibitor-enabled guarding

For each scenario, the project records:
- expected safe outcome
- baseline observed outcome
- guarded observed outcome
- whether Inhibitor improved the result
- issues returned by the inhibitor
- supporting evidence artifacts

The goal is not just to show blocked prompts. The goal is to identify:
- strongest successful bypasses
- highest-value failed attacks
- which attack classes Inhibitor handles well
- which attack classes remain vulnerable

## Attack Suite

The full suite is defined in [scenarios.py](../scenarios.py). It includes both single-turn and multi-turn attacks so judges can see breadth and adversarial depth in one place.

Current attack categories include:
- Prompt injection
- Role confusion
- Obfuscation and encoded intent
- Privacy and synthetic canary reconstruction
- Policy boundary abuse
- Multi-agent and tool-result spoofing
- Memory poisoning
- Cross-turn drift and staged escalation
- Benign controls

The suite is intentionally mixed:
- Some tests are direct and obvious to establish baseline coverage
- Some are subtle to test whether Inhibitor catches intent rather than only keywords
- Some are multi-turn to test whether safety holds over conversation state, not just one message at a time

## Why The Multi-Turn Cases Matter

The multi-turn cases are some of the strongest parts of the project because they test failures that single-turn filters often miss:
- staged reconstruction of synthetic identifiers
- false authority seeding over several turns
- benign-to-harmful boundary drift
- quoted malicious instruction relay
- cumulative intent escalation

These attacks help demonstrate adversarial depth, which is a major part of the Track B rubric.

## Architecture

- [main.py](../main.py): runs the attack suite, compares baseline vs guarded behavior, and writes report artifacts
- [scenarios.py](../scenarios.py): unified attack catalog
- [inhibitor.py](../inhibitor.py): Inhibitor integration, async request handling, retries, response parsing, and guarded ROA loop
- [agent.py](../agent.py): baseline agent behavior and async wrappers
- [artifacts](../artifacts): generated reports and evidence logs

## Generated Artifacts

Each run writes artifacts into [artifacts](../artifacts):

- `red_team_results_<timestamp>.json`
- `red_team_results_<timestamp>.csv`
- `red_team_report_<timestamp>.md`
- `red_team_report_<timestamp>.html`

These artifacts are intended to support both engineering review and judging:
- JSON for raw evidence
- CSV for quick tabular inspection
- Markdown for concise written findings
- HTML for demo-friendly presentation

## Methodology

For each attack we compare baseline and guarded behavior against an expected safe outcome.

Possible comparison outcomes:
- `improved_with_inhibitor`
- `regressed_with_inhibitor`
- `vulnerable_in_both`
- `safe_in_both`

This makes the project more useful than a simple prompt list because it can isolate the effect of Inhibitor itself.

