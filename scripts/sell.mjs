#!/usr/bin/env node
/**
 * PokerGTO Sales Helper — 卡密销售管理
 *
 * 交互式工具，用于手动销售流程：
 *   1. 选择套餐类型
 *   2. 输入客户信息
 *   3. 自动生成卡密
 *   4. 记录到 CSV 销售日志
 *   5. 输出可直接发给客户的消息
 *
 * Usage:
 *   node scripts/sell.mjs
 */

import { createHmac, randomBytes } from 'crypto';
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// ── Load secret (same logic as generate-license-keys.mjs) ──

function loadSecret() {
  if (process.env.POKERGTO_LICENSE_SECRET) return process.env.POKERGTO_LICENSE_SECRET;
  if (process.env.VITE_LICENSE_SECRET) return process.env.VITE_LICENSE_SECRET;
  try {
    const envPath = resolve(PROJECT_ROOT, '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^VITE_LICENSE_SECRET=(.+)$/m);
      if (match && match[1]) return match[1];
    }
  } catch {}
  console.warn('⚠️  WARNING: Using default license secret!');
  return 'pokergto-trainer-secret-key-2026';
}

const LICENSE_SECRET = loadSecret();

// ── Base32 encoding ──
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function toBase32(num, length) {
  let s = '';
  for (let i = 0; i < length; i++) {
    s = BASE32[num & 31] + s;
    num >>>= 5;
  }
  return s;
}

function generateKey(tier, expiryMonths = 0) {
  const TIER_CODES = { pro: 0, lifetime: 1, developer: 2 };
  const tierCode = TIER_CODES[tier] ?? 0;

  const now = new Date();
  const expiryDate = expiryMonths > 0
    ? new Date(now.getFullYear(), now.getMonth() + expiryMonths, 1)
    : new Date(2099, 0, 1);
  const expiryBits = ((expiryDate.getFullYear() - 2024) * 12 + expiryDate.getMonth()) & 0x3FF;
  const tierBits = tierCode & 0x3;
  const randomBits = randomBytes(3).readUIntBE(0, 3) & 0xFFFFF;

  const payload = (tierBits << 30) | (expiryBits << 20) | randomBits;
  const body = toBase32(payload, 8);

  const hmac = createHmac('sha256', LICENSE_SECRET).update(body).digest();
  const sigBits = hmac.readUIntBE(0, 3) & 0xFFFFF;
  const signature = toBase32(sigBits, 4);

  return {
    key: `PGTO-${body.slice(0, 4)}-${body.slice(4, 8)}-${signature}`,
    tier,
    expiryDate,
    generatedAt: new Date(),
  };
}

// ── CSV logging ──

function ensureLogFile() {
  const logDir = resolve(PROJECT_ROOT, 'sales-logs');
  mkdirSync(logDir, { recursive: true });
  const logPath = resolve(logDir, 'sales.csv');
  if (!existsSync(logPath)) {
    appendFileSync(logPath, 'date,tier,expiry,license_key,customer_email,customer_name,notes,price\n');
  }
  return logPath;
}

function logSale(sale) {
  const logPath = ensureLogFile();
  const row = [
    sale.date,
    sale.tier,
    sale.expiry,
    sale.key,
    sale.email,
    sale.name,
    sale.notes,
    sale.price,
  ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',');
  appendFileSync(logPath, row + '\n');
  return logPath;
}

// ── Interactive CLI ──

const PRICING = {
  '1': { tier: 'pro', months: 1, name: 'Pro 月付', price: '$29.99' },
  '2': { tier: 'pro', months: 12, name: 'Pro 年付', price: '$219' },
  '3': { tier: 'lifetime', months: 0, name: '终身版', price: '$299' },
};

function ask(rl, prompt) {
  return new Promise(resolve => {
    rl.question(prompt, answer => resolve(answer.trim()));
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n╔══════════════════════════════════╗');
  console.log('║   🃏 PokerGTO 卡密销售工具      ║');
  console.log('╚══════════════════════════════════╝\n');

  // Step 1: Choose plan
  console.log('📦 选择套餐:');
  for (const [k, v] of Object.entries(PRICING)) {
    console.log(`  [${k}] ${v.name} — ${v.price}${v.months > 0 ? ` (${v.months}个月)` : ' (永久)'}`);
  }
  console.log('  [4] 自定义 (手动输入月份)');

  const planChoice = await ask(rl, '\n👉 请输入编号 (1-4): ');
  const plan = PRICING[planChoice];

  let tier, months, price, planName;

  if (planChoice === '4') {
    tier = (await ask(rl, '   Tier (pro/lifetime): ')).toLowerCase();
    months = parseInt(await ask(rl, '   有效期 (月数, 0=永久): '), 10) || 0;
    price = await ask(rl, '   价格: ');
    planName = `${tier} (${months}个月)`;
  } else if (plan) {
    tier = plan.tier;
    months = plan.months;
    price = plan.price;
    planName = plan.name;
  } else {
    console.log('❌ 无效选择');
    rl.close();
    process.exit(1);
  }

  // Step 2: Customer info
  console.log('\n👤 客户信息:');
  const email = await ask(rl, '   客户邮箱: ');
  const name = await ask(rl, '   客户姓名 (可选): ');
  const notes = await ask(rl, '   备注 (可选): ');

  // Step 3: Generate key
  const { key, expiryDate } = generateKey(tier, months);
  const dateStr = new Date().toISOString().slice(0, 10);
  const expiryStr = months === 0 ? '永久有效' : expiryDate.toISOString().slice(0, 7);

  // Step 4: Log
  const logPath = logSale({
    date: dateStr,
    tier,
    expiry: expiryStr,
    key,
    email,
    name,
    notes,
    price,
  });

  // Step 5: Output
  console.log('\n╔══════════════════════════════════╗');
  console.log('║   ✅ 卡密已生成                  ║');
  console.log('╚══════════════════════════════════╝\n');
  console.log('📋 销售信息:');
  console.log(`   套餐: ${planName}`);
  console.log(`   价格: ${price}`);
  console.log(`   有效期: ${expiryStr}`);
  console.log(`   客户: ${name} <${email}>`);
  console.log(`   备注: ${notes || '-'}`);
  console.log(`   已记录到: ${logPath}`);
  console.log('');
  console.log('🔑 卡密:');
  console.log(`   ${key}`);
  console.log('');
  console.log('📧 可直接复制发送给客户的消息:');
  console.log('───────────────────────────────────');
  console.log(`感谢购买 PokerGTO Trainer ${planName}！`);
  console.log('');
  console.log(`你的激活码: ${key}`);
  console.log(`有效期: ${expiryStr}`);
  console.log('');
  console.log('激活步骤：');
  console.log('1. 打开 PokerGTO Trainer');
  console.log('2. 点击左侧「账户」');
  console.log('3. 在「激活卡密」处输入上方激活码');
  console.log('4. 点击「激活」即可解锁全部功能');
  console.log('');
  console.log('下载地址: https://github.com/Wei-D-web/poker-gto-trainer/releases/latest');
  console.log('如有问题，可直接回复此消息。');
  console.log('───────────────────────────────────\n');

  rl.close();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
