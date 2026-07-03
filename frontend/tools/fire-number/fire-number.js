(() => {
    'use strict';

    const byId = (id) => document.getElementById(id);

    // ── DOM refs ──
    const annualSpendEl    = byId('annualSpend');
    const currentPortEl    = byId('currentPortfolio');
    const annualSavingsEl  = byId('annualSavings');
    const expectedReturnEl = byId('expectedReturn');
    const wrSlider         = byId('withdrawalRate');
    const wrDisplay        = byId('wrDisplay');
    const calcBtn          = byId('calcButton');
    const resultsContainer = byId('resultsContainer');
    const heroResult       = byId('heroResult');
    const progressPct      = byId('progressPct');
    const progressRem      = byId('progressRemaining');
    const progressFill     = byId('progressFill');
    const progressTarget   = byId('progressTarget');
    const chartCanvas      = byId('fireChart');
    const chartSubDesc     = byId('chartSubDesc');
    const wrCompareGrid    = byId('wrCompareGrid');

    // ── State ──
    let lastResults = null;

    // ── Region modes ──
    const MODES = {
        us: {
            symbol: '$', locale: 'en-US', currency: 'USD',
            defaultWr: 4.0,
            defaults: { spend: 60000, portfolio: 100000, savings: 30000 },
            step:     { spend: 1000, portfolio: 5000, savings: 1000 },
            infoLabel: 'What is the 4% rule?',
            note: 'US mode: 4% rule → 25× your annual spending, shown in $.'
        },
        in: {
            symbol: '₹', locale: 'en-IN', currency: 'INR',
            defaultWr: 3.0,
            defaults: { spend: 1200000, portfolio: 2000000, savings: 600000 },
            step:     { spend: 10000, portfolio: 50000, savings: 10000 },
            infoLabel: 'Why 3% (33×) for India?',
            note: 'India mode: 3% withdrawal rate → 33× your annual spending, shown in ₹ (lakhs & crores).'
        }
    };
    let modeKey = 'us';
    let mode = MODES.us;

    // ── Utilities ──
    function safeNum(v, fb) { const n = Number(v); return Number.isFinite(n) ? n : fb; }
    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

    function fmtMoney(v) {
        return Math.max(0, v).toLocaleString(mode.locale, { style: 'currency', currency: mode.currency, maximumFractionDigits: 0 });
    }

    function fmtCompact(v) {
        v = Math.max(0, v);
        const s = mode.symbol;
        if (modeKey === 'in') {
            // Indian numbering: crore (1e7) and lakh (1e5)
            if (v >= 1e7) return `${s}${(v / 1e7).toFixed(2)} Cr`;
            if (v >= 1e5) return `${s}${(v / 1e5).toFixed(2)} L`;
            if (v >= 1e3) return `${s}${(v / 1e3).toFixed(0)}k`;
            return fmtMoney(v);
        }
        if (v >= 1e9) return `${s}${(v / 1e9).toFixed(2)}B`;
        if (v >= 1e6) return `${s}${(v / 1e6).toFixed(2)}M`;
        if (v >= 1e3) return `${s}${(v / 1e3).toFixed(0)}k`;
        return fmtMoney(v);
    }

    function fmtPct(v, d = 1) { return `${(+v).toFixed(d)}%`; }

    // ── Core math ──
    // Returns array of portfolio values year 0..yearsNeeded
    function projectPortfolio(startVal, annualContrib, returnPct, fireNumber, maxYears = 80) {
        const r = returnPct / 100;
        let port = startVal;
        const vals = [port];

        for (let y = 1; y <= maxYears; y++) {
            port = port * (1 + r) + annualContrib;
            vals.push(port);
            if (port >= fireNumber) break;
        }
        return vals;
    }

    function yearsToFire(startVal, annualContrib, returnPct, fireNumber) {
        if (startVal >= fireNumber) return 0;
        const r = returnPct / 100;
        // Use the closed-form formula where possible, fall back to iteration
        if (r === 0) {
            if (annualContrib <= 0) return Infinity;
            return Math.ceil((fireNumber - startVal) / annualContrib);
        }
        // Iterate (fast enough for this use case)
        let port = startVal;
        for (let y = 1; y <= 100; y++) {
            port = port * (1 + r) + annualContrib;
            if (port >= fireNumber) return y;
        }
        return Infinity;
    }

    // ── Compute ──
    function compute() {
        const annualSpend   = Math.max(0, safeNum(annualSpendEl?.value, 60000));
        const currentPort   = Math.max(0, safeNum(currentPortEl?.value, 100000));
        const annualSavings = Math.max(0, safeNum(annualSavingsEl?.value, 30000));
        const returnPct     = clamp(safeNum(expectedReturnEl?.value, 7.0), 0, 20);
        const wr            = clamp(safeNum(wrSlider?.value, 4.0), 2.5, 5.0);

        const fireNumber = annualSpend / (wr / 100);
        const progress   = currentPort >= fireNumber ? 1 : currentPort / fireNumber;
        const years      = yearsToFire(currentPort, annualSavings, returnPct, fireNumber);
        const projection = projectPortfolio(currentPort, annualSavings, returnPct, fireNumber);
        const fireYear   = new Date().getFullYear() + years;

        // Compare across withdrawal rates
        const compRates = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0].filter(r => r >= 2.5 && r <= 5.0);
        const comparison = compRates.map(r => ({
            rate: r,
            fireNumber: annualSpend / (r / 100),
            years: yearsToFire(currentPort, annualSavings, returnPct, annualSpend / (r / 100)),
            active: r === wr
        }));

        lastResults = { annualSpend, currentPort, annualSavings, returnPct, wr, fireNumber, progress, years, projection, fireYear, comparison };
        return lastResults;
    }

    // ── Render ──
    function render() {
        if (!lastResults) return;
        const { annualSpend, currentPort, wr, fireNumber, progress, years, projection, fireYear, comparison, returnPct, annualSavings } = lastResults;

        resultsContainer.style.display = 'block';

        // ── Hero ──
        const yearsText = years === 0
            ? 'You\'ve already hit your FIRE number! 🎉'
            : years === Infinity
            ? 'Cannot reach FIRE at current savings rate'
            : `${years} year${years === 1 ? '' : 's'} to go (${fireYear})`;

        heroResult.innerHTML = `
            <div class="hero-main">
                <span class="hero-label">Your FIRE Number at ${fmtPct(wr)} withdrawal</span>
                <span class="hero-value">${fmtCompact(fireNumber)}</span>
                <span class="hero-sub">${fmtMoney(annualSpend)}/year ÷ ${fmtPct(wr)} = ${fmtCompact(fireNumber)}</span>
            </div>
            <div class="hero-stats">
                <div class="hero-stat">
                    <span class="hero-stat-label">Years to FIRE</span>
                    <span class="hero-stat-value">${years === Infinity ? '∞' : years === 0 ? '0' : years}</span>
                </div>
                <div class="hero-stat">
                    <span class="hero-stat-label">FIRE Year</span>
                    <span class="hero-stat-value">${years === 0 ? 'Now' : years === Infinity ? '—' : fireYear}</span>
                </div>
                <div class="hero-stat">
                    <span class="hero-stat-label">Multiplier</span>
                    <span class="hero-stat-value">${(100 / wr).toFixed(1)}×</span>
                </div>
                <div class="hero-stat">
                    <span class="hero-stat-label">Monthly need</span>
                    <span class="hero-stat-value">${fmtCompact(annualSpend / 12)}</span>
                </div>
            </div>
        `;

        // ── Progress Bar ──
        const pctDisplay = Math.min(100, progress * 100);
        progressPct.textContent = `${pctDisplay.toFixed(1)}%`;
        progressRem.textContent = currentPort >= fireNumber
            ? 'You\'ve reached your FIRE number!'
            : `${fmtCompact(fireNumber - currentPort)} remaining`;
        progressFill.style.width = `${Math.max(2, pctDisplay)}%`;
        progressTarget.textContent = fmtCompact(fireNumber);

        // ── Chart ──
        chartSubDesc.textContent = `At ${fmtPct(returnPct)} annual return, adding ${fmtCompact(annualSavings)}/year`;
        drawChart(chartCanvas, projection, fireNumber);

        // ── WR Comparison ──
        renderComparison(comparison, wr);
    }

    function renderComparison(comparison, activeWr) {
        wrCompareGrid.innerHTML = '';
        for (const c of comparison) {
            const card = document.createElement('div');
            card.className = `wr-compare-card${c.active ? ' active' : ''}`;
            const yearsStr = c.years === 0 ? 'Already there!' : c.years === Infinity ? 'Not reachable' : `${c.years} years (${new Date().getFullYear() + c.years})`;
            card.innerHTML = `
                <span class="wr-compare-rate">${fmtPct(c.rate)} WR</span>
                <span class="wr-compare-label">FIRE Number</span>
                <span class="wr-compare-number">${fmtCompact(c.fireNumber)}</span>
                <span class="wr-compare-years">${yearsStr}</span>
            `;
            wrCompareGrid.appendChild(card);
        }
    }

    // ── Chart (canvas) ──
    function drawChart(canvas, projection, fireNumber) {
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(320, Math.floor(rect.width));
        const h = Math.max(240, Math.floor(rect.height));
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const pad = { l: 70, r: 20, t: 20, b: 36 };
        const pW = w - pad.l - pad.r;
        const pH = h - pad.t - pad.b;
        const totalYears = projection.length - 1;
        const yMax = Math.max(fireNumber * 1.08, Math.max(...projection) * 1.05);

        const xPx = (x) => pad.l + (x / totalYears) * pW;
        const yPx = (y) => pad.t + pH - (y / yMax) * pH;

        const cs = getComputedStyle(document.documentElement);
        const bgColor = cs.getPropertyValue('--card-background').trim() || '#fff';
        const mutedColor = cs.getPropertyValue('--text-muted').trim() || '#94a3b8';

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.font = '11px Inter,system-ui,sans-serif';
        ctx.fillStyle = mutedColor;
        for (let i = 0; i <= 5; i++) {
            const yVal = yMax * i / 5;
            const py = yPx(yVal);
            ctx.strokeStyle = 'rgba(148,163,184,0.18)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(w - pad.r, py); ctx.stroke();
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(fmtCompact(yVal), pad.l - 8, py);
        }

        // X labels
        const xN = Math.min(totalYears, 10);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let i = 0; i <= xN; i++) {
            const yr = Math.round(i / xN * totalYears);
            ctx.fillText(`Yr ${yr}`, xPx(yr), h - pad.b + 8);
        }

        // Axes
        ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();

        // FIRE number horizontal line (dashed)
        const fireY = yPx(fireNumber);
        ctx.strokeStyle = 'rgba(24, 166, 131, 0.7)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(pad.l, fireY); ctx.lineTo(w - pad.r, fireY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(24, 166, 131, 0.9)';
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = 'bold 11px Inter,system-ui,sans-serif';
        ctx.fillText(`FIRE: ${fmtCompact(fireNumber)}`, pad.l + 6, fireY - 3);

        // Portfolio growth line (gradient)
        const grad = ctx.createLinearGradient(pad.l, 0, w - pad.r, 0);
        grad.addColorStop(0, '#667eea');
        grad.addColorStop(1, '#18a683');
        ctx.strokeStyle = grad; ctx.lineWidth = 3;
        ctx.beginPath();
        projection.forEach((v, x) => {
            const px = xPx(x), py = yPx(v);
            x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Fill under line
        const areaGrad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
        areaGrad.addColorStop(0, 'rgba(102, 126, 234, 0.18)');
        areaGrad.addColorStop(1, 'rgba(102, 126, 234, 0)');
        ctx.fillStyle = areaGrad;
        ctx.beginPath();
        ctx.moveTo(xPx(0), yPx(projection[0]));
        projection.forEach((v, x) => ctx.lineTo(xPx(x), yPx(v)));
        ctx.lineTo(xPx(totalYears), h - pad.b);
        ctx.lineTo(xPx(0), h - pad.b);
        ctx.closePath();
        ctx.fill();

        // Terminal dot
        const lastX = xPx(totalYears), lastY = yPx(projection[projection.length - 1]);
        ctx.fillStyle = '#18a683';
        ctx.beginPath(); ctx.arc(lastX, lastY, 5, 0, 2 * Math.PI); ctx.fill();
    }

    // ── Slider live update ──
    function setSliderFill(val) {
        if (!wrSlider) return;
        const pct = ((val - 2.5) / (5.0 - 2.5)) * 100;
        wrSlider.style.background = `linear-gradient(to right, #667eea 0%, #667eea ${pct}%, rgba(148,163,184,0.25) ${pct}%, rgba(148,163,184,0.25) 100%)`;
    }
    if (wrSlider) {
        wrSlider.addEventListener('input', () => {
            const val = parseFloat(wrSlider.value);
            if (wrDisplay) wrDisplay.textContent = `${val.toFixed(1)}%`;
            setSliderFill(val);
        });
    }

    // ── Calculate button ──
    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            compute();
            render();
            setTimeout(() => {
                resultsContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        });
    }

    // ── Info Modal ──
    const infoModal = byId('infoModal');
    const openModalBtn = byId('openModal');
    const closeModalBtn = byId('closeModal');
    if (openModalBtn) openModalBtn.addEventListener('click', () => { if (infoModal) infoModal.style.display = 'flex'; });
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { if (infoModal) infoModal.style.display = 'none'; });
    if (infoModal) infoModal.addEventListener('click', (e) => { if (e.target === infoModal) infoModal.style.display = 'none'; });

    // ── Newsletter CTA ──
    const NEWSLETTER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwojek3Afm9YM5PspylrXvt1BXs2lM5wroNv3a4bPpG_qeWCo0obdU5GrUvYxMRn3Zwgg/exec';
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const ctaForm  = byId('newsletterCtaForm');
    const ctaEmail = byId('newsletterCtaEmail');
    const ctaMsg   = byId('newsletterCtaMsg');

    if (ctaForm) {
        ctaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = ctaEmail ? ctaEmail.value.trim() : '';
            if (!EMAIL_RE.test(email)) {
                if (ctaMsg) { ctaMsg.textContent = 'Please enter a valid email address.'; ctaMsg.className = 'newsletter-cta-msg error'; ctaMsg.style.display = 'block'; }
                return;
            }
            const btn = ctaForm.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }
            try {
                const fd = new URLSearchParams();
                fd.append('email', email);
                fd.append('source', 'fire-number-calculator');
                await fetch(NEWSLETTER_ENDPOINT, { method: 'POST', mode: 'no-cors', body: fd });
            } catch (_) { /* silent */ }
            if (ctaMsg) { ctaMsg.textContent = '🔥 You\'re in! Watch your inbox for FIRE updates.'; ctaMsg.className = 'newsletter-cta-msg success'; ctaMsg.style.display = 'block'; }
            if (ctaEmail) ctaEmail.value = '';
            if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
        });
    }

    // ── Region mode switch ──
    function detectMode() {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'in';
            const lang = (navigator.language || '').toLowerCase();
            if (lang === 'en-in' || lang.startsWith('hi')) return 'in';
        } catch (_) { /* ignore */ }
        return 'us';
    }

    function applyMode(key, { resetInputs = true } = {}) {
        modeKey = (key === 'in') ? 'in' : 'us';
        mode = MODES[modeKey];

        // Toggle buttons
        document.querySelectorAll('.mode-btn').forEach((b) => {
            const on = b.dataset.mode === modeKey;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });

        // Currency symbols
        document.querySelectorAll('.currency-prefix').forEach((el) => { el.textContent = mode.symbol; });

        // Explainer highlight
        document.querySelectorAll('.why-col').forEach((c) => c.classList.toggle('active', c.dataset.mode === modeKey));

        // Mode note + info link label
        const noteEl = byId('modeNote');
        if (noteEl) noteEl.textContent = mode.note;
        if (openModalBtn) openModalBtn.textContent = mode.infoLabel;

        // Reset inputs + steps to region defaults
        if (resetInputs) {
            if (annualSpendEl)   { annualSpendEl.value   = mode.defaults.spend;     annualSpendEl.step   = mode.step.spend; }
            if (currentPortEl)   { currentPortEl.value   = mode.defaults.portfolio; currentPortEl.step   = mode.step.portfolio; }
            if (annualSavingsEl) { annualSavingsEl.value = mode.defaults.savings;   annualSavingsEl.step = mode.step.savings; }
        }

        // Withdrawal rate → region default
        if (wrSlider) wrSlider.value = mode.defaultWr;
        if (wrDisplay) wrDisplay.textContent = `${mode.defaultWr.toFixed(1)}%`;
        setSliderFill(mode.defaultWr);

        // Recompute if results are already on screen
        if (lastResults) { compute(); render(); }
    }

    document.querySelectorAll('.mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => applyMode(btn.dataset.mode));
    });

    // Initialise from detected region
    applyMode(detectMode());

    // ── Resize ──
    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => { if (lastResults) drawChart(chartCanvas, lastResults.projection, lastResults.fireNumber); });
        if (chartCanvas?.parentElement) ro.observe(chartCanvas.parentElement);
    }
})();
