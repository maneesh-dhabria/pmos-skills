---
schema_version: 1
id: 260617-ks1
kind: story
parent: 260617-bx0
title: "/solitaire first-run fixes batch — header wording, per-game card backs, idle auto-hint, no-moves detection, draw animation"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-gamekit
status: done
feature_folder: docs/pmos/features/2026-06-17_solitaire-fixes/
plan_doc: docs/pmos/features/2026-06-17_solitaire-fixes/stories/260617-ks1/03_plan.html
tasks: docs/pmos/features/2026-06-17_solitaire-fixes/stories/260617-ks1/tasks.yaml
worktree: .claude/worktrees/feat-260617-ks1
claimed_by: build:loop-main
driver_holder: build:loop-main
build_branch: feat/260617-ks1
build_commit: e5a4385
labels: [pmos-gamekit, solitaire, polish]
created: 2026-06-17
updated: 2026-06-18
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-ks1 -->

## Context

The whole epic (260617-bx0) is one story: all five fixes (F1–F5) edit the single self-contained game file
`plugins/pmos-gamekit/skills/solitaire/game/solitaire.html` (+ `tests/run.mjs` selftests, + minimal `SKILL.md`
copy). Decisions, FRs, and invariants are in the `design_doc:` (../../02_design.html). One `/execute` run.

## Acceptance Criteria

- **AC1 (F1, header):** `<h1>` reads "Solitaire" with no "· Klondike" suffix; `<title>` reads "Solitaire". Klondike rules unchanged. (FR1)
- **AC2 (F2, card backs):** ~6 curated, self-contained back covers bundled; one chosen at random per new game, uniform across face-down cards, fixed for the game's duration; no external assets/network. (FR2, D2/D3)
- **AC3 (F3, idle hint):** a shared engine finder returns the first *productive* legal move; after ~8s idle the source card is outlined via the existing `.hint` style, cleared on interaction; manual `H` reuses the finder; re-arms on activity; paused on win / no-moves. (FR3, D4)
- **AC4 (F4, no-moves):** pure exported `hasProductiveMove(state)` + `isDeadlocked(state)` (full stock-cycle scan); when deadlocked and not won, a non-blocking "No moves left — deal a new game?" banner appears with a New-game action; never on a winnable position; cleared on new game. (FR4, D6)
- **AC5 (F5, draw anim):** drawing animates the card from the stock pile to the top of the waste fan with the fan easing into place (no jarring reflow); interruptible, never blocks input, rapid draws degrade cleanly, final DOM equals a plain re-render; honors `prefers-reduced-motion`. (FR5, D5)
- **AC6 (invariants):** engine stays pure + browser-agnostic; new helpers exported and covered in `tests/run.mjs`; all cosmetic features (back choice, hint, banner, animation) never mutate `state` or enter undo/history; `?test=nearwin` + win animation still work. (Inv-1..Inv-5)
- **AC7 (skill conformance):** `SKILL.md` + game conform to `skill-patterns.md §A–§L` and the host `CLAUDE.md` (canonical skill path, gamekit launch contract). No version-bump/changelog/README tasks here — those are `/complete-dev`'s.
