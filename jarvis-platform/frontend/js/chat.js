/* ==========================================
   J.A.R.V.I.S. — Chat Panel
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Chat = (function () {
  let container;
  let typingEl = null;

  function init() {
    container = document.getElementById('chat-container');
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
    msgEl.className = `message ${role}`;

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

    // Typewriter for assistant messages
    if (opts.typewriter && role === 'assistant') {
      const rawHTML = formatContent(content);
      // Get plain text for character-by-character reveal
      const temp = document.createElement('div');
      temp.innerHTML = rawHTML;
      const plainText = temp.textContent || '';
      let idx = 0;
      const charSpeed = 12 + Math.random() * 16; // 12-28ms per char

      function typeNext() {
        if (idx < plainText.length) {
          idx++;
          const partial = plainText.substring(0, idx);
          bubble.innerHTML = escapeHTML(partial) + '<span class="typing-cursor"></span>';
          container.scrollTop = container.scrollHeight;
          setTimeout(typeNext, charSpeed);
        } else {
          bubble.innerHTML = rawHTML;
          container.scrollTop = container.scrollHeight;
        }
      }
      setTimeout(typeNext, 80);
    } else {
      bubble.innerHTML = formatContent(content);
    }

    return msgEl;
  }

  function escapeHTML(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatContent(text) {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  function showTyping() {
    if (!container || typingEl) return;

    typingEl = document.createElement('div');
    typingEl.className = 'message assistant';
    typingEl.innerHTML = `
      <div class="message-avatar">J</div>
      <div class="message-body">
        <div class="typing-indicator">
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
          Processing
        </div>
      </div>
    `;
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
    container.innerHTML = '';
    typingEl = null;
  }

  return { init, addMessage, showTyping, hideTyping, clear, escapeHTML };
})();

window.JARVIS = JARVIS;
