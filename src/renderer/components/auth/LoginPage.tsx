/**
 * Login / Sign Up Page
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
    <div className="min-h-screen bg-[#05080C] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(59,130,246,0.3)]">
            <Target size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-neutral-100 tracking-tight">PokerGTO Trainer</h1>
          <p className="text-sm text-neutral-500 mt-2">专业 GTO 扑克训练平台</p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-6 shadow-xl">
          {/* Tab Switcher */}
          <div className="flex mb-6 bg-[#0F141C] rounded-lg p-0.5 ring-1 ring-white/[0.03]">
            {([
              { id: 'magic-link' as const, label: '免密登录', icon: Sparkles },
              { id: 'social' as const, label: '社交登录', icon: Target },
              { id: 'password' as const, label: '密码登录', icon: Lock },
            ]).map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError('') }}
                className={cn('flex-1 py-2 text-xs rounded-md font-semibold transition-all flex items-center justify-center gap-1.5',
                  tab === t.id ? 'bg-blue-500/12 text-blue-400' : 'text-neutral-500 hover:text-neutral-300')}>
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Magic Link Tab ── */}
          {tab === 'magic-link' && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              {magicLinkSent ? (
                <div className="text-center py-6 space-y-4 animate-scale-in">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/15">
                    <Check size={28} className="text-emerald-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-neutral-200">邮件已发送！</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      我们向 <b className="text-neutral-300">{email}</b> 发送了一封含有魔法链接的邮件。
                      <br />点击链接即可立即登录，无需密码。
                    </p>
                  </div>
                  <button type="button" onClick={() => setMagicLinkSent(false)}
                    className="text-xs text-blue-400 hover:underline">
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
                      className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-blue-500/50 placeholder:text-neutral-600" />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                      <AlertCircle size={12} /> {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_2px_16px_rgba(37,99,235,0.2)]">
                    {loading ? '发送中...' : '发送魔法链接'}
                    <Sparkles size={15} />
                  </button>

                  <p className="text-[10px] text-neutral-600 text-center">
                    无需密码 · 点击邮件中的链接即可登录
                  </p>
                </>
              )}
            </form>
          )}

          {/* ── Social OAuth Tab ── */}
          {tab === 'social' && (
            <div className="space-y-3">
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
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
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
            <>
              <div className="flex mb-4 bg-[#0A0F17] rounded-lg p-0.5">
                {(['login', 'signup'] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError('') }}
                    className={cn('flex-1 py-1.5 text-xs rounded-md font-semibold transition-all',
                      mode === m ? 'bg-blue-500/12 text-blue-400' : 'text-neutral-500 hover:text-neutral-300')}>
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
                    className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-blue-500/50 placeholder:text-neutral-600" />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Lock size={11} /> Password
                  </label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-blue-500/50 placeholder:text-neutral-600" />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                    <AlertCircle size={12} /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_2px_16px_rgba(37,99,235,0.2)]">
                  {loading ? 'Loading...' : mode === 'login' ? '登录' : '注册'}
                  <ArrowRight size={15} />
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-neutral-600 mt-6">
          {tab === 'password' && mode === 'signup' && '注册即同意服务条款 · '}
          7 天免费试用专业版
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
        'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50',
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
