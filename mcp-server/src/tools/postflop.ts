/**
 * MCP Tool: poker_postflop_strategy
 *
 * Wraps postflop-engine.ts → generatePostflopStrategy()
 * Generates GTO flop strategy (cbet/check/raise frequencies) for a board.
 */

import { generatePostflopStrategy } from "../../../src/main/solver/postflop-engine.js";

interface PostflopArgs {
  board: string[];
  heroPosition: number;
  villainPosition: number;
  stackDepth?: number;
  gameType?: "cash" | "tournament";
  ante?: number;
}

export async function handlePostflopStrategy(args: Record<string, unknown>) {
  const {
    board,
    heroPosition,
    villainPosition,
    stackDepth = 100,
    gameType = "cash",
    ante = 0,
  } = args as unknown as PostflopArgs;

  if (!Array.isArray(board) || board.length !== 3) {
    throw new Error("board must be an array of 3 cards, e.g. ['Ks','7h','2d']");
  }
  if (typeof heroPosition !== "number" || heroPosition < 0 || heroPosition > 5) {
    throw new Error(`heroPosition must be 0-5, got ${heroPosition}`);
  }
  if (typeof villainPosition !== "number" || villainPosition < 0 || villainPosition > 5) {
    throw new Error(`villainPosition must be 0-5, got ${villainPosition}`);
  }
  if (heroPosition === villainPosition) {
    throw new Error("heroPosition and villainPosition must be different");
  }

  const result = generatePostflopStrategy(
    board,
    heroPosition,
    villainPosition,
    stackDepth,
    gameType as "cash" | "tournament",
    ante
  );

  // Filter to combos with meaningful weight and non-zero action frequencies
  const activeCombos = result.combos
    .filter((c) => c.weight > 0.01)
    .map((c) => ({
      comboKey: c.comboKey,
      handType: c.handType,
      weight: Math.round(c.weight * 1000) / 1000,
      equity: Math.round(c.equity * 100) / 100,
      actions: c.actions
        .filter((a) => a.frequency > 0.01)
        .map((a) => ({
          action: a.action,
          frequency: Math.round(a.frequency * 100) / 100,
          ev: Math.round(a.ev * 100) / 100,
        })),
    }));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            board: result.board,
            texture: result.texture,
            description: result.description,
            heroPosition: result.heroPosition,
            villainPosition: result.villainPosition,
            isHeroIP: result.isHeroIP,
            recommendedSizing: result.recommendedSizing,
            overallCbetFreq: Math.round(result.overallCbetFreq * 100) / 100,
            activeCombos: activeCombos.length,
            combos: activeCombos,
            summary: `${result.description}. Recommended sizing: ${result.recommendedSizing}. Overall cbet: ${Math.round(result.overallCbetFreq * 100)}%.`,
          },
          null,
          2
        ),
      },
    ],
  };
}
