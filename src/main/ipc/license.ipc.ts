/**
 * License Key IPC Handlers — 卡密激活
 *
 * Handles offline license verification and local tier caching.
 * For online users, license validation goes through Supabase Edge Function.
 */

import { ipcMain } from 'electron'
import { getDatabase, saveDatabase } from '../data/database'

export function registerLicenseIpc(): void {
  // Store license key locally (offline mode)
  ipcMain.handle('license:store', async (_event, params: { key: string; tier: string }) => {
    const db = getDatabase()

    // Create license_keys table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS local_licenses (
        key TEXT PRIMARY KEY,
        tier TEXT NOT NULL DEFAULT 'pro',
        activated_at INTEGER DEFAULT (unixepoch()),
        last_validated INTEGER DEFAULT (unixepoch())
      )
    `)

    const stmt = db.prepare(
      `INSERT OR REPLACE INTO local_licenses (key, tier, activated_at, last_validated)
       VALUES (:key, :tier, unixepoch(), unixepoch())`
    )
    stmt.bind({ ':key': params.key, ':tier': params.tier })
    stmt.step()
    stmt.free()

    // Update user_preferences with tier
    const prefStmt = db.prepare(
      `INSERT OR REPLACE INTO user_preferences (key, value, updated_at)
       VALUES ('active_tier', :tier, unixepoch())`
    )
    prefStmt.bind({ ':tier': params.tier })
    prefStmt.step()
    prefStmt.free()

    saveDatabase()
    return { success: true }
  })

  // Get stored license info
  ipcMain.handle('license:get', async () => {
    const db = getDatabase()

    try {
      const stmt = db.prepare('SELECT * FROM local_licenses ORDER BY activated_at DESC LIMIT 1')
      if (stmt.step()) {
        const row = stmt.getAsObject() as any
        stmt.free()
        return {
          key: row.key,
          tier: row.tier,
          activatedAt: row.activated_at,
          lastValidated: row.last_validated,
        }
      }
      stmt.free()
    } catch {
      // Table might not exist yet
    }

    return null
  })

  // Validate license key format (offline pattern check)
  ipcMain.handle('license:validateFormat', async (_event, params: { key: string }) => {
    const key = params.key.toUpperCase().trim()
    const valid = /^[A-Z0-9]{4,8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)
    return { valid }
  })
}
