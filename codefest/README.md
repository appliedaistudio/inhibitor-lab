# Philly Codefest OpenBuild on inhibitor-lab

This folder is the event workspace for the 3 Codefest challenges. Teams build in private team repositories during work time, then submit back for merge windows.

## Challenge index

- [Challenge 1: Trust Accelerator Campaign (Digital Awareness)](challenge-1-trust-accelerator-campaign/README.md)
- [Challenge 2: Inhibitor Innovation & Red Team Gauntlet](challenge-2-inhibitor-innovation-red-team/README.md)
- [Challenge 3: Glass Box Dashboard](challenge-3-glass-box/README.md)
- [Team management guide](TEAM_MANAGEMENT.md)
- [Team workspaces](team-workspaces/README.md)

## Team workspace area

A shared `team-workspaces/` area is available in this repository. Staff should create one folder per team (if missing), and each team should place their submission code and docs in their own folder. See the [Team workspaces guide](team-workspaces/README.md) for required README, license, and attribution details.

## Agent expectation

All challenge projects are expected to use AI agents as part of the build and testing workflow. For guidance on structuring your agent loop, use the [ROA (Reason-Observe-Adjust) pattern documentation](../docs/roa-pattern.md). Starter agent notebooks are provided in relevant challenge folders, but teams may use any agent framework or implementation approach they prefer.

Tip: only inhibit when the Inhibitor response includes violation predictions or concrete rule violations. The Inhibitor may also return observations, but observations alone do not require the agent to adjust.

## Scoring model

Each challenge is scored out of 100 points, with challenge-specific rubrics defined in each challenge README. Judges should always use the rubric published in the relevant challenge folder.

## Staff support model

Staff will be available for technical support, to answer questions about this material, and to help teams get submissions merged. If needed, staff can also provide an OpenAI API key for teams to use with their agents.
