/**
 * Supabase Auth + Subscription Context
 *
 * Supports:
 *   - Magic Link (passwordless)
 *   - Social OAuth (Google, Discord)
 *   - Email/Password (fallback)
 *   - Desktop: cached session via electron-store
 *   - Web: standard Supabase session management
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient, type User, type Session } from '@supabase/supabase-js'
import { validateLicenseKey } from '../../shared/utils/license'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'lifetime' | 'developer'

/** 试用天数 */
export const TRIAL_DAYS = 14

interface AuthState {
  user: User | null
  session: Session | null
  tier: SubscriptionTier
  loading: boolean
  /** 试用剩余天数: -1 = 不适用(已激活/开发者), 0 = 已过期, >0 = 剩余天数 */
  trialDaysLeft: number
  /** 是否在试用期内 */
  isTrialing: boolean
  /** 试用是否已过期 */
  isTrialExpired: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>
  signInWithOAuth: (provider: 'google' | 'discord') => Promise<{ error?: string }>
  signOut: () => Promise<void>
  activateLicense: (key: string) => Promise<{ success: boolean; message: string; tier?: string }>
  refreshTier: () => Promise<void>
  isWeb: boolean
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, tier: 'free', loading: true,
  trialDaysLeft: -1, isTrialing: false, isTrialExpired: false,
  signIn: async () => ({}), signUp: async () => ({}),
  signInWithMagicLink: async () => ({}), signInWithOAuth: async () => ({}),
  signOut: async () => {},
  activateLicense: async () => ({ success: false, message: 'Not initialized' }),
  refreshTier: async () => {},
  isWeb: false,
})

/**
 * Read demo auth from the login modal's localStorage key.
 * Returns a synthetic Supabase User or null.
 */
function getDemoUser(): User | null {
  try {
    const raw = localStorage.getItem('pokerGTO_auth')
    if (!raw) return null
    const auth = JSON.parse(raw)
    if (!auth.loggedIn || !auth.identity) return null
    if (Date.now() - auth.timestamp > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('pokerGTO_auth')
      return null
    }
    return {
      id: 'demo-' + (auth.identity || 'user'),
      email: auth.identity,
      app_metadata: {},
      user_metadata: { login_method: auth.method || 'email' },
      aud: 'demo',
      created_at: new Date(auth.timestamp).toISOString(),
    } as User
  } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isWeb = window.electronAPI === undefined

  // Desktop: dev build auto-unlocks as developer, customer build starts as free.
  const isDevBuild = import.meta.env.VITE_POKERGTO_DEV_BUILD === 'true'
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [tier, setTier] = useState<SubscriptionTier>(isDevBuild ? 'developer' : 'free')
  const [loading, setLoading] = useState(true)

  // ── Trial state ──
  const [trialDaysLeft, setTrialDaysLeft] = useState(-1)  // -1 = N/A
  const isTrialing = trialDaysLeft > 0
  const isTrialExpired = trialDaysLeft === 0

  /** 计算试用剩余天数 (纯函数, 不依赖 state) */
  function calcDaysLeft(trialStartMs: number): number {
    const trialEnd = trialStartMs + TRIAL_DAYS * 24 * 60 * 60 * 1000
    const remaining = Math.ceil((trialEnd - Date.now()) / (24 * 60 * 60 * 1000))
    return Math.max(0, remaining)
  }

  /** 桌面端: 开始试用 (写 SQLite) */
  async function startTrialDesktop(): Promise<number> {
    const now = Date.now()
    try {
      const api = window.electronAPI
      if (api?.trial?.setStart) {
        await api.trial.setStart({ timestamp: now })
      }
    } catch {}
    localStorage.setItem('pokerGTO_trial_start', String(now))
    return now
  }

  /** 初始化试用状态 */
  async function initTrial(currentTier?: SubscriptionTier) {
    const effectiveTier = currentTier ?? tier
    // 开发者 / 已激活用户跳过试用
    if (isDevBuild || effectiveTier !== 'free') {
      setTrialDaysLeft(-1)
      return
    }

    const isDesktop = !isWeb

    // 1. 读取试用开始时间
    let storedStart: number | null = null

    if (isDesktop) {
      // 桌面端: 优先读 SQLite (防篡改), fallback 到 localStorage
      try {
        const api = window.electronAPI
        if (api?.trial?.getStart) {
          const result = await api.trial.getStart()
          storedStart = result.trialStart
        }
      } catch {}

      // 交叉校验: SQLite 有记录但 localStorage 没有 → 恢复 localStorage
      if (storedStart) {
        const localStart = localStorage.getItem('pokerGTO_trial_start')
        if (!localStart || parseInt(localStart, 10) !== storedStart) {
          localStorage.setItem('pokerGTO_trial_start', String(storedStart))
        }
      } else {
        // SQLite 没有 → 检查 localStorage (首次启动迁移)
        const localStart = localStorage.getItem('pokerGTO_trial_start')
        if (localStart) {
          storedStart = parseInt(localStart, 10)
          // 回写到 SQLite
          try {
            const api = window.electronAPI
            if (api?.trial?.setStart) {
              await api.trial.setStart({ timestamp: storedStart })
            }
          } catch {}
        }
      }
    } else {
      // Web 端: 只用 localStorage
      const localStart = localStorage.getItem('pokerGTO_trial_start')
      storedStart = localStart ? parseInt(localStart, 10) : null
    }

    // 2. 判断状态
    if (storedStart) {
      const remaining = calcDaysLeft(storedStart)
      setTrialDaysLeft(remaining)
    } else {
      // 首次启动: 记录试用开始时间
      const now = Date.now()
      localStorage.setItem('pokerGTO_trial_start', String(now))
      if (isDesktop) {
        try {
          const api = window.electronAPI
          if (api?.trial?.setStart) {
            await api.trial.setStart({ timestamp: now })
          }
        } catch {}
      }
      setTrialDaysLeft(TRIAL_DAYS)
    }
  }

  /** 清除试用状态 (激活 License 后调用) */
  async function clearTrial() {
    localStorage.removeItem('pokerGTO_trial_start')
    if (!isWeb) {
      try {
        const api = window.electronAPI
        if (api?.trial?.clear) {
          await api.trial.clear()
        }
      } catch {}
    }
    setTrialDaysLeft(-1)
  }

  useEffect(() => {
    // ── Listen for login modal auth changes (demo auth written to localStorage) ──
    // Must be set up regardless of Supabase availability — the HTML login modal
    // always runs and dispatches this event when the user logs in.
    const handleAuthChanged = () => {
      const demoUser = getDemoUser()
      if (demoUser) {
        setUser(demoUser)
        setTier('free')
        setLoading(false)
      }
    }

    if (!supabase || !isWeb) {
      // Desktop: try to load cached session from electron-store
      if (!isWeb) {
        loadDesktopSession()
        return // no web listener needed on desktop
      }

      // Web demo (no Supabase configured): read login modal's localStorage auth
      const demoUser = getDemoUser()
      if (demoUser) {
        setUser(demoUser)
        setTier('free')
      }
      setLoading(false)
      initTrial('free')

      // Listen for subsequent modal logins (e.g. user enters email code)
      window.addEventListener('pokerGTO_auth_changed', handleAuthChanged)
      return () => {
        window.removeEventListener('pokerGTO_auth_changed', handleAuthChanged)
      }
    }

    // Web: standard Supabase session management
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? getDemoUser())
      if (session?.user) loadTier(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      setUser(session?.user ?? getDemoUser())
      if (session?.user) loadTier(session.user.id)
      else setTier('free')
    })

    window.addEventListener('pokerGTO_auth_changed', handleAuthChanged)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('pokerGTO_auth_changed', handleAuthChanged)
    }
  }, [isWeb])

  // ── Desktop: load cached session ──
  const loadDesktopSession = async () => {
    let resolvedTier: SubscriptionTier = isDevBuild ? 'developer' : 'free'
    try {
      const api = window.electronAPI
      if (api?.auth?.getSession) {
        const cached = await api.auth.getSession()
        if (cached?.user) {
          setUser(cached.user)
          setSession(cached.session || null)
        }
        // Always load tier from cache (works without login)
        if (cached?.tier && cached.tier !== 'free') {
          resolvedTier = cached.tier as SubscriptionTier
          setTier(resolvedTier)
        }
      }
      // Also check license storage for tier (more reliable persistence)
      if (api?.license?.get) {
        const license = await api.license.get()
        if (license?.tier) {
          resolvedTier = license.tier as SubscriptionTier
          setTier(resolvedTier)
          // Sync tier to auth session if it's out of date
          if (api?.auth?.setSession) {
            await api.auth.setSession({ tier: license.tier })
          }
        }
      }
    } catch (e) {
      console.error('Failed to load desktop session:', e)
    }
    setLoading(false)
    // Init trial AFTER tier is resolved
    initTrial(resolvedTier)
  }

  const loadTier = async (userId: string) => {
    if (!supabase) return
    try {
      const { data } = await supabase.from('profiles').select('tier').eq('id', userId).single()
      const loadedTier = (data?.tier || 'free') as SubscriptionTier
      setTier(loadedTier)
      // Cache tier on desktop
      cacheDesktopData({ tier: loadedTier })
      initTrial(loadedTier)
    } catch { setTier('free'); initTrial('free') }
  }

  // ── Cache session/tier to electron-store (desktop) ──
  const cacheDesktopSession = async (sessionData: any) => {
    try {
      const api = window.electronAPI
      if (api?.auth?.setSession) {
        await api.auth.setSession({
          user: sessionData.user,
          session: sessionData.session,
          tier,
        })
      }
    } catch {}
  }

  const cacheDesktopData = async (data: any) => {
    try {
      const api = window.electronAPI
      if (api?.auth?.setSession) {
        await api.auth.setSession({
          user,
          session,
          ...data,
        })
      }
    } catch {}
  }

  // ── Email/Password ──
  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: 'Auth not configured' }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.session) {
      cacheDesktopSession({ user: data.session.user, session: data.session })
    }
    return { error: error?.message }
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: 'Auth not configured' }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.session) {
      cacheDesktopSession({ user: data.session.user, session: data.session })
    }
    return { error: error?.message }
  }

  // ── Magic Link (passwordless) ──
  const signInWithMagicLink = async (email: string) => {
    if (!supabase) return { error: 'Auth not configured' }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error: error?.message }
  }

  // ── Social OAuth ──
  const signInWithOAuth = async (provider: 'google' | 'discord') => {
    if (!supabase) return { error: 'Auth not configured' }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    })
    return { error: error?.message }
  }

  // ── Refresh Tier ──
  const refreshTier = async () => {
    if (!user) return
    if (supabase) {
      try {
        const { data } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
        const newTier = data?.tier || 'free'
        setTier(newTier)
        cacheDesktopData({ tier: newTier })
      } catch { /* keep current tier */ }
    } else {
      // Desktop offline: check cached
      try {
        const api = window.electronAPI
        if (api?.auth?.getSession) {
          const cached = await api.auth.getSession()
          if (cached?.tier) setTier(cached.tier)
        }
      } catch {}
    }
  }

  // ── License Activation ──
  const activateLicense = async (key: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''

    // Offline/desktop mode: validate locally via HMAC (no login required)
    if (!supabaseUrl || !user) {
      const result = await validateLicenseKey(key)
      if (result.valid && result.tier) {
        const newTier = result.tier as SubscriptionTier
        setTier(newTier)
        // Persist tier via BOTH auth session AND license storage
        cacheDesktopData({ tier: newTier })
        // Also store in SQLite license table for reliable persistence
        try {
          const api = window.electronAPI
          if (api?.license?.store) {
            await api.license.store({ key, tier: newTier })
          }
        } catch {}
        clearTrial()
        return { success: true, message: result.message, tier: result.tier }
      }
      return { success: false, message: result.message }
    }

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      const response = await fetch(`${supabaseUrl}/functions/v1/validate-license-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          key: key.toUpperCase().trim(),
          userId: user.id,
          email: user.email || 'desktop_user',
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTier(data.tier)
        cacheDesktopData({ tier: data.tier })
        // Also store in SQLite license table for reliable persistence
        try {
          const api = window.electronAPI
          if (api?.license?.store) {
            await api.license.store({ key, tier: data.tier })
          }
        } catch {}
        clearTrial()
      }

      return {
        success: data.success,
        message: data.message || '未知响应',
        tier: data.tier,
      }
    } catch (e) {
      return { success: false, message: '网络错误，请检查网络后重试' }
    }
  }

  // ── Sign Out ──
  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    // Clear demo auth from login modal
    localStorage.removeItem('pokerGTO_auth')
    setUser(null)
    setSession(null)
    setTier('free')
    // Clear desktop cache
    try {
      const api = window.electronAPI
      if (api?.auth?.clearSession) {
        await api.auth.clearSession()
      }
    } catch {}
  }

  return (
    <AuthContext.Provider value={{
      user, session, tier, loading,
      trialDaysLeft, isTrialing, isTrialExpired,
      signIn, signUp, signInWithMagicLink, signInWithOAuth,
      signOut, activateLicense, refreshTier, isWeb,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
