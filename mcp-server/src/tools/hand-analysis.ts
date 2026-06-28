/**
 * MCP Tools: poker_hand_evaluate, poker_analyze_hand
 *
 * Wraps hand-evaluator.ts → evaluateHand(), compareHands()
 * Wraps hand-analyzer.ts → analyzeHand()
 */

import {
  evaluateHand,
  compareHands,
} from "../../../src/main/solver/hand-evaluator.js";
import { analyzeHand } from "../../../src/main/solver/hand-analyzer.js";

// ============================================================
// poker_hand_evaluate
// ============================================================

interface HandEvalArgs {
  holeCards: string[];
  board: string[];
}

export async function handleHandEvaluate(args: Record<string, unknown>) {
  const { holeCards, board } = args as unknown as HandEvalArgs;

  if (!Array.isArray(holeCards) || holeCards.length !== 2) {
    throw new Error("holeCards must be an array of 2 cards");
  }
  if (!Array.isArray(board) || board.length < 3 || board.length > 5) {
    throw new Error("board must be an array of 3-5 cards");
  }

  const allCards = [...holeCards, ...board];
  const result = evaluateHand(allCards);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            holeCards,
            board,
            hand: result.rank,
            score: result.score,
            description: result.description,
            bestFive: result.bestFive,
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================
// poker_analyze_hand
// ============================================================

interface AnalyzeHandArgs {
  heroHand: string[];
  board: string[];
  heroPosition: number;
  villainPosition: number;
  stackDepth: number;
  gameType?: "cash" | "tournament";
  potSize?: number;
  actions: Array<{
    street: "preflop" | "flop" | "turn" | "river";
    actor: "hero" | "villain";
    action: string;
    amount?: number;
  }>;
}

export async function handleAnalyzeHand(args: Record<string, unknown>) {
  const {
    heroHand,
    board,
    heroPosition,
    villainPosition,
    stackDepth,
    gameType = "cash",
    potSize = 0,
    actions,
  } = args as unknown as AnalyzeHandArgs;

  if (!Array.isArray(heroHand) || heroHand.length !== 2) {
    throw new Error("heroHand must be an array of 2 cards");
  }
  if (!Array.isArray(board)) {
    throw new Error("board must be an array");
  }
  if (typeof heroPosition !== "number" || heroPosition < 0 || heroPosition > 5) {
    throw new Error(`heroPosition must be 0-5, got ${heroPosition}`);
  }
  if (typeof villainPosition !== "number" || villainPosition < 0 || villainPosition > 5) {
    throw new Error(`villainPosition must be 0-5, got ${villainPosition}`);
  }
  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error("actions must be a non-empty array of actions");
  }

  const result = analyzeHand({
    heroHand,
    board,
    heroPosition,
    villainPosition,
    stackDepth,
    gameType: gameType as "cash" | "tournament",
    potSize,
    actions,
  });

  // Build a readable summary
  const decisions = result.decisions.map((d) => ({
    street: d.street,
    actor: d.actor,
    action: d.action,
    isGTO: d.isGTO,
    gtoAction: d.gtoAction,
    evDifference: Math.round(d.evDifference * 100) / 100,
    severity: d.severity,
    explanation: d.explanation,
  }));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            grade: result.summary.grade,
            totalActions: result.summary.totalActions,
            mistakes: result.summary.mistakes,
            gtoActions: result.summary.totalActions - result.summary.mistakes,
            totalEVLost: Math.round(result.summary.totalEVLost * 100) / 100,
            accuracy: `${Math.round(((result.summary.totalActions - result.summary.mistakes) / result.summary.totalActions) * 100)}%`,
            biggestMistake: result.summary.biggestMistake,
            assessment: result.summary.overallAssessment,
            decisions,
          },
          null,
          2
        ),
      },
    ],
  };
}
