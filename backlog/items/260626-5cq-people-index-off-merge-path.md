---
schema_version: 1
id: 260626-5cq
kind: story
parent: 260626-8pa
title: "/people — delete committed INDEX, retire rebuild-index from add/set/refine + Phase 8, inline derived render"
type: tech-debt
priority: should
route: skill
dependencies: [260626-psr]
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-26_trackers-index-merge-tax/
plan_doc: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-5cq/03_plan.html
tasks: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-5cq/tasks.yaml
worktree:
build_branch:
build_commit:
labels: [pmos-toolkit, people, tracker-crudl, merge-path]
created: 2026-06-26
updated: 2026-06-26
---

<!-- status: planned at define (Loop 1). Depends on 260626-psr so the rewritten _shared/tracker-crudl.md §5 is merged into this worktree at claim time (D9). Build via /skill-sdlc build --story 260626-5cq. -->

## Context

`/people` mirrors `/backlog`'s INDEX anti-pattern with an inline LLM-regenerated committed
`~/.pmos/people/INDEX.md` (no script). This story removes the committed index and the rebuild-index
procedure from every mutating handler (add/set/refine + Phase 8), making bare `/people` render an inline
view derived from `~/.pmos/people/*.md` on read. It is the **prerequisite for S4** (the new web viewer),
which builds the web-default surface on top of the now-derived read path. Cross-skill contract + decision
log live in the `design_doc:` (../../02_design.html). One `/execute` run.

## Acceptance Criteria

- **AC1 (FR-7/FR-1):** No committed `~/.pmos/people/INDEX.md` exists after the change; the store carries `*.md` person files only.
- **AC2 (FR-7):** the inline "Regenerate INDEX" procedure is removed from `add` (:146), `set` (:218), `refine` (:229), and Phase 8 (:89) is retired — no mutating handler regenerates an index.
- **AC3 (FR-3/INV-2):** bare `/people` renders an inline view derived from `~/.pmos/people/*.md` on read (web-default arrives in S4 260626-nq0); empty-state gated on "no person files", never on a missing index.
- **AC4 (FR-7):** `schema.md` `## INDEX.md format` (:63) becomes `## Index view format` (derived, not persisted); the `with-people/INDEX.md` test fixture is removed and any fixture assertion expecting it dropped.
- **AC5 (FR-9):** `/people` conforms to `skill-patterns.md §A–§L` + CLAUDE.md skill-authoring conventions; SKILL.md index references (:83-85) updated; `/skill-eval` passes.
