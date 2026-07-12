/* ==========================================
   🦾 IRON MAN HELMET POV — First-Person Controller
   Desktop view · Helmet parallax · Targeting · Tapes
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Helmet = (function () {
  // ── State ──
  const state = {
    viewMode: 'reactor', // 'reactor' | 'desktop'
    desktopStream: null,
    desktopVideo: null,
    desktopInterval: null,
    parallaxEnabled: true,
    isTouch: false,
  };

  let els = {};

  let _initialized = false;

  function init() {
    if (_initialized) return;
    _initialized = true;

    state.isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    cacheElements();
    setupViewToggle();
    initHeadingTape();
    initAltitudeTape();
    if (!state.isTouch) setupHelmetParallax();
    setupQuickCapture();

    console.log('%c[Iron Man Helmet] %cPOV systems online.',
      'color: #FFD700; font-weight: bold;', 'color: #94A3B8;');
  }

  function cacheElements() {
    els.desktopBg = document.getElementById('desktop-bg');
    els.desktopImg = document.getElementById('desktop-bg-img');
    els.reactorBtn = document.getElementById('view-reactor');
    els.desktopBtn = document.getElementById('view-desktop');
    els.headingTrack = document.getElementById('heading-track');
    els.altitudeTrack = document.getElementById('altitude-track');
    els.systemAlert = document.getElementById('system-alert');
    els.powerRing = document.getElementById('power-ring');
  }

  // ── View Mode Toggle ──
  // Now handled by onclick="window._jarvisSwitchMode(...)" in index.html
  // No addEventListener needed — onclick is the single source of truth
  function setupViewToggle() {
    // Intentionally empty — onclick handlers in HTML handle this
  }

  async function switchView(mode) {
    if (state.viewMode === mode) {
      // Already in this mode — still provide visual feedback
      if (mode === 'reactor') {
        // Forcefully clean up any lingering modes
        if (JARVIS.Nanoparticles && JARVIS.Nanoparticles.isAssembled()) {
          JARVIS.Nanoparticles.disassemble();
        }
        document.body.classList.remove('armor-mode', 'armor-assembled', 'desktop-view');
        var armorBtn = document.getElementById('armor-main-btn');
        if (armorBtn) armorBtn.classList.remove('active');
        if (els.powerRing) els.powerRing.style.display = 'none';
        if (JARVIS.TargetLock && JARVIS.TargetLock.isScanMode()) {
          JARVIS.TargetLock.deactivate();
        }
        var scanBtn = document.getElementById('armor-scan-btn');
        if (scanBtn) scanBtn.classList.remove('active');
        showAlert('ARC REACTOR MODE', 'All systems nominal — 3D core engaged');
        setTimeout(() => hideAlert(), 2000);
        JARVIS.App.spawnFloatLabel && JARVIS.App.spawnFloatLabel('REACTOR ACTIVE');
      }
      return;
    }

    if (mode === 'desktop') {
      // Exit armor mode first when entering desktop view
      if (JARVIS.Nanoparticles && JARVIS.Nanoparticles.isAssembled()) {
        JARVIS.Nanoparticles.disassemble();
      }
      document.body.classList.remove('armor-mode', 'armor-assembled');
      var armorBtn = document.getElementById('armor-main-btn');
      if (armorBtn) armorBtn.classList.remove('active');
      var powerRing = document.getElementById('power-ring');
      if (powerRing) powerRing.style.display = 'none';

      const ok = await startDesktopView();
      if (!ok) {
        showAlert('CAPTURE DENIED', 'Screen sharing permission required for desktop view');
        return;
      }
      document.body.classList.add('desktop-view');
      els.reactorBtn.classList.remove('active');
      els.desktopBtn.classList.add('active');
      state.viewMode = 'desktop';
      showAlert('DESKTOP VIEW ACTIVE', 'HUD overlaying live screen feed');
      setTimeout(() => hideAlert(), 2000);
    } else {
      stopDesktopView();
      document.body.classList.remove('desktop-view');
      els.desktopBtn.classList.remove('active');
      els.reactorBtn.classList.add('active');
      state.viewMode = 'reactor';

      // Also exit armor mode when returning to reactor
      if (JARVIS.Nanoparticles && JARVIS.Nanoparticles.isAssembled()) {
        JARVIS.Nanoparticles.disassemble();
      }
      document.body.classList.remove('armor-mode', 'armor-assembled');
      var armorBtn = document.getElementById('armor-main-btn');
      if (armorBtn) armorBtn.classList.remove('active');
      // Hide power ring + deactivate scan
      if (els.powerRing) els.powerRing.style.display = 'none';
      if (JARVIS.TargetLock && JARVIS.TargetLock.isScanMode()) {
        JARVIS.TargetLock.deactivate();
      }
      var scanBtn = document.getElementById('armor-scan-btn');
      if (scanBtn) scanBtn.classList.remove('active');

      showAlert('ARC REACTOR MODE', '3D holographic core engaged');
      setTimeout(() => hideAlert(), 2000);
    }
  }

  async function startDesktopView() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' },
        audio: false,
      });

      state.desktopStream = stream;
      state.desktopVideo = document.createElement('video');
      state.desktopVideo.srcObject = stream;
      state.desktopVideo.play();

      if (els.desktopBg) els.desktopBg.classList.add('active');

      // Render frames to the background
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      state.desktopInterval = setInterval(() => {
        if (!state.desktopVideo || state.viewMode !== 'desktop') return;
        canvas.width = state.desktopVideo.videoWidth;
        canvas.height = state.desktopVideo.videoHeight;
        ctx.drawImage(state.desktopVideo, 0, 0);
        if (els.desktopImg) {
          els.desktopImg.src = canvas.toDataURL('image/jpeg', 0.75);
        }
      }, 1000 / 10); // 10 fps — smooth desktop monitoring with low overhead

      // Stop when user cancels screen share
      stream.getVideoTracks()[0].onended = () => {
        switchView('reactor');
      };

      // Notify Vision module
      if (JARVIS.Vision && JARVIS.Vision.setSharedStream) {
        JARVIS.Vision.setSharedStream(stream, state.desktopVideo);
      }

      return true;
    } catch (err) {
      console.error('[Helmet] Desktop view failed:', err);
      return false;
    }
  }

  function stopDesktopView() {
    if (state.desktopInterval) {
      clearInterval(state.desktopInterval);
      state.desktopInterval = null;
    }
    if (state.desktopStream) {
      state.desktopStream.getTracks().forEach(t => t.stop());
      state.desktopStream = null;
    }
    if (state.desktopVideo) {
      state.desktopVideo = null;
    }
    if (els.desktopBg) els.desktopBg.classList.remove('active');
    if (els.desktopImg) els.desktopImg.src = '';
  }

  // ── Quick Screen Capture (hotkey: Ctrl+Shift+S) ──
  function setupQuickCapture() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (document.body.classList.contains('desktop-view')) {
          window._jarvisSwitchMode && window._jarvisSwitchMode('reactor');
        } else {
          window._jarvisSwitchMode && window._jarvisSwitchMode('desktop');
        }
      }
    });
  }

  // ── Heading Tape (left side) ──
  function initHeadingTape() {
    if (!els.headingTrack) return;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    let html = '';
    // Generate 3 cycles for smooth looping
    for (let cycle = 0; cycle < 3; cycle++) {
      for (let i = 0; i < dirs.length; i++) {
        const isCardinal = i % 2 === 0;
        html += '<span class="tape-marker' + (isCardinal ? ' major' : '') + '"></span>';
        html += '<span class="tape-label">' + dirs[i] + '</span>';
        if (!isCardinal) html += '<span class="tape-marker"></span>';
      }
    }
    els.headingTrack.innerHTML = html;
  }

  // ── Altitude Tape (right side) ──
  function initAltitudeTape() {
    if (!els.altitudeTrack) return;
    let html = '';
    for (let cycle = 0; cycle < 3; cycle++) {
      for (let alt = 0; alt <= 100; alt += 10) {
        const isMajor = alt % 30 === 0;
        html += '<span class="tape-marker' + (isMajor ? ' major' : '') + '"></span>';
        html += '<span class="tape-label">' + String(alt).padStart(3, '0') + '</span>';
      }
    }
    els.altitudeTrack.innerHTML = html;
  }

  // ── 3D Helmet Parallax (mouse-driven perspective shift) ──
  function setupHelmetParallax() {
    const app = document.getElementById('jarvis-app');
    if (!app) return;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    document.addEventListener('mousemove', (e) => {
      targetX = ((e.clientX / window.innerWidth) - 0.5) * 3;  // ±1.5deg
      targetY = ((e.clientY / window.innerHeight) - 0.5) * 2; // ±1deg
    }, { passive: true });

    function lerp(a, b, t) { return a + (b - a) * t; }

    function update() {
      currentX = lerp(currentX, targetX, 0.05);
      currentY = lerp(currentY, targetY, 0.05);
      app.style.transform =
        'perspective(1200px) ' +
        'rotateY(' + currentX + 'deg) ' +
        'rotateX(' + (-currentY) + 'deg) ' +
        'translateZ(0)';

      // Also shift the power ring slightly
      if (els.powerRing && state.viewMode === 'desktop') {
        els.powerRing.style.transform =
          'translate(' + (currentX * 3) + 'px, ' + (currentY * 3) + 'px)';
      }

      requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
    document.body.classList.add('parallax-active');
  }

  // ── System Alert Toast ──
  function showAlert(title, detail) {
    if (!els.systemAlert) return;
    const titleEl = els.systemAlert.querySelector('.alert-title');
    const detailEl = els.systemAlert.querySelector('.alert-detail');
    if (titleEl) titleEl.textContent = title;
    if (detailEl) detailEl.textContent = detail;
    els.systemAlert.classList.add('show');
  }

  function hideAlert() {
    if (els.systemAlert) els.systemAlert.classList.remove('show');
  }

  // ── Public API ──
  return {
    init,
    switchView,
    showAlert,
    hideAlert,
    getViewMode: () => state.viewMode,
    getDesktopStream: () => state.desktopStream,
  };
})();

// ── Auto-init (waits for DOM readiness, handles both deferred and end-of-body cases) ──
(function _initHelmet() {
  function doInit() {
    if (JARVIS.Helmet && JARVIS.Helmet.init) {
      JARVIS.Helmet.init();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInit);
  } else {
    doInit();
  }
})();
