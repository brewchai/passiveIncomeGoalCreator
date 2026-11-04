/* The backtest engine. Pure functions over window.BACKTEST_DATA, no DOM, so the same code
   runs in the page and in a Node check. */
(function (root) {
    'use strict';
    const D = root.BACKTEST_DATA;
    const LAST = D.last;

    function yearFraction(year) { return year === LAST ? D.lastYearFraction : 1; }

    // Multiply a sum of money at 1 January `fromYear` by this to state it in today's money.
    function priceMultiple(fromYear) {
        let m = 1;
        for (let y = fromYear; y <= LAST; y++) m *= 1 + (D.cpi[y] / 100) * yearFraction(y);
        return m;
    }

    // One retirement from one start year. On 1 January the retiree takes out a full year of
    // spending and rebalances to the equity share. Equity earns that year's Nifty total return,
    // deposits earn that year's FD rate. Spending rises each year by that year's inflation.
    // With `real` on, FD interest is taxed at the top slab, equity gains are taxed under the rule
    // of that year, and equity pays a fund cost. Every rupee of tax and cost comes out of the
    // portfolio. Everything the caller passes in is in today's money.
    function simulate(startYear, corpusToday, spendToday, share, real) {
        const toToday = priceMultiple(startYear);
        let eq = (corpusToday / toToday) * share;
        let fd = (corpusToday / toToday) * (1 - share);
        let eqCost = eq;
        let eqAt2018 = null;
        let spend = spendToday / toToday;
        const rows = [];
        let failYear = null;

        for (let y = startYear; y <= LAST; y++) {
            const total = eq + fd;
            if (total <= spend) {
                failYear = y;
                rows.push({ year: y, nominal: total, today: total * priceMultiple(y), spend, wr: total > 0 ? spend / total : Infinity });
                eq = 0; fd = 0;
                break;
            }
            rows.push({ year: y, nominal: total, today: total * priceMultiple(y), spend, wr: spend / total });

            const after = total - spend;
            let newEq = after * share;
            let newFd = after * (1 - share);
            if (real && y === 2019 && eqAt2018 !== null) eqCost = Math.max(eqCost, eqAt2018); // 2018 grandfathering
            if (newEq < eq) {
                const sold = eq - newEq;
                const gain = sold * Math.max(0, 1 - eqCost / eq);
                eqCost *= newEq / eq;
                const tax = real ? D.ltcg(y, gain) : 0;
                newFd -= tax;
                if (newFd < 0) {
                    const short = -newFd; newFd = 0;
                    const kept = Math.max(0, newEq - short);
                    eqCost *= newEq > 0 ? kept / newEq : 0;
                    newEq = kept;
                }
            } else {
                eqCost += newEq - eq;
            }
            if (y === 2018) eqAt2018 = newEq;

            const f = yearFraction(y);
            eq = newEq * (1 + D.nifty[y] / 100);
            if (real) eq -= newEq * D.fundCost * f;
            const interest = newFd * (D.fd[y] / 100) * f;
            fd = newFd + interest - (real ? interest * D.fdTaxRate : 0);
            spend *= 1 + (D.cpi[y] / 100) * f;
        }

        const endToday = eq + fd; // the end point is already in today's rupees
        let minRow = rows[0];
        rows.forEach((r) => { if (r.today < minRow.today) minRow = r; });
        let minIsEnd = false;
        if (!failYear && endToday < minRow.today) { minRow = { year: LAST + 1, today: endToday }; minIsEnd = true; }

        return {
            startYear, rows, failYear,
            endNominal: endToday, endToday,
            startToday: corpusToday,
            wrNow: endToday > 0 ? spendToday / endToday : Infinity,
            minToday: minRow.today, minYear: minRow.year, minIsEnd,
            points: rows.map((r) => ({ year: r.year, value: r.today })).concat(failYear ? [] : [{ year: LAST + 1, value: endToday, isEnd: true }])
        };
    }

    root.BACKTEST_ENGINE = { priceMultiple, simulate, yearFraction };
})(typeof window !== 'undefined' ? window : globalThis);
