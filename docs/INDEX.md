# PokerGTO Trainer — 文档索引

## 文档导航

| 文档 | 读者 | 内容 |
|------|------|------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 开发者 | 技术架构、目录结构、数据流 |
| [GOALS.md](GOALS.md) | 全员 | 项目愿景、目标用户、成功指标 |
| [ROADMAP.md](ROADMAP.md) | 全员 | 未来计划、版本路线 |
| [BUGS.md](BUGS.md) | 开发者 | 已知 Bug、待修复问题 |
| [AI_CONTEXT.md](AI_CONTEXT.md) | Claude / AI 助手 | 项目上下文、快速上手指南 |
| [AI_COACH.md](AI_COACH.md) | 开发者 | OpenClaw AI 教练集成说明 |
| [NOTES.md](NOTES.md) | 开发者 | 开发笔记、决策记录、参考资料 |

## 快速链接

- **代码**: `~/poker-gto-trainer/`
- **OpenClaw Agent**: `localhost:18789/agents` → poker-bro
- **Supabase**: https://jtymbrvbkqbbzhamdvwl.supabase.co
- **Vercel**: via `vercel.json`
- **Landing Page**: `deploy/index.html`

## 核心命令

```bash
npm run dev          # Electron 开发模式
npm run dev:web      # 纯 Web 开发模式
npm run build        # 生产构建
npm run test:run     # 跑测试
npm run typecheck    # 类型检查
npm run package:mac  # Mac 打包
```
