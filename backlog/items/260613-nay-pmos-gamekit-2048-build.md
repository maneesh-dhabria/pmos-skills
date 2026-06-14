---
schema_version: 1
id: 260613-nay
kind: story
parent: 260613-c9q
title: Build the /2048 skill — single-file classic 2048 (board-size picker + one-step undo + keep-playing past 2048) + tests
type: feature
priority: could
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_pmos-gamekit-2048/
plan_doc: docs/pmos/features/2026-06-14_pmos-gamekit-2048/stories/260613-nay/03_plan.html
tasks: docs/pmos/features/2026-06-14_pmos-gamekit-2048/stories/260613-nay/tasks.yaml
labels: [pmos-gamekit, 2048, game-launcher]
worktree: feat/260613-nay
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-14
updated: 2026-06-15
build_commit: bf02222
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-nay -->

## Context

The single (fused) build story for epic `260613-c9q`. There is one new skill (`/2048`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`, released as pmos-gamekit v0.1.0) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/2048.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-14_pmos-gamekit-2048/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). There is **no reference codebase to port** — the engine is built from the documented 2048 algorithm (compress → merge-once → compress → spawn; spawn 2@90%/4@10% on a uniform empty cell via a seedable RNG; win at 2048; game-over when no slide and no merge in any direction) captured in the design doc.

### No dependency

`dependencies: []` — `pmos-gamekit` + `_shared/game-launcher/` are already released on `main` (v0.1.0), so the build loop can pick this story immediately.

## Acceptance Criteria

- [x] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/2048/SKILL.md` with `name: "2048"` (matches dir), launch-only + prompt-free body that resolves `game/2048.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the 2048 delta (game file, title, controls); no restating the launch contract. The digit-leading directory name `2048` is accepted by the loader + a-name-matches-dir (frontmatter name is the quoted string `"2048"`). Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [x] **AC2 — Single-file game (D10):** `game/2048.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; CSS-only tile art (classic 2048 colour ramp); inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [x] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.Game2048Engine` decoupled from DOM render — `makeRng(seed)` (deterministic), `createState({size,seed})` (two starting tiles), `move(state,dir)` (size-generic compress → merge-once → compress → pad; returns moved/gained/spawned), `spawnTile` (2@90%/4@10% on a uniform empty cell), `canMove`, `hasWon` (≥2048). No DOM, no timers.
- [x] **AC4 — Board size + win (D3/D4):** a board-size picker (4×4/5×5/6×6) on new game; the win threshold is a constant 2048 on every size; first 2048 → a win celebration + confetti with **Keep playing** to continue, plus New game.
- [x] **AC5 — Move + undo (D5/D6):** one tile spawns per *changed* move (2@90%/4@10%); a no-op move spawns nothing and consumes no turn; the merge-once invariant holds in all four directions; a **one-deep undo** reverts board + score + spawn and is disabled at game start and right after an undo (no undo stack).
- [x] **AC6 — Controls (D7):** Arrow keys + WASD + pointer-**swipe** (dominant drag axis past a threshold, `preventDefault` so the page doesn't scroll) + an on-screen **D-pad**, all mapping to the four moves. **U** undo; **R / N** new game; **Esc** closes overlays.
- [x] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/2048.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [x] **AC8 — End states + polish (D8):** board full with no possible move → a game-over overlay with the final score + a restart affordance; 2048 → a win celebration + confetti + Keep playing; live score + move count + a *session* best (D9, no persistence); responsive (laptop + phone); accessible (ARIA on controls, visible focus, never color-alone, `prefers-reduced-motion` honored; 4-digit tiles fit via font scaling); no console errors on load (inline favicon).
- [x] **AC9 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/2048.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: initial two tiles in {2,4} + score 0; `[2,2,0,0]`→`[4,0,0,0]` gained 4; merge-once (`[2,2,2,2]`→`[4,4,0,0]` gained 8 NOT `[8,0,0,0]`; `[4,4,4,0]`→`[8,4,0,0]`) across up/down/left/right; a no-op move → moved:false + no spawn + empty-count unchanged; a changed move spawns exactly one tile on a previously-empty cell, value in {2,4}; win detection at 2048; game-over only when no slide AND no merge (full board WITH a neighbour → not over); deterministic RNG for a fixed seed; score == sum of gained. Exit 0/1 with a `--selftest` count assertion.
- [x] **AC10 — Dogfood + Playwright e2e + compliance:** the load-bearing dogfood (real play through the launcher at every board size + every input path, independent blind judge, cap-2 fix loop) AND the **required, not-deferred** Playwright e2e (key presses change the board + spawn + score; a seeded/tiny-board path reaches the win overlay + Keep playing; a full board shows the game-over overlay; Undo restores the prior board; zero console errors; screenshot evidence; a natural large-board fill may defer loudly); `skill-eval-check.sh` ≥ 43/47; the 4 hygiene lints green; zero external runtime deps + single-file contract held. No release-prereq work here (the minor bump, changelog, tag are `/complete-dev`'s at Loop 3).

## Build Notes (Loop 2 — 2026-06-15)

BUILT on `feat/260613-nay`, build commit `bf02222`. route:skill. All 10 ACs verified.

- **Three files, one new skill:** `plugins/pmos-gamekit/skills/2048/{SKILL.md, game/2048.html, tests/run.mjs}`. The `_shared/game-launcher/` machinery is consumed unchanged. Modeled on the shipped `/solitaire` (engine-on-a-global, vm-extract selftest, launch-only SKILL.md, inline data-URI favicon). **No reference codebase** — the engine was built from the documented 2048 algorithm.
- **Engine (`window.Game2048Engine`, pure/DOM-decoupled/timer-free, deterministic via seedable mulberry32 → runs in a Node `vm`):** `collapseLine(line)` is the merge-once core (compress → merge each adjacent equal pair exactly once via an `i += 1` partner-skip → recompress → pad); `lineIndices(size, dir)` yields per-line index lists oriented so element 0 is the merge target; `createState({size,seed})` (two starting tiles), `move(state,dir)` (size-generic, returns `{moved, gained, merges, spawned}`, only spawns/advances the turn when `moved`), `spawnTile` (2@90% / 4@10% on a uniform-random empty cell), `canMove`, `hasWon` (≥2048), plus `snapshot`/`restore` for the one-deep undo.
- **UI/render layer (guarded `if (typeof document !== 'undefined')`):** start-screen board-size picker (4×4/5×5/6×6, `aria-pressed`), CSS-grid board with the classic 2048 colour ramp + digit-count font scaling, absolutely-positioned tiles whose geometry recomputes from live board width (slide/`pop`/`bump` transitions gated on `prefers-reduced-motion`); Arrow + WASD (both cases) + pointer-swipe (24px dominant-axis, `preventDefault`) + on-screen D-pad; **U** one-deep undo (disabled at start and right after an undo), **R/N** new game, **Esc** closes overlays; live Score / session-Best / Moves HUD (`aria-live`); win overlay + confetti + **Keep playing** (sets `dismissedWin` so it never re-nags); game-over overlay; inline data-URI SVG favicon; `window.__2048_TEST__` seam (`loadBoard` rigs a board and drives the **real** `doMove` path so overlays surface as in play).
- **Phase 6a /skill-eval (route:skill, hard):** `[D]` **16/16 pass, 0 fail, EXIT 0, no residuals** (`a-name-matches-dir` = `2048` via the quoted frontmatter name, NI block byte-identical to canonical, flag-contract + phase-refs clean).
- **Phase 7 /verify GREEN:** `node tests/run.mjs --selftest` → **38/38** (vm-extract, `EXPECTED_CHECKS=38`); 4 hygiene lints (`lint-flags-vs-hints`, `lint-phase-refs`, `lint-non-interactive-inline`, `audit-recommended`) all PASS; single-file contract held (all CSS/JS inline, inline data-URI favicon, no external refs).
- **AC10 dogfood + Playwright e2e (load-bearing, TN−1):** launched the real game through `serve.js` on `http://127.0.0.1:62824/` (HTTP 200), drove it in Chromium. Proved live — start screen → **5×5** picker → Play (25 cells, two {2,4} tiles); real **Arrow + WASD** keypresses slide/merge/spawn (score → 4, DOM tiles match engine); **Undo** restores the prior board + score and is correctly one-deep (button disabled after); **win** via a rigged `[1024,1024,…]` left-merge → 2048 tile + gold win overlay + **Keep playing** continues; **game-over** through the real `doMove` path on a staircase board whose post-merge spawn can't create a merge → deterministic lock → "No more moves. Final score 7."; **session best** tracked the max (`10048`) across games; **0 console errors** on the game origin. Three screenshots captured. Independent blind judge **VERDICT: SHIP** (5/5/5/4/5). Evidence: `stories/260613-nay/dogfood/{EVIDENCE.md, 2048-play.png, 2048-win.png, 2048-gameover.png}`.
- **Test-expectation fixes during TDD (no engine bugs):** two initial selftest expectations for slide-**right** and slide-**down** of `[4,4,4,0]` were wrong (`[0,0,8,4]`); the engine correctly merges the *trailing* pair → `[0,0,4,8]`. Corrected the fixtures; engine untouched. (cap-2 fix loop unused on the engine — all logic green first try.)
- **Non-blocking polish surfaced by the judge (future, not blocking):** tile state leans on colour + number, where the number already carries the value — not raised as a defect.

**Next (Loop 3):** `/complete-dev --epic 260613-c9q` — pmos-gamekit minor bump v0.1.0→**v0.2.0** (new skill). `/poker` (260613-wqw), `/sudoku` (260613-e35), `/snake` (260613-v3y) are also on the gamekit shelf; whichever ships first takes v0.2.0.
