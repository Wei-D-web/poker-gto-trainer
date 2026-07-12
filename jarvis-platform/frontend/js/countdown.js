/* ═══════════════════════════════════════
   J.A.R.V.I.S. — Countdown Sequence Module
   ═══════════════════════════════════════ */

var JARVIS = window.JARVIS || {};

JARVIS.Countdown = (function () {
  var active = false;
  var running = false;
  var seconds = 30;
  var timer;

  function init() {
    injectDOM();
    console.log('%c[Countdown] %cSequence system armed.',
      'color: #EF4444;', 'color: #94A3B8;');
  }

  function injectDOM() {
    var overlay = document.createElement('div');
    overlay.id = 'countdown-overlay';
    overlay.innerHTML =
      '<div style="text-align:center">' +
        '<div id="countdown-digits">30</div>' +
        '<div id="countdown-label">SELF DESTRUCT SEQUENCE</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var flash = document.createElement('div');
    flash.id = 'countdown-flash';
    document.body.appendChild(flash);

    var border = document.createElement('div');
    border.id = 'countdown-border';
    document.body.appendChild(border);

    var hint = document.createElement('div');
    hint.id = 'countdown-hint';
    hint.textContent = '+ / - to adjust time • ENTER to start • ESC to cancel';
    document.body.appendChild(hint);
  }

  function updateDisplay() {
    var el = document.getElementById('countdown-digits');
    if (!el) return;
    el.textContent = seconds;
    el.classList.remove('warning', 'critical');
    if (running && seconds <= 10) el.classList.add('critical');
    else if (running && seconds <= 20) el.classList.add('warning');
  }

  function show() {
    active = true;
    document.body.classList.add('countdown-active');
    updateDisplay();
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('COUNTDOWN ARMED: ' + seconds + 's');
  }

  function hide() {
    active = false;
    running = false;
    if (timer) { clearInterval(timer); timer = null; }
    document.body.classList.remove('countdown-active');
    var flash = document.getElementById('countdown-flash');
    if (flash) { flash.style.display = 'none'; }
  }

  function start() {
    if (running) return;
    running = true;
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('COUNTDOWN STARTED');
    timer = setInterval(function () {
      seconds--;
      updateDisplay();
      if (seconds <= 0) {
        clearInterval(timer);
        timer = null;
        triggerZero();
      }
    }, 1000);
  }

  function triggerZero() {
    // Flash
    var flash = document.getElementById('countdown-flash');
    if (flash) { flash.style.display = 'block'; flash.style.animation = 'none'; flash.offsetHeight; flash.style.animation = 'cdFlash 0.5s ease-out forwards'; }
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('DETONATION');
    // Reset after 1s
    setTimeout(function () {
      running = false;
      seconds = 30;
      updateDisplay();
      hide();
    }, 1000);
  }

  function addTime(delta) {
    if (running) return;
    seconds = Math.max(5, Math.min(120, seconds + delta));
    updateDisplay();
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('TIMER: ' + seconds + 's');
  }

  function toggle() {
    if (active) { hide(); } else { show(); }
  }

  return {
    init: init,
    toggle: toggle,
    show: show,
    hide: hide,
    start: start,
    addTime: addTime,
    isActive: function () { return active; },
    isRunning: function () { return running; },
  };
})();

window.JARVIS = JARVIS;
