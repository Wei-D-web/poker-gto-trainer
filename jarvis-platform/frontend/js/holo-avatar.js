/* ==========================================
   🧠 J.A.R.V.I.S. — 3D Holographic Avatar
   Particle sphere that pulses with voice audio.
   Appears center-screen when JARVIS speaks.
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.HoloAvatar = (function () {
  let canvas, ctx;
  let particles = [];
  let animId = null;
  let visible = false;
  let targetOpacity = 0;
  let currentOpacity = 0;
  let audioLevel = 0;
  let smoothAudio = 0;
  let time = 0;
  let width = 0, height = 0;
  let cx = 0, cy = 0;

  const PARTICLE_COUNT = 400;
  const CORE_RADIUS = 60;
  const OUTER_RADIUS = 120;

  // Color scheme — changes with armor skin
  let colors = { primary: '#60A5FA', secondary: '#06B6D4', accent: '#FFD700', glow: 'rgba(96,165,250,0.4)' };

  // ── Particle ──
  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      // Spherical coordinates
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = CORE_RADIUS + Math.random() * (OUTER_RADIUS - CORE_RADIUS);

      this.baseRadius = radius;
      this.theta = theta;
      this.phi = phi;
      this.baseTheta = theta;
      this.basePhi = phi;

      this.size = 0.8 + Math.random() * 2.5;
      this.alpha = 0.3 + Math.random() * 0.7;
      this.speed = 0.3 + Math.random() * 1.2;
      this.pulseAmp = 0.02 + Math.random() * 0.08;

      // Orbit properties
      this.orbitSpeed = (Math.random() - 0.5) * 0.3;
      this.orbitTilt = (Math.random() - 0.5) * 0.5;

      // Color
      const r = Math.random();
      if (r < 0.6) this.color = colors.primary;
      else if (r < 0.85) this.color = colors.secondary;
      else this.color = colors.accent;
    }
    update(dt, audioInfluence) {
      // Rotate slowly
      this.baseTheta += this.orbitSpeed * dt;
      this.basePhi += this.orbitTilt * dt;

      // Audio-reactive pulsing
      const pulse = 1 + audioInfluence * this.pulseAmp * 40;
      const radius = this.baseRadius * pulse;

      this.theta = this.baseTheta;
      this.phi = this.basePhi;

      // Convert to cartesian for rendering
      this.x = cx + radius * Math.sin(this.phi) * Math.cos(this.theta);
      this.y = cy + radius * Math.sin(this.phi) * Math.sin(this.theta);
      this.z = radius * Math.cos(this.phi);

      // Size also pulses
      this.renderSize = this.size * (1 + audioInfluence * 0.5);
      this.renderAlpha = this.alpha * (0.5 + audioInfluence * 0.5);
    }
  }

  // ── Initialize ──
  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'holo-avatar-canvas';
    canvas.style.cssText =
      'position:fixed;inset:0;z-index:14;pointer-events:none;opacity:0;transition:opacity 0.6s ease;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    // Start render loop
    requestAnimationFrame(render);

    // Listen for speech events
    window.addEventListener('jarvis-speech-start', () => show());
    window.addEventListener('jarvis-speech-stop', () => hide());
    window.addEventListener('jarvis-speech-level', (e) => {
      audioLevel = e.detail?.level || 0;
    });

    // Also listen for mode changes from app.js
    const observer = new MutationObserver(() => {
      const mode = document.body.dataset.mode;
      if (mode === 'speaking' || mode === 'thinking') show();
      else if (mode === 'idle') hide();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-mode'] });

    // Sync colors with armor skin
    window.addEventListener('jarvis-armor-change', (e) => {
      updateColors(e.detail?.skin || 'mk50');
    });

    console.log('%c[HoloAvatar] %c3D holographic core online.',
      'color: #60A5FA;', 'color: #94A3B8;');
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cx = width / 2;
    cy = height * 0.45; // Slightly above center
  }

  // ── Color Update ──
  function updateColors(skin) {
    switch (skin) {
      case 'mk3':
        colors = { primary: '#F87171', secondary: '#EF4444', accent: '#FFD700', glow: 'rgba(248,113,113,0.4)' };
        break;
      case 'war-machine':
        colors = { primary: '#9CA3AF', secondary: '#6B7280', accent: '#EF4444', glow: 'rgba(156,163,175,0.4)' };
        break;
      case 'hulkbuster':
        colors = { primary: '#DC2626', secondary: '#991B1B', accent: '#FFD700', glow: 'rgba(220,38,38,0.4)' };
        break;
      default: // mk50
        colors = { primary: '#60A5FA', secondary: '#06B6D4', accent: '#FFD700', glow: 'rgba(96,165,250,0.4)' };
    }
    // Update existing particles
    particles.forEach(p => p.reset());
  }

  // ── Show/Hide ──
  function show() {
    targetOpacity = 0.85;
  }
  function hide() {
    targetOpacity = 0;
  }
  function setAudioLevel(level) {
    audioLevel = Math.min(1, Math.max(0, level));
  }

  // ── Render Loop ──
  function render(timestamp) {
    const dt = Math.min(0.05, (timestamp - (render._lastTime || timestamp)) / 1000);
    render._lastTime = timestamp;

    // Smooth audio
    smoothAudio += (audioLevel - smoothAudio) * 0.15;
    // Smooth opacity
    currentOpacity += (targetOpacity - currentOpacity) * 0.08;
    time += dt;

    canvas.style.opacity = currentOpacity;
    if (currentOpacity < 0.01) {
      animId = requestAnimationFrame(render);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // ── Core glow ──
    const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, CORE_RADIUS * (1 + smoothAudio * 0.6));
    coreGradient.addColorStop(0, `rgba(255,255,255,${0.3 + smoothAudio * 0.3})`);
    coreGradient.addColorStop(0.3, colors.glow);
    coreGradient.addColorStop(0.7, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, CORE_RADIUS * (1 + smoothAudio * 0.6), 0, Math.PI * 2);
    ctx.fill();

    // ── Orbital rings ──
    for (let r = 0; r < 3; r++) {
      const ringRadius = CORE_RADIUS + r * 20 + smoothAudio * 8;
      const alpha = 0.08 + r * 0.03 + smoothAudio * 0.05;
      const rotY = time * (0.3 + r * 0.15);
      const rotX = time * (0.2 + r * 0.1);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotY);
      ctx.scale(1, 0.3 + smoothAudio * 0.1);
      ctx.strokeStyle = `rgba(96,165,250,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Second ring at different tilt
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotX + Math.PI / 3);
      ctx.scale(0.3 + smoothAudio * 0.1, 1);
      ctx.strokeStyle = `rgba(6,182,212,${alpha * 0.7})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ── Render particles sorted by z-depth ──
    particles.forEach(p => p.update(dt, smoothAudio));
    // Sort for depth effect (back to front)
    const sorted = [...particles].sort((a, b) => a.z - b.z);

    for (const p of sorted) {
      // Don't render particles behind the sphere
      if (p.z < 0 && Math.random() > 0.3) continue;

      const distFromCenter = Math.hypot(p.x - cx, p.y - cy);
      const edgeFade = 1 - Math.min(1, distFromCenter / (OUTER_RADIUS * 0.9));

      const alpha = p.renderAlpha * edgeFade * currentOpacity;
      if (alpha < 0.02) continue;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.renderSize, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
      if (p.color.startsWith('#')) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
      }
      ctx.fill();

      // Glow for bright particles
      if (p.renderAlpha > 0.5 && distFromCenter < CORE_RADIUS * 1.2) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.renderSize * 2.5, 0, Math.PI * 2);
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.renderSize * 2.5);
        glowGrad.addColorStop(0, colors.glow);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Surface wireframe arcs ──
    ctx.strokeStyle = `rgba(96,165,250,${0.06 + smoothAudio * 0.04})`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const lat = (-0.8 + i * 0.4) * Math.PI;
      const r = OUTER_RADIUS * Math.cos(lat);
      const zOffset = OUTER_RADIUS * Math.sin(lat);
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.1) {
        const px = cx + r * Math.cos(a + time * 0.2);
        const py = cy + zOffset * (0.5 + 0.5 * Math.sin(a));
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    animId = requestAnimationFrame(render);
  }

  // ── Public API ──
  return {
    init,
    show,
    hide,
    setAudioLevel,
    updateColors,
    get visible() { return currentOpacity > 0.05; },
  };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (JARVIS.HoloAvatar && JARVIS.HoloAvatar.init) {
      JARVIS.HoloAvatar.init();
    }
  }, 1500);
});

window.JARVIS = JARVIS;
