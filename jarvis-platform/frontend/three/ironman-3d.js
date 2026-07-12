/* ==========================================
   J.A.R.V.I.S. — Iron Man 3D Model Loader
   Loads GLB/GLTF Iron Man helmet model via
   GLTFLoader. Falls back to placeholder if
   model file not found yet.
   ========================================== */

var JARVIS = window.JARVIS || {};

console.log('%c[IronMan3D] %cSCRIPT LOADED %c' + new Date().toISOString(),
  'background: #FF0000; color: #FFF; font-size: 18px;',
  'background: #FF0000; color: #FFF;',
  '');

JARVIS.IronMan3D = (function () {
  let group;
  let modelGroup;        // The loaded GLTF model
  let active = false, targetActive = false, currentScale = 1.0;
  let spotLight, fillLight, rimLight, bounceLight;
  let placeholderGroup;  // Temporary placeholder until model loads
  let eyeLasers = [];    // Laser beam meshes for eye effect
  let eyeGlows = [];     // Glow spheres at eye origin
  let eyeLights = [];    // SpotLights at eyes

  // ═══ Model file paths (check multiple locations) ═══
  const MODEL_PATHS = [
    'assets/ironman-helmet/ironman-helmet.glb',  // Primary
    'assets/ironman-helmet/scene.gltf',
    'assets/ironman-helmet/ironman.glb',
    'assets/ironman-helmet/scene.glb',
    'assets/ironman.glb',
  ];

  function createEyeLasers(parentGroup, modelBoundingBox) {
    // Clean up old lasers first
    eyeLasers.forEach(function (l) { if (l.parent) l.parent.remove(l); });
    eyeGlows.forEach(function (g) { if (g.parent) g.parent.remove(g); });
    eyeLights.forEach(function (l) { if (l.parent) l.parent.remove(l); });
    eyeLasers = [];
    eyeGlows = [];
    eyeLights = [];
    // Estimate eye positions from bounding box (upper-front of helmet)
    const box = modelBoundingBox;
    const eyeY = box.max.y - (box.max.y - box.min.y) * 0.22; // ~22% from top
    const eyeZ = box.max.z + 0.1; // slightly in front
    const eyeSpacing = (box.max.x - box.min.x) * 0.18; // ~18% of width apart

    const positions = [
      { x: -eyeSpacing, y: eyeY, z: eyeZ },
      { x: eyeSpacing, y: eyeY, z: eyeZ },
    ];

	    positions.forEach(function (pos, idx) {
	      const beamLength = 8;

	      // ═══ LAYER 1: Outer glow — wide, soft cyan-blue, very transparent ═══
	      const outerGeo = new THREE.CylinderGeometry(0.03, 0.40, beamLength, 16, 1, true);
	      const outerMat = new THREE.ShaderMaterial({
	        uniforms: { uTime: { value: 0 } },
	        vertexShader: `
	          varying vec2 vUv;
	          varying vec3 vPos;
	          void main() {
	            vUv = uv;
	            vPos = position;
	            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	          }
	        `,
	        fragmentShader: `
	          varying vec2 vUv;
	          varying vec3 vPos;
	          uniform float uTime;
	          void main() {
	            float distFade = 1.0 - smoothstep(0.0, 0.7, vUv.y);
	            float edgeFade = exp(-abs(vUv.x - 0.5) * 6.0);
	            float noise = sin(vUv.y * 60.0 + uTime * 15.0) * 0.3 +
	                         sin(vUv.y * 40.0 - uTime * 20.0 + 2.0) * 0.3 + 0.4;
	            float alpha = distFade * edgeFade * noise * 0.35;
	            gl_FragColor = vec4(vec3(0.2, 0.7, 1.0), alpha);
	          }
	        `,
	        transparent: true,
	        blending: THREE.AdditiveBlending,
	        depthWrite: false,
	      });
	      const outerBeam = new THREE.Mesh(outerGeo, outerMat);
	      outerBeam.position.copy(pos);
	      outerBeam.rotation.x = -Math.PI / 2;
	      parentGroup.add(outerBeam);
	      eyeLasers.push(outerBeam);

	      // ═══ LAYER 2: Mid glow — medium width, brighter blue-white ═══
	      const midGeo = new THREE.CylinderGeometry(0.015, 0.18, beamLength, 16, 1, true);
	      const midMat = new THREE.ShaderMaterial({
	        uniforms: { uTime: { value: 0 } },
	        vertexShader: `
	          varying vec2 vUv;
	          varying vec3 vPos;
	          void main() {
	            vUv = uv;
	            vPos = position;
	            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	          }
	        `,
	        fragmentShader: `
	          varying vec2 vUv;
	          varying vec3 vPos;
	          uniform float uTime;
	          void main() {
	            float distFade = 1.0 - smoothstep(0.0, 0.5, vUv.y);
	            float edgeFade = exp(-abs(vUv.x - 0.5) * 8.0);
	            float noise = sin(vUv.y * 50.0 + uTime * 18.0) * 0.25 +
	                         sin(vUv.y * 35.0 - uTime * 22.0 + 3.0) * 0.25 + 0.5;
	            float alpha = distFade * edgeFade * noise * 0.45;
	            gl_FragColor = vec4(vec3(0.5, 0.85, 1.0), alpha);
	          }
	        `,
	        transparent: true,
	        blending: THREE.AdditiveBlending,
	        depthWrite: false,
	      });
	      const midBeam = new THREE.Mesh(midGeo, midMat);
	      midBeam.position.copy(pos);
	      midBeam.rotation.x = -Math.PI / 2;
	      parentGroup.add(midBeam);
	      eyeLasers.push(midBeam);

	      // ═══ LAYER 3: Hot core — razor thin, blazing white ═══
	      const coreGeo = new THREE.CylinderGeometry(0.005, 0.06, beamLength, 8, 1, true);
	      const coreMat = new THREE.ShaderMaterial({
	        uniforms: { uTime: { value: 0 } },
	        vertexShader: `
	          varying vec2 vUv;
	          varying vec3 vPos;
	          void main() {
	            vUv = uv;
	            vPos = position;
	            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	          }
	        `,
	        fragmentShader: `
	          varying vec2 vUv;
	          varying vec3 vPos;
	          uniform float uTime;
	          void main() {
	            float distFade = 1.0 - smoothstep(0.0, 0.35, vUv.y);
	            float edgeFade = exp(-abs(vUv.x - 0.5) * 14.0);
	            float flicker = 0.7 + 0.3 * sin(uTime * 25.0 + vUv.y * 30.0);
	            float alpha = distFade * edgeFade * flicker * 0.7;
	            gl_FragColor = vec4(vec3(0.9, 0.95, 1.0), alpha);
	          }
	        `,
	        transparent: true,
	        blending: THREE.AdditiveBlending,
	        depthWrite: false,
	      });
	      const coreBeam = new THREE.Mesh(coreGeo, coreMat);
	      coreBeam.position.copy(pos);
	      coreBeam.rotation.x = -Math.PI / 2;
	      parentGroup.add(coreBeam);
	      eyeLasers.push(coreBeam);

	      // ═══ Energy particles flowing along the beam ═══
	      const particleCount = 30;
	      const particleGeo = new THREE.BufferGeometry();
	      const particlePositionsArr = new Float32Array(particleCount * 3);
	      const particleSizesArr = new Float32Array(particleCount);
	      for (let p = 0; p < particleCount; p++) {
	        particlePositionsArr[p * 3] = (Math.random() - 0.5) * 0.04;
	        particlePositionsArr[p * 3 + 1] = Math.random() * beamLength;
	        particlePositionsArr[p * 3 + 2] = (Math.random() - 0.5) * 0.04;
	        particleSizesArr[p] = Math.random() * 0.06 + 0.02;
	      }
	      particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositionsArr, 3));
	      particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizesArr, 1));
	      const pCanvas = document.createElement('canvas');
	      pCanvas.width = 16; pCanvas.height = 16;
	      const pCtx = pCanvas.getContext('2d');
	      const pGrad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
	      pGrad.addColorStop(0, 'rgba(255,255,255,1)');
	      pGrad.addColorStop(0.3, 'rgba(200,230,255,0.8)');
	      pGrad.addColorStop(0.7, 'rgba(100,180,255,0.2)');
	      pGrad.addColorStop(1, 'rgba(0,0,0,0)');
	      pCtx.fillStyle = pGrad; pCtx.fillRect(0, 0, 16, 16);
	      const particleTex = new THREE.CanvasTexture(pCanvas);
	      const particleMat = new THREE.PointsMaterial({
	        size: 0.08,
	        map: particleTex,
	        color: '#CCEEFF',
	        blending: THREE.AdditiveBlending,
	        depthWrite: false,
	        transparent: true,
	        opacity: 0.6,
	      });
	      const particles = new THREE.Points(particleGeo, particleMat);
	      particles.position.copy(pos);
	      particles.rotation.x = -Math.PI / 2;
	      particles.userData = {
	        basePositions: new Float32Array(particlePositionsArr),
	        beamLength: beamLength,
	      };
	      parentGroup.add(particles);
	      eyeLasers.push(particles);

	      // ── Eye glow sphere (bright point at origin) ──
	      const glowGeo = new THREE.SphereGeometry(0.10, 16, 16);
	      const glowMat = new THREE.MeshBasicMaterial({
	        color: '#FFFFFF',
	        transparent: true,
	        opacity: 0.95,
	        blending: THREE.AdditiveBlending,
	        depthWrite: false,
	      });
	      const glow = new THREE.Mesh(glowGeo, glowMat);
	      glow.position.copy(pos);
	      parentGroup.add(glow);
	      eyeGlows.push(glow);

	      // ── Eye SpotLight ──
	      const eyeLight = new THREE.SpotLight('#B0E0FF', 35, 15, Math.PI / 12, 0.15, 1);
	      eyeLight.position.copy(pos);
	      eyeLight.target.position.set(pos.x, pos.y - 1, pos.z + 8);
	      parentGroup.add(eyeLight);
	      parentGroup.add(eyeLight.target);
	      eyeLights.push(eyeLight);
	    });

	    console.log('%c[IronMan3D] %c👁️ Eye lasers armed.', 'color: #F59E0B;', 'color: #60A5FA;');
    console.log('%c[IronMan3D] %c👁️ Eye lasers armed.', 'color: #F59E0B;', 'color: #60A5FA;');
  }

  function addLighting(scene) {
    // Key light — above and in front, bright white
    spotLight = new THREE.SpotLight('#FFFFFF', 70, 30, Math.PI / 4, 0.15, 1);
    spotLight.position.set(2, 6, 6);
    scene.add(spotLight);

    // Fill light — strong front illumination
    fillLight = new THREE.PointLight('#D0E0FF', 40, 22, 2);
    fillLight.position.set(0, 2, 6);
    scene.add(fillLight);

    // Rim light — dramatic back edge glow
    rimLight = new THREE.PointLight('#FF9966', 28, 18, 2);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // Under light — bounce from below
    bounceLight = new THREE.PointLight('#6688CC', 16, 12, 2);
    bounceLight.position.set(0, -3, 2);
    scene.add(bounceLight);

    // Extra dramatic side light
    var sideLight = new THREE.PointLight('#FFCC88', 20, 12, 2);
    sideLight.position.set(5, 1, 0);
    scene.add(sideLight);

    // Front-facing hero light — directly illuminates the faceplate
    var heroLight = new THREE.PointLight('#FFFFFF', 30, 14, 2);
    heroLight.position.set(0, 1.5, 7);
    scene.add(heroLight);
  }

  function createPlaceholder() {
    const pg = new THREE.Group();

    // Glowing ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.04, 16, 48),
      new THREE.MeshStandardMaterial({
        color: '#60A5FA', emissive: '#3B82F6', emissiveIntensity: 0.8,
        metalness: 0.5, roughness: 0.4,
      })
    );
    pg.add(ring);

    // Core dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF', emissive: '#60A5FA', emissiveIntensity: 2.0,
      })
    );
    pg.add(dot);

    // ═══ LASER TEST — giant red beams, impossible to miss ═══
    console.log('%c[IronMan3D] %c🔴 Creating TEST lasers on placeholder...',
      'color: #F59E0B;', 'color: #FF0000;');
    for (var s = -1; s <= 1; s += 2) {
      var laserGeo = new THREE.CylinderGeometry(0.06, 0.25, 10, 8);
      var laserMat = new THREE.MeshBasicMaterial({
        color: '#88DDFF',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      var laser = new THREE.Mesh(laserGeo, laserMat);
      laser.position.set(s * 0.30, 0.2, 0.2);
      laser.rotation.x = -Math.PI / 2;
      laser.name = 'test-laser-' + s;
      pg.add(laser);
      eyeLasers.push(laser);
      console.log('%c[IronMan3D] %cLaser mesh added: ' + laser.name,
        'color: #FF0000;', 'color: #FF0000;');

      // Big glow sphere
      var glowGeo = new THREE.SphereGeometry(0.12, 16, 16);
      var glowMat = new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      var glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(s * 0.30, 0.2, 0.2);
      pg.add(glow);
      eyeGlows.push(glow);
    }
    console.log('%c[IronMan3D] %cLasers array length: ' + eyeLasers.length,
      'color: #FF0000;', 'color: #FF0000;');

    pg.position.set(0, 1.5, 0);
    return pg;
  }

  function tryLoadModel(scene, pathIndex) {
    if (pathIndex >= MODEL_PATHS.length) {
      console.warn('%c[IronMan3D] %cNo model found at any path. Placeholder active.',
        'color: #F59E0B;', 'color: #F97316;');
      return;
    }

    const path = MODEL_PATHS[pathIndex];
    console.log('%c[IronMan3D] %cTrying: ' + path, 'color: #F59E0B;', 'color: #60A5FA;');

    // GLTFLoader uses the global THREE
    const loader = new THREE.GLTFLoader();

    loader.load(
      path,
      // ── SUCCESS ──
      function (gltf) {
        console.log('%c[IronMan3D] %c✅ Model loaded! %c' + path,
          'color: #F59E0B;', 'color: #10B981;', 'color: #94A3B8;');

        modelGroup = gltf.scene;

        // Remove placeholder
        if (placeholderGroup && placeholderGroup.parent) {
          placeholderGroup.parent.remove(placeholderGroup);
          placeholderGroup = null;
        }

        // Configure model
        modelGroup.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            // Ensure metallic materials look good
            if (child.material && child.material.isMeshStandardMaterial) {
              child.material.needsUpdate = true;
            }
          }
        });

        // Size the model — fit nicely in view
        // Most Iron Man helmet models are life-size (~30cm). Scale to ~2 units diameter.
        const box = new THREE.Box3().setFromObject(modelGroup);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const targetSize = 4.0; // units — bigger = more prominent
          const s = targetSize / maxDim;
          modelGroup.scale.setScalar(s);
        }

        // Center the model, push slightly forward
        const center = box.getCenter(new THREE.Vector3());
        modelGroup.position.set(-center.x, -center.y - 0.5, -center.z + 1.0);

        group.add(modelGroup);

        // Attach eye lasers
        createEyeLasers(group, box);

        console.log('%c[IronMan3D] %cModel scaled & centered. %cReady, sir.',
          'color: #F59E0B;', 'color: #10B981;', 'color: #94A3B8;');
      },
      // ── PROGRESS ──
      function (xhr) {
        if (xhr.total > 0) {
          const pct = Math.round(xhr.loaded / xhr.total * 100);
          if (pct % 20 === 0 || pct === 100) {
            console.log('%c[IronMan3D] %cLoading... ' + pct + '%', 'color: #F59E0B;', 'color: #F59E0B;');
          }
        }
      },
      // ── ERROR ──
      function (err) {
        console.warn('%c[IronMan3D] %cNot found: ' + path + ' — trying next...',
          'color: #F59E0B;', 'color: #F97316;');
        tryLoadModel(scene, pathIndex + 1);
      }
    );
  }

  // ══════════════════════════
  // INIT
  // ══════════════════════════
  function init(scene, renderer) {
    console.log('%c[IronMan3D] %cStarting model loader...', 'color: #F59E0B;', 'color: #FF4444;');
    if (!scene) { console.error('[IronMan3D] No scene'); return null; }

    // Environment map for PBR reflections
    if (renderer && THREE.PMREMGenerator) {
      try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color('#1a1a2e');
        envScene.add(new THREE.Mesh(
          new THREE.SphereGeometry(50, 32, 32),
          new THREE.MeshBasicMaterial({ color: '#8899CC' })
        ));
        scene.environment = pmrem.fromScene(envScene, 0.04).texture;
        pmrem.dispose();
        console.log('%c[IronMan3D] %cEnv map ready', 'color: #F59E0B;', 'color: #60A5FA;');
      } catch (e) { console.warn('[IronMan3D] Env map failed:', e.message); }
    }

    group = new THREE.Group();
    group.position.set(0, 0.8, 1.2);
    group.scale.set(1.2, 1.2, 1.2);

    // ═══ GIANT RED SPHERE — confirms init is running ═══
    var testGeo = new THREE.SphereGeometry(0.5, 16, 16);
    var testMat = new THREE.MeshBasicMaterial({ color: '#FF0000' });
    var testSphere = new THREE.Mesh(testGeo, testMat);
    testSphere.position.set(0, 2, 0);
    group.add(testSphere);
    console.log('%c[IronMan3D] %c🔴🔴🔴 GIANT RED SPHERE ADDED — you MUST see this',
      'color: #FF0000; background: #FFF; font-size: 20px;');

    // Add placeholder while model loads
    placeholderGroup = createPlaceholder();
    group.add(placeholderGroup);

    // Add dedicated lighting
    addLighting(scene);

    // GLTFLoader loads async — wait for it if needed
    function startLoading() {
      if (typeof THREE.GLTFLoader === 'function') {
        tryLoadModel(scene, 0);
      } else {
        console.log('%c[IronMan3D] %cWaiting for GLTFLoader...', 'color: #F59E0B;', 'color: #F59E0B;');
        var checkCount = 0;
        var check = setInterval(function () {
          checkCount++;
          if (typeof THREE.GLTFLoader === 'function') {
            clearInterval(check);
            console.log('%c[IronMan3D] %cGLTFLoader ready, loading model.', 'color: #F59E0B;', 'color: #10B981;');
            tryLoadModel(scene, 0);
          } else if (checkCount > 100) {
            clearInterval(check);
            console.warn('%c[IronMan3D] %cGLTFLoader timeout — model will not load.', 'color: #F59E0B;', 'color: #EF4444;');
          }
        }, 200);
      }
    }
    startLoading();

    scene.add(group);
    console.log('%c[IronMan3D] %cLoader initialized. Waiting for model file...',
      'color: #F59E0B;', 'color: #F59E0B;');
    return group;
  }

  // ══════════════════════════
  // UPDATE
  // ══════════════════════════
  function update(delta, elapsed) {
    if (!group) return;

    active += (targetActive ? 1.0 : 0.0 - active) * 0.08;
    const ts = active > 0.01 ? 1.0 : 0.01;
    currentScale += (ts - currentScale) * 0.1;
    if (currentScale < 0.02) { group.visible = false; return; }
    group.visible = true;
    group.scale.setScalar(currentScale);

    // Slow heroic rotation
    group.rotation.y += delta * 0.3;

    // Subtle float
    group.position.y = 0.5 + Math.sin(elapsed * 0.6) * 0.3;

    // Animate placeholder ring if model hasn't loaded yet
    if (placeholderGroup && placeholderGroup.parent) {
      placeholderGroup.rotation.z += delta * 0.8;
      placeholderGroup.children.forEach(function (c, i) {
        if (c.material && c.material.emissiveIntensity !== undefined) {
          c.material.emissiveIntensity = 1.5 + Math.sin(elapsed * 3 + i) * 0.5;
        }
      });
    }

    // Spotlight follows model
    if (spotLight) {
      spotLight.position.x = Math.sin(elapsed * 0.2) * 3;
      spotLight.intensity = 45 + Math.sin(elapsed * 2) * 4;
    }

    // ── Eye laser animation ──
    eyeLasers.forEach(function (laser, i) {
      // ShaderMaterial beams (3-layer cone beams)
      if (laser.material && laser.material.uniforms && laser.material.uniforms.uTime) {
        laser.material.uniforms.uTime.value = elapsed;
      }
      // Flowing particles (THREE.Points)
      if (laser.isPoints && laser.geometry && laser.userData.basePositions) {
        var arr = laser.geometry.attributes.position.array;
        var base = laser.userData.basePositions;
        var bl = laser.userData.beamLength;
        for (var p = 0; p < arr.length; p += 3) {
          // Flow particles forward along the beam, wrap around
          arr[p + 1] = (base[p + 1] + elapsed * 2.5) % bl;
        }
        laser.geometry.attributes.position.needsUpdate = true;
        laser.material.opacity = 0.35 + 0.25 * Math.sin(elapsed * 8 + i);
      }
      // Placeholder/legacy beams (MeshBasicMaterial)
      if (laser.material && !laser.isPoints && (!laser.material.uniforms || !laser.material.uniforms.uTime)) {
        var flicker = 0.5 + 0.5 * Math.sin(elapsed * 8 + i * 3.7);
        laser.material.opacity = flicker;
        var s = 0.85 + 0.3 * Math.sin(elapsed * 6 + i);
        laser.scale.set(s, 1, s);
      }
    });

    eyeGlows.forEach(function (glow, i) {
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 10 + i * 2.5);
      glow.scale.setScalar(1 + pulse * 0.8);
      glow.material.opacity = 0.4 + pulse * 0.6;
    });

    eyeLights.forEach(function (light, i) {
      light.intensity = 25 + Math.sin(elapsed * 12 + i * 3) * 10;
    });
  }

  function setActive(val) { targetActive = val; }
  function isActive() { return active > 0.1; }
  function toggle() { setActive(!targetActive); return targetActive; }

  // Manually set model path (useful for custom paths)
  function loadModel(scene, path) {
    if (placeholderGroup && placeholderGroup.parent) {
      placeholderGroup.parent.remove(placeholderGroup);
      placeholderGroup = null;
    }
    MODEL_PATHS.length = 0;
    MODEL_PATHS.push(path);
    tryLoadModel(scene, 0);
  }

  return { init, update, setActive, isActive, toggle, loadModel };
})();

window.JARVIS = JARVIS;
