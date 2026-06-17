/**
 * Session Review IPC Handlers — 对局复盘教练
 *
 * Handles session import, deviation analysis, weakness detection,
 * and hand-level GTO comparison.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import { getDatabase, saveDatabase } from '../data/database'
import {
  autoDetectAndParse,
  parseMultipleHands,
  parsePokerStarsHand,
  parseGGPokerHand,
  parseWPKHand,
} from '../data/hand-history-parser'
import { compareHandToGTO, buildRangeDeviationMatrix, detectWeaknesses } from '../solver/deviation-engine'
import type {
  PokerSession,
  SessionHand,
  SessionImportResult,
  SessionReviewStats,
  RangeDeviation,
  DetectedWeakness,
} from '../../shared/types/session-review'
import type { ParsedHand } from '../../shared/types/hand-history'

export function registerSessionReviewIpc(): void {
  // ============================================================
  // Session import from files
  // ============================================================
  ipcMain.handle('session:importFromFiles', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { success: false, handCount: 0, errors: ['No focused window'] }

    const result = await dialog.showOpenDialog(window, {
      title: '导入对局牌谱 (Import Hand Histories)',
      filters: [
        { name: 'Hand History Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, handCount: 0, errors: ['已取消'] }
    }

    const errors: string[] = []
    let totalCount = 0
    const sessionIds: string[] = []

    for (const filePath of result.filePaths) {
      try {
        const text = fs.readFileSync(filePath, 'utf-8')
        const hands = parseMultipleHands(text)

        if (hands.length === 0) {
          errors.push(`${filePath}: 未找到有效牌谱`)
          continue
        }

        // Create a session for these hands
        const firstHand = hands[0]
        const lastHand = hands[hands.length - 1]
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        sessionIds.push(sessionId)

        const db = getDatabase()

        // Calculate session stats
        let totalProfit = 0
        let totalHands = 0
        let heroName = firstHand.heroName

        for (const hand of hands) {
          // Insert hand into hand_histories
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
            totalHands++
            if (hand.heroWon) totalProfit += hand.amountWon
            else if (hand.heroWon === false) totalProfit -= hand.effectiveStack * 0.1 // approximate loss
          } catch (e) {
            errors.push(`${filePath}: DB 插入错误 — ${String(e)}`)
          }
        }

        // Create session entry
        const sessionStmt = db.prepare(
          `INSERT OR REPLACE INTO sessions (id, date, game_type, stakes, table_name,
           max_players, hero_name, hero_position, total_hands, duration_minutes,
           profit, gto_alignment, hand_ids, raw_data, created_at)
           VALUES (:id, :date, :gameType, :stakes, :tableName, :maxPlayers,
           :heroName, :heroPosition, :totalHands, :duration, :profit, :alignment,
           :handIds, :rawData, unixepoch())`
        )
        sessionStmt.bind({
          ':id': sessionId,
          ':date': firstHand.date,
          ':gameType': firstHand.gameType,
          ':stakes': firstHand.stakes,
          ':tableName': firstHand.tableName,
          ':maxPlayers': firstHand.maxPlayers,
          ':heroName': heroName,
          ':heroPosition': firstHand.heroPosition,
          ':totalHands': totalHands,
          ':duration': estimateDuration(firstHand.date, lastHand?.date || firstHand.date),
          ':profit': Math.round(totalProfit * 100) / 100,
          ':alignment': 0,
          ':handIds': JSON.stringify(hands.map(h => h.id)),
          ':rawData': JSON.stringify({ filePath }),
        })
        sessionStmt.step()
        sessionStmt.free()

        saveDatabase()
      } catch (e) {
        errors.push(`${filePath}: ${String(e)}`)
      }
    }

    return {
      success: totalCount > 0,
      sessionId: sessionIds[sessionIds.length - 1] || '',
      sessionIds,
      handCount: totalCount,
      errors,
    } as SessionImportResult
  })

  // ============================================================
  // Import from pasted text
  // ============================================================
  ipcMain.handle('session:importFromText', async (_event, params: { text: string }) => {
    try {
      const hands = parseMultipleHands(params.text)

      if (hands.length === 0) {
        return { success: false, handCount: 0, errors: ['未找到有效牌谱'] }
      }

      const sessionId = `session_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
      const db = getDatabase()
      let totalCount = 0
      let totalProfit = 0
      const firstHand = hands[0]

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
          if (hand.heroWon) totalProfit += hand.amountWon
          else if (hand.heroWon === false) totalProfit -= Math.abs(hand.amountWon) || hand.effectiveStack * 0.1
        } catch (e) {
          // skip duplicates
        }
      }

      // Create session
      const sessionStmt = db.prepare(
        `INSERT OR REPLACE INTO sessions (id, date, game_type, stakes, table_name,
         max_players, hero_name, hero_position, total_hands, duration_minutes,
         profit, gto_alignment, hand_ids, raw_data, created_at)
         VALUES (:id, :date, :gameType, :stakes, :tableName, :maxPlayers,
         :heroName, :heroPosition, :totalHands, :duration, :profit, :alignment,
         :handIds, :rawData, unixepoch())`
      )
      sessionStmt.bind({
        ':id': sessionId,
        ':date': firstHand.date,
        ':gameType': firstHand.gameType,
        ':stakes': firstHand.stakes,
        ':tableName': firstHand.tableName,
        ':maxPlayers': firstHand.maxPlayers,
        ':heroName': firstHand.heroName,
        ':heroPosition': firstHand.heroPosition,
        ':totalHands': totalCount,
        ':duration': 0,
        ':profit': Math.round(totalProfit * 100) / 100,
        ':alignment': 0,
        ':handIds': JSON.stringify(hands.map(h => h.id)),
        ':rawData': JSON.stringify({ source: 'paste' }),
      })
      sessionStmt.step()
      sessionStmt.free()

      saveDatabase()

      return { success: true, sessionId, handCount: totalCount, errors: [] }
    } catch (e) {
      return { success: false, handCount: 0, errors: [String(e)] }
    }
  })

  // ============================================================
  // List all sessions
  // ============================================================
  ipcMain.handle('session:list', async () => {
    const db = getDatabase()

    // Check if sessions table exists
    try {
      const checkStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'")
      const tableExists = checkStmt.step()
      checkStmt.free()
      if (!tableExists) return { sessions: [] }
    } catch {
      return { sessions: [] }
    }

    const stmt = db.prepare(
      `SELECT * FROM sessions ORDER BY created_at DESC LIMIT 50`
    )
    const sessions: PokerSession[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject() as any
      sessions.push({
        id: row.id,
        date: row.date || new Date((row.created_at || 0) * 1000).toISOString(),
        gameType: row.game_type || 'cash',
        stakes: row.stakes || '$0.50/$1.00',
        tableName: row.table_name || 'Unknown',
        maxPlayers: row.max_players || 6,
        heroName: row.hero_name || 'Hero',
        heroPosition: row.hero_position ?? 3,
        totalHands: row.total_hands || 0,
        durationMinutes: row.duration_minutes || 0,
        profit: row.profit || 0,
        gtoAlignmentScore: row.gto_alignment || 0,
        createdAt: row.created_at || Date.now() / 1000,
      })
    }
    stmt.free()

    return { sessions }
  })

  // ============================================================
  // Analyze a session — compute deviations for all hands
  // ============================================================
  ipcMain.handle('session:analyze', async (_event, params: { sessionId: string }) => {
    const db = getDatabase()

    // Get session data
    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = :id')
    sessionStmt.bind({ ':id': params.sessionId })
    if (!sessionStmt.step()) {
      sessionStmt.free()
      return { success: false, error: 'Session not found' }
    }
    const sessionRow = sessionStmt.getAsObject() as any
    sessionStmt.free()

    // Get hand IDs
    let handIds: string[] = []
    try {
      handIds = JSON.parse(sessionRow.hand_ids || '[]')
    } catch { /* empty */ }

    const analyzedHands: SessionHand[] = []
    const allDecisions: any[] = []
    const allHandData: Array<{
      id: string
      heroHand: string[]
      actions: any[]
      heroPosition: number
      villainPosition: number
      effectiveStack: number
      gameType: 'cash' | 'tournament'
      board: string[]
      decisions: any[]
    }> = []

    for (const handId of handIds) {
      const handStmt = db.prepare('SELECT * FROM hand_histories WHERE id = :id')
      handStmt.bind({ ':id': handId })
      if (!handStmt.step()) { handStmt.free(); continue }
      const handRow = handStmt.getAsObject() as any
      handStmt.free()

      const handText: string = handRow.hand_text || ''
      const hand = autoDetectAndParse(handText)
      if (!hand) continue

      // Run GTO comparison
      const { decisions, totalEVLost } = compareHandToGTO({
        actions: hand.actions,
        heroPosition: hand.heroPosition as any,
        villainPosition: hand.villainPosition as any,
        effectiveStack: hand.effectiveStack,
        gameType: hand.gameType,
        board: hand.board,
        heroHand: hand.heroHand,
      })

      const isKeyHand = decisions.some(d => d.severity === 'major' || d.severity === 'critical')
      const keyReasons = decisions
        .filter(d => d.severity === 'major' || d.severity === 'critical')
        .map(d => d.explanation)

      const sessionHand: SessionHand = {
        id: `sh_${hand.id}`,
        sessionId: params.sessionId,
        handId: hand.id,
        heroHand: hand.heroHand,
        board: hand.board,
        heroPosition: hand.heroPosition as any,
        villainPosition: hand.villainPosition as any,
        effectiveStack: hand.effectiveStack,
        potSize: hand.potSize,
        actions: hand.actions,
        heroWon: hand.heroWon,
        amountWon: hand.amountWon,
        deviations: [], // filled below
        decisionAnalysis: decisions,
        totalEVLost,
        isKeyHand,
        keyHandReason: keyReasons[0],
        createdAt: Date.now() / 1000,
      }
      analyzedHands.push(sessionHand)
      allDecisions.push(...decisions)

      allHandData.push({
        id: hand.id,
        heroHand: hand.heroHand,
        actions: hand.actions,
        heroPosition: hand.heroPosition,
        villainPosition: hand.villainPosition,
        effectiveStack: hand.effectiveStack,
        gameType: hand.gameType,
        board: hand.board,
        decisions,
      })
    }

    // Detect weaknesses
    const weaknesses = detectWeaknesses(allHandData)

    // Build range deviation matrix
    const rangeDeviations = buildRangeDeviationMatrix(
      allHandData.map(h => ({
        heroHand: h.heroHand,
        actions: h.actions,
        heroPosition: h.heroPosition as any,
        effectiveStack: h.effectiveStack,
        gameType: h.gameType,
      })),
    )

    // Calculate alignment score
    const totalDecisions = allDecisions.length
    const correctDecisions = allDecisions.filter(d => d.isGTO).length
    const alignmentScore = totalDecisions > 0
      ? Math.round((correctDecisions / totalDecisions) * 100)
      : 0

    // Update session alignment in DB
    const updateStmt = db.prepare('UPDATE sessions SET gto_alignment = :alignment WHERE id = :id')
    updateStmt.bind({ ':alignment': alignmentScore, ':id': params.sessionId })
    updateStmt.step()
    updateStmt.free()

    // Store analysis results
    const analysisData = {
      alignmentScore,
      weaknesses,
      rangeDeviations,
      analyzedAt: Date.now(),
    }
    const analysisJson = JSON.stringify(analysisData)

    // Store in session's raw_data or a separate analysis column
    const finalUpdate = db.prepare(
      `UPDATE sessions SET raw_data = json_set(raw_data, '$.analysis', json(:analysis)) WHERE id = :id`
    )
    finalUpdate.bind({ ':analysis': analysisJson, ':id': params.sessionId })
    finalUpdate.step()
    finalUpdate.free()

    saveDatabase()

    return {
      success: true,
      hands: analyzedHands,
      weaknesses,
      rangeDeviations,
      alignmentScore,
      totalHands: analyzedHands.length,
      totalEVLost: Math.round(allDecisions.reduce((s, d) => s + d.evDifference, 0) * 100) / 100,
    }
  })

  // ============================================================
  // Get session detail
  // ============================================================
  ipcMain.handle('session:getDetail', async (_event, params: { sessionId: string }) => {
    const db = getDatabase()

    const stmt = db.prepare('SELECT * FROM sessions WHERE id = :id')
    stmt.bind({ ':id': params.sessionId })
    if (!stmt.step()) { stmt.free(); return null }

    const row = stmt.getAsObject() as any
    stmt.free()

    let analysis: any = null
    try {
      const rawData = JSON.parse(row.raw_data || '{}')
      analysis = rawData.analysis || null
    } catch { /* */ }

    return {
      session: {
        id: row.id,
        date: row.date,
        gameType: row.game_type,
        stakes: row.stakes,
        tableName: row.table_name,
        maxPlayers: row.max_players,
        heroName: row.hero_name,
        heroPosition: row.hero_position,
        totalHands: row.total_hands,
        durationMinutes: row.duration_minutes,
        profit: row.profit,
        gtoAlignmentScore: row.gto_alignment,
        createdAt: row.created_at,
      } as PokerSession,
      analysis,
    }
  })

  // ============================================================
  // Get session review stats
  // ============================================================
  ipcMain.handle('session:getStats', async () => {
    const db = getDatabase()

    const stmt = db.prepare('SELECT * FROM sessions ORDER BY created_at ASC')
    const sessions: any[] = []
    while (stmt.step()) sessions.push(stmt.getAsObject())
    stmt.free()

    let totalHands = 0
    let totalAlignment = 0
    let totalEVLost = 0
    const alignmentTrend: { date: string; score: number }[] = []
    let topWeakness = '无数据'

    for (const s of sessions) {
      totalHands += s.total_hands || 0
      totalAlignment += s.gto_alignment || 0
      totalEVLost += s.gto_alignment ? (100 - s.gto_alignment) * 0.1 : 0
      alignmentTrend.push({
        date: s.date || new Date((s.created_at || 0) * 1000).toISOString().slice(0, 10),
        score: s.gto_alignment || 0,
      })

      try {
        const rawData = JSON.parse(s.raw_data || '{}')
        if (rawData.analysis?.weaknesses?.length > 0) {
          topWeakness = rawData.analysis.weaknesses[0].label || topWeakness
        }
      } catch { /* */ }
    }

    const stats: SessionReviewStats = {
      totalSessions: sessions.length,
      totalHands,
      averageAlignment: sessions.length > 0
        ? Math.round((totalAlignment / sessions.length) * 100) / 100
        : 0,
      totalEVLost: Math.round(totalEVLost * 100) / 100,
      topWeakness,
      alignmentTrend,
      weeklyImprovement: calculateWeeklyImprovement(sessions),
    }

    return stats
  })

  // ============================================================
  // Delete a session
  // ============================================================
  ipcMain.handle('session:delete', async (_event, params: { sessionId: string }) => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM sessions WHERE id = :id')
    stmt.bind({ ':id': params.sessionId })
    stmt.step()
    const deleted = db.getRowsModified()
    stmt.free()
    saveDatabase()
    return { deleted: deleted > 0 }
  })
}

// ============================================================
// Helpers
// ============================================================

function estimateDuration(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const diff = Math.max(0, end - start)
    return Math.round(diff / 60000) // minutes
  } catch {
    return 120 // default 2 hours
  }
}

function calculateWeeklyImprovement(sessions: any[]): number {
  if (sessions.length < 2) return 0

  // Group sessions by week
  const byWeek: Map<string, number[]> = new Map()
  for (const s of sessions) {
    const date = new Date((s.created_at || 0) * 1000)
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const diff = date.getTime() - startOfYear.getTime()
    const weekNum = Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7)
    const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
    const existing = byWeek.get(weekKey) || []
    existing.push(s.gto_alignment || 0)
    byWeek.set(weekKey, existing)
  }

  const weeks = Array.from(byWeek.entries()).sort()
  if (weeks.length < 2) return 0

  const firstWeekAvg = weeks[0][1].reduce((a, b) => a + b, 0) / weeks[0][1].length
  const lastWeekAvg = weeks[weeks.length - 1][1].reduce((a, b) => a + b, 0) / weeks[weeks.length - 1][1].length

  return Math.round((lastWeekAvg - firstWeekAvg) * 100) / 100
}
