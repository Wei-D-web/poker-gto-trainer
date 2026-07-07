"""Continuous screen monitoring with change detection and alerts."""

import asyncio
import logging
import time
from typing import Optional

from PIL import Image

from services.vision.screenshot import decode_image, detect_changes
from services.llm.client import llm_client

logger = logging.getLogger(__name__)


class ScreenMonitor:
    """Monitors screen frames for changes and triggers analysis."""

    def __init__(self):
        self._enabled = False
        self._interval = 10  # seconds between captures
        self._threshold = 0.05  # change detection threshold
        self._last_image: Optional[Image.Image] = None
        self._task: Optional[asyncio.Task] = None
        self._callback = None
        self._alert_conditions = []  # list of (name, prompt, threshold)

    async def start(
        self,
        interval: int = 10,
        threshold: float = 0.05,
        callback=None,
    ):
        """Start continuous monitoring."""
        self._enabled = True
        self._interval = interval
        self._threshold = threshold
        self._callback = callback
        self._last_image = None

        if self._task is None:
            self._task = asyncio.create_task(self._loop())
        logger.info(f"Screen monitor started (interval={interval}s, threshold={threshold})")

    async def stop(self):
        """Stop monitoring."""
        self._enabled = False
        if self._task:
            self._task.cancel()
            self._task = None
        self._last_image = None
        logger.info("Screen monitor stopped")

    async def process_frame(self, image_b64: str) -> dict:
        """Process a single frame — detect changes, analyze if needed.

        Returns:
            dict with 'changed', 'change_ratio', 'analysis' (if changed)
        """
        image = decode_image(image_b64)
        result = {
            "changed": False,
            "change_ratio": 0.0,
            "analysis": None,
        }

        if self._last_image is not None:
            changed, ratio = detect_changes(image, self._last_image, self._threshold)
            result["changed"] = changed
            result["change_ratio"] = ratio

            if changed:
                logger.info(f"Screen change detected: {ratio:.2%}")
                # Analyze what changed
                try:
                    analysis = await llm_client.vision(
                        image_b64,
                        "What changed on this screen compared to before? "
                        "Focus on: new windows, data changes, alerts, or anomalies. "
                        "Be concise."
                    )
                    result["analysis"] = analysis.get("analysis", "")
                except Exception as e:
                    logger.error(f"Change analysis failed: {e}")

                # Check alert conditions
                if self._callback:
                    await self._callback(result)

        self._last_image = image
        return result

    async def _loop(self):
        """Background monitoring loop."""
        while self._enabled:
            try:
                await asyncio.sleep(self._interval)
                # The actual frame comes from the client via WebSocket
                # This loop handles timeouts and cleanup
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")

    def add_alert_condition(self, name: str, prompt: str):
        """Add a condition to watch for in screen changes."""
        self._alert_conditions.append({
            "name": name,
            "prompt": prompt,
        })

    @property
    def is_running(self) -> bool:
        return self._enabled


# Singleton
screen_monitor = ScreenMonitor()
