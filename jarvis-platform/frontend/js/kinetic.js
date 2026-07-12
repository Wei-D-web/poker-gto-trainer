/* ==========================================
   J.A.R.V.I.S. — Kinetic Typography Engine
   Iron Man movie text assembly & effects.
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Kinetic = (function () {
  let _active = true;

  function init() {
    console.log('%c[KINETIC] %cTypography engine online.',
      'color: #a855f7;', 'color: #10b981;');
  }

  /** Apply kinetic entry effect to a freshly rendered message bubble */
  function animateEntry(bubbleEl) {
    if (!_active || !bubbleEl) return;
    bubbleEl.classList.add('kinetic-enter');
    bubbleEl.addEventListener('animationend', function () {
      bubbleEl.classList.remove('kinetic-enter');
    }, { once: true });
  }

  /** Glitch effect — brief data corruption flicker */
  function glitch(el) {
    if (!_active || !el) return;
    el.classList.add('kinetic-glitch');
    el.addEventListener('animationend', function () {
      el.classList.remove('kinetic-glitch');
    }, { once: true });
  }

  /** Apply scan-line reveal to a block of text */
  function scanReveal(el) {
    if (!_active || !el) return;
    el.classList.add('kinetic-line');
    el.addEventListener('animationend', function () {
      el.classList.remove('kinetic-line');
    }, { once: true });
  }

  /** Shimmer token for streaming text */
  function shimmerToken(textNode) {
    if (!_active || !textNode) return;
    // Wrap last word in a shimmer span
    var html = textNode.innerHTML;
    // Simple: add shimmer class to the entire bubble during stream
  }

  function setActive(on) {
    _active = on;
  }

  return { init, animateEntry, glitch, scanReveal, shimmerToken, setActive };
})();

window.JARVIS = JARVIS;
