/* ==========================================
   J.A.R.V.I.S. — Holographic Parallax Engine
   Mouse + gyro driven 3D depth layers.
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Parallax = (function () {
  let _active = true;
  let _mouseX = 0.5;
  let _mouseY = 0.5;
  let _targetX = 0.5;
  let _targetY = 0.5;
  let _gyroActive = false;
  let _rafId = null;

  // Layer transform configs
  var layers = [
    { sel: '#three-bg, #fallback-bg', depth: -40, factor: 1.0 },
    { sel: '#holo-scanlines, #vignette', depth: -15, factor: 0.6 },
    { sel: '#jarvis-app', depth: 0, factor: 0.3 },
    { sel: '#css-arc-reactor', depth: 20, factor: 0.8 },
    { sel: '.diag-panel', depth: 30, factor: 1.2 },
    { sel: '.hud-data-label', depth: 25, factor: 0.9 },
    { sel: '#target-reticle', depth: 40, factor: 1.5 },
  ];

  function init() {
    document.body.classList.add('parallax-active');
    _bindEvents();
    _rafId = requestAnimationFrame(_tick);
    console.log('%c[PARALLAX] %cHolographic depth field online.',
      'color: #8b5cf6;', 'color: #10b981;');
  }

  function _bindEvents() {
    document.addEventListener('mousemove', function (e) {
      _targetX = e.clientX / window.innerWidth;
      _targetY = e.clientY / window.innerHeight;
      _gyroActive = false;
    });

    document.addEventListener('mouseleave', function () {
      _targetX = 0.5;
      _targetY = 0.5;
    });

    // Device orientation for tablets/phones
    window.addEventListener('deviceorientation', function (e) {
      if (!e.gamma || !e.beta) return;
      _gyroActive = true;
      document.body.classList.add('parallax-gyro');
      // Map gamma (-90..90) to 0..1, beta (-180..180) to 0..1
      _targetX = (e.gamma / 90) * 0.5 + 0.5;
      _targetY = (e.beta / 180) * 0.5 + 0.5;
      _targetX = Math.max(0, Math.min(1, _targetX));
      _targetY = Math.max(0, Math.min(1, _targetY));
    }, true);

    // Touch support
    document.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) {
        _targetX = e.touches[0].clientX / window.innerWidth;
        _targetY = e.touches[0].clientY / window.innerHeight;
        _gyroActive = false;
      }
    }, { passive: true });
  }

  function _tick() {
    if (!_active) { _rafId = requestAnimationFrame(_tick); return; }

    // Smooth lerp
    var speed = _gyroActive ? 0.05 : 0.08;
    _mouseX += (_targetX - _mouseX) * speed;
    _mouseY += (_targetY - _mouseY) * speed;

    // Map 0-1 → -1..+1
    var ox = (_mouseX - 0.5) * 2;
    var oy = (_mouseY - 0.5) * 2;

    layers.forEach(function (layer) {
      var els = document.querySelectorAll(layer.sel);
      var tx = ox * layer.depth * layer.factor;
      var ty = oy * layer.depth * layer.factor;
      var tz = layer.depth;
      var transform = 'translate3d(' + tx.toFixed(1) + 'px, ' + ty.toFixed(1) + 'px, ' + tz + 'px)';
      els.forEach(function (el) {
        el.style.transform = transform;
      });
    });

    // Rotate jarvis-app slightly for 3D feel
    var app = document.getElementById('jarvis-app');
    if (app) {
      var rx = oy * -1.5;
      var ry = ox * 2;
      app.style.transform = 'rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg)';
    }

    _rafId = requestAnimationFrame(_tick);
  }

  function setActive(on) {
    _active = on;
    if (!on) {
      document.body.classList.remove('parallax-active');
    } else {
      document.body.classList.add('parallax-active');
    }
  }

  function isActive() { return _active; }

  return { init, setActive, isActive };
})();

window.JARVIS = JARVIS;
