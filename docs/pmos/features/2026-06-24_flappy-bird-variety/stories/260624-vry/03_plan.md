# 03 · Plan — /flappy-bird visual variety (story 260624-vry)

**Epic:** 260624-fly · **Route:** skill · **Plugin:** pmos-gamekit
**Design:** [`../../02_design.html`](../../02_design.html) · **Tasks:** [`tasks.yaml`](./tasks.yaml)
**Skill dir:** `plugins/pmos-gamekit/skills/flappy-bird/`

## Goal

Land all four visual-variety enhancements + the pmos wordmark in the single
`game/flappy-bird.html`, with `tests/run.mjs` selftests extended to pin the randomization invariants —
without changing gameplay and without breaking **Inv-1** (pure, seedable, selftested engine).

## Code study (current state)

- `game/flappy-bird.html` (621 lines): pure `window.FlappyEngine` (physics/scoring/state) + a guarded
  render/UI layer. Background is a hardcoded teal gradient + grass ground (`draw()`, ~461–476); pipes
  are hardcoded green (~492–503); the bird is a single hardcoded yellow round shape (`drawBird()`,
  ~505–531). HUD is an HTML overlay `#hud` with `#score` (left) and `#best` (right). `newGame()`
  resets state; the engine already has a seedable `mulberry32` PRNG (used for pipe gaps).
- `tests/run.mjs`: headless selftest harness loading the engine in a vm; asserts physics/scoring/
  transitions. This is where the new registry/picker invariants are added.
- `SKILL.md`: launch-only contract (untouched except an optional description-paragraph touch in T8).

## Approach (waves)

The task DAG (`tasks.yaml`) yields these waves:

- **Wave 1 — `T1`** (pure registries: THEMES[7], PALETTE[5], bird ids + reference luminances).
- **Wave 2 — `T2`** (fail-first selftests for registry completeness + picker invariants).
- **Wave 3 — `T3`** (implement pure `pickVariants`; turn T2 green) **in parallel with `T4`, `T5`, `T7`**
  (bird draw fns; background motifs + per-theme gradient/ground/pipe; top-HUD wordmark) — the render
  tasks depend only on `T1`, not on the picker.
- **Wave 4 — `T6`** (wire selection into `newGame`, default sky preview) — needs `T3`+`T4`+`T5`.
- **Wave 5 — `T8`** (selftest green + headless dogfood + optional SKILL.md touch) — the closing gate.

## TDD posture

`T2` writes the picker/registry selftests **fail-first** (red before `T3` exists); `T1`+`T3` turn them
green. The four invariants — **I-contrast**, **I-repeat**, **I-determinism**, **I-coverage**
(`02_design.html#picker`) — are the deterministic gate (skill-patterns §H: deterministic ⇒ selftest,
never LLM-judged). The live **headless dogfood** (`T8`) is the integration gate proving real
themes/birds/wordmark render with an error-free console.

## Key decisions (from 02_design.html)

- **D1** — `pickVariants` is pure + seedable on the engine surface (Inv-1). **D2** — contrast is a hard
  selftest (bird-vs-bg **and** pipe-vs-bg). **D3** — no-immediate-repeat for background only. **D5** —
  per-theme pipe tint + ground spec. **D6** — variants picked at `newGame`; initial preview stays sky.

## Risks

- **Contrast feasibility** — a background must admit ≥2 palette colors above threshold or `color`
  selection dead-ends. Pre-verified at design time; `I-coverage` fails loudly if a future edit breaks it.
- **Wordmark vs. input** — the flap listeners are on the stage/canvas/keydown; the anchor is a normal
  link. T7 must confirm it never swallows a flap (dogfood checks gameplay still works).
- **Motif cost** — motifs must stay cheap (a few shapes, no new timers/assets) to preserve frame rate.

## Final verification checklist

1. `node tests/run.mjs` — all selftests green (new invariants + unchanged physics/scoring).
2. Headless dogfood: seeded non-default theme + non-round/non-yellow bird render; wordmark href ==
   `https://github.com/maneesh-dhabria/pmos-skills`; flap→score→game-over→restart works; console clean.
3. `skill-eval` `[D]` half passes — no new residuals.
4. The 4 repo hygiene lints pass where applicable.
5. Gameplay spot-check: difficulty tiers, pause, ceiling clamp, session-best flourish all unchanged.

## Release prerequisites (NOT build tasks — /complete-dev owns these)

pmos-gamekit minor version bump (`.claude-plugin` + `.codex-plugin` plugin.json), changelog entry. No
new deps, no manifest/marketplace shape change, no README-row change. See `02_design.html#release`.
