---
schema_version: 1
id: 260614-yb7
kind: story
parent: 260614-nvh
title: Build the /flappy-bird skill — single-file one-button arcade game (Easy/Normal/Hard, gravity+flap physics, constant-difficulty run) + tests
type: feature
priority: could
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_pmos-gamekit-flappy-bird/
plan_doc: docs/pmos/features/2026-06-14_pmos-gamekit-flappy-bird/stories/260614-yb7/03_plan.html
tasks: docs/pmos/features/2026-06-14_pmos-gamekit-flappy-bird/stories/260614-yb7/tasks.yaml
labels: [pmos-gamekit, flappy-bird, game-launcher]
claimed_by: build:flappy-yb7-loop
driver_holder: build:flappy-yb7-loop
worktree: feat/260614-yb7
build_commit: fab2132
created: 2026-06-14
updated: 2026-06-15
---

<!-- status: planned at define (Loop 1) → done at build (Loop 2, 2026-06-15). branch feat/260614-yb7: build d67baac (SKILL.md + game/flappy-bird.html + tests/run.mjs) + dogfood fab2132. Release prereqs (v0.2.0 bump, changelog, tag) are /complete-dev's at Loop 3 — NOT story tasks. -->

## Context

The single (fused) build story for epic `260614-nvh`. There is one new skill (`/flappy-bird`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`, released as pmos-gamekit v0.1.0) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/flappy-bird.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-14_pmos-gamekit-flappy-bird/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). There is **no reference codebase to port** — the engine is built from the documented physics (gravity + fixed flap impulse, pipe lifecycle, AABB collision) captured in the design doc.

### No dependency

`dependencies: []` — `pmos-gamekit` + `_shared/game-launcher/` are already released on `main` (v0.1.0), so the build loop can pick this story immediately.

## Acceptance Criteria

- [x] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/flappy-bird/SKILL.md` with `name: flappy-bird` (matches dir), launch-only + prompt-free body that resolves `game/flappy-bird.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the flappy-bird delta (game file, title, one-button controls); no restating the launch contract. Canonical NI inline block added (the prompt-free /solitaire requires it; `lint-non-interactive-inline.sh` expects it).
- [x] **AC2 — Single-file game (D10):** `game/flappy-bird.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; bird/pipe/ground art via Canvas 2D / CSS / inline SVG; inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [x] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.FlappyEngine` decoupled from DOM render — `createState({width,height,difficulty,seed})`, `difficultyParams(level)`, `flap(state)`, `step(state, dt)`, `spawnPipe(state, rng)`, `collides(state)`, `makeRng(seed)`. Stepped by an explicit `dt` (no real-time/Date dependency in the engine) so tests are deterministic.
- [x] **AC4 — Physics + difficulty (D3/D4/D5):** gravity integrates `vy` then `y`; a flap sets a fixed upward impulse; the ceiling clamps (no top-death), the ground and pipes are lethal. An Easy/Normal/Hard picker on new game sets gap height + scroll speed (easy = wider/slower → hard = narrower/faster) and those hold **constant for the whole run** (no in-run ramp). Physics is frame-rate independent (fixed-timestep accumulator feeding `step(dt)`).
- [x] **AC5 — Pipes + scoring (D7):** pipes scroll left at the difficulty speed, spawn at a fixed horizontal spacing with a random `gapY` (seedable), and are culled off-screen; clearing a pipe pair scores +1 **exactly once** (no double-count on subsequent frames); live score + a session high score shown.
- [x] **AC6 — Controls + end states (D6/D8):** Space / ↑ / mouse click / touch tap all flap; P pause/resume; R / N new game; first flap starts the run. Pipe/ground collision → game-over overlay with final score + session best + restart; a new session best fires a small celebratory flourish (reuse /solitaire's win pattern). **No medals** (minimal v1).
- [x] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/flappy-bird.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [x] **AC8 — Polish + table-stakes UX:** large legible live score; start screen with the difficulty picker + "tap/Space to start"; pause overlay; responsive scaling (laptop + phone, portrait-ish stage); keyboard + mouse + touch input; accessible (ARIA on picker/restart, visible focus, never color-alone for state, `prefers-reduced-motion` honored for the flourish); no console errors on load; no external network refs.
- [x] **AC9 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/flappy-bird.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: initial-state validity (bird centered, `status:'ready'`, params resolved from difficulty); `flap` sets upward velocity + `ready→playing`; gravity makes `vy`/`y` grow on repeated `step`; flap→rise-then-fall arc; ceiling clamp (`y` never above radius, no top-death); ground death; pipe-rect collision → `over`; scoring increments exactly once per pipe (second step past same pipe does not re-count); pipe lifecycle (scroll, cull off-screen, spawn at spacing); difficulty bands (`easy.pipeGap>normal>hard`, `easy.pipeSpeed<normal<hard`); deterministic RNG (same seed → same gap sequence). Exit 0/1 with a `--selftest` count assertion.
- [x] **AC10 — Dogfood + Playwright e2e + compliance:** the load-bearing dogfood (real play through the launcher — each difficulty, flap via Space/click/tap, pipes threaded, death on pipe + ground, session-best flourish; independent blind judge; cap-2 fix loop) AND the **required, not-deferred** Playwright e2e (flap input → bird y responds, a passed pipe → score increment, a forced collision → game-over overlay, restart → fresh game, zero console errors, screenshot evidence); `skill-eval-check.sh` ≥ 43/47; the 4 hygiene lints green; zero external runtime deps + single-file contract held. No release-prereq work here (the v0.2.0 bump, changelog, tag are `/complete-dev`'s at Loop 3).

## Build Notes (Loop 2 — 2026-06-15)

Built via `/feature-sdlc build --next --non-interactive` (hourly `/loop` tick). route:skill inner pipeline: skill-tier-resolve → /execute → /skill-eval (hard) → /verify. No reference codebase — `window.FlappyEngine` built from the design doc's documented physics (gravity + fixed flap impulse, pipe lifecycle, circle-rect collision).

- **Files:** `plugins/pmos-gamekit/skills/flappy-bird/{SKILL.md, game/flappy-bird.html, tests/run.mjs}`. Single-file game (D10): all CSS/JS inline, inline data-URI favicon, engine on a DOM/rAF/timer-decoupled global, explicit-`dt` `step()` (no Date/wall-clock), seedable mulberry32. Launch-only SKILL.md cites `_shared/game-launcher/`, prompt-free, byte-identical NI block.
- **Engine selftest:** `tests/run.mjs --selftest` → **47/47** (vm-extract; `EXPECTED_CHECKS=47`). Gates: initial state, difficulty bands (gap 200>162>132, speed 118<150<188), flap, gravity/arc, ceiling clamp (non-lethal), ground death, pipe-rect collision, score-exactly-once, pipe lifecycle, deterministic RNG.
- **Verify gates GREEN:** skill-eval-check `[D]` exit 0 (17/17, **no accepted residuals**), 4 hygiene lints PASS, single-file contract held, zero external runtime refs.
- **Live Playwright e2e (all PASS):** real Space→ready→playing (vy −402); rise-then-fall arc (320→260→310); autopilot threaded a pipe→score 0→1; forced ground collision→game-over overlay; real R→fresh game (ready, score 0, bird recentered y=320); session best persists; new-best flourish (40 sparks); difficulty bands distinct; real P→pause overlay; **0 console errors**. 3 screenshots in `stories/260614-yb7/dogfood/`.
- **Blind judge:** VERDICT **SHIP**, 5·5·5·5·5, **zero real code defects**; 5 informational/out-of-scope observations → `accepted_residuals = []`, no cap-2 fix loop needed.
- **Commits:** branch `feat/260614-yb7` — build `d67baac`, dogfood `fab2132`. Worktree KEPT for Loop 3.
- **Next (Loop 3, NOT this story):** `/complete-dev --epic 260614-nvh` → pmos-gamekit minor bump (v0.2.0 — whichever gamekit story ships first takes it).
