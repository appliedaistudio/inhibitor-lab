from fastapi import APIRouter, HTTPException, Depends, Header
from bson import ObjectId
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
import logging

from app.models.database import Appointment, AppointmentCreate, AppointmentBooking, RWDSnapshot
from app.utils.db import get_database
from app.utils.validator import AppointmentValidator
from app.utils.geolocation import GeoLocation
from app.utils.weather import get_weather_service
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

validator = AppointmentValidator(
    max_per_week=settings.max_appointments_per_week,
    rest_days=settings.rest_days_between_donations,
)


def _decode_token(authorization: str) -> str:
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload["sub"]
    except (JWTError, ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or missing token.")


def _appt_out(a: dict) -> dict:
    snap = a.get("rwd_snapshot") or {}
    return {
        "id": str(a["_id"]),
        "donor_id": a.get("donor_id", ""),
        "center_id": a.get("center_id", ""),
        "center_name": a.get("center_name", ""),
        "center_address": a.get("center_address", ""),
        "slot_time": a.get("scheduled_time").isoformat() if isinstance(a.get("scheduled_time"), datetime) else a.get("scheduled_time", ""),
        "status": a.get("status", "scheduled"),
        "no_show": a.get("no_show", False),
        "reschedule_reason": a.get("reschedule_reason"),
        "created_at": a.get("created_at", datetime.utcnow()).isoformat() if isinstance(a.get("created_at"), datetime) else a.get("created_at", ""),
        "rwd_snapshot": snap if snap else None,
        "points_earned": a.get("points_earned", 0),
        "thank_you_message": a.get("thank_you_message"),
    }


# ── JWT-protected donor endpoints ─────────────────────────────────────────────

@router.get("")
async def list_my_appointments(authorization: str = Header(...), db=Depends(get_database)):
    donor_id = _decode_token(authorization)
    appts = await db.appointments.find({"donor_id": donor_id}).sort("scheduled_time", 1).to_list(100)
    return [_appt_out(a) for a in appts]


@router.post("", status_code=201)
async def book_appointment(body: AppointmentBooking, authorization: str = Header(...), db=Depends(get_database)):
    donor_id = _decode_token(authorization)

    if not ObjectId.is_valid(body.center_id):
        raise HTTPException(status_code=400, detail="Invalid center ID.")
    center = await db.donation_centers.find_one({"_id": ObjectId(body.center_id)})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    scheduled_time = datetime.fromisoformat(body.slot_time)
    if scheduled_time.tzinfo is None:
        scheduled_time = scheduled_time.replace(tzinfo=timezone.utc)

    # ── Slot capacity check ──────────────────────────────────────────────────
    # Find the template and confirm the requested time slot exists and has room.
    template = await db.slot_templates.find_one({"center_id": body.center_id})
    if template and template.get("is_active", True):
        slot_time_str = scheduled_time.strftime("%H:%M")
        slot_def = next((s for s in template.get("slots", []) if s["time"] == slot_time_str), None)
        if slot_def is None:
            raise HTTPException(status_code=400, detail=f"'{slot_time_str}' is not a valid slot for this center.")
        # Count current bookings for this exact center + time slot
        slot_start = scheduled_time.replace(second=0, microsecond=0)
        slot_end = slot_start + timedelta(minutes=30)
        booked_count = await db.appointments.count_documents({
            "center_id": body.center_id,
            "status": {"$nin": ["cancelled", "rescheduled"]},
            "scheduled_time": {"$gte": slot_start, "$lt": slot_end},
        })
        if booked_count >= slot_def.get("capacity", 1):
            raise HTTPException(
                status_code=409,
                detail=f"The {slot_time_str} slot is fully booked. Please choose a different time."
            )
    # ── End capacity check ───────────────────────────────────────────────────

    is_valid, message = await validator.validate_appointment_slot(
        donor_id=donor_id, proposed_time=scheduled_time, db=db, reason="booking"
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)

    # 1500 pts for recommended booking (has rwd_snapshot), 1000 for regular
    points_earned = 1500 if body.rwd_snapshot else 1000

    appt = {
        "donor_id": donor_id,
        "center_id": body.center_id,
        "center_name": center.get("name", ""),
        "center_address": center.get("address", ""),
        "scheduled_time": scheduled_time,
        "status": "scheduled",
        "completed": False,
        "no_show": False,
        "points_earned": points_earned,
        "rwd_snapshot": body.rwd_snapshot.model_dump() if body.rwd_snapshot else None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.appointments.insert_one(appt)
    appt["_id"] = result.inserted_id

    await db.donors.update_one({"_id": ObjectId(donor_id)}, {"$inc": {"points": points_earned}})

    return _appt_out(appt)


@router.delete("/{appointment_id}", status_code=200)
async def cancel_appointment(appointment_id: str, authorization: str = Header(...), db=Depends(get_database)):
    donor_id = _decode_token(authorization)
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID.")

    appt = await db.appointments.find_one({"_id": ObjectId(appointment_id), "donor_id": donor_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    if appt.get("status") != "scheduled":
        raise HTTPException(status_code=400, detail="Only scheduled appointments can be cancelled.")

    points_to_deduct = appt.get("points_earned", 0)

    await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}},
    )

    # Deduct the points that were awarded when this appointment was booked
    if points_to_deduct > 0:
        await db.donors.update_one(
            {"_id": ObjectId(donor_id)},
            {"$inc": {"points": -points_to_deduct}},
        )

    return {"points_deducted": points_to_deduct}


# ── Extended appointment management ──────────────────────────────────────────

@router.get("/{appointment_id}")
async def get_appointment(appointment_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID.")
    appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    return _appt_out(appt)


@router.get("/donor/{donor_id}")
async def get_donor_appointments(donor_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    appts = await db.appointments.find({"donor_id": donor_id}).to_list(None)
    return {"appointments": [_appt_out(a) for a in appts]}


@router.post("/{appointment_id}/reschedule")
async def reschedule_appointment(appointment_id: str, new_time: dict, db=Depends(get_database)):
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID.")
    appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    new_scheduled_time = datetime.fromisoformat(new_time["scheduled_time"])
    is_valid, message = await validator.validate_appointment_slot(
        donor_id=appt["donor_id"], proposed_time=new_scheduled_time, db=db, reason="reschedule"
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)

    new_appt = {
        "donor_id": appt["donor_id"],
        "center_id": appt.get("center_id", new_time.get("center_id")),
        "center_name": appt.get("center_name", ""),
        "center_address": appt.get("center_address", ""),
        "scheduled_time": new_scheduled_time,
        "status": "scheduled",
        "completed": False,
        "no_show": False,
        "reschedule_reason": new_time.get("reason", "Rescheduled by donor"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"status": "rescheduled", "updated_at": datetime.now(timezone.utc)}},
    )
    result = await db.appointments.insert_one(new_appt)
    new_appt["_id"] = result.inserted_id
    return {"message": "Appointment rescheduled.", "new_appointment": _appt_out(new_appt)}


@router.post("/{appointment_id}/mark-complete")
async def mark_complete(appointment_id: str, authorization: str = Header(...), db=Depends(get_database)):
    """Mark a scheduled appointment as completed (called when the donor finishes donating)."""
    donor_id = _decode_token(authorization)
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID.")

    appt = await db.appointments.find_one({"_id": ObjectId(appointment_id), "donor_id": donor_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    if appt.get("status") != "scheduled":
        raise HTTPException(status_code=400, detail="Only scheduled appointments can be marked complete.")

    await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"status": "completed", "completed": True, "updated_at": datetime.now(timezone.utc)}},
    )

    updated = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    return _appt_out(updated)


@router.post("/{appointment_id}/mark-missed")
async def mark_missed(appointment_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID.")
    result = await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"status": "missed", "no_show": True, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    donor_id = appt["donor_id"]
    total = await db.appointments.count_documents({"donor_id": donor_id})
    missed = await db.appointments.count_documents({"donor_id": donor_id, "no_show": True})
    await db.donors.update_one(
        {"_id": ObjectId(donor_id)},
        {"$set": {"no_show_rate": missed / total if total else 0}},
    )
    return {"message": "Appointment marked as missed."}


@router.post("/find-nearest-center/{donor_id}")
async def find_nearest_center(donor_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    donor = await db.donors.find_one({"_id": ObjectId(donor_id)})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")
    if not donor.get("latitude") or not donor.get("longitude"):
        raise HTTPException(status_code=400, detail="Donor location not set.")

    centers = await db.donation_centers.find().to_list(None)
    if not centers:
        raise HTTPException(status_code=404, detail="No centers available.")

    nearest, distance = GeoLocation.find_nearest_center(donor["latitude"], donor["longitude"], centers)
    if not nearest:
        raise HTTPException(status_code=404, detail="No centers found.")

    weather_service = get_weather_service()
    current_weather = weather_service.get_current_weather(nearest["latitude"], nearest["longitude"]) if weather_service else {}

    multiplier = 1.3 if current_weather.get("condition") in ["Rain", "Snow", "Thunderstorm"] else 1.0
    travel_time = GeoLocation.estimate_travel_time(
        donor["latitude"], donor["longitude"],
        nearest["latitude"], nearest["longitude"], multiplier
    )
    return {
        "nearest_center": {"id": str(nearest["_id"]), "name": nearest["name"], "address": nearest["address"]},
        "distance_km": round(distance, 1),
        "estimated_travel_time_minutes": travel_time,
        "current_weather": current_weather,
    }


@router.post("/get-available-slots/{donor_id}")
async def get_available_slots(donor_id: str, days_ahead: int = 14, db=Depends(get_database)):
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    donor = await db.donors.find_one({"_id": ObjectId(donor_id)})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")
    if not donor.get("latitude") or not donor.get("longitude"):
        raise HTTPException(status_code=400, detail="Donor location not set.")

    appointments = await db.appointments.find({"donor_id": donor_id}).to_list(None)
    preferred_hour_map = {"morning": 9, "afternoon": 14, "evening": 18}
    preferred_hour = preferred_hour_map.get(donor.get("preferred_time", "morning"), 9)

    suggested_times = validator.suggest_best_appointment_times(
        appointments, preferred_hour=preferred_hour, num_suggestions=10
    )
    centers = await db.donation_centers.find().to_list(None)
    centers_with_distance = GeoLocation.filter_centers_by_distance(
        donor["latitude"], donor["longitude"], centers, max_distance_km=50
    )
    weather_service = get_weather_service()
    slots = []
    for suggested_time in suggested_times:
        for center, distance in centers_with_distance:
            forecast = weather_service.get_forecast(center["latitude"], center["longitude"]) if weather_service else []
            weather_score = weather_service.score_slot_by_weather(suggested_time, donor["latitude"], donor["longitude"], forecast) if (weather_service and forecast) else 1.0
            multiplier = 1.3 if any(e.get("condition") in ["Rain", "Snow"] for e in forecast) else 1.0
            travel_time = GeoLocation.estimate_travel_time(donor["latitude"], donor["longitude"], center["latitude"], center["longitude"], multiplier)
            base_prob = 1.0 - (donor.get("no_show_rate", 0) * 0.5)
            dist_factor = max(0.8, 1.0 - (distance / 100))
            show_up = base_prob * dist_factor * weather_score
            slots.append({
                "slot_time": suggested_time.isoformat(),
                "center": {"id": str(center["_id"]), "name": center["name"], "distance_km": round(distance, 1)},
                "travel_time_minutes": travel_time,
                "weather_score": round(weather_score, 2),
                "show_up_probability": round(show_up, 2),
                "recommendation_score": round(weather_score * dist_factor, 2),
            })
    slots.sort(key=lambda x: x["recommendation_score"], reverse=True)
    return {"donor_id": donor_id, "available_slots": slots[:15]}
