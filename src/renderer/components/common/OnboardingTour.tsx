import { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { ChevronRight, X, Target, Globe, Play, Swords, BookOpen } from 'lucide-react'

const STEPS = [
  {
    icon: Globe, title: 'Strategy Explorer',
    desc: '13×13 GTO 范围矩阵。切换位置和深度查看翻前策略。点击手牌查看详细 EV 和胜率。',
    accent: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Target, title: 'Training Mode',
    desc: 'GTO 决策训练。选择街段和难度，答题后即时反馈 EV 损失和 GTO 正确行动。',
    accent: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Play, title: '实战模拟',
    desc: '对抗 GTO AI 的真实牌桌体验。键盘快捷键：F=Fold C=Check Enter=Call A=All-in 1-3=下注尺度。',
    accent: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Swords, title: 'Range Battle',
    desc: '两个范围对战，查看胜率分布、per-combo 权益热力图和推荐策略。',
    accent: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20',
  },
  {
    icon: BookOpen, title: 'Hand History',
    desc: '导入 PokerStars / GG 手牌历史 → 批量 GTO 分析 → 导出 PDF 报告。⌘5 快捷键。',
    accent: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
]

export function OnboardingTour() {
  const [step, setStep] = useState(-1)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('onboarding_done') === 'true' } catch { return false }
  })

  useEffect(() => {
    if (!dismissed) setStep(0)
  }, [dismissed])

  if (dismissed || step < 0) return null

  const s = STEPS[step]
  if (!s) return null
  const Icon = s.icon

  const finish = () => {
    localStorage.setItem('onboarding_done', 'true')
    setDismissed(true)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-center justify-center animate-fade-in">
      <div className={cn('max-w-sm w-full mx-4 rounded-2xl p-6 shadow-2xl border animate-scale-in relative', s.bg)}>
        <button onClick={finish} className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-300">
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.bg)}>
            <Icon size={22} className={s.accent} />
          </div>
          <div>
            <div className="text-[10px] text-neutral-500">{step + 1} / {STEPS.length}</div>
            <h3 className={cn('text-lg font-bold', s.accent)}>{s.title}</h3>
          </div>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed mb-6">{s.desc}</p>

        <div className="flex items-center justify-between">
          <button onClick={finish} className="text-xs text-neutral-500 hover:text-neutral-300">Skip all</button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-xs font-medium bg-white/[0.04] text-neutral-300 rounded-lg hover:bg-white/[0.08] transition-colors">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center gap-1">
                Next <ChevronRight size={12} />
              </button>
            ) : (
              <button onClick={finish}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all">
                Got it! 🎉
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
