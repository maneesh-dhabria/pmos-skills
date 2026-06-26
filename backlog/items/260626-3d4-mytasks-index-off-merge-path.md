---
schema_version: 1
id: 260626-3d4
kind: story
parent: 260626-8pa
title: "/mytasks — delete committed INDEX, regenerateIndex→renderIndex (no write), web-default + inline fallback, migration moved to load-time normalization"
type: tech-debt
priority: should
route: skill
dependencies: [260626-psr]
plugin: pmos-toolkit
status: done
feature_folder: docs/pmos/features/2026-06-26_trackers-index-merge-tax/
plan_doc: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-3d4/03_plan.html
tasks: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-3d4/tasks.yaml
worktree: .claude/worktrees/feat-260626-3d4
build_branch: feat/260626-3d4
build_commit: 4c3696e1
claimed_by:
driver_holder:
labels: [pmos-toolkit, mytasks, tracker-crudl, merge-path]
created: 2026-06-26
updated: 2026-06-27
---

<!-- status: planned at define (Loop 1). Depends on 260626-psr so the rewritten _shared/tracker-crudl.md §5 is merged into this worktree at claim time (D9). Build via /skill-sdlc build --story 260626-3d4. -->

## Context

`/mytasks` is the JS-backed tracker: `lib.js:regenerateIndex()` writes a committed `~/.pmos/tasks/INDEX.md`,
called from six sites in `serve.js` (188/204/254/264/281/290) and asserted by `tests/run.mjs`. The wrinkle
(D6 in the design_doc) is that `regenerateIndex` **also folds the workstream→project migration** — so the
write can't simply be deleted; the migration must relocate to **load-time normalization** in `loadAllItems`
so it still runs on every read. After this story `/mytasks` derives its buckets fresh per request and defaults
to the web UI, with an inline derived view as the headless fallback. Cross-skill contract + decision log live
in the `design_doc:` (../../02_design.html). One `/execute` run.

## Acceptance Criteria

- **AC1 (FR-6/FR-1):** No committed `~/.pmos/tasks/INDEX.md` is written or expected; the store carries `items/*.md` only. The six `serve.js` regen call-sites (188/204/254/264/281/290) no longer write an index.
- **AC2 (FR-6):** `lib.js` exposes `renderIndex()` (returns the bucketed Markdown string, **no file write**) in place of `regenerateIndex()`; no caller persists the result.
- **AC3 (FR-6a, D6):** the workstream→project migration that previously lived inside `regenerateIndex` is relocated into load-time normalization in `loadAllItems` and still runs on every read (no migration regression).
- **AC4 (FR-3/INV-2):** bare `/mytasks` defaults to launching the web UI; under `--non-interactive` / headless / no browser it degrades to the inline `renderIndex()` view derived from `items/*.md`.
- **AC5 (FR-8):** `renderIndex()` output is byte-equivalent to the old buckets (`## leverage` / `## neutral` / `## overhead` grouping, completed items excluded) — proven by the retargeted `tests/run.mjs` `testIndex` (128-138) reading the returned string, not a file.
- **AC6 (FR-8):** `tests/run.mjs` and fixtures updated — the "INDEX exists on disk" assertion (229) dropped, committed-INDEX fixtures removed; full `tests/run.mjs` passes.
- **AC7 (FR-9):** `/mytasks` conforms to `skill-patterns.md §A–§L` + CLAUDE.md skill-authoring conventions; SKILL.md Phase 12 (:116) + the index references (:110-112, :187) updated; `/skill-eval` passes.

## Build outcome (Loop 2, 2026-06-27)

BUILT on `feat/260626-3d4` (impl commit `4c3696e1`, worktree kept). route:skill inner pipeline.

- **lib.js:** `regenerateIndex`→`renderIndex` (returns bucketed md, no write, no `Last regenerated:`); new `migrateWorkstreamKey` folds the old Phase-12 workstream→project migration into `loadAllItems` load-time normalization (persists in place, key-only, idempotent, D6). exports updated.
- **serve.js:** all 6 `regenerateIndex` call-sites removed.
- **SKILL.md:** dropped `rebuild-index` verb + Phase 12; Phase 1 web-default + headless inline `renderIndex` fallback + zero-item empty-state; 7 "Apply Phase 12" steps reworded to derive-on-read.
- **schema.md:** INDEX.md format → Index view format; schema_version note → `migrateWorkstreamKey`.
- **tests:** `testIndex` retargeted to `renderIndex` string + asserts no INDEX.md; new `testMigration` (fold+persist+idempotent). **73/0**. Removed 4 committed `INDEX.md` fixtures. scenarios.md reworded.

Gates: skill-eval `--target claude-code` **EXIT0** (3 advisory fails — learnings-load / capture-learnings / track-progress — pre-existing, shared with foundation/import stories); 4 hygiene lints + audit-recommended all PASS; selftest 73/0. Load-bearing dogfood: seeded a legacy `workstream:`-keyed item, ran `loadAllItems`+`renderIndex` — confirmed (a) inline derived buckets render, (b) **no INDEX.md written**, (c) legacy key migrated to `project:` in memory + persisted to disk.

Epic 260626-8pa now 3/4 (psr + 5cq + 3d4 built); only nq0 (/people web viewer, deps 5cq) remains. Epic ships Loop-3 via `/complete-dev --epic 260626-8pa` once nq0 is built.
