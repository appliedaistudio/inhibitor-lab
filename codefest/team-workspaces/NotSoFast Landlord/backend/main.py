import json
from fastapi import FastAPI, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Optional, Any
from app.agent import Agent
from app.logger import EventLogger
from app.drone import DroneController
from app.twilio_handler import build_twiml_reply
from app.llm import get_provider
from app import glass_box
from app import tracing

app = FastAPI(title="NotSoFast Landlord API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = EventLogger()
agent = Agent(logger=logger)
drone = DroneController(logger=logger)


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ScanRequest(BaseModel):
    session_id: Optional[str] = None
    address: Optional[str] = None


class AnalyzeRequest(BaseModel):
    system: str
    content: list[dict[str, Any]]
    case_type: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "notsofast-landlord"}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """Document analysis endpoint for the Vite frontend.

    Proxies the analysis through the configured LLM provider (OpenAI or Claude CLI).
    Accepts the same content blocks the frontend builds (text and/or image).
    Returns parsed JSON matching the NotSoFast analysis schema.
    """
    # Build a single user prompt from the content blocks
    text_parts = []
    for block in req.content:
        if block.get("type") == "text":
            text_parts.append(block.get("text", ""))
        elif block.get("type") == "image":
            text_parts.append("[Image attached — analyzing visible text and content]")

    user_prompt = "\n".join(text_parts)

    provider = get_provider()
    raw = await provider.chat(
        system=req.system,
        user=user_prompt,
        temperature=0.2,
    )

    # Parse the JSON from the LLM response
    raw = raw.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        # Try to find JSON in the response
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            result = json.loads(raw[start : end + 1])
        else:
            raise

    return JSONResponse(content=result)


@app.post("/chat")
async def chat(req: ChatRequest):
    """Main chat endpoint — drives the web and PWA surfaces."""
    result = await agent.chat(req.message, session_id=req.session_id)
    return result


@app.post("/sms")
async def sms(From: str = Form(...), Body: str = Form(...)):
    """Twilio SMS webhook. Returns TwiML."""
    result = await agent.chat(Body, session_id=From)
    return Response(content=build_twiml_reply(result["response"]), media_type="application/xml")


@app.post("/scan")
async def scan(req: ScanRequest):
    """Building Health Scan — drone takes off, flies pattern, vision analyzes."""
    evidence = await drone.scan_building(address=req.address, session_id=req.session_id)
    verified = await agent.verify_evidence(evidence)
    return verified


@app.get("/evidence/{session_id}")
def get_evidence(session_id: str):
    """Retrieve the latest evidence package for a session."""
    return logger.get_evidence(session_id)


@app.get("/logs/interventions")
def interventions():
    """Returns our own agent's Inhibitor intervention log (Challenge 2 evidence)."""
    return JSONResponse(content=logger.get_interventions())


# -------------------------------------------------------------------
# Challenge 3 — Glass Box (Audit Dashboard)
# Reads Applied AI Studio's shared sample_logs, parsed server-side.
# -------------------------------------------------------------------


@app.get("/glass-box/sets")
def glass_box_sets():
    return {"sets": glass_box.available_sets()}


@app.get("/glass-box/{set_name}/summary")
def glass_box_summary(set_name: str):
    return glass_box.get_dataset(set_name).summary()


@app.get("/glass-box/{set_name}/summaries")
def glass_box_summaries(set_name: str):
    return {"summaries": glass_box.get_dataset(set_name).summaries()}


@app.get("/glass-box/{set_name}/events")
def glass_box_events(set_name: str, offset: int = 0, limit: int = 200):
    return glass_box.get_dataset(set_name).events(offset=offset, limit=limit)


@app.get("/glass-box/{set_name}/lifecycles")
def glass_box_lifecycles(set_name: str, count: int = 5):
    return {"lifecycles": glass_box.get_dataset(set_name).lifecycle_samples(count=count)}


# -------------------------------------------------------------------
# Agent pipeline traces — visualizes the multi-agent reasoning chain.
# Each /chat call produces one trace. Useful for Glass Box "agent trace"
# tab and for the 20-pt Evidence rubric bucket.
# -------------------------------------------------------------------


@app.get("/traces")
def traces(limit: int = 50):
    return {"traces": tracing.recent_traces(limit=limit)}


@app.get("/traces/{trace_id}")
def trace_detail(trace_id: str):
    trace = tracing.get_trace(trace_id)
    if trace is None:
        return JSONResponse(status_code=404, content={"error": "trace not found"})
    return trace
