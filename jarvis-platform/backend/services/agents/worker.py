"""Single agent worker — executes one sub-task via LLM."""

import logging
import time

from models.agent import AgentTask, AgentResult
from services.llm.client import llm_client
from config import settings

logger = logging.getLogger(__name__)


class AgentWorker:
    """Executes a single sub-task as an independent agent.

    Each worker:
    1. Receives a focused task description
    2. Calls the LLM with task-specific prompt
    3. Returns structured results
    """

    def __init__(self, task: AgentTask, parent_query: str = ""):
        self.task = task
        self.parent_query = parent_query

    async def execute(self) -> AgentResult:
        """Execute the agent's task."""
        start = time.time()

        try:
            prompt = self._build_prompt()

            result = await llm_client.chat(
                messages=[{"role": "user", "content": prompt}],
                model=settings.fast_model,
                temperature=0.5,
                max_tokens=2048,
            )

            duration = time.time() - start
            logger.info(f"Agent [{self.task.agent_id}] completed in {duration:.1f}s")

            return AgentResult(
                agent_id=self.task.agent_id,
                status="completed",
                description=self.task.description,
                output={
                    "findings": result["text"],
                    "model": result["model"],
                    "duration_s": duration,
                },
                started_at=time.strftime("%H:%M:%S"),
                completed_at=time.strftime("%H:%M:%S"),
            )

        except Exception as e:
            logger.error(f"Agent [{self.task.agent_id}] failed: {e}")
            return AgentResult(
                agent_id=self.task.agent_id,
                status="failed",
                description=self.task.description,
                error=str(e),
                completed_at=time.strftime("%H:%M:%S"),
            )

    def _build_prompt(self) -> str:
        """Build the task-specific prompt for the LLM."""
        return f"""You are Agent [{self.task.agent_id}] in a multi-agent research swarm.

PARENT QUERY: {self.parent_query}

YOUR SPECIFIC TASK: {self.task.description}

CONTEXT: You are part {self.task.context.get('part', 1)} of {self.task.context.get('total', 1)} parallel agents.

INSTRUCTIONS:
1. Focus ONLY on your specific sub-task
2. Be thorough and detailed
3. Include specific data points, numbers, and facts where possible
4. Structure your findings clearly with bullet points
5. Note any uncertainties or areas needing verification
6. If doing web research, cite specific sources

OUTPUT YOUR FINDINGS NOW:"""
