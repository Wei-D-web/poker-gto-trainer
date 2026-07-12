/* ==========================================
   J.A.R.V.I.S. — Arc Reactor Heartbeat System
   Drives the living pulse of the HUD.
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Heartbeat = (function () {
  let _active = true;
  let _intensity = 0.3;    // 0–1
  let _bpm = 30;            // half-beats per minute (each = one pulse)
  let _mode = 'idle';       // idle | thinking | alert | burst
  let _burstTimer = null;
  let _alertTimer = null;

  function init() {
    document.body.classList.add('heartbeat-active', 'heartbeat-idle');
    console.log('%c[HEARTBEAT] %cArc reactor pulse online.',
      'color: #06b6d4;', 'color: #10b981;');
  }

  /** Set pulse intensity: 0 = still, 1 = full glow */
  function setIntensity(val) {
    _intensity = Math.max(0, Math.min(1, val));
    document.body.style.setProperty('--heartbeat-intensity', _intensity);
  }

  /** Change BPM (visual pulse rate) */
  function setBPM(bpm) {
    _bpm = bpm;
    document.body.style.setProperty('--pulse-timing', (60 / bpm) + 's');
  }

  /** Pulse once — triggered on incoming message/event */
  function pulse(strength) {
    if (!_active) return;
    strength = strength || 0.6;
    document.body.classList.add('heartbeat-pulse');
    clearTimeout(_burstTimer);
    _burstTimer = setTimeout(function () {
      document.body.classList.remove('heartbeat-pulse');
    }, 200);

    // Increase 3D core intensity briefly
    if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
      JARVIS.Scene.setCoreIntensity(strength);
      setTimeout(function () {
        JARVIS.Scene.setCoreIntensity(_intensity);
      }, 300);
    }
  }

  /** Burst — big energy surge (response received, swarm complete) */
  function burst() {
    if (!_active) return;
    document.body.classList.add('heartbeat-burst');
    clearTimeout(_burstTimer);
    _burstTimer = setTimeout(function () {
      document.body.classList.remove('heartbeat-burst');
    }, 1500);

    if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
      JARVIS.Scene.setCoreIntensity(1.2);
      setTimeout(function () { JARVIS.Scene.setCoreIntensity(_intensity); }, 600);
    }
  }

  /** Alert mode — red pulse for errors/warnings */
  function alert(on) {
    if (on) {
      document.body.classList.add('heartbeat-alert');
      setBPM(80);
    } else {
      document.body.classList.remove('heartbeat-alert');
      setBPM(30);
    }
    clearTimeout(_alertTimer);
    if (on) {
      _alertTimer = setTimeout(function () { alert(false); }, 5000);
    }
  }

  /** Set operating mode — affects pulse rhythm */
  function setMode(mode) {
    _mode = mode;
    document.body.classList.remove('heartbeat-idle', 'heartbeat-busy', 'heartbeat-max', 'heartbeat-thinking');

    switch (mode) {
      case 'idle':
        document.body.classList.add('heartbeat-idle');
        setBPM(30);
        break;
      case 'thinking':
        document.body.classList.add('heartbeat-thinking');
        setBPM(90);
        break;
      case 'listening':
        setBPM(60);
        break;
      case 'busy':
        document.body.classList.add('heartbeat-busy');
        setBPM(120);
        break;
      case 'max':
        document.body.classList.add('heartbeat-max');
        setBPM(180);
        break;
    }
  }

  /** Cycle through BPM (demo mode) */
  function cycle() {
    var modes = ['idle', 'thinking', 'busy', 'max'];
    var idx = modes.indexOf(_mode);
    var next = modes[(idx + 1) % modes.length];
    setMode(next);
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) {
      JARVIS.App.spawnFloatLabel('HEARTBEAT: ' + next.toUpperCase());
    }
  }

  function isActive() { return _active; }

  return {
    init, setIntensity, setBPM, pulse, burst,
    alert, setMode, cycle, isActive,
  };
})();

window.JARVIS = JARVIS;
