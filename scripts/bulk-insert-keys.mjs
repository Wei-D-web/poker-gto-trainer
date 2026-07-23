#!/usr/bin/env node
/**
 * Bulk-insert HMAC-signed license keys into Supabase license_keys pool.
 *
 * Generates keys using the same HMAC algorithm as the desktop app's offline
 * validator (src/shared/utils/license.ts), then inserts them into Supabase
 * so the LS webhook can auto-assign them on purchase.
 *
 * Usage:
 *   node scripts/bulk-insert-keys.mjs pro 50        # 50 Pro keys (1-month default)
 *   node scripts/bulk-insert-keys.mjs pro 20 12     # 20 Pro keys, 12-month expiry
 *   node scripts/bulk-insert-keys.mjs lifetime 10   # 10 Lifetime keys
 *
 * Requires:
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment
 */

import { createClient } from '@supabase/supabase-js'
import { createHmac, randomBytes } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

// Load .env
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = resolve(__dirname, '..', '.env')
if (existsSync(envPath)) {
  config({ path: envPath })
}

// ── Config ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const LICENSE_SECRET = process.env.POKERGTO_LICENSE_SECRET
  || process.env.VITE_LICENSE_SECRET
  || 'pokergto-trainer-secret-key-2026'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Base32 (Crockford) ──
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const TIER_CODES = { pro: 0, lifetime: 1, developer: 2, starter: 3 }

function toBase32(num, length) {
  let s = ''
  for (let i = 0; i < length; i++) {
    s = BASE32[num & 31] + s
    num >>>= 5
  }
  return s
}

/** Generate one HMAC-signed license key */
function generateKey(tier, expiryMonths = 0) {
  const tierCode = TIER_CODES[tier] ?? 0
  const now = new Date()
  const expiryDate = expiryMonths > 0
    ? new Date(now.getFullYear(), now.getMonth() + expiryMonths, 1)
    : new Date(2099, 0, 1)
  const expiryBits = ((expiryDate.getFullYear() - 2024) * 12 + expiryDate.getMonth()) & 0x3FF
  const tierBits = tierCode & 0x3
  const randomBits = randomBytes(3).readUIntBE(0, 3) & 0xFFFFF
  const payload = (tierBits << 30) | (expiryBits << 20) | randomBits
  const body = toBase32(payload, 8)
  const hmac = createHmac('sha256', LICENSE_SECRET).update(body).digest()
  const sigBits = hmac.readUIntBE(0, 3) & 0xFFFFF
  const signature = toBase32(sigBits, 4)
  return `PGTO-${body.slice(0, 4)}-${body.slice(4, 8)}-${signature}`
}

/** Compute expiry date from key for display */
function getExpiry(key, expiryMonths) {
  if (expiryMonths <= 0) return 'never'
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + expiryMonths, 0)
  return d.toISOString().slice(0, 7)
}

// ── Main ──
const args = process.argv.slice(2)
if (args.length < 2) {
  console.log(`
🔑 Bulk-insert license keys into Supabase

Usage:
  node scripts/bulk-insert-keys.mjs <tier> <count> [expiryMonths] [batchLabel]

Examples:
  node scripts/bulk-insert-keys.mjs pro 50
  node scripts/bulk-insert-keys.mjs pro 20 12 wechat-batch-1
  node scripts/bulk-insert-keys.mjs lifetime 10 0 launch-batch
`)
  process.exit(1)
}

const [tier, countStr, expiryStr, batchLabel] = args
const count = parseInt(countStr, 10)
const expiryMonths = expiryStr ? parseInt(expiryStr, 10) : (tier === 'lifetime' ? 0 : 1)
const batchId = batchLabel || `batch-${tier}-${Date.now()}`

console.log(`\n🔑 Generating ${count} × ${tier.toUpperCase()} keys → Supabase`)
console.log(`   Batch: ${batchId}  |  Expiry: ${expiryMonths === 0 ? 'never' : expiryMonths + ' months'}\n`)

const keys = []
for (let i = 0; i < count; i++) {
  keys.push({
    key: generateKey(tier, expiryMonths),
    tier,
    status: 'active',
    batch_id: batchId,
    notes: `${tier} key (${expiryMonths === 0 ? 'lifetime' : expiryMonths + 'mo'})`,
  })
}

// Insert in chunks of 50
const CHUNK = 50
let inserted = 0
for (let i = 0; i < keys.length; i += CHUNK) {
  const chunk = keys.slice(i, i + CHUNK)
  const { error } = await supabase.from('license_keys').insert(chunk)
  if (error) {
    console.error(`❌ Insert error at chunk ${i / CHUNK + 1}:`, error.message)
    process.exit(1)
  }
  inserted += chunk.length
  console.log(`   ✅ Inserted ${inserted}/${count}`)
}

console.log(`\n📋 Done! ${inserted} keys in pool. Tier: ${tier}, Batch: ${batchId}`)
console.log(`   Webhook will auto-assign these on LS purchase.\n`)
