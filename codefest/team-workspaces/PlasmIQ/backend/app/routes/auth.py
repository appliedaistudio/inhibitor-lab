from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from jose import jwt
from passlib.context import CryptContext
import logging

from app.models.database import DonorRegister, LoginRequest, TokenResponse
from app.utils.db import get_database
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _donor_out(donor: dict) -> dict:
    return {
        "id": str(donor["_id"]),
        "name": donor.get("name", ""),
        "email": donor.get("email", ""),
        "phone": donor.get("phone", ""),
        "blood_type": donor.get("blood_type", ""),
        "zip_code": donor.get("zip_code", ""),
        "preferred_time": donor.get("preferred_time", "morning"),
        "points": donor.get("points", 0),
        "streak": donor.get("streak", 0),
        "donation_count": len(donor.get("donation_history", [])),
        "donation_history": donor.get("donation_history", []),
        "no_show_rate": donor.get("no_show_rate", 0.0),
        "latitude": donor.get("latitude"),
        "longitude": donor.get("longitude"),
    }


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: DonorRegister, db=Depends(get_database)):
    existing = await db.donors.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")

    # Age eligibility check (18–65)
    if body.dob:
        try:
            dob = datetime.strptime(body.dob, "%Y-%m-%d").date()
            today = datetime.now(timezone.utc).date()
            age = today.year - dob.year - (1 if (today.month, today.day) < (dob.month, dob.day) else 0)
            if age < 18:
                raise HTTPException(status_code=400, detail="You must be at least 18 years old to register.")
            if age > 65:
                raise HTTPException(status_code=400, detail="You must be 65 years old or younger to register.")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date of birth format. Use YYYY-MM-DD.")

    donor = {
        "name": body.name,
        "email": body.email,
        "phone": body.phone,
        "password_hash": pwd_context.hash(body.password),
        "dob": body.dob,
        "blood_type": body.blood_type,
        "zip_code": body.zip_code,
        "preferred_time": body.preferred_time,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "points": 0,
        "streak": 0,
        "no_show_rate": 0.0,
        "donation_history": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.donors.insert_one(donor)
    donor["_id"] = result.inserted_id

    token = create_token({"sub": str(result.inserted_id), "email": body.email})
    return TokenResponse(access_token=token, donor=_donor_out(donor))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db=Depends(get_database)):
    donor = await db.donors.find_one({"email": body.email})
    if not donor or not pwd_context.verify(body.password, donor.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token({"sub": str(donor["_id"]), "email": donor["email"]})
    return TokenResponse(access_token=token, donor=_donor_out(donor))
