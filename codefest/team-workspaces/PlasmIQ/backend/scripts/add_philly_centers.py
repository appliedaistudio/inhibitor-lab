"""
Adds the 10 real Philadelphia plasma centers to the existing database
WITHOUT dropping donors or appointments.

Usage: cd backend && python3 scripts/add_philly_centers.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "plasmiq")

PHILLY_CENTERS = [
    {"name": "CSL Plasma - North Philadelphia",      "address": "2501 N Broad St, Philadelphia, PA 19132",
     "latitude": 39.9976, "longitude": -75.1596, "current_wait_time": 8,  "capacity": 40, "capacity_used": 12,
     "open_hours": "Mon–Sat 6am–8pm, Sun 7am–5pm", "phone": "(215) 555-0101"},
    {"name": "CSL Plasma - Northeast Philadelphia",  "address": "8901 Frankford Ave, Philadelphia, PA 19136",
     "latitude": 40.0622, "longitude": -75.0408, "current_wait_time": 14, "capacity": 38, "capacity_used": 20,
     "open_hours": "Mon–Sat 7am–7pm, Sun 8am–5pm", "phone": "(215) 555-0102"},
    {"name": "CSL Plasma - Kensington",              "address": "2701 Kensington Ave, Philadelphia, PA 19134",
     "latitude": 39.9967, "longitude": -75.1316, "current_wait_time": 10, "capacity": 35, "capacity_used": 15,
     "open_hours": "Mon–Fri 7am–8pm, Sat 7am–6pm", "phone": "(215) 555-0103"},
    {"name": "Grifols Plasma - West Philadelphia",   "address": "4600 Market St, Philadelphia, PA 19139",
     "latitude": 39.9590, "longitude": -75.2298, "current_wait_time": 12, "capacity": 45, "capacity_used": 22,
     "open_hours": "Mon–Sat 6am–8pm, Sun 7am–5pm", "phone": "(215) 555-0201"},
    {"name": "Grifols Plasma - Upper Darby",         "address": "69th St Terminal, Upper Darby, PA 19082",
     "latitude": 39.9595, "longitude": -75.2589, "current_wait_time": 18, "capacity": 32, "capacity_used": 18,
     "open_hours": "Mon–Sat 7am–7pm", "phone": "(610) 555-0202"},
    {"name": "Octapharma Plasma - Center City",      "address": "1427 Walnut St, Philadelphia, PA 19102",
     "latitude": 39.9496, "longitude": -75.1640, "current_wait_time": 6,  "capacity": 50, "capacity_used": 10,
     "open_hours": "Mon–Sat 6am–9pm, Sun 8am–5pm", "phone": "(215) 555-0301"},
    {"name": "Octapharma Plasma - South Philadelphia","address": "1840 S Broad St, Philadelphia, PA 19145",
     "latitude": 39.9269, "longitude": -75.1674, "current_wait_time": 22, "capacity": 35, "capacity_used": 28,
     "open_hours": "Mon–Fri 7am–7pm, Sat 8am–5pm", "phone": "(215) 555-0302"},
    {"name": "Octapharma Plasma - Frankford",        "address": "4601 Frankford Ave, Philadelphia, PA 19124",
     "latitude": 40.0108, "longitude": -75.0872, "current_wait_time": 9,  "capacity": 38, "capacity_used": 16,
     "open_hours": "Mon–Sat 7am–8pm", "phone": "(215) 555-0303"},
    {"name": "BioLife Plasma - University City",     "address": "3931 Walnut St, Philadelphia, PA 19104",
     "latitude": 39.9528, "longitude": -75.1992, "current_wait_time": 5,  "capacity": 50, "capacity_used": 8,
     "open_hours": "Mon–Sat 6am–9pm, Sun 8am–5pm", "phone": "(215) 555-0401"},
    {"name": "BioLife Plasma - South Street",        "address": "401 South St, Philadelphia, PA 19147",
     "latitude": 39.9430, "longitude": -75.1551, "current_wait_time": 15, "capacity": 30, "capacity_used": 12,
     "open_hours": "Mon–Fri 7am–7pm, Sat 8am–5pm", "phone": "(215) 555-0402"},
]


async def run():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    existing_names = set()
    async for c in db.donation_centers.find({}, {"name": 1}):
        existing_names.add(c["name"])

    to_insert = [c for c in PHILLY_CENTERS if c["name"] not in existing_names]
    if to_insert:
        now = datetime.now(timezone.utc)
        for c in to_insert:
            c["created_at"] = now
        result = await db.donation_centers.insert_many(to_insert)
        print(f"✓ Inserted {len(result.inserted_ids)} Philadelphia centers")
    else:
        print("✓ All Philadelphia centers already exist — nothing to insert")

    total = await db.donation_centers.count_documents({})
    print(f"  Total centers in DB: {total}")
    client.close()


if __name__ == "__main__":
    asyncio.run(run())
