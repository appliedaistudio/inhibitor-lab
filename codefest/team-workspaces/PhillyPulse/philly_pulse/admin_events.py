"""In-memory event bus for admin WebSocket streaming.

Pipeline stages broadcast events here; connected admin WebSocket clients
receive them in real time.
"""

import asyncio
import json
import logging
import time
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)

_clients: set[WebSocket] = set()
_lock = asyncio.Lock()
_recent: list[dict] = []
MAX_RECENT = 200


async def connect(ws: WebSocket):
    await ws.accept()
    async with _lock:
        _clients.add(ws)
    for evt in _recent[-50:]:
        try:
            await ws.send_text(json.dumps(evt))
        except Exception:
            break


async def disconnect(ws: WebSocket):
    async with _lock:
        _clients.discard(ws)


async def broadcast(event: dict[str, Any]):
    """Send an event to all connected admin clients."""
    event.setdefault("ts", time.time())
    _recent.append(event)
    if len(_recent) > MAX_RECENT:
        del _recent[: len(_recent) - MAX_RECENT]

    payload = json.dumps(event)
    async with _lock:
        dead: list[WebSocket] = []
        for ws in _clients:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            _clients.discard(ws)


def broadcast_sync(event: dict[str, Any]):
    """Call broadcast from synchronous code (best-effort, uses current event loop)."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(broadcast(event))
    except RuntimeError:
        pass
