/**
 * Migration Script — Generate all preset postflop strategies and upsert to Supabase.
 *
 * Usage:
 *   npx tsx scripts/migrate-presets-to-supabase.ts
 *
 * Environment variables:
 *   SUPABASE_URL             — Supabase project URL (required)
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service_role key for writes (required)
 *
 *   Falls back to VITE_SUPABASE_URL if SUPABASE_URL not set.
 *   The service_role key bypasses RLS — never expose it in frontend code.
 *
 * What it does:
 *   1. Generates 50 flop textures × 4 hero positions = 200 preset strategies
 *   2. Each strategy has ~169 combos × 2-3 actions ≈ 420 combo-action rows
 *   3. Upserts to preset_strategies + strategy_combos tables in batches of 100
 */

import { createClient } from '@supabase/supabase-js'
import { generatePostflopStrategy } from '../src/main/solver/postflop-engine'
import type { Position } from '../src/shared/types/poker'

// ============================================================
// Preset flop definitions (duplicated from preset-solutions.ts
// to avoid the Electron dependency chain in database.ts)
// ============================================================
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

// ============================================================
// Config
// ============================================================
const BATCH_SIZE = 100

interface MigrationStats {
  strategies: number
  combos: number
  errors: string[]
}

// ============================================================
// Main
// ============================================================
async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    console.error('❌ Missing SUPABASE_URL (or VITE_SUPABASE_URL)')
    console.error('   Set it in .env or export SUPABASE_URL=...')
    process.exit(1)
  }

  if (!key) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
    console.error('   Get it from: https://app.supabase.com → Project → Settings → API → service_role key')
    console.error('   Then: export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...')
    process.exit(1)
  }

  console.log(`🔌 Connecting to Supabase: ${url}`)
  const supabase = createClient(url, key, {
    db: { schema: 'public' },
  })

  // Verify connection
  const { data: healthCheck, error: healthErr } = await supabase.from('preset_strategies').select('id', { count: 'exact', head: true })
  if (healthErr) {
    console.error('❌ Failed to connect or table does not exist:', healthErr.message)
    console.error('   Run the SQL in supabase-schema.sql first:')
    console.error('   https://app.supabase.com → SQL Editor → paste supabase-schema.sql → Run')
    process.exit(1)
  }
  console.log('✅ Connected. Tables exist.')

  const positions: Position[] = [3, 2, 1, 0] as Position[] // BTN, CO, MP, UTG
  const villainPosition: Position = 5 as Position // BB
  const stackDepth = 100

  const stats: MigrationStats = { strategies: 0, combos: 0, errors: [] }

  console.log(`\n🃏 Generating strategies for ${PRESET_FLOPS.length} flop textures × ${positions.length} positions = ${PRESET_FLOPS.length * positions.length} scenarios...\n`)

  for (const preset of PRESET_FLOPS) {
    for (const heroPos of positions) {
      const scenarioLabel = `${preset.board.join(' ')} | ${['UTG', 'MP', 'CO', 'BTN'][heroPos] || heroPos}`
      process.stdout.write(`  ${scenarioLabel}... `)

      try {
        // Generate strategy in-memory
        const strategy = generatePostflopStrategy(
          preset.board,
          heroPos,
          villainPosition,
          stackDepth,
          'cash',
        )

        // Compute aggregate stats from combos
        const inRange = strategy.combos.filter(c => c.weight > 0.05)
        const totalEv = inRange.reduce((s, c) => {
          const maxActionEv = Math.max(...c.actions.map(a => a.ev))
          return s + maxActionEv * c.weight
        }, 0)
        const totalWeight = inRange.reduce((s, c) => s + c.weight, 0)
        const heroEV = totalWeight > 0 ? totalEv / totalWeight : 0
        const avgEquity = inRange.reduce((s, c) => s + c.equity * c.weight, 0) / (totalWeight || 1)

        // Upsert strategy metadata
        const { data: stratRow, error: stratErr } = await supabase
          .from('preset_strategies')
          .upsert(
            {
              board: preset.board.join(' '),
              texture: preset.texture,
              hero_position: heroPos,
              villain_position: villainPosition,
              stack_depth: stackDepth,
              game_type: 'cash',
              description: preset.description,
              hero_ev: Math.round(heroEV * 1000) / 1000,
              villain_ev: Math.round(-heroEV * 1000) / 1000,
              hero_equity: Math.round(avgEquity * 1000) / 1000,
              recommended_sizing: strategy.recommendedSizing,
              overall_cbet_freq: strategy.overallCbetFreq,
            },
            {
              onConflict: 'board,hero_position,villain_position,stack_depth,game_type',
            },
          )
          .select('id')
          .single()

        if (stratErr || !stratRow) {
          stats.errors.push(`${scenarioLabel}: upsert failed — ${stratErr?.message || 'no id returned'}`)
          console.log('❌')
          continue
        }

        // Delete old combos for this strategy (idempotent re-run)
        await supabase.from('strategy_combos').delete().eq('strategy_id', stratRow.id)

        // Build combo rows (one per action per combo)
        const comboRows: Array<{
          strategy_id: string
          hand: string
          hand_type: string
          weight: number
          equity: number
          action: string
          frequency: number
          ev: number
        }> = []

        for (const combo of strategy.combos) {
          for (const action of combo.actions) {
            comboRows.push({
              strategy_id: stratRow.id,
              hand: combo.comboKey,
              hand_type: combo.handType,
              weight: Math.round(combo.weight * 1000) / 1000,
              equity: Math.round(combo.equity * 1000) / 1000,
              action: action.action,
              frequency: Math.round(action.frequency * 1000) / 1000,
              ev: Math.round(action.ev * 1000) / 1000,
            })
          }
        }

        // Insert combos in batches
        let comboInserted = 0
        for (let i = 0; i < comboRows.length; i += BATCH_SIZE) {
          const batch = comboRows.slice(i, i + BATCH_SIZE)
          const { error: comboErr } = await supabase.from('strategy_combos').insert(batch)
          if (comboErr) {
            stats.errors.push(`${scenarioLabel}: combo insert failed at batch ${i} — ${comboErr.message}`)
            break
          }
          comboInserted += batch.length
        }

        stats.strategies++
        stats.combos += comboInserted
        console.log(`✅ (${comboInserted} combos)`)
      } catch (e: any) {
        stats.errors.push(`${scenarioLabel}: ${e?.message || String(e)}`)
        console.log('❌')
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`  Strategies upserted:  ${stats.strategies} / ${PRESET_FLOPS.length * positions.length}`)
  console.log(`  Combo rows inserted:  ${stats.combos.toLocaleString()}`)
  console.log(`  Errors:               ${stats.errors.length}`)

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors:')
    for (const err of stats.errors) {
      console.log(`  - ${err}`)
    }
  }

  if (stats.strategies === PRESET_FLOPS.length * positions.length) {
    console.log('\n🎉 All preset strategies migrated successfully!')
  } else {
    console.log('\n⚠️  Migration incomplete. Re-run to retry failed scenarios.')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
