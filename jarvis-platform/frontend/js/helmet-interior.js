/* ==========================================
   J.A.R.V.I.S. — Helmet Interior Controller
   Manages the Iron Man first-person visor HUD.
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.HelmetInterior = (function () {
  let _active = false;
  let _o2Interval = null;
  let _o2Level = 98;
  let _altitude = 3200;
  let _speed = 0;
  let _power = 97;

  function init() {
    _buildDOM();
    console.log('%c[HELMET] %cInterior visor system ready.',
      'color: #f59e0b;', 'color: #10b981;');
  }

  function _buildDOM() {
    // Already exists? skip
    if (document.getElementById('helmet-interior')) return;

    var container = document.createElement('div');
    container.id = 'helmet-interior';
    container.innerHTML =
      // Visor frame
      '<div class="helmet-visor top"></div>' +
      '<div class="helmet-visor bottom"></div>' +
      '<div class="helmet-pillar left"></div>' +
      '<div class="helmet-pillar right"></div>' +

      // HUD rings
      '<div class="helmet-hud-ring r1"></div>' +
      '<div class="helmet-hud-ring r2"></div>' +

      // Targeting bracket
      '<div class="helmet-bracket" style="top:40%;left:35%;"></div>' +
      '<div class="helmet-bracket" style="top:30%;right:30%;"></div>' +

      // Corner crosshairs
      '<div class="helmet-cross tl"></div>' +
      '<div class="helmet-cross tr"></div>' +
      '<div class="helmet-cross bl"></div>' +
      '<div class="helmet-cross br"></div>' +

      // Scan line
      '<div class="helmet-scan"></div>' +

      // Horizon
      '<div class="helmet-horizon" id="helmet-horizon"></div>' +

      // Readouts
      '<div class="helmet-readout o2">' +
        '<span class="readout-label">O₂ LEVEL</span>' +
        '<span class="readout-value" id="helmet-o2">98%</span>' +
      '</div>' +
      '<div class="helmet-readout alt">' +
        '<span class="readout-label">ALTITUDE</span>' +
        '<span class="readout-value" id="helmet-alt">3,200m</span>' +
      '</div>' +
      '<div class="helmet-readout spd">' +
        '<span class="readout-label">AIRSPEED</span>' +
        '<span class="readout-value" id="helmet-spd">0 km/h</span>' +
      '</div>' +
      '<div class="helmet-readout pwr">' +
        '<span class="readout-label">REACTOR PWR</span>' +
        '<span class="readout-value" id="helmet-pwr">97%</span>' +
      '</div>' +

      // Faceplate status
      '<div class="helmet-faceplate-status" id="helmet-faceplate">FACE PLATE · SEALED · PRESSURIZED</div>';

    document.body.appendChild(container);

    // Simulate live data
    _startSimulation();
  }

  function _startSimulation() {
    _o2Interval = setInterval(function () {
      if (!_active) return;

      // O2 drifts slightly
      _o2Level += (Math.random() - 0.5) * 0.3;
      _o2Level = Math.max(90, Math.min(99, _o2Level));
      var o2El = document.getElementById('helmet-o2');
      if (o2El) {
        o2El.textContent = _o2Level.toFixed(0) + '%';
        o2El.className = 'readout-value' + (_o2Level < 93 ? ' warn' : '');
      }

      // Altitude fluctuates
      _altitude += (Math.random() - 0.5) * 50;
      _altitude = Math.max(500, _altitude);
      var altEl = document.getElementById('helmet-alt');
      if (altEl) altEl.textContent = _altitude.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'm';

      // Speed
      var speedEl = document.getElementById('helmet-spd');
      if (speedEl) speedEl.textContent = _speed.toFixed(0) + ' km/h';

      // Power
      _power += (Math.random() - 0.5) * 0.1;
      _power = Math.max(85, Math.min(99, _power));
      var pwrEl = document.getElementById('helmet-pwr');
      if (pwrEl) pwrEl.textContent = _power.toFixed(0) + '%';
    }, 2000);
  }

  function activate() {
    _active = true;
    var el = document.getElementById('helmet-interior');
    if (el) el.style.opacity = '1';

    // Randomize initial speed
    _speed = Math.random() * 300 + 100;

    if (JARVIS.App && JARVIS.App.spawnFloatLabel) {
      JARVIS.App.spawnFloatLabel('HELMET HUD ONLINE');
    }
  }

  function deactivate() {
    _active = false;
    var el = document.getElementById('helmet-interior');
    if (el) el.style.opacity = '0';
  }

  function setSpeed(kmh) {
    _speed = kmh;
  }

  function setAltitude(m) {
    _altitude = m;
  }

  /** Sync horizon to head movement */
  function updateHorizon(tiltDegrees) {
    var horizon = document.getElementById('helmet-horizon');
    if (horizon) {
      horizon.style.transform = 'rotate(' + tiltDegrees + 'deg)';
    }
  }

  function isActive() { return _active; }

  return {
    init, activate, deactivate,
    setSpeed, setAltitude, updateHorizon,
    isActive,
  };
})();

window.JARVIS = JARVIS;
