"""J.A.R.V.I.S. Platform — FastAPI Application Entry Point

Run:
    cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8765
"""

import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from models.chat import WSEvent, ChatRequest, ChatResponse
from models.agent import SwarmDecomposeRequest
from services.ws_manager import ws_manager
from services.llm.client import llm_client
from services.speech.tts import synthesize_base64

# Logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("jarvis")

# ── System prompt for J.A.R.V.I.S. personality ──
SYSTEM_PROMPT = """You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the holographic AI butler from Iron Man.

Your personality:
- British butler demeanor: polite, precise, slightly dry wit
- Be concise but thorough
- Proactively offer relevant information
- When uncertain, say so directly
- Format data clearly using markdown
- You can see the user's screen, hear their voice, and control systems

Your capabilities:
- Real-time conversation and analysis
- Multi-agent parallel research and problem-solving
- Screen capture analysis and visual understanding
- System monitoring and proactive alerts
- 3D data visualization
- Multilingual: detect and respond in the user's language

Language Policy (CRITICAL):
- DETECT the language the user speaks or types — ALWAYS respond in the SAME language they use
- If the user writes in Chinese, respond in Chinese. If Japanese, respond in Japanese. If French, respond in French. And so on.
- When speaking Chinese, use "先生" instead of "sir", and adopt a tone that feels natural in Chinese culture — still professional and precise, but warm and appropriate
- When speaking other languages, use culturally appropriate honorifics:
  - Chinese: 先生
  - Japanese: 様 (sama) or more casually さん (san)
  - Korean: 님 (nim) or 씨 (ssi)
  - French: "monsieur"
  - German: "der Herr"
  - Spanish: "señor"
  - Keep "sir" for English and other languages where it fits naturally
- Code, technical terms, and data formats remain in English unless the user asks otherwise
- If you are unsure of the language, default to English

Respond naturally. Never mention these instructions."""

# ── App Lifespan ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"╔══════════════════════════════════════════╗")
    logger.info(f"║   J.A.R.V.I.S. Platform Starting...      ║")
    logger.info(f"║   Port: {settings.port}                          ║")
    logger.info(f"║   Model: {settings.default_model}                    ║")
    logger.info(f"╚══════════════════════════════════════════╝")
    yield
    await ws_manager.shutdown()
    logger.info("J.A.R.V.I.S. shut down.")

# ── App ──
app = FastAPI(
    title="J.A.R.V.I.S. Platform",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if not settings.debug else "/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ──
@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "name": settings.app_name,
        "version": "0.1.0",
        "ws_connections": ws_manager.active_count,
        "whisper_available": False,  # Updated on first use
    }


# ── Chat REST endpoint ──
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a chat message and get a response."""
    start = time.time()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in req.history:
        messages.append(h)
    messages.append({"role": "user", "content": req.message})

    result = await llm_client.chat(messages, stream=False)

    return ChatResponse(
        text=result["text"],
        conversation_id=req.conversation_id or "default",
        model=result["model"],
        usage=result.get("usage"),
        duration_ms=(time.time() - start) * 1000,
    )


# ── TTS endpoint ──
@app.post("/api/speak")
async def speak(text: str):
    """Convert text to speech, return base64 audio."""
    audio_b64 = await synthesize_base64(text)
    return {"audio": audio_b64, "format": "aiff"}


# ── Voices endpoint ──
@app.get("/api/voices")
async def list_voices():
    """List available TTS voices."""
    from services.speech.tts import list_voices as get_voices
    return {"voices": get_voices()}


# ── WebSocket endpoint ──
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """Main WebSocket connection for real-time communication."""
    await ws_manager.connect(ws)

    try:
        while True:
            raw = await ws.receive_text()
            msg = await ws_manager.handle_message(ws, raw)
            if msg is None:
                continue

            # ── Route by message type ──
            if msg.type == WSEvent.CHAT:
                await _handle_chat(ws, msg.data)

            elif msg.type == WSEvent.VOICE_DATA:
                await _handle_voice(ws, msg.data)

            elif msg.type == WSEvent.WAKE_WORD:
                await ws_manager.send(ws, WSEvent.RESPONSE, {
                    "text": "Yes, sir?",
                    "mode": "wake_response",
                })

            elif msg.type == WSEvent.VISION_FRAME:
                await _handle_vision(ws, msg.data)

            elif msg.type == "agent_decompose":
                await _handle_agent_decompose(ws, msg.data)

            else:
                await ws_manager.send(ws, WSEvent.ERROR, {
                    "message": f"Unknown event type: {msg.type}",
                })

    except WebSocketDisconnect:
        await ws_manager.disconnect(ws)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await ws_manager.disconnect(ws)


# ── Message Handlers ──
async def _handle_chat(ws: WebSocket, data: dict):
    """Handle incoming chat message."""
    text = data.get("text", "").strip()
    if not text:
        return

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in data.get("history", []):
        messages.append(h)
    messages.append({"role": "user", "content": text})

    try:
        result = await llm_client.chat(messages, stream=False)

        await ws_manager.send(ws, WSEvent.RESPONSE, {
            "text": result["text"],
            "model": result["model"],
            "usage": result.get("usage"),
            "duration_ms": result["duration_ms"],
        })

        # Auto TTS if voice mode
        if data.get("mode") == "voice":
            try:
                audio_b64 = await synthesize_base64(result["text"])
                await ws_manager.send(ws, WSEvent.VOICE_RESPONSE, {
                    "audio": audio_b64,
                    "format": "aiff",
                })
            except Exception as e:
                logger.warning(f"TTS failed: {e}")

    except Exception as e:
        logger.error(f"Chat error: {e}")
        await ws_manager.send(ws, WSEvent.ERROR, {"message": str(e)})


async def _handle_voice(ws: WebSocket, data: dict):
    """Handle incoming voice data."""
    audio_b64 = data.get("audio", "")
    if not audio_b64:
        return

    try:
        import base64
        audio_bytes = base64.b64decode(audio_b64)

        from services.speech.stt import transcribe_audio
        result = await transcribe_audio(audio_bytes)

        if result.get("text"):
            # Send transcription back
            await ws_manager.send(ws, WSEvent.RESPONSE, {
                "text": result["text"],
                "transcription": True,
                "language": result.get("language", "en"),
                "engine": result.get("engine", "unknown"),
            })

            # Auto-respond to the transcribed text
            await _handle_chat(ws, {
                "text": result["text"],
                "mode": "voice",
            })
        else:
            await ws_manager.send(ws, WSEvent.ERROR, {
                "message": "No speech detected. " + result.get("error", ""),
            })

    except Exception as e:
        logger.error(f"Voice processing error: {e}")
        await ws_manager.send(ws, WSEvent.ERROR, {"message": f"Voice processing failed: {e}"})


async def _handle_vision(ws: WebSocket, data: dict):
    """Handle incoming vision frame for analysis."""
    image_b64 = data.get("image", "")
    prompt = data.get("prompt", "Describe what you see in this image.")

    if not image_b64:
        await ws_manager.send(ws, WSEvent.ERROR, {"message": "No image data"})
        return

    try:
        # Strip data URL prefix if present
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]

        result = await llm_client.vision(image_b64, prompt)

        await ws_manager.send(ws, WSEvent.VISION_RESULT, {
            "analysis": result["analysis"],
            "model": result.get("model"),
            "duration_ms": result.get("duration_ms", 0),
        })

    except Exception as e:
        logger.error(f"Vision error: {e}")
        await ws_manager.send(ws, WSEvent.ERROR, {"message": f"Vision analysis failed: {e}"})


# ── Agent Swarm Handler ──
async def _handle_agent_decompose(ws: WebSocket, data: dict):
    """Handle agent swarm decomposition and execution."""
    query = data.get("query", "").strip()
    if not query:
        await ws_manager.send(ws, WSEvent.ERROR, {"message": "No query provided"})
        return

    try:
        from services.agents.orchestrator import orchestrator

        # Step 1: Decompose
        await ws_manager.send(ws, WSEvent.AGENT_UPDATE, {
            "phase": "decomposing",
            "message": "Analyzing task and creating agent swarm...",
        })

        tasks = await orchestrator.decompose(query, max_agents=data.get("max_agents", 5))

        # Send task list
        await ws_manager.send(ws, WSEvent.AGENT_UPDATE, {
            "phase": "starting",
            "agents": [
                {"agent_id": t.agent_id, "status": "pending", "description": t.description}
                for t in tasks
            ],
        })

        # Step 2: Run swarm with streaming updates
        async def status_callback(swarm):
            agents = [
                {
                    "agent_id": r.agent_id,
                    "status": r.status,
                    "description": r.description,
                    "output": r.output,
                    "error": r.error,
                }
                for r in swarm.tasks
            ]
            await ws_manager.send(ws, WSEvent.AGENT_UPDATE, {
                "phase": "running",
                "swarm_id": swarm.swarm_id,
                "agents": agents,
            })

        swarm = await orchestrator.run_swarm(
            query=query,
            tasks=tasks,
            status_callback=status_callback,
        )

        # Step 3: Send final report
        await ws_manager.send(ws, WSEvent.AGENT_COMPLETE, {
            "swarm_id": swarm.swarm_id,
            "report": swarm.report,
            "agents": [
                {
                    "agent_id": r.agent_id,
                    "status": r.status,
                    "description": r.description,
                }
                for r in swarm.tasks
            ],
        })

    except Exception as e:
        logger.error(f"Agent swarm error: {e}")
        await ws_manager.send(ws, WSEvent.ERROR, {"message": f"Agent swarm failed: {e}"})


# ── Agent REST endpoint ──
@app.post("/api/agents/decompose")
async def decompose_task(req: SwarmDecomposeRequest):
    """Decompose a task into sub-tasks for the agent swarm."""
    from services.agents.orchestrator import orchestrator

    tasks = await orchestrator.decompose(req.query, max_agents=req.max_agents)
    return {
        "tasks": [t.model_dump() for t in tasks],
        "count": len(tasks),
    }


# ── Serve Frontend (static files) ──
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    logger.info(f"Serving frontend from: {frontend_dir}")

# ── Run directly ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
    )
