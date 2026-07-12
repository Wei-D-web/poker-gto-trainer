/* ═══════════════════════════════════════
   J.A.R.V.I.S. — System Diagnostics Module
   ═══════════════════════════════════════ */

var JARVIS = window.JARVIS || {};

JARVIS.Diagnostics = (function () {
  var active = false;
  var logInterval;
  var logLines = [];

  var SUBSYSTEMS = [
    { name: 'ARC REACTOR', stat: 'Output', unit: 'GJ/s', val: '3.2', nominal: true },
    { name: 'THRUST CTRL', stat: 'Throttle', unit: '%', val: '100', nominal: true },
    { name: 'SENSOR ARRAY', stat: 'Ping', unit: 'ms', val: '12', nominal: true },
    { name: 'COMMS LINK', stat: 'Signal', unit: 'dB', val: '-42', nominal: true },
    { name: 'SHIELD GEN', stat: 'Integrity', unit: '%', val: '98', nominal: true },
    { name: 'LIFE SUPPORT', stat: 'O2 Level', unit: '%', val: '20.9', nominal: true },
  ];

  function init() {
    injectDOM();
    setupCloseButton();
    console.log('%c[Diagnostics] %cSystem diagnostic suite online.',
      'color: #10B981;', 'color: #94A3B8;');
  }

  function injectDOM() {
    var overlay = document.createElement('div');
    overlay.id = 'diag-panel-overlay';
    overlay.innerHTML =
      '<div id="diag-panel">' +
        '<div class="diag-header">' +
          '<div><h2>SYS.DIAGNOSTICS</h2><div class="diag-time" id="diag-time"></div></div>' +
          '<button class="diag-close" id="diag-close-btn">✕</button>' +
        '</div>' +
        '<div class="diag-subsystems" id="diag-subsystems"></div>' +
        '<div class="diag-log" id="diag-log"><div class="diag-log-entry">' +
          '<span class="log-time">--:--:--</span>' +
          '<span class="log-module">CORE</span>' +
          '<span class="log-msg">Initializing diagnostic subsystem...</span>' +
        '</div></div>' +
        '<div class="diag-footer">' +
          '<div class="diag-status"><span>●</span> ALL SYSTEMS NOMINAL</div>' +
          '<div class="diag-uptime" id="diag-uptime">UPTIME: 00:00:00</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  function setupCloseButton() {
    var btn = document.getElementById('diag-close-btn');
    if (btn) btn.addEventListener('click', deactivate);
    // Click outside panel to close
    var overlay = document.getElementById('diag-panel-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) deactivate();
      });
    }
  }

  function renderSubsystems() {
    var container = document.getElementById('diag-subsystems');
    if (!container) return;
    var html = '';
    SUBSYSTEMS.forEach(function (sub) {
      // Randomly vary values slightly
      var val = parseFloat(sub.val);
      var jitter = (Math.random() - 0.5) * val * 0.06;
      var displayVal = (val + jitter).toFixed(val < 10 ? 1 : 0);
      var cls = sub.nominal ? 'nominal' : 'warning';
      html += '<div class="diag-subsystem">' +
        '<div class="sub-status-dot ' + cls + '"></div>' +
        '<div class="sub-info"><div class="sub-name">' + sub.name + '</div>' +
        '<div class="sub-stat">' + sub.stat + '</div></div>' +
        '<div class="sub-value">' + displayVal + '<small style="font-size:8px;opacity:0.5"> ' + sub.unit + '</small></div>' +
      '</div>';
    });
    container.innerHTML = html;
  }

  function addLogEntry(module, msg, level) {
    var now = new Date();
    var time = now.toLocaleTimeString('en-US', { hour12: false });
    logLines.push({ time: time, module: module, msg: msg, level: level || 'info' });
    if (logLines.length > 50) logLines.shift();

    var logEl = document.getElementById('diag-log');
    if (!logEl) return;
    var cls = '';
    if (level === 'warn') cls = ' warn';
    else if (level === 'err') cls = ' err';
    else if (level === 'ok') cls = ' ok';

    var entry = document.createElement('div');
    entry.className = 'diag-log-entry' + cls;
    entry.innerHTML =
      '<span class="log-time">' + time + '</span>' +
      '<span class="log-module">' + module + '</span>' +
      '<span class="log-msg">' + msg + '</span>';
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function startLogSim() {
    var modules = ['CORE', 'THRUST', 'SENSOR', 'COMMS', 'SHIELD', 'LIFE'];
    var messages = [
      'Telemetry nominal', 'Calibration OK', 'Buffer cleared',
      'Heartbeat acknowledged', 'Packet checksum valid',
      'Thermal envelope stable', 'Gyro drift within tolerance',
      'Power bus nominal', 'Encryption handshake complete',
      'Firmware integrity verified', 'Redundant path online',
      'Watchdog timer reset', 'Data link established',
      'Coolant loop nominal', 'Backup capacitor charged',
    ];
    var warns = [
      'Minor voltage fluctuation detected', 'Sensor latency spike 18ms',
      'Packet retransmit requested', 'Thermal margin reduced',
    ];

    addLogEntry('CORE', 'Diagnostic sweep initiated', 'ok');
    addLogEntry('BOOT', 'Boot sequence complete, 6/6 checks passed', 'ok');

    var count = 0;
    logInterval = setInterval(function () {
      if (!active) return;
      renderSubsystems();
      var mod = modules[Math.floor(Math.random() * modules.length)];
      var msg, level = 'info';
      if (Math.random() < 0.08) {
        msg = warns[Math.floor(Math.random() * warns.length)];
        level = 'warn';
      } else {
        msg = messages[Math.floor(Math.random() * messages.length)];
        if (Math.random() < 0.15) level = 'ok';
      }
      addLogEntry(mod, msg, level);
      // Update time
      var timeEl = document.getElementById('diag-time');
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
    }, 2000);
  }

  function stopLogSim() {
    if (logInterval) { clearInterval(logInterval); logInterval = null; }
  }

  function updateUptime() {
    var el = document.getElementById('diag-uptime');
    if (!el || !active) return;
    var secs = Math.floor((Date.now() - (window._bootTime || Date.now())) / 1000);
    if (secs < 0) secs = Math.floor(performance.now() / 1000);
    var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    el.textContent = 'UPTIME: ' +
      String(h).padStart(2, '0') + ':' +
      String(m).padStart(2, '0') + ':' +
      String(s).padStart(2, '0');
    if (active) requestAnimationFrame(function () { updateUptime(); });
  }

  function activate() {
    if (active) return;
    active = true;
    document.body.classList.add('diagnostics-active');
    renderSubsystems();
    startLogSim();
    updateUptime();
    var timeEl = document.getElementById('diag-time');
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('DIAGNOSTICS ACTIVE');
  }

  function deactivate() {
    active = false;
    document.body.classList.remove('diagnostics-active');
    stopLogSim();
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('DIAGNOSTICS CLOSED');
  }

  function toggle() {
    if (active) deactivate(); else activate();
  }

  return {
    init: init,
    toggle: toggle,
    activate: activate,
    deactivate: deactivate,
    isActive: function () { return active; },
  };
})();

window.JARVIS = JARVIS;
