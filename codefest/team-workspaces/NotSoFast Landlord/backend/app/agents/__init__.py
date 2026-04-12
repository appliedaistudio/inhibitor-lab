"""Multi-agent orchestration for NotSoFast Landlord.

Five specialized agents collaborate on every tenant question:

    Intake  →  Retrieval  →  Drafting  →  Critic  →  Finalizer

Each agent has a well-defined role and structured I/O via OpenAI's
JSON-schema response_format. The Orchestrator coordinates them and emits
a full trace of every handoff for the Glass Box audit dashboard.

See agents/orchestrator.py for the coordination logic, agents/agents.py
for the individual agents, and agents/schemas.py for the I/O contracts.
"""
from .orchestrator import Orchestrator, OrchestratorResult

__all__ = ["Orchestrator", "OrchestratorResult"]
