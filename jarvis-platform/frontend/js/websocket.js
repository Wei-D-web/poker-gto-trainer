/* ==========================================
   J.A.R.V.I.S. — WebSocket Client
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.WS = (function () {
  let ws = null;
  let url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  const maxReconnect = 20;
  let heartbeatTimer = null;
  const handlers = new Map();

  function connect(wsUrl) {
    if (wsUrl) url = wsUrl;

    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.warn('[JARVIS.WS] Connection failed:', e.message);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      console.log('%c[JARVIS.WS] %cConnected %cto ' + url,
        'color: #60A5FA;', 'color: #10B981;', 'color: #94A3B8;');
      reconnectAttempts = 0;
      startHeartbeat();
      emit('connected', {});
      JARVIS.App?.updateOnlineStatus?.(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Route to registered handlers
        if (handlers.has(msg.type)) {
          handlers.get(msg.type).forEach((fn) => fn(msg.data, msg));
        }
        // Always emit to wildcard
        if (handlers.has('*')) {
          handlers.get('*').forEach((fn) => fn(msg.data, msg));
        }
      } catch (e) {
        console.warn('[JARVIS.WS] Failed to parse message:', e);
      }
    };

    ws.onclose = (event) => {
      console.log('[JARVIS.WS] Disconnected (code: ' + event.code + ')');
      stopHeartbeat();
      emit('disconnected', { code: event.code });
      JARVIS.App?.updateOnlineStatus?.(false);
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.warn('[JARVIS.WS] Error:', err);
    };
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopHeartbeat();
    if (ws) {
      ws.onclose = null; // Prevent reconnect on intentional close
      ws.close();
      ws = null;
    }
  }

  function send(type, data = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[JARVIS.WS] Not connected, cannot send:', type);
      return false;
    }
    ws.send(JSON.stringify({
      type,
      data,
      timestamp: Date.now() / 1000,
    }));
    return true;
  }

  function on(eventType, handler) {
    if (!handlers.has(eventType)) {
      handlers.set(eventType, new Set());
    }
    handlers.get(eventType).add(handler);
    return () => handlers.get(eventType)?.delete(handler);
  }

  function off(eventType, handler) {
    handlers.get(eventType)?.delete(handler);
  }

  function emit(eventType, data) {
    if (handlers.has(eventType)) {
      handlers.get(eventType).forEach((fn) => fn(data));
    }
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      send('ping');
    }, 25000);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnect) {
      console.warn('[JARVIS.WS] Max reconnect attempts reached');
      return;
    }
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
    reconnectAttempts++;
    console.log('[JARVIS.WS] Reconnecting in ' + Math.round(delay / 1000) + 's (attempt ' + reconnectAttempts + ')');

    reconnectTimer = setTimeout(() => {
      connect(url);
    }, delay);
  }

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  return { connect, disconnect, send, on, off, isConnected };
})();

window.JARVIS = JARVIS;
