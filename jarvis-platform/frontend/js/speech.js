/* ==========================================
   J.A.R.V.I.S. — Speech Recognition (Web Speech API)
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Speech = (function () {
  let recognition = null;
  let isListening = false;
  let onResultCallback = null;
  let onInterimCallback = null;
  let silenceTimer = null;
  const SILENCE_TIMEOUT = 2000;

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[JARVIS.Speech] Web Speech API not available');
      return false;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        resetSilenceTimer();
        if (onResultCallback) onResultCallback(final.trim());
      }
      if (interim && onInterimCallback) {
        onInterimCallback(interim.trim());
      }
    };

    recognition.onerror = (event) => {
      console.warn('[JARVIS.Speech] Error:', event.error);
      if (event.error === 'no-speech') {
        // Restart silently
        if (isListening) {
          try { recognition.start(); } catch (e) {}
        }
      }
    };

    recognition.onend = () => {
      // Auto-restart if still in listening mode
      if (isListening) {
        try { recognition.start(); } catch (e) {}
      }
    };

    return true;
  }

  function start(onResult, onInterim) {
    if (!recognition && !init()) return false;

    onResultCallback = onResult;
    onInterimCallback = onInterim;

    try {
      recognition.start();
      isListening = true;
      resetSilenceTimer();
      return true;
    } catch (e) {
      console.warn('[JARVIS.Speech] Start failed:', e);
      return false;
    }
  }

  function stop() {
    isListening = false;
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    try {
      recognition?.stop();
    } catch (e) {}
  }

  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    // Not currently used for auto-stop, but available for future
  }

  function isAvailable() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function getIsListening() {
    return isListening;
  }

  return { init, start, stop, isAvailable, getIsListening };
})();

window.JARVIS = JARVIS;
