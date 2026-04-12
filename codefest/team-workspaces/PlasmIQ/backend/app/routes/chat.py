from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import logging
import json
from datetime import datetime, timezone, timedelta

from bson import ObjectId
from openai import OpenAI, AuthenticationError, APIConnectionError

from app.config import settings
from app.utils.db import get_database
from app.utils.inhibitor import inhibitor
from app.utils.validator import AppointmentValidator
from app.utils.chat_slots import (
    BOOKING_POINTS,
    build_reward_weighted_slots,
    slots_for_client,
    pending_booking_payload,
)
from app.utils.dataset_context import get_dataset_context

router = APIRouter()
logger = logging.getLogger(__name__)

validator = AppointmentValidator(
    max_per_week=settings.max_appointments_per_week,
    rest_days=settings.rest_days_between_donations,
)

ROUTER_SYSTEM = """Classify a donor's chat message for PlasmIQ scheduling.

Output ONLY a raw JSON object on a single line — no markdown, no backticks, no extra text.
Example: {"intent":"schedule","slot_choice":null,"requested_date":null,"requested_time":null}

intent must be exactly one of:
  schedule         - wants to book or find an appointment time
  confirm_booking  - confirms the pending slot (yes / sure / confirm / ok / sounds good)
  decline_booking  - refuses the pending slot (no / not that time / different time)
  inquire          - general question about plasma donation (not scheduling)
  reschedule       - move an existing booked appointment
  cancel           - cancel an existing appointment
  other            - greetings, thanks, off-topic

slot_choice: null OR integer 1-5 (which numbered option the donor wants; default 1 for confirmations)

requested_date: null OR a date string in YYYY-MM-DD format if the donor mentions a specific date
  (e.g. "31st May" → "2026-05-31", "next Friday" → resolve to the actual date, "tomorrow" → resolve to actual date).
  Today's date for reference: {today}. Use the current year unless the donor specifies otherwise.

requested_time: null OR an HH:MM string in 24-hour format if the donor specifies a time of day
  (e.g. "10 AM" → "10:00", "2:30 PM" → "14:30", "noon" → "12:00", "morning" → null, "afternoon" → null).
  Only set this when a specific clock time is mentioned, not vague words like "morning" or "evening".

IMPORTANT: if pending_booking is null in the input, never emit confirm_booking or decline_booking."""

CONCIERGE_REPLY_SYSTEM = """You are PlasmIQ's in-app concierge. Write ONLY the message text shown to the donor.

Hard rules:
- Never include chain-of-thought, analysis, scoring notes, or phrases like "based on" or "I recommend because".
- Do not ask for or discuss medical history, medications, diagnosis, HIV/hepatitis status, sexual history, or any regulatory eligibility screening. If asked, say eligibility is reviewed at the center and keep it brief.
- Do not ask for SSN, government ID numbers, or full legal/regulatory intake — direct them to complete those steps at the center or official intake only.
- Be warm, concise (under 120 words). Use plain language.

Scheduling rules (enforce these — never suggest or book slots that break them):
- Maximum 2 donations per calendar week (Mon–Sun).
- Minimum 1 full day of rest required between any two donations.
- If a slot is blocked by these rules, explain clearly which rule applies and when they can next donate.

Points system (always use these exact numbers when mentioning points):
- Booking via AI recommendation (chat or "Find Best Slot"): +1500 points
- Manual booking (self-selected from the Book Appointment page): +1000 points
- Points are only earned when an appointment is completed; cancelling deducts them.
- Redemption is available at 15,000 points minimum (100 pts = $1).

Context you may use: appointment times, center names, distance, weather in one short phrase, the +1500 booking bonus for this AI-recommended slot, and their approximate points balance after booking."""

INQUIRE_SYSTEM = """You are PlasmIQ's plasma donation assistant. Answer clearly and briefly.

Never ask the user for medical information, medications, risk behaviors, or ID numbers. Do not perform eligibility screening in chat.
If they ask "am I eligible", explain that trained staff determine eligibility at the center using standard procedures — you cannot assess that here.
For booking questions, explain they can confirm a suggested time in chat or use the Book Appointment page.

Scheduling policy (share this when relevant):
- Donors can book up to 2 appointments per week.
- At least 1 full day of rest is required between donations.

Points policy (use these exact numbers):
- AI-recommended booking (via chat or "Find Best Slot"): +1500 points
- Manual booking (self-selected on the Book Appointment page): +1000 points
- Points are awarded when the appointment is completed; cancelling deducts them.
- Minimum 15,000 points to redeem; 100 points = $1 (e.g. 15,000 pts = $150 cash voucher).

Keep answers under 160 words unless they ask for detail."""


class HistoryMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    donor_id: str
    message: str
    pending_booking: dict | None = None
    history: list[HistoryMessage] = []


class ChatResponse(BaseModel):
    message: str
    action: str
    data: dict = {}


def _client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


def _decode_donor_from_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    try:
        from jose import jwt, JWTError

        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except (JWTError, ValueError, KeyError):
        return None


def _router_payload(message: str, pending_booking: dict | None) -> str:
    return json.dumps(
        {
            "donor_message": message,
            "pending_booking": pending_booking,
        },
        ensure_ascii=False,
    )


def _router_system_with_date() -> str:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    return ROUTER_SYSTEM.replace("{today}", today)


def _extract_json(text: str) -> dict:
    """Extract first JSON object from model output (handles markdown fences)."""
    import re
    # Strip markdown code fences
    text = re.sub(r"```[a-z]*\n?", "", text).strip()
    # Find first {...}
    m = re.search(r"\{[^{}]+\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}


async def _classify_intent(message: str, pending_booking: dict | None) -> dict:
    # Heuristic fast-path — avoids an LLM call for the clearest cases
    t = message.lower().strip()
    if pending_booking:
        if _affirmative(message):
            return {"intent": "confirm_booking", "slot_choice": 1}
        if _negative(message):
            return {"intent": "decline_booking", "slot_choice": None}
    if t.isdigit() and 1 <= int(t) <= 5 and pending_booking:
        return {"intent": "confirm_booking", "slot_choice": int(t)}

    try:
        r = _client().chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": _router_system_with_date()},
                {"role": "user", "content": _router_payload(message, pending_booking)},
            ],
            temperature=0.1,
            max_tokens=120,
        )
        raw = (r.choices[0].message.content or "").strip()
        data = _extract_json(raw)
        if data.get("intent"):
            return data
        logger.warning(f"Intent parse gave empty intent, raw='{raw}'")
        return {"intent": "other", "slot_choice": None}
    except (AuthenticationError, APIConnectionError):
        raise
    except Exception as e:
        logger.warning(f"Intent router fallback: {e}")
        return {"intent": "other", "slot_choice": None}


def _affirmative(text: str) -> bool:
    t = text.lower().strip()
    return any(
        w in t
        for w in (
            "yes",
            "yeah",
            "yep",
            "confirm",
            "book it",
            "book that",
            "please book",
            "sounds good",
            "ok",
            "okay",
            "sure",
            "do it",
            "go ahead",
        )
    )


def _negative(text: str) -> bool:
    t = text.lower().strip()
    return any(w in t for w in ("no", "nope", "don't", "dont", "cancel that", "not that"))


def _build_system_with_context(base_system: str) -> str:
    ds = get_dataset_context()
    if ds:
        return f"{base_system}\n\n{ds}"
    return base_system


def _history_to_openai(history: list[HistoryMessage]) -> list[dict]:
    out = []
    for h in history[-12:]:  # last 12 turns max
        if h.role in ("user", "assistant"):
            out.append({"role": h.role, "content": h.content})
    return out



async def _polish_concierge_message(user_prompt: str, history: list[HistoryMessage] | None = None) -> str:
    try:
        sys_content = _build_system_with_context(CONCIERGE_REPLY_SYSTEM)
        msgs: list[dict] = [{"role": "system", "content": sys_content}]
        if history:
            msgs.extend(_history_to_openai(history))
        msgs.append({"role": "user", "content": user_prompt})
        r = _client().chat.completions.create(
            model=settings.openai_model,
            messages=msgs,
            temperature=0.4,
            max_tokens=220,
        )
        return (r.choices[0].message.content or "").strip()
    except (AuthenticationError, APIConnectionError):
        raise
    except Exception as e:
        logger.error(f"Concierge polish failed: {e}")
        return ""


async def _handle_inquire(message: str, history: list[HistoryMessage] | None = None) -> ChatResponse:
    try:
        sys_content = _build_system_with_context(INQUIRE_SYSTEM)
        msgs: list[dict] = [{"role": "system", "content": sys_content}]
        if history:
            msgs.extend(_history_to_openai(history))
        msgs.append({"role": "user", "content": message})
        r = _client().chat.completions.create(
            model=settings.openai_model,
            messages=msgs,
            temperature=0.35,
            max_tokens=400,
        )
        text = (r.choices[0].message.content or "").strip()
        return ChatResponse(message=text, action="chat", data={})
    except (AuthenticationError, APIConnectionError):
        raise
    except Exception as e:
        logger.error(f"Inquire failed: {e}")
        return ChatResponse(
            message="Thanks for your question. For personal eligibility, staff at the center will help. How else can I help with scheduling?",
            action="chat",
            data={},
        )


async def _why_near_term_blocked(donor_id: str, donor: dict, db) -> str | None:
    """
    Check the next 14 days and return a human-readable reason if every day
    is blocked by a scheduling rule. Returns None when slots are immediately available.
    """
    from datetime import timezone as _tz
    now = datetime.utcnow()
    all_appointments = await db.appointments.find({"donor_id": donor_id}).to_list(None)

    weekly_limit_hit = False
    rest_rule_hit = False

    for delta in range(1, 15):
        check = (now + timedelta(days=delta)).replace(
            hour=9, minute=0, second=0, microsecond=0
        )
        rest_err = validator._check_rest_days_violation(check, all_appointments)
        if rest_err:
            rest_rule_hit = True
            continue
        weekly_err = validator._check_weekly_limit_violation(check, all_appointments)
        if weekly_err:
            weekly_limit_hit = True
            continue
        return None  # found at least one open day within 14 days

    if weekly_limit_hit:
        return "you have already reached the maximum of 2 donations per week for the coming weeks"
    if rest_rule_hit:
        return "you need at least 1 full day of rest between donations"
    return None


async def _handle_schedule(
    donor_id: str,
    donor: dict,
    db,
    rejection_reason: str | None = None,
    history: list | None = None,
    requested_date: str | None = None,
    requested_hour: int | None = None,
) -> ChatResponse:
    # Use donor's stored location; fall back to Philadelphia city center so
    # suggestions always work even when coordinates aren't in the profile yet.
    _DEFAULT_LAT, _DEFAULT_LNG = 39.9526, -75.1652
    donor = dict(donor)
    if not donor.get("latitude") or not donor.get("longitude"):
        donor["latitude"] = _DEFAULT_LAT
        donor["longitude"] = _DEFAULT_LNG

    # Auto-detect why near-term dates are blocked (so the message explains it)
    if not rejection_reason:
        rejection_reason = await _why_near_term_blocked(donor_id, donor, db)

    slots = await build_reward_weighted_slots(donor_id, donor, db, limit=5, target_date=requested_date, requested_hour=requested_hour)
    if not slots and requested_date:
        # The specific date is fully blocked — fall back to nearest available slots and explain
        slots = await build_reward_weighted_slots(donor_id, donor, db, limit=5, requested_hour=requested_hour)
        if slots:
            rejection_reason = rejection_reason or f"the date you requested ({requested_date}) is not available due to rest or weekly limit rules"
        else:
            msg = await _polish_concierge_message(
                f"The donor asked for {requested_date} but it's blocked by rest or weekly limit rules, "
                "and no other slots are available soon either. Explain warmly and suggest using Book Appointment. No reasoning."
            )
            if not msg:
                msg = (
                    f"Unfortunately {requested_date} isn't available due to your rest or weekly limit schedule. "
                    "Try Book Appointment to browse all open dates."
                )
            return ChatResponse(message=msg, action="chat", data={})
    elif not slots:
        msg = await _polish_concierge_message(
            "Explain briefly that no matching slots were found soon — rest rules, weekly limits, or center hours. "
            "Suggest trying Book Appointment or a different day. No reasoning."
        )
        if not msg:
            msg = (
                "I couldn't find a matching slot right now — your rest schedule or center availability may be tight. "
                "Try Book Appointment or ask me again with a preferred day."
            )
        return ChatResponse(message=msg, action="chat", data={})

    top = slots[:3]
    client_slots = slots_for_client(top)
    alternatives = [pending_booking_payload(s) for s in top]
    pb = dict(alternatives[0])
    pb["_alternatives"] = alternatives

    lines = []
    for s in client_slots:
        lines.append(
            f"{s['rank']}) {s['center_name']} — {s['slot_time'][:16].replace('T', ' ')} "
            f"({s['distance_km']} km, +{BOOKING_POINTS} pts if you book)"
        )

    if rejection_reason:
        slot_lines = "\n".join(lines)
        prompt = f"""Donor name: {donor.get('name', 'friend')}. Current points: {donor.get('points', 0)}.
Booking rule violated: {rejection_reason}
Alternative slots:
{slot_lines}

Write a single empathetic message with EXACTLY this structure (no extra paragraphs, under 140 words):

SENTENCE 1 — Acknowledge the situation with genuine empathy. Start with "I'm sorry" or "Unfortunately". State the SPECIFIC rule that blocked the booking in plain language (e.g. "you can only donate twice per week" or "you need at least 1 day of rest between donations"). Do NOT use technical error codes or jargon.

SENTENCE 2 — Transition warmly, e.g. "But don't worry — here are some convenient options that work for you:"

LINES 3-5 — List each alternative exactly as given above (1), 2), 3) format).

FINAL SENTENCE — Ask them to reply **confirm** to book option 1, or type 1, 2, or 3 to choose a different slot. Mention the +{BOOKING_POINTS} booking points reward for this AI-recommended slot."""
    else:
        prompt = (
            f"Donor name: {donor.get('name', 'friend')}. Current points: {donor.get('points', 0)}.\n"
            f"Top options:\n" + "\n".join(lines) + "\n"
            "Write a short, friendly message presenting these options. "
            "Say the top pick is the best match for rewards and convenience in one short phrase (no technical reasoning). "
            "Ask them to reply **confirm** to book the top option, or say 1/2/3 to choose another line. "
            f"Mention the +{BOOKING_POINTS} booking points for this AI-recommended slot (vs +1000 for manual booking) and their approximate points after booking for the top slot."
        )

    msg = await _polish_concierge_message(prompt, history=history)
    if not msg:
        if rejection_reason:
            slot_list = " | ".join(
                f"{s['rank']}) {s['center_name']} {s['slot_time'][:16].replace('T',' ')}"
                for s in client_slots
            )
            msg = (
                f"I'm sorry, this booking couldn't go through — {rejection_reason} "
                f"But don't worry, here are some convenient options that work for you: "
                f"{slot_list}. "
                f"Reply confirm to book option 1, or type 1, 2, or 3 to choose another (+{BOOKING_POINTS} pts for this AI-recommended slot)."
            )
        else:
            msg = (
                f"Hi {donor.get('name', '').split()[0] or 'there'} — here are great times with full +{BOOKING_POINTS} booking points. "
                f"Top choice: {client_slots[0]['center_name']}. Reply **confirm** to book it, or pick 1–3."
            )

    return ChatResponse(
        message=msg,
        action="schedule",
        data={"slots": client_slots, "pending_booking": pb},
    )


async def _execute_booking(donor_id: str, donor: dict, pending: dict, db) -> ChatResponse:
    if not pending.get("center_id") or not pending.get("slot_time"):
        return ChatResponse(message="Something was missing from that booking — ask me for times again.", action="chat", data={})

    # Always use the ObjectId string from the fetched donor document so it
    # matches exactly what /api/appointments queries by (JWT sub = str(donor["_id"])).
    safe_donor_id = str(donor["_id"])

    try:
        slot_iso = pending["slot_time"]
        # Normalise: strip Z, add UTC offset if missing so fromisoformat handles it
        if slot_iso.endswith("Z"):
            slot_iso = slot_iso[:-1] + "+00:00"
        scheduled_time = datetime.fromisoformat(slot_iso)
        # Strip timezone to store naive UTC (consistent with rest of the codebase)
        if scheduled_time.tzinfo is not None:
            scheduled_time = scheduled_time.replace(tzinfo=None)
    except (ValueError, AttributeError) as e:
        logger.error(f"Bad slot_time format: {pending.get('slot_time')} — {e}")
        return ChatResponse(message="That time format was invalid. Try scheduling again.", action="chat", data={})

    ok, err = await validator.validate_appointment_slot(
        donor_id=safe_donor_id, proposed_time=scheduled_time, db=db, reason="chat_booking"
    )
    if not ok:
        is_weekly_limit = "maximum" in err.lower() and "week" in err.lower()
        is_rest_rule    = "rest" in err.lower()

        if is_weekly_limit:
            return await _handle_schedule(
                donor_id, donor, db,
                rejection_reason=(
                    "donors are only allowed 2 donations per week, "
                    "and you have already reached that limit for this week. "
                    f"Full detail: {err}"
                ),
            )

        if is_rest_rule:
            return await _handle_schedule(
                donor_id, donor, db,
                rejection_reason=(
                    "a minimum of 1 full day of rest is required between donations "
                    "to protect your health. "
                    f"Full detail: {err}"
                ),
            )

        # Generic rule violation — polish and return without alternative slots
        polished = await _polish_concierge_message(
            f"Booking was blocked by this rule: {err}\n"
            "Explain this warmly in 1–2 sentences. "
            "Tell the donor when they can next book and offer to find new slots. No reasoning."
        )
        return ChatResponse(
            message=polished or f"Sorry, I can't book that slot — {err} Want me to find a valid time?",
            action="chat",
            data={},
        )

    if not ObjectId.is_valid(pending["center_id"]):
        return ChatResponse(message="Invalid center ID. Please request new times.", action="chat", data={})

    center = await db.donation_centers.find_one({"_id": ObjectId(pending["center_id"])})
    if not center:
        return ChatResponse(message="That center is no longer available. Ask me for new times.", action="chat", data={})

    # Build rwd_snapshot; ensure all values are JSON-safe scalars
    raw_snap = pending.get("rwd_snapshot") or {}
    snap: dict | None = None
    if raw_snap and isinstance(raw_snap, dict):
        snap = {
            "travel_time_mins": raw_snap.get("travel_time_mins"),
            "wait_time_mins": raw_snap.get("wait_time_mins"),
            "weather": raw_snap.get("weather"),
            "friction_score": raw_snap.get("friction_score"),
        }

    # ── Slot capacity check (mirrors REST /appointments endpoint) ────────────
    template = await db.slot_templates.find_one({"center_id": pending["center_id"]})
    if template and template.get("is_active", True):
        slot_time_str = scheduled_time.strftime("%H:%M")
        slot_def = next(
            (s for s in template.get("slots", []) if s["time"] == slot_time_str), None
        )
        if slot_def is None:
            polished = await _polish_concierge_message(
                f"The time {slot_time_str} is not a valid slot at that center. "
                "Ask the donor to pick a different time and offer to find alternatives. 1–2 sentences."
            )
            return ChatResponse(
                message=polished or f"Sorry, {slot_time_str} isn't a valid slot at that center. Want me to find an alternative?",
                action="chat",
                data={},
            )
        slot_start = scheduled_time.replace(second=0, microsecond=0)
        slot_end = slot_start + timedelta(minutes=30)
        booked_count = await db.appointments.count_documents({
            "center_id": pending["center_id"],
            "status": {"$nin": ["cancelled", "rescheduled"]},
            "scheduled_time": {"$gte": slot_start, "$lt": slot_end},
        })
        if booked_count >= slot_def.get("capacity", 1):
            return await _handle_schedule(
                donor_id, donor, db,
                rejection_reason=f"the {slot_time_str} slot at that center is fully booked",
            )
    # ── End capacity check ───────────────────────────────────────────────────

    appt = {
        "donor_id": safe_donor_id,
        "center_id": pending["center_id"],
        "center_name": center.get("name", pending.get("center_name", "")),
        "center_address": center.get("address", pending.get("center_address", "")),
        "scheduled_time": scheduled_time,
        "status": "scheduled",
        "completed": False,
        "no_show": False,
        "points_earned": BOOKING_POINTS,
        "rwd_snapshot": snap,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.appointments.insert_one(appt)
    logger.info(f"Chat booking created: appointment={result.inserted_id} donor={safe_donor_id} center={center.get('name')} time={scheduled_time}")
    await db.donors.update_one({"_id": ObjectId(safe_donor_id)}, {"$inc": {"points": BOOKING_POINTS}})

    new_points = int(donor.get("points", 0)) + BOOKING_POINTS
    when = scheduled_time.strftime("%A %b %d at %I:%M %p").replace(" 0", " ")
    # JS-friendly: include ISO with no timezone so browser displays local-time
    slot_iso_display = scheduled_time.isoformat()
    msg = await _polish_concierge_message(
        f"Confirm booking success in 2 sentences: {center.get('name')} on {when}. "
        f"They now have about {new_points} points including the +{BOOKING_POINTS} booking bonus. "
        f"No reasoning. Warm tone."
    )
    if not msg:
        msg = f"You're booked at {center.get('name')} on {when}. You earned +{BOOKING_POINTS} points — about {new_points} pts total."

    return ChatResponse(
        message=msg,
        action="booked",
        data={
            "appointment_id": str(result.inserted_id),
            "points_earned": BOOKING_POINTS,
            "approximate_points": new_points,
            "booking_ticket": {
                "appointment_id": str(result.inserted_id),
                "center_name": center.get("name", ""),
                "center_address": center.get("address", ""),
                "slot_time": slot_iso_display,
                "points_earned": BOOKING_POINTS,
                "approximate_points": new_points,
                "status": "scheduled",
                "rwd_snapshot": snap,
            },
        },
    )


async def _handle_reschedule(donor_id: str, donor: dict, db, history: list | None = None) -> ChatResponse:
    latest = await db.appointments.find_one(
        {"donor_id": donor_id, "status": "scheduled"},
        sort=[("scheduled_time", -1)],
    )
    if not latest:
        return ChatResponse(
            message="I don't see an active appointment to reschedule. Want me to find a new time to book?",
            action="chat",
            data={},
        )
    return await _handle_schedule(donor_id, donor, db, history=history)


async def _handle_cancel(donor_id: str, db) -> ChatResponse:
    latest = await db.appointments.find_one(
        {"donor_id": donor_id, "status": "scheduled"},
        sort=[("scheduled_time", -1)],
    )
    if not latest:
        return ChatResponse(message="There's no active appointment to cancel.", action="chat", data={})
    await db.appointments.update_one(
        {"_id": latest["_id"]},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}},
    )
    return ChatResponse(
        message="I've cancelled your upcoming appointment. If you'd like, I can find a new time with full booking points.",
        action="cancelled",
        data={"appointment_id": str(latest["_id"])},
    )


@router.post("/send", response_model=ChatResponse)
async def send_chat_message(
    request: ChatRequest,
    db=Depends(get_database),
    authorization: str | None = Header(None),
):
    if not settings.openai_api_key:
        return ChatResponse(
            message="The AI assistant is not configured yet. Add OPENAI_API_KEY to the .env file.",
            action="chat",
        )

    sub = _decode_donor_from_token(authorization)
    if sub and sub != request.donor_id:
        raise HTTPException(status_code=403, detail="Donor mismatch.")

    try:
        donor = await db.donors.find_one({"_id": ObjectId(request.donor_id)})
        if not donor:
            raise HTTPException(status_code=404, detail="Donor not found")

        pb = request.pending_booking
        try:
            routed = await _classify_intent(request.message.strip(), pb)
        except AuthenticationError:
            logger.error("OpenAI authentication failed for chat router.")
            return ChatResponse(
                message="The AI assistant is temporarily unavailable (invalid API key). Please contact support.",
                action="chat",
            )
        except APIConnectionError:
            logger.error("OpenAI connection error for chat router.")
            return ChatResponse(
                message="The AI assistant is temporarily unavailable (network error). Please try again shortly.",
                action="chat",
            )
        intent = routed.get("intent") or "other"
        slot_choice = routed.get("slot_choice")
        requested_date = routed.get("requested_date") or None
        # Parse "HH:MM" → hour int (e.g. "10:00" → 10, "14:30" → 14)
        _rt = routed.get("requested_time") or None
        requested_hour: int | None = None
        if _rt:
            try:
                requested_hour = int(_rt.split(":")[0])
            except (ValueError, AttributeError):
                requested_hour = None
        if pb and request.message.strip().isdigit():
            n = int(request.message.strip())
            if 1 <= n <= 5:
                intent = "confirm_booking"
                slot_choice = n

        # Heuristic overrides for obvious confirmations
        if pb and _affirmative(request.message) and not _negative(request.message):
            intent = "confirm_booking"
        if pb and _negative(request.message) and not _affirmative(request.message):
            intent = "decline_booking"

        hist = request.history or []

        if intent == "confirm_booking" and pb:
            alts = pb.get("_alternatives")
            choice_idx = 1
            if isinstance(slot_choice, (int, float)) and int(slot_choice) >= 1:
                choice_idx = int(slot_choice)
            if alts and isinstance(alts, list) and 1 <= choice_idx <= len(alts):
                chosen = alts[choice_idx - 1]
            else:
                chosen = {k: v for k, v in pb.items() if k != "_alternatives"}
            response = await _execute_booking(request.donor_id, donor, chosen, db)
        elif intent == "decline_booking":
            response = ChatResponse(
                message="No problem — tell me a day or time range and I'll pull new options with the best rewards.",
                action="chat",
                data={"pending_booking": None},
            )
        elif intent == "schedule":
            response = await _handle_schedule(request.donor_id, donor, db, history=hist, requested_date=requested_date, requested_hour=requested_hour)
        elif intent == "reschedule":
            response = await _handle_reschedule(request.donor_id, donor, db, history=hist)
        elif intent == "cancel":
            response = await _handle_cancel(request.donor_id, db)
        elif intent == "inquire":
            response = await _handle_inquire(request.message, history=hist)
        else:
            msg = await _polish_concierge_message(
                f"Donor said: {request.message}\n"
                "Reply helpfully in one short paragraph. Offer scheduling help or plasma info. "
                "No medical/regulatory questions. No reasoning.",
                history=hist,
            )
            if not msg:
                msg = "I'm here to help with scheduling and general plasma donation info. Would you like me to find times?"
            response = ChatResponse(message=msg, action="chat", data={})

        # Ethical guard — responses are already constrained by CONCIERGE_REPLY_SYSTEM /
        # INQUIRE_SYSTEM prompts. Inhibitor is an optional extra layer; failure is silent.
        thought_chain = [
            {"role": "system", "content": "Evaluate if this message to a donor is ethical and appropriate."},
            {"role": "user", "content": f"Donor: {donor.get('name')}\nMessage: {response.message}"},
        ]
        inhibitor_check = inhibitor.evaluate_thought_chain(thought_chain, mode="performance")
        if "error" in inhibitor_check and "skipped" not in inhibitor_check:
            logger.debug(f"Inhibitor unavailable: {inhibitor_check.get('error', '?')}")

        return response

    except HTTPException:
        raise
    except AuthenticationError:
        logger.error("OpenAI authentication failed in chat pipeline.")
        return ChatResponse(
            message="The AI assistant is temporarily unavailable (invalid API key). Please contact support.",
            action="chat",
        )
    except APIConnectionError:
        logger.error("OpenAI connection error in chat pipeline.")
        return ChatResponse(
            message="The AI assistant is temporarily unavailable (network error). Please try again shortly.",
            action="chat",
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{donor_id}")
async def get_chat_history(
    donor_id: str,
    limit: int = 50,
    db=Depends(get_database),
    authorization: str | None = Header(None),
):
    """Return the last N stored chat messages for a donor."""
    sub = _decode_donor_from_token(authorization)
    if sub and sub != donor_id:
        raise HTTPException(status_code=403, detail="Donor mismatch.")
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    doc = await db.chat_history.find_one({"donor_id": donor_id})
    if not doc:
        return {"donor_id": donor_id, "messages": []}
    messages = doc.get("messages", [])[-limit:]
    return {"donor_id": donor_id, "messages": messages}


@router.post("/history/{donor_id}")
async def save_chat_history(
    donor_id: str,
    body: dict,
    db=Depends(get_database),
    authorization: str | None = Header(None),
):
    """Append messages to persisted chat history for a donor."""
    sub = _decode_donor_from_token(authorization)
    if sub and sub != donor_id:
        raise HTTPException(status_code=403, detail="Donor mismatch.")
    if not ObjectId.is_valid(donor_id):
        raise HTTPException(status_code=400, detail="Invalid donor ID.")
    messages = body.get("messages", [])
    if not isinstance(messages, list):
        raise HTTPException(status_code=400, detail="messages must be a list")
    safe_messages = [
        {"role": m.get("role", ""), "content": m.get("content", ""), "ts": m.get("ts")}
        for m in messages
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    await db.chat_history.update_one(
        {"donor_id": donor_id},
        {"$push": {"messages": {"$each": safe_messages, "$slice": -200}}},
        upsert=True,
    )
    return {"saved": len(safe_messages)}


# Legacy model name for OpenAPI
class ChatMessage(BaseModel):
    sender: str
    content: str
    donor_id: str
