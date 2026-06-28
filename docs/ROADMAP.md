# ROADMAP.md — 路线图

## 当前版本: v0.1.0 (MVP)

---

## Phase 1 🥇 — 预设策略上云 (当前)

**目标**: 让网页版有数据可用，不依赖 Electron 主进程的本地求解器

- [ ] 预计算 50 种翻牌纹理的 GTO 策略
- [ ] 存入 Supabase `strategies` 表
- [ ] 网页版从 Supabase 拉取策略数据
- [ ] 实现本地缓存 (LRU, 减少 Supabase 调用)

**预计**: 2-3 周

---

## Phase 2 🥈 — 支付链路完善

**目标**: 完整的付费转化漏斗

- [x] Stripe 支付集成 (基础)
- [ ] Stripe Webhook 完整处理 (subscription lifecycle)
- [ ] 付费墙 UI 优化 (PremiumFeatures 页面)
- [ ] 免费试用期 (7天)
- [ ] 支付数据分析 (转化率, churn)
- [ ] 考虑加入国内支付 (微信/支付宝) — 看用户分布

**预计**: 2-4 周

---

## Phase 3 🥉 — AI 教练深度集成

**目标**: 把 OpenClaw poker-bro 的能力深度嵌入产品

- [x] OpenClaw agent 创建 + workspace
- [x] IPC 桥接 (ai-coach.ipc.ts)
- [ ] **AI 教练聊天面板 UI** — 应用内的聊天界面
- [ ] **上下文注入** — 把当前场景/手牌自动传给 agent
- [ ] **策略解说** — 「一键解说」按钮，agent 用自然语言解释 GTO 策略
- [ ] **手牌复盘** — 导入手牌后 AI 逐条点评
- [ ] **训练导师** — AI 根据用户弱点推荐训练内容

**预计**: 3-4 周

---

## Phase 4 — 多设备同步

**目标**: 跨设备无缝体验

- [ ] Supabase 用户进度同步
- [ ] 云存档 (手牌历史、Spot 库、训练记录)
- [ ] Web ↔ Desktop 数据互通

**预计**: 3-4 周

---

## Phase 5 — 社区与增长

**目标**: 用户增长 + 社区驱动内容

- [ ] Spot 分享功能 (用户创建的 Spot 可公开分享)
- [ ] 排行榜 / 成就系统
- [ ] 邀请返利机制
- [ ] 内容营销 (扑克策略博客/GTO 教程)

**预计**: 4-6 周

---

## Phase 6 — 国际化

**目标**: 进入英文市场

- [ ] 英文 UI
- [ ] 英文策略解说
- [ ] 英文 Landing Page
- [ ] 多语言 i18n 框架 (已有 languageStore 基础)

**预计**: 2-3 周

---

## 技术债务 (穿插在各 Phase)

- [ ] `hand-analyzer.ts` 拆分 (48KB → 模块化)
- [ ] `postflop-engine.ts` 拆分 (24KB → 工厂模式)
- [ ] 添加单元测试 (优先 solver 核心)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] AI Coach IPC 改为非阻塞
- [ ] 性能优化 (求解器缓存、范围矩阵渲染)
