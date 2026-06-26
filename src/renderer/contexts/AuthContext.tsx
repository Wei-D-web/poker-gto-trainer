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

export type SubscriptionTier = 'free' | 'pro' | 'lifetime' | 'developer'

interface AuthState {
  user: User | null
  session: Session | null
  tier: SubscriptionTier
  loading: boolean
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
  const isWeb = (window as any).electronAPI === undefined

  // Desktop: dev build auto-unlocks as developer, customer build starts as free.
  const isDevBuild = import.meta.env.VITE_POKERGTO_DEV_BUILD === 'true'
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [tier, setTier] = useState<SubscriptionTier>(isDevBuild ? 'developer' : 'free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !isWeb) {
      // Desktop: try to load cached session from electron-store
      if (!isWeb) loadDesktopSession()
      else {
        // Web demo: read login modal's localStorage auth
        const demoUser = getDemoUser()
        if (demoUser) {
          setUser(demoUser)
          setTier('free')
        }
        setLoading(false)
      }
      return
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

    return () => subscription.unsubscribe()
  }, [isWeb])

  // ── Desktop: load cached session ──
  const loadDesktopSession = async () => {
    try {
      const api = (window as any).electronAPI
      if (api?.auth?.getSession) {
        const cached = await api.auth.getSession()
        if (cached?.user) {
          setUser(cached.user)
          setSession(cached.session || null)
        }
        // Always load tier from cache (works without login)
        if (cached?.tier) setTier(cached.tier)
      }
    } catch (e) {
      console.error('Failed to load desktop session:', e)
    }
    setLoading(false)
  }

  const loadTier = async (userId: string) => {
    if (!supabase) return
    try {
      const { data } = await supabase.from('profiles').select('tier').eq('id', userId).single()
      const loadedTier = data?.tier || 'free'
      setTier(loadedTier)
      // Cache tier on desktop
      cacheDesktopData({ tier: loadedTier })
    } catch { setTier('free') }
  }

  // ── Cache session/tier to electron-store (desktop) ──
  const cacheDesktopSession = async (sessionData: any) => {
    try {
      const api = (window as any).electronAPI
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
      const api = (window as any).electronAPI
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
        const api = (window as any).electronAPI
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

    // Offline/desktop mode: validate locally via HMAC
    if (!supabaseUrl || !user) {
      const result = await validateLicenseKey(key)
      if (result.valid && result.tier) {
        setTier(result.tier as SubscriptionTier)
        cacheDesktopData({ tier: result.tier as SubscriptionTier })
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
      const api = (window as any).electronAPI
      if (api?.auth?.clearSession) {
        await api.auth.clearSession()
      }
    } catch {}
  }

  return (
    <AuthContext.Provider value={{
      user, session, tier, loading,
      signIn, signUp, signInWithMagicLink, signInWithOAuth,
      signOut, activateLicense, refreshTier, isWeb,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
