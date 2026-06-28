# AI_CONTEXT.md — Claude / AI 助手上手指南

> **目标读者**: 未来的 Claude 会话、OpenClaw poker-bro agent、或其他 AI 编码助手。
> **用途**: 让 AI 在最短时间内理解项目全貌，准确定位代码，做出正确决策。

---

## 一分钟速览

- **这是什么**: Electron + React + TS 桌面应用，扑克 GTO 训练工具
- **在哪**: `~/poker-gto-trainer/`
- **怎么跑**: `npm run dev` (Electron) / `npm run dev:web` (浏览器)
- **核心逻辑在哪**: `src/main/solver/` (13 个求解器)
- **UI 在哪**: `src/renderer/components/` (19 个模块, 23 个页面)
- **IPC 在哪**: `src/main/ipc/` (preload → main 通信)
- **AI 教练**: OpenClaw poker-bro agent (DeepSeek V4 Pro)
- **价格**: Free / Pro ¥18月 / Lifetime ¥198

## 代码导航速查

```
想看什么?                          去哪个文件?
──────────────────────────────────────────────────────────
CFR 翻前求解器                   src/main/solver/cfr-solver.ts
翻后 GTO 策略                    src/main/solver/postflop-engine.ts
AI 对手逻辑                      src/main/solver/game-engine.ts → getAIDecision()
对手剥削                         src/main/solver/opponent-exploit-engine.ts
手牌分析                         src/main/solver/hand-analyzer.ts
ICM 计算                         src/main/solver/icm-calculator.ts
场景配置页面                      src/renderer/components/scenario/StrategyExplorer.tsx
训练模块                         src/renderer/components/training/
页面路由                         src/renderer/App.tsx → ROUTES
IPC 通信定义                      src/preload/index.ts → electronAPI
IPC handler 注册                 src/main/ipc/register.ts
策略 IPC                         src/main/ipc/strategy.ipc.ts
AI 教练 IPC                      src/main/ipc/ai-coach.ipc.ts
AI 教练类型                       src/shared/types/ai-coach.ts
OpenClaw Agent 身份              ~/.openclaw/agents/poker-bro/workspace/IDENTITY.md
OpenClaw Agent 知识               ~/.openclaw/agents/poker-bro/workspace/AGENTS.md
环境变量                         .env (gitignored) / .env.example
Vercel 部署配置                  vercel.json
```

## 关键架构决策

1. **IPC 走 preload 桥接** — renderer 不能直接调 Node API，全部通过 `window.electronAPI.*`
2. **求解器是纯 TS 算法** — 无外部 LLM/AI 依赖，都是本地 TypeScript
3. **AI 教练在 OpenClaw 中** — 不内嵌 LLM 调用，而是通过 CLI `openclaw agent` 桥接
4. **Zustand 按功能域拆分** — 8 个独立 store，不是一个大 store
5. **单文件 ≤ 500 行** — 超过则拆分 (`hand-analyzer.ts` 48KB 待拆分)
6. **中英混合** — UI 中文，代码/术语英文

## 修改代码前必读

1. 先读 `docs/ARCHITECTURE.md` 理解整体结构
2. 修改 solver 前，确认不影响 IPC handler 和 UI
3. 新增 IPC handler 后，注册到 `register.ts` + 添加 preload 桥接
4. 修改 `.env.example` 时同步更新 `.env`（如新增 key）
5. 代码风格: TypeScript strict, 函数组件, Zustand, Tailwind CSS

## 项目依赖关系图

```
shared/types/  ←── main/solver/  ←── main/ipc/
       ↑               ↑                ↑
       └── renderer/ ──┘                │
            (stores, hooks)             │
                  ↑                     │
                  └── preload/ ─────────┘
                       (contextBridge)
```

## 用户信息

- **称呼**: 吴总
- **语言**: 中文沟通，代码/术语英文
- **风格偏好**: 直接高效，不喜欢废话，技术可以深但结论要清楚
