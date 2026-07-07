/* ==========================================
   J.A.R.V.I.S. — Rotating Holographic Rings
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Rings = (function () {
  const rings = [];
  const allTickGroups = [];
  let emPulseTimer = 0;
  const EM_PULSE_INTERVAL = 4;

  function init(scene) {
    // ── Outer Ring (large, slow, blue) ──
    const outerGeo = new THREE.TorusGeometry(3.5, 0.018, 16, 200);
    const outerMat = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerRing = new THREE.Mesh(outerGeo, outerMat);
    outerRing.rotation.x = Math.PI * 0.45;
    outerRing.position.y = -0.5;
    outerRing.userData = {
      speedX: 0.08, speedY: 0.05, speedZ: 0.12, baseOpacity: 0.3, radius: 3.5,
    };
    scene.add(outerRing);
    rings.push(outerRing);

    // ── Middle Ring (blue-cyan) ──
    const midGeo = new THREE.TorusGeometry(2.6, 0.015, 16, 160);
    const midMat = new THREE.MeshBasicMaterial({
      color: '#60A5FA',
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const midRing = new THREE.Mesh(midGeo, midMat);
    midRing.rotation.x = Math.PI * 0.55;
    midRing.rotation.z = Math.PI * 0.3;
    midRing.position.y = -0.3;
    midRing.userData = {
      speedX: -0.06, speedY: 0.09, speedZ: -0.1, baseOpacity: 0.25, radius: 2.6,
    };
    scene.add(midRing);
    rings.push(midRing);

    // ── Inner Ring (orange-tinted, fast) ──
    const innerGeo = new THREE.TorusGeometry(1.8, 0.012, 12, 120);
    const innerMat = new THREE.MeshBasicMaterial({
      color: '#F97316',
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerRing = new THREE.Mesh(innerGeo, innerMat);
    innerRing.rotation.x = Math.PI * 0.5;
    innerRing.rotation.y = Math.PI * 0.25;
    innerRing.position.y = -0.1;
    innerRing.userData = {
      speedX: 0.1, speedY: -0.07, speedZ: 0.15, baseOpacity: 0.22, radius: 1.8,
    };
    scene.add(innerRing);
    rings.push(innerRing);

    // ── Glow Nodes on Rings ──
    const nodeGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const blueNodeMat = new THREE.MeshBasicMaterial({
      color: '#60A5FA',
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const orangeNodeMat = new THREE.MeshBasicMaterial({
      color: '#F97316',
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    rings.forEach((ring, ri) => {
      const nodeMat = ri === 2 ? orangeNodeMat : blueNodeMat;
      for (let i = 0; i < 3; i++) {
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.userData = {
          parent: ring,
          angle: (i / 3) * Math.PI * 2,
          orbitSpeed: 0.3 + Math.random() * 0.4,
        };
        scene.add(node);
        ring.userData.nodes = ring.userData.nodes || [];
        ring.userData.nodes.push(node);
      }
    });

    // ── Tick Marks ──
    // Small dashes along ring circumferences for HUD/radar feel
    rings.forEach((ring) => {
      const tickGroup = new THREE.Group();
      const radius = ring.userData.radius;
      const tickCount = 36;
      const tickGeo = new THREE.BoxGeometry(0.03, 0.003, 0.04);

      for (let i = 0; i < tickCount; i++) {
        const angle = (i / tickCount) * Math.PI * 2;
        // Skip every 6th for a "segmented" look
        if (i % 6 === 0) continue;

        const tickMat = new THREE.MeshBasicMaterial({
          color: ring === rings[2] ? '#F97316' : '#3B82F6',
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const tick = new THREE.Mesh(tickGeo, tickMat);
        tick.position.x = Math.cos(angle) * radius;
        tick.position.z = Math.sin(angle) * radius;
        tick.rotation.y = -angle + Math.PI / 2;
        tick.rotation.z = ring.rotation.x;
        tickGroup.add(tick);
      }

      // Copy ring rotation so ticks follow the ring
      tickGroup.rotation.copy(ring.rotation);
      scene.add(tickGroup);
      ring.userData.tickGroup = tickGroup;
      allTickGroups.push({ group: tickGroup, ring: ring });
    });

    return rings;
  }

  function update(delta, elapsed) {
    emPulseTimer += delta;
    const emPhase = (emPulseTimer % EM_PULSE_INTERVAL) / EM_PULSE_INTERVAL;
    const emIntensity = emPhase < 0.08
      ? Math.sin(emPhase / 0.08 * Math.PI)
      : Math.max(0, 1 - (emPhase - 0.08) * 3);

    rings.forEach((ring, ri) => {
      const d = ring.userData;
      ring.rotation.x += d.speedX * delta;
      ring.rotation.y += d.speedY * delta;
      ring.rotation.z += d.speedZ * delta;

      const pulse = 1 + Math.sin(elapsed * 0.8 + ri) * 0.3;
      const flashBoost = 1 + emIntensity * 5;
      ring.material.opacity = Math.min(1, d.baseOpacity * pulse * flashBoost);

      // Update orbiting nodes
      if (d.nodes) {
        d.nodes.forEach((node) => {
          node.userData.angle += node.userData.orbitSpeed * delta;
          const r = ring.geometry.parameters.radius;
          const angle = node.userData.angle;
          const localX = Math.cos(angle) * r;
          const localY = Math.sin(angle) * r;
          const worldPos = new THREE.Vector3(localX, localY, 0);
          ring.localToWorld(worldPos);
          node.position.copy(worldPos);
          const s = 0.8 + Math.sin(elapsed * 2 + angle) * 0.4 + emIntensity * 3;
          node.scale.setScalar(s);
          node.material.opacity = 0.6 + Math.sin(elapsed * 2 + angle) * 0.4 + emIntensity * 2;
        });
      }

      // Update tick group rotation to match ring
      if (d.tickGroup) {
        d.tickGroup.rotation.copy(ring.rotation);
        // Pulse tick opacity with EM
        d.tickGroup.children.forEach((tick) => {
          tick.material.opacity = 0.25 + emIntensity * 0.6;
        });
      }
    });
  }

  return { init, update };
})();

window.JARVIS = JARVIS;
