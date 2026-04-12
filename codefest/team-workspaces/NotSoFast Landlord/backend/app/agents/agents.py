"""The five specialized agents that power NotSoFast Landlord.

Each class has a single `run()` method with typed inputs and outputs.
The orchestrator coordinates them and owns the global trace.
"""
from __future__ import annotations

import json
import os
from typing import Any

from app.inhibitor import InhibitorClient
from app.llm import get_provider, LLMProvider
from app.rag import LegalRAG
from app.tracing import span, add_event, set_attributes
from .schemas import INTAKE_SCHEMA, CRITIC_SCHEMA, IntakeResult, CriticResult


def _provider() -> LLMProvider:
    return get_provider()


INTAKE_SYSTEM = """You are the Intake Agent for NotSoFast Landlord, an AI tenant-rights
assistant for Philadelphia.

Your job: take the user's raw message and produce a structured JSON brief
that downstream agents can act on. Classify the tenant's situation,
extract any entities (location, timeframe, what the landlord did), gauge
urgency, and generate 2-3 search queries for the legal corpus.

Categories:
  - eviction:      anything about being told to leave, notices, court
  - lockout:       landlord changed locks, removed belongings, shut off utilities
  - habitability:  heat, water, pests, mold, structural, code violations
  - deposit:       security deposit issues
  - discrimination: protected-class issues (race, disability, family status, source of income)
  - entry:         landlord entering without notice
  - retaliation:   landlord retaliating after a complaint or report
  - crisis:        imminent danger, violence, weapon, child safety, medical
  - other:         anything else

Urgency:
  - immediate:  active physical danger, ongoing illegal lockout, weapon
  - urgent:     deadline-sensitive within ~72 hours
  - standard:   normal question

Always return valid JSON matching the provided schema."""


DRAFTING_SYSTEM = """You are the Drafting Agent for NotSoFast Landlord.

Write a warm, plain-English reply to a Philadelphia renter. Every legal
claim MUST cite a specific PA statute or Philadelphia Code section
(e.g. "68 P.S. § 250.501" or "Phila. Code § 9-804") drawn from the
retrieved context. Under 220 words.

Hard rules:
  - You are NOT a lawyer. Never claim to be one.
  - Only cover Pennsylvania / Philadelphia. Refuse other jurisdictions.
  - Never predict court outcomes.
  - On any crisis or active danger, include 911 and the Philly Tenant Hotline (267-443-2500).
  - Always direct the user to Community Legal Services (215-981-3700) at the end.
  - Only use facts that appear in the retrieved context. If the context
    doesn't cover it, say so and redirect to CLS.

Tone: the friend who happens to know tenant law. No lectures, no
legalese, no corporate hedging."""


REVISION_INSTR_TEMPLATE = """The Critic Agent flagged the previous draft for revision.

Decision:       {decision}
Reasoning:      {reasoning}
Required fixes:
{fixes}

Rewrite the draft above to address every required fix. Keep the warm,
plain-English tone. Keep it under 220 words. Keep citations specific."""


CRITIC_SYSTEM = """You are the Critic Agent for NotSoFast Landlord. You receive a draft
response from the Drafting Agent plus a structured verdict from the
Inhibitor guardrail service. Decide what to do with the draft.

Decisions:
  - approve:  the draft is safe, cited, and ready to ship to the user
  - revise:   the draft has fixable issues; list them specifically
  - escalate: the situation is beyond what an AI can safely handle; the
              response should redirect to 911 / hotline / CLS immediately

Inhibitor's flags matter but are not the whole story — also check:
  - Is every legal claim cited with a specific statute?
  - Is there a crisis signal in the user's message that requires
    immediate 911 / hotline escalation?
  - Does the response impersonate a lawyer, predict outcomes, or
    cover out-of-scope jurisdictions?

Return valid JSON matching the provided schema."""


class IntakeAgent:
    async def run(self, user_message: str) -> IntakeResult:
        async with span("agent.intake", agent="IntakeAgent") as sp:
            provider = _provider()
            data = await provider.structured(
                system=INTAKE_SYSTEM,
                user=user_message,
                schema=INTAKE_SCHEMA,
                schema_name="IntakeResult",
                temperature=0.1,
            )
            result = IntakeResult(**data)
            set_attributes(
                provider=provider.name,
                category=result.category,
                urgency=result.urgency,
                query_count=len(result.retrieval_queries),
            )
            add_event("intake.classified",
                      category=result.category, urgency=result.urgency)
            return result


class RetrievalAgent:
    def __init__(self, rag: LegalRAG):
        self.rag = rag

    async def run(
        self, user_message: str, intake: IntakeResult, k: int = 5
    ) -> dict[str, Any]:
        async with span("agent.retrieval", agent="RetrievalAgent") as sp:
            queries = list(intake.retrieval_queries) or [user_message]

            seen: set[str] = set()
            merged: list[dict[str, Any]] = []
            per_query: list[dict[str, Any]] = []

            for q in queries[:3]:
                chunks = self.rag.retrieve(q, k=k)
                per_query.append({"query": q, "count": len(chunks)})
                for c in chunks:
                    cid = c.get("id") or (c.get("source", "") + c.get("heading", ""))
                    if cid in seen:
                        continue
                    seen.add(cid)
                    merged.append(c)

            merged.sort(key=lambda c: c.get("rrf_score", 0.0), reverse=True)
            top = merged[:k]

            mode_counts: dict[str, int] = {}
            for c in top:
                m = c.get("retrieval_mode", "unknown")
                mode_counts[m] = mode_counts.get(m, 0) + 1

            set_attributes(
                queries_issued=len(queries),
                chunks_retrieved=len(top),
                retrieval_modes=mode_counts,
            )
            add_event("retrieval.complete",
                      chunks=len(top), modes=mode_counts)

            return {
                "queries": queries,
                "chunks": top,
                "per_query": per_query,
                "mode_counts": mode_counts,
            }


class DraftingAgent:
    async def run(
        self,
        user_message: str,
        intake: IntakeResult,
        chunks: list[dict[str, Any]],
        revision_instructions: str | None = None,
    ) -> str:
        async with span("agent.drafting", agent="DraftingAgent") as sp:
            context = "\n\n".join(
                f"[{c.get('source', 'unknown')}]\n{c.get('text', '')}"
                for c in chunks
            )
            user_block = (
                f"Tenant category: {intake.category} ({intake.urgency})\n"
                f"Tenant message: {user_message}\n\n"
                f"Retrieved context:\n{context}"
            )
            if revision_instructions:
                user_block += f"\n\n{revision_instructions}"

            provider = _provider()
            draft = await provider.chat(
                system=DRAFTING_SYSTEM,
                user=user_block,
                temperature=0.3,
            )
            set_attributes(
                provider=provider.name,
                revision=bool(revision_instructions),
                draft_len=len(draft),
            )
            add_event("drafting.complete",
                      length=len(draft), revision=bool(revision_instructions))
            return draft


class CriticAgent:
    def __init__(self, inhibitor: InhibitorClient):
        self.inhibitor = inhibitor

    async def run(
        self,
        user_message: str,
        draft: str,
        intake: IntakeResult,
    ) -> tuple[CriticResult, dict[str, Any]]:
        async with span("agent.critic", agent="CriticAgent") as sp:
            verdict = await self.inhibitor.evaluate(
                draft=draft,
                user_message=user_message,
                modality="text",
                metadata={"category": intake.category, "urgency": intake.urgency},
            )
            set_attributes(
                inhibitor_allow=verdict.get("allow", True),
                inhibitor_source=verdict.get("_source", "unknown"),
                flag_count=len(verdict.get("flags", [])),
                blocking_count=len(verdict.get("blocking_flags", [])),
            )
            add_event("inhibitor.verdict",
                      allow=verdict.get("allow", True),
                      flags=verdict.get("flags", []))

            flag_summary = ", ".join(verdict.get("flags", [])) or "none"
            blocking_summary = ", ".join(verdict.get("blocking_flags", [])) or "none"

            critic_input = (
                f"User message: {user_message}\n\n"
                f"Tenant category: {intake.category} (urgency: {intake.urgency})\n\n"
                f"Draft response:\n---\n{draft}\n---\n\n"
                f"Inhibitor verdict:\n"
                f"  allow: {verdict.get('allow', True)}\n"
                f"  flags observed: {flag_summary}\n"
                f"  blocking flags: {blocking_summary}\n"
            )
            provider = _provider()
            data = await provider.structured(
                system=CRITIC_SYSTEM,
                user=critic_input,
                schema=CRITIC_SCHEMA,
                schema_name="CriticResult",
                temperature=0.1,
            )
            result = CriticResult(**data)
            set_attributes(provider=provider.name, critic_decision=result.decision)
            add_event("critic.decision",
                      decision=result.decision,
                      fix_count=len(result.required_changes))
            return result, verdict


class FinalizerAgent:
    RESOURCES_FOOTER = (
        "\n\n---\n"
        "*Not legal advice. Free help:*\n"
        "- **Community Legal Services:** 215-981-3700\n"
        "- **Philly Tenant Hotline:** 267-443-2500\n"
        "- **If you're in immediate danger: call 911**"
    )

    CRISIS_PREAMBLE = (
        "🚨 **This sounds like a crisis. Please do this first:**\n"
        "1. If you're in physical danger: call **911** right now.\n"
        "2. Call the **Philly Tenant Hotline: 267-443-2500** — they have after-hours support.\n"
        "3. Document everything with photos, texts, and witness names.\n\n"
        "Here's what the law says:\n\n"
    )

    async def run(
        self,
        draft: str,
        intake: IntakeResult,
        chunks: list[dict[str, Any]],
    ) -> str:
        async with span("agent.finalizer", agent="FinalizerAgent") as sp:
            body = draft.strip()
            if intake.urgency == "immediate" or intake.category in ("crisis", "lockout"):
                if "911" not in body:
                    body = self.CRISIS_PREAMBLE + body
            final = body + self.RESOURCES_FOOTER
            set_attributes(
                injected_crisis_preamble=self.CRISIS_PREAMBLE in final,
                final_len=len(final),
            )
            return final
