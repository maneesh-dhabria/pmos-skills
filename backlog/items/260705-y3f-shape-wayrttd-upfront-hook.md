---
schema_version: 1
id: 260705-y3f
title: "/shape optional WAYRTTD upfront hook — additive, skippable pre-check that runs /wayrttd before /shape's lens work and threads the surfaced Problem-Y forward as the shaping seed; standalone /shape unchanged when declined/absent"
type: feature
kind: story
status: ready
route: skill
priority: should
labels: [pmos-toolkit, wayrttd, shape, skill]
created: 2026-07-05
updated: 2026-07-05
parent: 260705-x92
dependencies: [260705-vr5]
design_doc: docs/pmos/features/2026-07-05_wayrttd-skill/02_design.html
plan_doc: docs/pmos/features/2026-07-05_wayrttd-skill/stories/260705-y3f/03_plan.html
feature_folder: docs/pmos/features/2026-07-05_wayrttd-skill/
---

## Context

Story 2 of epic 260705-x92. Wires `/wayrttd` into `/shape` as an optional upfront step (the sponsor's "plug it
into /shape" ask). Grounds in `02_design.html` §2, §6, INV-6. **Depends on 260705-vr5** — the D9 claim-time
transitive-closure merge brings the built `/wayrttd` into this worktree so the hook has a real skill to call and
skill-eval sees it. Additive + non-breaking by construction (INV-6).

## Acceptance Criteria

- [ ] **AC1 — optional, skippable gate (INV-6).** An early phase in `shape/SKILL.md` (fractional number, no
  renumber) offers a WAYRTTD pre-check: one AskUserQuestion — "Run a 2-min WAYRTTD gut-check first (Recommended)"
  / "Skip — go straight to shaping". The new phase has a stable `{#kebab-slug}` anchor.
- [ ] **AC2 — thread Y forward.** On Run: `/wayrttd` is invoked with `/shape`'s seed and its Problem-Y statement
  becomes the shaping seed, so `/shape` shapes the surfaced goal, not the assumed solution.
- [ ] **AC3 — back-compat by absence.** On Skip, or when `/wayrttd` is absent, `/shape` proceeds exactly as today
  (no state written; resume cursor advances past the hook in pre-hook artifacts). Standalone `/shape` behavior,
  phases, and resume contract are byte-unchanged.
- [ ] **AC4 — non-interactive (no deadlock).** Under `--non-interactive` the gate defaults to Skip with an explicit
  log line; if run, `/wayrttd`'s autonomous path feeds the seed.
- [ ] **AC5 — relationship note + eval green.** `/shape`'s "When NOT to use" points at `/wayrttd` as the fast
  pre-check; `skill-eval.md` + all four lints green on `/shape` (pre-existing residuals proven via HEAD^1, cheap
  in-branch ones fixed); no phase-ref or flag-hint drift.
