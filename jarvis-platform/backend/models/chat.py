"""Chat message schemas"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str
    mode: str = "text"  # text | voice
    conversation_id: Optional[str] = None
    history: list[dict] = []


class ChatResponse(BaseModel):
    text: str
    conversation_id: str
    model: str
    usage: Optional[dict] = None
    duration_ms: float = 0
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class WSMessage(BaseModel):
    type: str
    data: dict = {}
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())


class WSEvent:
    """WebSocket event type constants."""

    # Client → Server
    CHAT = "chat"
    VOICE_DATA = "voice_data"
    WAKE_WORD = "wake_word"
    VISION_FRAME = "vision_frame"
    PING = "ping"

    # Server → Client
    RESPONSE = "response"
    RESPONSE_STREAM = "response_stream"
    VOICE_RESPONSE = "voice_response"
    AGENT_UPDATE = "agent_update"
    AGENT_COMPLETE = "agent_complete"
    VISION_RESULT = "vision_result"
    RESEARCH_UPDATE = "research_update"
    SYSTEM_ALERT = "system_alert"
    ERROR = "error"
    PONG = "pong"
