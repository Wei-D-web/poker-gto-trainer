/**
 * MCP Tool: poker_range_battle
 *
 * Wraps range-battle.ts → simulateRangeBattle()
 * Simulates range vs range equity on a specific board.
 */

import { simulateRangeBattle } from "../../../src/main/solver/range-battle.js";

interface RangeBattleArgs {
  board: string[];
  heroRange: Record<string, number>;
  villainRange: Record<string, number>;
  simulations?: number;
}

export async function handleRangeBattle(args: Record<string, unknown>) {
  const {
    board,
    heroRange,
    villainRange,
    simulations = 5000,
  } = args as unknown as RangeBattleArgs;

  if (!Array.isArray(board) || board.length < 3) {
    throw new Error("board must be an array of at least 3 cards");
  }
  if (!heroRange || typeof heroRange !== "object" || Object.keys(heroRange).length === 0) {
    throw new Error("heroRange must be a non-empty object of combo → frequency");
  }
  if (!villainRange || typeof villainRange !== "object" || Object.keys(villainRange).length === 0) {
    throw new Error("villainRange must be a non-empty object of combo → frequency");
  }

  const result = simulateRangeBattle({
    board,
    heroRange,
    villainRange,
    simulations,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            board: result.boardTexture,
            heroEquity: `${Math.round(result.heroEquity * 1000) / 10}%`,
            villainEquity: `${Math.round(result.villainEquity * 1000) / 10}%`,
            tieEquity: `${Math.round(result.tieEquity * 1000) / 10}%`,
            heroRangeAdvantage: result.heroRangeAdvantage,
            heroValueHands: result.heroValueHands,
            heroBluffHands: result.heroBluffHands,
            villainValueHands: result.villainValueHands,
            villainBluffHands: result.villainBluffHands,
            recommendedAction: result.recommendedAction,
            equityDistribution: result.equityDistribution,
          },
          null,
          2
        ),
      },
    ],
  };
}
