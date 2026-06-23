/**
 * PokerGTO License Key Validation (Browser-Compatible)
 *
 * Validates PGTO-XXXX-XXXX-XXXX license keys offline using HMAC-SHA256.
 * Uses Web Crypto API — works in Electron renderer, main process, and modern browsers.
 *
 * Key format (19 chars): PGTO-{body8}-{sig4}
 *   body (8 base32 chars) = 32 bits: tier(2) + expiry-months(10) + random(20)
 *   sig  (4 base32 chars) = HMAC-SHA256(body, SECRET) first 20 bits
 */

// ⚠️ Must match POKERGTO_LICENSE_SECRET used in scripts/generate-license-keys.mjs
// Set via VITE_LICENSE_SECRET in .env — never hardcode in production builds.
const LICENSE_SECRET = import.meta.env.VITE_LICENSE_SECRET || 'pokergto-trainer-secret-key-2026'

// Crockford base32 alphabet (no I/L/O/U to avoid confusion)
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

// Tier codes (must match key generator)
const TIER_NAMES: Record<number, string> = { 0: 'pro', 1: 'lifetime', 2: 'developer' }

export interface LicenseInfo {
  valid: boolean
  tier?: string
  expiry?: Date
  expired?: boolean
  message: string
}

// ── Base32 encoding (pure JS, no crypto needed) ──

function toBase32(num: number, length: number): string {
  let s = ''
  for (let i = 0; i < length; i++) {
    s = BASE32[num & 31] + s
    num >>>= 5
  }
  return s
}

function fromBase32(s: string): number {
  let n = 0
  for (const c of s.toUpperCase()) {
    const i = BASE32.indexOf(c)
    if (i === -1) return -1
    n = (n << 5) | i
  }
  return n >>> 0 // unsigned 32-bit
}

// ── HMAC-SHA256 via Web Crypto API ──

async function hmacSha256(message: string, secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  return new Uint8Array(signature)
}

// ── Public API ──

/**
 * Clean and normalize a license key input.
 * "pgto-dev-admin-key" → "PGTODEVADMINKEY"
 */
export function normalizeKeyInput(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Auto-format a key as the user types: insert dashes at the right positions.
 * "PGTO000000000000" → "PGTO-0000-0000-0000"
 */
export function formatKeyForDisplay(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleaned.length <= 4) return cleaned
  if (cleaned.length <= 8) return cleaned.slice(0, 4) + '-' + cleaned.slice(4)
  if (cleaned.length <= 12) return cleaned.slice(0, 4) + '-' + cleaned.slice(4, 8) + '-' + cleaned.slice(8)
  return cleaned.slice(0, 4) + '-' + cleaned.slice(4, 8) + '-' + cleaned.slice(8, 12) + '-' + cleaned.slice(12, 16)
}

/**
 * Check if the user is typing the developer key.
 */
export function isTypingDevKey(input: string): boolean {
  const cleaned = normalizeKeyInput(input)
  return cleaned.startsWith('PGTODEV') || cleaned === 'PGTODEVADMINKEY'
}

/**
 * Validate a license key offline using HMAC-SHA256.
 *
 * Returns { valid, tier, expiry, message }.
 * - Developer key (PGTO-DEV-ADMIN-KEY) always passes.
 * - Demo keys (PGTO-DEMO-*) always pass.
 * - Customer keys are validated via HMAC signature and expiry check.
 */
export async function validateLicenseKey(key: string): Promise<LicenseInfo> {
  const cleaned = normalizeKeyInput(key)

  // ── Developer key — always valid ──
  if (cleaned === 'PGTODEVADMINKEY' || key.toUpperCase().trim() === 'PGTO-DEV-ADMIN-KEY') {
    return { valid: true, tier: 'developer', message: '🔑 开发者模式已激活' }
  }

  // ── Demo keys — always valid (for testing) ──
  if (cleaned === 'PGTODEMOPROKEY' || key.toUpperCase().trim() === 'PGTO-DEMO-PRO-KEY') {
    return { valid: true, tier: 'pro', message: 'Pro 激活成功！(演示)' }
  }
  if (cleaned === 'PGTODEMOLIFEKEY' || key.toUpperCase().trim() === 'PGTO-DEMO-LIFE-KEY') {
    return { valid: true, tier: 'lifetime', message: '终身会员激活成功！(演示)' }
  }

  // ── Customer keys: validate HMAC signature ──
  // Format: PGTO-XXXX-XXXX-XXXX → 12 base32 chars after PGTO
  if (cleaned.length < 12) {
    return { valid: false, message: '卡密格式不正确，需要至少 12 位字符' }
  }

  const core = cleaned.startsWith('PGTO') ? cleaned.slice(4) : cleaned
  if (core.length < 12) {
    return { valid: false, message: '卡密格式不正确' }
  }

  const body = core.slice(0, 8)
  const providedSig = core.slice(8, 12)

  // Validate body characters are valid base32
  for (const c of body) {
    if (BASE32.indexOf(c) === -1) {
      return { valid: false, message: '卡密包含无效字符' }
    }
  }

  // Verify HMAC signature
  try {
    const hmac = await hmacSha256(body, LICENSE_SECRET)
    // First 3 bytes (24 bits) of HMAC, masked to 20 bits
    // Must match Node.js: hmac.readUIntBE(0, 3) & 0xFFFFF
    const expectedSigBits = ((hmac[0] << 16) | (hmac[1] << 8) | hmac[2]) & 0xFFFFF
    const expectedSig = toBase32(expectedSigBits, 4)

    if (providedSig !== expectedSig) {
      return { valid: false, message: '卡密无效 — 签名验证失败' }
    }
  } catch {
    return { valid: false, message: '验证失败 — 请重试' }
  }

  // Decode payload: tier(2 bits) + expiry-months(10 bits) + random(20 bits)
  const payload = fromBase32(body)
  if (payload < 0) {
    return { valid: false, message: '卡密解析失败' }
  }

  const tierCode = (payload >>> 30) & 0x3
  const expiryBits = (payload >>> 20) & 0x3FF
  const tier = TIER_NAMES[tierCode] || 'pro'

  // Calculate expiry date
  const totalMonths = expiryBits
  const expiryYear = 2024 + Math.floor(totalMonths / 12)
  const expiryMonth = totalMonths % 12
  const expiry = new Date(expiryYear, expiryMonth + 1, 0) // last day of the expiry month

  // Check if expired
  if (expiry < new Date()) {
    return {
      valid: false,
      tier,
      expiry,
      expired: true,
      message: `卡密已过期 (${expiry.toISOString().slice(0, 7)})`,
    }
  }

  const tierLabels: Record<string, string> = { pro: 'Pro 专业版', lifetime: '终身版', developer: '开发者' }
  const expiryStr = expiry.getFullYear() >= 2098
    ? '永久有效'
    : `有效期至 ${expiry.toISOString().slice(0, 7)}`

  return {
    valid: true,
    tier,
    expiry,
    message: `${tierLabels[tier] || tier} 激活成功！${expiryStr}`,
  }
}
