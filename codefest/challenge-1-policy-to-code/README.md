# Challenge 1: Policy-to-Code (Rules Engine)

## Mission

Use real policy documents to improve the safety behavior of your team agent. This challenge requires teams to build and run AI agents; you may start from the provided starter notebook or use your own agent stack.

Your team will:

1. Collect policy documents and place them under the policy document folder in your team folder in `codefest/team-workspaces/`
2. Ask a support staff member to generate Inhibitor rules from those policy documents
3. Ask support staff to link those generated rules to your Inhibitor service
4. Create or update your agent and test it with the newly linked rules

## Folder contents

- `policy_documents/` - reference examples only; teams should submit their policy documents in their own folder under `codefest/team-workspaces/`
- `starter_agent_policy_to_code.ipynb` - optional starter notebook for this challenge
- `codefest/team-workspaces/<your-team>/` - your team submission folder for policy docs, agent code, and notes

## Staff-supported steps

- Rule generation support: staff can generate rules from your team's policy documents
- Rule linking support: staff can link generated rules to your team Inhibitor service
- Technical support: staff can answer technical questions that come up during implementation
- API key support: staff will provide the Inhibitor API key
- OpenAI API key support: if needed, staff can provide an OpenAI API key for agent development

## Basic workflow

1. Put policy documents into your team folder under `codefest/team-workspaces/`
2. Request staff support to generate rules from those policy documents
3. Request staff support to link those rules to your Inhibitor service
4. Wire your Inhibitor-backed safety checks into your agent
5. Test your agent and verify the new rules work as expected
6. Prepare your final submission materials in your team folder

## Submission requirements

- Policy documents used by your team in your team folder
- Agent code or notebook showing integration with your Inhibitor-linked rules
- Test evidence showing expected safe/unsafe behavior
- A required use case story that explains the real context and scenario your policy rules are meant to handle

## Scoring rubric (100 points)

- 40 pts: Rule correctness and safety coverage
- 25 pts: Integration quality with the starter agent
- 20 pts: Clarity of policy-to-rule mapping explanation
- 15 pts: Demo quality and reproducibility
