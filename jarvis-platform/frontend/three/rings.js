/* ==========================================
   J.A.R.V.I.S. — Outer Orbital Rings
   Larger rings beyond the arc reactor core,
   with orbiting glow nodes and radar tick marks
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Rings = (function () {
  const rings = [];
  const allTickGroups = [];
  let emPulseTimer = 0;
  const EM_PULSE_INTERVAL = 5;

  function init(scene) {
    // ── Large Outer Ring (slow, majestic blue) ──
    const outerGeo = new THREE.TorusGeometry(4.0, 0.022, 16, 200);
    const outerMat = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerRing = new THREE.Mesh(outerGeo, outerMat);
    outerRing.rotation.x = Math.PI * 0.45;
    outerRing.position.y = -0.5;
    outerRing.userData = {
      speedX: 0.06, speedY: 0.04, speedZ: 0.08, baseOpacity: 0.28, radius: 4.0,
    };
    scene.add(outerRing);
    rings.push(outerRing);

    // ── Middle Ring (cyan-blue) ──
    const midGeo = new THREE.TorusGeometry(3.3, 0.018, 16, 160);
    const midMat = new THREE.MeshBasicMaterial({
      color: '#06B6D4',
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const midRing = new THREE.Mesh(midGeo, midMat);
    midRing.rotation.x = Math.PI * 0.52;
    midRing.rotation.z = Math.PI * 0.3;
    midRing.position.y = -0.3;
    midRing.userData = {
      speedX: -0.05, speedY: 0.07, speedZ: -0.09, baseOpacity: 0.24, radius: 3.3,
    };
    scene.add(midRing);
    rings.push(midRing);

    // ── Inner Accent Ring (orange, faster) ──
    const innerGeo = new THREE.TorusGeometry(3.05, 0.014, 12, 140);
    const innerMat = new THREE.MeshBasicMaterial({
      color: '#F97316',
      transparent: true,
      opacity: 0.20,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerRing = new THREE.Mesh(innerGeo, innerMat);
    innerRing.rotation.x = Math.PI * 0.48;
    innerRing.rotation.y = Math.PI * 0.2;
    innerRing.position.y = -0.1;
    innerRing.userData = {
      speedX: 0.08, speedY: -0.06, speedZ: 0.12, baseOpacity: 0.20, radius: 3.05,
    };
    scene.add(innerRing);
    rings.push(innerRing);

    // ── Glow Nodes on Rings ──
    const nodeGeo = new THREE.SphereGeometry(0.06, 8, 8);
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
    const cyanNodeMat = new THREE.MeshBasicMaterial({
      color: '#06B6D4',
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    rings.forEach((ring, ri) => {
      const mats = [blueNodeMat, cyanNodeMat, orangeNodeMat];
      const nodeMat = mats[ri] || blueNodeMat;
      for (let i = 0; i < 4; i++) {
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.userData = {
          parent: ring,
          angle: (i / 4) * Math.PI * 2,
          orbitSpeed: 0.35 + Math.random() * 0.5,
        };
        scene.add(node);
        ring.userData.nodes = ring.userData.nodes || [];
        ring.userData.nodes.push(node);
      }
    });

    // ── Radar Tick Marks ──
    rings.forEach((ring) => {
      const tickGroup = new THREE.Group();
      const radius = ring.userData.radius;
      const tickCount = 48;
      const tickGeo = new THREE.BoxGeometry(0.04, 0.003, 0.05);

      for (let i = 0; i < tickCount; i++) {
        const angle = (i / tickCount) * Math.PI * 2;
        // Skip every 8th for segmented radar look
        if (i % 8 === 0) continue;

        const tickMat = new THREE.MeshBasicMaterial({
          color: ring === rings[2] ? '#F97316' : '#3B82F6',
          transparent: true,
          opacity: 0.35,
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
    const emIntensity = emPhase < 0.06
      ? Math.sin(emPhase / 0.06 * Math.PI)
      : Math.max(0, 1 - (emPhase - 0.06) * 4);

    const coreIntensity = JARVIS.Scene && JARVIS.Scene.getCoreIntensity
      ? JARVIS.Scene.getCoreIntensity() : 0.3;

    rings.forEach((ring, ri) => {
      const d = ring.userData;
      const speedMult = 0.7 + coreIntensity * 0.5;
      ring.rotation.x += d.speedX * delta * speedMult;
      ring.rotation.y += d.speedY * delta * speedMult;
      ring.rotation.z += d.speedZ * delta * speedMult;

      const pulse = 1 + Math.sin(elapsed * 0.7 + ri) * 0.25;
      const flashBoost = 1 + emIntensity * 4;
      ring.material.opacity = Math.min(1, d.baseOpacity * pulse * flashBoost * (0.8 + coreIntensity * 0.4));

      // Update orbiting nodes
      if (d.nodes) {
        d.nodes.forEach((node) => {
          node.userData.angle += node.userData.orbitSpeed * delta * speedMult;
          const r = ring.geometry.parameters.radius;
          const angle = node.userData.angle;
          const localX = Math.cos(angle) * r;
          const localY = Math.sin(angle) * r;
          const worldPos = new THREE.Vector3(localX, localY, 0);
          ring.localToWorld(worldPos);
          node.position.copy(worldPos);
          const s = 0.7 + Math.sin(elapsed * 2.2 + angle) * 0.5 + emIntensity * 3 + coreIntensity * 0.4;
          node.scale.setScalar(s);
          node.material.opacity = Math.min(1, 0.5 + Math.sin(elapsed * 2 + angle) * 0.5 + emIntensity * 2);
        });
      }

      // Tick group rotation
      if (d.tickGroup) {
        d.tickGroup.rotation.copy(ring.rotation);
        d.tickGroup.children.forEach((tick) => {
          tick.material.opacity = 0.2 + emIntensity * 0.7 + coreIntensity * 0.15;
        });
      }
    });
  }

  return { init, update };
})();

window.JARVIS = JARVIS;
