import { ipcMain } from 'electron'
import {
  loadPreflopRange,
  preflopRangeToStrategy,
  listScenarios,
} from '../data/strategy-loader'
import { generateSamplePreflopData } from '../data/generate-sample-data'
import { generateSamplePostflopData } from '../data/generate-postflop-data'
import { solvePreflopRange } from '../solver/cfr-solver'
import { generatePostflopStrategy } from '../solver/postflop-engine'
import { analyzeTurn, analyzeRiver } from '../solver/turn-river-engine'
import { analyzeMultiWay } from '../solver/multiway-engine'
import { applyExploitAdjustments } from '../solver/opponent-exploit-engine'
import { getDatabase } from '../data/database'
import type { Position, GameType, ComboKey, OpponentTypeType } from '../../shared/types/poker'
import type { PreflopRange, StrategyData } from '../../shared/types/strategy'
import type { ScenarioSummary } from '../../shared/types/scenario'
import type { ExploitAdjustedStrategy } from '../solver/opponent-exploit-engine'

export function registerStrategyIpc(): void {
  ipcMain.handle(
    'strategy:getPreflopRange',
    (
      _event,
      params: {
        gameType: GameType
        position: Position
        stackDepth: number
      }
    ): { range: PreflopRange | null; strategy: StrategyData | null } => {
      const range = loadPreflopRange(params.gameType, params.position, params.stackDepth)
      if (!range) return { range: null, strategy: null }

      const strategy = preflopRangeToStrategy(range)
      return { range, strategy }
    }
  )

  ipcMain.handle(
    'strategy:getPostflopScenario',
    (
      _event,
      params: {
        gameType: GameType
        heroPosition: Position
        villainPosition: Position
        stackDepth: number
        board: string[]
        street: string
        actions: string
      }
    ): StrategyData | null => {
      const db = getDatabase()
      const boardStr = params.board.join(' ')
      const stmt = db.prepare(
        `SELECT s.id, st.data FROM scenarios s
         LEFT JOIN strategies st ON st.scenario_id = s.id
         WHERE s.game_type = :gt AND s.hero_position = :hp
         AND s.villain_position = :vp AND s.board = :board
         AND s.street = :street
         LIMIT 1`
      )
      stmt.bind({
        ':gt': params.gameType,
        ':hp': params.heroPosition,
        ':vp': params.villainPosition,
        ':board': boardStr,
        ':street': params.street,
      })

      try {
        if (!stmt.step()) {
          return null
        }

        const row = stmt.getAsObject()

        if (!row.data) return null
        return JSON.parse(row.data as string) as StrategyData
      } catch {
        return null
      } finally {
        stmt.free()
      }
    }
  )

  ipcMain.handle(
    'strategy:listScenarios',
    (
      _event,
      filters?: {
        gameType?: GameType
        heroPosition?: Position
        stackDepthMin?: number
        stackDepthMax?: number
      }
    ): ScenarioSummary[] => {
      return listScenarios(filters)
    }
  )

  ipcMain.handle('strategy:initSampleData', () => {
    try {
      generateSamplePreflopData()
      return { success: true, message: 'Sample preflop data generated' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('strategy:initPostflopData', () => {
    try {
      generateSamplePostflopData()
      return { success: true, message: 'Sample postflop data generated' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  })

  /** Turn analysis */
  ipcMain.handle('strategy:analyzeTurn', (_e, params: { flop: string[]; turn: string }) =>
    analyzeTurn(params.flop, params.turn))

  /** River analysis */
  ipcMain.handle('strategy:analyzeRiver', (_e, params: { turnBoard: string[]; river: string }) =>
    analyzeRiver(params.turnBoard, params.river))

  /** Multi-way analysis */
  ipcMain.handle('strategy:analyzeMultiWay', (_e, params: { board: string[]; positions: number[]; aggressor: number }) =>
    analyzeMultiWay(params.board, params.positions, params.aggressor))

  /** Postflop strategy analysis — now passes gameType and ante */
  ipcMain.handle(
    'strategy:analyzePostflop',
    (_event, params: {
      board: string[]
      heroPosition: number
      villainPosition: number
      stackDepth: number
      gameType?: GameType
      ante?: number
    }) => {
      return generatePostflopStrategy(
        params.board,
        params.heroPosition,
        params.villainPosition,
        params.stackDepth,
        params.gameType ?? 'cash',
        params.ante ?? 0
      )
    }
  )

  /** Solve preflop range on-demand using CFR — now with gameType and ante */
  ipcMain.handle(
    'strategy:solvePreflop',
    (
      _event,
      params: {
        position: number
        stackDepth: number
        gameType?: GameType
        ante?: number
        iterations?: number
      }
    ): Record<ComboKey, number> => {
      return solvePreflopRange(
        params.position,
        params.stackDepth,
        params.gameType ?? 'cash',
        params.ante ?? 0,
        params.iterations ?? 500
      )
    }
  )

  /** Cash vs MTT 策略对比 — 同一场景并行生成两种策略 */
  ipcMain.handle(
    'strategy:compareCashMtt',
    (
      _event,
      params: {
        board: string[]
        heroPosition: number
        villainPosition: number
        stackDepth: number
        ante?: number
      }
    ) => {
      const cash = generatePostflopStrategy(
        params.board, params.heroPosition, params.villainPosition,
        params.stackDepth, 'cash', 0
      )
      const tournament = generatePostflopStrategy(
        params.board, params.heroPosition, params.villainPosition,
        params.stackDepth, 'tournament', params.ante ?? 0
      )
      return { cash, tournament }
    }
  )

  /** 对手剥削调整 — 对 GTO 基线应用方向性偏移 */
  ipcMain.handle(
    'strategy:getExploitAdjustments',
    (
      _event,
      params: {
        board: string[]
        heroPosition: number
        villainPosition: number
        stackDepth: number
        opponentType: OpponentTypeType
      }
    ): ExploitAdjustedStrategy => {
      const gtoStrategy = generatePostflopStrategy(
        params.board, params.heroPosition, params.villainPosition,
        params.stackDepth, 'cash', 0
      )
      return applyExploitAdjustments(gtoStrategy, params.opponentType)
    }
  )

  ipcMain.handle(
    'strategy:getAvailableStackDepths',
    (_event, gameType: GameType, position: Position): number[] => {
      const db = getDatabase()
      const stmt = db.prepare(
        `SELECT DISTINCT stack_depth FROM preflop_ranges
         WHERE game_type = :gameType AND position = :position
         ORDER BY stack_depth`
      )
      stmt.bind({ ':gameType': gameType, ':position': position })

      const depths: number[] = []
      while (stmt.step()) {
        const row = stmt.getAsObject()
        depths.push(row.stack_depth as number)
      }
      stmt.free()
      return depths
    }
  )

  ipcMain.handle('strategy:getDataStats', () => {
    const db = getDatabase()
    const countTable = (table: string): number => {
      const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
      try {
        stmt.step()
        const row = stmt.getAsObject()
        return row.count as number
      } finally {
        stmt.free()
      }
    }
    return {
      preflopCount: countTable('preflop_ranges'),
      scenarioCount: countTable('scenarios'),
      strategyCount: countTable('strategies'),
    }
  })
}
