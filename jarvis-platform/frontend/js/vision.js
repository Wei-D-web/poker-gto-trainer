/* ==========================================
   J.A.R.V.I.S. — Screen Capture & Vision
   Full pipeline: capture → preview → OCR → analyze
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Vision = (function () {
  let mediaStream = null;
  let videoEl = null;
  let cameraStream = null;
  let isCapturing = false;
  let isCameraActive = false;
  let monitorInterval = null;
  let lastFrames = []; // screenshot gallery (last 5)
  const MAX_GALLERY = 5;

  // Callbacks for UI updates
  let onPreviewUpdate = null;
  let onStatusChange = null;

  /**
   * Start screen capture via WebRTC getDisplayMedia.
   */
  async function startCapture(onFrame, fps = 2) {
    if (isCapturing) return true;

    try {
      mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' },
        audio: false,
      });

      isCapturing = true;
      if (onStatusChange) onStatusChange('capturing');

      videoEl = document.createElement('video');
      videoEl.srcObject = mediaStream;
      videoEl.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      monitorInterval = setInterval(() => {
        if (!isCapturing || !videoEl) return;
        if (canvas.width !== videoEl.videoWidth) {
          canvas.width = videoEl.videoWidth;
          canvas.height = videoEl.videoHeight;
        }
        ctx.drawImage(videoEl, 0, 0);
        const frame = canvas.toDataURL('image/jpeg', 0.8);

        // Save to gallery
        lastFrames.unshift(frame);
        if (lastFrames.length > MAX_GALLERY) lastFrames.pop();

        if (onFrame) onFrame(frame);
        if (onPreviewUpdate) onPreviewUpdate(frame);
      }, 1000 / fps);

      mediaStream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };

      console.log('[JARVIS.Vision] Screen capture started @ ' + fps + 'fps');
      return true;

    } catch (err) {
      console.error('[JARVIS.Vision] Capture failed:', err);
      isCapturing = false;
      if (onStatusChange) onStatusChange('error');
      return false;
    }
  }

  /**
   * Capture a single high-quality screenshot.
   */
  async function captureFrame() {
    if (!mediaStream || !videoEl) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0);
    const frame = canvas.toDataURL('image/jpeg', 0.92);
    lastFrames.unshift(frame);
    if (lastFrames.length > MAX_GALLERY) lastFrames.pop();
    return frame;
  }

  /**
   * Start camera (webcam).
   */
  async function startCamera(onFrame) {
    if (isCameraActive) return true;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      isCameraActive = true;
      if (onStatusChange) onStatusChange('camera');

      const camVideo = document.createElement('video');
      camVideo.srcObject = cameraStream;
      camVideo.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Capture frames from camera at 5fps
      const camInterval = setInterval(() => {
        if (!isCameraActive) { clearInterval(camInterval); return; }
        canvas.width = camVideo.videoWidth || 640;
        canvas.height = camVideo.videoHeight || 480;
        ctx.drawImage(camVideo, 0, 0);
        const frame = canvas.toDataURL('image/jpeg', 0.8);
        if (onFrame) onFrame(frame);
        if (onPreviewUpdate) onPreviewUpdate(frame);
      }, 200);

      // Store interval for cleanup
      camVideo._camInterval = camInterval;
      cameraStream._camVideo = camVideo;

      console.log('[JARVIS.Vision] Camera started');
      return true;
    } catch (err) {
      console.warn('[JARVIS.Vision] Camera access denied:', err);
      isCameraActive = false;
      if (onStatusChange) onStatusChange('error');
      return false;
    }
  }

  /**
   * Stop camera.
   */
  function stopCamera() {
    isCameraActive = false;
    if (cameraStream) {
      if (cameraStream._camVideo && cameraStream._camVideo._camInterval) {
        clearInterval(cameraStream._camVideo._camInterval);
      }
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
  }

  /**
   * Stop screen capture.
   */
  function stopCapture() {
    isCapturing = false;
    if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
    if (videoEl) { videoEl.srcObject = null; videoEl = null; }
    if (onStatusChange) onStatusChange('idle');
    console.log('[JARVIS.Vision] Screen capture stopped');
  }

  /**
   * Send frame to backend for vision analysis (REST).
   */
  async function analyzeFrame(frameDataUrl, prompt) {
    const API_BASE = window.location.origin;
    try {
      const resp = await fetch(API_BASE + '/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frameDataUrl, prompt: prompt }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.error('[JARVIS.Vision] Analysis failed:', err);
      // Fallback: try WebSocket if REST fails
      if (JARVIS.WS && JARVIS.WS.isConnected()) {
        JARVIS.WS.send('vision_frame', { image: frameDataUrl, prompt: prompt });
        return { analysis: 'Sent via WebSocket. Check chat for results.', method: 'ws_fallback' };
      }
      return { error: err.message };
    }
  }

  /**
   * Extract text via OCR (REST).
   */
  async function extractText(frameDataUrl, language) {
    const API_BASE = window.location.origin;
    try {
      const resp = await fetch(API_BASE + '/api/vision/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frameDataUrl, language: language || 'eng+chi_sim' }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.error('[JARVIS.Vision] OCR failed:', err);
      return { error: err.message, text: '', blocks: [] };
    }
  }

  /**
   * Set UI callbacks for preview and status updates.
   */
  function setCallbacks(previewFn, statusFn) {
    onPreviewUpdate = previewFn;
    onStatusChange = statusFn;
  }

  function getIsCapturing() { return isCapturing; }
  function getIsCameraActive() { return isCameraActive; }
  function getGallery() { return lastFrames; }

  return {
    startCapture, captureFrame, startCamera, stopCamera,
    stopCapture, analyzeFrame, extractText,
    setCallbacks,
    getIsCapturing, getIsCameraActive, getGallery,
  };
})();

window.JARVIS = JARVIS;
