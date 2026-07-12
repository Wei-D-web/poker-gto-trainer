/* ==========================================
   🦾 IRON MAN HELMET — Cinematic Intro + Armor Mode Toggle
   Plays once as boot cinematic, then fully cleans up.
   ARMOR MODE is a separate toggle — no functionality lost.
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.HelmetClose = (function () {
  let sequenceActive = false;
  let armorMode = false;

  function init() {
    injectHelmetHTML();
    addArmorToggleButton();

    // Boot screen has pointer-events:none — intro plays visually without blocking
    var bootScreen = document.getElementById('loading-screen');
    if (bootScreen) {
      var observer = new MutationObserver(function() {
        if (bootScreen.classList.contains('fade-out')) {
          observer.disconnect();
          setTimeout(runHelmetIntro, 300);
        }
      });
      observer.observe(bootScreen, { attributes: true, attributeFilter: ['class'] });
      setTimeout(function() {
        observer.disconnect();
        if (!sequenceActive) runHelmetIntro();
      }, 5000);
    } else {
      setTimeout(runHelmetIntro, 500);
    }
  }

  function injectHelmetHTML() {
    const container = document.createElement('div');
    container.id = 'helmet-elements';
    container.innerHTML = `
      <div id="helmet-close-overlay" class="helmet-close-overlay"></div>

      <div class="helmet-piece top-piece"></div>
      <div class="helmet-piece bottom-piece"></div>
      <div class="helmet-piece left-piece"></div>
      <div class="helmet-piece right-piece"></div>

      <div class="eye-viewport left-eye armor-only"></div>
      <div class="eye-viewport right-eye armor-only"></div>

      <div class="helmet-detail forehead armor-only"></div>
      <div class="helmet-detail cheek-left armor-only"></div>
      <div class="helmet-detail cheek-right armor-only"></div>
      <div class="helmet-detail jaw armor-only"></div>

      <div id="chest-reactor" class="armor-only">
        <div class="reactor-glow"></div>
        <div class="reactor-ring"></div>
        <div class="reactor-ring"></div>
        <div class="reactor-ring"></div>
      </div>

      <div id="retina-scanner">
        <div class="scan-line" style="top:0;"></div>
        <div class="scan-line" style="top:20px;"></div>
      </div>

      <div class="data-cascade left-cascade" id="left-cascade"></div>
      <div class="data-cascade right-cascade" id="right-cascade"></div>
    `;
    document.body.appendChild(container);
  }

  // ── Cinematic Intro Sequence (runs once, fully cleans up) ──
  async function runHelmetIntro() {
    if (sequenceActive) return;
    sequenceActive = true;

    const overlay = document.getElementById('helmet-close-overlay');
    const topP = document.querySelector('.helmet-piece.top-piece');
    const botP = document.querySelector('.helmet-piece.bottom-piece');
    const leftP = document.querySelector('.helmet-piece.left-piece');
    const rightP = document.querySelector('.helmet-piece.right-piece');
    const retina = document.getElementById('retina-scanner');
    const reactor = document.getElementById('chest-reactor');
    const leftCas = document.getElementById('left-cascade');
    const rightCas = document.getElementById('right-cascade');
    const app = document.getElementById('jarvis-app');

    console.log('%c[ARMOR] %cHelmet seal sequence initiated...',
      'color: #FFD700;', 'color: #60A5FA;');

    // Phase 1: Overlay dark + mechanical pieces slide in
    if (overlay) overlay.classList.add('running');
    if (topP) topP.classList.add('closing');
    if (botP) botP.classList.add('closing');
    if (leftP) leftP.classList.add('closing');
    if (rightP) rightP.classList.add('closing');

    // Phase 2: Arc reactor flickers (1.4s)
    await delay(1400);
    if (reactor) reactor.style.opacity = '0.7';
    if (reactor) reactor.style.transition = 'opacity 0.5s ease';

    // Phase 3: Retina scan (2.0s)
    await delay(600);
    if (retina) retina.classList.add('running');

    // Phase 4: Data cascades (2.5s)
    await delay(400);
    if (leftCas) {
      leftCas.textContent = ['JARVIS v2.0','CORE:NOMINAL','ARC:STABLE','THRUST:100%','FLIGHT:RDY','SENSORS:CAL','COMMS:ONLINE'].join('\n');
      leftCas.classList.add('running');
    }
    if (rightCas) {
      rightCas.textContent = ['ALT:0M AGL','HDG:320°','SPD:0 KTS','G:1.00','TEMP:37°C','O2:21%','PRESS:1ATM'].join('\n');
      rightCas.classList.add('running');
    }

    // Phase 5: Overlay fades away (4.0s)
    await delay(1500);
    if (overlay) {
      overlay.style.animation = 'none';
      overlay.style.transition = 'opacity 1.5s ease-out';
      overlay.style.opacity = '0';
      overlay.style.background = 'transparent';
    }

    // Phase 6: Dismiss mechanical pieces (5.0s)
    await delay(1000);
    [topP, botP, leftP, rightP].forEach(p => {
      if (p) { p.classList.add('dismissing'); p.classList.remove('closing'); }
    });
    // Turn off reactor since armor mode is OFF by default
    if (reactor) { reactor.style.opacity = '0'; reactor.style.transition = 'opacity 0.8s ease'; }

    // Phase 7: Full cleanup (6.0s)
    await delay(1000);
    if (overlay) overlay.style.display = 'none';
    if (retina) { retina.classList.remove('running'); retina.style.display = 'none'; }
    if (leftCas) { leftCas.classList.remove('running'); leftCas.style.display = 'none'; }
    if (rightCas) { rightCas.classList.remove('running'); rightCas.style.display = 'none'; }
    [topP, botP, leftP, rightP].forEach(p => { if (p) p.style.display = 'none'; });

    console.log('%c[ARMOR] %cIntro complete. Systems nominal. Armor mode ready.',
      'color: #FFD700;', 'color: #10B981;');
  }

  // ── ARMOR MODE TOGGLE ──
  function addArmorToggleButton() {
    const toggleBar = document.getElementById('view-toggle');
    if (!toggleBar) {
      // Retry — the bar might not be rendered yet
      setTimeout(addArmorToggleButton, 1000);
      return;
    }

    // Don't add twice
    if (document.getElementById('view-armor')) return;

    const btn = document.createElement('button');
    btn.id = 'view-armor';
    btn.className = 'armor-btn';
    btn.textContent = '🦾 ARMOR';
    btn.title = 'Iron Man Armor Mode — Helmet HUD overlay';
    btn.addEventListener('click', toggleArmorMode);
    toggleBar.appendChild(btn);
  }

  function toggleArmorMode() {
    armorMode = !armorMode;
    const btn = document.getElementById('view-armor');

    if (armorMode) {
      document.body.classList.add('armor-mode');
      if (btn) btn.classList.add('active');
      // Show reactor
      const reactor = document.getElementById('chest-reactor');
      if (reactor) reactor.style.opacity = '0.5';

      console.log('%c[ARMOR] %cArmor mode ENGAGED. Helmet HUD active.',
        'color: #FFD700;', 'color: #F97316;');
    } else {
      document.body.classList.remove('armor-mode');
      if (btn) btn.classList.remove('active');
      // Hide reactor
      const reactor = document.getElementById('chest-reactor');
      if (reactor) reactor.style.opacity = '0';

      console.log('%c[ARMOR] %cArmor mode DISENGAGED.',
        'color: #FFD700;', 'color: #94A3B8;');
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return {
    init,
    toggleArmorMode,
    isArmorMode: () => armorMode,
  };
})();

// ── Auto-init (runs immediately — scripts are at end of body) ──
(function _initHelmetClose() {
  if (JARVIS.HelmetClose && JARVIS.HelmetClose.init) {
    JARVIS.HelmetClose.init();
  }
})();