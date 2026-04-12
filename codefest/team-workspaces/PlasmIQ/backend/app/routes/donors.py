from fastapi import APIRouter, HTTPException, Depends, Header
from bson import ObjectId
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
import uuid
import logging

from app.models.database import Donor, DonorCreate, PointsRequest
from app.utils.db import get_database
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _decode_token(authorization: str) -> str:
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload["sub"]
    except (JWTError, ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or missing token.")


def _calc_streak(history: list) -> int:
    """Return the current weekly streak from a list of ISO datetime strings.

    A streak increments for every consecutive past week (ISO week) in which the
    donor had at least one completed donation.  The current (partial) week does
    NOT break the streak — we only start counting from the most recent week that
    already has a donation.
    """
    if not history:
        return 0

    dates = []
    for iso in history:
        try:
            dt = datetime.fromisoformat(iso)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            dates.append(dt)
        except ValueError:
            continue

    if not dates:
        return 0

    # Collect the set of (iso_year, iso_week) tuples that have donations
    donated_weeks: set = set()
    for d in dates:
        donated_weeks.add(d.isocalendar()[:2])

    # Walk backwards from the most recent donation week
    most_recent = max(dates)
    streak = 0
    check = most_recent
    for _ in range(52 * 10):
        wk = check.isocalendar()[:2]
        if wk in donated_weeks:
            streak += 1
            check -= timedelta(weeks=1)
        else:
            break

    return streak


async def _compute_stats(donor_id: str, db) -> dict:
    """Compute live donation stats from the appointments collection."""
    completed = await db.appointments.find(
        {"donor_id": donor_id, "status": "completed"},
        {"scheduled_time": 1},
    ).sort("scheduled_time", 1).to_list(None)

    history = []
    for appt in completed:
        st = appt.get("scheduled_time")
        if isinstance(st, datetime):
            if st.tzinfo is None:
                st = st.replace(tzinfo=timezone.utc)
            history.append(st.isoformat())
        elif isinstance(st, str):
            history.append(st)

    return {
        "donation_count": len(history),
        "donation_history": history,
        "streak": _calc_streak(history),
    }


def _donor_out(donor: dict, stats: dict | None = None) -> dict:
    return {
        "id": str(donor["_id"]),
        "name": donor.get("name", ""),
        "email": donor.get("email", ""),
        "phone": donor.get("phone", ""),
        "blood_type": donor.get("blood_type", ""),
        "zip_code": donor.get("zip_code", ""),
        "preferred_time": donor.get("preferred_time", "morning"),
        "no_show_rate": donor.get("no_show_rate", 0.0),
        "points": donor.get("points", 0),
        "streak": stats["streak"] if stats is not None else donor.get("streak", 0),
        "donation_count": stats["donation_count"] if stats is not None else len(donor.get("donation_history", [])),
        "donation_history": stats["donation_history"] if stats is not None else donor.get("donation_history", []),
        "latitude": donor.get("latitude"),
        "longitude": donor.get("longitude"),
        "redemption_vouchers": donor.get("redemption_vouchers", []),
    }


# ── JWT-protected self-service endpoints ─────────────────────────────────────

@router.get("/me")
async def get_me(authorization: str = Header(...), db=Depends(get_database)):
    donor_id = _decode_token(authorization)
    donor = await db.donors.find_one({"_id": ObjectId(donor_id)})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")
    stats = await _compute_stats(donor_id, db)
    return _donor_out(donor, stats)


@router.post("/me/points")
async def update_points(
    body: PointsRequest,
    authorization: str = Header(...),
    db=Depends(get_database),
):
    donor_id = _decode_token(authorization)
    donor = await db.donors.find_one({"_id": ObjectId(donor_id)})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")

    current = donor.get("points", 0)
    if body.action == "redeem":
        if body.amount > current:
            raise HTTPException(status_code=400, detail="Insufficient points.")
        if body.amount < 15000:
            raise HTTPException(status_code=400, detail="Minimum redemption is 15,000 points.")
        delta = -body.amount
        # Generate a unique voucher: 100 pts = $1
        voucher = {
            "code": uuid.uuid4().hex.upper()[:16],
            "amount_usd": body.amount // 100,
            "points_used": body.amount,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "active",
        }
        updated = await db.donors.find_one_and_update(
            {"_id": ObjectId(donor_id)},
            {"$inc": {"points": delta}, "$push": {"redemption_vouchers": voucher}},
            return_document=True,
        )
    elif body.action == "add":
        delta = body.amount
        updated = await db.donors.find_one_and_update(
            {"_id": ObjectId(donor_id)},
            {"$inc": {"points": delta}},
            return_document=True,
        )
    else:
        raise HTTPException(status_code=400, detail="Action must be 'add' or 'redeem'.")

    stats = await _compute_stats(str(updated["_id"]), db)
    return _donor_out(updated, stats)


# ── Admin / internal CRUD (no auth required — for seeding / ops tools) ───────

@router.post("/")
async def create_donor(donor: DonorCreate, db=Depends(get_database)):
    existing = await db.donors.find_one({"email": donor.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    result = await db.donors.insert_one(donor.model_dump())
    created = await db.donors.find_one({"_id": result.inserted_id})
    created["_id"] = str(created["_id"])
    return created


@router.get("/")
async def list_donors(skip: int = 0, limit: int = 10, db=Depends(get_database)):
    donors = await db.donors.find().skip(skip).limit(limit).to_list(limit)
    for d in donors:
        d["_id"] = str(d["_id"])
    total = await db.donors.count_documents({})
    return {"donors": donors, "total": total}


@router.get("/{donor_id}")
async def get_donor(donor_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    donor = await db.donors.find_one({"_id": ObjectId(donor_id)})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")
    donor["_id"] = str(donor["_id"])
    return donor


@router.put("/{donor_id}")
async def update_donor(donor_id: str, donor: DonorCreate, db=Depends(get_database)):
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    result = await db.donors.update_one(
        {"_id": ObjectId(donor_id)}, {"$set": donor.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Donor not found.")
    updated = await db.donors.find_one({"_id": ObjectId(donor_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/{donor_id}")
async def delete_donor(donor_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    result = await db.donors.delete_one({"_id": ObjectId(donor_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Donor not found.")
    return {"message": "Donor deleted successfully."}
