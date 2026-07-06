---
schema_version: 1
id: 260705-y3f
title: "/shape optional WAYRTTD upfront hook — additive, skippable pre-check that runs /wayrttd before /shape's lens work and threads the surfaced Problem-Y forward as the shaping seed; standalone /shape unchanged when declined/absent"
type: feature
kind: story
status: done
route: skill
priority: should
labels: [pmos-toolkit, wayrttd, shape, skill]
created: 2026-07-05
updated: 2026-07-06
parent: 260705-x92
released: v2.103.0
dependencies: [260705-vr5]
worktree:
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

- [x] **AC1 — optional, skippable gate (INV-6).** An early phase in `shape/SKILL.md` (fractional number, no
  renumber) offers a WAYRTTD pre-check: one AskUserQuestion — "Run a 2-min WAYRTTD gut-check first (Recommended)"
  / "Skip — go straight to shaping". The new phase has a stable `{#kebab-slug}` anchor.
- [x] **AC2 — thread Y forward.** On Run: `/wayrttd` is invoked with `/shape`'s seed and its Problem-Y statement
  becomes the shaping seed, so `/shape` shapes the surfaced goal, not the assumed solution.
- [x] **AC3 — back-compat by absence.** On Skip, or when `/wayrttd` is absent, `/shape` proceeds exactly as today
  (no state written; resume cursor advances past the hook in pre-hook artifacts). Standalone `/shape` behavior,
  phases, and resume contract are byte-unchanged.
- [x] **AC4 — non-interactive (no deadlock).** Under `--non-interactive` the gate defaults to Skip with an explicit
  log line; if run, `/wayrttd`'s autonomous path feeds the seed.
- [x] **AC5 — relationship note + eval green.** `/shape`'s "When NOT to use" points at `/wayrttd` as the fast
  pre-check; `skill-eval.md` + all four lints green on `/shape` (pre-existing residuals proven via HEAD^1, cheap
  in-branch ones fixed); no phase-ref or flag-hint drift.

## Notes

**Built 2026-07-06 (build loop, story 260705-y3f).** Impl on feat/260705-y3f (commit d962a710, unmerged/unpushed — for Loop-3 `/complete-dev --epic 260705-x92`). The vr5 dep branch (feat/260705-vr5) was merged into this worktree at claim time (D9 closure), so `/wayrttd` is present for the hook to call and for skill-eval to see.
- Deliverable: additive **Phase 0.5: WAYRTTD pre-check `{#wayrttd-precheck}`** in `plugins/pmos-toolkit/skills/shape/SKILL.md` (fractional number, no renumber) + a spine-diagram pre-step line + a "When NOT to use" relationship bullet. 18 insertions, 0 deletions — 3 additive hunks only.
- **INV-6 proven mechanically:** `git diff d962a710^ d962a710` touches only the 3 intended regions; all Phases 1–9 headings/bodies are byte-identical (Phase 1 shifted 104→122 by the insert, content unchanged). The frozen non-interactive block is untouched.
- Verify PASS: skill-eval `[D]` all 22 pass (exit 0); `[J]` judge 10/10 pass (grounded quotes, adversarial reviewer); 4 hygiene lints green (phase-refs — Phase 0.5 resolves; flags-vs-hints — no drift; audit-recommended — new gate among 4 Recommended, 0 unmarked; non-interactive-inline 60/60). Zero accepted residuals.
- AC2 integration: `/wayrttd` registered (`name: wayrttd`) in-worktree, so "Run" has a real skill to invoke.
- Note: change is skill-instruction-level — it does not alter `/shape`'s artifact template or any DOM surface, so no new browser evidence applies (the html-authoring substrate carries its own passing suite).
