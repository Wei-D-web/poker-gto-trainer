/* ==========================================
   J.A.R.V.I.S. — 3D Holographic Data Tower
   Vertical stacked rings representing data layers
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.DataTower = (function () {
  let group;
  let rings = [];
  let dataFlows = [];

  function init(scene) {
    group = new THREE.Group();
    group.position.set(0, 0, 0);
    scene.add(group);
    return group;
  }

  /**
   * Build a data tower with stacked rings.
   * data: { layers: [{label, value, color?}], title?: string }
   */
  function buildTower(data) {
    clear();
    const layers = data.layers || [];
    const maxVal = Math.max(...layers.map(l => l.value || 0), 1);
    const baseRadius = 1.2;
    const ringSpacing = 0.55;
    const totalHeight = layers.length * ringSpacing;

    // Center pillar
    const pillarGeo = new THREE.CylinderGeometry(0.03, 0.03, totalHeight + 1, 12);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = totalHeight / 2 - 0.2;
    group.add(pillar);
    rings.push(pillar);

    // Stacked rings
    layers.forEach((layer, i) => {
      const radius = baseRadius + (layer.value / maxVal) * 0.8;
      const y = i * ringSpacing;
      const color = layer.color || '#3B82F6';

      // Main ring
      const ringGeo = new THREE.TorusGeometry(radius, 0.025, 12, 80);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = y;
      ring.rotation.x = Math.PI / 2;
      ring.userData = { index: i, label: layer.label, value: layer.value, color: color, baseRadius: radius };
      group.add(ring);
      rings.push(ring);

      // Wire ring
      const wireGeo = new THREE.TorusGeometry(radius, 0.01, 6, 60);
      const wireMat = new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.15,
        wireframe: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.y = y;
      wire.rotation.x = Math.PI / 2;
      group.add(wire);
      rings.push(wire);

      // Energy dots along ring
      const dotCount = 6 + i * 2;
      for (let d = 0; d < dotCount; d++) {
        const angle = (d / dotCount) * Math.PI * 2;
        const dotGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const dotMat = new THREE.MeshBasicMaterial({
          color: color,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        dot.userData = { angle: angle, speed: 0.5 + Math.random() * 1.5, radius: radius, baseY: y };
        group.add(dot);
        dataFlows.push(dot);
      }
    });

    // Top glow orb
    const topGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const topMat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const topOrb = new THREE.Mesh(topGeo, topMat);
    topOrb.position.y = totalHeight + 0.1;
    group.add(topOrb);
    rings.push(topOrb);
  }

  function update(delta, elapsed) {
    if (!group) return;

    group.rotation.y += delta * 0.08;

    // Move energy dots along rings
    dataFlows.forEach(dot => {
      dot.userData.angle += dot.userData.speed * delta;
      const a = dot.userData.angle;
      const r = dot.userData.radius;
      dot.position.x = Math.cos(a) * r;
      dot.position.z = Math.sin(a) * r;
      dot.position.y = dot.userData.baseY;
      dot.postion && dot.postion.multiplyScalar && dot.position.applyMatrix4
        ? null : null; // already in world space
      // Pulse
      const s = 0.6 + Math.sin(elapsed * 3 + a) * 0.4;
      dot.scale.setScalar(s);
    });

    // Pulse rings
    rings.forEach((ring, i) => {
      if (ring.userData && ring.userData.baseRadius) {
        ring.material.opacity = 0.35 + Math.sin(elapsed * 1.5 + i * 0.3) * 0.15;
      }
    });
  }

  function clear() {
    [...rings, ...dataFlows].forEach(obj => {
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    rings = [];
    dataFlows = [];
  }

  function remove(scene) {
    clear();
    scene.remove(group);
    group = null;
  }

  return { init, buildTower, update, clear, remove };
})();

window.JARVIS = JARVIS;
