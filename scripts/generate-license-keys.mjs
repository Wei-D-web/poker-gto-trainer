#!/usr/bin/env node
/**
 * PokerGTO License Key Generator
 *
 * Generates cryptographically-signed license keys for selling PokerGTO Trainer.
 * Keys are validated offline via HMAC-SHA256 — no server needed.
 *
 * Usage:
 *   node scripts/generate-license-keys.mjs pro    5    # 5 Pro monthly keys
 *   node scripts/generate-license-keys.mjs lifetime 3   # 3 Lifetime keys
 *   node scripts/generate-license-keys.mjs pro 1 12     # 1 Pro key, 12-month expiry
 *
 * Key format: PGTO-XXXX-XXXX-XXXX (19 chars)
 *   - XXXX-XXXX: 8 base32 chars encoding {tier, expiry, random}
 *   - XXXX: 4 base32 chars = HMAC-SHA256 signature
 */

import { createHmac, randomBytes } from 'crypto';

// ⚠️ CHANGE THIS SECRET before generating real keys for customers!
// Keep it in sync with src/shared/license.ts (LICENSE_SECRET).
const LICENSE_SECRET = process.env.POKERGTO_LICENSE_SECRET || 'pokergto-trainer-secret-key-2026';

// ── Base32 encoding (Crockford, no I/L/O/U to avoid confusion) ──
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function toBase32(num, length) {
  let s = '';
  for (let i = 0; i < length; i++) {
    s = BASE32_ALPHABET[num & 31] + s;
    num >>>= 5;
  }
  return s;
}

function fromBase32(s) {
  let n = 0;
  for (const c of s) {
    const i = BASE32_ALPHABET.indexOf(c.toUpperCase());
    if (i === -1) return -1;
    n = (n << 5) | i;
  }
  return n >>> 0; // unsigned 32-bit
}

// ── Tier encoding ──
const TIER_CODES = { pro: 0, lifetime: 1, developer: 2 };

/**
 * Generate a single license key.
 * @param {'pro'|'lifetime'} tier
 * @param {number} expiryMonths - months until expiry (0 = never expires)
 * @returns {string} formatted key like PGTO-XXXX-XXXX-XXXX
 */
function generateKey(tier, expiryMonths = 0) {
  const tierCode = TIER_CODES[tier] ?? 0;

  // Calculate expiry date (months since 2024-01)
  const now = new Date();
  const expiryDate = expiryMonths > 0
    ? new Date(now.getFullYear(), now.getMonth() + expiryMonths, 1)
    : new Date(2099, 0, 1); // "never expires"
  const expiryBits = ((expiryDate.getFullYear() - 2024) * 12 + expiryDate.getMonth()) & 0x3FF; // 10 bits
  const tierBits = tierCode & 0x3; // 2 bits
  const randomBits = randomBytes(3).readUIntBE(0, 3) & 0xFFFFF; // 20 bits

  // Pack into 32 bits: tier(2) + expiry(10) + random(20)
  const payload = (tierBits << 30) | (expiryBits << 20) | randomBits;

  // Encode as 8 base32 chars (32 bits / 5 bits per char = 6.4 → need 7 chars → pad to 8)
  const body = toBase32(payload, 8);

  // HMAC-SHA256 signature (first 20 bits = 4 base32 chars)
  const hmac = createHmac('sha256', LICENSE_SECRET).update(body).digest();
  const sigBits = hmac.readUIntBE(0, 3) & 0xFFFFF; // 20 bits
  const signature = toBase32(sigBits, 4);

  return `PGTO-${body.slice(0, 4)}-${body.slice(4, 8)}-${signature}`;
}

/**
 * Validate a license key and return tier + expiry.
 * Used by the app for offline validation.
 * @returns {{ valid: boolean, tier?: string, expiry?: Date }}
 */
export function validateKey(key) {
  const cleaned = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length < 12) return { valid: false };

  // Remove PGTO prefix if present
  const core = cleaned.startsWith('PGTO') ? cleaned.slice(4) : cleaned;
  if (core.length < 12) return { valid: false };

  const body = core.slice(0, 8);
  const signature = core.slice(8, 12);

  // Verify HMAC
  const hmac = createHmac('sha256', LICENSE_SECRET).update(body).digest();
  const expectedSigBits = hmac.readUIntBE(0, 3) & 0xFFFFF;
  const expectedSig = toBase32(expectedSigBits, 4);

  if (signature !== expectedSig) return { valid: false };

  // Decode payload
  const payload = fromBase32(body);
  const tierCode = (payload >>> 30) & 0x3;
  const expiryBits = (payload >>> 20) & 0x3FF;

  const tierNames = { 0: 'pro', 1: 'lifetime', 2: 'developer' };
  const tier = tierNames[tierCode] || 'pro';

  // Calculate expiry date
  const totalMonths = expiryBits;
  const expiryYear = 2024 + Math.floor(totalMonths / 12);
  const expiryMonth = totalMonths % 12;
  const expiry = new Date(expiryYear, expiryMonth, 1);
  expiry.setMonth(expiry.getMonth() + 1); // end of that month

  // Check if expired
  if (expiry < new Date()) return { valid: false, tier, expiry, expired: true };

  return { valid: true, tier, expiry };
}

// ── CLI ──
const args = process.argv.slice(2);
if (args.length < 2 || !['pro', 'lifetime', 'developer'].includes(args[0])) {
  console.log(`
🔑 PokerGTO License Key Generator

Usage:
  node scripts/generate-license-keys.mjs <tier> <count> [expiryMonths]

Arguments:
  tier          pro | lifetime | developer
  count         number of keys to generate
  expiryMonths  months until expiry (0 = never, default: 0 for lifetime, 1 for pro)

Examples:
  node scripts/generate-license-keys.mjs pro 5           # 5 Pro keys, 1 month trial
  node scripts/generate-license-keys.mjs pro 10 12       # 10 Pro keys, 12 months
  node scripts/generate-license-keys.mjs lifetime 3      # 3 Lifetime keys
  node scripts/generate-license-keys.mjs developer 1     # 1 Developer key

Environment:
  POKERGTO_LICENSE_SECRET    HMAC secret (change before generating real keys!)
`);
  process.exit(1);
}

const [tier, countStr, expiryStr] = args;
const count = parseInt(countStr, 10);
const expiryMonths = expiryStr ? parseInt(expiryStr, 10) : (tier === 'lifetime' ? 0 : 1);

console.log(`\n🔑 Generating ${count} × ${tier.toUpperCase()} keys (expiry: ${expiryMonths} months)\n`);

for (let i = 0; i < count; i++) {
  const key = generateKey(tier, expiryMonths);
  const info = validateKey(key);
  console.log(`  ${key}  ← ${tier}${info.expiry ? ` (expires: ${info.expiry.toISOString().slice(0, 7)})` : ''}`);
}

console.log(`\n📋 Copy these into your Supabase license_keys table or send directly to customers.\n`);
