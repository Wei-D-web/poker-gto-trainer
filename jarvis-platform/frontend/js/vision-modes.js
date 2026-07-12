/* ═══════════════════════════════════════
   J.A.R.V.I.S. — Night Vision + Thermal Vision Module
   ═══════════════════════════════════════ */

var JARVIS = window.JARVIS || {};

JARVIS.VisionModes = (function () {
  var active = null; // null | 'night' | 'thermal'
  var noiseCanvas, noiseCtx, noiseRaf;
  var thermalScanline, tempInterval;

  function init() {
    injectDOM();
    console.log('%c[Vision Modes] %cNVIS + FLIR systems ready.',
      'color: #10B981;', 'color: #94A3B8;');
  }

  function injectDOM() {
    // Night vision elements
    var nvOverlay = document.createElement('div');
    nvOverlay.id = 'night-vision-overlay';
    document.body.appendChild(nvOverlay);

    noiseCanvas = document.createElement('canvas');
    noiseCanvas.id = 'night-vision-noise';
    noiseCanvas.width = window.innerWidth;
    noiseCanvas.height = window.innerHeight;
    document.body.appendChild(noiseCanvas);
    noiseCtx = noiseCanvas.getContext('2d');

    var nvCross = document.createElement('div');
    nvCross.id = 'night-vision-cross';
    document.body.appendChild(nvCross);

    var nvLabel = document.createElement('div');
    nvLabel.id = 'night-vision-label';
    nvLabel.innerHTML = 'NVIS • ACTIVE • 4x GEN3';
    document.body.appendChild(nvLabel);

    // Thermal elements
    var thermalOverlay = document.createElement('div');
    thermalOverlay.id = 'thermal-overlay';
    document.body.appendChild(thermalOverlay);

    thermalScanline = document.createElement('div');
    thermalScanline.id = 'thermal-scanline';
    document.body.appendChild(thermalScanline);

    var thermalReadout = document.createElement('div');
    thermalReadout.id = 'thermal-readout';
    thermalReadout.innerHTML =
      '<div class="thermal-temp" id="thermal-temp-val">37.2°C</div>' +
      '<div class="thermal-range">FLIR • LWIR 8-14µm</div>' +
      '<div>RANGE: <span id="thermal-dist">2.4m</span></div>' +
      '<div>EMIS: 0.98</div>';
    document.body.appendChild(thermalReadout);

    window.addEventListener('resize', function () {
      if (noiseCanvas) {
        noiseCanvas.width = window.innerWidth;
        noiseCanvas.height = window.innerHeight;
      }
    });
  }

  // ── Night Vision Noise ──
  function startNoise() {
    function draw() {
      if (!noiseCtx || active !== 'night') return;
      var w = noiseCanvas.width, h = noiseCanvas.height;
      var imageData = noiseCtx.createImageData(w, h);
      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        var v = Math.random() * 40;
        data[i] = 0;
        data[i + 1] = v;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
      noiseCtx.putImageData(imageData, 0, 0);
      noiseRaf = requestAnimationFrame(draw);
    }
    draw();
  }

  function stopNoise() {
    if (noiseRaf) { cancelAnimationFrame(noiseRaf); noiseRaf = null; }
    if (noiseCtx) noiseCtx.clearRect(0, 0, noiseCanvas.width, noiseCanvas.height);
  }

  // ── Thermal temp simulation ──
  function startThermalSim() {
    var tempEl = document.getElementById('thermal-temp-val');
    var distEl = document.getElementById('thermal-dist');
    if (!tempEl) return;
    function tick() {
      if (active !== 'thermal') return;
      var baseTemp = 32 + Math.random() * 12;
      tempEl.textContent = baseTemp.toFixed(1) + '°C';
      if (distEl) distEl.textContent = (1.5 + Math.random() * 3).toFixed(1) + 'm';
    }
    tick();
    tempInterval = setInterval(tick, 1500);
  }

  function stopThermalSim() {
    if (tempInterval) { clearInterval(tempInterval); tempInterval = null; }
  }

  // ── Activate / Deactivate ──
  function activateNight() {
    if (active === 'thermal') deactivateThermal();
    active = 'night';
    document.body.classList.add('night-vision');
    document.body.classList.remove('thermal-vision');
    startNoise();
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('NIGHT VISION ENGAGED');
  }

  function activateThermal() {
    if (active === 'night') deactivateNight();
    active = 'thermal';
    document.body.classList.add('thermal-vision');
    document.body.classList.remove('night-vision');
    startThermalSim();
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('THERMAL VISION ACTIVE');
  }

  function deactivateNight() {
    active = null;
    document.body.classList.remove('night-vision');
    stopNoise();
  }

  function deactivateThermal() {
    active = null;
    document.body.classList.remove('thermal-vision');
    stopThermalSim();
  }

  function deactivate() {
    if (active === 'night') deactivateNight();
    if (active === 'thermal') deactivateThermal();
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('VISION NORMAL');
  }

  function toggleNight() {
    if (active === 'night') { deactivate(); }
    else { activateNight(); }
  }

  function toggleThermal() {
    if (active === 'thermal') { deactivate(); }
    else { activateThermal(); }
  }

  return {
    init: init,
    toggleNight: toggleNight,
    toggleThermal: toggleThermal,
    deactivate: deactivate,
    getMode: function () { return active; },
  };
})();

window.JARVIS = JARVIS;
