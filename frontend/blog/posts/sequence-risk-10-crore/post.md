# Will Your ₹10 Crore Survive an AI Crash?

Everyone planning to retire in India obsesses over the number. Is it ₹5 crore, ₹10 crore, ₹40 crore? You hit it, a calculator tells you the money lasts forever, and you feel safe. I want to show you why that feeling is dangerous, so I took a ₹10 crore retirement and ran it through my own [sequence risk calculator](/tools/sequence-risk/), in rupees, and then I did the one thing those comfortable projections never do. I broke it on purpose, over and over, until I found the exact conditions where ₹10 crore actually survives.

Here is the whole experiment, screenshot by screenshot. We start with the plan that looks perfect, we crash it, we get cautious and hunt for a withdrawal rate that holds, and then we test what happens when the crash arrives a little later. By the end you will have a clear table of when ₹10 crore is safe and when it quietly fails.

## Step 1: the averages say you can retire

Here is the starting point. You retire with ₹10 crore. You follow the standard rule and withdraw 3% in year one, which is ₹30 lakh, and you raise that spending every year with inflation, which for India I have set to a realistic 6%. Your money earns an average of about 11% a year, roughly what Indian equity has delivered. Across a 40 year retirement, here is what the average says.

<img src="/blog/posts/sequence-risk-10-crore/baseline.webp" alt="Sequence risk calculator showing a 10 crore portfolio at 3% withdrawal growing to about 285 crore in rupees" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*₹10 crore at a 3% withdrawal, growing at an average 11% against 6% inflation. The calculator says Safe, and the portfolio climbs to about ₹285 crore.*

This is the projection that makes people comfortable. It does not just say you survive, it says you end up with 28 times what you started with. On the strength of a chart like this, most people retire without a second thought. The problem is that this smooth line is an average, and nobody actually gets the average.

## Step 2: so what if the market crashes?

You do not earn 11% every year in a neat line. You earn a sequence, and sometimes that sequence opens with a crash. Imagine the AI boom that is inflating markets right now finally bursts, and it looks a lot like the dot com crash of 2000, which fell roughly 9%, then 12%, then 22% across three straight years. Now drop that into the first years of your retirement, on the exact same 3% plan.

<img src="/blog/posts/sequence-risk-10-crore/crash-at-3pct.webp" alt="Sequence risk calculator showing a dot-com style crash in year 1 draining the 3% 10 crore plan to zero" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*The same ₹10 crore at 3%, hit by a dot com style crash in year 1. The orange line is the average fantasy still climbing. The purple line is your real money, and it runs out.*

The plan that promised ₹285 crore is now bankrupt. Forced to sell shares while the market was down just to fund your ₹30 lakh a year, the portfolio never recovers. And here is the part that should really worry you. At 3%, this plan fails whether the crash lands in year 1, year 3, year 5, or year 7. A crash anywhere in your first several years ends it. The comfortable 3% only looked safe because the first version we ran happened to have no crash in it at all.

## Step 3: so you get cautious, and hunt for a rate that holds

The obvious reaction is to withdraw less. You cut to 2.5%, which is ₹25 lakh a year, feeling much safer. So does that survive the same early crash?

<img src="/blog/posts/sequence-risk-10-crore/crash-year-1.webp" alt="Sequence risk calculator showing a 2.5% withdrawal with a year 1 crash still failing to zero" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*₹10 crore at 2.5%, with the same crash in year 1. Better, but it still fails.*

No. Even 2.5% runs out of money when the crash hits this early. So I did what you would do, I kept lowering the withdrawal through trial and error to find the rate that finally holds. 2.5% fails, and then at 2% something changes.

<img src="/blog/posts/sequence-risk-10-crore/survives-at-2pct.webp" alt="Sequence risk calculator showing a 2% withdrawal surviving a year 1 crash and ending near 38 crore" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*₹10 crore at 2%, with the same year 1 crash. Now it survives, ending with about ₹38 crore even after the worst possible timing.*

At 2%, which is ₹20 lakh a year, the plan finally withstands a crash in its very first year. That is the honest safe withdrawal rate against a genuinely bad early sequence, and it sits a long way below the 3% that every calculator hands you. The gap between 3% and 2% is the real price of sequence risk, and almost nobody builds it into their number.

## Step 4: but do not overcorrect, because the crash might come later

Here is the catch, and it is what stops 2% from being the simple answer. A crash in your very first year is the worst case, and it is not the likely one. Corrections happen at all sorts of times, so what if the same crash arrives a little later, once your portfolio has had a few years to grow?

<img src="/blog/posts/sequence-risk-10-crore/crash-year-5.webp" alt="Sequence risk calculator showing the same crash delayed to year 5 now surviving with 13.3 crore" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*The same crash and the same 2.5% plan, but the crash lands in year 5 instead of year 1. Now it survives, ending with ₹13.3 crore.*

<img src="/blog/posts/sequence-risk-10-crore/crash-year-7.webp" alt="Sequence risk calculator showing the same crash at year 7 surviving comfortably with 27.8 crore" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*The same crash at year 7. It survives comfortably, ending with ₹27.8 crore.*

This is the whole tension. At 2.5%, an early crash ruins you, but a crash just 4 or 5 years later leaves you with 13 to 28 crore. The 2% rate that protects you against a year 1 crash is genuinely overcautious if the crash actually comes later, and that caution is not free. It costs you ₹10 lakh a year of real living for decades. You would be insuring against the worst timing at the price of a smaller life, without ever knowing whether the worst timing will arrive.

## The conditions where your ₹10 crore was safe

I ran the whole grid so you can see it in one place. Every cell is the same ₹10 crore and the same crash, changing only the withdrawal rate and the year the crash lands. A rupee figure means the money survived 40 years and ended with that much, and "Fails" means it ran out.

| Withdrawal | No crash | Crash yr 1 | Crash yr 3 | Crash yr 5 | Crash yr 7 |
| --- | --- | --- | --- | --- | --- |
| 3.0% (₹30 L) | ₹286 cr | Fails | Fails | Fails | Fails |
| 2.5% (₹25 L) | ₹346 cr | Fails | Fails | ₹13 cr | ₹28 cr |
| 2.0% (₹20 L) | ₹407 cr | ₹38 cr | ₹52 cr | ₹65 cr | ₹77 cr |
| 1.5% (₹15 L) | ₹468 cr | ₹97 cr | ₹107 cr | ₹117 cr | ₹125 cr |

Read down the columns and the story is obvious. With no crash, every rate makes you rich, which is exactly the fantasy that gets people into trouble. At 3%, a single crash anywhere in the first 7 years ends the plan. At 2.5%, you are safe only if the crash politely waits until year 5. At 2%, you survive even the worst timing, and at 1.5% you are barely dented. The safe zone is smaller and lower than any average projection admits.

## What this actually teaches you

A few things fall out of this, and they matter far more than the size of your number.

The average is only a story you tell yourself before you retire, and it quietly leaves out the sequence that actually decides your outcome. Nobody earns the average every year, and a bad sequence in your first few years can end a plan that the average says will grow to hundreds of crores.

Your safe withdrawal rate is lower than you think. The 3% or 4% that calculators quote assumes the market cooperates early. Against a real early crash, the rate that actually held here was 2%, which is a full third less spending than the 3% plan you thought was fine.

But cutting your rate that far down is not the only answer, and it is an expensive one. Dropping to 2% to insure against a year 1 crash costs you ₹10 lakh a year for life, and if the crash never comes early, you gave up a lot of living for nothing. The smarter protection is a cash cushion. If you hold 2 to 3 years of spending in cash and safe assets, you never have to sell equity into an early crash, and that alone lets you run a higher withdrawal rate safely. That is the entire idea behind [a bucket strategy](/blog/three-bucket-strategy-fire), and it is why the crash, and not the average, should shape how you hold your money.

The early years are the whole game. Once your portfolio has grown well past its starting value, the same crash barely dents it, so the danger is concentrated in the first 5 years or so. Everything you do should be aimed at getting through that window without being forced to sell.

The best move you can make is to stop trusting the average and test your own number against a bad sequence. Run your figures through the [sequence risk calculator](/tools/sequence-risk/), switch it to rupees, and drop a crash into your first few years. If you want the historical version of the same idea, I also [backtested a real ₹10 crore retirement across 26 years of actual market data](/blog/10-crore-retirement-backtest), and if you are still fixing your target, start with [how many crores you actually need to FIRE in India](/blog/fire-in-india-how-many-crores).

---

## Frequently Asked Questions

### What is sequence of returns risk?
It is the danger that a market crash early in retirement, while you are withdrawing money, permanently damages your portfolio. The same average return arriving in a different order can mean the difference between survival and running out of money, because a crash in the first years forces you to sell investments while they are down.

### Is a 3% withdrawal rate safe for FIRE in India?
Not against an early crash. In this experiment a ₹10 crore plan at 3% grew comfortably when markets behaved, but failed completely when a dot com style crash hit anywhere in the first 7 years. The rate that survived even a worst case year 1 crash was 2%, which is a third less spending than 3%.

### Does a market crash matter more early or late in retirement?
Far more early. At a 2.5% withdrawal, the exact same crash depleted the plan to zero when it hit in year 1 or year 3, but left ₹13 crore when it hit in year 5 and ₹28 crore when it hit in year 7. Nothing changed except the timing.

### How do you protect a retirement against sequence risk?
Keep 2 to 3 years of spending in cash and safe assets so you never have to sell equity into an early crash, which lets you run a higher withdrawal rate safely. Add flexible withdrawal guardrails that cut spending in bad years, and avoid retiring fully invested at the top of a bull market. You can stress test your own plan against a bad early sequence with the free [sequence risk calculator](/tools/sequence-risk/).

---

## The disclaimer, please actually read it

I need to be clear about what this is. This is an experiment I ran in my own calculator to make a point about how retirement money really behaves, and it is general information and honestly a bit of entertainment, nothing more. It is absolutely not financial advice, investment advice, tax advice, or a recommendation to retire on any particular number or withdrawal rate. I am not a licensed financial advisor, a planner, or an accountant, and I know nothing about your income, your family, your health, or your goals, so none of this is tailored to you.

Every number here comes from a simplified model. The 11% average return, the 6% inflation, the withdrawal rates, and the 40 year horizon are all assumptions, and the crash is the historical dot com sequence used as an illustrative shape, not a forecast of any future crash. Real markets, real inflation, taxes, and fees will all behave differently, and a single sequence of returns is one possibility out of thousands, not a prediction. The calculator also ignores taxes, fees, health shocks, and the very human habit of adjusting your spending when things go wrong.

So please do not take these figures and set your own retirement date by them. Treat this as a way to understand sequence risk and why the early years matter, then do your own careful math for your own life, and speak to a qualified financial professional before you act. Your money and your future are entirely your own responsibility, and only you can make these calls.
