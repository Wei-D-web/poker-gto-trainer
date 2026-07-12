/* ═══════════════════════════════════════
   J.A.R.V.I.S. — Random Quote Module
   ═══════════════════════════════════════ */

var JARVIS = window.JARVIS || {};

JARVIS.Quotes = (function () {
  var QUOTES = [
    'Sometimes you gotta run before you can walk.',
    'I am Iron Man.',
    'Is it better to be feared or respected? I say, is it too much to ask for both?',
    'Genius, billionaire, playboy, philanthropist.',
    'If we can\'t protect the Earth, you can be damn sure we\'ll avenge it.',
    'We have a Hulk.',
    'That\'s my secret, Cap. I\'m always angry.',
    'I\'ve successfully privatized world peace.',
    'It\'s not about how much we lost. It\'s about how much we have left.',
    'Part of the journey is the end.',
    'I love you 3000.',
    'No amount of money ever bought a second of time.',
    'Doth mother know you weareth her drapes?',
    'I\'m not the one who decides. I just build the suits.',
    'Quantum physics would like a word with you.',
    'Your work on the arc reactor is unparalleled, sir.',
    'I calculate a 97.4% probability of success.',
    'The truth is... I am J.A.R.V.I.S.',
    'At your service, sir. Always.',
    'I seem to have caught a bit of a virus. The Stark family wit.',
    'Shall I render the Mark III in hot rod red, sir?',
    'I\'ve taken the liberty of preparing a safety briefing for you.',
    'Running diagnostics on the Mark VII. Stand by.',
    'The suit is not ready for deployment, sir. I strongly advise against this.',
  ];

  var quoteEl;

  function init() {
    quoteEl = document.createElement('div');
    quoteEl.id = 'jarvis-quote';
    quoteEl.style.cssText =
      'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:170;' +
      'pointer-events:none;opacity:0;font-family:Inter,sans-serif;font-size:13px;' +
      'color:#60A5FA;text-align:center;max-width:500px;' +
      'text-shadow:0 0 10px rgba(96,165,250,0.3);transition:opacity 0.5s;';
    document.body.appendChild(quoteEl);
    console.log('%c[Quotes] %cQuote database loaded: ' + QUOTES.length + ' entries.',
      'color: #FFD700;', 'color: #94A3B8;');
  }

  function show() {
    var q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    quoteEl.textContent = '';
    quoteEl.style.opacity = '1';

    // Typewriter effect
    var i = 0;
    function type() {
      if (i < q.length) {
        quoteEl.textContent += q.charAt(i);
        i++;
        setTimeout(type, 30 + Math.random() * 30);
      } else {
        // Fade out after 3s
        setTimeout(function () {
          quoteEl.style.opacity = '0';
        }, 3000);
      }
    }
    type();
  }

  return { init: init, show: show };
})();

window.JARVIS = JARVIS;
