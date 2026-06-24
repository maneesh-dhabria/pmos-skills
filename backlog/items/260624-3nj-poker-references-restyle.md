---
schema_version: 1
id: 260624-3nj
kind: epic
title: "/poker — static References panel (hand rankings + interactive preflop chart + pot-odds/Rule-of-2&4) + table restyle to poker-coach look + HUD 'Poker' title + pmos watermark; drop all live coaching"
type: feature
status: defined
priority: should
labels: [pmos-gamekit, poker, references, restyle, hud, watermark]
route: skill
created: 2026-06-24
updated: 2026-06-24
defined: 2026-06-24
source:
feature_folder: docs/pmos/features/2026-06-24_poker-references-restyle/
design_doc: docs/pmos/features/2026-06-24_poker-references-restyle/02_design.html
parent:
dependencies: []
---

## Context

Enhance the existing single-file `/poker` gamekit skill
(`plugins/pmos-gamekit/skills/poker/game/poker.html`) by bringing over the **static learning
references** from the maintainer's `poker-coach` app (`/Users/maneeshdhabria/Desktop/Projects/personal/poker-coach`)
— **without** any of its live coaching. Shaped during this define run by playing the running
`poker-coach` dev server, screenshotting every reference surface, and mapping its codebase to the file
level.

What comes over (all **static**, in a new collapsible right-hand References panel):

1. **Hand rankings** — the 9 categories strongest-first with examples (from `RankingsTab.tsx`).
2. **Interactive preflop chart** — 13×13 starting-hand grid, Position (UTG…BB) × Facing
   (first-in / vs-raise) selectors, raise/fold coloring, click-for-detail (win% + rationale), keeping the
   "transparent baseline, not solver output" caveat (from `PreflopChartTab.tsx` + `core/charts/`).
3. **Pot odds + Rule of 2 & 4** — a static mental-math card: counting outs, ×2/×4, break-even%
   (from `MentalMathSection.tsx` + `core/mental/`, reduced to a fixed explainer).

Plus a **table restyle** to match the `poker-coach` look (oval felt, seat tiles + per-street chip strips,
gold hero/winner glow, card faces, action-bar styling), the in-game **HUD heading → "Poker"**, and a
small **pmos wordmark** linking to the pmos-skills GitHub repo.

**Dropped (explicitly):** per-decision verdicts, the Monte-Carlo equity engine + worker, live
"chart says raise" hints, the narrative Coaching tab, setup-screen bot-style/preset pickers, and bankroll
persistence. The launch contract (zero-dep self-contained HTML via game-launcher, no network, no save) and
the pure, window-exposed, self-tested engine are preserved.

## Decisions (define run 2026-06-24 — §8 of the design doc)

- **D1** — references surface = **collapsible right-hand side panel** (table left, panel right; <880px
  overlay). Over full-screen overlay / top tab-toggle. *(maintainer)*
- **D2** — fidelity = **references + match the table look** (oval felt, seat tiles, gold hero, chip strips);
  NOT full parity (no setup-screen pickers/presets, no bankroll, no reveal animation). *(maintainer)*
- **D3** — references are **static** — no live per-hand advice/equity; preflop chart may pre-select hero seat
  (browsable convenience, not coaching). *(resolved + maintainer)*
- **D4** — reference set = **hand rankings + interactive preflop chart + pot-odds/Rule-of-2&4**; bot-style
  guide dropped. *(maintainer, multiSelect)*
- **D5** — bundling/launch contract **unchanged**: one self-contained HTML, zero-dep, offline, no
  persistence. *(invariant)*
- **D6** — preflop chart data = **bundle the baseline ranges + 169-key equity** as inline static JS copied
  from poker-coach's own JSON; keep the baseline-not-solver caveat. *(resolved)*
- **D7** — HUD heading → **"Poker"**; add a small **pmos wordmark** linking to
  `github.com/maneesh-dhabria/pmos-skills` (new tab); external skill name/triggers unchanged. *(maintainer,
  mid-define)*
- **D8** — **one story** (single self-contained HTML file; one vertical slice, D24 litmus). Singleton epic.
  *(resolved)*

## Stories

- **260624-f62** — the whole slice: collapsible References panel + the three static references +
  bundled chart data & pure `handKey`/`chartAction` helpers + table restyle + HUD "Poker" title + pmos
  watermark + extended `tests/run.mjs` + live dogfood. `route: skill`, plugin `pmos-gamekit`, no deps.

Singleton epic (D8) — every change lands in the one `game/poker.html` (+ `tests/run.mjs`); nothing is
independently shippable, so no split.
