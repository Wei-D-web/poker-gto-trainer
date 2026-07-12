/* ==========================================
   J.A.R.V.I.S. — Interactive 3D Holographic Globe
   Raycaster-based: hover, click, zoom, rotate
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Globe = (function () {
  let group, globe, wireframe, glowRing, radarGroup;
  let markers = [];
  let locationMarkers = [];
  let raycaster, mouse;
  let hoveredMarker = null;
  let isDragging = false, dragStart = { x: 0, y: 0 };
  let autoRotate = true;
  let targetScale = 1, currentScale = 1;
  let infoCallback = null;

  // Camera refs (set by Viz controller)
  let camera, renderer;

  const DEFAULT_LOCATIONS = [
    { lat: 40.7, lng: -74.0, name: 'New York', color: '#3B82F6', info: 'Financial hub · UN HQ' },
    { lat: 51.5, lng: -0.1, name: 'London', color: '#60A5FA', info: 'GMT+0 · Financial center' },
    { lat: 35.7, lng: 139.7, name: 'Tokyo', color: '#8B5CF6', info: 'Tech & finance hub' },
    { lat: 31.2, lng: 121.5, name: 'Shanghai', color: '#06B6D4', info: 'China\'s largest city · Port' },
    { lat: -33.9, lng: 151.2, name: 'Sydney', color: '#10B981', info: 'Asia-Pacific gateway' },
    { lat: 48.9, lng: 2.3, name: 'Paris', color: '#F97316', info: 'EU trade · Fashion capital' },
    { lat: 55.8, lng: 37.6, name: 'Moscow', color: '#EF4444', info: 'Eurasian hub' },
    { lat: 1.3, lng: 103.8, name: 'Singapore', color: '#F59E0B', info: 'Maritime trade hub' },
    { lat: 25.2, lng: 55.3, name: 'Dubai', color: '#EC4899', info: 'Middle East logistics hub' },
    { lat: -23.5, lng: -46.6, name: 'São Paulo', color: '#14B8A6', info: 'South America gateway' },
  ];

  function init(scene, _camera, _renderer) {
    camera = _camera;
    renderer = _renderer;

    group = new THREE.Group();

    // ── Globe sphere ──
    const geo = new THREE.SphereGeometry(2.5, 72, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: '#0A1628',
      transparent: true,
      opacity: 0.35,
    });
    globe = new THREE.Mesh(geo, mat);
    globe.name = 'globe-sphere';
    group.add(globe);

    // ── Wireframe grid ──
    const wireGeo = new THREE.SphereGeometry(2.52, 48, 32);
    const wireMat = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.12,
      wireframe: true,
      depthWrite: false,
    });
    wireframe = new THREE.Mesh(wireGeo, wireMat);
    group.add(wireframe);

    // ── Latitude rings ──
    for (let i = 0; i < 7; i++) {
      const ringGeo = new THREE.TorusGeometry(2.53, 0.004, 16, 140);
      const ringMat = new THREE.MeshBasicMaterial({
        color: '#60A5FA',
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -2.0 + (i / 6) * 4.0;
      group.add(ring);
    }

    // ── Equatorial glow ring ──
    const glowGeo = new THREE.TorusGeometry(2.56, 0.04, 16, 140);
    const glowMat = new THREE.MeshBasicMaterial({
      color: '#06B6D4',
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.rotation.x = Math.PI / 2;
    group.add(glowRing);

    // ── Radar sweep beam ──
    radarGroup = new THREE.Group();
    const beamGeo = new THREE.RingGeometry(2.40, 2.70, 64, 0, Math.PI * 0.35);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.x = -Math.PI / 2;
    beam.position.y = 0.01;
    radarGroup.add(beam);
    // Wider secondary beam in gold
    const beamWideGeo = new THREE.RingGeometry(2.35, 2.80, 64, 0, Math.PI * 0.25);
    const beamWideMat = new THREE.MeshBasicMaterial({
      color: '#FFD700',
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamWide = new THREE.Mesh(beamWideGeo, beamWideMat);
    beamWide.rotation.x = -Math.PI / 2;
    beamWide.position.y = -0.01;
    radarGroup.add(beamWide);
    group.add(radarGroup);

    // ── Raycaster for interaction ──
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.3;
    raycaster.params.Line.threshold = 0.3;
    mouse = new THREE.Vector2();

    // ── Add default markers ──
    DEFAULT_LOCATIONS.forEach(loc => addMarker(loc));

    group.position.set(0, 0.3, 0);
    scene.add(group);

    // ── Event listeners ──
    setupInteraction();

    return group;
  }

  function addMarker(loc) {
    const phi = (90 - loc.lat) * (Math.PI / 180);
    const theta = (loc.lng + 180) * (Math.PI / 180);
    const radius = 2.62;

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    // Glow dot
    const dotGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({
      color: loc.color || '#60A5FA',
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(x, y, z);
    dot.userData = { type: 'marker', location: loc };
    group.add(dot);

    // Pillar line
    const pillarHeight = 0.5 + Math.random() * 0.3;
    const pillarGeo = new THREE.CylinderGeometry(0.02, 0.02, pillarHeight, 8);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: loc.color || '#60A5FA',
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, y + pillarHeight / 2, z);
    pillar.userData = { type: 'pillar', location: loc };
    group.add(pillar);

    // Pulse ring at base
    const ringGeo = new THREE.TorusGeometry(0.08, 0.01, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: loc.color || '#60A5FA',
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, z);
    ring.userData = { type: 'ring', location: loc, baseY: y, baseX: x, baseZ: z };
    group.add(ring);

    markers.push({ dot, pillar, ring, location: loc });
  }

  function clearMarkers() {
    markers.forEach(m => {
      group.remove(m.dot);
      group.remove(m.pillar);
      group.remove(m.ring);
    });
    markers = [];
  }

  function setLocations(locations) {
    clearMarkers();
    locations.forEach(loc => addMarker(loc));
  }

  function setInfoCallback(fn) {
    infoCallback = fn;
  }

  // ── Mouse Interaction ──
  function setupInteraction() {
    const canvas = renderer ? renderer.domElement : document.querySelector('canvas');

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      autoRotate = false;
      dragStart = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!group || !camera) return;

      // Update raycaster
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children, true);

      // Hover detection
      let found = null;
      for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        if (obj.userData.type === 'marker' || obj.userData.type === 'pillar' || obj.userData.type === 'ring') {
          found = obj;
          break;
        }
      }

      if (hoveredMarker !== found) {
        // Reset old hover
        if (hoveredMarker) {
          hoveredMarker.material.opacity = hoveredMarker.userData._origOpacity || 0.5;
          hoveredMarker.scale.setScalar(1);
        }
        // Highlight new hover
        if (found) {
          found.userData._origOpacity = found.material.opacity;
          found.material.opacity = 1;
          found.scale.setScalar(1.5);
          if (renderer) renderer.domElement.style.cursor = 'pointer';
        } else {
          if (renderer) renderer.domElement.style.cursor = 'default';
        }
        hoveredMarker = found;
      }

      // Drag to rotate
      if (isDragging && group) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        group.rotation.y += dx * 0.005;
        group.rotation.x += dy * 0.003;
        group.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, group.rotation.x));
        dragStart = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', () => {
      isDragging = false;
      // Resume auto-rotate after 3 seconds of no drag
      setTimeout(() => { autoRotate = true; }, 3000);
    });

    canvas.addEventListener('click', (e) => {
      if (!group || !camera) return;

      // Don't trigger on drag
      const dx = Math.abs(e.clientX - dragStart.x);
      const dy = Math.abs(e.clientY - dragStart.y);
      if (dx > 3 || dy > 3) return;

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children, true);

      for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        const loc = obj.userData.location;
        if (loc) {
          // Trigger info callback
          if (infoCallback) {
            infoCallback(loc);
          }
          // Also show in chat
          if (JARVIS.Chat) {
            JARVIS.Chat.addMessage('assistant',
              '🌐 **' + loc.name + '**\n\n' + (loc.info || '') +
              '\n📍 ' + loc.lat.toFixed(1) + '°N, ' + loc.lng.toFixed(1) + '°E'
            );
          }
          // Particle burst
          if (JARVIS.Particles && JARVIS.Particles.burst) {
            JARVIS.Particles.burst(0.4);
          }
          break;
        }
      }
    });

    // Scroll zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      targetScale += e.deltaY * -0.001;
      targetScale = Math.max(0.6, Math.min(2.0, targetScale));
    }, { passive: false });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    canvas.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1 && group) {
        const dx = e.touches[0].clientX - dragStart.x;
        const dy = e.touches[0].clientY - dragStart.y;
        group.rotation.y += dx * 0.005;
        group.rotation.x += dy * 0.003;
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    canvas.addEventListener('touchend', () => { isDragging = false; });
  }

  function update(delta, elapsed) {
    if (!group) return;

    // Auto rotate
    if (autoRotate) {
      group.rotation.y += delta * 0.06;
    }

    // Rotate radar sweep
    if (radarGroup) {
      radarGroup.rotation.y += delta * 0.7;
    }

    // Smooth zoom
    currentScale += (targetScale - currentScale) * 0.08;
    group.scale.setScalar(currentScale);

    // Pulse glow ring
    if (glowRing) {
      glowRing.material.opacity = 0.12 + Math.sin(elapsed * 1.5) * 0.06;
    }

    // Pulse marker rings
    markers.forEach((m, i) => {
      if (m.ring) {
        const pulse = 1 + Math.sin(elapsed * 2.5 + i) * 0.2;
        m.ring.scale.setScalar(pulse);
        m.ring.material.opacity = 0.35 + Math.sin(elapsed * 2 + i) * 0.2;
      }
      if (m.dot) {
        const s = 0.8 + Math.sin(elapsed * 2 + i * 0.7) * 0.3;
        m.dot.scale.setScalar(s);
      }
    });
  }

  function remove(scene) {
    if (group) {
      scene.remove(group);
      // Dispose geometries and materials
      group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      group = null;
    }
    markers = [];
    hoveredMarker = null;
    autoRotate = true;
  }

  return { init, addMarker, setLocations, clearMarkers, setInfoCallback, update, remove };
})();

window.JARVIS = JARVIS;
