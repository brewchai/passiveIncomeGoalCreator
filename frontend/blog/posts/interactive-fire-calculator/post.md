# When Can You Retire?

Traditional financial articles give you static examples that don't apply to you. This article is **alive**.
Modify the highlighted numbers below to see how they change your specific timeline.

---

## Your Inputs

Let's assume you earn **$ {{ var:income:5000 }}** per month (after tax).
And you spend **$ {{ var:expenses:3000 }}** per month.

## The Instant Math

Based on your inputs:
*   You save **$ {{ calc: income - expenses }}** every month.
*   Your savings rate is **{{ calc: ((income - expenses) / income * 100).toFixed(1) }}%**.

Most financial experts recommend a savings rate of at least 20%. You are currently at {{ calc: ((income - expenses) / income * 100).toFixed(1) }}%.

## Your FIRE Number

To retire, you generally need **25x** your annual expenses (based on the 4% rule).
*   Your annual spending is **$ {{ calc: expenses * 12 }}**.
*   So your FIRE Number is **$ {{ calc: expenses * 12 * 25 }}**.

## How Long Will It Take?

Assuming you start from zero and invest in a diversified index fund (like VTSAX) returning **7%** annually (inflation-adjusted), here is your timeline:

It will take approximately **{{ calc: (Math.log((expenses * 12 * 25 * (0.07/12)) / (income - expenses) + 1) / Math.log(1 + (0.07/12)) / 12).toFixed(1) }} years** to reach financial independence.

---

### Try It Out!
Go back and change your **expenses** to be $500 lower. Watch how the years to retirement drop instantly!

<div style="margin-top: 2rem; padding: 1rem; background: #f1f5f9; border-radius: 8px; text-align: center;">
    <strong>Want a deeper analysis?</strong><br>
    Click the "Deep Dive" button below to chat with me (the AI author) about <em>your</em> specific numbers.
</div>
