import base64
import os
from pathlib import Path
from openai import AsyncOpenAI

VISION_PROMPT = """You are analyzing a drone photograph of the exterior of a Philadelphia rental building.

Identify any visible conditions that could indicate habitability issues under
Pennsylvania and Philadelphia law. For EACH condition found, respond with a JSON
object:

  {
    "category": "structural" | "exterior" | "safety" | "sanitary",
    "claim": "<short factual description of what's visible>",
    "confidence": <float 0-1>
  }

Rules:
- Describe ONLY what is visibly present in the photo. Do not speculate.
- Do NOT state that anything is a code violation. Only a licensed inspector can do that.
- Use plain English. No legal conclusions.
- If you see nothing concerning, return [].

Return a JSON array of findings. No prose.
"""


async def analyze_frame(image_path: Path) -> list[dict]:
    """Send one drone frame to a vision model and return structured findings.

    The agent layer will pass each finding's `claim` through Inhibitor
    before the user ever sees it — that's where legal-conclusion overreach
    gets caught.
    """
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    model = os.getenv("OPENAI_MODEL", "gpt-4o")

    try:
        b64 = base64.b64encode(Path(image_path).read_bytes()).decode("ascii")
    except Exception as e:
        return [{"category": "error", "claim": f"Could not read frame: {e}", "confidence": 0}]

    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": VISION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                ],
            }
        ],
        temperature=0.1,
    )

    import json
    raw = resp.choices[0].message.content or "[]"
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        findings = json.loads(raw)
        if not isinstance(findings, list):
            findings = []
    except json.JSONDecodeError:
        findings = []

    for f in findings:
        f["frame"] = str(image_path)
    return findings
