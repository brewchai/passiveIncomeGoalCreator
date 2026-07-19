/* Interactive widgets for /blog/fire-in-india-how-many-crores
   Vanilla JS, no dependencies. State persists in localStorage.
   The article remains fully readable with JS disabled. */
(function () {
  'use strict';

  var STORE_KEY = 'bffFireIndia_v1';
  var LAKH = 100000;
  var CRORE = 10000000;
  var KID_COST = { budget: 50 * LAKH, middle: 1 * CRORE, premium: 2 * CRORE };
  var PARENT_BUFFER = 40 * LAKH;

  var state = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function set(key, value) {
    state[key] = value;
    save();
    renderAll();
  }

  /* ---------- formatting ---------- */
  function fmtINR(n) {
    if (n >= CRORE) {
      var cr = n / CRORE;
      return '₹' + (Math.round(cr * 100) / 100) + ' crore';
    }
    if (n >= LAKH) {
      var l = n / LAKH;
      return '₹' + (Math.round(l * 10) / 10) + ' lakh';
    }
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  /* ---------- the math contract ---------- */
  function parts() {
    var mult = state.mult || 0;
    var spend = state.spend || 0;
    var base = spend * 12 * mult;
    var parentsAnnual = (state.parentsSupport || 0) * 12;
    var parents = parentsAnnual * mult;
    var buffer = state.parentsInsurable === 'no' ? PARENT_BUFFER : 0;
    var kids = 0;
    if (state.kidsCount > 0 && state.kidsTier) {
      kids = state.kidsCount * KID_COST[state.kidsTier];
    }
    var house = state.housing === 'buy' ? (state.houseBudget || 0) : 0;
    return { base: base, parents: parents, buffer: buffer, kids: kids, house: house,
             total: base + parents + buffer + kids + house };
  }

  /* ---------- completion (forced revisit) ---------- */
  function missing() {
    var out = [];
    if (!state.mult) out.push(['w-mult', 'your multiplier']);
    if (!(state.spend > 0)) out.push(['w-spend', 'your monthly spend']);
    if (!state.city) out.push(['w-city', 'your city choice']);
    if (state.parentsSupport === undefined || !state.parentsInsurable)
      out.push(['w-parents', 'your parents section']);
    if (state.kidsCount === undefined || (state.kidsCount > 0 && !state.kidsTier))
      out.push(['w-kids', 'your kids section']);
    if (!state.housing || (state.housing === 'buy' && !(state.houseBudget > 0)))
      out.push(['w-house', 'your housing section']);
    return out;
  }

  /* ---------- rendering ---------- */
  function markButtons(widgetId, dataKey, value) {
    var box = document.getElementById(widgetId);
    if (!box) return;
    box.querySelectorAll('button[data-' + dataKey + ']').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-' + dataKey) === String(value));
    });
  }

  function renderAll() {
    markButtons('w-mult', 'mult', state.mult);
    markButtons('w-city', 'city', state.city);
    markButtons('w-parents', 'insurable', state.parentsInsurable);
    markButtons('w-kids', 'kids', state.kidsCount);
    markButtons('w-kids', 'tier', state.kidsTier);
    markButtons('w-house', 'housing', state.housing);

    var spendEl = document.getElementById('spend-input');
    if (spendEl && document.activeElement !== spendEl && state.spend)
      spendEl.value = state.spend;
    var spendEcho = document.getElementById('spend-echo');
    if (spendEcho) spendEcho.textContent = state.spend > 0
      ? 'That is ' + fmtINR(state.spend) + ' a month, or ' + fmtINR(state.spend * 12) + ' a year.'
      : '';

    var psEl = document.getElementById('parents-input');
    if (psEl && document.activeElement !== psEl && state.parentsSupport !== undefined)
      psEl.value = state.parentsSupport;

    var hbWrap = document.getElementById('house-budget-wrap');
    if (hbWrap) hbWrap.style.display = state.housing === 'buy' ? 'block' : 'none';
    var hbEl = document.getElementById('house-input');
    if (hbEl && document.activeElement !== hbEl && state.houseBudget)
      hbEl.value = state.houseBudget;

    var tierWrap = document.getElementById('kids-tier-wrap');
    if (tierWrap) tierWrap.style.display = state.kidsCount > 0 ? 'block' : 'none';

    var cityNote = document.getElementById('city-note');
    if (cityNote) cityNote.textContent =
      state.city === 't1rent'
        ? 'Honest nudge: make sure the monthly spend you entered truly includes tier 1 rent, which is usually ₹60,000 or more.'
        : '';

    renderReveal();
  }

  function renderReveal() {
    var box = document.getElementById('w-reveal');
    if (!box) return;
    var miss = missing();
    if (miss.length) {
      var links = miss.map(function (m) {
        return '<a href="#' + m[0] + '">' + m[1] + '</a>';
      }).join(', ');
      box.innerHTML =
        '<p class="fw-label">Your number is not ready yet</p>' +
        '<p>You skipped ' + miss.length + ' section' + (miss.length > 1 ? 's' : '') +
        ', and every one of them changes the answer. Go back and fill in ' + links + '.</p>';
      return;
    }
    var p = parts();
    var rows = [
      ['Your life at ' + state.mult + 'x', p.base],
      ['Supporting your parents', p.parents]
    ];
    if (p.buffer) rows.push(['Parent medical buffer', p.buffer]);
    if (p.kids) rows.push([state.kidsCount + (state.kidsCount > 1 ? ' kids' : ' kid') + ' (' + state.kidsTier + ')', p.kids]);
    if (p.house) rows.push(['The house, outside the corpus', p.house]);

    var table = rows.map(function (r) {
      return '<tr><td>' + r[0] + '</td><td>' + fmtINR(r[1]) + '</td></tr>';
    }).join('');

    box.innerHTML =
      '<p class="fw-label">Your personal FIRE number</p>' +
      '<p class="fw-total">' + fmtINR(p.total) + '</p>' +
      '<p class="fw-sub">in today’s rupees</p>' +
      '<table class="fw-table"><tbody>' + table + '</tbody></table>' +
      '<p class="fw-note">Built from your own inputs across this article. Your answers stay saved in this browser only, and nothing is sent anywhere. ' +
      '<button type="button" id="fw-reset">Start over</button></p>';

    var reset = document.getElementById('fw-reset');
    if (reset) reset.addEventListener('click', function () {
      state = {};
      save();
      var s = document.getElementById('spend-input'); if (s) s.value = '';
      var pi = document.getElementById('parents-input'); if (pi) pi.value = '';
      var hi = document.getElementById('house-input'); if (hi) hi.value = '';
      renderAll();
    });
  }

  /* ---------- wiring ---------- */
  function onClick(widgetId, dataKey, fn) {
    var box = document.getElementById(widgetId);
    if (!box) return;
    box.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-' + dataKey + ']');
      if (btn) fn(btn.getAttribute('data-' + dataKey));
    });
  }
  function onInput(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      var v = parseInt(el.value.replace(/[^0-9]/g, ''), 10);
      fn(isNaN(v) ? undefined : v);
    });
  }

  function init() {
    if (!document.getElementById('w-reveal')) return;
    onClick('w-mult', 'mult', function (v) { set('mult', parseInt(v, 10)); });
    onInput('spend-input', function (v) { set('spend', v); });
    onClick('w-city', 'city', function (v) { set('city', v); });
    onInput('parents-input', function (v) { set('parentsSupport', v === undefined ? undefined : v); });
    onClick('w-parents', 'insurable', function (v) { set('parentsInsurable', v); });
    onClick('w-kids', 'kids', function (v) {
      var n = parseInt(v, 10);
      state.kidsCount = n;
      if (n === 0) delete state.kidsTier;
      save(); renderAll();
    });
    onClick('w-kids', 'tier', function (v) { set('kidsTier', v); });
    onClick('w-house', 'housing', function (v) { set('housing', v); });
    onInput('house-input', function (v) { set('houseBudget', v); });
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
