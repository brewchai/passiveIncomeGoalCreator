# Will Your ₹10 Crore Survive an AI Crash?

Everyone planning to retire in India obsesses over the number. Is it ₹5 crore, ₹10 crore, ₹40 crore? You hit it, a calculator tells you the money lasts forever, and you feel safe. But right now the whole market is being lifted by an AI boom, and the honest question nobody is modelling is simple. If that boom bursts the way tech booms always eventually do, does your ₹10 crore actually survive it?

Here is the short answer, and the rest of this post is me showing my work. A crash the size of the one the dot com bust gave India does not break a ₹10 crore plan at a 3% withdrawal, even if it lands in your very first year of retirement. It costs you a lot of ending wealth and a frightening couple of years, and then you recover. The thing that genuinely threatens the plan is something the averages never show you, which is 40 years of real market volatility running against 6% Indian inflation. When I stopped using a smooth average line and ran the plan through 1,500 futures built from real Nifty years instead, fewer than half of them made it to the end, crash or no crash. One thing to hold in your head the whole way through: every number here treats the entire ₹10 crore as sitting in Indian equity, with no cash bucket and no debt, because that is the harshest version and it is the one my calculator models.

I ran all of this in rupees through my own [sequence risk calculator](/tools/sequence-risk/), using the real Nifty 50 numbers from the dot com years, not a made up crash. Every figure below is something you can reproduce yourself by clicking the same buttons, and I tell you exactly which ones at the end.

## Step 1: the averages say you can retire

Here is the starting point. You retire with ₹10 crore. You follow the standard rule and withdraw 3% in year one, which is ₹30 lakh, and you raise that spending every year with inflation, which for India I have set to a realistic 6%. Your money earns an average of 11% a year, roughly what Indian equity has delivered over the long run. Across a 40 year retirement, here is what the average says.

<img src="/blog/posts/sequence-risk-10-crore/baseline.webp" alt="Sequence risk calculator showing a 10 crore portfolio at 3% withdrawal growing to about 286 crore on the smooth average line" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*₹10 crore at a 3% withdrawal, growing at an exact 11% every single year against 6% inflation. The amber line climbs to about ₹286 crore and the calculator calls it Safe.*

This is the projection that makes people comfortable. It does not just say you survive, it says you end up with more than 28 times what you started with. On the strength of a chart like this, most people retire without a second thought. The problem is that this smooth line is an average, and nobody actually gets the average. Real markets do not hand you 11% every year in a neat line. They hand you a sequence, and sometimes that sequence opens with a crash. So I am going to keep this amber line as the reference, because it is the fantasy everyone is comparing against, and then I am going to do two things to it. First I drop a real crash into it. Then I throw the smooth line away entirely.

## Step 2: what the dot com crash actually did to India

Here is the part most people get wrong. They imagine an American style tech wipeout. But the dot com crash was far gentler in India than it was in the US. Here is the real Nifty 50 story, year by year.

In 2000 the Nifty fell 13.4%. In 2001 it fell another 15.1%. That is roughly a 27% drop across two years, which is a genuinely bad stretch to retire into. But then 2002 turned slightly positive at 5.3%, and 2003 roared back with a 76.6% year. The Indian market fell less than America's and recovered far harder.

So the honest version of an AI crash that looks like dot com is not a cartoon collapse. It is two down years of around 13% and 15%, a flat year, and then a violent recovery. Let me drop exactly those four real years into the first four years of your retirement, and keep every other year at the 11% average so you can see the cost of the crash on its own.

## Step 3: so you retire, and the crash hits immediately

This is the worst possible timing. You quit, you start pulling ₹30 lakh a year, and the market falls 13% and then 15% right out of the gate while you are selling shares to fund your life. Here is what happens to the same ₹10 crore at 3%.

<img src="/blog/posts/sequence-risk-10-crore/crash-at-3pct.webp" alt="Sequence risk calculator showing the real India dot com crash injected into year 1 of a 10 crore retirement, surviving to about 201 crore" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*The same ₹10 crore at 3%, with the four real dot com years dropped into years 1 to 4. The dip looks small next to a ₹200 crore ending, and it still cost ₹85 crore by year 40.*

You survive. Your portfolio drops to about ₹6.5 crore at its lowest, which is a terrifying 35% fall to watch while you are living off it, and then the 2003 style recovery drags it back up and it compounds from there. You end the 40 years with about ₹201 crore.

Now look at what the crash really cost you. The no crash fantasy ended at ₹286 crore. This one ends at ₹201 crore. Same ₹10 crore, same 3% spending, same 11% in every other year, and yet a gap of ₹85 crore opened up purely because four bad years landed first. That gap is sequence of returns risk, and it is real. But here is the headline that matters more than the gap. Even in the worst possible timing, a dot com style crash did not break a 3% plan. It just made you less rich.

## Step 4: does the timing still matter?

It does, and this is the whole lesson of sequence risk. The exact same crash is less damaging if it waits a few years, because by then your portfolio has grown a cushion and you are no longer selling into weakness from day one.

<img src="/blog/posts/sequence-risk-10-crore/crash-year-5.webp" alt="Sequence risk calculator showing the same India dot com crash arriving in year 5 instead of year 1, ending higher" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*The same four crash years, but arriving in year 5 instead of year 1. The dip is still there, and the plan ends higher.*

A crash in year 1 at 3% ends at ₹201 crore. The identical crash in year 5 ends at ₹212 crore, and in year 10 at ₹222 crore. Nothing changed except when the bad years arrived. The earlier the crash, the more it hurts, which is exactly why the first few years of any retirement are the most dangerous ones you will live through.

## I pushed the withdrawal rate up too

If a dot com crash cannot break 3%, what can it break? So I ran it at higher rates to find the edge, with every other year still held at 11%.

| Withdrawal | No crash | Crash year 1 | Crash year 5 |
| --- | --- | --- | --- |
| 4.0% (₹40 L) | ₹164 cr | ₹73 cr | ₹87 cr |
| 3.5% (₹35 L) | ₹225 cr | ₹137 cr | ₹149 cr |
| 3.0% (₹30 L) | ₹286 cr | ₹201 cr | ₹212 cr |
| 2.5% (₹25 L) | ₹346 cr | ₹265 cr | ₹274 cr |

Read across any row and the story is the same. Every single rate survives the dot com crash, even a 4% withdrawal with the crash landing in year one. The crash costs you a big chunk of your ending wealth, and it gives you a genuinely frightening drawdown to sit through in the early years, but it does not run you out of money. For a crash of this size, the real price is fear and a smaller final number.

I even tested something far worse. India's 2008 crash was a 51.3% single year fall, several times deeper than dot com, and the market then snapped back 77.6% the very next year. Dropped into year 1 of the same 3% plan, it sank the portfolio to ₹4.4 crore at its lowest and still ended at about ₹87 crore. Depth alone did not kill it. The recovery saved it.

## Step 5: the part I nearly left out

Everything above has two quiet assumptions baked into it. The first is the one every retirement calculator makes. Outside the crash years, every single year returned exactly 11%, which is why all those lines end in the hundreds of crores. Real markets do not do that, and I am not going to pretend they do just because it makes a nicer chart. The second is that all ₹10 crore of it is in Indian equity, taking the full hit of every bad year, with nothing parked in cash or debt to sell instead. My calculator does not model asset allocation yet, so that is the only portfolio it can show you, and you should read every survival number below as the pure equity, worst case version of your plan.

So I rebuilt the Realistic scenario in the calculator to stop faking it. Instead of one smooth line, or one bumpy line I picked because it looked right, it now runs 1,500 separate futures. Each one is built by taking the real Nifty 50 years from 2000 to 2024, drawing them in random blocks of 5 years so that crashes and their recoveries stay glued together the way they do in life, and centring the whole thing on the same 11% average. Then it reports how many of those 1,500 futures actually lasted the full 40 years. Here is what that looks like for the same ₹10 crore at 3%.

<img src="/blog/posts/sequence-risk-10-crore/realistic-band.webp" alt="Sequence risk calculator showing the Realistic Monte Carlo band for a 10 crore retirement at 3%, with only 43% of 1,500 simulated futures surviving 40 years" style="width:100%;height:auto;border-radius:12px;border:1px solid #e8e0d0;margin:1rem 0 0.35rem;display:block;">

*The purple band is the middle 80% of 1,500 futures built from real Nifty years, and the thick purple line is the median, which runs out before year 40. The smooth amber fantasy runs through the upper half of the band, which is how an average quietly sells you one of the better outcomes.*

The honest number is this. At a 3% withdrawal over 40 years, with 6% inflation and an 11% average, only 43 of every 100 of those real market futures make it to the end with money left. The median future runs out. The luckiest 10% end above ₹355 crore, which is how the smooth line fools you, because a few futures really do look like that and they are the ones every calculator shows you.

Here is the same experiment across the rates and horizons most people in India are actually planning for.

| Withdrawal | 30 years | 40 years | 50 years |
| --- | --- | --- | --- |
| 4.0% | 40% survive | 27% survive | 20% survive |
| 3.5% | 51% survive | 34% survive | 26% survive |
| 3.0% | 61% survive | 43% survive | 33% survive |
| 2.5% | 73% survive | 55% survive | 44% survive |

Read that table against the one above it and you can see what is actually going on. The dot com crash, dropped into the smooth line, left ₹201 crore. The realistic market, with no special crash at all, runs out more often than it survives. Which tells you the crash is a small part of this story. What actually drains the plan is that 11% minus 6% inflation leaves you only about 5% of real return, that volatility drag then eats a chunk of that, and that you are asking the remainder to fund 40 years of inflation linked spending. The smooth line hides all three of those because it never has a down year to drag against.

Inflation is the lever that moves this the most. Hold everything else the same at 3% over 40 years, and the survival rate goes from 43% at 6% inflation to 55% at 5% and 66% at 4%. The return assumption matters just as much. At 12% average instead of 11%, 55% of futures survive, and at 13% it is 66%. Which is a polite way of saying that if you are betting your retirement on Indian equity doing 11% while Indian inflation does 6%, the gap between those two numbers is your entire margin, and it is thin.

One caveat, because I promised to be honest about the method. Resampling real years can only recombine things that have already happened. The worst single year in that data is 2008, so the model cannot imagine a crash deeper than that or a lost decade India has never had. If the AI bust is worse than anything in the Nifty record, every number on this page is too optimistic, and the only scenario that should genuinely keep you up at night is still the one I cannot model, which is a crash that does not come back.

## The bottom line, honestly

So will your ₹10 crore survive an AI crash? Here is the answer in two parts, because one part without the other is a lie.

**If the AI crash is no more aggressive than the dot com crash was for India, then the crash itself will not break a 3% plan, even if it lands in your first year.** The Indian market fell, you sweated through a bad couple of years, and it came back. That is what it has always done.

**What the averages hide is that a 40 year retirement on 11% returns and 6% inflation only reaches the finish in about 43 out of 100 realistic futures, with no special crash required.** That is the number to fix. Fix that, and the crash stops being the thing you need to worry about.

## What this actually teaches you

A few things fall out of this that matter more than the size of your number.

The crash itself is survivable, but the early years are still the whole game. A crash in year 1 cost ₹85 crore of ending wealth while the same crash in year 5 cost noticeably less. Everything you do should be aimed at getting through the first few years without being forced to sell in a panic.

The cheapest protection is a cash cushion. If you hold 2 to 3 years of spending in cash and safe assets, you never have to sell equity into an early crash at all, and you give the market time to recover before you touch it. It also lowers the volatility of your whole portfolio, and volatility drag is exactly what pulled that 43% number down, so a bucketed portfolio should do better than the pure equity version this article modelled. That is the entire idea behind [a bucket strategy](/blog/three-bucket-strategy-fire), and it is why the early years should shape how you hold your money far more than the average ever does.

Stop planning on the gap between 11% and 6% as if it were guaranteed. Every one point of inflation you underestimate, or every one point of return you overestimate, moves your survival odds by more than 10 percentage points. If you want a margin, build it into those two inputs before you build it anywhere else.

And test your own number instead of trusting a smooth line. Open the [sequence risk calculator](/tools/sequence-risk/), switch it to rupees, enter your own portfolio and spending, and set the horizon to however many years you actually need. To reproduce the crash experiment, focus the Historical Average line, click the year 1 point, and inject the Dot Com crash, then do it again from year 5. Do not use the Dot Com Crash chip at the top for this, because that chip is a different experiment, the same real crash dropped into a bumpy market instead of a smooth one, and it will give you a different number. To see the honest odds, look at the Realistic band and the survival percentage on its card. If you want the historical version of the same idea, I also [backtested a real ₹10 crore retirement across 26 years of actual market data](/blog/10-crore-retirement-backtest), and if you are still fixing your target, start with [how many crores you actually need to FIRE in India](/blog/fire-in-india-how-many-crores).

---

## Frequently Asked Questions

### Will a ₹10 crore retirement survive a stock market crash in India?

A crash on its own, yes. A ₹10 crore portfolio withdrawing 3% a year survived the real Indian dot com crash even when it hit in the very first year of retirement, ending with about ₹201 crore instead of the ₹286 crore it would have reached with no crash and a smooth 11% every year. It even survived India's far deeper 2008 crash. What it does not reliably survive is 40 years of realistic volatility against 6% inflation, where only about 43% of simulated real market futures lasted the distance.

### What is sequence of returns risk?

It is the danger that a bad run of returns early in retirement, while you are withdrawing money, does lasting damage to your portfolio. The same average return arriving in a different order changes your outcome, because a crash in the first years forces you to sell investments while they are down. In this test the identical crash cost ₹85 crore of ending wealth when it struck in year 1, and less when it struck in year 5.

### How bad was the dot com crash in India?

Milder than in the US. The Nifty 50 fell about 13.4% in 2000 and 15.1% in 2001, a roughly 27% drop over two years, then turned up 5.3% in 2002 and surged 76.6% in 2003. India fell less than America and recovered much harder.

### Is a 3% withdrawal rate safe for FIRE in India?

Only if your return and inflation assumptions hold. On a smooth 11% average with 6% inflation, 3% looks very safe. Across 1,500 futures built from real Nifty years, 3% over 40 years survived only about 43% of the time, rising to 61% over 30 years and to 55% at a 2.5% withdrawal. Lower inflation or higher real returns move those odds a lot, so the safe rate depends far more on the gap between your return and your inflation than on the rate itself.

### How do you protect a retirement against an early crash?

Keep 2 to 3 years of spending in cash and safe assets so you never have to sell equity into an early crash, use flexible withdrawal rules that cut spending in bad years, build a margin into your inflation and return assumptions, and avoid retiring fully invested at the very top of a boom. You can stress test your own plan against a real crash, and see your honest survival odds, with the free [sequence risk calculator](/tools/sequence-risk/).

---

## The disclaimer, please actually read it

I need to be clear about what this is. This is an experiment I ran in my own calculator to make a point about how retirement money really behaves, and it is general information and honestly a bit of entertainment, nothing more. It is absolutely not financial advice, investment advice, tax advice, or a recommendation to retire on any particular number or withdrawal rate. I am not a licensed financial advisor, a planner, or an accountant, and I know nothing about your income, your family, your health, or your goals, so none of this is tailored to you.

Every number here comes from a simplified model. The 11% average return, the 6% inflation, the withdrawal rates, and the 40 year horizon are all assumptions, and the whole ₹10 crore is treated as a single pot of Indian equity with no cash, debt, or rebalancing, which is harsher than how most people actually hold their money. The crash is the real Nifty 50 dot com sequence from 2000 to 2003 used as an illustrative shape, and the Realistic band is built by resampling real Nifty years from 2000 to 2024, which means it can only recombine things that have already happened and cannot predict a crash deeper than anything on record. None of it is a forecast. Real markets, real inflation, taxes, and fees will all behave differently, and the calculator ignores taxes, fees, health shocks, and the very human habit of adjusting your spending when things go wrong.

So please do not take these figures and set your own retirement date by them. Treat this as a way to understand why the early years matter and why the gap between your return and your inflation is the number that decides everything, then do your own careful math for your own life, and speak to a qualified financial professional before you act. Your money and your future are entirely your own responsibility, and only you can make these calls.
