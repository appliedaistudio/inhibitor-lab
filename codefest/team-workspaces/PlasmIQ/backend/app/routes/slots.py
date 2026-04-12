"""
Slots router — returns capacity-aware time slots for a center on a given date.

Slot templates live in the `slot_templates` collection and are designed to be
modified by an admin panel in a later stage. Each template owns:
  - which days of the week are active (0=Mon … 6=Sun)
  - a list of {time, capacity} objects (admin-editable)
  - an is_active flag to disable a center's schedule entirely

GET /api/slots/{center_id}?date=YYYY-MM-DD
  → returns each slot with booked/available counts so the frontend can
    render a live capacity grid without any extra state.
"""

import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId

from app.utils.db import get_database

router = APIRouter()
logger = logging.getLogger(__name__)


def _slot_window(date_str: str, time_str: str) -> tuple[datetime, datetime]:
    """Return (start, end) datetimes for a 30-minute slot window."""
    start = datetime.fromisoformat(f"{date_str}T{time_str}:00").replace(
        tzinfo=timezone.utc
    )
    end = start + timedelta(minutes=30)
    return start, end


@router.get("/{center_id}")
async def get_slots(
    center_id: str,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db=None,
):
    """
    Return time slots for a center on a specific date, annotated with
    booked/available counts.  Full slots are returned with available=0
    so the UI can grey them out.
    """
    if db is None:
        from app.utils.db import get_database as _gdb
        db = _gdb()

    if not ObjectId.is_valid(center_id):
        raise HTTPException(status_code=400, detail="Invalid center ID.")

    # Validate date format
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    day_of_week = target_date.weekday()  # 0=Mon … 6=Sun

    # Load slot template for this center
    template = await db.slot_templates.find_one({"center_id": center_id})
    if not template:
        raise HTTPException(status_code=404, detail="No slot template found for this center.")

    if not template.get("is_active", True):
        return {"date": date, "center_id": center_id, "day_active": False, "slots": []}

    if day_of_week not in template.get("days_active", []):
        return {"date": date, "center_id": center_id, "day_active": False, "slots": []}

    raw_slots = template.get("slots", [])

    # Count bookings already made for each slot window on this date
    day_start = datetime.fromisoformat(f"{date}T00:00:00").replace(tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    existing = await db.appointments.find({
        "center_id": center_id,
        "status": {"$nin": ["cancelled", "rescheduled"]},
        "scheduled_time": {"$gte": day_start, "$lt": day_end},
    }).to_list(500)

    # Build a dict: "HH:MM" → booked count
    booked_counts: dict[str, int] = {}
    for appt in existing:
        scheduled = appt.get("scheduled_time")
        if isinstance(scheduled, datetime):
            slot_key = scheduled.strftime("%H:%M")
            booked_counts[slot_key] = booked_counts.get(slot_key, 0) + 1

    result_slots = []
    for s in raw_slots:
        t = s["time"]
        cap = s.get("capacity", 1)
        booked = booked_counts.get(t, 0)
        available = max(0, cap - booked)
        result_slots.append({
            "time": t,
            "capacity": cap,
            "booked": booked,
            "available": available,
            "full": available == 0,
        })

    return {
        "date": date,
        "center_id": center_id,
        "day_active": True,
        "slots": result_slots,
    }
