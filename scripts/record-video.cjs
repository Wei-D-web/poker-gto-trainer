#!/usr/bin/env node
// ═══════════════════════════════════════════
// Auto-recorder: headless Chrome screencast → ffmpeg → MP4
// ═══════════════════════════════════════════
const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PAGE_URL = `file://${path.resolve(__dirname, '..', 'record-wallpaper.html')}`;
const DURATION = 20; // seconds
const FPS = 30;
const TOTAL_FRAMES = DURATION * FPS;
const WIDTH = 1920;
const HEIGHT = 1080;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poker-frames-'));
console.log(`📸 Recording ${DURATION}s @ ${FPS}fps → ${TOTAL_FRAMES} frames`);
console.log(`📁 Temp: ${TMP}`);

// Kill any existing debug Chrome
try { execSync('pkill -f "remote-debugging-port=9223"', { stdio: 'ignore' }); } catch {}

// Launch headless Chrome
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--window-size=${WIDTH},${HEIGHT}`,
  '--remote-debugging-port=9223', '--remote-debugging-address=127.0.0.1',
  PAGE_URL,
], { stdio: 'ignore' });

process.on('exit', () => { try { chrome.kill(); } catch {} try { execSync(`rm -rf ${TMP}`); } catch {} });
process.on('SIGINT', () => process.exit());

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getWsUrl(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9223/json', (res) => {
          let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(body));
        }).on('error', reject);
      });
      const pages = JSON.parse(data);
      const page = pages.find(p => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('Chrome did not start');
}

function makeWs() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', reject);
  });
}

let wsUrl;
let framesReceived = 0;
let lastFrameData = null;

async function sendCmd(ws, id, method, params = {}) {
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => {
    ws.addEventListener('message', function handler(e) {
      const msg = JSON.parse(e.data);
      if (msg.id === id) { ws.removeEventListener('message', handler); resolve(msg.result); }
    });
  });
}

async function main() {
  console.log('⏳ Waiting for Chrome…');
  wsUrl = await getWsUrl();
  console.log('✅ Chrome connected');

  const ws = await makeWs();
  let msgId = 1;

  // Enable Page
  await sendCmd(ws, msgId++, 'Page.enable');

  // Set viewport
  await sendCmd(ws, msgId++, 'Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false,
  });

  // Wait for animation init
  console.log('⏳ Warming up (3s)…');
  await sleep(3000);

  // Setup screencast frame collector
  const frames = [];
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === 'Page.screencastFrame') {
      const { data, metadata, sessionId } = msg.params;
      frames.push({ data, timestamp: metadata.timestamp });
      // Ack to keep stream going
      ws.send(JSON.stringify({ id: msgId++, method: 'Page.screencastFrameAck', params: { sessionId } }));
    }
  });

  // Start screencast
  console.log('🎬 Starting screencast…');
  await sendCmd(ws, msgId++, 'Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    maxWidth: WIDTH,
    maxHeight: HEIGHT,
  });

  // Collect frames for DURATION seconds
  const startTime = Date.now();
  const endTime = startTime + DURATION * 1000;

  await new Promise((resolve) => {
    const check = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      process.stdout.write(`\r   Frames: ${frames.length} — ${elapsed.toFixed(1)}s / ${DURATION}s`);
      if (Date.now() >= endTime) {
        clearInterval(check);
        resolve();
      }
    }, 200);
  });

  console.log(`\n✅ Collected ${frames.length} frames`);

  // Stop screencast
  await sendCmd(ws, msgId++, 'Page.stopScreencast');
  ws.close();
  chrome.kill();

  // Write frames to disk
  console.log('💾 Writing frames…');
  const selectedFrames = [];
  const totalF = frames.length;

  // Sample frames evenly to hit target FPS
  const step = totalF / TOTAL_FRAMES;
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const idx = Math.min(Math.floor(i * step), totalF - 1);
    const fpath = path.join(TMP, `frame_${String(i).padStart(5, '0')}.jpg`);
    fs.writeFileSync(fpath, Buffer.from(frames[idx].data, 'base64'));
    selectedFrames.push(fpath);
    if (i % 60 === 0) process.stdout.write(`\r   Writing ${i}/${TOTAL_FRAMES}…`);
  }
  console.log(`\n✅ ${selectedFrames.length} frames saved`);

  // Compile with ffmpeg
  console.log('🎬 Encoding MP4…');
  const output = path.join(os.homedir(), 'Desktop', 'poker-gto-wallpaper.mp4');
  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${TMP}/frame_%05d.jpg" ` +
    `-c:v libx264 -pix_fmt yuv420p -preset fast -crf 20 ` +
    `-movflags +faststart "${output}" 2>&1`,
    { stdio: 'pipe' }
  );

  execSync(`rm -rf ${TMP}`);
  const sizeMB = (fs.statSync(output).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ 完成！视频 → ${output} (${sizeMB} MB)`);
  console.log(`   时长 ${DURATION}s · ${FPS}fps · ${WIDTH}x${HEIGHT}`);
}

main().catch(err => {
  console.error('❌', err.message);
  try { chrome.kill(); } catch {}
  try { execSync(`rm -rf ${TMP}`); } catch {}
  process.exit(1);
});
