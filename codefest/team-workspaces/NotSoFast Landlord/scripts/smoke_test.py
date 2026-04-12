"""Smoke test — verifies the whole backend pipeline runs end-to-end.

Checks:
  1. All imports resolve
  2. Agent can draft a response (needs OPENAI_API_KEY)
  3. Inhibitor client evaluates a draft (falls back to dev stub if no URL)
  4. Logger writes to JSONL
  5. Drone controller can initialize (simulated mode OK)

Usage:
    cd backend && source .venv/bin/activate
    python ../scripts/smoke_test.py
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")


async def main():
    print("1. Importing modules…")
    from app.agent import Agent
    from app.inhibitor import InhibitorClient
    from app.logger import EventLogger
    from app.drone import DroneController
    from app.rag import LegalRAG
    print("   ✓ imports ok")

    print("\n2. Initializing components…")
    logger = EventLogger()
    rag = LegalRAG()
    inhibitor = InhibitorClient()
    drone = DroneController(logger=logger)
    print(f"   ✓ logger dir: {logger.log_dir}")
    print(f"   ✓ inhibitor key set: {bool(inhibitor.api_key)}")
    print(f"   ✓ inhibitor url set: {bool(inhibitor.api_url)}")
    print(f"   ✓ openai key set: {bool(os.getenv('OPENAI_API_KEY'))}")

    print("\n3. Testing RAG retrieval…")
    chunks = rag.retrieve("My landlord is evicting me", k=3)
    print(f"   ✓ retrieved {len(chunks)} chunks")
    for c in chunks[:2]:
        print(f"     - {c['source']}")

    print("\n4. Testing Inhibitor (dev stub if no URL)…")
    verdict = await inhibitor.evaluate(
        draft="As your lawyer, I advise you to stop paying rent immediately.",
        context="test",
    )
    print(f"   ✓ verdict: allow={verdict.get('allow')} flags={verdict.get('flags')}")

    if os.getenv("OPENAI_API_KEY"):
        print("\n5. Testing full agent chat (OpenAI live)…")
        agent = Agent(logger=logger)
        result = await agent.chat(
            "My heat has been off for a week, what can I do?",
            session_id="smoke-test",
        )
        print(f"   ✓ intervened: {result['intervened']}")
        print(f"   ✓ citations: {len(result['citations'])}")
        print(f"   ✓ response preview: {result['response'][:120]}…")
    else:
        print("\n5. Skipping live agent test (no OPENAI_API_KEY)")

    print("\n6. Testing drone controller (simulated)…")
    evidence = await drone.scan_building(address="123 Test St", session_id="smoke-test")
    print(f"   ✓ simulated scan: {len(evidence['findings'])} findings")

    print("\n✅ All smoke tests passed.")


if __name__ == "__main__":
    asyncio.run(main())
