/* ==========================================
   J.A.R.V.I.S. — Holographic Data Stream Particles
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Particles = (function () {
  let particles, geometry, material;
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;
  const PARTICLE_COUNT = 2000;
  const STREAM_COUNT = 8;
  let burstIntensity = 0;

  // Store initial positions for burst reset
  let initialPositions;
  let velocities;

  function init(scene) {
    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    velocities = new Float32Array(PARTICLE_COUNT * 3);
    initialPositions = new Float32Array(PARTICLE_COUNT * 3);

    const blueColor = new THREE.Color('#3B82F6');
    const cyanColor = new THREE.Color('#06B6D4');
    const orangeColor = new THREE.Color('#F97316');
    const amberColor = new THREE.Color('#F59E0B');
    const whiteColor = new THREE.Color('#EDF1F7');

    const particlesPerStream = Math.floor(PARTICLE_COUNT / STREAM_COUNT);

    for (let s = 0; s < STREAM_COUNT; s++) {
      const angle = (s / STREAM_COUNT) * Math.PI * 2;
      const streamRadius = 4 + Math.random() * 8; // distance from center
      const streamHeight = 14;
      const streamSpread = 0.6 + Math.random() * 0.8;

      for (let j = 0; j < particlesPerStream; j++) {
        const idx = s * particlesPerStream + j;
        if (idx >= PARTICLE_COUNT) break;

        // Column position with slight spread
        const px = Math.cos(angle) * streamRadius + (Math.random() - 0.5) * streamSpread;
        const py = (Math.random() - 0.5) * streamHeight; // vertical distribution
        const pz = Math.sin(angle) * streamRadius + (Math.random() - 0.5) * streamSpread;

        positions[idx * 3] = px;
        positions[idx * 3 + 1] = py;
        positions[idx * 3 + 2] = pz;

        initialPositions[idx * 3] = px;
        initialPositions[idx * 3 + 1] = py;
        initialPositions[idx * 3 + 2] = pz;

        // Velocity: upward drift
        velocities[idx * 3] = (Math.random() - 0.5) * 0.1;
        velocities[idx * 3 + 1] = 0.3 + Math.random() * 0.8; // upward speed
        velocities[idx * 3 + 2] = (Math.random() - 0.5) * 0.1;

        // Color: 65% blue/cyan, 30% orange/amber, 5% white
        const mix = Math.random();
        let color;
        if (mix < 0.45) {
          color = blueColor.clone().lerp(cyanColor, Math.random());
        } else if (mix < 0.65) {
          color = cyanColor.clone().lerp(new THREE.Color('#8B5CF6'), Math.random() * 0.5);
        } else if (mix < 0.90) {
          color = orangeColor.clone().lerp(amberColor, Math.random());
        } else {
          color = orangeColor.clone().lerp(whiteColor, Math.random() * 0.5);
        }

        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;

        sizes[idx] = 0.3 + Math.random() * 2.0;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Circular particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(150, 200, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    material = new THREE.PointsMaterial({
      size: 0.07,
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    document.addEventListener('mousemove', onMouseMove);

    return particles;
  }

  function onMouseMove(e) {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function update(delta, elapsed) {
    if (!particles) return;

    // Smooth mouse follow
    mouseX += (targetMouseX - mouseX) * 0.02;
    mouseY += (targetMouseY - mouseY) * 0.02;

    // Rotate entire particle field
    particles.rotation.y += delta * 0.04;
    particles.rotation.x += delta * 0.02;
    particles.rotation.y += mouseX * delta * 0.08;
    particles.rotation.x += mouseY * delta * 0.04;

    // Update individual particle positions (data stream flow)
    const positions = geometry.attributes.position.array;
    const streamHeight = 14;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;

      // Apply velocity (upward drift)
      positions[idx] += velocities[idx] * delta;
      positions[idx + 1] += velocities[idx + 1] * delta;
      positions[idx + 2] += velocities[idx + 2] * delta;

      // Burst offset: particles pushed outward from center
      if (burstIntensity > 0.001) {
        const dx = positions[idx];
        const dy = positions[idx + 1];
        const dz = positions[idx + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
        const force = burstIntensity * 3.0;
        positions[idx] += (dx / dist) * force * delta;
        positions[idx + 1] += (dy / dist) * force * delta;
        positions[idx + 2] += (dz / dist) * force * delta;
      }

      // Wrap: if particle drifts too high, reset to bottom
      if (positions[idx + 1] > streamHeight / 2) {
        positions[idx + 1] = -streamHeight / 2;
      }
      if (positions[idx + 1] < -streamHeight / 2) {
        positions[idx + 1] = streamHeight / 2;
      }

      // Drift back toward initial position (elastic)
      const ix = initialPositions[idx];
      const iy = initialPositions[idx + 1];
      const iz = initialPositions[idx + 2];
      positions[idx] += (ix - positions[idx]) * 0.005;
      positions[idx + 2] += (iz - positions[idx + 2]) * 0.005;
    }

    geometry.attributes.position.needsUpdate = true;

    // Decay burst
    if (burstIntensity > 0.001) {
      burstIntensity *= 0.92;
    } else {
      burstIntensity = 0;
    }

    // Breathing opacity
    const breath = 0.55 + Math.sin(elapsed * 0.4) * 0.12;
    material.opacity = breath + burstIntensity * 0.4;
    material.size = 0.07 + burstIntensity * 0.04;
  }

  function burst(strength = 0.6) {
    burstIntensity = Math.min(1, burstIntensity + strength);
    // Also trigger core pulse
    if (JARVIS.Scene && JARVIS.Scene.pulseCore) {
      JARVIS.Scene.pulseCore(strength * 0.6);
    }
  }

  return { init, update, burst };
})();

window.JARVIS = JARVIS;
