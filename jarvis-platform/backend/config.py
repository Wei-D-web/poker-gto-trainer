"""J.A.R.V.I.S. Platform — Configuration"""

from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ──
    app_name: str = "J.A.R.V.I.S."
    debug: bool = False
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
    ]

    # ── Server ──
    host: str = "0.0.0.0"
    port: int = 8765

    # ── LLM APIs ──
    deepseek_api_key: Optional[str] = None
    deepseek_base_url: str = "https://api.deepseek.com"
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    # ── LLM Router ──
    default_model: str = "deepseek-chat"
    vision_model: str = "claude-sonnet-5"
    fast_model: str = "deepseek-chat"

    # ── Speech ──
    # STT
    groq_api_key: Optional[str] = None
    stt_provider: str = "groq"  # groq, local
    whisper_model: str = "base"  # tiny, base, small, medium, large-v3 (local fallback)
    whisper_device: str = "cpu"  # cpu, cuda, mps (local fallback)
    groq_whisper_model: str = "whisper-large-v3-turbo"  # turbo = faster + cheaper

    # TTS
    tts_provider: str = "edge"  # edge, macos_say
    tts_voice: str = "Daniel"  # macOS say fallback voice
    tts_voice_map: dict = {
        "zh": "zh-CN-XiaoxiaoNeural",      # Chinese — cheerful female
        "en": "en-GB-RyanNeural",            # English — Male British butler (JARVIS style, Paul Bettany)
        "ja": "ja-JP-NanamiNeural",         # Japanese
        "ko": "ko-KR-SunHiNeural",          # Korean
        "fr": "fr-FR-DeniseNeural",         # French
        "de": "de-DE-KatjaNeural",          # German
        "es": "es-ES-ElviraNeural",         # Spanish
    }
    tts_speed: str = "+10%"  # Slightly faster than default for snappy responses

    # ── Vision ──
    vision_provider: str = "anthropic"  # anthropic or openai

    # ── Agent Swarm ──
    max_parallel_agents: int = 5
    agent_timeout_seconds: int = 120

    # ── Research ──
    serpapi_key: Optional[str] = None

    # ── Memory ──
    chroma_persist_dir: str = "./data/chroma"

    # ── Proactive ──
    enable_proactive: bool = False
    check_interval_seconds: int = 300

    # ── WebSocket ──
    ws_heartbeat_interval: int = 30

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
