/* Rotating "from the blog" quote toast. Loaded ONLY on /blog.
   Desktop only, gentle (no strobe), dismissible for the session.
   Each toast links to its article. No dependencies, no tracking.
   Test hook: add ?toastnow to the URL to show immediately. */
(function () {
  'use strict';

  // Curated punchy lines, weighted toward the articles lower down the page
  // so the toast pushes traffic to the ones that get less attention.
  var QUOTES = [
    { q: 'Don’t 33x your parents. That funds them until the year 2100.', title: 'How Many Crores to FIRE in India', url: '/blog/fire-in-india-how-many-crores' },
    { q: 'Healthcare inflates at 12% a year. You cannot fund it like groceries.', title: 'How Many Crores to FIRE in India', url: '/blog/fire-in-india-how-many-crores' },
    { q: 'A flat that’s paid off in Mumbai buys you a tier 2 cost of living in a tier 1 city.', title: 'How Many Crores to FIRE in India', url: '/blog/fire-in-india-how-many-crores' },
    { q: 'A bad first year in the market should never force you to sell at the bottom. That is what the cash bucket is for.', title: 'The 3-Bucket Strategy', url: '/blog/three-bucket-strategy-fire' },
    { q: 'I FIRE’d as an NRI not by moving back to India, but by geo-arbitraging to Southeast Asia.', title: 'Retire in Southeast Asia as an Indian', url: '/blog/retire-in-southeast-asia-as-an-indian' },
    { q: 'Every 3 months I do a $300 visa run. It is the Vietnam tax on an Indian passport.', title: 'Vietnam Visa for Indians', url: '/blog/vietnam-visa-for-indians' },
    { q: 'Geography, not the amount, decides whether $500k is enough to retire on.', title: 'Can You Retire at 35 With $500k?', url: '/blog/can-i-retire-at-35-with-500k' },
    { q: 'Your FIRE number tells you the target. It does not prove the plan survives bad timing.', title: 'Calculating Your FIRE Number', url: '/blog/calculating-fire-number' },
    { q: 'The moment you need insurance is the exact moment you can no longer buy it.', title: 'Can a Major Illness End Your Lean FIRE?', url: '/blog/can-a-major-illness-end-lean-fire' },
    { q: 'Once your money grows past a point, it does more work than you ever could by saving.', title: 'Lean FIRE to Regular FIRE', url: '/blog/lean-fire-to-regular-fire' },
    { q: 'Work was never the problem. Being answerable to someone else’s dream was.', title: 'Lean FIRE to Regular FIRE', url: '/blog/lean-fire-to-regular-fire' },
    { q: 'The money is the easy part of Lean FIRE. Knowing how you will spend your days is the hard part.', title: 'Is Lean FIRE Right For You?', url: '/blog/is-lean-fire-right-for-you' },
    { q: 'I went from $6,000 a month in New York to $1,800 in Vietnam, same quality of life.', title: 'What Is Lean FIRE?', url: '/blog/what-is-LEAN-FIRE' },
    { q: 'I cleared $40,000 of debt in a single year, then poured that same discipline into investing.', title: 'From $40k Debt to Lean FIRE at 33', url: '/blog/40k-debt-to-lean-fire-at-33' }
  ];

  var CFG = { first: 5000, visible: 20000, gap: 20000, maxShows: 5 };
  var DISMISS_KEY = 'bffQuoteToastDismissed';

  // guards: desktop only, not dismissed this session
  if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return;
  try { if (sessionStorage.getItem(DISMISS_KEY)) return; } catch (e) {}

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var params = new URLSearchParams(location.search);
  if (params.has('toastnow')) { CFG.first = 600; CFG.gap = 6000; }

  var order = shuffle(QUOTES.map(function (_, i) { return i; }));
  var cursor = 0, shows = 0, hideTimer = null, gapTimer = null, el = null;

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function injectStyles() {
    var css =
      '.bff-toast{position:fixed;right:24px;bottom:24px;z-index:1200;width:340px;max-width:calc(100vw - 48px);' +
      'background:var(--card-background);border:1px solid var(--border-color);border-radius:14px;padding:1rem 1.15rem 1.05rem;' +
      'box-shadow:0 12px 34px rgba(0,0,0,.28);opacity:0;transform:translateY(16px);' +
      'transition:opacity .45s ease,transform .45s cubic-bezier(.2,.8,.2,1);pointer-events:none;}' +
      '.bff-toast.in{opacity:1;transform:translateY(0);pointer-events:auto;}' +
      '.bff-toast.pulse{animation:bffPulse 1.6s ease-out 2;}' +
      '@keyframes bffPulse{0%{box-shadow:0 12px 34px rgba(0,0,0,.28),0 0 0 0 rgba(102,126,234,.0);}' +
      '35%{box-shadow:0 12px 34px rgba(0,0,0,.28),0 0 0 3px rgba(102,126,234,.35);}' +
      '100%{box-shadow:0 12px 34px rgba(0,0,0,.28),0 0 0 0 rgba(102,126,234,0);}}' +
      '.bff-toast-kicker{display:inline-block;font-size:.68rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;' +
      'background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}' +
      '.bff-toast-q{margin:.4rem 0 .7rem;font-size:1.02rem;line-height:1.45;color:var(--text-primary);font-weight:500;}' +
      '.bff-toast-link{font-size:.9rem;font-weight:600;color:var(--accent-color);text-decoration:none;}' +
      '.bff-toast-link:hover{text-decoration:underline;}' +
      '.bff-toast-x{position:absolute;top:8px;right:10px;border:none;background:transparent;color:var(--text-muted);' +
      'font-size:1.15rem;line-height:1;cursor:pointer;padding:.2rem;}' +
      '.bff-toast-x:hover{color:var(--text-primary);}' +
      '.bff-toast-progress{position:absolute;left:0;bottom:0;width:100%;height:3px;overflow:hidden;border-radius:0 0 14px 14px;}' +
      '.bff-toast-progress i{display:block;height:100%;width:100%;background:var(--gradient);transform-origin:left center;transform:scaleX(1);}' +
      '@keyframes bffDeplete{from{transform:scaleX(1);}to{transform:scaleX(0);}}';
    var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  }

  function build() {
    el = document.createElement('div');
    el.className = 'bff-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<button class="bff-toast-x" aria-label="Dismiss these quotes">&times;</button>' +
      '<span class="bff-toast-kicker">From the blog</span>' +
      '<p class="bff-toast-q"></p>' +
      '<a class="bff-toast-link" href="#"></a>' +
      '<div class="bff-toast-progress"><i></i></div>';
    el.querySelector('.bff-toast-x').addEventListener('click', dismiss);
    // clicking the link lets navigation happen; also stop nagging afterwards
    el.querySelector('.bff-toast-link').addEventListener('click', function () {
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    });
    document.body.appendChild(el);
  }

  function show() {
    if (!el) build();
    var item = QUOTES[order[cursor]];
    cursor = (cursor + 1) % order.length;
    el.querySelector('.bff-toast-q').textContent = '“' + item.q + '”';
    var link = el.querySelector('.bff-toast-link');
    link.textContent = 'Read: ' + item.title + ' →';
    link.setAttribute('href', item.url);

    el.classList.add('in');
    if (!reduced) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }

    // stories-style countdown bar that depletes over the visible window
    var fill = el.querySelector('.bff-toast-progress i');
    if (fill && !reduced) {
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = 'bffDeplete ' + CFG.visible + 'ms linear forwards';
    }

    shows++;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, CFG.visible);
  }

  function hide() {
    if (el) el.classList.remove('in');
    if (shows < CFG.maxShows) { clearTimeout(gapTimer); gapTimer = setTimeout(show, CFG.gap); }
  }

  function dismiss() {
    clearTimeout(hideTimer); clearTimeout(gapTimer);
    if (el) el.classList.remove('in');
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }

  function start() { injectStyles(); setTimeout(show, CFG.first); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
