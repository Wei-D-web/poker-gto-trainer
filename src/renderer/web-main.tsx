/**
 * Web entry point — wraps the app with auth and subscription context.
 * For Electron, use main.tsx directly.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import { WebApp } from './WebApp'
import { installWebBridge } from './services/web-api-bridge'
import './styles/globals.css'

// Install no-op electronAPI bridge before anything tries to call it
installWebBridge()

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <AuthProvider>
        <WebApp />
      </AuthProvider>
    </StrictMode>,
  )
}
