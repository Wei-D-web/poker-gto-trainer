/* ==========================================
   J.A.R.V.I.S. — Flight HUD Mode
   Iron Man cockpit: artificial horizon, altitude
   ladder, speed tape, heading scale, G-meter
   Canvas 2D avionics — 60fps
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.FlightHUD = (function () {
  let active = false;
  let canvas, ctx;
  let width, height;
  let animId = null;

  // Flight state
  let pitch = 0, targetPitch = 0;       // degrees, -30 to +30
  let roll = 0, targetRoll = 0;         // degrees, -60 to +60
  let heading = 274;                     // degrees, 0-360
  let altitude = 3200;                  // feet
  let speed = 280;                       // knots
  let gForce = 1.0, targetGForce = 1.0;
  let aoa = 3;                          // angle of attack, degrees
  let throttle = 65;                    // 0-100%

  // Mouse state
  let mouseX = 0, mouseY = 0;
  let prevMx = 0, prevMy = 0;
  let mouseVx = 0, mouseVy = 0;

  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'flight-hud-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:15;pointer-events:none;display:none;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    window.addEventListener('resize', resize);
    resize();

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('wheel', onWheel, { passive: true });

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', onDeviceOrientation);
    }

    return true;
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    if (canvas) { canvas.width = width; canvas.height = height; }
  }

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseVx = mouseX - prevMx;
    mouseVy = mouseY - prevMy;
    prevMx = mouseX;
    prevMy = mouseY;
  }

  function onWheel(e) {
    if (!active) return;
    throttle = Math.max(0, Math.min(100, throttle - e.deltaY * 0.1));
  }

  function onDeviceOrientation(e) {
    if (!active) return;
    if (e.beta !== null) targetPitch = (e.beta - 45) * 0.6; // beta: 0-180
    if (e.gamma !== null) targetRoll = e.gamma * 0.8;       // gamma: -90 to 90
  }

  function activate() {
    if (active) return;
    active = true;
    canvas.style.display = 'block';
    document.body.classList.add('flight-hud-active');
    // Hide existing heading/altitude tapes
    var hdg = document.getElementById('heading-tape');
    var alt = document.getElementById('altitude-tape');
    if (hdg) hdg.style.display = 'none';
    if (alt) alt.style.display = 'none';
    if (!animId) animId = requestAnimationFrame(tick);
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('FLIGHT HUD ENGAGED');
  }

  function deactivate() {
    if (!active) return;
    active = false;
    canvas.style.display = 'none';
    document.body.classList.remove('flight-hud-active');
    var hdg = document.getElementById('heading-tape');
    var alt = document.getElementById('altitude-tape');
    if (hdg) hdg.style.display = '';
    if (alt) alt.style.display = '';
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function toggle() {
    active ? deactivate() : activate();
  }

  function tick(now) {
    if (!active) { animId = null; return; }
    animId = requestAnimationFrame(tick);

    // Update flight state from mouse
    targetPitch = ((mouseY / height) - 0.5) * 60;  // -30 to +30
    targetRoll = ((mouseX / width) - 0.5) * 120;    // -60 to +60

    // Smooth interpolation
    pitch += (targetPitch - pitch) * 0.08;
    roll += (targetRoll - roll) * 0.08;

    // Heading drifts with roll
    heading = (heading + roll * 0.02) % 360;
    if (heading < 0) heading += 360;

    // Altitude changes with pitch
    altitude += pitch * 15 * 0.016;
    altitude = Math.max(0, Math.min(40000, altitude));

    // Speed changes with throttle and pitch
    var targetSpeed = throttle * 5 + pitch * 3;
    speed += (targetSpeed - speed) * 0.05;
    speed = Math.max(30, Math.min(600, speed));

    // G-force from mouse velocity and pitch
    targetGForce = 1.0 + Math.abs(mouseVy) * 0.05 + Math.abs(pitch) * 0.02;
    gForce += (targetGForce - gForce) * 0.1;
    gForce = Math.max(0.1, Math.min(9, gForce));

    // AOA from pitch and mouse
    aoa = pitch * 0.5 + mouseVy * 0.1;

    // Decay mouse velocity
    mouseVx *= 0.9;
    mouseVy *= 0.9;

    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    var cx = width / 2, cy = height / 2;

    ctx.save();

    // ── Artificial Horizon ──
    drawHorizon(cx, cy);

    // ── Pitch Ladder ──
    drawPitchLadder(cx, cy);

    // ── Heading Scale (top) ──
    drawHeadingScale();

    // ── Altitude Ladder (right) ──
    drawAltitudeLadder();

    // ── Speed Tape (left) ──
    drawSpeedTape();

    // ── G-Meter (bottom-right) ──
    drawGMeter();

    // ── AoA Indicator (bottom-left) ──
    drawAoA();

    // ── Flight Path Vector ──
    drawFlightPathVector(cx, cy);

    // ── HUD Frame ──
    drawHUDFrame();

    // ── Status Ticker ──
    drawStatusTicker();

    ctx.restore();
  }

  function drawHorizon(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll * Math.PI / 180);

    // Sky (upper half)
    var skyGrad = ctx.createLinearGradient(0, -height, 0, 0);
    skyGrad.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
    skyGrad.addColorStop(1, 'rgba(6, 182, 212, 0.03)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-width, -height, width * 2, height + pitch * 6);

    // Ground (lower half)
    var grdGrad = ctx.createLinearGradient(0, 0, 0, height);
    grdGrad.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
    grdGrad.addColorStop(1, 'rgba(139, 92, 246, 0.02)');
    ctx.fillStyle = grdGrad;
    ctx.fillRect(-width, pitch * 6, width * 2, height + 200);

    // Horizon line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    var hy = pitch * 6;
    ctx.moveTo(-width, hy);
    ctx.lineTo(width, hy);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center fixed aircraft symbol
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-40, hy);
    ctx.lineTo(-12, hy);
    ctx.moveTo(12, hy);
    ctx.lineTo(40, hy);
    ctx.moveTo(0, hy - 8);
    ctx.lineTo(0, hy + 8);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = 'rgba(255, 165, 0, 0.9)';
    ctx.beginPath();
    ctx.arc(0, hy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawPitchLadder(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll * Math.PI / 180);

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';

    for (var deg = -30; deg <= 30; deg += 5) {
      var y = (deg - pitch) * 6;
      if (Math.abs(y) > height * 0.6) continue;

      var lineW = deg % 10 === 0 ? 60 : 30;
      ctx.beginPath();
      ctx.moveTo(-lineW, y);
      ctx.lineTo(lineW, y);
      ctx.stroke();

      if (deg % 10 === 0 && deg !== 0) {
        ctx.fillText(Math.abs(deg) + '', -lineW - 24, y + 3);
        ctx.fillText(Math.abs(deg) + '', lineW + 8, y + 3);
      }
    }

    ctx.restore();
  }

  function drawHeadingScale() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, width, 28);

    ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
    ctx.fillStyle = 'rgba(96, 165, 250, 0.8)';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.lineWidth = 1;

    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    var dirAngles = [0, 45, 90, 135, 180, 225, 270, 315];

    for (var i = 0; i < dirs.length; i++) {
      var relAngle = dirAngles[i] - heading;
      if (relAngle > 180) relAngle -= 360;
      if (relAngle < -180) relAngle += 360;
      var x = width / 2 + relAngle * (width / 80);
      if (x > 20 && x < width - 20) {
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x, 28);
        ctx.stroke();
        ctx.fillText(dirs[i], x - ctx.measureText(dirs[i]).width / 2, 16);
      }
    }

    // Center heading indicator
    ctx.fillStyle = 'rgba(255, 165, 0, 0.9)';
    ctx.beginPath();
    ctx.moveTo(width / 2, 22);
    ctx.lineTo(width / 2 - 6, 28);
    ctx.lineTo(width / 2 + 6, 28);
    ctx.closePath();
    ctx.fill();

    // Current heading
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    var hdgText = String(Math.round(heading)).padStart(3, '0') + '°';
    ctx.fillText(hdgText, width / 2 - ctx.measureText(hdgText).width / 2, 40);

    ctx.restore();
  }

  function drawAltitudeLadder() {
    ctx.save();
    var tapeX = width - 40;
    var tapeW = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(tapeX, 40, tapeW, height - 120);

    ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
    ctx.fillStyle = 'rgba(249, 115, 22, 0.8)';
    ctx.font = '10px "JetBrains Mono", monospace';

    var centerY = height / 2;
    for (var a = 0; a <= 40000; a += 200) {
      var y = centerY - (a - altitude) * 0.02;
      if (y < 50 || y > height - 130) continue;
      var isMajor = a % 1000 === 0;
      if (isMajor) {
        ctx.fillText(String(a), tapeX + 4, y + 3);
        ctx.beginPath();
        ctx.moveTo(tapeX + tapeW - 12, y);
        ctx.lineTo(tapeX + tapeW, y);
        ctx.stroke();
      } else if (a % 500 === 0) {
        ctx.beginPath();
        ctx.moveTo(tapeX + tapeW - 7, y);
        ctx.lineTo(tapeX + tapeW, y);
        ctx.stroke();
      }
    }

    // Altitude readout
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    var altText = String(Math.round(altitude)).padStart(5, '0');
    ctx.fillText(altText, tapeX + 2, height / 2 - 4);

    // ALT label
    ctx.fillStyle = 'rgba(249, 115, 22, 0.5)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('ALT', tapeX + 4, 54);

    ctx.restore();
  }

  function drawSpeedTape() {
    ctx.save();
    var tapeX = 4;
    var tapeW = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(tapeX, 40, tapeW, height - 120);

    ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
    ctx.fillStyle = 'rgba(96, 165, 250, 0.8)';
    ctx.font = '10px "JetBrains Mono", monospace';

    var centerY = height / 2;
    for (var s = 0; s <= 600; s += 10) {
      var y = centerY - (s - speed) * 0.4;
      if (y < 50 || y > height - 130) continue;
      var isMajor = s % 50 === 0;
      if (isMajor) {
        ctx.fillText(String(s), tapeX + 4, y + 3);
        ctx.beginPath();
        ctx.moveTo(tapeX + tapeW - 12, y);
        ctx.lineTo(tapeX + tapeW, y);
        ctx.stroke();
      }
    }

    // Speed readout
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    var spdText = String(Math.round(speed));
    ctx.fillText(spdText, tapeX + 2, height / 2 - 4);

    ctx.fillStyle = 'rgba(96, 165, 250, 0.5)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('SPD', tapeX + 4, 54);

    ctx.restore();
  }

  function drawGMeter() {
    ctx.save();
    var gx = width - 90, gy = height - 110, gr = 45;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fill();

    // Scale marks
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (var g = 1; g <= 9; g++) {
      var angle = -Math.PI * 0.75 + (g - 1) / 8 * Math.PI * 1.5;
      var inner = gr - 8;
      var outer = gr - (g % 2 === 1 ? 14 : 10);
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(angle) * inner, gy + Math.sin(angle) * inner);
      ctx.lineTo(gx + Math.cos(angle) * outer, gy + Math.sin(angle) * outer);
      ctx.stroke();
      if (g % 2 === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(g + '', gx + Math.cos(angle) * (outer - 12) - 3, gy + Math.sin(angle) * (outer - 12) + 3);
      }
    }

    // Needle
    var needleAngle = -Math.PI * 0.75 + (gForce - 1) / 8 * Math.PI * 1.5;
    ctx.strokeStyle = 'rgba(255, 100, 50, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx + Math.cos(needleAngle) * 4, gy + Math.sin(needleAngle) * 4);
    ctx.lineTo(gx + Math.cos(needleAngle) * (gr - 12), gy + Math.sin(needleAngle) * (gr - 12));
    ctx.stroke();

    // G label
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    var gText = gForce.toFixed(1) + 'G';
    ctx.fillText(gText, gx - ctx.measureText(gText).width / 2, gy + 4);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillText('G LOAD', gx - 12, gy - gr + 12);

    ctx.restore();
  }

  function drawAoA() {
    ctx.save();
    var ax = 60, ay = height - 120;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(ax - 14, ay - 50, 28, 90);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (var a = -15; a <= 15; a += 5) {
      var y = ay - a * 3;
      ctx.beginPath();
      ctx.moveTo(ax - 10, y);
      ctx.lineTo(ax + (a === 0 ? 10 : 5), y);
      ctx.stroke();
    }

    // AoA indicator
    var aoaY = ay - aoa * 3;
    ctx.fillStyle = 'rgba(255, 165, 0, 0.9)';
    ctx.beginPath();
    ctx.moveTo(ax - 16, aoaY);
    ctx.lineTo(ax, aoaY - 5);
    ctx.lineTo(ax, aoaY + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillText('AOA', ax - 8, ay - 54);

    ctx.restore();
  }

  function drawFlightPathVector(cx, cy) {
    ctx.save();
    ctx.translate(cx + mouseVx * 2, cy + mouseVy * 2 + pitch * 3);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,255,255,0.4)';
    ctx.shadowBlur = 4;

    // Circle with wings
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-6, 0);
    ctx.moveTo(6, 0);
    ctx.lineTo(14, 0);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawHUDFrame() {
    ctx.save();
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.2)';
    ctx.lineWidth = 1;

    // Corner brackets
    var s = 30;
    // TL
    ctx.beginPath(); ctx.moveTo(20, 50); ctx.lineTo(20, 20 + s); ctx.moveTo(20, 20); ctx.lineTo(20 + s, 20); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(width - 20, 50); ctx.lineTo(width - 20, 20 + s); ctx.moveTo(width - 20, 20); ctx.lineTo(width - 20 - s, 20); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(20, height - 70); ctx.lineTo(20, height - 20 - s); ctx.moveTo(20, height - 20); ctx.lineTo(20 + s, height - 20); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(width - 20, height - 70); ctx.lineTo(width - 20, height - 20 - s); ctx.moveTo(width - 20, height - 20); ctx.lineTo(width - 20 - s, height - 20); ctx.stroke();

    ctx.restore();
  }

  function drawStatusTicker() {
    ctx.save();
    ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';

    var items = [
      'THR ' + Math.round(throttle) + '%',
      'FLT NOMINAL',
      'SYS ONLINE',
      'NAV GPS',
    ];
    var totalWidth = 0;
    items.forEach(function(item) { totalWidth += ctx.measureText(item).width + 24; });

    var startX = width / 2 - totalWidth / 2 + (Date.now() / 50 % totalWidth);
    var y = height - 10;
    items.forEach(function(item) {
      ctx.fillText(item, startX, y);
      startX += ctx.measureText(item).width + 24;
    });

    ctx.restore();
  }

  function isActive() { return active; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  return { init, activate, deactivate, toggle, isActive };
})();

window.JARVIS = JARVIS;
