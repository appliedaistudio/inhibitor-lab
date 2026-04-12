"""
Deterministic slot recommendations for the chat concierge (rewards-weighted).
Reasoning stays internal; only structured slot payloads are returned to clients.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from app.config import settings
from app.utils.geolocation import GeoLocation
from app.utils.validator import AppointmentValidator
from app.utils.weather import get_weather_service

logger = logging.getLogger(__name__)

BOOKING_POINTS = 1500

validator = AppointmentValidator(
    max_per_week=settings.max_appointments_per_week,
    rest_days=settings.rest_days_between_donations,
)


def _snapshot_from_slot(slot: dict) -> dict:
    return {
        "travel_time_mins": slot.get("travel_time_minutes"),
        "wait_time_mins": slot.get("wait_time_mins"),
        "weather": slot.get("weather_label"),
        "friction_score": round(
            (slot.get("travel_time_minutes") or 0) * 0.5
            + (slot.get("wait_time_mins") or 0) * 0.3,
            2,
        )
        if slot.get("travel_time_minutes") is not None or slot.get("wait_time_mins") is not None
        else None,
    }


def _slots_for_target_date(target_date: str, preferred_hour: int) -> list[datetime]:
    """Return candidate Eastern-time datetimes on a specific date (YYYY-MM-DD)."""
    from zoneinfo import ZoneInfo
    EASTERN = ZoneInfo("America/New_York")
    try:
        base = datetime.strptime(target_date, "%Y-%m-%d").replace(tzinfo=EASTERN)
    except ValueError:
        return []
    hours = validator._get_preferred_hours(preferred_hour)
    now = datetime.now(EASTERN)
    return [base.replace(hour=h, minute=0, second=0, microsecond=0) for h in hours if base.replace(hour=h) > now]


async def build_reward_weighted_slots(
    donor_id: str,
    donor: dict,
    db,
    limit: int = 5,
    target_date: Optional[str] = None,
    requested_hour: Optional[int] = None,
) -> list[dict[str, Any]]:
    """
    Build ranked slot options using the same signals as /appointments/get-available-slots,
    filtered by eligibility, then scored for *reward efficiency* (booking bonus + tier progress
    framing uses current points; ranking prioritizes recommendation_score).

    If target_date (YYYY-MM-DD) is provided, only slots on that specific date are returned.
    """
    # Fall back to Philadelphia city center if donor hasn't set coordinates yet
    _DEFAULT_LAT, _DEFAULT_LNG = 39.9526, -75.1652
    if not donor.get("latitude") or not donor.get("longitude"):
        donor = dict(donor)
        donor["latitude"] = _DEFAULT_LAT
        donor["longitude"] = _DEFAULT_LNG

    appointments = await db.appointments.find({"donor_id": donor_id}).to_list(None)
    preferred_hour_map = {"morning": 9, "afternoon": 14, "evening": 18}
    donor_preferred_hour = preferred_hour_map.get(donor.get("preferred_time", "morning"), 9)
    # Explicit clock time from the user takes priority over stored preference
    effective_hour = requested_hour if requested_hour is not None else donor_preferred_hour

    if target_date:
        suggested_times = _slots_for_target_date(target_date, effective_hour)
    else:
        suggested_times = validator.suggest_best_appointment_times(
            appointments, preferred_hour=effective_hour, num_suggestions=14
        )
    centers = await db.donation_centers.find().to_list(None)
    centers_with_distance = GeoLocation.filter_centers_by_distance(
        donor["latitude"], donor["longitude"], centers, max_distance_km=50
    )
    weather_service = get_weather_service()

    raw: list[dict[str, Any]] = []
    for suggested_time in suggested_times:
        for center, distance in centers_with_distance:
            forecast = (
                weather_service.get_forecast(center["latitude"], center["longitude"])
                if weather_service
                else []
            )
            weather_score = (
                weather_service.score_slot_by_weather(
                    suggested_time, donor["latitude"], donor["longitude"], forecast
                )
                if (weather_service and forecast)
                else 1.0
            )
            multiplier = 1.3 if any(e.get("condition") in ["Rain", "Snow"] for e in forecast) else 1.0
            travel_time = GeoLocation.estimate_travel_time(
                donor["latitude"],
                donor["longitude"],
                center["latitude"],
                center["longitude"],
                multiplier,
            )
            base_prob = 1.0 - (donor.get("no_show_rate", 0) * 0.5)
            dist_factor = max(0.8, 1.0 - (distance / 100))
            show_up = base_prob * dist_factor * weather_score
            recommendation_score = weather_score * dist_factor

            # Weather label for snapshot (best-effort)
            w_label = "Clear"
            if forecast:
                w_label = str(forecast[0].get("condition", "Clear"))

            raw.append(
                {
                    "slot_time": suggested_time,
                    "center_id": str(center["_id"]),
                    "center_name": center.get("name", ""),
                    "center_address": center.get("address", ""),
                    "distance_km": round(distance, 1),
                    "travel_time_minutes": travel_time,
                    "weather_score": round(weather_score, 2),
                    "show_up_probability": round(show_up, 2),
                    "recommendation_score": round(recommendation_score, 2),
                    "wait_time_mins": center.get("current_wait_time", 0),
                    "weather_label": w_label,
                }
            )

    raw.sort(key=lambda x: x["recommendation_score"], reverse=True)

    eligible: list[dict[str, Any]] = []
    for slot in raw:
        st = slot["slot_time"]
        if not isinstance(st, datetime):
            continue
        ok, _ = await validator.validate_appointment_slot(
            donor_id=donor_id, proposed_time=st, db=db, reason="chat_suggest"
        )
        if ok:
            eligible.append(slot)
        if len(eligible) >= limit * 3:
            break

    points = int(donor.get("points") or 0)
    for s in eligible:
        # Reward-efficiency score: prioritize likely show-up + strong recommendation; add fixed booking bonus signal
        s["reward_efficiency_score"] = round(
            0.55 * s["recommendation_score"]
            + 0.35 * s["show_up_probability"]
            + 0.10 * min(1.0, BOOKING_POINTS / 100.0),
            4,
        )
        s["booking_points"] = BOOKING_POINTS
        s["points_after_booking"] = points + BOOKING_POINTS

    eligible.sort(key=lambda x: x["reward_efficiency_score"], reverse=True)
    return eligible[:limit]


def slots_for_client(slots: list[dict]) -> list[dict[str, Any]]:
    """Strip internal bookkeeping; safe to send to the frontend."""
    out = []
    for i, s in enumerate(slots):
        st = s.get("slot_time")
        iso = st.isoformat() if isinstance(st, datetime) else str(st)
        out.append(
            {
                "rank": i + 1,
                "center_id": s.get("center_id"),
                "center_name": s.get("center_name"),
                "center_address": s.get("center_address"),
                "slot_time": iso,
                "distance_km": s.get("distance_km"),
                "travel_time_minutes": s.get("travel_time_minutes"),
                "weather": s.get("weather_label"),
                "booking_points": s.get("booking_points", BOOKING_POINTS),
                "points_after_booking": s.get("points_after_booking"),
            }
        )
    return out


def pending_booking_payload(slot: dict) -> dict[str, Any]:
    """Single slot the user can confirm in one step (default = top choice)."""
    st = slot.get("slot_time")
    iso = st.isoformat() if isinstance(st, datetime) else str(st)
    return {
        "center_id": slot.get("center_id"),
        "center_name": slot.get("center_name"),
        "center_address": slot.get("center_address", ""),
        "slot_time": iso,
        "rwd_snapshot": _snapshot_from_slot(slot),
        "booking_points": slot.get("booking_points", BOOKING_POINTS),
    }
