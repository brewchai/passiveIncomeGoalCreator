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

**Renegotiated 2026-09-13: light-only, accent moved oxblood → turmeric.** Ninad asked to
move away from the dark background entirely, and for a different main color. Dark mode is
gone as a *theme* — both `prefers-color-scheme: dark` blocks deleted, `color-scheme: light`
pinned on `:root` in `styles.css` and `blog.css`. Dark survives only where a canvas is
fixed dark by design: the geo-arbitrage globe and the thumb cover-card template, which now
use `#E0A33E` (8.49:1 on `#14110E`). The session's reflexes were banned first: shipping the
light palette unexamined; sea-teal (proposed minutes earlier, and adjacent to the
already-banned teal move); white-card+shadow separation; cool gray borders. The accent is
**deep turmeric `#7A4E00`** (hue 38°, outside the banned 10–30° band; checked against
`#D97757`) — marigold/incense/temple gold, the warm family honestly present in the Da Nang
photography that the oxblood pass had to detour around. Hover darkens to `#5E3C00`
(index.html inline handlers). The warm neutrals were re-affirmed, not inherited by
inertia: they still share temperature with every cover photo, which stays true with dark gone.

| Token | Value | Job |
|---|---|---|
| `--accent-color` | `#7A4E00` 6.74:1 on ground, 7.2:1 under white | links, active state, one emphasis per view |
| `--accent-fill` | `#7A4E00` | solid fill for buttons/pills — **replaces the gradient** |
| `--accent-rgb` | `122, 78, 0` | tint channels |
| `--toast-accent` | `#4A6B22` 5.75:1 | the article toast only |
| `--background` | `#FAF7F3` | ground |
| `--card-background` | `#FFFFFF` | raised surface |
| `--text-primary` | `#1C1714` 16.6:1 | body ink |
| `--text-secondary` | `#5C5049` 7.3:1 | bylines, captions |
| `--text-muted` | `#6E6159` 5.6:1 | dates, meta |
| fixed-dark accent | `#E0A33E` 8.49:1 on `#14110E` | globe atmosphere, cover-card highlights only |

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

**The geo-arbitrage globe** is a fourth: the sphere is a dark night-earth texture, so it cannot
read the page tokens. Its palette is fixed at the dark-mode end of the site palette in a
`GLOBE` const at the top of `tools/geo-arbitrage/globe.js` — affordable `#9DBF63`, above-budget
`rgba(176,164,152,.45)`, atmosphere `#E0A33E`, labels `#F4EFE9`. Green-means-affordable is a
data encoding and was kept; only the hue moved, from stock mint to the site's olive.
**Revised 2026-11-04:** the page around the sphere is no longer dark. Ninad asked for the tool
to stop being a two-colour experience under the cream header, so `tools/geo-arbitrage/styles.css`
now runs on the site tokens: cream page, white cards with the home page's warm shadow, hairline
`#E8E1D9`, ink, the brown accent on active chips and the slider. The globe is the one dark object
on the page, like a globe on a desk. Radii collapsed to the two site tokens (12px surfaces, 4px
controls). The legend dot keeps the sphere's olive `#9DBF63` so it matches the markers it explains.

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

## Home page — decided 2026-10-30: the quick check is the hero

`/` is a landing page whose hero is a working five-input quick check (age, stop age, yearly
spend, invested today, monthly investing, ₹/$) that recalculates on every keystroke and shows
the three numbers with the age you reach each, then the odds at the planned spending, then
one button that opens the full planner with those inputs carried in. Two copy-led drafts
were rejected first; the product's first screen is the pitch. The quick check sheet is the
only raised surface on the page. The layout decisions below carry over unchanged.

### Layout decisions (2026-10-27)

Decided for the home page that will replace the `/` → `/blog` redirect. Mock lives in the
"FIRE Planner — UX Mocks" canvas as `Landing.dc.html`; carry these into the build.

**Reflex dump, banned for this page:** all-caps tracked micro-labels above numbers and
sections; grids of 1px-bordered white cards (3-up / 6-up, heading + two gray lines); the split
hero with copy left and a shadowed product card right plus two buttons; a four-claim trust
strip and a stat row of big numbers over small-caps labels. All four shipped in the first mock
and all four are in the slop-watch dossier dated 2026-10-02.

**Research it follows:** Julian Shapiro's landing-page guide (header must fully describe what
you sell, purchase rate = desire − (labour + confusion), navbar → hero → proof → CTA →
features-with-objections → CTA → footer, 3–6 features each tied back to the hero claim and
shown as the product in action); Harry Dry's five-part fold (value, how, the real product,
believable proof, one call-to-value), objections in the customer's own words, founder's note
last; and what the current planner sites do (ProjectionLab signals depth by naming specific
mechanisms and scale, Portfolio Charts earns trust with methodology and first-person voice).

| Decision | Value and reason |
|---|---|
| Density | moderate; long sentences are the content, so the page reads like a feature, not a dashboard |
| Separation | **one mechanism: a hairline rule (`--rule` #E8E1D9) at the top of each section**, no cards, no shadows, no tinted bands. The one raised surface is the report sheet in the hero: white on cream, a background shift, because it depicts a document. **Revised 2026-11-04:** the six step tiles under "Reaching a number doesn't guarantee success" are the one exception: Ninad asked for them to read as separate pieces with a shadow and a press on hover, because hairline-topped text in a 3-up grid read as one undifferentiated block. They are white cards at `--radius-surface`, shadow `--shadow-card`. Sections themselves still separate by hairline only |
| Layout | **Revised 2026-11-03: one column, every section stands alone.** The label-left grid (27 Oct) and the side-by-side two-column sections (2 Nov) were both rejected by Ninad: unrelated things sharing a row read as a dashboard. Now the page is a stack: hero copy, then Step 1 as its own section with its own label and heading, then "Reaching a number doesn't guarantee success" with the tiles and the waitlist, then the ₹10 crore proof, then the questions, then the live tools. Each section opens with one hairline, a muted 14px label, a 35px heading; prose holds a 46rem measure, lists 52rem. The quick check sheet is still the only raised surface and the one element that spans the full 1180px wrap. The article list is gone; the blog is one line after Step 1 and a nav item |
| Type | **Two families on the home page, revised 2026-11-03.** Display: Bricolage Grotesque (variable, optical size 12–96, Google Fonts) for the h1, the tagline and section headings; chosen from a specific real reference, Creative Boom's 2026 State of Creativity survey of typefaces designers are using, where it is the one Google Fonts face with real display character (ink traps, optical sizing) that is not on the slop-watch list (Inter, Space Grotesk, Instrument Serif, Geist). Body and every numeral stay Manrope, the site family, for continuity and tabular figures. The h1 is the animated strike line at 68px/600; the tagline sits at 35px/500. Candidates considered and set aside: Satoshi and General Sans (Fontshare, not Google Fonts), Inclusive Sans, Zalando Sans, Plus Jakarta Sans (too widely used), Fraunces and Lora (serifs; the page is a tool, not an essay). The shipped earlier pass used Manrope alone at display 500. |
| Accent | `#7A4E00` only: the one button, links, and the "typical future" line and band tint in the chart. The smooth average line is ink, dashed. No semantic red/green anywhere; outcomes are stated in words and numbers. **Revised 2026-11-04:** in the h1 the word is set as F.I.R.E, two halves with dots, F.I. in the accent and R.E in `--toast-accent` (olive #4A6B22, 5.75:1 on cream), because Ninad wants the two ideas, Financial Independence and Retire Early, to read as two. The olive is reused rather than a third colour invented; it appears nowhere else on the home page, so it has one job there |
| Elevation | **Revised 2026-11-04:** none, except the six step cards. Their shadow is the accent's own colour (`rgba(var(--accent-rgb), …)`, two layers, `--shadow-card`), not a grey, so the lift reads as warm paper on warm paper. On hover the card presses down (`translateY(2px)`, shadow collapses to `--shadow-card-pressed`), the background shifts to `--tint` (#FFF6E5, the accent's 38° hue at 95% lightness) and the title takes the accent. Nothing else on the page is raised |
| Motion | **Revised 2026-11-04:** two things move, the second hero line and the cards, nothing else. The h1 is now a still line, "The FIRE planner that starts where calculators stop." (the struck "calculator" and rising "tool" were dropped the same day as not confident enough). (1) The second hero line: "a FIRE number" is struck 0.9s after load, then six phrases are typed and deleted in a loop after "You need" (38ms a character, 80ms on a space, 2.4s hold, 16ms a character to delete). A ghost copy of the line with the longest phrase reserves the height so the page never jumps. Caret is a 3px accent bar blinking at 0.9s. (3) The card press, 180ms on transform, shadow and background, named properties, never `all`. Under `prefers-reduced-motion` the strikes are static, phrase 1 is shown without a caret, and the cards do not move |
| Radius | 12px on the button and the sheet's one rounded corner, 4px on controls, per the record |
| Copy rules | no price, no account, no "free", no "sign up"; comprehensiveness is written out in full sentences in the reader's words rather than listed in a grid; every number on the page is one the planner produces for the sample plan |

Objections section answers the four questions readers actually ask (4% rule, "my situation
isn't simple", where the market data comes from, where the data goes). Founder's note closes.

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
