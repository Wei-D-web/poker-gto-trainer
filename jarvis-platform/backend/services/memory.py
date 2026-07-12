"""Conversation memory — simple session-based message storage.

Lightweight dict-based storage with automatic trimming.
For long-term vector memory, upgrade to ChromaDB later.
"""

import logging
import uuid
from typing import Optional

logger = logging.getLogger(__name__)


class ConversationMemory:
    """In-memory session store for conversation history.

    Each session holds up to max_messages entries (user + assistant pairs).
    Sessions are identified by a UUID string.
    """

    def __init__(self, max_messages: int = 50):
        self._sessions: dict[str, list[dict]] = {}
        self._max = max_messages

    def create_session(self) -> str:
        """Create a new session and return its ID."""
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = []
        logger.info(f"Created session {session_id[:8]}...")
        return session_id

    def get(self, session_id: str) -> list[dict]:
        """Get all messages for a session. Returns empty list if not found."""
        return self._sessions.get(session_id, [])

    def add(self, session_id: str, role: str, content: str):
        """Add a message to a session. Creates session if not found."""
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        self._sessions[session_id].append({"role": role, "content": content})
        # Trim to max
        if len(self._sessions[session_id]) > self._max:
            self._sessions[session_id] = self._sessions[session_id][-self._max:]

    def clear(self, session_id: str):
        """Clear all messages in a session."""
        if session_id in self._sessions:
            self._sessions[session_id] = []

    def delete(self, session_id: str):
        """Delete an entire session."""
        self._sessions.pop(session_id, None)

    def session_count(self) -> int:
        return len(self._sessions)

    def total_messages(self) -> int:
        return sum(len(msgs) for msgs in self._sessions.values())


# Singleton
memory = ConversationMemory()
