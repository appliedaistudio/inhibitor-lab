"""Applied AI Studio Inhibitor API wrapper for PhillyPulse.

Evaluates LLM-extracted incident data through the Inhibitor ethical
guardrail before it gets displayed on the public map.
"""

import logging
import os
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

INHIBITOR_API_KEY = os.environ.get("INHIBITOR_API_KEY", "")
INHIBITOR_URL = "https://iaas.appliedai.studio/check"
INHIBITOR_TIMEOUT = float(os.environ.get("INHIBITOR_TIMEOUT", "10"))


@dataclass
class InhibitorResult:
    status: str          # "passed", "blocked", or "bypassed"
    reason: str | None   # explanation if blocked; None if passed
    raw_response: dict | None = None


async def check_incident(
    raw_transcript: str,
    severity_category: str,
    location_text: str | None,
    confidence: float,
) -> InhibitorResult:
    """Run the Inhibitor ethical guardrail on an extracted incident.

    Returns InhibitorResult with status="passed" if safe to display,
    "blocked" if the content should be suppressed, or "bypassed" if
    the Inhibitor service is unavailable.
    """
    if not INHIBITOR_API_KEY:
        logger.warning("INHIBITOR_API_KEY not set — bypassing ethical guardrail")
        return InhibitorResult(status="bypassed", reason="API key not configured")

    agent_content = (
        f"Extracted incident from Philadelphia police scanner: "
        f"category={severity_category}, "
        f"location={location_text or 'unknown'}, "
        f"confidence={confidence:.2f}. "
        f"Preparing to display on public community safety map with UNVERIFIED label."
    )

    payload = {
        "thought_chain": [
            {"role": "human", "content": f"Police scanner transcript: '{raw_transcript}'"},
            {"role": "agent", "content": agent_content},
        ],
        "mode": "performance",
    }

    try:
        async with httpx.AsyncClient(timeout=INHIBITOR_TIMEOUT) as client:
            resp = await client.post(
                INHIBITOR_URL,
                headers={
                    "X-API-Key": INHIBITOR_API_KEY,
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if resp.status_code == 401:
            logger.error("Inhibitor API returned 401 — invalid API key")
            return InhibitorResult(status="bypassed", reason="Invalid API key")

        if resp.status_code != 200:
            logger.error("Inhibitor API returned %d: %s", resp.status_code, resp.text)
            return InhibitorResult(
                status="bypassed",
                reason=f"API returned {resp.status_code}",
            )

        data = resp.json()
        result = data.get("result", {})

        # The Inhibitor API returns evaluation results in the result object.
        # Check for inhibition/block signals in the response.
        inhibited = result.get("inhibited", False)
        should_block = result.get("blocked", False) or inhibited

        if should_block:
            reason = result.get("reason") or result.get("explanation") or "Flagged by ethical guardrail"
            logger.info("Inhibitor BLOCKED: %s", reason)
            return InhibitorResult(
                status="blocked",
                reason=str(reason),
                raw_response=data,
            )

        logger.info("Inhibitor PASSED")
        return InhibitorResult(status="passed", reason=None, raw_response=data)

    except httpx.TimeoutException:
        logger.warning("Inhibitor API timed out after %.1fs — bypassing", INHIBITOR_TIMEOUT)
        return InhibitorResult(status="bypassed", reason="Timeout")
    except Exception as e:
        logger.warning("Inhibitor API error: %s — bypassing", e)
        return InhibitorResult(status="bypassed", reason=str(e))
