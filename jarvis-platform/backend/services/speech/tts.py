"""Text-to-speech using edge-tts (multilingual neural) with macOS say fallback."""

import asyncio
import base64
import logging
import platform
import subprocess
import tempfile
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)


async def synthesize(text: str, language: str = "en", voice: str | None = None) -> bytes:
    """Synthesize speech from text. Returns MP3 audio bytes.

    Args:
        text: Text to speak.
        language: ISO 639-1 language code (zh, en, ja, ko, etc.).
        voice: Override voice. Auto-selected by language if not set.
    """
    voice = voice or get_voice_for_language(language)

    if settings.tts_provider == "edge":
        try:
            return await _edge_tts_synthesize(text, voice)
        except Exception as e:
            logger.warning(f"edge-tts failed ({e}), falling back to macOS say")

    # Fallback: macOS say (English-only, but fast)
    if platform.system() == "Darwin":
        say_voice = "Daniel" if language.startswith("en") else voice
        return await _macos_say(text, say_voice)

    logger.error("No TTS engine available")
    return b""


async def synthesize_base64(text: str, language: str = "en", voice: str | None = None) -> str:
    """Synthesize and return base64-encoded MP3 audio."""
    audio_bytes = await synthesize(text, language, voice)
    return base64.b64encode(audio_bytes).decode("utf-8")


async def _edge_tts_synthesize(text: str, voice: str) -> bytes:
    """Synthesize via Microsoft Edge TTS (neural, multilingual)."""
    import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate=settings.tts_speed)

    audio_chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])

    return b"".join(audio_chunks)


async def _macos_say(text: str, voice: str = "Daniel") -> bytes:
    """Use macOS 'say' command (fast local fallback, English only)."""
    safe_text = text.replace('"', '\\"').replace("`", "\\`")

    with tempfile.NamedTemporaryFile(suffix=".aiff", delete=False) as f:
        tmp_path = f.name

    try:
        proc = await asyncio.create_subprocess_exec(
            "say", "-v", voice, "-o", tmp_path, safe_text,
        )
        await proc.wait()

        if proc.returncode != 0:
            raise RuntimeError(f"say command failed with code {proc.returncode}")

        return Path(tmp_path).read_bytes()

    finally:
        Path(tmp_path).unlink(missing_ok=True)


def get_voice_for_language(lang: str) -> str:
    """Map ISO 639-1 language code to edge-tts neural voice.

    Returns a British butler voice for English, native speakers for others.
    """
    # Normalize: handle "zh-CN" style codes
    lang = lang.lower().split("-")[0] if lang else "en"

    voice_map = settings.tts_voice_map
    if lang in voice_map:
        return voice_map[lang]

    # Chinese variants
    if lang == "zh":
        return "zh-CN-XiaoxiaoNeural"

    return "en-GB-SoniaNeural"  # Default: British butler style


def list_voices() -> list[str]:
    """List available TTS voices."""
    voices = list(settings.tts_voice_map.values())

    if platform.system() == "Darwin":
        try:
            result = subprocess.run(
                ["say", "-v", "?"], capture_output=True, text=True,
            )
            for line in result.stdout.strip().split("\n"):
                parts = line.split()
                if parts:
                    voices.append(parts[0])
        except Exception:
            voices.extend(["Daniel", "Samantha", "Alex", "Victoria"])

    return voices
