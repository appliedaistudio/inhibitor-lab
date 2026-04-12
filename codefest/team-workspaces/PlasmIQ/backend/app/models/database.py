from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.str_schema()


# ── Donor ────────────────────────────────────────────────────────────────────

class DonorBase(BaseModel):
    """Plasma donor profile — merged fields from both services."""
    name: str
    email: str
    phone: str = ""
    # Scheduling preferences (teammate)
    preferred_time: str = "morning"     # "morning" | "afternoon" | "evening"
    no_show_rate: float = 0.0
    preferred_center: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Donor identity (our service)
    blood_type: str = ""
    zip_code: str = ""
    # Rewards & history
    points: int = 0
    streak: int = 0
    donation_history: list[str] = Field(default_factory=list)


class DonorCreate(DonorBase):
    pass


class DonorRegister(BaseModel):
    """Registration payload — includes password."""
    name: str
    email: str
    password: str
    phone: str = ""
    dob: str = ""
    blood_type: str = ""
    zip_code: str = ""
    preferred_time: str = "morning"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class Donor(DonorBase):
    id: Optional[str] = Field(None, alias="_id")
    password_hash: Optional[str] = Field(None, exclude=True)
    dob: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True)


# ── Donation Center ───────────────────────────────────────────────────────────

class DonationCenterBase(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    phone: str = ""
    current_wait_time: int = 0
    capacity: int = 40
    capacity_used: int = 0
    open_hours: str = ""


class DonationCenterCreate(DonationCenterBase):
    pass


class DonationCenter(DonationCenterBase):
    id: Optional[str] = Field(None, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True)


# ── Appointment ───────────────────────────────────────────────────────────────

class RWDSnapshot(BaseModel):
    """Conditions at time of booking."""
    travel_time_mins: Optional[float] = None
    wait_time_mins: Optional[int] = None
    weather: Optional[str] = None
    friction_score: Optional[float] = None


class AppointmentBase(BaseModel):
    donor_id: str
    center_id: str
    scheduled_time: datetime
    status: str = "scheduled"          # scheduled | completed | rescheduled | cancelled | missed
    completed: bool = False
    no_show: bool = False
    reschedule_reason: Optional[str] = None
    rwd_snapshot: Optional[RWDSnapshot] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentBooking(BaseModel):
    """Simplified booking payload from frontend."""
    center_id: str
    slot_time: str                      # ISO datetime string
    rwd_snapshot: Optional[RWDSnapshot] = None


class Appointment(AppointmentBase):
    id: Optional[str] = Field(None, alias="_id")
    center_name: str = ""
    center_address: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True)


# ── Availability Slot ─────────────────────────────────────────────────────────

class AvailabilitySlotBase(BaseModel):
    center_id: str
    slot_time: datetime
    capacity: int = 5
    booked_count: int = 0
    crowding_score: float = 0.0


class AvailabilitySlotCreate(AvailabilitySlotBase):
    pass


class AvailabilitySlot(AvailabilitySlotBase):
    id: Optional[str] = Field(None, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True)


# ── Donor Pattern ─────────────────────────────────────────────────────────────

class DonorPatternBase(BaseModel):
    donor_id: str
    preferred_day_of_week: str
    preferred_hour: int
    seasonal_trend: str
    average_show_up_time_minutes: float


class DonorPatternCreate(DonorPatternBase):
    pass


class DonorPattern(DonorPatternBase):
    id: Optional[str] = Field(None, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True)


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    donor: dict


# ── Points ───────────────────────────────────────────────────────────────────

class PointsRequest(BaseModel):
    action: str     # "add" | "redeem"
    amount: int
    reason: Optional[str] = None
