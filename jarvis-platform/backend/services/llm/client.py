"""Async LLM client — supports DeepSeek, Claude, and OpenAI.
Includes DeepSeek-compatible vision pipeline via OCR + structured analysis."""

import time
import logging
import base64
import io
from typing import Optional, AsyncIterator

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from PIL import Image

from config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Unified async client for multiple LLM providers."""

    def __init__(self):
        self._deepseek: Optional[AsyncOpenAI] = None
        self._openai: Optional[AsyncOpenAI] = None
        self._anthropic: Optional[AsyncAnthropic] = None

    @property
    def deepseek(self) -> AsyncOpenAI:
        if not self._deepseek and settings.deepseek_api_key:
            self._deepseek = AsyncOpenAI(
                api_key=settings.deepseek_api_key,
                base_url=settings.deepseek_base_url,
            )
        return self._deepseek

    @property
    def openai(self) -> AsyncOpenAI:
        if not self._openai and settings.openai_api_key:
            self._openai = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._openai

    @property
    def anthropic(self) -> AsyncAnthropic:
        if not self._anthropic and settings.anthropic_api_key:
            self._anthropic = AsyncAnthropic(api_key=settings.anthropic_api_key)
        return self._anthropic

    async def chat(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        stream: bool = False,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> dict:
        """Send chat completion request. Auto-routes to correct provider."""
        model = model or settings.default_model
        provider = self._route_provider(model)
        start = time.time()

        if provider == "deepseek":
            client = self.deepseek
            if not client:
                raise ValueError("DeepSeek API key not configured")
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=stream,
            )
            if stream:
                return response
            choice = response.choices[0]
            return {
                "text": choice.message.content,
                "model": response.model,
                "usage": {
                    "input": response.usage.prompt_tokens,
                    "output": response.usage.completion_tokens,
                    "total": response.usage.total_tokens,
                },
                "duration_ms": (time.time() - start) * 1000,
            }

        elif provider == "anthropic":
            client = self.anthropic
            if not client:
                raise ValueError("Anthropic API key not configured")
            response = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=self._extract_system(messages),
                messages=self._to_anthropic_messages(messages),
            )
            return {
                "text": response.content[0].text,
                "model": response.model,
                "usage": {
                    "input": response.usage.input_tokens,
                    "output": response.usage.output_tokens,
                },
                "duration_ms": (time.time() - start) * 1000,
            }

        elif provider == "openai":
            client = self.openai
            if not client:
                raise ValueError("OpenAI API key not configured")
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            choice = response.choices[0]
            return {
                "text": choice.message.content,
                "model": response.model,
                "usage": {
                    "input": response.usage.prompt_tokens,
                    "output": response.usage.completion_tokens,
                },
                "duration_ms": (time.time() - start) * 1000,
            }

        raise ValueError(f"Unknown model/provider: {model}")

    async def vision(
        self,
        image_base64: str,
        prompt: str,
        provider: Optional[str] = None,
    ) -> dict:
        """Analyze image with vision model.

        Strategy:
        1. If Anthropic/OpenAI keys are available → direct vision API (best quality)
        2. If only DeepSeek → OCR + image analysis → text-based LLM analysis
        """
        provider = provider or settings.vision_provider
        start = time.time()

        # ── Path 1: Direct Vision (Anthropic Claude) ──
        if provider == "anthropic" and self._anthropic:
            return await self._anthropic_vision(image_base64, prompt, start)

        # ── Path 2: Direct Vision (OpenAI GPT-4V) ──
        if provider == "openai" and self._openai:
            return await self._openai_vision(image_base64, prompt, start)

        # ── Path 3: DeepSeek Smart Vision (OCR + analysis) ──
        return await self._deepseek_smart_vision(image_base64, prompt, start)

    async def _anthropic_vision(self, image_base64: str, prompt: str, start: float) -> dict:
        """Direct vision via Anthropic Claude."""
        model = settings.vision_model
        media_type = self._detect_image_type(image_base64)
        response = await self.anthropic.messages.create(
            model=model,
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }],
        )
        return {
            "analysis": response.content[0].text,
            "model": response.model,
            "provider": "anthropic",
            "method": "direct_vision",
            "duration_ms": (time.time() - start) * 1000,
        }

    async def _openai_vision(self, image_base64: str, prompt: str, start: float) -> dict:
        """Direct vision via OpenAI GPT-4V."""
        response = await self.openai.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        },
                    },
                ],
            }],
            max_tokens=2048,
        )
        choice = response.choices[0]
        return {
            "analysis": choice.message.content,
            "model": response.model,
            "provider": "openai",
            "method": "direct_vision",
            "duration_ms": (time.time() - start) * 1000,
        }

    async def _deepseek_smart_vision(self, image_base64: str, prompt: str, start: float) -> dict:
        """Smart vision for DeepSeek: OCR + image analysis → text-based reasoning.

        Since DeepSeek-V3 is text-only, we:
        1. Decode the image
        2. Extract text via OCR (if available)
        3. Analyze image properties (size, colors, layout)
        4. Build a rich text description
        5. Send to DeepSeek chat for intelligent analysis
        """
        # Decode image
        image_data = image_base64
        if "," in image_data:
            image_data = image_data.split(",")[1]

        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))

        # ── Extract image metadata ──
        w, h = image.size
        mode = image.mode
        format_name = image.format or "unknown"

        # Dominant colors (simple sampling)
        try:
            small = image.resize((50, 50), Image.Resampling.LANCZOS)
            pixels = list(small.getdata())
            # Get average color
            if mode in ("RGB", "RGBA"):
                avg_r = sum(p[0] for p in pixels) / len(pixels)
                avg_g = sum(p[1] for p in pixels) / len(pixels)
                avg_b = sum(p[2] for p in pixels) / len(pixels)
                color_desc = f"RGB({int(avg_r)},{int(avg_g)},{int(avg_b)})"
                # Guess what kind of image
                brightness = (avg_r + avg_g + avg_b) / 3
                if brightness > 200:
                    scene_type = "mostly white/light (likely a document or webpage)"
                elif brightness < 80:
                    scene_type = "mostly dark (likely a code editor, terminal, or dark-mode UI)"
                elif abs(avg_r - avg_g) < 15 and abs(avg_g - avg_b) < 15:
                    scene_type = "grayscale/neutral tones"
                elif avg_b > avg_r and avg_b > avg_g:
                    scene_type = "blue-dominant (likely a data dashboard or technical UI)"
                else:
                    scene_type = "mixed colors"
            else:
                color_desc = f"mode={mode}"
                scene_type = "unknown"
        except Exception:
            color_desc = "unknown"
            scene_type = "unknown"

        # ── Extract text via OCR ──
        ocr_text = ""
        ocr_engine = "none"
        try:
            from services.vision.ocr import extract_text
            ocr_result = await extract_text(image_base64)
            if ocr_result.get("text"):
                ocr_text = ocr_result["text"]
                ocr_engine = ocr_result.get("engine", "unknown")
        except Exception as e:
            logger.debug(f"OCR extraction skipped: {e}")

        # ── Build context-rich prompt for DeepSeek ──
        context = f"""[IMAGE ANALYSIS CONTEXT]
Image: {w}x{h} pixels, format={format_name}, mode={mode}
Dominant color: {color_desc}
Scene type: {scene_type}
"""

        if ocr_text:
            # Truncate OCR text if too long
            ocr_snippet = ocr_text[:3000]
            if len(ocr_text) > 3000:
                ocr_snippet += f"\n... (truncated, {len(ocr_text)} total chars)"

            context += f"""
[EXTRACTED TEXT (via {ocr_engine})]
{ocr_snippet}
"""

        context += f"""
[USER QUESTION]
{prompt}

---

You are J.A.R.V.I.S. analyzing a screenshot. Based on the image context and extracted text above, provide a thorough, insightful analysis. If the extracted text contains data, analyze it. If the scene appears to be a specific type of application (dashboard, code editor, browser, document), describe what you can infer. Be specific and actionable."""

        # ── Send to DeepSeek ──
        client = self.deepseek
        if not client:
            raise ValueError("DeepSeek API key not configured")

        response = await client.chat.completions.create(
            model=settings.default_model,
            messages=[{"role": "user", "content": context}],
            max_tokens=2048,
            temperature=0.3,
        )

        choice = response.choices[0]
        return {
            "analysis": choice.message.content,
            "model": response.model,
            "provider": "deepseek",
            "method": "ocr_plus_analysis",
            "ocr_engine": ocr_engine,
            "ocr_text_length": len(ocr_text),
            "image_size": f"{w}x{h}",
            "duration_ms": (time.time() - start) * 1000,
        }

    def _route_provider(self, model: str) -> str:
        """Determine provider from model name."""
        if "deepseek" in model.lower():
            return "deepseek"
        if "claude" in model.lower():
            return "anthropic"
        if any(p in model.lower() for p in ["gpt", "o1", "o3", "openai"]):
            return "openai"
        return "deepseek"

    def _extract_system(self, messages: list[dict]) -> str:
        """Extract system message for Anthropic API."""
        for msg in messages:
            if msg.get("role") == "system":
                return msg["content"]
        return ""

    def _to_anthropic_messages(self, messages: list[dict]) -> list[dict]:
        """Convert OpenAI-format messages to Anthropic format."""
        return [{"role": m["role"], "content": m["content"]}
                for m in messages if m["role"] != "system"]

    def _detect_image_type(self, base64_data: str) -> str:
        """Detect image MIME type from base64 header or magic bytes."""
        if base64_data.startswith("/9j/"):
            return "image/jpeg"
        if base64_data.startswith("iVBOR"):
            return "image/png"
        if base64_data.startswith("R0lGOD"):
            return "image/gif"
        if base64_data.startswith("UklGR"):
            return "image/webp"
        return "image/jpeg"


# Singleton
llm_client = LLMClient()
