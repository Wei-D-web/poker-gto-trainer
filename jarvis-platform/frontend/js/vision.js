/* ==========================================
   J.A.R.V.I.S. — Screen Capture & Vision
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Vision = (function () {
  let mediaStream = null;
  let videoEl = null;
  let isCapturing = false;
  let monitorInterval = null;

  /**
   * Start screen capture via WebRTC getDisplayMedia.
   * @param {Function} onFrame - callback(base64JPEG) for each captured frame
   * @param {number} fps - frames per second for monitoring
   */
  async function startCapture(onFrame, fps = 0.5) {
    if (isCapturing) return;

    try {
      mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        },
        audio: false,
      });

      isCapturing = true;

      // Create hidden video element to receive stream
      videoEl = document.createElement('video');
      videoEl.srcObject = mediaStream;
      videoEl.play();

      // Set up frame capture
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      monitorInterval = setInterval(() => {
        if (!isCapturing || !videoEl) return;

        // Match canvas to video dimensions
        if (canvas.width !== videoEl.videoWidth) {
          canvas.width = videoEl.videoWidth;
          canvas.height = videoEl.videoHeight;
        }

        ctx.drawImage(videoEl, 0, 0);
        const frame = canvas.toDataURL('image/jpeg', 0.75);

        if (onFrame) onFrame(frame);
      }, 1000 / fps);

      // Handle stream stop (user clicks "Stop sharing")
      mediaStream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };

      console.log('[JARVIS.Vision] Screen capture started');
      return true;

    } catch (err) {
      console.error('[JARVIS.Vision] Capture failed:', err);
      isCapturing = false;
      return false;
    }
  }

  /**
   * Capture a single screenshot frame.
   * @returns {Promise<string>} base64 JPEG data URL
   */
  async function captureFrame() {
    if (!mediaStream || !videoEl) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.85);
  }

  /**
   * Request and open camera.
   */
  async function startCamera(videoElementId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      const el = document.getElementById(videoElementId);
      if (el) {
        el.srcObject = stream;
        el.play();
      }

      return stream;
    } catch (err) {
      console.warn('[JARVIS.Vision] Camera access denied:', err);
      return null;
    }
  }

  /**
   * Stop screen capture.
   */
  function stopCapture() {
    isCapturing = false;

    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    if (videoEl) {
      videoEl.srcObject = null;
      videoEl = null;
    }

    console.log('[JARVIS.Vision] Screen capture stopped');
  }

  /**
   * Send frame to backend for vision analysis.
   */
  function analyzeFrame(frameDataUrl, prompt) {
    if (!JARVIS.WS || !JARVIS.WS.isConnected()) {
      console.warn('[JARVIS.Vision] WebSocket not connected');
      return false;
    }

    JARVIS.WS.send('vision_frame', {
      image: frameDataUrl,
      prompt: prompt || 'Describe what you see on this screen. Be detailed about charts, data, and any anomalies.',
    });

    return true;
  }

  function getIsCapturing() {
    return isCapturing;
  }

  return {
    startCapture,
    captureFrame,
    startCamera,
    stopCapture,
    analyzeFrame,
    getIsCapturing,
  };
})();

window.JARVIS = JARVIS;
