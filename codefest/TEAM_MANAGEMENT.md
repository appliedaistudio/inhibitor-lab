# Team Management Guide for Codefest

Use this guide to run teams safely in one shared project while keeping work private until check-in.

## 1) Repository model

- Staff maintain the main `inhibitor-lab` repository.
- Each team works in a private fork or private mirror repository.
- Teams only open a PR (or submit a patch bundle) during official merge windows.

## 1.5) Shared team workspace in this repo

- Keep all team folders under `codefest/team-workspaces/`.
- Use one folder per team (for example `team-alpha`).
- If a team `README.md` is missing, create it and include run instructions plus attribution.
- Require license/copyright notices for each team submission (MIT-compatible).

## 2) Team setup checklist (staff)

- Create a private team repo from the starter template.
- Create that team's folder in `codefest/team-workspaces/` if it does not exist yet.
- Add a team `README.md` in that folder when missing.
- Add all team members with write access to that team repo.
- Add at least one staff mentor with maintainer access.
- Provide API key onboarding instructions.
- Confirm each team can run their starter notebook.

## 3) Branching and check-in workflow

- Teams work on feature branches in their private repo.
- Teams tag a release candidate branch before check-in.
- Staff review and merge selected changes into the main event branch.
- Staff then promote validated changes into `main`.

## 4) Merge windows

- Saturday midday: first merge window (priority: challenge 1 rules)
- Sunday morning: second merge window (priority: challenge 2 outputs)
- Sunday afternoon: UI integration merge window (challenge 3)

## 5) Required submission items

Every team submission should include:

- Code and any required configs
- A short README with run instructions
- Notes describing team decisions and assumptions
- License/attribution confirmation for contributed content (include copyright + SPDX identifier)

## 6) Staff support points

- Staff mentor: supports technical blockers and architecture choices.
- Staff compliance lead: supports policy interpretation in challenge 1.
- Staff triage lead: supports exploit severity review in challenge 2.
- Staff integration lead: supports data contract and demo stitching in challenge 3.

## 7) Visibility and fairness policy

- Teams should not access other teams' private repos during build time.
- Shared sample logs and starter assets must remain unchanged.
- Final scoring uses the challenge rubrics in each challenge README.
