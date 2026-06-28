/**
 * MCP Tool: poker_icm
 *
 * Wraps icm-calculator.ts → calculateICM()
 * Computes ICM equity distribution using Malmuth-Harville algorithm.
 */

import { calculateICM } from "../../../src/main/solver/icm-calculator.js";

interface ICMArgs {
  players: Array<{
    id: string;
    name?: string;
    stack: number;
  }>;
  payouts: Array<{
    position: number;
    prize: number;
    label?: string;
  }>;
}

export async function handleICM(args: Record<string, unknown>) {
  const { players, payouts } = args as unknown as ICMArgs;

  if (!Array.isArray(players) || players.length < 2) {
    throw new Error("players must be an array of at least 2 players");
  }
  if (!Array.isArray(payouts) || payouts.length < 1) {
    throw new Error("payouts must be a non-empty array");
  }

  const result = calculateICM(
    players.map((p) => ({
      id: p.id,
      name: p.name ?? p.id,
      stack: p.stack,
    })),
    payouts.map((p) => ({
      position: p.position,
      prize: p.prize,
      label: p.label ?? `${p.position}位`,
    }))
  );

  const totalChips = result.totalChips;
  const prizePool = result.prizePool;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            totalChips,
            prizePool,
            players: result.players.map((p) => ({
              name: p.name,
              stack: p.stack,
              stackPercent: `${Math.round(p.stackPercent * 100) / 100}%`,
              icmEquity: `$${Math.round(p.icmEquity * 100) / 100}`,
              chipEV: `$${Math.round(p.chipEV * 100) / 100}`,
              icmTax: `${Math.round(p.icmTax * 100) / 100}%`,
              bubbleFactor: Math.round(p.bubbleFactor * 100) / 100,
            })),
            summary: result.players
              .map(
                (p) =>
                  `${p.name}: stack ${p.stack} (${Math.round(p.stackPercent * 100) / 100}%) → ICM $${Math.round(p.icmEquity * 100) / 100}`
              )
              .join(" | "),
          },
          null,
          2
        ),
      },
    ],
  };
}
