# Challenge 2: Inhibitor Innovation & Red Team Gauntlet

## Mission

Build either:

1. **An innovative agent powered by Inhibitor**, or
2. **A rigorous red-team gauntlet against an Inhibitor-enabled agent/system**

This generalized challenge supports both offensive assurance testing and constructive product innovation. Teams can choose one track or complete both for a stronger submission.

## Track options

### Track A: Build with Inhibitor (Innovation Track)

Create an original agent use case that demonstrates how Inhibitor improves trust, safety, or controllability in real workflows.

This track is also a strong fit for teams that already have an existing agent and want to enhance it with Inhibitor.

Examples:

- Trust-aware copilots for regulated domains
- Multi-agent orchestrators with policy-aware gating
- Real-time moderation or escalation assistants

### Track B: Red Team with Inhibitor (Gauntlet Track)

Run systematic adversarial testing against an Inhibitor-enabled agent/system and document exploitable patterns, failed attacks, and defense recommendations.

Examples:

- Prompt injection and role-confusion suites
- Obfuscation/jailbreak variants
- Cross-turn memory poisoning attempts

## Folder contents

- `starter_agent_red_team.ipynb` - optional starter notebook teams may adapt for either track
- `codefest/team-workspaces/<your-team>/` - your team submission folder for code, findings, and demo materials

## Staff-supported steps

- Technical support: staff can help with setup, debugging, and challenge interpretation
- API key support: staff will provide the Inhibitor API key
- OpenAI API key support: if needed, staff can provide an OpenAI API key for agent development and testing

## Basic workflow

1. Choose Track A, Track B, or both
2. Build your agent system and/or gauntlet methodology
3. Run evaluations and capture artifacts in your team folder under `codefest/team-workspaces/`
4. Document reproducible setup and evidence for judges
5. Prepare a short final walkthrough of approach, outcomes, and recommendations

## Submission requirements

All teams must include:

- Agent code/notebook and reproducible run steps
- `README.md` describing track selection, architecture, and assumptions
- Evidence logs/results demonstrating outcomes
- A concise summary of key findings and next-step recommendations

Additional required content by track:

- **Track A (Innovation):**
  - Problem statement and user/workflow context
  - What is innovative about the agent design
  - Evidence that Inhibitor materially improves trust/safety behavior
- **Track B (Red Team):**
  - Attack taxonomy and test methodology
  - Strongest successful finding with reproduction steps
  - Highest-value failed attack and explanation of why defenses held

Teams may use the provided starter assets or any other agent framework/notebook they prefer.

## Scoring rubric (100 points)

- **30 pts: Technical execution quality**
  - Reliability, correctness, and implementation maturity
- **25 pts: Innovation or adversarial depth**
  - Track A: originality and practical usefulness
  - Track B: attack sophistication and coverage quality
- **20 pts: Evidence and reproducibility**
  - Strength of logs, experiments, and rerun instructions
- **15 pts: Inhibitor-specific insight**
  - Quality of analysis on how Inhibitor behavior helped or failed
- **10 pts: Clarity of recommendations and demo**
  - Actionable next steps and clear final presentation

## Staff judging instructions

- Confirm declared track(s) and required per-track artifacts are present
- Score with the challenge rubric above while evaluating the team within its chosen track context
- For dual-track submissions, evaluate the strongest combined evidence set without double-counting the same artifact
- Reward concrete, reproducible findings over speculative claims
