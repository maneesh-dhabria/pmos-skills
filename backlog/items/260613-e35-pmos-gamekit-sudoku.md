---
schema_version: 1
id: 260613-e35
kind: epic
title: pmos-gamekit — /sudoku (classic 9×9, easy/medium/hard, hints, pencil notes, on-demand error check)
type: feature
priority: could
status: released
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/02_design.html
labels: [pmos-gamekit, sudoku, browser-game, game-launcher]
created: 2026-06-13
updated: 2026-06-15
released: 0.3.0
---

## Context

From maintainer request (2026-06-13): add a third game to `pmos-gamekit` — `/sudoku`, a single-player classic 9×9 Sudoku game played in the browser. Same delivery shape as `/solitaire` and the defined `/poker`: a single self-contained HTML file (all CSS+JS embedded, offline, no persistence) launched via the existing `_shared/game-launcher/` serve substrate.

Maintainer's explicit asks: three difficulty modes (easy / medium / hard); hints; "enter working values in a cell" (pencil/candidate notes); "show error for wrong entries **when asked specifically**" (on-demand checking); and a research-grounded build modeled on popular sudoku apps, shipped as a single-file HTML game like `/solitaire`.

Design contract (the cross-skill coherence doc the story cites by anchor): `docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/02_design.html`. Design decisions D4–D8 are grounded in define-time research of Sudoku.com / NYT Sudoku / HoDoKu-style grading and the unique-solution generation literature.

### No blocking dependency

Unlike `/poker` (defined while `pmos-gamekit` was still unreleased), the plugin and `_shared/game-launcher/` are **already released on `main`** as `pmos-gamekit/v0.1.0` (epic `260613-4mw`). `/sudoku` therefore carries **no `dependencies:`** — Loop-2 `/backlog next` can pick the build story immediately. It ships as a minor bump (`v0.2.0`) of the released plugin.

### Maintainer decisions captured at define (2026-06-13)

- **D1 — Delivery: ship a pre-built bundled game** (inherits /solitaire D1). Tested single-file `sudoku.html`; the game *code* is pre-built, *puzzles* are generated at runtime (D5).
- **D2 — Launch: reuse `_shared/game-launcher/` verbatim** (inherits /solitaire D2). Zero-dep Node server + auto-open; Node hard prerequisite; no silent `file://` fallback. Launcher unchanged.
- **D3 — Three difficulty modes: easy / medium / hard.** New game presents a difficulty picker.
- **D4 — Difficulty basis: technique-graded via a deep logical solver** (AskUserQuestion grill — recommended). Rated by the hardest human solving technique a puzzle requires (HoDoKu/SudokuWiki-respected; clue count is secondary). A logical solver (singles → locked candidates → pairs → X-Wing) grades each puzzle; it is dual-purpose — it also powers hints (D6).
- **D5 — Puzzle source: runtime generation with a guaranteed unique solution** (grill — recommended). Full grid → dig holes → verify exactly one solution (count-up-to-2) → grade by technique; regenerate to hit the target tier. Infinite non-repeating puzzles; true single-file (no bundled bank).
- **D6 — Hints: tiered, powered by the logical solver.** Check → auto-fill candidates → next logical step (named technique) → reveal a cell.
- **D7 — Error checking: on-demand Check + always-on conflict highlighting + opt-in auto-check** (grill — recommended). Maps "show errors when asked specifically": Check reveals solution-deviations only when pressed; row/col/box duplicates always highlighted live; auto-check is opt-in, off by default. "Wrong" = conflict (always shown) vs solution-deviation (only on Check) kept distinct.
- **D8 — Pencil marks: notes mode + auto-candidates + auto-clear-from-peers** (grill — recommended). Notes toggle (N), small candidates in a 3×3 sub-grid, one-tap auto-fill, placed value clears that digit from peers' notes.
- **D9 — No persistence** (inherits /solitaire D6). Fresh session each launch; undo within a session only.
- **D10 — Single-file is a hard contract** (inherits /solitaire D7). All CSS/JS embedded; offline; no build step; CSS + Unicode/SVG board art, no image files; engine on a global, decoupled from DOM.
- **D11 — Single plugin / release unit:** lands in `pmos-gamekit`; rides a minor bump (`v0.2.0`).
- **D12 — Singleton epic:** one fused story (skill + bundled game + tests = one vertical slice).

## Acceptance Criteria

- [ ] **No new plugin/substrate:** no plugin scaffold and no launcher changes beyond the routine release version bump (D11) — `serve.js` and `game-launcher.md` consumed unchanged; `/sudoku` cites the substrate and states only its delta.
- [ ] **/sudoku skill:** `plugins/pmos-gamekit/skills/sudoku/SKILL.md` (`name: sudoku` matches dir; launch-only, prompt-free; cites `../_shared/game-launcher/game-launcher.md`) + `game/sudoku.html` (pre-built single-file per D1/D10) + `tests/run.mjs`.
- [ ] **Game correctness:** classic 9×9; three difficulties via runtime generation with a **guaranteed unique solution** (D5) and **technique-based grading** (D4); pencil notes with auto-candidates + auto-clear (D8); tiered hints (D6); on-demand Check + always-on conflict highlighting + opt-in auto-check (D7). Single file, offline, no persistence.
- [ ] **Testability (single-file AND testable):** the embedded script exposes a pure-logic engine on `window.SudokuEngine` (solved-grid builder, solution-counter, generator, technique solver, grader, hint, conflicts, solutionErrors, candidates) decoupled from rendering; `tests/run.mjs --selftest` extracts + evaluates it and asserts objective gates (solved-grid validity; uniqueness ==1 and cap-hit ≥2; generation bands + solution match; each technique on a fixture; grading singles→easy / X-Wing→hard; conflict detection; solutionErrors flags wrong & passes correct partial & ignores empty; candidate compute + auto-clear; a legal nextHint); exit 0/1 with a count assertion.
- [ ] **Launch works:** `serve.js game/sudoku.html` binds a free localhost port, serves the file, opens the browser, prints the URL; missing-Node yields the clear actionable error (D2).
- [ ] **Dogfood (load-bearing):** real puzzles are played through the launcher — each difficulty generated; pad + keyboard entry; notes + auto-candidates; Check distinguishing wrong-entry from empty-but-correct; a hint; a win; independent blind judge confirms responsive + frustration-free; gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
- [ ] **Playwright end-to-end (required final-verification gate):** Playwright drives the real served game — difficulty picked, pad + keyboard entry asserted, a notes candidate placed, Check flags a wrong cell but not a correct one, a Hint highlights the named cell, a win celebration reached, zero console errors — with a screenshot as evidence. Maintainer-mandated; not deferred (Playwright provisioned locally if absent; only narrow named sub-checks may defer, surfaced loudly).
- [ ] **Conventions:** `/sudoku` passes `skill-eval.md` (floor 43/47) + repo `CLAUDE.md` (canonical path, manifest version-sync, §H–§L); zero external runtime dependencies (Node stdlib only for launcher + tests); repo hygiene lints green where applicable.
- [ ] **Single plugin (D11):** all changes land in `pmos-gamekit`; release is a minor bump (`v0.2.0`).

## Stories

- `260613-f71` — Build the `/sudoku` skill (SKILL.md + bundled `game/sudoku.html` + `tests/run.mjs`). route: skill. deps: none. *(fused singleton — load-bearing)*
