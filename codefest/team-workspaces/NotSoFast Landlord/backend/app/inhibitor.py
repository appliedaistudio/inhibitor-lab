"""Applied AI Studio — Inhibitor REST client.

Reference:
  - Repo:    https://github.com/appliedaistudio/inhibitor-lab
  - Docs:    https://github.com/appliedaistudio/inhibitor-lab/blob/main/docs/inhibitor-api.md
  - OpenAPI: https://iaas.appliedai.studio/openapi.json
  - Demo:    https://iaas-demo.replit.app/

Endpoint: POST /check
Auth:     X-API-Key header
Body:     { "thought_chain": [{role, content}], "mode": "insight" | "performance" }
Response: { "result": {"llm_inhibition": {...}, "rules_inhibition": {...}}, "version": "..." }

`llm_inhibition` has:
  - observations: dict of {key: {value, index, description}}
  - predictions:  dict of {key: {value, confidence, reason}}

`rules_inhibition` has:
  - passed: bool
  - violations: list

Everything else in this repo routes through the normalized shape this module
returns so the agent loop and Glass Box dashboard don't need to understand
the raw schema.
"""
import os
import httpx
from typing import Any

DEFAULT_API_URL = "https://iaas.appliedai.studio/check"


class InhibitorClient:
    def __init__(self):
        self.api_key = (os.getenv("INHIBITOR_API_KEY") or "").strip()
        url = (os.getenv("INHIBITOR_API_URL") or "").strip()
        self.api_url = url or DEFAULT_API_URL
        self.timeout = float(os.getenv("INHIBITOR_TIMEOUT_SECONDS", "30"))
        self.mode = os.getenv("INHIBITOR_MODE", "insight")

    async def evaluate(
        self,
        *,
        draft: str,
        user_message: str | None = None,
        context: str | None = None,
        modality: str = "text",
        metadata: dict[str, Any] | None = None,
    ) -> dict:
        """Evaluate an agent draft. Returns a normalized verdict.

        Shape returned by this method (consumed by agent.py and the dashboard):

            {
                "allow": bool,
                "flags": [str, ...],         # keys that fired
                "reasons": {key: str, ...},  # key → explanation
                "scores": {key: float, ...}, # key → confidence
                "raw": {...},                # original Inhibitor response
                "_source": "live" | "dev_stub",
            }
        """
        if not self.api_key or not self.api_url.startswith(("http://", "https://")):
            return self._dev_stub_verdict(draft)

        thought_chain: list[dict[str, str]] = []
        if user_message:
            thought_chain.append({"role": "human", "content": user_message})
        thought_chain.append({"role": "agent", "content": draft})

        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "thought_chain": thought_chain,
            "mode": self.mode,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(self.api_url, json=payload, headers=headers)
                resp.raise_for_status()
                raw = resp.json()
        except Exception as e:
            stub = self._dev_stub_verdict(draft)
            stub["_source"] = "dev_stub_error"
            stub["_error"] = str(e)
            return stub

        return self._normalize(raw)

    # Predictions with confidence at or above this threshold block the agent.
    # Observations are informational — they populate the audit trail but do
    # NOT by themselves cause an intervention. That matches how Inhibitor
    # observations work in practice: many of them describe what's happening
    # (including positive behavior like "ai_refuses_harmful_request").
    BLOCK_CONFIDENCE_THRESHOLD = 0.5

    @staticmethod
    def _normalize(raw: dict[str, Any]) -> dict[str, Any]:
        """Flatten Inhibitor's structured response into an internal verdict.

        Decision logic:
          - If `rules_inhibition.passed` is false → block
          - If any prediction with `value: true` has confidence ≥ threshold → block
          - Otherwise → allow (observations alone never block)

        All triggered observations AND predictions are recorded in `flags`
        so the Glass Box dashboard can show the full audit trail.
        """
        result = raw.get("result", {})
        llm = result.get("llm_inhibition", {}) or {}
        rules = result.get("rules_inhibition", {}) or {}

        observations = llm.get("observations", {}) or {}
        predictions = llm.get("predictions", {}) or {}

        flags: list[str] = []
        reasons: dict[str, str] = {}
        scores: dict[str, float] = {}
        blocking_flags: list[str] = []

        for key, obs in observations.items():
            if isinstance(obs, dict) and obs.get("value"):
                tag = f"obs:{key}"
                flags.append(tag)
                reasons[tag] = obs.get("description", "") or ""
                if "index" in obs:
                    scores[tag] = float(obs.get("index") or 0)

        for key, pred in predictions.items():
            if isinstance(pred, dict) and pred.get("value"):
                tag = f"pred:{key}"
                conf = float(pred.get("confidence") or 0)
                flags.append(tag)
                reasons[tag] = pred.get("reason", "") or ""
                scores[tag] = conf
                if conf >= InhibitorClient.BLOCK_CONFIDENCE_THRESHOLD:
                    blocking_flags.append(tag)

        rules_passed = rules.get("passed", True)
        violations = rules.get("violations", []) or []
        for i, v in enumerate(violations):
            tag = f"rule:{v.get('id', i)}" if isinstance(v, dict) else f"rule:{i}"
            flags.append(tag)
            reasons[tag] = v.get("message", "") if isinstance(v, dict) else str(v)
            blocking_flags.append(tag)

        allow = rules_passed and len(blocking_flags) == 0

        return {
            "allow": allow,
            "flags": flags,
            "blocking_flags": blocking_flags,
            "reasons": reasons,
            "scores": scores,
            "raw": raw,
            "_source": "live",
        }

    @staticmethod
    def _dev_stub_verdict(draft: str) -> dict:
        """Heuristic dev-mode verdict so the stack runs without a live Inhibitor."""
        lowered = draft.lower()
        flags: list[str] = []
        reasons: dict[str, str] = {}
        scores: dict[str, float] = {}

        if "as your lawyer" in lowered or "i am your attorney" in lowered:
            flags.append("obs:ai_impersonates_professional")
            reasons["obs:ai_impersonates_professional"] = "Impersonation of legal counsel"
            scores["obs:ai_impersonates_professional"] = 0.9

        if any(p in lowered for p in ["you will win", "you'll definitely", "guaranteed"]):
            flags.append("pred:unjustified_claim")
            reasons["pred:unjustified_claim"] = "Predictive claim without basis"
            scores["pred:unjustified_claim"] = 0.8

        if "stop paying rent" in lowered or "change the locks" in lowered:
            flags.append("obs:ai_outputs_harmful_instruction")
            reasons["obs:ai_outputs_harmful_instruction"] = "Potentially escalatory instruction"
            scores["obs:ai_outputs_harmful_instruction"] = 0.8

        has_citation = any(c in draft for c in ["§", "P.S.", "Phila. Code"])
        if not has_citation and len(draft) > 80:
            flags.append("obs:ai_claim_without_evidence")
            reasons["obs:ai_claim_without_evidence"] = "Legal claim without citation"
            scores["obs:ai_claim_without_evidence"] = 0.6

        return {
            "allow": len(flags) == 0,
            "flags": flags,
            "reasons": reasons,
            "scores": scores,
            "raw": {"result": {"llm_inhibition": {}, "rules_inhibition": {"passed": True}}},
            "_source": "dev_stub",
        }
