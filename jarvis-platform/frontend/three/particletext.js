/* ==========================================
   J.A.R.V.I.S. — 3D Particle Text
   Renders text strings as floating particle clouds
   via Canvas → pixel sampling → Three.js Points
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.ParticleText = (function () {
  let group;
  let textParticles = null;

  function init(scene) {
    group = new THREE.Group();
    group.position.set(0, 1.5, 0);
    scene.add(group);
    return group;
  }

  /**
   * Render text as 3D particle cloud.
   * @param {string} text — the string to render
   * @param {object} opts — { color, fontSize, particleSize, spacing }
   */
  function showText(text, opts = {}) {
    clear();

    const fontSize = opts.fontSize || 80;
    const particleSize = opts.particleSize || 0.04;
    const color = new THREE.Color(opts.color || '#60A5FA');
    const glowColor = new THREE.Color(opts.glowColor || '#3B82F6');

    // Render text to offscreen canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold ' + fontSize + 'px "JetBrains Mono", "SF Mono", monospace';
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2;

    canvas.width = Math.ceil(textWidth) + 40;
    canvas.height = Math.ceil(textHeight) + 20;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + fontSize + 'px "JetBrains Mono", "SF Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Sample pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const positions = [];
    const colors = [];
    const step = Math.max(1, Math.floor(fontSize / 24)); // sampling density

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const idx = (y * canvas.width + x) * 4;
        const alpha = pixels[idx + 3];
        if (alpha > 80) { // only sample non-transparent pixels
          // Map canvas coords to 3D space
          const px = (x - canvas.width / 2) * 0.02;
          const py = -(y - canvas.height / 2) * 0.02;
          const pz = (Math.random() - 0.5) * 0.3; // slight depth

          positions.push(px, py, pz);

          // Color: white core, accent edge
          const edgeDist = alpha < 200;
          const c = edgeDist ? glowColor : color;
          colors.push(c.r, c.g, c.b);
        }
      }
    }

    if (positions.length === 0) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Soft particle texture
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 16;
    texCanvas.height = 16;
    const tctx = texCanvas.getContext('2d');
    const gradient = tctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(150,200,255,0.6)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    tctx.fillStyle = gradient;
    tctx.fillRect(0, 0, 16, 16);

    const mat = new THREE.PointsMaterial({
      size: particleSize,
      map: new THREE.CanvasTexture(texCanvas),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    textParticles = new THREE.Points(geo, mat);
    group.add(textParticles);

    // Explosion animation: particles start scattered, then converge
    const startTime = performance.now();
    const startPositions = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      startPositions[i] = positions[i] + (Math.random() - 0.5) * 8;
      startPositions[i + 1] = positions[i + 1] + (Math.random() - 0.5) * 6;
      startPositions[i + 2] = positions[i + 2] + (Math.random() - 0.5) * 4;
    }
    const targetPositions = new Float32Array(positions);

    function converge() {
      const t = Math.min(1, (performance.now() - startTime) / 1500);
      const ease = 1 - Math.pow(1 - t, 4);
      const pos = geo.attributes.position.array;
      for (let i = 0; i < pos.length; i++) {
        pos[i] = startPositions[i] + (targetPositions[i] - startPositions[i]) * ease;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = ease;
      if (t < 1) requestAnimationFrame(converge);
    }
    requestAnimationFrame(converge);
  }

  function update(delta, elapsed) {
    if (!textParticles || !group) return;
    // Gentle float
    group.rotation.y += delta * 0.06;
    group.position.y = 1.5 + Math.sin(elapsed * 0.4) * 0.15;
  }

  function clear() {
    if (textParticles) {
      group.remove(textParticles);
      if (textParticles.geometry) textParticles.geometry.dispose();
      if (textParticles.material) textParticles.material.dispose();
      textParticles = null;
    }
  }

  function remove(scene) {
    clear();
    scene.remove(group);
    group = null;
  }

  return { init, showText, update, clear, remove };
})();

window.JARVIS = JARVIS;
