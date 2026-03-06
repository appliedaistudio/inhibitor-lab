# Team Management Guide for Codefest

Use this guide to run teams safely in one shared project while keeping work private until the final merge window.

## 1) Repository model

- Teams submit their challenge work to `codefest/team-workspaces/`.
- Keep team work private during build time and merge all team submissions in the final merge window.

## 2) Team setup checklist (staff)

- Create that team's folder in `codefest/team-workspaces/` if it does not exist yet.
- Add a team `README.md` in that folder when missing.
- Provide an Inhibitor API key to the team.
- Confirm each team can run their chosen tooling (starter notebook or alternate stack).

## 3) GitHub workflow

- Keep workflow simple: teams work in their own team folder under `codefest/team-workspaces/`.
- Teams prepare their final submission for the end-of-event merge window.
- Staff review and merge selected changes into the main event branch.

## 4) Merge window

- One final merge window at the end of the event.

## 5) Staff support points

- Staff support merge window execution and integration.
- Staff answer technical support questions.

## 6) Visibility and fairness policy

- Teams should not access other teams' work during build time.
- Shared sample logs and starter assets must remain unchanged.
- Final scoring uses the challenge rubrics in each challenge README.
