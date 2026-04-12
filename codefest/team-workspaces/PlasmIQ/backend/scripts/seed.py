"""
Seed MongoDB with demo centers, donors, and appointments.
Usage: cd backend && python scripts/seed.py

Safe to run repeatedly:
  - donation_centers  → always replaced (reference data)
  - slot_templates    → inserted only if the center has no template yet
                        (preserves any admin edits)
  - donors            → demo accounts inserted only if that email doesn't exist
                        (real user accounts are never touched)
  - appointments      → demo appointments added only if the demo donor has none
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MONGO_URI = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME") or os.getenv("MONGODB_DB", "plasmiq")

CENTERS = [
    # C001
    {"name": "CSL Plasma - North Philadelphia",
     "address": "4701 N Broad St, Philadelphia, PA 19120",
     "latitude": 40.0365, "longitude": -75.12,
     "current_wait_time": 10, "capacity": 40, "capacity_used": 14,
     "open_hours": "Mon-Sat 6am-8pm, Sun 7am-5pm", "phone": "(215) 555-0101"},
    # C002
    {"name": "Grifols Plasma - West Philadelphia",
     "address": "5501 Baltimore Ave, Philadelphia, PA 19143",
     "latitude": 39.944, "longitude": -75.228,
     "current_wait_time": 18, "capacity": 35, "capacity_used": 22,
     "open_hours": "Mon-Fri 7am-7pm, Sat 8am-4pm", "phone": "(215) 555-0202"},
    # C003
    {"name": "Octapharma Plasma - Center City",
     "address": "1300 Walnut St, Philadelphia, PA 19107",
     "latitude": 39.9526, "longitude": -75.1638,
     "current_wait_time": 8, "capacity": 50, "capacity_used": 10,
     "open_hours": "Mon-Sat 6am-9pm, Sun 8am-5pm", "phone": "(215) 555-0303"},
    # C004
    {"name": "CSL Plasma - Frankford",
     "address": "4300 Frankford Ave, Philadelphia, PA 19124",
     "latitude": 40.0126, "longitude": -75.084,
     "current_wait_time": 14, "capacity": 38, "capacity_used": 20,
     "open_hours": "Mon-Sat 7am-8pm, Sun 8am-4pm", "phone": "(215) 555-0404"},
    # C005
    {"name": "Octapharma Plasma - South Philadelphia",
     "address": "2100 S Broad St, Philadelphia, PA 19145",
     "latitude": 39.923, "longitude": -75.183,
     "current_wait_time": 22, "capacity": 35, "capacity_used": 28,
     "open_hours": "Mon-Fri 7am-7pm, Sat 8am-5pm", "phone": "(215) 555-0505"},
    # C006
    {"name": "BioLife Plasma - University City",
     "address": "3800 Lancaster Ave, Philadelphia, PA 19104",
     "latitude": 39.961, "longitude": -75.199,
     "current_wait_time": 6, "capacity": 45, "capacity_used": 8,
     "open_hours": "Mon-Sat 6am-8pm, Sun 7am-5pm", "phone": "(215) 555-0606"},
    # C007
    {"name": "CSL Plasma - Kensington",
     "address": "2800 Kensington Ave, Philadelphia, PA 19134",
     "latitude": 39.9912, "longitude": -75.11,
     "current_wait_time": 30, "capacity": 32, "capacity_used": 28,
     "open_hours": "Mon-Fri 8am-7pm, Sat 8am-4pm", "phone": "(215) 555-0707"},
    # C008
    {"name": "Grifols Plasma - Northeast Philadelphia",
     "address": "7200 Castor Ave, Philadelphia, PA 19111",
     "latitude": 40.06, "longitude": -75.08,
     "current_wait_time": 12, "capacity": 40, "capacity_used": 16,
     "open_hours": "Mon-Sat 7am-8pm, Sun 8am-5pm", "phone": "(215) 555-0808"},
    # C009
    {"name": "Octapharma Plasma - Mayfair",
     "address": "6600 Frankford Ave, Philadelphia, PA 19149",
     "latitude": 40.0395, "longitude": -75.0663,
     "current_wait_time": 9, "capacity": 36, "capacity_used": 11,
     "open_hours": "Mon-Sat 6am-8pm, Sun 7am-4pm", "phone": "(215) 555-0909"},
    # C010
    {"name": "BioLife Plasma - South Philly",
     "address": "1500 Pattison Ave, Philadelphia, PA 19148",
     "latitude": 39.915, "longitude": -75.16,
     "current_wait_time": 16, "capacity": 38, "capacity_used": 20,
     "open_hours": "Mon-Fri 7am-7pm, Sat-Sun 8am-5pm", "phone": "(215) 555-1010"},
]

DEFAULT_SLOTS = [
    {"time": "08:00", "capacity": 3}, {"time": "08:30", "capacity": 3},
    {"time": "09:00", "capacity": 5}, {"time": "09:30", "capacity": 5},
    {"time": "10:00", "capacity": 5}, {"time": "10:30", "capacity": 5},
    {"time": "11:00", "capacity": 4}, {"time": "11:30", "capacity": 4},
    {"time": "13:00", "capacity": 5}, {"time": "13:30", "capacity": 5},
    {"time": "14:00", "capacity": 5}, {"time": "14:30", "capacity": 5},
    {"time": "15:00", "capacity": 4}, {"time": "15:30", "capacity": 4},
    {"time": "16:00", "capacity": 3}, {"time": "16:30", "capacity": 3},
]


def _history(count):
    now = datetime.now(timezone.utc)
    return [(now - timedelta(days=7 * (i + 1))).isoformat() for i in range(count)]


DEMO_DONORS = [
    {"name": "Alex Rivera", "email": "alex@demo.com", "password_hash": pwd_context.hash("Demo1234!"),
     "phone": "(215) 555-1001", "dob": "1994-07-15", "blood_type": "O+", "zip_code": "19107",
     "preferred_time": "morning", "latitude": 39.9526, "longitude": -75.1638,
     "points": 1250, "streak": 8, "no_show_rate": 0.0, "donation_history": _history(12)},
    {"name": "Jordan Kim", "email": "jordan@demo.com", "password_hash": pwd_context.hash("Demo1234!"),
     "phone": "(215) 555-2002", "dob": "1998-02-20", "blood_type": "A-", "zip_code": "19104",
     "preferred_time": "afternoon", "latitude": 39.9528, "longitude": -75.1992,
     "points": 450, "streak": 3, "no_show_rate": 0.1, "donation_history": _history(5)},
    {"name": "Morgan Chen", "email": "morgan@demo.com", "password_hash": pwd_context.hash("Demo1234!"),
     "phone": "(215) 555-3003", "dob": "1990-11-05", "blood_type": "B+", "zip_code": "19145",
     "preferred_time": "morning", "latitude": 39.9430, "longitude": -75.1551,
     "points": 3200, "streak": 24, "no_show_rate": 0.0, "donation_history": _history(30)},
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    # ── Centers: always replace (static reference data, no user content) ─────
    print("Refreshing donation centers...")
    await db.donation_centers.drop()
    center_result = await db.donation_centers.insert_many(CENTERS)
    center_ids = [str(oid) for oid in center_result.inserted_ids]
    print(f"  {len(center_ids)} centers inserted")

    # ── Slot templates: insert only if none exists for that center ────────────
    # This preserves any changes an admin made to a center's schedule.
    print("Upserting slot templates (skips centers that already have a template)...")
    inserted_tmpl = 0
    skipped_tmpl = 0
    for cid in center_ids:
        result = await db.slot_templates.update_one(
            {"center_id": cid},
            {"$setOnInsert": {
                "center_id": cid,
                "days_active": [0, 1, 2, 3, 4, 5],  # Mon-Sat
                "slots": DEFAULT_SLOTS,
                "is_active": True,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": None,
            }},
            upsert=True,
        )
        if result.upserted_id:
            inserted_tmpl += 1
        else:
            skipped_tmpl += 1
    print(f"  {inserted_tmpl} new, {skipped_tmpl} already existed (unchanged)")

    # ── Donors: insert demo accounts only if the email doesn't exist yet ──────
    # Real user accounts registered through the app are never modified or deleted.
    print("Seeding demo donors (skip if email already registered)...")
    await db.donors.create_index("email", unique=True)
    inserted_donors = 0
    skipped_donors = 0
    donor_ids = []
    for donor in DEMO_DONORS:
        existing = await db.donors.find_one({"email": donor["email"]})
        if existing:
            donor_ids.append(str(existing["_id"]))
            skipped_donors += 1
        else:
            result = await db.donors.insert_one({
                **donor,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
            donor_ids.append(str(result.inserted_id))
            inserted_donors += 1
    print(f"  {inserted_donors} inserted, {skipped_donors} skipped (already exist)")

    # ── Appointments: only seed if the demo donor has zero appointments ───────
    print("Seeding demo appointments (skip donors that already have bookings)...")
    now = datetime.now(timezone.utc)
    appt_specs = [
        {"donor_idx": 0, "center_idx": 0, "delta": timedelta(days=2, hours=10),
         "status": "scheduled", "completed": False, "no_show": False,
         "rwd_snapshot": {"travel_time_mins": 12.5, "wait_time_mins": 8, "weather": "Clear", "friction_score": 7.75}},
        {"donor_idx": 0, "center_idx": 1, "delta": -timedelta(days=8),
         "status": "completed", "completed": True, "no_show": False,
         "rwd_snapshot": {"travel_time_mins": 25.0, "wait_time_mins": 18, "weather": "Rain", "friction_score": 17.7}},
        {"donor_idx": 1, "center_idx": 1, "delta": timedelta(days=5, hours=14),
         "status": "scheduled", "completed": False, "no_show": False,
         "rwd_snapshot": {"travel_time_mins": 8.2, "wait_time_mins": 22, "weather": "Clouds", "friction_score": 13.76}},
    ]
    inserted_appts = 0
    skipped_appts = 0
    seen_donors = set()
    for spec in appt_specs:
        did = donor_ids[spec["donor_idx"]]
        if did in seen_donors:
            skipped_appts += 1
            continue
        count = await db.appointments.count_documents({"donor_id": did})
        if count > 0:
            seen_donors.add(did)
            skipped_appts += 1
            continue
        cidx = spec["center_idx"]
        await db.appointments.insert_one({
            "donor_id": did,
            "center_id": center_ids[cidx],
            "center_name": CENTERS[cidx]["name"],
            "center_address": CENTERS[cidx]["address"],
            "scheduled_time": now + spec["delta"],
            "status": spec["status"],
            "completed": spec["completed"],
            "no_show": spec["no_show"],
            "rwd_snapshot": spec["rwd_snapshot"],
            "created_at": now,
            "updated_at": now,
        })
        inserted_appts += 1
    print(f"  {inserted_appts} inserted, {skipped_appts} skipped (donors already have bookings)")

    print("\nSeed complete!")
    print("\nDemo credentials:")
    for d in DEMO_DONORS:
        print(f"  {d['email']} / Demo1234!")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
