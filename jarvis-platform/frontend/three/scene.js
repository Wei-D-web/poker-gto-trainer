/* ==========================================
   J.A.R.V.I.S. — Three.js Arc Reactor Core
   Iron Man-style holographic reactor with
   triangular rings, energy flow, and state-driven animations
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Scene = (function () {
  let scene, camera, renderer, clock;
  let animationId;
  let coreGroup, coreSphere, coreWire, coreLight;
  let reactorRings = [];
  let energyFlows = [];
  let crossFrame;
  let hexPlane;
  let coreIntensity = 0.3;
  let targetCoreIntensity = 0.3;

  // ── Core glow shader (smaller, more intense arc point) ──
  const coreVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const coreFragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    void main() {
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
      float dist = length(vPosition) / 0.6;
      float core = exp(-dist * 4.5);
      float pulse = 0.7 + 0.3 * sin(uTime * 3.0) * uIntensity;
      float flicker = 0.92 + 0.08 * sin(uTime * 18.0 + vPosition.y * 10.0) * sin(uTime * 13.0 + vPosition.x * 8.0);
      float alpha = (core * 0.9 + fresnel * 0.55) * pulse * flicker * (0.5 + uIntensity * 0.5);
      vec3 color = mix(uColor1, uColor2, core * 0.5 + fresnel * 0.5);
      color = mix(vec3(1.0, 1.0, 1.0), color, smoothstep(0.0, 0.35, dist));
      // Cyan fringe at very edge
      color = mix(color, vec3(0.024, 0.714, 0.831), fresnel * 0.3);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  // ── Hex grid shader (unchanged — excellent as-is) ──
  const hexVertexShader = `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const hexFragmentShader = `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform float uTime;
    uniform float uOpacity;
    float hexDist(vec2 p) {
      vec2 r = vec2(1.0, 1.7320508);
      vec2 h = r * 0.5;
      vec2 a = mod(p, r) - h;
      vec2 b = mod(p - h, r) - h;
      vec2 gv = dot(a, a) < dot(b, b) ? a : b;
      return length(gv);
    }
    void main() {
      float scale = 18.0;
      vec2 uv = vUv * scale;
      float d = hexDist(uv);
      float line = smoothstep(0.04, 0.0, d) * 0.15;
      float edgeFade = 1.0 - smoothstep(0.3, 0.8, length(vUv - 0.5) * 2.0);
      float pulse = 0.7 + 0.3 * sin(uTime * 0.4);
      float alpha = line * edgeFade * pulse * uOpacity;
      vec3 color1 = vec3(0.23, 0.51, 0.96);
      vec3 color2 = vec3(1.0, 0.72, 0.15);
      vec3 color = mix(color1, color2, 0.35 + 0.65 * vUv.x);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  function init(containerId = 'three-bg') {
    const container = document.getElementById(containerId);
    if (!container) return null;

    // ── Scene ──
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#0a1018', 0.00006);

    // ── Camera ──
    camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 11);
    camera.lookAt(0, 0, 0);

    // ── Renderer ──
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.0;
    container.appendChild(renderer.domElement);

    // ── Clock ──
    clock = new THREE.Clock();

    // ═══════════════════════════════════════
    // ARC REACTOR CORE
    // ═══════════════════════════════════════
    coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // ── Center Arc Point (small intense sphere) ──
    const coreGeo = new THREE.SphereGeometry(0.55, 64, 64);
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.3 },
        uColor1: { value: new THREE.Color('#FFFFFF') },
        uColor2: { value: new THREE.Color('#3B82F6') },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    coreSphere = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreSphere);

    // Wireframe icosahedron cage (geometric "triangular" look)
    const cageGeo = new THREE.IcosahedronGeometry(0.68, 1);
    const cageMat = new THREE.MeshBasicMaterial({
      color: '#60A5FA',
      wireframe: true,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    coreWire = new THREE.Mesh(cageGeo, cageMat);
    coreGroup.add(coreWire);

    // ── Cross-Frame (arc reactor's internal support structure) ──
    crossFrame = new THREE.Group();
    const beamGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.2, 6);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#60A5FA',
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 4; i++) {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.rotation.z = Math.PI / 2;
      beam.rotation.y = (i / 4) * Math.PI;
      crossFrame.add(beam);
    }
    coreGroup.add(crossFrame);

    // ── Triangular Concentric Reactor Rings ──
    // Arc reactor has ~10 concentric rings at increasing radii
    const ringConfigs = [
      { radius: 0.80, tubularSegments: 6,  color: '#FFFFFF', opacity: 0.45, speed: 1.8,  dir: 1 },
      { radius: 0.95, tubularSegments: 8,  color: '#60A5FA', opacity: 0.40, speed: -1.4, dir: -1 },
      { radius: 1.10, tubularSegments: 12, color: '#3B82F6', opacity: 0.35, speed: 1.2,  dir: 1 },
      { radius: 1.28, tubularSegments: 8,  color: '#06B6D4', opacity: 0.30, speed: -1.0, dir: -1 },
      { radius: 1.48, tubularSegments: 16, color: '#F97316', opacity: 0.28, speed: 0.85, dir: 1 },
      { radius: 1.70, tubularSegments: 8,  color: '#60A5FA', opacity: 0.25, speed: -0.7, dir: -1 },
      { radius: 1.95, tubularSegments: 20, color: '#8B5CF6', opacity: 0.22, speed: 0.6,  dir: 1 },
      { radius: 2.22, tubularSegments: 12, color: '#3B82F6', opacity: 0.20, speed: -0.5, dir: -1 },
      { radius: 2.52, tubularSegments: 24, color: '#06B6D4', opacity: 0.18, speed: 0.42, dir: 1 },
      { radius: 2.85, tubularSegments: 16, color: '#F97316', opacity: 0.15, speed: -0.35,dir: -1 },
    ];

    ringConfigs.forEach((cfg) => {
      const ringGeo = new THREE.TorusGeometry(cfg.radius, 0.01, cfg.tubularSegments, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.userData = {
        speedX: (0.15 + Math.random() * 0.2) * cfg.dir,
        speedY: (0.1 + Math.random() * 0.15) * cfg.dir * (Math.random() > 0.5 ? 1 : -1),
        speedZ: cfg.speed * 0.15 * cfg.dir,
        baseOpacity: cfg.opacity,
        radius: cfg.radius,
      };
      coreGroup.add(ring);
      reactorRings.push(ring);
    });

    // ── Energy Flow Particles (along selected rings) ──
    // Create small glowing dots that orbit along the ring circumferences
    const flowRingIndices = [1, 3, 5, 7]; // which rings get energy flows
    flowRingIndices.forEach((ri) => {
      if (ri >= ringConfigs.length) return;
      const cfg = ringConfigs[ri];
      const dotCount = 8 + ri * 2;
      for (let i = 0; i < dotCount; i++) {
        const dotGeo = new THREE.SphereGeometry(0.025, 6, 6);
        const dotMat = new THREE.MeshBasicMaterial({
          color: ri % 2 === 0 ? '#FFFFFF' : '#60A5FA',
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.userData = {
          parentRingIndex: ri,
          parentRadius: cfg.radius,
          angle: (i / dotCount) * Math.PI * 2,
          speed: 1.5 + Math.random() * 2.5,
          baseY: (Math.random() - 0.5) * 0.04,
        };
        coreGroup.add(dot);
        energyFlows.push(dot);
      }
    });

    // ── Outer Casing Ring (thicker, gear-like) ──
    const casingGeo = new THREE.TorusGeometry(3.1, 0.03, 24, 120);
    const casingMat = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const casing = new THREE.Mesh(casingGeo, casingMat);
    casing.userData = {
      speedX: 0.03, speedY: 0.02, speedZ: 0.04,
      baseOpacity: 0.25, radius: 3.1,
    };
    coreGroup.add(casing);
    reactorRings.push(casing); // treat as part of ring system

    // ── Core Lights ──
    coreLight = new THREE.PointLight('#3B82F6', 5.0, 12, 2);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    const warmLight = new THREE.PointLight('#F97316', 3.0, 10, 2.5);
    warmLight.position.set(0, 0, 0);
    scene.add(warmLight);

    // Ambient cyan fill
    const cyanLight = new THREE.PointLight('#06B6D4', 1.5, 14, 3);
    cyanLight.position.set(0, 0.5, 0);
    scene.add(cyanLight);

    // ═══════════════════════════════════════
    // HEX GRID BACKGROUND
    // ═══════════════════════════════════════
    const hexGeo = new THREE.PlaneGeometry(30, 30);
    const hexMat = new THREE.ShaderMaterial({
      vertexShader: hexVertexShader,
      fragmentShader: hexFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.35 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    hexPlane = new THREE.Mesh(hexGeo, hexMat);
    hexPlane.position.z = -6;
    hexPlane.rotation.x = -0.15;
    scene.add(hexPlane);

    // ── Resize ──
    window.addEventListener('resize', onResize);

    return { scene, camera, renderer, clock };
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function start(tickFn) {
    function animate() {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // ── Smooth intensity transition ──
      coreIntensity += (targetCoreIntensity - coreIntensity) * 0.06;
      coreSphere.material.uniforms.uTime.value = elapsed;
      coreSphere.material.uniforms.uIntensity.value = coreIntensity;

      // Core sphere scale breathing
      const s = 1.0 + Math.sin(elapsed * 2.0) * 0.06 * coreIntensity;
      coreSphere.scale.setScalar(s);

      // Cage wireframe rotation
      coreWire.rotation.x += delta * 0.15;
      coreWire.rotation.y += delta * 0.2;
      coreWire.rotation.z += delta * 0.1;
      const cageScale = 1.0 + Math.sin(elapsed * 1.8) * 0.03 * coreIntensity;
      coreWire.scale.setScalar(cageScale);

      // Cross-frame rotation
      crossFrame.rotation.z += delta * 0.25 * (0.5 + coreIntensity);

      // Core light intensity (pulses with intensity)
      coreLight.intensity = 3.0 + coreIntensity * 5.5 + Math.sin(elapsed * 3.5) * 1.0;
      coreLight.color.setHSL(0.58, 1, 0.55 + coreIntensity * 0.15);

      // ── Animate Reactor Rings ──
      reactorRings.forEach((ring) => {
        const d = ring.userData;
        ring.rotation.x += d.speedX * delta * (0.6 + coreIntensity * 0.6);
        ring.rotation.y += d.speedY * delta * (0.6 + coreIntensity * 0.6);
        ring.rotation.z += d.speedZ * delta * (0.6 + coreIntensity * 0.6);
        const pulse = 1 + Math.sin(elapsed * 2.5 + reactorRings.indexOf(ring) * 0.5) * 0.3 * coreIntensity;
        ring.material.opacity = Math.min(0.9, d.baseOpacity * pulse);
        // Thinking state: rings get brighter and more opaque
        if (coreIntensity > 0.5) {
          ring.material.opacity = Math.min(0.9, d.baseOpacity * (1.3 + coreIntensity * 0.8));
        }
      });

      // ── Animate Energy Flow Particles ──
      energyFlows.forEach((dot) => {
        const d = dot.userData;
        d.angle += d.speed * delta * (0.5 + coreIntensity);
        if (d.angle > Math.PI * 2) d.angle -= Math.PI * 2;
        // Position on ring circumference
        dot.position.x = Math.cos(d.angle) * d.parentRadius;
        dot.position.z = Math.sin(d.angle) * d.parentRadius;
        dot.position.y = d.baseY + Math.sin(elapsed * 3 + d.angle) * 0.03 * coreIntensity;
        // Scale pulse
        const dotScale = 0.7 + Math.sin(elapsed * 4 + d.angle) * 0.4 * (0.3 + coreIntensity);
        dot.scale.setScalar(dotScale);
        dot.material.opacity = 0.5 + coreIntensity * 0.5 + Math.sin(elapsed * 3 + d.angle) * 0.3;
      });

      // ── Animate Hex Grid ──
      hexPlane.material.uniforms.uTime.value = elapsed;
      hexPlane.rotation.z += delta * 0.012;

      // ── Subtle camera drift ──
      camera.position.x += (Math.sin(elapsed * 0.18) * 0.35 - camera.position.x) * 0.004;
      camera.position.y += (1.5 + Math.sin(elapsed * 0.13) * 0.5 - camera.position.y) * 0.004;
      camera.lookAt(0, 0, 0);

      if (tickFn) tickFn(delta, elapsed);

      renderer.render(scene, camera);
    }
    animate();
  }

  function stop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function setCoreIntensity(value) {
    targetCoreIntensity = Math.max(0, Math.min(1, value));
  }

  function pulseCore(strength = 0.8) {
    targetCoreIntensity = Math.min(1, coreIntensity + strength);
    setTimeout(() => { targetCoreIntensity = Math.max(0.15, targetCoreIntensity - strength * 0.7); }, 300);
  }

  function getScene() { return scene; }
  function getCamera() { return camera; }
  function getRenderer() { return renderer; }
  function getClock() { return clock; }
  function getCoreIntensity() { return coreIntensity; }

  // ── Theme: Change core color for armor skins ──
  function setCoreColor(hexColor) {
    if (!coreSphere) return;
    coreSphere.material.uniforms.uColor2.value = new THREE.Color(hexColor);
    // Update cage wireframe color
    if (coreWire) coreWire.material.color.set(hexColor);
    // Update core light
    if (coreLight) coreLight.color.set(hexColor);
    // Update cross-frame beams
    if (crossFrame) {
      crossFrame.children.forEach(function(beam) {
        beam.material.color.set(hexColor);
      });
    }
  }

  return { init, start, stop, getScene, getCamera, getRenderer, getClock, setCoreIntensity, pulseCore, getCoreIntensity, setCoreColor };
})();

window.JARVIS = JARVIS;
