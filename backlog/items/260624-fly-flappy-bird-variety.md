---
schema_version: 1
id: 260624-fly
kind: epic
title: "/flappy-bird visual variety — per-game randomized backgrounds (7 procedural themes), 4 procedural bird shapes, contrast-safe color palette (5 colors + accents), and a subtle pmos top-HUD wordmark linking to the repo; all behind a pure, seedable, selftested variant picker (Inv-1 preserved)"
type: feature
status: defined
priority: should
labels: [pmos-gamekit, flappy-bird, game, visual-variety, theming, enhancement]
route: skill
created: 2026-06-24
updated: 2026-06-24
defined: 2026-06-24
source:
feature_folder: docs/pmos/features/2026-06-24_flappy-bird-variety/
design_doc: docs/pmos/features/2026-06-24_flappy-bird-variety/02_design.html
parent:
dependencies: []
---

## Context

`/flappy-bird` (pmos-gamekit) ships one fixed look: a single teal sky, one yellow bird, no
attribution. This epic adds **per-game visual variety** plus a **subtle pmos marking**, without
touching gameplay physics, scoring, difficulty, pause, or the session-best flourish — and without
breaking **Inv-1** (the engine stays a pure, DOM-decoupled, timer-free, seedable, selftested layer).

Four user-requested enhancements (verbatim intent):

1. **Backgrounds** — every game starts with a different background. Ship **7 procedural canvas
   themes**: `sky` (default), `ocean`, `space`, `sunset`, `night-city`, `forest`, `cave`. Randomly
   chosen per game, never an immediate repeat of the previous game's background.
2. **Bird shapes** — a different *kind* of bird each game. Ship **4 procedural silhouettes**
   (round-classic, sparrow, duck, owl), randomly chosen per game. Procedural canvas art (matches the
   current style); not emoji.
3. **Bird color** — randomized from a **fixed palette of 5 colors**, each with coordinated accents
   (belly/cheek + beak). The pick is **contrast-safe**: it never emits a bird/background combination
   that blends, protecting visibility (playability).
4. **pmos wordmark** — a subtle, translucent `pmos · flappy-bird` mark in the **top HUD bar**, linking
   to the GitHub repo (`https://github.com/maneesh-dhabria/pmos-skills`, new tab).

The unifying technical spine: a **pure, seedable variant picker** in the engine surface that selects
`{background, bird, color}` deterministically from a seed, honoring the no-immediate-repeat and
contrast-safe invariants. Real games use a fresh seed per `newGame` (so every game differs); selftests
pin a seed and assert the invariants — preserving Inv-1 and making the randomization testable rather
than a render-only side effect.

## Grill resolutions (define run 2026-06-24)

- **Backgrounds** — ship **all 7** (the 3 requested + sunset, night-city, forest, cave). Random per
  game with **no immediate repeat** of the previous background.
- **Bird variety** — **4 procedural shapes** (not emoji), so they combine with color randomization and
  match the existing canvas art.
- **Color** — **contrast-safe** pick: each palette color and each background carry a luminance class; the
  picker guarantees a minimum luminance delta for **both** bird-vs-background **and** pipe-vs-background
  (a theme may tint its pipes so the classic green never blends into the forest theme).
- **Wordmark** — **top HUD bar** placement, subtle/translucent, clickable, linking to the repo.

## Decisions (carried into 02_design.html)

- **D1 — Inv-1 preserved.** Variant selection is a **pure, seedable** function (`pickVariants(seed, prevBg)`)
  on the engine surface; render only consumes its output. Motif *draw* functions are render-only, but the
  theme *metadata* (gradient stops, luminance class, pipe tint) is pure data, selftested.
- **D2 — contrast invariant is a hard selftest.** For every `(bg, color)` the picker can emit, both
  bird-vs-bg and pipe-vs-bg luminance deltas exceed the threshold; the picker never emits a failing pair.
- **D3 — no-immediate-repeat (background only).** The picker never returns `prevBg`. Bird shape and color
  may repeat (the combination space is large; forcing all-three non-repeat adds complexity for little gain).
- **D4 — single file, single story.** All four enhancements + selftests live in `game/flappy-bird.html`
  (+ `tests/run.mjs` selftest additions). One `/execute` session → a **singleton epic, one story**.
- **D5 — gameplay untouched.** Physics, scoring, difficulty, ceiling clamp, pause, game-over, session
  best, and the new-best flourish are byte-behavior-preserved; only the cosmetic/render + HUD layers change.

## Stories

- **260624-vry** — the full build: theme registry (7) + 4 bird draw functions + 5-color contrast-safe
  palette + seedable `pickVariants` + top-HUD pmos wordmark, wired into `newGame`/render, with the engine
  selftests (`tests/run.mjs`) extended to assert the contrast / no-repeat / determinism / coverage
  invariants and a headless dogfood. Single story, `route: skill`, plugin `pmos-gamekit`.

Single plugin (pmos-gamekit); ships as a minor bump in Loop-3 `/complete-dev --epic`.
