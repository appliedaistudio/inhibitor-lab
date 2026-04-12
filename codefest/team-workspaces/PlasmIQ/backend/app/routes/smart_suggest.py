"""
Smart Suggest router — Friction Score using real GeoLocation + WeatherService utilities.

Friction Score = (wait_time * 0.5) + (travel_time_mins * 0.3) + (weather_impact * 0.2)
Lower = better slot for the donor.
"""

import logging
import time
from fastapi import APIRouter, Query, Depends

from app.utils.db import get_database
from app.utils.geolocation import GeoLocation
from app.utils.weather import get_weather_service

router = APIRouter()
logger = logging.getLogger(__name__)

WEATHER_IMPACT_MAP = {
    "Clear": 0.0, "Clouds": 1.5, "Drizzle": 4.0,
    "Rain": 6.0, "Thunderstorm": 10.0, "Snow": 8.0,
    "Mist": 2.0, "Fog": 3.0, "Haze": 2.0,
}

# Simple in-process TTL cache: key → (timestamp, (weather_desc, weather_score))
_WEATHER_CACHE: dict[str, tuple[float, tuple[str, float]]] = {}
_WEATHER_TTL_SECONDS = 300  # 5 minutes


def _weather_friction(condition: str) -> float:
    return WEATHER_IMPACT_MAP.get(condition, 3.0)


def _get_weather_cached(lat: float, lng: float) -> tuple[str, float]:
    """Fetch weather with a 5-minute in-memory cache keyed by rounded coordinates."""
    # Round to 2 decimal places (~1 km grid) so nearby coords share the cache
    cache_key = f"{round(lat, 2)},{round(lng, 2)}"
    now = time.monotonic()

    cached = _WEATHER_CACHE.get(cache_key)
    if cached and (now - cached[0]) < _WEATHER_TTL_SECONDS:
        return cached[1]

    weather_service = get_weather_service()
    weather_desc, weather_score = "Clear", 0.0

    if weather_service:
        weather_data = weather_service.get_current_weather(lat, lng)
        if weather_data:
            weather_desc = weather_data.get("condition", "Clear")
            weather_score = _weather_friction(weather_desc)
    else:
        logger.info("Weather service not configured — using Clear/0.0")

    _WEATHER_CACHE[cache_key] = (now, (weather_desc, weather_score))
    return weather_desc, weather_score


@router.get("")
async def smart_suggest(
    lat: float = Query(..., description="Donor latitude"),
    lng: float = Query(..., description="Donor longitude"),
    db=Depends(get_database),
):
    centers = await db.donation_centers.find({}).to_list(20)
    if not centers:
        return []

    # Weather at donor's location (cached — avoids hammering API on rapid re-renders)
    weather_desc, weather_score = _get_weather_cached(lat, lng)

    slots = []
    for center in centers:
        center_lat = center.get("latitude", 0)
        center_lng = center.get("longitude", 0)

        travel_mins = GeoLocation.estimate_travel_time(lat, lng, center_lat, center_lng)
        wait_time = float(center.get("current_wait_time", 15))
        friction_score = (wait_time * 0.5) + (travel_mins * 0.3) + (weather_score * 0.2)

        slots.append({
            "center_id": str(center["_id"]),
            "center_name": center.get("name", ""),
            "address": center.get("address", ""),
            "lat": center_lat,
            "lng": center_lng,
            "travel_time_mins": round(float(travel_mins), 1),
            "wait_time_mins": int(wait_time),
            "weather": weather_desc,
            "weather_score": weather_score,
            "friction_score": round(friction_score, 2),
        })

    slots.sort(key=lambda x: x["friction_score"])
    return slots[:3]
