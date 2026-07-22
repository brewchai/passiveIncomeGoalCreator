/* Interactive guardrails "revised salary letter" builder for
   /blog/surviving-a-stock-market-crash-on-lean-fire

   Vanilla JS, no dependencies. State persists in localStorage.
   The article stays fully readable with JS disabled.

   The model: your portfolio is a company, your withdrawal is your salary.
   Guyton-Klinger guardrails, standard settings:
     start rate   default 4% (user picks 3 to 5)
     guardrails   +/- 20% of the starting rate
     adjustment   10% pay cut or raise on a breach

   A "market move" (crash or boom) reprices the company. We reassess once,
   the way the rule actually runs each year: one 10% step if a rail breaks.
   Currency toggle converts every figure at a fixed 95 rupees to the dollar
   and swaps the inflation and growth regime used in the copy and the
   recovery-time estimate.
*/
(function () {
  'use strict';

  var STORE_KEY = 'bffCrashSurvival_v1';
  var FX = 95;                 // rupees per dollar
  var LAKH = 100000, CRORE = 10000000;
  var WIDTH = 0.20;            // guardrail band, +/- of the starting rate
  var ADJUST = 0.10;          // pay cut / raise size

  var REGIME = {
    usd: { sym: '$', infl: 3, growth: 7 },
    inr: { sym: '₹', infl: 6, growth: 11 }
  };

  var state = load();
  if (state.currency === undefined) state.currency = 'usd';
  if (state.rate === undefined) state.rate = 4;      // percent
  if (state.move === undefined) state.move = 0;      // percent

  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---------- formatting ---------- */
  // All money is held internally in USD. Convert only for display.
  function toDisplay(usd) { return state.currency === 'inr' ? usd * FX : usd; }

  function fmtUSD(n) {
    n = Math.round(n);
    return '$' + n.toLocaleString('en-US');
  }
  function fmtINR(n) {
    if (n >= CRORE) return '₹' + (Math.round(n / CRORE * 100) / 100) + ' crore';
    if (n >= LAKH) return '₹' + (Math.round(n / LAKH * 100) / 100) + ' lakh';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }
  // big amounts (portfolio, annual)
  function money(usd) {
    var v = toDisplay(usd);
    return state.currency === 'inr' ? fmtINR(v) : fmtUSD(v);
  }
  // monthly salary, a touch more precision in rupees
  function monthly(usdAnnual) {
    var v = toDisplay(usdAnnual) / 12;
    return state.currency === 'inr' ? fmtINR(v) : fmtUSD(v);
  }

  /* ---------- the guardrail math ---------- */
  function model() {
    var rate = state.rate / 100;
    var upperRate = rate * (1 + WIDTH);   // cut trigger rate
    var lowerRate = rate * (1 - WIDTH);   // raise trigger rate
    var portfolio = state.portfolioUSD || 0;
    var annual = portfolio * rate;        // starting salary

    return {
      rate: rate, upperRate: upperRate, lowerRate: lowerRate,
      portfolio: portfolio, annual: annual,
      cutAnnual: annual * (1 - ADJUST),
      raiseAnnual: annual * (1 + ADJUST),
      upperTrigger: upperRate ? annual / upperRate : 0,  // portfolio value at cut rail
      lowerTrigger: lowerRate ? annual / lowerRate : 0   // portfolio value at raise rail
    };
  }

  function afterMove(m) {
    var move = state.move / 100;
    var p = m.portfolio * (1 + move);
    if (p <= 0) p = 1;
    var curRate = m.annual / p;
    var action, newAnnual;
    if (curRate >= m.upperRate) { action = 'cut'; newAnnual = m.annual * (1 - ADJUST); }
    else if (curRate <= m.lowerRate) { action = 'raise'; newAnnual = m.annual * (1 + ADJUST); }
    else { action = 'cruise'; newAnnual = m.annual; }
    var newRate = newAnnual / p;
    return {
      portfolio: p, curRate: curRate, action: action,
      newAnnual: newAnnual, newRate: newRate,
      stillHigh: action === 'cut' && newRate > m.upperRate
    };
  }

  // Years for a portfolio down x to reclaim its old high at the regime growth rate.
  function recoveryYears() {
    if (state.move >= 0) return 0;
    var g = REGIME[state.currency].growth / 100;
    var drop = 1 + state.move / 100;      // e.g. 0.7 after a 30% fall
    if (drop <= 0) drop = 0.01;
    return Math.log(1 / drop) / Math.log(1 + g);
  }

  /* ---------- rendering ---------- */
  function markButtons(id, key, val) {
    var box = document.getElementById(id); if (!box) return;
    box.querySelectorAll('button[data-' + key + ']').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-' + key) === String(val));
    });
  }

  function renderSetup() {
    markButtons('w-setup', 'cur', state.currency);
    markButtons('w-setup', 'rate', String(state.rate));

    var prefix = document.getElementById('cur-prefix');
    if (prefix) prefix.textContent = REGIME[state.currency].sym;

    var input = document.getElementById('portfolio-input');
    if (input) input.placeholder = state.currency === 'inr' ? '95000000' : '1000000';

    var echo = document.getElementById('portfolio-echo');
    var out = document.getElementById('setup-out');
    var m = model();

    if (!(m.portfolio > 0)) {
      if (echo) echo.textContent = state.currency === 'inr'
        ? 'Enter the full amount, so 9.5 crore is 95000000.'
        : 'Enter the full amount, so one million is 1000000.';
      if (out) out.innerHTML = '<p class="fw-sub">Enter a portfolio above and your salary and guardrails appear here.</p>';
      return;
    }
    if (echo) echo.textContent = 'Portfolio: ' + money(m.portfolio) + ' · starting salary ' + state.rate + '%';

    if (out) out.innerHTML =
      '<p class="fw-sub">Your starting salary</p>' +
      '<p class="fw-big" id="salary-now">' + monthly(m.annual) + '</p>' +
      '<p class="fw-sub">a month, which is ' + money(m.annual) + ' a year at ' + state.rate + '%</p>' +
      '<div class="fw-rail down"><span class="fw-rail-tag">Raise rail</span>' +
      '<span class="fw-rail-txt">grows to <b>' + money(m.lowerTrigger) + '</b>, salary rises to <b>' + monthly(m.raiseAnnual) + '</b> a month</span></div>' +
      '<div class="fw-rail up"><span class="fw-rail-tag">Cut rail</span>' +
      '<span class="fw-rail-txt">falls to <b>' + money(m.upperTrigger) + '</b>, salary cut to <b>' + monthly(m.cutAnnual) + '</b> a month</span></div>';
  }

  function renderStress() {
    var m = model();
    var moveVal = document.getElementById('move-val');
    if (moveVal) moveVal.textContent = (state.move > 0 ? '+' : '') + state.move + '%';
    var slider = document.getElementById('move-slider');
    if (slider && document.activeElement !== slider) slider.value = String(state.move);
    markButtons('w-stress', 'move', String(state.move));

    var gauge = document.getElementById('gauge');
    var mark = document.getElementById('gauge-mark');
    var verdict = document.getElementById('verdict');
    var recover = document.getElementById('recover');
    var letterWrap = document.getElementById('letter-wrap');
    var letterBody = document.getElementById('letter-body');
    var gut = document.getElementById('gut');

    if (!(m.portfolio > 0)) {
      if (verdict) verdict.textContent = 'Set your portfolio in step 1 first, then drag the market here.';
      if (recover) recover.textContent = '';
      if (letterWrap) letterWrap.style.display = 'none';
      if (gut) gut.textContent = '';
      if (gauge) gauge.style.background = 'var(--border-color)';
      if (mark) mark.style.left = '0%';
      return;
    }

    var r = afterMove(m);

    // gauge domain: 0 to a bit above the cut rail
    var domainMax = m.upperRate * 1.9;
    var lowPct = (m.lowerRate / domainMax) * 100;
    var upPct = (m.upperRate / domainMax) * 100;
    if (gauge) gauge.style.background =
      'linear-gradient(90deg,#4a6fa5 0 ' + lowPct.toFixed(1) + '%,#3f9d6b ' + lowPct.toFixed(1) + '% ' + upPct.toFixed(1) + '%,#c0554e ' + upPct.toFixed(1) + '% 100%)';
    if (mark) {
      var markPct = Math.max(0, Math.min(100, (r.curRate / domainMax) * 100));
      mark.style.left = 'calc(' + markPct.toFixed(1) + '% - 2px)';
    }

    var oldM = monthly(m.annual), newM = monthly(r.newAnnual);
    var deltaMonthly = Math.abs(toDisplay(m.annual - r.newAnnual) / 12);
    var deltaStr = state.currency === 'inr' ? fmtINR(deltaMonthly) : fmtUSD(deltaMonthly);

    if (r.action === 'cruise') {
      if (verdict) verdict.textContent = 'You are still inside your guardrails. No change. You keep paying yourself ' + newM + ' a month and you carry on.';
      if (recover) recover.textContent = '';
      if (letterWrap) letterWrap.style.display = 'none';
      if (gut) gut.textContent = '';
    } else if (r.action === 'raise') {
      if (verdict) verdict.textContent = 'Good year. The company grew past your upper cushion, so you get to give yourself a raise.';
      if (recover) recover.textContent = '';
      if (letterWrap) letterWrap.style.display = 'block';
      if (letterBody) letterBody.innerHTML =
        'Effective next year, your salary rises from <b>' + oldM + '</b> to <b>' + newM + '</b> a month, a bump of about <b>' + deltaStr + '</b> a month. Your portfolio did the work, so enjoy it without guilt.';
      if (gut) gut.textContent = 'This is the half nobody talks about. Guardrails do not only cut in bad years, they hand you a raise in good ones.';
    } else {
      var years = recoveryYears();
      var yearStr = years >= 1 ? (Math.round(years * 10) / 10) + ' years' : 'under a year';
      if (verdict) verdict.textContent = 'The market fell ' + Math.abs(state.move) + '%. Your withdrawal rate jumped to ' + (r.curRate * 100).toFixed(1) + '%, past your ceiling, so the pay cut rule fires.';
      if (recover) recover.textContent = 'At ' + REGIME[state.currency].growth + '% growth, your company claws back to its old value in about ' + yearStr + '. That is how long the smaller salary has to hold.';
      if (letterWrap) letterWrap.style.display = 'block';
      var tail = r.stillHigh
        ? 'Even after this trim your rate is still <b>' + (r.newRate * 100).toFixed(1) + '%</b>, above your ceiling, so a second trim may follow if the slump drags on. A cut this deep is where your cash bucket does the heavy lifting, not the pay rule alone.'
        : 'That drops you back inside your guardrails. Hold here until the market climbs back, then the raise rule takes over.';
      if (letterBody) letterBody.innerHTML =
        'Effective immediately, your salary moves from <b>' + oldM + '</b> to <b>' + newM + '</b> a month, a trim of about <b>' + deltaStr + '</b> a month. ' + tail;
      if (gut) gut.textContent = 'So here is the real question. Could you live on ' + newM + ' a month for ' + yearStr + '? If yes, a crash cannot end your retirement. If it makes you flinch, you need a bigger cushion or more room to cut.';
    }
  }

  function renderAll() {
    // reflect the portfolio input value without stomping active typing
    var input = document.getElementById('portfolio-input');
    if (input && document.activeElement !== input) {
      if (state.portfolioUSD > 0) {
        var disp = Math.round(state.currency === 'inr' ? state.portfolioUSD * FX : state.portfolioUSD);
        input.value = disp.toLocaleString('en-US');
      } else {
        input.value = '';
      }
    }
    renderSetup();
    renderStress();
  }

  /* ---------- wiring ---------- */
  function onClick(id, key, fn) {
    var box = document.getElementById(id); if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-' + key + ']'); if (b) { fn(b.getAttribute('data-' + key)); }
    });
  }

  function init() {
    if (!document.getElementById('w-stress')) return;

    onClick('w-setup', 'cur', function (v) {
      state.currency = v; save(); renderAll();
    });
    onClick('w-setup', 'rate', function (v) {
      state.rate = parseFloat(v); save(); renderAll();
    });

    var input = document.getElementById('portfolio-input');
    if (input) input.addEventListener('input', function () {
      var raw = input.value.replace(/[^0-9]/g, '');
      var entered = raw === '' ? 0 : parseInt(raw, 10);
      // store in USD base
      state.portfolioUSD = state.currency === 'inr' ? entered / FX : entered;
      save();
      renderSetup();
      renderStress();
    });

    var slider = document.getElementById('move-slider');
    if (slider) slider.addEventListener('input', function () {
      state.move = parseInt(slider.value, 10); save(); renderStress();
    });
    onClick('w-stress', 'move', function (v) {
      state.move = parseInt(v, 10); save(); renderAll();
    });

    var copy = document.getElementById('copy-letter');
    if (copy) copy.addEventListener('click', function () {
      var body = document.getElementById('letter-body');
      var gut = document.getElementById('gut');
      if (!body || !body.textContent) return;
      var text = 'Revised salary letter (from me, to me):\n' + body.textContent +
        (gut && gut.textContent ? '\n\n' + gut.textContent : '') +
        '\n\nBuilt on butfirstfire.com';
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy the letter'; }, 1600); });
    });

    var reset = document.getElementById('reset-crash');
    if (reset) reset.addEventListener('click', function () {
      state = { currency: state.currency, rate: 4, move: 0 };
      save();
      var pi = document.getElementById('portfolio-input'); if (pi) pi.value = '';
      renderAll();
    });

    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
