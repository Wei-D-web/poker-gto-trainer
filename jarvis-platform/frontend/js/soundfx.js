/* ═══════════════════════════════════════
   J.A.R.V.I.S. — Sound FX Module (Web Audio API)
   ═══════════════════════════════════════ */

var JARVIS = window.JARVIS || {};

JARVIS.SoundFX = (function () {
  var audioCtx;
  var enabled = true;
  var initialized = false;

  // Sound profiles
  var SOUNDS = {
    click:   { freq: 660, dur: 0.05, type: 'sine',   vol: 0.08 },
    toggle:  { freq: 440, dur: 0.08, type: 'square', vol: 0.06, sweep: 880 },
    engage:  { freq: 330, dur: 0.12, type: 'sawtooth', vol: 0.07, sweep: 660 },
    disengage:{freq: 500, dur: 0.10, type: 'sawtooth', vol: 0.06, sweep: 250 },
    fire:    { freq: 220, dur: 0.25, type: 'square', vol: 0.10, sweep: 80 },
    alert:   { freq: 880, dur: 0.15, type: 'sine',   vol: 0.09, sweep: 1200 },
    send:    { freq: 550, dur: 0.06, type: 'sine',   vol: 0.07 },
    receive: { freq: 800, dur: 0.06, type: 'sine',   vol: 0.07, sweep: 1100 },
    boot:    { freq: 200, dur: 0.40, type: 'triangle', vol: 0.08, sweep: 1200 },
  };

  function init() {
    // Lazy init on first user interaction
    if (!initialized) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        initialized = true;
        console.log('%c[SoundFX] %cAudio engine online.',
          'color: #10B981;', 'color: #94A3B8;');
      } catch (e) {
        console.warn('[SoundFX] Audio not available:', e.message);
        enabled = false;
      }
    }
  }

  function ensureContext() {
    if (!initialized) init();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function play(name) {
    if (!enabled || !audioCtx) return;
    ensureContext();

    var s = SOUNDS[name] || SOUNDS.click;
    var now = audioCtx.currentTime;

    // Oscillator
    var osc = audioCtx.createOscillator();
    osc.type = s.type || 'sine';
    osc.frequency.setValueAtTime(s.freq, now);
    if (s.sweep) {
      osc.frequency.linearRampToValueAtTime(s.sweep, now + s.dur);
    }

    // Gain envelope
    var gain = audioCtx.createGain();
    gain.gain.setValueAtTime(s.vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + s.dur + 0.01);
  }

  function toggle() {
    enabled = !enabled;
    if (enabled) {
      ensureContext();
      if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('SOUND FX: ON');
      play('engage');
    } else {
      if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('SOUND FX: OFF');
    }
    // Update button
    var btn = document.getElementById('soundfx-toggle-btn');
    if (btn) btn.classList.toggle('active', enabled);
    localStorage.setItem('jarvis_soundfx', enabled ? '1' : '0');
  }

  // Wire to global clicks
  function wireGlobalClicks() {
    document.addEventListener('click', function (e) {
      if (!enabled) return;
      var el = e.target;
      if (el.closest('.ctrl-btn') || el.closest('button') || el.closest('.skin-dot') || el.closest('.panel-tab')) {
        play('click');
      }
    }, true);
  }

  return {
    init: function () {
      init();
      wireGlobalClicks();
      // Restore preference
      var saved = localStorage.getItem('jarvis_soundfx');
      if (saved === '0') enabled = false;
    },
    play: play,
    toggle: toggle,
    isEnabled: function () { return enabled; },
  };
})();

window.JARVIS = JARVIS;
