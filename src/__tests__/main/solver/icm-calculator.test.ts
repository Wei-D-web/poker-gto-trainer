import { describe, it, expect } from 'vitest'
import { calculateICM, quickICM, type Player, type Payout } from '../../../main/solver/icm-calculator'

function makePlayers(stacks: number[]): Player[] {
  return stacks.map((s, i) => ({
    id: i === 0 ? 'h' : `v${i}`,
    name: i === 0 ? 'Hero' : `P${i + 1}`,
    stack: s,
  }))
}

const DEFAULT_PAYOUTS: Payout[] = [
  { position: 1, prize: 50, label: '🥇' },
  { position: 2, prize: 30, label: '🥈' },
  { position: 3, prize: 20, label: '🥉' },
]

describe('calculateICM', () => {
  it('handles 2 players with 2 payouts', () => {
    const players = makePlayers([5000, 5000])
    const payouts: Payout[] = [
      { position: 1, prize: 65, label: '🥇' },
      { position: 2, prize: 35, label: '🥈' },
    ]
    const result = calculateICM(players, payouts)
    expect(result.players).toHaveLength(2)
    // Equal stacks should have equal equity near 50
    expect(result.players[0].icmEquity).toBeCloseTo(50, 0)
    expect(result.players[1].icmEquity).toBeCloseTo(50, 0)
  })

  it('returns correct total chips', () => {
    const players = makePlayers([5000, 3500, 2500, 1500])
    const result = calculateICM(players, DEFAULT_PAYOUTS)
    expect(result.totalChips).toBe(12500)
    expect(result.prizePool).toBe(100)
  })

  it('gives highest equity to chip leader', () => {
    const players = makePlayers([5000, 3500, 2500, 1500])
    const result = calculateICM(players, DEFAULT_PAYOUTS)
    const equities = result.players.map(p => p.icmEquity)
    expect(equities[0]).toBeGreaterThan(equities[1])
    expect(equities[1]).toBeGreaterThan(equities[2])
    expect(equities[2]).toBeGreaterThan(equities[3])
  })

  it('equal stacks return equal equity values', () => {
    const players = makePlayers([5000, 5000])
    const payouts: Payout[] = [{ position: 1, prize: 100, label: '🥇' }]
    const result = calculateICM(players, payouts)
    // Both players with equal stacks should have equal equity
    expect(result.players[0].icmEquity).toBe(result.players[1].icmEquity)
  })

  it('handles 6 players', () => {
    const players = makePlayers([3000, 2500, 2000, 1800, 1500, 1200])
    const result = calculateICM(players, DEFAULT_PAYOUTS)
    expect(result.players).toHaveLength(6)
    expect(result.totalChips).toBe(12000)
  })

  it('chip leader gets highest equity', () => {
    const players = makePlayers([10000, 500, 500])
    const result = calculateICM(players, DEFAULT_PAYOUTS)
    // Chip leader should have highest equity
    expect(result.players[0].icmEquity).toBeGreaterThan(result.players[1].icmEquity)
    expect(result.players[0].icmEquity).toBeGreaterThan(result.players[2].icmEquity)
  })

  it('zero stack player gets 0 equity in winner-take-all', () => {
    const players = makePlayers([10000, 0])
    const payouts: Payout[] = [{ position: 1, prize: 100, label: '🥇' }]
    const result = calculateICM(players, payouts)
    expect(result.players[1].icmEquity).toBe(0)
  })

  it('computes bubble factor for all players', () => {
    const players = makePlayers([5000, 3500, 2500, 1500])
    const result = calculateICM(players, DEFAULT_PAYOUTS)
    for (const p of result.players) {
      expect(p.bubbleFactor).toBeGreaterThan(0)
    }
  })

  it('computes ICM tax', () => {
    const players = makePlayers([5000, 3500, 2500, 1500])
    const result = calculateICM(players, DEFAULT_PAYOUTS)
    // Big stack should have negative ICM tax (chips worth less than linear)
    expect(result.players[0].icmTax).toBeLessThan(0)
    // Short stack should have positive ICM tax
    expect(result.players[3].icmTax).toBeGreaterThan(0)
  })

  it('handles 3 players with 2 payouts (bubble scenario)', () => {
    const players = makePlayers([5000, 3000, 2000])
    const payouts: Payout[] = [
      { position: 1, prize: 65, label: '🥇' },
      { position: 2, prize: 35, label: '🥈' },
    ]
    const result = calculateICM(players, payouts)
    expect(result.players).toHaveLength(3)
    // Chip leader has highest equity
    expect(result.players[0].icmEquity).toBeGreaterThan(result.players[2].icmEquity)
    // Each player has positive equity
    for (const p of result.players) {
      expect(p.icmEquity).toBeGreaterThan(0)
    }
  })
})

describe('quickICM', () => {
  it('returns equity and bubble factor', () => {
    const result = quickICM(5000, [3500, 2500, 1500], DEFAULT_PAYOUTS)
    expect(result.equity).toBeGreaterThan(0)
    expect(result.bubbleFactor).toBeGreaterThan(0)
  })

  it('short stack gets positive equity', () => {
    const result = quickICM(500, [5000, 3000, 1500], DEFAULT_PAYOUTS)
    expect(result.equity).toBeGreaterThan(0)
  })
})
