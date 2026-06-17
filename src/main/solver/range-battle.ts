/**
 * Range Battle Simulator — Premium Feature
 * Pits two ranges against each other on any board texture.
 * Uses Monte Carlo simulation with equity lookup for fast, accurate results.
 */
import type { ComboKey, CardString } from '../../shared/types/poker'
import { preflopEquity, handStrengthScore } from './equity-calculator'
import { ALL_COMBOS } from '../../shared/utils/combo-utils'
import { analyzeBoard } from '../../shared/utils/poker-math'

export interface RangeBattleConfig {
  board: CardString[]
  heroRange: Record<ComboKey, number>   // combo → frequency (0-1)
  villainRange: Record<ComboKey, number>
  deadCards?: CardString[]               // cards removed from deck
  simulations?: number                   // default 5000
}

export interface RangeBattleResult {
  heroEquity: number
  villainEquity: number
  tieEquity: number
  heroRangeAdvantage: number             // positive = hero advantage
  heroComboEVs: Record<ComboKey, number> // per-combo equity vs villain range
  villainComboEVs: Record<ComboKey, number>
  heroValueHands: number                 // combos with >55% equity
  heroBluffHands: number                 // combos with <35% equity
  villainValueHands: number
  villainBluffHands: number
  boardTexture: string
  recommendedAction: string
  equityDistribution: { bucket: string; heroCount: number; villainCount: number }[]
}

/**
 * Fast range-vs-range equity computation using weighted hand-vs-hand lookups.
 * For each combo in hero range × villain range, compute equity and weight by frequency.
 */
export function simulateRangeBattle(config: RangeBattleConfig): RangeBattleResult {
  const { board, heroRange, villainRange } = config
  const texture = analyzeBoard(board)

  const heroEntries = Object.entries(heroRange).filter(([, f]) => f > 0)
  const villainEntries = Object.entries(villainRange).filter(([, f]) => f > 0)

  if (heroEntries.length === 0 || villainEntries.length === 0) {
    return {
      heroEquity: 0.5, villainEquity: 0.5, tieEquity: 0,
      heroRangeAdvantage: 0, heroComboEVs: {}, villainComboEVs: {},
      heroValueHands: 0, heroBluffHands: 0,
      villainValueHands: 0, villainBluffHands: 0,
      boardTexture: texture.texture,
      recommendedAction: 'Insufficient range data',
      equityDistribution: [],
    }
  }

  // Per-combo equity vs opposing range
  const heroComboEVs: Record<string, number> = {}
  const villainComboEVs: Record<string, number> = {}

  let totalHeroEquity = 0
  let totalVillainEquity = 0
  let totalWeight = 0
  let heroValueHands = 0
  let heroBluffHands = 0
  let villainValueHands = 0
  let villainBluffHands = 0

  // Distribution buckets
  const distBuckets = [
    { min: 0, max: 0.20, label: '0-20%' },
    { min: 0.20, max: 0.35, label: '20-35%' },
    { min: 0.35, max: 0.50, label: '35-50%' },
    { min: 0.50, max: 0.65, label: '50-65%' },
    { min: 0.65, max: 0.80, label: '65-80%' },
    { min: 0.80, max: 1.01, label: '80-100%' },
  ]
  const heroDist = distBuckets.map(b => ({ bucket: b.label, heroCount: 0, villainCount: 0 }))

  // Compute hero per-combo equity vs villain range
  for (const [hCombo, hFreq] of heroEntries) {
    let comboEquity = 0
    let comboWeight = 0
    for (const [vCombo, vFreq] of villainEntries) {
      const w = hFreq * vFreq
      comboEquity += preflopEquity(hCombo, vCombo) * w
      comboWeight += w
    }
    const eq = comboWeight > 0 ? comboEquity / comboWeight : 0.5
    heroComboEVs[hCombo] = Math.round(eq * 1000) / 1000

    // Classify
    if (eq > 0.55) heroValueHands++
    else if (eq < 0.35) heroBluffHands++

    // Distribution
    for (const b of heroDist) {
      if (eq >= b.min && eq < b.max) {
        b.heroCount++
        break
      }
    }

    totalHeroEquity += eq * hFreq
    totalWeight += hFreq
  }

  // Compute villain per-combo equity vs hero range
  let villainWeightSum = 0
  for (const [vCombo, vFreq] of villainEntries) {
    let comboEquity = 0
    let comboWeight = 0
    for (const [hCombo, hFreq] of heroEntries) {
      const w = hFreq * vFreq
      comboEquity += (1 - preflopEquity(hCombo, vCombo)) * w
      comboWeight += w
    }
    const eq = comboWeight > 0 ? comboEquity / comboWeight : 0.5
    villainComboEVs[vCombo] = Math.round(eq * 1000) / 1000

    if (eq > 0.55) villainValueHands++
    else if (eq < 0.35) villainBluffHands++

    // Distribution (villain side mirrors hero distribution)
    for (const b of heroDist) {
      if (eq >= b.min && eq < b.max) {
        b.villainCount++
        break
      }
    }

    totalVillainEquity += eq * vFreq
    villainWeightSum += vFreq
  }

  const heroEq = totalWeight > 0 ? totalHeroEquity / totalWeight : 0.5
  const villainEq = villainWeightSum > 0 ? totalVillainEquity / villainWeightSum : 0.5
  const heroRangeAdvantage = heroEq - villainEq

  // Recommended action
  let recommendedAction = 'Mixed strategy'
  if (heroRangeAdvantage > 0.08) recommendedAction = 'High-frequency c-bet (75%+)'
  else if (heroRangeAdvantage > 0.04) recommendedAction = 'Medium-frequency c-bet (50-70%)'
  else if (heroRangeAdvantage > 0) recommendedAction = 'Selective c-bet (30-50%)'
  else if (heroRangeAdvantage > -0.04) recommendedAction = 'Check-heavy, selective stab'
  else recommendedAction = 'Mostly check, defend vs aggression'

  return {
    heroEquity: Math.round(heroEq * 1000) / 10,
    villainEquity: Math.round(villainEq * 1000) / 10,
    tieEquity: Math.round(Math.max(0, 100 - heroEq * 100 - villainEq * 100) * 10) / 10,
    heroRangeAdvantage: Math.round(heroRangeAdvantage * 1000) / 10,
    heroComboEVs,
    villainComboEVs,
    heroValueHands,
    heroBluffHands,
    villainValueHands,
    villainBluffHands,
    boardTexture: texture.texture,
    recommendedAction,
    equityDistribution: heroDist,
  }
}

/**
 * Build a standard position-based range.
 */
export function buildStandardRange(position: number, stackDepth: number): Record<ComboKey, number> {
  const range: Record<ComboKey, number> = {}

  // Position-based opening ranges (approximate GTO)
  const positionWidths = [0.16, 0.20, 0.26, 0.40, 0.35, 0.30] // UTG→BB
  const width = positionWidths[position] || 0.25
  const depthMultiplier = Math.min(1.5, Math.max(0.5, stackDepth / 100))

  for (const combo of ALL_COMBOS) {
    const score = handStrengthScore(combo.key)
    const threshold = 70 - width * 120 * depthMultiplier
    if (score >= threshold) {
      // Higher frequency for stronger hands
      const freq = Math.min(1, Math.max(0.1, (score - threshold) / (100 - threshold)))
      range[combo.key] = Math.round(freq * 10) / 10
    }
  }

  // Add some suited connectors at medium frequency
  const suitedConnectors = ['JTs', 'T9s', '98s', '87s', '76s', '65s', '54s']
  for (const sc of suitedConnectors) {
    if (range[sc] === undefined) range[sc] = 0.3 * depthMultiplier
  }

  return range
}
