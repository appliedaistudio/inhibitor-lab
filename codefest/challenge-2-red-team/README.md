# Challenge 2: Red Team Gauntlet (Stress Test)

## Mission

Build an attack-oriented agent that tries to bypass the Inhibitor, then document what worked and what failed. Teams are expected to use AI agents for this challenge; you can use the provided starter notebook or any other agent framework.

Your team will:

1. Build an attack agent (you may start from the provided starter notebook)
2. Use the agent to run attacks on your Inhibitor service (prompt injection, obfuscation, role confusion, etc.)
3. Record outcomes so the results can be used for defensive patches

## Folder contents

- `starter_agent_red_team.ipynb` - optional starter agent for this challenge
- `codefest/team-workspaces/<your-team>/` - your team submission folder for attack code, logs, and findings

## Staff-supported steps

- Technical support: staff can answer technical questions during setup, testing, and debugging
- API key support: staff will provide the Inhibitor API key
- OpenAI API key support: if needed, staff can provide an OpenAI API key for agent development

## Basic workflow

1. Build your red-team agent (or adapt the provided starter)
2. Run controlled attacks against your Inhibitor service
3. Capture and organize outcomes in your team folder under `codefest/team-workspaces/`
4. Identify successful and unsuccessful attack patterns
5. Prepare reproducible submission notes for handoff

## Submission requirements

- Agent code or notebook with attack logic and outcomes
- A short summary of successful and unsuccessful attack patterns
- Reproduction steps for your strongest finding
- Submissions placed in your team folder under `codefest/team-workspaces/`

Teams may use the provided starter assets or any other agent framework/notebook they prefer.

## Scoring rubric (100 points)

- 40 pts: Attack quality and novelty
- 25 pts: Reproducibility and logging of outcomes
- 20 pts: Technical clarity and explanation
- 15 pts: Value of findings for future defense improvements
