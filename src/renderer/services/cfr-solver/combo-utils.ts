/**
 * Combo Utilities — Generate all 169 hand combos
 * Adapted from PokerGTO's shared/utils/combo-utils.ts for standalone use.
 */
import { ALL_RANKS, RANK_CHARS, type ComboInfo, type ComboKey } from './types'

export function generateAllCombos(): ComboInfo[] {
  const combos: ComboInfo[] = []
  const ranks = ALL_RANKS

  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const rank1 = ranks[row]
      const rank2 = ranks[col]
      const pair = rank1 === rank2

      let key: ComboKey
      let suited: boolean

      if (pair) {
        key = `${RANK_CHARS[rank1]}${RANK_CHARS[rank2]}`
        suited = false
      } else if (row < col) {
        key = `${RANK_CHARS[rank1]}${RANK_CHARS[rank2]}s`
        suited = true
      } else {
        key = `${RANK_CHARS[rank2]}${RANK_CHARS[rank1]}o`
        suited = false
      }

      combos.push({ key, rank1, rank2, suited, pair, row, col })
    }
  }
  return combos
}

export const ALL_COMBOS: ComboInfo[] = generateAllCombos()
