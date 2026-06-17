import { ipcMain } from 'electron'
import { getDatabase, saveDatabase } from '../data/database'

export interface SpotEntry {
  id: string
  name: string
  category: string
  gameType: string
  heroPosition: number
  villainPosition: number
  stackDepth: number
  board: string
  notes: string
  tags: string[]
  createdAt: string
}

export function registerSpotLibraryIpc(): void {
  ipcMain.handle('spot:save', async (_e, params: {
    name: string; category: string; gameType: string
    heroPosition: number; villainPosition: number; stackDepth: number
    board: string[]; notes?: string; tags?: string[]
  }) => {
    try {
      const db = getDatabase()
      const id = `spot_${Date.now()}`
      const stmt = db.prepare(
        `INSERT INTO spot_library (id, name, category, game_type, hero_position, villain_position, stack_depth, board, notes, tags, created_at)
         VALUES (:id, :name, :cat, :gt, :hp, :vp, :sd, :board, :notes, :tags, unixepoch())`
      )
      try {
        stmt.bind({
          ':id': id, ':name': params.name, ':cat': params.category,
          ':gt': params.gameType, ':hp': params.heroPosition, ':vp': params.villainPosition,
          ':sd': params.stackDepth, ':board': (params.board || []).join(' '),
          ':notes': params.notes || '', ':tags': JSON.stringify(params.tags || []),
        })
        stmt.step()
      } finally {
        stmt.free()
      }
      saveDatabase()
      return { success: true, id }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('spot:list', async (_e, params?: { category?: string }) => {
    try {
      const db = getDatabase()
      const stmt = params?.category
        ? db.prepare('SELECT * FROM spot_library WHERE category = :cat ORDER BY created_at DESC')
        : db.prepare('SELECT * FROM spot_library ORDER BY created_at DESC')
      if (params?.category) stmt.bind({ ':cat': params.category })
      const spots: SpotEntry[] = []
      try {
        while (stmt.step()) {
          const r = stmt.getAsObject() as any
          spots.push({
            id: r.id, name: r.name, category: r.category, gameType: r.game_type,
            heroPosition: r.hero_position, villainPosition: r.villain_position,
            stackDepth: r.stack_depth, board: r.board || '', notes: r.notes || '',
            tags: JSON.parse(r.tags || '[]'), createdAt: new Date((r.created_at || 0) * 1000).toISOString(),
          })
        }
      } finally {
        stmt.free()
      }
      return { spots }
    } catch (e) {
      return { spots: [], error: String(e) }
    }
  })

  ipcMain.handle('spot:delete', async (_e, params: { id: string }) => {
    try {
      if (!params?.id) return { success: false, error: 'Missing spot id' }
      const db = getDatabase()
      const stmt = db.prepare('DELETE FROM spot_library WHERE id = :id')
      try {
        stmt.bind({ ':id': params.id })
        stmt.step()
      } finally {
        stmt.free()
      }
      saveDatabase()
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('spot:update', async (_e, params: { id: string; name?: string; notes?: string; category?: string }) => {
    try {
      if (!params?.id) return { success: false, error: 'Missing spot id' }
      const db = getDatabase()
      const stmt = db.prepare(
        `UPDATE spot_library SET
          name = COALESCE(:name, name),
          notes = COALESCE(:notes, notes),
          category = COALESCE(:category, category)
         WHERE id = :id`
      )
      try {
        stmt.bind({
          ':name': params.name ?? null,
          ':notes': params.notes ?? null,
          ':category': params.category ?? null,
          ':id': params.id,
        })
        stmt.step()
      } finally {
        stmt.free()
      }
      saveDatabase()
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
