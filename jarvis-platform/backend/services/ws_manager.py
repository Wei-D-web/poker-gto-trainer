"""WebSocket connection manager for real-time bidirectional communication."""

import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import WebSocket

from models.chat import WSEvent, WSMessage

logger = logging.getLogger(__name__)


class WSManager:
    """Manages WebSocket connections: connect, disconnect, broadcast, unicast."""

    def __init__(self):
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._heartbeat_task: Optional[asyncio.Task] = None

    async def connect(self, ws: WebSocket):
        """Accept a new WebSocket connection."""
        await ws.accept()
        async with self._lock:
            self._connections.add(ws)
        logger.info(f"WebSocket connected ({len(self._connections)} active)")

        # Start heartbeat if first connection
        if len(self._connections) == 1:
            self._start_heartbeat()

    async def disconnect(self, ws: WebSocket):
        """Remove a disconnected WebSocket."""
        async with self._lock:
            self._connections.discard(ws)
        logger.info(f"WebSocket disconnected ({len(self._connections)} active)")

    async def send(self, ws: WebSocket, event_type: str, data: dict = None):
        """Send a typed message to a specific client."""
        msg = WSMessage(
            type=event_type,
            data=data or {},
            timestamp=time.time(),
        )
        try:
            await ws.send_text(msg.model_dump_json())
        except Exception as e:
            logger.error(f"Send failed: {e}")
            await self.disconnect(ws)

    async def broadcast(self, event_type: str, data: dict = None, exclude: WebSocket = None):
        """Broadcast a message to all connected clients."""
        msg = WSMessage(
            type=event_type,
            data=data or {},
            timestamp=time.time(),
        )
        payload = msg.model_dump_json()

        async with self._lock:
            dead = set()
            for ws in self._connections:
                if ws is exclude:
                    continue
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.add(ws)
            self._connections -= dead

    async def handle_message(self, ws: WebSocket, raw: str) -> dict:
        """Parse and route an incoming WebSocket message.

        Returns the parsed message dict for further processing.
        """
        try:
            msg = WSMessage.model_validate_json(raw)
        except Exception as e:
            await self.send(ws, WSEvent.ERROR, {"message": f"Invalid message: {e}"})
            return None

        # Handle ping
        if msg.type == WSEvent.PING:
            await self.send(ws, WSEvent.PONG, {})
            return None

        return msg

    def _start_heartbeat(self):
        """Start periodic heartbeat to keep connections alive."""
        async def heartbeat():
            while True:
                await asyncio.sleep(30)
                alive = 0
                async with self._lock:
                    dead = set()
                    for ws in self._connections:
                        try:
                            await ws.send_text(json.dumps({
                                "type": WSEvent.PONG,
                                "data": {},
                                "timestamp": time.time(),
                            }))
                            alive += 1
                        except Exception:
                            dead.add(ws)
                    self._connections -= dead
                if dead:
                    logger.info(f"Heartbeat cleaned {len(dead)} dead connections")

        self._heartbeat_task = asyncio.create_task(heartbeat())

    async def shutdown(self):
        """Close all connections and stop heartbeat."""
        if self._heartbeat_task:
            self._heartbeat_task.cancel()

        async with self._lock:
            for ws in self._connections:
                try:
                    await ws.close()
                except Exception:
                    pass
            self._connections.clear()

    @property
    def active_count(self) -> int:
        return len(self._connections)


# Singleton
ws_manager = WSManager()
