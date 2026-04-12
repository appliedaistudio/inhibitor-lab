"""Incident verification engine for PhillyPulse.

Cross-references scanner-derived incidents against multiple data sources
to assess whether an event likely occurred. Produces a verification_score
(0–100) and a human-readable status.

Sources:
  1. Philadelphia OpenData 911 Dispatch (real-time public feed)
  2. AI plausibility analysis (LLM consistency + geography check)
  3. Internal corroboration (multiple transcripts → same location/time)
"""

import logging
import math
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_URL = "https://api.openai.com/v1/chat/completions"

# Philadelphia 911 calls public API (CARTO / OpenDataPhilly)
PHILLY_911_URL = "https://phl.carto.com/api/v2/sql"
PHILLY_911_QUERY_TEMPLATE = (
    "SELECT dispatch_date_time, text_general_code, location_block, point_x, point_y, dc_dist "
    "FROM incidents_part1_part2 "
    "WHERE dispatch_date_time >= '{since}' "
    "AND point_x IS NOT NULL AND point_y IS NOT NULL "
    "ORDER BY dispatch_date_time DESC LIMIT 200"
)


@dataclass
class VerificationCheck:
    source: str
    passed: bool
    score: int  # 0-100 contribution
    detail: str


@dataclass
class VerificationResult:
    score: int  # 0-100 overall
    status: str  # "verified", "likely", "unverified", "suspicious"
    checks: list[VerificationCheck] = field(default_factory=list)
    summary: str = ""


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = (math.sin(dLat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _status_from_score(score: int) -> str:
    if score >= 75:
        return "verified"
    if score >= 50:
        return "likely"
    if score >= 25:
        return "unverified"
    return "suspicious"


# ── Check 1: Philadelphia 911 Public Data ────────────────────────────

async def _check_philly_911(
    incident_lat: float | None,
    incident_lng: float | None,
    incident_time: str,
    category: str,
) -> VerificationCheck:
    """Query the City of Philadelphia public 911 dispatch feed for
    matching events near the same location and time."""

    if incident_lat is None or incident_lng is None:
        return VerificationCheck(
            source="Philadelphia 911 Data",
            passed=False,
            score=0,
            detail="No coordinates available — cannot cross-reference",
        )

    try:
        dt = datetime.fromisoformat(incident_time.replace("Z", "+00:00"))
    except Exception:
        dt = datetime.now(timezone.utc)

    since = (dt - timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S")
    query = PHILLY_911_QUERY_TEMPLATE.format(since=since)

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(PHILLY_911_URL, params={"q": query})

        if resp.status_code != 200:
            return VerificationCheck(
                source="Philadelphia 911 Data",
                passed=False,
                score=0,
                detail=f"API returned {resp.status_code}",
            )

        data = resp.json()
        rows = data.get("rows", [])
        if not rows:
            return VerificationCheck(
                source="Philadelphia 911 Data",
                passed=False,
                score=0,
                detail="No recent 911 dispatch records found in time window",
            )

        # Find the closest match by distance and time
        best_dist = float("inf")
        best_row = None
        for row in rows:
            rlat = row.get("point_y")
            rlng = row.get("point_x")
            if rlat is None or rlng is None:
                continue
            dist = _haversine_km(incident_lat, incident_lng, float(rlat), float(rlng))
            if dist < best_dist:
                best_dist = dist
                best_row = row

        if best_dist <= 0.5:
            return VerificationCheck(
                source="Philadelphia 911 Data",
                passed=True,
                score=40,
                detail=f"Matching 911 dispatch found {best_dist:.0f}m away — \"{best_row.get('text_general_code', 'N/A')}\"",
            )
        elif best_dist <= 1.5:
            return VerificationCheck(
                source="Philadelphia 911 Data",
                passed=True,
                score=20,
                detail=f"Similar 911 dispatch {best_dist:.1f}km away — \"{best_row.get('text_general_code', 'N/A')}\"",
            )
        else:
            return VerificationCheck(
                source="Philadelphia 911 Data",
                passed=False,
                score=0,
                detail=f"No matching 911 dispatch within 1.5km (nearest: {best_dist:.1f}km)",
            )

    except httpx.TimeoutException:
        return VerificationCheck(source="Philadelphia 911 Data", passed=False, score=0, detail="911 data API timed out")
    except Exception as e:
        logger.warning("911 data check failed: %s", e)
        return VerificationCheck(source="Philadelphia 911 Data", passed=False, score=0, detail=f"Error: {e}")


# ── Check 2: AI Plausibility Analysis ───────────────────────────────

async def _check_ai_plausibility(
    raw_text: str,
    category: str,
    location_text: str | None,
    confidence: float,
    lat: float | None,
    lng: float | None,
) -> VerificationCheck:
    """Use an LLM to analyze whether the transcript is plausible:
    does it sound like real dispatcher language, is the location real,
    does the category match the description?"""

    if not OPENAI_API_KEY:
        base = int(confidence * 20)
        return VerificationCheck(
            source="AI Plausibility",
            passed=confidence >= 0.6,
            score=base,
            detail=f"OpenAI not configured — using extraction confidence ({confidence:.0%})",
        )

    prompt = f"""You are a verification analyst for a community safety platform.
Analyze this police scanner transcript and determine if it appears to be a genuine, plausible dispatch event.

Transcript: "{raw_text}"
Extracted category: {category}
Extracted location: {location_text or "Unknown"}
Extraction confidence: {confidence:.0%}
Coordinates: {f"{lat:.4f}, {lng:.4f}" if lat and lng else "None"}

Evaluate on these criteria and return ONLY a JSON object:
- "language_authentic": boolean — Does this sound like real police/fire/EMS radio language?
- "category_matches": boolean — Does the category match what the transcript describes?
- "location_specific": boolean — Is a specific, real Philadelphia location mentioned?
- "internally_consistent": boolean — Is the transcript internally consistent (no contradictions)?
- "plausibility_score": integer 0-100 — Overall plausibility
- "reasoning": string — Brief 1-sentence explanation

Output ONLY valid JSON."""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                OPENAI_URL,
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": OPENAI_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.0,
                    "max_tokens": 300,
                },
            )

        if resp.status_code != 200:
            return VerificationCheck(source="AI Plausibility", passed=False, score=0, detail=f"LLM returned {resp.status_code}")

        import json
        content = resp.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            lines = content.split("\n")
            lines = [l for l in lines if not l.startswith("```")]
            content = "\n".join(lines).strip()

        result = json.loads(content)
        score = min(35, int(result.get("plausibility_score", 50) * 0.35))
        reasoning = result.get("reasoning", "No explanation provided")

        criteria_met = sum([
            result.get("language_authentic", False),
            result.get("category_matches", False),
            result.get("location_specific", False),
            result.get("internally_consistent", False),
        ])

        return VerificationCheck(
            source="AI Plausibility",
            passed=criteria_met >= 3,
            score=score,
            detail=f"{criteria_met}/4 criteria met — {reasoning}",
        )

    except Exception as e:
        logger.warning("AI plausibility check failed: %s", e)
        base = int(confidence * 15)
        return VerificationCheck(source="AI Plausibility", passed=False, score=base, detail=f"Analysis failed: {e}")


# ── Check 3: Internal Corroboration ─────────────────────────────────

def _check_corroboration(
    incident_id: str,
    incident_lat: float | None,
    incident_lng: float | None,
    incident_time: str,
    all_incidents: list[dict],
) -> VerificationCheck:
    """Check if other scanner transcripts describe a similar event
    at a nearby location within a short time window."""

    if incident_lat is None or incident_lng is None:
        return VerificationCheck(
            source="Internal Corroboration",
            passed=False,
            score=0,
            detail="No coordinates — cannot check for corroborating reports",
        )

    try:
        dt = datetime.fromisoformat(incident_time.replace("Z", "+00:00"))
    except Exception:
        dt = datetime.now(timezone.utc)

    window = timedelta(hours=2)
    corroborating = 0

    for other in all_incidents:
        if other["id"] == incident_id:
            continue
        if other.get("lat") is None or other.get("lng") is None:
            continue
        try:
            other_dt = datetime.fromisoformat(other["reported_at"].replace("Z", "+00:00"))
        except Exception:
            continue
        if abs((dt - other_dt).total_seconds()) > window.total_seconds():
            continue
        dist = _haversine_km(incident_lat, incident_lng, other["lat"], other["lng"])
        if dist <= 0.8:
            corroborating += 1

    if corroborating >= 2:
        return VerificationCheck(
            source="Internal Corroboration",
            passed=True,
            score=25,
            detail=f"{corroborating} other scanner reports within 800m and 2hrs",
        )
    elif corroborating == 1:
        return VerificationCheck(
            source="Internal Corroboration",
            passed=True,
            score=15,
            detail="1 other scanner report nearby — partial corroboration",
        )
    else:
        return VerificationCheck(
            source="Internal Corroboration",
            passed=False,
            score=5,
            detail="No corroborating scanner reports found (single source)",
        )


# ── Main Verification Entry Point ───────────────────────────────────

async def verify_incident(
    incident: dict,
    all_incidents: list[dict],
) -> VerificationResult:
    """Run all verification checks on an incident and return a composite result."""

    checks: list[VerificationCheck] = []

    # Check 1: Philadelphia 911 public data
    check_911 = await _check_philly_911(
        incident.get("lat"),
        incident.get("lng"),
        incident.get("reported_at", ""),
        incident.get("severity_category", ""),
    )
    checks.append(check_911)

    # Check 2: AI plausibility
    check_ai = await _check_ai_plausibility(
        incident.get("raw_text", ""),
        incident.get("severity_category", ""),
        incident.get("location_text"),
        incident.get("confidence", 0.5),
        incident.get("lat"),
        incident.get("lng"),
    )
    checks.append(check_ai)

    # Check 3: Internal corroboration
    check_corr = _check_corroboration(
        incident["id"],
        incident.get("lat"),
        incident.get("lng"),
        incident.get("reported_at", ""),
        all_incidents,
    )
    checks.append(check_corr)

    total_score = sum(c.score for c in checks)
    total_score = max(0, min(100, total_score))
    status = _status_from_score(total_score)

    passed_sources = [c.source for c in checks if c.passed]
    if passed_sources:
        summary = f"Corroborated by: {', '.join(passed_sources)}"
    else:
        summary = "No external corroboration found — treat as unverified"

    return VerificationResult(
        score=total_score,
        status=status,
        checks=checks,
        summary=summary,
    )
