"""Automatic consistency checks for extracted incidents (rules + optional LLM).

Cannot prove an event "really happened" (no ground-truth feed), but can flag:
pipeline bugs (s_base vs YAML), low confidence, geocode gaps, and keyword/category mismatches.
Optional second opinion via OpenAI when OPENAI_API_KEY is set and use_llm=True.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

YAML_PATH = Path(__file__).resolve().parent / "data" / "severity_categories.yaml"
ENGINE_VERSION = "auto-verify-v2"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_URL = "https://api.openai.com/v1/chat/completions"

# Lowercase substrings → signal strength for that category (heuristic).
CATEGORY_SIGNALS: dict[str, list[str]] = {
    "fire_hazmat": [
        "fire", "smoke", "hazmat", "engine ", "ladder", "box alarm",
        "working fire", "structure fire", "vehicle fire",
    ],
    "medical_priority": [
        "cardiac", "overdose", " od ", "cpr", "unconscious", "not breathing",
        "priority", "full arrest", "stemi", "stroke", "diabetic",
    ],
    "medical_other": [
        "medical", "ambulance", "ems", "fall", "bleeding", "sick",
        "injured", "medic ",
    ],
    "traffic_crash_injury": [
        "mva", "crash", "accident", "collision", "injury", "injuries",
        "rollover", "flipped", "entrapment", "pedestrian struck",
    ],
    "traffic_crash_no_injury": [
        "property damage", "no injury", "fender", "minor crash",
    ],
    "shots_heard": [
        "shots", "shots fired", "gunshot", "hearing shots", "shell casings",
    ],
    "violent_weapon": [
        "weapon", "gun", "knife", "stab", "shooting", "shot ", "gsw",
        "pistol", "rifle",
    ],
    "violent_no_weapon": [
        "assault", "fight", "battery", "domestic", "punched",
    ],
    "robbery": [
        "robbery", "robbed", "hold up", "hold-up", "armed robbery",
    ],
    "burglary_in_progress": [
        "burglary", "breaking", "forced entry", "b&e", "break-in",
    ],
    "disorder": [
        "disturbance", "disorder", "large fight", "disorderly",
    ],
    "admin_or_noise": [
        "radio check", "test tone", "10-4", "copy that", "stand by",
    ],
}


def _load_yaml_categories() -> dict[str, dict[str, Any]]:
    with open(YAML_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return dict(data.get("categories") or {})


def _count_signals(text_lower: str, category: str) -> int:
    hits = 0
    for sub in CATEGORY_SIGNALS.get(category, []):
        if sub in text_lower:
            hits += 1
    return hits


def _best_alternate_category(text_lower: str, assigned: str) -> tuple[str | None, int]:
    best_cat: str | None = None
    best_score = 0
    for cat, _subs in CATEGORY_SIGNALS.items():
        if cat == assigned:
            continue
        s = _count_signals(text_lower, cat)
        if s > best_score:
            best_score = s
            best_cat = cat
    return best_cat, best_score


@dataclass
class AutoFlag:
    id: str
    severity: str  # "info" | "warn" | "fail"
    message: str


@dataclass
class AutoVerifyResult:
    auto_status: str  # pass | warn | fail
    auto_score: float
    flags: list[AutoFlag] = field(default_factory=list)
    llm_agrees: str | None = None
    llm_suggested_category: str | None = None
    llm_reason: str | None = None
    engine_version: str = ENGINE_VERSION

    def to_json_dict(self) -> dict[str, Any]:
        return {
            "auto_status": self.auto_status,
            "auto_score": self.auto_score,
            "flags": [{"id": f.id, "severity": f.severity, "message": f.message} for f in self.flags],
            "llm_agrees": self.llm_agrees,
            "llm_suggested_category": self.llm_suggested_category,
            "llm_reason": self.llm_reason,
            "engine_version": self.engine_version,
        }


def run_rules(incident: dict[str, Any]) -> AutoVerifyResult:
    flags: list[AutoFlag] = []
    text = (incident.get("raw_text") or "").strip()
    text_lower = text.lower()
    cat = incident.get("severity_category") or ""
    conf = float(incident.get("confidence") or 0.0)
    s_base = float(incident.get("s_base") or 0.0)
    yaml_cats = _load_yaml_categories()
    expected_s = float(yaml_cats.get(cat, {}).get("s_base", s_base))

    # 1) Pipeline: s_base should match YAML for category
    if cat in yaml_cats and abs(s_base - expected_s) > 0.02:
        flags.append(
            AutoFlag(
                "s_base_yaml_mismatch",
                "fail",
                f"s_base={s_base} but YAML expects {expected_s} for {cat}",
            )
        )

    # 2) Confidence
    if conf < 0.3:
        flags.append(AutoFlag("very_low_confidence", "fail", f"confidence={conf:.2f}"))
    elif conf < 0.5:
        flags.append(AutoFlag("low_confidence", "warn", f"confidence={conf:.2f}"))

    # 3) Transcript length
    if len(text) < 12:
        flags.append(AutoFlag("very_short_transcript", "warn", f"len={len(text)} chars"))

    # 4) Location / geocode for non-admin incidents
    if cat != "admin_or_noise":
        loc = (incident.get("location_text") or "").strip()
        if not loc:
            flags.append(AutoFlag("missing_location_text", "warn", "No location_text for dispatch category"))
        gs = incident.get("geocode_status") or ""
        lat = incident.get("lat")
        if gs in ("failed", "no_result", "pending") and lat is None:
            flags.append(
                AutoFlag(
                    "no_coordinates",
                    "warn",
                    f"geocode_status={gs} and lat/lng missing",
                )
            )

    # 5) Keyword/category consistency (heuristic)
    assigned_hits = _count_signals(text_lower, cat)
    alt_cat, alt_score = _best_alternate_category(text_lower, cat)

    if cat != "admin_or_noise":
        if assigned_hits == 0 and alt_score >= 3:
            flags.append(
                AutoFlag(
                    "strong_keyword_conflict",
                    "fail",
                    f"No signals for '{cat}' but strong signals for '{alt_cat}' (score={alt_score})",
                )
            )
        elif assigned_hits == 0 and alt_score == 2:
            flags.append(
                AutoFlag(
                    "possible_category_mismatch",
                    "warn",
                    f"Weak match for '{cat}'; '{alt_cat}' also fits (score={alt_score})",
                )
            )

    if cat == "admin_or_noise" and assigned_hits == 0:
        # If it looks like a real incident, might be under-classified
        _, strong = _best_alternate_category(text_lower, cat)
        if strong >= 2:
            flags.append(
                AutoFlag(
                    "admin_with_incident_keywords",
                    "warn",
                    "Category admin_or_noise but transcript contains incident-like keywords",
                )
            )

    # 6) Blocked inhibitor stored as incident — informational
    if incident.get("inhibitor_status") == "blocked":
        flags.append(
            AutoFlag("inhibitor_blocked", "info", incident.get("inhibitor_reason") or "blocked")
        )

    # Score: start 100, penalize
    score = 100.0
    for f in flags:
        if f.severity == "fail":
            score -= 35
        elif f.severity == "warn":
            score -= 12
        elif f.severity == "info":
            score -= 0
    score = max(0.0, min(100.0, score))

    has_fail = any(f.severity == "fail" for f in flags)
    has_warn = any(f.severity == "warn" for f in flags)
    if has_fail or score < 45:
        status = "fail"
    elif has_warn or score < 75:
        status = "warn"
    else:
        status = "pass"

    return AutoVerifyResult(auto_status=status, auto_score=round(score, 1), flags=flags)


def run_llm_audit(incident: dict[str, Any], timeout: float = 25.0) -> dict[str, Any | None]:
    """Returns agrees: 'yes'|'no'|'uncertain', suggested_category, reason, or error keys."""
    if not OPENAI_API_KEY:
        return {"llm_agrees": "skipped", "llm_reason": "OPENAI_API_KEY not set"}

    try:
        import httpx
    except ImportError:
        return {"llm_agrees": "error", "llm_reason": "httpx not installed"}

    from philly_pulse.llm import SEVERITY_CATEGORIES

    text = incident.get("raw_text") or ""
    cat = incident.get("severity_category") or ""
    user = f"""Transcript (one line):
{text}

Assigned severity_category: {cat}

Reply with ONLY valid JSON (no markdown):
{{"agrees": true or false, "suggested_category": one of {json.dumps(SEVERITY_CATEGORIES)} or null, "confidence": 0.0-1.0, "reason": "one short sentence"}}"""

    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.post(
                OPENAI_URL,
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You verify whether a scanner transcript supports the given incident category. Be conservative; use null suggested_category if unsure.",
                        },
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 200,
                },
            )
            r.raise_for_status()
            data = r.json()
            raw = data["choices"][0]["message"]["content"].strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            parsed = json.loads(raw)
            agrees = parsed.get("agrees")
            if agrees is True:
                llm_agrees = "yes"
            elif agrees is False:
                llm_agrees = "no"
            else:
                llm_agrees = "uncertain"
            return {
                "llm_agrees": llm_agrees,
                "llm_suggested_category": parsed.get("suggested_category"),
                "llm_reason": (parsed.get("reason") or "")[:500],
            }
    except Exception as e:
        return {"llm_agrees": "error", "llm_reason": str(e)[:300]}


def auto_verify_incident(incident: dict[str, Any], use_llm: bool = False) -> AutoVerifyResult:
    result = run_rules(incident)
    if use_llm:
        llm = run_llm_audit(incident)
        result.llm_agrees = llm.get("llm_agrees")
        result.llm_suggested_category = llm.get("llm_suggested_category")
        result.llm_reason = llm.get("llm_reason")
        if result.llm_agrees == "no":
            # Escalate: LLM disagrees with category
            result.flags.append(
                AutoFlag(
                    "llm_disagrees_category",
                    "warn",
                    result.llm_reason or "LLM disagrees with assigned category",
                )
            )
            if result.auto_status == "pass":
                result.auto_status = "warn"
            result.auto_score = max(0.0, result.auto_score - 10)
    return result
