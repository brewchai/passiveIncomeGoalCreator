# DESIGN.md — butfirstfire.com

Decided 2026-08-30; type added 2026-08-30. A decision **record**, not a lock. Any line here can be renegotiated;
what it prevents is drifting back to reflex silently between sessions.

Passes so far: color tokens (contrast + signature gradient), icons (emoji → Phosphor bold),
and type. Layout and component structure are **not yet decided** — see Deferred.

## Banned for this project

Reflex dump from the session that produced this file — these arrived unearned:
1. Swapping the indigo gradient for a teal/emerald one (`#0D9488→#14B8A6`) — same move, new hue.
2. Keeping Inter and nudging `--text-secondary` to `#64748B` to "fix" contrast.
3. One accent doing links + buttons + badges + chart series + logo, undifferentiated.
4. Choosing an accent because it "feels financial" — from memory, not from anything real.
5. Any accent in the 10–30° warm-orange band — that is Claude's own brand colour, and a
   derivation from warm source photography walks straight into it. Check every candidate
   against `#D97757` before adopting it.

Plus `~/.claude/skills/ui-design/references/banned-defaults.md` and the slop-watch dossier.

## What this carries

- **Content:** long first-person prose (60–75 line headlines) plus dense numeric calculators.
- **Reader and state:** someone mid-decision about their own money, often skimming on a phone,
  often skeptical. They arrived from search with a specific question.
- **Must land:** that a real person with real numbers wrote this. Authority comes from
  specificity, not polish.
- **A lie would be:** startup-confident. Anything that reads like a SaaS landing page
  undercuts writing whose whole value is that it isn't selling.

## System

**Color — source: the site's own cover photography.**
25 post covers sampled; saturated pixels cluster 68% in the 15–30° red-orange/orange band
(Da Nang light, terracotta, skin) with a 13% cyan-blue secondary (sky, water). The accent is
drawn from the dominant family, then abandoned. The warm 15–25° band that the photos
pointed to lands on Claude's own brand orange: the derived `#E08A57` sat 7.6° from `#D97757`
at identical saturation and value. Deriving from source data does not protect you from
converging on the tool's own palette. The accent is now **oxblood** `#7C2432` (hue 350°),
chosen from a slate of four alternatives; its dark partner is held at saturation 0.49 so it
reads red rather than dusty rose. The original warm derivation still governs the neutrals, and darkened until it clears AA. Nothing here came from memory.

| Token | Light | Dark | Job |
|---|---|---|---|
| `--accent-color` | `#7C2432` 9.12:1 | `#D26C79` 5.52:1 | links, active state, one emphasis per view |
| `--accent-fill` | `#7C2432` | `#D26C79` |
| `--toast-accent` | `#4A6B22` 5.75:1 | `#9DBF63` 9.02:1 | the article toast only | solid fill for buttons/pills — **replaces the gradient** |
| `--background` | `#FAF7F3` | `#14110E` | ground |
| `--card-background` | `#FFFFFF` | `#1E1A16` | raised surface |
| `--text-primary` | `#1C1714` 16.6:1 | `#F4EFE9` 16.5:1 | body ink |
| `--text-secondary` | `#5C5049` 7.3:1 | `#B9ACA1` 7.8:1 | bylines, captions |
| `--text-muted` | `#6E6159` 5.6:1 | `#9C8E82` 5.9:1 | dates, meta |

**Type — Manrope, self-hosted variable (400–800).**
Chosen because Ninad saw it on phosphoricons.com and liked it. Manrope appears on the
standing banned-defaults list, but that entry bans it *as an unexamined default* — a choice
made from a specific reference is not that, and the decision is recorded here rather than
drifted into. The overlap risk with AI-generated output is real and accepted; the warm
palette and the weight/leading rules below do more differentiating than the family does.

Self-hosted at `/fonts/manrope-{latin,latin-ext,vietnamese}.woff2` (24 KB / 15 KB / 8 KB),
`font-display: swap`, no Google Fonts request. latin-ext carries ₹ (U+20B9); vietnamese
carries the place names. No preload tag — `swap` covers it, and a stale preload has bitten
this repo before.

Scale: base 18px, ratio 1.25 (major third), as `--t--1 … --t-5` = 14 / 18 / 22 / 28 / 35 / 44 / 55.

**Weight rule:** size supplies presence. Display at 44px+ runs `--w-display: 500`; smaller
headings run `--w-heading: 600`; body 400. 500 rather than the 400 of the reference because
his headlines run to 73 characters and his register is blunt, not neutral.

**Leading:** `--lh-tight: 1.15` for 35px+, `--lh-snug: 1.25` for 22–28px, `--lh-body: 1.6`.
Headings never inherit the body value — that was the defect this pass fixed.

**Measure:** `--measure: 55ch`, applied to `p`, `li`, `blockquote` inside `.post-content`
(not the container, so images stay full width). Calibrated, not assumed: Manrope's `ch` is
0.61em, so 68ch measured 747px ≈ 89 characters. 55ch = 604px ≈ 72 rendered characters.

**Second family:** none. The mono stack is system-only, for code blocks. Tabular figures in
the calculators come from Manrope via `font-variant-numeric`, so a second family has no job.

**Neutrals** are warm (hue ~30, sat ~6%), not Tailwind's cool slate — so the page ground
shares temperature with every hero image instead of fighting it.

**Accent count: two, with distinct jobs.** `--accent-color` is brand chrome — links, buttons,
active state. `--toast-accent` is the article toast only: an interruption that must read as
*not* brand chrome, which is a job the primary accent cannot do. Sampled from the foliage in
the same cover photography (90–100°, olive) rather than a generic notification green.
Charts are a third case — multiple series need distinguishable hues. Not yet decided (Deferred).

**The geo-arbitrage globe** is a fourth: its canvas is dark in both themes, so it cannot read
the theme-varying tokens. Its palette is fixed at the dark-mode end of the site palette in a
`GLOBE` const at the top of `tools/geo-arbitrage/globe.js` — affordable `#9DBF63`, above-budget
`rgba(176,164,152,.45)`, atmosphere `#E08A57`, labels `#F4EFE9`. Green-means-affordable is a
data encoding and was kept; only the hue moved, from stock mint to the site's olive.

**Radius** — `--radius-control: 4px` for form controls (was 8/12/24 scattered),
`--radius-surface: 12px` for cards (the dominant existing value, 154 uses). These two tokens
are declared but only `--radius-control` is applied so far; the codebase still carries 13
distinct radius values. Finishing that is Deferred.

**Contrast:** darkest ink `#1C1714`, lightest ground `#FAF7F3`. Every pair above verified
≥ 4.5:1. Re-verify with the script in Step 5 of the skill when changing any of these.

**Gradients: none.** `--gradient` is retained as an alias of `--accent-fill` purely so the
103 existing call sites keep working; it resolves to a flat color. Do not reintroduce a
two-stop gradient — it is the loudest single tell in the dossier.

**The deliberate oddity:** warm neutrals on a finance site. The category defaults to cool
blue-gray to signal trust. Warm ground signals the opposite thing this site actually is —
someone writing at a kitchen table, not an institution's dashboard.

## Images — where they appear

Decided 2026-08-30. One image per post, used in three places, never duplicated on screen.

| Slot | Shows | Why |
|---|---|---|
| Listing hero | the clean photograph (`cover_base`) | the real title sits beside it, so a burned-in hook would say the same thing twice |
| Listing grid | **no image** — the title on a warm dark ground | the titles are the strongest asset; a card grid of photos was the "3-up card" tell |
| Top of article | the card (`cover`) | |
| Share / OG / Discover | the same card | the only slot where the image travels alone, so the hook earns its place |

Tile titles are sized at runtime by `fitTiles()` in `blog.html` — a binary search for the
largest size that still fits the box, so no tile carries dead space whatever the title
length. This also breaks the monotony of thirteen identical dark rectangles.

**Photo when the picture is evidence; `type_only: true` when it is not.** A concept post
with no honest photograph gets a type card rather than a stock stand-in — six of the
unlisted posts and `can-a-major-illness-end-lean-fire` use this.

## Deferred — not yet decided, do not improvise

Radius, elevation policy, motion policy, density,
the tool stylesheets' heading weights (they use 800 throughout, outside the
size-supplies-presence rule — inherited, not chosen),
separation mechanism, chart series palettes (`app.js`, `fire-india.js`, `sequence-risk.js`),
and semantic status colors (success/warning/info/danger tints, still Tailwind-derived —
~15 two-stop gradients remain in `styles.css` and `tools/geo-arbitrage/`).
Current values are inherited, not chosen.
When any of these is next touched, run the skill and decide it properly here.

## States
Not audited this pass. Empty / loading / error / longest-string / narrow-viewport remain
unverified across the calculators.
