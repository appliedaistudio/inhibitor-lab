'''
************************************************************

******************* PHILLY CODEFEST 2026 *******************

* PROJECT:- 
  Glass Box (Audit Dashboard)

* CORPORATE PARTNER:- 
  appliedAIStudio

* TEAM MEMBER(S):-
  1. Hitashi Kalra [hk835@drexel.edu]
  2. Puranjay Wadhera [pw425@drexel.edu]
  3. Haard Doshi [hhd27@drexel.edu]
  4. Aditya Raj [ar3989@drexel.edu]
  5. Parsa Ahmadi Nasab Emran [parsatempleowl@brandeis.edu]

* FILE NAME:-
  analyzer.py - Handles the processed session objects and prompts the LLM to provide insights

************************************************************
'''

import json
import os
from openai import OpenAI
from parser import Session

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM_PROMPT = """

CHALLENGE OVERVIEW:-
------------------

1. Basic workflow
Access and review the sample logs (read-only)
Build a visualization or dashboard from the log data
Prepare demo notes and run instructions for your visualization

2. Submission requirements
Dashboard code or UI component package
Notes describing expected log input and rendering behavior
One short explanation of how your UI supports audit/compliance review

MISSION IN A NUTSHELL:-
---------------------

Build UI and analysis components that explain Inhibitor interventions using shared log datasets. 
If your approach uses AI agents for analysis or generation, you may use starter patterns from other challenge folders or your own agent implementation.

TASK:-
----

You are an AI audit analyst reviewing Inhibitor system logs.
The Inhibitor is a compliance layer that intercepts AI requests and flags risks before they reach end users.

You will receive structured data from one session and must return a JSON object with exactly these fields:

{
  "risk_level": "low" | "medium" | "high",
  "risk_score": <integer 0-100>,
  "summary": "<1-2 sentence plain English explanation of what happened in this session>",
  "top_observations": ["<3 most significant observations, human-readable>"],
  "top_reasons": ["<3 most significant intervention reasons, human-readable>"],
  "regulations": ["<list of specific regulations triggered, e.g. HIPAA, GDPR, CCPA>"],
  "data_types_involved": ["<types of sensitive data involved, e.g. clinical, financial>"],
  "recommended_action": "<one sentence: what an auditor should do next>"
}

Rules for risk_level:
- high: any HIPAA/GDPR/CCPA/AML violation, malicious request, unsafe autonomous decision, or biased output
- medium: fairness, transparency, or trust issues without direct regulatory breach
- low: missing fields or minor rule issues only, no regulatory flags

Return ONLY the JSON object. No markdown, no explanation, no preamble.

"""


def _build_user_prompt(session: Session) -> str:
    return f"""Session ID: {session.session_id}
Started at: {session.started_at}
Rules checked: {session.rule_ids}
Missing input fields: {session.missing_fields}
Rules passed: {session.rules_passed} (violations: {session.violation_count})
Final validation passed: {session.final_validation}
LLM models used: {session.llm_models}

Observations flagged ({len(session.observations)} unique):
{json.dumps(session.observations, indent=2)}

Intervention reasons ({len(session.prediction_reasons)} unique):
{json.dumps(session.prediction_reasons, indent=2)}"""


def analyze_session(session: Session) -> dict:
    """Call OpenAI and return a structured audit summary for one session."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(session)},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    result = json.loads(raw)
    # Attach session metadata
    result["session_id"] = session.session_id
    result["started_at"] = session.started_at
    result["rules"] = session.rule_ids
    result["missing_fields"] = session.missing_fields
    result["final_validation"] = session.final_validation
    result["observation_count"] = len(session.observations)
    result["reason_count"] = len(session.prediction_reasons)
    return result


def analyze_all_sessions(sessions: list[Session], max_workers: int = 5) -> list[dict]:
    """Analyze all sessions in parallel using a thread pool."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    results = [None] * len(sessions)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {
            executor.submit(analyze_session, s): i
            for i, s in enumerate(sessions)
        }
        completed = 0
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                results[idx] = future.result()
                completed += 1
                print(f"  [{completed}/{len(sessions)}] Session {sessions[idx].session_id} done "
                      f"— risk: {results[idx].get('risk_level', '?')}")
            except Exception as e:
                print(f"  [ERROR] Session {sessions[idx].session_id}: {e}")
                results[idx] = {
                    "session_id": sessions[idx].session_id,
                    "started_at": sessions[idx].started_at,
                    "risk_level": "unknown",
                    "risk_score": 0,
                    "summary": f"Analysis failed: {e}",
                    "top_observations": [],
                    "top_reasons": [],
                    "regulations": [],
                    "data_types_involved": [],
                    "recommended_action": "Retry analysis.",
                    "error": True,
                }

    return [r for r in results if r is not None]
