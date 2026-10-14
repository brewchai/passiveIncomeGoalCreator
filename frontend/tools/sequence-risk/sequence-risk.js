(() => {
    'use strict';
    const byId = (id) => document.getElementById(id);
    const el = {
        startingPortfolio: byId('startingPortfolio'),
        annualWithdrawal: byId('annualWithdrawal'),
        inflationRate: byId('inflationRate'),
        avgReturn: byId('avgReturn'),
        retirementYears: byId('retirementYears'),
        withdrawalRateText: byId('withdrawalRateText'),
        useGuardrails: byId('useGuardrails'),
        runButton: byId('runButton'),
        runButtonText: byId('runButtonText'),
        runButtonLoader: byId('runButtonLoader'),
        resultsContainer: byId('resultsContainer'),
        portfolioLineChart: byId('portfolioLineChart'),
        scenarioChips: byId('scenarioChips'),
        scenarioOutcomes: byId('scenarioOutcomes'),
        sequenceTableHead: byId('sequenceTableHead'),
        sequenceTableBody: byId('sequenceTableBody'),
        sequenceTableHeading: byId('sequenceTableHeading'),
        sequenceNote: byId('sequenceNote'),
        infoModal: byId('infoModal'),
        openModal: byId('openModal'),
        closeModal: byId('closeModal'),
        guardrailsModal: byId('guardrailsModal'),
        openGuardrailsModal: byId('openGuardrailsModal'),
        closeGuardrailsModal: byId('closeGuardrailsModal'),
        textSummaryPanel: byId('textSummaryPanel'),
        chartPopup: byId('chartPopup'),
        popupYear: byId('popupYear'),
        popupReturn: byId('popupReturn'),
        popupWithdrawal: byId('popupWithdrawal'),
        popupSave: byId('popupSave'),
        popupCancel: byId('popupCancel'),
        presetInjectBtns: document.querySelectorAll('.preset-inject-btn'),
        guardrailsFloorContainer: byId('guardrailsFloorContainer'),
        guardrailsFloor: byId('guardrailsFloor'),
        toggleInflTarget: byId('toggleInflTarget'),
        toggleNextYear: byId('toggleNextYear'),
        curBtns: document.querySelectorAll('.cur-btn'),
        popupWithdrawalLabel: byId('popupWithdrawalLabel')
    };

    // ── Currency (USD / INR dual mode) ──
    let currency = 'USD';
    const INR_PER_USD = 94;
    function symChar() { return currency === 'INR' ? '₹' : '$'; }

    // ── Data Models ──
    const PRESETS = {
        great_depression: {
            name: 'Great Depression (1929)',
            data: [-8.42, -24.90, -43.34, -8.19, 53.99, -1.44, 47.67, 33.92, -35.03, 31.12, -0.41, -9.78, -11.59, 20.34, 25.90, 19.75, 36.44, -8.07, 5.71, 5.50, 18.79, 31.71, 24.02, 18.37, -0.99, 52.62, 31.56, 6.56, -10.78, 43.36]
        },
        dot_com: {
            name: 'Dot-Com Crash (2000)',
            data: [-9.10, -11.89, -22.10, 28.68, 10.88, 4.91, 15.79, 5.49, -37.00, 26.46, 15.06, 2.11, 16.00, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.40, 28.71, -18.11, 26.29]
        },
        gfc: {
            name: '2008 Financial Crisis',
            data: [5.49, -37.00, 26.46, 15.06, 2.11, 16.00, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.40, 28.71, -18.11, 26.29]
        },
        bull_run: {
            name: 'The 2010s Bull Run',
            data: [15.06, 2.11, 16.00, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.40, 28.71, -18.11, 26.29]
        },
        realistic: {
            name: 'Realistic (same average)',
            data: [] // Computed dynamically with volatility around the Expected Return input
        },
        historical_average: {
            name: 'Historical Average',
            data: [] // Computed dynamically based on Expected Return input
        }
    };

    // Chart line / chip colours (one per scenario).
    const SCENARIO_KEYS = ['realistic', 'historical_average', 'dot_com', 'gfc', 'great_depression', 'bull_run'];
    const SCENARIO_LABELS = {
        realistic: 'Realistic',
        historical_average: 'Historical Average',
        dot_com: 'Dot-Com Crash',
        gfc: '2008 Crisis',
        great_depression: 'Great Depression',
        bull_run: 'Bull Run'
    };
    const SCENARIO_COLORS = {
        realistic: '#9333EA',
        historical_average: '#D97706',
        dot_com: '#0891B2',
        gfc: '#E11D48',
        great_depression: '#475569',
        bull_run: '#16A34A'
    };
    const DEFAULT_ACTIVE = ['historical_average', 'realistic'];

    let activeSet = new Set(DEFAULT_ACTIVE);
    let focusKey = 'realistic';
    let isCalculating = false;
    // state.scenarios[key] = { data:number[], withdrawals:(number|null)[], result:simResult, edited:bool }
    const state = { inputs: null, scenarios: null, chartCoords: [], activePopupYear: null };

    // ── Utilities ──
    function safeNum(v, fb) { const n = Number(v); return Number.isFinite(n) ? n : fb; }
    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
    function fmtMoney(v) {
        v = Math.max(0, v);
        if (currency === 'INR') return '₹' + Math.round(v).toLocaleString('en-IN');
        return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    }
    function fmtCompact(v) {
        v = Math.max(0, v);
        if (currency === 'INR') {
            if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
            if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
            if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
            return fmtMoney(v);
        }
        if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
        if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
        if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`;
        return fmtMoney(v);
    }
    function fmtPct(v, d = 1) { return `${(Number.isFinite(+v) ? (+v).toFixed(d) : '0')}%`; }
    function fmtSignedPct(v, d = 1) { const n = +v; return `${n > 0 ? '+' : ''}${Number.isFinite(n) ? n.toFixed(d) : '0'}%`; }
    function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }

    // ── Scenario generation ──
    // Deterministic PRNG so the "Realistic" path is stable across runs (not random every click).
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // A bumpy return sequence whose ARITHMETIC mean is exactly avgPct, with ~15% annual volatility.
    function buildRealisticSequence(avgPct, years, vol = 15) {
        const rand = mulberry32(20260517); // fixed seed → reproducible
        const z = [];
        for (let i = 0; i < years; i++) {
            let u = 0, v = 0;
            while (u === 0) u = rand();
            while (v === 0) v = rand();
            z.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); // Box-Muller normal
        }
        const meanZ = z.reduce((a, b) => a + b, 0) / (z.length || 1);
        return z.map(zi => clamp(avgPct + (zi - meanZ) * vol, -60, 90));
    }

    function buildSequence(key, avgPct, years) {
        if (key === 'realistic') return buildRealisticSequence(avgPct, years);
        const preset = PRESETS[key];
        const data = preset.data.slice(0, years);
        const rem = years - data.length;
        if (rem > 0) return data.concat(Array.from({ length: rem }, () => avgPct));
        return data.slice(0, years);
    }

    // ── Simulation ──
    function simulate({ portfolio: startVal, initialWithdrawal, inflPct, returnsPct, isGuardrails, minFloor, customWithdrawals }) {
        const years = returnsPct.length;
        const infl = inflPct / 100;
        let port = startVal;
        let w = initialWithdrawal;
        let minVal = startVal;
        const initialRate = startVal > 0 ? initialWithdrawal / startVal : 0;

        const vals = [startVal];
        const withdrawals = [];
        const rows = [];
        const floorBreaches = [];
        let currentMinFloor = minFloor || 0;

        for (let y = 1; y <= years; y++) {
            let startPort = port;
            let thisYearW = w;

            if (customWithdrawals && customWithdrawals[y - 1] !== undefined && customWithdrawals[y - 1] !== null) {
                thisYearW = customWithdrawals[y - 1];
                w = thisYearW;
            }

            // Hard floor: you never spend below your absolute minimum. If the guardrails
            // want to cut deeper, you hold at the floor instead, which drains faster and can
            // genuinely run the portfolio out.
            let heldAtFloor = false;
            if (isGuardrails && currentMinFloor > 0 && thisYearW < currentMinFloor) {
                thisYearW = currentMinFloor;
                heldAtFloor = true;
            }

            if (port < thisYearW) {
                const actualWithdrawal = port;
                withdrawals.push(actualWithdrawal);
                rows.push({ year: y, startPort, withdrawal: actualWithdrawal, startWR: startPort > 0 ? actualWithdrawal / startPort : 0, returnPct: returnsPct[y - 1], endPort: 0, endWR: 0, trigger: '-', nextW: 0 });
                vals.push(0);
                for (let futureYear = y + 1; futureYear <= years; futureYear++) {
                    vals.push(0);
                    withdrawals.push(0);
                    rows.push({ year: futureYear, startPort: 0, withdrawal: 0, startWR: 0, returnPct: returnsPct[futureYear - 1], endPort: 0, endWR: 0, trigger: '-', nextW: 0 });
                }
                return { survived: false, failYear: y, endVal: 0, minVal: 0, vals, withdrawals, rows, floorBreaches };
            }

            if (heldAtFloor) floorBreaches.push(y);

            withdrawals.push(thisYearW);
            port -= thisYearW;
            minVal = Math.min(minVal, port);
            port *= (1 + returnsPct[y - 1] / 100);
            minVal = Math.min(minVal, port);
            vals.push(port);

            let endWR = port > 0 ? thisYearW / port : 0;
            let forwardTrigger = 'Standard';
            let nextW = thisYearW;

            if (y < years) {
                if (customWithdrawals && customWithdrawals[y] !== undefined && customWithdrawals[y] !== null) {
                    nextW = customWithdrawals[y];
                    forwardTrigger = 'Manual Override';
                } else if (isGuardrails) {
                    if (endWR > initialRate * 1.2) { nextW = thisYearW * 0.9; forwardTrigger = 'Pay Cut (-10%)'; }
                    else if (endWR < initialRate * 0.8) { nextW = thisYearW * 1.1; forwardTrigger = 'Pay Raise (+10%)'; }
                    else if (returnsPct[y - 1] < 0) { nextW = thisYearW; forwardTrigger = 'Skip Inflation'; }
                    else { nextW = thisYearW * (1 + infl); forwardTrigger = 'Inflation Adjust'; }
                } else {
                    nextW = thisYearW * (1 + infl);
                    forwardTrigger = 'Inflation Adjust';
                }
                w = nextW;
            } else { forwardTrigger = '-'; nextW = 0; }

            rows.push({ year: y, startPort, withdrawal: thisYearW, startWR: startPort > 0 ? thisYearW / startPort : 0, returnPct: returnsPct[y - 1], endPort: port, endWR, trigger: forwardTrigger, nextW });
            currentMinFloor *= (1 + infl);
        }
        return { survived: true, failYear: null, endVal: port, minVal, vals, withdrawals, rows, floorBreaches };
    }

    function classify({ survived, failYear, years, startVal, endVal, minVal }) {
        if (!survived) {
            return failYear <= Math.min(10, Math.floor(years * 0.35))
                ? { label: 'Severe Risk', tone: 'bad' }
                : { label: 'High Risk', tone: 'bad' };
        }
        const minR = startVal > 0 ? minVal / startVal : 0;
        const endR = startVal > 0 ? endVal / startVal : 0;
        if (minR >= 0.6 && endR >= 1.0) return { label: 'Safe', tone: 'good' };
        if (minR >= 0.35) return { label: 'Moderate Risk', tone: 'warn' };
        return { label: 'High Risk', tone: 'bad' };
    }

    // ── Compute (all scenarios, every Calculate) ──
    function readInputs() {
        const startVal = Math.max(0, safeNum(el.startingPortfolio.value, 1000000));
        const initialWithdrawal = Math.max(0, safeNum(el.annualWithdrawal.value, 40000));
        const inflPct = clamp(safeNum(el.inflationRate.value, 3.0), 0, 30);
        const avgPct = clamp(safeNum(el.avgReturn.value, 7.0), -20, 30);
        const years = clamp(Math.floor(safeNum(el.retirementYears.value, 50)), 1, 80);
        const isGuardrails = el.useGuardrails ? el.useGuardrails.checked : false;
        const minFloor = isGuardrails && el.guardrailsFloor ? Math.max(0, safeNum(el.guardrailsFloor.value, 40000)) : 0;
        return { startVal, initialWithdrawal, inflPct, avgPct, years, isGuardrails, minFloor };
    }

    function simForScenario(data, withdrawals) {
        const i = state.inputs;
        return simulate({ portfolio: i.startVal, initialWithdrawal: i.initialWithdrawal, inflPct: i.inflPct, returnsPct: data, isGuardrails: i.isGuardrails, minFloor: i.minFloor, customWithdrawals: withdrawals });
    }

    function buildScenario(key) {
        const data = buildSequence(key, state.inputs.avgPct, state.inputs.years);
        const withdrawals = new Array(state.inputs.years).fill(null);
        return { data, withdrawals, result: simForScenario(data, withdrawals), edited: false };
    }

    function compute() {
        state.inputs = readInputs();
        state.scenarios = {};
        for (const key of SCENARIO_KEYS) state.scenarios[key] = buildScenario(key);
        // Keep focus valid.
        if (!activeSet.has(focusKey)) { const a = [...activeSet]; focusKey = a[a.length - 1] || 'realistic'; }
    }

    function resetScenarios() {
        activeSet = new Set(DEFAULT_ACTIVE);
        focusKey = 'realistic';
        if (state.inputs) for (const key of SCENARIO_KEYS) state.scenarios[key] = buildScenario(key);
        if (el.chartPopup) el.chartPopup.style.display = 'none';
        state.activePopupYear = null;
        render();
    }

    // ── Render orchestration ──
    function render() {
        if (!state.scenarios) return;
        el.resultsContainer.style.display = 'block';
        renderChips();
        drawChart();
        renderOutcomes();
        renderDetail();
    }

    function renderChips() {
        clear(el.scenarioChips);
        SCENARIO_KEYS.forEach(key => {
            const on = activeSet.has(key);
            const foc = on && focusKey === key;
            const c = document.createElement('button');
            c.type = 'button';
            c.className = 'scn-chip' + (on ? ' on' : '') + (foc ? ' focus' : '');
            if (on) { c.style.background = SCENARIO_COLORS[key]; c.style.borderColor = SCENARIO_COLORS[key]; c.style.color = '#fff'; }
            else { c.style.color = SCENARIO_COLORS[key]; }
            c.innerHTML = `<span class="scn-dot"></span>${SCENARIO_LABELS[key]}`;
            c.addEventListener('click', () => {
                if (activeSet.has(key)) {
                    if (focusKey === key) { activeSet.delete(key); const rem = [...activeSet]; focusKey = rem[rem.length - 1] || null; }
                    else { focusKey = key; }
                } else { activeSet.add(key); focusKey = key; }
                if (el.chartPopup) el.chartPopup.style.display = 'none';
                render();
            });
            el.scenarioChips.appendChild(c);
        });
        const rst = document.createElement('button');
        rst.type = 'button';
        rst.className = 'scn-reset';
        rst.textContent = '↺ Reset';
        rst.addEventListener('click', resetScenarios);
        el.scenarioChips.appendChild(rst);
    }

    function renderOutcomes() {
        clear(el.scenarioOutcomes);
        [...activeSet].sort((a, b) => SCENARIO_KEYS.indexOf(a) - SCENARIO_KEYS.indexOf(b)).forEach(key => {
            const r = state.scenarios[key].result;
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'scn-outcome' + (focusKey === key ? ' focus' : '');
            const badge = r.survived ? '<span class="scn-badge ok">SURVIVED</span>' : '<span class="scn-badge fail">FAILED</span>';
            const big = r.survived ? fmtCompact(r.endVal) : 'Year ' + r.failYear;
            const sub = (r.survived ? 'final value · low ' : 'ran out · low ') + fmtCompact(r.minVal) + (state.scenarios[key].edited ? ' · edited' : '');
            card.innerHTML = `<span class="scn-oc-name"><span class="scn-dot" style="background:${SCENARIO_COLORS[key]}"></span>${SCENARIO_LABELS[key]}${badge}</span>`
                + `<span class="scn-oc-big">${big}</span><span class="scn-oc-sub">${sub}</span>`;
            card.addEventListener('click', () => {
                focusKey = key;
                if (el.chartPopup) el.chartPopup.style.display = 'none';
                render();
            });
            el.scenarioOutcomes.appendChild(card);
        });
    }

    function renderDetail() {
        const inputs = state.inputs;
        if (!focusKey || !activeSet.has(focusKey)) {
            el.textSummaryPanel.className = 'summary-panel';
            el.textSummaryPanel.innerHTML = '<p class="summary-desc">Toggle a scenario on above to see its year-by-year detail here.</p>';
            clear(el.sequenceTableHead); clear(el.sequenceTableBody);
            if (el.sequenceNote) el.sequenceNote.textContent = '';
            return;
        }

        const cur = state.scenarios[focusKey].result;
        const base = state.scenarios['historical_average'].result;
        const years = inputs.years;
        const st = classify({ survived: cur.survived, failYear: cur.failYear, years, startVal: inputs.startVal, endVal: cur.endVal, minVal: cur.minVal });

        // The portfolio may "survive" only because guardrails cut spending below the minimum
        // floor. Those years are a lifestyle failure the portfolio number hides, so escalate.
        const breachCount = (inputs.isGuardrails && inputs.minFloor > 0 && cur.floorBreaches) ? cur.floorBreaches.length : 0;
        if (cur.survived && breachCount > 0) {
            const frac = breachCount / years;
            if (frac >= 0.2) { st.label = 'High Risk'; st.tone = 'bad'; }
            else if (st.tone === 'good') { st.label = 'Moderate Risk'; st.tone = 'warn'; }
        }

        el.textSummaryPanel.className = `summary-panel tone-${st.tone}`;

        const isSmooth = focusKey === 'historical_average';
        const smoothEnd = base.endVal;
        const smoothSurvived = base.survived;
        const avgLabel = fmtPct(inputs.avgPct);

        function vsSmooth() {
            if (isSmooth) return '';
            if (cur.survived) {
                if (smoothSurvived && smoothEnd > cur.endVal) {
                    return ` For the same ${avgLabel} average, the smooth line ends at ${fmtCompact(smoothEnd)} while this path ends at ${fmtCompact(cur.endVal)}, a gap of ${fmtCompact(smoothEnd - cur.endVal)} created purely by the order the returns arrived in.`;
                }
                return ` This path happened to get lucky with its timing and ended ahead of the smooth ${avgLabel} line, which shows the flip side: sequence risk cuts both ways.`;
            }
            if (smoothSurvived) {
                return ` Meanwhile the smooth line with the identical ${avgLabel} average survives comfortably. Same average, completely different outcome. That is sequence risk.`;
            }
            return ` The smooth same-average line also runs out, in Year ${base.failYear}, so this withdrawal rate is too high even in a straight line. Real volatility just makes the end arrive sooner and harder.`;
        }

        let desc;
        if (isSmooth) {
            desc = cur.survived
                ? `This is the straight-line fantasy: the exact same ${avgLabel} return every single year. Real markets never move like this, which is why it looks so safe. Toggle on <strong>Realistic</strong> or a crash scenario to see what actually threatens this plan.`
                : `Even on a perfectly smooth ${avgLabel} every year, this plan runs out in Year ${cur.failYear}. The withdrawal rate is simply too high, before we have even added any real-world volatility.`;
        } else if (cur.survived) {
            if (st.tone === 'warn') desc = `This scenario survived the ${years}-year period, but it got uncomfortably low (${fmtCompact(cur.minVal)}). A slightly worse sequence could have emptied it.` + vsSmooth();
            else if (st.tone === 'bad') desc = `This scenario barely survived the ${years}-year period, dropping to ${fmtCompact(cur.minVal)}. This is highly risky.` + vsSmooth();
            else desc = `This scenario survived the ${years}-year period.` + vsSmooth();
        } else {
            desc = `This scenario ran out in Year ${cur.failYear}, forced to sell during down years just to keep withdrawing. Once the balance hits zero there is no recovery, even if the market later bounces back.` + vsSmooth();
        }

        if (inputs.isGuardrails && inputs.minFloor > 0 && cur.floorBreaches && cur.floorBreaches.length > 0) {
            desc += `<br><br><span style="color: #ef4444;"><strong>Heads up:</strong> The guardrails wanted to cut your spending below your ${fmtMoney(inputs.minFloor)} floor (today's money) in ${cur.floorBreaches.length} years. Because the floor held, you kept spending the minimum, which drained the portfolio faster${cur.survived ? '' : ' and is what ran it out'}.</span>`;
        }

        const peakVal = Math.max(...cur.vals);
        const peakYear = cur.vals.indexOf(peakVal);

        el.textSummaryPanel.innerHTML = `
            <h3 class="summary-title"><span class="summary-dot" style="background:${SCENARIO_COLORS[focusKey]}"></span>${SCENARIO_LABELS[focusKey]} — Outcome: ${st.label}</h3>
            <p class="summary-desc">${desc}</p>
            <div class="summary-stats">
                <div class="stat-box"><span class="stat-label">Starting Value</span><span class="stat-value">${fmtCompact(inputs.startVal)}</span></div>
                <div class="stat-box"><span class="stat-label">Final Value (Yr ${years})</span><span class="stat-value">${fmtCompact(cur.endVal)}</span></div>
                <div class="stat-box"><span class="stat-label">Peak Value (Yr ${peakYear})</span><span class="stat-value">${fmtCompact(peakVal)}</span></div>
                <div class="stat-box"><span class="stat-label">Lowest Point</span><span class="stat-value">${fmtCompact(cur.minVal)}</span></div>
            </div>`;

        renderSequenceTable(inputs, cur);
    }

    // ── Sequence table (focused scenario) ──
    const colVisibility = { 'inflation-target': true, 'next-year-budget': true };

    function applyColVisibility() {
        const table = byId('sequenceTable');
        if (!table) return;
        ['inflation-target', 'next-year-budget'].forEach(col => {
            table.querySelectorAll(`[data-col="${col}"]`).forEach(c => { c.style.display = colVisibility[col] ? '' : 'none'; });
        });
    }

    function renderSequenceTable(inputs, result) {
        clear(el.sequenceTableHead);
        clear(el.sequenceTableBody);
        if (el.sequenceTableHeading) el.sequenceTableHeading.textContent = `${SCENARIO_LABELS[focusKey]} — year by year`;

        const headTr = document.createElement('tr');
        const coreCols = [
            { label: 'Year', col: null },
            { label: 'Portfolio Value', col: null },
            { label: 'Withdrawal', col: null },
            { label: 'Inflation Target', col: 'inflation-target' },
            { label: 'Market Return', col: null },
        ];
        const guardrailCols = inputs.isGuardrails ? [
            { label: 'Guardrail Rule', col: null },
            { label: 'Next Year Budget', col: 'next-year-budget' },
        ] : [];
        [...coreCols, ...guardrailCols].forEach(({ label, col }) => {
            const th = document.createElement('th');
            th.textContent = label;
            if (col) th.setAttribute('data-col', col);
            headTr.appendChild(th);
        });
        el.sequenceTableHead.appendChild(headTr);

        const rows = result.rows;
        const floorBreaches = result.floorBreaches || [];

        for (let y = 0; y < rows.length; y++) {
            const r = rows[y];
            const tr = document.createElement('tr');
            const isBreach = inputs.isGuardrails && inputs.minFloor > 0 && floorBreaches.includes(r.year);
            if (isBreach) { tr.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; tr.title = 'Spending was held at your minimum floor — the guardrails wanted to cut deeper (inflation adjusted)'; }

            const tdY = document.createElement('td'); tdY.textContent = r.year; tdY.className = 'year-col'; tr.appendChild(tdY);

            const tdEP = document.createElement('td');
            tdEP.textContent = fmtMoney(r.endPort);
            if (r.endPort < inputs.startVal * 0.5) tdEP.style.color = '#ef4444';
            else if (r.endPort > inputs.startVal) tdEP.style.color = '#4ade80';
            tr.appendChild(tdEP);

            const tdW = document.createElement('td');
            tdW.textContent = fmtMoney(r.withdrawal);
            if (isBreach) { tdW.style.color = '#ef4444'; tdW.style.fontWeight = '700'; }
            tr.appendChild(tdW);

            const inflationTarget = inputs.initialWithdrawal * Math.pow(1 + inputs.inflPct / 100, r.year - 1);
            const tdIT = document.createElement('td');
            tdIT.textContent = fmtMoney(inflationTarget);
            tdIT.style.color = 'var(--text-muted)';
            tdIT.style.fontStyle = 'italic';
            tdIT.setAttribute('data-col', 'inflation-target');
            tr.appendChild(tdIT);

            const tdRet = document.createElement('td');
            tdRet.textContent = fmtSignedPct(r.returnPct);
            tdRet.className = r.returnPct >= 0 ? 'return-pos' : 'return-neg';
            tr.appendChild(tdRet);

            if (inputs.isGuardrails) {
                const tdTrig = document.createElement('td');
                tdTrig.textContent = r.trigger;
                if (r.trigger.includes('Cut')) tdTrig.className = 'return-neg';
                else if (r.trigger.includes('Raise')) tdTrig.className = 'return-pos';
                else tdTrig.style.color = 'var(--text-muted)';
                tr.appendChild(tdTrig);

                const tdNW = document.createElement('td');
                tdNW.textContent = r.nextW > 0 ? fmtMoney(r.nextW) : '—';
                tdNW.setAttribute('data-col', 'next-year-budget');
                tr.appendChild(tdNW);
            }
            el.sequenceTableBody.appendChild(tr);
        }
        applyColVisibility();

        if (el.sequenceNote) {
            const stratStr = inputs.isGuardrails ? 'Guardrails (Guyton-Klinger)' : 'Constant Purchasing Power';
            el.sequenceNote.textContent = `Strategy: ${stratStr}. Year 1 withdrawal: ${fmtMoney(inputs.initialWithdrawal)}. Inflation Target shows what the same lifestyle costs each year.`;
        }
    }

    // ── Chart (multi-line overlay, focused line emphasised) ──
    function drawChart() {
        const canvas = el.portfolioLineChart;
        if (!canvas || !state.scenarios) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(320, Math.floor(rect.width)), h = Math.max(240, Math.floor(rect.height));
        canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const years = state.inputs.years;
        const activeKeys = [...activeSet];
        const pad = { l: 62, r: 14, t: 14, b: 34 };
        const pW = w - pad.l - pad.r, pH = h - pad.t - pad.b;
        let allV = [1];
        activeKeys.forEach(k => { allV = allV.concat(state.scenarios[k].result.vals); });
        const yMax = Math.max(...allV) * 1.08;
        const xPx = x => pad.l + (x / years) * pW;
        const yPx = y => pad.t + pH - (y / yMax) * pH;

        ctx.clearRect(0, 0, w, h);
        const cs = getComputedStyle(document.documentElement);
        ctx.fillStyle = cs.getPropertyValue('--card-background').trim() || '#fff';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(148,163,184,0.22)'; ctx.lineWidth = 1;
        ctx.font = '12px Manrope,system-ui,sans-serif';
        ctx.fillStyle = cs.getPropertyValue('--text-muted').trim() || '#94a3b8';
        for (let i = 0; i <= 5; i++) {
            const y = yMax * i / 5, py = yPx(y);
            ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(w - pad.r, py); ctx.stroke();
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(fmtCompact(y), pad.l - 10, py);
        }
        const xN = Math.min(10, years);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let i = 0; i <= xN; i++) {
            const yr = Math.round(i / xN * years);
            ctx.fillText(`Yr ${yr}`, xPx(yr), h - pad.b + 10);
        }
        ctx.strokeStyle = 'rgba(148,163,184,0.35)';
        ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();

        // Non-focused lines first, focused on top.
        const drawOrder = activeKeys.filter(k => k !== focusKey).concat(activeSet.has(focusKey) ? [focusKey] : []);
        for (const k of drawOrder) {
            const vals = state.scenarios[k].result.vals;
            ctx.strokeStyle = SCENARIO_COLORS[k];
            ctx.lineWidth = k === focusKey ? 3.5 : 2;
            ctx.globalAlpha = k === focusKey ? 1 : 0.7;
            ctx.beginPath();
            vals.forEach((v, x) => { const px = xPx(x), py = yPx(v); x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Editable points on the focused line only.
        state.chartCoords = [];
        if (activeSet.has(focusKey)) {
            const vals = state.scenarios[focusKey].result.vals;
            ctx.fillStyle = SCENARIO_COLORS[focusKey];
            vals.forEach((v, x) => {
                if (x > 0) {
                    const px = xPx(x), py = yPx(v);
                    state.chartCoords.push({ x: x - 1, px, py, year: x, val: v });
                    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, 2 * Math.PI); ctx.fill();
                }
            });
        }
    }

    // ── Interaction ──
    function updateWR() {
        const s = safeNum(el.startingPortfolio.value, 1000000), w = safeNum(el.annualWithdrawal.value, 40000);
        const rate = s > 0 ? w / s * 100 : 0;
        if (el.withdrawalRateText) el.withdrawalRateText.textContent = fmtPct(rate);
    }

    ['startingPortfolio', 'annualWithdrawal', 'inflationRate', 'avgReturn', 'retirementYears', 'useGuardrails', 'guardrailsFloor'].forEach(id => {
        const e = byId(id); if (e) e.addEventListener('input', updateWR);
    });

    if (el.useGuardrails && el.guardrailsFloorContainer) {
        el.useGuardrails.addEventListener('change', () => {
            el.guardrailsFloorContainer.style.display = el.useGuardrails.checked ? 'block' : 'none';
            if (el.useGuardrails.checked && el.guardrailsFloor) {
                el.guardrailsFloor.value = Math.round(safeNum(el.annualWithdrawal.value, 40000));
            }
        });
    }

    if (el.runButton) {
        el.runButton.addEventListener('click', () => {
            if (isCalculating) return;
            isCalculating = true;
            el.runButton.classList.add('loading');
            el.runButton.disabled = true;
            if (el.runButtonText) el.runButtonText.style.opacity = '0';
            if (el.runButtonLoader) el.runButtonLoader.style.display = 'block';

            const delay = Math.floor(Math.random() * 1200) + 900;
            setTimeout(() => {
                compute();
                render();
                isCalculating = false;
                el.runButton.classList.remove('loading');
                el.runButton.disabled = false;
                if (el.runButtonText) el.runButtonText.style.opacity = '1';
                if (el.runButtonLoader) el.runButtonLoader.style.display = 'none';
                if (el.resultsContainer) el.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, delay);
        });
    }

    if (el.openModal) el.openModal.addEventListener('click', () => el.infoModal.style.display = 'flex');
    if (el.closeModal) el.closeModal.addEventListener('click', () => el.infoModal.style.display = 'none');
    if (el.infoModal) el.infoModal.addEventListener('click', (e) => { if (e.target === el.infoModal) el.infoModal.style.display = 'none'; });
    if (el.openGuardrailsModal) el.openGuardrailsModal.addEventListener('click', (e) => { e.preventDefault(); el.guardrailsModal.style.display = 'flex'; });
    if (el.closeGuardrailsModal) el.closeGuardrailsModal.addEventListener('click', () => el.guardrailsModal.style.display = 'none');
    if (el.guardrailsModal) el.guardrailsModal.addEventListener('click', (e) => { if (e.target === el.guardrailsModal) el.guardrailsModal.style.display = 'none'; });

    const chartHoverTooltip = byId('chartHoverTooltip');

    if (el.portfolioLineChart) {
        el.portfolioLineChart.addEventListener('mousemove', (e) => {
            if (!state.scenarios || !activeSet.has(focusKey) || (el.chartPopup && el.chartPopup.style.display === 'block')) return;
            const rect = el.portfolioLineChart.getBoundingClientRect();
            const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
            let closest = null, minDist = Infinity;
            state.chartCoords.forEach(coord => { const d = Math.hypot(coord.px - mouseX, coord.py - mouseY); if (d < minDist && d < 15) { minDist = d; closest = coord; } });
            if (closest) {
                el.portfolioLineChart.style.cursor = 'pointer';
                const retPct = state.scenarios[focusKey].data[closest.x];
                const wTaken = state.scenarios[focusKey].result.withdrawals[closest.x];
                if (chartHoverTooltip) {
                    chartHoverTooltip.innerHTML = `${SCENARIO_LABELS[focusKey]} · Year ${closest.year}: <strong>${fmtSignedPct(retPct)}</strong><br><span style="font-size:0.8rem;color:#ccc;">Withdrawal: ${fmtCompact(wTaken)}</span><br><span style="margin-top:4px;">Click to edit</span>`;
                    chartHoverTooltip.style.left = `${closest.px}px`;
                    chartHoverTooltip.style.top = `${closest.py}px`;
                    chartHoverTooltip.style.transform = closest.py < 60 ? 'translate(-50%, 15px)' : 'translate(-50%, -120%)';
                    chartHoverTooltip.style.display = 'block';
                }
            } else {
                el.portfolioLineChart.style.cursor = 'default';
                if (chartHoverTooltip) chartHoverTooltip.style.display = 'none';
            }
        });

        el.portfolioLineChart.addEventListener('mouseleave', () => { if (chartHoverTooltip) chartHoverTooltip.style.display = 'none'; });

        el.portfolioLineChart.addEventListener('click', (e) => {
            if (!state.scenarios || !activeSet.has(focusKey)) return;
            const rect = el.portfolioLineChart.getBoundingClientRect();
            const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
            let closest = null, minDist = Infinity;
            state.chartCoords.forEach(coord => { const d = Math.hypot(coord.px - mouseX, coord.py - mouseY); if (d < minDist && d < 30) { minDist = d; closest = coord; } });
            if (closest) {
                if (chartHoverTooltip) chartHoverTooltip.style.display = 'none';
                state.activePopupYear = closest.x;
                if (el.popupYear) el.popupYear.textContent = closest.year;
                if (el.popupReturn) el.popupReturn.value = state.scenarios[focusKey].data[closest.x].toFixed(1);
                const currentW = state.scenarios[focusKey].result.withdrawals[closest.x];
                if (el.popupWithdrawal) el.popupWithdrawal.value = Math.round(currentW);
                if (el.chartPopup) {
                    el.chartPopup.style.left = `${closest.px}px`;
                    el.chartPopup.style.top = `${closest.py}px`;
                    el.chartPopup.style.transform = closest.py < 160 ? 'translate(-50%, 15px)' : 'translate(-50%, -110%)';
                    el.chartPopup.style.display = 'block';
                }
                if (el.popupReturn) el.popupReturn.focus();
            } else if (el.chartPopup) {
                el.chartPopup.style.display = 'none';
            }
        });
    }

    if (el.popupSave) {
        el.popupSave.addEventListener('click', () => {
            if (state.activePopupYear !== null && activeSet.has(focusKey)) {
                const newRet = parseFloat(el.popupReturn.value);
                const newW = parseFloat(el.popupWithdrawal.value);
                const sc = state.scenarios[focusKey];
                if (!isNaN(newRet)) sc.data[state.activePopupYear] = newRet;
                if (!isNaN(newW)) sc.withdrawals[state.activePopupYear] = newW;
                sc.edited = true;
                sc.result = simForScenario(sc.data, sc.withdrawals);
                render();
            }
            if (el.chartPopup) el.chartPopup.style.display = 'none';
        });
    }

    if (el.presetInjectBtns) {
        el.presetInjectBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (state.activePopupYear !== null && activeSet.has(focusKey)) {
                    const presetData = PRESETS[btn.getAttribute('data-inject')]?.data;
                    if (presetData && presetData.length > 0) {
                        const sc = state.scenarios[focusKey];
                        const startYear = state.activePopupYear;
                        for (let i = 0; i < presetData.length; i++) {
                            if (startYear + i < state.inputs.years) sc.data[startYear + i] = presetData[i];
                        }
                        sc.edited = true;
                        sc.result = simForScenario(sc.data, sc.withdrawals);
                        render();
                    }
                }
                if (el.chartPopup) el.chartPopup.style.display = 'none';
            });
        });
    }

    if (el.popupCancel) el.popupCancel.addEventListener('click', () => { if (el.chartPopup) el.chartPopup.style.display = 'none'; });

    document.addEventListener('click', (e) => {
        if (el.chartPopup && el.chartPopup.style.display === 'block' && el.portfolioLineChart && !el.portfolioLineChart.contains(e.target) && !el.chartPopup.contains(e.target)) {
            el.chartPopup.style.display = 'none';
        }
    });

    if (el.toggleInflTarget) el.toggleInflTarget.addEventListener('click', () => {
        colVisibility['inflation-target'] = !colVisibility['inflation-target'];
        el.toggleInflTarget.classList.toggle('active', colVisibility['inflation-target']);
        applyColVisibility();
    });
    if (el.toggleNextYear) el.toggleNextYear.addEventListener('click', () => {
        colVisibility['next-year-budget'] = !colVisibility['next-year-budget'];
        el.toggleNextYear.classList.toggle('active', colVisibility['next-year-budget']);
        applyColVisibility();
    });

    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => { if (state.scenarios) drawChart(); });
        if (el.portfolioLineChart?.parentElement) ro.observe(el.portfolioLineChart.parentElement);
    }

    // ── CSV download (free, no email gate) — exports the focused scenario ──
    const openDlBtn = byId('openDownloadModal');

    function buildCSV() {
        if (!state.scenarios || !activeSet.has(focusKey)) return '';
        const inputs = state.inputs;
        const result = state.scenarios[focusKey].result;
        const isGuardrails = inputs.isGuardrails;
        const rows = result.rows;
        const cur = symChar();
        const headers = isGuardrails
            ? ['Year', `Start Portfolio (${cur})`, 'Withdrawal Rate (%)', `Withdrawal (${cur})`, 'Return (%)', `End Portfolio (${cur})`, 'End WR (%)', 'Guardrail Trigger', `Next Year Withdrawal (${cur})`]
            : ['Year', `Start Portfolio (${cur})`, 'Withdrawal Rate (%)', `Withdrawal (${cur})`, 'Return (%)', `End Portfolio (${cur})`];
        const lines = [headers.join(',')];
        for (const r of rows) {
            const base = [r.year, r.startPort.toFixed(0), (r.startWR * 100).toFixed(2), r.withdrawal.toFixed(0), r.returnPct.toFixed(2), r.endPort.toFixed(0)];
            if (isGuardrails) base.push((r.endWR * 100).toFixed(2), `"${r.trigger}"`, r.nextW > 0 ? r.nextW.toFixed(0) : '-');
            lines.push(base.join(','));
        }
        lines.push('');
        lines.push(`"Generated by But First Fire — butfirstfire.com"`);
        lines.push(`"Scenario: ${SCENARIO_LABELS[focusKey]} | ${inputs.years}-year retirement | Starting portfolio: ${fmtMoney(inputs.startVal)} | Initial withdrawal: ${fmtMoney(inputs.initialWithdrawal)} | Inflation: ${inputs.inflPct}% | Avg return: ${inputs.avgPct}%"`);
        lines.push(`"Strategy: ${isGuardrails ? 'Guardrails (Guyton-Klinger)' : 'Constant Purchasing Power'}"`);
        return lines.join('\n');
    }

    function triggerCSVDownload() {
        const csv = buildCSV();
        if (!csv) return;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `butfirstfire-${focusKey}-plan.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    if (openDlBtn) openDlBtn.addEventListener('click', () => { if (state.scenarios) triggerCSVDownload(); });

    // ── Currency toggle wiring ──
    function updateCurrencySymbols() {
        document.querySelectorAll('.currency-symbol').forEach(s => { s.textContent = symChar(); });
        if (el.popupWithdrawalLabel) el.popupWithdrawalLabel.textContent = `Withdrawal (${symChar()})`;
    }

    function setCurrency(newCur) {
        if (newCur === currency) return;
        const factor = newCur === 'INR' ? INR_PER_USD : (1 / INR_PER_USD);
        ['startingPortfolio', 'annualWithdrawal', 'guardrailsFloor'].forEach(id => {
            const e = byId(id);
            if (e && e.value !== '') e.value = Math.round(safeNum(e.value, 0) * factor);
        });
        currency = newCur;
        if (el.curBtns) el.curBtns.forEach(b => { const on = b.dataset.cur === newCur; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
        updateCurrencySymbols();
        updateWR();
        if (state.scenarios) { compute(); render(); } // money overrides were in the old currency — recompute fresh
    }

    if (el.curBtns) el.curBtns.forEach(b => b.addEventListener('click', () => setCurrency(b.dataset.cur)));

    updateCurrencySymbols();
    updateWR();
})();
