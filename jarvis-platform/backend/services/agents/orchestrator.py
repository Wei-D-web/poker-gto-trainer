"""Multi-Agent Swarm Orchestrator — decomposes tasks, spawns parallel agents, merges results."""

import asyncio
import logging
import time
import uuid
from typing import Optional

from models.agent import AgentTask, AgentResult, SwarmDecomposeRequest, SwarmStatus
from services.agents.worker import AgentWorker
from services.agents.synthesizer import Synthesizer
from services.llm.client import llm_client
from config import settings

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Orchestrates multi-agent parallel task execution.

    Flow:
    1. Receive complex query
    2. Decompose into sub-tasks via LLM
    3. Spawn parallel agent workers (respecting dependencies)
    4. Stream status updates via callback
    5. Synthesize results into final report
    """

    def __init__(self):
        self._active_swarms: dict[str, SwarmStatus] = {}

    async def decompose(self, query: str, max_agents: int = 5) -> list[AgentTask]:
        """Decompose a complex query into sub-tasks using an LLM.

        The LLM is prompted to break down the task and define dependencies.
        """
        decompose_prompt = f"""Break down this research task into {max_agents} or fewer parallel sub-tasks:

TASK: {query}

For each sub-task, provide:
1. A unique agent_id (short slug)
2. A clear description of what to research/do
3. Dependencies (agent_ids that must complete before this one)

Output as JSON array:
[{{"agent_id": "...", "description": "...", "dependencies": []}}, ...]

Make the tasks independent where possible (few dependencies = more parallelism).
The last task should be a "synthesizer" that depends on all others."""

        try:
            result = await llm_client.chat(
                messages=[{"role": "user", "content": decompose_prompt}],
                model=settings.fast_model,
                temperature=0.3,
            )

            # Parse JSON from response
            import json
            text = result["text"]

            # Extract JSON array
            start = text.find("[")
            end = text.rfind("]") + 1
            if start >= 0 and end > start:
                json_str = text[start:end]
                tasks_data = json.loads(json_str)
            else:
                # Fallback: simple split
                tasks_data = [
                    {"agent_id": f"agent_{i}", "description": f"Research: {query} (part {i+1})", "dependencies": []}
                    for i in range(min(3, max_agents))
                ]

            tasks = []
            for i, t in enumerate(tasks_data):
                tasks.append(AgentTask(
                    agent_id=t.get("agent_id", f"agent_{i}"),
                    description=t.get("description", f"Sub-task {i+1}"),
                    role=t.get("role", "researcher"),
                    context={"query": query, "part": i + 1, "total": len(tasks_data)},
                    dependencies=t.get("dependencies", []),
                ))

            logger.info(f"Decomposed into {len(tasks)} sub-tasks: {[t.agent_id for t in tasks]}")
            return tasks

        except Exception as e:
            logger.error(f"Decomposition failed: {e}")
            # Fallback: single agent
            return [
                AgentTask(
                    agent_id="researcher",
                    description=query,
                    dependencies=[],
                )
            ]

    async def run_swarm(
        self,
        query: str,
        tasks: list[AgentTask],
        status_callback=None,
    ) -> SwarmStatus:
        """Execute a swarm of agents, respecting dependency DAG.

        Args:
            query: Original user query
            tasks: Decomposed sub-tasks with dependencies
            status_callback: async fn(swarm_status) called on each update

        Returns:
            SwarmStatus with all results and synthesized report
        """
        swarm_id = str(uuid.uuid4())[:8]
        swarm = SwarmStatus(
            swarm_id=swarm_id,
            query=query,
            tasks=[
                AgentResult(
                    agent_id=t.agent_id,
                    status="pending",
                    description=t.description,
                )
                for t in tasks
            ],
            status="running",
        )
        self._active_swarms[swarm_id] = swarm

        async def emit_update():
            if status_callback:
                await status_callback(swarm)

        await emit_update()

        completed: dict[str, AgentResult] = {}
        pending = list(tasks)
        start_time = time.time()

        while pending:
            # Find tasks with all dependencies met
            ready = [t for t in pending if all(d in completed for d in t.dependencies)]
            if not ready:
                # Check for circular dependencies
                logger.error(f"Possible circular dependency in swarm {swarm_id}")
                break

            for task in ready:
                pending.remove(task)

            # Update status for ready tasks
            for task in ready:
                for r in swarm.tasks:
                    if r.agent_id == task.agent_id:
                        r.status = "running"
                        r.started_at = time.strftime("%H:%M:%S")
            await emit_update()

            # Execute ready tasks in parallel (up to max_parallel)
            sem = asyncio.Semaphore(settings.max_parallel_agents)

            async def run_one(task: AgentTask) -> AgentResult:
                async with sem:
                    worker = AgentWorker(task, query)
                    return await worker.execute()

            batch_results = await asyncio.gather(
                *[run_one(t) for t in ready],
                return_exceptions=True,
            )

            for i, result in enumerate(batch_results):
                task = ready[i]
                if isinstance(result, Exception):
                    completed[task.agent_id] = AgentResult(
                        agent_id=task.agent_id,
                        status="failed",
                        description=task.description,
                        error=str(result),
                        completed_at=time.strftime("%H:%M:%S"),
                    )
                else:
                    completed[task.agent_id] = result

                # Update swarm status
                for r in swarm.tasks:
                    if r.agent_id == task.agent_id:
                        r.status = completed[task.agent_id].status
                        r.output = completed[task.agent_id].output
                        r.error = completed[task.agent_id].error
                        r.completed_at = time.strftime("%H:%M:%S")

            await emit_update()

        # ── Synthesize ──
        synthesizer = Synthesizer()
        report = await synthesizer.synthesize(
            query=query,
            results=list(completed.values()),
        )

        swarm.status = "completed"
        swarm.report = report
        await emit_update()

        logger.info(f"Swarm {swarm_id} completed in {time.time() - start_time:.1f}s")
        return swarm

    def get_swarm(self, swarm_id: str) -> Optional[SwarmStatus]:
        return self._active_swarms.get(swarm_id)


# Singleton
orchestrator = AgentOrchestrator()
