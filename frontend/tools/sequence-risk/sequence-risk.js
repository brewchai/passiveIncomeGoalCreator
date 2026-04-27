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
        lineLegend: byId('lineLegend'),
        sequenceTableHead: byId('sequenceTableHead'),
        sequenceTableBody: byId('sequenceTableBody'),
        sequenceNote: byId('sequenceNote'),
        infoModal: byId('infoModal'),
        openModal: byId('openModal'),
        closeModal: byId('closeModal'),
        guardrailsModal: byId('guardrailsModal'),
        openGuardrailsModal: byId('openGuardrailsModal'),
        closeGuardrailsModal: byId('closeGuardrailsModal'),
        presetBtns: document.querySelectorAll('.preset-btn'),
        scenarioPreview: byId('scenarioPreview'),
        previewTitle: byId('previewTitle'),
        previewDesc: byId('previewDesc'),
        previewYears: byId('previewYears'),
        textSummaryPanel: byId('textSummaryPanel'),
        chartHeading: byId('chartHeading'),
        chartSubHeading: byId('chartSubHeading'),
        chartPopup: byId('chartPopup'),
        popupYear: byId('popupYear'),
        popupReturn: byId('popupReturn'),
        popupWithdrawal: byId('popupWithdrawal'),
        popupSave: byId('popupSave'),
        popupCancel: byId('popupCancel')
    };

    // ── Data Models ──
    const PRESETS = {
        great_depression: {
            name: 'Great Depression (1929)',
            desc: 'The worst economic downturn in modern history. Shows the impact of a massive, prolonged crash right at retirement. (Full 30-year actuals)',
            data: [-8.42, -24.90, -43.34, -8.19, 53.99, -1.44, 47.67, 33.92, -35.03, 31.12, -0.41, -9.78, -11.59, 20.34, 25.90, 19.75, 36.44, -8.07, 5.71, 5.50, 18.79, 31.71, 24.02, 18.37, -0.99, 52.62, 31.56, 6.56, -10.78, 43.36]
        },
        dot_com: {
            name: 'Dot-Com Crash (2000)',
            desc: 'The burst of the tech bubble. Three consecutive years of heavy losses. (Actual returns 2000-2023, remaining years padded with average)',
            data: [-9.10, -11.89, -22.10, 28.68, 10.88, 4.91, 15.79, 5.49, -37.00, 26.46, 15.06, 2.11, 16.00, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.40, 28.71, -18.11, 26.29]
        },
        gfc: {
            name: '2008 Financial Crisis',
            desc: 'The housing market collapse. A massive single-year drop followed by a volatile recovery. (Actual returns 2007-2023, padded)',
            data: [5.49, -37.00, 26.46, 15.06, 2.11, 16.00, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.40, 28.71, -18.11, 26.29]
        },
        bull_run: {
            name: 'The 2010s Bull Run',
            desc: 'A decade of mostly uninterrupted growth. A best-case scenario for retiring. (Actual returns 2010-2023, padded)',
            data: [15.06, 2.11, 16.00, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.40, 28.71, -18.11, 26.29]
        },
        historical_average: {
            name: 'Historical Average',
            desc: 'A perfectly smooth, constant average return every year. (Not realistic in practice, but good for a baseline comparison)',
            data: [] // Computed dynamically based on Expected Return input
        }
    };

    let activePreset = 'historical_average';
    let currentCustomData = null; // Holds the currently active sequence data
    let currentCustomWithdrawals = []; // Holds manually overridden withdrawals
    let isCalculating = false;
    const state = { lastResults: null, chartCoords: [], activePopupYear: null };

    // ── Utilities ──
    function safeNum(v, fb) { const n = Number(v); return Number.isFinite(n) ? n : fb; }
    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
    function fmtMoney(v) { return Math.max(0, v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
    function fmtCompact(v) {
        v = Math.max(0, v);
        if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
        if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
        if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`;
        return fmtMoney(v);
    }
    function fmtPct(v, d = 1) { return `${(Number.isFinite(+v) ? (+v).toFixed(d) : '0')}%`; }
    function fmtSignedPct(v, d = 1) { const n = +v; return `${n > 0 ? '+' : ''}${Number.isFinite(n) ? n.toFixed(d) : '0'}%`; }
    function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }

    // ── Scenario generation ──
    function buildSequence(presetId, avgPct, years) {
        if (presetId === 'custom' && currentCustomData) {
            const d = [...currentCustomData];
            while (d.length < years) d.push(avgPct);
            return d.slice(0, years);
        }
        const preset = PRESETS[presetId];
        const data = preset.data.slice(0, years);
        const rem = years - data.length;
        if (rem > 0) {
            return data.concat(Array.from({ length: rem }, () => avgPct));
        }
        return data.slice(0, years);
    }

    // ── Simulation ──
    function simulate({ portfolio: startVal, initialWithdrawal, inflPct, returnsPct, isGuardrails, customWithdrawals }) {
        const years = returnsPct.length;
        const infl = inflPct / 100;
        let port = startVal;
        let w = initialWithdrawal;
        let minVal = startVal;
        const initialRate = startVal > 0 ? initialWithdrawal / startVal : 0;
        
        const vals = [startVal];
        const withdrawals = []; // Array of actual withdrawals taken

        for (let y = 1; y <= years; y++) {
            let thisYearW = w;

            // 1. Determine this year's withdrawal
            if (customWithdrawals && customWithdrawals[y - 1] !== undefined && customWithdrawals[y - 1] !== null) {
                // Manual override by user
                thisYearW = customWithdrawals[y - 1];
                w = thisYearW; // Reset baseline for future years!
            } else if (isGuardrails && y > 1) {
                // Apply Guardrails rules
                const currentRate = port > 0 ? w / port : 0;
                const prevReturn = returnsPct[y - 2];
                
                if (currentRate > initialRate * 1.2) {
                    thisYearW = w * 0.9; // 10% Pay Cut
                } else if (currentRate < initialRate * 0.8) {
                    thisYearW = w * 1.1; // 10% Pay Raise
                } else if (prevReturn < 0) {
                    thisYearW = w; // No inflation increase
                } else {
                    thisYearW = w * (1 + infl);
                }
                w = thisYearW;
            } else if (y > 1) {
                // Standard constant inflation
                thisYearW = w * (1 + infl);
                w = thisYearW;
            }

            withdrawals.push(thisYearW);

            if (port < thisYearW) {
                vals.push(0);
                for (let i = vals.length; i <= years; i++) {
                    vals.push(0);
                    if(withdrawals.length < years) withdrawals.push(0);
                }
                return { survived: false, failYear: y, endVal: 0, minVal: 0, vals, withdrawals };
            }

            port -= thisYearW;
            minVal = Math.min(minVal, port);
            port *= (1 + returnsPct[y - 1] / 100);
            minVal = Math.min(minVal, port);
            vals.push(port);
        }
        return { survived: true, failYear: null, endVal: port, minVal, vals, withdrawals };
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
        return { label: 'High Risk', tone: 'bad' }; // Survives but barely
    }

    // ── Compute ──
    function compute() {
        const startVal = Math.max(0, safeNum(el.startingPortfolio.value, 1000000));
        const initialWithdrawal = Math.max(0, safeNum(el.annualWithdrawal.value, 50000));
        const inflPct = clamp(safeNum(el.inflationRate.value, 2.5), 0, 30);
        const avgPct = clamp(safeNum(el.avgReturn.value, 7.0), -20, 30);
        const years = clamp(Math.floor(safeNum(el.retirementYears.value, 30)), 1, 80);
        const isGuardrails = el.useGuardrails ? el.useGuardrails.checked : false;

        currentCustomData = buildSequence(activePreset, avgPct, years);
        
        if (currentCustomWithdrawals.length !== years) {
            const oldW = [...currentCustomWithdrawals];
            currentCustomWithdrawals = new Array(years).fill(null);
            for(let i=0; i<Math.min(years, oldW.length); i++) currentCustomWithdrawals[i] = oldW[i];
        }

        const baselineData = buildSequence('historical_average', avgPct, years);

        const currentResult = simulate({ 
            portfolio: startVal, 
            initialWithdrawal, 
            inflPct, 
            returnsPct: currentCustomData,
            isGuardrails,
            customWithdrawals: currentCustomWithdrawals
        });
        
        const baselineResult = simulate({ 
            portfolio: startVal, 
            initialWithdrawal, 
            inflPct, 
            returnsPct: baselineData,
            isGuardrails: false, // Baseline always uses constant inflation
            customWithdrawals: []
        });

        const finalWithdrawal = initialWithdrawal * Math.pow(1 + inflPct / 100, years - 1);
        
        state.lastResults = { 
            inputs: { startVal, initialWithdrawal, inflPct, avgPct, years, finalWithdrawal, isGuardrails }, 
            currentResult, 
            baselineResult,
            currentData: currentCustomData,
            baselineData
        };
    }

    // ── Render ──
    function render() {
        if (!state.lastResults) return;
        const { inputs, currentResult, baselineResult, currentData, baselineData } = state.lastResults;
        const { startVal, initialWithdrawal, inflPct, avgPct, years, finalWithdrawal, isGuardrails } = inputs;
        
        el.resultsContainer.style.display = 'block';

        const st = classify({ survived: currentResult.survived, failYear: currentResult.failYear, years, startVal, endVal: currentResult.endVal, minVal: currentResult.minVal });
        
        el.textSummaryPanel.className = `summary-panel tone-${st.tone}`;
        
        let desc = '';
        if (currentResult.survived) {
            desc = `Your portfolio successfully survived the ${years}-year period. Despite market fluctuations, your withdrawal rate allows for sustainable long-term growth.`;
            if (st.tone === 'warn') {
                desc = `Your portfolio survived the ${years}-year period, but it got uncomfortably low (${fmtCompact(currentResult.minVal)}). A slightly worse sequence could have caused it to deplete.`;
            } else if (st.tone === 'bad') {
                desc = `Your portfolio barely survived the ${years}-year period, dropping to ${fmtCompact(currentResult.minVal)}. This is highly risky.`;
            }
        } else {
            desc = `Your portfolio depleted in Year ${currentResult.failYear} due to negative returns combined with ongoing withdrawals. Once the balance hits zero, there is no way to recover even if the market bounces back.`;
        }

        const peakVal = Math.max(...currentResult.vals);
        const peakYear = currentResult.vals.indexOf(peakVal);

        el.textSummaryPanel.innerHTML = `
            <h3 class="summary-title">Outcome: ${st.label}</h3>
            <p class="summary-desc">${desc}</p>
            <div class="summary-stats">
                <div class="stat-box">
                    <span class="stat-label">Starting Value</span>
                    <span class="stat-value">${fmtCompact(startVal)}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Final Value (Yr ${years})</span>
                    <span class="stat-value">${fmtCompact(currentResult.endVal)}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Peak Value (Yr ${peakYear})</span>
                    <span class="stat-value">${fmtCompact(peakVal)}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Lowest Point</span>
                    <span class="stat-value">${fmtCompact(currentResult.minVal)}</span>
                </div>
            </div>
        `;

        if (el.chartSubHeading) {
            el.chartSubHeading.textContent = activePreset === 'custom' ? 'Projected Scenario: Custom' : `Projected Scenario: ${PRESETS[activePreset].name}`;
        }

        const series = [
            { id: 'baseline', label: 'Constant Average', color: '#F59E0B', values: baselineResult.vals },
            { id: 'current', label: activePreset === 'custom' ? 'Custom Scenario' : PRESETS[activePreset].name, color: '#A855F7', values: currentResult.vals }
        ];
        drawLineChart(el.portfolioLineChart, series, years, fmtCompact);
        renderLegend(series);

        renderSequenceTable(currentData, currentResult.withdrawals, years, inputs);
    }

    // ── Sequence table ──
    function renderSequenceTable(currentData, withdrawals, years, inputs) {
        clear(el.sequenceTableHead);
        clear(el.sequenceTableBody);

        // Header
        const headTr = document.createElement('tr');
        ['Year', 'Return', 'Rate', 'Withdrawal'].forEach(t => {
            const th = document.createElement('th');
            th.textContent = t;
            headTr.appendChild(th);
        });
        el.sequenceTableHead.appendChild(headTr);

        const resultVals = state.lastResults.currentResult.vals;

        for (let y = 0; y < years; y++) {
            const tr = document.createElement('tr');
            
            // Year
            const tdY = document.createElement('td'); tdY.textContent = y + 1; tdY.className = 'year-col'; tr.appendChild(tdY);
            
            // Return
            const tdC = document.createElement('td');
            tdC.textContent = fmtSignedPct(currentData[y]);
            tdC.className = currentData[y] >= 0 ? 'return-pos' : 'return-neg';
            tr.appendChild(tdC);

            // Withdrawal Rate
            const balAtStart = resultVals[y];
            const wRate = balAtStart > 0 ? (withdrawals[y] / balAtStart) * 100 : 0;
            const tdR = document.createElement('td');
            tdR.textContent = fmtPct(wRate);
            tr.appendChild(tdR);

            // Withdrawal Amount
            const tdW = document.createElement('td');
            tdW.textContent = fmtMoney(withdrawals[y]);
            tr.appendChild(tdW);

            el.sequenceTableBody.appendChild(tr);
        }

        if (el.sequenceNote) {
            const stratStr = inputs.isGuardrails ? "Guardrails (Guyton-Klinger) strategy" : "Constant Purchasing Power strategy";
            el.sequenceNote.textContent = `Using ${stratStr}. Withdrawals start at ${fmtMoney(inputs.initialWithdrawal)}.`;
        }
    }

    // ── Chart ──
    function drawLineChart(canvas, seriesList, years, yFmt) {
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(320, Math.floor(rect.width)), h = Math.max(240, Math.floor(rect.height));
        canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const pad = { l: 62, r: 14, t: 14, b: 34 };
        const pW = w - pad.l - pad.r, pH = h - pad.t - pad.b;
        const allV = seriesList.flatMap(s => s.values);
        const yMax = Math.max(1, ...allV) * 1.08;
        const xPx = x => pad.l + (x / years) * pW;
        const yPx = y => pad.t + pH - (y / yMax) * pH;

        ctx.clearRect(0, 0, w, h);
        const cs = getComputedStyle(document.documentElement);
        ctx.fillStyle = cs.getPropertyValue('--card-background').trim() || '#fff';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(148,163,184,0.22)'; ctx.lineWidth = 1;
        ctx.font = '12px Inter,system-ui,sans-serif';
        ctx.fillStyle = cs.getPropertyValue('--text-muted').trim() || '#94a3b8';
        for (let i = 0; i <= 5; i++) {
            const y = yMax * i / 5, py = yPx(y);
            ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(w - pad.r, py); ctx.stroke();
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(yFmt(y), pad.l - 10, py);
        }
        const xN = Math.min(10, years);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let i = 0; i <= xN; i++) {
            const yr = Math.round(i / xN * years);
            ctx.fillText(`Yr ${yr}`, xPx(yr), h - pad.b + 10);
        }
        ctx.strokeStyle = 'rgba(148,163,184,0.35)';
        ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();

        state.chartCoords = [];
        
        for (const s of seriesList) {
            ctx.strokeStyle = s.color; ctx.lineWidth = s.id === 'current' ? 3 : 2; 
            ctx.beginPath();
            s.values.forEach((v, x) => { 
                const px = xPx(x), py = yPx(v); 
                x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); 
            });
            ctx.stroke();
        }

        for (const s of seriesList) {
            if (s.id === 'current') {
                ctx.fillStyle = s.color;
                s.values.forEach((v, x) => {
                    if (x > 0) {
                        const px = xPx(x), py = yPx(v);
                        state.chartCoords.push({ x: x - 1, px, py, year: x, val: v }); 
                        
                        ctx.beginPath();
                        ctx.arc(px, py, 4, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                });
            }
        }
    }

    function renderLegend(series) {
        clear(el.lineLegend);
        for (const s of series) {
            const item = document.createElement('div'); item.className = 'legend-item';
            const dot = document.createElement('span'); dot.className = 'legend-dot'; dot.style.background = s.color;
            const lbl = document.createElement('span'); lbl.textContent = s.label;
            item.append(dot, lbl); el.lineLegend.appendChild(item);
        }
    }

    // ── Interaction ──
    function updateWR() {
        const s = safeNum(el.startingPortfolio.value, 1000000), w = safeNum(el.annualWithdrawal.value, 50000);
        const rate = s > 0 ? w / s * 100 : 0;
        if (el.withdrawalRateText) el.withdrawalRateText.textContent = fmtPct(rate);
    }

    function showPreview(presetId) {
        if (!el.scenarioPreview) return;
        const avgPct = clamp(safeNum(el.avgReturn.value, 7.0), -20, 30);
        
        let p = PRESETS[presetId];
        if (presetId === 'custom') {
            p = { name: 'Custom Scenario', desc: 'Your hand-crafted return sequence.', data: currentCustomData || [] };
        }
        
        let data = p.data.length > 0 ? p.data : Array(5).fill(avgPct);
        const first5 = data.slice(0, 5).map(v => fmtSignedPct(v)).join(', ') + '...';

        if (el.previewTitle) el.previewTitle.textContent = p.name;
        if (el.previewDesc) el.previewDesc.textContent = p.desc;
        if (el.previewYears) el.previewYears.textContent = first5;

        el.scenarioPreview.style.display = 'block';
        if(el.resultsContainer) el.resultsContainer.style.display = 'none';
    }

    ['startingPortfolio', 'annualWithdrawal', 'inflationRate', 'avgReturn', 'retirementYears', 'useGuardrails'].forEach(id => {
        const e = byId(id); if (e) e.addEventListener('input', () => {
            updateWR();
            if (activePreset !== 'custom') {
                showPreview(activePreset);
            }
        });
    });

    if (el.runButton) {
        el.runButton.addEventListener('click', () => {
            if (isCalculating) return;
            isCalculating = true;
            
            el.runButton.classList.add('loading');
            el.runButton.disabled = true;
            if(el.runButtonText) el.runButtonText.style.opacity = '0';
            if(el.runButtonLoader) el.runButtonLoader.style.display = 'block';
            if(el.resultsContainer) el.resultsContainer.style.display = 'none';

            const delay = Math.floor(Math.random() * (7000 - 3000 + 1) + 3000);
            
            setTimeout(() => {
                compute();
                render();
                
                isCalculating = false;
                el.runButton.classList.remove('loading');
                el.runButton.disabled = false;
                if(el.runButtonText) el.runButtonText.style.opacity = '1';
                if(el.runButtonLoader) el.runButtonLoader.style.display = 'none';
                if(el.resultsContainer) el.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, delay);
        });
    }

    el.presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            el.presetBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activePreset = e.target.dataset.preset;
            currentCustomData = null; 
            currentCustomWithdrawals = []; // Reset overrides
            showPreview(activePreset);
        });
    });

    if (el.openModal) el.openModal.addEventListener('click', () => el.infoModal.style.display = 'flex');
    if (el.closeModal) el.closeModal.addEventListener('click', () => el.infoModal.style.display = 'none');
    if (el.infoModal) el.infoModal.addEventListener('click', (e) => { if(e.target === el.infoModal) el.infoModal.style.display = 'none'; });

    if (el.openGuardrailsModal) el.openGuardrailsModal.addEventListener('click', (e) => { e.preventDefault(); el.guardrailsModal.style.display = 'flex'; });
    if (el.closeGuardrailsModal) el.closeGuardrailsModal.addEventListener('click', () => el.guardrailsModal.style.display = 'none');
    if (el.guardrailsModal) el.guardrailsModal.addEventListener('click', (e) => { if(e.target === el.guardrailsModal) el.guardrailsModal.style.display = 'none'; });

    const chartHoverTooltip = byId('chartHoverTooltip');

    if (el.portfolioLineChart) {
        el.portfolioLineChart.addEventListener('mousemove', (e) => {
            if (!state.lastResults || (el.chartPopup && el.chartPopup.style.display === 'block')) return;
            const rect = el.portfolioLineChart.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let closest = null;
            let minDist = Infinity;
            state.chartCoords.forEach(coord => {
                const dist = Math.hypot(coord.px - mouseX, coord.py - mouseY);
                if (dist < minDist && dist < 15) {
                    minDist = dist;
                    closest = coord;
                }
            });

            if (closest) {
                el.portfolioLineChart.style.cursor = 'pointer';
                const retPct = currentCustomData[closest.x];
                const wTaken = state.lastResults.currentResult.withdrawals[closest.x];
                if(chartHoverTooltip) {
                    chartHoverTooltip.innerHTML = `Year ${closest.year}: <strong>${fmtSignedPct(retPct)}</strong><br><span style="font-size:0.8rem;color:#ccc;">Withdrawal: ${fmtCompact(wTaken)}</span><br><span style="margin-top:4px;">Click to edit</span>`;
                    chartHoverTooltip.style.left = `${closest.px}px`;
                    chartHoverTooltip.style.top = `${closest.py}px`;
                    chartHoverTooltip.style.transform = closest.py < 60 ? 'translate(-50%, 15px)' : 'translate(-50%, -120%)';
                    chartHoverTooltip.style.display = 'block';
                }
            } else {
                el.portfolioLineChart.style.cursor = 'default';
                if(chartHoverTooltip) chartHoverTooltip.style.display = 'none';
            }
        });

        el.portfolioLineChart.addEventListener('mouseleave', () => {
            if (chartHoverTooltip) chartHoverTooltip.style.display = 'none';
        });

        el.portfolioLineChart.addEventListener('click', (e) => {
            if (!state.lastResults) return;
            const rect = el.portfolioLineChart.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let closest = null;
            let minDist = Infinity;
            state.chartCoords.forEach(coord => {
                const dist = Math.hypot(coord.px - mouseX, coord.py - mouseY);
                if (dist < minDist && dist < 30) {
                    minDist = dist;
                    closest = coord;
                }
            });

            if (closest) {
                if (chartHoverTooltip) chartHoverTooltip.style.display = 'none';
                state.activePopupYear = closest.x; 
                if(el.popupYear) el.popupYear.textContent = closest.year; 
                if(el.popupReturn) el.popupReturn.value = currentCustomData[closest.x].toFixed(1);
                
                const currentW = state.lastResults.currentResult.withdrawals[closest.x];
                if(el.popupWithdrawal) el.popupWithdrawal.value = Math.round(currentW);
                
                if(el.chartPopup) {
                    el.chartPopup.style.left = `${closest.px}px`;
                    el.chartPopup.style.top = `${closest.py}px`;
                    el.chartPopup.style.transform = closest.py < 160 ? 'translate(-50%, 15px)' : 'translate(-50%, -110%)';
                    el.chartPopup.style.display = 'block';
                }
                if(el.popupReturn) el.popupReturn.focus();
            } else {
                if(el.chartPopup) el.chartPopup.style.display = 'none';
            }
        });
    }

    if (el.popupSave) {
        el.popupSave.addEventListener('click', () => {
            if (state.activePopupYear !== null) {
                const newRet = parseFloat(el.popupReturn.value);
                const newW = parseFloat(el.popupWithdrawal.value);
                
                if (!isNaN(newRet)) currentCustomData[state.activePopupYear] = newRet;
                if (!isNaN(newW)) currentCustomWithdrawals[state.activePopupYear] = newW;
                
                activePreset = 'custom';
                el.presetBtns.forEach(b => b.classList.remove('active'));
                
                compute(); 
                render(); 
            }
            if(el.chartPopup) el.chartPopup.style.display = 'none';
        });
    }

    if (el.popupCancel) {
        el.popupCancel.addEventListener('click', () => {
            if(el.chartPopup) el.chartPopup.style.display = 'none';
        });
    }
    
    document.addEventListener('click', (e) => {
        if (el.chartPopup && el.chartPopup.style.display === 'block' && el.portfolioLineChart && !el.portfolioLineChart.contains(e.target) && !el.chartPopup.contains(e.target)) {
            el.chartPopup.style.display = 'none';
        }
    });

    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => { if (state.lastResults) render(); });
        if (el.portfolioLineChart?.parentElement) ro.observe(el.portfolioLineChart.parentElement);
    }

    updateWR();
    showPreview(activePreset);
})();
