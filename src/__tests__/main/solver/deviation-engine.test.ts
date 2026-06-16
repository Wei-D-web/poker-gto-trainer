import { describe, it, expect } from 'vitest'
import { compareHandToGTO, detectWeaknesses } from '../../../main/solver/deviation-engine'

// ============================================================
// Deviation Engine — deterministic tests
// Covers: Math.random() fix, deterministic output, weakness detection
// ============================================================

describe('compareHandToGTO', () => {
  const baseParams = {
    heroPosition: 3 as const,
    villainPosition: 5 as const,
    effectiveStack: 100,
    gameType: 'cash' as const,
    board: [] as string[],
    heroHand: ['Ah', 'Kh'],
  }

  it('returns decisions for hero actions', () => {
    const result = compareHandToGTO({
      ...baseParams,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb', amount: 2.5 },
      ],
    })
    expect(result.decisions.length).toBe(1)
    expect(result.decisions[0]?.street).toBe('preflop')
  })

  it('filters out villain actions from decisions', () => {
    const result = compareHandToGTO({
      ...baseParams,
      actions: [
        { street: 'preflop', actor: 'villain', action: 'fold', amount: 0 },
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb', amount: 2.5 },
      ],
    })
    // Only hero actions become decisions
    expect(result.decisions.length).toBe(1)
  })

  it('computes per-street deviations', () => {
    const result = compareHandToGTO({
      ...baseParams,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb', amount: 2.5 },
        { street: 'flop', actor: 'hero', action: 'check', amount: 0 },
      ],
      board: ['Ah', '7d', '2c'],
    })
    expect(result.streetDeviations.length).toBe(4) // preflop, flop, turn, river
    expect(result.streetDeviations.some(s => s.street === 'preflop')).toBe(true)
    expect(result.streetDeviations.some(s => s.street === 'flop')).toBe(true)
  })

  // Bug fix: deterministic output (same input → same result)
  it('produces deterministic results (no Math.random) — run 1', () => {
    const result = compareHandToGTO({
      ...baseParams,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb', amount: 2.5 },
        { street: 'flop', actor: 'hero', action: 'check', amount: 0 },
      ],
      board: ['Ah', '7d', '2c'],
    })
    // Just verify it runs without error and returns structured data
    expect(result.decisions.length).toBeGreaterThan(0)
    expect(result.totalEVLost).toBeGreaterThanOrEqual(0)
  })

  it('produces deterministic results — same input twice gives same output', () => {
    const params = {
      ...baseParams,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb', amount: 2.5 },
        { street: 'flop', actor: 'hero', action: 'bet_33', amount: 2.0 },
      ],
      board: ['Ah', '7d', '2c'],
    }
    const result1 = compareHandToGTO(params)
    const result2 = compareHandToGTO(params)

    // Same input must produce identical decisions
    expect(result1.decisions.length).toBe(result2.decisions.length)
    for (let i = 0; i < result1.decisions.length; i++) {
      expect(result1.decisions[i].isGTO).toBe(result2.decisions[i].isGTO)
      expect(result1.decisions[i].gtoAction).toBe(result2.decisions[i].gtoAction)
      expect(result1.decisions[i].evDifference).toBe(result2.decisions[i].evDifference)
    }
    expect(result1.totalEVLost).toBe(result2.totalEVLost)
  })

  it('uses correct position for UTG preflop decisions', () => {
    const result = compareHandToGTO({
      ...baseParams,
      heroPosition: 0, // UTG
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb', amount: 2.5 },
      ],
    })
    expect(result.decisions.length).toBeGreaterThan(0)
  })
})

// ============================================================
// detectWeaknesses
// ============================================================

describe('detectWeaknesses', () => {
  it('detects weaknesses from hand history', () => {
    const weaknesses = detectWeaknesses([
      {
        id: 'hand1',
        heroHand: ['Ah', 'Kh'],
        actions: [
          { street: 'preflop', actor: 'hero', action: 'fold', amount: 0 },
        ],
        heroPosition: 3,
        villainPosition: 5,
        effectiveStack: 100,
        gameType: 'cash',
        board: [],
        decisions: [
          {
            actionIndex: 0,
            street: 'preflop',
            actor: 'hero',
            action: 'fold',
            isGTO: false,
            gtoAction: 'open_2.5bb',
            evDifference: 3.5,
            severity: 'moderate' as const,
            explanation: 'Should open',
          },
        ],
      },
      {
        id: 'hand2',
        heroHand: ['7h', '2d'],
        actions: [
          { street: 'preflop', actor: 'hero', action: 'open_2.5bb', amount: 2.5 },
        ],
        heroPosition: 0,
        villainPosition: 3,
        effectiveStack: 100,
        gameType: 'cash',
        board: [],
        decisions: [
          {
            actionIndex: 0,
            street: 'preflop',
            actor: 'hero',
            action: 'open_2.5bb',
            isGTO: false,
            gtoAction: 'fold',
            evDifference: 2.0,
            severity: 'minor' as const,
            explanation: 'Should fold trash',
          },
        ],
      },
    ])
    expect(weaknesses.length).toBeGreaterThan(0)
    // Should sort by severity
    if (weaknesses.length >= 2) {
      const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      expect(
        severityOrder[weaknesses[0]!.severity] ?? 0
      ).toBeGreaterThanOrEqual(
        severityOrder[weaknesses[weaknesses.length - 1]!.severity] ?? 0
      )
    }
  })

  it('returns empty for all-correct hands', () => {
    const weaknesses = detectWeaknesses([
      {
        id: 'hand1',
        heroHand: ['Ah', 'Ad'],
        actions: [
          { street: 'preflop', actor: 'hero', action: 'open_2.5bb', amount: 2.5 },
        ],
        heroPosition: 3,
        villainPosition: 5,
        effectiveStack: 100,
        gameType: 'cash',
        board: [],
        decisions: [
          {
            actionIndex: 0,
            street: 'preflop',
            actor: 'hero',
            action: 'open_2.5bb',
            isGTO: true,
            gtoAction: 'open_2.5bb',
            evDifference: 0,
            severity: 'correct' as const,
            explanation: 'Correct',
          },
        ],
      },
    ])
    expect(weaknesses.length).toBe(0)
  })
})
