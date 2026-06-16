import { describe, it, expect } from 'vitest'
import { evaluateHand, compareHands } from '../../../main/solver/hand-evaluator'

// ============================================================
// Hand Evaluator — comprehensive tests
// Covers: wheel straight bug fix, all hand rankings, compareHands
// ============================================================

describe('evaluateHand', () => {
  describe('Royal Flush', () => {
    it('detects royal flush (A-K-Q-J-T suited)', () => {
      const result = evaluateHand(['Ah', 'Kh', 'Qh', 'Jh', 'Th', '2c', '3d'])
      expect(result.rank).toBe('royal_flush')
      expect(result.score).toBeGreaterThanOrEqual(9_000_000)
    })

    it('royal flush beats king-high straight flush', () => {
      const royal = evaluateHand(['Ah', 'Kh', 'Qh', 'Jh', 'Th', '2c', '3d'])
      const kingSF = evaluateHand(['Kh', 'Qh', 'Jh', 'Th', '9h', '2c', '3d'])
      expect(royal.score).toBeGreaterThan(kingSF.score)
    })
  })

  describe('Straight Flush', () => {
    it('detects king-high straight flush', () => {
      const result = evaluateHand(['Kh', 'Qh', 'Jh', 'Th', '9h', '2c', '3d'])
      expect(result.rank).toBe('straight_flush')
      expect(result.score).toBeGreaterThanOrEqual(8_000_000)
      expect(result.score).toBeLessThan(9_000_000)
    })

    it('9-high straight flush', () => {
      const result = evaluateHand(['9h', '8h', '7h', '6h', '5h', '2c', '3d'])
      expect(result.rank).toBe('straight_flush')
    })

    // Bug fix: wheel straight flush should be scored as 5-high, not Ace-high
    it('wheel straight flush (A-2-3-4-5) is 5-high, lower than 6-high SF', () => {
      const wheelSF = evaluateHand(['Ah', '2h', '3h', '4h', '5h', '7c', '8d'])
      const sixHighSF = evaluateHand(['6h', '5h', '4h', '3h', '2h', '7c', '8d'])

      expect(wheelSF.rank).toBe('straight_flush')
      expect(sixHighSF.rank).toBe('straight_flush')
      // 6-high straight flush MUST beat 5-high (wheel) straight flush
      expect(sixHighSF.score).toBeGreaterThan(wheelSF.score)
    })

    it('wheel straight flush is NOT royal flush', () => {
      const wheelSF = evaluateHand(['Ah', '2h', '3h', '4h', '5h', '7c', '8d'])
      expect(wheelSF.rank).not.toBe('royal_flush')
    })
  })

  describe('Quads (Four of a Kind)', () => {
    it('detects quads', () => {
      const result = evaluateHand(['Ah', 'Ad', 'As', 'Ac', 'Kh', '2c', '3d'])
      expect(result.rank).toBe('quads')
      expect(result.score).toBeGreaterThanOrEqual(7_000_000)
      expect(result.score).toBeLessThan(8_000_000)
    })

    it('higher quads beat lower quads', () => {
      const acesQuad = evaluateHand(['Ah', 'Ad', 'As', 'Ac', 'Kh', '2c', '3d'])
      const kingsQuad = evaluateHand(['Kh', 'Kd', 'Ks', 'Kc', 'Ah', '2c', '3d'])
      expect(acesQuad.score).toBeGreaterThan(kingsQuad.score)
    })

    it('same quads — kicker decides', () => {
      const aceKingKicker = evaluateHand(['Ah', 'Ad', 'As', 'Ac', 'Kh', '2c', '3d'])
      const aceQueenKicker = evaluateHand(['Ah', 'Ad', 'As', 'Ac', 'Qh', '2c', '3d'])
      expect(aceKingKicker.score).toBeGreaterThan(aceQueenKicker.score)
    })
  })

  describe('Full House', () => {
    it('detects full house', () => {
      const result = evaluateHand(['Ah', 'Ad', 'As', 'Kh', 'Kd', '2c', '3d'])
      expect(result.rank).toBe('full_house')
      expect(result.score).toBeGreaterThanOrEqual(6_000_000)
      expect(result.score).toBeLessThan(7_000_000)
    })

    it('higher trips in FH beat lower', () => {
      const acesOver = evaluateHand(['Ah', 'Ad', 'As', 'Kh', 'Kd', '2c', '3d'])
      const kingsOver = evaluateHand(['Kh', 'Kd', 'Ks', 'Ah', 'Ad', '2c', '3d'])
      expect(acesOver.score).toBeGreaterThan(kingsOver.score)
    })
  })

  describe('Flush', () => {
    it('detects flush', () => {
      const result = evaluateHand(['Ah', 'Kh', 'Qh', 'Jh', '2h', '3c', '4d'])
      expect(result.rank).toBe('flush')
      expect(result.score).toBeGreaterThanOrEqual(5_000_000)
      expect(result.score).toBeLessThan(6_000_000)
    })

    it('ace-high flush beats king-high flush', () => {
      const aceHigh = evaluateHand(['Ah', 'Kh', 'Qh', 'Jh', '2h', '3c', '4d'])
      const kingHigh = evaluateHand(['Kh', 'Qh', 'Jh', 'Th', '2h', '3c', '4d'])
      expect(aceHigh.score).toBeGreaterThan(kingHigh.score)
    })

    it('flush beats straight', () => {
      const flush = evaluateHand(['Ah', 'Kh', 'Qh', 'Jh', '2h', '3c', '4d'])
      const straight = evaluateHand(['Ah', 'Kd', 'Qh', 'Jc', 'Ts', '3c', '4d'])
      expect(flush.score).toBeGreaterThan(straight.score)
    })
  })

  describe('Straight', () => {
    it('detects broadway straight (A-K-Q-J-T)', () => {
      const result = evaluateHand(['Ah', 'Kd', 'Qh', 'Jc', 'Ts', '2c', '3d'])
      expect(result.rank).toBe('straight')
      expect(result.score).toBeGreaterThanOrEqual(4_000_000)
      expect(result.score).toBeLessThan(5_000_000)
    })

    it('detects 6-high straight (6-5-4-3-2)', () => {
      const result = evaluateHand(['6h', '5d', '4h', '3c', '2s', '7c', '8d'])
      expect(result.rank).toBe('straight')
    })

    // Bug fix: wheel should be 5-high, lower than 6-high
    it('wheel straight (A-2-3-4-5) is 5-high, lower than 6-high straight', () => {
      const wheel = evaluateHand(['Ah', '2d', '3h', '4c', '5s', '7c', '8d'])
      const sixHigh = evaluateHand(['6h', '5d', '4h', '3c', '2s', '7c', '8d'])

      expect(wheel.rank).toBe('straight')
      expect(sixHigh.rank).toBe('straight')
      // 6-high straight MUST beat 5-high (wheel) straight
      expect(sixHigh.score).toBeGreaterThan(wheel.score)
    })

    it('broadway beats 9-high straight', () => {
      const broadway = evaluateHand(['Ah', 'Kd', 'Qh', 'Jc', 'Ts', '2c', '3d'])
      const nineHigh = evaluateHand(['9h', '8d', '7h', '6c', '5s', '2c', '3d'])
      expect(broadway.score).toBeGreaterThan(nineHigh.score)
    })

    it('straight beats trips', () => {
      const straight = evaluateHand(['9h', '8d', '7h', '6c', '5s', '2c', '3d'])
      const trips = evaluateHand(['Ah', 'Ad', 'As', 'Kc', 'Qd', '2c', '3d'])
      expect(straight.score).toBeGreaterThan(trips.score)
    })
  })

  describe('Trips (Three of a Kind)', () => {
    it('detects trips', () => {
      const result = evaluateHand(['Ah', 'Ad', 'As', 'Kc', 'Qd', '2c', '3d'])
      expect(result.rank).toBe('trips')
      expect(result.score).toBeGreaterThanOrEqual(3_000_000)
      expect(result.score).toBeLessThan(4_000_000)
    })

    it('higher trips beat lower trips', () => {
      const aces = evaluateHand(['Ah', 'Ad', 'As', 'Kc', 'Qd', '2c', '3d'])
      const kings = evaluateHand(['Kh', 'Kd', 'Ks', 'Ac', 'Qd', '2c', '3d'])
      expect(aces.score).toBeGreaterThan(kings.score)
    })

    it('same trips — kicker decides', () => {
      const aceKing = evaluateHand(['Ah', 'Ad', 'As', 'Kc', 'Qd', '2c', '3d'])
      const aceJack = evaluateHand(['Ah', 'Ad', 'As', 'Jc', 'Td', '2c', '3d'])
      expect(aceKing.score).toBeGreaterThan(aceJack.score)
    })
  })

  describe('Two Pair', () => {
    it('detects two pair', () => {
      const result = evaluateHand(['Ah', 'Ad', 'Kh', 'Kd', '2c', '3d', '4s'])
      expect(result.rank).toBe('two_pair')
      expect(result.score).toBeGreaterThanOrEqual(2_000_000)
      expect(result.score).toBeLessThan(3_000_000)
    })

    it('higher top pair wins', () => {
      const acesUp = evaluateHand(['Ah', 'Ad', 'Kh', 'Kd', '2c', '3d', '4s'])
      const kingsUp = evaluateHand(['Kh', 'Kd', 'Qh', 'Qd', '2c', '3d', '4s'])
      expect(acesUp.score).toBeGreaterThan(kingsUp.score)
    })

    it('same top pair — second pair decides', () => {
      const acesKings = evaluateHand(['Ah', 'Ad', 'Kh', 'Kd', '2c', '3d', '4s'])
      const acesQueens = evaluateHand(['Ah', 'Ad', 'Qh', 'Qd', '2c', '3d', '4s'])
      expect(acesKings.score).toBeGreaterThan(acesQueens.score)
    })
  })

  describe('Pair', () => {
    it('detects pair', () => {
      const result = evaluateHand(['Ah', 'Ad', 'Kh', 'Qd', '2c', '3d', '4s'])
      expect(result.rank).toBe('pair')
      expect(result.score).toBeGreaterThanOrEqual(1_000_000)
      expect(result.score).toBeLessThan(2_000_000)
    })

    it('higher pair beats lower pair', () => {
      const aces = evaluateHand(['Ah', 'Ad', 'Kh', 'Qd', '2c', '3d', '4s'])
      const kings = evaluateHand(['Kh', 'Kd', 'Ah', 'Qd', '2c', '3d', '4s'])
      expect(aces.score).toBeGreaterThan(kings.score)
    })
  })

  describe('High Card', () => {
    it('detects high card', () => {
      const result = evaluateHand(['Ah', 'Kd', 'Qh', 'Jc', '2s', '3c', '4d'])
      expect(result.rank).toBe('high_card')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThan(1_000_000)
    })

    it('ace-high beats king-high', () => {
      const aceHigh = evaluateHand(['Ah', 'Kd', 'Qh', 'Jc', '2s', '3c', '4d'])
      const kingHigh = evaluateHand(['Kh', 'Qd', 'Jh', 'Tc', '2s', '3c', '4d'])
      expect(aceHigh.score).toBeGreaterThan(kingHigh.score)
    })
  })

  describe('Hand Ranking Order (complete hierarchy)', () => {
    it('royal_flush > straight_flush > quads > full_house > flush > straight > trips > two_pair > pair > high_card', () => {
      const hands = [
        { cards: ['Ah', 'Kh', 'Qh', 'Jh', 'Th', '2c', '3d'], expectedRank: 'royal_flush' },
        { cards: ['Kh', 'Qh', 'Jh', 'Th', '9h', '2c', '3d'], expectedRank: 'straight_flush' },
        { cards: ['Ah', 'Ad', 'As', 'Ac', 'Kh', '2c', '3d'], expectedRank: 'quads' },
        { cards: ['Ah', 'Ad', 'As', 'Kh', 'Kd', '2c', '3d'], expectedRank: 'full_house' },
        { cards: ['Ah', 'Kh', 'Qh', 'Jh', '2h', '3c', '4d'], expectedRank: 'flush' },
        { cards: ['Ah', 'Kd', 'Qh', 'Jc', 'Ts', '2c', '3d'], expectedRank: 'straight' },
        { cards: ['Ah', 'Ad', 'As', 'Kc', 'Qd', '2c', '3d'], expectedRank: 'trips' },
        { cards: ['Ah', 'Ad', 'Kh', 'Kd', '2c', '3d', '4s'], expectedRank: 'two_pair' },
        { cards: ['Ah', 'Ad', 'Kh', 'Qd', '2c', '3d', '4s'], expectedRank: 'pair' },
        { cards: ['Ah', 'Kd', 'Qh', 'Jc', '2s', '3c', '4d'], expectedRank: 'high_card' },
      ]

      for (const hand of hands) {
        const result = evaluateHand(hand.cards)
        expect(result.rank).toBe(hand.expectedRank)
      }

      // Verify strict ordering
      for (let i = 0; i < hands.length - 1; i++) {
        const higher = evaluateHand(hands[i].cards)
        const lower = evaluateHand(hands[i + 1].cards)
        expect(higher.score).toBeGreaterThan(lower.score)
      }
    })
  })

  describe('Edge cases', () => {
    it('uses best 5 cards from 7 (ignores 2 lowest)', () => {
      // KhQhJhTh9h8h7c — best 5: K-Q-J-T-9 of hearts = king-high straight flush
      // 8h and 7c are ignored
      const result = evaluateHand(['Kh', 'Qh', 'Jh', 'Th', '9h', '8h', '7c'])
      expect(result.rank).toBe('straight_flush')
    })

    it('pair on board — uses best combination', () => {
      // Board has AA, hero has KK — two pair AAKK
      const result = evaluateHand(['Kh', 'Kd', 'Ah', 'Ad', '2c', '3d', '4s'])
      expect(result.rank).toBe('two_pair')
    })

    it('board makes the hand (hero cards irrelevant)', () => {
      // Board has royal flush, hero has 72o
      const result = evaluateHand(['2h', '7d', 'Ah', 'Kh', 'Qh', 'Jh', 'Th'])
      expect(result.rank).toBe('royal_flush')
    })
  })
})

// ============================================================
// compareHands
// ============================================================

describe('compareHands', () => {
  it('hero wins with better hand', () => {
    // Hero: AK hits top pair on A-high board. Villain: 72 has nothing.
    const result = compareHands(
      ['Ah', 'Kh'], ['2d', '7c'], ['As', '9d', '5h', '3c', '8s']
    )
    expect(result).toBe(1)
  })

  it('villain wins with better hand', () => {
    // Hero: 72 nothing. Villain: AK hits top pair on A-high board.
    const result = compareHands(
      ['2d', '7c'], ['Ah', 'Kh'], ['As', '9d', '5h', '3c', '8s']
    )
    expect(result).toBe(-1)
  })

  it('tie with identical hand strength', () => {
    // Both have AK on a board where neither improves beyond high card
    const result = compareHands(
      ['Ah', 'Kh'], ['Ad', 'Kd'], ['2s', '5s', '8h', 'Jc', 'Ts']
    )
    expect(result).toBe(0)
  })

  // Wheel straight bug fix verification
  it('wheel (5-high) loses to 6-high straight', () => {
    // Hero: A2 on 3-4-5-x-x board = wheel
    // Villain: 67 on 3-4-5-x-x board = 7-high straight
    const result = compareHands(
      ['Ah', '2d'], ['6h', '7d'], ['3h', '4d', '5s', '9c', 'Kd']
    )
    expect(result).toBe(-1) // villain wins with 7-high > 5-high wheel
  })

  it('flush beats straight in showdown', () => {
    const result = compareHands(
      ['Ah', 'Kh'], ['Qd', 'Jd'], ['2h', '5h', '8h', 'Tc', '9s']
    )
    expect(result).toBe(1) // hero has flush
  })

  it('trips over pair on board', () => {
    // Board: AAK, hero: AK = full house, villain: AQ = trips
    const result = compareHands(
      ['Ah', 'Kh'], ['Ad', 'Qd'], ['As', 'Ac', 'Kd', '2c', '3s']
    )
    expect(result).toBe(1) // hero has full house (AAAKK) vs villain trips (AAA)
  })
})
