# BUGS.md — 已知问题与待修复

## 格式

每条 bug 包含: **严重度** 🔴高 🟡中 🟢低 | **状态** | **发现日期** | **描述** | **复现步骤** | **修复思路**

---

## 待修复

### 🟡 [hand-analyzer.ts] 文件过大 (48KB)
- **发现**: 2026-06-27
- **描述**: `src/main/solver/hand-analyzer.ts` 达 48KB，违反单文件 500 行原则
- **修复**: 拆分为 `hand-analyzer/` 子模块（如 evaluator, comparator, reporter）

### 🟡 [postflop-engine.ts] 文件过大 (24KB)
- **发现**: 2026-06-27
- **描述**: 翻后引擎 24KB，包含多种翻牌纹理处理，可模块化
- **修复**: 按翻牌纹理工厂模式拆分

### 🟡 缺少端到端测试
- **发现**: 2026-06-27
- **描述**: 项目 `tests/` 目录为空，零测试覆盖
- **修复**: 优先为核心求解器写单元测试 (cfr-solver, hand-evaluator, equity-calculator)

### 🟢 AI Coach IPC 使用 execSync 会阻塞主进程
- **发现**: 2026-06-27
- **描述**: `ai-coach.ipc.ts` 用 `execSync` 等待 agent 回复(3-10s)，期间 Electron 主进程阻塞
- **修复**: 改用 `exec` + Promise 或 WebSocket 直连 Gateway

### 🟢 无 CI/CD pipeline
- **发现**: 2026-06-27
- **描述**: 没有 GitHub Actions 或其他 CI 配置
- **修复**: 添加 `.github/workflows/ci.yml` — typecheck + test + build

### 🟢 poker-bro agent 默认模型应设为 deepseek-v4-pro
- **发现**: 2026-06-27
- **描述**: `openclaw agents list` 显示 poker-bro 用 `deepseek-v4-flash`，但 IPC handler 用 `--model` 覆盖为 pro。应该统一。
- **修复**: 更新 openclaw.json 中 agent 默认 model

---

## 已修复

_(暂无)_

---

## 不会修复 (Won't Fix)

_(暂无)_
