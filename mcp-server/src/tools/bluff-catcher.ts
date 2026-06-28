/**
 * MCP Tool: poker_bluff_catcher
 *
 * Analyzes a river bluff-catching decision using hand evaluation,
 * blocker analysis, MDF (Minimum Defense Frequency), and pot odds.
 * Composes hand-evaluator.ts, turn-river-engine.ts, and equity logic.
 */

import { evaluateHand } from "../../../src/main/solver/hand-evaluator.js";
import { analyzeRiver } from "../../../src/main/solver/turn-river-engine.js";
import { preflopEquity } from "../../../src/main/solver/equity-calculator.js";

interface BluffCatcherArgs {
  heroHand: string;
  board: string[];
  heroPosition: number;
  villainPosition: number;
  potSize: number;
  betSize: number;
  effectiveStack?: number;
}

/**
 * Expand a ComboKey into two individual card strings.
 */
function expandCombo(combo: string): string[] {
  if (combo.length === 2) {
    // Pair: e.g. "AA" → ["Ah", "Ad"]
    return [`${combo[0]}h`, `${combo[1]}d`];
  }
  if (combo.length === 3) {
    const r1 = combo[0];
    const r2 = combo[1];
    const suited = combo[2];
    if (suited === "s") {
      return [`${r1}s`, `${r2}s`];
    } else {
      // Offsuit
      if (r1 === r2) {
        return [`${r1}h`, `${r2}d`];
      }
      return [`${r1}h`, `${r2}c`];
    }
  }
  // Fallback: treat as two cards directly
  return [combo.slice(0, 2), combo.slice(2)];
}

export async function handleBluffCatcher(args: Record<string, unknown>) {
  const {
    heroHand,
    board,
    heroPosition,
    villainPosition,
    potSize,
    betSize,
    effectiveStack = 100,
  } = args as unknown as BluffCatcherArgs;

  if (!heroHand) {
    throw new Error("heroHand is required, e.g. 'ATh', 'K9s', '55'");
  }
  if (!Array.isArray(board) || board.length !== 5) {
    throw new Error("board must be an array of exactly 5 cards");
  }
  if (typeof potSize !== "number" || potSize <= 0) {
    throw new Error("potSize must be a positive number");
  }
  if (typeof betSize !== "number" || betSize <= 0) {
    throw new Error("betSize must be a positive number");
  }

  // Expand combo to cards
  const heroCards = expandCombo(heroHand);

  // Evaluate hand strength
  const handResult = evaluateHand([...heroCards, ...board]);

  // Analyze river
  const turnBoard = board.slice(0, 4);
  const riverCard = board[4];
  const riverAnalysis = analyzeRiver(turnBoard, riverCard);

  // MDF (Minimum Defense Frequency)
  const betFraction = betSize / potSize;
  const mdf = 1 / (1 + betFraction);
  const potOdds = betSize / (potSize + betSize * 2);

  // Required equity to call
  const requiredEquity = betSize / (potSize + betSize + betSize);

  // Approximate EV of calling using hand strength as equity proxy
  const handScore = handResult.score;
  // Normalize to a rough equity estimate (not accurate but gives direction)
  const maxScore = 7417; // royal flush
  const roughEquity = Math.min(0.95, Math.max(0, handScore / maxScore));

  const evCall = roughEquity * (potSize + betSize) - (1 - roughEquity) * betSize;
  const evFold = 0;

  // Decision logic
  let correctAction: "call" | "fold";
  let decisionType: "pure_call" | "pure_fold" | "mixed";
  let confidence: string;

  if (evCall > evFold + 1) {
    correctAction = "call";
    decisionType = "pure_call";
    confidence = "Clear call — significant +EV";
  } else if (evCall < evFold - 1) {
    correctAction = "fold";
    decisionType = "pure_fold";
    confidence = "Clear fold — significant -EV";
  } else if (Math.abs(evCall - evFold) <= 1) {
    correctAction = evCall > evFold ? "call" : "fold";
    decisionType = "mixed";
    confidence = "Close decision — either call or fold is reasonable";
  } else {
    correctAction = evCall > evFold ? "call" : "fold";
    decisionType = "pure_call";
    confidence = "Lean towards call";
  }

  // Blocker analysis (simplified)
  const heroRanks = heroCards.map((c) => c[0]);
  const blockersValue: string[] = [];
  const blockersBluff: string[] = [];

  // Check if hero blocks flush
  const riverSuit = riverCard[1];
  const heroHasRiverSuit = heroCards.some((c) => c[1] === riverSuit);
  if (heroHasRiverSuit && riverAnalysis.completedDraws.some((d) => d.includes("同花"))) {
    blockersValue.push("blocks backdoor flush");
  } else if (!heroHasRiverSuit && riverAnalysis.completedDraws.some((d) => d.includes("同花"))) {
    blockersBluff.push("does NOT block flush — villain more likely to bluff");
  }

  // Check for straight blockers
  if (handResult.rank === "straight" || handResult.rank === "straight_flush") {
    blockersValue.push("hero has straight/straight-flush — unblocking bluffs");
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            heroHand: heroHand,
            heroCards,
            board,
            heroPosition,
            villainPosition,
            handStrength: handResult.rank,
            handDescription: handResult.description,
            potSize,
            betSize,
            betSizing: `${Math.round(betFraction * 100)}% pot`,
            mdf: `${Math.round(mdf * 100)}%`,
            potOdds: `${Math.round(potOdds * 100)}%`,
            requiredEquityToCall: `${Math.round(requiredEquity * 1000) / 10}%`,
            roughEquity: `${Math.round(roughEquity * 1000) / 10}%`,
            evCall: Math.round(evCall * 100) / 100,
            evFold,
            correctAction,
            decisionType,
            confidence,
            completedDraws: riverAnalysis.completedDraws,
            blockersValue,
            blockersBluff,
            reasoning: [
              `Board: ${board.join(" ")} — ${riverAnalysis.completedDraws.length > 0 ? riverAnalysis.completedDraws.join(", ") + " completed" : "draws missed"}`,
              `Hero hand: ${heroHand} → ${handResult.description}`,
              `Villain bets ${Math.round(betFraction * 100)}% pot → MDF = ${Math.round(mdf * 100)}%`,
              `Required equity to call: ${Math.round(requiredEquity * 1000) / 10}%`,
              `EV(call) = ${Math.round(evCall * 100) / 100}bb, EV(fold) = 0bb`,
              `Decision: ${correctAction.toUpperCase()} (${decisionType.replace("_", " ")})`,
            ],
          },
          null,
          2
        ),
      },
    ],
  };
}
