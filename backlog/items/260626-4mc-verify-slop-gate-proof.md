---
schema_version: 1
id: 260626-4mc
kind: story
title: "/verify — Slop gate skip-branch proof-of-execution: surface the runner line, tie ran-vs-skipped to the JSON report + exit code, never narrative"
type: enhancement
priority: should
status: planned
route: skill
parent: 260626-804
dependencies: []
worktree:
plan_doc: docs/pmos/features/2026-06-26_slop-engine-proof-of-execution/stories/260626-4mc/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_slop-engine-proof-of-execution/stories/260626-4mc/tasks.yaml
claimed_by: build:e385ea38
driver_holder: build:e385ea38
pr:
labels: [pmos-toolkit, verify, slop-engine, quality-gate]
created: 2026-06-26
updated: 2026-06-26
---

## Context

Close the milder skip-by-assertion variant in `plugins/pmos-toolkit/skills/verify/SKILL.md`'s Slop gate. The
verdict is ALREADY exit-code-driven (`scripts/slop-gate.mjs` exit `2` = `[Blocker]` fires) — only the SKIP
branch is narrative. The engine (`_shared/slop-engine/`) and the runner (`verify/scripts/slop-gate.mjs`) are
**unchanged**; SKILL.md instructions only.

Epic design: `docs/pmos/features/2026-06-26_slop-engine-proof-of-execution/02_design.html` (§7 Story B).
Cross-skill invariants: I1, I2, I3, I5 (see design §4).

## Acceptance Criteria

- [ ] **B1:** The Slop-gate phase MUST surface the runner's literal output line before recording the verdict —
  the run-summary (`[slop-gate] … GATE FIRES …` / `… no quality blocker; slop advisory only`) or the skip-note
  (`[slop-gate] slop gate skipped — engine/parser unavailable: <reason>`).
- [ ] **B1:** "Ran vs skipped" is keyed to the JSON report's `ran`/`skipped` field AND the exit code, never to
  narrative; a skip is recorded ONLY when the runner emitted its skip-note (`ran==false`/`skipped==true`) or
  exited in the skip path. An anti-pattern forbids claiming the gate skipped / the engine is unavailable
  without the runner's skip-note.
- [ ] **B1:** The exit-code-driven PASS condition is unchanged (zero unfixed `[Blocker]` quality faults
  whenever the gate ran); the runner output contract is cited from design §5 (one-home §K), not restated.
- [ ] Engine + `scripts/slop-gate.mjs` unchanged; `slop-gate.test.mjs` stays green.
- [ ] Conforms to `skill-patterns.md §A–§L`; non-interactive block stays inline byte-identical (I5);
  skill-eval `[D]`+`[J]` pass; 4 lints + audit green; phase-ref anchors resolve.
- [ ] Load-bearing dogfood: show the run-summary (+ JSON `ran:true`) AND a forced skip-note (+ JSON
  `skipped:true`).
