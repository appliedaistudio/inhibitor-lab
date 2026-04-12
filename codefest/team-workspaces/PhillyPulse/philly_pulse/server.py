"""FastAPI server for PhillyPulse.

Serves the PhillyPulse API: ingest, incidents, admin, health.
"""

import json
import logging
import os
import random
import re
import subprocess
from datetime import datetime, date, timezone
from pathlib import Path

import httpx
import numpy as np
import yaml
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from . import admin_events, geocode, inhibitor, llm, persistence as store, weights

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# When False, ingest only stores raw transcript+audio — no LLM/inhibitor/geocode.
# Flip to True (or set env PHILLY_PULSE_LLM_AUTO=1) to resume automatic processing.
LLM_AUTO_ENABLED = os.environ.get("PHILLY_PULSE_LLM_AUTO", "0").strip().lower() in ("1", "true", "yes")

app = FastAPI(title="PhillyPulse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Broadcastify config for audio proxy
_config_path = Path(__file__).resolve().parent.parent / "config.yaml"
_bf_username = ""
_bf_password = ""
_bf_config: dict = {}
PHILLY_FEEDS = [
    {"feed_id": "4603",  "label": "PPD Citywide"},
    {"feed_id": "17310", "label": "PPD Central"},
    {"feed_id": "21297", "label": "PPD East"},
    {"feed_id": "45495", "label": "PPD Northeast"},
    {"feed_id": "18836", "label": "PPD Northwest"},
    {"feed_id": "15102", "label": "PPD South"},
    {"feed_id": "15195", "label": "PPD Southwest/West"},
    {"feed_id": "34250", "label": "PFD South Fire/Medics"},
    {"feed_id": "15747", "label": "PFD North Fire"},
]
if _config_path.exists():
    try:
        with open(_config_path, "r") as f:
            _cfg = yaml.safe_load(f)
        _bf_username = _cfg.get("credentials", {}).get("username", "")
        _bf_password = _cfg.get("credentials", {}).get("password", "")
        _bf_config = _cfg
    except Exception:
        pass

DATA_DIR = Path(__file__).parent / "data"
SEED_PATH = DATA_DIR / "seed_incidents.json"

CANNED_TRANSCRIPTS = [
    "All units, armed robbery at the CVS on Girard Avenue and Broad Street, suspect fleeing on foot northbound",
    "Medic 3, overdose at Emerald and Allegheny, bystanders performing CPR",
    "Engine 11 responding to a kitchen fire, 1500 block of Spruce Street, smoke visible",
    "Report of shots fired at 22nd and Lehigh, multiple callers, no victims located yet",
    "Two-car MVA with injuries at Cobbs Creek Parkway and Baltimore Avenue, one vehicle flipped",
    "Disturbance at the Gallery mall, security reports a large fight near the food court",
    "52B3 responding to a burglary in progress at 4700 block of Chester Avenue",
    "Medical assist, child fell from playground equipment, Clark Park, 43rd and Baltimore",
]


class IngestRequest(BaseModel):
    text: str
    timestamp: str | None = None
    feed_id: str | None = None
    audio_clip: str | None = None
    raw_audio_clip: str | None = None
    preprocess_meta: dict | None = None
    variants: list[dict] | None = None


class RouteDirectionsRequest(BaseModel):
    """Waypoints as [lat, lng] pairs; mode matches frontend TransportMode."""

    waypoints: list[list[float]]
    mode: str = "driving-car"


OSRM_BASE = "https://router.project-osrm.org/route/v1"
OSRM_PROFILES = {
    "foot-walking": "foot",
    "cycling-regular": "bike",
    "driving-car": "car",
}


@app.on_event("startup")
async def startup():
    """Ensure the database table exists (but don't auto-seed)."""
    store.get_conn()  # creates table if missing


@app.get("/api/health")
async def health():
    try:
        count = store.incident_count()
    except Exception:
        count = -1
    return {
        "status": "ok",
        "llm_configured": bool(llm.OPENAI_API_KEY),
        "inhibitor_configured": bool(inhibitor.INHIBITOR_API_KEY),
        "incident_count": count,
    }


@app.post("/api/route-directions")
async def route_directions(body: RouteDirectionsRequest):
    """Proxy to OSRM so the browser gets street geometry (avoids public OSRM CORS blocks)."""
    if len(body.waypoints) < 2:
        raise HTTPException(status_code=400, detail="Need at least two waypoints")
    for w in body.waypoints:
        if len(w) != 2:
            raise HTTPException(status_code=400, detail="Each waypoint must be [lat, lng]")
    profile = OSRM_PROFILES.get(body.mode, "car")
    # OSRM expects lon,lat;lon,lat;...
    coord_str = ";".join(f"{w[1]},{w[0]}" for w in body.waypoints)
    url = f"{OSRM_BASE}/{profile}/{coord_str}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                url,
                params={"overview": "full", "geometries": "geojson"},
                headers={"User-Agent": "PhillyPulse/1.0"},
            )
    except httpx.RequestError as e:
        logger.warning("OSRM request failed: %s", e)
        raise HTTPException(status_code=502, detail="Routing service unreachable") from e

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502, detail=f"OSRM error HTTP {resp.status_code}"
        )
    data = resp.json()
    if data.get("code") not in (None, "Ok"):
        raise HTTPException(
            status_code=404,
            detail=data.get("message") or data.get("code") or "No route",
        )
    routes = data.get("routes") or []
    if not routes:
        raise HTTPException(status_code=404, detail="No route found for these waypoints")
    route = routes[0]
    coords = route.get("geometry", {}).get("coordinates") or []
    if len(coords) < 2:
        raise HTTPException(status_code=502, detail="Invalid route geometry")
    # GeoJSON is [lng, lat]; frontend / Leaflet expect [lat, lng]
    geometry = [[float(pt[1]), float(pt[0])] for pt in coords]
    return {
        "geometry": geometry,
        "distanceKm": route["distance"] / 1000.0,
        "durationMin": route["duration"] / 60.0,
    }


@app.post("/api/ingest")
async def ingest(req: IngestRequest):
    """Ingest a scanner transcript.

    When LLM_AUTO_ENABLED is False (default), only store the raw
    transcript + audio as an extraction — no LLM / inhibitor / geocode.
    When True, run the full pipeline.
    """

    feed_id = req.feed_id or "unknown"

    # Normalize time-only timestamps (e.g. "14:30:00") to full ISO
    ts = req.timestamp
    if ts and re.match(r"^\d{1,2}:\d{2}(:\d{2})?$", ts.strip()):
        ts = f"{date.today().isoformat()}T{ts.strip()}"
    req_timestamp = ts or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    correlation = f"{feed_id}_{req_timestamp}"

    effective_audio_clip = req.audio_clip
    if not effective_audio_clip and req.variants:
        for v in req.variants:
            if v.get("name") == "aggressive" and v.get("audio_clip"):
                effective_audio_clip = v["audio_clip"]
                break
        if not effective_audio_clip and req.variants:
            effective_audio_clip = req.variants[0].get("audio_clip")

    # Broadcast: transcript received
    await admin_events.broadcast({
        "type": "transcript_received",
        "correlation": correlation,
        "feed_id": feed_id,
        "text": req.text,
        "timestamp": req_timestamp,
    })

    # ── Collection-only mode (LLM paused) ──────────────────────────
    if not LLM_AUTO_ENABLED:
        store.insert_extraction(
            feed_id=feed_id,
            raw_text=req.text,
            reported_at=req_timestamp,
            audio_clip=effective_audio_clip,
            raw_audio_clip=req.raw_audio_clip,
            preprocess_meta=req.preprocess_meta,
            variants=req.variants,
        )
        return {"status": "collected", "reason": "LLM auto-processing paused; raw transcript stored"}

    # ── Full pipeline mode ──────────────────────────────────────────
    await admin_events.broadcast({
        "type": "llm_started",
        "correlation": correlation,
        "feed_id": feed_id,
    })

    try:
        extraction = await llm.extract_incident(req.text)
    except llm.LLMError as e:
        await admin_events.broadcast({
            "type": "llm_error",
            "correlation": correlation,
            "feed_id": feed_id,
            "error": str(e),
        })
        logger.warning("LLM failed, storing raw extraction: %s", e)
        store.insert_extraction(
            feed_id=feed_id,
            raw_text=req.text,
            reported_at=req_timestamp,
            audio_clip=effective_audio_clip,
            raw_audio_clip=req.raw_audio_clip,
            preprocess_meta=req.preprocess_meta,
            variants=req.variants,
        )
        return {"status": "collected", "reason": f"LLM error, raw stored: {e}"}

    if extraction is None:
        await admin_events.broadcast({
            "type": "llm_result",
            "correlation": correlation,
            "feed_id": feed_id,
            "is_relevant": False,
            "category": "admin_or_noise",
            "confidence": 0,
            "location_text": None,
        })
        store.insert_extraction(
            feed_id=feed_id,
            raw_text=req.text,
            reported_at=req_timestamp,
            audio_clip=effective_audio_clip,
            raw_audio_clip=req.raw_audio_clip,
            preprocess_meta=req.preprocess_meta,
            variants=req.variants,
            llm_relevant=False,
            llm_confidence=0.0,
        )
        return {"status": "rejected", "reason": "Not dispatch-relevant"}

    category = extraction["severity_category"]
    location_text = extraction["location_text"]
    confidence = extraction["confidence"]
    description = extraction.get("description")
    llm_lat = extraction.get("llm_lat")
    llm_lng = extraction.get("llm_lng")
    s_base = weights.get_s_base(category)

    await admin_events.broadcast({
        "type": "llm_result",
        "correlation": correlation,
        "feed_id": feed_id,
        "is_relevant": True,
        "category": category,
        "confidence": confidence,
        "location_text": location_text,
        "llm_lat": llm_lat,
        "llm_lng": llm_lng,
        "s_base": s_base,
    })

    # Inhibitor ethical guardrail
    inh = await inhibitor.check_incident(
        raw_transcript=req.text,
        severity_category=category,
        location_text=location_text,
        confidence=confidence,
    )

    await admin_events.broadcast({
        "type": "inhibitor_result",
        "correlation": correlation,
        "feed_id": feed_id,
        "status": inh.status,
        "reason": inh.reason,
    })

    location_confidence = extraction.get("location_confidence", "none")

    if inh.status == "blocked":
        incident = store.insert_incident(
            raw_text=req.text,
            severity_category=category,
            s_base=s_base,
            confidence=confidence,
            location_text=location_text,
            inhibitor_status="blocked",
            inhibitor_reason=inh.reason,
            feed_id=feed_id,
            audio_clip=effective_audio_clip,
            location_confidence=location_confidence,
            description=description,
        )
        await admin_events.broadcast({
            "type": "incident_stored",
            "correlation": correlation,
            "feed_id": feed_id,
            "outcome": "blocked",
            "incident_id": incident["id"],
        })
        store.insert_extraction(
            feed_id=feed_id,
            raw_text=req.text,
            reported_at=req_timestamp,
            audio_clip=effective_audio_clip,
            raw_audio_clip=req.raw_audio_clip,
            preprocess_meta=req.preprocess_meta,
            variants=req.variants,
            llm_relevant=True,
            llm_category=category,
            llm_confidence=confidence,
            llm_location_text=location_text,
            location_confidence=location_confidence,
            inhibitor_status="blocked",
            inhibitor_reason=inh.reason,
            incident_id=incident["id"],
        )
        return {
            "status": "blocked",
            "reason": inh.reason,
            "incident_id": incident["id"],
        }

    # 3-tier location resolution
    location_confidence = extraction.get("location_confidence", "none")
    lat, lng = None, None
    geocode_status = "failed"

    # Tier 1 & 2: geocode the location text (direct or context)
    if location_text:
        coords = await geocode.geocode(location_text)
        if coords:
            lat, lng = coords
            geocode_status = f"success_{location_confidence}"
        elif llm_lat is not None and llm_lng is not None:
            lat, lng = llm_lat, llm_lng
            geocode_status = f"llm_fallback_{location_confidence}"
        else:
            geocode_status = f"no_result_{location_confidence}"
    elif llm_lat is not None and llm_lng is not None:
        lat, lng = llm_lat, llm_lng
        geocode_status = "llm_fallback"

    await admin_events.broadcast({
        "type": "geocode_result",
        "correlation": correlation,
        "feed_id": feed_id,
        "lat": lat,
        "lng": lng,
        "method": geocode_status,
        "location_confidence": location_confidence,
    })

    # Only create an incident if we have a real location (Tier 1 or 2)
    incident_id = None
    if lat is not None and lng is not None:
        incident = store.insert_incident(
            raw_text=req.text,
            severity_category=category,
            s_base=s_base,
            confidence=confidence,
            location_text=location_text,
            lat=lat,
            lng=lng,
            geocode_status=geocode_status,
            location_confidence=location_confidence,
            inhibitor_status=inh.status,
            inhibitor_reason=inh.reason,
            reported_at=req_timestamp,
            audio_clip=effective_audio_clip,
            feed_id=feed_id,
            description=description,
        )
        incident_id = incident["id"]

        await admin_events.broadcast({
            "type": "incident_stored",
            "correlation": correlation,
            "feed_id": feed_id,
            "outcome": "created",
            "incident_id": incident_id,
            "category": category,
            "confidence": confidence,
            "location_text": location_text,
            "lat": lat,
            "lng": lng,
        })

    store.insert_extraction(
        feed_id=feed_id,
        raw_text=req.text,
        reported_at=req_timestamp,
        audio_clip=effective_audio_clip,
        raw_audio_clip=req.raw_audio_clip,
        preprocess_meta=req.preprocess_meta,
        variants=req.variants,
        llm_relevant=True,
        llm_category=category,
        llm_confidence=confidence,
        llm_location_text=location_text,
        location_confidence=location_confidence,
        inhibitor_status=inh.status,
        inhibitor_reason=inh.reason,
        geocode_status=geocode_status,
        incident_id=incident_id,
    )

    if incident_id:
        return {"status": "created", "incident": incident}
    return {"status": "no_location", "extraction_only": True}


@app.get("/api/incidents")
async def get_incidents(
    since: str | None = Query(None, description="ISO timestamp filter"),
    category: str | None = Query(None, description="Severity category filter"),
):
    """Return all displayable incidents with computed w_eff."""
    try:
        incidents = store.list_incidents(since=since, category=category)
        incidents = weights.enrich_incidents(incidents)
    except Exception:
        incidents = []
    return {"incidents": incidents}


@app.post("/api/seed")
async def seed():
    """Load pre-built demo incidents into the database. Idempotent panic button."""
    if not SEED_PATH.exists():
        raise HTTPException(status_code=404, detail="Seed data file not found")
    s_base_map = {cat: weights.get_s_base(cat) for cat in llm.SEVERITY_CATEGORIES}
    count = store.seed_from_json(str(SEED_PATH), s_base_map)
    logger.info("Seeded %d demo incidents on demand", count)
    return {"status": "seeded", "count": count}


@app.post("/api/simulate")
async def simulate():
    """Ingest a random canned transcript through the full pipeline. For demos."""
    transcript = random.choice(CANNED_TRANSCRIPTS)
    req = IngestRequest(text=transcript)
    return await ingest(req)


@app.get("/api/summary")
async def summary():
    """AI-generated natural language summary of recent activity."""
    incidents = store.list_incidents()
    recent = incidents[:20]

    if not recent:
        return {"summary": "No recent incidents to summarize.", "incident_count": 0}

    if not llm.OPENAI_API_KEY:
        lines = [
            f"- {inc['severity_category'].replace('_', ' ').title()}: "
            f"{inc.get('location_text', 'Unknown location')}"
            for inc in recent[:10]
        ]
        return {
            "summary": f"{len(recent)} recent incidents in Philadelphia:\n" + "\n".join(lines),
            "incident_count": len(recent),
        }

    # Build a summary prompt from recent incidents
    incident_lines = []
    for inc in recent[:15]:
        loc = inc.get("location_text", "Unknown location")
        cat = inc["severity_category"].replace("_", " ")
        incident_lines.append(f"- {cat} at {loc} (confidence: {inc.get('confidence', 'N/A')})")

    prompt = (
        "You are a helpful assistant that summarizes recent public safety activity "
        "in Philadelphia. Given the following recent incidents extracted from police "
        "scanner audio (all UNVERIFIED), write a brief 2-3 sentence summary suitable "
        "for display on a community safety dashboard. Be factual, mention specific "
        "neighborhoods, and note that all data is unverified scanner audio.\n\n"
        "Recent incidents:\n" + "\n".join(incident_lines)
    )

    import httpx
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                llm.OPENAI_URL,
                headers={
                    "Authorization": f"Bearer {llm.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": llm.OPENAI_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 200,
                },
            )
        if resp.status_code == 200:
            text = resp.json()["choices"][0]["message"]["content"].strip()
            return {"summary": text, "incident_count": len(recent)}
    except Exception as e:
        logger.warning("Summary LLM call failed: %s", e)

    return {
        "summary": f"{len(recent)} recent incidents across Philadelphia. Check the map for details.",
        "incident_count": len(recent),
    }


@app.get("/api/stats")
async def stats():
    """Inhibitor audit stats for the transparency page."""
    return {
        "total_incidents": store.incident_count(),
        "inhibitor_stats": store.inhibitor_stats(),
    }


# ── Admin endpoints ─────────────────────────────────────────────────

@app.websocket("/ws/admin")
async def admin_ws(ws: WebSocket):
    """WebSocket stream of all pipeline events for the admin panel."""
    await admin_events.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await admin_events.disconnect(ws)


@app.get("/api/admin/feeds")
async def admin_feeds():
    """List of available Broadcastify feeds."""
    return {"feeds": PHILLY_FEEDS}


class PredictRequest(BaseModel):
    extraction_id: str


class VisibilityRequest(BaseModel):
    hidden: bool


@app.post("/api/admin/incident/{incident_id}/visibility")
async def admin_toggle_visibility(incident_id: str, req: VisibilityRequest):
    """Toggle an incident's visibility on the public map."""
    result = store.update_incident(incident_id, {"hidden": req.hidden})
    if result is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"status": "ok", "incident_id": incident_id, "hidden": req.hidden}


@app.delete("/api/admin/incident/{incident_id}")
async def admin_delete_incident(incident_id: str):
    """Permanently delete an incident."""
    ok = store.delete_incident(incident_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"status": "deleted", "incident_id": incident_id}


@app.post("/api/admin/predict")
async def admin_predict(req: PredictRequest):
    """Run the full LLM + inhibitor + geocode pipeline on a stored extraction.

    Used for manual evaluation when LLM_AUTO_ENABLED is off.
    """
    ext = store.get_extraction(req.extraction_id)
    if ext is None:
        raise HTTPException(status_code=404, detail="Extraction not found")

    raw_text = ext.get("raw_text", "")
    feed_id = ext.get("feed_id", "unknown")
    audio_clip = ext.get("audio_clip")
    reported_at = ext.get("reported_at")
    if reported_at and re.match(r"^\d{1,2}:\d{2}(:\d{2})?$", str(reported_at).strip()):
        reported_at = f"{date.today().isoformat()}T{str(reported_at).strip()}"

    # LLM extraction
    try:
        result = await llm.extract_incident(raw_text)
    except llm.LLMError as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    if result is None:
        store.update_extraction(req.extraction_id, {
            "llm_relevant": False,
            "llm_confidence": 0.0,
            "llm_category": None,
            "llm_location_text": None,
        })
        return {"status": "not_relevant", "extraction_id": req.extraction_id}

    category = result["severity_category"]
    location_text = result["location_text"]
    confidence = result["confidence"]
    llm_lat = result.get("llm_lat")
    llm_lng = result.get("llm_lng")
    s_base = weights.get_s_base(category)

    # Inhibitor
    inh = await inhibitor.check_incident(
        raw_transcript=raw_text,
        severity_category=category,
        location_text=location_text,
        confidence=confidence,
    )

    # 3-tier geocode
    location_confidence = result.get("location_confidence", "none")
    lat, lng = None, None
    geocode_status = "failed"
    if location_text:
        coords = await geocode.geocode(location_text)
        if coords:
            lat, lng = coords
            geocode_status = f"success_{location_confidence}"
        elif llm_lat is not None and llm_lng is not None:
            lat, lng = llm_lat, llm_lng
            geocode_status = f"llm_fallback_{location_confidence}"
        else:
            geocode_status = f"no_result_{location_confidence}"
    elif llm_lat is not None and llm_lng is not None:
        lat, lng = llm_lat, llm_lng
        geocode_status = "llm_fallback"

    store.update_extraction(req.extraction_id, {
        "llm_relevant": True,
        "llm_category": category,
        "llm_confidence": confidence,
        "llm_location_text": location_text,
        "location_confidence": location_confidence,
        "inhibitor_status": inh.status,
        "inhibitor_reason": inh.reason,
        "geocode_status": geocode_status,
    })

    return {
        "status": "predicted",
        "extraction_id": req.extraction_id,
        "llm_relevant": True,
        "category": category,
        "confidence": confidence,
        "location_text": location_text,
        "location_confidence": location_confidence,
        "inhibitor_status": inh.status,
        "inhibitor_reason": inh.reason,
        "geocode_status": geocode_status,
        "lat": lat,
        "lng": lng,
    }


class RetranscribeRequest(BaseModel):
    extraction_id: str
    highpass_hz: int = 100
    vad_aggressiveness: int | None = 1
    norm_percentile: int | None = 95
    beam_size: int = 5


@app.post("/api/admin/retranscribe")
async def admin_retranscribe(req: RetranscribeRequest):
    """Re-preprocess + re-transcribe an extraction with custom params.

    Reads the raw audio clip from disk, applies the specified preprocessing,
    runs Whisper, saves a new processed clip, and appends the result to the
    extraction's variants array as 'custom_N'.
    """
    from .preprocess import VariantConfig, preprocess_audio

    ext = store.get_extraction(req.extraction_id)
    if ext is None:
        raise HTTPException(status_code=404, detail="Extraction not found")

    raw_clip_id = ext.get("raw_audio_clip")
    if not raw_clip_id:
        raise HTTPException(status_code=400, detail="No raw audio clip stored for this extraction")

    raw_path = Path("audio_clips_raw") / f"{raw_clip_id}.wav"
    if not raw_path.exists():
        raise HTTPException(status_code=404, detail="Raw audio file not found on disk")

    import wave as _wave
    with _wave.open(str(raw_path), "r") as wf:
        n_frames = wf.getnframes()
        raw_bytes = wf.readframes(n_frames)
        raw_pcm = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    cfg = VariantConfig(
        name="custom",
        highpass_hz=req.highpass_hz,
        vad_aggressiveness=req.vad_aggressiveness,
        norm_percentile=req.norm_percentile,
    )
    processed, meta = preprocess_audio(raw_pcm, cfg)

    from faster_whisper import WhisperModel as _WM

    _model_size = _bf_config.get("tuning", {}).get("model_size", "base") if _bf_config else "base"
    _language = _bf_config.get("tuning", {}).get("language", "en") if _bf_config else "en"
    _initial_prompt = _bf_config.get("tuning", {}).get("initial_prompt", "") if _bf_config else ""
    _no_speech = _bf_config.get("tuning", {}).get("no_speech_threshold", 0.6) if _bf_config else 0.6

    whisper = _WM(_model_size, device="cpu", compute_type="int8", cpu_threads=2)
    segments, _info = whisper.transcribe(
        processed,
        language=_language,
        initial_prompt=_initial_prompt,
        condition_on_previous_text=False,
        temperature=0.0,
        beam_size=req.beam_size,
        patience=1.5,
        suppress_blank=True,
        no_speech_threshold=_no_speech,
    )
    segments = list(segments)
    text = " ".join(s.text for s in segments).strip()
    no_speech_prob = max((s.no_speech_prob for s in segments), default=0)
    duration_s = round(len(processed) / 16000, 2)

    import uuid as _uuid
    clip_id = _uuid.uuid4().hex[:12]
    clip_path = Path("audio_clips") / f"{clip_id}.wav"
    pcm_out = (processed * 32767).astype(np.int16)
    with _wave.open(str(clip_path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(pcm_out.tobytes())

    existing_variants = ext.get("variants") or []
    custom_count = sum(1 for v in existing_variants if v.get("name", "").startswith("custom"))

    new_variant = {
        "name": f"custom_{custom_count + 1}",
        "audio_clip": clip_id,
        "transcript": text,
        "preprocess_meta": meta,
        "whisper_meta": {
            "no_speech_prob": round(no_speech_prob, 4),
            "duration_s": duration_s,
        },
    }

    existing_variants.append(new_variant)
    store.update_extraction(req.extraction_id, {"variants": existing_variants})

    del whisper
    import gc
    gc.collect()

    return {"status": "ok", "variant": new_variant}


@app.get("/api/admin/stream/{feed_id}")
async def admin_stream(feed_id: str):
    """Proxy a Broadcastify MP3 stream for the admin audio player."""
    if not _bf_username or not _bf_password:
        raise HTTPException(status_code=503, detail="Broadcastify credentials not configured")

    valid_ids = {f["feed_id"] for f in PHILLY_FEEDS}
    if feed_id not in valid_ids:
        raise HTTPException(status_code=404, detail=f"Unknown feed_id: {feed_id}")

    url = f"http://{_bf_username}:{_bf_password}@audio.broadcastify.com/{feed_id}.mp3"

    def stream_audio():
        proc = subprocess.Popen(
            [
                "ffmpeg", "-reconnect", "1", "-reconnect_streamed", "1",
                "-reconnect_delay_max", "5", "-i", url,
                "-acodec", "libmp3lame", "-ab", "64k", "-ar", "22050", "-ac", "1",
                "-f", "mp3", "-loglevel", "quiet", "-",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
        try:
            while True:
                chunk = proc.stdout.read(4096)
                if not chunk:
                    break
                yield chunk
        finally:
            proc.kill()
            proc.wait()

    return StreamingResponse(stream_audio(), media_type="audio/mpeg")


@app.get("/api/audio/{clip_id}")
async def get_audio_clip(clip_id: str):
    """Serve a saved processed audio clip WAV file by its clip ID."""
    import re
    if not re.fullmatch(r"[a-f0-9]{12}", clip_id):
        raise HTTPException(status_code=400, detail="Invalid clip ID")

    clip_path = Path(__file__).resolve().parent.parent / "audio_clips" / f"{clip_id}.wav"
    if not clip_path.exists():
        raise HTTPException(status_code=404, detail="Audio clip not found")

    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(clip_path),
        media_type="audio/wav",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.get("/api/audio-raw/{clip_id}")
async def get_raw_audio_clip(clip_id: str):
    """Serve a saved raw (pre-normalization) audio clip WAV file."""
    import re
    if not re.fullmatch(r"[a-f0-9]{12}", clip_id):
        raise HTTPException(status_code=400, detail="Invalid clip ID")

    clip_path = Path(__file__).resolve().parent.parent / "audio_clips_raw" / f"{clip_id}.wav"
    if not clip_path.exists():
        raise HTTPException(status_code=404, detail="Raw audio clip not found")

    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(clip_path),
        media_type="audio/wav",
        headers={"Cache-Control": "public, max-age=86400"},
    )
