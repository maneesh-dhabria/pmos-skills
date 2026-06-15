---
schema_version: 1
id: 260614-fqg
kind: story
parent: 260614-c29
title: Build the /tetris skill — single-file modern Tetris (SRS+kicks, 7-bag, hold/ghost/preview, lock delay, start-level picker + speed-up) + tests
type: feature
priority: could
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_pmos-gamekit-tetris/
plan_doc: docs/pmos/features/2026-06-14_pmos-gamekit-tetris/stories/260614-fqg/03_plan.html
tasks: docs/pmos/features/2026-06-14_pmos-gamekit-tetris/stories/260614-fqg/tasks.yaml
labels: [pmos-gamekit, tetris, game-launcher]
worktree: 
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-14
updated: 2026-06-15
build_commit: a24c900
released: 0.6.0
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260614-fqg -->

## Context

The single (fused) build story for epic `260614-c29`. There is one new skill (`/tetris`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`, released as pmos-gamekit v0.1.0) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/tetris.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-14_pmos-gamekit-tetris/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). Unlike `/poker`, there is **no reference codebase to port** — the engine is built from the documented Tetris Guideline algorithms (7-bag, SRS wall-kick tables, guideline scoring, the gravity curve) captured in the design doc.

### No dependency

`dependencies: []` — `pmos-gamekit` + `_shared/game-launcher/` are already released on `main` (v0.1.0), so the build loop can pick this story immediately.

## Acceptance Criteria

- [x] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/tetris/SKILL.md` with `name: tetris` (matches dir), launch-only + prompt-free body that resolves `game/tetris.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the tetris delta (game file, title, controls); no restating the launch contract. Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [x] **AC2 — Single-file game (D10):** `game/tetris.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; board art CSS + canvas/Unicode; inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [x] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.TetrisEngine` decoupled from DOM/rAF/timers — `SHAPES`/`spawn`, `nextBag` (7-bag), `collides`, `tryMove`, `tryRotate` (SRS + wall-kick tables, returns kick index), `ghostY`, `lock`, `clearLines`, `isTSpin` (3-corner), `score` (guideline + bonuses), `dropInterval` (gravity curve), `isTopOut`, `hold`. Seedable RNG for deterministic tests.
- [x] **AC4 — Mechanics (D3/D4/D6):** standard 10×20 playfield (+ hidden spawn rows); 7 tetrominoes with guideline colors; SRS rotation with wall kicks (JLSTZ + I tables; O no-rotate); 7-bag randomizer; hold (one slot, locked per drop), ghost piece, next-3 preview; lock delay (re-arm on move/rotate, reset cap); guideline scoring incl. T-spin / back-to-back / combo; soft (+1) / hard (+2) drop bonuses.
- [x] **AC5 — Speed & levels (D5):** start-level picker on new game; `dropInterval(level)` gravity curve; level += 1 every 10 lines, accelerating gravity; HUD shows score / level / lines.
- [x] **AC6 — Controls + game-over (D7/D9):** keyboard-only — ←/→ move, ↓ soft drop, Space hard drop, Z/X (or ↑) rotate CCW/CW, C/Shift hold, P pause, R restart; top-out shows a game-over panel with final score + restart; no persistence (D8).
- [x] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/tetris.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [x] **AC8 — Polish + table-stakes UX:** ghost piece overlay; next + hold panels; line-clear / Tetris / T-spin / combo flash; pause overlay; ARIA live region for level-ups + line clears + game over; never color-alone (distinct piece glyphs/borders); responsive to a laptop screen; no console errors on load (inline favicon).
- [x] **AC9 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/tetris.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: 7-bag permutation + fairness + no-drought; `collides` at floor/walls/filled vs open; SRS basic rotation + a wall kick + an I-piece kick + O-no-rotate + a T-spin kick fixture; `ghostY` over a bumpy surface; `clearLines` 1/2/3/4 + partial intact; `isTSpin` true for 3-corner rotated T, false otherwise; `score` scaling + soft/hard-drop + T-spin/back-to-back/combo bonuses; `dropInterval` monotonic non-increasing + clamps; `isTopOut` true on spawn-collision, false on empty. Exit 0/1 with a `--selftest` count assertion.
- [x] **AC10 — Dogfood + Playwright e2e + compliance:** the load-bearing dogfood (real play through the launcher, independent blind judge, cap-2 fix loop) AND the **required, not-deferred** Playwright e2e (start, move+rotate asserted, hard-drop scores, hold panel, a line clear, ghost renders, a level-up via a scripted/seeded sequence, zero console errors, screenshot evidence); `skill-eval-check.sh` ≥ 43/47; the 4 hygiene lints green; zero external runtime deps + single-file contract held. No release-prereq work here (the version bump, changelog, tag are `/complete-dev`'s at Loop 3).


## Build Notes (Loop 2 — 2026-06-15)

BUILT on `feat/260614-fqg`, build commit `a24c900`. route:skill. All 10 ACs verified.

- **Three files, one new skill:** `plugins/pmos-gamekit/skills/tetris/{SKILL.md, game/tetris.html, tests/run.mjs}`. The `_shared/game-launcher/` machinery is consumed unchanged. Modeled on the released `/solitaire` (engine-on-a-global, vm-extract selftest, launch-only SKILL.md, inline data-URI favicon). **No reference codebase** — the engine was built from the documented Tetris Guideline algorithms (7-bag, SRS wall-kick tables, guideline scoring, the gravity curve).
- **Engine (`window.TetrisEngine`, pure/DOM-/rAF-/timer-decoupled, deterministic via seedable mulberry32 → runs in a Node `vm`):** `SHAPES` (7 tetrominoes × 4 rotation states, JLSTZ/S/Z/T/O in a 3-box, I in a 4-box) + `spawn`; `nextBag(rng)` (Fisher-Yates 7-bag, no droughts); `collides` (the single bounds+filled primitive); `tryMove`; `tryRotate` (SRS — basic rotation then walks the JLSTZ / I kick tables with the y-up→screen-y-down conversion `ny = y - kick.y`, O is a no-op, returns `{piece, kickIndex}`); `ghostY`; `lock`; `clearLines` (partial rows kept via `row.some`); `isTSpin` (T + last-action-rotation + ≥3 box corners, OOB corners count filled); `score` (guideline single/double/triple/Tetris × (level+1), T-spin table, back-to-back ×1.5, combo 50×n); `dropInterval` (a monotonic-non-increasing gravity table, clamped at the top); `isTopOut`; `hold` (one swap per drop). Plus a thin pure game-state layer (`createGame`, `moveActive`, `rotateActive`, `softDrop`, `gravityStep`, `hardDrop`, `lockAndNext`, `holdActive`) the render loop drives.
- **UI/render layer (guarded `if (typeof document !== 'undefined')`):** a canvas 10×20 board; start-level picker (0–15, `aria-pressed`); ghost overlay at `ghostY`; next-3 + hold mini-canvas panels; HUD (score / lines / level / session best); lock delay (500 ms, re-arm on move/rotate capped at 15); animated Tetris / T-Spin / B2B / Combo flash (gated on `prefers-reduced-motion`); pause overlay (P); game-over panel + restart (R); keyboard-only (← → ↓ Space Z/X/↑ C/Shift P R, plus WASD aliases); `aria-live` announcements; every cell drawn with a border **and** its piece-letter glyph (never color-alone); inline data-URI SVG favicon; a `window.__TETRIS_TEST__` seam (`newGame({startLevel,seed})`, `rig(field,active)`, `move/rotate/hardDrop/hold`, `getState`, `overlays`) that drives the **real** lock/render path for deterministic e2e scenarios.
- **Phase 6a /skill-eval (route:skill, hard):** `[D]` **EXIT 0, all pass, no residuals** (`a-name-matches-dir` = `tetris`, NI block byte-identical to the released `/solitaire`, flag-contract + phase-refs clean).
- **Phase 7 /verify GREEN:** `node tests/run.mjs --selftest` → **53/53** (vm-extract, `EXPECTED_CHECKS=53`) covering 7-bag permutation/fairness/determinism, collision, SRS basic + I/JLSTZ wall kicks (a real `kickIndex>0` off the left wall) + O-no-rotate, ghost over a bumpy surface, line clears 1/2/3/4 + partial intact + row-shift, T-spin 3-corner (true/false/OOB/non-T), guideline scoring scaling + bonuses, monotonic+clamped gravity, top-out, and a hold/Tetris integration through the real lock path; 4 hygiene lints (`lint-flags-vs-hints`, `lint-phase-refs`, `lint-non-interactive-inline`, `audit-recommended`) all PASS; single-file contract held (all CSS/JS inline, inline data-URI favicon, the only `http://` is the SVG namespace inside the favicon data-URI — not a fetch).
- **AC10 dogfood + Playwright e2e (load-bearing, REQUIRED):** launched the real game through `serve.js` on `http://127.0.0.1:62999/` and drove it in Chromium. Proved live — start screen → 0–15 picker → Play; real **Arrow** + **Space** keypresses move/rotate/hard-drop (HUD score → 16, matches engine, next piece spawned); **hold** stashes a piece and the hold panel paints it; a rigged vertical-I-into-full-column sequence cleared a **Tetris** (lines counter → 4) and drove a **level-up** (lines 4→8→10, level 0→1, HUD matches); the **ghost** sits below the active piece (`ghostY 11 > active.y`); **top-out** (buried board) → game-over overlay with the final-score line; **pause/resume** toggles cleanly; **0 console errors** on the game origin. Three screenshots (`tetris-play.png` / `tetris-gameover.png` / `tetris-start.png`). Independent **blind judge → VERDICT: SHIP** (4/5/4/5/4). Evidence: `stories/260614-fqg/dogfood/EVIDENCE.md`.
- **cap-2 fix loop (one genuine defect, fixed in-build):** the blind judge flagged a pause-resume rAF double-schedule (the paused branch re-armed `requestAnimationFrame` while the P-key resume also re-armed). Fixed: `loop()`'s paused branch now `return`s without re-arming, so resume re-arms exactly once (`lastTime` reset) — re-verified live (pause overlay toggles, resume keeps gravity advancing, 0 console errors). Selftest stayed 53/53 (engine untouched).
- **Accepted residuals (surfaced for /complete-dev + future polish, NOT blocking):** no DAS/ARR auto-repeat tuning (out-of-scope per design D7); T-spin is the documented flat 3-corner test with no mini-vs-full distinction (beyond the documented rule); pieces spawn in-field rather than a vanish-zone buffer (cosmetic).

**Next (Loop 3):** `/complete-dev --epic 260614-c29` — pmos-gamekit minor bump (new skill). `/2048` (260613-c9q), `/poker` (260613-wqw), `/sudoku` (260613-e35), `/snake` (260613-v3y) are also on the gamekit shelf; whichever ships first takes the next minor.
