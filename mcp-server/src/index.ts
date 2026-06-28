/**
 * PokerGTO MCP Server
 *
 * Exposes poker analysis tools to Claude Code via the Model Context Protocol.
 * Runs as a standalone Node.js process over stdio transport.
 *
 * Tools provided (12 in v1):
 *   poker_solve_preflop_range  — preflop opening ranges
 *   poker_postflop_strategy    — postflop GTO cbet/check/raise frequencies
 *   poker_equity               — two-hand preflop equity
 *   poker_range_equity         — range vs range equity
 *   poker_range_battle         — range battle simulation on a board
 *   poker_board_texture        — board texture classification
 *   poker_hand_evaluate        — best 5-card hand evaluation
 *   poker_analyze_hand         — full hand history GTO analysis
 *   poker_bluff_catcher        — river bluff-catching decision
 *   poker_icm                  — ICM prize distribution
 *   poker_turn_river_analysis  — turn/river strategy shifts
 *   poker_exploit_adjustment   — opponent exploitation adjustments
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { handlePreflopRange } from "./tools/preflop.js";
import { handlePostflopStrategy } from "./tools/postflop.js";
import { handleEquity, handleRangeEquity } from "./tools/equity.js";
import { handleRangeBattle } from "./tools/range-battle.js";
import { handleHandEvaluate, handleAnalyzeHand } from "./tools/hand-analysis.js";
import { handleBoardTexture, handleTurnRiverAnalysis } from "./tools/board.js";
import { handleICM } from "./tools/icm.js";
import { handleExploitAdjustment } from "./tools/exploit.js";
import { handleBluffCatcher } from "./tools/bluff-catcher.js";

// ============================================================
// Tool Definitions
// ============================================================

const TOOLS = [
  {
    name: "poker_solve_preflop_range",
    description:
      "Generate a GTO preflop opening range for a given position and stack depth. " +
      "Returns each of the 169 hand combos with its open-raise frequency (0-1), plus VPIP/PFR stats. " +
      "Positions: 0=UTG, 1=MP, 2=CO, 3=BTN, 4=SB, 5=BB.",
    inputSchema: {
      type: "object",
      properties: {
        position: {
          type: "integer",
          description: "Position index: 0=UTG, 1=MP, 2=CO, 3=BTN, 4=SB, 5=BB",
          minimum: 0,
          maximum: 5,
        },
        stackDepth: {
          type: "integer",
          description: "Effective stack in big blinds",
          default: 100,
        },
        gameType: {
          type: "string",
          enum: ["cash", "tournament"],
          default: "cash",
        },
        ante: {
          type: "number",
          description: "Ante in big blinds (0 for cash games)",
          default: 0,
        },
      },
      required: ["position"],
    },
  },
  {
    name: "poker_postflop_strategy",
    description:
      "Generate GTO postflop strategy (cbet/check/raise frequencies) for a given board, " +
      "positions, and stack depth. Returns per-combo analysis with hand type, action distribution, " +
      "and aggregate cbet frequency with sizing recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        board: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 3,
          description: '3 flop cards, e.g. ["Ks", "7h", "2d"]',
        },
        heroPosition: {
          type: "integer",
          description: "Hero position: 0=UTG, 1=MP, 2=CO, 3=BTN, 4=SB, 5=BB",
          minimum: 0,
          maximum: 5,
        },
        villainPosition: {
          type: "integer",
          description: "Villain position",
          minimum: 0,
          maximum: 5,
        },
        stackDepth: {
          type: "integer",
          description: "Effective stack in big blinds",
          default: 100,
        },
        gameType: {
          type: "string",
          enum: ["cash", "tournament"],
          default: "cash",
        },
        ante: {
          type: "number",
          description: "Ante in big blinds",
          default: 0,
        },
      },
      required: ["board", "heroPosition", "villainPosition"],
    },
  },
  {
    name: "poker_equity",
    description:
      "Calculate preflop equity of one hand versus another. " +
      "Use combo keys like 'AA', 'KK', 'AKs', 'AKo', 'T9s', '72o'.",
    inputSchema: {
      type: "object",
      properties: {
        hero: {
          type: "string",
          description: "Hero hand combo key, e.g. 'AKs', 'AA', 'T9o'",
        },
        villain: {
          type: "string",
          description: "Villain hand combo key",
        },
      },
      required: ["hero", "villain"],
    },
  },
  {
    name: "poker_range_equity",
    description:
      "Calculate aggregate equity of one range versus another range (preflop). " +
      "Provide ranges as a mapping of combo key → frequency (0-1).",
    inputSchema: {
      type: "object",
      properties: {
        heroRange: {
          type: "object",
          description:
            "Hero range: mapping of combo key to frequency, e.g. { 'AA': 1.0, 'AKs': 0.8, 'QQ': 1.0 }",
        },
        villainRange: {
          type: "object",
          description: "Villain range: mapping of combo key to frequency",
        },
      },
      required: ["heroRange", "villainRange"],
    },
  },
  {
    name: "poker_range_battle",
    description:
      "Simulate range vs range equity on a specific board. " +
      "More accurate than preflop-only range equity as it accounts for board interaction.",
    inputSchema: {
      type: "object",
      properties: {
        board: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 5,
          description: "Board cards (3-5 cards)",
        },
        heroRange: {
          type: "object",
          description: "Hero range: combo key → frequency",
        },
        villainRange: {
          type: "object",
          description: "Villain range: combo key → frequency",
        },
        simulations: {
          type: "integer",
          description: "Number of simulations",
          default: 5000,
        },
      },
      required: ["board", "heroRange", "villainRange"],
    },
  },
  {
    name: "poker_board_texture",
    description:
      "Analyze a board's texture: connectivity, flush/straight draws, pairedness, high card. " +
      "Essential for understanding how a board interacts with ranges.",
    inputSchema: {
      type: "object",
      properties: {
        board: {
          type: "array",
          items: { type: "string" },
          minItems: 0,
          maxItems: 5,
          description:
            "Board cards (0 for preflop, 3 for flop, 4 for turn, 5 for river)",
        },
      },
      required: ["board"],
    },
  },
  {
    name: "poker_hand_evaluate",
    description:
      "Evaluate the best 5-card poker hand from hole cards and a board. " +
      "Returns hand rank (pair, two pair, trips, straight, flush, full house, quads, straight flush, royal flush), score, and description.",
    inputSchema: {
      type: "object",
      properties: {
        holeCards: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 2,
          description: "Two hole cards, e.g. ['Ah', 'Kd']",
        },
        board: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 5,
          description: "Board cards (3-5 cards)",
        },
      },
      required: ["holeCards", "board"],
    },
  },
  {
    name: "poker_analyze_hand",
    description:
      "Full hand history analysis against GTO baseline. " +
      "Compares each hero decision to GTO mixed strategy, quantifies EV loss per decision, " +
      "and assigns an overall grade (A+ through F). The most powerful analysis tool.",
    inputSchema: {
      type: "object",
      properties: {
        heroHand: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 2,
          description: "Hero's hole cards, e.g. ['Ah', 'Kh']",
        },
        board: {
          type: "array",
          items: { type: "string" },
          minItems: 0,
          maxItems: 5,
          description: "Community cards (0-5)",
        },
        heroPosition: {
          type: "integer",
          description: "Hero position: 0=UTG, 1=MP, 2=CO, 3=BTN, 4=SB, 5=BB",
          minimum: 0,
          maximum: 5,
        },
        villainPosition: {
          type: "integer",
          description: "Villain position",
          minimum: 0,
          maximum: 5,
        },
        stackDepth: {
          type: "integer",
          description: "Effective stack in big blinds",
        },
        gameType: {
          type: "string",
          enum: ["cash", "tournament"],
          default: "cash",
        },
        potSize: {
          type: "number",
          description: "Current pot size in big blinds",
        },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              street: {
                type: "string",
                enum: ["preflop", "flop", "turn", "river"],
              },
              actor: {
                type: "string",
                enum: ["hero", "villain"],
              },
              action: { type: "string" },
              amount: { type: "number" },
            },
            required: ["street", "actor", "action"],
          },
          description: "Sequence of actions in the hand",
        },
      },
      required: [
        "heroHand",
        "board",
        "heroPosition",
        "villainPosition",
        "stackDepth",
        "actions",
      ],
    },
  },
  {
    name: "poker_bluff_catcher",
    description:
      "Analyze a river bluff-catching decision. Given hero's hand, board, pot size, and bet size, " +
      "determines whether calling or folding is correct based on MDF, blocker effects, and hand strength.",
    inputSchema: {
      type: "object",
      properties: {
        heroHand: {
          type: "string",
          description: "Hero hand combo key, e.g. 'ATh', 'K9s', '55'",
        },
        board: {
          type: "array",
          items: { type: "string" },
          minItems: 5,
          maxItems: 5,
          description: "Full 5-card board including river",
        },
        heroPosition: {
          type: "integer",
          description: "Hero position",
          minimum: 0,
          maximum: 5,
        },
        villainPosition: {
          type: "integer",
          description: "Villain position",
          minimum: 0,
          maximum: 5,
        },
        potSize: {
          type: "number",
          description: "Pot size before villain's river bet (in bb)",
        },
        betSize: {
          type: "number",
          description: "Villain's river bet size (in bb)",
        },
        effectiveStack: {
          type: "integer",
          description: "Effective stack in bb",
          default: 100,
        },
      },
      required: [
        "heroHand",
        "board",
        "heroPosition",
        "villainPosition",
        "potSize",
        "betSize",
      ],
    },
  },
  {
    name: "poker_icm",
    description:
      "Calculate ICM (Independent Chip Model) equity distribution for tournament payouts " +
      "using the Malmuth-Harville algorithm.",
    inputSchema: {
      type: "object",
      properties: {
        players: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              stack: { type: "number" },
            },
            required: ["id", "stack"],
          },
          minItems: 2,
          maxItems: 9,
          description: "Players with their chip stacks",
        },
        payouts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              position: { type: "integer" },
              prize: { type: "number" },
              label: { type: "string" },
            },
            required: ["position", "prize"],
          },
          minItems: 1,
          maxItems: 9,
          description: "Prize pool payout structure",
        },
      },
      required: ["players", "payouts"],
    },
  },
  {
    name: "poker_turn_river_analysis",
    description:
      "Analyze strategy shifts when a turn or river card is dealt. " +
      "Classifies the card as scare card, brick, or overcard, and provides updated strategy.",
    inputSchema: {
      type: "object",
      properties: {
        currentBoard: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 4,
          description:
            "Current board before the new card (3 cards for turn analysis, 4 for river)",
        },
        newCard: {
          type: "string",
          description: "The turn or river card being dealt, e.g. 'Th'",
        },
        stage: {
          type: "string",
          enum: ["turn", "river"],
          default: "turn",
          description: "Whether analyzing a turn or river card",
        },
      },
      required: ["currentBoard", "newCard"],
    },
  },
  {
    name: "poker_exploit_adjustment",
    description:
      "Get opponent-specific exploitation adjustments to GTO strategy. " +
      "Given an opponent type (nit/tag/lag/calling_station/maniac/reg/unknown) and board, " +
      "returns adjusted frequencies and concrete recommendations in Chinese.",
    inputSchema: {
      type: "object",
      properties: {
        opponentType: {
          type: "string",
          enum: [
            "nit",
            "tag",
            "lag",
            "calling_station",
            "maniac",
            "reg",
            "unknown",
          ],
          description: "Opponent player type classification",
        },
        board: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 5,
          description: "Board cards",
        },
        heroPosition: {
          type: "integer",
          description: "Hero position",
          minimum: 0,
          maximum: 5,
        },
        villainPosition: {
          type: "integer",
          description: "Villain position",
          minimum: 0,
          maximum: 5,
        },
        stackDepth: {
          type: "integer",
          description: "Effective stack in bb",
          default: 100,
        },
        gameType: {
          type: "string",
          enum: ["cash", "tournament"],
          default: "cash",
        },
      },
      required: ["opponentType", "board", "heroPosition", "villainPosition"],
    },
  },
];

// ============================================================
// Server Setup
// ============================================================

const server = new Server(
  {
    name: "poker-gto-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Route tool calls to handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "poker_solve_preflop_range":
        return await handlePreflopRange(args ?? {});
      case "poker_postflop_strategy":
        return await handlePostflopStrategy(args ?? {});
      case "poker_equity":
        return await handleEquity(args ?? {});
      case "poker_range_equity":
        return await handleRangeEquity(args ?? {});
      case "poker_range_battle":
        return await handleRangeBattle(args ?? {});
      case "poker_board_texture":
        return await handleBoardTexture(args ?? {});
      case "poker_hand_evaluate":
        return await handleHandEvaluate(args ?? {});
      case "poker_analyze_hand":
        return await handleAnalyzeHand(args ?? {});
      case "poker_bluff_catcher":
        return await handleBluffCatcher(args ?? {});
      case "poker_icm":
        return await handleICM(args ?? {});
      case "poker_turn_river_analysis":
        return await handleTurnRiverAnalysis(args ?? {});
      case "poker_exploit_adjustment":
        return await handleExploitAdjustment(args ?? {});
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

// ============================================================
// Start Server
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  console.error("PokerGTO MCP server starting on stdio...");
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start MCP server:", err);
  process.exit(1);
});
