/* ==========================================
   J.A.R.V.I.S. — Scan Line Effect
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Scanlines = (function () {
  let canvas, ctx;
  let animationId;

  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'scanlines-canvas';
    canvas.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none; z-index: 5;
      opacity: 0.06;
    `;
    document.body.appendChild(canvas);

    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    animate();
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    const h = canvas.height;
    const w = canvas.width;

    ctx.clearRect(0, 0, w, h);

    // ── Horizontal scan lines ──
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    const lineHeight = 3;
    for (let y = 0; y < h; y += lineHeight) {
      ctx.fillRect(0, y, w, 1);
    }

    // ── Moving scan bar ──
    const scanY = ((Date.now() / 4000) % 1) * h;
    const scanGradient = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
    scanGradient.addColorStop(0, 'transparent');
    scanGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
    scanGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = scanGradient;
    ctx.fillRect(0, scanY - 40, w, 80);

    // ── Random data stream glitches ──
    if (Math.random() < 0.03) {
      const glitchY = Math.random() * h;
      const glitchH = 2 + Math.random() * 6;
      ctx.fillStyle = `rgba(96, 165, 250, ${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(0, glitchY, w, glitchH);
    }
  }

  function destroy() {
    if (animationId) cancelAnimationFrame(animationId);
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  return { init, destroy };
})();

window.JARVIS = JARVIS;
