/**
 * Web App shell — shows login page if not authenticated, main app if logged in.
 * On first login from web, shows a one-time "Download Desktop App" interstitial.
 * Demo mode: click "先看看" on login page to skip auth entirely.
 * URL param: ?demo=1 auto-enables demo mode and skips login.
 * URL param: ?ls=success shows payment success page with license key.
 * URL param: ?plan=pro|lifetime pre-selects upgrade plan on account page.
 */
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useAuth } from './contexts/AuthContext'
import { App } from './App'
import { LoginPage } from './components/auth/LoginPage'
import { PostLoginScreen } from './components/auth/PostLoginScreen'
import { track } from './services/analytics'

const PaymentSuccessPage = lazy(() => import('./components/payment/PaymentSuccessPage'))

const POST_LOGIN_KEY = 'pokergto_post_login_dismissed'
const DEMO_KEY = 'pokergto_demo_mode'

/**
 * Check URL search params for special pages and auto-apply settings.
 * Returns 'payment-success' if ?ls=success is present.
 * Called once on mount.
 */
function applyUrlParams(): 'payment-success' | null {
  try {
    const params = new URLSearchParams(window.location.search)

    // ?ls=success → show payment success page
    if (params.get('ls') === 'success') {
      return 'payment-success'
    }

    // ?demo=1 → auto-enable demo mode
    if (params.get('demo') === '1') {
      localStorage.setItem(DEMO_KEY, '1')
      const url = new URL(window.location.href)
      url.searchParams.delete('demo')
      window.history.replaceState({}, '', url.toString())
    }
  } catch { /* ignore in non-browser env */ }
  return null
}

export function WebApp() {
  const { user, loading } = useAuth()
  const isDev = import.meta.env.VITE_POKERGTO_DEV_BUILD === 'true'

  // Check for payment success redirect
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)

  // Demo mode — skips auth entirely
  const [demoMode, setDemoMode] = useState(() => {
    // Apply URL params before reading state
    const specialPage = applyUrlParams()
    if (specialPage === 'payment-success') {
      setShowPaymentSuccess(true)
    }
    const isDemo = localStorage.getItem(DEMO_KEY) === '1'
    if (isDemo) track('web_demo_entered')
    track('session_started')
    return isDemo
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
    track('web_demo_entered', { source: 'login_page' })
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
  return (
    <>
      {showPaymentSuccess && (
        <Suspense fallback={
          <div className="h-screen w-screen bg-[#05080C] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-neutral-600 border-t-emerald-500 animate-spin mx-auto" />
          </div>
        }>
          <PaymentSuccessPage />
        </Suspense>
      )}
      {!showPaymentSuccess && <App />}
    </>
  )
}
