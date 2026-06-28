# AI_COACH.md — OpenClaw AI 教练集成

## 架构

```
PokerGTO Trainer App                OpenClaw 生态
─────────────────────               ─────────────
Renderer (React)                    ~/.openclaw/agents/poker-bro/
    │                               ├── workspace/
    │ IPC: ai-coach:send            │   ├── IDENTITY.md  (身份)
    ▼                               │   ├── SOUL.md      (人格)
Main Process                        │   ├── AGENTS.md    (项目知识)
    │                               │   ├── MEMORY.md    (长期记忆)
    │ execSync(openclaw agent)      │   ├── TOOLS.md     (工具)
    ▼                               │   └── USER.md      (用户)
OpenClaw Gateway (localhost:18789)  │
    │                               └── agent/
    │ DeepSeek V4 Pro API               ├── models.json
    ▼                                   └── plugins/deepseek/
AI Response ←───────────────────────
```

## Agent: poker-bro

- **名称**: 巴哥 (PokerBro) ♠️
- **模型**: DeepSeek V4 Pro
- **角色**: 扑克 GTO 教练 + 全栈工程师 + 调试伴侣
- **Dashboard**: http://localhost:18789/agents → poker-bro

## 调用方式

### 1. CLI (当前 IPC handler 使用)
```bash
openclaw agent --agent poker-bro --model deepseek/deepseek-v4-pro \
  --message "分析一下 AKs 在 BTN vs BB 翻前" --thinking off --json
```

### 2. 微信 (路由已配置)
```
openclaw-weixin → poker-bro (via routing bind)
```

### 3. Dashboard
```
http://localhost:18789/agents → poker-bro → Chat
```

### 4. 代码 (Electron 内)
```typescript
// Renderer
const response = await window.electronAPI.aiCoach.send({
  message: '这手牌怎么打？',
  history: previousMessages
})

// Response: { text, sessionId, usage, durationMs, error? }
```

## API Key 管理

- **存储**: `.env` 文件中的 `DEEPSEEK_API_KEY`
- **传递**: IPC handler 读取 `.env` → 作为环境变量传给 `openclaw agent`
- **OpenClaw 内**: `openclaw.json` 的 `models.providers.deepseek.apiKey` 作为备用

## 当前限制

1. **execSync 阻塞**: IPC handler 使用 `execSync`，AI 回复期间(3-10s)主进程阻塞
2. **无上下文注入**: 当前只传对话历史，没有自动注入当前场景/手牌数据
3. **agent 目录不完整**: poker-bro 的 `agent/` 目录需手动创建 (已从 main 复制 plugins)
4. **心跳未启用**: `HEARTBEAT.md` 为空，agent 不会主动检查项目状态

## 未来改进

- [ ] 改用 WebSocket 直连 Gateway (避免进程 spawn)
- [ ] 自动注入场景上下文 (当前 board/position/stack 等)
- [ ] 流式输出 (SSE → UI 逐字显示)
- [ ] 多 agent 协作 (poker-bro 调 main agent 做运维)
