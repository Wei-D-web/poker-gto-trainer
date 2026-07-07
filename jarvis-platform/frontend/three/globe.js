/* ==========================================
   J.A.R.V.I.S. — 3D Holographic Globe
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Globe = (function () {
  let globe, wireframe, markers = [], glowRing;
  let group;

  function init(scene) {
    group = new THREE.Group();

    // ── Globe sphere ──
    const geo = new THREE.SphereGeometry(2.5, 64, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: '#0A1628',
      transparent: true,
      opacity: 0.3,
    });
    globe = new THREE.Mesh(geo, mat);
    group.add(globe);

    // ── Wireframe grid ──
    const wireGeo = new THREE.SphereGeometry(2.52, 48, 32);
    const wireMat = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.15,
      wireframe: true,
      depthWrite: false,
    });
    wireframe = new THREE.Mesh(wireGeo, wireMat);
    group.add(wireframe);

    // ── Latitude/Longitude rings ──
    for (let i = 0; i < 5; i++) {
      const ringGeo = new THREE.TorusGeometry(2.53, 0.005, 16, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: '#60A5FA',
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -1.5 + (i / 4) * 3;
      group.add(ring);
    }

    // ── Glow ring at equator ──
    const glowGeo = new THREE.TorusGeometry(2.55, 0.03, 16, 120);
    const glowMat = new THREE.MeshBasicMaterial({
      color: '#06B6D4',
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.rotation.x = Math.PI / 2;
    group.add(glowRing);

    // ── Markers (example: major cities) ──
    const locations = [
      { lat: 40.7, lng: -74.0, name: 'NYC', color: '#3B82F6' },
      { lat: 51.5, lng: -0.1, name: 'London', color: '#60A5FA' },
      { lat: 35.7, lng: 139.7, name: 'Tokyo', color: '#8B5CF6' },
      { lat: 31.2, lng: 121.5, name: 'Shanghai', color: '#06B6D4' },
      { lat: -33.9, lng: 151.2, name: 'Sydney', color: '#10B981' },
    ];

    locations.forEach((loc) => {
      addMarker(loc.lat, loc.lng, loc.color);
    });

    group.position.set(0, 0.5, 0);
    scene.add(group);

    return group;
  }

  function addMarker(lat, lng, color = '#60A5FA') {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const radius = 2.6;

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    // Dot
    const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(x, y, z);
    group.add(dot);

    // Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    const pillarMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, y + 0.2, z);
    group.add(pillar);

    markers.push({ dot, pillar });
  }

  function update(delta, elapsed) {
    if (!group) return;
    group.rotation.y += delta * 0.08;

    // Pulse glow ring
    if (glowRing) {
      glowRing.material.opacity = 0.15 + Math.sin(elapsed * 1.5) * 0.08;
    }
  }

  function remove(scene) {
    if (group) {
      scene.remove(group);
      group = null;
    }
  }

  return { init, addMarker, update, remove };
})();

window.JARVIS = JARVIS;
