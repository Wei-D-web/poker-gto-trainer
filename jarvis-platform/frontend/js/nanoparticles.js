/* ==========================================
   J.A.R.V.I.S. — Nanoparticle Assembly
   Iron Man Mark 50-style nanotech swarm animation
   Canvas 2D particle system — 3000 particles
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Nanoparticles = (function () {
  // ── Configuration ──
  const PARTICLE_COUNT = 3000;
  const ASSEMBLY_DURATION = 2000; // ms
  const DISASSEMBLY_DURATION = 1200; // ms

  // ── State ──
  let canvas, ctx;
  let particles = [];
  let animId = null;
  let assembled = false;
  let animating = false;
  let animStartTime = 0;
  let animDirection = 1; // 1 = assemble, -1 = disassemble
  let animDuration = ASSEMBLY_DURATION;
  let width = 0, height = 0;

  // ── Particle ──
  function createParticle() {
    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    switch (edge) {
      case 0: x = Math.random() * width; y = -20 - Math.random() * 60; break;           // top
      case 1: x = width + 20 + Math.random() * 60; y = Math.random() * height; break;    // right
      case 2: x = Math.random() * width; y = height + 20 + Math.random() * 60; break;    // bottom
      case 3: x = -20 - Math.random() * 60; y = Math.random() * height; break;           // left
    }

    // Target: helmet frame position
    const tx = getHelmetTargetX();
    const ty = getHelmetTargetY();

    return {
      x, y, tx, ty,
      ox: x, oy: y, // origin
      size: 1.2 + Math.random() * 2.8,
      hue: Math.random() < 0.7 ? 'blue' : 'gold', // 70% blue, 30% gold
      alpha: 0.6 + Math.random() * 0.4,
      delay: Math.random() * 0.3, // 0-30% of animation duration stagger
      trail: [],
      maxTrail: 4 + Math.floor(Math.random() * 4),
    };
  }

  // ── Helmet Frame Target Distribution ──
  function getHelmetTargetX() {
    const r = Math.random();
    const margin = width * 0.04;
    if (r < 0.15) return margin + Math.random() * (width - margin * 2); // top/bottom bar — full width
    if (r < 0.22) return margin + Math.random() * 60;                   // left cheek
    if (r < 0.29) return width - margin - Math.random() * 60;           // right cheek
    if (r < 0.50) return Math.random() * width;                         // distributed across top arc
    if (r < 0.65) return margin + Math.random() * 60;                   // bottom-left
    if (r < 0.80) return width - margin - Math.random() * 60;           // bottom-right
    return margin + Math.random() * (width - margin * 2);               // scattered
  }

  function getHelmetTargetY() {
    const r = Math.random();
    const topBand = 80;
    const bottomBand = height - 70;
    if (r < 0.20) return Math.random() * topBand;                       // top mech area
    if (r < 0.35) return bottomBand + Math.random() * (height - bottomBand); // bottom mech
    if (r < 0.45) return Math.random() * height;                        // left/right cheek
    if (r < 0.60) return Math.random() * topBand;                       // top arc
    if (r < 0.75) return Math.random() * (height - 80) + 60;            // mid area
    if (r < 0.88) return bottomBand + Math.random() * 60;               // jaw
    return Math.random() * height;                                      // scattered
  }

  // ── Easing ──
  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ── Get armor theme colors ──
  function getArmorColors() {
    var armor = document.body.dataset.armor || 'mk50';
    switch (armor) {
      case 'mk3': return { blue: '#F87171', gold: '#FFD700', blueGlow: 'rgba(248,113,113,0.6)', goldGlow: 'rgba(255,215,0,0.5)' };
      case 'war-machine': return { blue: '#9CA3AF', gold: '#EF4444', blueGlow: 'rgba(156,163,175,0.5)', goldGlow: 'rgba(239,68,68,0.5)' };
      case 'hulkbuster': return { blue: '#DC2626', gold: '#FFD700', blueGlow: 'rgba(220,38,38,0.6)', goldGlow: 'rgba(255,215,0,0.6)' };
      default: return { blue: '#60A5FA', gold: '#FFD700', blueGlow: 'rgba(96,165,250,0.6)', goldGlow: 'rgba(255,215,0,0.5)' };
    }
  }

  // ── Init ──
  function init() {
    // Create canvas overlay
    canvas = document.createElement('canvas');
    canvas.id = 'nanoparticle-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:18;pointer-events:none;opacity:0;transition:opacity 0.5s ease;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    return true;
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  // ── Assemble ──
  function assemble() {
    if (assembled || animating) return;
    animDirection = 1;
    animDuration = ASSEMBLY_DURATION;
    startAnimation();
  }

  // ── Disassemble ──
  function disassemble() {
    if (!assembled || animating) return;
    animDirection = -1;
    animDuration = DISASSEMBLY_DURATION;
    startAnimation();
  }

  function startAnimation() {
    if (!canvas) init();
    animating = true;
    animStartTime = performance.now();

    // Regenerate particles fresh each time
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }

    canvas.style.opacity = '1';
    if (!animId) {
      animId = requestAnimationFrame(tick);
    }
  }

  // ── Animation Tick ──
  function tick(now) {
    if (!animating) {
      animId = null;
      return;
    }

    const elapsed = now - animStartTime;
    const rawProgress = Math.min(elapsed / animDuration, 1.0);

    ctx.clearRect(0, 0, width, height);
    const colors = getArmorColors();

    let allDone = true;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Staggered progress
      const localRaw = Math.max(0, Math.min(1, (rawProgress - p.delay) / (1 - p.delay)));
      const progress = easeOutExpo(localRaw);

      if (animDirection === 1) {
        // Assemble: from edge origin → helmet target
        p.x = p.ox + (p.tx - p.ox) * progress;
        p.y = p.oy + (p.ty - p.oy) * progress;
      } else {
        // Disassemble: from helmet target → random scatter off screen
        const scatterX = p.tx + (Math.random() - 0.5) * width * 2;
        const scatterY = p.ty + (Math.random() - 0.5) * height * 2;
        p.x = p.tx + (scatterX - p.tx) * progress;
        p.y = p.ty + (scatterY - p.ty) * progress;
      }

      if (localRaw < 1) allDone = false;

      // Trail effect
      p.trail.push({ x: p.x, y: p.y, alpha: p.alpha * 0.5 });
      if (p.trail.length > p.maxTrail) p.trail.shift();

      // Draw trail
      for (let t = 0; t < p.trail.length; t++) {
        const tr = p.trail[t];
        const ta = tr.alpha * (t / p.trail.length) * 0.4;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = p.hue === 'blue'
          ? colors.blueGlow.replace('0.6', String(ta))
          : colors.goldGlow.replace('0.5', String(ta));
        ctx.fill();
      }

      // Draw particle
      const glowSize = p.size * (1 + progress * 1.5);
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
      const color = p.hue === 'blue' ? colors.blue : colors.gold;
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, p.hue === 'blue' ? colors.blueGlow : colors.goldGlow);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = p.alpha * (0.6 + progress * 0.4);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Bright core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + progress * 0.5) + ')';
      ctx.fill();
    }

    // Helmet frame glow effect as assembly progresses
    if (rawProgress > 0.5 && animDirection === 1) {
      const glowAlpha = (rawProgress - 0.5) * 2 * 0.3;
      drawHelmetGlow(colors, glowAlpha);
    }

    // Disassembly fade-out
    if (animDirection === -1 && rawProgress > 0.7) {
      canvas.style.opacity = String(1 - (rawProgress - 0.7) / 0.3);
    }

    if (allDone && rawProgress >= 1) {
      finishAnimation();
      return;
    }

    animId = requestAnimationFrame(tick);
  }

  function drawHelmetGlow(colors, alpha) {
    // Top arc glow
    ctx.save();
    ctx.globalAlpha = alpha;
    const topGrad = ctx.createLinearGradient(0, 0, 0, 80);
    topGrad.addColorStop(0, colors.blueGlow);
    topGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, 80);

    // Bottom jaw glow
    const botGrad = ctx.createLinearGradient(0, height - 70, 0, height);
    botGrad.addColorStop(0, 'transparent');
    botGrad.addColorStop(1, colors.goldGlow);
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, height - 70, width, 70);
    ctx.restore();
  }

  function finishAnimation() {
    animating = false;
    animId = null;

    if (animDirection === 1) {
      assembled = true;
      canvas.style.opacity = '0.15'; // subtle persistent glow
      document.body.classList.add('armor-assembled');
    } else {
      assembled = false;
      canvas.style.opacity = '0';
      document.body.classList.remove('armor-assembled');
      ctx.clearRect(0, 0, width, height);
    }
  }

  // ── Public API ──
  function isAssembled() { return assembled; }
  function isAnimating() { return animating; }

  // Auto-init canvas
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init, assemble, disassemble, isAssembled, isAnimating };
})();

window.JARVIS = JARVIS;
