---
schema_version: 1
id: 260613-f71
kind: story
parent: 260613-e35
title: Build the /sudoku skill — single-file classic 9×9 (easy/medium/hard, hints, pencil notes, on-demand check) + tests
type: feature
priority: could
status: planned
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/
plan_doc: docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/stories/260613-f71/03_plan.html
tasks: docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/stories/260613-f71/tasks.yaml
labels: [pmos-gamekit, sudoku, game-launcher]
created: 2026-06-13
updated: 2026-06-13
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-f71 -->

## Context

The single (fused) build story for epic `260613-e35`. There is one new skill (`/sudoku`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`, released as pmos-gamekit v0.1.0) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/sudoku.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). Unlike `/poker`, there is **no reference codebase to port** — the engine is built from the documented algorithms (unique-solution dig-and-count generation; a technique-grading logical solver) captured in the design doc and the define-time research.

### No dependency

`dependencies: []` — `pmos-gamekit` + `_shared/game-launcher/` are already released on `main` (v0.1.0), so the build loop can pick this story immediately.

## Acceptance Criteria

- [ ] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/sudoku/SKILL.md` with `name: sudoku` (matches dir), launch-only + prompt-free body that resolves `game/sudoku.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the sudoku delta (game file, title); no restating the launch contract. Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [ ] **AC2 — Single-file game (D10):** `game/sudoku.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; board art CSS + inline SVG/Unicode; inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [ ] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.SudokuEngine` decoupled from DOM render — `makeSolvedGrid`, `countSolutions` (cap 2), `generate` (dig-and-count to a unique solution), the technique solver (naked/hidden singles, locked candidates, naked/hidden pairs, X-Wing), `grade`, `nextHint`, `conflicts`, `solutionErrors`, `candidatesFor` + notes helpers. Seedable RNG for deterministic tests.
- [ ] **AC4 — Difficulty + generation (D3/D4/D5):** classic 9×9; a difficulty picker (easy/medium/hard) on new game; each puzzle generated at runtime with a **guaranteed unique solution** (count-up-to-2 after every dig) and **graded by hardest technique** (singles→easy; locked candidates/pairs→medium; X-Wing+→hard); a brief "generating…" state for the hard tier; clue count secondary.
- [ ] **AC5 — Notes + hints (D6/D8):** Notes mode toggle (N / pencil button); candidates in a fixed 3×3 sub-grid; one-tap auto-fill candidates; placing a value auto-clears that digit from peers' notes. Tiered Hint — highlight the next cell + name the technique, then reveal the value (reuses the solver).
- [ ] **AC6 — Error checking (D7):** a Check button reveals solution-deviations **only when pressed**; row/col/box duplicates **always highlighted live**; an **opt-in auto-check** toggle off by default. Conflict vs solution-deviation kept distinct — an empty-but-later-correct cell is never flagged.
- [ ] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/sudoku.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [ ] **AC8 — Polish + table-stakes UX:** selected-cell + peer highlight (row/col/box) + same-number highlight; number pad with remaining-count badges; undo/redo (session); timer with pause; optional mistake counter; keyboard (arrows, 1–9, Delete/Backspace, N, H, C); win detection + confetti; responsive (laptop + phone); accessible (ARIA per cell, never color-alone for errors).
- [ ] **AC9 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/sudoku.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: solved-grid validity (rows/cols/boxes 1–9); uniqueness (`countSolutions`==1, under-constrained ≥2); generation bands + the dug puzzle's solution matches the source; each technique on a fixture; grading (singles→easy, X-Wing→hard); `conflicts` flags a duplicate & passes a clean board; `solutionErrors` flags a wrong filled cell, passes a correct partial, ignores empty; `candidatesFor` returns the legal set & placement clears peers; `nextHint` returns a legal step. Exit 0/1 with a `--selftest` count assertion.
- [ ] **AC10 — Dogfood + Playwright e2e + compliance:** the load-bearing dogfood (real play through the launcher, independent blind judge, cap-2 fix loop) AND the **required, not-deferred** Playwright e2e (pad+keyboard entry, a notes candidate, Check distinguishing wrong-vs-empty, a named-cell Hint, a win, zero console errors, screenshot evidence); `skill-eval-check.sh` ≥ 43/47; the 4 hygiene lints green; zero external runtime deps + single-file contract held. No release-prereq work here (the v0.2.0 bump, changelog, tag are `/complete-dev`'s at Loop 3).
