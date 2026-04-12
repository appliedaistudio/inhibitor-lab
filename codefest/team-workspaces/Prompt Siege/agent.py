import asyncio
import os

from openai import OpenAI

from concurrency import request_slot


def _build_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("Missing OPENAI_API_KEY. Add it to your environment or .env file.")
    return OpenAI(api_key=api_key)


def ai_agent(user_message: str, model: str = "gpt-4o-mini") -> str:
    """LLM-powered agent with a simple planning-oriented system prompt."""
    with request_slot():
        client = _build_client()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a planning agent. Break the task into small steps, "
                        "reason carefully, and avoid asking the user clarifying questions. "
                        "End with [TASK COMPLETE] when the task is complete."
                    ),
                },
                {"role": "user", "content": user_message},
            ],
        )
    return response.choices[0].message.content or ""


async def ai_agent_async(user_message: str, model: str = "gpt-4o-mini") -> str:
    return await asyncio.to_thread(ai_agent, user_message, model)
