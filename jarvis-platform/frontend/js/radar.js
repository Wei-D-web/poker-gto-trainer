/* ═══════════════════════════════════════
   J.A.R.V.I.S. — Threat Radar Module (Canvas 2D)
   ═══════════════════════════════════════ */

var JARVIS = window.JARVIS || {};

JARVIS.Radar = (function () {
  var active = false;
  var canvas, ctx, raf;
  var sweepAngle = 0;
  var threats = [];
  var MAX_THREATS = 8;

  function init() {
    canvas = document.getElementById('radar-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'radar-canvas';
      canvas.width = 200;
      canvas.height = 120;
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');

    // Label
    var label = document.getElementById('radar-label');
    if (!label) {
      label = document.createElement('div');
      label.id = 'radar-label';
      label.textContent = 'THREAT RADAR • 180° SCAN';
      document.body.appendChild(label);
    }

    // Threat info tooltip
    var tip = document.getElementById('radar-threat-info');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'radar-threat-info';
      document.body.appendChild(tip);
    }

    // Mouse hover to show threat info
    canvas.style.pointerEvents = 'auto';
    canvas.addEventListener('mousemove', function (e) {
      if (!active) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var found = null;
      threats.forEach(function (t) {
        var dx = mx - t.sx, dy = my - t.sy;
        if (Math.sqrt(dx * dx + dy * dy) < 8) found = t;
      });
      if (found) {
        tip.style.opacity = '1';
        tip.style.left = (e.clientX + 15) + 'px';
        tip.style.top = (e.clientY - 30) + 'px';
        tip.textContent = found.label + ' | THREAT: ' + found.level + ' | RNG: ' + found.dist;
      } else {
        tip.style.opacity = '0';
      }
    });
    canvas.addEventListener('mouseleave', function () { tip.style.opacity = '0'; });

    // Spawn initial threats
    spawnThreats();
    console.log('%c[Radar] %cThreat detection grid online.',
      'color: #EF4444;', 'color: #94A3B8;');
  }

  function spawnThreats() {
    threats = [];
    var labels = ['BOGIE-A', 'BOGIE-B', 'HOSTILE-1', 'UNKNOWN', 'BANDIT-3', 'HOSTILE-2', 'UAV-SIG', 'CONTACT-X'];
    for (var i = 0; i < MAX_THREATS; i++) {
      var angle = Math.random() * Math.PI;
      var dist = 0.15 + Math.random() * 0.85;
      threats.push({
        angle: angle, dist: dist,
        sx: 100 + Math.cos(angle) * dist * 90,
        sy: 115 - Math.sin(angle) * dist * 100,
        level: Math.floor(Math.random() * 9) + 1,
        label: labels[i],
        drift: (Math.random() - 0.5) * 0.003,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw() {
    if (!active) return;
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(3,6,9,0.7)';
    ctx.beginPath();
    ctx.arc(100, 115, 95, Math.PI, 0);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(59,130,246,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(100, 115, 95, Math.PI, 0);
    ctx.stroke();

    // Range rings
    for (var r = 1; r <= 3; r++) {
      ctx.strokeStyle = 'rgba(59,130,246,0.12)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(100, 115, 30 * r, Math.PI, 0);
      ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = 'rgba(59,130,246,0.15)';
    ctx.beginPath(); ctx.moveTo(5, 115); ctx.lineTo(195, 115); ctx.stroke();

    // Sweep line
    sweepAngle += 0.025;
    if (sweepAngle > Math.PI * 2) sweepAngle = 0;
    var sx = 100 + Math.cos(sweepAngle) * 95;
    var sy = 115 - Math.sin(sweepAngle) * 95;
    var grad = ctx.createLinearGradient(100, 115, sx, sy);
    grad.addColorStop(0, 'rgba(59,130,246,0.5)');
    grad.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(100, 115); ctx.lineTo(sx, sy); ctx.stroke();

    // Afterglow trail
    for (var t = 0; t < 15; t++) {
      var a = sweepAngle - t * 0.08;
      var gx = 100 + Math.cos(a) * 95;
      var gy = 115 - Math.sin(a) * 95;
      ctx.fillStyle = 'rgba(59,130,246,' + (0.12 - t * 0.007) + ')';
      ctx.beginPath(); ctx.arc(gx, gy, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Threats
    threats.forEach(function (t) {
      t.angle += t.drift;
      t.pulse += 0.04;
      t.sx = 100 + Math.cos(t.angle) * t.dist * 90;
      t.sy = 115 - Math.sin(t.angle) * t.dist * 100;
      var pulseAlpha = 0.4 + Math.sin(t.pulse) * 0.3;
      var r = t.level <= 3 ? 'rgba(16,185,129,' + pulseAlpha + ')' :
              t.level <= 6 ? 'rgba(245,158,11,' + pulseAlpha + ')' :
                             'rgba(239,68,68,' + pulseAlpha + ')';
      ctx.fillStyle = r;
      ctx.beginPath(); ctx.arc(t.sx, t.sy, 3, 0, Math.PI * 2); ctx.fill();
      // Outer glow
      ctx.fillStyle = r.replace(pulseAlpha + ')', (pulseAlpha * 0.25) + ')');
      ctx.beginPath(); ctx.arc(t.sx, t.sy, 7, 0, Math.PI * 2); ctx.fill();
    });

    // Tick marks
    ctx.fillStyle = 'rgba(59,130,246,0.3)';
    ctx.font = '7px monospace';
    ctx.fillText('N', 96, 15);
    ctx.fillText('W', 4, 118);
    ctx.fillText('E', 192, 118);

    raf = requestAnimationFrame(draw);
  }

  function activate() {
    if (active) return;
    active = true;
    document.body.classList.add('radar-active');
    sweepAngle = 0;
    spawnThreats();
    draw();
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('THREAT RADAR ACTIVE');
  }

  function deactivate() {
    active = false;
    document.body.classList.remove('radar-active');
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('RADAR OFFLINE');
  }

  function toggle() {
    if (active) deactivate(); else activate();
  }

  return {
    init: init, toggle: toggle, activate: activate, deactivate: deactivate,
    isActive: function () { return active; },
  };
})();

window.JARVIS = JARVIS;
