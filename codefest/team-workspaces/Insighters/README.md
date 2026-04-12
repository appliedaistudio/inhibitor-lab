# Inhibitor Audit Pipeline

Glass Box audit dashboard backend — Challenge 3.

## Setup

```bash
pip install -r requirements.txt
```

Set your OpenAI API key:
```bash
export OPENAI_API_KEY=sk-...
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

## Usage

### 1. Start the server
```
uvicorn main:app --reload --port 8000
```

### 2. Trigger AI analysis (runs in background, ~2-3 min for all 120 sessions)
```
POST http://localhost:8000/analyze
```

### 3. Poll progress
```
GET http://localhost:8000/status
→ {"state": "running", "completed": 45, "total": 120}
```

### 4. Fetch results once done
```
GET http://localhost:8000/sessions              → all 120 session summaries
GET http://localhost:8000/sessions/1            → single session detail
GET http://localhost:8000/sessions?risk=high    → only high-risk sessions
GET http://localhost:8000/sessions?regulation=HIPAA
GET http://localhost:8000/overview              → aggregate stats
GET http://localhost:8000/health
```

## API Docs
Visit http://localhost:8000/docs for the interactive Swagger UI.

## Files
- `parser.py`   — loads CSV, groups into 120 session objects
- `analyzer.py` — OpenAI GPT-4o-mini analysis per session
- `main.py`     — FastAPI server with all endpoints
- `session_cache.json` — auto-generated after first analysis run (skips re-analysis on restart)
- `inhibitor_logs.csv` — source log file (read-only)

## Embedding in the frontend
Your teammate's website can fetch from these endpoints directly:
```js
const res = await fetch('http://localhost:8000/sessions');
const { sessions } = await res.json();
```
Make sure the server is running and CORS is open (it is, by default).
