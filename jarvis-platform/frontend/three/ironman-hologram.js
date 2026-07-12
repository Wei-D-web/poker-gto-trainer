/* ==========================================
   J.A.R.V.I.S. — Iron Man Particle Hologram v2
   Edge-emphasized silhouette: helmet contour,
   angular faceplate, eye slits, arc reactor,
   shoulder pauldrons, repulsor palms.
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.IronManHologram = (function () {
  let group;
  let bodyPoints, bodyGeo, bodyMat;
  let reactorRing, reactorCore;
  let originalPositions;
  let active = false;
  let targetActive = false;
  let currentScale = 1.0;

  // ── Helper: add a particle to the array ──
  function addPoint(arr, x, y, z, brightness) {
    arr.push({ x, y, z, brightness: brightness || 0.8 });
  }

  // ── Helper: fill a sphere surface with points ──
  function fillSphere(arr, cx, cy, cz, rx, ry, rz, count, brightness) {
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      arr.push({
        x: cx + rx * Math.sin(phi) * Math.cos(theta),
        y: cy + ry * Math.cos(phi),
        z: cz + rz * Math.sin(phi) * Math.sin(theta),
        brightness: brightness || 0.6,
      });
    }
  }

  // ── Helper: draw a line of particles between two points ──
  function drawLine(arr, x1, y1, z1, x2, y2, z2, count, brightness) {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      arr.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
        z: z1 + (z2 - z1) * t,
        brightness: brightness || 1.5,
      });
    }
  }

  // ── Helper: draw a circle/ring ──
  function drawRing(arr, cx, cy, cz, rx, rz, count, brightness) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      arr.push({
        x: cx + Math.cos(a) * rx,
        y: cy + (Math.random() - 0.5) * 0.03,
        z: cz + Math.sin(a) * rz,
        brightness: brightness || 1.8,
      });
    }
  }

  // ── Build recognizable Iron Man silhouette ──
  function buildIronManPoints() {
    const pts = [];
    const H = 1.8; // helmet center Y

    // ═══════════════════════════════════════════
    // 1. HELMET — flattened sphere, faceplate pushed forward
    // ═══════════════════════════════════════════
    // Back/sides of head — sphere, slightly flattened
    fillSphere(pts, 0, H + 0.05, -0.05, 0.82, 0.75, 0.80, 600, 0.5);

    // Top of head — dome
    fillSphere(pts, 0, H + 0.40, -0.10, 0.72, 0.40, 0.70, 250, 0.5);

    // Faceplate — flat-ish front surface (THE key Iron Man feature)
    // Gold/titanium faceplate region — pushed forward, angular
    fillSphere(pts, 0, H + 0.00, 0.35, 0.58, 0.52, 0.15, 350, 0.9);

    // Jaw / chin — distinct angular block below faceplate
    fillSphere(pts, 0, H - 0.50, 0.25, 0.45, 0.28, 0.25, 180, 0.7);

    // ═══════════════════════════════════════════
    // 2. HELMET CONTOUR LINES — make the shape readable
    // ═══════════════════════════════════════════
    // Crown ridge (top of head, ear to ear)
    for (let a = 0; a < Math.PI * 2; a += 0.06) {
      pts.push({
        x: Math.cos(a) * 0.82,
        y: H + 0.60 + Math.sin(a * 2) * 0.08,
        z: Math.sin(a) * 0.08 - 0.05,
        brightness: 1.6,
      });
    }

    // Brow ridge — above eyes
    drawLine(pts, -0.58, H + 0.25, 0.68, 0.58, H + 0.25, 0.68, 50, 1.8);

    // Cheekbone lines — sides of faceplate
    drawLine(pts, -0.52, H + 0.10, 0.42, -0.52, H - 0.30, 0.28, 30, 1.5);
    drawLine(pts, 0.52, H + 0.10, 0.42, 0.52, H - 0.30, 0.28, 30, 1.5);

    // Jawline — V-shape under chin
    drawLine(pts, -0.40, H - 0.50, 0.28, 0, H - 0.72, 0.30, 25, 1.8);
    drawLine(pts, 0.40, H - 0.50, 0.28, 0, H - 0.72, 0.30, 25, 1.8);

    // ═══════════════════════════════════════════
    // 3. EYES — two bright angled slits (MOST IMPORTANT for recognition)
    // ═══════════════════════════════════════════
    for (let side = -1; side <= 1; side += 2) {
      // Eye slit: angled rectangular shape
      const ex1 = side * 0.16, ey1 = H + 0.28, ez1 = 0.68;
      const ex2 = side * 0.52, ey2 = H + 0.12, ez2 = 0.72;
      drawLine(pts, ex1, ey1, ez1, ex2, ey2, ez2, 25, 4.0);

      // Upper eye lid (thicker)
      drawLine(pts, ex1, ey1 + 0.03, ez1, ex2, ey2 + 0.03, ez2, 20, 3.5);

      // Lower eye lid
      drawLine(pts, ex1, ey1 - 0.03, ez1, ex2, ey2 - 0.03, ez2, 20, 3.5);
    }

    // Eye laser beams — extending forward
    for (let side = -1; side <= 1; side += 2) {
      const lx = side * 0.34, ly = H + 0.20, lz = 0.70;
      drawLine(pts, lx, ly, lz, lx * 0.8, ly - 0.15, lz + 3.5, 40, 3.5);
      drawLine(pts, lx, ly, lz, lx * 1.05, ly - 0.18, lz + 2.5, 25, 2.8);
    }

    // ═══════════════════════════════════════════
    // 4. NECK
    // ═══════════════════════════════════════════
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      pts.push({
        x: Math.cos(a) * 0.22,
        y: H - 0.80 + (Math.random() - 0.5) * 0.20,
        z: Math.sin(a) * 0.22 + 0.05,
        brightness: 0.4,
      });
    }

    // ═══════════════════════════════════════════
    // 5. TORSO — wide chest, narrow waist
    // ═══════════════════════════════════════════
    const chestTop = H - 0.98;

    // Upper chest — wide, angular, hex-like cross section
    for (let i = 0; i < 500; i++) {
      const a = (i / 500) * Math.PI * 2;
      const y = chestTop - 1.3 * Math.random();
      const hexR = 1.35 * (0.85 + 0.15 * Math.cos(a * 3)); // hexagonal
      pts.push({
        x: Math.cos(a) * hexR * (1 - 0.15 * Math.abs(y - chestTop + 0.5) / 1.3),
        y: y,
        z: Math.sin(a) * hexR * (1 - 0.15 * Math.abs(y - chestTop + 0.5) / 1.3),
        brightness: 0.4 + (z > 0.4 ? 0.3 : 0),
      });
    }

    // Chest contour lines — front chest plate edges
    drawLine(pts, -0.60, chestTop - 0.10, 1.00, 0.60, chestTop - 0.10, 1.00, 40, 1.2);
    drawLine(pts, -0.85, chestTop - 0.50, 0.90, 0.85, chestTop - 0.50, 0.90, 40, 1.2);
    drawLine(pts, -1.10, chestTop - 1.00, 0.75, 1.10, chestTop - 1.00, 0.75, 40, 1.0);
    // Side torso contour
    drawLine(pts, 1.30, chestTop - 0.30, 0.20, 0.95, chestTop - 1.80, 0.15, 35, 1.2);
    drawLine(pts, -1.30, chestTop - 0.30, 0.20, -0.95, chestTop - 1.80, 0.15, 35, 1.2);

    // ═══════════════════════════════════════════
    // 6. ARC REACTOR — bright triangle-in-circle (ICONIC)
    // ═══════════════════════════════════════════
    const rY = chestTop - 0.25;
    const rZ = 1.20;

    // Outer ring
    drawRing(pts, 0, rY, rZ, 0.28, 0.28, 80, 2.8);

    // Inner ring
    drawRing(pts, 0, rY, rZ, 0.18, 0.18, 50, 2.5);

    // Triangle inside (arc reactor core element)
    const triR = 0.14;
    for (let corner = 0; corner < 3; corner++) {
      const a1 = (corner / 3) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((corner + 1) / 3) * Math.PI * 2 - Math.PI / 2;
      drawLine(pts,
        Math.cos(a1) * triR, rY, rZ + Math.sin(a1) * triR,
        Math.cos(a2) * triR, rY, rZ + Math.sin(a2) * triR,
        15, 3.5
      );
    }

    // Center glow dot
    for (let i = 0; i < 30; i++) {
      pts.push({
        x: (Math.random() - 0.5) * 0.08,
        y: rY + (Math.random() - 0.5) * 0.04,
        z: rZ + (Math.random() - 0.5) * 0.04,
        brightness: 4.0,
      });
    }

    // ═══════════════════════════════════════════
    // 7. SHOULDERS / PAULDRONS
    // ═══════════════════════════════════════════
    for (let side = -1; side <= 1; side += 2) {
      const sx = side * 1.55;
      const sy = chestTop + 0.15;
      const sz = 0.05;

      // Pauldron dome
      fillSphere(pts, sx, sy, sz, 0.48, 0.38, 0.42, 200, 0.6);

      // Pauldron trim ring
      drawRing(pts, sx, sy, sz, 0.48, 0.42, 35, 1.5);
    }

    // ═══════════════════════════════════════════
    // 8. UPPER ARMS
    // ═══════════════════════════════════════════
    for (let side = -1; side <= 1; side += 2) {
      const ax = side * 1.55;
      for (let i = 0; i < 200; i++) {
        const a = Math.random() * Math.PI * 2;
        const y = chestTop - 0.70 - Math.random() * 1.1;
        const r = 0.24 + (y - chestTop + 1.25) * 0.02;
        pts.push({
          x: ax + Math.cos(a) * r,
          y: y,
          z: 0.05 + Math.sin(a) * r,
          brightness: 0.4,
        });
      }
    }

    // ═══════════════════════════════════════════
    // 9. FOREARMS — with repulsor glow
    // ═══════════════════════════════════════════
    for (let side = -1; side <= 1; side += 2) {
      const fx = side * 1.50;
      for (let i = 0; i < 150; i++) {
        const a = Math.random() * Math.PI * 2;
        const y = chestTop - 1.90 - Math.random() * 0.7;
        pts.push({
          x: fx + Math.cos(a) * 0.22,
          y: y,
          z: 0.08 + Math.sin(a) * 0.22,
          brightness: 0.4,
        });
      }

      // Gauntlet (thicker wrist)
      for (let i = 0; i < 80; i++) {
        const a = Math.random() * Math.PI * 2;
        const y = chestTop - 2.45 + (Math.random() - 0.5) * 0.30;
        pts.push({
          x: fx + Math.cos(a) * 0.28,
          y: y,
          z: 0.08 + Math.sin(a) * 0.28,
          brightness: 0.7,
        });
      }

      // Repulsor palm glow
      const py = chestTop - 2.60;
      for (let i = 0; i < 25; i++) {
        pts.push({
          x: fx + (Math.random() - 0.5) * 0.10,
          y: py + (Math.random() - 0.5) * 0.06,
          z: 0.08 + (Math.random() - 0.5) * 0.10,
          brightness: 3.5,
        });
      }
    }

    return pts;
  }

  // ── Init ──
  function init(scene) {
    console.log('%c[IronMan] %cinit() starting...', 'color: #F59E0B;', 'color: #FF0000;');
    if (!scene || typeof THREE === 'undefined') {
      console.error('[IronMan] Missing scene or THREE');
      return null;
    }

    group = new THREE.Group();
    group.position.set(0, -0.2, 0.3);
    group.scale.set(0.8, 0.8, 0.8);
    group.visible = true;

    // ═══ DEBUG: big red ring to confirm scene works ═══
    var debugGeo = new THREE.TorusGeometry(0.6, 0.04, 16, 48);
    var debugMat = new THREE.MeshBasicMaterial({
      color: '#FF4444', transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    var debugRing = new THREE.Mesh(debugGeo, debugMat);
    debugRing.position.set(0, 2.2, 0);
    group.add(debugRing);
    console.log('[IronMan] DEBUG red ring added');

    // ═══ BUILD PARTICLE BODY ═══
    let count = 0;
    try {
      const allPoints = buildIronManPoints();
      count = Math.min(allPoints.length, 6000);

      bodyGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const p = allPoints[i];
        const i3 = i * 3;
        positions[i3] = p.x;
        positions[i3 + 1] = p.y;
        positions[i3 + 2] = p.z;

        const b = p.brightness || 0.5;
        if (b > 2.5) {
          colors[i3] = 1.0; colors[i3 + 1] = 1.0; colors[i3 + 2] = 1.0; // white hot
        } else if (b > 1.5) {
          colors[i3] = 0.5; colors[i3 + 1] = 0.75; colors[i3 + 2] = 1.0; // bright blue
        } else if (b > 0.8) {
          colors[i3] = 0.2; colors[i3 + 1] = 0.5; colors[i3 + 2] = 0.9; // medium blue
        } else {
          colors[i3] = 0.1; colors[i3 + 1] = 0.3; colors[i3 + 2] = 0.65; // dim blue
        }
        sizes[i] = b > 2.5 ? 0.07 : b > 1.5 ? 0.05 : 0.03;
      }

      bodyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      bodyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      bodyGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      originalPositions = new Float32Array(positions);

      // Glow texture
      const canvas = document.createElement('canvas');
      canvas.width = 32; canvas.height = 32;
      const ctx = canvas.getContext('2d');
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.12, 'rgba(180,220,255,0.85)');
      g.addColorStop(0.4, 'rgba(59,130,246,0.25)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);

      bodyMat = new THREE.PointsMaterial({
        size: 0.08,
        map: new THREE.CanvasTexture(canvas),
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.85,
      });

      bodyPoints = new THREE.Points(bodyGeo, bodyMat);
      group.add(bodyPoints);
      console.log('%c[IronMan] %cBody built: ' + count + ' particles', 'color: #F59E0B;', 'color: #10B981;');

    } catch (e) {
      console.error('[IronMan] Body build error:', e.message, e.stack);
      bodyPoints = null; bodyGeo = null; bodyMat = null;
    }

    // ═══ ARC REACTOR GLOW MESH ═══
    const rY = 1.8 - 0.98 - 0.25; // same as reactor Y in buildIronManPoints
    const rZ = 1.20;

    reactorCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 32, 32),
      new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    reactorCore.position.set(0, rY, rZ);

    reactorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.02, 16, 48),
      new THREE.MeshBasicMaterial({ color: '#60A5FA', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    reactorRing.position.set(0, rY, rZ);

    group.add(reactorCore);
    group.add(reactorRing);

    scene.add(group);
    console.log('%c[IronMan] %cGroup added to scene. DONE.', 'color: #F59E0B;', 'color: #10B981;');
    return group;
  }

  // ── Update ──
  function update(delta, elapsed) {
    if (!group) return;

    active += (targetActive ? 1.0 : 0.0 - active) * 0.08;
    const targetScale = active > 0.01 ? 1.0 : 0.01;
    currentScale += (targetScale - currentScale) * 0.1;

    if (currentScale < 0.02) { group.visible = false; return; }
    group.visible = true;
    group.scale.setScalar(currentScale);

    const levels = (JARVIS.AudioAnalyzer && JARVIS.AudioAnalyzer.getLevels)
      ? JARVIS.AudioAnalyzer.getLevels() : { bass: 0, mid: 0, treble: 0, volume: 0 };
    const bass = levels.bass || 0;
    const vol = levels.volume || 0;

    group.rotation.y += delta * 0.10;
    group.rotation.x = Math.sin(elapsed * 0.4) * 0.03;

    // Body particle shimmer
    if (bodyPoints && bodyGeo && bodyMat && originalPositions) {
      bodyPoints.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.012 + bass * 0.03);

      const arr = bodyGeo.attributes.position.array;
      const n = Math.min(arr.length / 3, originalPositions.length / 3);
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const sh = 0.012 + bass * 0.03;
        arr[i3] = originalPositions[i3] + Math.sin(elapsed * 12 + i * 0.6) * sh;
        arr[i3 + 1] = originalPositions[i3 + 1] + Math.cos(elapsed * 10 + i * 0.8) * sh;
        arr[i3 + 2] = originalPositions[i3 + 2] + Math.sin(elapsed * 11 + i * 0.5) * sh;
      }
      bodyGeo.attributes.position.needsUpdate = true;
      bodyMat.opacity = (0.5 + vol * 0.35 + bass * 0.2) * Math.min(1, currentScale);
    }

    // Reactor pulse
    if (reactorCore && reactorRing) {
      const pulse = 1 + bass * 1.2 + vol * 0.6 + Math.sin(elapsed * 3.5) * 0.25;
      reactorCore.scale.setScalar(pulse);
      reactorCore.material.opacity = (0.5 + bass * 0.4 + vol * 0.5) * Math.min(1, currentScale);
      reactorRing.scale.setScalar(1 + bass * 0.5);
      reactorRing.material.opacity = (0.4 + bass * 0.4 + vol * 0.4) * Math.min(1, currentScale);
      reactorRing.rotation.z += delta * 1.0;
      reactorRing.rotation.y += delta * 0.7;
    }
  }

  function setActive(val) { targetActive = val; }
  function isActive() { return active > 0.1; }
  function toggle() { setActive(!targetActive); return targetActive; }

  return { init, update, setActive, isActive, toggle };
})();

window.JARVIS = JARVIS;
