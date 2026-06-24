# PokerGTO Trainer — GTO 扑克训练桌面应用

Electron + React + TypeScript 桌面应用，提供翻前范围训练、翻后策略演练和 GTO 模式训练。

## 技术栈

- **框架**: Electron + electron-vite
- **前端**: React 19 + TypeScript, Zustand 状态管理
- **构建**: Vite, electron-builder (Mac/Win/Linux)
- **测试**: Vitest

## 目录结构

```
poker-gto-trainer/
├── src/
│   ├── main/       # Electron 主进程
│   │   ├── index.ts
│   │   ├── ipc/    # IPC 通信
│   │   ├── solver/ # 求解器集成
│   │   └── store/  # 数据持久化
│   ├── renderer/   # React 渲染进程
│   │   ├── components/
│   │   ├── stores/  # Zustand stores
│   │   ├── hooks/
│   │   └── styles/
│   ├── preload/    # 预加载脚本
│   └── shared/     # 共享类型
├── resources/      # 应用图标
├── tests/
└── supabase/       # 数据库 schema
```

## 常用命令

```bash
npm run dev              # 开发模式
npm run build            # 构建
npm run test:run         # 跑测试
npm run typecheck        # 类型检查
npm run package:mac      # Mac 打包
```

## 代码风格

- TypeScript strict mode
- IPC 通信走 preload 桥接，不直接在 renderer 调 Node API
- Zustand store 按功能域拆分

## 边界

- Electron 安全：contextIsolation + nodeIntegration=false
- 不直接操作文件系统（走 IPC）
- Supabase 仅用于可选云同步
