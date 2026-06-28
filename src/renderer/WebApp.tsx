/**
 * Web App shell — shows login page if not authenticated, main app if logged in.
 * On first login from web, shows a one-time "Download Desktop App" interstitial.
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from './contexts/AuthContext'
import { App } from './App'
import { LoginPage } from './components/auth/LoginPage'
import { PostLoginScreen } from './components/auth/PostLoginScreen'

const STORAGE_KEY = 'pokergto_post_login_dismissed'

export function WebApp() {
  const { user, loading } = useAuth()
  const isDev = import.meta.env.VITE_POKERGTO_DEV_BUILD === 'true'

  // Track whether to show the post-login interstitial
  const [showPostLogin, setShowPostLogin] = useState(false)
  const prevUser = useRef(user)

  useEffect(() => {
    // User just logged in (null → user)
    if (!prevUser.current && user) {
      // Only show if user hasn't previously dismissed it
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (!dismissed || dismissed === '') {
        setShowPostLogin(true)
      }
    }
    // User logged out → reset
    if (prevUser.current && !user) {
      setShowPostLogin(false)
    }
    prevUser.current = user
  }, [user])

  const handlePostLoginContinue = () => {
    setShowPostLogin(false)
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#05080C] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-600 border-t-emerald-500 animate-spin mx-auto" />
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    )
  }

  // ── Not authenticated ──
  if (!isDev && !user) {
    return <LoginPage />
  }

  // ── Post-login interstitial (web only, first time, not in dev mode) ──
  if (showPostLogin && !isDev) {
    return <PostLoginScreen onContinue={handlePostLoginContinue} />
  }

  // ── Main app ──
  return <App />
}
