"""Multi-agent swarm schemas"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class AgentTask(BaseModel):
    agent_id: str
    description: str
    role: str = "researcher"
    context: dict = {}
    dependencies: list[str] = []


class AgentResult(BaseModel):
    agent_id: str
    status: str  # pending | running | completed | failed
    description: str = ""
    output: dict = {}
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class SwarmDecomposeRequest(BaseModel):
    query: str
    max_agents: int = 5


class SwarmDecomposeResponse(BaseModel):
    tasks: list[AgentTask]
    summary: str


class SwarmStatus(BaseModel):
    swarm_id: str
    query: str
    tasks: list[AgentResult]
    status: str  # running | completed | failed
    report: Optional[str] = None
    started_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
