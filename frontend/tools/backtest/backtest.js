(() => {
    'use strict';

    const D = window.BACKTEST_DATA;
    const { simulate, priceMultiple } = window.BACKTEST_ENGINE;
    const FIRST = D.first;
    const LAST = D.last;
    const LAST_START = LAST - 2; // a start year needs at least two full years of record
    const byId = (id) => document.getElementById(id);

    const els = {
        corpus: byId('corpus'),
        rate: byId('rate'),
        equity: byId('equity'),
        years: byId('years'),
        ypick: byId('ypick'),
        ypickYear: byId('ypickYear'),
        ypop: byId('ypop'),
        ypopClose: byId('ypopClose'),
        tCorpus: byId('tCorpus'),
        tEquity: byId('tEquity'),
        tRate: byId('tRate'),
        tNote: byId('tNote'),
        context: byId('context'),
        real: byId('countTax'),
        go: byId('go'),
        barsLegend: byId('barsLegend'),
        empty: byId('empty'),
        emptyNote: byId('emptyNote'),
        results: byId('results'),
        headline: byId('headline'),
        verdict: byId('verdict'),
        low: byId('low'),
        gap: byId('gap'),
        pathTitle: byId('pathTitle'),
        pathCanvas: byId('pathChart'),
        pathLegend: byId('pathLegend'),
        barsCanvas: byId('barsChart'),
        barsNote: byId('barsNote'),
        barsSummary: byId('barsSummary'),
        tableBody: byId('tableBody'),
        tableTitle: byId('tableTitle')
    };

    const INK = '#1C1714';
    const ACCENT = '#7A4E00';
    const MUTED = '#6E6159';
    const RULE = '#E8E1D9';
    const DEFAULTS = { corpus: 100000000, rate: 3.5, share: 0.6, start: 2000 };

    // ── Formatting ──
    const trim = (s) => s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    function money(n) {
        n = Math.max(0, n);
        if (n >= 1e7) { const c = n / 1e7; return `₹${trim(c >= 100 ? c.toFixed(0) : c >= 10 ? c.toFixed(1) : c.toFixed(2))} crore`; }
        if (n >= 1e5) { const l = n / 1e5; return `₹${trim(l >= 10 ? l.toFixed(0) : l.toFixed(1))} lakh`; }
        return `₹${Math.round(n).toLocaleString('en-IN')}`;
    }
    function moneyShort(n) {
        n = Math.max(0, n);
        if (n >= 1e7) { const c = n / 1e7; return `${trim(c >= 10 ? c.toFixed(1) : c.toFixed(2))} cr`; }
        if (n >= 1e5) { const l = n / 1e5; return `${trim(l >= 10 ? l.toFixed(0) : l.toFixed(1))} L`; }
        return Math.round(n).toLocaleString('en-IN');
    }
    const pct = (n, d = 1) => `${trim((+n).toFixed(d))}%`;
    const num = (el) => { const v = Number(String(el?.value ?? '').replace(/[^\d.]/g, '')); return Number.isFinite(v) ? v : 0; };
    const groupIN = (el) => { const v = num(el); if (el && v > 0) el.value = Math.round(v).toLocaleString('en-IN'); fit(el); };
    const fit = (el) => { if (el) el.style.width = `${Math.max(3, String(el.value).length + 1)}ch`; };

    // ── State ──
    const state = { inputs: null, runs: null, hover: null, start: DEFAULTS.start, revealed: false };

    function readInputs() {
        const corpus = num(els.corpus);
        const rate = num(els.rate);
        return {
            corpus,
            rate,
            spend: corpus * rate / 100,
            share: Math.min(100, Math.max(0, num(els.equity))) / 100,
            start: state.start,
            real: !!els.real.checked
        };
    }

    function inputsValid(i) {
        return i.corpus > 0 && i.rate > 0 && i.rate < 100 && i.start >= FIRST && i.start <= LAST_START;
    }

    function compute() {
        const i = readInputs();
        state.inputs = i;
        if (!inputsValid(i)) { state.runs = null; return; }
        const runs = {};
        for (let y = FIRST; y <= LAST_START; y++) {
            runs[y] = { clean: simulate(y, i.corpus, i.spend, i.share, false), real: simulate(y, i.corpus, i.spend, i.share, true) };
        }
        state.runs = runs;
    }

    // ── The translation line: today's figures in the start year's rupees ──
    // The past sentence: the same plan, with the money as it was back then.
    function renderTranslate() {
        const i = state.inputs;
        els.ypickYear.textContent = String(i.start);
        els.tEquity.textContent = pct(i.share * 100, 0);
        els.tRate.textContent = i.rate > 0 ? pct(i.rate) : '…';
        if (!i || i.corpus <= 0 || i.rate <= 0) {
            els.tCorpus.textContent = '…';
            els.tNote.textContent = 'Fill in the amount above and this line fills itself in.';
            return;
        }
        const m = priceMultiple(i.start);
        els.tCorpus.textContent = money(i.corpus / m);
        els.tNote.textContent = `${money(i.corpus / m)} in ${i.start} bought what ${money(i.corpus)} buys today. Prices have gone up ${trim(m.toFixed(1))}× since.`;
    }

    // ── Words ──
    function verdictFor(run) {
        if (run.failYear) return 'You did nothing wrong. You retired into a bad decade.';
        if (run.wrNow <= 0.04) return 'The plan is holding.';
        if (run.wrNow <= 0.06) return 'It survived, but it is slipping. You now spend a bigger share of the money than when you started.';
        return 'It is in trouble. At this rate the money does not last.';
    }

    function render() {
        const i = state.inputs;
        if (!state.revealed) { els.empty.hidden = true; els.results.hidden = true; return; }
        if (!state.runs) {
            els.empty.hidden = false;
            els.results.hidden = true;
            els.emptyNote.textContent = !i || i.corpus <= 0
                ? 'Fill in the amount first.'
                : i.rate <= 0 || i.rate >= 100 ? 'Spending has to be between 0% and 100% a year.' : `Pick a start year between ${FIRST} and ${LAST_START}.`;
            return;
        }
        els.empty.hidden = true;
        els.results.hidden = false;

        const pair = state.runs[i.start];
        const run = i.real ? pair.real : pair.clean;
        const other = i.real ? pair.clean : pair.real;
        const m = priceMultiple(i.start);

        els.headline.textContent = run.failYear
            ? `The money ran out in ${run.failYear}.`
            : `${money(run.endToday)} left today.`;
        els.context.textContent = run.failYear
            ? `You started in ${i.start} with ${money(i.corpus / m)}. That was ${money(i.corpus)} in today’s money.`
            : `You started in ${i.start} with ${money(i.corpus / m)}. That was ${money(i.corpus)} in today’s money. You now spend ${pct(run.wrNow * 100)} of what is left each year.`;
        els.verdict.textContent = verdictFor(run);

        const drop = 1 - run.minToday / run.startToday;
        els.low.textContent = run.failYear
            ? ''
            : drop > 0.005
                ? (run.minIsEnd
                    ? `This is the worst it has been. The money is down ${pct(drop * 100, 0)} from where you started, in today’s rupees.`
                    : `The worst point was ${run.minYear}. The money was down to ${money(run.minToday)} in today’s rupees, a ${pct(drop * 100, 0)} fall.`)
                : 'The money never fell below where it started, in today’s rupees.';

        els.gap.textContent = i.real
            ? (other.failYear ? `Without tax and fees it still runs out, in ${other.failYear}.` : `Without tax and fees it would be ${money(other.endToday)}. Most calculators show you that number. It is not the one you get.`)
            : (other.failYear ? `With tax and fees the money runs out in ${other.failYear}.` : `With tax and fees it would be ${money(other.endToday)}. That is the number you actually get.`);

        els.pathTitle.textContent = `Your money, year by year, from ${i.start}`;
        els.pathLegend.innerHTML = `<span><i class="sw sw-ink"></i>With tax and fees</span><span><i class="sw sw-accent"></i>Without tax and fees</span><span><i class="sw sw-dash"></i>Where you started, ${money(i.corpus)}</span>`;
        drawPath(pair, i);

        els.barsLegend.innerHTML = `<span><i class="sw sw-accent"></i>Money left today</span><span><i class="sw sw-ink"></i>The year above</span><span><i class="sw sw-dash"></i>Where you started, ${money(i.corpus)}</span>`;
        drawBars(i);
        els.barsSummary.textContent = barsSummary(i);

        els.tableTitle.textContent = `Every year, from ${i.start}, ${i.real ? 'with tax and fees' : 'without tax and fees'}`;
        renderTable(run);
    }

    function barsSummary(i) {
        const key = i.real ? 'real' : 'clean';
        const list = Object.values(state.runs).map((p) => p[key]);
        const failed = list.filter((r) => r.failYear);
        const trouble = list.filter((r) => !r.failYear && r.wrNow > 0.06);
        const holding = list.filter((r) => !r.failYear && r.wrNow <= 0.04);
        const worst = list.reduce((a, b) => (b.endToday < a.endToday ? b : a));
        const best = list.reduce((a, b) => (b.endToday > a.endToday ? b : a));
        const years = (arr) => arr.map((r) => r.startYear).join(', ').replace(/, ([^,]*)$/, ' and $1');
        const parts = [];
        parts.push(`There are ${list.length} start years. ${holding.length} ${holding.length === 1 ? 'is' : 'are'} fine.`);
        if (failed.length) parts.push(`${failed.length} ${failed.length === 1 ? 'runs' : 'run'} out of money: ${years(failed)}.`);
        if (trouble.length) parts.push(`${trouble.length} ${trouble.length === 1 ? 'is' : 'are'} in trouble: ${years(trouble)}.`);
        parts.push(`Worst start: ${worst.startYear}${worst.failYear ? ', the money ran out' : `, ${money(worst.endToday)} left`}. Best start: ${best.startYear}, ${money(best.endToday)} left. Recent years have had less time to go wrong.`);
        return parts.join(' ');
    }

    // ── Canvas helpers ──
    function prepCanvas(canvas, cssH) {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.parentElement.clientWidth;
        const h = cssH;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.font = '12px Manrope, system-ui, sans-serif';
        return { ctx, w, h };
    }

    function niceMax(v) {
        if (v <= 0) return 1;
        const p = Math.pow(10, Math.floor(Math.log10(v)));
        const m = v / p;
        const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
        return step * p;
    }

    function drawPath(pair, i) {
        const canvas = els.pathCanvas;
        if (!canvas) return;
        const small = canvas.parentElement.clientWidth < 520;
        const { ctx, w, h } = prepCanvas(canvas, small ? 260 : 340);
        const pad = { l: 56, r: 16, t: 18, b: 30 };
        const series = [pair.clean, pair.real];
        const maxV = niceMax(Math.max(i.corpus, ...series.flatMap((r) => r.points.map((p) => p.value))) * 1.05);
        const x0 = i.start, x1 = LAST + 1;
        const xPx = (year) => pad.l + ((year - x0) / (x1 - x0)) * (w - pad.l - pad.r);
        const yPx = (v) => pad.t + (1 - v / maxV) * (h - pad.t - pad.b);

        ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.fillStyle = MUTED; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const ticks = 4;
        for (let t = 0; t <= ticks; t++) {
            const v = (maxV / ticks) * t; const y = yPx(v);
            ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
            ctx.fillText(moneyShort(v), pad.l - 8, y);
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const span = x1 - x0; const stepYears = span > 18 ? 5 : span > 9 ? 2 : 1;
        for (let y = x0; y <= LAST; y += stepYears) ctx.fillText(String(y), xPx(y), h - pad.b + 8);
        ctx.fillText('now', xPx(x1), h - pad.b + 8);

        ctx.setLineDash([5, 4]); ctx.strokeStyle = INK; ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.moveTo(pad.l, yPx(i.corpus)); ctx.lineTo(w - pad.r, yPx(i.corpus)); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;

        const order = i.real ? [pair.clean, pair.real] : [pair.real, pair.clean];
        order.forEach((run) => {
            const isReal = run === pair.real;
            const chosen = (isReal === i.real);
            ctx.strokeStyle = isReal ? INK : ACCENT;
            ctx.lineWidth = chosen ? 3 : 2;
            ctx.globalAlpha = chosen ? 1 : 0.8;
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.beginPath();
            run.points.forEach((p, k) => { const px = xPx(p.year), py = yPx(p.value); k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
            ctx.stroke();
            ctx.globalAlpha = 1;
            const last = run.points[run.points.length - 1];
            ctx.fillStyle = isReal ? INK : ACCENT;
            ctx.beginPath(); ctx.arc(xPx(last.year), yPx(last.value), 4, 0, Math.PI * 2); ctx.fill();
            ctx.textAlign = 'right'; ctx.textBaseline = isReal ? 'top' : 'bottom'; ctx.font = '600 12px Manrope, system-ui, sans-serif';
            ctx.fillText(run.failYear ? `ran out ${run.failYear}` : money(last.value), xPx(last.year) - 6, yPx(last.value) + (isReal ? 6 : -6));
            ctx.font = '12px Manrope, system-ui, sans-serif';
        });

        const run = i.real ? pair.real : pair.clean;
        if (!run.failYear && !run.minIsEnd && run.minToday < run.startToday * 0.995) {
            const lx = xPx(run.minYear), ly = yPx(run.minToday);
            ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = INK; ctx.textAlign = lx > w * 0.7 ? 'right' : 'left'; ctx.textBaseline = 'top'; ctx.font = '600 12px Manrope, system-ui, sans-serif';
            ctx.fillText(`${run.minYear} low, ${money(run.minToday)}`, lx + (lx > w * 0.7 ? -8 : 8), ly + 8);
        }
    }

    function drawBars(i) {
        const canvas = els.barsCanvas;
        if (!canvas) return;
        const small = canvas.parentElement.clientWidth < 520;
        const { ctx, w, h } = prepCanvas(canvas, small ? 240 : 300);
        const pad = { l: 56, r: 12, t: 22, b: 30 };
        const key = i.real ? 'real' : 'clean';
        const years = Object.keys(state.runs).map(Number);
        const vals = years.map((y) => state.runs[y][key]);
        const maxV = niceMax(Math.max(i.corpus, ...vals.map((r) => r.endToday)) * 1.08);
        const yPx = (v) => pad.t + (1 - v / maxV) * (h - pad.t - pad.b);
        const slot = (w - pad.l - pad.r) / years.length;
        const bw = Math.max(6, slot * 0.62);

        ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.fillStyle = MUTED; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let t = 0; t <= 4; t++) { const v = (maxV / 4) * t; const y = yPx(v); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillText(moneyShort(v), pad.l - 8, y); }
        state.barRects = [];
        years.forEach((y, k) => {
            const r = state.runs[y][key];
            const x = pad.l + slot * k + (slot - bw) / 2;
            const top = yPx(r.endToday);
            const selected = y === i.start;
            const hovered = state.hover === y;
            ctx.fillStyle = selected ? INK : ACCENT;
            ctx.globalAlpha = selected || hovered ? 1 : 0.72;
            const hgt = Math.max(2, h - pad.b - top);
            ctx.fillRect(x, h - pad.b - hgt, bw, hgt);
            ctx.globalAlpha = 1;
            if (r.failYear) {
                ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '600 11px Manrope, system-ui, sans-serif';
                ctx.fillText('out', x + bw / 2, h - pad.b - 4);
                ctx.font = '12px Manrope, system-ui, sans-serif';
            }
            state.barRects.push({ year: y, x, w: bw });
            const every = slot < 26 ? 5 : slot < 40 ? 2 : 1;
            if ((y - FIRST) % every === 0 || selected) {
                ctx.fillStyle = selected ? INK : MUTED; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
                ctx.font = selected ? '600 12px Manrope, system-ui, sans-serif' : '12px Manrope, system-ui, sans-serif';
                ctx.fillText(String(y), x + bw / 2, h - pad.b + 8);
                ctx.font = '12px Manrope, system-ui, sans-serif';
            }
        });
        // the start line goes on top of the bars so it stays visible
        ctx.setLineDash([5, 4]); ctx.strokeStyle = INK; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(pad.l, yPx(i.corpus)); ctx.lineTo(w - pad.r, yPx(i.corpus)); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.lineWidth = 1;
        state.barGeom = { pad, slot, h };

        const focus = state.hover ?? i.start;
        const fr = state.runs[focus][key];
        els.barsNote.textContent = fr.failYear
            ? `Retire in ${focus}: the money ran out in ${fr.failYear}.`
            : `Retire in ${focus}: ${money(fr.endToday)} left today. Spending is ${pct(fr.wrNow * 100)} of it.`;
    }

    function barAt(evt) {
        const rect = els.barsCanvas.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const g = state.barGeom;
        if (!g || !state.barRects) return null;
        const k = Math.floor((x - g.pad.l) / g.slot);
        const bar = state.barRects[k];
        return bar ? bar.year : null;
    }

    function renderTable(run) {
        const frag = [];
        run.rows.forEach((r) => {
            const y = r.year;
            const partial = y === LAST;
            frag.push(`<tr${y === run.failYear ? ' class="out"' : ''}>
                <td>${y}${partial ? '*' : ''}</td>
                <td class="n">${pct(D.nifty[y])}</td>
                <td class="n">${pct(D.cpi[y])}</td>
                <td class="n">${pct(D.fd[y], 2)}</td>
                <td class="n">${y === run.failYear ? 'ran out' : money(r.nominal)}</td>
                <td class="n">${y === run.failYear ? '' : money(r.today)}</td>
                <td class="n">${money(r.spend)}</td>
                <td class="n">${Number.isFinite(r.wr) ? pct(r.wr * 100) : ''}</td>
            </tr>`);
        });
        if (!run.failYear) {
            frag.push(`<tr class="end"><td>now</td><td></td><td></td><td></td><td class="n">${money(run.endNominal)}</td><td class="n">${money(run.endToday)}</td><td class="n">${money(state.inputs.spend)} a year</td><td class="n">${pct(run.wrNow * 100)}</td></tr>`);
        }
        els.tableBody.innerHTML = frag.join('');
    }

    // ── Year picker: a button in the sentence that opens a grid, like a date picker ──
    function buildYears() {
        els.years.innerHTML = '';
        for (let y = FIRST; y <= LAST_START; y++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'year';
            b.dataset.year = String(y);
            b.textContent = String(y);
            b.setAttribute('role', 'radio');
            b.addEventListener('click', () => { setStart(y); closeYears(); update(); });
            els.years.appendChild(b);
        }
        syncYears();
        els.ypick.addEventListener('click', () => (els.ypop.hidden ? openYears() : closeYears()));
        els.ypopClose.addEventListener('click', closeYears);
        document.addEventListener('click', (e) => { if (!els.ypop.hidden && !els.ypop.contains(e.target) && !els.ypick.contains(e.target)) closeYears(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !els.ypop.hidden) { closeYears(); els.ypick.focus(); } });
    }
    function openYears() {
        els.ypop.hidden = false;
        els.ypick.setAttribute('aria-expanded', 'true');
        // keep the panel inside the viewport on both sides
        const margin = 12;
        const vw = document.documentElement.clientWidth; // the layout width, without the scrollbar
        const wrapRect = els.ypick.parentElement.getBoundingClientRect();
        const width = Math.min(340, vw - margin * 2);
        let left = 0;
        if (wrapRect.left + left + width > vw - margin) left = (vw - margin - width) - wrapRect.left;
        if (wrapRect.left + left < margin) left = margin - wrapRect.left;
        els.ypop.style.width = `${width}px`;
        els.ypop.style.left = `${Math.round(left)}px`;
        els.ypop.style.right = 'auto';
        const active = els.years.querySelector('.year.active');
        if (active) active.focus();
    }
    function closeYears() {
        els.ypop.hidden = true;
        els.ypick.setAttribute('aria-expanded', 'false');
    }
    function setStart(y) { state.start = Math.min(LAST_START, Math.max(FIRST, y)); syncYears(); }
    function syncYears() {
        els.years.querySelectorAll('.year').forEach((b) => {
            const on = Number(b.dataset.year) === state.start;
            b.classList.toggle('active', on);
            b.setAttribute('aria-checked', String(on));
        });
    }

    // ── URL state ──
    function readUrl() {
        const q = new URLSearchParams(location.search);
        let any = false;
        const set = (el, key) => { const v = q.get(key); if (v !== null && el) { el.value = v; any = true; } };
        set(els.corpus, 'corpus'); set(els.rate, 'rate'); set(els.equity, 'equity');
        if (q.has('start')) { setStart(Number(q.get('start')) || DEFAULTS.start); any = true; }
        if (q.has('tax') && els.real) { els.real.checked = q.get('tax') !== '0'; any = true; }
        return any;
    }
    let urlTimer = null;
    function writeUrl() {
        clearTimeout(urlTimer);
        urlTimer = setTimeout(() => {
            const i = state.inputs; if (!i) return;
            const q = new URLSearchParams();
            if (i.corpus !== DEFAULTS.corpus) q.set('corpus', String(i.corpus));
            if (i.rate !== DEFAULTS.rate) q.set('rate', String(i.rate));
            if (i.share !== DEFAULTS.share) q.set('equity', String(Math.round(i.share * 100)));
            if (i.start !== DEFAULTS.start) q.set('start', String(i.start));
            if (!i.real) q.set('tax', '0');
            const s = q.toString();
            const next = `${location.pathname}${s ? `?${s}` : ''}`;
            if (next !== location.pathname + location.search) history.replaceState(null, '', next);
        }, 200);
    }

    // ── Wiring ──
    function update() { compute(); renderTranslate(); render(); if (state.revealed) writeUrl(); }

    function reveal() {
        state.revealed = true;
        update();
        const target = state.runs ? els.results : els.empty;
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }

    function setup() {
        buildYears();
        const fromLink = readUrl();
        groupIN(els.corpus); fit(els.equity); fit(els.rate);
        els.corpus.addEventListener('input', () => { fit(els.corpus); update(); });
        els.corpus.addEventListener('blur', () => groupIN(els.corpus));
        [els.equity, els.rate].forEach((el) => el.addEventListener('input', () => { fit(el); update(); }));
        els.real.addEventListener('change', update);
        els.go.addEventListener('click', reveal);
        els.barsCanvas.addEventListener('mousemove', (e) => { const y = barAt(e); if (y !== state.hover) { state.hover = y; if (state.runs) drawBars(state.inputs); } });
        els.barsCanvas.addEventListener('mouseleave', () => { state.hover = null; if (state.runs) drawBars(state.inputs); });
        els.barsCanvas.addEventListener('click', (e) => { const y = barAt(e); if (y) { setStart(y); update(); } });
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => { if (state.runs && state.revealed) { drawPath(state.runs[state.inputs.start], state.inputs); drawBars(state.inputs); } });
            ro.observe(els.pathCanvas.parentElement);
        }
        // A shared link opens straight on the result.
        if (fromLink) state.revealed = true;
        update();
    }

    setup();
})();
