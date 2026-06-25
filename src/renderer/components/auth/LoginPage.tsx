/**
 * Login / Sign Up Page — Poker-themed, neon-glow redesign
 *
 * Three auth methods:
 *   1. Magic Link (default) — passwordless, email → link → logged in
 *   2. Social OAuth — Google, Discord
 *   3. Email/Password — fallback for traditional users
 */
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'
import {
  Target, Mail, Lock, ArrowRight, AlertCircle, Check,
  Sparkles, type LucideIcon,
} from 'lucide-react'

type AuthTab = 'magic-link' | 'social' | 'password'

export function LoginPage() {
  const { signIn, signUp, signInWithMagicLink, signInWithOAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [tab, setTab] = useState<AuthTab>('magic-link')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)

  // ── Magic Link ──
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signInWithMagicLink(email)
    if (result.error) {
      setError(result.error)
    } else {
      setMagicLinkSent(true)
    }
    setLoading(false)
  }

  // ── OAuth ──
  const handleOAuth = async (provider: 'google' | 'discord') => {
    setError('')
    setOauthLoading(provider)
    const result = await signInWithOAuth(provider)
    if (result.error) setError(result.error)
    setOauthLoading(null)
  }

  // ── Password ──
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = mode === 'login' ? await signIn(email, password) : await signUp(email, password)
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#05080C] flex items-center justify-center p-6 relative overflow-hidden">
      {/* ── Background Effects ── */}
      {/* Felt table texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.08)_0%,transparent_60%),radial-gradient(ellipse_at_80%_80%,rgba(59,130,246,0.06)_0%,transparent_50%),radial-gradient(ellipse_at_20%_80%,rgba(139,92,246,0.06)_0%,transparent_50%)]" />

      {/* Animated glow orbs */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '3s' }} />

      {/* ── Floating card symbols ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
        {['♠', '♥', '♣', '♦'].map((suit, i) => (
          <span
            key={suit}
            className="absolute text-[120px] font-black animate-float"
            style={{
              left: `${15 + i * 25}%`,
              top: `${20 + (i % 2) * 50}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: '6s',
            }}
          >
            {suit}
          </span>
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* ── Logo Section ── */}
        <div className="text-center mb-10">
          {/* Card stack icon with neon glow */}
          <div className="relative mx-auto mb-5 w-20 h-20">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 blur-xl opacity-60 animate-pulse" />
            {/* Card icon */}
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-blue-600/20 to-purple-600/20 border border-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
              {/* Subdued card back pattern */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-10">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="absolute w-full h-[1px] bg-white top-[25%] left-0" style={{ top: `${20 + i * 20}%` }} />
                ))}
              </div>
              <span className="text-2xl relative z-10">
                <span className="text-emerald-400">♠</span><span className="text-blue-400">♥</span>
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-blue-300 to-purple-300">
            PokerGTO Trainer
          </h1>
          <p className="text-sm text-neutral-400 mt-2 tracking-wide">
            🃏 登录你的训练桌
          </p>
        </div>

        {/* ── Auth Card ── */}
        <div className="bg-[#0A0E17]/90 backdrop-blur-xl border border-emerald-500/10 rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(16,185,129,0.04)] relative overflow-hidden">
          {/* Card top accent line */}
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

          {/* Subtle inner card pattern */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(16,185,129,0.3)_1px,transparent_1px)] bg-[length:24px_24px]" />
          </div>

          {/* Tab Switcher */}
          <div className="flex mb-6 bg-[#0F141C]/80 rounded-[14px] p-1 ring-1 ring-white/[0.04] relative z-10">
            {([
              { id: 'magic-link' as const, label: '免密登录', icon: Sparkles },
              { id: 'social' as const, label: '社交登录', icon: Target },
              { id: 'password' as const, label: '密码登录', icon: Lock },
            ]).map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError('') }}
                className={cn('flex-1 py-2 text-xs rounded-[10px] font-semibold transition-all flex items-center justify-center gap-1.5',
                  tab === t.id
                    ? 'bg-gradient-to-r from-emerald-500/15 to-blue-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                    : 'text-neutral-500 hover:text-neutral-300')}>
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Magic Link Tab ── */}
          {tab === 'magic-link' && (
            <form onSubmit={handleMagicLink} className="space-y-4 relative z-10">
              {magicLinkSent ? (
                <div className="text-center py-6 space-y-4 animate-scale-in">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                    <Check size={28} className="text-emerald-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-neutral-200">✨ 魔法链接已发送！</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      我们向 <b className="text-emerald-300">{email}</b> 发送了一封魔法链接邮件。
                      <br />点击链接即可立即登录，无需密码。
                    </p>
                  </div>
                  <button type="button" onClick={() => setMagicLinkSent(false)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline transition-all">
                    重新发送
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Mail size={11} /> Email
                    </label>
                    <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="you@example.com"
                      className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-xl px-3.5 py-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 focus:shadow-[0_0_12px_rgba(16,185,129,0.06)] placeholder:text-neutral-600 transition-all" />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-xl px-3 py-2.5">
                      <AlertCircle size={12} /> {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_2px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.3)] active:scale-[0.98]">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        发送中...
                      </span>
                    ) : (
                      <>
                        发送魔法链接
                        <Sparkles size={15} />
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-neutral-600 text-center">
                    🪄 无需密码 · 点击邮件中的链接即可登录
                  </p>
                </>
              )}
            </form>
          )}

          {/* ── Social OAuth Tab ── */}
          {tab === 'social' && (
            <div className="space-y-3 relative z-10">
              <p className="text-[11px] text-neutral-500 text-center mb-4">
                选择一种方式快速登录
              </p>

              <OAuthButton
                provider="Google"
                icon="G"
                color="bg-white hover:bg-neutral-100 text-neutral-900"
                loading={oauthLoading === 'google'}
                onClick={() => handleOAuth('google')}
              />

              <OAuthButton
                provider="Discord"
                icon="D"
                color="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                loading={oauthLoading === 'discord'}
                onClick={() => handleOAuth('discord')}
              />

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-xl px-3 py-2.5">
                  <AlertCircle size={12} /> {error}
                </div>
              )}

              <p className="text-[10px] text-neutral-600 text-center pt-2">
                首次登录将自动创建账户 · 无需密码
              </p>
            </div>
          )}

          {/* ── Password Tab ── */}
          {tab === 'password' && (
            <div className="relative z-10">
              <div className="flex mb-4 bg-[#0A0F17]/80 rounded-[10px] p-0.5">
                {(['login', 'signup'] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError('') }}
                    className={cn('flex-1 py-1.5 text-xs rounded-[8px] font-semibold transition-all',
                      mode === m
                        ? 'bg-gradient-to-r from-emerald-500/12 to-blue-500/12 text-emerald-300'
                        : 'text-neutral-500 hover:text-neutral-300')}>
                    {m === 'login' ? '登录' : '注册'}
                  </button>
                ))}
              </div>

              <form onSubmit={handlePassword} className="space-y-4">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail size={11} /> Email
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-xl px-3.5 py-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 focus:shadow-[0_0_12px_rgba(16,185,129,0.06)] placeholder:text-neutral-600 transition-all" />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Lock size={11} /> Password
                  </label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-xl px-3.5 py-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 focus:shadow-[0_0_12px_rgba(16,185,129,0.06)] placeholder:text-neutral-600 transition-all" />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-xl px-3 py-2.5">
                    <AlertCircle size={12} /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_2px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.3)] active:scale-[0.98]">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      {mode === 'login' ? '登录中...' : '注册中...'}
                    </span>
                  ) : (
                    <>
                      {mode === 'login' ? '登录' : '注册'}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-neutral-600 mt-6">
          {tab === 'password' && mode === 'signup' && '注册即同意服务条款 · '}
          <span className="text-emerald-400/50">7 天</span> 免费试用专业版
        </p>
      </div>
    </div>
  )
}

/**
 * OAuth Provider Button
 */
function OAuthButton({
  provider, icon, color, loading, onClick,
}: {
  provider: string
  icon: string
  color: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]',
        color,
      )}
    >
      {loading ? (
        <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        <span className="text-lg font-black">{icon}</span>
      )}
      Continue with {provider}
    </button>
  )
}
