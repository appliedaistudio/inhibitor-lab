"""Firestore incident store — same contract as store.py for the FastAPI server."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import firebase_admin
from firebase_admin import credentials, firestore

_db: Optional[firestore.Client] = None


def _ensure_client() -> firestore.Client:
    global _db
    if _db is not None:
        return _db
    if firebase_admin._apps:
        _db = firestore.client()
        return _db

    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    json_str = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if cred_path and os.path.isfile(cred_path):
        cred = credentials.Certificate(cred_path)
    elif json_str:
        cred = credentials.Certificate(json.loads(json_str))
    else:
        raise RuntimeError(
            "Firestore requires GOOGLE_APPLICATION_CREDENTIALS (path to JSON) "
            "or FIREBASE_SERVICE_ACCOUNT_JSON (JSON string)."
        )
    firebase_admin.initialize_app(cred)
    _db = firestore.client()
    return _db


def get_conn() -> Any:
    """Match SQLite store: warm up DB on startup."""
    _ensure_client()
    return None


def _doc_to_row(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    row = dict(data)
    row["id"] = doc_id
    return row


def insert_incident(
    raw_text: str,
    severity_category: str,
    s_base: float,
    confidence: float,
    location_text: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    geocode_status: str = "pending",
    location_confidence: str = "none",
    inhibitor_status: str = "passed",
    inhibitor_reason: Optional[str] = None,
    reported_at: Optional[str] = None,
    audio_clip: Optional[str] = None,
    feed_id: Optional[str] = None,
    description: Optional[str] = None,
) -> dict:
    db = _ensure_client()
    incident_id = uuid.uuid4().hex[:12]
    if reported_at is None:
        reported_at = datetime.now(timezone.utc).isoformat()

    payload = {
        "reported_at": reported_at,
        "raw_text": raw_text,
        "severity_category": severity_category,
        "s_base": s_base,
        "location_text": location_text,
        "lat": lat,
        "lng": lng,
        "confidence": confidence,
        "geocode_status": geocode_status,
        "location_confidence": location_confidence,
        "inhibitor_status": inhibitor_status,
        "inhibitor_reason": inhibitor_reason,
        "audio_clip": audio_clip,
        "feed_id": feed_id,
        "description": description,
    }
    ref = db.collection("incidents").document(incident_id)
    ref.set(payload)
    snap = ref.get()
    return _doc_to_row(snap.id, snap.to_dict() or {})


def insert_extraction(
    feed_id: str,
    raw_text: str,
    reported_at: Optional[str] = None,
    audio_clip: Optional[str] = None,
    raw_audio_clip: Optional[str] = None,
    preprocess_meta: Optional[dict] = None,
    variants: Optional[list[dict]] = None,
    llm_relevant: bool = False,
    llm_category: Optional[str] = None,
    llm_confidence: float = 0.0,
    llm_location_text: Optional[str] = None,
    location_confidence: Optional[str] = None,
    inhibitor_status: Optional[str] = None,
    inhibitor_reason: Optional[str] = None,
    geocode_status: Optional[str] = None,
    incident_id: Optional[str] = None,
) -> dict:
    db = _ensure_client()
    eid = uuid.uuid4().hex[:12]
    if reported_at is None:
        reported_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "feed_id": feed_id,
        "raw_text": raw_text,
        "reported_at": reported_at,
        "audio_clip": audio_clip,
        "raw_audio_clip": raw_audio_clip,
        "preprocess_meta": preprocess_meta,
        "variants": variants or [],
        "llm_relevant": llm_relevant,
        "llm_category": llm_category,
        "llm_confidence": llm_confidence,
        "llm_location_text": llm_location_text,
        "location_confidence": location_confidence,
        "inhibitor_status": inhibitor_status,
        "inhibitor_reason": inhibitor_reason,
        "geocode_status": geocode_status,
        "incident_id": incident_id,
    }
    ref = db.collection("extractions").document(eid)
    ref.set(payload)
    return {"id": eid, **payload}


def get_extraction(extraction_id: str) -> Optional[dict]:
    db = _ensure_client()
    snap = db.collection("extractions").document(extraction_id).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    return {"id": snap.id, **data}


def update_extraction(extraction_id: str, updates: dict) -> Optional[dict]:
    db = _ensure_client()
    ref = db.collection("extractions").document(extraction_id)
    ref.update(updates)
    snap = ref.get()
    data = snap.to_dict() or {}
    return {"id": snap.id, **data}


def get_incident(incident_id: str) -> Optional[dict]:
    db = _ensure_client()
    snap = db.collection("incidents").document(incident_id).get()
    if not snap.exists:
        return None
    return _doc_to_row(snap.id, snap.to_dict() or {})


def update_incident(incident_id: str, updates: dict) -> Optional[dict]:
    db = _ensure_client()
    ref = db.collection("incidents").document(incident_id)
    if not ref.get().exists:
        return None
    ref.update(updates)
    snap = ref.get()
    return _doc_to_row(snap.id, snap.to_dict() or {})


def delete_incident(incident_id: str) -> bool:
    db = _ensure_client()
    ref = db.collection("incidents").document(incident_id)
    if not ref.get().exists:
        return False
    ref.delete()
    return True


def list_incidents(
    since: Optional[str] = None,
    category: Optional[str] = None,
    include_blocked: bool = False,
) -> list[dict]:
    db = _ensure_client()
    col = db.collection("incidents")
    rows: list[dict] = []
    try:
        for doc in col.order_by("reported_at", direction=firestore.Query.DESCENDING).stream():
            row = _doc_to_row(doc.id, doc.to_dict() or {})
            if not include_blocked and row.get("inhibitor_status") == "blocked":
                continue
            if since and (row.get("reported_at") or "") < since:
                continue
            if category and row.get("severity_category") != category:
                continue
            rows.append(row)
    except Exception:
        pass
    return rows


def seed_from_json(seed_path: str, s_base_lookup: dict[str, float]) -> int:
    with open(seed_path, "r") as f:
        seeds = json.load(f)

    db = _ensure_client()
    batch = db.batch()
    count = 0
    now = datetime.now(timezone.utc)
    for item in seeds:
        incident_id = uuid.uuid4().hex[:12]
        offset = item.get("reported_at_offset_minutes", 0)
        reported = (now + timedelta(minutes=offset)).isoformat()
        cat = item["severity_category"]
        ref = db.collection("incidents").document(incident_id)
        batch.set(
            ref,
            {
                "reported_at": reported,
                "raw_text": item["raw_text"],
                "severity_category": cat,
                "s_base": s_base_lookup.get(cat, 0.5),
                "location_text": item.get("location_text"),
                "lat": item.get("lat"),
                "lng": item.get("lng"),
                "confidence": item.get("confidence", 0.8),
                "geocode_status": "seeded",
                "inhibitor_status": "passed",
                "inhibitor_reason": None,
            },
        )
        count += 1
        if count % 400 == 0:
            batch.commit()
            batch = db.batch()
    batch.commit()
    return count


def incident_count() -> int:
    db = _ensure_client()
    try:
        agg = db.collection("incidents").count().get()
        return agg[0][0].value
    except Exception:
        return -1


def inhibitor_stats() -> dict:
    db = _ensure_client()
    stats: dict[str, int] = {}
    try:
        for doc in db.collection("incidents").select(["inhibitor_status"]).stream():
            data = doc.to_dict() or {}
            s = str(data.get("inhibitor_status", "unknown"))
            stats[s] = stats.get(s, 0) + 1
    except Exception:
        pass
    return stats
