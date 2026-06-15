---
schema_version: 1
id: 260614-c29
kind: epic
title: pmos-gamekit — /tetris (modern guideline-style — SRS+kicks, 7-bag, hold/ghost/preview, lock delay, start-level picker + speed-up)
type: feature
priority: could
status: released
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_pmos-gamekit-tetris/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-14_pmos-gamekit-tetris/02_design.html
labels: [pmos-gamekit, tetris, browser-game, game-launcher]
created: 2026-06-14
updated: 2026-06-15
released: 0.6.0
---

## Context

From maintainer request (2026-06-14): add a fourth game to `pmos-gamekit` — `/tetris`, a single-player modern Tetris played in the browser. Same delivery shape as `/solitaire` and the defined `/sudoku` / `/poker`: a single self-contained HTML file (all CSS+JS embedded, offline, no persistence) launched via the existing `_shared/game-launcher/` serve substrate, consumed unchanged.

Maintainer's ask, verbatim: "build tetris as a single file html game in pmos-gamekit via a skill similar to /solitaire game." Four design decisions were grilled at define and locked.

Design contract (the cross-skill coherence doc the story cites by anchor): `docs/pmos/features/2026-06-14_pmos-gamekit-tetris/02_design.html`. Unlike `/poker`, there is **no reference codebase to port** — the engine is built from the documented Tetris Guideline algorithms (7-bag, SRS wall-kick tables, guideline scoring, the gravity curve).

### No blocking dependency

`pmos-gamekit` and `_shared/game-launcher/` are **already released on `main`** as `pmos-gamekit/v0.1.0` (epic `260613-4mw`). `/tetris` therefore carries **no `dependencies:`** — Loop-2 `/backlog next` can pick the build story immediately. It ships as a minor bump of the released plugin (D11).

### Maintainer decisions captured at define (2026-06-14)

- **D1 — Delivery: ship a pre-built bundled game** (inherits /solitaire D1). The game *code* is pre-built; pieces/bag are generated at runtime.
- **D2 — Launch: reuse `_shared/game-launcher/` verbatim** (inherits /solitaire D2). Zero-dep Node server + auto-open; Node hard prerequisite; no silent `file://` fallback. Launcher unchanged.
- **D3 — Fidelity: modern guideline-style mechanics** (AskUserQuestion grill — recommended). SRS rotation with wall-kick tables (JLSTZ + I); 7-bag randomizer; hold piece; ghost piece; next-3 preview; lock delay; T-spins recognized + scored.
- **D4 — Randomizer: 7-bag** (follows D3). Shuffled permutation of all 7 tetrominoes per bag — no droughts.
- **D5 — Speed & levels: start-level picker + progressive speed-up** (grill — recommended). New-game level picker; gravity follows a level curve; level += 1 every 10 lines. Mirrors `/snake`'s speed picker + progressive speed-up.
- **D6 — Scoring: guideline line-clear + drop + T-spin + back-to-back + combo** (follows D3). Single/Double/Triple/Tetris scaled by level; soft (+1) / hard (+2) drop bonuses; T-spin (3-corner rule); back-to-back; combo.
- **D7 — Controls: keyboard-only desktop** (grill — recommended). Arrows + Space + Z/X + C/Shift (hold) + P/R. No touch/mobile layout v1. Matches /solitaire's desktop posture.
- **D8 — Persistence: session-only** (grill — recommended). No localStorage; score live and lost on close. Consistent with /solitaire D6, /sudoku D9.
- **D9 — No persistence** (inherits /solitaire D6). No save/resume; pause is in-session only.
- **D10 — Single-file is a hard contract** (inherits /solitaire D7). All CSS/JS embedded; offline; no build step; CSS + canvas/Unicode board art, no image files; inline data-URI favicon; engine on a global, decoupled from DOM.
- **D11 — Single plugin / release unit:** lands in `pmos-gamekit`; rides a minor bump.
- **D12 — Singleton epic:** one fused story (skill + bundled game + tests = one vertical slice).

## Acceptance Criteria

- [ ] **No new plugin/substrate:** no plugin scaffold and no launcher changes beyond the routine release version bump (D11) — `serve.js` and `game-launcher.md` consumed unchanged; `/tetris` cites the substrate and states only its delta.
- [ ] **/tetris skill:** `plugins/pmos-gamekit/skills/tetris/SKILL.md` (`name: tetris` matches dir; launch-only, prompt-free; cites `../_shared/game-launcher/game-launcher.md`) + `game/tetris.html` (pre-built single-file per D1/D10) + `tests/run.mjs`.
- [ ] **Game correctness:** standard 10×20 playfield; 7 tetrominoes; SRS rotation with wall kicks (D3); 7-bag randomizer (D4); hold piece, ghost piece, next-3 preview, lock delay (D3); start-level picker + gravity curve + level-up every 10 lines (D5); guideline scoring incl. T-spin/back-to-back/combo (D6); keyboard-only controls (D7); top-out game-over + restart. Single file, offline, no persistence.
- [ ] **Testability (single-file AND testable):** the embedded script exposes a pure-logic engine on `window.TetrisEngine` (spawn/SHAPES, nextBag, collides, tryMove, tryRotate w/ SRS kicks, ghostY, lock, clearLines, isTSpin, score, dropInterval, isTopOut, hold) decoupled from rendering/rAF; `tests/run.mjs --selftest` extracts + evaluates it and asserts objective gates (7-bag permutation+fairness; collision; SRS rotation+kicks incl. I-piece + O-no-rotate + a T-spin kick; ghostY; clearLines 1–4; isTSpin 3-corner; scoring scaling+bonuses; dropInterval monotonic; isTopOut); exit 0/1 with a count assertion.
- [ ] **Launch works:** `serve.js game/tetris.html` binds a free localhost port, serves the file, opens the browser, prints the URL; missing-Node yields the clear actionable error (D2).
- [ ] **Dogfood (load-bearing):** the game is actually played through the launcher — low + high start level; move/rotate/soft/hard drop; hold + next preview; clear singles + a Tetris; a T-spin; lock-delay slide; level-up every 10 lines; top-out + restart; independent blind judge confirms responsive + frustration-free; gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
- [ ] **Playwright end-to-end (required final-verification gate):** Playwright drives the real served game — start, move+rotate asserted, hard-drop scores, hold panel, a line clear, ghost renders, a level-up via a scripted/seeded sequence, zero console errors — with a screenshot as evidence. Maintainer-mandated; not deferred (Playwright provisioned locally if absent; only narrow named sub-checks may defer, surfaced loudly).
- [ ] **Conventions:** `/tetris` passes `skill-eval.md` (floor 43/47) + repo `CLAUDE.md` (canonical path, manifest version-sync, §H–§L); zero external runtime dependencies (Node stdlib only for launcher + tests); repo hygiene lints green where applicable.
- [ ] **Single plugin (D11):** all changes land in `pmos-gamekit`; release is a minor bump.

## Stories

- `260614-fqg` — Build the `/tetris` skill (SKILL.md + bundled `game/tetris.html` + `tests/run.mjs`). route: skill. deps: none. *(fused singleton — load-bearing)*
