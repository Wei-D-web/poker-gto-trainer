/**
 * WelcomeFlow — shown on first desktop app launch.
 * 4-step onboarding: welcome → skill level → game type → starting point.
 *
 * Persists completion via localStorage so it only shows once.
 * Designed for Electron desktop; skips silently on web.
 */
import { useState } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useScenarioStore } from '../../stores/scenarioStore'
import { cn } from '../../lib/utils'
import { Sparkles, Target, Search, Play, ArrowRight, Check } from 'lucide-react'

const WELCOME_KEY = 'pokergto_welcome_completed'

type Step = 'welcome' | 'skill' | 'game-type' | 'start'
type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export function WelcomeFlow() {
  const [step, setStep] = useState<Step>('welcome')
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null)
  const [gameType, setGameType] = useState<'cash' | 'mtt' | 'both'>('cash')
  const [startPoint, setStartPoint] = useState<string>('explore')

  const setActiveRoute = useUIStore((s) => s.setActiveRoute)
  const setScenarioGameType = useScenarioStore((s) => s.setGameType)

  const handleComplete = (route: string) => {
    // Persist skill level for training personalization
    if (skillLevel) {
      localStorage.setItem('pokergto_skill_level', skillLevel)
    }

    // Persist game type preference
    if (gameType === 'cash' || gameType === 'both') {
      setScenarioGameType('cash')
    } else {
      setScenarioGameType('mtt')
    }

    // Mark welcome as done
    localStorage.setItem(WELCOME_KEY, '1')

    // Navigate to chosen starting point
    setActiveRoute(route)
  }

  const handleSkip = () => {
    localStorage.setItem(WELCOME_KEY, '1')
    setActiveRoute('explore')
  }

  return (
    <div className="fixed inset-0 z-[400] bg-[#05080C] flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(16,185,129,0.06)_0%,transparent_60%)]" />

      <div className="w-full max-w-md relative z-10">
        {/* ── Step indicator ── */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {(['welcome', 'skill', 'game-type', 'start'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step === s
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : ['welcome', 'skill', 'game-type', 'start'].indexOf(step) > i
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                      : 'bg-white/[0.03] border border-white/[0.06] text-neutral-600',
                )}
              >
                {['welcome', 'skill', 'game-type', 'start'].indexOf(step) > i ? (
                  <Check size={14} />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className="w-6 h-px bg-white/[0.06]" />}
            </div>
          ))}
        </div>

        {/* ── Step Content ── */}
        <div className="animate-scale-in">
          {step === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/15 flex items-center justify-center">
                <Sparkles size={32} className="text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-white">欢迎使用 PokerGTO Trainer!</h1>
                <p className="text-sm text-neutral-400 leading-relaxed max-w-xs mx-auto">
                  专业的 GTO 扑克训练桌面应用 — 26 个模块覆盖翻前到河牌。
                  花 30 秒设置，帮你定制训练计划。
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep('skill')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm transition-all shadow-[0_4px_24px_rgba(16,185,129,0.2)]"
                >
                  开始快速上手
                  <ArrowRight size={14} className="inline ml-2" />
                </button>
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 rounded-xl border border-white/[0.08] text-neutral-500 hover:text-neutral-400 text-sm font-medium transition-colors"
                >
                  跳过
                </button>
              </div>
            </div>
          )}

          {step === 'skill' && (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">你的扑克水平？</h2>
                <p className="text-sm text-neutral-500">帮你匹配适合的训练难度</p>
              </div>

              <div className="grid gap-3">
                {[
                  { id: 'beginner' as const, label: '🟢 新手入门', desc: '刚接触 GTO 概念 · NL2-NL10 · 需要基础训练', tag: '基础范围 + 简单决策' },
                  { id: 'intermediate' as const, label: '🟡 中级玩家', desc: '理解 GTO 原理 · NL25-NL100 · 想系统提升', tag: '混合策略 + 翻后分析' },
                  { id: 'advanced' as const, label: '🔴 高级玩家', desc: '精通 GTO · NL200+ · 需要精细打磨', tag: '复杂节点 + 剥削调整' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSkillLevel(opt.id); setTimeout(() => setStep('game-type'), 200) }}
                    className={cn(
                      'flex flex-col gap-1 px-5 py-4 rounded-2xl text-left transition-all border',
                      skillLevel === opt.id
                        ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('font-semibold text-sm', skillLevel === opt.id ? 'text-emerald-300' : 'text-neutral-300')}>
                        {opt.label}
                      </span>
                      {skillLevel === opt.id && <Check size={16} className="text-emerald-400" />}
                    </div>
                    <span className="text-xs text-neutral-500">{opt.desc}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep('welcome')}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] text-neutral-500 hover:text-neutral-400 text-sm transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={() => setStep('game-type')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm transition-all"
                >
                  继续
                  <ArrowRight size={14} className="inline ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 'game-type' && (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">选择你的游戏类型</h2>
                <p className="text-sm text-neutral-500">可以随时在设置里修改</p>
              </div>

              <div className="grid gap-3">
                {[
                  { id: 'cash' as const, label: '德州扑克 Cash', desc: '现金局 · 100bb 标准深度', icon: '💵' },
                  { id: 'mtt' as const, label: '锦标赛 MTT', desc: '锦标赛 · ICM 策略', icon: '🏆' },
                  { id: 'both' as const, label: '两者都要', desc: '对比 Cash vs MTT 策略差异', icon: '🔄' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setGameType(opt.id)}
                    className={cn(
                      'flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all border',
                      gameType === opt.id
                        ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]',
                    )}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1">
                      <div className={cn('font-semibold text-sm', gameType === opt.id ? 'text-emerald-300' : 'text-neutral-300')}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-neutral-500">{opt.desc}</div>
                    </div>
                    {gameType === opt.id && <Check size={16} className="text-emerald-400" />}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep('skill')}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] text-neutral-500 hover:text-neutral-400 text-sm transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={() => setStep('start')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm transition-all"
                >
                  继续
                  <ArrowRight size={14} className="inline ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 'start' && (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">你想从哪里开始？</h2>
                <p className="text-sm text-neutral-500">
                  {skillLevel === 'beginner' && '建议从翻前图册开始，打好基础 🎯'}
                  {skillLevel === 'intermediate' && '建议从手牌分析开始，查漏补缺 🔍'}
                  {skillLevel === 'advanced' && '建议直接实战模拟，对抗 AI 🎮'}
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  { id: 'explore', label: '翻前范围训练', desc: '查看 GTO 翻前范围矩阵', icon: Target, color: 'text-blue-400', recommended: skillLevel === 'beginner' },
                  { id: 'analyzer', label: '手牌分析', desc: '分析你的手牌决策偏差', icon: Search, color: 'text-cyan-400', recommended: skillLevel === 'intermediate' },
                  { id: 'playground', label: '实战模拟', desc: '对抗 GTO AI，真实牌桌体验', icon: Play, color: 'text-emerald-400', recommended: skillLevel === 'advanced' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleComplete(opt.id)}
                    className={cn(
                      'flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all border',
                      startPoint === opt.id
                        ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]',
                      opt.recommended && 'ring-1 ring-emerald-500/20',
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center shrink-0">
                      <opt.icon size={20} className={opt.color} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-neutral-200">
                        {opt.label}
                        {opt.recommended && <span className="ml-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">推荐</span>}
                      </div>
                      <div className="text-xs text-neutral-500">{opt.desc}</div>
                    </div>
                    <ArrowRight size={14} className="text-neutral-600" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Check if welcome flow should show.
 */
export function shouldShowWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) !== '1'
  } catch {
    return true
  }
}
