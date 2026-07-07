"""Text-to-speech using macOS say (Daniel voice) with edge-tts fallback."""

import asyncio
import base64
import logging
import platform
import subprocess
import tempfile
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)


async def synthesize(text: str, voice: str | None = None) -> bytes:
    """Synthesize speech from text. Returns WAV audio bytes.

    Args:
        text: Text to speak
        voice: Voice name (macOS: Daniel, Samantha; edge-tts: en-US-...)
    """
    voice = voice or settings.tts_voice

    if platform.system() == "Darwin":
        return await _macos_say(text, voice)
    else:
        return await _edge_tts(text, voice)


async def synthesize_base64(text: str, voice: str | None = None) -> str:
    """Synthesize and return base64-encoded audio."""
    audio_bytes = await synthesize(text, voice)
    return base64.b64encode(audio_bytes).decode("utf-8")


async def _macos_say(text: str, voice: str = "Daniel") -> bytes:
    """Use macOS 'say' command for TTS."""
    # Escape special characters for shell
    safe_text = text.replace('"', '\\"').replace("`", "\\`")

    with tempfile.NamedTemporaryFile(suffix=".aiff", delete=False) as f:
        tmp_path = f.name

    try:
        # Generate AIFF audio file
        proc = await asyncio.create_subprocess_exec(
            "say",
            "-v", voice,
            "-o", tmp_path,
            safe_text,
        )
        await proc.wait()

        if proc.returncode != 0:
            raise RuntimeError(f"say command failed with code {proc.returncode}")

        # Read the generated audio
        audio_data = Path(tmp_path).read_bytes()
        return audio_data

    finally:
        Path(tmp_path).unlink(missing_ok=True)


async def _edge_tts(text: str, voice: str = "en-GB-SoniaNeural") -> bytes:
    """Use edge-tts for cross-platform TTS."""
    try:
        import edge_tts

        communicate = edge_tts.Communicate(text, voice)

        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        return b"".join(audio_chunks)

    except ImportError:
        logger.warning("edge-tts not installed, TTS unavailable on non-macOS")
        return b""
    except Exception as e:
        logger.error(f"edge-tts failed: {e}")
        return b""


def list_voices() -> list[str]:
    """List available TTS voices."""
    if platform.system() == "Darwin":
        try:
            result = subprocess.run(
                ["say", "-v", "?"],
                capture_output=True,
                text=True,
            )
            voices = []
            for line in result.stdout.strip().split("\n"):
                parts = line.split()
                if parts:
                    voices.append(parts[0])
            return voices
        except Exception:
            return ["Daniel", "Samantha", "Alex", "Victoria"]
    return ["en-GB-SoniaNeural", "en-US-JennyNeural", "en-GB-RyanNeural"]
