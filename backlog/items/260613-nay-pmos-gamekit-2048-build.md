---
schema_version: 1
id: 260613-nay
kind: story
parent: 260613-c9q
title: Build the /2048 skill — single-file classic 2048 (board-size picker + one-step undo + keep-playing past 2048) + tests
type: feature
priority: could
status: planned
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
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-nay -->

## Context

The single (fused) build story for epic `260613-c9q`. There is one new skill (`/2048`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`, released as pmos-gamekit v0.1.0) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/2048.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-14_pmos-gamekit-2048/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). There is **no reference codebase to port** — the engine is built from the documented 2048 algorithm (compress → merge-once → compress → spawn; spawn 2@90%/4@10% on a uniform empty cell via a seedable RNG; win at 2048; game-over when no slide and no merge in any direction) captured in the design doc.

### No dependency

`dependencies: []` — `pmos-gamekit` + `_shared/game-launcher/` are already released on `main` (v0.1.0), so the build loop can pick this story immediately.

## Acceptance Criteria

- [ ] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/2048/SKILL.md` with `name: "2048"` (matches dir), launch-only + prompt-free body that resolves `game/2048.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the 2048 delta (game file, title, controls); no restating the launch contract. The digit-leading directory name `2048` is accepted by the loader + a-name-matches-dir (frontmatter name is the quoted string `"2048"`). Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [ ] **AC2 — Single-file game (D10):** `game/2048.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; CSS-only tile art (classic 2048 colour ramp); inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [ ] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.Game2048Engine` decoupled from DOM render — `makeRng(seed)` (deterministic), `createState({size,seed})` (two starting tiles), `move(state,dir)` (size-generic compress → merge-once → compress → pad; returns moved/gained/spawned), `spawnTile` (2@90%/4@10% on a uniform empty cell), `canMove`, `hasWon` (≥2048). No DOM, no timers.
- [ ] **AC4 — Board size + win (D3/D4):** a board-size picker (4×4/5×5/6×6) on new game; the win threshold is a constant 2048 on every size; first 2048 → a win celebration + confetti with **Keep playing** to continue, plus New game.
- [ ] **AC5 — Move + undo (D5/D6):** one tile spawns per *changed* move (2@90%/4@10%); a no-op move spawns nothing and consumes no turn; the merge-once invariant holds in all four directions; a **one-deep undo** reverts board + score + spawn and is disabled at game start and right after an undo (no undo stack).
- [ ] **AC6 — Controls (D7):** Arrow keys + WASD + pointer-**swipe** (dominant drag axis past a threshold, `preventDefault` so the page doesn't scroll) + an on-screen **D-pad**, all mapping to the four moves. **U** undo; **R / N** new game; **Esc** closes overlays.
- [ ] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/2048.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [ ] **AC8 — End states + polish (D8):** board full with no possible move → a game-over overlay with the final score + a restart affordance; 2048 → a win celebration + confetti + Keep playing; live score + move count + a *session* best (D9, no persistence); responsive (laptop + phone); accessible (ARIA on controls, visible focus, never color-alone, `prefers-reduced-motion` honored; 4-digit tiles fit via font scaling); no console errors on load (inline favicon).
- [ ] **AC9 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/2048.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: initial two tiles in {2,4} + score 0; `[2,2,0,0]`→`[4,0,0,0]` gained 4; merge-once (`[2,2,2,2]`→`[4,4,0,0]` gained 8 NOT `[8,0,0,0]`; `[4,4,4,0]`→`[8,4,0,0]`) across up/down/left/right; a no-op move → moved:false + no spawn + empty-count unchanged; a changed move spawns exactly one tile on a previously-empty cell, value in {2,4}; win detection at 2048; game-over only when no slide AND no merge (full board WITH a neighbour → not over); deterministic RNG for a fixed seed; score == sum of gained. Exit 0/1 with a `--selftest` count assertion.
- [ ] **AC10 — Dogfood + Playwright e2e + compliance:** the load-bearing dogfood (real play through the launcher at every board size + every input path, independent blind judge, cap-2 fix loop) AND the **required, not-deferred** Playwright e2e (key presses change the board + spawn + score; a seeded/tiny-board path reaches the win overlay + Keep playing; a full board shows the game-over overlay; Undo restores the prior board; zero console errors; screenshot evidence; a natural large-board fill may defer loudly); `skill-eval-check.sh` ≥ 43/47; the 4 hygiene lints green; zero external runtime deps + single-file contract held. No release-prereq work here (the minor bump, changelog, tag are `/complete-dev`'s at Loop 3).
