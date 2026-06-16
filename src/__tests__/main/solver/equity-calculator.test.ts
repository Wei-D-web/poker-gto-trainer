import { describe, it, expect } from 'vitest'
import { preflopEquity, rangeVsRangeEquity, handStrengthScore } from '../../../main/solver/equity-calculator'

describe('preflopEquity', () => {
  it('AA vs KK — AA should dominate', () => {
    const equity = preflopEquity('AA', 'KK')
    expect(equity).toBeGreaterThan(0.5)
    expect(equity).toBeLessThan(1)
  })

  it('72o vs AA — 72o should be crushed', () => {
    const equity = preflopEquity('72o', 'AA')
    expect(equity).toBeLessThan(0.5)
  })

  it('AA vs AA — same hand returns exactly 0.5', () => {
    expect(preflopEquity('AA', 'AA')).toBe(0.5)
  })

  it('AKs vs QQ — close to 50%', () => {
    const equity = preflopEquity('AKs', 'QQ')
    expect(equity).toBeCloseTo(0.5, 0)
  })

  it('AKs vs 72o — AKs dominates', () => {
    const equity = preflopEquity('AKs', '72o')
    expect(equity).toBeGreaterThan(0.5)
  })

  it('returns value in [0, 1] for all known combos', () => {
    const combos = ['AA', 'KK', 'QQ', 'AKs', '72o', 'JTo', '22']
    for (const h of combos) {
      for (const v of combos) {
        const eq = preflopEquity(h, v)
        expect(eq).toBeGreaterThanOrEqual(0)
        expect(eq).toBeLessThanOrEqual(1)
      }
    }
  })

  it('unknown combos default to score 20', () => {
    const equity = preflopEquity('ZZ' as any, 'AA')
    // Should be < 0.5 since AA is way stronger than default score 20
    expect(equity).toBeLessThan(0.5)
  })
})

describe('rangeVsRangeEquity', () => {
  it('identical ranges return 0.5', () => {
    const range = { 'AA': 1, 'KK': 1 }
    const equity = rangeVsRangeEquity(range, range)
    expect(equity).toBeCloseTo(0.5, 0)
  })

  it('stronger range has higher equity', () => {
    const strongRange = { 'AA': 1 }
    const weakRange = { '72o': 1 }
    const equity = rangeVsRangeEquity(strongRange, weakRange)
    expect(equity).toBeGreaterThan(0.5)
  })

  it('handles empty ranges', () => {
    const equity = rangeVsRangeEquity({}, {})
    expect(equity).toBe(0.5)
  })

  it('handles weighted ranges', () => {
    const range = { 'AA': 0.5, 'KK': 0.5 }
    const equity = rangeVsRangeEquity(range, range)
    expect(equity).toBeCloseTo(0.5, 0)
  })
})

describe('handStrengthScore', () => {
  it('AA has highest score (100)', () => {
    expect(handStrengthScore('AA')).toBe(100)
  })

  it('72o has lowest score (3)', () => {
    expect(handStrengthScore('72o')).toBe(3)
  })

  it('AKs has score 70', () => {
    expect(handStrengthScore('AKs')).toBe(70)
  })

  it('unknown combo returns default 20', () => {
    expect(handStrengthScore('ZZ' as any)).toBe(20)
  })

  it('premium hands have higher scores than weak hands', () => {
    expect(handStrengthScore('AA')).toBeGreaterThan(handStrengthScore('KK'))
    expect(handStrengthScore('KK')).toBeGreaterThan(handStrengthScore('QQ'))
    expect(handStrengthScore('AKs')).toBeGreaterThan(handStrengthScore('JTo'))
    expect(handStrengthScore('JTo')).toBeGreaterThan(handStrengthScore('72o'))
  })
})
