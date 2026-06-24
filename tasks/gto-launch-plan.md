# PokerGTO Trainer — 上架方案总览

> 参考 GTO Wizard 模式：桌面应用（免费试用）→ 云端策略库（付费解锁）→ 网页轻量版（引流入口）

---

## 整体架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  桌面 App        │     │  Website         │     │  Cloud API       │
│  (Electron)      │     │  (Vercel/GP)     │     │  (Supabase+CF)   │
│                  │     │                  │     │                  │
│  - GTO求解器     │────▶│  - Landing Page  │────▶│  - 预设策略      │
│  - 本地SQLite    │     │  - 功能展示       │     │  - 用户订阅      │
│  - 离线可用      │     │  - Web轻量训练    │     │  - 数据同步      │
│  - License Key   │     │  - 购买入口       │     │  - License验证   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Phase 1 🥇 — 预设策略上云（当前）

**目标**：让网页版能展示预设策略数据，形成"有东西可看"的引流页面

**不需要代码（我来写）：**
1. ✅ 确定表结构设计思路
2. ✅ 确定数据导出/同步方案
3. ✅ 确定网页版数据获取策略（Supabase RLS 直接暴露，不需要额外后端）
4. ✅ 确定定价模式与 tier 对应关系

**需要代码（→ Claude Code）：**
1. Supabase 建表（preset_strategies + strategy_combos）
2. 写 migration script（SQLite → Supabase 批量导出）
3. 修改网页端加载逻辑（WebApp.tsx 优先读 Supabase 缓存）
4. 数据库解耦（让 database.ts 不依赖 Electron API）

### 数据表设计

**preset_strategies 表：**
```sql
CREATE TABLE preset_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board TEXT NOT NULL,          -- e.g. "As7d2c"
  texture TEXT NOT NULL,        -- e.g. "ace-high-dry"  
  description TEXT,
  hero_position INTEGER,        -- IP/OOP
  villain_position INTEGER,
  stack_depth INTEGER DEFAULT 100,
  solver_version TEXT,
  computed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_preset_board ON preset_strategies(board);
```

**strategy_combos 表：**
```sql
CREATE TABLE strategy_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES preset_strategies(id),
  hand TEXT NOT NULL,           -- e.g. "AA", "AKs"
  action TEXT NOT NULL,         -- "bet", "check", "raise", "fold"
  frequency REAL NOT NULL,      -- 0.0 ~ 1.0
  ev REAL DEFAULT 0,
  sizing REAL,                  -- bet size in BB
  position TEXT,                -- "hero", "villain"
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_combos_strategy ON strategy_combos(strategy_id);
CREATE INDEX idx_combos_hand ON strategy_combos(hand);
```

### 同步策略
- **一次性迁移**：SQLite 已有数据 → 导出 JSON → Supabase 批量 upsert
- **增量更新**：后续本地更新策略时，同步推一份到 Supabase（仅 premium 用户可触发）
- **网页版缓存**：Supabase 返回数据后，localStorage 缓存 24h，减少请求

### 定价与 Tier
| Tier | Price | Features |
|------|-------|----------|
| Free | 免费 | 翻前范围训练、10个翻牌纹理预览 |
| Pro | ¥18/月 | 50个全纹理策略、云端同步、多设备 |
| Lifetime | ¥198 | 永久解锁、所有未来预设策略更新 |

---

## Phase 2 🥈 — 支付链路

**原则**：等 Phase 1 上线 → 看流量来源（国内 vs 海外）→ 决定支付方向

### 方案 A：海外用户为主 → 完善 Stripe
- 已有：`api/create-checkout-session.ts`, `api/stripe-webhook.ts`
- 需要完善：Webhook 处理订阅状态变更、自动升级 user tier
- 部署：Vercel Serverless Functions（已配 vercel.json）
- 无需改部署结构

### 方案 B：国内用户为主 → 接入支付宝/微信支付
- 支付宝当面付（个人可用，费率 0.6%）
- 微信支付 H5（需要个体户/企业资质）
- 或者用聚合支付平台（PayJS、XorPay 等）
- License Key 激活方式不变（购买后自动绑定）

### 推荐策略
1. **先上 Stripe**（已有代码，投入最小）
2. 看 7-14 天流量数据
3. 国内来源 > 50% → 加支付宝/微信
4. 海外为主 → 优化 Stripe UX（增加 Apple Pay/Google Pay）

---

## Phase 3 — 后续可选

- [ ] 云端手牌历史同步（已有 spots 表 schema）
- [ ] 多设备训练进度同步（已有 progress 表 schema）
- [ ] 社区分享预设策略
- [ ] AI 翻后分析（对子分析+弱點挖掘）

---

## 当前任务队列

| # | 任务 | 状态 | 执行者 |
|---|------|------|--------|
| 1 | 预设策略上云（Supabase 建表+迁移+网页加载） | ⏳ pend | Claude Code |
| 2 | 支付链路评估与集成 | ⏳ pend (等#1) | Claude Code |
| 3 | 完善定价页面与免费版限制 | 📝 plan | 待定 |

---

## 需要我写/不需要我写的分界线

**我写（无需代码）：** ✅
- 方案设计、表结构、架构图
- 定价策略、tier 设计
- 上架节奏、流量数据观察计划
- 支付方案对比与推荐

**Claude Code 写（需要代码）：** 🔧
- Supabase SQL 建表脚本
- 数据迁移脚本（SQLite → Supabase）
- 网页端加载策略数据的代码修改
- 支付链路代码完善（Stripe/Domestic）
- 数据库解耦（database.ts 去除 Electron 依赖）
