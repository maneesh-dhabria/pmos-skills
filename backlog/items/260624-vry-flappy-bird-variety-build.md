---
schema_version: 1
id: 260624-vry
kind: story
parent: 260624-fly
title: "Build /flappy-bird visual variety — 7 procedural background themes + 4 procedural bird shapes + 5-color contrast-safe palette + subtle top-HUD pmos wordmark, all behind a pure seedable pickVariants() picker, with engine selftests asserting contrast/no-repeat/determinism/coverage invariants and a headless dogfood"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-gamekit
status: planned
feature_folder: docs/pmos/features/2026-06-24_flappy-bird-variety/
plan_doc: docs/pmos/features/2026-06-24_flappy-bird-variety/stories/260624-vry/03_plan.md
tasks: docs/pmos/features/2026-06-24_flappy-bird-variety/stories/260624-vry/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-gamekit, flappy-bird, game, visual-variety, theming, enhancement]
created: 2026-06-24
updated: 2026-06-24
---

## Story

Add per-game visual variety and a subtle pmos attribution to `/flappy-bird`, all inside the single
self-contained `plugins/pmos-gamekit/skills/flappy-bird/game/flappy-bird.html` (plus selftest additions
in `tests/run.mjs`). Gameplay (physics, scoring, difficulty, ceiling clamp, pause, game-over, session
best, new-best flourish) is behavior-preserved. **Inv-1 holds**: the variant selection is a pure,
seedable, selftested function — only its *consumption* is render-side.

Scope is fixed by `02_design.html`: §registry (theme + palette data model), §picker (seedable
`pickVariants` + invariants), §rendering (motif draw + bird shapes + per-theme pipe/ground), §wordmark
(top-HUD link). Cites `design_doc:` anchors `#data-model`, `#picker`, `#rendering`, `#wordmark`,
`#selftests`.

## Acceptance criteria

1. **Theme registry (7 backgrounds)** — a pure data registry of 7 themes (`sky` default, `ocean`,
   `space`, `sunset`, `night-city`, `forest`, `cave`). Each theme entry carries: sky gradient stops,
   ground spec (colors, or a dark platform / none for space), a `lum` luminance class, an optional pipe
   tint, and a motif id. Each theme has a render-only motif draw function (clouds / bubbles / stars /
   sun+hills / skyline+windows / hills / stalactites) that is cheap and subtle. A selftest asserts every
   theme has all required metadata fields.

2. **4 procedural bird shapes** — `round` (classic), `sparrow` (slim), `duck` (broad flat bill), `owl`
   (round head + tufts + large eyes), each a pure canvas draw function parametrized by the chosen
   `{body, accent, beak}` colors. The current single bird is replaced by a shape selected per game; the
   eye/wing-flap animation continues to work for every shape.

3. **5-color contrast-safe palette** — a fixed palette of 5 colors, each `{body, accent, beak, lum}`
   (e.g. sunflower, coral, sky-blue, mint, grape). Bird color + accents are randomized per game,
   **independent of shape**. The pick is **contrast-safe**: for the chosen background, the picker only
   emits a color whose luminance delta vs the background exceeds the threshold; a theme tints its pipes
   where needed so pipe-vs-background also exceeds the threshold.

4. **Pure seedable `pickVariants(seed, prevBg)`** — on the engine surface (alongside `FlappyEngine`),
   returns `{ bg, bird, color }` indices deterministically from a seed (mulberry32 or the existing RNG),
   **never returns `prevBg`** (no immediate background repeat), and **never emits a `(bg, color)` pair
   that fails the contrast threshold**. Render consumes the indices; `newGame` calls it with a fresh seed
   per game and the previous background index, so every real game differs.

5. **Subtle top-HUD pmos wordmark** — a translucent, unobtrusive `pmos · flappy-bird` element added to
   the top HUD bar (`#hud`), an `<a>` linking to `https://github.com/maneesh-dhabria/pmos-skills`
   (`target="_blank"`, `rel="noopener"`). It does not overlap the score/best, does not intercept gameplay
   key/tap input, and is legible over every theme (its own backing/opacity guarantees contrast).

6. **Selftests (`tests/run.mjs`) extended, all green** — assert: (a) registry completeness (7 themes ×
   required fields; 4 birds; 5 palette colors); (b) **contrast invariant** — for every `(bg, color)` the
   picker can emit, bird-vs-bg AND pipe-vs-bg luminance deltas ≥ threshold; (c) **no-immediate-repeat** —
   `pickVariants(*, prevBg).bg !== prevBg` across many seeds; (d) **determinism** — same `(seed, prevBg)`
   ⇒ identical result; (e) **coverage** — over N seeds all 7 backgrounds, 4 birds, and 5 colors appear.
   Existing physics/scoring selftests still pass unchanged.

7. **Live headless dogfood** — the game boots, renders a non-default theme + a non-yellow/non-round bird
   on at least one seeded game, the wordmark link resolves to the repo URL, gameplay (flap → score →
   game-over → restart) still works, and the console is error-free. Captured as evidence.

8. **Gameplay preserved + hygiene** — physics/scoring/difficulty/pause/ceiling-clamp/session-best
   unchanged; `skill-eval` `[D]` half passes (no new residuals); the 4 repo hygiene lints pass where
   applicable (the SKILL.md launch contract is untouched, but the launch-description paragraph may be
   updated to mention the variety + attribution).
