/* ═══════════════════════════════════════
   J.A.R.V.I.S. — Theme Switcher Module
   ═══════════════════════════════════════ */

var JARVIS = window.JARVIS || {};

JARVIS.Themes = (function () {
  var THEMES = ['default', 'stealth', 'stark', 'cryo'];
  var THEME_LABELS = {
    default: 'CLASSIC BLUE',
    stealth: 'STEALTH BLACK',
    stark: 'STARK RED-GOLD',
    cryo: 'CRYO ICE',
  };
  var currentIdx = 0;

  function init() {
    // Restore saved theme
    var saved = localStorage.getItem('jarvis_theme');
    if (saved && THEMES.indexOf(saved) >= 0) {
      currentIdx = THEMES.indexOf(saved);
      applyTheme(saved);
    }
    console.log('%c[Themes] %cTheme engine ready. Current: ' + THEME_LABELS[THEMES[currentIdx]],
      'color: #8B5CF6;', 'color: #94A3B8;');
  }

  function applyTheme(name) {
    THEMES.forEach(function (t) { document.body.removeAttribute('data-theme-' + t); });
    if (name && name !== 'default') {
      document.body.setAttribute('data-theme', name);
    } else {
      document.body.removeAttribute('data-theme');
    }
    localStorage.setItem('jarvis_theme', name || 'default');
  }

  function cycle() {
    currentIdx = (currentIdx + 1) % THEMES.length;
    var name = THEMES[currentIdx];
    if (name === 'default') name = null;
    applyTheme(name);
    var label = THEME_LABELS[THEMES[currentIdx]];
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('THEME: ' + label);
    // Update button text
    var btn = document.getElementById('theme-cycle-btn');
    if (btn) btn.textContent = '🎨 ' + label.split(' ')[0];
  }

  return {
    init: init,
    cycle: cycle,
    getCurrent: function () { return THEMES[currentIdx]; },
  };
})();

window.JARVIS = JARVIS;
