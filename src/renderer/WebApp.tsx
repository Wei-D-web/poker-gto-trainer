/**
 * Web App shell — shows login page if not authenticated, main app if logged in.
 * On first login from web, shows a one-time "Download Desktop App" interstitial.
 * Demo mode: click "先看看" on login page to skip auth entirely.
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from './contexts/AuthContext'
import { App } from './App'
import { LoginPage } from './components/auth/LoginPage'
import { PostLoginScreen } from './components/auth/PostLoginScreen'

const POST_LOGIN_KEY = 'pokergto_post_login_dismissed'
const DEMO_KEY = 'pokergto_demo_mode'

export function WebApp() {
  const { user, loading } = useAuth()
  const isDev = import.meta.env.VITE_POKERGTO_DEV_BUILD === 'true'

  // Demo mode — skips auth entirely
  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem(DEMO_KEY) === '1'
  })

  // Track whether to show the post-login interstitial
  const [showPostLogin, setShowPostLogin] = useState(false)
  const prevUser = useRef(user)

  useEffect(() => {
    // User just logged in (null → user)
    if (!prevUser.current && user) {
      const dismissed = localStorage.getItem(POST_LOGIN_KEY)
      if (!dismissed || dismissed === '') {
        setShowPostLogin(true)
      }
    }
    if (prevUser.current && !user) {
      setShowPostLogin(false)
    }
    prevUser.current = user
  }, [user])

  const handlePostLoginContinue = () => setShowPostLogin(false)

  const handleDemoMode = () => {
    localStorage.setItem(DEMO_KEY, '1')
    setDemoMode(true)
  }

  // ── Loading ──
  if (loading && !demoMode) {
    return (
      <div className="h-screen w-screen bg-[#05080C] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-600 border-t-emerald-500 animate-spin mx-auto" />
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    )
  }

  // ── Not authenticated (and not in demo/dev mode) ──
  if (!isDev && !demoMode && !user) {
    return <LoginPage onDemoMode={handleDemoMode} />
  }

  // ── Post-login interstitial (real login only, not demo) ──
  if (showPostLogin && !isDev && !demoMode) {
    return <PostLoginScreen onContinue={handlePostLoginContinue} />
  }

  // ── Main app ──
  return <App />
}
