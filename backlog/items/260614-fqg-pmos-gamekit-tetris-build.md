---
schema_version: 1
id: 260614-fqg
kind: story
parent: 260614-c29
title: Build the /tetris skill — single-file modern Tetris (SRS+kicks, 7-bag, hold/ghost/preview, lock delay, start-level picker + speed-up) + tests
type: feature
priority: could
status: planned
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_pmos-gamekit-tetris/
plan_doc: docs/pmos/features/2026-06-14_pmos-gamekit-tetris/stories/260614-fqg/03_plan.html
tasks: docs/pmos/features/2026-06-14_pmos-gamekit-tetris/stories/260614-fqg/tasks.yaml
labels: [pmos-gamekit, tetris, game-launcher]
worktree: feat/260614-fqg
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-14
updated: 2026-06-15
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260614-fqg -->

## Context

The single (fused) build story for epic `260614-c29`. There is one new skill (`/tetris`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`, released as pmos-gamekit v0.1.0) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/tetris.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-14_pmos-gamekit-tetris/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). Unlike `/poker`, there is **no reference codebase to port** — the engine is built from the documented Tetris Guideline algorithms (7-bag, SRS wall-kick tables, guideline scoring, the gravity curve) captured in the design doc.

### No dependency

`dependencies: []` — `pmos-gamekit` + `_shared/game-launcher/` are already released on `main` (v0.1.0), so the build loop can pick this story immediately.

## Acceptance Criteria

- [ ] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/tetris/SKILL.md` with `name: tetris` (matches dir), launch-only + prompt-free body that resolves `game/tetris.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the tetris delta (game file, title, controls); no restating the launch contract. Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [ ] **AC2 — Single-file game (D10):** `game/tetris.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; board art CSS + canvas/Unicode; inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [ ] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.TetrisEngine` decoupled from DOM/rAF/timers — `SHAPES`/`spawn`, `nextBag` (7-bag), `collides`, `tryMove`, `tryRotate` (SRS + wall-kick tables, returns kick index), `ghostY`, `lock`, `clearLines`, `isTSpin` (3-corner), `score` (guideline + bonuses), `dropInterval` (gravity curve), `isTopOut`, `hold`. Seedable RNG for deterministic tests.
- [ ] **AC4 — Mechanics (D3/D4/D6):** standard 10×20 playfield (+ hidden spawn rows); 7 tetrominoes with guideline colors; SRS rotation with wall kicks (JLSTZ + I tables; O no-rotate); 7-bag randomizer; hold (one slot, locked per drop), ghost piece, next-3 preview; lock delay (re-arm on move/rotate, reset cap); guideline scoring incl. T-spin / back-to-back / combo; soft (+1) / hard (+2) drop bonuses.
- [ ] **AC5 — Speed & levels (D5):** start-level picker on new game; `dropInterval(level)` gravity curve; level += 1 every 10 lines, accelerating gravity; HUD shows score / level / lines.
- [ ] **AC6 — Controls + game-over (D7/D9):** keyboard-only — ←/→ move, ↓ soft drop, Space hard drop, Z/X (or ↑) rotate CCW/CW, C/Shift hold, P pause, R restart; top-out shows a game-over panel with final score + restart; no persistence (D8).
- [ ] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/tetris.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [ ] **AC8 — Polish + table-stakes UX:** ghost piece overlay; next + hold panels; line-clear / Tetris / T-spin / combo flash; pause overlay; ARIA live region for level-ups + line clears + game over; never color-alone (distinct piece glyphs/borders); responsive to a laptop screen; no console errors on load (inline favicon).
- [ ] **AC9 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/tetris.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: 7-bag permutation + fairness + no-drought; `collides` at floor/walls/filled vs open; SRS basic rotation + a wall kick + an I-piece kick + O-no-rotate + a T-spin kick fixture; `ghostY` over a bumpy surface; `clearLines` 1/2/3/4 + partial intact; `isTSpin` true for 3-corner rotated T, false otherwise; `score` scaling + soft/hard-drop + T-spin/back-to-back/combo bonuses; `dropInterval` monotonic non-increasing + clamps; `isTopOut` true on spawn-collision, false on empty. Exit 0/1 with a `--selftest` count assertion.
- [ ] **AC10 — Dogfood + Playwright e2e + compliance:** the load-bearing dogfood (real play through the launcher, independent blind judge, cap-2 fix loop) AND the **required, not-deferred** Playwright e2e (start, move+rotate asserted, hard-drop scores, hold panel, a line clear, ghost renders, a level-up via a scripted/seeded sequence, zero console errors, screenshot evidence); `skill-eval-check.sh` ≥ 43/47; the 4 hygiene lints green; zero external runtime deps + single-file contract held. No release-prereq work here (the version bump, changelog, tag are `/complete-dev`'s at Loop 3).
