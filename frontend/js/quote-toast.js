/* Rotating "from the blog" quote toast. Loaded ONLY on /blog.
   Desktop only, gentle (no strobe). Closing a toast dismisses only that
   one, and the rotation keeps going. Each toast links to its article.

   The lines are NOT hardcoded here: they are fetched from /toast-quotes.json,
   which the blog build (tools/build_blog.py) regenerates from every indexed
   post. So adding, deleting, or de-indexing an article automatically updates
   the toast, and every live article is covered (a post with no curated line
   falls back to its subtitle). No dependencies, no tracking.
   Test hook: add ?toastnow to the URL to show immediately. */
(function () {
  'use strict';

  var QUOTES = [];
  var CFG = { first: 5000, visible: 20000, gap: 5000, maxShows: 5 };

  // guard: desktop only. The toast is a nice-to-have, not for small screens.
  if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var params = new URLSearchParams(location.search);
  if (params.has('toastnow')) { CFG.first = 600; CFG.gap = 6000; }

  var order = [], cursor = 0, shows = 0, hideTimer = null, gapTimer = null, el = null;

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function injectStyles() {
    var css =
      /* Fixed-dark canvas (like the globe / cover cards): the chip itself is the
         interruption on the light page. Colors are the site's own dark-end palette,
         so they are literals here, not the light-only theme tokens. */
      '.bff-toast{--tst-bg:#14110E;--tst-ink:#F4EFE9;--tst-muted:#9C8E82;--tst-accent:#9DBF63;--tst-accent-rgb:157,191,99;' +
      'position:fixed;left:50%;top:calc(var(--header-h, 84px) + 14px);z-index:1200;width:min(680px, calc(100vw - 32px));' +
      'background:var(--tst-bg);border:1px solid #2E2823;border-radius:var(--radius-surface);padding:1rem 1.15rem 1.05rem;' +
      'box-shadow:0 14px 40px rgba(0,0,0,.34);opacity:0;transform:translate(-50%,-18px);' +
      'display:flex;align-items:center;gap:1rem;' +
      'transition:opacity .45s ease,transform .45s cubic-bezier(.2,.8,.2,1);pointer-events:none;}' +
      '.bff-toast.in{opacity:1;transform:translate(-50%,0);pointer-events:auto;}' +
      '.bff-toast.pulse{animation:bffPulse 1.6s ease-out 2;}' +
      '@keyframes bffPulse{0%{box-shadow:0 12px 34px rgba(0,0,0,.28),0 0 0 0 rgba(var(--tst-accent-rgb),.0);}' +
      '35%{box-shadow:0 12px 34px rgba(0,0,0,.28),0 0 0 3px rgba(var(--tst-accent-rgb),.35);}' +
      '100%{box-shadow:0 12px 34px rgba(0,0,0,.28),0 0 0 0 rgba(var(--tst-accent-rgb),0);}}' +
      '.bff-toast-kicker{display:none;}' +
      '.bff-toast-q{margin:0;font-size:.98rem;line-height:1.4;color:var(--tst-ink);font-weight:500;flex:1;min-width:0;order:1;}' +
      '.bff-toast-link{font-size:.88rem;font-weight:700;color:var(--tst-accent);text-decoration:none;white-space:nowrap;flex:none;order:2;}' +
      '.bff-toast-link:hover{text-decoration:underline;}' +
      '.bff-toast-x{position:static;flex:none;order:3;margin-left:.15rem;border:none;background:transparent;color:var(--tst-muted);' +
      'font-size:1.15rem;line-height:1;cursor:pointer;padding:.2rem;}' +
      '.bff-toast-x:hover{color:var(--tst-ink);}' +
      '.bff-toast-progress{position:absolute;left:0;bottom:0;width:100%;height:3px;overflow:hidden;border-radius:0 0 var(--radius-surface) var(--radius-surface);}' +
      '.bff-toast-progress i{display:block;height:100%;width:100%;background:var(--tst-accent);transform-origin:left center;transform:scaleX(1);}' +
      '@keyframes bffDeplete{from{transform:scaleX(1);}to{transform:scaleX(0);}}' +
      '@media (max-width:620px){.bff-toast{flex-wrap:wrap;gap:.5rem;padding:.85rem 1rem;}.bff-toast-q{flex:1 1 100%;font-size:.92rem;}}';
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
    // the link is a plain anchor; clicking it just navigates to the article
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

  // Closing the current toast just hides it and lets the rotation continue.
  function dismiss() {
    clearTimeout(hideTimer);
    hide();
  }

  function init(quotes) {
    if (!quotes || !quotes.length) return;   // nothing to show, stay silent
    QUOTES = quotes;
    order = shuffle(QUOTES.map(function (_, i) { return i; }));
    injectStyles();
    setTimeout(show, CFG.first);
  }

  function boot() {
    fetch('/toast-quotes.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { init(data && data.quotes); })
      .catch(function () { /* offline or missing file: no toast, no error */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
