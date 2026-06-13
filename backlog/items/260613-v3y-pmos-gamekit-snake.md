---
schema_version: 1
id: 260613-v3y
kind: epic
title: pmos-gamekit — /snake (classic feature-phone Snake, single-file HTML, walls-kill + wrap toggle, speed picker + progressive speed-up)
type: feature
priority: could
status: defined
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-snake/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-13_pmos-gamekit-snake/02_design.html
labels: [pmos-gamekit, snake, browser-game, game-launcher]
created: 2026-06-13
updated: 2026-06-13
---

## Context

From maintainer request (2026-06-13): add a fourth game to `pmos-gamekit` — `/snake`, the classic Snake that was ubiquitous on feature phones (Nokia et al.). Same delivery shape as the shipped `/solitaire` and the defined `/sudoku` / `/poker`: a single self-contained HTML file (all CSS+JS embedded, offline, no persistence) launched via the existing `_shared/game-launcher/` serve substrate.

Maintainer's explicit asks: a Snake game "popular in feature phones", exposed through a **parallel skill called `/snake`** that triggers the view, built as a **single HTML file game similar to `/solitaire`**.

Design contract (the cross-skill coherence doc the story cites by anchor): `docs/pmos/features/2026-06-13_pmos-gamekit-snake/02_design.html`.

### No blocking dependency

The plugin and `_shared/game-launcher/` are **already released on `main`** as `pmos-gamekit/v0.1.0` (epic `260613-4mw`). `/snake` therefore carries **no `dependencies:`** — Loop-2 `/backlog next` can pick the build story immediately. It ships as a **minor bump** of the released plugin; the exact version is resolved at release (Loop 3) because `/sudoku` and `/poker` also target the next minor (whichever ships first is `v0.2.0`, the next `v0.3.0`, …). `/complete-dev` is the sole writer of the bump.

### Maintainer decisions captured at define (2026-06-13)

- **D1 — Delivery: ship a pre-built bundled game** (inherits /solitaire D1). A tested single-file `snake.html`; game *code* pre-built. Unlike /sudoku there is no runtime puzzle generation — only trivial runtime food placement (seedable RNG).
- **D2 — Launch: reuse `_shared/game-launcher/` verbatim** (inherits /solitaire D2). Zero-dep Node server + auto-open; Node a hard prerequisite; no silent `file://` fallback. Launcher unchanged.
- **D3 — Difficulty: a three-mode speed picker (slow / normal / fast = easy / medium / hard).** The choice sets the *starting* tick speed. Mirrors the gamekit house pattern.
- **D4 — Progressive speed-up** (AskUserQuestion grill — recommended). On top of the start speed, the snake accelerates as it grows — every N foods eaten the tick interval shortens toward a floor.
- **D5 — Wall behavior: walls kill by default, with an in-game wrap toggle** (grill — recommended). Edge collision ends the game (Nokia-faithful default); an in-game toggle (off by default) switches to wrap-around. One setting, no extra screens.
- **D6 — Food: a single standard pellet, bonus food deferred** (grill — recommended). One pellet → +1 length, +score. Timed/bonus pellets are explicitly out of scope for v1.
- **D7 — Controls: arrows + WASD + on-screen D-pad; no 180° reverse.** Pause on P / Space; new game on R / N. A direction change applies at most once per tick, validated against the *last applied* heading (not a queued one), so two fast taps cannot reverse the snake into its own neck.
- **D8 — End states + scoring: game-over overlay + restart; session high score; board-fill = win.** Death → game-over overlay with score + restart. Live score + a *session* high score. The rare board-fill = win → confetti (reuse /solitaire's win pattern).
- **D9 — No persistence** (inherits /solitaire D6). Fresh session each launch; session-only high score.
- **D10 — Single-file is a hard contract** (inherits /solitaire D7). All CSS/JS embedded; offline; CSS / Canvas / Unicode / SVG art, no image files; inline data-URI favicon; engine on a global, decoupled from DOM.
- **D11 — Single plugin / release unit:** lands in `pmos-gamekit`; rides a minor bump (next available minor).
- **D12 — Singleton epic:** one fused story (skill + bundled game + tests = one vertical slice).

## Acceptance Criteria

- [ ] **No new plugin/substrate:** no plugin scaffold and no launcher changes beyond the routine release version bump (D11) — `serve.js` and `game-launcher.md` consumed unchanged; `/snake` cites the substrate and states only its delta.
- [ ] **/snake skill:** `plugins/pmos-gamekit/skills/snake/SKILL.md` (`name: snake` matches dir; launch-only, prompt-free; cites `../_shared/game-launcher/game-launcher.md`) + `game/snake.html` (pre-built single-file per D1/D10) + `tests/run.mjs`.
- [ ] **Game correctness:** bounded-grid Snake; a difficulty speed picker (slow/normal/fast, D3) setting the start speed; progressive speed-up as the snake grows (D4); walls kill by default with an in-game wrap toggle (D5); a single standard food pellet → grow +1 + score (D6); no-reverse controls applied once per tick (D7); game-over overlay + restart, session high score, board-fill win (D8). Single file, offline, no persistence.
- [ ] **Testability (single-file AND testable):** the embedded script exposes a pure-logic engine on `window.SnakeEngine` (createState, setDirection, step, placeFood, speedFor, seedable RNG) decoupled from rendering; `tests/run.mjs --selftest` extracts + evaluates it and asserts objective gates (initial-state validity; setDirection rejects a 180° reverse but accepts a 90° turn; step advances the head; wall death with wrap off; wrap with wrap on; self-collision death; eating food grows +1, increments score, respawns food on an empty non-snake cell; progressive speed-up strictly decreases tickMs and floors it; board-fill → 'won'; deterministic RNG); exit 0/1 with a count assertion.
- [ ] **Launch works:** `serve.js game/snake.html` binds a free localhost port, serves the file, opens the browser, prints the URL; missing-Node yields the clear actionable error (D2).
- [ ] **Dogfood (load-bearing):** the real game is played through the launcher — each difficulty; arrow + WASD steering; food eaten → growth + score + visible speed-up; wrap toggle flips edge behavior; death on wall and on self → game-over overlay + restart; session high score updates; independent blind judge confirms responsive + frustration-free; gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
- [ ] **Playwright end-to-end (required final-verification gate):** Playwright drives the real served game — difficulty picked, key presses assert the head advances, food eaten asserts score increment + growth, a wall collision asserts the game-over overlay, restart asserts a fresh game, zero console errors — with a screenshot as evidence. Maintainer-mandated; not deferred (Playwright provisioned locally if absent; only the narrow board-fill win-celebration sub-check may defer via a tiny-board test hook, surfaced loudly).
- [ ] **Conventions:** `/snake` passes `skill-eval.md` (floor 43/47) + repo `CLAUDE.md` (canonical path, manifest version-sync, §H–§L); zero external runtime dependencies (Node stdlib only for launcher + tests); repo hygiene lints green where applicable.
- [ ] **Single plugin (D11):** all changes land in `pmos-gamekit`; release is a minor bump.

## Stories

- `260613-1vv` — Build the `/snake` skill (SKILL.md + bundled `game/snake.html` + `tests/run.mjs`). route: skill. deps: none. *(fused singleton — load-bearing)*
