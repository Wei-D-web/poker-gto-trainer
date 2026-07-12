/* ==========================================
   J.A.R.V.I.S. — Audio Analyzer
   Web Audio API — mic capture + AnalyserNode
   Provides frequency/time-domain data for
   driving the 3D holographic avatar
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.AudioAnalyzer = (function () {
  // ── State ──
  let audioCtx = null;
  let analyser = null;
  let micStream = null;
  let source = null;
  let isActive = false;
  let freqData = null;
  let timeData = null;
  let ttsAudioEl = null;
  let ttsAnalyser = null;
  let ttsSource = null;

  // ── Cached levels ──
  const levels = { bass: 0, mid: 0, treble: 0, volume: 0, waveform: [] };

  function init() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);
      return true;
    } catch (e) {
      console.warn('[AudioAnalyzer] Web Audio API not available:', e);
      return false;
    }
  }

  async function start() {
    if (!audioCtx && !init()) return false;
    if (isActive) return true;

    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      source = audioCtx.createMediaStreamSource(micStream);
      source.connect(analyser);
      // Don't connect to destination — we don't want feedback
      isActive = true;
      // Resume context if suspended (autoplay policy)
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      return true;
    } catch (e) {
      console.warn('[AudioAnalyzer] Mic access denied or unavailable:', e.message);
      return false;
    }
  }

  function stop() {
    if (micStream) {
      micStream.getTracks().forEach(function(t) { t.stop(); });
      micStream = null;
    }
    if (source) {
      source.disconnect();
      source = null;
    }
    detachTTS();
    isActive = false;
  }

  // ── Attach to TTS audio element for avatar reaction ──
  function attachTTS(audioEl) {
    if (!audioCtx && !init()) return;
    if (ttsSource) detachTTS();

    try {
      ttsAudioEl = audioEl;
      ttsAnalyser = audioCtx.createAnalyser();
      ttsAnalyser.fftSize = 256;
      ttsAnalyser.smoothingTimeConstant = 0.6;
      ttsSource = audioCtx.createMediaElementSource(audioEl);
      ttsSource.connect(ttsAnalyser);
      ttsSource.connect(audioCtx.destination); // also play through speakers
    } catch (e) {
      console.warn('[AudioAnalyzer] TTS attach failed:', e);
    }
  }

  function detachTTS() {
    if (ttsSource) {
      ttsSource.disconnect();
      ttsSource = null;
    }
    ttsAnalyser = null;
    ttsAudioEl = null;
  }

  function tick() {
    if (!analyser || !freqData) return;

    if (isActive) {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);
    } else if (ttsAnalyser) {
      ttsAnalyser.getByteFrequencyData(freqData);
    } else {
      // No audio source — decay levels
      levels.bass *= 0.9;
      levels.mid *= 0.9;
      levels.treble *= 0.9;
      levels.volume *= 0.9;
      return;
    }

    const bins = freqData.length;

    // Bass: first 1/6 of spectrum
    let bassSum = 0;
    const bassEnd = Math.floor(bins / 6);
    for (let i = 0; i < bassEnd; i++) bassSum += freqData[i];
    levels.bass = bassSum / bassEnd / 255;

    // Mid: middle 1/3
    let midSum = 0;
    const midStart = bassEnd;
    const midEnd = Math.floor(bins / 2);
    for (let i = midStart; i < midEnd; i++) midSum += freqData[i];
    levels.mid = midSum / (midEnd - midStart) / 255;

    // Treble: upper half
    let trebleSum = 0;
    for (let i = midEnd; i < bins; i++) trebleSum += freqData[i];
    levels.treble = trebleSum / (bins - midEnd) / 255;

    // Overall volume from time domain
    let volSum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      volSum += v * v;
    }
    levels.volume = Math.sqrt(volSum / timeData.length);
  }

  function getLevels() {
    return {
      bass: levels.bass,
      mid: levels.mid,
      treble: levels.treble,
      volume: levels.volume,
    };
  }

  function getIsActive() { return isActive; }

  return { init, start, stop, tick, getLevels, getIsActive, attachTTS, detachTTS };
})();

window.JARVIS = JARVIS;
