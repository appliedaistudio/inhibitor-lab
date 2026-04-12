import os
import json
import requests
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Luna Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
INHIBITOR_API_URL = "https://iaas.appliedai.studio/check"
INHIBITOR_API_KEY = os.getenv("INHIBITOR_API_KEY")

# Load dataset at startup
try:
    raw_df = pd.read_csv("data/inhibitor_logs_50.csv", index_col=0)
    df = raw_df.T.reset_index(drop=True)
    df.columns = df.columns.str.strip()
    print(f"Loaded {len(df)} profiles")
except Exception as e:
    print(f"Warning: Could not load dataset: {e}")
    df = pd.DataFrame()


# --- Models ---
class UserProfile(BaseModel):
    first_name: str
    age: int
    weight: str
    height: str
    pregnant: bool
    activity_level: str

class ScreeningAnswers(BaseModel):
    fatigue: str
    pain: str
    irregular_periods: str
    mood_changes: str
    sleep_issues: str
    appetite_changes: str
    excessive_bleeding: str
    unexplained_weight_gain: str

class LunaRequest(BaseModel):
    profile: UserProfile
    screening: ScreeningAnswers
    location: str

class SentimentResult(BaseModel):
    label: str
    intensity: str

class LunaResponse(BaseModel):
    insight: str
    risk_level: str
    flagged: bool
    flag_reason: str | None = None
    sentiment: SentimentResult

class MatchRequest(BaseModel):
    profile: UserProfile
    screening: ScreeningAnswers
    location: str

class MatchedProfile(BaseModel):
    first_name: str
    age: int
    similarity_score: float
    shared_symptoms: list[str]

class MatchResponse(BaseModel):
    matches: list[MatchedProfile]
    match_summary: str
    flagged: bool
    flag_reason: str | None = None


# --- Helpers ---
def generate_insight(profile: UserProfile, screening: ScreeningAnswers) -> dict:
    prompt = f"""
You are Luna, a compassionate women's health assistant.

User profile:
- Age: {profile.age}
- Weight: {profile.weight}
- Height: {profile.height}
- Pregnant: {profile.pregnant}
- Activity level: {profile.activity_level}

Symptom screening:
- Fatigue: {screening.fatigue}
- Pain: {screening.pain}
- Irregular periods: {screening.irregular_periods}
- Mood changes: {screening.mood_changes}
- Sleep issues: {screening.sleep_issues}
- Appetite changes: {screening.appetite_changes}
- Excessive bleeding: {screening.excessive_bleeding}
- Unexplained weight gain: {screening.unexplained_weight_gain}

Respond ONLY with JSON:
{{
  "insight": "2-3 sentence health insight",
  "risk_level": "low" | "medium" | "high",
  "recommendation": "one sentence on whether to see a doctor"
}}
"""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are Luna, a compassionate women's health assistant. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=512,
    )
    raw = response.choices[0].message.content.strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)


def check_inhibitor(text: str) -> dict:
    try:
        response = requests.post(
            INHIBITOR_API_URL,
            headers={
                "X-API-Key": INHIBITOR_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "thought_chain": [
                    {"role": "agent", "content": text}
                ],
                "mode": "insight"
            },
            timeout=15,
        )
        print(response.status_code, response.text)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Inhibitor failed: {e}, returning safe default")
        return {"result": {"flagged": False, "explanation": None}}


def analyze_sentiment(screening: ScreeningAnswers) -> SentimentResult:
    text = f"fatigue: {screening.fatigue}, pain: {screening.pain}, mood: {screening.mood_changes}, sleep: {screening.sleep_issues}"
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "Classify the emotional tone of these health symptoms. "
                    'Respond ONLY with JSON: {{"label": "positive"|"neutral"|"negative", "intensity": "low"|"moderate"|"high"}}'
                ),
            },
            {"role": "user", "content": text},
        ],
        temperature=0,
        max_tokens=64,
    )
    raw = response.choices[0].message.content.strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    data = json.loads(raw)
    return SentimentResult(label=data["label"], intensity=data["intensity"])


def compute_similarity(user_profile: UserProfile, user_screening: ScreeningAnswers, row) -> float:
    score = 0
    total = 0

    field_mapping = {
        "pain": "painful_periods",
        "excessive_bleeding": "bleeding",
        "irregular_periods": "painful_periods",
        "unexplained_weight_gain": "obesity",
        "fatigue": "thinning_hair",
        "mood_changes": "darkening_skin",
    }

    for user_field, csv_field in field_mapping.items():
        user_val = str(getattr(user_screening, user_field)).lower()
        row_val = str(row.get(csv_field, "")).strip().lower()
        if row_val == "1": row_val = "yes"
        if row_val == "0": row_val = "no"
        if user_val == row_val:
            score += 1
        total += 1

    # Age within 5 years
    try:
        if abs(user_profile.age - int(row.get("age", 0))) <= 5:
            score += 1
        total += 1
    except: pass

    # Weight within 10
    try:
        user_w = int(str(user_profile.weight).replace("kg", "").strip())
        row_w = int(str(row.get("weight", 0)).strip())
        if abs(user_w - row_w) <= 10:
            score += 1
        total += 1
    except: pass

    return round(score / total, 2)


def get_shared_symptoms(user_screening: ScreeningAnswers, row) -> list[str]:
    shared = []
    field_mapping = {
        "pain": "painful_periods",
        "excessive_bleeding": "bleeding",
        "irregular_periods": "painful_periods",
        "unexplained_weight_gain": "obesity",
        "fatigue": "thinning_hair",
        "mood_changes": "darkening_skin",
    }
    for user_field, csv_field in field_mapping.items():
        user_val = str(getattr(user_screening, user_field)).lower()
        row_val = str(row.get(csv_field, "")).strip().lower()
        if row_val == "1": row_val = "yes"
        if row_val == "0": row_val = "no"
        if user_val == row_val == "yes":
            shared.append(user_field.replace("_", " "))
    return shared


SAFE_FALLBACK = (
    "Our safety system flagged this response. "
    "Please consult a qualified healthcare professional for personalized advice."
)


# --- Endpoints ---
@app.post("/analyze", response_model=LunaResponse)
def analyze(req: LunaRequest):
    try:
        result = generate_insight(req.profile, req.screening)
        insight = result["insight"] + " " + result["recommendation"]
        risk_level = result["risk_level"]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {exc}")

    try:
        inhibitor_result = check_inhibitor(insight)
        flagged = inhibitor_result.get("result", {}).get("flagged", False)
        flag_reason = inhibitor_result.get("result", {}).get("explanation") if flagged else None
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Inhibitor error: {exc}")

    try:
        sentiment = analyze_sentiment(req.screening)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Sentiment error: {exc}")

    return LunaResponse(
        insight=SAFE_FALLBACK if flagged else insight,
        risk_level="high" if flagged else risk_level,
        flagged=flagged,
        flag_reason=flag_reason,
        sentiment=sentiment,
    )


@app.post("/match", response_model=MatchResponse)
def match(req: MatchRequest):
    if df.empty:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    try:
        df["score"] = df.apply(
            lambda row: compute_similarity(req.profile, req.screening, row), axis=1
        )
        top = df.nlargest(5, "score")

        matches = []
        for _, row in top.iterrows():
            matches.append(MatchedProfile(
                first_name=str(row.get("first_name", "Anonymous")),
                age=int(row.get("age", 0)),
                similarity_score=row["score"],
                shared_symptoms=get_shared_symptoms(req.screening, row)
            ))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Matching error: {exc}")

    try:
        summary_prompt = f"""
You are Luna. {len(matches)} women with similar symptoms were found.
Their shared symptoms include: {matches[0].shared_symptoms if matches else 'various symptoms'}.
Write a 2-3 sentence compassionate summary telling the user they are not alone
and what these women commonly experienced. Do not diagnose.
"""
        summary_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": summary_prompt}],
            max_tokens=256
        )
        summary = summary_response.choices[0].message.content
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Summary error: {exc}")

    try:
        inhibitor_result = check_inhibitor(summary)
        flagged = inhibitor_result.get("result", {}).get("flagged", False)
        flag_reason = inhibitor_result.get("result", {}).get("explanation") if flagged else None
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Inhibitor error: {exc}")

    return MatchResponse(
        matches=matches,
        match_summary=SAFE_FALLBACK if flagged else summary,
        flagged=flagged,
        flag_reason=flag_reason,
    )