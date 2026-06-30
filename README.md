# PokerGTO Trainer 🃏

> 专业 GTO 扑克训练平台。13 个本地求解器引擎、26 个功能模块、对标 GTO Wizard，功能覆盖 90%，价格仅 1/3。

[![CI](https://github.com/weiwu/poker-gto-trainer/actions/workflows/ci.yml/badge.svg)](https://github.com/weiwu/poker-gto-trainer/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

---

## 功能一览

| 模块 | 说明 |
|------|------|
| 🔥 **Daily Drills** | 每日 GTO 挑战 + 连击追踪 |
| 🎮 **实战模拟** | 对抗 GTO AI，真实牌桌体验 |
| 🌐 **策略浏览器** | 13×13 范围矩阵 · CFR 求解 |
| 🎯 **训练模式** | 随机出题 · EV 即时反馈 |
| 📊 **数据分析** | 批量手牌聚合 Dashboard |
| ⚔️ **Range Battle** | 范围对战 · 胜率分布图 |
| 🔍 **手牌分析器** | 逐条决策 GTO 偏差分析 |
| 🔒 **Node Locking** | 锁定手牌 · 观察策略调整 |
| 👥 **多人底池** | 3-6 人启发式分析 |
| 💰 **ICM 计算器** | 锦标赛权益精确计算 |
| 🎯 **对手剥削顾问** | 7 种对手类型针对性偏移 |
| 📖 **翻前图册** | 全位置 × 全深度范围浏览 |

完整 26 个模块见 [功能列表](#)

## 快速开始

```bash
# 开发模式
npm run dev

# 生产构建
npm run build && npm run package:mac   # macOS
npm run build && npm run package:win   # Windows
```

## 技术栈

- **框架**: Electron 33 + React 19
- **语言**: TypeScript (strict mode)
- **状态管理**: Zustand
- **构建**: Vite + electron-vite
- **测试**: Vitest
- **求解器**: 纯 TypeScript CFR 算法（无外部依赖）
- **数据库**: SQLite via sql.js (WASM)
- **云服务**: Supabase (认证/支付/同步)
- **支付**: Lemon Squeezy + Stripe + 微信/支付宝

## 项目结构

```
src/
├── main/           # Electron 主进程
│   ├── solver/     # 13 个求解器引擎
│   ├── ipc/        # IPC 路由
│   ├── data/       # 数据库 + 样本数据
│   ├── update/     # 自动更新
│   └── store/      # 持久化存储
├── renderer/       # React UI
│   ├── components/ # 19 个功能模块
│   ├── stores/     # 8 个 Zustand stores
│   └── hooks/      # 自定义 hooks
├── shared/         # 共享类型
└── preload/        # contextBridge
```

## 定价

| 方案 | 价格 | 定位 |
|------|------|------|
| 🆓 免费版 | 永久免费 | 基础训练 + 策略浏览 |
| ⭐ 专业版 | $29.99/月 | 全部模块 + 批量分析 |
| 💎 终身版 | $299 买断 | 永久更新 + 离线使用 |

## 路线图

详见 [ROADMAP.md](https://github.com/weiwu/poker-gto-trainer/blob/main/docs/ROADMAP.md)

## License

AGPL-3.0
