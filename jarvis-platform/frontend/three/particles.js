/* ==========================================
   J.A.R.V.I.S. — Arc Reactor Energy Particles
   Enhanced particle field with energy streams
   and reactor-style burst effects
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Particles = (function () {
  let particles, geometry, material;
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;
  const PARTICLE_COUNT = 2400;
  const STREAM_COUNT = 12;
  let burstIntensity = 0;
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
    const goldColor = new THREE.Color('#FFD700');
    const whiteColor = new THREE.Color('#EDF1F7');
    const purpleColor = new THREE.Color('#8B5CF6');

    const particlesPerStream = Math.floor(PARTICLE_COUNT / STREAM_COUNT);

    for (let s = 0; s < STREAM_COUNT; s++) {
      // Distribute streams in a wider arc reactor pattern
      const angle = (s / STREAM_COUNT) * Math.PI * 2;
      // Mix of inner (close to core) and outer streams
      const isInner = s < 4;
      const streamRadius = isInner
        ? 1.5 + Math.random() * 2.5  // inner: closer to reactor
        : 4.5 + Math.random() * 8;   // outer: wider field
      const streamHeight = isInner ? 8 : 16;
      const streamSpread = isInner ? 0.3 : 0.8;

      for (let j = 0; j < particlesPerStream; j++) {
        const idx = s * particlesPerStream + j;
        if (idx >= PARTICLE_COUNT) break;

        const px = Math.cos(angle) * streamRadius + (Math.random() - 0.5) * streamSpread;
        const py = (Math.random() - 0.5) * streamHeight;
        const pz = Math.sin(angle) * streamRadius + (Math.random() - 0.5) * streamSpread;

        positions[idx * 3] = px;
        positions[idx * 3 + 1] = py;
        positions[idx * 3 + 2] = pz;

        initialPositions[idx * 3] = px;
        initialPositions[idx * 3 + 1] = py;
        initialPositions[idx * 3 + 2] = pz;

        // Velocity: mainly upward with slight spiral
        const spiralSpeed = isInner ? 0.15 : 0.05;
        velocities[idx * 3] = Math.cos(angle) * spiralSpeed + (Math.random() - 0.5) * 0.1;
        velocities[idx * 3 + 1] = 0.4 + Math.random() * 1.0;
        velocities[idx * 3 + 2] = Math.sin(angle) * spiralSpeed + (Math.random() - 0.5) * 0.1;

        // Color distribution: more white/cyan for inner streams (arc reactor energy)
        const mix = Math.random();
        let color;
        if (isInner) {
          if (mix < 0.22) color = whiteColor.clone().lerp(cyanColor, Math.random() * 0.6);
          else if (mix < 0.42) color = cyanColor.clone().lerp(blueColor, Math.random());
          else if (mix < 0.62) color = blueColor.clone().lerp(purpleColor, Math.random() * 0.5);
          else if (mix < 0.82) color = goldColor.clone().lerp(amberColor, Math.random() * 0.5);
          else color = orangeColor.clone().lerp(goldColor, Math.random() * 0.6);
        } else {
          if (mix < 0.32) color = blueColor.clone().lerp(cyanColor, Math.random());
          else if (mix < 0.52) color = cyanColor.clone().lerp(purpleColor, Math.random() * 0.5);
          else if (mix < 0.72) color = goldColor.clone().lerp(amberColor, Math.random() * 0.5);
          else if (mix < 0.88) color = orangeColor.clone().lerp(goldColor, Math.random() * 0.4);
          else color = purpleColor.clone().lerp(whiteColor, Math.random() * 0.3);
        }

        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;

        // Smaller particles for inner streams (energy look)
        sizes[idx] = isInner
          ? 0.15 + Math.random() * 1.2
          : 0.4 + Math.random() * 2.2;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Soft glowing particle texture (radial gradient)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.08, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.25, 'rgba(150, 210, 255, 0.55)');
    gradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    material = new THREE.PointsMaterial({
      size: 0.06,
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
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
    mouseX += (targetMouseX - mouseX) * 0.025;
    mouseY += (targetMouseY - mouseY) * 0.025;

    // Gentle rotation of field
    particles.rotation.y += delta * 0.03;
    particles.rotation.x += delta * 0.015;
    particles.rotation.y += mouseX * delta * 0.06;
    particles.rotation.x += mouseY * delta * 0.03;

    const positions = geometry.attributes.position.array;
    const coreIntensity = JARVIS.Scene && JARVIS.Scene.getCoreIntensity
      ? JARVIS.Scene.getCoreIntensity() : 0.3;
    const streamHeight = 14;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;

      // Apply velocity with core intensity influence
      const speedMult = 0.8 + coreIntensity * 1.5;
      positions[idx] += velocities[idx] * delta * speedMult;
      positions[idx + 1] += velocities[idx + 1] * delta * speedMult;
      positions[idx + 2] += velocities[idx + 2] * delta * speedMult;

      // Burst: particles pushed outward from center
      if (burstIntensity > 0.001) {
        const dx = positions[idx];
        const dy = positions[idx + 1];
        const dz = positions[idx + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
        const force = burstIntensity * 4.5;
        positions[idx] += (dx / dist) * force * delta;
        positions[idx + 1] += (dy / dist) * force * delta;
        positions[idx + 2] += (dz / dist) * force * delta;
      }

      // Wrap vertically
      if (positions[idx + 1] > streamHeight / 2) {
        positions[idx + 1] = -streamHeight / 2;
      }
      if (positions[idx + 1] < -streamHeight / 2) {
        positions[idx + 1] = streamHeight / 2;
      }

      // Elastic drift back
      const ix = initialPositions[idx];
      const iy = initialPositions[idx + 1];
      const iz = initialPositions[idx + 2];
      const elastic = 0.006;
      positions[idx] += (ix - positions[idx]) * elastic;
      positions[idx + 2] += (iz - positions[idx + 2]) * elastic;
    }

    geometry.attributes.position.needsUpdate = true;

    // Decay burst
    if (burstIntensity > 0.001) {
      burstIntensity *= 0.9;
    } else {
      burstIntensity = 0;
    }

    // Breathing opacity + core intensity influence
    const breath = 0.55 + Math.sin(elapsed * 0.35) * 0.1;
    material.opacity = breath + burstIntensity * 0.5 + coreIntensity * 0.15;
    material.size = 0.06 + burstIntensity * 0.05 + coreIntensity * 0.02;
  }

  function burst(strength = 0.6) {
    burstIntensity = Math.min(1, burstIntensity + strength);
    if (JARVIS.Scene && JARVIS.Scene.pulseCore) {
      JARVIS.Scene.pulseCore(strength * 0.5);
    }
  }

  return { init, update, burst };
})();

window.JARVIS = JARVIS;
