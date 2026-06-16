import { describe, it, expect } from 'vitest'
import { applyNodeLocks } from '../../../main/solver/node-locker'
import type { NodeLock } from '../../../main/solver/node-locker'

// ============================================================
// Node Locker — scope bug fix + core behavior
// ============================================================

// Build a minimal base strategy for testing
function makeBaseStrategy(): Record<string, { actions: Array<{ action: string; frequency: number; ev: number }>; equity: number; weight: number }> {
  const base: Record<string, any> = {}
  const combos = ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'AQs', '72o']
  for (const key of combos) {
    base[key] = {
      actions: [
        { action: 'bet_50', frequency: 0.6, ev: 0.5 },
        { action: 'check', frequency: 0.4, ev: 0.2 },
      ],
      equity: 0.5,
      weight: 1.0,
    }
  }
  return base
}

describe('applyNodeLocks', () => {
  it('locks a combo to a specific action', () => {
    const base = makeBaseStrategy()
    const locks: NodeLock[] = [
      { comboKey: 'AA', action: 'bet_large', frequency: 1.0 },
    ]
    const result = applyNodeLocks(base, locks, ['Ah', '7d', '2c'], true)
    expect(result.lockedCombos.length).toBe(1)
    // AA should be locked
    const aa = result.adjustedStrategy['AA']
    expect(aa?.isLocked).toBe(true)
    expect(aa?.actions[0]?.action).toBe('bet_75') // bet_large → bet_75
  })

  it('unlocked combos should not be locked', () => {
    const base = makeBaseStrategy()
    const locks: NodeLock[] = [
      { comboKey: 'AA', action: 'fold', frequency: 1.0 },
    ]
    const result = applyNodeLocks(base, locks, ['Ah', '7d', '2c'], true)
    const kk = result.adjustedStrategy['KK']
    expect(kk?.isLocked).toBe(false)
  })

  // Bug fix: locksAreAggressive/Passive should be in scope for summary
  it('summary reports correct strategy shift for aggressive locks', () => {
    const base = makeBaseStrategy()
    const locks: NodeLock[] = [
      { comboKey: 'AA', action: 'bet_large', frequency: 1.0 },
      { comboKey: 'KK', action: 'bet_medium', frequency: 0.8 },
      { comboKey: 'QQ', action: 'raise', frequency: 0.5 },
    ]
    const result = applyNodeLocks(base, locks, ['Ah', '7d', '2c'], true)
    // Aggressive locks (bet/raise) > 50% → strategy should shift aggressive
    expect(result.summary.strategyShift).toBe('更激进')
    expect(result.summary.totalLocked).toBe(3)
  })

  it('summary reports correct strategy shift for passive locks', () => {
    const base = makeBaseStrategy()
    const locks: NodeLock[] = [
      { comboKey: 'AA', action: 'fold', frequency: 1.0 },
      { comboKey: 'KK', action: 'check', frequency: 0.5 },
    ]
    const result = applyNodeLocks(base, locks, ['Ah', '7d', '2c'], true)
    // Passive locks (fold/check) > 50% → strategy should shift passive
    expect(result.summary.strategyShift).toBe('更保守')
  })

  it('summary for no clear direction defaults correctly', () => {
    const base = makeBaseStrategy()
    const locks: NodeLock[] = [
      { comboKey: 'AA', action: 'bet_large', frequency: 1.0 },
      { comboKey: 'KK', action: 'fold', frequency: 1.0 },
    ]
    const result = applyNodeLocks(base, locks, ['Ah', '7d', '2c'], true)
    // Equal aggressive/passive → neither > 50% → default
    expect(result.summary.strategyShift).toBe('无明显变化')
  })

  it('generates strategy description', () => {
    const base = makeBaseStrategy()
    const locks: NodeLock[] = [
      { comboKey: 'AA', action: 'bet_medium', frequency: 0.8 },
    ]
    const result = applyNodeLocks(base, locks, ['Ah', '7d', '2c'], true)
    expect(result.summary.description).toContain('AA')
    expect(result.summary.totalLocked).toBe(1)
  })

  it('handles empty locks gracefully', () => {
    const base = makeBaseStrategy()
    const result = applyNodeLocks(base, [], ['Ah', '7d', '2c'], true)
    expect(result.lockedCombos.length).toBe(0)
    expect(result.summary.strategyShift).toBe('无明显变化')
  })
})
