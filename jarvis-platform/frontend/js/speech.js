/* ==========================================
   J.A.R.V.I.S. — Speech Recognition v2
   Raw audio capture + VAD + backend STT
   Web Speech API as fallback
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Speech = (function () {
  // ── State ──
  let audioContext = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let gainNode = null;
  let analyserNode = null;
  let isListening = false;
  let onResultCallback = null;
  let onInterimCallback = null;
  let onErrorCallback = null;

  // Audio chunk accumulator
  let chunks = [];
  let silenceStart = null;
  let chunkTimer = null;

  // ── Tunables ──
  const VAD_THRESHOLD = 0.015;      // RMS threshold — lower = more sensitive
  const SILENCE_TIMEOUT = 1500;     // ms of silence before sending chunk
  const CHUNK_INTERVAL = 400;       // ms between MediaRecorder dataavailable events
  const MIC_GAIN = 1.8;             // +5dB microphone boost
  const MAX_CHUNK_DURATION = 8000;  // Max 8s per chunk before force-send

  // Language
  let language = 'auto';

  // ── Public API ──

  function init() {
    // Check for MediaRecorder support
    if (!window.MediaRecorder) {
      console.warn('[JARVIS.Speech] MediaRecorder not available — using Web Speech fallback');
    }
    return true;
  }

  function isAvailable() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async function start(onResult, onInterim, onError) {
    if (isListening) return true;

    onResultCallback = onResult;
    onInterimCallback = onInterim;
    onErrorCallback = onError;

    // ── Try raw audio capture first ──
    if (window.MediaRecorder) {
      try {
        await startRawCapture();
        console.log('[JARVIS.Speech] Raw audio capture active (VAD + backend STT)');
        return true;
      } catch (e) {
        console.warn('[JARVIS.Speech] Raw capture failed, trying Web Speech fallback:', e.message);
      }
    }

    // ── Fallback: Web Speech API ──
    return startWebSpeech();
  }

  function stop() {
    isListening = false;

    // Stop raw capture
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (chunkTimer) {
      clearInterval(chunkTimer);
      chunkTimer = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(function (t) { t.stop(); });
      mediaStream = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    gainNode = null;
    analyserNode = null;
    chunks = [];
    silenceStart = null;

    // Stop Web Speech fallback
    stopWebSpeech();
  }

  function setLanguage(lang) {
    language = lang || 'auto';
  }

  function getIsListening() {
    return isListening;
  }

  // ═══════════════════════════════════════
  //  RAW AUDIO CAPTURE (MediaRecorder + VAD)
  // ═══════════════════════════════════════

  async function startRawCapture() {
    // 1. Request microphone
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    // 2. Build audio graph: mic → gain → analyser
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    var source = audioContext.createMediaStreamSource(mediaStream);

    gainNode = audioContext.createGain();
    gainNode.gain.value = MIC_GAIN;

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.3;

    source.connect(gainNode);
    gainNode.connect(analyserNode);
    // Don't connect to destination — we don't want feedback

    // 3. Start MediaRecorder
    var mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/mp4';
    }

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: mimeType,
      audioBitsPerSecond: 32000,
    });

    chunks = [];
    silenceStart = null;
    var chunkStartTime = Date.now();

    mediaRecorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }

      var rms = getRMS();
      var elapsed = Date.now() - chunkStartTime;

      // Update interim callback with current audio level for UI feedback
      if (onInterimCallback && rms > VAD_THRESHOLD) {
        onInterimCallback(null, { rms: rms, listening: true });
      }

      if (rms < VAD_THRESHOLD) {
        // Silence detected
        if (silenceStart === null) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > SILENCE_TIMEOUT && chunks.length > 0) {
          // Enough silence — send accumulated audio for STT
          flushChunks();
          chunkStartTime = Date.now();
          silenceStart = null;
        }
      } else {
        // Speech detected — reset silence timer
        silenceStart = null;
      }

      // Force-send if chunk is too long (prevents memory buildup)
      if (elapsed > MAX_CHUNK_DURATION && chunks.length > 0) {
        flushChunks();
        chunkStartTime = Date.now();
        silenceStart = null;
      }
    };

    mediaRecorder.onerror = function (e) {
      console.error('[JARVIS.Speech] MediaRecorder error:', e);
      if (onErrorCallback) onErrorCallback('recorder_error');
    };

    mediaRecorder.start(CHUNK_INTERVAL);
    isListening = true;
  }

  function flushChunks() {
    if (chunks.length === 0) return;

    var blob = new Blob(chunks, { type: mediaRecorder.mimeType });
    chunks = [];
    silenceStart = null;

    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      if (!base64) return;

      if (JARVIS.WS && JARVIS.WS.isConnected()) {
        JARVIS.WS.send('voice_data', {
          audio: base64,
          format: 'webm',
          language: language,
        });
      } else if (onErrorCallback) {
        onErrorCallback('no_connection');
      }
    };
    reader.onerror = function () {
      console.warn('[JARVIS.Speech] Failed to read audio blob');
    };
    reader.readAsDataURL(blob);
  }

  function getRMS() {
    if (!analyserNode) return 0;

    var bufferLength = analyserNode.fftSize;
    var buffer = new Float32Array(bufferLength);
    analyserNode.getFloatTimeDomainData(buffer);

    var sum = 0;
    for (var i = 0; i < bufferLength; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / bufferLength);
  }

  // ═══════════════════════════════════════
  //  WEB SPEECH API FALLBACK
  // ═══════════════════════════════════════

  let webSpeechRecognition = null;

  function startWebSpeech() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[JARVIS.Speech] Web Speech API not available');
      return false;
    }

    webSpeechRecognition = new SpeechRecognition();
    webSpeechRecognition.continuous = true;
    webSpeechRecognition.interimResults = true;
    webSpeechRecognition.lang = language === 'auto' ? 'en-US' : language;
    webSpeechRecognition.maxAlternatives = 1;

    webSpeechRecognition.onresult = function (event) {
      var interim = '';
      var final = '';

      for (var i = event.resultIndex; i < event.results.length; i++) {
        var result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final && onResultCallback) {
        onResultCallback(final.trim(), 'en');
      }
      if (interim && onInterimCallback) {
        onInterimCallback(interim.trim());
      }
    };

    webSpeechRecognition.onerror = function (event) {
      console.warn('[JARVIS.Speech] Web Speech error:', event.error);
      if (event.error === 'no-speech' && isListening) {
        try { webSpeechRecognition.start(); } catch (e) {}
      }
      if (onErrorCallback) onErrorCallback(event.error);
    };

    webSpeechRecognition.onend = function () {
      if (isListening) {
        try { webSpeechRecognition.start(); } catch (e) {}
      }
    };

    try {
      webSpeechRecognition.start();
      isListening = true;
      console.log('[JARVIS.Speech] Web Speech API fallback active');
      return true;
    } catch (e) {
      console.warn('[JARVIS.Speech] Web Speech start failed:', e);
      return false;
    }
  }

  function stopWebSpeech() {
    if (webSpeechRecognition) {
      try { webSpeechRecognition.stop(); } catch (e) {}
      webSpeechRecognition = null;
    }
  }

  // ═══════════════════════════════════════
  //  EXPORT
  // ═══════════════════════════════════════

  return {
    init,
    start,
    stop,
    setLanguage,
    isAvailable,
    getIsListening,
  };
})();

window.JARVIS = JARVIS;
