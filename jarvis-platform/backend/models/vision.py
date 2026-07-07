"""Vision intelligence schemas"""

from typing import Optional
from pydantic import BaseModel


class VisionRequest(BaseModel):
    image: str  # base64 encoded image
    prompt: str = "Describe what you see in this image."
    provider: str = "anthropic"  # anthropic | openai


class VisionResponse(BaseModel):
    analysis: str
    objects_detected: list[str] = []
    text_found: Optional[str] = None
    provider: str
    model: str
    duration_ms: float = 0


class OCRRequest(BaseModel):
    image: str  # base64 encoded image
    language: str = "eng+chi_sim"


class OCRResponse(BaseModel):
    text: str
    blocks: list[dict] = []
    confidence: float = 0.0


class MonitorConfig(BaseModel):
    enabled: bool = False
    interval_seconds: int = 10
    threshold: float = 0.1  # change detection threshold
    alert_on_change: bool = True
