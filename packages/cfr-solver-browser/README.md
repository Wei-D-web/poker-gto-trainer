# CFR Solver Browser — Portable Package

将 PokerGTO 的 CFR 求解器打包为独立模块，可拖入任何 React/Vite 项目。

## 包含文件

```
cfr-solver-browser/
  types.ts        — 扑克类型 (ComboKey, ComboInfo, Rank)
  combo-utils.ts  — 169 手牌组合生成器
  cfr-solver.ts   — CFR 反事实遗憾最小化求解器 (核心引擎)
  cfr-worker.ts   — Web Worker 包装器 (不阻塞 UI)
  index.ts        — 导出入口
```

## 使用方式

### 快速体验 (主线程调用)

```ts
import { solvePreflopRange } from './cfr-solver-browser'

// BTN 位置, 100bb, 现金局
const range = solvePreflopRange(3, 100, 'cash')
// → { "AA": 1.0, "AKs": 0.85, "AQs": 0.78, ... }
```

⚠️ 主线程调用会阻塞 UI 3-8 秒，仅适合快速测试。

### 推荐方式 (Web Worker)

```ts
const worker = new Worker(
  new URL('./cfr-solver-browser/cfr-worker.ts', import.meta.url),
  { type: 'module' }
)

worker.postMessage({
  position: 3,        // 0=UTG, 1=MP, 2=CO, 3=BTN, 4=SB
  stackDepth: 100,    // 有效筹码 (bb)
  gameType: 'cash',   // 'cash' | 'tournament'
  ante: 0,            // 前注 (bb, 锦标赛用)
  iterations: 3000,   // CFR 迭代次数 (默认 3000)
})

worker.onmessage = (e) => {
  const { result, elapsed } = e.data
  // result = { "AA": 1.0, "AKs": 0.85, ... }
  // elapsed = 毫秒数
  // 展示 13×13 范围矩阵!
}
```

## 集成到 Kimi App 的步骤

1. 把整个 `cfr-solver-browser/` 文件夹复制到 Kimi App 的 `src/` 下
2. 在 Kimi App 中创建新页面/组件 `CFRSolverPage.tsx`
3. 用 Web Worker 调用 solver，拿到结果画 13×13 范围矩阵
4. 注意：Kimi App 已经有范围矩阵组件，直接用 `solvePreflopRange()` 的结果替代当前的静态演示数据

## 性能

- 3000 次迭代 ≈ 3-8 秒 (取决于设备)
- 结果自动缓存 (按 position + stackDepth + gameType)
- 同一参数重复查询即时返回

## 来源

从 [PokerGTO Trainer](https://github.com/Wei-D-web/poker-gto-trainer) 的 `src/main/solver/cfr-solver.ts` 提取。
