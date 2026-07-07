/* ==========================================
   J.A.R.V.I.S. — App Core
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.App = (function () {
  // ── State ──
  const state = {
    mode: 'idle', // idle | listening | thinking | speaking
    online: true,
    activePanel: 'viz', // viz | agents | vision | research
    messages: [],
  };

  // ── DOM References ──
  let els = {};

  function init() {
    cacheElements();
    setupClock();
    setupInput();
    setupPanelTabs();
    setupHintChips();
    setupMetrics();
    setupVignetteBreathing();
    startSessionTimer();
    initDataStreams();
    showWelcome();
    updateOnlineStatus(true);

    console.log('%c[J.A.R.V.I.S.] %cHUD initialized. %cAt your service, sir.',
      'color: #60A5FA; font-weight: bold;',
      'color: #94A3B8;',
      'color: #556278;');
  }

  function cacheElements() {
    els = {
      clock: document.getElementById('status-clock'),
      input: document.getElementById('user-input'),
      sendBtn: document.getElementById('send-btn'),
      voiceOrb: document.getElementById('voice-orb'),
      chatContainer: document.getElementById('chat-container'),
      sidePanelContent: document.getElementById('side-panel-content'),
      panelTabs: document.querySelectorAll('.panel-tab'),
      holoCore: document.getElementById('css-holo-core'),
    };
  }

  // ── Clock ──
  function setupClock() {
    function tick() {
      if (els.clock) {
        const now = new Date();
        els.clock.textContent = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── Input Handling ──
  function setupInput() {
    if (!els.input) return;

    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Core pulses faster when user types
    els.input.addEventListener('input', () => {
      if (els.input.value.length > 0) {
        if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
          JARVIS.Scene.setCoreIntensity(0.5);
        }
      } else {
        if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
          JARVIS.Scene.setCoreIntensity(0.3);
        }
      }
    });

    if (els.sendBtn) {
      els.sendBtn.addEventListener('click', sendMessage);
    }

    if (els.voiceOrb) {
      els.voiceOrb.addEventListener('click', toggleVoiceMode);
    }
  }

  function sendMessage() {
    const text = els.input.value.trim();
    if (!text) return;

    // Add user message to chat
    JARVIS.Chat.addMessage('user', text);

    // Trigger particle burst + core pulse
    if (JARVIS.Particles && JARVIS.Particles.burst) {
      JARVIS.Particles.burst(0.5);
    }

    // Trigger CSS core burst
    triggerCoreBurst();

    // Clear input
    els.input.value = '';

    // Reset core to thinking state
    setMode('thinking');
    if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
      JARVIS.Scene.setCoreIntensity(0.8);
    }
    JARVIS.Chat.showTyping();

    // Detect special commands
    const lower = text.toLowerCase();
    const isVision = /look|see|screen|chart|analyze.*image|what.*on.*screen/i.test(lower);
    const isResearch = /research|deep.*dive|comprehensive.*report|analyze.*vs|compare.*and/i.test(lower);
    const isVisualize = /show.*me|visualize|display.*data|globe|network|graph/i.test(lower);

    if (JARVIS.WS && JARVIS.WS.isConnected()) {
      if (isVision) {
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.addMessage('assistant', '👁️ Click "Share Screen" to let me see what you see. Starting capture...');
        JARVIS.Vision.startCapture((frame) => {
          JARVIS.Vision.analyzeFrame(frame, text);
        }, 1);
        setMode('idle');
        resetCoreIntensity();
      } else if (isResearch) {
        JARVIS.WS.send('agent_decompose', { query: text, max_agents: 5 });
      } else if (isVisualize) {
        JARVIS.Viz.showGlobe();
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.addMessage('assistant', '🌐 Loading holographic visualization, sir.');
        setMode('idle');
        resetCoreIntensity();
      } else {
        // Normal chat → send to LLM via WebSocket
        JARVIS.WS.send('chat', { text, mode: 'text' });
      }
    } else {
      // Offline — no backend connection
      setTimeout(() => {
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.addMessage('assistant',
          'I am currently offline, sir. Please start the backend server with:\n\n' +
          '`cd backend && python -m uvicorn main:app --port 8765`'
        );
        setMode('idle');
        resetCoreIntensity();
      }, 500);
    }
  }

  // ── Voice Mode Toggle ──
  function toggleVoiceMode() {
    if (state.mode === 'listening') {
      setMode('idle');
      els.voiceOrb.classList.remove('listening');
      resetCoreIntensity();
    } else {
      setMode('listening');
      els.voiceOrb.classList.add('listening');
      if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
        JARVIS.Scene.setCoreIntensity(0.9);
      }

      // Auto-stop after 10 seconds of silence
      setTimeout(() => {
        if (state.mode === 'listening') {
          els.voiceOrb.classList.remove('listening');
          setMode('idle');
          resetCoreIntensity();
        }
      }, 10000);
    }
  }

  // ── Core Burst Animation ──
  function triggerCoreBurst() {
    if (els.holoCore) {
      els.holoCore.classList.add('burst');
      setTimeout(() => els.holoCore.classList.remove('burst'), 600);
    }
  }

  function resetCoreIntensity() {
    if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
      JARVIS.Scene.setCoreIntensity(0.3);
    }
  }

  // ── Panel Tabs ──
  function setupPanelTabs() {
    els.panelTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        els.panelTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.activePanel = tab.dataset.panel;
        updateSidePanel();
      });
    });
  }

  function updateSidePanel() {
    if (!els.sidePanelContent) return;

    switch (state.activePanel) {
      case 'viz':
        els.sidePanelContent.innerHTML = `
          <div class="mini-widget">
            <div class="mini-orbit">
              <div class="ring"><div class="dot"></div></div>
              <div class="ring"><div class="dot"></div></div>
              <div class="ring"><div class="dot"></div></div>
            </div>
            <div class="widget-title">Holographic Core</div>
            <div class="widget-value" id="widget-core-status">NOMINAL</div>
            <div class="widget-sub">3D engine active · 60 FPS</div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Particle Field</div>
            <div class="widget-value" id="widget-particles">2,000</div>
            <div class="widget-sub">data stream nodes active</div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Session</div>
            <div class="widget-value" id="widget-session-time">00:00:00</div>
            <div class="widget-sub">since initialization</div>
          </div>`;
        break;
      case 'agents':
        els.sidePanelContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🧠</div>
            <div class="empty-title">Multi-Agent Swarm</div>
            <div class="empty-desc">Complex tasks are decomposed and executed by parallel AI agents. Coming in Phase 4.</div>
          </div>`;
        break;
      case 'vision':
        els.sidePanelContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">👁️</div>
            <div class="empty-title">Vision Intelligence</div>
            <div class="empty-desc">Screen analysis, OCR, and visual monitoring. Coming in Phase 3.</div>
          </div>`;
        break;
      case 'research':
        els.sidePanelContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔬</div>
            <div class="empty-title">Deep Research</div>
            <div class="empty-desc">Multi-source search with cross-validation. Coming in Phase 5.</div>
          </div>`;
        break;
    }
  }

  // ── Data Streams ──
  function initDataStreams() {
    const chars = '01';
    const symbols = '{}[]()<>/\\|*#@$%&';

    function generateStreamLine(length, useSymbols) {
      let line = '';
      const pool = useSymbols ? chars + symbols : chars;
      for (let i = 0; i < length; i++) {
        if (Math.random() < 0.15) {
          line += ' ';
        } else {
          line += pool[Math.floor(Math.random() * pool.length)];
        }
      }
      return line;
    }

    function generateStreamContent(cols, rows, useSymbols) {
      let content = '';
      for (let i = 0; i < rows; i++) {
        content += generateStreamLine(cols, useSymbols) + '\n';
      }
      return content;
    }

    const leftEl = document.getElementById('stream-left');
    const rightEl = document.getElementById('stream-right');

    if (leftEl) {
      leftEl.textContent = generateStreamContent(18, 40, true);
      // Refresh content when animation loops
      setInterval(() => {
        leftEl.textContent = generateStreamContent(18, 40, true);
      }, 12000);
    }

    if (rightEl) {
      rightEl.textContent = generateStreamContent(18, 40, false);
      setInterval(() => {
        rightEl.textContent = generateStreamContent(18, 40, false);
      }, 14000);
    }
  }

  // ── Hint Chips ──
  function setupHintChips() {
    document.querySelectorAll('.welcome-hint').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (els.input) {
          els.input.value = chip.textContent.trim();
          els.input.focus();
        }
      });
    });
  }

  // ── Welcome Message ──
  function showWelcome() {
    JARVIS.Chat.addMessage('assistant',
      "Good evening, sir. I am **J.A.R.V.I.S.** — a rather very intelligent holographic system.\n\n" +
      "My holographic interface is now active. The central core represents my cognitive state — " +
      "it pulses faster when I'm processing. The data streams on your flanks show live diagnostic feeds.\n\n" +
      "I am currently operating in **Phase 1** mode with visual HUD, 3D particle field, and real-time chat. " +
      "Voice recognition, computer vision, and multi-agent reasoning are coming online in subsequent phases.\n\n" +
      "How may I assist you today?"
    );
  }

  // ── Mode Management ──
  function setMode(mode) {
    state.mode = mode;
    document.body.dataset.mode = mode;
  }

  function updateOnlineStatus(online) {
    state.online = online;
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-indicator span:last-child');
    if (dot) {
      dot.className = 'status-dot ' + (online ? '' : 'offline');
    }
    if (text) {
      text.textContent = online ? 'ONLINE' : 'OFFLINE';
    }
  }

  function getState() { return state; }

  // ── Status Bar Live Metrics ──
  function setupMetrics() {
    function tick() {
      const cpuEl = document.getElementById('metric-cpu');
      const memEl = document.getElementById('metric-mem');
      const wsEl  = document.getElementById('metric-ws');
      const pingEl = document.getElementById('metric-ping');

      if (cpuEl) cpuEl.textContent = Math.floor(18 + Math.random() * 25) + '%';
      if (memEl) memEl.textContent = Math.floor(420 + Math.random() * 180) + 'MB';
      if (wsEl)  wsEl.textContent  = (JARVIS.WS && JARVIS.WS.isConnected() ? 'LIVE' : '---');
      if (pingEl) {
        const ping = Math.floor(12 + Math.random() * 40);
        pingEl.textContent = ping + 'ms';
      }
    }
    tick();
    setInterval(tick, 2000);
  }

  // ── Vignette Breathing ──
  function setupVignetteBreathing() {
    const vignette = document.getElementById('vignette');
    if (!vignette) return;
    let time = 0;
    function breathe() {
      time += 0.01;
      const opacity = 0.55 + Math.sin(time) * 0.15;
      vignette.style.opacity = opacity;
      requestAnimationFrame(breathe);
    }
    breathe();
  }

  // ── Session Timer ──
  function startSessionTimer() {
    const start = Date.now();
    function tick() {
      const el = document.getElementById('widget-session-time');
      if (!el) return;
      const secs = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      el.textContent = String(h).padStart(2,'0') + ':' +
                       String(m).padStart(2,'0') + ':' +
                       String(s).padStart(2,'0');
    }
    tick();
    setInterval(tick, 1000);
  }

  return { init, getState, setMode, updateOnlineStatus, triggerCoreBurst };
})();

window.JARVIS = JARVIS;
