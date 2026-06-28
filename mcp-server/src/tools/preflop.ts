/**
 * MCP Tool: poker_solve_preflop_range
 *
 * Wraps cfr-solver.ts → solvePreflopRange()
 * Generates GTO preflop opening ranges for any position/stack/game type.
 */

import { solvePreflopRange as solverSolvePreflop } from "../../../src/main/solver/cfr-solver.js";

interface PreflopArgs {
  position: number;
  stackDepth?: number;
  gameType?: "cash" | "tournament";
  ante?: number;
}

export async function handlePreflopRange(args: Record<string, unknown>) {
  const {
    position,
    stackDepth = 100,
    gameType = "cash",
    ante = 0,
  } = args as unknown as PreflopArgs;

  if (typeof position !== "number" || position < 0 || position > 5) {
    throw new Error(`position must be 0-5, got ${position}`);
  }

  const labels = ["UTG", "MP", "CO", "BTN", "SB", "BB"];

  // BB cannot open preflop
  if (position === 5) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              position: "BB",
              stackDepth,
              gameType,
              note: "BB cannot open-raise preflop (only defend vs opens).",
              totalCombosInRange: 0,
              vpip: "0%",
              combos: {},
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const range = solverSolvePreflop(position, stackDepth, gameType as "cash" | "tournament", ante);

  // Filter to non-zero combos for compact output
  const entries = Object.entries(range).filter(([, f]) => f > 0);
  const totalCombos = entries.reduce((sum, [, f]) => sum + f, 0);
  const vpip = Math.round((totalCombos / 1326) * 100 * 100) / 100;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            position: labels[position] ?? `POS${position}`,
            stackDepth,
            gameType,
            ante,
            totalCombosInRange: entries.length,
            weightedCombos: Math.round(totalCombos),
            vpip: `${vpip}%`,
            combos: Object.fromEntries(entries),
          },
          null,
          2
        ),
      },
    ],
  };
}
