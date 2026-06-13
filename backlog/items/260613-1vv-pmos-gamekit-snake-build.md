---
schema_version: 1
id: 260613-1vv
kind: story
parent: 260613-v3y
title: Build the /snake skill — single-file classic Snake (speed picker + progressive speed-up, walls-kill + wrap toggle) + tests
type: feature
priority: could
status: planned
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-snake/
plan_doc: docs/pmos/features/2026-06-13_pmos-gamekit-snake/stories/260613-1vv/03_plan.html
tasks: docs/pmos/features/2026-06-13_pmos-gamekit-snake/stories/260613-1vv/tasks.yaml
labels: [pmos-gamekit, snake, game-launcher]
created: 2026-06-13
updated: 2026-06-13
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-1vv -->

## Context

The single (fused) build story for epic `260613-v3y`. There is one new skill (`/snake`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`, released as pmos-gamekit v0.1.0) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/snake.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-13_pmos-gamekit-snake/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). There is **no reference codebase to port** — the engine is built from the documented Snake algorithms (tick/step movement, wall + self collision, food placement with a seedable RNG, growth, progressive speed-up) captured in the design doc.

### No dependency

`dependencies: []` — `pmos-gamekit` + `_shared/game-launcher/` are already released on `main` (v0.1.0), so the build loop can pick this story immediately.

## Acceptance Criteria

- [ ] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/snake/SKILL.md` with `name: snake` (matches dir), launch-only + prompt-free body that resolves `game/snake.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the snake delta (game file, title, controls); no restating the launch contract. Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [ ] **AC2 — Single-file game (D10):** `game/snake.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; board art CSS / Canvas / inline SVG / Unicode; inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [ ] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.SnakeEngine` decoupled from DOM render — `createState({cols,rows,startSpeed,wrap,seed})`, `setDirection` (rejects 180° reverse vs last-applied heading), `step` (move/wrap-or-die/self-collision/eat-grow-score-respawn/board-fill-win), `placeFood` (uniform empty cell), `speedFor` (floored progressive speed-up), `makeRng` (deterministic). No DOM.
- [ ] **AC4 — Difficulty + speed (D3/D4):** a difficulty picker (slow/normal/fast = easy/medium/hard) on new game sets the *starting* tick speed; the snake **accelerates as it grows** — `tickMs` shortens every N foods toward a hard floor; the current speed/level is shown.
- [ ] **AC5 — Wall behavior + food (D5/D6):** walls **kill by default**; an in-game **wrap toggle** (off by default) switches to wrap-around (head reappears on the opposite edge). A single standard food pellet → +1 length + score; bonus/timed food NOT implemented (deferred).
- [ ] **AC6 — Controls (D7):** Arrow keys + WASD + an on-screen D-pad (touch); a direction change applies **at most once per tick**, validated against the last-applied heading, so two fast taps cannot reverse into the neck. **P / Space** pause/resume; **R / N** new game.
- [ ] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/snake.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [ ] **AC8 — End states + polish (D8):** wall/self collision → game-over overlay with the final score + a restart affordance; board-fill → win celebration + confetti; live score + snake length + a *session* high score (D9, no persistence); responsive (laptop + phone); accessible (ARIA on controls, visible focus, never color-alone, `prefers-reduced-motion` honored); no console errors on load (inline favicon).
- [ ] **AC9 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/snake.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: initial-state validity (snake length, food on an empty non-snake cell); `setDirection` rejects a 180° reverse, accepts a 90° turn; `step` advances the head in the queued direction; wall death (wrap off) at an edge; wrap (wrap on) reappears opposite + keeps playing; self-collision death; eating food grows +1, increments score, respawns food on an empty non-snake cell; `speedFor` strictly decreases and is floored; board-fill on a tiny fixture → `'won'`; deterministic RNG for a fixed seed. Exit 0/1 with a `--selftest` count assertion.
- [ ] **AC10 — Dogfood + Playwright e2e + compliance:** the load-bearing dogfood (real play through the launcher, independent blind judge, cap-2 fix loop) AND the **required, not-deferred** Playwright e2e (key presses advance the head, food eaten increments score + grows, a wall collision shows the game-over overlay, restart yields a fresh game, zero console errors, screenshot evidence; the board-fill win reached via a tiny-board test hook or recorded as a narrow loud defer); `skill-eval-check.sh` ≥ 43/47; the 4 hygiene lints green; zero external runtime deps + single-file contract held. No release-prereq work here (the minor bump, changelog, tag are `/complete-dev`'s at Loop 3).
