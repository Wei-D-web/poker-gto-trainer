/**
 * Batch GTO Analyzer — runs hand-analyzer on multiple parsed hands.
 */
import { analyzeHand, type HandInput } from '../solver/hand-analyzer'
import type { ParsedHand, BatchAnalysisResult } from '../../shared/types/hand-history'

export function analyzeParsedHand(hand: ParsedHand): BatchAnalysisResult {
  try {
    const input: HandInput = {
      heroHand: hand.heroHand,
      board: hand.board,
      heroPosition: hand.heroPosition as any,
      villainPosition: hand.villainPosition as any,
      stackDepth: hand.effectiveStack,
      gameType: hand.gameType,
      potSize: hand.potSize,
      actions: hand.actions,
    }

    const result = analyzeHand(input)

    return {
      handId: hand.id,
      success: true,
      grade: result.summary.grade,
      totalEVLost: Math.round(result.summary.totalEVLost * 100) / 100,
      mistakes: result.summary.mistakes,
    }
  } catch (e) {
    return {
      handId: hand.id,
      success: false,
      error: String(e),
    }
  }
}

export function batchAnalyzeHands(hands: ParsedHand[]): BatchAnalysisResult[] {
  return hands.map(analyzeParsedHand)
}
