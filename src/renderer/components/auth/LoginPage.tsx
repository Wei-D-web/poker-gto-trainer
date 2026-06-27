/**
 * Login / Sign Up Page — Poker-themed, neon-glow redesign
 *
 * Three auth methods:
 *   1. Magic Link (default) — passwordless, email → link → logged in
 *   2. Social OAuth — Google, Discord
 *   3. Email/Password — fallback for traditional users
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'
import {
  Target, Mail, Lock, ArrowRight, AlertCircle, Check,
  Sparkles, type LucideIcon,
} from 'lucide-react'

type AuthTab = 'magic-link' | 'social' | 'password'

/* ── Floating poker chip component ── */
function FloatingChip({ color, delay, x, y, size = 48 }: {
  color: string; delay: number; x: string; y: string; size?: number
}) {
  return (
    <div
      className="absolute pointer-events-none animate-float"
      style={{
        left: x, top: y, animationDelay: `${delay}s`,
        animationDuration: `${6 + delay * 0.5}s`,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" fill={color} opacity="0.12" />
        <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="1" opacity="0.25" />
        <circle cx="24" cy="24" r="14" stroke={color} strokeWidth="0.5" strokeDasharray="4 3" opacity="0.2" />
        <circle cx="24" cy="24" r="7" stroke={color} strokeWidth="1" opacity="0.3" />
      </svg>
    </div>
  )
}

/* ── Floating playing card component ── */
function FloatingCard({ suit, color, delay, x, y, rotation = 0 }: {
  suit: string; color: string; delay: number; x: string; y: string; rotation?: number
}) {
  return (
    <div
      className="absolute pointer-events-none animate-float"
      style={{
        left: x, top: y, animationDelay: `${delay}s`,
        animationDuration: `${7 + delay * 0.3}s`, transform: `rotate(${rotation}deg)`,
      }}
    >
      <div
        className="w-10 h-14 rounded-lg border flex items-center justify-center backdrop-blur-sm"
        style={{ borderColor: `${color}20`, background: `${color}08` }}
      >
        <span className="text-xl font-bold" style={{ color: `${color}60` }}>{suit}</span>
      </div>
    </div>
  )
}

/* ── Card stack 3D logo ── */
function CardStackLogo() {
  const [flipped, setFlipped] = useState(false)
  return (
    <div
      className="relative mx-auto mb-6 w-24 h-28 cursor-pointer select-none"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      {/* Glow aura */}
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-emerald-500/30 via-blue-500/20 to-purple-600/30 blur-2xl animate-pulse" />

      {/* Card 1 — back layer */}
      <div
        className="absolute top-1 left-0 w-24 h-28 rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 to-blue-600/10 backdrop-blur-sm transition-all duration-500"
        style={{ transform: flipped ? 'translateY(-2px) rotate(-6deg) scale(1.05)' : 'rotate(-6deg)' }}
      >
        <div className="absolute inset-2 rounded-lg border border-white/[0.04]" />
        <div className="absolute inset-3 rounded-md border border-white/[0.03]" />
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-px p-3 opacity-[0.06]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-sm" style={{ background: i % 3 === 0 ? '#fff' : 'transparent' }} />
          ))}
        </div>
      </div>

      {/* Card 2 — middle layer */}
      <div
        className="absolute top-0.5 left-1 w-24 h-28 rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/10 to-purple-600/10 backdrop-blur-sm transition-all duration-500"
        style={{ transform: flipped ? 'translateY(-4px) rotate(-3deg) scale(1.08)' : 'rotate(-3deg)' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black text-blue-300/30">♥</span>
        </div>
      </div>

      {/* Card 3 — front layer */}
      <div
        className="absolute top-0 left-2 w-24 h-28 rounded-xl border-2 border-emerald-500/20 bg-gradient-to-br from-[#0A0E17] via-[#0F141F] to-[#0A0E17] shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_60px_rgba(16,185,129,0.06)] backdrop-blur-sm transition-all duration-500 flex items-center justify-center"
        style={{ transform: flipped ? 'translateY(-6px) rotate(0deg) scale(1.1)' : 'rotate(0deg)' }}
      >
        {/* Card inner pattern — diamond checker */}
        <div className="absolute inset-2 rounded-lg border border-white/[0.04]" />
        <div className="absolute inset-3 rounded-md border border-white/[0.03]" />
        <div className="absolute inset-0 overflow-hidden rounded-xl opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(16,185,129,0.8)_1px,transparent_1px)] bg-[length:10px_10px]" />
        </div>
        {/* Center suit */}
        <span className="relative z-10 text-3xl">
          <span className="text-emerald-400/90">♠</span>
        </span>
      </div>

      {/* Under-glow line */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent blur-sm" />
    </div>
  )
}

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
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (mounted) inputRef.current?.focus() }, [mounted, tab])

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
    <div className="min-h-screen bg-[#05080C] flex items-center justify-center p-6 relative overflow-hidden selection:bg-emerald-500/20">
      {/* ════════════════════════════════════════════════════════
          BACKGROUND LAYERS
          ════════════════════════════════════════════════════════ */}

      {/* Felt table texture — micro pattern */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #0a5 0.3px, transparent 0.3px)`,
          backgroundSize: '6px 6px',
        }}
      />

      {/* Felt grain — larger noise */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at 30% 20%, #10b98115 0%, transparent 50%),
                           radial-gradient(ellipse at 70% 80%, #3b82f610 0%, transparent 50%),
                           radial-gradient(ellipse at 50% 50%, #8b5cf608 0%, transparent 60%)`,
        }}
      />

      {/* Dramatic glow orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-[130px] animate-pulse pointer-events-none" style={{ animationDelay: '1.2s' }} />
      <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[140px] animate-pulse pointer-events-none" style={{ animationDelay: '2.4s' }} />
      <div className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] bg-amber-500/[0.02] rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '3.2s' }} />

      {/* ════════════════════════════════════════════════════════
          FLOATING ELEMENTS
          ════════════════════════════════════════════════════════ */}

      {/* Floating chips */}
      <FloatingChip color="#10B981" delay={0} x="8%" y="15%" size={56} />
      <FloatingChip color="#3B82F6" delay={1.5} x="85%" y="20%" size={44} />
      <FloatingChip color="#8B5CF6" delay={3} x="12%" y="75%" size={52} />
      <FloatingChip color="#F59E0B" delay={2} x="88%" y="70%" size={38} />
      <FloatingChip color="#10B981" delay={4} x="5%" y="45%" size={32} />
      <FloatingChip color="#3B82F6" delay={2.5} x="92%" y="48%" size={48} />

      {/* Floating cards */}
      <FloatingCard suit="♠" color="#10B981" delay={0.5} x="10%" y="25%" rotation={-12} />
      <FloatingCard suit="♥" color="#EF4444" delay={2} x="82%" y="30%" rotation={8} />
      <FloatingCard suit="♦" color="#3B82F6" delay={3.5} x="15%" y="62%" rotation={-5} />
      <FloatingCard suit="♣" color="#8B5CF6" delay={1} x="78%" y="65%" rotation={15} />

      {/* Large faint suit watermarks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { suit: '♠', x: '5%', y: '10%', size: 200, opacity: 0.015, rotate: -15 },
          { suit: '♥', x: '88%', y: '80%', size: 160, opacity: 0.012, rotate: 20 },
          { suit: '♣', x: '80%', y: '12%', size: 140, opacity: 0.01, rotate: -8 },
          { suit: '♦', x: '8%', y: '78%', size: 180, opacity: 0.013, rotate: 10 },
        ].map(({ suit, x, y, size, opacity, rotate }) => (
          <span
            key={suit + x}
            className="absolute font-black animate-float"
            style={{
              left: x, top: y, fontSize: `${size}px`,
              opacity, transform: `rotate(${rotate}deg)`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: '8s',
              color: '#10B981',
            }}
          >
            {suit}
          </span>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT
          ════════════════════════════════════════════════════════ */}

      <div
        className={cn(
          'w-full max-w-md relative z-10 transition-all duration-700',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )}
      >
        {/* ── Header / Logo Section ── */}
        <div className="text-center mb-10">
          <CardStackLogo />

          <h1 className="text-4xl font-black tracking-tight leading-none mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-blue-200 to-purple-200">
              PokerGTO
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 ml-3">
              Trainer
            </span>
          </h1>

          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px flex-1 max-w-8 bg-gradient-to-r from-transparent to-emerald-400/20" />
            <p className="text-xs text-neutral-500 tracking-[0.2em] uppercase font-medium">
              Your Training Table
            </p>
            <div className="h-px flex-1 max-w-8 bg-gradient-to-l from-transparent to-emerald-400/20" />
          </div>

          {/* Tiny chip line under header */}
          <div className="flex items-center justify-center gap-2 mt-4 opacity-25">
            {[10, 25, 50, 100, 500].map(v => (
              <div key={v} className="w-5 h-5 rounded-full border border-emerald-400/40 flex items-center justify-center bg-[#0A0E17]">
                <span className="text-[6px] font-bold text-emerald-400/50">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Auth Card ── */}
        <div className="relative rounded-3xl p-8 shadow-[0_8px_48px_rgba(0,0,0,0.6),0_0_80px_rgba(16,185,129,0.03),inset_0_1px_0_rgba(255,255,255,0.02)] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(10,14,23,0.95), rgba(15,20,31,0.92))' }}
        >
          {/* Card top accent line with chips */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

          {/* Card corner decorations */}
          <div className="absolute top-3 left-4 text-emerald-400/[0.06] text-4xl font-black select-none pointer-events-none">♠</div>
          <div className="absolute bottom-3 right-4 text-blue-400/[0.06] text-4xl font-black select-none pointer-events-none rotate-180">♠</div>
          <div className="absolute top-3 right-4 text-purple-400/[0.04] text-3xl font-black select-none pointer-events-none rotate-90">♦</div>
          <div className="absolute bottom-3 left-4 text-amber-400/[0.04] text-3xl font-black select-none pointer-events-none -rotate-90">♦</div>

          {/* Subtle inner pattern */}
          <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.4) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />

          <div className="relative z-10 space-y-6">
            {/* ── Tab Switcher ── */}
            <div className="flex p-1 rounded-2xl gap-1"
              style={{ background: 'rgba(15,20,28,0.8)' }}
            >
              {([
                { id: 'magic-link' as const, label: '免密登录', icon: Sparkles, desc: '魔法链接' },
                { id: 'social' as const, label: '社交登录', icon: Target, desc: 'Google/Discord' },
                { id: 'password' as const, label: '密码登录', icon: Lock, desc: '邮箱+密码' },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setError('') }}
                  className={cn(
                    'flex-1 py-3 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center gap-1 text-xs',
                    tab === t.id
                      ? 'bg-gradient-to-b from-emerald-500/[0.12] to-blue-500/[0.08] text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.06),inset_0_1px_0_rgba(255,255,255,0.02)] border border-emerald-500/10'
                      : 'text-neutral-500 hover:text-neutral-400 hover:bg-white/[0.02] border border-transparent',
                  )}
                >
                  <t.icon size={14} className={cn(tab === t.id && 'text-emerald-400')} />
                  <span className="font-semibold tracking-wide">{t.label}</span>
                </button>
              ))}
            </div>

            {/* ── Magic Link Tab ── */}
            {tab === 'magic-link' && (
              <form onSubmit={handleMagicLink} className="space-y-5">
                {magicLinkSent ? (
                  <div className="text-center py-8 space-y-5 animate-scale-in">
                    {/* Success animation — chip stack */}
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_32px_rgba(16,185,129,0.1)]" />
                      <div className="absolute inset-2 rounded-full bg-emerald-500/[0.06] border border-emerald-500/10" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check size={32} className="text-emerald-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-emerald-200">✨ 魔法链接已发送！</h3>
                      <p className="text-sm text-neutral-400 leading-relaxed max-w-xs mx-auto">
                        已向 <b className="text-emerald-300">{email}</b> 发送一封魔法链接。
                        <br />点击邮件中的链接即可立即登录，无需密码。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMagicLinkSent(false)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline-offset-4 hover:underline transition-all"
                    >
                      重新发送
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                        <Mail size={12} className="text-emerald-500/60" /> Email 地址
                      </label>
                      <input
                        ref={inputRef}
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full bg-[#0A0F17] border border-[#1C2A3D] rounded-2xl px-4 py-3.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/40 focus:shadow-[0_0_20px_rgba(16,185,129,0.05)] placeholder:text-neutral-600 transition-all duration-300"
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2.5 text-xs text-red-300 bg-red-500/5 border border-red-500/15 rounded-2xl px-4 py-3">
                        <AlertCircle size={13} className="text-red-400 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-blue-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-blue-500 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-[0_2px_24px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_36px_rgba(16,185,129,0.25)] active:scale-[0.985] tracking-wide"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2.5">
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          发送中...
                        </span>
                      ) : (
                        <>
                          发送魔法链接
                          <Sparkles size={15} />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-neutral-600 text-center leading-relaxed">
                      🪄 无需密码 · 点击邮件中的链接即可安全登录
                    </p>
                  </>
                )}
              </form>
            )}

            {/* ── Social OAuth Tab ── */}
            {tab === 'social' && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-500 text-center">
                  选择一种方式快速登录
                </p>

                <div className="space-y-3">
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
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 text-xs text-red-300 bg-red-500/5 border border-red-500/15 rounded-2xl px-4 py-3">
                    <AlertCircle size={13} className="text-red-400 shrink-0" /> {error}
                  </div>
                )}

                <p className="text-[11px] text-neutral-600 text-center leading-relaxed">
                  首次登录将自动创建账户 · 无需密码
                </p>
              </div>
            )}

            {/* ── Password Tab ── */}
            {tab === 'password' && (
              <div className="space-y-5">
                {/* Login / Signup toggle */}
                <div className="flex p-0.5 rounded-xl gap-0.5" style={{ background: 'rgba(10,15,23,0.8)' }}>
                  {(['login', 'signup'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setError('') }}
                      className={cn(
                        'flex-1 py-2.5 text-xs rounded-[10px] font-bold transition-all duration-300 tracking-wide',
                        mode === m
                          ? 'bg-gradient-to-r from-emerald-500/15 to-blue-500/15 text-emerald-200 border border-emerald-500/10'
                          : 'text-neutral-500 hover:text-neutral-400 border border-transparent',
                      )}
                    >
                      {m === 'login' ? '登 录' : '注 册'}
                    </button>
                  ))}
                </div>

                <form onSubmit={handlePassword} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                      <Mail size={12} className="text-emerald-500/60" /> Email 地址
                    </label>
                    <input
                      ref={inputRef}
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full bg-[#0A0F17] border border-[#1C2A3D] rounded-2xl px-4 py-3.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/40 focus:shadow-[0_0_20px_rgba(16,185,129,0.05)] placeholder:text-neutral-600 transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                      <Lock size={12} className="text-emerald-500/60" /> 密码
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-[#0A0F17] border border-[#1C2A3D] rounded-2xl px-4 py-3.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/40 focus:shadow-[0_0_20px_rgba(16,185,129,0.05)] placeholder:text-neutral-600 transition-all duration-300"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2.5 text-xs text-red-300 bg-red-500/5 border border-red-500/15 rounded-2xl px-4 py-3">
                      <AlertCircle size={13} className="text-red-400 shrink-0" /> {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-blue-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-blue-500 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-[0_2px_24px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_36px_rgba(16,185,129,0.25)] active:scale-[0.985] tracking-wide"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        {mode === 'login' ? '登录中...' : '注册中...'}
                      </span>
                    ) : (
                      <>
                        {mode === 'login' ? '安全登录' : '创建账户'}
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-[11px] text-neutral-600 tracking-wide">
            {tab === 'password' && mode === 'signup' && '注册即同意服务条款 · '}
            <span className="text-emerald-400/40 font-medium">{tab === 'password' && mode === 'signup' ? '7 天' : '注册即享 7 天'}</span>{' '}
            <span className="text-neutral-500">{tab === 'password' && mode === 'signup' ? '免费试用专业版' : '免费试用 · 无需信用卡'}</span>
          </p>
          {/* Decorative chip line */}
          <div className="flex items-center justify-center gap-1.5 opacity-20">
            {['♠', '♥', '♦', '♣'].map((s, i) => (
              <span key={i} className="text-[8px]" style={{ color: i % 2 === 0 ? '#10B981' : '#3B82F6' }}>{s}</span>
            ))}
          </div>
        </div>
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
        'w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.985] shadow-sm',
        color,
      )}
    >
      {loading ? (
        <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        <span className="text-lg font-black tracking-tight">{icon}</span>
      )}
      <span className="font-semibold tracking-wide">Continue with {provider}</span>
    </button>
  )
}
