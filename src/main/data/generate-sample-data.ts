import { getDatabase, saveDatabase } from './database'
import type { Position } from '../../shared/types/poker'
import { RANK_CHARS, type Rank } from '../../shared/types/poker'

type RangeEntry = [Rank, Rank, 's' | 'o', number]

function getOpeningRange(position: Position, stackDepth: number): RangeEntry[] {
  const depthMultiplier = stackDepth < 30 ? 1.3 : stackDepth > 150 ? 0.8 : 1.0

  const utgRange: RangeEntry[] = [
    [14, 14, 'o', 1.0], [13, 13, 'o', 1.0], [12, 12, 'o', 1.0], [11, 11, 'o', 1.0],
    [10, 10, 'o', 1.0], [9, 9, 'o', 1.0], [8, 8, 'o', 0.8],
    [14, 13, 's', 1.0], [14, 12, 's', 1.0], [14, 11, 's', 0.8], [14, 10, 's', 0.6],
    [13, 12, 's', 1.0], [13, 11, 's', 0.8], [13, 10, 's', 0.5],
    [12, 11, 's', 0.8], [12, 10, 's', 0.5],
    [11, 10, 's', 0.6], [10, 9, 's', 0.5], [9, 8, 's', 0.3],
    [14, 13, 'o', 1.0], [14, 12, 'o', 0.8], [14, 11, 'o', 0.5],
    [13, 12, 'o', 0.8], [13, 11, 'o', 0.4],
    [12, 11, 'o', 0.5],
  ]

  const mpRange: RangeEntry[] = [
    ...utgRange,
    [7, 7, 'o', 0.6], [6, 6, 'o', 0.4], [5, 5, 'o', 0.3],
    [14, 9, 's', 0.4], [14, 8, 's', 0.3],
    [13, 9, 's', 0.4], [13, 8, 's', 0.2],
    [12, 9, 's', 0.4], [12, 8, 's', 0.2],
    [11, 9, 's', 0.4], [11, 8, 's', 0.2],
    [10, 8, 's', 0.4], [10, 7, 's', 0.3], [9, 7, 's', 0.3], [8, 7, 's', 0.2],
    [14, 10, 'o', 0.3], [13, 10, 'o', 0.2],
    [12, 10, 'o', 0.2], [11, 10, 'o', 0.2],
    [14, 5, 's', 0.2], [13, 5, 's', 0.2], [12, 5, 's', 0.2],
  ]

  const coRange: RangeEntry[] = [
    ...mpRange,
    [4, 4, 'o', 0.5], [3, 3, 'o', 0.4], [2, 2, 'o', 0.3],
    [14, 7, 's', 0.5], [14, 6, 's', 0.4], [14, 4, 's', 0.3], [14, 3, 's', 0.2], [14, 2, 's', 0.2],
    [13, 7, 's', 0.4], [13, 6, 's', 0.3], [13, 4, 's', 0.2], [13, 3, 's', 0.2],
    [12, 7, 's', 0.3], [12, 6, 's', 0.2],
    [11, 7, 's', 0.3], [11, 6, 's', 0.2],
    [10, 6, 's', 0.3], [10, 5, 's', 0.2],
    [9, 6, 's', 0.3], [9, 5, 's', 0.2],
    [8, 6, 's', 0.2], [8, 5, 's', 0.2],
    [7, 6, 's', 0.3], [7, 5, 's', 0.2],
    [6, 5, 's', 0.2], [5, 4, 's', 0.2],
    [14, 9, 'o', 0.5], [14, 8, 'o', 0.3],
    [13, 9, 'o', 0.3], [13, 8, 'o', 0.2],
    [12, 9, 'o', 0.3], [12, 8, 'o', 0.2],
    [11, 9, 'o', 0.2], [11, 8, 'o', 0.1],
    [10, 9, 'o', 0.3], [10, 8, 'o', 0.2],
    [9, 8, 'o', 0.2],
  ]

  const btnRange: RangeEntry[] = [
    ...coRange,
    [14, 2, 'o', 0.5], [13, 2, 'o', 0.4], [12, 2, 'o', 0.3],
    [11, 2, 'o', 0.2], [10, 2, 'o', 0.15],
    [9, 4, 's', 0.4], [9, 3, 's', 0.3], [9, 2, 's', 0.3],
    [8, 4, 's', 0.3], [8, 3, 's', 0.3], [8, 2, 's', 0.2],
    [7, 4, 's', 0.3], [7, 3, 's', 0.2], [7, 2, 's', 0.2],
    [6, 4, 's', 0.3], [6, 3, 's', 0.2], [6, 2, 's', 0.15],
    [5, 3, 's', 0.3], [5, 2, 's', 0.2],
    [4, 3, 's', 0.3], [4, 2, 's', 0.2],
    [3, 2, 's', 0.2],
    [9, 7, 'o', 0.3], [9, 6, 'o', 0.2], [9, 5, 'o', 0.15],
    [8, 7, 'o', 0.2], [8, 6, 'o', 0.15], [8, 5, 'o', 0.1],
    [7, 6, 'o', 0.2], [7, 5, 'o', 0.15],
    [6, 5, 'o', 0.15], [6, 4, 'o', 0.1],
    [5, 4, 'o', 0.15],
    [14, 2, 's', 0.3], [13, 2, 's', 0.3], [12, 2, 's', 0.2],
  ]

  const sbRange: RangeEntry[] = [
    ...btnRange,
    [14, 2, 'o', 0.8], [13, 2, 'o', 0.7], [12, 3, 'o', 0.5],
    [11, 3, 'o', 0.4], [10, 3, 'o', 0.3],
    [9, 3, 'o', 0.25], [9, 2, 'o', 0.2],
    [8, 3, 'o', 0.2], [8, 2, 'o', 0.15],
    [7, 3, 'o', 0.2], [7, 2, 'o', 0.15],
    [4, 2, 's', 0.3], [3, 2, 's', 0.4],
  ]

  const bbDefendRange: RangeEntry[] = [
    [14, 14, 'o', 1.0], [13, 13, 'o', 1.0], [12, 12, 'o', 1.0], [11, 11, 'o', 1.0],
    [10, 10, 'o', 1.0], [9, 9, 'o', 0.9], [8, 8, 'o', 0.8], [7, 7, 'o', 0.7],
    [6, 6, 'o', 0.6], [5, 5, 'o', 0.5], [4, 4, 'o', 0.5], [3, 3, 'o', 0.4], [2, 2, 'o', 0.4],
    [14, 13, 's', 1.0], [14, 12, 's', 1.0], [14, 11, 's', 0.9], [14, 10, 's', 0.8],
    [14, 9, 's', 0.7], [14, 8, 's', 0.6], [14, 7, 's', 0.5], [14, 6, 's', 0.4],
    [13, 12, 's', 1.0], [13, 11, 's', 0.8], [13, 10, 's', 0.7],
    [13, 9, 's', 0.6], [13, 8, 's', 0.5], [13, 7, 's', 0.4],
    [12, 11, 's', 0.8], [12, 10, 's', 0.7], [12, 9, 's', 0.6],
    [12, 8, 's', 0.5], [12, 7, 's', 0.4],
    [11, 10, 's', 0.8], [11, 9, 's', 0.6], [11, 8, 's', 0.5],
    [10, 9, 's', 0.7], [10, 8, 's', 0.6], [10, 7, 's', 0.5],
    [9, 8, 's', 0.6], [9, 7, 's', 0.5], [9, 6, 's', 0.4],
    [8, 7, 's', 0.6], [8, 6, 's', 0.4], [7, 6, 's', 0.5],
    [6, 5, 's', 0.4], [5, 4, 's', 0.4],
    [14, 3, 's', 0.4], [14, 2, 's', 0.4],
    [13, 3, 's', 0.3], [13, 2, 's', 0.3],
    [12, 3, 's', 0.3], [12, 2, 's', 0.3],
    [11, 3, 's', 0.3], [11, 2, 's', 0.2],
    [10, 3, 's', 0.3], [10, 2, 's', 0.2],
    [14, 13, 'o', 1.0], [14, 12, 'o', 0.9], [14, 11, 'o', 0.7],
    [14, 10, 'o', 0.6], [14, 9, 'o', 0.5],
    [13, 12, 'o', 0.8], [13, 11, 'o', 0.6], [13, 10, 'o', 0.5],
    [12, 11, 'o', 0.6], [12, 10, 'o', 0.5],
    [11, 10, 'o', 0.5],
    [10, 9, 'o', 0.4], [9, 8, 'o', 0.4], [8, 7, 'o', 0.3],
    [7, 6, 'o', 0.3], [6, 5, 'o', 0.3],
    [14, 8, 'o', 0.4], [14, 7, 'o', 0.3], [14, 6, 'o', 0.3],
    [13, 8, 'o', 0.3], [13, 7, 'o', 0.3],
    [12, 8, 'o', 0.3], [12, 7, 'o', 0.2],
    [11, 8, 'o', 0.2], [11, 7, 'o', 0.2],
    [10, 8, 'o', 0.3], [10, 7, 'o', 0.2],
  ]

  const rangeMap: Record<Position, RangeEntry[]> = {
    0: utgRange, 1: mpRange, 2: coRange, 3: btnRange, 4: sbRange, 5: bbDefendRange,
  }

  const base = rangeMap[position] || utgRange

  return base.map(([r1, r2, suited, freq]) => {
    const adjustedFreq = Math.min(1, Math.max(0, freq * depthMultiplier))
    return [r1, r2, suited, Math.round(adjustedFreq * 100) / 100] as RangeEntry
  })
}

function comboToKey(highRank: Rank, lowRank: Rank, suited: 's' | 'o' | 'pair'): string {
  const r1 = RANK_CHARS[highRank]  // A for AK
  const r2 = RANK_CHARS[lowRank]   // K for AK
  if (suited === 'pair') return `${r1}${r2}`
  // Always higher rank first: AKs, AKo (not KAs, KAo)
  return suited === 's' ? `${r1}${r2}s` : `${r1}${r2}o`
}

export function generateSamplePreflopData(): void {
  const db = getDatabase()

  const positions = [0, 1, 2, 3, 4, 5]
  const stackDepths = [10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200]
  const gameTypes: Array<'cash' | 'tournament'> = ['cash', 'tournament']

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO preflop_ranges (id, game_type, position, stack_depth, ante, range_data, description, source, metadata)
    VALUES (:id, :gameType, :position, :stackDepth, :ante, :rangeData, :description, :source, :metadata)
  `)

  for (const gameType of gameTypes) {
    for (const position of positions) {
      for (const stackDepth of stackDepths) {
        const ante = gameType === 'tournament' ? Math.round(stackDepth * 0.1) : 0
        const rangeEntries = getOpeningRange(position as Position, stackDepth)

        const comboFreqs: Record<string, number> = {}
        for (const [r1, r2, suited, freq] of rangeEntries) {
          if (r1 === r2 && suited === 'o') {
            comboFreqs[comboToKey(r1, r2, 'pair')] = freq
          } else {
            const key = comboToKey(r1, r2, suited)
            comboFreqs[key] = freq
          }
        }

        const totalCombos = Object.keys(comboFreqs).length
        const avgFreq = Object.values(comboFreqs).reduce((a, b) => a + b, 0) / totalCombos

        const id = `${gameType}_${position}_${stackDepth}bb`
        const posLabels = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']
        const description = `${posLabels[position]} ${gameType === 'cash' ? 'Cash' : 'Tournament'} ${stackDepth}bb`

        stmt.bind({
          ':id': id,
          ':gameType': gameType,
          ':position': position,
          ':stackDepth': stackDepth,
          ':ante': ante,
          ':rangeData': JSON.stringify(comboFreqs),
          ':description': description,
          ':source': 'community-gto-approximation',
          ':metadata': JSON.stringify({
            totalCombos,
            vpip: Math.round(avgFreq * totalCombos * 100) / 100,
            pfr: Math.round(avgFreq * 100),
          }),
        })
        stmt.step()
        stmt.reset()
      }
    }
  }

  stmt.free()
  saveDatabase()

  console.log(`Generated sample preflop data: ${positions.length * stackDepths.length * gameTypes.length} scenarios`)
}
