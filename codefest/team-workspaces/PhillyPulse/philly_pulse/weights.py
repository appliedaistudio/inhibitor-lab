"""Severity lookup and effective weight computation for PhillyPulse."""

import math
import os
from datetime import datetime, timezone
from pathlib import Path

import yaml

_YAML_PATH = Path(__file__).parent / "data" / "severity_categories.yaml"
_s_base_map: dict[str, float] | None = None

TAU_HOURS = float(os.environ.get("PHILLY_PULSE_TAU_HOURS", "12"))


def _load_severity_map() -> dict[str, float]:
    global _s_base_map
    if _s_base_map is None:
        with open(_YAML_PATH, "r") as f:
            data = yaml.safe_load(f)
        _s_base_map = {
            key: cat["s_base"]
            for key, cat in data["categories"].items()
        }
    return _s_base_map


def get_s_base(severity_category: str) -> float:
    m = _load_severity_map()
    return m.get(severity_category, 0.5)


def compute_w_eff(
    s_base: float,
    reported_at_iso: str,
    confidence: float = 1.0,
    now: datetime | None = None,
) -> float:
    """Compute effective pin weight: S_base * exp(-dt/tau) * clip(confidence)."""
    if now is None:
        now = datetime.now(timezone.utc)

    try:
        reported = datetime.fromisoformat(reported_at_iso)
        if reported.tzinfo is None:
            reported = reported.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return 0.0

    delta_hours = max((now - reported).total_seconds() / 3600.0, 0.0)
    c = max(0.3, min(confidence, 1.0))
    time_decay = math.exp(-delta_hours / TAU_HOURS)
    return s_base * time_decay * c


def enrich_incidents(incidents: list[dict]) -> list[dict]:
    """Add w_eff to each incident dict."""
    now = datetime.now(timezone.utc)
    for inc in incidents:
        inc["w_eff"] = round(
            compute_w_eff(
                s_base=inc.get("s_base", 0.5),
                reported_at_iso=inc.get("reported_at", ""),
                confidence=inc.get("confidence", 1.0),
                now=now,
            ),
            4,
        )
    return incidents
