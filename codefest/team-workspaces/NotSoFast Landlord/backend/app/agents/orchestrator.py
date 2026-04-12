"""Multi-agent orchestrator for NotSoFast Landlord.

Coordinates the five specialized agents, owns the trace lifecycle, and
produces a single OrchestratorResult that agent.py returns to callers.

Pipeline:

    Intake → Retrieval → Drafting → Critic
                                      ↓
                        ┌────────────┴────────────┐
                        ↓ approve                  ↓ revise
                     Finalizer           Drafting (revision) → Critic (#2) → Finalizer

Critic can also return `escalate`, in which case Finalizer injects a
crisis preamble with 911 / hotline instructions.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from app.inhibitor import InhibitorClient
from app.logger import EventLogger
from app.rag import LegalRAG
from app.tracing import start_trace, span

from .agents import (
    IntakeAgent,
    RetrievalAgent,
    DraftingAgent,
    CriticAgent,
    FinalizerAgent,
)
from .schemas import AgentStep, IntakeResult


@dataclass
class OrchestratorResult:
    session_id: str
    trace_id: str
    final_response: str
    intervened: bool
    citations: list[str]
    inhibitor_verdict: dict[str, Any]
    intake: dict[str, Any]
    retrieval: dict[str, Any]
    critic: dict[str, Any]
    trace: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "trace_id": self.trace_id,
            "response": self.final_response,
            "intervened": self.intervened,
            "citations": self.citations,
            "inhibitor_verdict": self.inhibitor_verdict,
            "intake": self.intake,
            "retrieval": self.retrieval,
            "critic": self.critic,
            "trace": self.trace,
        }


class Orchestrator:
    def __init__(self, logger: EventLogger):
        self.logger = logger
        self.rag = LegalRAG()
        self.inhibitor = InhibitorClient()
        self.intake_agent = IntakeAgent()
        self.retrieval_agent = RetrievalAgent(self.rag)
        self.drafting_agent = DraftingAgent()
        self.critic_agent = CriticAgent(self.inhibitor)
        self.finalizer_agent = FinalizerAgent()

    async def run(
        self, user_message: str, session_id: str | None = None
    ) -> OrchestratorResult:
        session_id = session_id or str(uuid.uuid4())

        async with start_trace("chat.request", session_id=session_id) as trace:
            # 1. Intake — classify + extract entities + generate queries
            intake = await self.intake_agent.run(user_message)

            # 2. Retrieval — hybrid search (dense + BM25 + RRF)
            retrieval = await self.retrieval_agent.run(user_message, intake, k=5)
            chunks = retrieval["chunks"]

            # 3. Drafting — write the first response
            draft = await self.drafting_agent.run(user_message, intake, chunks)

            # 4. Critic — evaluate with Inhibitor + decide next step
            critique, verdict = await self.critic_agent.run(user_message, draft, intake)

            # 5. Revision loop (max 1 retry — hackathon budget)
            intervened = False
            final_draft = draft
            final_critique = critique
            final_verdict = verdict

            if critique.decision == "revise" and critique.required_changes:
                intervened = True
                from .agents import REVISION_INSTR_TEMPLATE
                fix_lines = "\n".join(f"  - {c}" for c in critique.required_changes)
                revision_instr = REVISION_INSTR_TEMPLATE.format(
                    decision=critique.decision,
                    reasoning=critique.reasoning,
                    fixes=fix_lines,
                )
                async with span("orchestrator.revision_loop"):
                    final_draft = await self.drafting_agent.run(
                        user_message, intake, chunks, revision_instructions=revision_instr
                    )
                    final_critique, final_verdict = await self.critic_agent.run(
                        user_message, final_draft, intake
                    )
            elif critique.decision == "escalate":
                intervened = True

            # 6. Finalizer — polish, add citations, inject crisis preamble if needed
            final_response = await self.finalizer_agent.run(
                final_draft, intake, chunks
            )

            # Assemble the response + structured trace for the Glass Box UI
            citations = list({
                c.get("source", "") for c in chunks if c.get("source")
            })
            result = OrchestratorResult(
                session_id=session_id,
                trace_id=trace.trace_id,
                final_response=final_response,
                intervened=intervened,
                citations=citations,
                inhibitor_verdict=final_verdict,
                intake=intake.model_dump(),
                retrieval={
                    "queries": retrieval.get("queries", []),
                    "mode_counts": retrieval.get("mode_counts", {}),
                    "chunks": [
                        {
                            "id": c.get("id", ""),
                            "source": c.get("source", ""),
                            "heading": c.get("heading", ""),
                            "retrieval_mode": c.get("retrieval_mode", ""),
                            "rrf_score": c.get("rrf_score", 0.0),
                        }
                        for c in chunks
                    ],
                },
                critic=final_critique.model_dump(),
            )
            result.trace = [
                {
                    "span_id": s.span_id,
                    "parent_id": s.parent_id,
                    "name": s.name,
                    "duration_ms": s.duration_ms,
                    "attributes": s.attributes,
                    "events": s.events,
                    "status": s.status,
                }
                for s in trace.spans
            ]

            # Persist intervention for Glass Box backwards compat
            self.logger.log_intervention(
                session_id=session_id,
                draft=draft,
                verdict=final_verdict,
                final=final_response,
            )
            self.logger.log_event(
                "chat.complete",
                session_id=session_id,
                trace_id=trace.trace_id,
                intervened=intervened,
                category=intake.category,
                urgency=intake.urgency,
                decision=final_critique.decision,
            )
            return result
