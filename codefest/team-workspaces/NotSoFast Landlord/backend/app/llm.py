"""LLM provider abstraction.

Lets the multi-agent pipeline run against either:
  - OpenAI (default, uses AsyncOpenAI + json_schema response_format)
  - Claude Code CLI subprocess (uses `claude -p --model ...`,
    requires the user to be logged in to Claude Code on this machine)

Selected via the LLM_PROVIDER env var:
    LLM_PROVIDER=openai       (default)
    LLM_PROVIDER=claude_cli

The Claude CLI provider was built as insurance during Philly Codefest
2026 when the staff-issued OpenAI key was revoked mid-event. It shells
out to the Claude Code binary on the user's $PATH and uses Claude Code's
own OAuth auth (no API key needed).
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from abc import ABC, abstractmethod
from typing import Any

try:
    from openai import AsyncOpenAI
    _HAS_OPENAI = True
except ImportError:
    _HAS_OPENAI = False


def get_provider() -> LLMProvider:
    """Returns the configured provider instance, picked by LLM_PROVIDER env var."""
    name = (os.getenv("LLM_PROVIDER") or "openai").strip().lower()
    if name == "claude_cli":
        return ClaudeCLIProvider()
    return OpenAIProvider()


class LLMProvider(ABC):
    """Minimal interface used by all the agents.

    Two methods cover the entire multi-agent pipeline:
      - chat(): freeform text generation (drafting agent)
      - structured(): JSON-schema-constrained generation (intake + critic)

    Both methods take a role list + system prompt, so swapping providers
    is a one-line config change.
    """

    name: str

    @abstractmethod
    async def chat(
        self,
        *,
        system: str,
        user: str,
        model: str | None = None,
        temperature: float = 0.3,
    ) -> str: ...

    @abstractmethod
    async def structured(
        self,
        *,
        system: str,
        user: str,
        schema: dict[str, Any],
        schema_name: str,
        model: str | None = None,
        temperature: float = 0.1,
    ) -> dict[str, Any]: ...


# ---------------------------------------------------------------------------
# OpenAI provider
# ---------------------------------------------------------------------------


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self):
        if not _HAS_OPENAI:
            raise RuntimeError("openai package not installed")
        self._client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        self.main_model = os.getenv("OPENAI_MODEL", "gpt-4o")
        self.fast_model = os.getenv("FAST_MODEL", "gpt-4o-mini")

    async def chat(self, *, system, user, model=None, temperature=0.3) -> str:
        resp = await self._client.chat.completions.create(
            model=model or self.main_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
        )
        return resp.choices[0].message.content or ""

    async def structured(
        self, *, system, user, schema, schema_name, model=None, temperature=0.1
    ) -> dict[str, Any]:
        resp = await self._client.chat.completions.create(
            model=model or self.fast_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "strict": False,
                    "schema": schema,
                },
            },
            temperature=temperature,
        )
        raw = resp.choices[0].message.content or "{}"
        return json.loads(raw)


# ---------------------------------------------------------------------------
# Claude Code CLI provider
# ---------------------------------------------------------------------------


JSON_EXTRACT_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


class ClaudeCLIProvider(LLMProvider):
    name = "claude_cli"

    def __init__(self):
        self.main_model = os.getenv("CLAUDE_MAIN_MODEL", "sonnet")
        self.fast_model = os.getenv("CLAUDE_FAST_MODEL", "haiku")
        self.binary = os.getenv("CLAUDE_BINARY", "claude")

    async def _run_cli(self, prompt: str, model: str) -> str:
        """Invoke `claude -p <prompt> --model <model>` as a subprocess."""
        proc = await asyncio.create_subprocess_exec(
            self.binary,
            "-p",
            "--model",
            model,
            prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(
                f"claude CLI exited {proc.returncode}: {stderr.decode()[:300]}"
            )
        return stdout.decode().strip()

    async def chat(self, *, system, user, model=None, temperature=0.3) -> str:
        prompt = f"{system}\n\n{user}"
        return await self._run_cli(prompt, model or self.main_model)

    async def structured(
        self, *, system, user, schema, schema_name, model=None, temperature=0.1
    ) -> dict[str, Any]:
        schema_block = json.dumps(schema, indent=2)
        prompt = (
            f"{system}\n\n"
            f"{user}\n\n"
            f"RESPOND WITH ONLY VALID JSON matching this schema:\n\n"
            f"```\n{schema_block}\n```\n\n"
            f"Return the JSON object and nothing else. No explanation, no markdown fences."
        )
        raw = await self._run_cli(prompt, model or self.fast_model)
        return self._parse_json(raw)

    @staticmethod
    def _parse_json(raw: str) -> dict[str, Any]:
        """Best-effort JSON extraction from a Claude response."""
        raw = raw.strip()
        if raw.startswith("{") and raw.endswith("}"):
            return json.loads(raw)
        m = JSON_EXTRACT_RE.search(raw)
        if m:
            return json.loads(m.group(1))
        # Fallback: find the first { and matching }
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            return json.loads(raw[start : end + 1])
        raise ValueError(f"Could not parse JSON from Claude CLI output: {raw[:200]}")
