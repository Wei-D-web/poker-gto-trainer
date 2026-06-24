/**
 * Supabase Strategy Data Service — Web-only.
 *
 * Fetches pre-computed GTO preset strategies from Supabase
 * (preset_strategies + strategy_combos tables) with localStorage caching.
 *
 * Desktop/Electron continues to use SQLite via IPC (unchanged).
 */

import { supabase } from '../contexts/AuthContext'
import type { ComboKey, CardString } from '@shared/types/poker'

// ============================================================
// Local type definitions (compatible with PostflopResult
// from src/main/solver/postflop-engine.ts, avoiding cross-project imports)
// ============================================================

interface PostflopAction {
  action: string
  frequency: number
  ev: number
}

interface PostflopComboStrategy {
  comboKey: ComboKey
  handType: string
  actions: PostflopAction[]
  weight: number
  equity: number
}

interface PostflopResult {
  board: CardString[]
  texture: string
  description: string
  heroPosition: number
  villainPosition: number
  isHeroIP: boolean
  recommendedSizing: string
  overallCbetFreq: number
  combos: PostflopComboStrategy[]
}

// ============================================================
// Types
// ============================================================

export interface PresetStrategyRow {
  id: string
  board: string
  texture: string
  hero_position: number
  villain_position: number
  stack_depth: number
  game_type: string
  description: string
  hero_ev: number
  villain_ev: number
  hero_equity: number
  recommended_sizing: string
  overall_cbet_freq: number
}

export interface StrategyComboRow {
  id: string
  strategy_id: string
  hand: string
  hand_type: string
  weight: number
  equity: number
  action: string
  frequency: number
  ev: number
}

export interface PresetCategory {
  label: string
  accent: string
  flops: { board: string[]; texture: string; description: string }[]
}

// ============================================================
// Cache helpers
// ============================================================

const CACHE_PREFIX = 'poker_gto_'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry<T> {
  data: T
  timestamp: number
}

function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage full or unavailable — silent degrade
  }
}

// ============================================================
// Data fetching
// ============================================================

/**
 * Fetch all preset strategies from Supabase.
 * Cached in localStorage for 24h.
 */
export async function fetchPresetStrategies(): Promise<PresetStrategyRow[]> {
  const cacheKey = 'preset_strategies'

  // Check cache first
  const cached = getCache<PresetStrategyRow[]>(cacheKey)
  if (cached) return cached

  if (!supabase) {
    console.warn('Supabase not configured — cannot fetch preset strategies')
    return []
  }

  const { data, error } = await supabase
    .from('preset_strategies')
    .select('*')
    .order('board')

  if (error) {
    console.error('Failed to fetch preset strategies:', error.message)
    return []
  }

  const rows = data as PresetStrategyRow[]
  setCache(cacheKey, rows)
  return rows
}

/**
 * Fetch all combos for a given strategy.
 * Cached in localStorage for 24h.
 */
export async function fetchStrategyCombos(strategyId: string): Promise<StrategyComboRow[]> {
  const cacheKey = `strategy_combos_${strategyId}`

  const cached = getCache<StrategyComboRow[]>(cacheKey)
  if (cached) return cached

  if (!supabase) return []

  // Fetch in pages (Supabase default page size is 1000, we need all combos)
  let allCombos: StrategyComboRow[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('strategy_combos')
      .select('*')
      .eq('strategy_id', strategyId)
      .range(from, from + pageSize - 1)

    if (error) {
      console.error(`Failed to fetch combos for ${strategyId}:`, error.message)
      return []
    }

    if (!data || data.length === 0) break
    allCombos = allCombos.concat(data as StrategyComboRow[])
    if (data.length < pageSize) break
    from += pageSize
  }

  setCache(cacheKey, allCombos)
  return allCombos
}

/**
 * Fetch a complete strategy (metadata + combos) for a specific scenario.
 * Returns data in PostflopResult shape for compatibility with PostflopAnalysis.
 */
export async function fetchCompleteStrategy(
  board: string,
  heroPosition: number,
  villainPosition: number,
  stackDepth: number,
): Promise<PostflopResult | null> {
  if (!supabase) return null

  const cacheKey = `complete_strategy_${board}_${heroPosition}_${villainPosition}_${stackDepth}`
  const cached = getCache<PostflopResult>(cacheKey)
  if (cached) return cached

  // Fetch strategy metadata
  const { data: stratData, error: stratErr } = await supabase
    .from('preset_strategies')
    .select('*')
    .eq('board', board)
    .eq('hero_position', heroPosition)
    .eq('villain_position', villainPosition)
    .eq('stack_depth', stackDepth)
    .single()

  if (stratErr || !stratData) {
    console.error('Strategy not found:', stratErr?.message)
    return null
  }

  const strategy = stratData as PresetStrategyRow

  // Fetch combos
  const comboRows = await fetchStrategyCombos(strategy.id)
  if (comboRows.length === 0) return null

  // Group by hand — build PostflopComboStrategy[]
  const comboMap = new Map<ComboKey, { handType: string; actions: PostflopAction[]; weight: number; equity: number }>()
  for (const row of comboRows) {
    if (!comboMap.has(row.hand as ComboKey)) {
      comboMap.set(row.hand as ComboKey, {
        handType: row.hand_type || 'air',
        actions: [],
        weight: row.weight,
        equity: row.equity,
      })
    }
    const combo = comboMap.get(row.hand as ComboKey)!
    combo.actions.push({
      action: row.action,
      frequency: row.frequency,
      ev: row.ev,
    })
  }

  const combos: PostflopComboStrategy[] = Array.from(comboMap.entries()).map(([key, c]) => ({
    comboKey: key,
    handType: c.handType,
    actions: c.actions,
    weight: c.weight,
    equity: c.equity,
  }))

  // Compute isHeroIP (same logic as postflop-engine)
  const isHeroIP = heroPosition === 3 || (heroPosition > villainPosition && villainPosition !== 3)

  const result: PostflopResult = {
    board: strategy.board.split(' ') as any,
    texture: (strategy as any).texture || '',
    description: strategy.description,
    heroPosition,
    villainPosition,
    isHeroIP,
    recommendedSizing: strategy.recommended_sizing,
    overallCbetFreq: strategy.overall_cbet_freq,
    combos,
  }

  setCache(cacheKey, result)
  return result
}

/**
 * Fetch preset flop categories (grouped by texture type).
 * Used by PresetSolutionsPanel to display the flop grid.
 */
export async function fetchPresetCategories(): Promise<PresetCategory[]> {
  const cacheKey = 'preset_categories'
  const cached = getCache<PresetCategory[]>(cacheKey)
  if (cached) return cached

  const strategies = await fetchPresetStrategies()
  if (strategies.length === 0) return []

  // Deduplicate by board+description, group by texture category
  const seen = new Set<string>()
  const groups: Record<string, PresetCategory['flops']> = {
    'A-High': [],
    'Broadway': [],
    'Paired': [],
    'Monotone': [],
    'Connected': [],
    'Low / Dry': [],
  }

  for (const s of strategies) {
    const key = s.board
    if (seen.has(key)) continue
    seen.add(key)

    const flop = {
      board: s.board.split(' '),
      texture: s.texture,
      description: s.description,
    }

    // Categorize
    if (s.board.startsWith('A')) {
      groups['A-High'].push(flop)
    } else if (s.texture.includes('broadway')) {
      groups['Broadway'].push(flop)
    } else if (s.texture.includes('paired') || s.texture === 'paired') {
      groups['Paired'].push(flop)
    } else if (s.texture.includes('monotone')) {
      groups['Monotone'].push(flop)
    } else if (s.texture.includes('connected')) {
      groups['Connected'].push(flop)
    } else {
      groups['Low / Dry'].push(flop)
    }
  }

  const result: PresetCategory[] = [
    { label: 'A-High', accent: 'text-red-400', flops: groups['A-High'] },
    { label: 'Broadway', accent: 'text-purple-400', flops: groups['Broadway'] },
    { label: 'Paired', accent: 'text-amber-400', flops: groups['Paired'] },
    { label: 'Monotone', accent: 'text-emerald-400', flops: groups['Monotone'] },
    { label: 'Connected', accent: 'text-blue-400', flops: groups['Connected'] },
    { label: 'Low / Dry', accent: 'text-neutral-400', flops: groups['Low / Dry'] },
  ].filter(c => c.flops.length > 0)

  setCache(cacheKey, result)
  return result
}

/**
 * Check if the app is running in web mode (not Electron).
 */
export function isWebMode(): boolean {
  return (window as any).electronAPI === undefined
}
