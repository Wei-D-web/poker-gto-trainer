/**
 * MCP Tools: poker_board_texture, poker_turn_river_analysis
 *
 * Wraps poker-math.ts → analyzeBoard()
 * Wraps turn-river-engine.ts → analyzeTurn(), analyzeRiver()
 */

import { analyzeBoard } from "../../../src/shared/utils/poker-math.js";
import {
  analyzeTurn,
  analyzeRiver,
} from "../../../src/main/solver/turn-river-engine.js";

// ============================================================
// poker_board_texture
// ============================================================

interface BoardTextureArgs {
  board: string[];
}

export async function handleBoardTexture(args: Record<string, unknown>) {
  const { board } = args as unknown as BoardTextureArgs;

  if (!Array.isArray(board)) {
    throw new Error("board must be an array of cards");
  }

  if (board.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              board: [],
              note: "Preflop — no board yet.",
              texture: "none",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const result = analyzeBoard(board);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            board: board,
            cards: board.length,
            street:
              board.length === 3
                ? "flop"
                : board.length === 4
                  ? "turn"
                  : "river",
            texture: result.texture,
            isPaired: result.isPaired,
            isMonotone: result.isMonotone,
            isRainbow: result.isRainbow,
            flushDrawPossible: result.flushDrawPossible,
            straightDrawPossible: result.straightDrawPossible,
            highCardRank: result.highCardRank,
            connectivity: result.connectivity,
            clusterId: result.clusterId,
            description: `${result.texture} — ${board.join(" ")}`,
          },
          null,
          2
        ),
      },
    ],
  };
}

// ============================================================
// poker_turn_river_analysis
// ============================================================

interface TurnRiverArgs {
  currentBoard: string[];
  newCard: string;
  stage?: "turn" | "river";
}

export async function handleTurnRiverAnalysis(args: Record<string, unknown>) {
  const { currentBoard, newCard, stage = "turn" } = args as unknown as TurnRiverArgs;

  if (!Array.isArray(currentBoard) || currentBoard.length < 3) {
    throw new Error("currentBoard must have at least 3 cards (flop)");
  }
  if (!newCard || typeof newCard !== "string") {
    throw new Error("newCard is required, e.g. 'Th'");
  }

  if (stage === "river") {
    const result = analyzeRiver(currentBoard, newCard);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              stage: "river",
              turnBoard: result.turnBoard,
              riverCard: result.riverCard,
              fullBoard: result.fullBoard,
              completedDraws: result.completedDraws,
              strategy: {
                valueBetFreq: `${Math.round(result.strategy.valueBetFreq * 100)}%`,
                bluffFreq: `${Math.round(result.strategy.bluffFreq * 100)}%`,
                checkBackFreq: `${Math.round(result.strategy.checkBackFreq * 100)}%`,
                sizingPreference: result.strategy.sizingPreference,
                description: result.strategy.description,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const result = analyzeTurn(currentBoard, newCard);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            stage: "turn",
            flopBoard: result.flopBoard,
            turnCard: result.turnCard,
            fullBoard: result.fullBoard,
            turnTexture: result.turnTexture,
            isScareCard: result.isScareCard,
            isBrick: result.isBrick,
            isOvercard: result.isOvercard,
            strategyShift: {
              doubleBarrelFreq: `${Math.round(result.strategyShift.doubleBarrelFreq * 100)}%`,
              checkBackFreq: `${Math.round(result.strategyShift.checkBackFreq * 100)}%`,
              sizingPreference: result.strategyShift.sizingPreference,
              description: result.strategyShift.description,
            },
            recommendations: result.recommendations.map((r) => ({
              handType: r.handType,
              action: r.action,
              frequency: `${Math.round(r.frequency * 100)}%`,
              reasoning: r.reasoning,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
