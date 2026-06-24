/**
 * Web App shell — shows login page if not authenticated, main app if logged in.
 */
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { App } from './App'
import { LoginPage } from './components/auth/LoginPage'

export function WebApp() {
  const { user, loading } = useAuth()

  // Dev build: skip auth, go straight to app
  const isDev = import.meta.env.VITE_POKERGTO_DEV_BUILD === 'true'

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#05080C] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-600 border-t-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isDev && !user) {
    return <LoginPage />
  }

  return <App />
}
