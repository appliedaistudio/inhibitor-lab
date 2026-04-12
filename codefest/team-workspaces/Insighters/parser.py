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
  parser.py - Handles raw data and restructures it

************************************************************
'''


import ast
import pandas as pd
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Session:
    session_id: int
    started_at: str
    events: list[dict] = field(default_factory=list)

    # Extracted fields populated after grouping
    observations: list[str] = field(default_factory=list)
    prediction_reasons: list[str] = field(default_factory=list)
    rule_ids: list[str] = field(default_factory=list)
    rules_passed: bool = True
    violation_count: int = 0
    final_validation: bool = True
    llm_models: list[str] = field(default_factory=list)
    missing_fields: list[str] = field(default_factory=list)


def _safe_parse(raw: Any) -> dict:
    if isinstance(raw, dict):
        return raw
    try:
        return ast.literal_eval(str(raw))
    except Exception:
        return {}


def load_sessions(csv_path: str) -> list[Session]:
    df = pd.read_csv(csv_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df = df.sort_values("timestamp").reset_index(drop=True)
    df["meta_parsed"] = df["meta"].apply(_safe_parse)

    sessions: list[Session] = []
    current: Session | None = None
    session_counter = 0

    for _, row in df.iterrows():
        event = row["event"]
        meta = row["meta_parsed"]
        ts = row["timestamp"].isoformat()

        # Set A uses request_success as session boundary
        # Set B uses rules_inhibition_skipped as session boundary
        if event in ("request_success", "rules_inhibition_skipped"):
            if current is not None:
                sessions.append(_finalise(current))
            session_counter += 1
            current = Session(session_id=session_counter, started_at=ts)
        
        if current is None:
            # Events before the first request_success — skip
            continue

        current.events.append({"event": event, "meta": meta, "timestamp": ts})

        # Accumulate structured fields
        if event == "inhibition_observation_description_response":
            key = meta.get("key")
            if key and key not in current.observations:
                current.observations.append(key)

        elif event == "inhibition_prediction_reason_response":
            key = meta.get("key")
            if key and key not in current.prediction_reasons:
                current.prediction_reasons.append(key)

        elif event == "rules_inhibition_rule_start":
            rule = meta.get("ruleId")
            if rule and rule not in current.rule_ids:
                current.rule_ids.append(rule)

        elif event == "rules_inhibition_complete":
            current.rules_passed = meta.get("passed", True)
            current.violation_count = meta.get("violationCount", 0)

        elif event == "inhibition_final_validation":
            current.final_validation = meta.get("validationSuccess", True)

        elif event == "llm_prompt_start":
            model = meta.get("model")
            if model and model not in current.llm_models:
                current.llm_models.append(model)

        elif event == "rules_extraction_value_missing":
            var = meta.get("variable")
            if var and var not in current.missing_fields:
                current.missing_fields.append(var)

    if current is not None:
        sessions.append(_finalise(current))

    return sessions


def _finalise(s: Session) -> Session:
    return s


if __name__ == "__main__":
    sessions = load_sessions("inhibitor_logs.csv")
    print(f"Loaded {len(sessions)} sessions")
    s = sessions[0]
    print(f"\nSession 1 — started: {s.started_at}")
    print(f"  Observations : {s.observations}")
    print(f"  Reasons      : {s.prediction_reasons}")
    print(f"  Rules        : {s.rule_ids}")
    print(f"  Missing fields: {s.missing_fields}")
    print(f"  Final valid  : {s.final_validation}")