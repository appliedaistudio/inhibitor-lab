'''
************************************************************

******************* PHILLY CODEFEST 2026 *******************

* PROJECT:- 
  Glass Box (Audit Dashboard)

* CORPORATE PARTNER:- 
  appliedAIStudio

* TEAM MEMBER(S):-
  1. Hitashi Kalra [hk835@drexel.edu]
  2. Puranjay Wadhera [pw425@drexel.edu]
  3. Haard Doshi [hhd27@drexel.edu]
  4. Aditya Raj [ar3989@drexel.edu]
  5. Parsa Ahmadi Nasab Emran [parsatempleowl@brandeis.edu]

* FILE NAME:-
  main.py - Handles the core implementation

************************************************************
'''


# Necessary Imports 
import json
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from parser import load_sessions
from analyzer import analyze_all_sessions, analyze_session


# Path to the cache file that stores the results after analysis thereby saving computational time and API credits
# CACHE_FILE = Path("session_cache.json")
# CSV_PATH = os.environ.get("LOG_CSV", "inhibitor_logs.csv")

CSV_PATH = os.environ.get("LOG_CSV", "inhibitor_logs_set_a.csv")
CACHE_FILE = Path(f"session_cache_{Path(CSV_PATH).stem}.json")

# In-memory store
_sessions_raw = []
_sessions_analyzed: list[dict] = []
_analysis_status = {"state": "idle", "completed": 0, "total": 0}


'''
FUNCTION NAME: _load_cache()
PARAMETER(S): NONE
RETURN VALUE(S): NONE
PURPOSE: Load previously analyzed sessions if they exist in order to save API credits
'''
def _load_cache():
    global _sessions_analyzed
    if CACHE_FILE.exists():
        _sessions_analyzed = json.loads(CACHE_FILE.read_text())
        _analysis_status["state"] = "done"
        _analysis_status["completed"] = len(_sessions_analyzed)
        _analysis_status["total"] = len(_sessions_analyzed)
        print(f"Loaded {len(_sessions_analyzed)} sessions from cache.")


'''
FUNCTION NAME: _save_cache()
PARAMETER(S): NONE
RETURN VALUE(S): NONE
PURPOSE: Produce a human-readable JSON for the results
'''
def _save_cache():
    CACHE_FILE.write_text(json.dumps(_sessions_analyzed, indent=2))


'''
FUNCTION NAME: _save_cache()
PARAMETER(S): NONE
RETURN VALUE(S): NONE
PURPOSE: This is the FAST lifespan hook that runs once when the server starts, but before accepting any requests.
'''
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _sessions_raw
    _sessions_raw = load_sessions(CSV_PATH)
    print(f"Parsed {len(_sessions_raw)} sessions from {CSV_PATH}")
    _load_cache()
    yield


app = FastAPI(
    title="Inhibitor Audit API",
    description="Glass Box audit dashboard API for Inhibitor intervention logs.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


'''
FUNCTION NAME: _run_analysis()
PARAMETER(S): NONE
RETURN VALUE(S): NONE
PURPOSE: Calls the LLM on all 120 sessions in tandem and stores results. Uses a pre-allocated results list (not append) so session order 
is preserved even though futures complete out of order.
'''
def _run_analysis():
    global _sessions_analyzed
    _analysis_status["state"] = "running"
    _analysis_status["total"] = len(_sessions_raw)
    _analysis_status["completed"] = 0

    from concurrent.futures import ThreadPoolExecutor, as_completed

    # Pre-allocate so index-based assignment preserves original session order
    results = [None] * len(_sessions_raw)

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_idx = {
            executor.submit(analyze_session, s): i
            for i, s in enumerate(_sessions_raw)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                s = _sessions_raw[idx]
                results[idx] = {
                    "session_id": s.session_id,
                    "started_at": s.started_at,
                    "risk_level": "unknown",
                    "risk_score": 0,
                    "summary": f"Analysis failed: {e}",
                    "top_observations": [],
                    "top_reasons": [],
                    "regulations": [],
                    "data_types_involved": [],
                    "recommended_action": "Retry analysis.",
                    "error": True,
                }
            _analysis_status["completed"] += 1

    _sessions_analyzed = [r for r in results if r is not None]
    _save_cache()
    _analysis_status["state"] = "done"
    print("Analysis complete. Cache saved.")


''' ******** ENDPOINTS ******** '''

@app.post("/analyze", summary="Trigger AI analysis of all sessions")
def trigger_analysis(background_tasks: BackgroundTasks):
    """
    Kick off OpenAI analysis for all 120 sessions in the background.
    Poll GET /status to track progress.
    """
    if _analysis_status["state"] == "running":
        return {"message": "Analysis already running.", "status": _analysis_status}
    background_tasks.add_task(_run_analysis)
    return {"message": "Analysis started.", "status": _analysis_status}


@app.get("/status", summary="Check analysis progress")
def get_status():
    return _analysis_status


@app.get("/sessions", summary="List all analyzed sessions")
def list_sessions(
    risk: str | None = None,
    regulation: str | None = None,
    limit: int = 120,
    offset: int = 0,
):
    # Returns all session summaries
    if not _sessions_analyzed:
        raise HTTPException(
            status_code=202,
            detail="Analysis not yet complete. POST /analyze to start, then poll GET /status.",
        )

    data = _sessions_analyzed

    if risk:
        data = [s for s in data if s.get("risk_level") == risk.lower()]

    if regulation:
        reg_lower = regulation.lower()
        data = [
            s for s in data
            if any(reg_lower in r.lower() for r in s.get("regulations", []))
        ]

    # Summary stats for the filtered set
    risk_counts = {"high": 0, "medium": 0, "low": 0, "unknown": 0}
    for s in data:
        risk_counts[s.get("risk_level", "unknown")] = (
            risk_counts.get(s.get("risk_level", "unknown"), 0) + 1
        )

    return {
        "total": len(data),
        "risk_summary": risk_counts,
        "sessions": data[offset: offset + limit],
    }


@app.get("/sessions/{session_id}", summary="Get one session detail")
def get_session(session_id: int):
    # Returns the full audit summary for a single session
    if not _sessions_analyzed:
        raise HTTPException(status_code=202, detail="Analysis not yet complete.")
    match = next((s for s in _sessions_analyzed if s["session_id"] == session_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    return match


@app.get("/overview", summary="Aggregate stats across all sessions")
def get_overview():
    # Top-level audit overview: risk distribution, top flags, regulations
    if not _sessions_analyzed:
        raise HTTPException(status_code=202, detail="Analysis not yet complete.")

    from collections import Counter

    risk_counts: Counter = Counter()
    all_regs: Counter = Counter()
    all_obs: Counter = Counter()
    all_reasons: Counter = Counter()
    all_data_types: Counter = Counter()

    for session in _sessions_analyzed:
        risk_counts[session.get("risk_level", "unknown")] += 1
        for regulation in session.get("regulations", []):
            all_regs[regulation] += 1
        for observation in session.get("top_observations", []):
            all_obs[observation] += 1
        for reason in session.get("top_reasons", []):
            all_reasons[reason] += 1
        for data_type in session.get("data_types_involved", []):
            all_data_types[data_type] += 1

    return {
        "total_sessions": len(_sessions_analyzed),
        "risk_distribution": dict(risk_counts),
        "top_regulations": dict(all_regs.most_common(10)),
        "top_observations": dict(all_obs.most_common(10)),
        "top_intervention_reasons": dict(all_reasons.most_common(10)),
        "top_data_types": dict(all_data_types.most_common(10)),
    }


@app.get("/health")
def health():
    return {"status": "ok", "sessions_parsed": len(_sessions_raw), "sessions_analyzed": len(_sessions_analyzed)}

@app.get("/dataset")
def get_dataset():
    return {"csv": CSV_PATH, "set": "b" if "set_b" in CSV_PATH else "a"}