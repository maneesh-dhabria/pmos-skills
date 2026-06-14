---
schema_version: 1
id: 260613-1vv
kind: story
parent: 260613-v3y
title: Build the /snake skill — single-file classic Snake (speed picker + progressive speed-up, walls-kill + wrap toggle) + tests
type: feature
priority: could
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-snake/
plan_doc: docs/pmos/features/2026-06-13_pmos-gamekit-snake/stories/260613-1vv/03_plan.html
tasks: docs/pmos/features/2026-06-13_pmos-gamekit-snake/stories/260613-1vv/tasks.yaml
labels: [pmos-gamekit, snake, game-launcher]
worktree: feat/260613-1vv
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-13
updated: 2026-06-15
build_commit: 056dda7
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-1vv -->

## Context

The single (fused) build story for epic `260613-v3y`. There is one new skill (`/snake`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`, released as pmos-gamekit v0.1.0) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/snake.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-13_pmos-gamekit-snake/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). There is **no reference codebase to port** — the engine is built from the documented Snake algorithms (tick/step movement, wall + self collision, food placement with a seedable RNG, growth, progressive speed-up) captured in the design doc.

### No dependency

`dependencies: []` — `pmos-gamekit` + `_shared/game-launcher/` are already released on `main` (v0.1.0), so the build loop can pick this story immediately.

## Acceptance Criteria

- [x] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/snake/SKILL.md` with `name: snake` (matches dir), launch-only + prompt-free body that resolves `game/snake.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the snake delta (game file, title, controls); no restating the launch contract. Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [x] **AC2 — Single-file game (D10):** `game/snake.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; board art CSS / Canvas / inline SVG / Unicode; inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [x] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.SnakeEngine` decoupled from DOM render — `createState({cols,rows,startSpeed,wrap,seed})`, `setDirection` (rejects 180° reverse vs last-applied heading), `step` (move/wrap-or-die/self-collision/eat-grow-score-respawn/board-fill-win), `placeFood` (uniform empty cell), `speedFor` (floored progressive speed-up), `makeRng` (deterministic). No DOM.
- [x] **AC4 — Difficulty + speed (D3/D4):** a difficulty picker (slow/normal/fast = easy/medium/hard) on new game sets the *starting* tick speed; the snake **accelerates as it grows** — `tickMs` shortens every N foods toward a hard floor; the current speed/level is shown.
- [x] **AC5 — Wall behavior + food (D5/D6):** walls **kill by default**; an in-game **wrap toggle** (off by default) switches to wrap-around (head reappears on the opposite edge). A single standard food pellet → +1 length + score; bonus/timed food NOT implemented (deferred).
- [x] **AC6 — Controls (D7):** Arrow keys + WASD + an on-screen D-pad (touch); a direction change applies **at most once per tick**, validated against the last-applied heading, so two fast taps cannot reverse into the neck. **P / Space** pause/resume; **R / N** new game.
- [x] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/snake.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [x] **AC8 — End states + polish (D8):** wall/self collision → game-over overlay with the final score + a restart affordance; board-fill → win celebration + confetti; live score + snake length + a *session* high score (D9, no persistence); responsive (laptop + phone); accessible (ARIA on controls, visible focus, never color-alone, `prefers-reduced-motion` honored); no console errors on load (inline favicon).
- [x] **AC9 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/snake.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: initial-state validity (snake length, food on an empty non-snake cell); `setDirection` rejects a 180° reverse, accepts a 90° turn; `step` advances the head in the queued direction; wall death (wrap off) at an edge; wrap (wrap on) reappears opposite + keeps playing; self-collision death; eating food grows +1, increments score, respawns food on an empty non-snake cell; `speedFor` strictly decreases and is floored; board-fill on a tiny fixture → `'won'`; deterministic RNG for a fixed seed. Exit 0/1 with a `--selftest` count assertion.
- [x] **AC10 — Dogfood + Playwright e2e + compliance:** the load-bearing dogfood (real play through the launcher, independent blind judge, cap-2 fix loop) AND the **required, not-deferred** Playwright e2e (key presses advance the head, food eaten increments score + grows, a wall collision shows the game-over overlay, restart yields a fresh game, zero console errors, screenshot evidence; the board-fill win reached via a tiny-board test hook or recorded as a narrow loud defer); `skill-eval-check.sh` ≥ 43/47; the 4 hygiene lints green; zero external runtime deps + single-file contract held. No release-prereq work here (the minor bump, changelog, tag are `/complete-dev`'s at Loop 3).

## Build Notes (Loop 2 — 2026-06-15)

BUILT on `feat/260613-1vv`, build commit `056dda7`. route:skill. All 10 ACs verified.

- **Three files, one new skill:** `plugins/pmos-gamekit/skills/snake/{SKILL.md, game/snake.html, tests/run.mjs}`. The `_shared/game-launcher/` machinery is consumed unchanged (no substrate edits). Modeled on the shipped `/solitaire` (engine-on-a-global pattern, vm-extract selftest, launch-only SKILL.md).
- **Engine (`window.SnakeEngine`):** pure, DOM-decoupled, timer-free — `createState/setDirection/step/placeFood/speedFor/makeRng`. `setDirection` rejects a 180° reverse vs the **last-applied** heading (not a queued one) so a double back-tap can't self-kill. `step` handles wrap-or-die at edges, self-collision with the tail-tip exception (the vacating tail cell is not a collision when not eating), eat→grow+score+respawn, and board-fill→`'won'`. `speedFor` = `max(60, round(start·0.92^foods))` — monotone, floored. `makeRng` = mulberry32 so tests pin food/outcomes.
- **UI/render layer:** Canvas board; difficulty picker (Slow 180 / Normal 130 / Fast 90 ms start) + off-by-default wrap toggle on the start screen; `setInterval` re-armed to `tickMs` on every speed change; arrows + WASD + on-screen D-pad steering; P/Space pause, R/N new game; HUD score/length/live-speed-level/session-best; game-over + board-fill (confetti) overlays; ARIA, visible focus, `prefers-reduced-motion`; inline data-URI snake favicon (the `/solitaire` 404 lesson — **0 console errors**).
- **Phase 6a /skill-eval (route:skill, hard):** `[D]` **16/16 pass, 0 fail**, no residuals (`a-name-matches-dir` = `snake`, NI block byte-identical, flag-contract + phase-refs clean). `[J]` judgment criteria satisfied (faithful launcher citation, deltas-only body, no flag drift).
- **Phase 7 /verify GREEN:** `node tests/run.mjs --selftest` → **20/20**; 4 hygiene lints (`lint-non-interactive-inline`, `audit-recommended`, `lint-flags-vs-hints`, `lint-phase-refs`) all PASS; single-file contract held (no external refs / all inline + data-URI).
- **AC10 dogfood + Playwright e2e (load-bearing, TN−1):** launched the real game through `serve.js` on `http://127.0.0.1:61812/` (HTTP 200), drove it in Chromium. Proved live — head advances per tick (deterministic), steering via setDirection, **real `ArrowRight` keydown** turns the snake, eat→length 3→4 + score 0→10 (HUD updated), wall→`status:'over'` + game-over overlay + final score, restart→fresh playing game, and the **board-fill win** on a seeded 2×2 board→`status:'won'` + win overlay + 80 confetti nodes; **0 console errors**. To keep single-step assertions from being raced by the live `setInterval`, the e2e used a test-only `window.__SNAKE_TEST__` freeze/step hook (no user input path mutates board size or bypasses the loop). Evidence: `stories/260613-1vv/dogfood/{EVIDENCE.md, snake-midgame.png}`.

**Next (Loop 3):** `/complete-dev --epic 260613-v3y` — pmos-gamekit minor bump (new skill, v0.1.0 → v0.2.0).
