---
schema_version: 1
id: 260626-psr
kind: story
parent: 260626-8pa
title: "/backlog — delete committed INDEX, web-default render-on-read + tracker-crudl.md §5/§6 rewrite + feature-sdlc define-merge edit"
type: tech-debt
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: in-progress
feature_folder: docs/pmos/features/2026-06-26_trackers-index-merge-tax/
plan_doc: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-psr/03_plan.html
tasks: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-psr/tasks.yaml
worktree: .claude/worktrees/feat-260626-psr
build_branch: feat/260626-psr
build_commit:
claimed_by: build:e385ea38
driver_holder: build:e385ea38
labels: [pmos-toolkit, backlog, tracker-crudl, merge-path]
created: 2026-06-26
updated: 2026-06-27
---

<!-- status: planned at define (Loop 1). Foundation story (no deps) — hosts the substrate rewrite all other stories depend on. Build via /skill-sdlc build --story 260626-psr. -->

## Context

Foundation story of epic 260626-8pa. Removes the committed `backlog/INDEX.md` cache, rewrites the
bare-`/backlog` surface to web-default + inline derived-render fallback, and — the load-bearing part —
rewrites the shared substrate `_shared/tracker-crudl.md` §5/§6 so the committed-index-on-the-merge-path
pattern cannot reappear in any tracker. Also drops the one external consumer call
(`feature-sdlc:448` define-merge `/backlog rebuild-index`). Cross-skill contract, invariants
(INV-1/2/3), and decision log live in the `design_doc:` (../../02_design.html). One `/execute` run.
S2/S3 depend on this story so the rewritten §5 is merged into their worktrees at claim time (D9).

## Acceptance Criteria

- **AC1 (FR-1):** No committed `backlog/INDEX.md` exists after the change (file deleted; `backlog/` store has `items/` + `claims/` only).
- **AC2 (FR-2):** No `/backlog` mutating handler regenerates an index — "Regenerate INDEX" is removed from `#add` (:123), `set` (:148), `archive` (:220), `refine` (:229), and the `promote` / define-merge regenerators named in `schema.md:223`.
- **AC3 (FR-3/FR-3a, INV-2):** Bare `/backlog` defaults to launching the web viewer (`web`/`serve-web.mjs`); under `--non-interactive` / headless / no browser it degrades to an inline view derived from `items/*.md`. Empty-state is gated on "no `items/*.md`", never on a missing index file. No INDEX blob is ever printed.
- **AC4 (FR-4, #substrate-change/#invariant):** `_shared/tracker-crudl.md` §5 is rewritten to encode INV-1 (no committed mutation-written derived file on the merge path), INV-2 (web-default render-on-read), INV-3 (no static export); §6 archive's "never in INDEX" → "never in the derived view"; binding-checklist item 5 (:81) updated; a named merge-path invariant line is present.
- **AC5 (FR-5):** `feature-sdlc/SKILL.md:448` no longer calls `/backlog rebuild-index`; the post-merge `check-id-uniqueness.mjs post-merge <root>/backlog/items` assertion is unchanged and still passes (it reads `items/`, not INDEX).
- **AC6 (FR-8):** `backlog/tests/serve-web.test.mjs` passes unchanged (web viewer derives from YAML — no INDEX dependency). `backlog/tests/scenarios.md` INDEX-generation/print/count lines (:24/51/95) updated to the derived-view wording.
- **AC7 (FR-9):** `/backlog` conforms to `skill-patterns.md §A–§L` + CLAUDE.md skill-authoring conventions; `/skill-eval` passes (the `[D]` + `[J]` halves).

## Notes

`schema.md` `## INDEX.md format` (:194) → `## Index view format` (same columns/grouping; not persisted); update `:223` ("only sanctioned writer is rebuild-index") to "no writer — the view is derived on read".
