# 🧠 J.A.R.V.I.S. — Holographic AI Butler

A full-sensory AI web platform with vision, voice, multi-agent reasoning, and proactive intelligence. Inspired by Iron Man's J.A.R.V.I.S.

## Quick Start

### Frontend (HUD)
```bash
cd frontend
python3 -m http.server 8080
# Open http://localhost:8080
```

### Backend
```bash
cd backend
cp ../.env.example .env
# Edit .env with your API keys
pip install -r requirements.txt
uvicorn main:app --reload --port 8765
```

### Both Together
1. Start backend: `cd backend && uvicorn main:app --reload --port 8765`
2. Start frontend: `cd frontend && python3 -m http.server 8080`
3. Open `http://localhost:8080`
4. The HUD connects to the backend via WebSocket automatically

## Architecture

```
frontend/          → Pure HTML/CSS/JS + Three.js (zero build)
backend/           → FastAPI + WebSocket + LLM clients
```

## Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Holographic HUD + Three.js scene | ✅ Complete |
| 2 | WebSocket + Voice (STT/TTS) | ✅ Complete |
| 3 | Vision Intelligence | 🚧 In Progress |
| 4 | Multi-Agent Swarm | 📋 Planned |
| 5 | Deep Research Engine | 📋 Planned |
| 6 | 3D Viz + Proactive Intelligence | 📋 Planned |

## Requirements

- **Frontend**: Any modern browser (Chrome recommended for Speech API)
- **Backend**: Python 3.11+, macOS recommended (for native `say` TTS)
- **APIs**: At least one of DeepSeek, Anthropic, or OpenAI API key
