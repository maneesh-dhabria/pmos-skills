---
schema_version: 1
id: 260625-751
kind: story
parent: 260625-sm0
title: "/backlog grooming AC detection — accept checkbox/dash/numbered criteria; reconcile schema.md; regression-test the format matrix"
type: bug
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: in-progress
feature_folder: docs/pmos/features/2026-06-25_backlog-ac-grooming-format/
plan_doc: docs/pmos/features/2026-06-25_backlog-ac-grooming-format/stories/260625-751/03_plan.md
tasks: docs/pmos/features/2026-06-25_backlog-ac-grooming-format/stories/260625-751/tasks.yaml
worktree: .claude/worktrees/feat-260625-751
claimed_by: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
driver_holder: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
labels: [pmos-toolkit, backlog, grooming, viewer, derivation]
created: 2026-06-25
updated: 2026-06-25
---

## Context

`hasAcceptanceCriteria(body)` in `plugins/pmos-toolkit/skills/backlog/scripts/serve-web-lib.mjs` requires a
checkbox marker (`/-\s*\[[ xX]\]/`) for an AC section to count, so numbered/dash-bullet ACs read as
ungroomed and false-flag `planned` stories in `/backlog` + `/backlog groom`. Fix the detector to be
format-robust; reconcile `schema.md`; regression-test. Root cause + decisions: `../../02_design.md`.

## Acceptance criteria

- [ ] **AC1 (D1) — format-robust detection.** `hasAcceptanceCriteria(body)` returns `true` for an
  `## Acceptance Criteria` section (case-insensitive heading, existing `im` flag preserved) that contains
  ≥1 enumerated criterion in **any** form — checkbox (`- [ ]` / `- [x]`), plain bullet (`-` / `*`), or
  numbered (`1.` / `2.`) — and `false` for an absent or content-empty section (heading only, or prose with
  no list items). Checkbox support is retained.
- [ ] **AC2 (D1) — groom queue correct.** `buildModel().queues.groom.needs_grooming` no longer includes a
  `planned`/`ready` story that has a non-empty enumerated AC section, regardless of marker style; a `draft`
  story or a story with a content-empty AC section still appears.
- [ ] **AC3 (D3) — doc/code reconciled.** `schema.md` notes that grooming AC detection accepts checkbox,
  dash, or numbered criteria (checkbox remains the recommended canonical form); no contradiction between
  the documented form and the detector.
- [ ] **AC4 (D4) — regression test the format matrix (failing-first).** `tests/serve-web.test.mjs` gains
  cases: a numbered-AC story and a dash-bullet-AC story both yield `has_ac=true` and are excluded from
  `needs_grooming`; a heading-only AC section yields `has_ac=false`. Existing tests stay green.
- [ ] **AC5 (D5) — single home, no viewer/server change.** The change is confined to `serve-web-lib.mjs` +
  `tests/serve-web.test.mjs`; `viewer.html` and `serve-web.mjs` are untouched. Pure zero-dep; no new deps.
- [ ] **AC6 — live dogfood.** Rebuilding the model from the real `backlog/items/` shows the numbered/dash-AC
  stories excluded from `needs_grooming` while a genuinely AC-less story still flags.
- [ ] **AC7 — conformance.** Conforms to `feature-sdlc/reference/skill-patterns.md §A–§L` + host `CLAUDE.md`
  (canonical skill path; **no** version-bump / changelog / README / manifest-sync tasks in the plan —
  `/complete-dev` owns those at epic release). `/backlog` `skill-eval` `[D]` passes; 4 hygiene lints + audit
  clean.
