"""Structured I/O contracts for the multi-agent pipeline.

Every agent produces JSON matching a schema here, validated by OpenAI's
response_format. Keeps handoffs typed, visualizable, and easy to replay.
"""
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


# -------- Intake Agent --------

class IntakeEntities(BaseModel):
    location: str | None = Field(
        default=None,
        description="ZIP code, neighborhood, or street location if mentioned",
    )
    timeframe: str | None = Field(
        default=None,
        description="Any time window mentioned (e.g. '3 days', 'last month', 'right now')",
    )
    described_action: str | None = Field(
        default=None,
        description="The specific action the user describes their landlord taking",
    )


class IntakeResult(BaseModel):
    category: str = Field(
        description=(
            "One of: eviction, lockout, habitability, deposit, discrimination, "
            "entry, retaliation, crisis, other"
        )
    )
    urgency: str = Field(
        description=(
            "One of: immediate (active danger / illegal lockout), "
            "urgent (days-sensitive), standard"
        )
    )
    entities: IntakeEntities = Field(default_factory=IntakeEntities)
    user_intent_summary: str = Field(
        description="One-sentence paraphrase of what the user needs"
    )
    retrieval_queries: list[str] = Field(
        description=(
            "2-3 specific search queries for the tenant law corpus, covering "
            "both the main topic and any secondary angles"
        )
    )


INTAKE_SCHEMA = IntakeResult.model_json_schema()


# -------- Critic Agent --------

class CriticResult(BaseModel):
    decision: str = Field(
        description="One of: approve, revise, escalate"
    )
    reasoning: str = Field(
        description="One-paragraph explanation of the decision"
    )
    required_changes: list[str] = Field(
        description=(
            "If decision is 'revise', list specific things the drafter must fix. "
            "Empty list if approved."
        )
    )


CRITIC_SCHEMA = CriticResult.model_json_schema()


# -------- Orchestrator result --------

class AgentStep(BaseModel):
    agent: str
    started_at: float
    duration_ms: float
    summary: str
    data: dict[str, Any] = Field(default_factory=dict)


class OrchestratorResultModel(BaseModel):
    session_id: str
    trace_id: str
    final_response: str
    intervened: bool
    citations: list[str]
    inhibitor_verdict: dict[str, Any] = Field(default_factory=dict)
    trace: list[AgentStep] = Field(default_factory=list)
    retrieval: dict[str, Any] = Field(default_factory=dict)
    intake: dict[str, Any] = Field(default_factory=dict)
    critic: dict[str, Any] = Field(default_factory=dict)
