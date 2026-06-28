# NOTES.md — 开发笔记

## 决策记录

### 2026-06-27: AI 教练用 OpenClaw 而不是内嵌 API
- **背景**: 想给项目加 LLM 能力（策略解说、手牌复盘）
- **方案 A**: 直接在 main process 调 DeepSeek API
- **方案 B**: 通过 OpenClaw agent 桥接 ← 选了
- **原因**:
  - Dashboard 可调试 (session 历史 / system prompt / 状态)
  - 跨 session 记忆 (MEMORY.md / 每日记录)
  - 多通道复用 (微信也能调 poker-bro)
  - 不需要在项目里管理 API key 和 prompt
- **代价**: `execSync` 阻塞 + 依赖 OpenClaw 服务运行

### 2026-06-27: poker-bro 独立 workspace 设计
- **决策**: 不给 poker-bro 用 main agent 的 workspace (`~/.openclaw/workspace/`)
- **原因**: poker-bro 是 poker 专用的分身，需要独立的项目知识库和记忆
- **实现**: workspace 在 `~/.openclaw/agents/poker-bro/workspace/`

## 当前状态 (2026-06-27)

### 能跑的
- `npm run dev` → Electron 桌面应用
- `npm run dev:web` → 浏览器开发
- `npm run build:web` → Vercel 部署
- Stripe 支付 (但 Webhook 未完整测试)
- Supabase Auth (但数据同步未上线)
- OpenClaw poker-bro agent (CLI + IPC bridge)

### 不能跑的 / 没测过的
- Mac 打包 (`npm run package:mac`) — 依赖 electron-builder 配置完整性
- Windows/Linux 打包 — 未测试
- 端到端测试 — tests/ 目录为空
- 付费整套流程 — Webhook 处理未完整

## 参考资料

### GTO 理论
- [GTO Wizard](https://gtowizard.com/) — 竞品参考
- [PioSolver](https://www.piosolver.com/) — 行业标准
- CFR 算法: "Regret Minimization in Games" (Zinkevich et al., 2007)

### 技术
- [Electron Vite](https://electron-vite.org/)
- [Zustand](https://docs.pmnd.rs/zustand)
- [Supabase JS](https://supabase.com/docs/reference/javascript)
- [Stripe Elements](https://stripe.com/docs/stripe-js)
- [OpenClaw Docs](https://docs.openclaw.ai)

### 部署
- Vercel: `vercel.json` 配置了 SPA rewrites
- GitHub Pages: `/poker-gto-trainer/` base path (历史部署方式)

## 常见操作

```bash
# 开发
npm run dev                     # Electron 开发
npm run dev:web                 # Web 开发 (localhost:5173)

# 质量
npm run typecheck               # TS 类型检查
npm run test:run                # Vitest (目前无测试)
npm run lint                    # ESLint

# 构建
npm run build                   # 完整构建
npm run build:web               # 仅 Web (→ dist-web/)

# AI 教练
openclaw agent --agent poker-bro --message "..." --thinking off
openclaw agents list            # 查看所有 agent
openclaw agents bindings        # 查看路由
```

## 目录备忘

```
~/poker-gto-trainer/            # 项目根目录
~/.openclaw/                     # OpenClaw 全局配置
~/.openclaw/agents/poker-bro/   # poker-bro agent 数据
~/.openclaw/workspace/           # main agent workspace
```
