/**
 * MCP Tools: poker_equity, poker_range_equity
 *
 * Wraps equity-calculator.ts → preflopEquity(), rangeVsRangeEquity()
 */

import {
  preflopEquity,
  rangeVsRangeEquity,
} from "../../../src/main/solver/equity-calculator.js";

// ============================================================
// poker_equity
// ============================================================

interface EquityArgs {
  hero: string;
  villain: string;
}

export async function handleEquity(args: Record<string, unknown>) {
  const { hero, villain } = args as unknown as EquityArgs;

  if (!hero || !villain) {
    throw new Error("Both 'hero' and 'villain' combo keys are required");
  }

  const equity = preflopEquity(hero, villain);
  const heroPct = Math.round(equity * 1000) / 10;
  const villainPct = Math.round((1 - equity) * 1000) / 10;

  // Classic matchups lookup
  const classicMatchups: Record<string, number> = {
    "AAvsKK": 82.6,
    "AAvsAKs": 87.9,
    "AAvsQQ": 81.0,
    "KKvsAKo": 69.9,
    "AKsvsQQ": 46.0,
    "AKovsQQ": 43.2,
    "QQvsJJ": 81.0,
    "AKsvs72o": 69.1,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            hero: { hand: hero, equity: `${heroPct}%` },
            villain: { hand: villain, equity: `${villainPct}%` },
            description: `${hero} has ${heroPct}% equity vs ${villain} (${villainPct}%)`,
            favorite: equity > 0.5 ? hero : equity < 0.5 ? villain : "tie",
            isClassic: hero === villain ? "same hand — 50/50 chop" : undefined,
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================
// poker_range_equity
// ============================================================

interface RangeEquityArgs {
  heroRange: Record<string, number>;
  villainRange: Record<string, number>;
}

export async function handleRangeEquity(args: Record<string, unknown>) {
  const { heroRange, villainRange } = args as unknown as RangeEquityArgs;

  if (!heroRange || typeof heroRange !== "object" || Object.keys(heroRange).length === 0) {
    throw new Error("heroRange must be a non-empty object of combo → frequency");
  }
  if (!villainRange || typeof villainRange !== "object" || Object.keys(villainRange).length === 0) {
    throw new Error("villainRange must be a non-empty object of combo → frequency");
  }

  const equity = rangeVsRangeEquity(
    heroRange as Record<string, number>,
    villainRange as Record<string, number>
  );

  // Count combos (weighted)
  const heroWeighted = Object.values(heroRange).reduce((s, f) => s + f, 0);
  const villainWeighted = Object.values(villainRange).reduce((s, f) => s + f, 0);

  const heroPct = Math.round(equity * 1000) / 10;
  const villainPct = Math.round((1 - equity) * 1000) / 10;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            heroEquity: `${heroPct}%`,
            villainEquity: `${villainPct}%`,
            heroComboCount: Object.keys(heroRange).length,
            villainComboCount: Object.keys(villainRange).length,
            heroWeightedCombos: heroWeighted,
            villainWeightedCombos: villainWeighted,
            rangeAdvantage: equity > 0.5 ? "hero" : equity < 0.5 ? "villain" : "neutral",
            advantageMargin: `${Math.abs(heroPct - 50).toFixed(1)}%`,
          },
          null,
          2
        ),
      },
    ],
  };
}
