/* ==========================================
   J.A.R.V.I.S. — App Core
   Iron Man HUD: side panels, diagnostics,
   float labels, tickers, mode management
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
    setupMetrics();
    setupVignetteBreathing();
    setupDiagPanels();
    startSessionTimer();
    initDataStreams();
    initDataTickers();
    setupPerspectiveParallax();
    setupReticleLockOn();
    initSession();
    restoreArmorSkin();
    setupArmorControlBar();
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
      holoCore: document.getElementById('css-arc-reactor'),
      arcCore: document.querySelector('#css-arc-reactor .arc-core'),
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

    // Energy injection animation when typing
    els.input.addEventListener('input', () => {
      const wrapper = els.input.closest('.input-wrapper');
      if (els.input.value.length > 0) {
        if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
          JARVIS.Scene.setCoreIntensity(0.5);
        }
        if (wrapper) {
          wrapper.classList.add('input-energy-active');
          setTimeout(() => wrapper.classList.remove('input-energy-active'), 800);
        }
      } else {
        if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
          JARVIS.Scene.setCoreIntensity(0.3);
        }
      }
    });

    if (els.sendBtn) {
      els.sendBtn.addEventListener('click', sendMessage);
      // Ripple effect on send button
      els.sendBtn.addEventListener('mousedown', (e) => addRipple(e, els.sendBtn));
    }

    if (els.voiceOrb) {
      els.voiceOrb.addEventListener('click', toggleVoiceMode);
    }
  }

  // ── Ripple Effect ──
  function addRipple(e, el) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    el.style.position = el.style.position || 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }

  function sendMessage() {
    const text = els.input.value.trim();
    if (!text) return;

    JARVIS.Chat.addMessage('user', text);

    if (JARVIS.Particles && JARVIS.Particles.burst) {
      JARVIS.Particles.burst(0.5);
    }

    triggerCoreBurst();
    els.input.value = '';
    setMode('thinking');
    if (JARVIS.Scene && JARVIS.Scene.setCoreIntensity) {
      JARVIS.Scene.setCoreIntensity(0.8);
    }
    JARVIS.Chat.startStreaming();
    spawnFloatLabel('COMMAND SENT');

    // ── Slash Command Routing ──
    if (text.startsWith('/')) {
      handleSlashCommand(text);
      return;
    }

    // ── Keyword Routing ──
    const lower = text.toLowerCase();
    const isVision = /look|see|screen|chart|analyze.*image|what.*on.*screen|capture/i.test(lower);
    const isResearch = /research|deep.*dive|comprehensive.*report|analyze.*vs|compare.*and/i.test(lower);
    const isVisualize = /show.*me|visualize|display.*data|globe|network|graph|3d/i.test(lower);

    if (JARVIS.WS && JARVIS.WS.isConnected()) {
      if (isVision) {
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.addMessage('assistant', '👁️ Click the **Vision** tab in the side panel and use "Share Screen" to let me see what you see.');
        setMode('idle');
        resetCoreIntensity();
        switchPanel('vision');
      } else if (isResearch) {
        JARVIS.WS.send('research', { query: text });
        JARVIS.Chat.addMessage('assistant', '🔬 Initiating deep research on: **' + text + '**');
        switchPanel('research');
      } else if (isVisualize) {
        JARVIS.Viz.showGlobe();
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.addMessage('assistant', '🌐 Loading holographic visualization, sir.');
        setMode('idle');
        resetCoreIntensity();
        switchPanel('viz');
      } else {
        var sessionId = localStorage.getItem('jarvis_session_id') || '';
        JARVIS.WS.send('chat', { text: text, mode: 'text', session_id: sessionId, tts_enabled: !!window._jarvisVoiceEnabled });
      }
    } else {
      setTimeout(() => {
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.addMessage('assistant',
          'I am currently offline, sir. Please start the backend server with:\n\n' +
          '`cd backend && ./venv/bin/python -m uvicorn main:app --port 8765`'
        );
        setMode('idle');
        resetCoreIntensity();
      }, 500);
    }
  }

  // ── Slash Command Handler ──
  function handleSlashCommand(text) {
    var parts = text.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var rest = parts.slice(1).join(' ');

    switch (cmd) {
      case '/help':
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.addMessage('assistant',
          '**Available Commands:**\n\n' +
          '`/research <query>` — Deep web research with cross-validation\n' +
          '`/agents <task>` — Deploy multi-agent swarm to decompose task\n' +
          '`/vision` — Switch to screen capture mode\n' +
          '`/clear` — Clear current conversation\n' +
          '`/status` — Show system status\n' +
          '`/help` — Show this help\n\n' +
          'Or just type naturally — I\'ll route your request automatically.'
        );
        setMode('idle');
        resetCoreIntensity();
        break;

      case '/clear':
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.clear();
        JARVIS.Chat.addMessage('assistant', 'Conversation cleared, sir. Ready for new instructions.');
        // Also clear server-side session
        var sid = localStorage.getItem('jarvis_session_id');
        if (sid) fetch('/api/session/' + sid, { method: 'DELETE' });
        setMode('idle');
        resetCoreIntensity();
        break;

      case '/status':
        JARVIS.Chat.hideTyping();
        fetch('/api/health').then(function(r) { return r.json(); }).then(function(d) {
          JARVIS.Chat.addMessage('assistant',
            '**System Status**\n\n' +
            '- **App:** ' + d.name + ' v' + d.version + '\n' +
            '- **WS Connections:** ' + d.ws_connections + '\n' +
            '- **Active Sessions:** ' + (d.active_sessions || 0) + '\n' +
            '- **Messages Stored:** ' + (d.total_messages || 0) + '\n\n' +
            'All systems nominal.'
          );
        }).catch(function() {
          JARVIS.Chat.addMessage('assistant', '⚠️ Cannot reach backend. Check server status.');
        });
        setMode('idle');
        resetCoreIntensity();
        break;

      case '/research':
        if (!rest) {
          JARVIS.Chat.hideTyping();
          JARVIS.Chat.addMessage('assistant', 'Please provide a research query. Example: `/research AI market trends 2026`');
          setMode('idle');
          resetCoreIntensity();
          return;
        }
        if (JARVIS.WS && JARVIS.WS.isConnected()) {
          JARVIS.WS.send('research', { query: rest });
          JARVIS.Chat.addMessage('assistant', '🔬 Initiating deep research: **' + rest + '**\n\nSearching multiple sources...');
          switchPanel('research');
        }
        break;

      case '/agents':
        if (!rest) {
          JARVIS.Chat.hideTyping();
          JARVIS.Chat.addMessage('assistant', 'Please provide a task for the agent swarm. Example: `/agents Analyze Bitcoin price trends`');
          setMode('idle');
          resetCoreIntensity();
          return;
        }
        if (JARVIS.WS && JARVIS.WS.isConnected()) {
          JARVIS.WS.send('agent_decompose', { query: rest, max_agents: 5 });
          switchPanel('agents');
        }
        break;

      case '/vision':
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.addMessage('assistant', '📸 Switching to vision mode. Click **Share Screen** in the side panel.');
        setMode('idle');
        resetCoreIntensity();
        switchPanel('vision');
        break;

      default:
        // Unknown command — treat as regular chat
        JARVIS.Chat.hideTyping();
        JARVIS.Chat.addMessage('assistant', 'Unknown command: `' + cmd + '`. Type `/help` for available commands.');
        setMode('idle');
        resetCoreIntensity();
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
        switchPanel(tab.dataset.panel);
      });
    });
  }

  function switchPanel(panelName) {
    els.panelTabs.forEach((t) => t.classList.remove('active'));
    const targetTab = document.querySelector(`.panel-tab[data-panel="${panelName}"]`);
    if (targetTab) targetTab.classList.add('active');
    state.activePanel = panelName;
    updateSidePanel(panelName);
  }

  function updateSidePanel(panelName) {
    if (!els.sidePanelContent) return;
    const pn = panelName || state.activePanel;

    switch (pn) {
      case 'viz':
        els.sidePanelContent.innerHTML = `
          <div class="mini-widget">
            <div class="mini-orbit">
              <div class="ring"><div class="dot"></div></div>
              <div class="ring"><div class="dot"></div></div>
              <div class="ring"><div class="dot"></div></div>
            </div>
            <div class="widget-title">Arc Reactor Core</div>
            <div class="widget-value" id="widget-core-status">NOMINAL</div>
            <div class="widget-sub">10 concentric rings · 60 FPS</div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">3D Visualizations</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;">
              <button class="holo-btn sm viz-btn" data-viz="globe" style="font-size:9px;padding:5px 6px;text-align:center;">🌐 Globe</button>
              <button class="holo-btn sm viz-btn" data-viz="network" style="font-size:9px;padding:5px 6px;text-align:center;">🔗 Network</button>
              <button class="holo-btn sm viz-btn" data-viz="bars" style="font-size:9px;padding:5px 6px;text-align:center;">📊 Bars</button>
              <button class="holo-btn sm viz-btn" data-viz="scatter" style="font-size:9px;padding:5px 6px;text-align:center;">✨ Scatter</button>
              <button class="holo-btn sm viz-btn" data-viz="tower" style="font-size:9px;padding:5px 6px;text-align:center;">🗼 Tower</button>
              <button class="holo-btn sm viz-btn" data-viz="particletext" style="font-size:9px;padding:5px 6px;text-align:center;">💬 Text</button>
              <button class="holo-btn sm" id="btn-viz-none" style="font-size:9px;padding:5px 6px;grid-column:1/-1;text-align:center;">✕ Clear</button>
            </div>
            <div class="widget-sub" style="margin-top:8px;">Active: <span id="viz-current">Reactor Core</span></div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Particle Field</div>
            <div class="widget-value" id="widget-particles">2,400</div>
            <div class="widget-sub">energy nodes active</div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Session</div>
            <div class="widget-value" id="widget-session-time">00:00:00</div>
            <div class="widget-sub">since initialization</div>
          </div>`;
        // Wire up viz buttons
        setTimeout(() => {
          document.querySelectorAll('.viz-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const viz = btn.dataset.viz;
              switch (viz) {
                case 'globe': JARVIS.Viz.showGlobe(); break;
                case 'network': JARVIS.Viz.showNetwork(); break;
                case 'bars': JARVIS.Viz.showBarChart(); break;
                case 'scatter': JARVIS.Viz.showScatterPlot(); break;
                case 'tower': JARVIS.Viz.showDataTower(); break;
                case 'particletext': JARVIS.Viz.showParticleText('J.A.R.V.I.S.'); break;
              }
              document.getElementById('viz-current').textContent =
                viz === 'particletext' ? 'Particle Text' :
                viz.charAt(0).toUpperCase() + viz.slice(1);
            });
          });
          document.getElementById('btn-viz-none')?.addEventListener('click', () => {
            JARVIS.Viz.clear();
            document.getElementById('viz-current').textContent = 'Reactor Core';
          });
        }, 100);
        break;

      case 'agents':
        els.sidePanelContent.innerHTML = `
          <div class="mini-widget">
            <div class="widget-title">Agent Swarm Status</div>
            <div class="widget-value" id="agent-count">0 active</div>
            <div class="widget-sub" id="agent-summary">No agents running</div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Recent Activity</div>
            <div id="agent-log" style="font-size:11px;color:var(--fg-tertiary);max-height:300px;overflow-y:auto;">
              <div style="padding:16px;text-align:center;color:var(--fg-tertiary);">
                <div style="font-size:24px;margin-bottom:8px;">🧠</div>
                <div>Awaiting swarm deployment</div>
                <div style="font-size:10px;margin-top:4px;">Send a complex query to trigger agents</div>
              </div>
            </div>
          </div>`;
        break;

      case 'vision':
        els.sidePanelContent.innerHTML = `
          <div class="mini-widget" style="text-align:center;">
            <div class="widget-title">Screen Capture</div>
            <canvas id="vision-preview" width="340" height="200"
              style="width:100%;max-width:340px;height:auto;background:var(--bg-input);border-radius:var(--radius-sm);margin:8px 0;display:block;">
            </canvas>
            <div id="vision-preview-hint" style="font-size:10px;color:var(--fg-tertiary);text-align:center;padding:12px;">
              Click "Share Screen" to begin
            </div>
            <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px;">
              <button class="holo-btn primary sm" id="btn-share-screen" style="font-size:10px;padding:6px 10px;">📸 Share Screen</button>
              <button class="holo-btn sm" id="btn-camera" style="font-size:10px;padding:6px 10px;">📷 Camera</button>
              <button class="holo-btn sm" id="btn-stop-vision" style="font-size:10px;padding:6px 10px;">⏹ Stop</button>
            </div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Actions</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="holo-btn primary" id="btn-analyze-screen" style="flex:1;font-size:10px;padding:6px 10px;text-align:center;justify-content:center;">🔍 Analyze</button>
              <button class="holo-btn" id="btn-ocr-screen" style="flex:1;font-size:10px;padding:6px 10px;text-align:center;justify-content:center;">📝 Extract Text</button>
            </div>
            <div class="widget-sub" style="margin-top:6px;" id="vision-action-status">Ready</div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">OCR Result</div>
            <div id="ocr-result" style="font-size:11px;color:var(--fg-secondary);min-height:40px;max-height:180px;overflow-y:auto;line-height:1.5;">
              <span style="color:var(--fg-tertiary);">Capture screen, then click "Extract Text"</span>
            </div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Gallery</div>
            <div id="vision-gallery" style="display:flex;gap:4px;overflow-x:auto;min-height:50px;align-items:center;">
              <span style="font-size:10px;color:var(--fg-tertiary);">No captures yet</span>
            </div>
          </div>`;
        // Wire up vision panel
        setTimeout(() => wireVisionPanel(), 100);
        break;

      case 'research':
        els.sidePanelContent.innerHTML = `
          <div class="mini-widget">
            <div class="widget-title">Deep Research</div>
            <div style="margin-top:8px;">
              <input type="text" id="research-query" placeholder="Research topic..."
                style="width:100%;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:8px 10px;color:var(--fg-primary);font-size:12px;outline:none;font-family:var(--font-sans);">
              <button class="holo-btn primary" id="btn-research-go" style="width:100%;margin-top:6px;text-align:center;justify-content:center;">🔬 Start Research</button>
            </div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Recent Results</div>
            <div id="research-results" style="font-size:11px;color:var(--fg-tertiary);max-height:300px;overflow-y:auto;">
              <div style="padding:16px;text-align:center;color:var(--fg-tertiary);">
                <div style="font-size:24px;margin-bottom:8px;">🔬</div>
                <div>No research queries yet</div>
              </div>
            </div>
          </div>`;
        setTimeout(() => {
          document.getElementById('btn-research-go')?.addEventListener('click', () => {
            const q = document.getElementById('research-query')?.value.trim();
            if (q && JARVIS.WS && JARVIS.WS.isConnected()) {
              JARVIS.WS.send('agent_decompose', { query: q, max_agents: 3 });
              document.getElementById('research-results').innerHTML =
                '<div style="padding:8px;color:var(--jarvis-blue-light);">🔍 Researching: ' + q + '...</div>';
              JARVIS.Chat.addMessage('assistant', '🔬 Initiating deep research on: **' + q + '**');
            }
          });
        }, 100);
        break;

      case 'armor':
        var currentArmor = document.body.dataset.armor || 'mk50';
        var isArmorActive = JARVIS.Nanoparticles && JARVIS.Nanoparticles.isAssembled();
        var isScanActive = JARVIS.TargetLock && JARVIS.TargetLock.isScanMode();
        var isFlightActive = JARVIS.FlightHUD && JARVIS.FlightHUD.isActive();
        els.sidePanelContent.innerHTML = `
          <div class="mini-widget">
            <button id="armor-toggle-btn" class="${isArmorActive ? 'armor-active' : ''}">
              <span class="armor-icon">🦾</span> ${isArmorActive ? 'ARMOR ACTIVE' : 'ACTIVATE ARMOR'}
            </button>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Armor Skin</div>
            <div class="armor-skin-panel" style="margin-top:8px;">
              <button class="armor-skin-btn ${currentArmor === 'mk50' ? 'active' : ''}" data-armor="mk50">
                <div class="skin-swatch skin-swatch-mk50"></div>
                <div class="skin-info">
                  <span class="skin-name">Mark 50</span>
                  <span class="skin-desc">Nano Blue · Bleeding Edge</span>
                </div>
              </button>
              <button class="armor-skin-btn ${currentArmor === 'mk3' ? 'active' : ''}" data-armor="mk3">
                <div class="skin-swatch skin-swatch-mk3"></div>
                <div class="skin-info">
                  <span class="skin-name">Mark III</span>
                  <span class="skin-desc">Classic Red & Gold · Iconic</span>
                </div>
              </button>
              <button class="armor-skin-btn ${currentArmor === 'war-machine' ? 'active' : ''}" data-armor="war-machine">
                <div class="skin-swatch skin-swatch-war-machine"></div>
                <div class="skin-info">
                  <span class="skin-name">War Machine</span>
                  <span class="skin-desc">Black & Silver · Tactical</span>
                </div>
              </button>
              <button class="armor-skin-btn ${currentArmor === 'hulkbuster' ? 'active' : ''}" data-armor="hulkbuster">
                <div class="skin-swatch skin-swatch-hulkbuster"></div>
                <div class="skin-info">
                  <span class="skin-name">Hulkbuster</span>
                  <span class="skin-desc">Crimson & Gold · Heavy</span>
                </div>
              </button>
            </div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Armor Status</div>
            <div class="widget-value" id="widget-armor-status">${isArmorActive ? 'ACTIVE' : 'STANDBY'}</div>
            <div class="widget-sub" id="widget-armor-sub">${isArmorActive ? 'Nanoparticle armor engaged' : 'Select a skin and activate armor'}</div>
          </div>
          <div class="mini-widget">
            <div class="widget-title">Systems</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">
              <button class="holo-btn sm ${isScanActive ? 'primary' : ''}" id="btn-toggle-scan" style="font-size:10px;padding:8px;text-align:center;justify-content:center;">🎯 Scan</button>
              <button class="holo-btn sm ${isFlightActive ? 'primary' : ''}" id="btn-toggle-flight" style="font-size:10px;padding:8px;text-align:center;justify-content:center;">✈️ Flight</button>
            </div>
            <div class="widget-sub" style="margin-top:6px;">Hotkeys: S = Scan · F = Flight · G = Gestures</div>
          </div>`;
        setTimeout(function() {
          wireArmorPanel();
        }, 100);
        break;
    }
  }

  // ── Wire Armor Panel ──
  function wireArmorPanel() {
    // Skin switcher
    document.querySelectorAll('.armor-skin-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var armor = this.dataset.armor;
        switchArmorSkin(armor);
        // Update active states
        document.querySelectorAll('.armor-skin-btn').forEach(function(b) {
          b.classList.toggle('active', b.dataset.armor === armor);
        });
      });
    });

    // Scan mode toggle
    var scanBtn = document.getElementById('btn-toggle-scan');
    if (scanBtn) {
      scanBtn.addEventListener('click', function() {
        if (JARVIS.TargetLock) {
          JARVIS.TargetLock.isScanMode() ? JARVIS.TargetLock.deactivate() : JARVIS.TargetLock.activate();
          this.classList.toggle('primary', JARVIS.TargetLock.isScanMode());
        }
      });
    }

    // Flight HUD toggle
    var flightBtn = document.getElementById('btn-toggle-flight');
    if (flightBtn) {
      flightBtn.addEventListener('click', function() {
        if (JARVIS.FlightHUD) {
          JARVIS.FlightHUD.toggle();
          this.classList.toggle('primary', JARVIS.FlightHUD.isActive());
        }
      });
    }

    // ARMOR toggle button — delegates to global mode switcher
    var armorBtn = document.getElementById('armor-toggle-btn');
    if (armorBtn) {
      armorBtn.addEventListener('click', function() {
        window._jarvisSwitchMode && window._jarvisSwitchMode('armor');
      });
    }
  }

  // ── Armor Control Bar (top-mounted hardware buttons) ──
  function setupArmorControlBar() {
    // Deferred setup — DOM may still be settling
    var attempts = 0;
    var maxAttempts = 20;

    function trySetup() {
      attempts++;
      var armorMainBtn = document.getElementById('armor-main-btn');
      var scanBtn = document.getElementById('armor-scan-btn');
      var flightBtn = document.getElementById('armor-flight-btn');
      var skinDots = document.querySelectorAll('.skin-dot');

      if (!armorMainBtn && attempts < maxAttempts) {
        return setTimeout(trySetup, 200);
      }

      console.log('[ARMOR BAR] Setup attempt ' + attempts +
        ' — ArmorBtn:' + !!armorMainBtn +
        ' ScanBtn:' + !!scanBtn +
        ' FlightBtn:' + !!flightBtn +
        ' SkinDots:' + skinDots.length);

      // === ARMOR main button — now handled by onclick="_jarvisSwitchMode('armor')" in HTML ===
      // No duplicate handler needed here; the global onclick is the single source of truth.

      // === Skin dots ===
      skinDots.forEach(function(dot) {
        if (dot._wired) return;
        dot._wired = true;
        dot.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var skin = this.dataset.skin;
          console.log('[ARMOR BAR] Skin dot clicked: ' + skin);
          switchArmorSkin(skin);
          document.querySelectorAll('.skin-dot').forEach(function(d) {
            d.classList.toggle('active', d.dataset.skin === skin);
          });
        });
      });

      // === Scan button ===
      if (scanBtn && !scanBtn._wired) {
        scanBtn._wired = true;
        scanBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          console.log('[ARMOR BAR] Scan button clicked');
          if (JARVIS.TargetLock) {
            if (JARVIS.TargetLock.isScanMode()) {
              JARVIS.TargetLock.deactivate();
              this.classList.remove('active');
            } else {
              JARVIS.TargetLock.activate();
              this.classList.add('active');
              spawnFloatLabel('SCAN MODE');
            }
          }
        });
      }

      // === Flight button ===
      if (flightBtn && !flightBtn._wired) {
        flightBtn._wired = true;
        flightBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          console.log('[ARMOR BAR] Flight button clicked');
          if (JARVIS.FlightHUD) {
            JARVIS.FlightHUD.toggle();
            this.classList.toggle('active', JARVIS.FlightHUD.isActive());
            if (JARVIS.FlightHUD.isActive()) spawnFloatLabel('FLIGHT HUD');
          }
        });
      }
    }

    trySetup();

    // === Keyboard shortcuts (only set up once) ===
    if (!setupArmorControlBar._keysWired) {
      setupArmorControlBar._keysWired = true;
      document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.key.toLowerCase()) {
          case 's':
            if (!e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              var sb = document.getElementById('armor-scan-btn');
              if (sb) sb.click();
            }
            break;
          case 'f':
            if (!e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              var fb = document.getElementById('armor-flight-btn');
              if (fb) fb.click();
            }
            break;
          case 'g':
            if (!e.ctrlKey && !e.metaKey && JARVIS.Gestures) {
              JARVIS.Gestures.toggle();
            }
            break;
        }
      });
    }
  }

  function updateArmorBarStatus(status) {
    var statusEl = document.getElementById('widget-armor-status');
    if (statusEl) statusEl.textContent = status;
  }

  function switchArmorSkin(armor) {
    console.log('[ARMOR SKIN] Switching to: ' + armor);
    document.body.dataset.armor = armor;
    document.body.setAttribute('data-armor', armor);
    localStorage.setItem('jarvis_armor_skin', armor);

    // Update skin dot active states
    document.querySelectorAll('.skin-dot').forEach(function(d) {
      d.classList.toggle('active', d.dataset.skin === armor);
    });

    triggerCoreBurst();
    spawnFloatLabel(armor.toUpperCase() + ' ENGAGED');

    // Update Three.js core color based on skin
    if (JARVIS.Scene && JARVIS.Scene.setCoreColor) {
      var colors = {
        'mk50': '#3B82F6',
        'mk3': '#DC2626',
        'war-machine': '#9CA3AF',
        'hulkbuster': '#991B1B'
      };
      JARVIS.Scene.setCoreColor(colors[armor] || '#3B82F6');
    }

    // Dispatch event for other modules (Avatar, Nanoparticles)
    window.dispatchEvent(new CustomEvent('jarvis-armor-change', {
      detail: { skin: armor }
    }));
  }

  function updateArmorStatus(status, sub) {
    var statusEl = document.getElementById('widget-armor-status');
    var subEl = document.getElementById('widget-armor-sub');
    if (statusEl) statusEl.textContent = status;
    if (subEl) subEl.textContent = sub;
  }

  function restoreArmorSkin() {
    var saved = localStorage.getItem('jarvis_armor_skin');
    if (saved && saved !== 'mk50') {
      switchArmorSkin(saved);
    }
  }

  // ── Float Labels ──
  function spawnFloatLabel(text) {
    const label = document.createElement('div');
    label.className = 'float-label';
    label.textContent = text;
    // Random position near center-right
    const x = window.innerWidth * 0.55 + Math.random() * window.innerWidth * 0.25;
    const y = window.innerHeight * 0.4 + Math.random() * window.innerHeight * 0.2;
    label.style.left = x + 'px';
    label.style.top = y + 'px';
    document.body.appendChild(label);
    setTimeout(() => label.remove(), 2600);
  }

  // ── Diagnostic Flash ──
  function triggerDiagFlash() {
    const flash = document.getElementById('diag-flash');
    if (!flash) return;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 150);
  }

  // ── Data Streams (side gutters) ──
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

  // ── Edge Data Tickers (Iron Man style) ──
  function initDataTickers() {
    var topItems = [
      ['ARC', 'STABLE', 'ok'],
      ['THRUST', '100%', 'warm'],
      ['ALT', '3,200M', 'ok'],
      ['HDG', '274°', 'warm'],
      ['TEMP', '37.2°C', 'ok'],
      ['PWR', '1.8GW', 'warm'],
      ['EFF', '97.4%', 'ok'],
      ['COMMS', 'ENCRYPT', 'ok'],
    ];
    var bottomItems = [
      ['FLT', 'NOMINAL', 'warm'],
      ['SENS', 'ACTIVE', 'ok'],
      ['NEURAL', 'SYNCED', 'ok'],
      ['QNTM', 'STABLE', 'warm'],
      ['REPULSOR', 'ON', 'ok'],
      ['NAV', 'GPS LOCK', 'ok'],
    ];

    function buildTickerHTML(items) {
      var html = '';
      for (var rep = 0; rep < 4; rep++) {
        for (var i = 0; i < items.length; i++) {
          var cls = items[i][2] === 'warm' ? 'ticker-item warm' : 'ticker-item';
          html += '<span class="' + cls + '"><span class="ticker-dot"></span><span class="ticker-label">' + items[i][0] + '</span> <span class="ticker-value">' + items[i][1] + '</span></span>';
        }
      }
      return html;
    }

    var topEl = document.getElementById('ticker-top-content');
    var bottomEl = document.getElementById('ticker-bottom-content');
    if (topEl) topEl.innerHTML = buildTickerHTML(topItems);
    if (bottomEl) bottomEl.innerHTML = buildTickerHTML(bottomItems);
  }

  // ── Diagnostic Panel Updates ──
  function setupDiagPanels() {
    const startTime = Date.now();
    function updateDiags() {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = uptime % 60;

      const uptimeEl = document.getElementById('diag-uptime');
      const loadEl = document.getElementById('diag-load');
      const tempEl = document.getElementById('diag-temp');
      const latEl = document.getElementById('diag-lat');

      if (uptimeEl) uptimeEl.textContent = String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
      if (loadEl) loadEl.textContent = Math.floor(15 + Math.random() * 30) + '%';
      if (tempEl) tempEl.textContent = (36.5 + Math.random() * 1.8).toFixed(1) + '°C';
      if (latEl) latEl.textContent = Math.floor(8 + Math.random() * 20) + 'ms';
    }
    updateDiags();
    setInterval(updateDiags, 3000);
  }

  // ── Welcome Message (Jarvis personality) ──
  function showWelcome() {
    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    JARVIS.Chat.addMessage('assistant',
      "Good " + greeting + ". I am **J.A.R.V.I.S.** — Just A Rather Very Intelligent System.\n\n" +
      "The arc reactor core before you represents my cognitive state — it accelerates when I am processing " +
      "information and pulses gently during idle periods. The concentric triangular rings are inspired by " +
      "the Mark III chest piece, Mr. Stark's design.\n\n" +
      "My systems are fully operational:\n" +
      "- **Streaming AI** — real-time token-by-token responses\n" +
      "- **Session Memory** — I remember our conversation\n" +
      "- **Vision System** — screen capture + camera analysis\n" +
      "- **Agent Swarm** — complex tasks decomposed across parallel AI agents\n" +
      "- **Deep Research** — web search with cross-validation\n" +
      "- **File Analysis** — drag & drop PDF, Word, Excel, images\n\n" +
      "Type `/help` for commands or try one of these:"
    );
    // Add quick action buttons
    setTimeout(function() {
      var chat = document.getElementById('chat-container');
      if (!chat) return;
      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'quick-actions';
      var actions = [
        ['🔍 Search News', '/research Latest AI breakthroughs 2026'],
        ['📊 Analyze Data', 'I have some data I need you to analyze'],
        ['📸 Screenshot Analysis', '/vision'],
        ['🧠 Multi-Agent Study', '/agents Research quantum computing advances'],
      ];
      actions.forEach(function(a) {
        var btn = document.createElement('button');
        btn.className = 'quick-action-btn';
        btn.textContent = a[0];
        btn.addEventListener('click', function() {
          var inp = document.getElementById('user-input');
          if (inp) { inp.value = a[1]; inp.focus(); }
        });
        actionsDiv.appendChild(btn);
      });
      chat.appendChild(actionsDiv);
      chat.scrollTop = chat.scrollHeight;
    }, 200);
  }

  // ── Mode Management ──
  function setMode(mode) {
    state.mode = mode;
    document.body.dataset.mode = mode;

    // ── Trigger 3D Holographic Avatar ──
    if (mode === 'speaking' || mode === 'thinking') {
      if (JARVIS.Avatar && JARVIS.Avatar.setActive) JARVIS.Avatar.setActive(true);
    } else if (mode === 'idle') {
      if (JARVIS.Avatar && JARVIS.Avatar.setActive) JARVIS.Avatar.setActive(false);
    }

    // ── Heartbeat sync ──
    if (JARVIS.Heartbeat) {
      if (mode === 'thinking') JARVIS.Heartbeat.setMode('thinking');
      else if (mode === 'listening') JARVIS.Heartbeat.setMode('listening');
      else if (mode === 'speaking') JARVIS.Heartbeat.setMode('busy');
      else JARVIS.Heartbeat.setMode('idle');
    }

    // ── Trigger diagnostic flash on mode change ──
    if (mode === 'thinking') triggerDiagFlash();
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
    // Update network diag panel
    const linkEl = document.getElementById('diag-link');
    if (linkEl) {
      linkEl.textContent = online ? 'ACTIVE' : 'DOWN';
      linkEl.className = 'diag-val ' + (online ? 'ok' : 'warn');
    }
  }

  function getState() { return state; }

  // ── Toast Notifications ──
  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    // Auto-remove after animation
    setTimeout(function() {
      if (toast.parentNode) toast.remove();
    }, 3100);
  }

  // Wire WS status toasts
  if (JARVIS.WS) {
    var origOn = JARVIS.WS.on;
    JARVIS.WS.on('connected', function() {
      showToast('J.A.R.V.I.S. link established', 'success');
    });
    JARVIS.WS.on('disconnected', function() {
      showToast('Connection lost. Reconnecting...', 'warn');
    });
  }

  // ── Status Bar Live Metrics ──
  function setupMetrics() {
    function tick() {
      var cpuEl = document.getElementById('metric-cpu');
      var memEl = document.getElementById('metric-mem');
      var wsEl  = document.getElementById('metric-ws');
      var pingEl = document.getElementById('metric-ping');

      var cpu = Math.floor(18 + Math.random() * 25);
      var mem = Math.floor(420 + Math.random() * 180);
      var net = Math.floor(60 + Math.random() * 35);

      if (cpuEl) cpuEl.textContent = cpu + '%';
      if (memEl) memEl.textContent = mem + 'MB';
      if (wsEl)  wsEl.textContent  = (JARVIS.WS && JARVIS.WS.isConnected() ? 'LIVE' : '---');
      if (pingEl) {
        var ping = Math.floor(8 + Math.random() * 25);
        pingEl.textContent = ping + 'ms';
      }

      // Update data rings
      var r1 = document.querySelector('.holo-ring-1');
      var r2 = document.querySelector('.holo-ring-2');
      var r3 = document.querySelector('.holo-ring-3');
      if (r1) r1.style.background = 'conic-gradient(from -90deg, rgba(59,130,246,0.2) 0deg ' + (cpu * 3.6) + 'deg, transparent ' + (cpu * 3.6) + 'deg 360deg)';
      if (r2) r2.style.background = 'conic-gradient(from -90deg, rgba(255,215,0,0.18) 0deg ' + (mem / 6) + 'deg, transparent ' + (mem / 6) + 'deg 360deg)';
      if (r3) r3.style.background = 'conic-gradient(from -90deg, rgba(6,182,212,0.22) 0deg ' + (net * 3.6) + 'deg, transparent ' + (net * 3.6) + 'deg 360deg)';
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
      const opacity = 0.32 + Math.sin(time) * 0.10;
      vignette.style.opacity = opacity;
      requestAnimationFrame(breathe);
    }
    breathe();
  }

  // ── Perspective Parallax ──
  function setupPerspectiveParallax() {
    var targetRY = 0, targetRX = 0;
    var currentRY = 0, currentRX = 0;

    document.addEventListener('mousemove', function(e) {
      var x = (e.clientX / window.innerWidth) * 2 - 1;
      var y = (e.clientY / window.innerHeight) * 2 - 1;
      targetRY = x * 0.5;
      targetRX = y * -0.4;
    });

    function animateTilt() {
      // Smooth lerp
      currentRY += (targetRY - currentRY) * 0.04;
      currentRX += (targetRX - currentRX) * 0.04;
      // Only update if change is meaningful
      if (Math.abs(currentRY) > 0.01 || Math.abs(currentRX) > 0.01) {
        var sidePanel = document.getElementById('side-panel');
        var mainPanel = document.getElementById('main-panel');
        if (sidePanel) {
          sidePanel.style.transform =
            'perspective(1200px) rotateY(' + (-2 + currentRY * 0.6).toFixed(2) + 'deg) rotateX(' + (0.5 + currentRX * 0.6).toFixed(2) + 'deg)';
        }
        if (mainPanel) {
          mainPanel.style.transform =
            'perspective(1200px) rotateY(' + (1 + currentRY * 0.4).toFixed(2) + 'deg) rotateX(' + (-0.5 + currentRX * 0.5).toFixed(2) + 'deg)';
        }
      }
      requestAnimationFrame(animateTilt);
    }
    animateTilt();
  }

  // ── Reticle Lock-On ──
  function setupReticleLockOn() {
    var reticle = document.getElementById('target-reticle');
    if (!reticle) return;
    var interactiveSel = 'button, a, .holo-btn, .panel-tab, input, .message, .mini-widget';
    document.addEventListener('mouseover', function(e) {
      var target = e.target.closest(interactiveSel);
      if (target) { reticle.classList.add('locked'); }
    });
    document.addEventListener('mouseout', function(e) {
      var target = e.target.closest(interactiveSel);
      if (target) {
        var related = e.relatedTarget;
        if (!related || !related.closest(interactiveSel)) {
          reticle.classList.remove('locked');
        }
      }
    });
  }
  function wireVisionPanel() {
    var currentFrame = null;

    // Set up vision callbacks
    JARVIS.Vision.setCallbacks(
      // Preview update
      function(frame) {
        currentFrame = frame;
        var canvas = document.getElementById('vision-preview');
        var hint = document.getElementById('vision-preview-hint');
        if (!canvas) return;
        var img = new Image();
        img.onload = function() {
          var ctx = canvas.getContext('2d');
          canvas.width = Math.min(340, img.width);
          canvas.height = (canvas.width / img.width) * img.height;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          if (hint) hint.style.display = 'none';
          // Update gallery
          updateVisionGallery();
        };
        img.src = frame;
      },
      // Status change
      function(status) {
        var el = document.getElementById('vision-action-status');
        if (el) {
          if (status === 'capturing') el.textContent = 'Screen capture active';
          else if (status === 'camera') el.textContent = 'Camera active';
          else if (status === 'error') el.textContent = 'Error — check console';
          else el.textContent = 'Ready';
        }
      }
    );

    // Share Screen button
    document.getElementById('btn-share-screen')?.addEventListener('click', async function() {
      var canvas = document.getElementById('vision-preview');
      if (canvas) {
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0A1220';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#556278';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText('Select a screen or window to share...', 10, 30);
      }
      // Stop camera if active
      if (JARVIS.Vision.getIsCameraActive()) JARVIS.Vision.stopCamera();
      var ok = await JARVIS.Vision.startCapture(function(frame) {
        currentFrame = frame;
      }, 3);
      if (ok) {
        var statusEl = document.getElementById('vision-action-status');
        if (statusEl) statusEl.textContent = 'Screen capture active';
        var changeEl = document.getElementById('change-indicator');
        if (changeEl) changeEl.textContent = '🟢 Active';
      }
    });

    // Camera button
    document.getElementById('btn-camera')?.addEventListener('click', async function() {
      if (JARVIS.Vision.getIsCapturing()) JARVIS.Vision.stopCapture();
      var ok = await JARVIS.Vision.startCamera(function(frame) {
        currentFrame = frame;
      });
      if (ok) {
        var statusEl = document.getElementById('vision-action-status');
        if (statusEl) statusEl.textContent = 'Camera active';
      }
    });

    // Stop button
    document.getElementById('btn-stop-vision')?.addEventListener('click', function() {
      JARVIS.Vision.stopCapture();
      JARVIS.Vision.stopCamera();
      currentFrame = null;
      var statusEl = document.getElementById('vision-action-status');
      if (statusEl) statusEl.textContent = 'Ready';
      var changeEl = document.getElementById('change-indicator');
      if (changeEl) changeEl.textContent = '⏸ Idle';
    });

    // Analyze button
    document.getElementById('btn-analyze-screen')?.addEventListener('click', async function() {
      if (!currentFrame) {
        var statusEl = document.getElementById('vision-action-status');
        if (statusEl) statusEl.textContent = 'Capture screen first!';
        return;
      }
      var statusEl = document.getElementById('vision-action-status');
      if (statusEl) statusEl.textContent = 'Analyzing...';
      JARVIS.Chat.showTyping();
      var result = await JARVIS.Vision.analyzeFrame(currentFrame,
        'Analyze this screen in detail. What application is this? What data, text, or visual elements are visible? Be thorough.');
      JARVIS.Chat.hideTyping();
      if (result.error) {
        JARVIS.Chat.addMessage('assistant', '⚠️ Vision analysis failed: ' + result.error);
        if (statusEl) statusEl.textContent = 'Analysis failed';
      } else {
        JARVIS.Chat.addMessage('assistant', '👁️ **Screen Analysis** (' + (result.method || 'vision') + ')\n\n' + result.analysis);
        if (statusEl) statusEl.textContent = 'Analysis complete (' + Math.round(result.duration_ms || 0) + 'ms)';
        JARVIS.App.spawnFloatLabel('VISION COMPLETE');
      }
    });

    // OCR button
    document.getElementById('btn-ocr-screen')?.addEventListener('click', async function() {
      if (!currentFrame) {
        var statusEl = document.getElementById('vision-action-status');
        if (statusEl) statusEl.textContent = 'Capture screen first!';
        return;
      }
      var statusEl = document.getElementById('vision-action-status');
      if (statusEl) statusEl.textContent = 'Extracting text...';
      var result = await JARVIS.Vision.extractText(currentFrame);
      var ocrEl = document.getElementById('ocr-result');
      if (result.error) {
        if (ocrEl) ocrEl.innerHTML = '<span style="color:var(--jarvis-red);">OCR failed: ' + result.error + '</span>';
        if (statusEl) statusEl.textContent = 'OCR failed';
      } else {
        if (ocrEl) {
          var html = '<div style="font-size:10px;color:var(--fg-tertiary);margin-bottom:4px;">Engine: ' + (result.engine || 'unknown') + ' · Confidence: ' + Math.round((result.confidence || 0) * 100) + '%</div>';
          html += '<div style="white-space:pre-wrap;">' + (result.text || '(no text found)') + '</div>';
          ocrEl.innerHTML = html;
        }
        if (statusEl) statusEl.textContent = 'OCR complete (' + (result.blocks ? result.blocks.length : 0) + ' blocks)';
        JARVIS.App.spawnFloatLabel('OCR COMPLETE');
      }
    });

    // Initial draw on preview canvas
    var previewCanvas = document.getElementById('vision-preview');
    if (previewCanvas) {
      var pctx = previewCanvas.getContext('2d');
      pctx.fillStyle = '#0A1220';
      pctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      pctx.fillStyle = '#556278';
      pctx.font = '11px Inter, sans-serif';
      pctx.textAlign = 'center';
      pctx.fillText('No capture active', previewCanvas.width / 2, previewCanvas.height / 2);
    }
  }

  function updateVisionGallery() {
    var gallery = document.getElementById('vision-gallery');
    if (!gallery) return;
    var frames = JARVIS.Vision.getGallery();
    if (!frames.length) {
      gallery.innerHTML = '<span style="font-size:10px;color:var(--fg-tertiary);">No captures yet</span>';
      return;
    }
    var html = '';
    frames.forEach(function(f, i) {
      html += '<img src="' + f + '" style="width:48px;height:36px;object-fit:cover;border-radius:3px;border:1px solid var(--border-subtle);opacity:' + (1 - i * 0.15) + ';" title="Capture ' + (i + 1) + '">';
    });
    gallery.innerHTML = html;
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

  // ── Session Management ──
  function initSession() {
    var sid = localStorage.getItem('jarvis_session_id');
    if (!sid) {
      // Create session via REST
      fetch('/api/session', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          localStorage.setItem('jarvis_session_id', data.session_id);
          console.log('%c[J.A.R.V.I.S.] %cSession created: %c' + data.session_id.slice(0, 8),
            'color: #60A5FA;', 'color: #F59E0B;', 'color: #94A3B8;');
        })
        .catch(function() {
          // Generate local fallback
          var fallback = 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
          localStorage.setItem('jarvis_session_id', fallback);
        });
    }
  }

  return {
    init, getState, setMode, updateOnlineStatus,
    triggerCoreBurst, spawnFloatLabel, triggerDiagFlash,
    updateSidePanel, switchPanel,
    switchArmorSkin, restoreArmorSkin,
  };
})();

window.JARVIS = JARVIS;
