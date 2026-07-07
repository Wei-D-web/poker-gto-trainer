"""Async LLM client — supports DeepSeek, Claude, and OpenAI."""

import time
import logging
from typing import Optional, AsyncIterator

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

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
                return response  # Return stream object
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
        """Analyze image with vision model."""
        provider = provider or settings.vision_provider
        model = settings.vision_model
        start = time.time()

        if provider == "anthropic":
            client = self.anthropic
            if not client:
                raise ValueError("Anthropic API key not configured")
            media_type = self._detect_image_type(image_base64)
            response = await client.messages.create(
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
                "duration_ms": (time.time() - start) * 1000,
            }

        elif provider == "openai":
            client = self.openai
            if not client:
                raise ValueError("OpenAI API key not configured")
            response = await client.chat.completions.create(
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
                "duration_ms": (time.time() - start) * 1000,
            }

        raise ValueError(f"Unknown vision provider: {provider}")

    def _route_provider(self, model: str) -> str:
        """Determine provider from model name."""
        if "deepseek" in model.lower():
            return "deepseek"
        if "claude" in model.lower():
            return "anthropic"
        if any(p in model.lower() for p in ["gpt", "o1", "o3", "openai"]):
            return "openai"
        # Default
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
        return "image/jpeg"  # default


# Singleton
llm_client = LLMClient()
