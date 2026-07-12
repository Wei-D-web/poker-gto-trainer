/* ==========================================
   J.A.R.V.I.S. — Chat Panel
   Enhanced typewriter with character shimmer
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Chat = (function () {
  let container;
  let typingEl = null;
  let typewriterTimer = null;
  // Streaming state
  let streamMsgEl = null;
  let streamBubble = null;
  let streamBuffer = '';

  function init() {
    container = document.getElementById('chat-container');
  }

  // ── Streaming Support ──

  function startStreaming() {
    hideTyping();
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'message assistant';

    const avatarEl = document.createElement('div');
    avatarEl.className = 'message-avatar';
    avatarEl.textContent = 'J';

    const body = document.createElement('div');
    body.className = 'message-body';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = '<span class="typing-cursor"></span>';

    body.appendChild(bubble);
    msgEl.appendChild(avatarEl);
    msgEl.appendChild(body);
    container.appendChild(msgEl);

    streamMsgEl = msgEl;
    streamBubble = bubble;
    streamBuffer = '';
    container.scrollTop = container.scrollHeight;
  }

  function appendStreamToken(fullText) {
    if (!streamBubble) return;
    streamBuffer = fullText;
    streamBubble.innerHTML = formatContent(fullText) + '<span class="typing-cursor"></span>';
    container.scrollTop = container.scrollHeight;
  }

  function finalizeStreaming(fullText) {
    if (!streamBubble) return;
    streamBubble.innerHTML = formatContent(fullText);
    // Add timestamp
    const body = streamMsgEl.querySelector('.message-body');
    if (body) {
      const time = document.createElement('div');
      time.className = 'message-time';
      time.textContent = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
      body.appendChild(time);
    }
    streamMsgEl = null;
    streamBubble = null;
    streamBuffer = '';
    container.scrollTop = container.scrollHeight;
  }

  function addMessage(role, content, opts = {}) {
    if (!container) return;

    // Fade out welcome message if present
    const welcome = container.querySelector('.welcome-message');
    if (welcome) {
      welcome.style.transition = 'opacity 0.3s';
      welcome.style.opacity = '0';
      setTimeout(() => { if (welcome.parentNode) welcome.remove(); }, 300);
    }

    const msgEl = document.createElement('div');
    msgEl.className = 'message ' + role;

    const avatar = role === 'user' ? 'YOU' : 'J';
    const avatarEl = document.createElement('div');
    avatarEl.className = 'message-avatar';
    avatarEl.textContent = avatar;

    const body = document.createElement('div');
    body.className = 'message-body';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    body.appendChild(bubble);
    body.appendChild(time);
    msgEl.appendChild(avatarEl);
    msgEl.appendChild(body);
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;

    // Typewriter for assistant messages — with character-by-character reveal
    if (opts.typewriter && role === 'assistant') {
      const rawHTML = formatContent(content);
      const temp = document.createElement('div');
      temp.innerHTML = rawHTML;
      const plainText = temp.textContent || '';
      let idx = 0;
      const totalLen = plainText.length;
      // Dynamic speed: faster for longer messages
      const baseSpeed = totalLen > 500 ? 6 : totalLen > 200 ? 10 : 14;
      const charSpeed = baseSpeed + Math.random() * 8;

      function typeNext() {
        if (idx < totalLen) {
          idx++;
          const partial = plainText.substring(0, idx);
          const lastChar = partial.charAt(partial.length - 1);
          // Add shimmer class to last character for glow effect
          bubble.innerHTML = escapeHTML(partial.substring(0, idx - 1))
            + '<span class="typing-char-glow">' + escapeHTML(lastChar) + '</span>'
            + '<span class="typing-cursor"></span>';
          container.scrollTop = container.scrollHeight;
          typewriterTimer = setTimeout(typeNext, charSpeed);
        } else {
          bubble.innerHTML = rawHTML;
          container.scrollTop = container.scrollHeight;
        }
      }
      // Start after a brief delay for natural feel
      typewriterTimer = setTimeout(typeNext, 100);
    } else {
      bubble.innerHTML = formatContent(content);
    }

    return msgEl;
  }

  function escapeHTML(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatContent(text) {
    // Headers
    text = text.replace(/^### (.*$)/gm, '<h4 style="color:var(--jarvis-blue-light);margin:10px 0 4px;font-size:13px;">$1</h4>');
    text = text.replace(/^## (.*$)/gm, '<h3 style="color:var(--fg-primary);margin:14px 0 6px;font-size:14px;">$1</h3>');
    text = text.replace(/^# (.*$)/gm, '<h2 style="color:var(--fg-primary);margin:16px 0 8px;font-size:15px;">$1</h2>');
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // List items
    text = text.replace(/^- (.*$)/gm, '<li style="margin-left:16px;color:var(--fg-secondary);">$1</li>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  function showTyping() {
    if (!container || typingEl) return;
    // Cancel any running typewriter
    if (typewriterTimer) {
      clearTimeout(typewriterTimer);
      typewriterTimer = null;
    }

    typingEl = document.createElement('div');
    typingEl.className = 'message assistant';
    typingEl.innerHTML =
      '<div class="message-avatar">J</div>' +
      '<div class="message-body">' +
        '<div class="typing-indicator">' +
          '<div class="typing-dots">' +
            '<span></span><span></span><span></span>' +
          '</div>' +
          'Processing' +
        '</div>' +
      '</div>';
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  function clear() {
    if (!container) return;
    if (typewriterTimer) {
      clearTimeout(typewriterTimer);
      typewriterTimer = null;
    }
    container.innerHTML = '';
    typingEl = null;
  }

  return { init, addMessage, showTyping, hideTyping, clear, escapeHTML,
           startStreaming, appendStreamToken, finalizeStreaming };
})();

window.JARVIS = JARVIS;
