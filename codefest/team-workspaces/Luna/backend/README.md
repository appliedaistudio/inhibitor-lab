# Luna Backend

## What is this?
FastAPI backend for Luna — an AI-powered women's health screening assistant.
Uses GPT-4o for health insights, sentiment analysis, and Inhibitor API for safety validation.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `.env`:
OPENAI_API_KEY=your_key
INHIBITOR_API_KEY=your_key

Run:
```bash
uvicorn main:app --reload
```

API docs: `http://localhost:8000/docs`

## Endpoints

### POST /analyze
Send user profile + symptoms, get back AI health insight validated by Inhibitor.

Request:
```json
{
  "profile": {
    "first_name": "Thu",
    "age": 21,
    "weight": "50kg",
    "height": "160cm",
    "pregnant": false,
    "activity_level": "moderate"
  },
  "screening": {
    "fatigue": "yes",
    "pain": "sometimes",
    "irregular_periods": "yes",
    "mood_changes": "yes",
    "sleep_issues": "no",
    "appetite_changes": "sometimes",
    "excessive_bleeding": "no",
    "unexplained_weight_gain": "yes"
  },
  "location": "Philadelphia"
}
```

Response:
```json
{
  "insight": "...",
  "risk_level": "see insight",
  "flagged": false,
  "flag_reason": null,
  "sentiment": {
    "label": "negative",
    "intensity": "moderate"
  }
}
```

## Stack
- FastAPI
- OpenAI GPT-4o
- Inhibitor API (safety validation)
- Python-dotenv