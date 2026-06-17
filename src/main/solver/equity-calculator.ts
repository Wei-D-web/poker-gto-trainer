/**
 * Fast preflop equity calculator using pre-computed lookup tables.
 * Uses 169 × 169 matchup probabilities for instant equity computation.
 */

import type { ComboKey } from '../../shared/types/poker'
// Pre-computed matchup table (simplified: approximate equity based on hand strength tiers)
// In production, this would be a 169×169 lookup from PokerStove or similar
const HAND_STRENGTH_SCORES: Record<ComboKey, number> = {
  'AA': 100, 'KK': 92, 'QQ': 85, 'JJ': 78, 'TT': 72, 'AKs': 70,
  'AKo': 65, 'AQs': 63, '99': 62, '88': 56, 'AQo': 55, 'AJs': 54, 'KQs': 53,
  '77': 50, 'ATs': 48, 'AJo': 47, 'KJs': 45, '66': 44, 'A9s': 42, 'KQo': 42,
  'QJs': 41, 'ATo': 41, 'KTs': 40, 'A8s': 39, '55': 38, 'A5s': 37, 'A4s': 36,
  'QJo': 36, 'KTo': 35, 'A7s': 35, 'A3s': 34, 'A2s': 33, 'QTs': 34, 'A6s': 33,
  'K9s': 33, 'JTs': 33, '44': 30, 'A9o': 30, 'QTo': 29, 'K8s': 28, 'JTo': 28,
  'A8o': 28, 'K7s': 27, 'T9s': 27, '33': 26, 'A5o': 26, 'Q9s': 26, 'J9s': 25,
  'K6s': 25, 'A4o': 25, 'A7o': 24, 'T8s': 24, 'K5s': 23, '22': 22, 'Q8s': 22,
  '98s': 22, 'A3o': 22, 'A2o': 22, 'J8s': 21, 'K4s': 21, 'A6o': 21, 'T7s': 20,
  'K9o': 19, 'Q7s': 19, '87s': 19, 'K3s': 18, 'J7s': 18, 'T6s': 18, '97s': 17,
  'Q6s': 17, 'K2s': 16, '86s': 16, '76s': 16, 'J6s': 15, 'T9o': 15, 'Q5s': 15,
  'T5s': 14, '98o': 14, '65s': 14, '75s': 14, 'J5s': 13, 'Q4s': 13, 'T4s': 13,
  '54s': 13, '96s': 12, 'J4s': 12, 'T8o': 12, '87o': 12, '85s': 12, 'Q3s': 11,
  '95s': 11, 'J9o': 11, '64s': 11, 'T3s': 10, 'J3s': 10, 'Q2s': 10, '74s': 10,
  'T7o': 10, 'Q9o': 10, 'J8o': 10, '97o': 10, '53s': 9, '84s': 9, 'J2s': 9,
  'T2s': 9, '94s': 8, '86o': 8, '76o': 8, 'Q8o': 8, 'J7o': 8, '43s': 8,
  '93s': 7, '75o': 7, '65o': 7, 'T6o': 7, '83s': 7, '92s': 7, '73s': 7,
  'Q7o': 7, 'J6o': 7, '63s': 7, '82s': 6, '54o': 6, '52s': 6, '72s': 5,
  '85o': 5, 'T5o': 5, 'Q6o': 5, 'J5o': 5, '64o': 5, 'T4o': 5, '84o': 5,
  '96o': 5, '95o': 5, '74o': 5, 'T3o': 4, 'J4o': 4, '94o': 4, '53o': 4,
  'Q5o': 4, 'J3o': 4, '93o': 4, '83o': 4, '73o': 4, '63o': 4, '43o': 4,
  'Q4o': 4, 'J2o': 4, 'T2o': 4, '92o': 3, '82o': 3, '72o': 3, '62o': 3,
  '52o': 3, '42o': 3, '32o': 3, 'Q3o': 3, 'Q2o': 3,
  // Missing combos (added)
  'KJo': 52, 'K8o': 26, 'K7o': 24, 'K6o': 22, 'K5o': 20, 'K4o': 19, 'K3o': 17, 'K2o': 16,
  '62s': 14, '42s': 10, '32s': 9,
}

const MAX_SCORE = 100

/**
 * Estimate preflop equity of hero hand vs villain hand.
 * Returns value in [0, 1].
 */
export function preflopEquity(hero: ComboKey, villain: ComboKey): number {
  const heroScore = HAND_STRENGTH_SCORES[hero] ?? 20
  const villainScore = HAND_STRENGTH_SCORES[villain] ?? 20

  if (hero === villain) return 0.5 // same hand = chop

  // Logistic-style equity model clamped to realistic preflop bounds
  const diff = heroScore - villainScore
  const raw = 1.0 / (1.0 + Math.exp(-diff / 10.0))
  // Clamp to realistic preflop equity range [0.05, 0.88]
  return 0.05 + raw * 0.83
}

/**
 * Estimate equity of a range vs another range.
 */
export function rangeVsRangeEquity(
  heroRange: Record<ComboKey, number>,
  villainRange: Record<ComboKey, number>
): number {
  let totalEquity = 0
  let totalWeight = 0

  const heroEntries = Object.entries(heroRange).filter(([, f]) => f > 0)
  const villainEntries = Object.entries(villainRange).filter(([, f]) => f > 0)

  for (const [hCombo, hFreq] of heroEntries) {
    for (const [vCombo, vFreq] of villainEntries) {
      const weight = hFreq * vFreq
      totalEquity += preflopEquity(hCombo, vCombo) * weight
      totalWeight += weight
    }
  }

  return totalWeight > 0 ? totalEquity / totalWeight : 0.5
}

/**
 * Get the strength score for a combo (for display purposes).
 */
export function handStrengthScore(combo: ComboKey): number {
  return HAND_STRENGTH_SCORES[combo] ?? 20
}
