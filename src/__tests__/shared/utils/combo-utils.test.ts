import { describe, it, expect } from 'vitest'
import { generateAllCombos, ALL_COMBOS, COMBO_MAP, comboLabel, comboGridPosition, formatBoard, getBoardTexture } from '@shared/utils/combo-utils'

describe('generateAllCombos', () => {
  it('returns exactly 169 combos', () => {
    const combos = generateAllCombos()
    expect(combos).toHaveLength(169)
  })
})

describe('ALL_COMBOS', () => {
  it('has 169 entries', () => {
    expect(ALL_COMBOS).toHaveLength(169)
  })

  it('contains AA as first combo', () => {
    expect(ALL_COMBOS[0].key).toBe('AA')
    expect(ALL_COMBOS[0].pair).toBe(true)
  })

  it('contains AA, AKs, AKo, KK', () => {
    const keys = ALL_COMBOS.map(c => c.key)
    expect(keys).toContain('AA')
    expect(keys).toContain('AKs')
    expect(keys).toContain('AKo')
    expect(keys).toContain('KK')
    expect(keys).toContain('72o')
  })

  it('has exactly 13 pairs', () => {
    const pairs = ALL_COMBOS.filter(c => c.pair)
    expect(pairs).toHaveLength(13)
  })

  it('has exactly 78 suited combos', () => {
    const suited = ALL_COMBOS.filter(c => c.suited)
    expect(suited).toHaveLength(78)
  })
})

describe('COMBO_MAP', () => {
  it('has all 169 keys', () => {
    expect(Object.keys(COMBO_MAP)).toHaveLength(169)
  })

  it('has correct row/col for AA', () => {
    const aa = COMBO_MAP['AA']
    expect(aa.pair).toBe(true)
    expect(aa.row).toBe(0)
    expect(aa.col).toBe(0)
  })

  it('has correct info for AKs', () => {
    const aks = COMBO_MAP['AKs']
    expect(aks.suited).toBe(true)
    expect(aks.pair).toBe(false)
  })

  it('has correct info for 72o', () => {
    const sevenTwo = COMBO_MAP['72o']
    expect(sevenTwo.suited).toBe(false)
    expect(sevenTwo.pair).toBe(false)
  })
})

describe('comboLabel', () => {
  it('returns AA for AA', () => {
    expect(comboLabel('AA')).toBe('AA')
  })

  it('returns AKs for AKs', () => {
    expect(comboLabel('AKs')).toBe('AKs')
  })

  it('returns AKo for AKo', () => {
    expect(comboLabel('AKo')).toBe('AKo')
  })

  it('returns the key for unknown combo', () => {
    expect(comboLabel('unknown' as any)).toBe('unknown')
  })
})

describe('comboGridPosition', () => {
  it('returns row=0 col=0 for AA', () => {
    const pos = comboGridPosition('AA')
    expect(pos).toEqual({ row: 0, col: 0 })
  })

  it('returns position for AKs', () => {
    const pos = comboGridPosition('AKs')
    expect(pos).not.toBeNull()
    expect(pos!.row).toBe(0) // A
    expect(pos!.col).toBe(1) // K
  })

  it('returns null for unknown key', () => {
    expect(comboGridPosition('ZZ' as any)).toBeNull()
  })
})

describe('formatBoard', () => {
  it('returns "Preflop" for empty board', () => {
    expect(formatBoard([])).toBe('Preflop')
  })

  it('joins cards with space', () => {
    expect(formatBoard(['As', '7d', '2c'])).toBe('As 7d 2c')
  })

  it('handles single card', () => {
    expect(formatBoard(['Ah'])).toBe('Ah')
  })
})

describe('getBoardTexture', () => {
  it('returns preflop for empty board', () => {
    expect(getBoardTexture([])).toBe('preflop')
  })

  it('returns paired for paired board', () => {
    expect(getBoardTexture(['Ah', 'Ad', 'Ks'])).toBe('paired')
  })

  it('returns monotone for monotone board', () => {
    expect(getBoardTexture(['Ah', 'Kh', 'Th'])).toBe('monotone')
  })

  it('returns two-tone for two-tone board', () => {
    const texture = getBoardTexture(['Ah', 'Kh', 'Qd'])
    expect(texture).toMatch(/two-tone/)
  })

  it('returns rainbow for rainbow board', () => {
    expect(getBoardTexture(['As', '7d', '2c'])).toBe('rainbow dry')
  })

  it('returns rainbow high for K-high rainbow', () => {
    expect(getBoardTexture(['Kh', '8d', '3c'])).toBe('rainbow dry')
  })
})
