/**
 * Trial IPC Handlers — 14 天试用期管理
 *
 * 试用状态双写: localStorage (快速读取) + SQLite (防篡改)
 * 每次启动交叉校验, localStorage 被清除时从 SQLite 恢复。
 */
import { ipcMain } from 'electron'
import { getDatabase, saveDatabase } from '../data/database'

export function registerTrialIpc(): void {
  // ── 获取试用开始时间 ──
  ipcMain.handle('trial:getStart', async () => {
    const db = getDatabase()
    try {
      const stmt = db.prepare(
        "SELECT value FROM user_preferences WHERE key = 'trial_start'"
      )
      if (stmt.step()) {
        const row = stmt.getAsObject() as any
        stmt.free()
        return { trialStart: parseInt(row.value, 10) }
      }
      stmt.free()
    } catch {
      // user_preferences 表可能还不存在
    }
    return { trialStart: null }
  })

  // ── 设置试用开始时间 ──
  ipcMain.handle('trial:setStart', async (_event, params: { timestamp: number }) => {
    const db = getDatabase()
    try {
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO user_preferences (key, value, updated_at)
         VALUES ('trial_start', :value, unixepoch())`
      )
      stmt.bind({ ':value': String(params.timestamp) })
      stmt.step()
      stmt.free()
      saveDatabase()
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  // ── 清除试用状态 (激活 License 后调用) ──
  ipcMain.handle('trial:clear', async () => {
    const db = getDatabase()
    try {
      db.run("DELETE FROM user_preferences WHERE key = 'trial_start'")
      saveDatabase()
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
