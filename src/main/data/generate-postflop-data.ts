/**
 * Generates sample postflop GTO strategy data for common flop textures.
 * These are simplified approximations for training purposes.
 */

import { getDatabase, saveDatabase } from './database'
import { analyzeBoard, generateBucketFlops } from '../../shared/utils/poker-math'
import { generateAllCombos, type ComboInfo } from '../../shared/utils/combo-utils'
import type { CardString } from '../../shared/types/poker'

/** Generate simplified postflop strategy for a given flop */
function generateFlopStrategy(
  flop: CardString[],
  heroPosition: number,
  villainPosition: number,
  stackDepth: number,
  gameType: 'cash' | 'tournament'
): Record<string, { actions: Array<{ action: string; frequency: number; ev: number }>; equity: number; weight: number }> {
  const analysis = analyzeBoard(flop)
  const allCombos = generateAllCombos()
  const strategies: Record<string, typeof allCombos[0] & { actions: Array<{ action: string; frequency: number; ev: number }>; equity: number; weight: number }> = {} as any

  // Position-based range adjustment
  const rangeWidth = [0.16, 0.20, 0.26, 0.40, 0.35, 0.30][heroPosition] || 0.3
  const villRangeWidth = [0.16, 0.20, 0.26, 0.40, 0.35, 0.30][villainPosition] || 0.3

  for (const combo of allCombos) {
    const inRange = Math.random() < rangeWidth * 1.1 // slightly wider for postflop
    const isPremium = combo.pair && combo.rank1 >= 10
    const isGood = (combo.suited && combo.rank1 >= 9 && combo.rank2 >= 7) || (combo.pair && combo.rank1 >= 7)
    const isDraw = combo.suited && analysis.flushDrawPossible

    let weight = 0
    if (inRange || isPremium || isGood) {
      weight = isPremium ? 1.0 : isGood ? 0.8 : isDraw ? 0.7 : 0.4
    }

    // Determine primary action based on board texture
    let primaryAction: string
    let ev = 0

    if (weight < 0.3) {
      // Mostly fold weak hands
      primaryAction = 'fold'
      ev = 0
    } else if (weight >= 0.8 && analysis.isPaired) {
      // On paired boards, bet strong hands
      primaryAction = analysis.isMonotone ? 'bet_75' : 'bet_50'
      ev = weight * 0.08
    } else if (weight >= 0.8 && analysis.isMonotone) {
      // On monotone, bet draws and strong made hands
      primaryAction = 'bet_50'
      ev = weight * 0.06
    } else if (weight >= 0.8 && analysis.connectivity === 'highly-connected') {
      // On connected boards, bet larger
      primaryAction = 'bet_75'
      ev = weight * 0.07
    } else if (weight >= 0.6) {
      // Default: mix bet and check
      primaryAction = Math.random() > 0.5 ? 'bet_50' : 'check'
      ev = weight * 0.04
    } else {
      primaryAction = 'check'
      ev = weight * 0.02
    }

    const actions = [
      { action: primaryAction, frequency: 0.6, ev },
      { action: primaryAction === 'fold' ? 'check' : 'fold', frequency: 0.2, ev: primaryAction === 'fold' ? 0.01 : 0 },
      { action: 'check', frequency: 0.2, ev: 0.01 },
    ]

    // Normalize frequencies
    const total = actions.reduce((s, a) => s + a.frequency, 0)
    for (const a of actions) {
      a.frequency = Math.round((a.frequency / total) * 100) / 100
    }

    strategies[combo.key] = {
      actions,
      equity: weight * 0.45 + 0.05,
      weight,
    }
  }

  return strategies as any
}

/** Generate and insert sample postflop data */
export function generateSamplePostflopData(): void {
  const db = getDatabase()
  const bucketFlops = generateBucketFlops()
  const stackDepths = [30, 50, 100]

  const insertScenario = db.prepare(`
    INSERT OR REPLACE INTO scenarios
    (id, game_type, hero_position, villain_position, effective_stack, ante, board, street, pot_size, actions, sizing_schema_id, metadata)
    VALUES (:id, :gameType, :heroPos, :villainPos, :stack, 0, :board, :street, :potSize, :actions, 'gto-wizard', :metadata)
  `)

  const insertStrategy = db.prepare(`
    INSERT OR REPLACE INTO strategies (scenario_id, data, format_version)
    VALUES (:scenarioId, :data, 1)
  `)

  let count = 0

  for (const [clusterId, flop] of bucketFlops) {
    const analysis = analyzeBoard(flop)

    for (const stack of stackDepths) {
      // Generate for a few common position matchups postflop
      const matchups = [
        { hero: 3, villain: 5 }, // BTN vs BB (most common)
        { hero: 2, villain: 3 }, // CO vs BTN
        { hero: 0, villain: 5 }, // UTG vs BB
      ]

      for (const { hero, villain } of matchups) {
        const gameType = 'cash' as const
        const potSize = stack * 0.12 // approx 6bb open * 2 players
        const boardStr = flop.join(' ')

        // Action: hero opens, villain calls -> flop
        const actions = JSON.stringify([
          { player: 'hero', type: 'raise', amount: 2.5 },
          { player: 'villain', type: 'call', amount: 2.5 },
        ])

        const id = `postflop_${gameType}_${hero}v${villain}_${stack}bb_${flop.join('_')}`
        const posLabels = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']
        const label = `${posLabels[hero]} vs ${posLabels[villain]}, ${stack}bb, ${analysis.texture}`

        insertScenario.bind({
          ':id': id,
          ':gameType': gameType,
          ':heroPos': hero,
          ':villainPos': villain,
          ':stack': stack,
          ':board': boardStr,
          ':street': 'flop',
          ':potSize': potSize,
          ':actions': actions,
          ':metadata': JSON.stringify({ label, potType: 'SRP', texture: analysis.texture }),
        })
        insertScenario.step()
        insertScenario.reset()

        // Generate strategy data
        const strategyData = generateFlopStrategy(flop, hero, villain, stack, gameType)

        // Transform to ComboStrategy array format
        const combos = generateAllCombos().map(combo => {
          const data = strategyData[combo.key]
          return {
            comboKey: combo.key,
            actions: data?.actions || [{ action: 'fold', frequency: 1, ev: 0 }],
            equity: data?.equity || 0,
            weight: data?.weight || 0,
            ev: data?.weight ? data.weight * 0.03 : 0,
          }
        })

        const heroEV = combos.filter(c => c.weight > 0).reduce((s, c) => s + c.ev * c.weight, 0) / Math.max(1, combos.filter(c => c.weight > 0).reduce((s, c) => s + c.weight, 0))

        insertStrategy.bind({
          ':scenarioId': id,
          ':data': JSON.stringify({
            scenarioId: id,
            combos,
            heroEV,
            villainEV: -heroEV * 0.8,
            heroEquity: 0.52,
            metadata: {
              solverVersion: 'community-approximation-v1',
              convergence: 5,
              totalIterations: 1000,
              solvedDate: '2024-06-01',
              source: 'community-gto-approximation',
            },
          }),
        })
        insertStrategy.step()
        insertStrategy.reset()

        // Also insert into flop_buckets
        const flopBucketStmt = db.prepare(`
          INSERT OR REPLACE INTO flop_buckets (flop_text, cluster_id, texture_type, metadata)
          VALUES (:flop, :cluster, :texture, '{}')
        `)
        flopBucketStmt.bind({
          ':flop': boardStr,
          ':cluster': clusterId,
          ':texture': analysis.texture,
        })
        flopBucketStmt.step()
        flopBucketStmt.free()

        count++
      }
    }
  }

  insertScenario.free()
  insertStrategy.free()
  saveDatabase()

  console.log(`Generated ${count} postflop scenarios across ${bucketFlops.size} board textures`)
}
