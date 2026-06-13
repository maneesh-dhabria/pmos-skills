---
schema_version: 1
id: 260614-nvh
kind: epic
title: pmos-gamekit — /flappy-bird (one-button arcade flappy game, single-file HTML, Easy/Normal/Hard picker, constant-difficulty runs)
type: feature
priority: could
status: defined
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_pmos-gamekit-flappy-bird/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-14_pmos-gamekit-flappy-bird/02_design.html
labels: [pmos-gamekit, flappy-bird, browser-game, game-launcher]
created: 2026-06-14
updated: 2026-06-14
---

## Context

From maintainer request (2026-06-14): add a fifth game to `pmos-gamekit` — `/flappy-bird`, the one-button side-scrolling arcade game (tap to flap a bird through gaps in an endless run of pipes). Same delivery shape as the shipped `/solitaire` and the defined `/snake` / `/sudoku` / `/poker`: a single self-contained HTML file (all CSS+JS embedded, offline, no persistence) launched via the existing `_shared/game-launcher/` serve substrate.

Maintainer's explicit asks: a Flappy Bird game, exposed through a **parallel skill called `/flappy-bird`** that triggers the view, built as a **single HTML file game similar to `/solitaire`**.

Design contract (the cross-skill coherence doc the story cites by anchor): `docs/pmos/features/2026-06-14_pmos-gamekit-flappy-bird/02_design.html`.

### No blocking dependency

The plugin and `_shared/game-launcher/` are **already released on `main`** as `pmos-gamekit/v0.1.0` (epic `260613-4mw`). `/flappy-bird` therefore carries **no `dependencies:`** — Loop-2 `/backlog next` can pick the build story immediately. It ships as a **minor bump** of the released plugin; the exact version is resolved at release (Loop 3) because `/snake`, `/sudoku` and `/poker` also target the next minor (whichever ships first is `v0.2.0`, the next `v0.3.0`, …). `/complete-dev` is the sole writer of the bump.

### Maintainer decisions captured at define (2026-06-14)

- **D1 — Delivery: ship a pre-built bundled game** (inherits /solitaire D1). A tested single-file `flappy-bird.html`; game *code* pre-built. Like /snake, only trivial runtime randomness — seedable pipe-gap placement.
- **D2 — Launch: reuse `_shared/game-launcher/` verbatim** (inherits /solitaire D2). Zero-dep Node server + auto-open; Node a hard prerequisite; no silent `file://` fallback. Launcher unchanged.
- **D3 — Difficulty: an Easy / Normal / Hard picker** (AskUserQuestion grill — recommended). The choice sets the pipe **gap height** and **horizontal scroll speed** (Easy = wider gap + slower; Hard = narrower + faster). Mirrors the gamekit house pattern rather than the original's single brutal difficulty.
- **D4 — Physics: gravity + a fixed flap impulse.** Constant downward acceleration; each flap sets an instantaneous upward velocity. The ceiling **clamps** (no death at the top); ground and pipes are lethal. Gravity/flap tuning constants live in the engine and are exercised for game-feel by the dogfood.
- **D5 — Progression: constant within a run** (grill — recommended). The picked gap height and scroll speed hold for the entire run; only the picker changes them. Faithful to the original Flappy Bird (no ramp) — the deliberate contrast with /snake's progressive speed-up.
- **D6 — Controls: one button.** Space / ↑ / mouse click / touch tap all flap; P pauses; R / N new game. The first flap from the ready state begins the run.
- **D7 — Scoring: +1 per pipe pair cleared; live score + a session high score.** Passing the bird's x past a pipe pair scores exactly once.
- **D8 — End states: game-over overlay + restart; session high score.** Pipe/ground collision → overlay with final score, session best, restart (R / N). A new session best gets a small celebratory flourish (reuse /solitaire's win pattern, motion-reduced-aware). **No medals / milestones** in v1 (grill — recommended minimal scope).
- **D9 — No persistence** (inherits /solitaire D6). Fresh session each launch; session-only high score.
- **D10 — Single-file is a hard contract** (inherits /solitaire D7). All CSS/JS embedded; offline; CSS / Canvas / Unicode / SVG art, no image files; inline data-URI favicon; engine on a global, decoupled from DOM, stepped by explicit `dt` for deterministic tests.
- **D11 — Single plugin / release unit:** lands in `pmos-gamekit`; rides a minor bump (next available minor).
- **D12 — Singleton epic:** one fused story (skill + bundled game + tests = one vertical slice).

## Acceptance Criteria

- [ ] **No new plugin/substrate:** no plugin scaffold and no launcher changes beyond the routine release version bump (D11) — `serve.js` and `game-launcher.md` consumed unchanged; `/flappy-bird` cites the substrate and states only its delta.
- [ ] **/flappy-bird skill:** `plugins/pmos-gamekit/skills/flappy-bird/SKILL.md` (`name: flappy-bird` matches dir; launch-only, prompt-free; cites `../_shared/game-launcher/game-launcher.md`) + `game/flappy-bird.html` (pre-built single-file per D1/D10) + `tests/run.mjs`.
- [ ] **Game correctness:** one-button flappy gameplay — gravity + fixed flap impulse (D4), ceiling clamp / ground+pipe death; an Easy/Normal/Hard picker setting gap height + scroll speed (D3); constant difficulty within a run (D5); +1 per pipe pair cleared, scored exactly once (D7); game-over overlay + restart, session high score (D8). Single file, offline, no persistence.
- [ ] **Testability (single-file AND testable):** the embedded script exposes a pure-logic engine on `window.FlappyEngine` (createState, difficultyParams, flap, step(dt), spawnPipe, collides, seedable RNG) decoupled from rendering; `tests/run.mjs --selftest` extracts + evaluates it and asserts objective gates (initial-state validity; flap sets upward velocity + ready→playing; gravity makes the bird fall; flap→rise-then-fall arc; ceiling clamp with no top-death; ground death; pipe collision; scoring increments exactly once per pipe; pipe scroll/cull/spawn lifecycle; difficulty bands easy.gap>normal.gap>hard.gap and easy.speed<normal.speed<hard.speed; deterministic RNG); exit 0/1 with a count assertion.
- [ ] **Launch works:** `serve.js game/flappy-bird.html` binds a free localhost port, serves the file, opens the browser, prints the URL; missing-Node yields the clear actionable error (D2).
- [ ] **Dogfood (load-bearing):** the real game is played through the launcher — each difficulty (gap/speed feel distinct); flap via Space + click + tap (responsive, controllable arc); several pipes threaded → score +1 each; death on pipe and on ground → game-over overlay + restart; session high score updates + new-best flourish fires; independent blind judge confirms responsive + fair + frustration-free; gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
- [ ] **Playwright end-to-end (required final-verification gate):** Playwright drives the real served game — difficulty picked, flap inputs assert the bird's y rises/falls, a passed pipe asserts the score increment, a forced collision asserts the game-over overlay, restart asserts a fresh game, zero console errors — with a screenshot as evidence. Maintainer-mandated; not deferred (Playwright provisioned locally if absent; only a sub-check genuinely unreachable in-harness may defer via the engine's seed/state test hook, surfaced loudly).
- [ ] **Conventions:** `/flappy-bird` passes `skill-eval.md` (floor 43/47) + repo `CLAUDE.md` (canonical path, manifest version-sync, §H–§L); zero external runtime dependencies (Node stdlib only for launcher + tests); repo hygiene lints green where applicable.
- [ ] **Single plugin (D11):** all changes land in `pmos-gamekit`; release is a minor bump.

## Stories

- `260614-yb7` — Build the `/flappy-bird` skill (SKILL.md + bundled `game/flappy-bird.html` + `tests/run.mjs`). route: skill. deps: none. *(fused singleton — load-bearing)*
