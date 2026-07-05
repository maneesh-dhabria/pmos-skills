---
schema_version: 1
id: 260705-vr5
title: "/wayrttd standalone skill — five-step solution→problem inversion ladder (capture X → climb to intent → name Problem Y → re-test X → verdict), first-person POV, compact HTML capture, NL-first + non-interactive contract"
type: feature
kind: story
status: in-progress
route: skill
priority: should
labels: [pmos-toolkit, wayrttd, thinking-tool, skill]
created: 2026-07-05
updated: 2026-07-06
parent: 260705-x92
dependencies: []
design_doc: docs/pmos/features/2026-07-05_wayrttd-skill/02_design.html
plan_doc: docs/pmos/features/2026-07-05_wayrttd-skill/stories/260705-vr5/03_plan.html
feature_folder: docs/pmos/features/2026-07-05_wayrttd-skill/
worktree: .claude/worktrees/feat-260705-vr5
claimed_by: build:59524b3c-a9d3-48f5-a42f-6cc442f3afc3
driver_holder: build:59524b3c-a9d3-48f5-a42f-6cc442f3afc3
---

## Context

Story 1 of epic 260705-x92. Builds the standalone `/wayrttd` skill at
`plugins/pmos-toolkit/skills/wayrttd/SKILL.md`. Grounds in `02_design.html` §3–§5 (engine, INV-1..5, D1/D4/D5/D6/D7).
Independently shippable + skill-eval'able; no dependency. The `/shape` hook is a separate story (260705-y3f).

## Acceptance Criteria

- [ ] **AC1 — inversion-ladder engine (§3, INV-2/INV-4).** The skill runs the five steps in order: (1) capture the
  assumed solution X verbatim; (2) climb "and what would that get you?" one rung per turn, stopping at the highest
  actionable rung (states the stop reason); (3) name Problem Y as a single sentence; (4) re-test X vs Y and surface
  1–3 bounded alternatives; (5) proceed/reconsider/pivot verdict + a named handoff line.
- [ ] **AC2 — first-person decision-maker POV (INV-1).** Every prompt and the artifact are written first-person
  ("what I'm really trying to do"), never third-person analysis.
- [ ] **AC3 — fast by construction (INV-3/INV-5/D5).** Interactive default is one question per turn, target ≤~5
  exchanges; the skill never silently escalates into `/shape`-depth — depth is an explicit handoff to
  `/shape`//`/ideate`//`/requirements` by name.
- [ ] **AC4 — compact HTML capture (D4).** Emits a single commentable artifact via the html-authoring substrate
  (`renderArtifact()`, content-only fragment): Solution X → ladder rungs → Problem Y → alternatives → verdict;
  inline pmos-comments block + `<meta name="pmos:skill" content="wayrttd">`; apply-edit-at-anchor shim + tests per
  the inline-comments contract.
- [ ] **AC5 — NL-first surface + non-interactive contract (D6/D7).** `/wayrttd <ask>` with NL-first flags; the
  byte-identical non-interactive block is inlined; `--non-interactive` runs an autonomous single-pass ladder with
  no deadlock, buffering blocking ambiguity to open questions. Any AskUserQuestion carries a Recommended option or
  a defer-only tag.
- [ ] **AC6 — eval + hygiene green.** `name` matches dir; `skill-eval.md` both halves pass (or documented accepted
  residuals proven pre-existing); all four hygiene lints green; added to the pmos-toolkit manifest skills load +
  a README row (row only — version bump/changelog/tag are `/complete-dev`'s at release, not build tasks).
