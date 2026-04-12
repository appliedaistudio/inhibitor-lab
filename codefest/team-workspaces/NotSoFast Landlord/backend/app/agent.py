"""Agent façade.

This file used to hold the single-LLM chat loop. It's now a thin
compatibility wrapper over the multi-agent Orchestrator in
`app.agents.orchestrator`. Callers (main.py routes, scripts/) keep the
same `Agent(logger).chat(message)` interface and get richer responses.
"""
from __future__ import annotations

from typing import Any

from app.agents import Orchestrator
from app.inhibitor import InhibitorClient
from app.logger import EventLogger


class Agent:
    def __init__(self, logger: EventLogger):
        self.logger = logger
        self.orchestrator = Orchestrator(logger=logger)
        self.inhibitor = self.orchestrator.inhibitor

    async def chat(self, message: str, session_id: str | None = None) -> dict[str, Any]:
        result = await self.orchestrator.run(message, session_id=session_id)
        return result.to_dict()

    async def verify_evidence(self, evidence: dict[str, Any]) -> dict[str, Any]:
        """Run drone-captured visual findings through Inhibitor before showing them.

        Each finding's `claim` field is evaluated. If Inhibitor flags the
        claim as unverified or overreaching, the claim is softened to a
        visual observation that a licensed inspector could confirm.
        """
        for finding in evidence.get("findings", []):
            draft_claim = finding.get("claim", "")
            verdict = await self.inhibitor.evaluate(
                draft=draft_claim,
                modality="vision",
                metadata={"detection": finding},
            )
            finding["inhibitor_verdict"] = verdict
            if not verdict.get("allow", True):
                finding["original_claim"] = draft_claim
                finding["claim"] = self._soften_claim(draft_claim)
                finding["intervened"] = True

        self.logger.save_evidence(evidence.get("session_id", "unknown"), evidence)
        return evidence

    @staticmethod
    def _soften_claim(claim: str) -> str:
        return (
            f"Visible condition detected: {claim}. "
            f"A licensed inspector would need to confirm whether this "
            f"constitutes a code violation."
        )
