/* ==========================================
   J.A.R.V.I.S. — 3D Holographic Avatar
   Audio-reactive particle orb forming a
   stylized JARVIS head/waveform
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Avatar = (function () {
  // ── Configuration ──
  const PARTICLE_COUNT = 1800;
  const ORB_RADIUS = 2.2;
  const INNER_RING_COUNT = 4;
  const RING_PARTICLE_COUNT = 120;

  // ── State ──
  let group, orbPoints, orbGeo, orbMat;
  let rings = [];
  let coreGlow;
  let active = false;
  let targetActive = false;
  let currentScale = 0.01;
  let positions;

  function init(scene) {
    group = new THREE.Group();
    group.visible = true;
    group.scale.set(0.01, 0.01, 0.01);

    // ── Core glow sphere ──
    const coreGeo = new THREE.SphereGeometry(0.18, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: '#60A5FA',
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    coreGlow = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreGlow);

    // ── Main particle orb ──
    orbGeo = new THREE.BufferGeometry();
    positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    // Initialize particles on sphere surface with organic variation
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Fibonacci sphere distribution for even coverage
      const phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const r = ORB_RADIUS * (0.85 + Math.random() * 0.3);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.7; // flatten vertically
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Blue-cyan-white color palette
      const t = Math.random();
      colors[i * 3] = 0.23 + t * 0.5;       // R: 0.23-0.73
      colors[i * 3 + 1] = 0.51 + t * 0.3;    // G: 0.51-0.81
      colors[i * 3 + 2] = 0.8 + t * 0.2;     // B: 0.8-1.0

      sizes[i] = 0.03 + Math.random() * 0.06;
    }

    orbGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    orbGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    orbGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create glow texture
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 32;
    glowCanvas.height = 32;
    const gctx = glowCanvas.getContext('2d');
    const grd = gctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.2, 'rgba(96,165,250,0.8)');
    grd.addColorStop(0.5, 'rgba(59,130,246,0.3)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    gctx.fillStyle = grd;
    gctx.fillRect(0, 0, 32, 32);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    orbMat = new THREE.PointsMaterial({
      size: 0.12,
      map: glowTexture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.7,
    });

    orbPoints = new THREE.Points(orbGeo, orbMat);
    group.add(orbPoints);

    // ── Concentric waveform rings ──
    for (let r = 0; r < INNER_RING_COUNT; r++) {
      const ringGroup = new THREE.Group();
      const ringRadius = ORB_RADIUS * (1.15 + r * 0.25);
      const ringGeo = new THREE.BufferGeometry();
      const ringPositions = new Float32Array(RING_PARTICLE_COUNT * 3);
      const ringColors = new Float32Array(RING_PARTICLE_COUNT * 3);

      for (let i = 0; i < RING_PARTICLE_COUNT; i++) {
        const angle = (i / RING_PARTICLE_COUNT) * Math.PI * 2;
        ringPositions[i * 3] = Math.cos(angle) * ringRadius;
        ringPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
        ringPositions[i * 3 + 2] = Math.sin(angle) * ringRadius;

        const hue = 0.55 + r * 0.05;
        ringColors[i * 3] = 0.3;
        ringColors[i * 3 + 1] = 0.6;
        ringColors[i * 3 + 2] = 0.9;
      }

      ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
      ringGeo.setAttribute('color', new THREE.BufferAttribute(ringColors, 3));

      const ringMat = new THREE.PointsMaterial({
        size: 0.06 + r * 0.015,
        map: glowTexture,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.4 - r * 0.08,
      });

      const ringPoints = new THREE.Points(ringGeo, ringMat);
      ringGroup.add(ringPoints);
      ringGroup.userData = {
        radius: ringRadius,
        baseRadius: ringRadius,
        speed: 0.3 + r * 0.2,
        direction: r % 2 === 0 ? 1 : -1,
        particles: ringPoints,
      };
      group.add(ringGroup);
      rings.push(ringGroup);
    }

    scene.add(group);
    return group;
  }

  function update(delta, elapsed) {
    // Smooth activate/deactivate
    active += (targetActive ? 1 : 0 - active) * 0.05;
    const targetScale = active > 0.01 ? 1.0 : 0.01;
    currentScale += (targetScale - currentScale) * 0.06;
    group.scale.setScalar(currentScale);

    if (currentScale < 0.02) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // Get audio levels
    const levels = JARVIS.AudioAnalyzer && JARVIS.AudioAnalyzer.getLevels
      ? JARVIS.AudioAnalyzer.getLevels()
      : { bass: 0, mid: 0, treble: 0, volume: 0 };

    const bass = levels.bass || 0;
    const mid = levels.mid || 0;
    const treble = levels.treble || 0;
    const vol = levels.volume || 0;

    // Overall breathing
    const breath = 1 + Math.sin(elapsed * 2.5) * 0.03 + bass * 0.12;
    orbPoints.scale.setScalar(breath);

    // Animate orb particles with audio displacement
    const posArr = orbGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Base position on sphere (compute fresh each frame for wave effect)
      const phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i + elapsed * 0.2;

      // Audio-driven displacement
      const wave = Math.sin(theta * 6 + elapsed * 3) * treble * 0.3
                 + Math.cos(phi * 8 + elapsed * 2) * mid * 0.2
                 + bass * 0.25;

      const r = ORB_RADIUS * (0.85 + wave);
      posArr[i3] = r * Math.sin(phi) * Math.cos(theta);
      posArr[i3 + 1] = r * Math.cos(phi) * 0.7 + mid * 0.3 * Math.sin(theta);
      posArr[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    orbGeo.attributes.position.needsUpdate = true;

    // Material opacity reacts to volume
    orbMat.opacity = 0.45 + vol * 0.6 + bass * 0.3;
    coreGlow.material.opacity = 0.3 + vol * 0.8 + bass * 0.4;

    // Core glow pulse
    const coreScale = 1 + bass * 2.5 + vol * 1.5;
    coreGlow.scale.setScalar(coreScale);

    // Animate rings
    rings.forEach(function(ringGroup, rIdx) {
      const ud = ringGroup.userData;
      ud.radius = ud.baseRadius + bass * 0.4 + mid * 0.2 * (rIdx + 1);
      ringGroup.rotation.y += delta * ud.speed * ud.direction * (0.5 + vol * 2);
      ringGroup.rotation.x += delta * ud.speed * 0.3 * mid;

      // Update ring particle positions
      const rpArr = ud.particles.geometry.attributes.position.array;
      for (let i = 0; i < RING_PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const angle = (i / RING_PARTICLE_COUNT) * Math.PI * 2 + elapsed * ud.speed * 0.5;
        const waveR = ud.radius + Math.sin(angle * 8 + elapsed * 4) * treble * 0.3;
        rpArr[i3] = Math.cos(angle) * waveR;
        rpArr[i3 + 1] = Math.sin(angle * 3 + elapsed * 2) * mid * 0.2;
        rpArr[i3 + 2] = Math.sin(angle) * waveR;
      }
      ud.particles.geometry.attributes.position.needsUpdate = true;
      ud.particles.material.opacity = 0.25 + vol * 0.5 + treble * 0.3;
    });

    // Gentle rotation
    group.rotation.y += delta * 0.15 * (0.5 + bass);
    group.rotation.x += delta * 0.05 * mid;
  }

  function setActive(val) {
    targetActive = val;
  }

  function isActive() { return active > 0.1; }

  return { init, update, setActive, isActive };
})();

window.JARVIS = JARVIS;
