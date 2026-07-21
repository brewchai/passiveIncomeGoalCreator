/* Interactive stepped FIRE-India builder for
   /blog/fire-in-india-how-many-crores

   Vanilla JS, no dependencies. State persists in localStorage.
   The article stays fully readable with JS disabled.

   The model: a ~9% nominal portfolio. Every recurring cost is a present
   value computed at ITS OWN inflation, so different categories get
   different multipliers. Two genuinely one-time costs stay as lumps.

     lifestyle / housing   6% infl  -> 3% real   -> x33  (perpetual)
     fun / discretionary   4% infl  -> 5% real   -> x20  (perpetual)
     health premiums      12% infl  -> negative  -> x35  (25y buffer)
     parent support        7% infl, 20y finite   -> x16
     kids education       10% infl, 22y finite   -> x22  (per year of fee)
     house purchase                              -> lump
     parent medical buffer (if uninsurable)      -> lump (contingency)
*/
(function () {
  'use strict';

  var STORE_KEY = 'bffFireIndia_v3';
  var LAKH = 100000, CRORE = 10000000;

  // multipliers (see derivation in tools note; verified against growing-annuity PV)
  var M = { housing: 33, health: 35, lifestyle: 33, fun: 20, parents: 16, kids: 22 };
  var KID_ANNUAL = { local: 1 * LAKH, premium: 3 * LAKH, international: 8 * LAKH };
  var KID_LABEL = { local: 'solid local private', premium: 'premium private', international: 'international' };
  var PARENT_BUFFER = 40 * LAKH;

  var CITY_NOTE = {
    t1: 'Tier 1 is the most expensive base. Rent is the number that breaks these plans, so be honest about it in your housing cost.',
    t2: 'Tier 2 is the sweet spot for most FIRE plans, quieter and far cheaper on housing.',
    t3: 'Tier 3 or your hometown gives the lowest costs. Be honest about healthcare access and whether you will enjoy it year round.',
    abroad: 'Run the whole thing in rupees anyway, since your spending will be in rupees.'
  };
  var HOUSE_LABEL = {
    rent: 'Your monthly rent',
    own: 'Your monthly society charges and maintenance',
    buy: 'Your monthly society charges and maintenance'
  };

  var state = load();
  var animated = {};

  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }
  function set(key, value) { state[key] = value; save(); renderAll(); }

  function fmtINR(n) {
    if (n >= CRORE) return '₹' + (Math.round(n / CRORE * 100) / 100) + ' crore';
    if (n >= LAKH) return '₹' + (Math.round(n / LAKH * 10) / 10) + ' lakh';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  /* ---------- the math contract ---------- */
  function parts() {
    var housing = (state.housingMonthly || 0) * 12 * M.housing;
    var health = (state.healthMonthly || 0) * 12 * M.health;
    var lifestyle = (state.lifestyleMonthly || 0) * 12 * M.lifestyle;
    var fun = (state.funAnnual || 0) * M.fun;
    var parents = (state.parentsSupport || 0) * 12 * M.parents;
    var buffer = state.parentsInsurable === 'no' ? PARENT_BUFFER : 0;
    var kids = 0;
    if (state.kidsCount > 0 && state.kidsTier) {
      kids = state.kidsCount * KID_ANNUAL[state.kidsTier] * M.kids;
    }
    var house = state.housingType === 'buy' ? (state.houseBudget || 0) : 0;
    return { housing: housing, health: health, lifestyle: lifestyle, fun: fun,
             parents: parents, buffer: buffer, kids: kids, house: house,
             total: housing + health + lifestyle + fun + parents + buffer + kids + house };
  }

  /* ---------- forced-revisit completion ---------- */
  function missing() {
    var out = [];
    if (!state.city || !state.housingType || !(state.housingMonthly > 0) ||
        (state.housingType === 'buy' && !(state.houseBudget > 0)))
      out.push(['step-1', 'Step 1, your home base']);
    if (!(state.healthMonthly >= 0) || state.healthMonthly === undefined)
      out.push(['step-2', 'Step 2, your safety net']);
    if (state.parentsSupport === undefined || !state.parentsInsurable ||
        state.kidsCount === undefined || (state.kidsCount > 0 && !state.kidsTier))
      out.push(['step-3', 'Step 3, your family']);
    if (!(state.lifestyleMonthly > 0)) out.push(['step-4', 'Step 4, your everyday life']);
    if (state.funAnnual === undefined) out.push(['step-5', 'Step 5, your fun']);
    return out;
  }

  /* ---------- rendering ---------- */
  function markButtons(id, key, val) {
    var box = document.getElementById(id); if (!box) return;
    box.querySelectorAll('button[data-' + key + ']').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-' + key) === String(val));
    });
  }
  function setInput(id, val) {
    var el = document.getElementById(id);
    if (el && document.activeElement !== el && val !== undefined && val !== null && val !== '') el.value = val;
  }
  function echo(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt || ''; }

  function renderAll() {
    markButtons('w-city', 'city', state.city);
    markButtons('w-house', 'housing', state.housingType);
    markButtons('w-parents', 'insurable', state.parentsInsurable);
    markButtons('w-kids', 'tier', state.kidsTier);

    echo('city-note', CITY_NOTE[state.city]);

    var hLabel = document.getElementById('house-cost-label');
    if (hLabel) hLabel.textContent = state.housingType ? HOUSE_LABEL[state.housingType] + ', in rupees' : 'Your monthly housing cost, in rupees';
    var hbWrap = document.getElementById('house-budget-wrap');
    if (hbWrap) hbWrap.style.display = state.housingType === 'buy' ? 'block' : 'none';
    setInput('housing-input', state.housingMonthly);
    setInput('house-input', state.houseBudget);

    setInput('health-input', state.healthMonthly);
    setInput('parents-input', state.parentsSupport);

    var kidsSel = document.getElementById('kids-select');
    if (kidsSel && state.kidsCount !== undefined) kidsSel.value = String(state.kidsCount);
    var tierWrap = document.getElementById('kids-tier-wrap');
    if (tierWrap) tierWrap.style.display = state.kidsCount > 0 ? 'block' : 'none';

    setInput('lifestyle-input', state.lifestyleMonthly);
    setInput('fun-input', state.funAnnual);

    renderProgress();
    renderReveal();
  }

  function renderProgress() {
    var done = 5 - missing().length;
    document.querySelectorAll('.fw-step-badge').forEach(function (b) {
      var n = parseInt(b.getAttribute('data-step'), 10);
      b.classList.toggle('done', n <= done && !missing().some(function (m) { return m[0] === 'step-' + n; }));
    });
  }

  function countUp(el, target) {
    var start = 0, dur = 900, t0 = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtINR(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = fmtINR(target);
    }
    requestAnimationFrame(frame);
  }

  function bar(rows, total) {
    var palette = ['#667eea', '#764ba2', '#8e7cc3', '#a06fb0', '#b56576', '#c98a5e', '#d9a441', '#5aa9a0'];
    var seg = rows.map(function (r, i) {
      var pct = total ? (r[1] / total * 100) : 0;
      return '<div class="fw-seg" style="width:' + pct.toFixed(2) + '%;background:' + palette[i % palette.length] + '" title="' + r[0] + ': ' + fmtINR(r[1]) + '"></div>';
    }).join('');
    var legend = rows.map(function (r, i) {
      var pct = total ? Math.round(r[1] / total * 100) : 0;
      return '<div class="fw-leg"><span class="fw-dot" style="background:' + palette[i % palette.length] + '"></span>' +
             '<span class="fw-leg-name">' + r[0] + '</span>' +
             '<span class="fw-leg-val">' + fmtINR(r[1]) + '<span class="fw-leg-pct"> · ' + pct + '%</span></span></div>';
    }).join('');
    return '<div class="fw-bar">' + seg + '</div><div class="fw-legend">' + legend + '</div>';
  }

  function readLine() {
    var city = { t1: 'Tier 1', t2: 'Tier 2', t3: 'Tier 3', abroad: 'abroad' }[state.city] || 'your city';
    var home = state.housingType === 'rent' ? 'renting' : (state.housingType === 'buy' ? 'buying a home' : 'owning your home');
    var kids = state.kidsCount > 0 ? (state.kidsCount + (state.kidsCount > 1 ? ' kids' : ' kid')) : 'no kids';
    return 'A ' + city + ', ' + kids + ', ' + home + ' plan.';
  }

  function renderReveal() {
    var box = document.getElementById('w-reveal'); if (!box) return;
    var miss = missing();
    if (miss.length) {
      var links = miss.map(function (m) { return '<a href="#' + m[0] + '">' + m[1] + '</a>'; }).join(', ');
      box.innerHTML = '<p class="fw-label">Your number is not ready yet</p><p>You still have ' + miss.length +
        ' step' + (miss.length > 1 ? 's' : '') + ' open, and every one changes the answer. Finish ' + links + '.</p>';
      animated.total = false;
      return;
    }
    var p = parts();
    var rows = [
      ['Everyday life', p.lifestyle],
      ['Home', p.housing],
      ['Health cover', p.health],
      ['Fun and travel', p.fun],
      ['Parent support', p.parents]
    ];
    if (p.buffer) rows.push(['Parent medical buffer', p.buffer]);
    if (p.kids) rows.push(['Kids, ' + KID_LABEL[state.kidsTier], p.kids]);
    if (p.house) rows.push(['Your home, one time', p.house]);
    rows = rows.filter(function (r) { return r[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; });

    box.innerHTML =
      '<p class="fw-label">Your personal FIRE number</p>' +
      '<p class="fw-total" id="fw-total">₹0</p>' +
      '<p class="fw-sub">in today’s rupees · <span class="fw-read">' + readLine() + '</span></p>' +
      bar(rows, p.total) +
      '<p class="fw-note">Each recurring cost above is counted at its own inflation, which is why health and kids weigh so much more than a flat rule would show. Your answers stay in this browser only. ' +
      '<button type="button" id="fw-copy">Copy my breakdown</button> <button type="button" id="fw-reset">Start over</button></p>';

    var totalEl = document.getElementById('fw-total');
    if (!animated.total) { countUp(totalEl, p.total); animated.total = true; }
    else totalEl.textContent = fmtINR(p.total);

    var copy = document.getElementById('fw-copy');
    if (copy) copy.addEventListener('click', function () {
      var text = 'My India FIRE number: ' + fmtINR(p.total) + ' (today’s rupees). ' + readLine() + '\n' +
        rows.map(function (r) { return '- ' + r[0] + ': ' + fmtINR(r[1]); }).join('\n') +
        '\nBuilt on butfirstfire.com';
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { copy.textContent = 'Copied'; });
    });
    var reset = document.getElementById('fw-reset');
    if (reset) reset.addEventListener('click', function () {
      state = {}; save(); animated.total = false;
      ['housing-input', 'house-input', 'health-input', 'parents-input', 'lifestyle-input', 'fun-input']
        .forEach(function (id) { var e = document.getElementById(id); if (e) e.value = ''; });
      var ks = document.getElementById('kids-select'); if (ks) ks.value = '';
      renderAll();
    });
  }

  /* ---------- wiring ---------- */
  function onClick(id, key, fn) {
    var box = document.getElementById(id); if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-' + key + ']'); if (b) fn(b.getAttribute('data-' + key));
    });
  }
  function onNum(id, fn) {
    var el = document.getElementById(id); if (!el) return;
    el.addEventListener('input', function () {
      var raw = el.value.replace(/[^0-9]/g, '');
      fn(raw === '' ? undefined : parseInt(raw, 10));
    });
  }

  function init() {
    if (!document.getElementById('w-reveal')) return;
    onClick('w-city', 'city', function (v) { set('city', v); });
    onClick('w-house', 'housing', function (v) { set('housingType', v); });
    onNum('housing-input', function (v) { set('housingMonthly', v); });
    onNum('house-input', function (v) { set('houseBudget', v); });
    onNum('health-input', function (v) { set('healthMonthly', v); });
    onNum('parents-input', function (v) { set('parentsSupport', v === undefined ? undefined : v); });
    onClick('w-parents', 'insurable', function (v) { set('parentsInsurable', v); });
    var kidsSel = document.getElementById('kids-select');
    if (kidsSel) kidsSel.addEventListener('change', function () {
      if (kidsSel.value === '') return;
      var n = parseInt(kidsSel.value, 10);
      state.kidsCount = n; if (n === 0) delete state.kidsTier; save(); renderAll();
    });
    onClick('w-kids', 'tier', function (v) { set('kidsTier', v); });
    onNum('lifestyle-input', function (v) { set('lifestyleMonthly', v); });
    onNum('fun-input', function (v) { set('funAnnual', v === undefined ? undefined : v); });
    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
