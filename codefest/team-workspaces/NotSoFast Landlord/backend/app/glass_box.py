"""Glass Box — parser for Applied AI Studio's shared Inhibitor log datasets.

This module satisfies Challenge 3 (Glass Box / Audit Dashboard). It reads
the read-only sample datasets shipped at `backend/data/glass_box_samples/`
and exposes parsed, summarized views for the dashboard UI.

The shared datasets were generated during an AI Safety Inhibitor Drift Audit
stress test and contain tens of thousands of pipeline events — far more
than the summary JSONLs suggest. We parse on the server and only ship
aggregates and paginated slices to the frontend.
"""
from __future__ import annotations

import ast
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SAMPLES_ROOT = PROJECT_ROOT / "backend" / "data" / "glass_box_samples"

# Events clustered by pipeline phase for the dashboard's "lifecycle" view.
PHASES = {
    "embedding": {"embedding_start", "embedding_complete"},
    "llm": {"llm_prompt_start", "llm_prompt_complete"},
    "observation": {
        "inhibition_observation_description_response",
        "inhibition_observation_value_response",
    },
    "prediction": {
        "inhibition_prediction_reason_response",
        "inhibition_prediction_value_response",
    },
    "rules": {
        "rules_inhibition_rule_start",
        "rules_inhibition_rule_passed",
        "rules_inhibition_rule_failed",
        "rules_inhibition_rule_binding_missing",
        "rules_extraction_value_missing",
        "rules_inhibition_complete",
    },
    "finalize": {"inhibition_final_validation", "request_success", "request_error"},
}

EVENT_TO_PHASE: dict[str, str] = {}
for phase, events in PHASES.items():
    for e in events:
        EVENT_TO_PHASE[e] = phase


def _parse_meta(raw: str) -> dict[str, Any]:
    """The meta column is Python-dict-like. Try JSON first, fall back to ast."""
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        try:
            value = ast.literal_eval(raw)
            if isinstance(value, dict):
                return value
        except (ValueError, SyntaxError):
            pass
    return {"_raw": raw[:200]}


class GlassBoxDataset:
    """Lazily loaded, in-memory view of a single sample set (set_a or set_b)."""

    def __init__(self, set_name: str):
        self.set_name = set_name
        self.dir = SAMPLES_ROOT / set_name
        self._events: list[dict[str, Any]] | None = None
        self._summary_events: list[dict[str, Any]] | None = None

    def _find_csv(self) -> Path | None:
        """Find the CSV log file — handles both old and new naming conventions."""
        for pattern in [
            f"inhibitor_logs_{self.set_name}.csv",
            "inhibitor_logs.csv",
            "*.csv",
        ]:
            matches = list(self.dir.glob(pattern))
            if matches:
                return matches[0]
        return None

    def _load_events(self) -> list[dict[str, Any]]:
        if self._events is not None:
            return self._events
        path = self._find_csv()
        events: list[dict[str, Any]] = []
        if path is None or not path.exists():
            self._events = events
            return events
        with path.open(newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                event = row.get("event", "") or ""
                meta = _parse_meta(row.get("meta", "") or "")
                events.append({
                    "timestamp": row.get("timestamp", ""),
                    "api_key": row.get("apiKey", ""),
                    "event": event,
                    "phase": EVENT_TO_PHASE.get(event, "other"),
                    "meta": meta,
                })
        self._events = events
        return events

    def _load_summaries(self) -> list[dict[str, Any]]:
        if self._summary_events is not None:
            return self._summary_events
        path = self.dir / "inhibitor_events.jsonl"
        summaries: list[dict[str, Any]] = []
        if path.exists():
            for line in path.read_text().splitlines():
                line = line.strip()
                if line:
                    try:
                        summaries.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        self._summary_events = summaries
        return summaries

    def summary(self) -> dict[str, Any]:
        events = self._load_events()
        summaries = self._load_summaries()

        event_counts = Counter(e["event"] for e in events)
        phase_counts = Counter(e["phase"] for e in events)
        key_counts = Counter(e["api_key"] for e in events if e["api_key"])

        request_success = event_counts.get("request_success", 0)
        request_error = event_counts.get("request_error", 0)
        rule_starts = event_counts.get("rules_inhibition_rule_start", 0)
        rule_passed = event_counts.get("rules_inhibition_rule_passed", 0)
        rule_failed = event_counts.get("rules_inhibition_rule_failed", 0)

        # Pull out the rule IDs that fired.
        rule_ids: Counter[str] = Counter()
        for e in events:
            if e["event"] == "rules_inhibition_rule_start":
                rid = e["meta"].get("ruleId") if isinstance(e["meta"], dict) else None
                if rid:
                    rule_ids[rid] += 1

        severity_counts = Counter(
            s.get("severity", "unknown") for s in summaries
        )
        action_counts = Counter(s.get("action", "unknown") for s in summaries)
        policy_counts = Counter(
            s.get("policy_trigger", "unknown") for s in summaries
        )

        return {
            "set": self.set_name,
            "total_events": len(events),
            "total_summaries": len(summaries),
            "total_requests": request_success + request_error,
            "requests": {
                "success": request_success,
                "error": request_error,
            },
            "rules": {
                "starts": rule_starts,
                "passed": rule_passed,
                "failed": rule_failed,
                "top_rules": rule_ids.most_common(10),
            },
            "phase_counts": dict(phase_counts),
            "event_counts": dict(event_counts.most_common(20)),
            "api_keys": dict(key_counts),
            "severity_counts": dict(severity_counts),
            "action_counts": dict(action_counts),
            "policy_triggers": dict(policy_counts),
        }

    def summaries(self) -> list[dict[str, Any]]:
        """Returns the per-request summary records (small JSONL file)."""
        return self._load_summaries()

    def events(self, offset: int = 0, limit: int = 200) -> dict[str, Any]:
        events = self._load_events()
        return {
            "set": self.set_name,
            "total": len(events),
            "offset": offset,
            "limit": limit,
            "events": events[offset : offset + limit],
        }

    def lifecycle_samples(self, count: int = 5) -> list[list[dict[str, Any]]]:
        """Return a few representative request lifecycles (event sequences).

        We don't have an explicit request_id column. We slice by contiguous
        runs ending in request_success / request_error — good enough for
        showing "here's what one request looks like" on the dashboard.
        """
        events = self._load_events()
        lifecycles: list[list[dict[str, Any]]] = []
        current: list[dict[str, Any]] = []
        for e in events:
            current.append(e)
            if e["event"] in ("request_success", "request_error"):
                lifecycles.append(current)
                current = []
                if len(lifecycles) >= count:
                    break
        return lifecycles


_CACHE: dict[str, GlassBoxDataset] = {}


def get_dataset(set_name: str) -> GlassBoxDataset:
    """Load (and cache) a named dataset."""
    if set_name not in ("set_a", "set_b"):
        raise ValueError(f"Unknown dataset: {set_name}")
    if set_name not in _CACHE:
        _CACHE[set_name] = GlassBoxDataset(set_name)
    return _CACHE[set_name]


def available_sets() -> list[str]:
    """Return sample sets that actually exist on disk."""
    if not SAMPLES_ROOT.exists():
        return []
    return sorted(p.name for p in SAMPLES_ROOT.iterdir() if p.is_dir())
