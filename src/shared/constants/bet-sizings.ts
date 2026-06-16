import type { BetSizingSchema, SizingStageConfig } from '../types/poker'

// ============================================================
// Pre-built Bet Sizing Schemas
// ============================================================

const standardSizes: SizingStageConfig = {
  betSizes: [
    { label: '33%', fraction: 0.33 },
    { label: '50%', fraction: 0.5 },
    { label: '75%', fraction: 0.75 },
    { label: '100%', fraction: 1.0 },
  ],
  raiseSizes: [
    { label: '2.5x', fraction: 2.5 },
    { label: '3x', fraction: 3.0 },
    { label: '4x', fraction: 4.0 },
  ],
  donkBetAllowed: false,
  minRaise: 2,
}

const preflopRaiseSizes: SizingStageConfig = {
  betSizes: [
    { label: '2bb', fraction: 2.0 },
    { label: '2.5bb', fraction: 2.5 },
    { label: '3bb', fraction: 3.0 },
    { label: '4bb', fraction: 4.0 },
  ],
  raiseSizes: [
    { label: '2.5x', fraction: 2.5 },
    { label: '3x', fraction: 3.0 },
    { label: '4x', fraction: 4.0 },
  ],
  donkBetAllowed: false,
  minRaise: 2,
}

export const BET_SIZING_SCHEMAS: BetSizingSchema[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Standard bet sizing: 33%, 50%, 75%, 100% pot',
    preflop: preflopRaiseSizes,
    flop: standardSizes,
    turn: standardSizes,
    river: standardSizes,
  },
  {
    id: 'small',
    name: 'Small Sizing',
    description: 'Smaller bet sizing: 25%, 33%, 50%, 75% pot',
    preflop: {
      ...preflopRaiseSizes,
      betSizes: [
        { label: '2bb', fraction: 2.0 },
        { label: '2.25bb', fraction: 2.25 },
        { label: '2.5bb', fraction: 2.5 },
      ],
    },
    flop: {
      ...standardSizes,
      betSizes: [
        { label: '25%', fraction: 0.25 },
        { label: '33%', fraction: 0.33 },
        { label: '50%', fraction: 0.5 },
        { label: '75%', fraction: 0.75 },
      ],
    },
    turn: {
      ...standardSizes,
      betSizes: [
        { label: '33%', fraction: 0.33 },
        { label: '50%', fraction: 0.5 },
        { label: '75%', fraction: 0.75 },
      ],
    },
    river: {
      ...standardSizes,
      betSizes: [
        { label: '33%', fraction: 0.33 },
        { label: '50%', fraction: 0.5 },
        { label: '75%', fraction: 0.75 },
      ],
    },
  },
  {
    id: 'large',
    name: 'Large Sizing',
    description: 'Larger bet sizing with overbets: 50%, 75%, 100%, 150%, 200% pot',
    preflop: {
      ...preflopRaiseSizes,
      betSizes: [
        { label: '2.5bb', fraction: 2.5 },
        { label: '3bb', fraction: 3.0 },
        { label: '4bb', fraction: 4.0 },
        { label: '5bb', fraction: 5.0 },
      ],
    },
    flop: {
      ...standardSizes,
      betSizes: [
        { label: '50%', fraction: 0.5 },
        { label: '75%', fraction: 0.75 },
        { label: '100%', fraction: 1.0 },
        { label: '150%', fraction: 1.5 },
        { label: '200%', fraction: 2.0 },
      ],
    },
    turn: {
      ...standardSizes,
      betSizes: [
        { label: '50%', fraction: 0.5 },
        { label: '75%', fraction: 0.75 },
        { label: '100%', fraction: 1.0 },
        { label: '150%', fraction: 1.5 },
        { label: '200%', fraction: 2.0 },
      ],
    },
    river: {
      ...standardSizes,
      betSizes: [
        { label: '50%', fraction: 0.5 },
        { label: '75%', fraction: 0.75 },
        { label: '100%', fraction: 1.0 },
        { label: '150%', fraction: 1.5 },
        { label: '200%', fraction: 2.0 },
      ],
    },
  },
  {
    id: 'gto-wizard',
    name: 'GTO Wizard Default',
    description: 'GTO Wizard standard: 33%, 50%, 75%, 100%, 125%, 150% pot',
    preflop: {
      ...preflopRaiseSizes,
      betSizes: [
        { label: '2bb', fraction: 2.0 },
        { label: '2.5bb', fraction: 2.5 },
        { label: '3bb', fraction: 3.0 },
      ],
    },
    flop: {
      ...standardSizes,
      betSizes: [
        { label: '33%', fraction: 0.33 },
        { label: '50%', fraction: 0.5 },
        { label: '75%', fraction: 0.75 },
        { label: '100%', fraction: 1.0 },
        { label: '125%', fraction: 1.25 },
        { label: '150%', fraction: 1.5 },
      ],
    },
    turn: {
      ...standardSizes,
      betSizes: [
        { label: '33%', fraction: 0.33 },
        { label: '50%', fraction: 0.5 },
        { label: '75%', fraction: 0.75 },
        { label: '100%', fraction: 1.0 },
        { label: '125%', fraction: 1.25 },
        { label: '150%', fraction: 1.5 },
      ],
    },
    river: {
      ...standardSizes,
      betSizes: [
        { label: '33%', fraction: 0.33 },
        { label: '50%', fraction: 0.5 },
        { label: '75%', fraction: 0.75 },
        { label: '100%', fraction: 1.0 },
        { label: '125%', fraction: 1.25 },
        { label: '150%', fraction: 1.5 },
      ],
    },
  },
]

export const DEFAULT_SCHEMA_ID = 'gto-wizard'

export function getBetSizingSchema(id: string): BetSizingSchema | undefined {
  return BET_SIZING_SCHEMAS.find(s => s.id === id)
}
