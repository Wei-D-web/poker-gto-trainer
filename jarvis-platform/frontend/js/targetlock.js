/* ==========================================
   J.A.R.V.I.S. — Target Lock / Scan Mode
   Iron Man HUD: bracket fly-in, scan sweep,
   target analysis overlay
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.TargetLock = (function () {
  let scanMode = false;
  let locked = false;
  let lockTarget = null;
  let brackets = [];
  let scanLine = null;
  let analysisPanel = null;
  let scanAnimId = null;

  function init() {
    createBrackets();
    createScanLine();
    createAnalysisPanel();
    setupKeyboard();
    return true;
  }

  function createBrackets() {
    ['tl', 'tr', 'bl', 'br'].forEach(function(c) {
      var el = document.createElement('div');
      el.className = 'target-lock-bracket lock-' + c;
      el.style.cssText = 'position:fixed;pointer-events:none;z-index:25;opacity:0;width:32px;height:32px;';
      if (c === 'tl') el.style.borderTop = el.style.borderLeft = '2px solid var(--jarvis-blue-light)';
      if (c === 'tr') el.style.borderTop = el.style.borderRight = '2px solid var(--jarvis-blue-light)';
      if (c === 'bl') el.style.borderBottom = el.style.borderLeft = '2px solid var(--jarvis-blue-light)';
      if (c === 'br') el.style.borderBottom = el.style.borderRight = '2px solid var(--jarvis-blue-light)';
      el.style.filter = 'drop-shadow(0 0 6px var(--jarvis-blue-glow))';
      document.body.appendChild(el);
      brackets.push(el);
    });
  }

  function createScanLine() {
    scanLine = document.createElement('div');
    scanLine.className = 'target-lock-scanline';
    scanLine.style.cssText = 'position:fixed;pointer-events:none;z-index:26;opacity:0;height:2px;';
    document.body.appendChild(scanLine);
  }

  function createAnalysisPanel() {
    analysisPanel = document.createElement('div');
    analysisPanel.className = 'target-lock-panel';
    analysisPanel.style.cssText = 'position:fixed;z-index:27;pointer-events:auto;opacity:0;transition:opacity 0.3s ease;' +
      'background:rgba(10,18,32,0.9);border:1px solid var(--border-accent);border-radius:var(--radius-md);' +
      'padding:14px 16px;width:260px;font-family:var(--font-sans);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.5),var(--shadow-glow-blue);';
    analysisPanel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<span style="font-family:var(--font-display);font-size:11px;font-weight:600;letter-spacing:0.08em;color:var(--jarvis-blue-light);">TARGET ACQUIRED</span>' +
      '<button class="lock-panel-close" style="background:none;border:none;color:var(--fg-tertiary);cursor:pointer;font-size:16px;">&times;</button></div>' +
      '<div style="margin-bottom:8px;"><span style="font-size:10px;color:var(--fg-tertiary);">THREAT LEVEL</span>' +
      '<div style="height:4px;background:var(--bg-input);border-radius:2px;margin:4px 0;overflow:hidden;">' +
      '<div class="lock-threat-fill" style="width:28%;height:100%;background:var(--jarvis-green);border-radius:2px;transition:width 0.5s ease;"></div></div>' +
      '<span style="font-size:10px;color:var(--jarvis-green);">LOW</span></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:10px;color:var(--fg-tertiary);">TYPE</span>' +
      '<span class="lock-type-val" style="font-size:11px;color:var(--fg-primary);">UI Element</span></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span style="font-size:10px;color:var(--fg-tertiary);">COORDS</span>' +
      '<span class="lock-coords-val" style="font-size:10px;color:var(--fg-secondary);font-family:var(--font-mono);">--</span></div>' +
      '<div style="display:flex;gap:6px;">' +
      '<button class="holo-btn primary sm lock-act-analyze" style="flex:1;font-size:10px;padding:6px;text-align:center;justify-content:center;">🔍 Analyze</button>' +
      '<button class="holo-btn sm lock-act-ocr" style="flex:1;font-size:10px;padding:6px;text-align:center;justify-content:center;">📝 OCR</button></div>';
    document.body.appendChild(analysisPanel);

    analysisPanel.querySelector('.lock-panel-close').addEventListener('click', dismiss);
    analysisPanel.querySelector('.lock-act-analyze').addEventListener('click', function() {
      if (JARVIS.App && JARVIS.App.switchPanel) JARVIS.App.switchPanel('vision');
      if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('SCAN INITIATED');
      dismiss();
    });
    analysisPanel.querySelector('.lock-act-ocr').addEventListener('click', function() {
      if (JARVIS.App && JARVIS.App.switchPanel) JARVIS.App.switchPanel('vision');
      if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('OCR SCANNING');
      dismiss();
    });
  }

  function activate() {
    if (scanMode) return;
    scanMode = true;
    document.body.classList.add('scan-mode');
    document.body.style.cursor = 'crosshair';
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('SCAN MODE ACTIVE');
  }

  function deactivate() {
    scanMode = false;
    if (locked) dismiss();
    document.body.classList.remove('scan-mode');
    document.body.style.cursor = '';
  }

  function lockOn(x, y, w, h) {
    if (locked) dismiss();
    if (w === undefined) {
      w = 220; h = 160;
      x = x - w / 2; y = y - h / 2;
    }
    lockTarget = { x: Math.max(0, x), y: Math.max(0, y), w: Math.min(window.innerWidth - x, w), h: Math.min(window.innerHeight - y, h) };
    locked = true;

    var coordsEl = analysisPanel.querySelector('.lock-coords-val');
    if (coordsEl) coordsEl.textContent = Math.round(lockTarget.x) + ',' + Math.round(lockTarget.y) + ' · ' + Math.round(lockTarget.w) + '×' + Math.round(lockTarget.h);

    var clickedEl = document.elementFromPoint(x + w/2, y + h/2);
    var typeEl = analysisPanel.querySelector('.lock-type-val');
    if (typeEl) {
      if (!clickedEl || clickedEl === document.body) typeEl.textContent = 'Desktop Region';
      else if (clickedEl.tagName === 'IMG' || clickedEl.tagName === 'CANVAS') typeEl.textContent = 'Image/Canvas';
      else if (clickedEl.tagName === 'INPUT' || clickedEl.tagName === 'TEXTAREA') typeEl.textContent = 'Input Field';
      else if (clickedEl.tagName === 'BUTTON') typeEl.textContent = 'Button Control';
      else if (clickedEl.classList.contains('message-bubble')) typeEl.textContent = 'Chat Message';
      else typeEl.textContent = clickedEl.tagName + ' Element';
    }

    animateBracketsIn(lockTarget);
    startScanSweep(lockTarget);
    positionPanel(lockTarget);
    analysisPanel.style.opacity = '1';

    if (JARVIS.Scene && JARVIS.Scene.pulseCore) JARVIS.Scene.pulseCore(0.4);
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('TARGET LOCKED');
  }

  function dismiss() {
    locked = false;
    lockTarget = null;
    brackets.forEach(function(b) { b.classList.remove('locked'); b.style.opacity = '0'; });
    analysisPanel.style.opacity = '0';
    if (scanAnimId) { cancelAnimationFrame(scanAnimId); scanAnimId = null; }
    scanLine.style.opacity = '0';
  }

  function animateBracketsIn(target) {
    var corners = [
      { el: brackets[0], sx: 50, sy: 50, tx: target.x, ty: target.y },
      { el: brackets[1], sx: window.innerWidth - 82, sy: 50, tx: target.x + target.w - 32, ty: target.y },
      { el: brackets[2], sx: 50, sy: window.innerHeight - 82, tx: target.x, ty: target.y + target.h - 32 },
      { el: brackets[3], sx: window.innerWidth - 82, sy: window.innerHeight - 82, tx: target.x + target.w - 32, ty: target.y + target.h - 32 },
    ];
    corners.forEach(function(c) {
      c.el.style.opacity = '1';
      c.el.style.left = c.sx + 'px';
      c.el.style.top = c.sy + 'px';
      c.el.style.transition = 'none';
    });

    requestAnimationFrame(function() {
      corners.forEach(function(c) {
        c.el.style.transition = 'left 0.4s cubic-bezier(0.34,1.56,0.64,1), top 0.4s cubic-bezier(0.34,1.56,0.64,1)';
        c.el.style.left = c.tx + 'px';
        c.el.style.top = c.ty + 'px';
      });
    });

    setTimeout(function() {
      brackets.forEach(function(b) { b.classList.add('locked'); });
      setTimeout(function() { brackets.forEach(function(b) { b.classList.remove('locked'); }); }, 600);
    }, 420);
  }

  function startScanSweep(target) {
    if (scanAnimId) cancelAnimationFrame(scanAnimId);
    scanLine.style.opacity = '1';
    var scanDuration = 800;
    var startTime = performance.now();

    function sweep(now) {
      var elapsed = (now - startTime) % scanDuration;
      var progress = elapsed / scanDuration;
      var eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      var sy = target.y + eased * target.h;
      scanLine.style.top = sy + 'px';
      scanLine.style.left = target.x + 'px';
      scanLine.style.width = target.w + 'px';
      scanLine.style.background = 'linear-gradient(90deg, transparent, rgba(96,165,250,' +
        (0.6 - Math.abs(progress - 0.5) * 1.2) + ') 20%, rgba(96,165,250,' +
        (0.8 - Math.abs(progress - 0.5) * 1.6) + ') 50%, rgba(96,165,250,' +
        (0.6 - Math.abs(progress - 0.5) * 1.2) + ') 80%, transparent)';
      scanAnimId = requestAnimationFrame(sweep);
    }
    scanAnimId = requestAnimationFrame(sweep);
  }

  function positionPanel(target) {
    var pw = 260, ph = 200;
    var px = target.x + target.w + 16;
    var py = target.y;
    if (px + pw > window.innerWidth - 20) { px = target.x; py = target.y + target.h + 16; }
    if (py + ph > window.innerHeight - 20) { py = target.y - ph - 16; }
    analysisPanel.style.left = px + 'px';
    analysisPanel.style.top = py + 'px';
  }

  function setupKeyboard() {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && locked) dismiss();
    });
  }

  function handleClick(e) {
    if (!scanMode) return;
    // Don't intercept clicks on the control bar, chat input, or side panels
    if (e.target.closest('#unified-control-bar')) return;
    if (e.target.closest('#input-bar')) return;
    if (e.target.closest('#side-panel')) return;
    if (e.target.closest('#main-panel')) return;
    if (e.target.closest('.target-lock-panel')) return;
    e.preventDefault();
    e.stopPropagation();
    lockOn(e.clientX, e.clientY);
  }

  function isScanMode() { return scanMode; }
  function isLocked() { return locked; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  return { init, activate, deactivate, lockOn, dismiss, handleClick, isScanMode, isLocked };
})();

window.JARVIS = JARVIS;
