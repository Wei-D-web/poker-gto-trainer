# ARCHITECTURE.md — 技术架构

## 概览

PokerGTO Trainer 是一个 **Electron + React + TypeScript** 桌面应用（也支持纯 Web 模式），用于扑克 GTO（Game Theory Optimal）策略训练。

```
┌─────────────────────────────────────────────────┐
│                  Electron Shell                  │
│  ┌─────────────┐  ┌───────────────────────────┐ │
│  │ Main Process │  │    Renderer Process        │ │
│  │ (Node.js)    │  │    (React 19 + Vite)       │ │
│  │              │  │                            │ │
│  │  Solver 引擎  │◄─┤ IPC (contextBridge)       │ │
│  │  IPC Handlers│  │                            │ │
│  │  Data Store  │  │  23 个页面路由              │ │
│  │  Supabase    │  │  8 个 Zustand stores       │ │
│  │  OpenClaw桥  │  │  19 个组件模块              │ │
│  └─────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
    ~/.openclaw/         Supabase
    (AI Coach)         (Auth + Data)
```

## 目录结构

```
poker-gto-trainer/
├── src/
│   ├── main/                    # Electron 主进程 (Node.js)
│   │   ├── index.ts             # 主进程入口
│   │   ├── ipc/                 # IPC 通信处理器
│   │   │   ├── register.ts      # 注册所有 IPC handler
│   │   │   ├── strategy.ipc.ts  # 策略相关 IPC
│   │   │   ├── hand-history.ipc.ts
│   │   │   ├── session-review.ipc.ts
│   │   │   ├── spot-library.ipc.ts
│   │   │   ├── report.ipc.ts
│   │   │   ├── license.ipc.ts
│   │   │   ├── auth.ts
│   │   │   └── ai-coach.ipc.ts  # OpenClaw AI 教练桥接
│   │   ├── solver/              # 13 个 GTO 求解器引擎
│   │   ├── data/                # 数据加载/生成/数据库
│   │   └── store/               # electron-store 持久化
│   │
│   ├── renderer/                # React 渲染进程
│   │   ├── components/          # 19 个功能模块
│   │   │   ├── analytics/       # 数据分析仪表盘
│   │   │   ├── auth/            # 登录/注册
│   │   │   ├── charts/          # 翻前范围图表
│   │   │   ├── common/          # ErrorBoundary, Toast, etc.
│   │   │   ├── decision-tree/   # 决策树可视化
│   │   │   ├── guide/           # 使用指南
│   │   │   ├── hand-history/    # 手牌历史 + 分析
│   │   │   ├── layout/          # Sidebar, TitleBar
│   │   │   ├── matrix/          # 范围矩阵
│   │   │   ├── playground/      # 自由对战 (AI对手)
│   │   │   ├── premium/         # 付费功能
│   │   │   ├── scenario/        # 场景分析 (核心)
│   │   │   ├── session-review/  # 牌局回顾
│   │   │   ├── settings/        # 设置 + 账户
│   │   │   ├── spots/           # Spot 库
│   │   │   ├── strategy/        # 策略展示
│   │   │   ├── tools/           # 工具集合
│   │   │   └── training/        # 训练模块
│   │   ├── stores/              # 8 个 Zustand stores
│   │   │   ├── scenarioStore.ts   # 场景配置
│   │   │   ├── strategyStore.ts   # 策略数据
│   │   │   ├── trainingStore.ts   # 训练状态
│   │   │   ├── opponentStore.ts   # 对手类型+剥削
│   │   │   ├── sessionReviewStore.ts
│   │   │   ├── languageStore.ts   # i18n
│   │   │   ├── uiStore.ts        # UI 状态
│   │   │   └── toastStore.ts     # 通知队列
│   │   ├── hooks/               # 自定义 hooks
│   │   └── services/            # Supabase + Web API bridge
│   │
│   ├── preload/                 # contextBridge API 定义
│   │   └── index.ts             # window.electronAPI 类型
│   │
│   └── shared/                  # 主进程/渲染进程共享
│       ├── types/               # 类型定义
│       │   ├── poker.ts         # 核心扑克类型
│       │   ├── strategy.ts      # 策略数据类型
│       │   ├── scenario.ts      # 场景类型
│       │   └── ai-coach.ts      # AI 教练类型
│       └── utils/               # 共享工具函数
│
├── deploy/                      # Landing page + 法律页面
│   ├── index.html               # 首页 (暗色主题)
│   ├── payment/                 # 支付页面
│   ├── privacy.html
│   └── terms.html
│
├── supabase/                    # 数据库 schema + Edge Functions
│   └── functions/
│       ├── stripe-webhook/
│       ├── validate-license-key/
│       ├── create-checkout-session/
│       └── create-customer-portal/
│
├── resources/                   # 应用图标
├── docs/                        # 📖 项目文档
├── .env                         # 环境变量 (gitignore)
├── .env.example                 # 环境变量模板
├── vercel.json                  # Vercel 部署配置
└── package.json
```

## 13 个求解器引擎 (`src/main/solver/`)

| 文件 | 功能 | 说明 |
|------|------|------|
| `cfr-solver.ts` | CFR 算法 | Counterfactual Regret Minimization，计算翻前纳什均衡 |
| `postflop-engine.ts` | 翻后策略 | 按翻牌纹理分类生成 GTO 策略 |
| `game-engine.ts` | 牌局模拟 | 含 `getAIDecision()` 启发式 AI 对手 |
| `hand-analyzer.ts` | 手牌分析 | 历史手牌 vs GTO 基线偏差 |
| `deviation-engine.ts` | 偏差检测 | 玩家偏离 GTO 策略检测 |
| `opponent-exploit-engine.ts` | 剥削引擎 | 基于对手类型的规则剥削 |
| `equity-calculator.ts` | 胜率计算 | 手牌权益计算 |
| `hand-evaluator.ts` | 牌力评估 | 扑克手牌强度比较 |
| `icm-calculator.ts` | ICM | 独立筹码模型（锦标赛） |
| `multiway-engine.ts` | 多人底池 | 3+ 玩家的底池分析 |
| `node-locker.ts` | 节点锁定 | 策略树节点选择性锁定 |
| `range-battle.ts` | 范围对抗 | Range vs Range 分析 |
| `turn-river-engine.ts` | 转牌/河牌 | 后期街道专项分析 |

## 23 个页面路由 (App.tsx)

`explore` → StrategyExplorer, `training` → TrainingPage, `compare` → ComparePage,
`editor` → RangeEditorPage, `history` → HandHistoryDashboard, `analyzer` → HandAnalyzerPage,
`advanced` → AdvancedAnalysis, `icm` → ICMPage, `turnriver` → TurnRiverPage,
`multiway` → MultiwayPage, `battle` → RangeBattlePage, `cashmttcompare` → CashMttComparePage,
`exploitadvisor` → ExploitAdvisor, `playground` → PlaygroundPage,
`charts` → PreflopChartsPage, `spots` → SpotLibraryPage, `tools` → ToolsPage,
`analytics` → AnalyticsPage, `equitytrainer` → EquityTrainerPage,
`premium` → PremiumFeatures, `settings` → SettingsPage, `account` → AccountPage,
`guide` → GuidePage, `session` → SessionReviewPage

## 数据流

```
用户操作 → React Component → Zustand Store
    ↓ (Electron 环境)              ↓ (Web 环境)
IPC invoke → Main Handler      Web API Bridge → Supabase
    ↓                              ↓
Solver Engine (本地)           Supabase Edge Functions
    ↓
返回结果 → React re-render
```

### AI 教练数据流（新增）

```
React AI Chat UI
    ↓ IPC invoke
ai-coach.ipc.ts (Main Process)
    ↓ execSync
openclaw agent --agent poker-bro (CLI)
    ↓ WebSocket
OpenClaw Gateway (localhost:18789)
    ↓
DeepSeek V4 Pro API
    ↓
回复 → React UI
```

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Electron 33 |
| 前端 | React 19, TypeScript 5.7 (strict) |
| 状态管理 | Zustand 5 |
| 构建 | Vite 5, electron-vite |
| 样式 | Tailwind CSS 4 |
| 图表 | D3.js 7 |
| 路由 | React Router 7 |
| 数据库 | Supabase + sql.js (本地) |
| 支付 | Stripe |
| 测试 | Vitest + Testing Library |
| AI | OpenClaw + DeepSeek V4 |
| 数据验证 | Zod |
