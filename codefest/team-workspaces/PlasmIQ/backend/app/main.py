from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.utils.db import connect_to_mongo, close_mongo_connection, get_database
from app.utils.inhibitor import inhibitor
from app.routes import donors, appointments, chat, auth, centers, smart_suggest, slots, admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PlasmIQ backend…")
    await connect_to_mongo()

    if inhibitor.health_check():
        logger.info("✓ Inhibitor API connected")
    else:
        logger.warning("⚠ Inhibitor API not reachable — messages will pass through unvalidated")

    db = get_database()
    if db is not None:
        await db.donors.create_index("email", unique=True)
        await db.appointments.create_index([("donor_id", 1), ("scheduled_time", 1)])
        await db.donation_centers.create_index([("latitude", 1), ("longitude", 1)])
        await db.slot_templates.create_index("center_id")
        logger.info("✓ Database indexes created")

    yield

    logger.info("Shutting down PlasmIQ backend…")
    await close_mongo_connection()


app = FastAPI(
    title="PlasmIQ API",
    description="Unified backend for the PlasmIQ plasma donor platform.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

# Core resources
app.include_router(centers.router, prefix="/api/centers", tags=["Centers"])
app.include_router(donors.router, prefix="/api/donors", tags=["Donors"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])

# AI / RWD
app.include_router(smart_suggest.router, prefix="/api/smart-suggest", tags=["Smart Suggest"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

# Slots
app.include_router(slots.router, prefix="/api/slots", tags=["Slots"])

# Admin
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/")
async def root():
    return {"message": "PlasmIQ API", "status": "running", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "inhibitor_api": "connected" if inhibitor.health_check() else "disconnected",
        "database": "connected",
    }
