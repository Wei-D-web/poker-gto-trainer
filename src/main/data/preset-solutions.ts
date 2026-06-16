/**
 * Postflop Preset Solutions Generator
 * Pre-computes GTO strategies for the 50 most common flop textures.
 * Results are stored in the existing scenarios + strategies tables.
 */
import { getDatabase, saveDatabase } from './database'
import { generatePostflopStrategy } from '../solver/postflop-engine'
import type { Position } from '../../shared/types/poker'

interface PresetFlop {
  board: string[]
  texture: string
  description: string
}

const PRESET_FLOPS: PresetFlop[] = [
  // ── A-High (10) ──
  { board: ['As', '7d', '2c'], texture: 'ace-high-dry', description: 'A72 rainbow — classic dry A-high' },
  { board: ['Ah', 'Qd', '3s'], texture: 'ace-high-wet', description: 'AQ3 two-tone — wet A-high with Broadway' },
  { board: ['Ad', 'Kc', 'Jh'], texture: 'broadway-heavy', description: 'AKJ rainbow — Broadway heavy' },
  { board: ['As', '9d', '8s'], texture: 'ace-high-wet', description: 'A98 two-tone — connected A-high' },
  { board: ['Ah', '8d', '6h'], texture: 'ace-high-wet', description: 'A86 two-tone — gutshot potential' },
  { board: ['As', '5d', '2c'], texture: 'ace-high-dry', description: 'A52 rainbow — wheel potential' },
  { board: ['Ac', 'Kh', 'Qd'], texture: 'broadway-connected', description: 'AKQ rainbow — all Broadway' },
  { board: ['Ah', '9h', '4d'], texture: 'ace-high-wet', description: 'A94 two-tone — BDFD present' },
  { board: ['As', '4s', '3d'], texture: 'ace-high-wet', description: 'A43 two-tone — low connected' },
  { board: ['Ah', '7h', '6d'], texture: 'ace-high-wet', description: 'A76 two-tone — semi-connected' },

  // ── Broadway-Heavy (8) ──
  { board: ['Kh', 'Qd', '2s'], texture: 'broadway-heavy', description: 'KQ2 rainbow — two Broadway' },
  { board: ['Ks', 'Jd', '6h'], texture: 'broadway-heavy', description: 'KJ6 rainbow — broadway + mid' },
  { board: ['Kh', '9d', '8h'], texture: 'two-tone-connected', description: 'K98 two-tone — connected broadway' },
  { board: ['Qh', 'Jd', '5s'], texture: 'broadway-heavy', description: 'QJ5 rainbow — two Broadway' },
  { board: ['Qs', 'Td', '7h'], texture: 'broadway-heavy', description: 'QT7 rainbow — broadway + mid' },
  { board: ['Js', '8d', '2h'], texture: 'mid-disconnected', description: 'J82 rainbow — one Broadway' },
  { board: ['Ks', 'Td', '9h'], texture: 'two-tone-connected', description: 'KT9 two-tone — connected broadway' },
  { board: ['Kh', '7d', '5s'], texture: 'rainbow-dry', description: 'K75 rainbow — K-high dry' },

  // ── Paired (8) ──
  { board: ['Qh', 'Qd', '3s'], texture: 'paired', description: 'QQ3 rainbow — paired broadway' },
  { board: ['Js', 'Jd', '8h'], texture: 'paired-two-tone', description: 'JJ8 two-tone — paired + connected' },
  { board: ['Ts', 'Td', '4h'], texture: 'paired', description: 'TT4 rainbow — paired mid' },
  { board: ['9h', '9d', 'Ks'], texture: 'paired', description: '99K rainbow — paired + overcard' },
  { board: ['8h', '8d', 'Qs'], texture: 'paired-two-tone', description: '88Q two-tone — paired + overcard' },
  { board: ['7h', '7d', 'As'], texture: 'paired', description: '77A rainbow — paired + ace' },
  { board: ['6h', '6d', 'Ks'], texture: 'paired', description: '66K rainbow — paired low + K' },
  { board: ['5h', '5d', '3s'], texture: 'paired', description: '55x rainbow — paired low' },

  // ── Monotone (8) ──
  { board: ['Kh', '9h', '4h'], texture: 'monotone', description: 'K94 monotone — medium flush board' },
  { board: ['Ah', 'Th', '3h'], texture: 'ace-high-monotone', description: 'AT3 monotone — ace-high flush' },
  { board: ['Qh', '8h', '2h'], texture: 'monotone', description: 'Q82 monotone — Q-high flush' },
  { board: ['Jh', '7h', '5h'], texture: 'monotone', description: 'J75 monotone — connected flush' },
  { board: ['Th', '6h', '4h'], texture: 'monotone-connected', description: 'T64 monotone connected' },
  { board: ['9h', '5h', '3h'], texture: 'monotone-connected', description: '953 monotone connected' },
  { board: ['8h', '4h', '2h'], texture: 'monotone-connected', description: '842 monotone connected' },
  { board: ['Ah', 'Kh', 'Th'], texture: 'monotone-connected', description: 'AKT monotone — premium flush' },

  // ── Connected (8) ──
  { board: ['Jd', 'Td', '9s'], texture: 'two-tone-connected', description: 'JT9 two-tone — highly connected' },
  { board: ['9h', '8d', '7c'], texture: 'rainbow-connected', description: '987 rainbow — connected' },
  { board: ['8d', '7c', '6h'], texture: 'rainbow-connected', description: '876 rainbow — connected' },
  { board: ['7d', '6c', '5h'], texture: 'rainbow-connected', description: '765 rainbow — connected' },
  { board: ['6h', '5d', '4c'], texture: 'rainbow-connected', description: '654 rainbow — low connected' },
  { board: ['9h', '8d', '7c'], texture: 'rainbow-connected', description: '987 rainbow — connected' },
  { board: ['8c', '7h', '6d'], texture: 'rainbow-connected', description: '876 rainbow' },
  { board: ['Jh', 'Td', '8c'], texture: 'two-tone-connected', description: 'JT8 two-tone — semi-connected' },

  // ── Low/Mid Dry (8) ──
  { board: ['7h', '6d', '2c'], texture: 'rainbow-dry', description: '762 rainbow — low dry' },
  { board: ['9h', '5d', '3s'], texture: 'rainbow-dry', description: '953 rainbow — low dry' },
  { board: ['8h', '4d', '2s'], texture: 'rainbow-dry', description: '842 rainbow — low dry' },
  { board: ['6h', '3d', '2c'], texture: 'rainbow-dry', description: '632 rainbow — low dry' },
  { board: ['9h', '5d', '2c'], texture: 'rainbow-dry', description: '952 two-tone — low + flush' },
  { board: ['7h', '5d', '4c'], texture: 'rainbow-connected', description: '754 two-tone — low connected' },
  { board: ['Ah', '3d', '2c'], texture: 'wheel', description: 'A32 rainbow — wheel draw' },
  { board: ['5h', '4d', '2s'], texture: 'low-connected', description: '542 rainbow — low gutshot' },
]

/**
 * Generate preset solutions for common flop textures and store in DB.
 * Called on first launch if presets don't exist yet.
 */
export function generatePresetSolutions(): { success: boolean; count: number; message: string } {
  try {
    const db = getDatabase()

    // Check if already generated
    const checkStmt = db.prepare("SELECT COUNT(*) as count FROM scenarios WHERE id LIKE 'preset_flop_%'")
    checkStmt.step()
    const existing = (checkStmt.getAsObject() as any).count || 0
    checkStmt.free()

    if (existing > 20) {
      return { success: true, count: existing, message: `Already have ${existing} preset solutions` }
    }

    const positions: Position[] = [3, 2, 1, 0] as Position[] // BTN, CO, MP, UTG
    const villainPos: Position = 5 as Position // BB
    const stackDepth = 100
    let generated = 0

    for (const preset of PRESET_FLOPS) {
      for (const pos of positions) {
        try {
          const strategy = generatePostflopStrategy(
            preset.board,
            pos,
            villainPos,
            stackDepth,
          )

          const scenarioId = `preset_flop_${pos}_${villainPos}_${stackDepth}_${preset.board.join('')}`

          // Insert scenario
          const scenStmt = db.prepare(
            `INSERT OR REPLACE INTO scenarios (id, game_type, hero_position, villain_position, effective_stack, board, street, pot_size, sizing_schema_id, created_at)
             VALUES (:id, 'cash', :heroPos, :vilPos, :stack, :board, 'flop', :potSize, 'gto-wizard', unixepoch())`
          )
          scenStmt.bind({
            ':id': scenarioId,
            ':heroPos': pos,
            ':vilPos': villainPos,
            ':stack': stackDepth,
            ':board': preset.board.join(' '),
            ':potSize': stackDepth * 0.12,
          })
          scenStmt.step()
          scenStmt.free()

          // Insert strategy data
          const stratStmt = db.prepare(
            'INSERT OR REPLACE INTO strategies (scenario_id, data, format_version) VALUES (:id, :data, 1)'
          )
          stratStmt.bind({
            ':id': scenarioId,
            ':data': JSON.stringify(strategy),
          })
          stratStmt.step()
          stratStmt.free()

          generated++
        } catch (e) {
          console.error(`Failed to generate preset for ${preset.board.join(' ')}:`, e)
        }
      }
    }

    saveDatabase()
    return {
      success: true,
      count: generated,
      message: `Generated ${generated} preset solutions`,
    }
  } catch (e) {
    console.error('Preset generation failed:', e)
    return { success: false, count: 0, message: String(e) }
  }
}

export interface PresetCategory {
  label: string
  accent: string
  flops: PresetFlop[]
}

export function getPresetCategories(): PresetCategory[] {
  const categories: Record<string, PresetFlop[]> = {
    'A-High': [],
    'Broadway': [],
    'Paired': [],
    'Monotone': [],
    'Connected': [],
    'Low / Dry': [],
  }

  for (const flop of PRESET_FLOPS) {
    if (flop.board[0][0] === 'A') categories['A-High'].push(flop)
    else if (flop.texture.includes('broadway')) categories['Broadway'].push(flop)
    else if (flop.texture.includes('paired') || flop.texture === 'paired') categories['Paired'].push(flop)
    else if (flop.texture.includes('monotone')) categories['Monotone'].push(flop)
    else if (flop.texture.includes('connected')) categories['Connected'].push(flop)
    else categories['Low / Dry'].push(flop)
  }

  return [
    { label: 'A-High', accent: 'text-red-400', flops: categories['A-High'] },
    { label: 'Broadway', accent: 'text-purple-400', flops: categories['Broadway'] },
    { label: 'Paired', accent: 'text-amber-400', flops: categories['Paired'] },
    { label: 'Monotone', accent: 'text-emerald-400', flops: categories['Monotone'] },
    { label: 'Connected', accent: 'text-blue-400', flops: categories['Connected'] },
    { label: 'Low / Dry', accent: 'text-neutral-400', flops: categories['Low / Dry'] },
  ].filter(c => c.flops.length > 0)
}
