import { getDatabase, saveDatabase } from './database'
import { LRUCache } from 'lru-cache'
import type { PreflopRange, ComboStrategy, StrategyData } from '../../shared/types/strategy'
import type { ScenarioSummary } from '../../shared/types/scenario'
import type { Position, GameType } from '../../shared/types/poker'
import { POSITION_LABELS } from '../../shared/types/poker'
import { generateAllCombos, type ComboInfo } from '../../shared/utils/combo-utils'

// Cache for preflop ranges and strategies
const preflopCache = new LRUCache<string, PreflopRange>({ max: 500 })
const strategyCache = new LRUCache<string, StrategyData>({ max: 200 })

/** Load a preflop range by position, stack depth, and game type */
export function loadPreflopRange(
  gameType: GameType,
  position: Position,
  stackDepth: number
): PreflopRange | null {
  const cacheKey = `${gameType}_${position}_${stackDepth}`
  const cached = preflopCache.get(cacheKey)
  if (cached) return cached

  const db = getDatabase()
  const stmt = db.prepare(
    `SELECT * FROM preflop_ranges
     WHERE game_type = :gameType AND position = :position
     ORDER BY ABS(stack_depth - :stackDepth) LIMIT 1`
  )
  stmt.bind({ ':gameType': gameType, ':position': position, ':stackDepth': stackDepth })

  if (!stmt.step()) {
    stmt.free()
    return null
  }

  const row = stmt.getAsObject()
  stmt.free()

  const range: PreflopRange = {
    id: row.id as string,
    gameType: row.game_type as 'cash' | 'tournament',
    position: row.position as number,
    stackDepth: row.stack_depth as number,
    ante: row.ante as number,
    combos: JSON.parse(row.range_data as string),
    metadata: JSON.parse(row.metadata as string),
  }

  preflopCache.set(cacheKey, range)
  return range
}

/** Convert preflop range to strategy data format */
export function preflopRangeToStrategy(range: PreflopRange): StrategyData {
  const allCombos = generateAllCombos()
  const combos: ComboStrategy[] = allCombos.map((combo: ComboInfo) => {
    const frequency = range.combos[combo.key] ?? 0
    const isInRange = frequency > 0

    return {
      comboKey: combo.key,
      actions: isInRange
        ? [
            { action: 'raise', frequency, ev: 0.05 * frequency },
            { action: 'fold', frequency: 1 - frequency, ev: 0 },
          ]
        : [{ action: 'fold', frequency: 1, ev: 0 }],
      equity: isInRange ? 0.5 : 0,
      weight: frequency,
      ev: isInRange ? 0.05 * frequency : 0,
    }
  })

  const inRangeCombos = combos.filter(c => c.weight > 0)
  const totalWeight = inRangeCombos.reduce((sum, c) => sum + c.weight, 0)

  return {
    scenarioId: range.id,
    combos,
    heroEV: totalWeight > 0
      ? inRangeCombos.reduce((s, c) => s + c.ev * c.weight, 0) / totalWeight
      : 0,
    villainEV: 0,
    heroEquity: 0.5,
    metadata: {
      solverVersion: 'community-data-v1',
      convergence: 0,
      totalIterations: 0,
      solvedDate: '2024-01-01',
      source: range.metadata.source || 'community',
    },
  }
}

/** Get a list of available scenarios for browsing */
export function listScenarios(filters?: {
  gameType?: GameType
  heroPosition?: Position
  stackDepthMin?: number
  stackDepthMax?: number
}): ScenarioSummary[] {
  const db = getDatabase()

  let query = `SELECT id, game_type, hero_position, effective_stack, street, board, metadata FROM scenarios WHERE 1=1`
  const params: Record<string, unknown> = {}

  if (filters?.gameType) {
    query += ` AND game_type = :gameType`
    params[':gameType'] = filters.gameType
  }
  if (filters?.heroPosition !== undefined) {
    query += ` AND hero_position = :heroPos`
    params[':heroPos'] = filters.heroPosition
  }
  if (filters?.stackDepthMin !== undefined) {
    query += ` AND effective_stack >= :minStack`
    params[':minStack'] = filters.stackDepthMin
  }
  if (filters?.stackDepthMax !== undefined) {
    query += ` AND effective_stack <= :maxStack`
    params[':maxStack'] = filters.stackDepthMax
  }

  query += ` ORDER BY effective_stack, hero_position LIMIT 200`

  const stmt = db.prepare(query)
  stmt.bind(params)

  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()

  return rows.map(row => {
    const metadata = JSON.parse((row.metadata as string) || '{}')
    return {
      id: row.id as string,
      label: metadata.label || `${POSITION_LABELS[row.hero_position as Position]} ${row.effective_stack}bb`,
      gameType: row.game_type as GameType,
      heroPosition: row.hero_position as Position,
      effectiveStack: row.effective_stack as number,
      street: row.street as string,
      board: (row.board as string) ? (row.board as string).split(' ') : [],
      potType: metadata.potType || 'SRP',
      description: metadata.label || '',
    }
  })
}

/** Clear all caches */
export function clearCaches(): void {
  preflopCache.clear()
  strategyCache.clear()
}
