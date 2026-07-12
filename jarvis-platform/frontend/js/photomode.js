/* ═══════════════════════════════════════
   J.A.R.V.I.S. — Photo Mode Module
   ═══════════════════════════════════════ */

var JARVIS = window.JARVIS || {};

JARVIS.PhotoMode = (function () {
  var active = false;

  function init() {
    // Create watermark
    var wm = document.createElement('div');
    wm.id = 'photo-watermark';
    wm.textContent = 'J.A.R.V.I.S. HUD • PHOTO MODE';
    document.body.appendChild(wm);

    // Create vignette for photo mode
    var vig = document.createElement('div');
    vig.id = 'photo-vignette';
    document.body.appendChild(vig);

    // Keyboard listener for \ key (handled globally)
    console.log('%c[PhotoMode] %cCapture system ready.',
      'color: #8B5CF6;', 'color: #94A3B8;');
  }

  function toggle() {
    if (active) deactivate(); else activate();
  }

  function activate() {
    active = true;
    document.body.classList.add('photo-mode');
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('PHOTO MODE');
  }

  function deactivate() {
    active = false;
    document.body.classList.remove('photo-mode');
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('HUD RESTORED');
  }

  return {
    init: init, toggle: toggle, activate: activate, deactivate: deactivate,
    isActive: function () { return active; },
  };
})();

window.JARVIS = JARVIS;
