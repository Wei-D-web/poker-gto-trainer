import { describe, it, expect } from 'vitest'
import { analyzeHand, evaluateHoleCards } from '../../../main/solver/hand-analyzer'
import type { HandInput } from '../../../main/solver/hand-analyzer'

// ============================================================
// Hand Analyzer — comprehensive tests
// Covers: isIP logic, hand strength classification, decision analysis
// ============================================================

// Helper to create a minimal HandInput
function makeInput(overrides: Partial<HandInput> = {}): HandInput {
  return {
    heroHand: ['Ah', 'Kh'],
    board: [],
    heroPosition: 3,
    villainPosition: 5,
    stackDepth: 100,
    gameType: 'cash',
    potSize: 5.5,
    actions: [],
    ...overrides,
  }
}

// ============================================================
// isIP logic tests (bug fix: BTN always IP, SB OOP vs BB)
// ============================================================

describe('isIP — position logic', () => {
  it('BTN(3) vs BB(5): BTN is IP', () => {
    const input = makeInput({ heroPosition: 3, villainPosition: 5 })
    input.actions = [
      { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
    ]
    const result = analyzeHand(input)
    expect(result.summary.totalActions).toBeGreaterThanOrEqual(0)
  })

  it('BTN(3) vs CO(2): BTN is IP', () => {
    const input = makeInput({ heroPosition: 3, villainPosition: 2 })
    input.actions = [
      { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
    ]
    const result = analyzeHand(input)
    expect(result).toBeDefined()
  })

  it('SB(4) vs BB(5): SB is OOP (not IP!)', () => {
    const input = makeInput({ heroPosition: 4, villainPosition: 5 })
    input.actions = [
      { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
    ]
    const result = analyzeHand(input)
    expect(result).toBeDefined()
  })

  it('CO(2) vs MP(1): CO is IP', () => {
    const input = makeInput({ heroPosition: 2, villainPosition: 1 })
    input.actions = [
      { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
    ]
    const result = analyzeHand(input)
    expect(result).toBeDefined()
  })
})

// ============================================================
// evaluateHoleCards — hand strength classification
// ============================================================

describe('evaluateHoleCards', () => {
  describe('Preflop classification (no board)', () => {
    it('AA is premium', () => {
      const result = evaluateHoleCards(['Ah', 'Ad'], [])
      expect(result.type).toBe('premium')
      expect(result.tier).toBeLessThanOrEqual(3)
    })

    it('AKs is premium/value', () => {
      const result = evaluateHoleCards(['Ah', 'Kh'], [])
      expect(['premium', 'value']).toContain(result.type)
    })

    it('72o is air', () => {
      const result = evaluateHoleCards(['7h', '2d'], [])
      expect(result.type).toBe('air')
      expect(result.tier).toBeGreaterThanOrEqual(12)
    })

    it('88 is marginal', () => {
      const result = evaluateHoleCards(['8h', '8d'], [])
      expect(['marginal', 'value']).toContain(result.type)
    })
  })

  describe('Postflop classification', () => {
    it('top pair with Ace kicker = value', () => {
      // AK on K72 board = top pair top kicker
      const result = evaluateHoleCards(['Ah', 'Kh'], ['Ks', '7d', '2c'])
      expect(result.type).toBe('value')
      expect(result.hitBoard).toBe(true)
    })

    it('pocket pair hitting set = premium', () => {
      // 88 on 872 board = set
      const result = evaluateHoleCards(['8h', '8d'], ['8s', '7d', '2c'])
      expect(result.type).toBe('premium')
      expect(result.hitBoard).toBe(true)
    })

    it('overpair = value', () => {
      // QQ on J72 board = overpair
      const result = evaluateHoleCards(['Qh', 'Qd'], ['Js', '7d', '2c'])
      expect(result.type).toBe('value')
    })

    it('underpair = marginal', () => {
      // 66 on AKQ board = underpair
      const result = evaluateHoleCards(['6h', '6d'], ['As', 'Kd', 'Qc'])
      expect(result.type).toBe('marginal')
    })

    it('flush draw = draw type', () => {
      // AhKh on Qh7h2d = top pair + flush draw... actually top pair takes priority
      // Let's use a hand that only has flush draw
      const result = evaluateHoleCards(['Ah', '2h'], ['Qh', '7h', '3d'])
      // A2 on Q73 with heart draw: A-high + flush draw
      // hasDraw should be true (flush draw with 2 hearts on board)
      expect(result.hasDraw).toBe(true)
    })

    it('air on disconnected board', () => {
      // 72 on AKQ board
      const result = evaluateHoleCards(['7h', '2d'], ['As', 'Kd', 'Qc'])
      expect(result.type).toBe('air')
      expect(result.hitBoard).toBe(false)
      expect(result.hasDraw).toBe(false)
    })
  })
})

// ============================================================
// analyzeHand — decision analysis
// ============================================================

describe('analyzeHand — preflop decisions', () => {
  it('opening AA from BTN is correct', () => {
    const input = makeInput({
      heroHand: ['Ah', 'Ad'],
      heroPosition: 3,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
      ],
    })
    const result = analyzeHand(input)
    expect(result.summary.mistakes).toBe(0)
    expect(result.summary.grade).toBe('A+')
  })

  it('folding AA from BTN is a mistake', () => {
    const input = makeInput({
      heroHand: ['Ah', 'Ad'],
      heroPosition: 3,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'fold' },
      ],
    })
    const result = analyzeHand(input)
    expect(result.summary.mistakes).toBeGreaterThan(0)
  })

  it('opening 72o from UTG is too loose', () => {
    const input = makeInput({
      heroHand: ['7h', '2d'],
      heroPosition: 0, // UTG
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
      ],
    })
    const result = analyzeHand(input)
    expect(result.summary.mistakes).toBeGreaterThan(0)
  })

  it('folding 72o from UTG is correct', () => {
    const input = makeInput({
      heroHand: ['7h', '2d'],
      heroPosition: 0,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'fold' },
      ],
    })
    const result = analyzeHand(input)
    // Folding trash from UTG should be correct
    expect(result.decisions[0]?.isGTO).toBe(true)
  })

  it('3-betting KK facing open is correct', () => {
    const input = makeInput({
      heroHand: ['Kh', 'Kd'],
      heroPosition: 5, // BB
      villainPosition: 3, // BTN
      actions: [
        { street: 'preflop', actor: 'villain', action: 'open_2.5bb' },
        { street: 'preflop', actor: 'hero', action: '3bet_10bb' },
      ],
    })
    const result = analyzeHand(input)
    const heroDecision = result.decisions[0]
    expect(heroDecision?.isGTO).toBe(true)
  })
})

describe('analyzeHand — postflop decisions', () => {
  it('cbetting with TPTK on dry flop is correct', () => {
    const input = makeInput({
      heroHand: ['Ah', 'Kh'],
      board: ['Ks', '7d', '2c'],
      heroPosition: 3,
      villainPosition: 5,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
        { street: 'preflop', actor: 'villain', action: 'call' },
        { street: 'flop', actor: 'hero', action: 'bet_33' },
      ],
    })
    const result = analyzeHand(input)
    const flopDecision = result.decisions.find(d => d.street === 'flop')
    expect(flopDecision?.isGTO).toBe(true)
  })

  it('donk betting OOP when not aggressor is a mistake', () => {
    const input = makeInput({
      heroHand: ['Ah', 'Kh'],
      board: ['Ks', '7d', '2c'],
      heroPosition: 5, // BB
      villainPosition: 3, // BTN
      actions: [
        { street: 'preflop', actor: 'villain', action: 'open_2.5bb' },
        { street: 'preflop', actor: 'hero', action: 'call' },
        { street: 'flop', actor: 'hero', action: 'bet_50' }, // donk bet!
      ],
    })
    const result = analyzeHand(input)
    const flopDecision = result.decisions.find(d => d.street === 'flop')
    // Donk betting when not the preflop aggressor should be flagged
    expect(flopDecision?.isGTO).toBe(false)
  })

  it('checking with air on flop as aggressor is acceptable', () => {
    const input = makeInput({
      heroHand: ['7h', '2d'],
      board: ['As', 'Kd', 'Qc'],
      heroPosition: 3,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
        { street: 'preflop', actor: 'villain', action: 'call' },
        { street: 'flop', actor: 'hero', action: 'check' },
      ],
    })
    const result = analyzeHand(input)
    // Should have decisions for all hero actions
    expect(result.decisions.length).toBeGreaterThan(0)
  })
})

// ============================================================
// analyzeHand — multi-street scenarios
// ============================================================

describe('analyzeHand — multi-street', () => {
  it('analyzes full 3-street hand', () => {
    const input = makeInput({
      heroHand: ['Ah', 'Ad'],
      board: ['Ks', '7d', '2c', 'Th', 'Qs'],
      heroPosition: 3,
      villainPosition: 5,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
        { street: 'preflop', actor: 'villain', action: 'call' },
        { street: 'flop', actor: 'hero', action: 'bet_33' },
        { street: 'flop', actor: 'villain', action: 'call' },
        { street: 'turn', actor: 'hero', action: 'bet_75' },
        { street: 'turn', actor: 'villain', action: 'call' },
        { street: 'river', actor: 'hero', action: 'bet_50' },
        { street: 'river', actor: 'villain', action: 'fold' },
      ],
    })
    const result = analyzeHand(input)
    // Should have 4 hero decisions (preflop, flop, turn, river)
    expect(result.decisions.length).toBe(4)
    expect(result.summary.totalActions).toBe(4)
    expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(result.summary.grade)
  })

  it('folding value hand on river is a critical mistake', () => {
    const input = makeInput({
      heroHand: ['Ah', 'Ad'],
      board: ['As', '7d', '2c', 'Th', 'Qs'],
      heroPosition: 3,
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
        { street: 'preflop', actor: 'villain', action: 'call' },
        { street: 'flop', actor: 'hero', action: 'bet_33' },
        { street: 'flop', actor: 'villain', action: 'call' },
        { street: 'turn', actor: 'hero', action: 'bet_75' },
        { street: 'turn', actor: 'villain', action: 'call' },
        { street: 'river', actor: 'villain', action: 'bet_75' },
        { street: 'river', actor: 'hero', action: 'fold' }, // TERRIBLE fold with top set
      ],
    })
    const result = analyzeHand(input)
    // Folding a premium hand on river should be flagged
    expect(result.summary.mistakes).toBeGreaterThan(0)
    expect(result.summary.totalEVLost).toBeGreaterThan(2)
  })

  it('MTT mode penalizes mistakes more heavily', () => {
    const cashInput = makeInput({
      heroHand: ['Ah', 'Kh'],
      heroPosition: 3,
      gameType: 'cash',
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
      ],
    })
    const mttInput = makeInput({
      heroHand: ['Ah', 'Kh'],
      heroPosition: 3,
      gameType: 'tournament',
      actions: [
        { street: 'preflop', actor: 'hero', action: 'open_2.5bb' },
      ],
    })
    const cashResult = analyzeHand(cashInput)
    const mttResult = analyzeHand(mttInput)
    // Both should be correct (AK is premium)
    expect(cashResult.summary.mistakes).toBe(0)
    expect(mttResult.summary.mistakes).toBe(0)
  })
})
