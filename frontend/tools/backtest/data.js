/* Historical series for the retirement backtest. One place, one value per calendar year, with
   where each number came from. Nothing in the engine is assumed; it only reads this file.

   nifty  Nifty 50 Total Return Index, calendar-year return in %, dividends reinvested.
          2005 to 2025: NSE Indices, Nifty 50 whitepaper 2026 (as reproduced by Bajaj AMC).
          2000 to 2004: the same figures the 10 crore backtest article used, NSE Indices
          historical data. 2026 is the return from 31 December 2025 to 2 November 2026,
          price index plus accrued dividends, and is a partial year.
   cpi    India CPI inflation, annual %, World Bank FP.CPI.TOTL.ZG, fetched 4 November 2026.
          2026 is the January to September average of MoSPI's monthly year-on-year prints
          (2.74, 3.21, 3.40, 3.48, 3.93, 4.38, 4.45, 4.83, 5.54), applied for lastYearFraction.
   fd     Term deposit rate, 1 to 3 years, five major public sector banks, as at end March,
          RBI Handbook of Statistics on the Indian Economy, Structure of Interest Rates
          (Table 59 in the 2026 edition). Each calendar year takes the rate as at the end of
          March of that year, the midpoint of the printed range. 2009 to 2026 are from the
          live table. 2000 to 2008 are from the older printed edition, transcribed, and
          should be checked against it: 1999-00 8.50-9.50, 2000-01 8.50-9.50,
          2001-02 7.50-8.50, 2002-03 4.25-6.00, 2003-04 4.00-5.25, 2004-05 5.25-5.50,
          2005-06 6.00-6.50, 2006-07 6.75-8.00, 2007-08 8.25-8.75.
   Tax rules on equity gains follow the law in force on 1 January of each year. */
(typeof window !== 'undefined' ? window : globalThis).BACKTEST_DATA = {
    first: 2000,
    last: 2026,
    lastYearLabel: '2 November 2026',
    lastYearFraction: 10 / 12,
    nifty: {
        2000: -13.4, 2001: -15.1, 2002: 5.3, 2003: 76.6, 2004: 13.0,
        2005: 39.3, 2006: 41.9, 2007: 56.8, 2008: -51.3, 2009: 77.6,
        2010: 19.2, 2011: -23.8, 2012: 29.4, 2013: 8.1, 2014: 32.9,
        2015: -3.0, 2016: 4.4, 2017: 30.3, 2018: 4.6, 2019: 13.5,
        2020: 16.1, 2021: 25.6, 2022: 5.7, 2023: 21.3, 2024: 10.1,
        2025: 11.9, 2026: -8.0
    },
    cpi: {
        2000: 4.01, 2001: 3.78, 2002: 4.30, 2003: 3.81, 2004: 3.77,
        2005: 4.25, 2006: 5.80, 2007: 6.37, 2008: 8.35, 2009: 10.88,
        2010: 11.99, 2011: 8.91, 2012: 9.48, 2013: 10.02, 2014: 6.67,
        2015: 4.91, 2016: 4.95, 2017: 3.33, 2018: 3.94, 2019: 3.73,
        2020: 6.62, 2021: 5.13, 2022: 6.70, 2023: 5.65, 2024: 4.95,
        2025: 2.40, 2026: 4.00
    },
    fd: {
        2000: 9.000, 2001: 9.000, 2002: 8.000, 2003: 5.125, 2004: 4.625,
        2005: 5.375, 2006: 6.250, 2007: 7.375, 2008: 8.500, 2009: 8.375,
        2010: 6.500, 2011: 8.625, 2012: 9.125, 2013: 8.875, 2014: 9.000,
        2015: 8.625, 2016: 7.375, 2017: 6.875, 2018: 6.575, 2019: 6.750,
        2020: 5.600, 2021: 5.100, 2022: 5.100, 2023: 5.450, 2024: 6.875,
        2025: 6.975, 2026: 6.425
    },
    /* Long-term capital gains tax on listed equity, by the rule in force on 1 January.
       to 2004: 10% of the gain (pre October 2004).
       2005 to 2018: nil, with securities transaction tax.
       2019 to 2024: 10% of the gain above 1 lakh a year, cost grandfathered to 31 January 2018.
       2025 on: 12.5% of the gain above 1.25 lakh a year. */
    ltcg(year, gain) {
        if (gain <= 0) return 0;
        if (year <= 2004) return 0.10 * gain;
        if (year <= 2018) return 0;
        if (year <= 2024) return 0.10 * Math.max(0, gain - 100000);
        return 0.125 * Math.max(0, gain - 125000);
    },
    fdTaxRate: 0.30,   // interest taxed at the top slab
    fundCost: 0.01     // a year, on the equity side
};
