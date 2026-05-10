document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const inputs = {
        balance: document.getElementById('mortgageBalance'),
        rate: document.getElementById('mortgageRate'),
        term: document.getElementById('remainingTerm'),
        extra: document.getElementById('extraCash'),
        market: document.getElementById('marketReturn')
    };

    // Sliders Labels
    const labels = {
        rate: document.getElementById('mortgageRateValue'),
        term: document.getElementById('remainingTermValue'),
        market: document.getElementById('marketReturnValue')
    };

    // Outputs
    const outputs = {
        verdictCard: document.getElementById('verdictCard'),
        verdictHeadline: document.getElementById('verdictHeadlineLabel'),
        verdictDiff: document.getElementById('verdictDifference'),
        verdictDesc: document.getElementById('verdictDesc'),
        
        cardA: document.getElementById('cardPayoff'),
        payoffDateA: document.getElementById('payoffDateA'),
        interestA: document.getElementById('interestPaidA'),
        portfolioA: document.getElementById('finalPortfolioA'),

        cardB: document.getElementById('cardInvest'),
        payoffDateB: document.getElementById('payoffDateB'),
        interestB: document.getElementById('interestPaidB'),
        portfolioB: document.getElementById('finalPortfolioB'),

        timelineA: document.getElementById('timelineBarA'),
        timelineB: document.getElementById('timelineBarB')
    };

    // Update term labels across UI
    const termLabels = document.querySelectorAll('.termLabel');

    // Formatters
    const fmtMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const safeNum = (val, fallback = 0) => { const n = parseFloat(val); return isNaN(n) ? fallback : n; };

    function calculate() {
        const balance = Math.max(0, safeNum(inputs.balance.value));
        const ratePct = Math.max(0, safeNum(inputs.rate.value));
        const termYears = Math.max(1, parseInt(inputs.term.value, 10));
        const extra = Math.max(0, safeNum(inputs.extra.value));
        const marketPct = safeNum(inputs.market.value);

        // Update Slider UI
        labels.rate.textContent = ratePct.toFixed(1);
        labels.term.textContent = termYears;
        labels.market.textContent = marketPct.toFixed(1);
        termLabels.forEach(el => el.textContent = termYears);

        if (balance === 0) return;

        // Core Variables
        const termMonths = termYears * 12;
        const r = (ratePct / 100) / 12; // monthly mortgage rate
        const m = (marketPct / 100) / 12; // monthly market rate

        // Calculate Base Mortgage Payment
        let basePmt = 0;
        if (r > 0) {
            basePmt = balance * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
        } else {
            basePmt = balance / termMonths;
        }

        // -----------------------------------------
        // SCENARIO A: Pay Off Early
        // -----------------------------------------
        let balA = balance;
        let monthsA = 0;
        let interestA = 0;
        const pmtA = basePmt + extra;

        while (balA > 0 && monthsA < termMonths * 2) { // safety limit
            monthsA++;
            let interestThisMonth = balA * r;
            interestA += interestThisMonth;
            
            let principalThisMonth = pmtA - interestThisMonth;
            if (principalThisMonth >= balA) {
                principalThisMonth = balA; // Final payment
            }
            balA -= principalThisMonth;
        }

        // Once paid off, invest the FULL payment amount for the remainder of the term
        const remainingMonthsA = Math.max(0, termMonths - monthsA);
        let portfolioA = 0;
        if (remainingMonthsA > 0) {
            if (m > 0) {
                portfolioA = pmtA * ((Math.pow(1 + m, remainingMonthsA) - 1) / m);
            } else {
                portfolioA = pmtA * remainingMonthsA;
            }
        }

        // -----------------------------------------
        // SCENARIO B: Invest the Extra
        // -----------------------------------------
        const monthsB = termMonths;
        let interestB = (basePmt * termMonths) - balance;
        if (interestB < 0) interestB = 0;

        let portfolioB = 0;
        if (m > 0 && extra > 0) {
            portfolioB = extra * ((Math.pow(1 + m, termMonths) - 1) / m);
        } else if (m === 0 && extra > 0) {
            portfolioB = extra * termMonths;
        }

        // -----------------------------------------
        // Compare & Render
        // -----------------------------------------
        
        // Formats for output
        const fmtYears = (months) => {
            const y = Math.floor(months / 12);
            const mo = months % 12;
            if (y === 0) return `${mo} mo`;
            if (mo === 0) return `${y} yrs`;
            return `${y} yrs, ${mo} mo`;
        };

        outputs.payoffDateA.textContent = fmtYears(monthsA);
        outputs.interestA.textContent = fmtMoney(interestA);
        outputs.portfolioA.textContent = fmtMoney(portfolioA);

        outputs.payoffDateB.textContent = fmtYears(monthsB);
        outputs.interestB.textContent = fmtMoney(interestB);
        outputs.portfolioB.textContent = fmtMoney(portfolioB);

        // Timeline visualization (Width %)
        const pctA = Math.min(100, (monthsA / termMonths) * 100);
        const pctB = 100; // Always 100% of the term
        
        outputs.timelineA.style.width = `${pctA}%`;
        outputs.timelineA.querySelector('span').textContent = `Paid off in ${fmtYears(monthsA)}`;
        outputs.timelineB.style.width = `${pctB}%`;
        outputs.timelineB.querySelector('span').textContent = `Paid off in ${fmtYears(monthsB)}`;

        // Verdict Logic
        const diff = portfolioB - portfolioA;
        outputs.verdictCard.classList.remove('invest-wins', 'payoff-wins', 'tie');
        outputs.cardA.classList.remove('winner');
        outputs.cardB.classList.remove('winner');

        if (diff > 500) {
            // Invest Wins
            outputs.verdictCard.classList.add('invest-wins');
            outputs.cardB.classList.add('winner');
            outputs.verdictHeadline.textContent = "Investing Wins";
            outputs.verdictDiff.textContent = `+${fmtMoney(diff)}`;
            outputs.verdictDesc.innerHTML = `Over ${termYears} years, choosing to invest the extra cash yields <strong>${fmtMoney(diff)}</strong> more in total wealth compared to paying off the house early.`;
        } else if (diff < -500) {
            // Payoff Wins
            const absDiff = Math.abs(diff);
            outputs.verdictCard.classList.add('payoff-wins');
            outputs.cardA.classList.add('winner');
            outputs.verdictHeadline.textContent = "Payoff Wins";
            outputs.verdictDiff.textContent = `+${fmtMoney(absDiff)}`;
            outputs.verdictDesc.innerHTML = `Because your mortgage rate is high, paying off the house is a guaranteed return that beats the market by <strong>${fmtMoney(absDiff)}</strong> over ${termYears} years.`;
        } else {
            // Tie
            outputs.verdictCard.classList.add('tie');
            outputs.verdictHeadline.textContent = "It's a Toss Up";
            outputs.verdictDiff.textContent = `~${fmtMoney(Math.abs(diff))}`;
            outputs.verdictDesc.innerHTML = `The difference is mathematically negligible. Choose whichever path gives you more peace of mind.`;
        }
    }

    // Attach listeners
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', calculate);
        input.addEventListener('change', calculate);
    });

    // Initial Run
    calculate();
});
