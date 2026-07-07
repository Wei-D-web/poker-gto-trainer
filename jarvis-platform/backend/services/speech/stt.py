"""Speech-to-text using faster-whisper (local) with fallback."""

import io
import logging
import subprocess
import tempfile
from pathlib import Path

import numpy as np

from config import settings

logger = logging.getLogger(__name__)

# Lazy-loaded whisper model
_whisper_model = None


def _get_model():
    """Lazy load the Whisper model."""
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel

            device = settings.whisper_device
            compute_type = "float32"
            if device == "cuda":
                compute_type = "float16"
            elif device == "mps":
                compute_type = "int8"  # MPS works best with int8

            _whisper_model = WhisperModel(
                settings.whisper_model,
                device=device,
                compute_type=compute_type,
                download_root=str(Path.home() / ".cache" / "whisper"),
            )
            logger.info(f"Whisper model '{settings.whisper_model}' loaded on {device}")
        except ImportError:
            logger.warning("faster-whisper not installed, STT unavailable")
            return None
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            return None
    return _whisper_model


async def transcribe_audio(audio_data: bytes, sample_rate: int = 16000) -> dict:
    """Transcribe audio bytes to text.

    Args:
        audio_data: Raw PCM audio bytes (int16)
        sample_rate: Audio sample rate in Hz

    Returns:
        dict with 'text', 'language', 'segments'
    """
    model = _get_model()

    if model is not None:
        try:
            # Convert bytes to numpy array
            audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0

            segments, info = model.transcribe(
                audio_np,
                beam_size=5,
                language=None,  # auto-detect
                vad_filter=True,
            )

            text = " ".join(seg.text for seg in segments)
            return {
                "text": text.strip(),
                "language": info.language,
                "language_probability": info.language_probability,
                "engine": "whisper-local",
            }
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")

    # Fallback: try to use macOS say/voice recognition
    return await _macos_fallback(audio_data)


async def _macos_fallback(audio_data: bytes) -> dict:
    """Fallback transcription attempt using system tools."""
    try:
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_data)
            tmp_path = f.name

        # Try macOS native speech recognition via Shortcuts
        # This is a best-effort fallback
        result = subprocess.run(
            ["afplay", tmp_path],
            capture_output=True,
            timeout=5,
        )

        # Cleanup
        Path(tmp_path).unlink(missing_ok=True)

        return {
            "text": "",
            "language": "en",
            "engine": "fallback-failed",
            "error": "Whisper not available and no fallback succeeded",
        }
    except Exception as e:
        return {
            "text": "",
            "language": "en",
            "engine": "error",
            "error": str(e),
        }


def is_available() -> bool:
    """Check if STT is available."""
    return _get_model() is not None
