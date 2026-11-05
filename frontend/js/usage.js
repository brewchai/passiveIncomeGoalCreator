/* Microsoft Clarity for butfirstfire.com, plus bffEvent() so a page can mark a real action.

   The tag loads on the live site only. Local and preview builds keep the queue and send nothing,
   so testing a page never lands in the Clarity project.

   Event names in use (they show up under Smart events in Clarity):
     home_step1_started, home_step1_got_result, waitlist_joined
     fire_number_used, newsletter_joined
     backtest_ran, backtest_missing_inputs, backtest_year_changed
     sequence_risk_ran
     geo_budget_moved, geo_city_opened
     coffee_clicked, call_clicked */
(function () {
    var PROJECT = 'z8qp2joxjw';
    var LIVE = location.hostname === 'butfirstfire.com';

    // Same queue the official snippet sets up. Clarity drains it when the tag arrives.
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };

    if (LIVE) {
        var tag = document.createElement('script');
        tag.async = true;
        tag.src = 'https://www.clarity.ms/tag/' + PROJECT;
        var first = document.getElementsByTagName('script')[0];
        first.parentNode.insertBefore(tag, first);
    }

    // bffEvent('backtest_ran') records every call.
    // bffEvent('fire_number_used', true) records the first call on this page view only.
    var sent = {};
    window.bffEvent = function (name, once) {
        if (once) {
            if (sent[name]) return;
            sent[name] = true;
        }
        try { window.clarity('event', name); } catch (e) { }
    };

    // Coffee and call links, on any page that carries them.
    document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (href.indexOf('buymeacoffee.com') !== -1) window.bffEvent('coffee_clicked');
        else if (href.indexOf('topmate.io') !== -1) window.bffEvent('call_clicked');
    }, true);
})();
