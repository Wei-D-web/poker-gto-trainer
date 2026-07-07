"""Cron-like task scheduler for proactive monitoring and alerts."""

import asyncio
import logging
from datetime import datetime
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)


class TaskScheduler:
    """Simple async task scheduler for periodic checks.

    Manages:
    - System health checks (CPU, memory, disk)
    - Price/watchlist monitoring
    - Calendar/email polling
    - Daily briefing generation
    """

    def __init__(self):
        self._tasks: dict[str, dict] = {}  # name -> {interval, coro, last_run}
        self._running = False
        self._loop_task: Optional[asyncio.Task] = None

    def add_task(self, name: str, coro, interval_seconds: int):
        """Register a periodic task.

        Args:
            name: Task identifier
            coro: Async callable to execute
            interval_seconds: How often to run
        """
        self._tasks[name] = {
            "coro": coro,
            "interval": interval_seconds,
            "last_run": None,
        }
        logger.info(f"Scheduled task '{name}' every {interval_seconds}s")

    def remove_task(self, name: str):
        """Remove a scheduled task."""
        if name in self._tasks:
            del self._tasks[name]
            logger.info(f"Removed task '{name}'")

    async def start(self):
        """Start the scheduler loop."""
        if self._running:
            return

        self._running = True
        self._loop_task = asyncio.create_task(self._loop())
        logger.info(f"Scheduler started with {len(self._tasks)} tasks")

    async def stop(self):
        """Stop the scheduler."""
        self._running = False
        if self._loop_task:
            self._loop_task.cancel()
            self._loop_task = None
        logger.info("Scheduler stopped")

    async def _loop(self):
        """Main scheduler loop."""
        while self._running:
            now = datetime.now()

            for name, task in self._tasks.items():
                should_run = False

                if task["last_run"] is None:
                    should_run = True
                else:
                    elapsed = (now - task["last_run"]).total_seconds()
                    if elapsed >= task["interval"]:
                        should_run = True

                if should_run:
                    try:
                        await task["coro"]()
                        task["last_run"] = now
                    except Exception as e:
                        logger.error(f"Task '{name}' failed: {e}")

            await asyncio.sleep(1)  # Check every second

    async def run_once(self):
        """Run all tasks once (for testing)."""
        for name, task in self._tasks.items():
            try:
                await task["coro"]()
            except Exception as e:
                logger.error(f"Task '{name}' failed: {e}")

    def list_tasks(self) -> list[dict]:
        """List all scheduled tasks with status."""
        now = datetime.now()
        result = []
        for name, task in self._tasks.items():
            next_run = None
            if task["last_run"]:
                next_run = task["last_run"].timestamp() + task["interval"]
            result.append({
                "name": name,
                "interval_seconds": task["interval"],
                "last_run": task["last_run"].isoformat() if task["last_run"] else None,
                "next_run_seconds": max(0, next_run - now.timestamp()) if next_run else 0,
            })
        return result


# Singleton
scheduler = TaskScheduler()
