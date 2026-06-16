import { useState } from 'react'
import { useT } from '../../stores/languageStore'
import { cn } from '../../lib/utils'
import {
  Globe, Target, Edit3, BarChart3, Search, Lock, ArrowRight,
  Users, DollarSign, Settings, Zap, BookOpen, Keyboard, Lightbulb, ChevronRight,
} from 'lucide-react'

interface ModuleGuide {
  id: string
  icon: typeof Globe
  title: string
  shortcut: string
  accent: string
  description: string
  tips: string[]
}

export function GuidePage() {
  const t = useT()
  const [activeModule, setActiveModule] = useState<string | null>(null)

  const modules: ModuleGuide[] = [
    {
      id: 'explore', icon: Globe, title: t('nav.explore'), shortcut: '⌘1',
      accent: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      description: '13×13 范围矩阵，7阶频率热力图。切换位置、筹码深度、我/对手 视角，即时查看 GTO 翻前策略。内置 CFR 求解器可本地计算纳什均衡。',
      tips: [
        '点击任意格子查看该手牌的详细数据：胜率、EV、行动分布',
        '工具栏可切换 我 / 对手 / Diff / Merged 四种视图',
        '左侧 CFR Solver 点击即可本地计算最优策略',
        '选择牌面后可展开翻后分析和下注尺度选择',
        '右上角可切换到决策树视图，查看游戏树',
      ],
    },
    {
      id: 'training', icon: Target, title: t('nav.training'), shortcut: '⌘2',
      accent: 'text-green-400 bg-green-500/10 border-green-500/20',
      description: '随机出题，28 种牌面类型全覆盖。选择正确行动，即时反馈 GTO 偏差和 EV 损失。支持翻前/翻牌/转牌/河牌四个街段，简单/中等/困难三个难度。',
      tips: [
        '可自定义街段、难度、题目数量',
        '答错后会显示 EV 损失和 GTO 正确答案',
        '完成所有题目后查看正确率和常见错误统计',
        '支持中英文双语反馈和解释',
      ],
    },
    {
      id: 'editor', icon: Edit3, title: t('nav.editor'), shortcut: '⌘3',
      accent: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      description: '点击格子构建自定义范围。三种编辑模式：Toggle（0%→50%→100%循环）、Paint（设为100%）、Erase（清除）。支持保存、导出 JSON、导入。',
      tips: [
        '右侧实时统计 VPIP、对子/同花/非同花数量',
        '预设按钮可快速加载标准位置范围',
        '导出为 JSON 文件，可分享或备份',
        '保存的范围会自动出现在下方列表中',
      ],
    },
    {
      id: 'compare', icon: BarChart3, title: t('nav.compare'), shortcut: '⌘4',
      accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: '并排对比不同位置/深度的 GTO 范围。差异模式用热力图直观显示两个范围的差异——绿色更宽、红色更窄。',
      tips: [
        '选择位置 A 和位置 B，设置筹码深度，点击 Load Ranges',
        '切换到 Difference 模式查看差异热力图',
        '适合对比 BTN vs UTG、深码 vs 短码等场景',
      ],
    },
    {
      id: 'analyzer', icon: Search, title: t('nav.analyzer'), shortcut: '⌘6',
      accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      description: '输入实际手牌和完整行动路线，逐条决策与 GTO 对比。给出总体评分（A+ 到 F），每条决策的严重程度和 EV 损失，以及 GTO 建议行动。',
      tips: [
        '先选我的手牌（2张），再选公共牌（0-5张）',
        '按街段逐步添加行动，自动推进对手回合',
        '分析结果包含总体评分、逐条分析、各街段统计',
        '严重错误用红色标记，轻微偏差用蓝色标记',
      ],
    },
    {
      id: 'advanced', icon: Lock, title: t('nav.advanced'), shortcut: '⌘7',
      accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Node Locking 节点锁定——GTO 研究中最强大的功能。锁定特定手牌到强制动作（如强制弃牌），观察求解器如何重新调整其他手牌的频率。',
      tips: [
        '先选择牌面点"分析"加载翻后策略',
        '选择锁定动作（强制弃牌/过牌/跟注/下注等）',
        '点击矩阵中的手牌 → 锁定，可锁定多手牌',
        '应用锁定后，切换到 Difference 视图查看频率变化',
        '锁定结果会显示受影响手牌数和策略转变方向',
      ],
    },
    {
      id: 'icm', icon: DollarSign, title: t('nav.icm'), shortcut: '⌘8',
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Malmuth-Harville 算法精确计算锦标赛 ICM 权益。显示每位玩家的筹码百分比、ICM 美元价值、线性价值、ICM 税和泡沫系数。',
      tips: [
        '默认 4 人 SNG 场景，可添加/删除玩家',
        '调整筹码量实时更新 ICM 价值',
        '泡沫系数 >1 表示输筹码的代价大于赢筹码的收益',
        '短码通常有更高的泡沫系数，大码 ICM 税为负',
      ],
    },
    {
      id: 'turnriver', icon: ArrowRight, title: t('nav.turnRiver'), shortcut: '⌘9',
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: '分析转牌和河牌对策略的影响。检测危险牌（完成听牌）、空白牌（无影响）和超张。给出 double barrel 频率、下注尺度偏好和具体手牌类型建议。',
      tips: [
        '设置翻牌和转牌后点击分析',
        '转牌结果会显示是否为危险牌/空白牌/超张',
        '河牌结果包含价值下注/诈唬/过牌频率',
        '结果下方有按手牌类型分类的具体建议',
      ],
    },
    {
      id: 'multiway', icon: Users, title: t('nav.multiway'), shortcut: '⌘0',
      accent: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      description: '3-6 人底池启发式分析。对比单挑策略，给出多人场景下 c-bet 频率调整、价值范围变化和各类手牌的调整建议。',
      tips: [
        '选择玩家数（3-6人）和进攻方位置',
        '结果包含重要提示（启发式分析，非精确解）',
        '对比表显示每类手牌在单挑 vs 多人下的策略差异',
        '多人底池通常需要降低 c-bet 频率、收紧价值范围',
      ],
    },
    {
      id: 'settings', icon: Settings, title: t('nav.settings'), shortcut: '',
      accent: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20',
      description: '语言切换（中文/English）、主题切换、键盘快捷键配置、数据管理（初始化翻前/翻后数据、查看数据库统计）。',
      tips: [
        '首次使用需在设置中点击"初始化翻前数据"和"初始化翻后数据"',
        '所有 ⌘1-⌘0 快捷键均可在此查看',
        '深色/浅色主题一键切换',
      ],
    },
  ]

  const keyboardShortcuts = [
    { keys: '⌘1 – ⌘0', desc: '切换各功能模块' },
    { keys: '⌘B', desc: '收起/展开侧边栏' },
    { keys: '⌘,', desc: '打开设置' },
    { keys: '⌘Q', desc: '退出应用' },
  ]

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BookOpen size={18} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">使用说明</h2>
            <p className="text-xs text-neutral-500">14 个模块的完整指南 · 点击模块查看详细提示</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-8">

          {/* Welcome */}
          <div className="bg-gradient-to-br from-blue-500/[0.04] to-purple-500/[0.04] rounded-2xl p-6 border border-blue-500/15">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-amber-400" />
              <h3 className="text-sm font-bold text-neutral-100">快速上手</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-neutral-400">
              <div className="bg-[#090D14] rounded-xl p-3 border border-[#152233]">
                <div className="text-blue-400 font-semibold mb-1">1. 初始化数据</div>
                <p>设置 → 点击「初始化翻前数据」和「初始化翻后数据」</p>
              </div>
              <div className="bg-[#090D14] rounded-xl p-3 border border-[#152233]">
                <div className="text-blue-400 font-semibold mb-1">2. 探索范围</div>
                <p>⌘1 进入策略浏览器，切换位置和深度查看 GTO 范围</p>
              </div>
              <div className="bg-[#090D14] rounded-xl p-3 border border-[#152233]">
                <div className="text-blue-400 font-semibold mb-1">3. 开始训练</div>
                <p>⌘2 进入训练模式，选择配置后开始答题</p>
              </div>
            </div>
          </div>

          {/* Module list */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lightbulb size={14} />
              功能模块指南
            </h3>
            <div className="space-y-2">
              {modules.map((mod) => {
                const isActive = activeModule === mod.id
                const Icon = mod.icon
                return (
                  <div
                    key={mod.id}
                    className={cn(
                      'rounded-xl border transition-all overflow-hidden',
                      isActive ? mod.accent : 'border-[#152233] bg-[#090D14]',
                    )}
                  >
                    <button
                      onClick={() => setActiveModule(isActive ? null : mod.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <Icon size={17} className={mod.accent.split(' ')[0]} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-200">{mod.title}</span>
                          {mod.shortcut && (
                            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[#0F141C] text-neutral-500 font-mono border border-[#1C2A3D]">
                              {mod.shortcut}
                            </kbd>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{mod.description}</p>
                      </div>
                      <ChevronRight
                        size={14}
                        className={cn(
                          'text-neutral-600 transition-transform duration-200',
                          isActive && 'rotate-90',
                        )}
                      />
                    </button>

                    {isActive && (
                      <div className="px-4 pb-4 pt-1 border-t border-inherit animate-fade-in">
                        <p className="text-xs text-neutral-400 leading-relaxed mb-3">{mod.description}</p>
                        <div className="space-y-1.5">
                          {mod.tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className="text-neutral-600 mt-0.5">•</span>
                              <span className="text-neutral-300">{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Keyboard size={14} />
              键盘快捷键
            </h3>
            <div className="bg-[#090D14] rounded-xl border border-[#152233] divide-y divide-[#152233] overflow-hidden">
              {keyboardShortcuts.map((sc, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-neutral-400">{sc.desc}</span>
                  <kbd className="px-2.5 py-1 text-xs bg-[#0F141C] text-neutral-300 rounded-lg font-mono font-medium border border-[#1C2A3D]">
                    {sc.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack footer */}
          <div className="text-center text-[10px] text-neutral-600 pb-8">
            Electron · React 19 · TypeScript · D3.js · SQLite · CFR Solver &nbsp;|&nbsp; v0.1.0
          </div>
        </div>
      </div>
    </div>
  )
}
