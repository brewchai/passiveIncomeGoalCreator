/* ============================================================
   Coast FIRE Calculator — coast-fire.js
   All math is inflation-adjusted (real returns).
   ============================================================ */

(function () {
    'use strict';

    // ── Config ──────────────────────────────────────────────
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbz8EAa39TNBsOMVBjqOBuuWmb_AuYLR5ztfSzd9Bsih8HVMRA3kBbZvO3sKqEJYvyj/exec';

    // ── DOM refs ─────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const el = {
        form:          $('coastForm'),
        currentAge:    $('currentAge'),
        retirementAge: $('retirementAge'),
        annualSpend:   $('annualSpend'),
        currentPort:   $('currentPortfolio'),
        annualContrib: $('annualContrib'),
        expReturn:     $('expectedReturn'),
        wrSlider:      $('withdrawalRate'),
        wrDisplay:     $('wrDisplay'),
        calcBtn:       $('calcButton'),
        results:       $('resultsContainer'),
        hero:          $('coastHero'),
        progFill:      $('progressFill'),
        progPct:       $('progressPct'),
        progRem:       $('progressRem'),
        progTarget:    $('progressTarget'),
        chartDesc:     $('chartDesc'),
        chartLegend:   $('chartLegend'),
        compareGrid:   $('compareGrid'),
        nlForm:        $('newsletterForm'),
        nlEmail:       $('newsletterEmail'),
        nlMsg:         $('newsletterMsg'),
        openModal:     $('openModal'),
        closeModal:    $('closeModal'),
        infoModal:     $('infoModal'),
    };

    let chartInstance = null;

    // ── Slider ──────────────────────────────────────────────
    el.wrSlider.addEventListener('input', () => {
        const v = parseFloat(el.wrSlider.value).toFixed(1);
        el.wrDisplay.textContent = v + '%';
        updateSliderBg();
    });

    function updateSliderBg() {
        const min = parseFloat(el.wrSlider.min);
        const max = parseFloat(el.wrSlider.max);
        const val = parseFloat(el.wrSlider.value);
        const pct = ((val - min) / (max - min)) * 100;
        el.wrSlider.style.background =
            `linear-gradient(to right, #18a683 0%, #18a683 ${pct}%, rgba(148,163,184,0.25) ${pct}%, rgba(148,163,184,0.25) 100%)`;
    }
    updateSliderBg();

    // ── Modal ────────────────────────────────────────────────
    el.openModal.addEventListener('click', () => { el.infoModal.style.display = 'flex'; });
    el.closeModal.addEventListener('click', () => { el.infoModal.style.display = 'none'; });
    el.infoModal.addEventListener('click', e => { if (e.target === el.infoModal) el.infoModal.style.display = 'none'; });

    // ── Helpers ──────────────────────────────────────────────
    function fmt(n, decimals = 0) {
        if (!isFinite(n)) return '—';
        return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    function fmtMoney(n) {
        if (!isFinite(n)) return '—';
        if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
        if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'K';
        return '$' + Math.round(n).toLocaleString();
    }

    function fmtFull(n) {
        return '$' + Math.round(n).toLocaleString('en-US');
    }

    // ── Core Math ────────────────────────────────────────────
    function calculate(inputs) {
        const { currentAge, retirementAge, annualSpend, currentPort, annualContrib, rate, wr } = inputs;
        const years = retirementAge - currentAge;
        const r = rate / 100;
        const wrDecimal = wr / 100;

        // Full FIRE number
        const fireNumber = annualSpend / wrDecimal;

        // Coast FIRE number (present value of fireNumber discounted at r)
        const coastNumber = fireNumber / Math.pow(1 + r, years);

        // Are they already coasting?
        const isCoasting = currentPort >= coastNumber;

        // Years to reach Coast FIRE (if not already)
        let yearsToCoast = 0;
        if (!isCoasting) {
            // Solve: currentPort*(1+r)^n + annualContrib*((1+r)^n - 1)/r = coastNumber
            // Iteratively find n
            if (annualContrib <= 0) {
                // No contributions — just growth
                yearsToCoast = Math.log(coastNumber / currentPort) / Math.log(1 + r);
            } else {
                let pv = currentPort;
                yearsToCoast = 0;
                while (pv < coastNumber && yearsToCoast < years) {
                    pv = pv * (1 + r) + annualContrib;
                    yearsToCoast++;
                }
                if (pv < coastNumber) yearsToCoast = Infinity; // Can't reach before retirement
            }
        }

        // Build year-by-year data for chart
        // Phase 1: contribute until coast (or until retirement if already coasting)
        // Phase 2: coast (zero contributions) until retirement
        const chartData = [];
        let portfolio = currentPort;
        const coastYear = isCoasting ? currentAge : Math.min(currentAge + Math.ceil(yearsToCoast), retirementAge);
        const coastHitAge = isCoasting ? currentAge : coastYear;

        for (let age = currentAge; age <= retirementAge; age++) {
            chartData.push({ age, value: Math.round(portfolio) });
            if (age < retirementAge) {
                const contributing = age < coastHitAge;
                const contribution = contributing ? annualContrib : 0;
                portfolio = portfolio * (1 + r) + contribution;
            }
        }

        // Portfolio value at retirement
        const finalValue = chartData[chartData.length - 1].value;

        // How much more needed for full FIRE at retirement (should be ~0 or positive)
        const fireGap = Math.max(0, fireNumber - finalValue);

        return {
            fireNumber,
            coastNumber,
            isCoasting,
            yearsToCoast,
            coastHitAge,
            chartData,
            finalValue,
            fireGap,
            years,
        };
    }

    // ── Render Hero ──────────────────────────────────────────
    function renderHero(r, inputs) {
        const { currentPort, currentAge, retirementAge } = inputs;
        el.hero.className = 'coast-hero ' + (r.isCoasting ? 'coasting' : 'not-coasting');

        if (r.isCoasting) {
            const excess = currentPort - r.coastNumber;
            el.hero.innerHTML = `
                <div class="hero-grid">
                    <div class="hero-main">
                        <span class="hero-label">Your Coast FIRE Number</span>
                        <span class="hero-value">${fmtFull(r.coastNumber)}</span>
                        <span class="hero-sub">To fund ${fmtFull(r.fireNumber)} FIRE number by age ${retirementAge}</span>
                        <span class="hero-badge green">🏄 You're already coasting!</span>
                    </div>
                    <div class="hero-stats">
                        <div class="hero-stat">
                            <span class="hero-stat-label">Portfolio today</span>
                            <span class="hero-stat-value">${fmtFull(currentPort)}</span>
                        </div>
                        <div class="hero-stat">
                            <span class="hero-stat-label">Above coast by</span>
                            <span class="hero-stat-value" style="color:#18a683;">${fmtFull(excess)}</span>
                        </div>
                        <div class="hero-stat">
                            <span class="hero-stat-label">Years until full retirement</span>
                            <span class="hero-stat-value">${retirementAge - currentAge}</span>
                        </div>
                        <div class="hero-stat">
                            <span class="hero-stat-label">Projected at retirement</span>
                            <span class="hero-stat-value">${fmtFull(r.finalValue)}</span>
                        </div>
                    </div>
                </div>`;
        } else {
            const ageWhenCoast = isFinite(r.yearsToCoast)
                ? currentAge + Math.ceil(r.yearsToCoast)
                : null;
            const yearLabel = ageWhenCoast && ageWhenCoast < retirementAge
                ? `You'll be able to coast at age ${ageWhenCoast}`
                : `Requires contributions all the way to retirement`;
            const still = r.coastNumber - currentPort;
            el.hero.innerHTML = `
                <div class="hero-grid">
                    <div class="hero-main">
                        <span class="hero-label">Your Coast FIRE Number</span>
                        <span class="hero-value">${fmtFull(r.coastNumber)}</span>
                        <span class="hero-sub">${yearLabel}</span>
                        <span class="hero-badge purple">📈 Still building to coast</span>
                    </div>
                    <div class="hero-stats">
                        <div class="hero-stat">
                            <span class="hero-stat-label">Still needed</span>
                            <span class="hero-stat-value">${fmtFull(still)}</span>
                        </div>
                        <div class="hero-stat">
                            <span class="hero-stat-label">Years to coast</span>
                            <span class="hero-stat-value">${ageWhenCoast && ageWhenCoast < retirementAge ? Math.ceil(r.yearsToCoast) + ' yrs' : 'N/A'}</span>
                        </div>
                        <div class="hero-stat">
                            <span class="hero-stat-label">Full FIRE target</span>
                            <span class="hero-stat-value">${fmtFull(r.fireNumber)}</span>
                        </div>
                        <div class="hero-stat">
                            <span class="hero-stat-label">Projected at retirement</span>
                            <span class="hero-stat-value">${fmtFull(r.finalValue)}</span>
                        </div>
                    </div>
                </div>`;
        }
    }

    // ── Render Progress ──────────────────────────────────────
    function renderProgress(r, inputs) {
        const pct = Math.min(100, Math.round((inputs.currentPort / r.coastNumber) * 100));
        const target = fmtFull(r.coastNumber);

        setTimeout(() => {
            el.progFill.style.width = pct + '%';
        }, 100);

        el.progPct.textContent = pct + '%';
        el.progTarget.textContent = target;

        if (r.isCoasting) {
            el.progRem.textContent = '🎉 Coast FIRE achieved!';
        } else {
            const rem = r.coastNumber - inputs.currentPort;
            el.progRem.textContent = fmtFull(rem) + ' to go';
        }
    }

    // ── Render Chart ─────────────────────────────────────────
    function renderChart(r, inputs) {
        const canvas = $('coastChart');
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const container = canvas.parentElement;
        const W = container.clientWidth || 760;
        const H = container.clientHeight || 320;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.scale(dpr, dpr);

        const PAD = { top: 24, right: 20, bottom: 40, left: 72 };
        const w = W - PAD.left - PAD.right;
        const h = H - PAD.top - PAD.bottom;

        // Data
        const data = r.chartData;
        const values = data.map(d => d.value);
        const maxV = Math.max(...values, r.fireNumber) * 1.08;
        const minV = 0;

        function xOf(i) { return PAD.left + (i / (data.length - 1)) * w; }
        function yOf(v) { return PAD.top + h - ((v - minV) / (maxV - minV)) * h; }

        // Coast hit index
        const coastIdx = r.isCoasting ? 0 : data.findIndex(d => d.age >= r.coastHitAge);

        // ── Grid ──
        ctx.strokeStyle = 'rgba(148,163,184,0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = PAD.top + (h / 5) * i;
            ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + w, y); ctx.stroke();
        }

        // ── FIRE Number line ──
        const fireY = yOf(r.fireNumber);
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(PAD.left, fireY); ctx.lineTo(PAD.left + w, fireY); ctx.stroke();
        ctx.setLineDash([]);

        // ── Phase 1: contributing (purple) ──
        if (!r.isCoasting && coastIdx > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 3;
            for (let i = 0; i <= coastIdx; i++) {
                const x = xOf(i), y = yOf(data[i].value);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Fill under phase 1
            ctx.save();
            ctx.beginPath();
            for (let i = 0; i <= coastIdx; i++) {
                const x = xOf(i), y = yOf(data[i].value);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.lineTo(xOf(coastIdx), PAD.top + h);
            ctx.lineTo(xOf(0), PAD.top + h);
            ctx.closePath();
            ctx.fillStyle = 'rgba(102, 126, 234, 0.12)';
            ctx.fill();
            ctx.restore();
        }

        // ── Phase 2: coasting (teal) ──
        const phase2Start = r.isCoasting ? 0 : coastIdx;
        ctx.beginPath();
        ctx.strokeStyle = '#18a683';
        ctx.lineWidth = 3;
        for (let i = phase2Start; i < data.length; i++) {
            const x = xOf(i), y = yOf(data[i].value);
            i === phase2Start ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Fill under phase 2
        ctx.save();
        ctx.beginPath();
        for (let i = phase2Start; i < data.length; i++) {
            const x = xOf(i), y = yOf(data[i].value);
            i === phase2Start ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(xOf(data.length - 1), PAD.top + h);
        ctx.lineTo(xOf(phase2Start), PAD.top + h);
        ctx.closePath();
        ctx.fillStyle = 'rgba(24, 166, 131, 0.1)';
        ctx.fill();
        ctx.restore();

        // ── Coast FIRE dot ──
        if (coastIdx >= 0 && coastIdx < data.length) {
            const cx = xOf(coastIdx), cy = yOf(data[coastIdx].value);
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#18a683';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(15,23,42,0.85)';
            ctx.roundRect(cx - 40, cy - 36, 80, 24, 6);
            ctx.fill();
            ctx.fillStyle = '#18a683';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏄 Coast FIRE', cx, cy - 19);
        }

        // ── FIRE number label ──
        ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Full FIRE Target', PAD.left + w - 4, fireY - 7);

        // ── Y axis labels ──
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const v = minV + ((maxV - minV) * (5 - i)) / 5;
            const y = PAD.top + (h / 5) * i;
            ctx.fillText(fmtMoney(v), PAD.left - 8, y + 4);
        }

        // ── X axis ──
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        const step = Math.max(1, Math.floor(data.length / 6));
        for (let i = 0; i < data.length; i += step) {
            ctx.fillText('Age ' + data[i].age, xOf(i), PAD.top + h + 22);
        }
        ctx.fillText('Age ' + data[data.length - 1].age, xOf(data.length - 1), PAD.top + h + 22);

        // ── Legend ──
        const legendItems = [];
        if (!r.isCoasting) legendItems.push({ color: '#667eea', label: 'Contributing phase' });
        legendItems.push({ color: '#18a683', label: 'Coasting phase (zero new savings)' });
        legendItems.push({ color: 'rgba(250,204,21,0.8)', label: 'Full FIRE target' });

        el.chartLegend.innerHTML = legendItems.map(item => `
            <div class="legend-item">
                <span class="legend-dot" style="background:${item.color};"></span>
                ${item.label}
            </div>`).join('');
    }

    // ── Render Comparison ────────────────────────────────────
    function renderComparison(r, inputs) {
        const { retirementAge, currentAge, annualContrib, wr, rate } = inputs;
        const years = retirementAge - currentAge;

        // Traditional FIRE: need fireNumber by retirement, what's the monthly savings path?
        const r_rate = rate / 100;
        const safeYrsToFull = annualContrib > 0
            ? (() => {
                let pv = inputs.currentPort;
                for (let y = 0; y <= years; y++) {
                    if (pv >= r.fireNumber) return y;
                    pv = pv * (1 + r_rate) + annualContrib;
                }
                return '>'+years;
            })()
            : '—';

        el.compareGrid.innerHTML = `
            <div class="compare-card highlight">
                <span class="compare-type">🏄 Coast FIRE</span>
                <span class="compare-number">${fmtFull(r.coastNumber)}</span>
                <p class="compare-detail">
                    Once you hit this, <strong>stop investing</strong>.<br>
                    Compound growth takes you the rest of the way to ${fmtFull(r.fireNumber)} by age ${retirementAge}.
                </p>
            </div>
            <div class="compare-card">
                <span class="compare-type">🔥 Traditional FIRE</span>
                <span class="compare-number">${fmtFull(r.fireNumber)}</span>
                <p class="compare-detail">
                    Full retirement portfolio target.<br>
                    At ${fmtFull(annualContrib)}/yr contributions, approximately <strong>${safeYrsToFull} years</strong> of saving required.
                </p>
            </div>
            <div class="compare-card">
                <span class="compare-type">⚡ The Coast Advantage</span>
                <span class="compare-number">${fmtFull(r.fireNumber - r.coastNumber)}</span>
                <p class="compare-detail">
                    Dollars of compound growth that do the heavy lifting for you — <strong>you never have to save this amount yourself</strong>.
                </p>
            </div>`;
    }

    // ── Main Calc ────────────────────────────────────────────
    function runCalculation() {
        const inputs = {
            currentAge:    parseInt(el.currentAge.value) || 30,
            retirementAge: parseInt(el.retirementAge.value) || 60,
            annualSpend:   parseFloat(el.annualSpend.value) || 60000,
            currentPort:   parseFloat(el.currentPort.value) || 0,
            annualContrib: parseFloat(el.annualContrib.value) || 0,
            rate:          parseFloat(el.expReturn.value) || 7,
            wr:            parseFloat(el.wrSlider.value) || 4,
        };

        // Validate
        if (inputs.retirementAge <= inputs.currentAge) {
            alert('Retirement age must be greater than current age.');
            return;
        }

        const result = calculate(inputs);
        el.results.style.display = 'block';

        renderHero(result, inputs);
        renderProgress(result, inputs);

        el.chartDesc.textContent = result.isCoasting
            ? `Your portfolio is already above your Coast FIRE number. The green area shows it compounding — with zero new contributions — to ${fmtFull(result.fireNumber)} by age ${inputs.retirementAge}.`
            : `Purple shows you contributing until age ${result.coastHitAge}. From there, the green "coasting" phase takes you to ${fmtFull(result.fireNumber)} by age ${inputs.retirementAge} — with no new savings needed.`;

        // Small delay to let DOM settle before drawing chart
        setTimeout(() => {
            renderChart(result, inputs);
        }, 50);

        renderComparison(result, inputs);
        el.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Button ───────────────────────────────────────────────
    el.calcBtn.addEventListener('click', runCalculation);
    el.form.addEventListener('keydown', e => { if (e.key === 'Enter') runCalculation(); });

    // ── Newsletter ───────────────────────────────────────────
    el.nlForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = el.nlEmail.value.trim();
        if (!email) return;

        const submitBtn = el.nlForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Sending…';
        submitBtn.disabled = true;

        try {
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'coast-fire-calculator' }),
            });

            el.nlMsg.textContent = '🔥 You\'re in! Check your inbox for the welcome note.';
            el.nlMsg.className = 'newsletter-cta-msg success';
            el.nlMsg.style.display = 'block';
            el.nlEmail.value = '';
            submitBtn.textContent = 'Subscribed!';
        } catch {
            el.nlMsg.textContent = 'Something went wrong. Please try again.';
            el.nlMsg.className = 'newsletter-cta-msg error';
            el.nlMsg.style.display = 'block';
            submitBtn.textContent = 'Subscribe';
            submitBtn.disabled = false;
        }
    });

    // ── ResizeObserver for chart ─────────────────────────────
    const chartShell = document.querySelector('.chart-shell');
    if (chartShell) {
        let resizeTimer;
        new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (el.results.style.display !== 'none') {
                    const inputs = {
                        currentAge:    parseInt(el.currentAge.value) || 30,
                        retirementAge: parseInt(el.retirementAge.value) || 60,
                        annualSpend:   parseFloat(el.annualSpend.value) || 60000,
                        currentPort:   parseFloat(el.currentPort.value) || 0,
                        annualContrib: parseFloat(el.annualContrib.value) || 0,
                        rate:          parseFloat(el.expReturn.value) || 7,
                        wr:            parseFloat(el.wrSlider.value) || 4,
                    };
                    if (inputs.retirementAge > inputs.currentAge) {
                        renderChart(calculate(inputs), inputs);
                    }
                }
            }, 150);
        }).observe(chartShell);
    }

})();
