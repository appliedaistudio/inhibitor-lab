"""SQLite incident store for PhillyPulse."""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

DB_PATH = os.environ.get(
    "PHILLY_PULSE_DB",
    str(Path(__file__).parent / "data" / "philly_pulse.db"),
)

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS incidents (
    id              TEXT PRIMARY KEY,
    reported_at     TEXT NOT NULL,
    raw_text        TEXT NOT NULL,
    severity_category TEXT NOT NULL,
    s_base          REAL NOT NULL,
    location_text   TEXT,
    lat             REAL,
    lng             REAL,
    confidence      REAL NOT NULL DEFAULT 1.0,
    geocode_status  TEXT DEFAULT 'pending',
    inhibitor_status TEXT DEFAULT 'passed',
    inhibitor_reason TEXT
);
"""

_CREATE_HUMAN_REVIEW = """
CREATE TABLE IF NOT EXISTS incident_human_review (
    incident_id         TEXT PRIMARY KEY,
    verdict             TEXT NOT NULL,
    transcript_accurate INTEGER,
    category_accurate   INTEGER,
    location_accurate   INTEGER,
    corrected_category  TEXT,
    notes               TEXT,
    reviewed_at         TEXT NOT NULL
);
"""

_CREATE_AUTO_CHECK = """
CREATE TABLE IF NOT EXISTS incident_auto_check (
    incident_id             TEXT PRIMARY KEY,
    auto_status             TEXT NOT NULL,
    auto_score              REAL NOT NULL,
    flags_json              TEXT NOT NULL,
    llm_agrees              TEXT,
    llm_suggested_category  TEXT,
    llm_reason              TEXT,
    engine_version          TEXT NOT NULL,
    checked_at              TEXT NOT NULL
);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


_conn: Optional[sqlite3.Connection] = None


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = _connect()
        _conn.execute(_CREATE_TABLE)
        _conn.execute(_CREATE_HUMAN_REVIEW)
        _conn.execute(_CREATE_AUTO_CHECK)
        _conn.commit()
    return _conn


def ensure_human_review_table() -> None:
    """Create human review table if missing (safe if DB opened before migration)."""
    conn = get_conn()
    conn.execute(_CREATE_HUMAN_REVIEW)
    conn.commit()


def ensure_auto_check_table() -> None:
    conn = get_conn()
    conn.execute(_CREATE_AUTO_CHECK)
    conn.commit()


def save_auto_check(
    incident_id: str,
    auto_status: str,
    auto_score: float,
    flags_json: str,
    engine_version: str,
    llm_agrees: Optional[str] = None,
    llm_suggested_category: Optional[str] = None,
    llm_reason: Optional[str] = None,
) -> dict:
    ensure_auto_check_table()
    conn = get_conn()
    checked_at = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """
        INSERT INTO incident_auto_check
          (incident_id, auto_status, auto_score, flags_json, llm_agrees,
           llm_suggested_category, llm_reason, engine_version, checked_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(incident_id) DO UPDATE SET
          auto_status = excluded.auto_status,
          auto_score = excluded.auto_score,
          flags_json = excluded.flags_json,
          llm_agrees = excluded.llm_agrees,
          llm_suggested_category = excluded.llm_suggested_category,
          llm_reason = excluded.llm_reason,
          engine_version = excluded.engine_version,
          checked_at = excluded.checked_at
        """,
        (
            incident_id,
            auto_status,
            auto_score,
            flags_json,
            llm_agrees,
            llm_suggested_category,
            llm_reason,
            engine_version,
            checked_at,
        ),
    )
    conn.commit()
    return get_auto_check(incident_id) or {}


def get_auto_check(incident_id: str) -> Optional[dict]:
    ensure_auto_check_table()
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM incident_auto_check WHERE incident_id = ?",
        (incident_id,),
    ).fetchone()
    return dict(row) if row else None


def list_incidents_without_auto_check(limit: int = 500) -> list[dict]:
    """Incidents that have never been auto-checked."""
    ensure_auto_check_table()
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT i.* FROM incidents i
        LEFT JOIN incident_auto_check a ON i.id = a.incident_id
        WHERE a.incident_id IS NULL
        ORDER BY i.reported_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def list_auto_checks_joined(limit: Optional[int] = None) -> list[dict]:
    ensure_auto_check_table()
    conn = get_conn()
    sql = """
        SELECT
          a.incident_id,
          a.auto_status,
          a.auto_score,
          a.flags_json,
          a.llm_agrees,
          a.llm_suggested_category,
          a.llm_reason,
          a.engine_version,
          a.checked_at,
          i.reported_at,
          i.raw_text,
          i.severity_category,
          i.confidence,
          i.geocode_status,
          i.inhibitor_status
        FROM incident_auto_check a
        JOIN incidents i ON i.id = a.incident_id
        ORDER BY a.checked_at DESC
        """
    if limit is not None:
        rows = conn.execute(sql + " LIMIT ?", (int(limit),)).fetchall()
    else:
        rows = conn.execute(sql).fetchall()
    return [dict(r) for r in rows]


def auto_check_stats() -> dict[str, Any]:
    ensure_auto_check_table()
    conn = get_conn()
    total = conn.execute("SELECT COUNT(*) AS c FROM incident_auto_check").fetchone()["c"]
    by_status: dict[str, int] = {}
    for row in conn.execute(
        "SELECT auto_status, COUNT(*) AS c FROM incident_auto_check GROUP BY auto_status"
    ).fetchall():
        by_status[row["auto_status"]] = row["c"]
    return {"auto_checked": total, "by_status": by_status}


def insert_extraction(**kwargs) -> dict:
    """No-op for SQLite — extractions only stored in Firestore."""
    return kwargs


def get_extraction(extraction_id: str) -> Optional[dict]:
    """No-op for SQLite."""
    return None


def update_extraction(extraction_id: str, updates: dict) -> Optional[dict]:
    """No-op for SQLite."""
    return None


def insert_incident(
    raw_text: str,
    severity_category: str,
    s_base: float,
    confidence: float,
    location_text: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    geocode_status: str = "pending",
    inhibitor_status: str = "passed",
    inhibitor_reason: Optional[str] = None,
    reported_at: Optional[str] = None,
    audio_clip: Optional[str] = None,
    feed_id: Optional[str] = None,
) -> dict:
    conn = get_conn()
    incident_id = uuid.uuid4().hex[:12]
    if reported_at is None:
        reported_at = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """INSERT INTO incidents
           (id, reported_at, raw_text, severity_category, s_base,
            location_text, lat, lng, confidence, geocode_status,
            inhibitor_status, inhibitor_reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            incident_id,
            reported_at,
            raw_text,
            severity_category,
            s_base,
            location_text,
            lat,
            lng,
            confidence,
            geocode_status,
            inhibitor_status,
            inhibitor_reason,
        ),
    )
    conn.commit()
    return get_incident(incident_id)


def get_incident(incident_id: str) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM incidents WHERE id = ?", (incident_id,)
    ).fetchone()
    return dict(row) if row else None


def list_incidents_recent(limit: int = 200, include_blocked: bool = True) -> list[dict]:
    """Most recent incidents (for batch auto-check)."""
    conn = get_conn()
    if include_blocked:
        rows = conn.execute(
            "SELECT * FROM incidents ORDER BY reported_at DESC LIMIT ?",
            (int(limit),),
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT * FROM incidents WHERE inhibitor_status != 'blocked'
               ORDER BY reported_at DESC LIMIT ?""",
            (int(limit),),
        ).fetchall()
    return [dict(r) for r in rows]


def list_incidents(
    since: Optional[str] = None,
    category: Optional[str] = None,
    include_blocked: bool = False,
) -> list[dict]:
    conn = get_conn()
    clauses = []
    params: list = []

    if not include_blocked:
        clauses.append("inhibitor_status != 'blocked'")
    if since:
        clauses.append("reported_at >= ?")
        params.append(since)
    if category:
        clauses.append("severity_category = ?")
        params.append(category)

    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = conn.execute(
        f"SELECT * FROM incidents{where} ORDER BY reported_at DESC", params
    ).fetchall()
    return [dict(r) for r in rows]


def seed_from_json(seed_path: str, s_base_lookup: dict[str, float]) -> int:
    """Load seed_incidents.json into the store. Returns count inserted."""
    with open(seed_path, "r") as f:
        seeds = json.load(f)

    count = 0
    now = datetime.now(timezone.utc)
    for item in seeds:
        offset = item.get("reported_at_offset_minutes", 0)
        reported = (now + timedelta(minutes=offset)).isoformat()
        cat = item["severity_category"]
        insert_incident(
            raw_text=item["raw_text"],
            severity_category=cat,
            s_base=s_base_lookup.get(cat, 0.5),
            confidence=item.get("confidence", 0.8),
            location_text=item.get("location_text"),
            lat=item.get("lat"),
            lng=item.get("lng"),
            geocode_status="seeded",
            inhibitor_status="passed",
            reported_at=reported,
        )
        count += 1
    return count


def incident_count() -> int:
    conn = get_conn()
    row = conn.execute("SELECT COUNT(*) as cnt FROM incidents").fetchone()
    return row["cnt"]


def inhibitor_stats() -> dict:
    """Return counts by inhibitor_status for the transparency page."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT inhibitor_status, COUNT(*) as cnt FROM incidents GROUP BY inhibitor_status"
    ).fetchall()
    return {row["inhibitor_status"]: row["cnt"] for row in rows}


def save_human_review(
    incident_id: str,
    verdict: str,
    transcript_accurate: int | None,
    category_accurate: int | None,
    location_accurate: int | None,
    corrected_category: str | None,
    notes: str | None,
) -> dict:
    """Upsert a human verification record. Bool fields: 1=yes, 0=no, None=not answered."""
    ensure_human_review_table()
    conn = get_conn()
    reviewed_at = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """
        INSERT INTO incident_human_review
          (incident_id, verdict, transcript_accurate, category_accurate,
           location_accurate, corrected_category, notes, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(incident_id) DO UPDATE SET
          verdict = excluded.verdict,
          transcript_accurate = excluded.transcript_accurate,
          category_accurate = excluded.category_accurate,
          location_accurate = excluded.location_accurate,
          corrected_category = excluded.corrected_category,
          notes = excluded.notes,
          reviewed_at = excluded.reviewed_at
        """,
        (
            incident_id,
            verdict,
            transcript_accurate,
            category_accurate,
            location_accurate,
            corrected_category or None,
            notes or None,
            reviewed_at,
        ),
    )
    conn.commit()
    return get_human_review(incident_id) or {}


def get_human_review(incident_id: str) -> Optional[dict]:
    ensure_human_review_table()
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM incident_human_review WHERE incident_id = ?",
        (incident_id,),
    ).fetchone()
    return dict(row) if row else None


def list_recent_incidents_with_review(limit: int = 40) -> list[dict]:
    """Recent incidents with optional human review verdict (LEFT JOIN)."""
    ensure_human_review_table()
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT i.*, h.verdict AS human_verdict, h.reviewed_at AS human_reviewed_at
        FROM incidents i
        LEFT JOIN incident_human_review h ON i.id = h.incident_id
        ORDER BY i.reported_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def list_incidents_pending_human_review(
    limit: int = 50,
    include_blocked: bool = False,
) -> list[dict]:
    """Incidents with no human review row yet."""
    ensure_human_review_table()
    conn = get_conn()
    blocked = "" if include_blocked else " AND i.inhibitor_status != 'blocked'"
    rows = conn.execute(
        f"""
        SELECT i.* FROM incidents i
        LEFT JOIN incident_human_review h ON i.id = h.incident_id
        WHERE h.incident_id IS NULL{blocked}
        ORDER BY i.reported_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def list_human_reviews_with_incidents(limit: Optional[int] = None) -> list[dict]:
    """Join review + incident for export."""
    ensure_human_review_table()
    conn = get_conn()
    sql = """
        SELECT
          h.incident_id,
          h.verdict,
          h.transcript_accurate,
          h.category_accurate,
          h.location_accurate,
          h.corrected_category,
          h.notes,
          h.reviewed_at,
          i.reported_at,
          i.raw_text,
          i.severity_category,
          i.s_base,
          i.location_text,
          i.lat,
          i.lng,
          i.confidence,
          i.geocode_status,
          i.inhibitor_status
        FROM incident_human_review h
        JOIN incidents i ON i.id = h.incident_id
        ORDER BY h.reviewed_at DESC
        """
    if limit is not None:
        rows = conn.execute(sql + " LIMIT ?", (int(limit),)).fetchall()
    else:
        rows = conn.execute(sql).fetchall()
    return [dict(r) for r in rows]


def human_review_counts() -> dict[str, int]:
    ensure_human_review_table()
    conn = get_conn()
    total_inc = conn.execute("SELECT COUNT(*) AS c FROM incidents").fetchone()["c"]
    reviewed = conn.execute("SELECT COUNT(*) AS c FROM incident_human_review").fetchone()["c"]
    pending_row = conn.execute(
        """
        SELECT COUNT(*) AS c FROM incidents i
        LEFT JOIN incident_human_review h ON i.id = h.incident_id
        WHERE h.incident_id IS NULL
        """
    ).fetchone()
    pending = pending_row["c"] if pending_row else 0
    by_verdict: dict[str, int] = {}
    rows = conn.execute(
        "SELECT verdict, COUNT(*) AS c FROM incident_human_review GROUP BY verdict"
    ).fetchall()
    for r in rows:
        by_verdict[r["verdict"]] = r["c"]
    return {
        "incidents_total": total_inc,
        "reviewed": reviewed,
        "pending": pending,
        "by_verdict": by_verdict,
    }
