/* ==========================================
   J.A.R.V.I.S. — Three.js Scene Setup
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Scene = (function () {
  let scene, camera, renderer, clock;
  let animationId;
  let coreGroup, coreSphere, coreWire, coreLight;
  let coreRings = [];
  let hexPlane;
  let coreIntensity = 0.3; // 0..1 base idle pulse
  let targetCoreIntensity = 0.3;

  // ── Core glow shader ──
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
      // Fresnel — brighter at edges
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
      // Radial from center
      float dist = length(vPosition) / 1.2;
      float core = exp(-dist * 3.5);
      // Pulse
      float pulse = 0.7 + 0.3 * sin(uTime * 2.5) * uIntensity;
      // Noise-like flicker
      float flicker = 0.9 + 0.1 * sin(uTime * 15.0 + vPosition.y * 8.0) * sin(uTime * 11.0 + vPosition.x * 6.0);
      // Combine
      float alpha = (core * 0.8 + fresnel * 0.5) * pulse * flicker * (0.6 + uIntensity * 0.4);
      vec3 color = mix(uColor1, uColor2, core * 0.6 + fresnel * 0.4);
      // Hot white center
      color = mix(vec3(1.0, 1.0, 1.0), color, smoothstep(0.0, 0.4, dist));
      gl_FragColor = vec4(color, alpha);
    }
  `;

  // ── Hex grid shader ──
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
    // Hex grid function
    float hexDist(vec2 p) {
      vec2 r = vec2(1.0, 1.7320508); // aspect: hex height = sqrt(3) * width
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
      // Line width
      float line = smoothstep(0.04, 0.0, d) * 0.15;
      // Fade toward edges
      float edgeFade = 1.0 - smoothstep(0.3, 0.8, length(vUv - 0.5) * 2.0);
      // Slow pulse
      float pulse = 0.7 + 0.3 * sin(uTime * 0.4);
      float alpha = line * edgeFade * pulse * uOpacity;
      // Blue-orange gradient across the plane
      vec3 color1 = vec3(0.23, 0.51, 0.96); // blue
      vec3 color2 = vec3(0.98, 0.45, 0.09); // orange
      vec3 color = mix(color1, color2, vUv.x);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  function init(containerId = 'three-bg') {
    const container = document.getElementById(containerId);
    if (!container) return null;

    // ── Scene ──
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#05080C', 0.00015);

    // ── Camera ──
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 12);
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
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // ── Clock ──
    clock = new THREE.Clock();

    // ═══════════════════════════════════════
    // CENTRAL HOLOGRAPHIC CORE
    // ═══════════════════════════════════════
    coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Core sphere — glowing shader orb
    const coreGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.3 },
        uColor1: { value: new THREE.Color('#3B82F6') },
        uColor2: { value: new THREE.Color('#F97316') },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    coreSphere = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreSphere);

    // Wireframe overlay — slightly larger
    const wireGeo = new THREE.SphereGeometry(1.08, 32, 32);
    const wireMat = new THREE.MeshBasicMaterial({
      color: '#60A5FA',
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    coreWire = new THREE.Mesh(wireGeo, wireMat);
    coreGroup.add(coreWire);

    // Concentric core rings (tight, close to core)
    for (let i = 0; i < 3; i++) {
      const radius = 1.25 + i * 0.25;
      const ringGeo = new THREE.TorusGeometry(radius, 0.008, 8, 80);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 1 ? '#F97316' : '#60A5FA',
        transparent: true,
        opacity: 0.35 - i * 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.userData = {
        speedX: (0.2 + i * 0.1) * (i % 2 === 0 ? 1 : -1),
        speedY: (0.15 + i * 0.05) * (i === 1 ? -1 : 1),
        speedZ: (0.3 + i * 0.12) * (i === 2 ? -1 : 1),
        baseOpacity: 0.35 - i * 0.08,
      };
      coreGroup.add(ring);
      coreRings.push(ring);
    }

    // Core point light
    coreLight = new THREE.PointLight('#3B82F6', 2.5, 8, 1.5);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // Secondary warm light for orange accent
    const warmLight = new THREE.PointLight('#F97316', 1.2, 6, 2);
    warmLight.position.set(0, 0, 0);
    scene.add(warmLight);

    // ═══════════════════════════════════════
    // HEX GRID BACKGROUND
    // ═══════════════════════════════════════
    const hexGeo = new THREE.PlaneGeometry(30, 30);
    const hexMat = new THREE.ShaderMaterial({
      vertexShader: hexVertexShader,
      fragmentShader: hexFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.25 },
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
      const delta = Math.min(clock.getDelta(), 0.1); // cap delta to avoid jumps
      const elapsed = clock.getElapsedTime();

      // ── Animate Core ──
      // Smooth intensity transition
      coreIntensity += (targetCoreIntensity - coreIntensity) * 0.05;
      coreSphere.material.uniforms.uTime.value = elapsed;
      coreSphere.material.uniforms.uIntensity.value = coreIntensity;

      // Core sphere scale breathing
      const s = 1.0 + Math.sin(elapsed * 1.5) * 0.04 * coreIntensity;
      coreSphere.scale.setScalar(s);
      coreWire.scale.setScalar(s);

      // Core light intensity
      coreLight.intensity = 2.5 + coreIntensity * 4.0 + Math.sin(elapsed * 3.0) * 0.8;

      // Animate core rings
      coreRings.forEach((ring) => {
        const d = ring.userData;
        ring.rotation.x += d.speedX * delta;
        ring.rotation.y += d.speedY * delta;
        ring.rotation.z += d.speedZ * delta;
        const pulse = 1 + Math.sin(elapsed * 2.0 + coreRings.indexOf(ring)) * 0.25 * coreIntensity;
        ring.material.opacity = d.baseOpacity * pulse;
      });

      // ── Animate Hex Grid ──
      hexPlane.material.uniforms.uTime.value = elapsed;
      hexPlane.rotation.z += delta * 0.015;

      // ── Subtle camera drift ──
      camera.position.x += (Math.sin(elapsed * 0.2) * 0.3 - camera.position.x) * 0.005;
      camera.position.y += (2 + Math.sin(elapsed * 0.15) * 0.5 - camera.position.y) * 0.005;
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

  /**
   * Set core intensity for state-based pulsing.
   * @param {number} value — 0.0 (dim) to 1.0 (full bright pulse)
   */
  function setCoreIntensity(value) {
    targetCoreIntensity = Math.max(0, Math.min(1, value));
  }

  function pulseCore(strength = 0.8) {
    // Immediate burst — set target high then let it decay
    targetCoreIntensity = Math.min(1, coreIntensity + strength);
    // Schedule decay
    setTimeout(() => { targetCoreIntensity = Math.max(0.2, targetCoreIntensity - strength * 0.7); }, 300);
  }

  function getScene() { return scene; }
  function getCamera() { return camera; }
  function getRenderer() { return renderer; }
  function getClock() { return clock; }
  function getCoreIntensity() { return coreIntensity; }

  return { init, start, stop, getScene, getCamera, getRenderer, getClock, setCoreIntensity, pulseCore, getCoreIntensity };
})();

window.JARVIS = JARVIS;
