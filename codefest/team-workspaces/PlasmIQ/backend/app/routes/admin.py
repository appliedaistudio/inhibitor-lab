from fastapi import APIRouter, HTTPException, Depends, Header
from bson import ObjectId
from passlib.context import CryptContext
from openai import OpenAI
from datetime import datetime, timezone
import logging

from app.utils.db import get_database
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

NO_SHOW_PENALTY = 50
COMPLETION_BONUS = 50


def _require_admin(x_admin_key: str | None = Header(None)):
    if not x_admin_key or x_admin_key != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Invalid or missing admin key.")


def _donor_row(d: dict) -> dict:
    dob = d.get("dob", "")
    age = None
    if dob:
        try:
            born = datetime.strptime(dob, "%Y-%m-%d")
            age = (datetime.utcnow() - born).days // 365
        except ValueError:
            pass
    return {
        "id": str(d["_id"]),
        "name": d.get("name", ""),
        "email": d.get("email", ""),
        "phone": d.get("phone", ""),
        "dob": dob,
        "age": age,
        "blood_type": d.get("blood_type", ""),
        "points": d.get("points", 0),
        "streak": d.get("streak", 0),
        "no_show_rate": round(d.get("no_show_rate", 0.0), 3),
        "donation_count": len(d.get("donation_history", [])),
        "created_at": d.get("created_at", "").isoformat() if isinstance(d.get("created_at"), datetime) else "",
    }


def _appt_row(a: dict) -> dict:
    return {
        "id": str(a["_id"]),
        "donor_id": a.get("donor_id", ""),
        "center_name": a.get("center_name", ""),
        "center_address": a.get("center_address", ""),
        "slot_time": a.get("scheduled_time").isoformat() if isinstance(a.get("scheduled_time"), datetime) else str(a.get("scheduled_time", "")),
        "status": a.get("status", "scheduled"),
        "no_show": a.get("no_show", False),
        "thank_you_message": a.get("thank_you_message"),
        "created_at": a.get("created_at", "").isoformat() if isinstance(a.get("created_at"), datetime) else "",
    }


def _generate_thank_you(donor_name: str, center_name: str, donation_count: int) -> str:
    """Use OpenAI to generate a warm personalized thank-you message in the style of the CSL team note."""
    if not settings.openai_api_key:
        first = donor_name.split()[0] if donor_name else "Friend"
        return (
            f"Dear {first}, thank you for donating your plasma. "
            "It helped us save a person's life. We are grateful for you! "
            "Hope you join us again to facilitate this cause!! — Love, the PlasmIQ Team"
        )
    try:
        client = OpenAI(api_key=settings.openai_api_key)
        ordinal = {1: "first", 2: "second", 3: "third"}.get(donation_count, f"{donation_count}th")
        prompt = (
            f"Write a short, warm, heartfelt thank-you message (3–5 sentences) from the plasma center to donor {donor_name.split()[0]}. "
            f"This is their {ordinal} donation at {center_name}. "
            "Mention that their plasma helps save lives, express genuine gratitude, and warmly invite them back. "
            "Close with 'Love, the PlasmIQ Team'. Keep it personal and human — not corporate. "
            "Do not use bullet points or headers. No emojis."
        )
        r = client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=180,
        )
        return (r.choices[0].message.content or "").strip()
    except Exception as e:
        logger.warning(f"Thank-you message generation failed: {e}")
        first = donor_name.split()[0] if donor_name else "Friend"
        return (
            f"Dear {first}, thank you for donating your plasma. "
            "It helped us save a person's life. We are grateful for you! "
            "Hope you join us again to facilitate this cause!! — Love, the PlasmIQ Team"
        )


# ── Donor list ────────────────────────────────────────────────────────────────

@router.get("/donors")
async def list_donors(
    db=Depends(get_database),
    _=Depends(_require_admin),
):
    donors = await db.donors.find().sort("name", 1).to_list(None)
    return [_donor_row(d) for d in donors]


# ── Donor appointments ────────────────────────────────────────────────────────

@router.get("/donors/{donor_id}/appointments")
async def donor_appointments(
    donor_id: str,
    db=Depends(get_database),
    _=Depends(_require_admin),
):
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    appts = await db.appointments.find({"donor_id": donor_id}).sort("scheduled_time", -1).to_list(None)
    return [_appt_row(a) for a in appts]


# ── Mark completed ────────────────────────────────────────────────────────────

@router.post("/appointments/{appointment_id}/complete")
async def mark_complete(
    appointment_id: str,
    db=Depends(get_database),
    _=Depends(_require_admin),
):
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID.")

    appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    if appt.get("status") == "completed":
        raise HTTPException(status_code=409, detail="Appointment already completed.")

    donor_id = appt["donor_id"]
    donor = await db.donors.find_one({"_id": ObjectId(donor_id)})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")

    # Compute new donation count for the message
    donation_count = len(donor.get("donation_history", [])) + 1
    center_name = appt.get("center_name", "our center")
    thank_you = _generate_thank_you(donor.get("name", "Friend"), center_name, donation_count)

    # Mark appointment completed + store thank-you message
    await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": "completed",
            "completed": True,
            "thank_you_message": thank_you,
            "updated_at": datetime.now(timezone.utc),
        }},
    )

    # Update donor: +completion bonus, add to donation_history, update streak
    new_streak = donor.get("streak", 0) + 1
    await db.donors.update_one(
        {"_id": ObjectId(donor_id)},
        {
            "$inc": {"points": COMPLETION_BONUS},
            "$push": {"donation_history": appointment_id},
            "$set": {"streak": new_streak, "updated_at": datetime.now(timezone.utc)},
        },
    )

    return {
        "message": "Appointment marked as completed.",
        "points_awarded": COMPLETION_BONUS,
        "thank_you_message": thank_you,
    }


# ── Mark no-show ──────────────────────────────────────────────────────────────

@router.post("/appointments/{appointment_id}/no-show")
async def mark_no_show(
    appointment_id: str,
    db=Depends(get_database),
    _=Depends(_require_admin),
):
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID.")

    appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    if appt.get("status") in ("no_show", "completed"):
        raise HTTPException(status_code=409, detail=f"Appointment is already {appt['status']}.")

    donor_id = appt["donor_id"]

    await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": "no_show",
            "no_show": True,
            "updated_at": datetime.now(timezone.utc),
        }},
    )

    # Deduct points (floor at 0) and recalculate no-show rate
    donor = await db.donors.find_one({"_id": ObjectId(donor_id)})
    if donor:
        current_pts = donor.get("points", 0)
        new_pts = max(0, current_pts - NO_SHOW_PENALTY)
        total = await db.appointments.count_documents({"donor_id": donor_id})
        missed = await db.appointments.count_documents({"donor_id": donor_id, "no_show": True})
        await db.donors.update_one(
            {"_id": ObjectId(donor_id)},
            {"$set": {
                "points": new_pts,
                "no_show_rate": missed / total if total else 0,
                "updated_at": datetime.now(timezone.utc),
            }},
        )

    return {"message": "Appointment marked as no-show.", "points_deducted": NO_SHOW_PENALTY}


# ── Reset donor password ──────────────────────────────────────────────────────

@router.post("/donors/{donor_id}/reset-password")
async def reset_password(
    donor_id: str,
    body: dict,
    db=Depends(get_database),
    _=Depends(_require_admin),
):
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    new_password = body.get("new_password", "").strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    result = await db.donors.update_one(
        {"_id": ObjectId(donor_id)},
        {"$set": {
            "password_hash": pwd_context.hash(new_password),
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Donor not found.")
    return {"message": "Password reset successfully."}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def admin_stats(
    db=Depends(get_database),
    _=Depends(_require_admin),
):
    total_donors = await db.donors.count_documents({})
    total_appts = await db.appointments.count_documents({})
    completed = await db.appointments.count_documents({"status": "completed"})
    no_shows = await db.appointments.count_documents({"no_show": True})
    scheduled = await db.appointments.count_documents({"status": "scheduled"})
    return {
        "total_donors": total_donors,
        "total_appointments": total_appts,
        "completed": completed,
        "no_shows": no_shows,
        "scheduled": scheduled,
    }
