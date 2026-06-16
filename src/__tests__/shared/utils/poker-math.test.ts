import { describe, it, expect } from 'vitest'
import { generateDeck, parseCard, analyzeBoard, formatCard, approximateRangeEquity } from '@shared/utils/poker-math'

describe('generateDeck', () => {
  it('returns exactly 52 cards', () => {
    const deck = generateDeck()
    expect(deck).toHaveLength(52)
  })

  it('contains all unique cards', () => {
    const deck = generateDeck()
    expect(new Set(deck).size).toBe(52)
  })

  it('contains Ah and 2c', () => {
    const deck = generateDeck()
    expect(deck).toContain('Ah')
    expect(deck).toContain('2c')
  })

  it('contains no invalid cards', () => {
    const deck = generateDeck()
    for (const card of deck) {
      expect(card).toMatch(/^[AKQJT2-9][shdc]$/)
    }
  })
})

describe('parseCard', () => {
  it('parses Ah correctly', () => {
    const result = parseCard('Ah')
    expect(result).toEqual({ rank: 14, suit: 'h' })
  })

  it('parses 2c correctly', () => {
    const result = parseCard('2c')
    expect(result).toEqual({ rank: 2, suit: 'c' })
  })

  it('parses Td correctly', () => {
    const result = parseCard('Td')
    expect(result).toEqual({ rank: 10, suit: 'd' })
  })

  it('parses Ks correctly', () => {
    const result = parseCard('Ks')
    expect(result).toEqual({ rank: 13, suit: 's' })
  })

  it('returns null for invalid card', () => {
    expect(parseCard('invalid')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseCard('')).toBeNull()
  })

  it('returns null for invalid rank', () => {
    expect(parseCard('Xh')).toBeNull()
  })

  it('returns null for invalid suit', () => {
    expect(parseCard('Ax')).toBeNull()
  })
})

describe('analyzeBoard', () => {
  it('returns preflop for empty board', () => {
    const result = analyzeBoard([])
    expect(result.street).toBe('preflop')
    expect(result.texture).toBe('preflop')
  })

  it('detects paired board', () => {
    const result = analyzeBoard(['Ah', 'Ad', 'Ks'])
    expect(result.isPaired).toBe(true)
    // 3 suits = rainbow paired
    expect(result.texture).toMatch(/paired/)
  })

  it('detects monotone board', () => {
    const result = analyzeBoard(['Ah', 'Kh', 'Th'])
    expect(result.isMonotone).toBe(true)
  })

  it('detects rainbow board', () => {
    const result = analyzeBoard(['Ah', 'Kd', 'Qc'])
    expect(result.isRainbow).toBe(true)
  })

  it('detects two-tone board', () => {
    const result = analyzeBoard(['Ah', 'Kh', 'Qd'])
    expect(result.isTwoTone).toBe(true)
  })

  it('detects ace-high dry board', () => {
    const result = analyzeBoard(['As', '7d', '2c'])
    expect(result.texture).toBe('ace-high-dry')
  })

  it('detects rainbow-high board', () => {
    const result = analyzeBoard(['Kh', '8d', '3c'])
    expect(result.isRainbow).toBe(true)
  })

  it('counts high cards correctly', () => {
    const result = analyzeBoard(['As', 'Kd', 'Qc'])
    expect(result.highCards).toBeGreaterThanOrEqual(3)
    expect(result.broadwayCards).toBeGreaterThanOrEqual(3)
  })

  it('classifies 962r correctly', () => {
    const result = analyzeBoard(['9s', '6d', '2c'])
    expect(result.isRainbow).toBe(true)
  })

  it('handles 4-card turn board', () => {
    const result = analyzeBoard(['As', '7d', '2c', 'Th'])
    expect(result.street).toBe('turn')
  })

  it('handles 5-card river board', () => {
    const result = analyzeBoard(['As', '7d', '2c', 'Th', '3s'])
    expect(result.street).toBe('river')
  })

  it('detects monotone-connected board', () => {
    const result = analyzeBoard(['9h', '8h', '7h'])
    expect(result.isMonotone).toBe(true)
  })

  it('detects paired-monotone board', () => {
    const result = analyzeBoard(['Kh', 'Kd', 'Qd'])
    expect(result.isPaired).toBe(true)
  })
})

describe('formatCard', () => {
  it('formats Ah with suit symbol', () => {
    const result = formatCard('Ah')
    expect(result).toBe('A♥')
    expect(result).toContain('♥')
  })

  it('formats Ks with suit symbol', () => {
    expect(formatCard('Ks')).toContain('♠')
  })

  it('formats Td with suit symbol', () => {
    expect(formatCard('Td')).toContain('♦')
  })

  it('formats 2c with suit symbol', () => {
    expect(formatCard('2c')).toContain('♣')
  })

  it('returns original for invalid card', () => {
    expect(formatCard('invalid')).toBe('invalid')
  })
})

describe('approximateRangeEquity', () => {
  it('returns 0.5 for equal ranges', () => {
    expect(approximateRangeEquity(0.3, 0.3)).toBe(0.5)
  })

  it('gives tighter range an equity advantage', () => {
    const equity = approximateRangeEquity(0.15, 0.4)
    expect(equity).toBeGreaterThan(0.5)
  })

  it('gives wider range an equity disadvantage', () => {
    const equity = approximateRangeEquity(0.5, 0.15)
    expect(equity).toBeLessThan(0.5)
  })
})
