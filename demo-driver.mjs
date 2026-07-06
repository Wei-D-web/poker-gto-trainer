/**
 * PokerGTO Trainer — Demo Screenshot Driver
 *
 * Launches the built Electron app with recording mode, navigates to
 * key pages, pre-populates data where needed, and captures screenshots.
 *
 * Usage: node demo-driver.mjs
 * Output: ./demo-screenshots/
 */

import { _electron as electron } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = __dirname;
const SHOT_DIR = path.join(APP_DIR, 'demo-screenshots');

// Clean + recreate screenshot dir
fs.rmSync(SHOT_DIR, { recursive: true, force: true });
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin =
  process.platform === 'darwin'
    ? path.join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
    : path.join(APP_DIR, 'node_modules/electron/dist/electron');

// ── Pages to screenshot (demo narrative order) ──
const SCREENSHOTS = [
  { route: 'explore',     label: '01-strategy-explorer',  desc: '策略浏览器' },
  { route: 'charts',      label: '02-preflop-charts',     desc: '翻前图册' },
  { route: 'editor',      label: '03-range-editor',       desc: '范围编辑器' },
  { route: 'training',    label: '04-training-quiz',      desc: '训练模式-答题中' },
  { route: 'bluffcatcher', label: '05-bluff-catcher',     desc: 'Bluff Catcher' },
  { route: 'equitytrainer', label: '06-equity-trainer',   desc: '胜率训练' },
  { route: 'battle',      label: '07-range-battle',       desc: 'Range Battle' },
  { route: 'icm',         label: '08-icm-calculator',     desc: 'ICM 计算器' },
  { route: 'analyzer',    label: '09-hand-analyzer',      desc: '手牌分析器' },
  { route: 'multiway',    label: '10-multiway',           desc: '多人底池' },
  { route: 'exploitadvisor', label: '11-exploit-advisor', desc: '剥削顾问' },
  { route: 'compare',     label: '12-strategy-compare',   desc: '策略对比' },
  { route: 'tools',       label: '13-tools',              desc: '工具箱' },
  { route: 'review',      label: '14-session-review',     desc: '复盘教练' },
];

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 Launching PokerGTO Trainer in recording mode...\n');

  const app = await electron.launch({
    executablePath: electronBin,
    args: ['--no-sandbox', APP_DIR],
    env: { ...process.env },
    timeout: 30_000,
  });

  // Wait for window
  console.log('⏳ Waiting for app to load...');
  let page;
  for (let i = 0; i < 20; i++) {
    await delay(1_000);
    const windows = app.windows();
    if (windows.length > 0) {
      page = windows[0];
      const url = page.url();
      if (url && !url.startsWith('devtools://') && url !== 'about:blank') {
        console.log(`✅ Window loaded: ${url}\n`);
        break;
      }
    }
  }

  if (!page) {
    console.error('❌ Timed out waiting for app window');
    await app.close();
    process.exit(1);
  }

  await delay(3_000);

  // ── Enable recording mode (hides demo banner + sidebar indicators) ──
  await page.evaluate(() => {
    localStorage.setItem('pokergto_recording_mode', '1');
    // Ensure demo mode is also active (in case app needs it for data)
    if (!localStorage.getItem('pokergto_demo_mode')) {
      localStorage.setItem('pokergto_demo_mode', '1');
    }
  });
  console.log('🎬 Recording mode enabled (banner hidden)\n');

  // Reload to apply recording mode
  await page.evaluate(() => window.location.reload());
  await delay(4_000);

  // ── Screenshot each page ──
  for (const { route, label, desc } of SCREENSHOTS) {
    console.log(`📸 ${label}: ${desc}`);

    await page.evaluate((r) => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { route: r } }));
    }, route);

    await delay(3_000);

    // ── Per-page pre-interactions for better visuals ──
    if (route === 'training') {
      // Click "Start Training" button to show quiz mode instead of config
      try {
        const btn = await page.evaluate(() => {
          const buttons = [...document.querySelectorAll('button')];
          const start = buttons.find(b => b.textContent?.includes('开始') || b.textContent?.includes('Start'));
          return start ? true : false;
        });
        if (btn) {
          await page.evaluate(() => {
            const buttons = [...document.querySelectorAll('button')];
            const start = buttons.find(b => b.textContent?.includes('开始') || b.textContent?.includes('Start'));
            if (start) start.click();
          });
          await delay(2_000);
        }
      } catch { /* keep going */ }
    }

    if (route === 'analyzer') {
      // Try clicking analyze if there's default data
      try {
        await page.evaluate(() => {
          const buttons = [...document.querySelectorAll('button')];
          const analyze = buttons.find(b =>
            b.textContent?.includes('分析') || b.textContent?.includes('Analyze'));
          if (analyze) analyze.click();
        });
        await delay(1_500);
      } catch { /* keep going */ }
    }

    const filePath = path.join(SHOT_DIR, `${label}.png`);
    await page.screenshot({ path: filePath, type: 'png' });
    console.log(`   ✅ ${filePath}\n`);
  }

  console.log('✅ Done! All screenshots saved to:');
  console.log(`   ${SHOT_DIR}/`);
  console.log(`\n📋 Total: ${SCREENSHOTS.length} screenshots\n`);

  await app.close();
  console.log('👋 App closed.');
}

main().catch((err) => {
  console.error('❌ Driver error:', err);
  process.exit(1);
});
