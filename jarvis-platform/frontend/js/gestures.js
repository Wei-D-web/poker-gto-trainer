/* ==========================================
   J.A.R.V.I.S. — Gesture Control
   $1 Unistroke Recognizer for mouse gestures
   Right-click + drag to draw, release to recognize
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Gestures = (function () {
  let enabled = true;
  let drawing = false;
  let points = [];
  let trailSvg = null;
  let trailPath = null;
  let feedbackEl = null;
  let callbacks = [];

  // ── $1 Recognizer Templates ──
  // Each template is a normalized array of {x,y} points
  const TEMPLATES = {
    circle: {
      points: generateCircleTemplate(),
      action: 'Cycle panels',
      icon: '🔄',
    },
    zShape: {
      points: generateZTemplate(),
      action: 'Clear chat',
      icon: '🗑',
    },
    checkmark: {
      points: generateCheckTemplate(),
      action: 'Send / Confirm',
      icon: '✓',
    },
    swipeLeft: {
      points: generateSwipeTemplate('left'),
      action: 'Dismiss / Back',
      icon: '👈',
    },
    swipeRight: {
      points: generateSwipeTemplate('right'),
      action: 'Next / Forward',
      icon: '👉',
    },
  };

  function generateCircleTemplate() {
    var pts = [];
    var cx = 0.5, cy = 0.5, r = 0.35;
    for (var i = 0; i < 64; i++) {
      var angle = (i / 64) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    return pts;
  }

  function generateZTemplate() {
    var pts = [];
    for (var i = 0; i < 64; i++) {
      var t = i / 63;
      var x, y;
      if (t < 0.33) { x = 0.8 - t * 1.8; y = 0.2 + t * 0.3; }
      else if (t < 0.66) { x = 0.2 + (t - 0.33) * 1.8; y = 0.3 + (t - 0.33) * 2.1; }
      else { x = 0.8 - (t - 0.66) * 1.8; y = 0.7 + (t - 0.66) * 0.3; }
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function generateCheckTemplate() {
    var pts = [];
    for (var i = 0; i < 64; i++) {
      var t = i / 63;
      var x, y;
      if (t < 0.6) { x = 0.2 + t * 0.5; y = 0.7 - t * 1.1; }
      else { x = 0.5 + (t - 0.6) * 1.2; y = 0.1 + (t - 0.6) * 1.5; }
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function generateSwipeTemplate(dir) {
    var pts = [];
    for (var i = 0; i < 64; i++) {
      var t = i / 63;
      pts.push({ x: dir === 'left' ? 0.8 - t * 0.6 : 0.2 + t * 0.6, y: 0.5 });
    }
    return pts;
  }

  // ── $1 Recognizer ──
  function resample(path, n) {
    n = n || 64;
    if (path.length < 2) return path;
    var totalLen = 0;
    for (var i = 1; i < path.length; i++) {
      totalLen += Math.hypot(path[i].x - path[i-1].x, path[i].y - path[i-1].y);
    }
    var interval = totalLen / (n - 1);
    var D = 0;
    var newPoints = [path[0]];
    var idx = 1;
    for (var i = 1; i < path.length; i++) {
      var d = Math.hypot(path[i].x - path[i-1].x, path[i].y - path[i-1].y);
      if (D + d >= interval) {
        var t = (interval - D) / d;
        newPoints.push({
          x: path[i-1].x + t * (path[i].x - path[i-1].x),
          y: path[i-1].y + t * (path[i].y - path[i-1].y),
        });
        path.splice(i, 0, newPoints[newPoints.length - 1]);
        D = 0;
      } else { D += d; }
      idx++;
    }
    if (newPoints.length < n) newPoints.push(path[path.length - 1]);
    return newPoints.slice(0, n);
  }

  function centroid(pts) {
    var cx = 0, cy = 0;
    for (var i = 0; i < pts.length; i++) { cx += pts[i].x; cy += pts[i].y; }
    return { x: cx / pts.length, y: cy / pts.length };
  }

  function normalize(pts) {
    var c = centroid(pts);
    var translated = pts.map(function(p) { return { x: p.x - c.x, y: p.y - c.y }; });
    var maxDist = 0;
    for (var i = 0; i < translated.length; i++) {
      var dist = Math.hypot(translated[i].x, translated[i].y);
      if (dist > maxDist) maxDist = dist;
    }
    var scale = maxDist > 0 ? 1 / maxDist : 1;
    return translated.map(function(p) { return { x: p.x * scale, y: p.y * scale }; });
  }

  function distanceAtBestAngle(pts, template) {
    var T = template;
    var bestDist = Infinity;
    // Golden ratio search for best rotation
    var a = -0.75 * Math.PI, b = 0.75 * Math.PI;
    var gr = 0.5 * (-1 + Math.sqrt(5));
    var x1 = a + (1 - gr) * (b - a);
    var x2 = a + gr * (b - a);
    var f1 = distAtAngle(pts, T, x1);
    var f2 = distAtAngle(pts, T, x2);
    for (var i = 0; i < 20; i++) {
      if (f1 < f2) { b = x2; x2 = x1; f2 = f1; x1 = a + (1 - gr) * (b - a); f1 = distAtAngle(pts, T, x1); }
      else { a = x1; x1 = x2; f1 = f2; x2 = a + gr * (b - a); f2 = distAtAngle(pts, T, x2); }
      bestDist = Math.min(f1, f2);
    }
    return bestDist;
  }

  function distAtAngle(pts, T, angle) {
    var rotated = pts.map(function(p) {
      return {
        x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
        y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
      };
    });
    var sum = 0;
    for (var i = 0; i < Math.min(rotated.length, T.length); i++) {
      sum += Math.hypot(rotated[i].x - T[i].x, rotated[i].y - T[i].y);
    }
    return sum / Math.min(rotated.length, T.length);
  }

  function recognize(path) {
    if (path.length < 8) return null;
    var resampled = resample(path, 64);
    var normalized = normalize(resampled);

    var bestName = null, bestScore = Infinity, bestDist = Infinity;
    var keys = Object.keys(TEMPLATES);
    for (var k = 0; k < keys.length; k++) {
      var name = keys[k];
      var dist = distanceAtBestAngle(normalized, TEMPLATES[name].points);
      var score = 1 - dist / 0.5; // diagonal of unit square / 2
      if (dist < bestDist) { bestDist = dist; bestName = name; bestScore = score; }
    }
    // Distance threshold: must be reasonably close
    if (bestDist > 0.25) return null; // too different from any template
    return { type: bestName, score: bestScore, distance: bestDist };
  }

  // ── Drawing Layer ──
  function initDrawingLayer() {
    trailSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    trailSvg.setAttribute('id', 'gesture-trail-svg');
    trailSvg.style.cssText = 'position:fixed;inset:0;z-index:50;pointer-events:none;';
    document.body.appendChild(trailSvg);

    trailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trailPath.setAttribute('fill', 'none');
    trailPath.setAttribute('stroke', '#60A5FA');
    trailPath.setAttribute('stroke-width', '2.5');
    trailPath.setAttribute('stroke-linecap', 'round');
    trailPath.setAttribute('stroke-linejoin', 'round');
    trailPath.style.filter = 'drop-shadow(0 0 6px rgba(96,165,250,0.6))';
    trailSvg.appendChild(trailPath);

    // Feedback label
    feedbackEl = document.createElement('div');
    feedbackEl.id = 'gesture-feedback';
    feedbackEl.style.cssText = 'position:fixed;z-index:51;pointer-events:none;opacity:0;' +
      'font-family:var(--font-display);font-size:14px;font-weight:600;color:var(--jarvis-blue-light);' +
      'text-shadow:0 0 12px var(--jarvis-blue-glow);transition:opacity 0.3s ease;';
    document.body.appendChild(feedbackEl);
  }

  function updateTrailColor() {
    var armor = document.body.dataset.armor || 'mk50';
    var colors = { 'mk3': '#F87171', 'war-machine': '#9CA3AF', 'hulkbuster': '#DC2626', 'mk50': '#60A5FA' };
    var c = colors[armor] || '#60A5FA';
    trailPath.setAttribute('stroke', c);
    trailPath.style.filter = 'drop-shadow(0 0 6px ' + c + ')';
  }

  function showFeedback(text, x, y) {
    if (!feedbackEl) return;
    feedbackEl.textContent = text;
    feedbackEl.style.left = x + 'px';
    feedbackEl.style.top = (y - 30) + 'px';
    feedbackEl.style.opacity = '1';
    setTimeout(function() { feedbackEl.style.opacity = '0'; }, 1200);
  }

  // ── Event Handlers ──
  function onMouseDown(e) {
    if (!enabled) return;
    if (e.button !== 2) return; // Right-click only
    e.preventDefault();
    drawing = true;
    points = [];
    points.push({ x: e.clientX, y: e.clientY });
    if (!trailSvg) initDrawingLayer();
    updateTrailColor();
    trailPath.setAttribute('d', '');
    trailSvg.style.display = 'block';
  }

  function onMouseMove(e) {
    if (!drawing) return;
    points.push({ x: e.clientX, y: e.clientY });
    // Update SVG trail
    var d = 'M ' + points[0].x + ' ' + points[0].y;
    for (var i = 1; i < points.length; i++) {
      d += ' L ' + points[i].x + ' ' + points[i].y;
    }
    trailPath.setAttribute('d', d);
  }

  function onMouseUp(e) {
    if (!drawing) return;
    drawing = false;
    trailSvg.style.display = 'none';
    trailPath.setAttribute('d', '');

    if (points.length < 15) { points = []; return; } // Too short

    var result = recognize(points);
    points = [];

    if (!result) {
      showFeedback('?', e.clientX, e.clientY);
      return;
    }

    var template = TEMPLATES[result.type];
    showFeedback(template.icon + ' ' + template.action, e.clientX, e.clientY);

    // Fire callbacks
    callbacks.forEach(function(cb) {
      try { cb(result); } catch(err) {}
    });

    // Default actions
    switch (result.type) {
      case 'circle':
        if (JARVIS.App && JARVIS.App.switchPanel) {
          var panels = ['viz', 'agents', 'vision', 'research', 'armor'];
          var current = JARVIS.App.getState ? JARVIS.App.getState().activePanel : 'viz';
          var idx = panels.indexOf(current);
          var next = panels[(idx + 1) % panels.length];
          JARVIS.App.switchPanel(next);
        }
        break;
      case 'zShape':
        // Clear chat
        JARVIS.Chat && JARVIS.Chat.clear && JARVIS.Chat.clear();
        JARVIS.Chat && JARVIS.Chat.addMessage && JARVIS.Chat.addMessage('assistant', 'Conversation cleared via gesture, sir.');
        break;
      case 'checkmark':
        // Send current input
        var input = document.getElementById('user-input');
        if (input && input.value.trim()) {
          var evt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
          input.dispatchEvent(evt);
        }
        break;
      case 'swipeLeft':
        if (JARVIS.TargetLock && JARVIS.TargetLock.isLocked()) JARVIS.TargetLock.dismiss();
        break;
      case 'swipeRight':
        if (JARVIS.TargetLock && !JARVIS.TargetLock.isScanMode()) JARVIS.TargetLock.activate();
        break;
    }
  }

  function onContextMenu(e) {
    if (enabled && drawing) e.preventDefault();
  }

  // ── Setup ──
  function init() {
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('contextmenu', onContextMenu);
    return true;
  }

  function enable() { enabled = true; }
  function disable() { enabled = false; }
  function onGesture(cb) { callbacks.push(cb); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  return { init, enable, disable, onGesture };
})();

window.JARVIS = JARVIS;
