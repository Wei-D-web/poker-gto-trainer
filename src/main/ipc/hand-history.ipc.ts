import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import { getDatabase, saveDatabase } from '../data/database'
import { autoDetectAndParse, parseMultipleHands } from '../data/hand-history-parser'
import { batchAnalyzeHands } from '../data/batch-analyzer'
import type { ParsedHand, HandHistorySummary, BatchAnalysisResult, HandHistoryStats } from '../../shared/types/hand-history'

export function registerHandHistoryIpc(): void {
  // Import hands from text
  ipcMain.handle('handhistory:import', async (_event, params: { text: string; gameType?: string }) => {
    try {
      const hands = params.text.includes('PokerStars Hand #')
        ? parseMultipleHands(params.text)
        : (() => { const h = autoDetectAndParse(params.text); return h ? [h] : [] })()

      if (hands.length === 0) {
        return { success: false, error: 'No valid hand histories found in text.' }
      }

      const db = getDatabase()
      let inserted = 0

      for (const hand of hands) {
        try {
          const stmt = db.prepare(
            `INSERT OR REPLACE INTO hand_histories (id, game_type, hand_text, position, stack, actions, analysis, created_at)
             VALUES (:id, :gameType, :handText, :position, :stack, :actions, :analysis, unixepoch())`
          )
          stmt.bind({
            ':id': hand.id,
            ':gameType': hand.gameType,
            ':handText': hand.rawText,
            ':position': hand.heroPosition,
            ':stack': hand.effectiveStack,
            ':actions': JSON.stringify(hand.actions),
            ':analysis': '',
          })
          stmt.step()
          stmt.free()
          inserted++
        } catch (e) {
          console.error(`Failed to insert hand ${hand.id}:`, e)
        }
      }

      saveDatabase()

      return { success: true, count: inserted, handId: hands[0]?.id }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  // Import from file
  ipcMain.handle('handhistory:importFile', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { success: false, count: 0, errors: ['No focused window'] }

    const result = await dialog.showOpenDialog(window, {
      title: 'Import Hand Histories',
      filters: [{ name: 'Hand History Files', extensions: ['txt'] }],
      properties: ['openFile', 'multiSelections'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, count: 0, errors: ['Cancelled'] }
    }

    const errors: string[] = []
    let totalCount = 0

    for (const filePath of result.filePaths) {
      try {
        const text = fs.readFileSync(filePath, 'utf-8')
        const hands = parseMultipleHands(text)

        if (hands.length === 0) {
          errors.push(`${filePath}: No hands found`)
          continue
        }

        const db = getDatabase()
        for (const hand of hands) {
          try {
            const stmt = db.prepare(
              `INSERT OR REPLACE INTO hand_histories (id, game_type, hand_text, position, stack, actions, analysis, created_at)
               VALUES (:id, :gameType, :handText, :position, :stack, :actions, :analysis, unixepoch())`
            )
            stmt.bind({
              ':id': hand.id,
              ':gameType': hand.gameType,
              ':handText': hand.rawText,
              ':position': hand.heroPosition,
              ':stack': hand.effectiveStack,
              ':actions': JSON.stringify(hand.actions),
              ':analysis': '',
            })
            stmt.step()
            stmt.free()
            totalCount++
          } catch (e) {
            errors.push(`${filePath}: DB insert error for hand`)
          }
        }
        saveDatabase()
      } catch (e) {
        errors.push(`${filePath}: ${String(e)}`)
      }
    }

    return { success: totalCount > 0, count: totalCount, errors }
  })

  // List imported hands
  ipcMain.handle('handhistory:list', async (_event, params?: { limit?: number; offset?: number }) => {
    const db = getDatabase()
    const limit = params?.limit ?? 50
    const offset = params?.offset ?? 0

    const stmt = db.prepare(
      `SELECT id, game_type, hand_text, position, stack, actions, analysis, created_at
       FROM hand_histories ORDER BY created_at DESC LIMIT :limit OFFSET :offset`
    )
    stmt.bind({ ':limit': limit, ':offset': offset })
    const hands: HandHistorySummary[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject() as any
      const analyzed = row.analysis && row.analysis.length > 10
      let grade = '-'
      let totalMistakes = 0
      let totalEVLost = 0

      if (analyzed) {
        try {
          const analysis = JSON.parse(row.analysis)
          grade = analysis.summary?.grade || '-'
          totalMistakes = analysis.summary?.mistakes || 0
          totalEVLost = analysis.summary?.totalEVLost || 0
        } catch { /* ignore parse errors */ }
      }

      const handText: string = row.hand_text || ''
      const heroMatch = handText.match(/Dealt to \S+ \[(\w\w) (\w\w)\]/)
      const boardMatch = handText.match(/Board \[([\w\s]+)\]/)

      hands.push({
        id: row.id,
        source: 'pokerstars',
        gameType: row.game_type || 'cash',
        heroPosition: row.position ?? 3,
        heroHand: heroMatch ? [heroMatch[1], heroMatch[2]] : ['As', 'Kh'],
        board: boardMatch ? boardMatch[1].trim().split(/\s+/) : [],
        potSize: row.stack ? row.stack * 0.15 : 15,
        heroWon: handText.includes('collected'),
        totalMistakes,
        totalEVLost,
        grade,
        createdAt: new Date((row.created_at || 0) * 1000).toISOString(),
        analyzed,
      })
    }
    stmt.free()

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM hand_histories')
    countStmt.step()
    const total = (countStmt.getAsObject() as any).count || 0
    countStmt.free()

    return { hands, total }
  })

  // Get single hand details
  ipcMain.handle('handhistory:getById', async (_event, params: { id: string }) => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM hand_histories WHERE id = :id')
    stmt.bind({ ':id': params.id })
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      const handText: string = (row as any).hand_text || ''
      const hand = autoDetectAndParse(handText)
      return hand
    }
    stmt.free()
    return null
  })

  // Batch analyze
  ipcMain.handle('handhistory:batchAnalyze', async (_event, params?: { ids?: string[]; allUnanalyzed?: boolean }) => {
    const db = getDatabase()
    let rows: any[] = []

    if (params?.ids?.length) {
      for (const id of params.ids) {
        const stmt = db.prepare('SELECT * FROM hand_histories WHERE id = :id')
        stmt.bind({ ':id': id })
        if (stmt.step()) rows.push(stmt.getAsObject())
        stmt.free()
      }
    } else {
      const stmt = db.prepare("SELECT * FROM hand_histories WHERE analysis = '' OR analysis IS NULL")
      while (stmt.step()) rows.push(stmt.getAsObject())
      stmt.free()
    }

    const results: BatchAnalysisResult[] = []

    for (const row of rows) {
      const handText: string = row.hand_text || ''
      const hand = autoDetectAndParse(handText)
      if (!hand) {
        results.push({ handId: row.id, success: false, error: 'Failed to parse' })
        continue
      }

      // Dynamic import would be ideal, but analyzeHand is pure JS so direct import works
      const { analyzeParsedHand } = await import('../data/batch-analyzer')
      const result = analyzeParsedHand(hand)

      if (result.success) {
        const analysisData = JSON.parse(
          JSON.stringify({ summary: { grade: result.grade, mistakes: result.mistakes, totalEVLost: result.totalEVLost } })
        )
        const updateStmt = db.prepare('UPDATE hand_histories SET analysis = :analysis WHERE id = :id')
        updateStmt.bind({ ':id': row.id, ':analysis': JSON.stringify(analysisData) })
        updateStmt.step()
        updateStmt.free()
      }

      results.push(result)
    }

    saveDatabase()
    return { success: true, results }
  })

  // Delete hands
  ipcMain.handle('handhistory:delete', async (_event, params: { ids: string[] }) => {
    const db = getDatabase()
    let deleted = 0
    for (const id of params.ids) {
      const stmt = db.prepare('DELETE FROM hand_histories WHERE id = :id')
      stmt.bind({ ':id': id })
      stmt.step()
      deleted += db.getRowsModified()
      stmt.free()
    }
    saveDatabase()
    return { deleted }
  })

  // Get stats
  ipcMain.handle('handhistory:getStats', async () => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM hand_histories')
    let total = 0, analyzedCount = 0, totalEVLost = 0, wonCount = 0
    const grades: string[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject() as any
      total++

      if (row.analysis && row.analysis.length > 10) {
        analyzedCount++
        try {
          const a = JSON.parse(row.analysis)
          totalEVLost += a.summary?.totalEVLost || 0
          grades.push(a.summary?.grade || '-')
        } catch { /* skip */ }
      }

      if (row.hand_text?.includes('collected')) wonCount++
    }
    stmt.free()

    const stats: HandHistoryStats = {
      totalHands: total,
      analyzedCount,
      unanalyzedCount: total - analyzedCount,
      totalEVLost: Math.round(totalEVLost * 100) / 100,
      averageGrade: grades.length > 0
        ? grades.sort()[Math.floor(grades.length / 2)]
        : '-',
      winRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
    }

    return stats
  })
}
