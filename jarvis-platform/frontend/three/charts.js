/* ==========================================
   J.A.R.V.I.S. — 3D Holographic Charts
   Bar charts, scatter plots, data visualization
   in Three.js holographic style
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Charts = (function () {
  let group;
  let currentChart = null; // 'bars' | 'scatter' | null
  let chartObjects = [];
  let raycaster, mouse;
  let hoveredObj = null;

  function init(scene) {
    group = new THREE.Group();
    group.position.set(0, 0.5, 0);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    scene.add(group);
    setupInteraction();
    return group;
  }

  // ═══════════════════════════════════════
  // 3D BAR CHART
  // ═══════════════════════════════════════
  function showBarChart(data) {
    clearChart();
    currentChart = 'bars';

    // data: { labels: string[], values: number[], title?: string, colors?: string[] }
    const labels = data.labels || [];
    const values = data.values || [];
    const colors = data.colors || ['#3B82F6', '#06B6D4', '#8B5CF6', '#F97316', '#10B981', '#F59E0B'];
    const maxVal = Math.max(...values, 1);
    const barCount = values.length;
    const spacing = 1.0;
    const totalWidth = barCount * spacing;
    const startX = -totalWidth / 2 + spacing / 2;

    // Base platform
    const baseGeo = new THREE.BoxGeometry(totalWidth + 1.5, 0.08, 1.2);
    const baseMat = new THREE.MeshBasicMaterial({
      color: '#0A1628',
      transparent: true,
      opacity: 0.5,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.1;
    group.add(base);
    chartObjects.push(base);

    // Grid lines on platform
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * 4;
      const gridGeo = new THREE.BoxGeometry(totalWidth + 1.0, 0.01, 0.005);
      const gridMat = new THREE.MeshBasicMaterial({
        color: '#3B82F6',
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      });
      const grid = new THREE.Mesh(gridGeo, gridMat);
      grid.position.y = y;
      group.add(grid);
      chartObjects.push(grid);
    }

    // Bars
    values.forEach((val, i) => {
      const h = Math.max(0.15, (val / maxVal) * 4);
      const color = colors[i % colors.length];

      // Main bar
      const barGeo = new THREE.BoxGeometry(0.5, h, 0.5);
      const barMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(startX + i * spacing, h / 2, 0);
      bar.userData = {
        type: 'bar',
        index: i,
        label: labels[i],
        value: val,
        color: color,
        baseHeight: h,
        targetHeight: h,
      };
      group.add(bar);
      chartObjects.push(bar);

      // Wireframe overlay
      const wireGeo = new THREE.BoxGeometry(0.5, h, 0.5);
      const wireMat = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.copy(bar.position);
      group.add(wire);
      chartObjects.push(wire);

      // Glow top edge
      const topGeo = new THREE.BoxGeometry(0.52, 0.02, 0.52);
      const topMat = new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(startX + i * spacing, h + 0.01, 0);
      top.userData = { type: 'bar-top', parentBar: bar };
      group.add(top);
      chartObjects.push(top);

      // Label (small text plate)
      const labelGeo = new THREE.PlaneGeometry(0.5, 0.15);
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 128;
      labelCanvas.height = 36;
      const ctx = labelCanvas.getContext('2d');
      ctx.fillStyle = 'rgba(10, 18, 32, 0.8)';
      ctx.fillRect(0, 0, 128, 36);
      ctx.fillStyle = '#60A5FA';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i] || '', 64, 24);
      const labelTex = new THREE.CanvasTexture(labelCanvas);
      const labelMat = new THREE.MeshBasicMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
      });
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.set(startX + i * spacing, -0.25, 0.3);
      group.add(label);
      chartObjects.push(label);
    });

    // Animate bars up
    animateBars();
  }

  function animateBars() {
    const startTime = performance.now();
    function tick() {
      const elapsed = (performance.now() - startTime) / 1000;
      chartObjects.forEach(obj => {
        if (obj.userData.type === 'bar' && obj.userData.targetHeight) {
          const t = Math.min(1, elapsed / 0.6);
          const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
          const h = obj.userData.targetHeight * eased;
          obj.scale.y = Math.max(0.01, eased);
          obj.position.y = h / 2;
        }
        if (obj.userData.type === 'bar-top') {
          const parent = obj.userData.parentBar;
          if (parent) obj.position.y = parent.position.y + parent.scale.y * parent.userData.baseHeight / 2 + 0.01;
        }
      });
      if (elapsed < 1.0) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ═══════════════════════════════════════
  // 3D SCATTER PLOT
  // ═══════════════════════════════════════
  function showScatterPlot(data) {
    clearChart();
    currentChart = 'scatter';

    // data: { points: [{x,y,z,color?,size?,label?}], title?: string }
    const points = data.points || [];
    const range = 3;

    // Axis lines
    ['#3B82F6', '#10B981', '#F97316'].forEach((color, i) => {
      const axisGeo = new THREE.CylinderGeometry(0.012, 0.012, range * 2, 8);
      const axisMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
      const axis = new THREE.Mesh(axisGeo, axisMat);
      if (i === 0) { axis.rotation.z = Math.PI / 2; axis.position.x = 0; }    // X
      else if (i === 1) { axis.position.y = 0; }                                // Y
      else { axis.rotation.x = Math.PI / 2; axis.position.z = 0; }              // Z
      group.add(axis);
      chartObjects.push(axis);
    });

    // Grid plane
    const planeGeo = new THREE.PlaneGeometry(range * 2, range * 2);
    const planeMat = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -range;
    group.add(plane);
    chartObjects.push(plane);

    // Points
    const dotGeo = new THREE.SphereGeometry(0.06, 12, 12);
    points.forEach((pt, i) => {
      const s = pt.size || 0.06;
      const customGeo = s !== 0.06 ? new THREE.SphereGeometry(s, 12, 12) : dotGeo;
      const dotMat = new THREE.MeshBasicMaterial({
        color: pt.color || '#60A5FA',
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const dot = new THREE.Mesh(customGeo, dotMat);
      dot.position.set(
        (pt.x || 0) * range / (Math.max(...points.map(p => Math.abs(p.x || 0)), 1)),
        (pt.y || 0) * range / (Math.max(...points.map(p => Math.abs(p.y || 0)), 1)),
        (pt.z || 0) * range / (Math.max(...points.map(p => Math.abs(p.z || 0)), 1))
      );
      dot.userData = { type: 'scatter', index: i, label: pt.label, data: pt };
      group.add(dot);
      chartObjects.push(dot);

      // Glow ring
      const ringGeo = new THREE.TorusGeometry(s * 1.8, 0.008, 8, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: pt.color || '#60A5FA',
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(dot.position);
      ring.userData = { type: 'scatter-ring', parentDot: dot };
      group.add(ring);
      chartObjects.push(ring);
    });
  }

  // ── Interaction ──
  function setupInteraction() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('mousemove', (e) => {
      if (currentChart === 'bars') {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, JARVIS.Scene.getCamera());

        const intersects = raycaster.intersectObjects(
          chartObjects.filter(o => o.userData.type === 'bar')
        );

        // Reset hover
        if (hoveredObj) {
          hoveredObj.material.opacity = 0.6;
          hoveredObj = null;
        }

        if (intersects.length > 0) {
          hoveredObj = intersects[0].object;
          hoveredObj.material.opacity = 0.9;
          canvas.style.cursor = 'pointer';
        } else {
          canvas.style.cursor = 'default';
        }
      }
    });

    canvas.addEventListener('click', (e) => {
      if (!currentChart || !hoveredObj || hoveredObj.userData.type !== 'bar') return;
      const d = hoveredObj.userData;
      if (d.label && JARVIS.Chat) {
        // Pulse the bar
        if (JARVIS.Particles && JARVIS.Particles.burst) JARVIS.Particles.burst(0.3);
      }
    });
  }

  function update(delta, elapsed) {
    if (!group) return;

    // Gentle rotation
    group.rotation.y += delta * 0.08;

    // Pulse scatter dots
    if (currentChart === 'scatter') {
      chartObjects.forEach(obj => {
        if (obj.userData.type === 'scatter') {
          const s = 0.8 + Math.sin(elapsed * 2 + obj.userData.index) * 0.3;
          obj.scale.setScalar(s);
        }
        if (obj.userData.type === 'scatter-ring') {
          obj.rotation.x += delta * 0.5;
          obj.rotation.z += delta * 0.3;
          obj.material.opacity = 0.3 + Math.sin(elapsed * 2 + obj.userData.index) * 0.2;
        }
      });
    }
  }

  function clearChart() {
    chartObjects.forEach(obj => {
      group.remove(obj);
      if (obj.geometry && obj.geometry !== chartObjects.find(o => o.userData?.type === 'scatter' && o !== obj)?.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    chartObjects = [];
    currentChart = null;
    hoveredObj = null;
  }

  function remove(scene) {
    clearChart();
    scene.remove(group);
    group = null;
  }

  function getCurrent() { return currentChart; }

  return { init, showBarChart, showScatterPlot, update, clearChart, remove, getCurrent };
})();

window.JARVIS = JARVIS;
