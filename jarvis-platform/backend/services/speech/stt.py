"""Speech-to-text using Groq Whisper API (primary) with local faster-whisper fallback."""

import logging
import tempfile
from pathlib import Path

import numpy as np

from config import settings

logger = logging.getLogger(__name__)

# Lazy-loaded whisper model (local fallback)
_whisper_model = None


def _get_local_model():
    """Lazy load the local faster-whisper model (fallback only)."""
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel

            device = settings.whisper_device
            compute_type = "float32"
            if device == "cuda":
                compute_type = "float16"
            elif device == "mps":
                compute_type = "int8"

            _whisper_model = WhisperModel(
                settings.whisper_model,
                device=device,
                compute_type=compute_type,
                download_root=str(Path.home() / ".cache" / "whisper"),
            )
            logger.info(f"Local Whisper model '{settings.whisper_model}' loaded on {device}")
        except ImportError:
            logger.warning("faster-whisper not installed, local STT unavailable")
            return None
        except Exception as e:
            logger.error(f"Failed to load local Whisper model: {e}")
            return None
    return _whisper_model


async def transcribe_audio(audio_data: bytes, sample_rate: int = 16000) -> dict:
    """Transcribe audio bytes to text.

    Uses Groq Whisper API by default (fast, multilingual).
    Falls back to local faster-whisper if Groq is unavailable.
    """
    # Primary: Groq Whisper API
    if settings.stt_provider == "groq" and settings.groq_api_key:
        try:
            return await _groq_transcribe(audio_data)
        except Exception as e:
            logger.warning(f"Groq STT failed, falling back to local: {e}")

    # Fallback: Local faster-whisper
    return await _local_transcribe(audio_data, sample_rate)


async def _groq_transcribe(audio_data: bytes) -> dict:
    """Transcribe via Groq Whisper API. ~300-800ms end-to-end."""
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.groq_api_key)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_data)
        tmp_path = f.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcription = await client.audio.transcriptions.create(
                file=audio_file,
                model=settings.groq_whisper_model,
                response_format="verbose_json",
                language=None,
                temperature=0.0,
            )

        text = transcription.text.strip() if transcription.text else ""

        segments_raw = getattr(transcription, "segments", []) or []
        segments = [
            {"start": s.get("start", 0), "end": s.get("end", 0), "text": s.get("text", "")}
            for s in segments_raw
        ]

        return {
            "text": text,
            "language": transcription.language or "en",
            "engine": f"groq-{settings.groq_whisper_model}",
            "segments": segments,
        }

    finally:
        Path(tmp_path).unlink(missing_ok=True)


async def _local_transcribe(audio_data: bytes, sample_rate: int = 16000) -> dict:
    """Transcribe using local faster-whisper model."""
    model = _get_local_model()

    if model is not None:
        try:
            audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0

            segments, info = model.transcribe(
                audio_np,
                beam_size=5,
                language=None,
                vad_filter=True,
            )

            text = " ".join(seg.text for seg in segments)
            return {
                "text": text.strip(),
                "language": info.language,
                "language_probability": info.language_probability,
                "engine": f"whisper-local-{settings.whisper_model}",
            }
        except Exception as e:
            logger.error(f"Local Whisper transcription failed: {e}")

    return {
        "text": "",
        "language": "en",
        "engine": "stt-unavailable",
        "error": "Neither Groq nor local Whisper is available.",
    }


def is_available() -> bool:
    """Check if any STT engine is available."""
    if settings.groq_api_key:
        return True
    return _get_local_model() is not None
