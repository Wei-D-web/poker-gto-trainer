/**
 * ICM Calculator — Malmuth-Harville algorithm.
 * Pure math, zero estimation. Exact for up to 9 players.
 */

export interface Player { id: string; name: string; stack: number }
export interface Payout { position: number; prize: number; label: string }

export interface ICMResult {
  players: ICMPlayerResult[]
  totalChips: number
  prizePool: number
}
export interface ICMPlayerResult {
  id: string; name: string; stack: number
  stackPercent: number; icmEquity: number; chipEV: number
  icmTax: number; bubbleFactor: number
}

/**
 * Core ICM computation. Set computeBubbleFactor=false to avoid recursion
 * when called from estimateEquityAfterTransfer.
 */
function computeICMCore(players: Player[], payouts: Payout[], computeBubbleFactor: boolean): ICMResult {
  const n = players.length
  const stacks = players.map(p => p.stack)
  const total = stacks.reduce((a, b) => a + b, 0)
  const prizePool = payouts.reduce((a, p) => a + p.prize, 0)
  const k = payouts.length

  const probs: number[][] = players.map(() => new Array(k).fill(0))

  for (let i = 0; i < n; i++) {
    probs[i][0] = stacks[i] / total

    if (k >= 2) {
      let p2 = 0
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        p2 += (stacks[j] / total) * (stacks[i] / (total - stacks[j]))
      }
      probs[i][1] = p2
    }

    if (k >= 3) {
      let p3 = 0
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const pj1 = stacks[j] / total
        const remJ = total - stacks[j]
        for (let m = 0; m < n; m++) {
          if (m === i || m === j) continue
          p3 += pj1 * (stacks[m] / remJ) * (stacks[i] / (remJ - stacks[m]))
        }
      }
      probs[i][2] = p3
    }

    if (k >= 4) {
      let p4 = 0
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const pj1 = stacks[j] / total
        const remJ = total - stacks[j]
        for (let m = 0; m < n; m++) {
          if (m === i || m === j) continue
          const pm2 = stacks[m] / remJ
          const remJM = remJ - stacks[m]
          for (let p = 0; p < n; p++) {
            if (p === i || p === j || p === m) continue
            p4 += pj1 * pm2 * (stacks[p] / remJM) * (stacks[i] / (remJM - stacks[p]))
          }
        }
      }
      probs[i][3] = p4
    }

    if (k >= 5) {
      let p5 = 0
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        let probPath = stacks[j] / total
        let remChips = total - stacks[j]
        let remPlayers = n - 1
        for (let pos = 1; pos < 4 && remPlayers > 1; pos++) {
          const otherPlayers = []
          for (let p = 0; p < n; p++) if (p !== i && p !== j) otherPlayers.push(p)
          if (otherPlayers.length > 0) {
            const avgStack = otherPlayers.reduce((s, p) => s + stacks[p], 0) / otherPlayers.length
            probPath *= avgStack / remChips
            remChips -= avgStack
            remPlayers--
          }
        }
        if (remPlayers > 0) p5 += probPath * (stacks[i] / remChips)
      }
      probs[i][4] = Math.max(0, p5)
    }

    const sum = probs[i].reduce((a, b) => a + b, 0)
    if (sum > 0 && Math.abs(sum - 1) > 0.001) {
      for (let pi = 0; pi < k; pi++) probs[i][pi] /= sum
    }
  }

  const results: ICMPlayerResult[] = players.map((p, i) => {
    const chipEV = (p.stack / total) * prizePool
    const icmEquity = probs[i].reduce((s, prob, pi) => s + prob * payouts[pi].prize, 0)
    const icmTax = icmEquity - chipEV

    let totalBF = 0, count = 0
    if (computeBubbleFactor) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const deltaEquity = Math.abs(
          estimateEquityAfterTransfer(stacks, i, j, 1, payouts) - icmEquity
        )
        const linearDelta = (1 / total) * prizePool
        totalBF += deltaEquity / Math.max(0.001, linearDelta)
        count++
      }
    } else {
      totalBF = 1
      count = 1
    }

    return {
      id: p.id, name: p.name, stack: p.stack,
      stackPercent: Math.round(p.stack / total * 10000) / 100,
      icmEquity: Math.round(icmEquity * 100) / 100,
      chipEV: Math.round(chipEV * 100) / 100,
      icmTax: Math.round(icmTax * 100) / 100,
      bubbleFactor: computeBubbleFactor ? Math.round(totalBF / count * 100) / 100 : 0,
    }
  })

  return { players: results, totalChips: total, prizePool }
}

/** Main entry point: compute ICM with bubble factors */
export function calculateICM(players: Player[], payouts: Payout[]): ICMResult {
  return computeICMCore(players, payouts, true)
}

/** Quick estimate: ICM equity after transferring chips (no bubble factor to avoid recursion) */
function estimateEquityAfterTransfer(
  stacks: number[], from: number, to: number, chips: number, payouts: Payout[]
): number {
  const newStacks = [...stacks]
  newStacks[from] = Math.max(0, newStacks[from] - chips)
  newStacks[to] += chips
  const players: Player[] = newStacks.map((s, i) => ({ id: `p${i}`, name: `P${i}`, stack: s }))
  const result = computeICMCore(players, payouts, false)
  return result.players[from].icmEquity
}

export function quickICM(myStack: number, otherStacks: number[], payouts: Payout[]): { equity: number; bubbleFactor: number } {
  const players: Player[] = [
    { id: 'h', name: 'Hero', stack: myStack },
    ...otherStacks.map((s, i) => ({ id: `v${i}`, name: `P${i+1}`, stack: s })),
  ]
  const result = calculateICM(players, payouts)
  return { equity: result.players[0].icmEquity, bubbleFactor: result.players[0].bubbleFactor }
}
