/**
 * WebWelcomeOverlay — shown on first visit to the web/Kimi version.
 *
 * A lightweight brand welcome card that builds trust in 3 seconds:
 * logo + tagline + trust numbers + single CTA.
 *
 * Persists dismissal via localStorage so it only shows once.
 * Only renders on web (not Electron desktop).
 */
import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Zap, Globe, Shield, Star } from 'lucide-react'

const STORAGE_KEY = 'pokergto_web_welcome_dismissed'

const TRUST_SIGNALS = [
  { icon: Zap, label: '26 个模块', color: 'text-emerald-400' },
  { icon: Star, label: '4.8 分好评', color: 'text-amber-400' },
  { icon: Globe, label: '中 / EN', color: 'text-blue-400' },
  { icon: Shield, label: '100% 本地', color: 'text-purple-400' },
]

export function WebWelcomeOverlay() {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Small delay for smoother entrance animation
    const timer = setTimeout(() => {
      try {
        if (localStorage.getItem(STORAGE_KEY) !== '1') {
          setVisible(true)
        }
      } catch {
        setVisible(true)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
      setVisible(false)
    }, 350)
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[500] flex items-center justify-center p-6 transition-all duration-350 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: exiting
          ? 'rgba(5, 8, 12, 0)'
          : 'rgba(5, 8, 12, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), background 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={dismiss}
    >
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(16, 185, 129, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 50% 60%, rgba(59, 130, 246, 0.04) 0%, transparent 50%)',
        }}
      />

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-sm animate-scale-in ${
          exiting ? 'animate-scale-out' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-2xl p-8 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(15, 20, 31, 0.96) 0%, rgba(9, 13, 20, 0.98) 100%)',
            border: '1px solid rgba(21, 34, 51, 0.6)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 80px rgba(16, 185, 129, 0.06), 0 0 120px rgba(59, 130, 246, 0.04)',
          }}
        >
          {/* Top gradient accent line */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4), transparent)',
            }}
          />

          {/* Logo */}
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12))',
              border: '1px solid rgba(16, 185, 129, 0.15)',
            }}
          >
            <Sparkles size={28} className="text-emerald-400" />
          </div>

          {/* Title */}
          <h1
            className="text-2xl font-black mb-2 tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #60A5FA, #A78BFA, #34D399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            PokerGTO Trainer
          </h1>

          {/* Tagline */}
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            🤖 AI 实时对战 · 26 个专业模块 · CFR 求解器
            <br />
            <span className="text-neutral-500 text-xs">
              对标 GTO Wizard，功能覆盖 90%，价格仅 1/3
            </span>
          </p>

          {/* Trust signals */}
          <div className="grid grid-cols-4 gap-2 mb-7">
            {TRUST_SIGNALS.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon size={16} className={color} />
                <span className="text-[10px] text-neutral-500 font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={dismiss}
            className="w-full px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 4px 24px rgba(16, 185, 129, 0.3)',
            }}
          >
            🎮 开始训练 — 免费
          </button>

          {/* Secondary link */}
          <p className="mt-4 text-xs text-neutral-600">
            也可以{' '}
            <a
              href="https://wei-d-web.github.io/poker-gto-trainer/"
              className="text-neutral-500 hover:text-neutral-400 underline underline-offset-2 transition-colors"
            >
              查看功能详情和定价
            </a>
          </p>
        </div>
      </div>

      {/* Inline keyframe for exit animation */}
      <style>{`
        @keyframes scale-out {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.95); }
        }
        .animate-scale-out {
          animation: scale-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}

/**
 * Check if the web welcome overlay should show.
 */
export function shouldShowWebWelcome(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}
