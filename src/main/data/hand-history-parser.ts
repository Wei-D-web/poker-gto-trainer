/**
 * PokerStars / GG Poker Hand History Parser
 * Parses raw hand history text into structured ParsedHand objects.
 */
import type { ParsedHand } from '../../shared/types/hand-history'
import type { HandAction } from '../solver/hand-analyzer'
import type { Position } from '../../shared/types/poker'

const POSITION_NAMES: Record<string, number> = {
  'UTG': 0, 'MP': 1, 'CO': 2, 'BTN': 3, 'SB': 4, 'BB': 5,
}

function mapSeatToPosition(seat: number, totalSeats: number, buttonSeat: number): number {
  const relativeSeat = ((seat - buttonSeat - 1 + totalSeats) % totalSeats)
  if (relativeSeat === totalSeats - 2) return 4 // SB
  if (relativeSeat === totalSeats - 1) return 5 // BB
  if (relativeSeat === 0) return 0 // UTG
  if (relativeSeat === 1) return totalSeats >= 9 ? 1 : 3 // MP or BTN
  if (relativeSeat === 2) return totalSeats >= 9 ? 2 : 3 // CO or BTN
  return Math.min(relativeSeat - 1, 3) // BTN for 6-max
}

export function parsePokerStarsHand(rawText: string): ParsedHand | null {
  try {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    // Header: "PokerStars Hand #123456: Hold'em No Limit ($0.50/$1.00) - 2024/01/15 14:30:00"
    const headerLine = lines[0]
    const headerMatch = headerLine.match(/PokerStars Hand #(\d+): Hold'em No Limit \(\$([\d.]+)\/\$([\d.]+)\)(?: USD)? - ([\d\/ :]+)/)
    if (!headerMatch) return null

    const handId = headerMatch[1]
    const sb = parseFloat(headerMatch[2])
    const bb = parseFloat(headerMatch[3])
    const date = headerMatch[4]

    // Table info: "Table 'TableName' 6-max Seat #3 is the button"
    const tableLine = lines.find(l => l.startsWith("Table '"))
    const tableMatch = tableLine?.match(/Table '(.+?)' (\d+)-max Seat #(\d+) is the button/)
    const tableName = tableMatch?.[1] || 'Unknown'
    const maxPlayers = parseInt(tableMatch?.[2] || '6')
    const buttonSeat = parseInt(tableMatch?.[3] || '1')

    // Parse seats
    const seatLines = lines.filter(l => l.startsWith('Seat '))
    const seats: Record<string, { name: string; stack: number; seat: number }> = {}
    for (const sl of seatLines) {
      const m = sl.match(/Seat (\d+): (\S+) \(\$?([\d.]+) in chips\)/)
      if (m) seats[m[2]] = { name: m[2], stack: parseFloat(m[3]), seat: parseInt(m[1]) }
    }

    // Find hero from "Dealt to" line
    const dealtLine = lines.find(l => l.includes('Dealt to'))
    const dealtMatch = dealtLine?.match(/Dealt to (\S+) \[(\w\w) (\w\w)\]/)
    if (!dealtMatch) return null

    const heroName = dealtMatch[1]
    const heroHand = [dealtMatch[2], dealtMatch[3]]

    // Find villain (first player who acted against hero, or any other player)
    const heroSeat = seats[heroName]?.seat || 1
    const otherPlayers = Object.entries(seats).filter(([n]) => n !== heroName)
    const villainEntry = otherPlayers[0]
    const villainName = villainEntry?.[0] || 'Villain'

    // Calculate positions
    const heroPosition = mapSeatToPosition(heroSeat, maxPlayers, buttonSeat)
    const villainSeat = seats[villainName]?.seat || 2
    const villainPosition = mapSeatToPosition(villainSeat, maxPlayers, buttonSeat)

    // Stack sizes
    const stackSizes: Record<string, number> = {}
    for (const [name, info] of Object.entries(seats)) {
      stackSizes[name] = info.stack
    }
    const effectiveStack = Math.min(
      seats[heroName]?.stack || 100,
      seats[villainName]?.stack || 100,
    )

    // Pot size from summary
    const summaryLine = lines.find(l => l.startsWith('Total pot'))
    const potMatch = summaryLine?.match(/Total pot \$?([\d.]+)/)
    const potSize = potMatch ? parseFloat(potMatch[1]) : effectiveStack * 0.12

    // Parse board
    const board: string[] = []
    const boardLine = lines.find(l => l.startsWith('Board ['))
    if (boardLine) {
      const boardMatch = boardLine.match(/\[([\w\s]+)\]/)
      if (boardMatch) {
        board.push(...boardMatch[1].trim().split(/\s+/))
      }
    }

    // Parse actions by street
    const actions: HandAction[] = []
    let currentStreet: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop'

    const streetMarkers = ['*** HOLE CARDS ***', '*** FLOP ***', '*** TURN ***', '*** RIVER ***', '*** SHOW DOWN ***', '*** SUMMARY ***']

    for (const line of lines) {
      // Detect street changes
      if (line === '*** FLOP ***') { currentStreet = 'flop'; continue }
      if (line === '*** TURN ***') { currentStreet = 'turn'; continue }
      if (line === '*** RIVER ***') { currentStreet = 'river'; continue }
      if (line === '*** SHOW DOWN ***' || line === '*** SUMMARY ***') break

      // Skip non-action lines
      if (line.startsWith('Dealt to') || line.startsWith('Seat ') || line.startsWith('Table ')
        || line.includes('posts') || line.includes('is the button') || line.startsWith('Uncalled')
        || line.includes('collected') || line.startsWith('Total pot') || line.startsWith('Board [')) continue

      // Parse action: "PlayerName: action"
      const actionMatch = line.match(/^(\S+): (folds|checks|calls \$?([\d.]+)|bets \$?([\d.]+)|raises \$?([\d.]+) to \$?([\d.]+)|all-in \$?([\d.]+))/)
      if (!actionMatch) continue

      const playerName = actionMatch[1]
      const actionText = actionMatch[2]
      const actor: 'hero' | 'villain' = playerName === heroName ? 'hero' : 'villain'

      let actionStr: string
      let amount: number | undefined

      if (actionText === 'folds') {
        actionStr = 'fold'
      } else if (actionText === 'checks') {
        actionStr = 'check'
      } else if (actionText.startsWith('calls')) {
        actionStr = 'call'
        amount = parseFloat(actionMatch[3])
      } else if (actionText.startsWith('bets')) {
        const betAmount = parseFloat(actionMatch[4])
        // Estimate pot as ~6.5bb for a standard SRP at 100bb depth
        const potEstimate = effectiveStack * 0.065
        const pct = Math.round((betAmount / Math.max(1, potEstimate)) * 100)
        // Map to nearest sizing bucket
        if (pct <= 40) actionStr = 'bet_33'
        else if (pct <= 60) actionStr = 'bet_50'
        else if (pct <= 85) actionStr = 'bet_75'
        else if (pct <= 125) actionStr = 'bet_100'
        else actionStr = 'bet_150'
        amount = betAmount
      } else if (actionText.startsWith('raises')) {
        const raiseTo = parseFloat(actionMatch[6])
        const raiseAmount = raiseTo
        const potEstimate = effectiveStack * 0.065
        const pct = Math.round((raiseAmount / Math.max(1, potEstimate)) * 100)
        if (pct <= 50) actionStr = currentStreet === 'preflop' ? '3bet_10bb' : 'raise_2x'
        else actionStr = 'raise_3x'
        amount = raiseTo
      } else if (actionText.startsWith('all-in')) {
        actionStr = 'all_in'
        amount = parseFloat(actionMatch[7])
      } else {
        continue
      }

      actions.push({ street: currentStreet, actor, action: actionStr, amount })
    }

    // Add preflop open action if hero raised first
    if (!actions.some(a => a.street === 'preflop' && a.actor === 'hero')) {
      actions.unshift({ street: 'preflop', actor: 'hero', action: 'open_2.5bb' })
    }

    // Determine showdown and result
    const collectedLine = lines.find(l => l.includes(heroName) && l.includes('collected'))
    const showdown = lines.some(l => l.includes(`${heroName}: shows`))
    const heroWon = !!collectedLine
    const amountWon = heroWon ? parseFloat(collectedLine?.match(/\$?([\d.]+)/)?.[1] || '0') : 0

    return {
      id: handId,
      source: 'pokerstars',
      gameType: 'cash',
      stakes: `$${sb}/$${bb}`,
      tableName,
      maxPlayers,
      heroName,
      heroHand,
      board,
      heroPosition,
      villainName,
      villainPosition,
      stackSizes,
      effectiveStack: Math.round(effectiveStack / bb),
      potSize: Math.round(potSize / bb * 100) / 100,
      actions,
      showdown,
      heroWon,
      amountWon,
      date,
      rawText,
    }
  } catch (e) {
    console.error('Parse error:', e)
    return null
  }
}

export function parseGGPokerHand(rawText: string): ParsedHand | null {
  try {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length < 5) return null

    // GG Poker header: "Poker Hand #RC123456: Hold'em No Limit ($0.50/$1.00) - 2024/01/15 14:30:00"
    const headerLine = lines.find(l => l.includes('Poker Hand #') && l.includes('Hold\'em'))
    if (!headerLine) {
      // Fall back to PokerStars parser
      return parsePokerStarsHand(rawText)
    }

    const headerMatch = headerLine.match(/Poker Hand #(\w+): Hold'em No Limit \(\$?([\d.]+)\/\$?([\d.]+)\)(?: USD)? - (.+)/)
    if (!headerMatch) return parsePokerStarsHand(rawText)

    const handId = headerMatch[1]
    const sb = parseFloat(headerMatch[2])
    const bb = parseFloat(headerMatch[3])
    const date = headerMatch[4]

    // GG Poker seat info: "Seat 1: PlayerName ($100 in chips)"
    const seatLines = lines.filter(l => l.match(/^Seat \d+:/))
    const seats: Record<string, { name: string; stack: number; seat: number }> = {}
    for (const sl of seatLines) {
      const m = sl.match(/Seat (\d+): (\S+) \(\$?([\d.]+) in chips\)/)
      if (m) seats[m[2]] = { name: m[2], stack: parseFloat(m[3]), seat: parseInt(m[1]) }
    }

    // Find button
    const buttonLine = lines.find(l => l.includes('is the button'))
    const buttonMatch = buttonLine?.match(/Seat #(\d+)/)
    const buttonSeat = parseInt(buttonMatch?.[1] || '1')

    // Find hero
    const dealtLine = lines.find(l => l.includes('Dealt to'))
    const dealtMatch = dealtLine?.match(/Dealt to (\S+) \[(\w\w) (\w\w)\]/)
    if (!dealtMatch) return parsePokerStarsHand(rawText)

    const heroName = dealtMatch[1]
    const heroHand = [dealtMatch[2], dealtMatch[3]]
    const heroSeat = seats[heroName]?.seat || 1
    const otherPlayers = Object.entries(seats).filter(([n]) => n !== heroName)
    const villainName = otherPlayers[0]?.[0] || 'Villain'
    const villainSeat = seats[villainName]?.seat || 2

    const maxPlayers = Object.keys(seats).length
    const heroPosition = mapSeatToPosition(heroSeat, maxPlayers, buttonSeat)
    const villainPosition = mapSeatToPosition(villainSeat, maxPlayers, buttonSeat)

    const stackSizes: Record<string, number> = {}
    for (const [name, info] of Object.entries(seats)) stackSizes[name] = info.stack
    const effectiveStack = Math.min(seats[heroName]?.stack || 100, seats[villainName]?.stack || 100)

    // Board
    const board: string[] = []
    const boardLine = lines.find(l => l.startsWith('Board ['))
    if (boardLine) {
      const bm = boardLine.match(/\[([\w\s]+)\]/)
      if (bm) board.push(...bm[1].trim().split(/\s+/))
    }

    // Actions - GG Poker uses similar format to PokerStars
    const actions: HandAction[] = []
    let currentStreet: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop'

    for (const line of lines) {
      if (line.startsWith('*** FLOP ***')) { currentStreet = 'flop'; continue }
      if (line.startsWith('*** TURN ***')) { currentStreet = 'turn'; continue }
      if (line.startsWith('*** RIVER ***')) { currentStreet = 'river'; continue }
      if (line.startsWith('*** SHOW DOWN ***') || line.startsWith('*** SUMMARY ***')) break
      if (line.includes('Dealt to') || line.includes('posts') || line.includes('Uncalled')
        || line.includes('collected') || line.startsWith('Total pot') || line.startsWith('Board [')) continue

      const am = line.match(/^(\S+): (folds|checks|calls(?: \$?([\d.]+))?|bets \$?([\d.]+)|raises \$?([\d.]+)(?: to \$?([\d.]+))?|all-in(?: \$?([\d.]+))?)/)
      if (!am) continue

      const playerName = am[1]
      const actionText = am[2]
      const actor: 'hero' | 'villain' = playerName === heroName ? 'hero' : 'villain'

      let actionStr: string
      if (actionText === 'folds') actionStr = 'fold'
      else if (actionText === 'checks' || actionText.startsWith('checks')) actionStr = 'check'
      else if (actionText.startsWith('calls')) actionStr = 'call'
      else if (actionText.startsWith('bets')) {
        const betAmt = parseFloat(am[4])
        // Estimate pot as ~6.5bb for a standard SRP at 100bb depth
        const potEst = effectiveStack * 0.065
        const pct = Math.round((betAmt / Math.max(1, potEst)) * 100)
        actionStr = pct <= 40 ? 'bet_33' : pct <= 60 ? 'bet_50' : pct <= 85 ? 'bet_75' : pct <= 125 ? 'bet_100' : 'bet_150'
      } else if (actionText.startsWith('raises')) {
        actionStr = currentStreet === 'preflop' ? '3bet_10bb' : 'raise_2x'
      } else if (actionText.startsWith('all-in')) {
        actionStr = 'all_in'
      } else continue

      actions.push({ street: currentStreet, actor, action: actionStr })
    }

    const collectedLine = lines.find(l => l.includes(heroName) && l.includes('collected'))
    const potLine = lines.find(l => l.startsWith('Total pot'))
    const potSize = potLine ? parseFloat(potLine.match(/\$?([\d.]+)/)?.[1] || '0') : effectiveStack * 0.12

    return {
      id: handId, source: 'ggpoker', gameType: 'cash',
      stakes: `$${sb}/$${bb}`, tableName: 'GG Table', maxPlayers,
      heroName, heroHand, board, heroPosition, villainName, villainPosition,
      stackSizes, effectiveStack: Math.round(effectiveStack / bb),
      potSize: Math.round(potSize / bb * 100) / 100,
      actions, showdown: lines.some(l => l.includes(`${heroName}: shows`)),
      heroWon: !!collectedLine,
      amountWon: collectedLine ? parseFloat(collectedLine.match(/\$?([\d.]+)/)?.[1] || '0') : 0,
      date, rawText,
    }
  } catch {
    return parsePokerStarsHand(rawText)
  }
}

export function autoDetectAndParse(rawText: string): ParsedHand | null {
  if (rawText.includes('PokerStars Hand #')) {
    return parsePokerStarsHand(rawText)
  }
  if (rawText.includes('GGPoker')) {
    return parseGGPokerHand(rawText)
  }
  // Default: try PokerStars format
  return parsePokerStarsHand(rawText)
}

/**
 * Parse WPK (德州扑克国内平台) hand history.
 * Format: "#Game No : 1234567890" style headers.
 */
export function parseWPKHand(rawText: string): ParsedHand | null {
  try {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    // WPK header variations
    const headerLine = lines.find(l => l.includes('Game No') || l.includes('游戏编号'))
    if (!headerLine) return parsePokerStarsHand(rawText) // fallback

    const idMatch = headerLine.match(/(?:Game No|游戏编号)\s*[:：]\s*(\d+)/)
    const handId = idMatch?.[1] || `wpk_${Date.now()}`

    // Stakes detection
    const stakesLine = lines.find(l => l.includes('/') && (l.includes('盲注') || l.includes('blind') || l.includes('SB')))
    let sb = 0.5, bb = 1.0
    if (stakesLine) {
      const amounts = stakesLine.match(/(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)/)
      if (amounts) { sb = parseFloat(amounts[1]); bb = parseFloat(amounts[2]) }
    }

    // Date
    const dateLine = lines.find(l => l.includes('日期') || l.includes('Date') || l.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/))
    const dateMatch = dateLine?.match(/(\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\s*\d{1,2}:\d{2}(?::\d{2})?)/)
    const date = dateMatch?.[1] || new Date().toISOString()

    // Table
    const tableLine = lines.find(l => l.includes('桌号') || l.includes('Table'))
    const tableMatch = tableLine?.match(/(?:桌号|Table)\s*[:：]?\s*['"]?(\S+)/)
    const tableName = tableMatch?.[1] || 'WPK Table'

    // Seats
    const seatLines = lines.filter(l => l.match(/Seat\s*\d+|座位\s*\d+/))
    const seats: Record<string, { name: string; stack: number; seat: number }> = {}
    for (const sl of seatLines) {
      const m = sl.match(/(?:Seat|座位)\s*(\d+)\s*[:：]\s*(\S+)\s*\(?\$?([\d.]+)/) ||
        sl.match(/玩家\s*(\d+)\s*[:：]\s*(\S+)\s*(\d+)/)
      if (m) seats[m[2]] = { name: m[2], stack: parseFloat(m[3]), seat: parseInt(m[1]) }
    }

    // Button
    const buttonLine = lines.find(l => l.includes('庄位') || l.includes('button') || l.includes('Button'))
    const buttonSeat = parseInt(buttonLine?.match(/(?:Seat|座位)\s*(\d+)/)?.[1] || '1')

    // Hero hand
    const handLine = lines.find(l => l.includes('底牌') || l.includes('Dealt') || l.includes('手牌'))
    const handMatch = handLine?.match(/\[(\w\w)\s*(\w\w)\]/) || handLine?.match(/(\w\w)\s*,\s*(\w\w)/)
    if (!handMatch) return null
    const heroHand = [handMatch[1], handMatch[2]]

    // Hero name
    const heroNameMatch = handLine?.match(/玩家\s*[:：]?\s*(\S+)/) || handLine?.match(/Player\s*[:：]?\s*(\S+)/)
    const heroName = heroNameMatch?.[1] || Object.keys(seats)[0] || 'Hero'

    // Positions
    const heroSeat = seats[heroName]?.seat || 1
    const otherPlayers = Object.entries(seats).filter(([n]) => n !== heroName)
    const villainName = otherPlayers[0]?.[0] || 'Villain'
    const villainSeat = seats[villainName]?.seat || 2
    const maxPlayers = Object.keys(seats).length || 6

    // Use standard position mapping (same as PokerStars/GG)
    const heroPosition = mapSeatToPosition(heroSeat, maxPlayers, buttonSeat)
    const villainPosition = mapSeatToPosition(villainSeat, maxPlayers, buttonSeat)

    const stackSizes: Record<string, number> = {}
    for (const [name, info] of Object.entries(seats)) stackSizes[name] = info.stack
    const effectiveStack = Math.min(seats[heroName]?.stack || 100, seats[villainName]?.stack || 100)

    // Board
    const board: string[] = []
    const boardLine = lines.find(l => l.includes('公共牌') || l.includes('Board') || l.includes('公牌'))
    if (boardLine) {
      const bm = boardLine.match(/\[([\w\s]+)\]/) || boardLine.match(/[:：]\s*([\w\s]+)/)
      if (bm) board.push(...bm[1].trim().split(/\s+/).filter(c => c.length === 2))
    }

    // Parse actions (simplified WPK format)
    const actions: HandAction[] = []
    let currentStreet: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop'

    for (const line of lines) {
      if (line.includes('*** FLOP ***') || line.includes('翻牌:')) { currentStreet = 'flop'; continue }
      if (line.includes('*** TURN ***') || line.includes('转牌:')) { currentStreet = 'turn'; continue }
      if (line.includes('*** RIVER ***') || line.includes('河牌:')) { currentStreet = 'river'; continue }
      if (line.includes('*** SHOW DOWN ***') || line.includes('*** SUMMARY ***')) break

      const actionMatch = line.match(/(\S+)\s*[:：]\s*(弃牌|跟注|加注|过牌|check|fold|call|bet|raise|all.?in|全下)/i)
      if (!actionMatch) continue

      const playerName = actionMatch[1]
      const actionText = actionMatch[2].toLowerCase()
      const actor: 'hero' | 'villain' = playerName === heroName ? 'hero' : 'villain'

      let actionStr: string
      if (actionText.includes('弃牌') || actionText === 'fold') actionStr = 'fold'
      else if (actionText.includes('过牌') || actionText === 'check') actionStr = 'check'
      else if (actionText.includes('跟注') || actionText === 'call') actionStr = 'call'
      else if (actionText.includes('加注') || actionText === 'raise') actionStr = 'raise_2x'
      else if (actionText.includes('bet')) actionStr = 'bet_50'
      else if (actionText.includes('全下') || actionText.includes('all')) actionStr = 'all_in'
      else continue

      actions.push({ street: currentStreet, actor, action: actionStr })
    }

    // Add preflop open if no preflop actions
    if (!actions.some(a => a.street === 'preflop' && a.actor === 'hero')) {
      actions.unshift({ street: 'preflop', actor: 'hero', action: 'open_2.5bb' })
    }

    // Determine result
    const winLine = lines.find(l => l.includes(heroName) && (l.includes('赢得') || l.includes('win') || l.includes('collected')))
    const heroWon = !!winLine
    const amountWon = heroWon
      ? parseFloat(winLine?.match(/\$?([\d.]+)/)?.[1] || '0')
      : 0

    return {
      id: handId,
      source: 'wpk' as any,
      gameType: 'cash',
      stakes: `$${sb}/$${bb}`,
      tableName,
      maxPlayers,
      heroName,
      heroHand,
      board,
      heroPosition,
      villainName,
      villainPosition,
      stackSizes,
      effectiveStack: Math.round(effectiveStack / bb),
      potSize: Math.round((effectiveStack * 0.12) / bb * 100) / 100,
      actions,
      showdown: lines.some(l => l.includes('show') || l.includes('亮牌')),
      heroWon,
      amountWon,
      date,
      rawText,
    }
  } catch (e) {
    console.error('WPK parse error:', e)
    return parsePokerStarsHand(rawText)
  }
}

export function parseMultipleHands(rawText: string): ParsedHand[] {
  const hands: ParsedHand[] = []
  const parts = rawText.split(/(?=PokerStars Hand #|GGPoker|Game No|游戏编号)/)
  for (const part of parts) {
    if (part.trim().length < 50) continue
    const hand = autoDetectAndParse(part)
    if (hand) hands.push(hand)
  }
  return hands
}
