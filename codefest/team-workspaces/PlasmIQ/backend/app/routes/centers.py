from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
import logging

from app.models.database import DonationCenter, DonationCenterCreate
from app.utils.db import get_database

router = APIRouter()
logger = logging.getLogger(__name__)


def _center_out(c: dict) -> dict:
    return {
        "id": str(c["_id"]),
        "name": c.get("name", ""),
        "address": c.get("address", ""),
        "latitude": c.get("latitude", 0),
        "longitude": c.get("longitude", 0),
        "phone": c.get("phone", ""),
        "current_wait_time": c.get("current_wait_time", 0),
        "capacity": c.get("capacity", 40),
        "capacity_used": c.get("capacity_used", 0),
        "open_hours": c.get("open_hours", ""),
    }


@router.get("")
async def list_centers(db=Depends(get_database)):
    centers = await db.donation_centers.find({}).to_list(100)
    return [_center_out(c) for c in centers]


@router.get("/{center_id}")
async def get_center(center_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(center_id):
        raise HTTPException(status_code=400, detail="Invalid center ID.")
    center = await db.donation_centers.find_one({"_id": ObjectId(center_id)})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")
    return _center_out(center)
