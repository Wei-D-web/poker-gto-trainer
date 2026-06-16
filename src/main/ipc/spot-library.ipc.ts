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
    const db = getDatabase()
    const id = `spot_${Date.now()}`
    const stmt = db.prepare(
      `INSERT INTO spot_library (id, name, category, game_type, hero_position, villain_position, stack_depth, board, notes, tags, created_at)
       VALUES (:id, :name, :cat, :gt, :hp, :vp, :sd, :board, :notes, :tags, unixepoch())`
    )
    stmt.bind({
      ':id': id, ':name': params.name, ':cat': params.category,
      ':gt': params.gameType, ':hp': params.heroPosition, ':vp': params.villainPosition,
      ':sd': params.stackDepth, ':board': params.board.join(' '),
      ':notes': params.notes || '', ':tags': JSON.stringify(params.tags || []),
    })
    stmt.step(); stmt.free(); saveDatabase()
    return { success: true, id }
  })

  ipcMain.handle('spot:list', async (_e, params?: { category?: string }) => {
    const db = getDatabase()
    const stmt = params?.category
      ? db.prepare('SELECT * FROM spot_library WHERE category = :cat ORDER BY created_at DESC')
      : db.prepare('SELECT * FROM spot_library ORDER BY created_at DESC')
    if (params?.category) stmt.bind({ ':cat': params.category })
    const spots: SpotEntry[] = []
    while (stmt.step()) {
      const r = stmt.getAsObject() as any
      spots.push({
        id: r.id, name: r.name, category: r.category, gameType: r.game_type,
        heroPosition: r.hero_position, villainPosition: r.villain_position,
        stackDepth: r.stack_depth, board: r.board || '', notes: r.notes || '',
        tags: JSON.parse(r.tags || '[]'), createdAt: new Date((r.created_at || 0) * 1000).toISOString(),
      })
    }
    stmt.free()
    return { spots }
  })

  ipcMain.handle('spot:delete', async (_e, params: { id: string }) => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM spot_library WHERE id = :id')
    stmt.bind({ ':id': params.id })
    stmt.step(); stmt.free(); saveDatabase()
    return { success: true }
  })

  ipcMain.handle('spot:update', async (_e, params: { id: string; name?: string; notes?: string; category?: string }) => {
    const db = getDatabase()
    if (params.name) { const s = db.prepare('UPDATE spot_library SET name = :n WHERE id = :id'); s.bind({ ':n': params.name, ':id': params.id }); s.step(); s.free() }
    if (params.notes !== undefined) { const s = db.prepare('UPDATE spot_library SET notes = :n WHERE id = :id'); s.bind({ ':n': params.notes, ':id': params.id }); s.step(); s.free() }
    if (params.category) { const s = db.prepare('UPDATE spot_library SET category = :c WHERE id = :id'); s.bind({ ':c': params.category, ':id': params.id }); s.step(); s.free() }
    saveDatabase()
    return { success: true }
  })
}
