/**
 * 🎬 Auto Demo Video Generator
 *
 * 1. Launches the PokerGTO app
 * 2. Records screen via ffmpeg avfoundation
 * 3. Drives the app through all demo pages with timed navigation
 * 4. Combines screen recording with AI voiceover
 *
 * Output: ./dist/PokerGTO-Demo.mp4
 *
 * Prerequisites:
 *   - npm run build (must have built app)
 *   - ffmpeg installed (brew install ffmpeg)
 *   - demo-voiceover.aiff exists
 */

import { _electron as electron } from 'playwright-core';
import { spawn, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = __dirname;
const DIST_DIR = path.join(APP_DIR, 'dist');
const VOICEOVER = path.join(APP_DIR, 'demo-voiceover.aiff');
const RAW_VIDEO = path.join(DIST_DIR, 'raw-screen.mp4');
const CROPPED_VIDEO = path.join(DIST_DIR, 'cropped.mp4');
const OUTPUT = path.join(DIST_DIR, 'PokerGTO-Demo.mp4');

// ── Timing config (seconds, synced to voiceover script) ──
// Voiceover is ~100 seconds. Total record time: 105 seconds.
const TOTAL_DURATION = 105;
const INITIAL_WAIT = 3; // wait for app to load before navigating

// Page navigation timings (cumulative seconds from start of navigation)
const PAGE_TIMELINE = [
  { route: 'explore',     at: 0,    label: 'Strategy Explorer' },
  { route: 'editor',      at: 12,   label: 'Range Editor' },
  { route: 'charts',      at: 25,   label: 'Preflop Charts' },
  { route: 'training',    at: 38,   label: 'Training Mode' },
  { route: 'bluffcatcher', at: 51,  label: 'Bluff Catcher' },
  { route: 'equitytrainer', at: 59, label: 'Equity Trainer' },
  { route: 'battle',      at: 67,   label: 'Range Battle' },
  { route: 'icm',         at: 78,   label: 'ICM Calculator' },
  { route: 'analyzer',    at: 88,   label: 'Hand Analyzer' },
];

const electronBin =
  process.platform === 'darwin'
    ? path.join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
    : path.join(APP_DIR, 'node_modules/electron/dist/electron');

// ── Helpers ──

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function exec(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`  🎬 ${cmd}`);
    const p = spawn('bash', ['-c', cmd], { stdio: 'inherit' });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
}

// ── Main ──

async function main() {
  // Clean up old temp files
  for (const f of [RAW_VIDEO, CROPPED_VIDEO, OUTPUT]) {
    try { fs.unlinkSync(f); } catch {}
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  console.log('🎬 Auto Demo Video Generator\n');
  console.log('━'.repeat(50));

  // ═══════════════════════════════════════════════════════
  // STEP 1: Launch app and get window position
  // ═══════════════════════════════════════════════════════
  console.log('\n📱 Step 1: Launching app...\n');

  const app = await electron.launch({
    executablePath: electronBin,
    args: ['--no-sandbox', APP_DIR],
    timeout: 30_000,
  });

  let page;
  for (let i = 0; i < 20; i++) {
    await delay(1_000);
    const windows = app.windows();
    if (windows.length > 0) {
      page = windows[0];
      const url = page.url();
      if (url && !url.startsWith('devtools://') && url !== 'about:blank') break;
    }
  }
  if (!page) { console.error('❌ App failed to load'); process.exit(1); }

  // Enable recording mode
  await page.evaluate(() => {
    localStorage.setItem('pokergto_recording_mode', '1');
    if (!localStorage.getItem('pokergto_demo_mode')) {
      localStorage.setItem('pokergto_demo_mode', '1');
    }
  });
  await page.evaluate(() => window.location.reload());
  await delay(3_000);

  // Get window position for ffmpeg crop
  const bounds = await page.evaluate(() => ({
    x: window.screenX || 0,
    y: window.screenY || 0,
    w: window.outerWidth || 1400,
    h: window.outerHeight || 900,
  }));
  // Add some padding for title bar
  const cropX = Math.max(0, bounds.x);
  const cropY = Math.max(0, bounds.y);
  const cropW = bounds.w;
  const cropH = bounds.h;
  console.log(`   Window at (${cropX}, ${cropY}) ${cropW}x${cropH}\n`);

  // ═══════════════════════════════════════════════════════
  // STEP 2: Start ffmpeg screen recording
  // ═══════════════════════════════════════════════════════
  console.log('📹 Step 2: Recording screen for', TOTAL_DURATION, 'seconds...\n');

  // macOS avfoundation: "1:" = display 1, no audio. "1:0" = display 1 + mic.
  // We record the FULL screen then crop — more reliable than window-capture.
  const ffmpegRecord = spawn('ffmpeg', [
    '-y',
    '-f', 'avfoundation',
    '-i', '1:',           // display 1, no audio
    '-t', String(TOTAL_DURATION),
    '-r', '30',           // 30 fps
    '-vf', `crop=${cropW}:${cropH}:${cropX}:${cropY}`,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    RAW_VIDEO,
  ], { stdio: 'ignore' });

  await delay(2_000); // let ffmpeg start

  // ═══════════════════════════════════════════════════════
  // STEP 3: Navigate through pages on timeline
  // ═══════════════════════════════════════════════════════
  console.log('🎮 Step 3: Navigating pages...\n');

  const startTime = Date.now();

  for (let i = 0; i < PAGE_TIMELINE.length; i++) {
    const { route, at, label } = PAGE_TIMELINE[i];

    // Wait until this page's scheduled time
    const elapsed = (Date.now() - startTime) / 1000;
    const waitMs = Math.max(0, (at - elapsed) * 1000);
    if (waitMs > 0) await delay(waitMs);

    // Countdown to sync with voiceover
    const actualElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   [${actualElapsed}s] → ${label}`);

    // Navigate
    await page.evaluate((r) => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { route: r } }));
    }, route);

    // Try to start training quiz if on training page
    if (route === 'training') {
      await delay(1_500);
      try {
        const btnFound = await page.evaluate(() => {
          const buttons = [...document.querySelectorAll('button')];
          const startBtn = buttons.find(b => {
            const text = b.textContent || '';
            return text.includes('开始') || text.includes('Start') || text.includes('训练');
          });
          if (startBtn) { startBtn.click(); return true; }
          return false;
        });
        if (btnFound) console.log('      → Training quiz started');
      } catch {}
    }

    // Subtle mouse wiggle for visual interest
    try {
      await page.mouse.move(650 + Math.random() * 100, 400 + Math.random() * 100);
    } catch {}
  }

  // Wait for remaining time
  const remaining = TOTAL_DURATION - (Date.now() - startTime) / 1000;
  if (remaining > 0) {
    console.log(`\n   ⏳ Waiting ${remaining.toFixed(1)}s for recording to complete...`);
    await delay(remaining * 1000 + 2_000);
  }

  // ═══════════════════════════════════════════════════════
  // STEP 4: Wait for ffmpeg to finish
  // ═══════════════════════════════════════════════════════
  console.log('\n📦 Step 4: Finalizing recording...');
  await new Promise((resolve) => {
    ffmpegRecord.on('close', resolve);
    setTimeout(() => { ffmpegRecord.kill(); resolve(); }, 5_000);
  });

  await app.close();

  // ═══════════════════════════════════════════════════════
  // STEP 5: Combine video with voiceover
  // ═══════════════════════════════════════════════════════
  console.log('\n🎧 Step 5: Adding AI voiceover...\n');

  if (fs.existsSync(VOICEOVER)) {
    await exec(
      `ffmpeg -y -i "${RAW_VIDEO}" -i "${VOICEOVER}" ` +
      `-c:v copy -c:a aac -b:a 192k ` +
      `-map 0:v:0 -map 1:a:0 ` +
      `-shortest ` +
      `"${OUTPUT}"`
    );
  } else {
    // No voiceover? Just copy raw video
    fs.copyFileSync(RAW_VIDEO, OUTPUT);
  }

  // Clean up temp
  try { fs.unlinkSync(RAW_VIDEO); } catch {}
  try { fs.unlinkSync(CROPPED_VIDEO); } catch {}

  // ═══════════════════════════════════════════════════════
  // Done!
  // ═══════════════════════════════════════════════════════
  console.log('━'.repeat(50));
  console.log(`\n✅ Demo video ready!`);
  console.log(`   📁 ${OUTPUT}\n`);

  const stat = fs.statSync(OUTPUT);
  console.log(`   Size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  console.log('\n🔊 去桌面查看 PokerGTO-Demo.mp4\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
