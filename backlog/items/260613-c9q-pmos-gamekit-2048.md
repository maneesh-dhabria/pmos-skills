---
schema_version: 1
id: 260613-c9q
kind: epic
title: pmos-gamekit — /2048 (classic sliding-tile puzzle, single-file HTML, board-size picker + one-step undo + keep-playing past 2048)
type: feature
priority: could
status: released
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_pmos-gamekit-2048/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-14_pmos-gamekit-2048/02_design.html
labels: [pmos-gamekit, 2048, browser-game, game-launcher]
created: 2026-06-14
updated: 2026-06-15
released: 0.2.0
---

## Context

From maintainer request (2026-06-14): add a fifth game to `pmos-gamekit` — `/2048`, the classic 2014 sliding-tile puzzle (Gabriele Cirulli). Same delivery shape as the shipped `/solitaire` and the defined `/sudoku` / `/poker` / `/snake`: a single self-contained HTML file (all CSS+JS embedded, offline, no persistence) launched via the existing `_shared/game-launcher/` serve substrate.

Maintainer's explicit ask: build 2048 "as a single file html game in pmos-gamekit via a skill similar to /solitaire" — a launch-only, prompt-free skill `/2048`.

Design contract (the cross-skill coherence doc the story cites by anchor): `docs/pmos/features/2026-06-14_pmos-gamekit-2048/02_design.html`.

### No blocking dependency

The plugin and `_shared/game-launcher/` are **already released on `main`** as `pmos-gamekit/v0.1.0` (epic `260613-4mw`). `/2048` therefore carries **no `dependencies:`** — Loop-2 `/backlog next` can pick the build story immediately. It ships as a **minor bump** of the released plugin; the exact version is resolved at release (Loop 3) because `/sudoku`, `/poker`, and `/snake` also target the next minor (whichever ships first is `v0.2.0`, the next `v0.3.0`, …). `/complete-dev` is the sole writer of the bump.

### Maintainer decisions captured at define (2026-06-14)

D3, D4, D5 were grilled with the maintainer (each chose the recommended option); the rest inherit the gamekit house pattern set by `/solitaire` and `/snake`.

- **D1 — Delivery: ship a pre-built bundled game** (inherits /solitaire D1). A tested single-file `2048.html`; game *code* pre-built. The only runtime non-determinism is trivial tile spawning (a seedable RNG); no runtime puzzle generation (unlike /sudoku).
- **D2 — Launch: reuse `_shared/game-launcher/` verbatim** (inherits /solitaire D2). Zero-dep Node server + auto-open; Node a hard prerequisite; no silent `file://` fallback. Launcher unchanged.
- **D3 — Board size: a start-screen size picker — 4×4 (classic default) / 5×5 / 6×6** (grill — recommended). Sets the grid dimension; mirrors the gamekit house picker pattern. Win target stays 2048 on every size.
- **D4 — Win at 2048, then keep playing** (grill — recommended). First 2048 tile → win celebration + confetti with a Keep-playing affordance to chase higher tiles.
- **D5 — One-step undo** (grill — recommended). A single-level undo reverts the last move (board + score + spawned tile), matching /solitaire's QoL stance; disabled at start and right after an undo. No undo stack.
- **D6 — Tile spawn: one tile per changed move, 90% "2" / 10% "4", seedable RNG.** A move that does not change the board spawns nothing and consumes no turn; the spawn cell is uniform among empties.
- **D7 — Controls: arrows + WASD + on-screen swipe (touch/drag) + on-screen D-pad.** All map to the four moves. U = undo; R / N = new game; Esc closes overlays.
- **D8 — End states + scoring + animation.** Win overlay (Keep playing) at 2048; game-over overlay when no move is possible; live score + a *session* best + move count; slide / merge-pop / spawn animations (CSS, honour `prefers-reduced-motion`).
- **D9 — No persistence** (inherits /solitaire D6). Fresh session each launch; session-only best score (no `localStorage`).
- **D10 — Single-file is a hard contract** (inherits /solitaire D7). All CSS/JS embedded; offline; CSS-only tile art (classic colour ramp); inline data-URI favicon; engine on a global, decoupled from DOM.
- **D11 — Single plugin / release unit:** lands in `pmos-gamekit`; rides a minor bump.
- **D12 — Singleton epic:** one fused story (skill + bundled game + tests = one vertical slice).

## Acceptance Criteria

- [ ] **No new plugin/substrate:** no plugin scaffold and no launcher changes beyond the routine release version bump (D11) — `serve.js` and `game-launcher.md` consumed unchanged; `/2048` cites the substrate and states only its delta.
- [ ] **/2048 skill:** `plugins/pmos-gamekit/skills/2048/SKILL.md` (`name: "2048"` matches dir; launch-only, prompt-free; cites `../_shared/game-launcher/game-launcher.md`) + `game/2048.html` (pre-built single-file per D1/D10) + `tests/run.mjs`.
- [ ] **Game correctness:** square-grid 2048; a board-size picker (4×4/5×5/6×6, D3); slide-and-merge with the merge-once invariant (`[2,2,2,2]`→`[4,4,0,0]` not `[8,0,0,0]`); one tile spawns per *changed* move (2@90%/4@10%, D6); a no-op move spawns nothing; win at 2048 then keep playing (D4); one-deep undo (D5); game-over when no move is possible (D8). Single file, offline, no persistence.
- [ ] **Testability (single-file AND testable):** the embedded script exposes a pure-logic engine on `window.Game2048Engine` (makeRng, createState, move, spawnTile, canMove, hasWon) decoupled from rendering; `tests/run.mjs --selftest` extracts + evaluates it and asserts objective gates (initial two tiles in {2,4}; `[2,2,0,0]`→`[4,0,0,0]` gained 4; merge-once across all four directions; no-op move → moved:false + no spawn; a changed move spawns exactly one tile on an empty cell, value in {2,4}; win detection at 2048; game-over only when no slide AND no merge; deterministic RNG; score == sum of gained); exit 0/1 with a count assertion.
- [ ] **Launch works:** `serve.js game/2048.html` binds a free localhost port, serves the file, opens the browser, prints the URL; missing-Node yields the clear actionable error (D2).
- [ ] **Dogfood (load-bearing):** the real game is played through the launcher — each board size; arrows + WASD + swipe + D-pad steering; merge → score + spawn; a 2048 tile → win + Keep playing; a full board → game-over + restart; one-deep undo works and is correctly disabled; session best updates; reload resets (no persistence); independent blind judge confirms responsive + frustration-free; gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
- [ ] **Playwright end-to-end (required final-verification gate):** Playwright drives the real served game — board size picked, key presses assert the board changes + a tile spawns + score increments on a merge, a seeded/tiny-board path asserts the win overlay + Keep playing, a full board asserts the game-over overlay, Undo asserts the prior board restored, zero console errors — with screenshots as evidence. Maintainer-mandated; not deferred (Playwright provisioned locally if absent; only a narrow natural-large-board-fill sub-check may defer, surfaced loudly).
- [ ] **Conventions:** `/2048` passes `skill-eval.md` (floor 43/47) + repo `CLAUDE.md` (canonical path, manifest version-sync, §H–§L); the digit-leading skill name `"2048"` is accepted by the loader + a-name-matches-dir; zero external runtime dependencies (Node stdlib only for launcher + tests); repo hygiene lints green where applicable.
- [ ] **Single plugin (D11):** all changes land in `pmos-gamekit`; release is a minor bump.

## Stories

- `260613-nay` — Build the `/2048` skill (SKILL.md + bundled `game/2048.html` + `tests/run.mjs`). route: skill. deps: none. *(fused singleton — load-bearing)*
