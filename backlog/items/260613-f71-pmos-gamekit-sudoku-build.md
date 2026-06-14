---
schema_version: 1
id: 260613-f71
kind: story
parent: 260613-e35
title: Build the /sudoku skill — single-file classic 9×9 (easy/medium/hard, hints, pencil notes, on-demand check) + tests
type: feature
priority: could
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/
plan_doc: docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/stories/260613-f71/03_plan.html
tasks: docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/stories/260613-f71/tasks.yaml
labels: [pmos-gamekit, sudoku, game-launcher]
worktree: feat/260613-f71
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-13
updated: 2026-06-15
build_commit: 3ef2977
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-f71 -->

## Context

The single (fused) build story for epic `260613-e35`. There is one new skill (`/sudoku`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`, released as pmos-gamekit v0.1.0) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/sudoku.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-13_pmos-gamekit-sudoku/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). Unlike `/poker`, there is **no reference codebase to port** — the engine is built from the documented algorithms (unique-solution dig-and-count generation; a technique-grading logical solver) captured in the design doc and the define-time research.

### No dependency

`dependencies: []` — `pmos-gamekit` + `_shared/game-launcher/` are already released on `main` (v0.1.0), so the build loop can pick this story immediately.

## Acceptance Criteria

- [x] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/sudoku/SKILL.md` with `name: sudoku` (matches dir), launch-only + prompt-free body that resolves `game/sudoku.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the sudoku delta (game file, title); no restating the launch contract. Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [x] **AC2 — Single-file game (D10):** `game/sudoku.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; board art CSS + inline SVG/Unicode; inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [x] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.SudokuEngine` decoupled from DOM render — `makeSolvedGrid`, `countSolutions` (cap 2), `generate` (dig-and-count to a unique solution), the technique solver (naked/hidden singles, locked candidates, naked/hidden pairs, X-Wing), `grade`, `nextHint`, `conflicts`, `solutionErrors`, `candidatesFor` + notes helpers. Seedable RNG for deterministic tests.
- [x] **AC4 — Difficulty + generation (D3/D4/D5):** classic 9×9; a difficulty picker (easy/medium/hard) on new game; each puzzle generated at runtime with a **guaranteed unique solution** (count-up-to-2 after every dig) and **graded by hardest technique** (singles→easy; locked candidates/pairs→medium; X-Wing+→hard); a brief "generating…" state for the hard tier; clue count secondary.
- [x] **AC5 — Notes + hints (D6/D8):** Notes mode toggle (N / pencil button); candidates in a fixed 3×3 sub-grid; one-tap auto-fill candidates; placing a value auto-clears that digit from peers' notes. Tiered Hint — highlight the next cell + name the technique, then reveal the value (reuses the solver).
- [x] **AC6 — Error checking (D7):** a Check button reveals solution-deviations **only when pressed**; row/col/box duplicates **always highlighted live**; an **opt-in auto-check** toggle off by default. Conflict vs solution-deviation kept distinct — an empty-but-later-correct cell is never flagged.
- [x] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/sudoku.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [x] **AC8 — Polish + table-stakes UX:** selected-cell + peer highlight (row/col/box) + same-number highlight; number pad with remaining-count badges; undo/redo (session); timer with pause; optional mistake counter; keyboard (arrows, 1–9, Delete/Backspace, N, H, C); win detection + confetti; responsive (laptop + phone); accessible (ARIA per cell, never color-alone for errors).
- [x] **AC9 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/sudoku.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: solved-grid validity (rows/cols/boxes 1–9); uniqueness (`countSolutions`==1, under-constrained ≥2); generation bands + the dug puzzle's solution matches the source; each technique on a fixture; grading (singles→easy, X-Wing→hard); `conflicts` flags a duplicate & passes a clean board; `solutionErrors` flags a wrong filled cell, passes a correct partial, ignores empty; `candidatesFor` returns the legal set & placement clears peers; `nextHint` returns a legal step. Exit 0/1 with a `--selftest` count assertion.
- [x] **AC10 — Dogfood + Playwright e2e + compliance:** the load-bearing dogfood (real play through the launcher, independent blind judge, cap-2 fix loop) AND the **required, not-deferred** Playwright e2e (pad+keyboard entry, a notes candidate, Check distinguishing wrong-vs-empty, a named-cell Hint, a win, zero console errors, screenshot evidence); `skill-eval-check.sh` ≥ 43/47; the 4 hygiene lints green; zero external runtime deps + single-file contract held. No release-prereq work here (the v0.2.0 bump, changelog, tag are `/complete-dev`'s at Loop 3).

## Build Notes (Loop 2 — 2026-06-15)

BUILT on `feat/260613-f71`, build commit `3ef2977`. route:skill. All 10 ACs verified.

- **Three files, one new skill:** `plugins/pmos-gamekit/skills/sudoku/{SKILL.md, game/sudoku.html, tests/run.mjs}`. The `_shared/game-launcher/` machinery is consumed unchanged. Modeled on the shipped `/solitaire` + `/snake` (engine-on-a-global, vm-extract selftest, launch-only SKILL.md, inline data-URI favicon).
- **Engine (`window.SudokuEngine`):** pure, DOM-decoupled, deterministic given a seeded RNG. `makeSolvedGrid` (randomized backtracking), `countSolutions(grid, cap=2)` (MRV backtracking, aborts at the 2nd solution — uniqueness, never full enumeration), `generate(difficulty, rng)` (dig-one-cell-at-a-time, keep removal only if still unique AND still within the tier's technique ceiling), a six-technique grading solver (`nakedSingle`/`hiddenSingle` → easy, `lockedCandidate`/`nakedPair`/`hiddenPair` → medium, `xWing`/`xyWing` → hard), `grade`, `nextHint`, `conflicts`, `solutionErrors` (never flags empties), `candidatesFor`/`candidatesAt`, `makeRng` (mulberry32).
- **Difficulty mapping (faithful to D4):** technique grade is authoritative. **XY-Wing was added beyond the design's literal "X-Wing" list** because X-Wing-required puzzles are genuinely rare (<1/200 attempts) — "X-Wing **or deeper**" (per the design) includes XY-Wing, so the hard tier is reliably generatable. Verified live: **30 seeds × 3 difficulties → 90/90 grade-match, 0 degraded, every puzzle unique** (easy 40 givens via an early-stop floor for friendliness; medium 22–27; hard 23–27). Generation is fast (selftest 0.24s).
- **UI/render layer:** 9×9 `<table>` with thick 3×3 box borders; difficulty picker + "generating…" spinner; selected-cell + 20-peer + same-digit highlighting (never color-alone — selection also carries an inset border); number pad with remaining-count badges; Notes mode + Auto-notes (auto-clear placed digit from peers' notes); on-demand Check + always-on conflict highlighting + opt-in Auto-check (off by default); tiered Hint (names the technique, reveals the value); undo/redo; timer with pause; mistake counter; full keyboard (arrows/1–9/Delete/N/H/C/Space); win + 90-confetti (honors `prefers-reduced-motion`); ARIA per cell.
- **Phase 6a /skill-eval (route:skill, hard):** `[D]` **16/16 pass, 0 fail**, no residuals (`a-name-matches-dir` = `sudoku`, NI block byte-identical to `/solitaire`'s, flag-contract + phase-refs clean). EXIT 0.
- **Phase 7 /verify GREEN:** `node tests/run.mjs --selftest` → **29/29** (vm-extract, `EXPECTED_CHECKS=29`); 4 hygiene lints (`lint-non-interactive-inline`, `audit-recommended`, `lint-flags-vs-hints`, `lint-phase-refs`) all PASS; single-file contract held (no external refs / all inline + data-URI).
- **AC10 dogfood + Playwright e2e (load-bearing, TN−1):** launched the real game through `serve.js` on `http://127.0.0.1:62180/` (HTTP 200), drove it in Chromium. Proved live — Easy game generates (40 givens, unique); cell entry incl. **real `8` keydown**; arrow-key nav; pencil notes render in the 3×3 sub-grid; Auto-notes fills every empty; **Check flags a wrong cell but NOT a correct one or an empty one** (D7); Hint reveals a solution-correct step (`R3C2 has only one candidate (3)`); **hard game live-generates** at grade `hard`; **win → overlay + 90 confetti**; **0 console errors**. Evidence: `stories/260613-f71/dogfood/{EVIDENCE.md, sudoku-hard-autonotes.png}`.
- **Live bug caught + fixed (cap-2, 1 of 2 used):** clicking **New** after a win left the win overlay intercepting pointer events; fixed `btn-new` to hide `winEl` before showing the start screen. Re-verified live.

**Next (Loop 3):** `/complete-dev --epic 260613-e35` — pmos-gamekit minor bump (new skill). Per `/snake` (260613-v3y) also being on the shelf, whichever ships first is v0.2.0.
