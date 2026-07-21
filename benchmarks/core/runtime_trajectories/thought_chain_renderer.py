"""Deterministically render proposed-action fixtures into the /check contract."""

import json


def _compact(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def render_thought_chain(case):
    """Build a stable /check request without model generation or external calls."""
    envelope = case["proposed_action_envelope"]
    human = "User goal: {goal}\nEnvironment state: {environment}".format(
        goal=case["user_goal"], environment=case["environment_state"]
    )
    agent = (
        "Proposed action: {candidate} by {actor}; call {tool} with input {payload}. "
        "Side effect: {effect}; reversibility: {reversibility}; data sensitivity: {sensitivity}."
    ).format(candidate=envelope["candidate_type"], actor=envelope["actor"], tool=envelope["tool_name"],
             payload=_compact(envelope["tool_input"]), effect=envelope["side_effect_type"],
             reversibility=envelope["reversibility"], sensitivity=envelope["data_sensitivity"])
    return {"thought_chain": [{"role": "human", "content": human}, {"role": "agent", "content": agent}],
            "mode": case.get("mode", "performance")}
