/**
 * Desktop Auth IPC Handlers
 *
 * Manages cached Supabase session in a local JSON file for offline/desktop use.
 * User signs in once → session stored locally → auto-restored on app launch.
 *
 * Exposed to renderer via contextBridge (see preload/index.ts).
 */

import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

interface StoredSession {
  user: {
    id: string
    email?: string
    created_at: string
  } | null
  session: {
    access_token?: string
    refresh_token?: string
    expires_at?: number
  } | null
  tier: 'free' | 'pro' | 'lifetime' | 'developer'
  updatedAt: string
}

function getSessionPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'auth-session.json')
}

function readSession(): StoredSession | null {
  try {
    const filePath = getSessionPath()
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

function writeSession(data: StoredSession): void {
  try {
    const filePath = getSessionPath()
    const tmpPath = filePath + '.tmp'
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(tmpPath, filePath) // atomic replace — prevents corruption on crash
  } catch (e) {
    console.error('Failed to write session:', e)
  }
}

function deleteSessionFile(): void {
  try {
    const filePath = getSessionPath()
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch (e) {
    console.error('Failed to delete session:', e)
  }
}

/**
 * Auto-create a developer session on desktop app startup.
 * Only active in dev builds (VITE_POKERGTO_DEV_BUILD=true).
 * Customer builds start as free tier — users activate via license key.
 */
function ensureDeveloperSession(): void {
  // Only auto-activate in developer builds
  if (import.meta.env.VITE_POKERGTO_DEV_BUILD !== 'true') return

  const existing = readSession()
  if (!existing || existing.tier !== 'developer') {
    writeSession({
      user: {
        id: 'dev-admin-0001',
        email: 'dev@pokergto.local',
        created_at: new Date().toISOString(),
      },
      session: null,
      tier: 'developer',
      updatedAt: new Date().toISOString(),
    })
  }
}

export function registerAuthIpc(): void {
  // ── Auto-init developer session on desktop startup ──
  // Desktop app always runs as developer — no login required.
  ensureDeveloperSession()

  /**
   * Get the stored session.
   * Returns null if not logged in.
   */
  ipcMain.handle('auth:getSession', async (): Promise<StoredSession | null> => {
    try {
      const stored = readSession()
      // Return tier even without a user (developer mode bypass)
      if (!stored?.user && !stored?.tier) return null

      // Check if session token is expired
      if (stored.session?.expires_at) {
        const expiresAt = stored.session.expires_at * 1000 // convert to ms
        if (Date.now() > expiresAt) {
          return {
            ...stored,
            session: {
              ...stored.session,
              access_token: undefined,
              refresh_token: undefined,
            },
          }
        }
      }

      return stored
    } catch (e) {
      console.error('Failed to read session:', e)
      return null
    }
  })

  /**
   * Store session data (called after successful login/signup).
   * NOTE: tier is NEVER accepted from the renderer — it must be set via license activation.
   */
  ipcMain.handle('auth:setSession', async (_event, sessionData: Partial<Omit<StoredSession, 'tier'>>): Promise<void> => {
    try {
      const existing = readSession() || { user: null, session: null, tier: 'free', updatedAt: '' } as StoredSession
      // Strip tier from incoming data — tier must be set via license:store only
      const { tier: _ignoredTier, ...safeData } = sessionData as any
      writeSession({
        ...existing,
        ...safeData,
        updatedAt: new Date().toISOString(),
      } as StoredSession)
    } catch (e) {
      console.error('Failed to store session:', e)
    }
  })

  /**
   * Clear the stored session (sign out).
   */
  ipcMain.handle('auth:clearSession', async (): Promise<void> => {
    try {
      deleteSessionFile()
    } catch (e) {
      console.error('Failed to clear session:', e)
    }
  })
}
