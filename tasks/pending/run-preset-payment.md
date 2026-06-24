# Claude Code — GTO Poker Trainer 上架任务

> 仓库位置: `~/poker-gto-trainer/`
> 方案文档: `tasks/gto-launch-plan.md`
> 项目概览: `CLAUDE.md`

---

## /goal 🥇 Phase 1 — 预设策略上云 (high)

**目标**：将 50 种翻牌纹理的预设策略从本地 SQLite 搬到 Supabase，让网页版 (Vercel) 能直接读取策略数据展示。

**关键文件**：
- `src/main/data/preset-solutions.ts` — 50种翻牌纹理定义 + 策略入口
- `src/main/data/database.ts` — 依赖 Electron `app.getPath`，网页版跑不了
- `src/main/solver/postflop-engine.ts` — GTO 策略生成
- `src/shared/types/strategy.ts` — 策略数据结构类型
- `src/shared/utils/poker-math.ts` — 计算工具
- `supabase-schema.sql` — 已有 profiles/spots/progress 表

**具体子任务**：

1. **新建两个 Supabase 表**（走 supabase-schema.sql 追加）：
   - `preset_strategies`：board, texture, hero_position, villain_position, stack_depth
   - `strategy_combos`：strategy_id, hand, action, frequency, ev, sizing, position
   - 建 RLS policy：所有用户可读，仅管理员可写

2. **写迁移脚本**：读取 SQLite 数据 → upsert 到 Supabase
   - 脚本位置：`scripts/migrate-presets-to-supabase.mjs`
   - 读取 `database.ts` 导出的数据（调用 preset-solutions.ts 的 `generateAllPresets()`）
   - 用 `@supabase/supabase-js` 批量 upsert（100条一批）

3. **修改 database.ts** 解耦 Electron 依赖：
   - 把 `app.getPath('userData')` 抽出为可注入参数
   - 让网页端也能跑数据库操作（或全部依赖 Supabase）

4. **网页版加载策略数据**：
   - `src/renderer/index-web.html` 入口，网页版从 Supabase 读数据
   - localStorage 缓存 24h，减少请求
   - 首次加载失败时优雅降级（显示 "loading" 不崩）

**验收标准**：
- ✅ 网页版（`npm run dev:web`）能展示某张翻牌的策略矩阵
- ✅ 数据不是本地计算的，来自 Supabase 查询
- ✅ 不破坏桌面端的本地 SQLite 回退能力

---

## /hook 🥈 Phase 2 — 支付链路 (normal, 依赖 #1)

**前提**：Phase 1 上线后，先看流量数据（国内 vs 海外），再决定支付方向。
当前阶段请**不要改支付代码**，只做评估和准备。

**已有资产**：
- Stripe 集成：`api/create-checkout-session.ts`, `api/stripe-webhook.ts`, `api/create-customer-portal.ts`
- Supabase tier 系统：`supabase-schema.sql` 里的 `profiles.tier`
- Landing page 定价卡片：`deploy/index.html` (Free / ¥18 Pro / ¥198 Lifetime)
- License key 系统：`scripts/generate-license-keys.mjs`

---

## /loop 持续模式

执行完 Phase 1 后，请：
1. 验证网页版能正常运行
2. 检查类型检查通过 (`npm run typecheck`)
3. 检查测试通过 (`npm run test:run`)
4. 更新 `tasks/` 中的进度状态
5. 汇报执行结果，包括：改了哪些文件、表结构 SQL、测试结果
6. 列出 Phase 2 需要做的准备工作清单

---

**边界**：
- 不改 Supabase 已有 profiles/spots/progress 表结构（只追加新表）
- 不改 Stripe API 代码（除非需要打通支付与 tier 的 webhook 链路，但那是 Phase 2 的事）
- 不改现有的桌面端玩法，只增加网页端的数据源
