"""Nominatim geocoder restricted to the Philadelphia bounding box.

Nominatim is poor at intersection queries ("X and Y Street"), so we
try multiple reformulations before giving up.
"""

import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
PHILLY_VIEWBOX = "-75.28,39.87,-74.96,40.14"
HEADERS = {"User-Agent": "PhillyPulse/0.1 (codefest hackathon project)"}

_cache: dict[str, tuple[float, float] | None] = {}


_STRIP_PREFIXES = re.compile(
    r"^(?:near\s+|outside\s+|in\s+front\s+of\s+|behind\s+|at\s+(?:the\s+)?)"
    r"|(?:\b(?:CVS|Wawa|7-Eleven|McDonald'?s|Dunkin|Target|Walmart)\b\s*(?:on|at|near)?\s*)",
    re.IGNORECASE,
)
_BLOCK_RE = re.compile(r"\b\d+\s+block\s+of\s+", re.IGNORECASE)


def _clean_location(loc: str) -> str:
    """Strip business names, 'block of' phrasing, etc."""
    s = loc.strip()
    s = _STRIP_PREFIXES.sub("", s).strip(", ")
    s = _BLOCK_RE.sub("", s).strip(", ")
    return s


def _make_queries(loc: str) -> list[str]:
    """Generate multiple query reformulations to maximise Nominatim hit rate."""
    queries: list[str] = []

    clean = _clean_location(loc)
    suffix = ", Philadelphia, PA"
    if re.search(r"philadelphia", clean, re.IGNORECASE):
        suffix = ", PA"

    queries.append(f"{clean}{suffix}")

    m = re.match(
        r"^(.+?)\s+(?:and|&|at)\s+(.+?)(?:,\s*Philadelphia)?$", clean, re.IGNORECASE
    )
    if m:
        a, b = m.group(1).strip(), m.group(2).strip()
        queries.append(f"{a} & {b}{suffix}")
        # only append Street/Avenue if the part doesn't already have a suffix
        if not re.search(r"(?:street|avenue|ave|blvd|road|rd|drive|dr|place|pl|way)\s*$", a, re.IGNORECASE):
            queries.append(f"{a} Street & {b} Avenue{suffix}")
            queries.append(f"{a} Avenue & {b} Street{suffix}")

    # try just the street name for single-street addresses (e.g. "Chester Avenue")
    if not m:
        queries.append(f"{clean} Street{suffix}")

    return queries


async def _try_nominatim(
    client: httpx.AsyncClient, query: str, *, bounded: bool = True
) -> Optional[tuple[float, float]]:
    params: dict[str, str] = {
        "q": query,
        "format": "json",
        "limit": "1",
    }
    if bounded:
        params["viewbox"] = PHILLY_VIEWBOX
        params["bounded"] = "1"

    resp = await client.get(NOMINATIM_URL, params=params, headers=HEADERS)
    if resp.status_code != 200:
        return None
    results = resp.json()
    if not results:
        return None
    lat = float(results[0]["lat"])
    lng = float(results[0]["lon"])
    # sanity-check that result is actually in Philly metro area
    if not (39.85 <= lat <= 40.15 and -75.30 <= lng <= -74.94):
        return None
    return (lat, lng)


async def geocode(location_text: str) -> Optional[tuple[float, float]]:
    """Geocode a location string to (lat, lng) within Philadelphia.

    Tries multiple query reformulations. Caches by normalized text.
    """
    if not location_text:
        return None

    key = location_text.strip().lower()
    if key in _cache:
        return _cache[key]

    queries = _make_queries(location_text)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for q in queries:
                result = await _try_nominatim(client, q, bounded=True)
                if result:
                    _cache[key] = result
                    logger.info("Geocoded '%s' -> (%f, %f) via '%s'", location_text, *result, q)
                    return result
            # last-resort: unbounded search
            result = await _try_nominatim(client, queries[0], bounded=False)
            if result:
                _cache[key] = result
                logger.info("Geocoded '%s' -> (%f, %f) [unbounded]", location_text, *result)
                return result

    except Exception as e:
        logger.warning("Geocode error for '%s': %s", location_text, e)

    logger.info("No geocode results for '%s' after %d attempts", location_text, len(queries))
    _cache[key] = None
    return None
